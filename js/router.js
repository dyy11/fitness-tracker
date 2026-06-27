const router = {
  currentRoute: null,

  init() {
    window.addEventListener('hashchange', () => this.resolve());
    this.resolve();
  },

  push(path) {
    const currentHash = window.location.hash.slice(1) || '/';
    window.location.hash = path;
    if (currentHash === path) {
      app.render(parseRoute(path));
    }
  },

  resolve() {
    const hash = window.location.hash.slice(1) || '/';
    this.currentRoute = hash;
    app.render(parseRoute(hash));
  },
};

function parseRoute(hash) {
  const parts = hash.split('/').filter(Boolean);
  const route = { name: '', params: {} };

  if (parts.length === 0 || parts[0] === '') {
    route.name = 'planList';
  } else if (parts[0] === 'plan' && parts[1]) {
    route.name = 'planDetail';
    route.params.planId = parts[1];
  } else if (parts[0] === 'train' && parts[1]) {
    route.name = 'train';
    route.params.planId = parts[1];
  } else if (parts[0] === 'history' && parts[1]) {
    route.name = 'history';
    route.params.planId = parts[1];
  } else if (parts[0] === 'stats' && parts[1]) {
    route.name = 'stats';
    route.params.exerciseId = parts[1];
  } else {
    route.name = 'planList';
  }
  return route;
}
