const app = {
  _currentView: null,

  async init() {
    await Store.init();
    router.init();
  },

  render(route) {
    const content = document.getElementById('content');
    let html = '';

    switch (route.name) {
      case 'planList':
        html = PlanListView.render();
        this._currentView = null;
        break;
      case 'planDetail':
        html = PlanDetailView.render(route.params);
        this._currentView = 'PlanDetailView';
        break;
      case 'train':
        html = TrainView.render(route.params);
        this._currentView = 'TrainView';
        break;
      case 'history':
        html = HistoryView.render(route.params);
        this._currentView = null;
        break;
      case 'stats':
        html = StatsView.render(route.params);
        this._currentView = 'StatsView';
        break;
      default:
        html = PlanListView.render();
    }

    content.innerHTML = html;

    if (route.name === 'stats') {
      setTimeout(() => StatsView.afterRender(), 50);
    }
  },

  openModal(html) {
    document.getElementById('modal-body').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-body').innerHTML = '';
  },
};

function esc(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', () => app.init());
