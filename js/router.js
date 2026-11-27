"use strict";

// Fetch the existing HTML documents while keeping public URLs clean.
(() => {
  const routes = {
    '/': '/html/index.html',
    '/pricing': '/html/pricing.html',
    '/projects/urban-craft': '/html/urban-craft.html',
    '/projects/tru-gaming-club': '/html/tru-gaming-club.html'
  };
  const aliases = Object.fromEntries(Object.entries(routes).map(([route, file]) => [file, route]));
  let activeRoute = aliases[location.pathname] || location.pathname;
  let pageEvents = null;
  let pageObservers = [];
  let requestNumber = 0;
  const scriptCache = new Map();

  async function scriptSource(src) {
    if (!scriptCache.has(src)) {
      scriptCache.set(src, fetch(src).then(response => {
        if (!response.ok) throw new Error(`Unable to load ${src}`);
        return response.text();
      }).catch(error => { scriptCache.delete(src); throw error; }));
    }
    return scriptCache.get(src);
  }

  async function prepare(doc) {
    const scripts = [...doc.querySelectorAll('script[data-page-script]')];
    const sources = await Promise.all(scripts.map(script => scriptSource(script.getAttribute('src'))));
    return new Function('IntersectionObserver', sources.join('\n;\n'));
  }

  function initialise(run) {
    pageEvents?.abort();
    pageObservers.forEach(observer => observer.disconnect());
    pageObservers = [];
    pageEvents = new AbortController();

    const originalAdd = EventTarget.prototype.addEventListener;
    // Page initialisers register their events synchronously. Tie those listeners
    // to this page so returning to it cannot accumulate duplicate handlers.
    EventTarget.prototype.addEventListener = function(type, listener, options) {
      const config = typeof options === 'boolean' ? { capture: options } : { ...options };
      config.signal ||= pageEvents.signal;
      return originalAdd.call(this, type, listener, config);
    };
    const NativeObserver = window.IntersectionObserver;
    const TrackedObserver = NativeObserver && class extends NativeObserver {
      constructor(...args) {
        super(...args);
        pageObservers.push(this);
      }
    };
    try {
      run(TrackedObserver);
    } finally {
      EventTarget.prototype.addEventListener = originalAdd;
    }
  }

  function scrollToSection(section, focus = true) {
    const target = document.getElementById(section || 'main');
    if (!target) return;
    if (focus) {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
    if (!section || section === 'home') window.scrollTo({ top: 0, behavior: 'instant' });
    else target.scrollIntoView({ behavior: 'instant', block: 'start' });
  }

  async function navigate(route, section = '', push = true) {
    const request = ++requestNumber;
    if (route !== activeRoute) {
      document.documentElement.setAttribute('aria-busy', 'true');
      try {
        const response = await fetch(routes[route]);
        if (!response.ok) throw new Error('Page could not be loaded');
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        const run = await prepare(doc);
        // Load page-specific styles before showing the new document.
        await Promise.all([...doc.querySelectorAll('link[rel="stylesheet"]')].map(link => {
          const href = link.getAttribute('href');
          if ([...document.querySelectorAll('link[rel="stylesheet"]')].some(existing => existing.getAttribute('href') === href)) return;
          return new Promise((resolve, reject) => {
            const style = document.createElement('link');
            style.rel = 'stylesheet';
            style.href = href;
            style.onload = resolve;
            style.onerror = () => { style.remove(); reject(new Error('Styles could not be loaded')); };
            document.head.append(style);
          });
        }));
        if (request !== requestNumber) return;
        document.body.replaceChildren(...[...doc.body.childNodes].map(node => document.importNode(node, true)));
        document.title = doc.title;
        const description = document.querySelector('meta[name="description"]');
        if (description) description.content = doc.querySelector('meta[name="description"]')?.content || '';
        activeRoute = route;
        initialise(run);
      } catch (error) {
        if (request !== requestNumber) return;
        // Real-file fallback also works on local servers without rewrites.
        location.assign(routes[route] + (section ? `#${section}` : ''));
        return;
      } finally {
        if (request === requestNumber) document.documentElement.removeAttribute('aria-busy');
      }
    }
    if (request !== requestNumber) return;
    if (push) history.pushState({ route, section }, '', route);
    scrollToSection(section);
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin) return;
    const route = aliases[url.pathname] || url.pathname;
    if (!routes[route]) return;
    event.preventDefault();
    navigate(route, decodeURIComponent(url.hash.slice(1)));
  });

  window.addEventListener('popstate', event => {
    const route = event.state?.route || aliases[location.pathname] || location.pathname;
    if (routes[route]) navigate(route, event.state?.section || location.hash.slice(1), false);
  });

  prepare(document).then(run => {
    initialise(run);
    if (routes[activeRoute]) {
      const section = location.hash.slice(1);
      history.replaceState({ route: activeRoute, section }, '', activeRoute);
      if (section) scrollToSection(section, false);
    }
  }).catch(error => {
    console.error('Unable to initialise page:', error);
    // Navigation links still lead to real HTML documents without the router.
  });
})();
