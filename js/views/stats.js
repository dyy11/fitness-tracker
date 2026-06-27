const StatsView = {
  _exerciseId: null,
  _chart: null,
  _filter: 'all',

  render(params) {
    this._exerciseId = params.exerciseId;
    const ex = Store.getExercise(this._exerciseId);
    if (!ex) return '<div class="list-empty">项目不存在</div>';

    if (this._chart) {
      this._chart.destroy();
      this._chart = null;
    }

    const plan = Store.getPlan(ex.planId);
    const progress = Store.getExerciseProgress(ex.planId, this._exerciseId);

    let html = `
      <div class="back-link" onclick="router.push('/plan/${ex.planId}')">← 返回计划详情</div>
      <div class="stats-header">
        <div>
          <h2>${esc(ex.name)} <span class="tag">${esc(ex.unit)}</span></h2>
          <p style="color:var(--text2);font-size:.85rem">${esc(plan.name)}</p>
        </div>
      </div>
      <div class="filter-bar" style="margin-top:16px">
        <button class="btn btn-sm ${this._filter === 'all' ? 'btn-primary' : 'btn-outline'}" onclick="StatsView.setFilter('all')">全部</button>
        <button class="btn btn-sm ${this._filter === '3m' ? 'btn-primary' : 'btn-outline'}" onclick="StatsView.setFilter('3m')">近3月</button>
        <button class="btn btn-sm ${this._filter === '1m' ? 'btn-primary' : 'btn-outline'}" onclick="StatsView.setFilter('1m')">近1月</button>
        <button class="btn btn-sm ${this._filter === '2w' ? 'btn-primary' : 'btn-outline'}" onclick="StatsView.setFilter('2w')">近2周</button>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <button class="btn btn-sm btn-outline" onclick="StatsView.switchMode('maxWeight')">最大重量</button>
        <button class="btn btn-sm btn-outline" onclick="StatsView.switchMode('volume')">总训练量</button>
      </div>
      <div class="chart-container">
        <canvas id="progress-chart"></canvas>
      </div>
    `;

    if (progress.length === 0) {
      html = html.replace('<canvas id="progress-chart"></canvas>',
        '<div class="list-empty" style="padding:60px 16px">还没有训练数据，开始训练后图表将自动生成</div>');
    }

    return html;
  },

  afterRender() {
    if (!document.getElementById('progress-chart')) return;
    this._renderChart('maxWeight');
  },

  _renderChart(mode = 'maxWeight') {
    const canvas = document.getElementById('progress-chart');
    if (!canvas) return;
    if (this._chart) { this._chart.destroy(); this._chart = null; }

    const ex = Store.getExercise(this._exerciseId);
    if (!ex) return;

    let progress = Store.getExerciseProgress(ex.planId, this._exerciseId);

    const now = Date.now();
    if (this._filter === '3m') {
      const cutoff = now - 90 * 24 * 60 * 60 * 1000;
      progress = progress.filter(p => p.date >= cutoff);
    } else if (this._filter === '1m') {
      const cutoff = now - 30 * 24 * 60 * 60 * 1000;
      progress = progress.filter(p => p.date >= cutoff);
    } else if (this._filter === '2w') {
      const cutoff = now - 14 * 24 * 60 * 60 * 1000;
      progress = progress.filter(p => p.date >= cutoff);
    }

    if (progress.length === 0) {
      document.querySelector('.chart-container').innerHTML =
        '<div class="list-empty" style="padding:60px 16px">该时间范围内没有数据</div>';
      return;
    }

    const labels = progress.map(p => {
      const d = new Date(p.date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    });

    const data = progress.map(p => mode === 'maxWeight' ? p.maxWeight : p.totalVolume);
    const label = mode === 'maxWeight' ? `最大重量 (${ex.unit})` : `总训练量 (${ex.unit})`;
    const color = mode === 'maxWeight' ? '#e94560' : '#4ade80';

    this._chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label,
          data,
          borderColor: color,
          backgroundColor: color + '33',
          borderWidth: 2,
          pointBackgroundColor: color,
          pointRadius: 4,
          pointHoverRadius: 6,
          fill: true,
          tension: 0.3,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#aaa' } },
        },
        scales: {
          x: {
            ticks: { color: '#aaa', maxTicksLimit: 12 },
            grid: { color: '#2a2a4a' },
          },
          y: {
            beginAtZero: true,
            ticks: { color: '#aaa' },
            grid: { color: '#2a2a4a' },
          },
        },
      },
    });
  },

  setFilter(val) {
    this._filter = val;
    router.push(`/stats/${this._exerciseId}`);
  },

  switchMode(mode) {
    this._renderChart(mode);
  },
};
