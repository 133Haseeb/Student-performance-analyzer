const API_URL = 'http://localhost:5000/analyze';

const fileInput = document.getElementById('fileInput');
const fileInfo = document.getElementById('fileInfo');
const analyzeBtn = document.getElementById('analyzeBtn');
const uploadBox = document.getElementById('uploadBox');
const loader = document.getElementById('loader');
const dashboard = document.getElementById('dashboard');
const resetBtn = document.getElementById('resetBtn');

let barChartInstance = null;
let diffChartInstance = null;
let metricsChartInstance = null;

fileInput.addEventListener('change', function () {
  if (this.files.length > 0) {
    fileInfo.textContent = 'Selected: ' + this.files[0].name;
    analyzeBtn.disabled = false;
  } else {
    fileInfo.textContent = '';
    analyzeBtn.disabled = true;
  }
});

analyzeBtn.addEventListener('click', function () {
  const file = fileInput.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('file', file);

  document.getElementById('uploadSection').classList.add('hidden');
  loader.classList.remove('hidden');

  fetch(API_URL, {
    method: 'POST',
    body: formData
  })
    .then(function (res) {
      if (!res.ok) throw new Error('Server error: ' + res.status);
      return res.json();
    })
    .then(function (data) {
      loader.classList.add('hidden');
      renderDashboard(data);
      dashboard.classList.remove('hidden');
    })
    .catch(function (err) {
      loader.classList.add('hidden');
      document.getElementById('uploadSection').classList.remove('hidden');
      alert('Error: ' + err.message + '\n\nMake sure the Flask server is running on localhost:5000');
    });
});

resetBtn.addEventListener('click', function () {
  dashboard.classList.add('hidden');
  document.getElementById('uploadSection').classList.remove('hidden');
  fileInput.value = '';
  fileInfo.textContent = '';
  analyzeBtn.disabled = true;
  destroyCharts();
});

function destroyCharts() {
  if (barChartInstance) { barChartInstance.destroy(); barChartInstance = null; }
  if (diffChartInstance) { diffChartInstance.destroy(); diffChartInstance = null; }
  if (metricsChartInstance) { metricsChartInstance.destroy(); metricsChartInstance = null; }
}

function renderDashboard(data) {
  renderSummaryCards(data);
  renderBarChart(data.chart_data);
  renderDiffChart(data.diff_distribution);
  renderMetricsChart(data.evaluation_metrics);
  renderMetricsTable(data.evaluation_metrics);
  renderSuspiciousTable(data.suspicious_students);
  renderRegressionStats(data.regression_stats);
}

function renderSummaryCards(data) {
  const cards = [
    { label: 'Total Students', value: data.total_students, cls: 'blue' },
    { label: 'Suspicious Cases', value: data.suspicious_count, cls: 'red' },
    { label: 'Normal Cases', value: data.total_students - data.suspicious_count, cls: 'green' },
    { label: 'Threshold Used', value: '±15 marks', cls: '' }
  ];

  const container = document.getElementById('summaryCards');
  container.innerHTML = '';
  cards.forEach(function (c) {
    const div = document.createElement('div');
    div.className = 'stat-card';
    div.innerHTML =
      '<p class="stat-label">' + c.label + '</p>' +
      '<p class="stat-value ' + c.cls + '">' + c.value + '</p>';
    container.appendChild(div);
  });
}

function renderBarChart(chartData) {
  if (!chartData) return;
  const ctx = document.getElementById('barChart').getContext('2d');
  barChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartData.labels,
      datasets: [
        {
          label: 'Actual Marks',
          data: chartData.actual,
          backgroundColor: 'rgba(79, 110, 247, 0.7)',
          borderRadius: 4
        },
        {
          label: 'AI Predicted',
          data: chartData.predicted,
          backgroundColor: 'rgba(252, 129, 74, 0.7)',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 12 } } }
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 0,
          max: 100,
          grid: { color: '#f1f5f9' },
          ticks: { font: { size: 11 } }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 } }
        }
      }
    }
  });
}

function renderDiffChart(diffData) {
  if (!diffData) return;
  const ctx = document.getElementById('diffChart').getContext('2d');
  diffChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: diffData.labels,
      datasets: [
        {
          label: 'Number of Students',
          data: diffData.counts,
          backgroundColor: diffData.labels.map(function (l) {
            return parseInt(l) >= 15 ? 'rgba(229, 62, 62, 0.7)' : 'rgba(47, 133, 90, 0.7)';
          }),
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#f1f5f9' },
          ticks: { font: { size: 11 } }
        },
        x: {
          title: { display: true, text: 'Score Difference', font: { size: 11 } },
          grid: { display: false },
          ticks: { font: { size: 11 } }
        }
      }
    }
  });
}

function renderMetricsChart(metrics) {
  if (!metrics || metrics.length === 0) return;
  const ctx = document.getElementById('metricsChart').getContext('2d');
  const metricKeys = ['Accuracy', 'Precision', 'Recall', 'F1-score'];
  const colors = ['rgba(79,110,247,0.7)', 'rgba(252,129,74,0.7)'];

  metricsChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: metricKeys,
      datasets: metrics.map(function (m, i) {
        return {
          label: m.Model,
          data: metricKeys.map(function (k) { return parseFloat((m[k] * 100).toFixed(1)); }),
          backgroundColor: colors[i],
          borderRadius: 4
        };
      })
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { font: { size: 12 } } },
        tooltip: {
          callbacks: {
            label: function (ctx) { return ctx.dataset.label + ': ' + ctx.parsed.y + '%'; }
          }
        }
      },
      scales: {
        y: {
          min: 0,
          max: 100,
          grid: { color: '#f1f5f9' },
          ticks: { callback: function (v) { return v + '%'; }, font: { size: 11 } }
        },
        x: {
          grid: { display: false },
          ticks: { font: { size: 11 } }
        }
      }
    }
  });
}

function renderMetricsTable(metrics) {
  if (!metrics || metrics.length === 0) return;
  const table = document.getElementById('metricsTable');
  const keys = ['Model', 'Accuracy', 'Precision', 'Recall', 'F1-score'];

  table.innerHTML =
    '<thead><tr>' +
    keys.map(function (k) { return '<th>' + k + '</th>'; }).join('') +
    '</tr></thead><tbody>' +
    metrics.map(function (m) {
      return '<tr>' +
        keys.map(function (k) {
          return '<td>' + (k === 'Model' ? m[k] : (m[k] * 100).toFixed(1) + '%') + '</td>';
        }).join('') +
        '</tr>';
    }).join('') +
    '</tbody>';
}

function renderSuspiciousTable(students) {
  const tbody = document.getElementById('suspiciousBody');
  const badge = document.getElementById('suspiciousCount');
  const noMsg = document.getElementById('noSuspicious');
  const tableWrap = document.querySelector('.table-wrap');

  badge.textContent = (students ? students.length : 0) + ' flagged';

  if (!students || students.length === 0) {
    tableWrap.classList.add('hidden');
    noMsg.classList.remove('hidden');
    return;
  }

  noMsg.classList.add('hidden');
  tableWrap.classList.remove('hidden');

  tbody.innerHTML = students.map(function (s) {
    var diff = parseFloat(s.Score_Difference).toFixed(1);
    return '<tr>' +
      '<td>' + (s.Student_ID || 'N/A') + '</td>' +
      '<td>' + parseFloat(s.Reported_Score).toFixed(1) + '</td>' +
      '<td>' + parseFloat(s.AI_Score).toFixed(1) + '</td>' +
      '<td><strong>' + diff + '</strong></td>' +
      '<td><span class="status-suspicious">Suspicious</span></td>' +
      '</tr>';
  }).join('');
}

function renderRegressionStats(stats) {
  if (!stats) return;
  const container = document.getElementById('regressionStats');
  container.innerHTML =
    '<div class="reg-card"><p class="reg-label">Regression MAE</p><p class="reg-value">' +
    parseFloat(stats.mae).toFixed(2) + '</p></div>' +
    '<div class="reg-card"><p class="reg-label">R² Score</p><p class="reg-value">' +
    parseFloat(stats.r2).toFixed(4) + '</p></div>';
}
