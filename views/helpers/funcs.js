function BuildNeighborMap(nodes, edges) {
  const map = new Map();
  nodes.forEach(n => map.set(n.id, new Set()));
  edges.forEach(e => {
    map.get(e.source)?.add(e.target);
    map.get(e.target)?.add(e.source);
  });
  return map;
}

function TooltipHtml(d) {
  const researchAreas = d.research_areas
    ? d.research_areas.split(";").slice(0, 3).map(s => s.trim()).join(", ")
    : "—";
  return `
    <strong>${d.name}</strong>
    <div class="tt-dept">${State.deptLabel(d.department)}</div>
    <div>Degree: <span class="tt-metric">${d.degree}</span> &nbsp;
         Betweenness: <span class="tt-metric">${d.betweenness.toFixed(3)}</span></div>
    <div>Influence: <span class="tt-metric">${d.pagerank.toFixed(4)}</span> &nbsp;
         Clustering: <span class="tt-metric">${d.clustering.toFixed(3)}</span></div>
    <div style="margin-top:4px;font-size:.65rem;color:#5a7090">${researchAreas}</div>
  `;
}

function LegendHtml(mode, activeDeptFilter, departmentLabels) {
  if (GRADIENT_CONFIGS[mode]) {
    const { title, min, max, from, to } = GRADIENT_CONFIGS[mode];
    return `
      <div class="legend-title">${title}</div>
      <div class="legend-bar" style="background:linear-gradient(to right,${from},${to})"></div>
      <div class="legend-range"><span>${min}</span><span>${max}</span></div>`;
  }

  const items = departmentLabels.map(dept => {
    const active = activeDeptFilter !== "all" && dept === activeDeptFilter;
    return `
      <div class="legend-item${active ? " legend-item-active" : ""}">
        <div class="legend-dot" style="background:${State.deptColor(dept)}"></div>
        <span>${State.deptLabel(dept)}</span>
      </div>`;
  }).join("");

  return `<div class="legend-title">Department</div><div class="legend-items">${items}</div>`;
}
