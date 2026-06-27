const HistoryView = {
  _planId: null,

  render(params) {
    this._planId = params.planId;
    const plan = Store.getPlan(this._planId);
    if (!plan) return '<div class="list-empty">计划不存在</div>';

    const sessions = Store.getSessions(this._planId);
    let html = `
      <div class="back-link" onclick="router.push('/plan/${this._planId}')">← 返回计划详情</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <h2>训练历史 - ${esc(plan.name)}</h2>
        <button class="btn btn-sm btn-primary" onclick="router.push('/train/${this._planId}')">+ 新训练</button>
      </div>
    `;

    if (sessions.length === 0) {
      html += `<div class="list-empty">还没有训练记录</div>`;
    } else {
      html += sessions.map(s => {
        const dateStr = formatDate(s.date);
        const exSummary = getSessionSummary(s, plan);
        return `
          <div class="card session-card" onclick="HistoryView.showSessionDetail('${s.id}')">
            <div class="card-header">
              <div>
                <div class="card-title">${dateStr}</div>
                ${s.note ? `<div class="card-sub">${esc(s.note)}</div>` : ''}
                <div class="card-sub" style="margin-top:4px">${exSummary}</div>
              </div>
              <div class="card-actions" onclick="event.stopPropagation()">
                <button class="btn btn-sm btn-danger" onclick="HistoryView.confirmDelete('${s.id}')">删除</button>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    return html;
  },

  showSessionDetail(sessionId) {
    const session = Store.getSession(sessionId);
    if (!session) return;
    const plan = Store.getPlan(session.planId);
    if (!plan) return;

    const dateStr = formatDate(session.date);
    let html = `
      <h2>${dateStr}</h2>
      ${session.note ? `<p style="color:var(--text2);margin-bottom:12px">${esc(session.note)}</p>` : ''}
      <hr style="border-color:var(--border);margin:12px 0">
    `;

    plan.exercises.forEach(ex => {
      const recs = session.records.filter(r => r.exerciseId === ex.id).sort((a, b) => a.setNumber - b.setNumber);
      if (recs.length === 0) return;
      html += `
        <div class="card" style="margin-bottom:10px">
          <div class="card-title" style="margin-bottom:8px">${esc(ex.name)} <span class="tag">${esc(ex.unit)}</span></div>
          <div style="display:grid;grid-template-columns:30px 60px 60px;gap:8px;color:var(--text2);font-size:.8rem;margin-bottom:4px">
            <span>组</span><span>重量</span><span>次数</span>
          </div>
          ${recs.map(r => `
            <div style="display:grid;grid-template-columns:30px 60px 60px;gap:8px;font-size:.9rem;padding:2px 0">
              <span style="color:var(--text2)">${r.setNumber}</span>
              <span>${r.weight}</span>
              <span>${r.reps}</span>
            </div>
          `).join('')}
        </div>
      `;
    });

    html += `
      <button class="btn btn-outline" onclick="app.closeModal()" style="margin-top:8px">关闭</button>
    `;

    app.openModal(html);
  },

  confirmDelete(sessionId) {
    if (!confirm('确定删除此次训练记录吗？')) return;
    Store.deleteSession(sessionId);
    router.push(`/history/${this._planId}`);
  },
};

function getSessionSummary(session, plan) {
  return plan.exercises.map(ex => {
    const count = session.records.filter(r => r.exerciseId === ex.id).length;
    return count > 0 ? `${esc(ex.name)} ${count}组` : null;
  }).filter(Boolean).join(' · ');
}

function formatDate(ts) {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
  return `${y}/${m}/${day} 周${weekdays[d.getDay()]}`;
}
