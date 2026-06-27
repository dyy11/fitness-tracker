const TrainView = {
  _planId: null,
  _sessionId: null,
  _exerciseData: {},

  render(params) {
    this._planId = params.planId;
    const plan = Store.getPlan(this._planId);
    if (!plan) return '<div class="list-empty">计划不存在</div>';

    if (plan.exercises.length === 0) {
      return `
        <div class="back-link" onclick="router.push('/plan/${this._planId}')">← 返回计划详情</div>
        <div class="list-empty">该计划还没有训练项目，请先添加项目</div>
      `;
    }

    if (!this._sessionId || !Store.getSession(this._sessionId)) {
      this._initSessionForDate(this._getTodayStr());
    }

    const session = Store.getSession(this._sessionId);
    return this._buildUI(plan, session);
  },

  _getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  _initSessionForDate(dateStr) {
    const plan = Store.getPlan(this._planId);
    const existing = Store.getSessionByDate(this._planId, dateStr);
    if (existing) {
      this._isNewSession = false;
      this._loadSessionData(existing);
    } else {
      this._isNewSession = true;
      const session = Store.createSession(this._planId, new Date(dateStr + 'T00:00:00').getTime(), '');
      this._sessionId = session.id;
      this._exerciseData = {};
      plan.exercises.forEach(ex => {
        this._exerciseData[ex.id] = { name: ex.name, unit: ex.unit, sets: [] };
        this._addEmptySet(ex.id);
      });
    }
  },

  _loadSessionData(session) {
    this._sessionId = session.id;
    const plan = Store.getPlan(this._planId);
    this._exerciseData = {};
    plan.exercises.forEach(ex => {
      const recs = session.records
        .filter(r => r.exerciseId === ex.id)
        .sort((a, b) => a.setNumber - b.setNumber);
      this._exerciseData[ex.id] = {
        name: ex.name,
        unit: ex.unit,
        sets: recs.length > 0
          ? recs.map(r => ({ setNumber: r.setNumber, weight: String(r.weight), reps: String(r.reps) }))
          : [{ setNumber: 1, weight: '', reps: '' }],
      };
    });
  },

  _addEmptySet(exId) {
    const nextNum = this._exerciseData[exId].sets.length + 1;
    this._exerciseData[exId].sets.push({ setNumber: nextNum, weight: '', reps: '' });
  },

  _buildUI(plan, session) {
    const dateStr = new Date(session.date).toISOString().slice(0, 10);
    let html = `
      <div class="back-link" onclick="TrainView.cancelExit()">← 退出训练</div>
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
        <h2>训练：${esc(plan.name)}</h2>
        <div style="display:flex;align-items:center;gap:8px">
          <label style="color:var(--text2);font-size:.85rem">日期：</label>
          <input type="date" id="train-date" value="${dateStr}" style="width:auto" onchange="TrainView.updateDate()">
        </div>
      </div>
      <hr style="border-color:var(--border);margin:16px 0">
      <div class="form-group">
        <label>训练备注（选填）</label>
        <textarea id="train-note" placeholder="例如：今天状态不错..." style="min-height:40px"></textarea>
      </div>
    `;

    plan.exercises.forEach(ex => {
      const data = this._exerciseData[ex.id];
      html += `
        <div class="card" style="margin-bottom:16px">
          <div class="card-header">
            <div class="card-title">${esc(ex.name)} <span class="tag">${esc(ex.unit)}</span></div>
            <button class="btn btn-sm btn-outline" onclick="TrainView.addSet('${ex.id}')">+ 组</button>
          </div>
          <div style="display:grid;grid-template-columns:30px 1fr 1fr 40px;gap:6px;align-items:center;margin-top:8px;color:var(--text2);font-size:.8rem">
            <span>组</span>
            <span>重量 (${esc(ex.unit)})</span>
            <span>次数</span>
            <span></span>
          </div>
      `;

      data.sets.forEach((set, i) => {
        html += `
          <div class="record-row">
            <span style="width:24px;text-align:center;color:var(--text2);font-size:.85rem">${set.setNumber}</span>
            <input type="number" step="0.5" min="0" placeholder="重量"
              value="${set.weight}" oninput="TrainView.updateSet('${ex.id}', ${i}, 'weight', this.value)">
            <input type="number" min="0" placeholder="次数"
              value="${set.reps}" oninput="TrainView.updateSet('${ex.id}', ${i}, 'reps', this.value)">
            <button class="btn btn-sm btn-danger" style="width:auto;padding:4px 8px"
              onclick="TrainView.removeSet('${ex.id}', ${i})" ${data.sets.length <= 1 ? 'disabled' : ''}>×</button>
          </div>
        `;
      });

      html += `</div>`;
    });

    html += `
      <div style="display:flex;gap:8px;margin-top:24px;padding-bottom:40px">
        <button class="btn btn-primary" onclick="TrainView.saveAndView()" style="flex:1">保存并查看历史</button>
        <button class="btn btn-success" onclick="TrainView.saveAndNew()" style="flex:1">保存并继续训练</button>
      </div>
    `;

    return html;
  },

  updateSet(exId, idx, field, val) {
    const data = this._exerciseData[exId];
    if (data && data.sets[idx]) {
      data.sets[idx][field] = val;
    }
  },

  addSet(exId) {
    const data = this._exerciseData[exId];
    data.sets.push({ setNumber: data.sets.length + 1, weight: '', reps: '' });
    this._refreshUI();
  },

  removeSet(exId, idx) {
    const data = this._exerciseData[exId];
    if (data.sets.length <= 1) return;
    data.sets.splice(idx, 1);
    data.sets.forEach((s, i) => s.setNumber = i + 1);
    this._refreshUI();
  },

  updateDate() {
    const newDateStr = document.getElementById('train-date').value;
    if (!newDateStr) return;

    const existing = Store.getSessionByDate(this._planId, newDateStr);
    if (existing && existing.id !== this._sessionId) {
      this._saveAll();
      this._loadSessionData(existing);
      this._refreshUI();
    } else if (!existing) {
      Store.updateSession(this._sessionId, { date: new Date(newDateStr + 'T00:00:00').getTime() });
    }
  },

  _saveAll() {
    const session = Store.getSession(this._sessionId);
    if (!session) return;
    session.records = [];
    const note = document.getElementById('train-note')?.value?.trim() || '';
    session.note = note;

    const plan = Store.getPlan(this._planId);
    plan.exercises.forEach(ex => {
      const data = this._exerciseData[ex.id];
      if (!data) return;
      data.sets.forEach(s => {
        const w = parseFloat(s.weight);
        const r = parseInt(s.reps);
        if (isNaN(w) || isNaN(r) || w <= 0 || r <= 0) return;
        Store.addRecord(this._sessionId, ex.id, s.setNumber, w, r, '');
      });
    });
    Store.updateSession(this._sessionId, { note });
    Store.saveSessionRecords(this._sessionId);
  },

  _resetSession() {
    this._sessionId = null;
    this._initSessionForDate(this._getTodayStr());
  },

  saveAndView() {
    this._saveAll();
    this._sessionId = null;
    router.push(`/history/${this._planId}`);
  },

  saveAndNew() {
    this._saveAll();
    this._resetSession();
    this._refreshUI();
  },

  cancelExit() {
    const session = Store.getSession(this._sessionId);
    if (this._isNewSession && session && session.records.length === 0) {
      const note = document.getElementById('train-note')?.value?.trim();
      if (!note) {
        Store.deleteSession(this._sessionId);
        this._sessionId = null;
        router.push(`/plan/${this._planId}`);
        return;
      }
    }
    this._saveAll();
    this._sessionId = null;
    router.push(`/plan/${this._planId}`);
  },

  updateDate() {
    const newDateStr = document.getElementById('train-date').value;
    if (!newDateStr) return;

    const existing = Store.getSessionByDate(this._planId, newDateStr);
    if (existing && existing.id !== this._sessionId) {
      this._saveAll();
      this._loadSessionData(existing);
      this._refreshUI();
    } else if (!existing) {
      Store.updateSession(this._sessionId, { date: new Date(newDateStr + 'T00:00:00').getTime() });
    }
  },

  saveAndNew() {
    this._saveAll();
    this._resetSession();
    this._refreshUI();
  },

  cancelExit() {
    const session = Store.getSession(this._sessionId);
    if (this._isNewSession && session && session.records.length === 0) {
      const note = document.getElementById('train-note')?.value?.trim();
      if (!note) {
        Store.deleteSession(this._sessionId);
        this._sessionId = null;
        router.push(`/plan/${this._planId}`);
        return;
      }
    }
    this._saveAll();
    this._sessionId = null;
    router.push(`/plan/${this._planId}`);
  },

  _refreshUI() {
    const content = document.getElementById('content');
    const plan = Store.getPlan(this._planId);
    const session = Store.getSession(this._sessionId);
    if (plan && session) {
      content.innerHTML = this._buildUI(plan, session);
    }
  },
};
