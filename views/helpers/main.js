Promise.all([d3.json("/data/nodes"), d3.json("/data/edges"), d3.json("/data/predictions")]).
  then(([nodes, edges, predictions]) => {

    const graph = Network(nodes, edges, predictions);

    Sidebar(nodes, predictions, graph);

    document.getElementById("color-mode").addEventListener("change", e => { graph.updateColor(e.target.value) });
    document.getElementById("size-mode").addEventListener("change", e => { graph.updateSize(e.target.value); });

  })
