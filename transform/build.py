import json
import os
import sys
import networkx as nx
from collections import defaultdict
from itertools import combinations
from urllib.parse import unquote

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))

from constants.funcs import Normalize
from constants.consts import (DATA_DIR, NETWORK_FILE, PROFILES_FILE, NODES_FILE, EDGES_FILE, PREDICTIONS_FILE, TOP_N_PREDICTIONS)


# ── 1. Load base data ── # 
with open(NETWORK_FILE, encoding="utf-8") as f:
    network_data = json.load(f)

nodes = network_data["nodes"]
print(f"{len(nodes)} nodes loaded")


# ── 2. Enrich with scrapping ── #
if os.path.exists(PROFILES_FILE):
    with open(PROFILES_FILE, encoding="utf-8") as f:
        profiles = json.load(f)

    print(f"{len(profiles)} profiles loaded")

    for p in profiles:
        if not p.get("name") and p.get("profile_url"):
            slug = p["profile_url"].rstrip("/").split("/")[-1]
            p["name"] = unquote(slug).replace("-", " ").title()

    profiles_by_name = {Normalize(p["name"]): p for p in profiles if p.get("name")}

    merged_count = 0
    matched_profile_names = set()
    for node in nodes:
        name_key = Normalize(node["name"])
        match = profiles_by_name.get(name_key)
        if match:
            if match.get("h_index") is not None:
                node["h_index"] = match["h_index"]
            if match.get("citations") and not node.get("citations"):
                node["citations"] = match["citations"]
            if match.get("research_groups") and not node.get("research_groups"):
                node["research_groups"] = match["research_groups"]
            if match.get("research_areas") and not node.get("research_areas"):
                node["research_areas"] = match["research_areas"]
            if match.get("publication_count"):
                node["publication_count"] = match["publication_count"]
            matched_profile_names.add(name_key)
            merged_count += 1

    print(f"{merged_count}/{len(nodes)} nodes enriched with profiles data")

    numeric_ids = [n["id"] for n in nodes if isinstance(n["id"], int)]
    next_id = max(numeric_ids) + 1 if numeric_ids else len(nodes)

    added_count = 0
    for norm_name, profile in profiles_by_name.items():
        if norm_name in matched_profile_names:
            continue
        nodes.append({
            "id":                next_id,
            "name":              profile["name"],
            "department":        profile.get("department", ""),
            "image_url":         profile.get("image_url", ""),
            "email":             profile.get("email", ""),
            "research_groups":   profile.get("research_groups", ""),
            "research_areas":    profile.get("research_areas", ""),
            "citations":         profile.get("citations", 0),
            "h_index":           profile.get("h_index"),
            "publication_count": profile.get("publication_count")})
       
        next_id += 1
        added_count += 1

    print(f"{added_count} new nodes added from profiles")

for node in nodes:
    node.setdefault("h_index", None)
    node.setdefault("publication_count", None)

# ── 3. Build edges ── #
research_group_to_member_ids = defaultdict(list)
for node in nodes:
    if node.get("research_groups"):
        for research_group in node["research_groups"].split(";"):
            research_group = research_group.strip()
            if research_group:
                research_group_to_member_ids[research_group].append(node["id"])

co_membership_edges = defaultdict(lambda: {"weight": 0, "shared_groups": []})
for research_group, group_member_ids in research_group_to_member_ids.items():
    for a, b in combinations(sorted(group_member_ids), 2):
        node_pair = (a, b)
        co_membership_edges[node_pair]["weight"] += 1
        co_membership_edges[node_pair]["shared_groups"].append(research_group)

print(f"{len(co_membership_edges)} edges built")


# ── 4. Build graph  ── #
collaboration_graph = nx.Graph()
for node in nodes:
    collaboration_graph.add_node(node["id"], **{k: v for k, v in node.items() if k != "id"})
for (a, b), edge_data in co_membership_edges.items():
    collaboration_graph.add_edge(a, b, weight=edge_data["weight"], shared_groups=edge_data["shared_groups"])

num_components         = nx.number_connected_components(collaboration_graph)
num_isolated_nodes     = sum(1 for n in collaboration_graph.nodes() if collaboration_graph.degree(n) == 0)
largest_component_size = len(max(nx.connected_components(collaboration_graph), key=len))
print(f"Graph: {collaboration_graph.number_of_nodes()} nodes, {collaboration_graph.number_of_edges()} edges")


# ── 5. Metrics  ── #
print("Computing network metrics")

node_degrees          = dict(collaboration_graph.degree())
weighted_node_degrees = dict(collaboration_graph.degree(weight="weight"))
betweenness_scores    = nx.betweenness_centrality(collaboration_graph, normalized=True)
clustering_scores     = nx.clustering(collaboration_graph)
pagerank_scores       = nx.pagerank(collaboration_graph, weight="weight")

node_to_component_id = {}
for component_index, component_nodes in enumerate(nx.connected_components(collaboration_graph)):
    for node_id in component_nodes:
        node_to_component_id[node_id] = component_index


# ── 6. Export nodes.json ── #
id_to_name       = {n["id"]: n["name"] for n in nodes}
id_to_department = {n["id"]: n["department"] for n in nodes}

nodes_export = []
for node in nodes:
    node_id = node["id"]
    nodes_export.append({
        "id":                node_id,
        "name":              node["name"],
        "department":        node["department"],
        "image_url":         node.get("image_url", ""),
        "email":             node.get("email", ""),
        "research_groups":   node.get("research_groups", ""),
        "research_areas":    node.get("research_areas", ""),
        "citations":         node.get("citations", 0),
        "h_index":           node.get("h_index"),
        "publication_count": node.get("publication_count"),
        "degree":            node_degrees.get(node_id, 0),
        "weighted_degree":   weighted_node_degrees.get(node_id, 0),
        "betweenness":       round(betweenness_scores.get(node_id, 0), 6),
        "clustering":        round(clustering_scores.get(node_id, 0), 6),
        "pagerank":          round(pagerank_scores.get(node_id, 0), 6),
        "component":         node_to_component_id.get(node_id, -1)})

with open(NODES_FILE, "w", encoding="utf-8") as f:
    json.dump(nodes_export, f, ensure_ascii=False, indent=2)

print(f"{len(nodes_export)} nodes saved")


# ── 7. Export edges.json ── #
edges_export = []
for (a, b), edge_data in co_membership_edges.items():
    edges_export.append({
        "source":        a,
        "target":        b,
        "weight":        edge_data["weight"],
        "shared_groups": edge_data["shared_groups"]})

with open(EDGES_FILE, "w", encoding="utf-8") as f:
    json.dump(edges_export, f, ensure_ascii=False, indent=2)

print(f"{len(edges_export)} edges saved")


# ── 8. Link predictions ── #
print("Computing link predictions")
link_predictions = []
all_node_ids = list(collaboration_graph.nodes())

for i in range(len(all_node_ids)):
    for j in range(i + 1, len(all_node_ids)):
        a, b = all_node_ids[i], all_node_ids[j]
        if collaboration_graph.has_edge(a, b):
            continue
        if node_to_component_id.get(a) != node_to_component_id.get(b):
            continue
        common_neighbor_count = len(list(nx.common_neighbors(collaboration_graph, a, b)))
        if common_neighbor_count == 0:
            continue
        neighbors_a = set(collaboration_graph.neighbors(a))
        neighbors_b = set(collaboration_graph.neighbors(b))
        jaccard_similarity = len(neighbors_a & neighbors_b) / len(neighbors_a | neighbors_b) if (neighbors_a | neighbors_b) else 0
        link_predictions.append({
            "source":           a,
            "target":           b,
            "source_name":      id_to_name[a],
            "target_name":      id_to_name[b],
            "common_neighbors": common_neighbor_count,
            "jaccard":          round(jaccard_similarity, 4),
            "cross_dept":       id_to_department[a] != id_to_department[b]})

link_predictions.sort(key=lambda x: -x["jaccard"])

with open(PREDICTIONS_FILE, "w", encoding="utf-8") as f:
    json.dump(link_predictions[:TOP_N_PREDICTIONS], f, ensure_ascii=False, indent=2)

print(f"{min(TOP_N_PREDICTIONS, len(link_predictions))} predictions saved")
