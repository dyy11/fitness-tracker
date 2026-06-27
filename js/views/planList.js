const PlanListView = {
  render() {
    const plans = Store.getPlans();
    let html = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2>我的计划</h2>
        <button class="btn btn-primary" onclick="PlanListView.showCreateModal()">+ 新建计划</button>
      </div>
    `;

    if (plans.length === 0) {
      html += `<div class="list-empty">还没有健身计划，点击上方按钮创建第一个计划</div>`;
    } else {
      html += plans.map(p => `
        <div class="card" onclick="router.push('/plan/${p.id}')" style="cursor:pointer">
          <div class="card-header">
            <div>
              <div class="card-title">${esc(p.name)}</div>
              ${p.note ? `<div class="card-sub">${esc(p.note)}</div>` : ''}
              <div class="card-sub" style="margin-top:6px">
                ${p.exercises.length} 个项目 · ${countSessions(p.id)} 次训练
              </div>
            </div>
            <div class="card-actions" onclick="event.stopPropagation()">
              <button class="btn btn-sm btn-outline" onclick="PlanListView.showEditModal('${p.id}')">编辑</button>
              <button class="btn btn-sm btn-danger" onclick="PlanListView.confirmDelete('${p.id}')">删除</button>
            </div>
          </div>
        </div>
      `).join('');
    }

    return html;
  },

  showCreateModal() {
    app.openModal(`
      <h2>新建计划</h2>
      <div class="form-group">
        <label>计划名称</label>
        <input id="modal-plan-name" placeholder="例如：增肌计划" autofocus>
      </div>
      <div class="form-group">
        <label>备注（选填）</label>
        <textarea id="modal-plan-note" placeholder="备注信息"></textarea>
      </div>
      <button class="btn btn-primary" onclick="PlanListView.createPlan()">创建</button>
      <button class="btn btn-outline" onclick="app.closeModal()">取消</button>
    `);
    setTimeout(() => document.getElementById('modal-plan-name')?.focus(), 100);
  },

  showEditModal(id) {
    const plan = Store.getPlan(id);
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
      <button class="btn btn-primary" onclick="PlanListView.saveEdit('${id}')">保存</button>
      <button class="btn btn-outline" onclick="app.closeModal()">取消</button>
    `);
    setTimeout(() => document.getElementById('modal-plan-name')?.focus(), 100);
  },

  createPlan() {
    const name = document.getElementById('modal-plan-name').value.trim();
    if (!name) return alert('请输入计划名称');
    const note = document.getElementById('modal-plan-note').value.trim();
    Store.createPlan(name, note);
    app.closeModal();
    router.push('/');
  },

  saveEdit(id) {
    const name = document.getElementById('modal-plan-name').value.trim();
    if (!name) return alert('请输入计划名称');
    const note = document.getElementById('modal-plan-note').value.trim();
    Store.updatePlan(id, { name, note });
    app.closeModal();
    router.push('/');
  },

  confirmDelete(id) {
    const plan = Store.getPlan(id);
    if (!plan) return;
    if (!confirm(`确定删除计划「${plan.name}」吗？相关的训练记录也会被删除。`)) return;
    Store.deletePlan(id);
    router.push('/');
  },

};

function countSessions(planId) {
  return Store.getSessionCount(planId);
}
