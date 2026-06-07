# UTEC Faculty Network Visualization

Flask + D3.js app that maps research collaboration among UTEC faculty. The graph is built from co-membership in shared research groups — two professors share an edge if they belong to the same group, and the edge weight reflects how many groups they share.

## Visualizations

| Component | Technique | Analytical Task |
|---|---|---|
| Main canvas | **Force-directed graph** | T1 · T2 · T3 · T4 |
| Sidebar — ranking | **Bar list** | T1 · T2 · T3 |
| Sidebar — detail | **Profile card** | T1 · T2 · T3 |
| Sidebar — predictions | **Scored pair list** | T4 |

- **T1** – Who are the most prolific collaborators?
- **T2** – Who acts as a bridge between departments?
- **T3** – How cohesive are departments internally?
- **T4** – Which new collaborations are most likely to emerge?

## Design Rationale

| Decision | Justification |
|---|---|
| **Force-directed layout** | Node positions emerge from the actual structure of the network — clusters are departments or research groups, and bridges appear visually as nodes between clusters. |
| **Node size → degree / betweenness** | Size pre-attentively encodes importance; switching between degree and betweenness immediately answers T1 and T2 without reading numbers. |
| **Node color → department** | Department identity is the primary categorical attribute. The palette uses maximally distinct hues to separate 12+ departments on a dark background. |
| **Metric color modes** | Sequential color scales (YlOrRd for degree, PuBu for betweenness, Greens for clustering) shift the cognitive task from topology to magnitude per task. |
| **Dashed orange prediction edges** | Visually distinct from existing edges — orange dashed lines signal "potential", not established relationships, directly answering T4. |
| **Hover → neighbour highlight** | Reduces cognitive load when exploring a dense graph — non-neighbours fade to near-invisible, making local structure immediately readable. |
| **Task pills → coordinated update** | Clicking T1/T2/T3/T4 synchronously changes color mode, size mode, ranking, and prediction visibility — one click configures the whole dashboard for one task. |
| **Click → zoom + detail card** | Overview → zoom → details on demand (Shneiderman mantra). The graph zooms to the selected node and the sidebar shows the full profile with all metrics. |

## Analytical Insight

**T1 — Who are the most prolific collaborators?**

The highest-degree nodes are Carmen Elena Flores Barreda and Wando Kim (degree 60), both from engineering departments. Selecting "degree" mode makes them immediately obvious as the largest nodes. However, high degree alone doesn't imply influence — many of their connections are within the same large research group.

**T2 — Who acts as a bridge between departments?**

Luis Alberto Bedriñana Mera (betweenness 0.243) and Jose Javier Cerda Hernandez (0.181) stand out clearly in betweenness mode — they have moderate degree but sit on the shortest paths between many pairs, linking Civil Engineering and Industrial Engineering clusters. Removing them would fragment the network significantly.

**T3 — How cohesive are departments internally?**

Departments like Humanidades and Ciencias show high clustering coefficients — their faculty form tight cliques. Engineering departments show lower clustering despite higher degrees, meaning connections spread across groups rather than concentrating within a closed circle. This is visible in the graph: engineering nodes have many edges going in multiple directions, while humanities nodes form compact sub-clusters.

**T4 — Which new collaborations may emerge?**

The top predicted collaboration by Jaccard similarity is between Patricia Araujo Pantoja and José Luis Mantari Laureano (Jaccard 0.375, 3 common neighbors) — a cross-department pair from Civil Engineering and Mechanical Engineering who share three mutual collaborators but have never co-published. Cross-department predictions (marked in orange) are particularly valuable as they signal potential interdisciplinary work.

## Tasks Coverage

| Task | Views | What you can see |
|---|---|---|
| T1 | Network (size=degree), Ranking list | Largest nodes = most connected; ranking sorts top 15 |
| T2 | Network (color=betweenness), Ranking list | High-betweenness nodes glow between clusters |
| T3 | Network (color=clustering), Dept filter | Filter by department to see internal cohesion |
| T4 | Prediction list, Dashed orange edges | Top 20 dashed links show likely future collaborations |

## Project Structure

```
NetworkVis/
├── app.py
├── index.html
├── requirements.txt
├── README.md
├── constants/
│   ├── consts.py
│   └── funcs.py
├── data/
│   ├── nodes.json
│   ├── edges.json
│   └── predictions.json
├── transform/
│   ├── scrap.py
│   └── build.py
└── views/
    ├── styles.css
    ├── graphs/
    │   └── network.js
    └── helpers/
        ├── state.js
        ├── sidebar.js
        └── main.js
```

## Setup & Run

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open [http://localhost:5050](http://localhost:5050).

## Data Pipeline

```bash
# 1. Scrape CRIS UTEC (requires Chrome)
python transform/scrap.py
# → generates data/profiles.json

# 2. Build graph data from profiles + base network
python transform/build.py
# → generates data/nodes.json, data/edges.json, data/predictions.json
```

Edges are constructed from co-membership in shared research groups. Network metrics (degree, betweenness, clustering, PageRank) are computed with NetworkX. Link predictions use Common Neighbors + Jaccard similarity, filtered to node pairs in the same connected component.
