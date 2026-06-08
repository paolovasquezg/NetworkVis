function Network(nodes, edges, predictions) {

  // ── State ─────────────────────────────────────────────────────────────────
  const container = document.getElementById("network-container");
  const width = container.clientWidth;
  const height = container.clientHeight;

  let activeColorMode = "department";
  let activeSizeMode = "degree";
  let activeDeptFilter = "all";
  let predictionsVisible = false;

  const nodesById      = new Map(nodes.map(n => [n.id, n]));
  const neighborsByNode = BuildNeighborMap(nodes, edges);

  const svg = d3.select("#network-container").append("svg").attr("width", width).attr("height", height);

  const defs = svg.append("defs");

  const glowFilter = defs.append("filter").attr("id", "glow");
  glowFilter.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");

  const feMerge = glowFilter.append("feMerge");
  feMerge.append("feMergeNode").attr("in", "coloredBlur");
  feMerge.append("feMergeNode").attr("in", "SourceGraphic");

  defs.append("marker")
    .attr("id", "arrow")
    .attr("viewBox", "0 -4 8 8")
    .attr("refX", 14).attr("refY", 0)
    .attr("markerWidth", 6).attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-4L8,0L0,4")
    .attr("fill", "#ff6b35");

  const zoomGroup = svg.append("g");
  svg.call(d3.zoom().scaleExtent([0.1, 8]).on("zoom", e => { zoomGroup.attr("transform", e.transform) }));

  // ── Layers ────────────────────────────────────────────────────────────────
  const edgeLayer = zoomGroup.append("g").attr("class", "links");
  const predictionLayer = zoomGroup.append("g").attr("class", "pred-links");
  const nodeLayer = zoomGroup.append("g").attr("class", "nodes");

  // ── Simulation ────────────────────────────────────────────────────────────
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(edges).id(d => d.id).distance(d => 20 - d.weight * 2).strength(0.8))
    .force("charge", d3.forceManyBody().strength(-50))
    .force("center", d3.forceCenter(width / 2, height / 2).strength(0.2))
    .force("collision", d3.forceCollide().radius(d => State.nodeSize(d, activeSizeMode) + 3));

  // ── Draw edges ────────────────────────────────────────────────────────────
  const edgeElements = edgeLayer.selectAll("line")
    .data(edges).join("line")
    .attr("class", "link")
    .attr("stroke", "#2e4a72")
    .attr("stroke-width", d => Math.sqrt(d.weight) * 0.8)
    .attr("stroke-opacity", 0.65);

  // ── Draw prediction links (hidden by default) ─────────────────────────────
  let predictionLinks = predictionLayer.selectAll("line")
    .data(predictions.slice(0, 20), p => `${p.source}-${p.target}`).join("line")
    .attr("class", "pred-link")
    .attr("stroke", "#ff6b35")
    .attr("stroke-width", 1)
    .attr("stroke-opacity", 0)
    .attr("stroke-dasharray", "4 3")
    .attr("marker-end", "url(#arrow)");

  // ── Drag ──────────────────────────────────────────────────────────────────
  function dragStart(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x; d.fy = d.y;
  }
  function dragged(event, d) { d.fx = event.x; d.fy = event.y; }

  function dragEnd(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null; d.fy = null;
  }

  // ── Draw nodes ────────────────────────────────────────────────────────────
  const nodeGroups = nodeLayer.selectAll("g.node")
    .data(nodes).join("g")
    .attr("class", "node")
    .call(d3.drag()
      .on("start", dragStart)
      .on("drag", dragged)
      .on("end", dragEnd)
    );

  nodeGroups.append("circle")
    .attr("r", d => State.nodeSize(d, activeSizeMode))
    .attr("fill", d => State.nodeColor(d, activeColorMode))
    .attr("stroke", "#080c14")
    .attr("stroke-width", 1);

  nodeGroups.append("text")
    .text(d => d.name.split(" ")[0])
    .attr("dy", d => State.nodeSize(d, activeSizeMode) + 9)
    .attr("text-anchor", "middle")
    .attr("font-size", "7px")
    .attr("fill", "#5a7090")
    .attr("pointer-events", "none");

  // ── Simulation tick ───────────────────────────────────────────────────────
  simulation.on("tick", () => {
    edgeElements
      .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x).attr("y2", d => d.target.y);

    predictionLinks.each(function (d) {
      const sourceNode = nodesById.get(d.source);
      const targetNode = nodesById.get(d.target);
      if (sourceNode && targetNode) {
        d3.select(this)
          .attr("x1", sourceNode.x).attr("y1", sourceNode.y)
          .attr("x2", targetNode.x).attr("y2", targetNode.y);
      }
    });

    nodeGroups.attr("transform", d => `translate(${d.x},${d.y})`);
  });

  // ── Highlight helpers ─────────────────────────────────────────────────────
  function applyHighlight(d) {
    const neighborSet = neighborsByNode.get(d.id) || new Set();
    const highlightedSet = new Set([d.id, ...neighborSet]);

    edgeElements.attr("stroke-opacity", e => {
      const sourceId = typeof e.source === "object" ? e.source.id : e.source;
      const targetId = typeof e.target === "object" ? e.target.id : e.target;
      return (sourceId === d.id || targetId === d.id) ? 0.9 : 0.04;
    }).attr("stroke", e => {
      const sourceId = typeof e.source === "object" ? e.source.id : e.source;
      const targetId = typeof e.target === "object" ? e.target.id : e.target;
      return (sourceId === d.id || targetId === d.id) ? "#00d4ff" : "#1e2d4a";
    });

    nodeGroups.select("circle")
      .attr("opacity", n => highlightedSet.has(n.id) ? 1 : 0.1)
      .attr("filter", n => n.id === d.id ? "url(#glow)" : null);
  }

  function clearHighlight() {
    nodeGroups.select("circle")
      .attr("opacity", 1)
      .attr("filter", null)
      .attr("stroke", "#080c14")
      .attr("stroke-width", 1);

    if (predictionsVisible) bindPredictionLinks(predictions.slice(0, 20), 0.6);
    else bindPredictionLinks(predictions.slice(0, 20), 0);

    if (activeDeptFilter !== "all") filterDept(activeDeptFilter);
    else edgeElements.attr("stroke-opacity", 0.65).attr("stroke", "#2e4a72");
  }

  // ── Prediction link helpers ───────────────────────────────────────────────
  function bindPredictionLinks(data, opacity) {
    predictionLinks = predictionLayer.selectAll("line")
      .data(data, p => `${p.source}-${p.target}`)
      .join("line")
      .attr("stroke", "#ff6b35")
      .attr("stroke-width", p => 1 + (p.jaccard ?? 0) * 2)
      .attr("stroke-opacity", opacity)
      .attr("stroke-dasharray", "4 3")
      .attr("marker-end", "url(#arrow)");

    predictionLinks.each(function (d) {
      const src = nodesById.get(d.source);
      const tgt = nodesById.get(d.target);
      if (src && tgt) {
        d3.select(this)
          .attr("x1", src.x).attr("y1", src.y)
          .attr("x2", tgt.x).attr("y2", tgt.y);
      }
    });
  }

  function filterPredToNode(d) {
    const nodePredictions = predictions.filter(p => p.source === d.id || p.target === d.id);
    bindPredictionLinks(nodePredictions, 0.8);
  }

  // ── Tooltip & node interactions ───────────────────────────────────────────
  const tooltip = d3.select("#tooltip");

  nodeGroups.on("mouseenter", function (event, d) {
    tooltip.style("display", "block").html(TooltipHtml(d));
    applyHighlight(d);

  }).on("mousemove", function (event) {
    tooltip.style("left", (event.clientX + 12) + "px")
      .style("top", (event.clientY - 10) + "px");

  }).on("mouseleave", function () {
    tooltip.style("display", "none");
    const selectedNode = State.getSelected();
    if (selectedNode) {
      applyHighlight(selectedNode);
      if (predictionsVisible) filterPredToNode(selectedNode);
    } else {
      clearHighlight();
    }

  }).on("click", function (event, d) {
    event.stopPropagation();
    State.selectNode(d);
    applyHighlight(d);
    if (predictionsVisible) filterPredToNode(d);
  });

  svg.on("click", () => { State.selectNode(null); clearHighlight(); });

  // ── State change listener (sidebar → graph) ───────────────────────────────
  State.onChange(({ selectedNode }) => {
    if (selectedNode) {
      applyHighlight(selectedNode);
      if (predictionsVisible) filterPredToNode(selectedNode);
    } else {
      clearHighlight();
    }
  });

  const departmentLabels = [...new Set(nodes.map(n => n.department))].filter(Boolean).sort();

  function updateLegend(mode) {
    const legendEl = document.getElementById("legend");
    if (!legendEl) return;
    legendEl.innerHTML = LegendHtml(mode, activeDeptFilter, departmentLabels);
  }

  updateLegend(activeColorMode);

  // ── Public update functions ───────────────────────────────────────────────
  function updateColor(mode) {
    activeColorMode = mode;
    nodeGroups.select("circle")
      .transition("color").duration(400)
      .attr("fill", d => State.nodeColor(d, activeColorMode));
    updateLegend(mode);
  }

  function updateSize(mode) {
    activeSizeMode = mode;
    simulation.force("collision", d3.forceCollide().radius(d => State.nodeSize(d, activeSizeMode) + 2));
    nodeGroups.select("circle")
      .transition("size").duration(400)
      .attr("r", d => State.nodeSize(d, activeSizeMode));
    nodeGroups.select("text")
      .transition("size").duration(400)
      .attr("dy", d => State.nodeSize(d, activeSizeMode) + 9);
    simulation.alpha(0.3).restart();
  }

  function filterDept(dept) {
    activeDeptFilter = dept;
    const showAll = dept === "all";

    nodeGroups.select("circle")
      .attr("opacity", d => showAll || d.department === dept ? 1 : 0.05)
      .attr("stroke", d => !showAll && d.department === dept ? "#ffffff" : "#080c14")
      .attr("stroke-width", d => !showAll && d.department === dept ? 2 : 1)
      .attr("filter", d => !showAll && d.department === dept ? "url(#glow)" : null);

    nodeGroups.select("text")
      .attr("opacity", d => showAll || d.department === dept ? 1 : 0)
      .attr("font-size", d => !showAll && d.department === dept ? "9px" : "7px")
      .attr("fill", d => !showAll && d.department === dept ? "#c8d8f0" : "#5a7090");

    edgeElements.attr("stroke-opacity", e => {
      if (showAll) return 0.5;
      const sourceId = typeof e.source === "object" ? e.source.id : e.source;
      const targetId = typeof e.target === "object" ? e.target.id : e.target;
      const sourceNode = nodesById.get(sourceId);
      const targetNode = nodesById.get(targetId);
      return (sourceNode?.department === dept && targetNode?.department === dept) ? 0.7 : 0.02;
    });

    updateLegend(activeColorMode);
  }

  function showPredictions(show) {
    predictionsVisible = show;
    const selectedNode = State.getSelected();
    if (show) {
      if (selectedNode) filterPredToNode(selectedNode);
      else bindPredictionLinks(predictions.slice(0, 20), 0.6);
    } else {
      bindPredictionLinks(predictions.slice(0, 20), 0);
    }
  }

  return { updateColor, updateSize, filterDept, showPredictions, filterPredToNode };
}
