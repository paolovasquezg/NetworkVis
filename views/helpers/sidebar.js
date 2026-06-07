function buildSidebar(nodes, predictions, graph) {

  // ── DEPT FILTER DROPDOWN ────────────────────────────────────────────────
  const deptSel = document.getElementById("dept-filter");
  const depts = [...new Set(nodes.map(n => n.department))].filter(Boolean).sort();
  depts.forEach(d => {
    const opt = document.createElement("option");
    opt.value = d;
    opt.textContent = d.replace("Departamento de ", "").replace("Departamento ", "");
    deptSel.appendChild(opt);
  });

  deptSel.addEventListener("change", () => {
    graph.filterDept(deptSel.value);
  });

  // ── RANKING LIST ────────────────────────────────────────────────────────
  const rankingTitle = document.getElementById("ranking-title");
  const rankingTask = document.getElementById("ranking-task");
  const rankingList = document.getElementById("ranking-list");

  function buildRanking(metric, title, task, fmt) {
    rankingTitle.textContent = title;
    rankingTask.textContent = task;
    const sorted = [...nodes].sort((a, b) => b[metric] - a[metric]).slice(0, 15);
    const maxVal = sorted[0][metric] || 1;
    rankingList.innerHTML = "";
    sorted.forEach((n, i) => {
      const li = document.createElement("li");
      li.className = "ranking-item";
      li.dataset.id = n.id;
      li.innerHTML = `
        <span class="rank-num">${i + 1}</span>
        <div class="rank-bar-wrap">
          <div class="rank-name" title="${n.name}">${n.name}</div>
          <div class="rank-bar-bg">
            <div class="rank-bar" style="width:${(n[metric] / maxVal * 100).toFixed(1)}%"></div>
          </div>
        </div>
        <span class="rank-val">${fmt(n[metric])}</span>
      `;
      li.addEventListener("click", () => State.selectNode(n));
      rankingList.appendChild(li);
    });
  }

  // ── TASK PILLS → update ranking & color ─────────────────────────────────
  const pills = document.querySelectorAll(".task-pill");
  let showingPredictions = false;

  pills.forEach(pill => {
    pill.addEventListener("click", () => {
      pills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");
      const t = pill.dataset.task;

      if (t === "t1") {
        buildRanking("degree", "Top Collaborators", "T1", v => v);
        graph.updateColor("degree");
        graph.updateSize("degree");
        graph.showPredictions(false);
        showingPredictions = false;
        document.getElementById("color-mode").value = "degree";
        document.getElementById("size-mode").value = "degree";
      } else if (t === "t2") {
        buildRanking("betweenness", "Top Bridges", "T2", v => v.toFixed(3));
        graph.updateColor("betweenness");
        graph.updateSize("betweenness");
        graph.showPredictions(false);
        showingPredictions = false;
        document.getElementById("color-mode").value = "betweenness";
        document.getElementById("size-mode").value = "betweenness";
      } else if (t === "t3") {
        buildRanking("clustering", "Dept Cohesion", "T3", v => v.toFixed(3));
        graph.updateColor("clustering");
        graph.updateSize("degree");
        graph.showPredictions(false);
        showingPredictions = false;
        document.getElementById("color-mode").value = "clustering";
        document.getElementById("size-mode").value = "degree";
      } else if (t === "t4") {
        buildRanking("degree", "Top Collaborators", "T4", v => v);
        graph.updateColor("department");
        graph.showPredictions(true);
        showingPredictions = true;
        document.getElementById("color-mode").value = "department";
      }
    });
  });

  // Initial ranking
  buildRanking("degree", "Top Collaborators", "T1", v => v);

  // ── DETAIL CARD ─────────────────────────────────────────────────────────
  const detailBody = document.getElementById("detail-body");

  State.onChange(({ selectedNode }) => {
    // Update ranking highlights
    document.querySelectorAll(".ranking-item").forEach(li => {
      li.classList.toggle("highlighted", selectedNode && +li.dataset.id === selectedNode.id);
    });

    if (!selectedNode) {
      detailBody.innerHTML = `<div class="detail-placeholder"><span>Click a node to explore</span></div>`;
      return;
    }

    const n = selectedNode;
    const photoEl = n.image_url
      ? `<img class="detail-photo" src="${n.image_url}" alt="${n.name}" onerror="this.style.display='none'">`
      : `<div class="detail-photo-placeholder">👤</div>`;

    const areas = n.research_areas
      ? n.research_areas.split(";").slice(0, 4).map(s => s.trim()).join(" · ")
      : "—";

    const validEmail = n.email && n.email.includes("@") && !n.email.startsWith("?");
    const emailEl = validEmail
      ? `<a class="detail-email" href="mailto:${n.email}">${n.email}</a>`
      : `<div class="detail-email">—</div>`;

    detailBody.innerHTML = `
      <div class="detail-top">
        ${photoEl}
        <div class="detail-info">
          <div class="detail-name">${n.name}</div>
          <div class="detail-dept">${n.department || "Unknown"}</div>
          ${emailEl}
        </div>
      </div>
      <div class="metrics-grid">
        <div class="metric-box">
          <div class="metric-label">Degree</div>
          <div class="metric-value">${n.degree}</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Betweenness</div>
          <div class="metric-value highlight">${n.betweenness.toFixed(3)}</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Clustering</div>
          <div class="metric-value green">${n.clustering.toFixed(3)}</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Citations</div>
          <div class="metric-value">${(n.citations || 0).toLocaleString()}</div>
        </div>
      </div>
      <div class="detail-areas">
        <strong>Research Areas</strong>
        ${areas}
      </div>
    `;
  });

  // ── PREDICTIONS LIST ─────────────────────────────────────────────────────
  const predList = document.getElementById("pred-list");
  const nodeById = new Map(nodes.map(n => [n.id, n]));

  predictions.slice(0, 20).forEach(p => {
    const li = document.createElement("li");
    li.className = "pred-item";
    li.innerHTML = `
      <div class="pred-names">
        <span>${p.source_name.split(" ").slice(-1)[0]}, ${p.source_name.split(" ")[0]}</span>
        <span class="pred-arrow">→</span>
        <span>${p.target_name.split(" ").slice(-1)[0]}, ${p.target_name.split(" ")[0]}</span>
      </div>
      <div class="pred-meta">
        <span>Similarity: ${p.jaccard.toFixed(3)}</span>
        <span>Common neighbors: ${p.common_neighbors}</span>
      </div>
    `;
    li.addEventListener("click", () => {
      const sn = nodeById.get(p.source);
      const tn = nodeById.get(p.target);
      if (sn) State.selectNode(sn);
      State.highlightSet(new Set([p.source, p.target]));
    });
    predList.appendChild(li);
  });
}
