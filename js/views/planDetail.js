const PlanDetailView = {
  _planId: null,

  render(params) {
    this._planId = params.planId;
    const plan = Store.getPlan(this._planId);
    if (!plan) return '<div class="list-empty">计划不存在</div>';

    const sessionCount = countSessions(this._planId);
    let html = `
      <div class="back-link" onclick="router.push('/')">← 返回计划列表</div>
      <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:8px">
        <div>
          <h2>${esc(plan.name)}</h2>
          ${plan.note ? `<p style="color:var(--text2);font-size:.9rem">${esc(plan.note)}</p>` : ''}
          <p style="color:var(--text2);font-size:.8rem">${plan.exercises.length} 个项目 · ${sessionCount} 次训练</p>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn btn-sm btn-outline" onclick="PlanDetailView.showEditPlanModal()">编辑计划</button>
          <button class="btn btn-sm" onclick="router.push('/train/${this._planId}')">开始训练</button>
          ${sessionCount > 0 ? `<button class="btn btn-sm btn-outline" onclick="router.push('/history/${this._planId}')">历史记录</button>` : ''}
        </div>
      </div>
      <hr style="border-color:var(--border);margin:16px 0">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
        <h3 style="font-size:1rem">训练项目</h3>
        <button class="btn btn-sm btn-primary" onclick="PlanDetailView.showAddExerciseModal()">+ 添加项目</button>
      </div>
    `;

    if (plan.exercises.length === 0) {
      html += `<div class="list-empty">还没有训练项目，添加你的第一个训练项目吧</div>`;
    } else {
      html += plan.exercises.map((ex, i) => `
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">${esc(ex.name)}</div>
              <div class="card-sub">单位：${esc(ex.unit)}</div>
            </div>
            <div class="card-actions">
              <button class="btn btn-sm btn-outline" onclick="PlanDetailView.showEditExerciseModal('${ex.id}')">编辑</button>
              <button class="btn btn-sm btn-outline" onclick="router.push('/stats/${ex.id}')">图表</button>
              <button class="btn btn-sm btn-danger" onclick="PlanDetailView.confirmDeleteExercise('${ex.id}')">删除</button>
            </div>
          </div>
        </div>
      `).join('');
    }

    return html;
  },

  showEditPlanModal() {
    const plan = Store.getPlan(this._planId);
    if (!plan) return;
    app.openModal(`
      <h2>编辑计划</h2>
      <div class="form-group">
        <label>计划名称</label>
        <input id="modal-plan-name" value="${esc(plan.name)}" autofocus>
      </div>
      <div class="form-group">
        <label>备注</label>
        <textarea id="modal-plan-note">${esc(plan.note)}</textarea>
      </div>
      <button class="btn btn-primary" onclick="PlanDetailView.savePlan()">保存</button>
      <button class="btn btn-outline" onclick="app.closeModal()">取消</button>
    `);
    setTimeout(() => document.getElementById('modal-plan-name')?.focus(), 100);
  },

  savePlan() {
    const name = document.getElementById('modal-plan-name').value.trim();
    if (!name) return alert('请输入计划名称');
    const note = document.getElementById('modal-plan-note').value.trim();
    Store.updatePlan(this._planId, { name, note });
    app.closeModal();
    router.push(`/plan/${this._planId}`);
  },

  showAddExerciseModal() {
    app.openModal(`
      <h2>添加训练项目</h2>
      <div class="form-group">
        <label>项目名称</label>
        <input id="modal-ex-name" placeholder="例如：杠铃卧推" autofocus>
      </div>
      <div class="form-group">
        <label>单位</label>
        <select id="modal-ex-unit">
          <option value="kg">kg</option>
          <option value="次">次</option>
          <option value="分钟">分钟</option>
          <option value="km">km</option>
          <option value="个">个</option>
        </select>
      </div>
      <button class="btn btn-primary" onclick="PlanDetailView.addExercise()">添加</button>
      <button class="btn btn-outline" onclick="app.closeModal()">取消</button>
    `);
    setTimeout(() => document.getElementById('modal-ex-name')?.focus(), 100);
  },

  addExercise() {
    const name = document.getElementById('modal-ex-name').value.trim();
    if (!name) return alert('请输入项目名称');
    const unit = document.getElementById('modal-ex-unit').value;
    Store.addExercise(this._planId, name, unit);
    app.closeModal();
    router.push(`/plan/${this._planId}`);
  },

  showEditExerciseModal(exId) {
    const plan = Store.getPlan(this._planId);
    const ex = plan.exercises.find(e => e.id === exId);
    if (!ex) return;
    app.openModal(`
      <h2>编辑训练项目</h2>
      <div class="form-group">
        <label>项目名称</label>
        <input id="modal-ex-name" value="${esc(ex.name)}" autofocus>
      </div>
      <div class="form-group">
        <label>单位</label>
        <select id="modal-ex-unit">
          <option value="kg" ${ex.unit === 'kg' ? 'selected' : ''}>kg</option>
          <option value="次" ${ex.unit === '次' ? 'selected' : ''}>次</option>
          <option value="分钟" ${ex.unit === '分钟' ? 'selected' : ''}>分钟</option>
          <option value="km" ${ex.unit === 'km' ? 'selected' : ''}>km</option>
          <option value="个" ${ex.unit === '个' ? 'selected' : ''}>个</option>
        </select>
      </div>
      <button class="btn btn-primary" onclick="PlanDetailView.saveExercise('${exId}')">保存</button>
      <button class="btn btn-outline" onclick="app.closeModal()">取消</button>
    `);
    setTimeout(() => document.getElementById('modal-ex-name')?.focus(), 100);
  },

  saveExercise(exId) {
    const name = document.getElementById('modal-ex-name').value.trim();
    if (!name) return alert('请输入项目名称');
    const unit = document.getElementById('modal-ex-unit').value;
    Store.updateExercise(this._planId, exId, { name, unit });
    app.closeModal();
    router.push(`/plan/${this._planId}`);
  },

  confirmDeleteExercise(exId) {
    if (!confirm('确定删除此训练项目吗？')) return;
    Store.deleteExercise(this._planId, exId);
    router.push(`/plan/${this._planId}`);
  },
};
