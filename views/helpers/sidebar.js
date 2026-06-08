function Sidebar(nodes, predictions, graph) {

  // ── DOM refs ──────────────────────────────────────────────────────────────
  const departmentSelect = document.getElementById("dept-filter");
  const rankingTitle = document.getElementById("ranking-title");
  const rankingTask = document.getElementById("ranking-task");
  const rankingList = document.getElementById("ranking-list");
  const detailBody = document.getElementById("detail-body");
  const predictionList = document.getElementById("pred-list");
  const taskPills = document.querySelectorAll(".task-pill");

  const nodesById = new Map(nodes.map(n => [n.id, n]));
  const departments = [...new Set(nodes.map(n => n.department))].filter(Boolean).sort();

  departments.forEach(dept => {
    const opt = document.createElement("option");
    opt.value = dept;
    opt.textContent = State.deptLabel(dept);
    departmentSelect.appendChild(opt);
  });

  departmentSelect.addEventListener("change", () => {
    graph.filterDept(departmentSelect.value);
  });

  function Ranking(metric, title, task, fmt) {
    rankingTitle.textContent = title;
    rankingTask.textContent = task;

    const sorted = [...nodes].sort((a, b) => b[metric] - a[metric]).slice(0, 15);
    const maxVal = sorted[0][metric] || 1;

    rankingList.innerHTML = "";
    sorted.forEach((node, i) => {

      const item = document.createElement("li");
      item.className = "ranking-item";
      item.dataset.id = node.id;
      item.innerHTML = `
        <span class="rank-num">${i + 1}</span>
        <div class="rank-bar-wrap">
          <div class="rank-name" title="${node.name}">${node.name}</div>
          <div class="rank-bar-bg">
            <div class="rank-bar" style="width:${(node[metric] / maxVal * 100).toFixed(1)}%"></div>
          </div>
        </div>
        <span class="rank-val">${fmt(node[metric])}</span>
      `;
      item.addEventListener("click", () => State.selectNode(node));
      rankingList.appendChild(item);

    });
  }

  let predictionsVisible = false;

  taskPills.forEach(pill => {
    pill.addEventListener("click", () => {
      taskPills.forEach(p => p.classList.remove("active"));
      pill.classList.add("active");

      const task = pill.dataset.task;

      if (task === "t1") {
        Ranking("degree", "Top Collaborators", "T1", v => v);
        graph.updateColor("degree");
        graph.updateSize("degree");
        graph.showPredictions(false);
        predictionsVisible = false;
        document.getElementById("color-mode").value = "degree";
        document.getElementById("size-mode").value = "degree";

      } else if (task === "t2") {
        Ranking("betweenness", "Top Bridges", "T2", v => v.toFixed(3));
        graph.updateColor("betweenness");
        graph.updateSize("betweenness");
        graph.showPredictions(false);
        predictionsVisible = false;
        document.getElementById("color-mode").value = "betweenness";
        document.getElementById("size-mode").value = "betweenness";

      } else if (task === "t3") {
        Ranking("clustering", "Tight Circles", "T3", v => v.toFixed(3));
        graph.updateColor("clustering");
        graph.updateSize("degree");
        graph.showPredictions(false);
        predictionsVisible = false;
        document.getElementById("color-mode").value = "clustering";
        document.getElementById("size-mode").value = "degree";

      } else if (task === "t4") {
        Ranking("degree", "Top Collaborators", "T4", v => v);
        graph.updateColor("department");
        graph.showPredictions(true);
        predictionsVisible = true;
        document.getElementById("color-mode").value = "department";
      }
    });
  });

  Ranking("degree", "Top Collaborators", "T1", v => v);

  State.onChange(({ selectedNode }) => {
    rankingList.querySelectorAll(".ranking-item").forEach(item => {
      item.classList.toggle("highlighted", selectedNode && +item.dataset.id === selectedNode.id)
    });

    if (!selectedNode) {
      detailBody.innerHTML = `<div class="detail-placeholder"><span>Click a node to explore</span></div>`;
      return;
    }

    const n = selectedNode;

    const photoEl = n.image_url
      ? `<img class="detail-photo" src="${n.image_url}" alt="${n.name}" onerror="this.style.display='none'">`
      : `<div class="detail-photo-placeholder">👤</div>`;

    const areas = n.research_areas ? n.research_areas.split(";").slice(0, 4).map(s => s.trim()).join(" · ") : "—";

    const validEmail = n.email && n.email.includes("@") && !n.email.startsWith("?");

    const emailEl = validEmail ? `<a class="detail-email" href="mailto:${n.email}">${n.email}</a>` : `<div class="detail-email">—</div>`;

    detailBody.innerHTML = `
      <div class="detail-top">
        ${photoEl}
        <div class="detail-info">
          <div class="detail-name">${n.name}</div>
          <div class="detail-dept">${State.deptLabel(n.department) || "Unknown"}</div>
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


  predictions.slice(0, 20).forEach(p => {
    const item = document.createElement("li");
    item.className = "pred-item";
    item.innerHTML = `
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
    item.addEventListener("click", () => {
      const sourceNode = nodesById.get(p.source);
      if (sourceNode) {
        State.selectNode(sourceNode);
        graph.filterPredToNode(sourceNode);
      }
    });
    predictionList.appendChild(item);
  });
}
