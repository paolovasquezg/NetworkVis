Promise.all([
  d3.json("/data/nodes"),
  d3.json("/data/edges"),
  d3.json("/data/predictions"),
]).then(([nodes, edges, predictions]) => {

  // Boot graph
  const graph = NetworkGraph(nodes, edges, predictions);

  // Boot sidebar
  buildSidebar(nodes, predictions, graph);

  // ── Header controls ──────────────────────────────────────────────────────
  document.getElementById("color-mode").addEventListener("change", e => {
    graph.updateColor(e.target.value);
  });

  document.getElementById("size-mode").addEventListener("change", e => {
    graph.updateSize(e.target.value);
  });

}).catch(err => console.error("Data load error:", err));
