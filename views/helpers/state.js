const State = (() => {
  let selectedNode = null;
  let highlightedIds = new Set();
  const listeners = [];

  // Department color palette — distinct, dark-bg friendly
  const DEPARTMENTS = [
    "Departamento de Bioingeniería e Ingeniería Química",
    "Departamento de Ingeniería Mecánica y de la Energía",
    "Departamento de Ciencias",
    "Departamento de Ingeniería Electrónica y Mecatrónica",
    "Departamento de Ingeniería Civil y Ambiental",
    "Departamento de Ciencia de la Computación",
    "Departamento de Ingeniería Industrial y Gestión de la Ingeniería",
    "Departamento de Humanidades, Artes y Ciencias Sociales",
    "Departamento de Negocios Digitales",
    "Departamento de Ciencia de Datos y Sistemas de Información",
    "Departamento de Ciencia de Computación y de Datos",
    "Departamento de Sistemas y Seguridad de la Información",
    "Facultad de Negocios",
    "Unknown Department",
    "",
  ];

  const DEPT_COLORS = [
    "#00d4ff", "#ff6b35", "#00e5a0", "#f5d000",
    "#c77dff", "#ff4d6d", "#4cc9f0", "#f8961e",
    "#43aa8b", "#577590", "#f94144", "#90be6d",
    "#e63946", "#adb5bd", "#6c757d",
  ];

  const deptColorScale = d3.scaleOrdinal()
    .domain(DEPARTMENTS)
    .range(DEPT_COLORS);

  function deptColor(dept) {
    return deptColorScale(dept || "");
  }

  // Metric color scales
  const degreeColor = d3.scaleSequential(d3.interpolateYlOrRd).domain([0, 60]);
  const betweennessColor = d3.scaleSequential(d3.interpolatePuBu).domain([0, 0.25]);
  const clusteringColor = d3.scaleSequential(d3.interpolateGreens).domain([0, 1]);

  function nodeColor(d, mode) {
    if (mode === "department") return deptColor(d.department);
    if (mode === "degree") return degreeColor(d.degree);
    if (mode === "betweenness") return betweennessColor(d.betweenness);
    if (mode === "clustering") return clusteringColor(d.clustering);
    return deptColor(d.department);
  }

  // Size scales
  const degreeSize  = d3.scaleSqrt().domain([0, 60]).range([10, 36]);
  const btwSize     = d3.scaleSqrt().domain([0, 0.25]).range([10, 36]);
  const prSize      = d3.scaleSqrt().domain([0, 0.02]).range([10, 36]);
  const citSize     = d3.scaleSqrt().domain([0, 60000]).range([10, 36]);

  function nodeSize(d, mode) {
    if (mode === "degree")      return degreeSize(d.degree);
    if (mode === "betweenness") return btwSize(d.betweenness);
    if (mode === "pagerank")    return prSize(d.pagerank);
    if (mode === "citations")   return citSize(d.citations || 0);
    return degreeSize(d.degree);
  }

  function selectNode(node) {
    selectedNode = node;
    if (node) {
      highlightedIds = new Set([node.id]);
    } else {
      highlightedIds = new Set();
    }
    notify();
  }

  function highlightSet(ids) {
    highlightedIds = new Set(ids);
    notify();
  }

  function isHighlighted(id) {
    return highlightedIds.size === 0 || highlightedIds.has(id);
  }

  function onChange(fn) { listeners.push(fn); }

  function notify() { listeners.forEach(fn => fn({ selectedNode, highlightedIds })); }

  function getSelected() { return selectedNode; }

  return {
    deptColor, nodeColor, nodeSize,
    DEPARTMENTS, DEPT_COLORS,
    selectNode, highlightSet, isHighlighted,
    getSelected, onChange,
  };
})();
