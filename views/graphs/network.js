function NetworkGraph(nodes, edges, predictions) {
  const container = document.getElementById("network-container");
  const W = container.clientWidth;
  const H = container.clientHeight;

  let colorMode = "department";
  let sizeMode  = "degree";
  let deptFilter = "all";
  let predictionsVisible = false;

  // ── SVG setup ────────────────────────────────────────────────────────────
  const svg = d3.select("#network-container").append("svg")
    .attr("width", W).attr("height", H);

  const defs = svg.append("defs");

  // Glow filter
  const glow = defs.append("filter").attr("id", "glow");
  glow.append("feGaussianBlur").attr("stdDeviation", "3").attr("result", "coloredBlur");
  const feMerge = glow.append("feMerge");
  feMerge.append("feMergeNode").attr("in", "coloredBlur");
  feMerge.append("feMergeNode").attr("in", "SourceGraphic");

  // Arrow marker for prediction links
  defs.append("marker")
    .attr("id", "arrow")
    .attr("viewBox", "0 -4 8 8")
    .attr("refX", 14).attr("refY", 0)
    .attr("markerWidth", 6).attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("path")
    .attr("d", "M0,-4L8,0L0,4")
    .attr("fill", "#ff6b35");

  // Zoom
  const zoomG = svg.append("g");
  const zoom = d3.zoom().scaleExtent([0.1, 8]).on("zoom", e => {
    zoomG.attr("transform", e.transform);
  });
  svg.call(zoom);

  // ── Build node and edge maps ──────────────────────────────────────────────
  const nodeById = new Map(nodes.map(n => [n.id, n]));

  // Neighbour sets for highlight
  const neighbours = new Map();
  nodes.forEach(n => neighbours.set(n.id, new Set()));
  edges.forEach(e => {
    neighbours.get(e.source)?.add(e.target);
    neighbours.get(e.target)?.add(e.source);
  });

  // ── Layers ────────────────────────────────────────────────────────────────
  const linkLayer      = zoomG.append("g").attr("class", "links");
  const predLayer      = zoomG.append("g").attr("class", "pred-links");
  const nodeLayer      = zoomG.append("g").attr("class", "nodes");

  // ── Simulation ────────────────────────────────────────────────────────────
  const simulation = d3.forceSimulation(nodes)
    .force("link", d3.forceLink(edges).id(d => d.id).distance(d => 40 - d.weight * 5).strength(0.4))
    .force("charge", d3.forceManyBody().strength(-120))
    .force("center", d3.forceCenter(W / 2, H / 2))
    .force("collision", d3.forceCollide().radius(d => State.nodeSize(d, sizeMode) + 2));

  // ── Draw links ────────────────────────────────────────────────────────────
  const link = linkLayer.selectAll("line")
    .data(edges).join("line")
    .attr("class", "link")
    .attr("stroke", "#2e4a72")
    .attr("stroke-width", d => Math.sqrt(d.weight) * 0.8)
    .attr("stroke-opacity", 0.65);

  // ── Prediction links (hidden by default) ─────────────────────────────────
  let predLinks = predLayer.selectAll("line")
    .data(predictions.slice(0, 20), p => `${p.source}-${p.target}`).join("line")
    .attr("class", "pred-link")
    .attr("stroke", "#ff6b35")
    .attr("stroke-width", 1)
    .attr("stroke-opacity", 0)
    .attr("stroke-dasharray", "4 3")
    .attr("marker-end", "url(#arrow)");

  // ── Draw nodes ────────────────────────────────────────────────────────────
  const node = nodeLayer.selectAll("g.node")
    .data(nodes).join("g")
    .attr("class", "node")
    .call(d3.drag()
      .on("start", dragStart)
      .on("drag",  dragged)
      .on("end",   dragEnd)
    );

  node.append("circle")
    .attr("r", d => State.nodeSize(d, sizeMode))
    .attr("fill", d => State.nodeColor(d, colorMode))
    .attr("stroke", "#080c14")
    .attr("stroke-width", 1);

  node.append("text")
    .text(d => d.name.split(" ")[0])
    .attr("dy", d => State.nodeSize(d, sizeMode) + 9)
    .attr("text-anchor", "middle")
    .attr("font-size", "7px")
    .attr("fill", "#5a7090")
    .attr("pointer-events", "none");

  // ── Interactions ─────────────────────────────────────────────────────────
  const tooltip = d3.select("#tooltip");

  function applyHighlight(d) {
    const nbrs = neighbours.get(d.id) || new Set();
    const relevant = new Set([d.id, ...nbrs]);
    link.attr("stroke-opacity", e => {
      const sid = typeof e.source === "object" ? e.source.id : e.source;
      const tid = typeof e.target === "object" ? e.target.id : e.target;
      return (sid === d.id || tid === d.id) ? 0.9 : 0.04;
    }).attr("stroke", e => {
      const sid = typeof e.source === "object" ? e.source.id : e.source;
      const tid = typeof e.target === "object" ? e.target.id : e.target;
      return (sid === d.id || tid === d.id) ? "#00d4ff" : "#1e2d4a";
    });
    node.select("circle")
      .attr("opacity", n => relevant.has(n.id) ? 1 : 0.1)
      .attr("filter", n => n.id === d.id ? "url(#glow)" : null);
  }

  function bindPredLinks(data, opacity) {
    predLinks = predLayer.selectAll("line")
      .data(data, p => `${p.source}-${p.target}`)
      .join("line")
      .attr("stroke", "#ff6b35")
      .attr("stroke-width", p => 1 + (p.jaccard ?? 0) * 2)
      .attr("stroke-opacity", opacity)
      .attr("stroke-dasharray", "4 3")
      .attr("marker-end", "url(#arrow)");
  }

  function filterPredToNode(d) {
    const nodePreds = predictions.filter(p => p.source === d.id || p.target === d.id);
    bindPredLinks(nodePreds, 0.8);
  }

  function clearHighlight() {
    node.select("circle")
      .attr("opacity", 1)
      .attr("filter", null)
      .attr("stroke", "#080c14")
      .attr("stroke-width", 1);
    if (predictionsVisible) bindPredLinks(predictions.slice(0, 20), 0.6);
    else bindPredLinks(predictions.slice(0, 20), 0);
    if (deptFilter !== "all") filterDept(deptFilter);
    else link.attr("stroke-opacity", 0.65).attr("stroke", "#2e4a72");
  }

  node.on("mouseenter", function(event, d) {
    const r = d.research_areas
      ? d.research_areas.split(";").slice(0, 3).map(s => s.trim()).join(", ")
      : "—";
    tooltip.style("display", "block").html(`
      <strong>${d.name}</strong>
      <div class="tt-dept">${d.department}</div>
      <div>Degree: <span class="tt-metric">${d.degree}</span> &nbsp;
           Betweenness: <span class="tt-metric">${d.betweenness.toFixed(3)}</span></div>
      <div>PageRank: <span class="tt-metric">${d.pagerank.toFixed(4)}</span> &nbsp;
           Clustering: <span class="tt-metric">${d.clustering.toFixed(3)}</span></div>
      <div style="margin-top:4px;font-size:.65rem;color:#5a7090">${r}</div>
    `);
    applyHighlight(d);

  }).on("mousemove", function(event) {
    tooltip.style("left", (event.clientX + 12) + "px")
           .style("top",  (event.clientY - 10) + "px");

  }).on("mouseleave", function() {
    tooltip.style("display", "none");
    const sel = State.getSelected();
    if (sel) {
      applyHighlight(sel);
      if (predictionsVisible) filterPredToNode(sel);
    } else {
      clearHighlight();
    }

  }).on("click", function(event, d) {
    event.stopPropagation();
    State.selectNode(d);
    applyHighlight(d);
    if (predictionsVisible) filterPredToNode(d);
  });

  svg.on("click", () => { State.selectNode(null); clearHighlight(); });

  // ── Simulation tick ───────────────────────────────────────────────────────
  simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x).attr("y2", d => d.target.y);

    predLinks.each(function(d) {
      const s = nodeById.get(d.source);
      const t = nodeById.get(d.target);
      if (s && t) {
        d3.select(this)
          .attr("x1", s.x).attr("y1", s.y)
          .attr("x2", t.x).attr("y2", t.y);
      }
    });

    node.attr("transform", d => `translate(${d.x},${d.y})`);
  });

  // ── Drag ─────────────────────────────────────────────────────────────────
  function dragStart(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x; d.fy = d.y;
  }
  function dragged(event, d) { d.fx = event.x; d.fy = event.y; }
  function dragEnd(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null; d.fy = null;
  }

  // ── Update functions (called by controls) ─────────────────────────────────
  function updateColor(mode) {
    colorMode = mode;
    node.select("circle")
      .transition("color").duration(400)
      .attr("fill", d => State.nodeColor(d, colorMode));
    updateLegend(mode);
  }

  function updateSize(mode) {
    sizeMode = mode;
    simulation.force("collision", d3.forceCollide().radius(d => State.nodeSize(d, sizeMode) + 2));
    node.select("circle")
      .transition("size").duration(400)
      .attr("r", d => State.nodeSize(d, sizeMode));
    node.select("text")
      .transition("size").duration(400)
      .attr("dy", d => State.nodeSize(d, sizeMode) + 9);
    simulation.alpha(0.3).restart();
  }

  function filterDept(dept) {
    deptFilter = dept;
    const isAll = dept === "all";
    node.select("circle")
      .attr("opacity",      d => isAll || d.department === dept ? 1 : 0.05)
      .attr("stroke",       d => !isAll && d.department === dept ? "#ffffff" : "#080c14")
      .attr("stroke-width", d => !isAll && d.department === dept ? 2 : 1)
      .attr("filter",       d => !isAll && d.department === dept ? "url(#glow)" : null);
    node.select("text")
      .attr("opacity",    d => isAll || d.department === dept ? 1 : 0)
      .attr("font-size",  d => !isAll && d.department === dept ? "9px" : "7px")
      .attr("fill",       d => !isAll && d.department === dept ? "#c8d8f0" : "#5a7090");
    link.attr("stroke-opacity", e => {
      if (isAll) return 0.5;
      const sid = typeof e.source === "object" ? e.source.id : e.source;
      const tid = typeof e.target === "object" ? e.target.id : e.target;
      const sn = nodeById.get(sid);
      const tn = nodeById.get(tid);
      return (sn?.department === dept && tn?.department === dept) ? 0.7 : 0.02;
    });
    updateLegend(colorMode);
  }

  function showPredictions(show) {
    predictionsVisible = show;
    const sel = State.getSelected();
    if (show) {
      if (sel) filterPredToNode(sel);
      else bindPredLinks(predictions.slice(0, 20), 0.6);
    } else {
      bindPredLinks(predictions.slice(0, 20), 0);
    }
  }

  // ── Legend ────────────────────────────────────────────────────────────────
  const GRADIENT_CONFIGS = {
    degree:      { title: "Color · Degree",      min: "0", max: "60+",  from: "#f5c518", to: "#bd0026" },
    betweenness: { title: "Color · Betweenness", min: "0", max: "0.25", from: "#4cc9f0", to: "#03045e" },
    clustering:  { title: "Color · Clustering",  min: "0", max: "1",    from: "#80ffb0", to: "#005a32" },
  };

  const DEPT_LABELS = [...new Set(nodes.map(n => n.department))].filter(Boolean).sort();

  function updateLegend(mode) {
    const el = document.getElementById("legend");
    if (!el) return;
    let html = "";

    if (GRADIENT_CONFIGS[mode]) {
      const { title, min, max, from, to } = GRADIENT_CONFIGS[mode];
      html += `
        <div class="legend-title">${title}</div>
        <div class="legend-bar" style="background:linear-gradient(to right,${from},${to})"></div>
        <div class="legend-range"><span>${min}</span><span>${max}</span></div>`;
    } else {
      const deptItems = DEPT_LABELS.map(dept => {
        const active = deptFilter !== "all" && dept === deptFilter;
        return `
          <div class="legend-item${active ? " legend-item-active" : ""}">
            <div class="legend-dot" style="background:${State.deptColor(dept)}"></div>
            <span>${dept.replace("Departamento de ", "").replace("Departamento ", "")}</span>
          </div>`;
      }).join("");
      html += `<div class="legend-title">Department</div><div class="legend-items">${deptItems}</div>`;
    }

    el.innerHTML = html;
  }

  updateLegend(colorMode);

  // ── Highlight from sidebar (ranking list clicks) ──────────────────────────
  State.onChange(({ selectedNode: sel }) => {
    if (sel) {
      applyHighlight(sel);
      if (predictionsVisible) filterPredToNode(sel);
    } else {
      clearHighlight();
    }
  });

  return { updateColor, updateSize, filterDept, showPredictions };
}
