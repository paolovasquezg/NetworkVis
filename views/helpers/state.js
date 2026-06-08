const State = (() => {
  let selectedNode = null;
  let highlightedIds = new Set();
  const listeners = [];

  const deptColorScale = d3.scaleOrdinal().domain(DEPARTMENTS).range(DEPARTMENT_COLORS);

  function deptColor(dept) { return deptColorScale(dept || "") }

  function deptLabel(dept) {
    return (dept || "").replace("Departamento de ", "").replace("Departamento ", "");
  }

  const degreeColor = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, 18]);
  const betweennessColor = d3.scaleSequential(d3.interpolatePuBu).domain([0, 0.05]);
  const clusteringColor = d3.scaleSequential(d3.interpolateGreens).domain([0, 1]);

  const degreeSize = d3.scaleSqrt().domain([0, 18]).range([10, 36]);
  const btwSize = d3.scaleSqrt().domain([0, 0.05]).range([10, 36]);
  const prSize = d3.scaleSqrt().domain([0, 0.02]).range([10, 36]);
  const citSize = d3.scaleSqrt().domain([0, 60000]).range([10, 36]);

  function nodeColor(d, mode) {
    if (mode === "department") return deptColor(d.department);
    if (mode === "degree") return degreeColor(d.degree);
    if (mode === "betweenness") return betweennessColor(d.betweenness);
    if (mode === "clustering") return clusteringColor(d.clustering);
    return deptColor(d.department);
  }

  function nodeSize(d, mode) {
    if (mode === "degree") return degreeSize(d.degree);
    if (mode === "betweenness") return btwSize(d.betweenness);
    if (mode === "pagerank") return prSize(d.pagerank);
    if (mode === "citations") return citSize(d.citations || 0);
    return degreeSize(d.degree);
  }

  function selectNode(node) {
    selectedNode = node;
    if (node) highlightedIds = new Set([node.id]);
    else highlightedIds = new Set();
    notify();
  }

  function highlightSet(ids) { highlightedIds = new Set(ids); notify() }

  function isHighlighted(id) { return highlightedIds.size === 0 || highlightedIds.has(id); }

  function onChange(fn) { listeners.push(fn); }

  function notify() { listeners.forEach(fn => fn({ selectedNode, highlightedIds })); }

  function getSelected() { return selectedNode; }

  return {
    deptColor, deptLabel, nodeColor, nodeSize, DEPARTMENTS, DEPARTMENT_COLORS,
    selectNode, highlightSet, isHighlighted, getSelected, onChange,
  };

})();
