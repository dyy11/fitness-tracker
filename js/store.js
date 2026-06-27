const Store = {
  _data: null,
  _supabase: null,

  _localKey: 'fitness_cache',

  async init() {
    this._supabase = supabase.createClient(
      'https://pncqxrdqfqztcrlnkokm.supabase.co',
      'sb_publishable_6SJQAohDRIF8TCVMzy3t_w_ATcXAjPI'
    );
    // 从 localStorage 加载缓存（立即显示）
    const cached = localStorage.getItem(this._localKey);
    if (cached) {
      try {
        this._data = JSON.parse(cached);
      } catch { /* ignore */ }
    }
    // 后台从 Supabase 同步最新数据
    try {
      await this._syncFromDB();
      localStorage.setItem(this._localKey, JSON.stringify(this._data));
    } catch (e) {
      console.error('Supabase 同步失败，使用缓存数据', e);
      if (!this._data) this._data = { plans: [], sessions: [] };
    }
  },

  _cacheSave() {
    if (this._data) {
      localStorage.setItem(this._localKey, JSON.stringify(this._data));
    }
  },

  async _syncFromDB() {
    const [plansRes, sessionsRes] = await Promise.all([
      this._supabase.from('plans').select('*').order('created_at', { ascending: false }),
      this._supabase.from('sessions').select('*'),
    ]);

    const plans = plansRes.data || [];
    const sessions = sessionsRes.data || [];

    const planIds = plans.map(p => p.id);
    const sessionIds = sessions.map(s => s.id);

    const [exRes, recRes] = await Promise.all([
      planIds.length > 0
        ? this._supabase.from('exercises').select('*').in('plan_id', planIds).order('sort_order')
        : { data: [] },
      sessionIds.length > 0
        ? this._supabase.from('records').select('*').in('session_id', sessionIds)
        : { data: [] },
    ]);

    const exercises = exRes.data || [];
    const records = recRes.data || [];

    this._data = { plans: [], sessions: [] };

    const exMap = {};
    exercises.forEach(ex => {
      if (!exMap[ex.plan_id]) exMap[ex.plan_id] = [];
      exMap[ex.plan_id].push({
        id: ex.id,
        planId: ex.plan_id,
        name: ex.name,
        unit: ex.unit,
        sortOrder: ex.sort_order,
      });
    });

    plans.forEach(p => {
      this._data.plans.push({
        id: p.id,
        name: p.name,
        note: p.note || '',
        exercises: exMap[p.id] || [],
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      });
    });

    const recMap = {};
    records.forEach(r => {
      if (!recMap[r.session_id]) recMap[r.session_id] = [];
      recMap[r.session_id].push({
        id: r.id,
        sessionId: r.session_id,
        exerciseId: r.exercise_id,
        setNumber: r.set_number,
        weight: r.weight,
        reps: r.reps,
        note: r.note || '',
      });
    });

    sessions.forEach(s => {
      this._data.sessions.push({
        id: s.id,
        planId: s.plan_id,
        date: s.date,
        note: s.note || '',
        records: recMap[s.id] || [],
      });
    });

    this._data.sessions.sort((a, b) => b.date - a.date);
  },

  _db(fn) {
    fn().catch(e => console.error('DB error:', e));
  },

  _genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  },

  // --- Plans ---
  getPlans() {
    return this._data.plans;
  },

  getPlan(id) {
    return this._data.plans.find(p => p.id === id);
  },

  createPlan(name, note) {
    const id = this._genId();
    const now = Date.now();
    const plan = { id, name, note: note || '', exercises: [], createdAt: now, updatedAt: now };
    this._data.plans.push(plan);
    this._cacheSave();
    this._db(() => this._supabase.from('plans').insert({ id, name, note: note || '', created_at: now, updated_at: now }));
    return plan;
  },

  updatePlan(id, data) {
    const plan = this.getPlan(id);
    if (!plan) return null;
    if (data.name !== undefined) plan.name = data.name;
    if (data.note !== undefined) plan.note = data.note;
    plan.updatedAt = Date.now();
    this._cacheSave();
    this._db(() => this._supabase.from('plans').update({ name: plan.name, note: plan.note, updated_at: plan.updatedAt }).eq('id', id));
    return plan;
  },

  deletePlan(id) {
    this._data.plans = this._data.plans.filter(p => p.id !== id);
    this._data.sessions = this._data.sessions.filter(s => s.planId !== id);
    this._cacheSave();
    this._db(() => this._supabase.from('plans').delete().eq('id', id));
  },

  getSessionCount(planId) {
    return this._data.sessions.filter(s => s.planId === planId).length;
  },

  // --- Exercises ---
  addExercise(planId, name, unit) {
    const plan = this.getPlan(planId);
    if (!plan) return null;
    const id = this._genId();
    const ex = { id, planId, name, unit: unit || 'kg', sortOrder: plan.exercises.length };
    plan.exercises.push(ex);
    this._cacheSave();
    this._db(() => this._supabase.from('exercises').insert({ id, plan_id: planId, name, unit: unit || 'kg', sort_order: ex.sortOrder }));
    return ex;
  },

  updateExercise(planId, exId, data) {
    const plan = this.getPlan(planId);
    if (!plan) return null;
    const ex = plan.exercises.find(e => e.id === exId);
    if (!ex) return null;
    if (data.name !== undefined) ex.name = data.name;
    if (data.unit !== undefined) ex.unit = data.unit;
    plan.updatedAt = Date.now();
    this._cacheSave();
    this._db(() => this._supabase.from('exercises').update({ name: ex.name, unit: ex.unit }).eq('id', exId));
    return ex;
  },

  deleteExercise(planId, exId) {
    const plan = this.getPlan(planId);
    if (!plan) return;
    plan.exercises = plan.exercises.filter(e => e.id !== exId);
    plan.updatedAt = Date.now();
    this._cacheSave();
    this._db(() => this._supabase.from('exercises').delete().eq('id', exId));
  },

  reorderExercises(planId, exIds) {
    const plan = this.getPlan(planId);
    if (!plan) return;
    exIds.forEach((id, i) => {
      const ex = plan.exercises.find(e => e.id === id);
      if (ex) ex.sortOrder = i;
    });
    plan.exercises.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  // --- Sessions ---
  getSessions(planId) {
    return this._data.sessions
      .filter(s => s.planId === planId)
      .sort((a, b) => b.date - a.date);
  },

  getSession(id) {
    return this._data.sessions.find(s => s.id === id);
  },

  createSession(planId, date, note) {
    const id = this._genId();
    const session = { id, planId, date: date || Date.now(), note: note || '', records: [] };
    this._data.sessions.push(session);
    this._cacheSave();
    this._db(() => this._supabase.from('sessions').insert({ id, plan_id: planId, date: session.date, note: session.note, created_at: Date.now() }));
    return session;
  },

  updateSession(id, data) {
    const s = this.getSession(id);
    if (!s) return null;
    if (data.note !== undefined) s.note = data.note;
    if (data.date !== undefined) s.date = data.date;
    this._cacheSave();
    this._db(() => this._supabase.from('sessions').update({ note: s.note, date: s.date }).eq('id', id));
    return s;
  },

  deleteSession(id) {
    this._data.sessions = this._data.sessions.filter(s => s.id !== id);
    this._cacheSave();
    this._db(() => this._supabase.from('sessions').delete().eq('id', id));
  },

  // --- Records ---
  addRecord(sessionId, exerciseId, setNumber, weight, reps, note) {
    const session = this.getSession(sessionId);
    if (!session) return null;
    const rec = {
      id: this._genId(),
      sessionId,
      exerciseId,
      setNumber: Number(setNumber) || 0,
      weight: Number(weight) || 0,
      reps: Number(reps) || 0,
      note: note || '',
    };
    session.records.push(rec);
    return rec;
  },

  saveSessionRecords(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) return;
    const records = session.records;
    this._cacheSave();
    this._db(async () => {
      await this._supabase.from('records').delete().eq('session_id', sessionId);
      if (records.length > 0) {
        await this._supabase.from('records').insert(
          records.map(r => ({
            id: r.id,
            session_id: sessionId,
            exercise_id: r.exerciseId,
            set_number: r.setNumber,
            weight: r.weight,
            reps: r.reps,
            note: r.note || '',
          }))
        );
      }
    });
  },

  updateRecord(sessionId, recId, data) {
    const session = this.getSession(sessionId);
    if (!session) return null;
    const rec = session.records.find(r => r.id === recId);
    if (!rec) return null;
    if (data.weight !== undefined) rec.weight = Number(data.weight);
    if (data.reps !== undefined) rec.reps = Number(data.reps);
    if (data.setNumber !== undefined) rec.setNumber = Number(data.setNumber);
    if (data.note !== undefined) rec.note = data.note;
    return rec;
  },

  deleteRecord(sessionId, recId) {
    const session = this.getSession(sessionId);
    if (!session) return;
    session.records = session.records.filter(r => r.id !== recId);
  },

  // --- Stats ---
  getExerciseProgress(planId, exerciseId) {
    const sessions = this.getSessions(planId);
    return sessions.map(s => {
      const recs = s.records.filter(r => r.exerciseId === exerciseId);
      if (recs.length === 0) return null;
      const maxWeight = Math.max(...recs.map(r => r.weight));
      const totalVolume = recs.reduce((sum, r) => sum + r.weight * r.reps, 0);
      return { date: s.date, maxWeight, totalVolume, sets: recs.length };
    }).filter(Boolean);
  },

  getExercise(id) {
    for (const p of this._data.plans) {
      const ex = p.exercises.find(e => e.id === id);
      if (ex) return { ...ex, planName: p.name, planId: p.id };
    }
    return null;
  },

  getSessionByDate(planId, dateStr) {
    return this._data.sessions.find(s => {
      if (s.planId !== planId) return false;
      const d = new Date(s.date);
      const sd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return sd === dateStr;
    }) || null;
  },
};
