// ==UserScript==
// @name Arc Folder Import for Zen
// @include main
// ==/UserScript==
(() => {
  if (window.__arcZenInstalled) return;
  window.__arcZenInstalled = true;
  const doc = window.document;
  const NS = 'http://www.w3.org/1999/xhtml';
  let current = null;
  const el = (tag, cls, txt) => {
    const node = doc.createElementNS(NS, tag);
    if (cls) node.className = cls;
    if (txt !== undefined) node.textContent = txt;
    return node;
  };
  const safeURL = raw => { try { const u = new URL(raw); return ['https:', 'http:'].includes(u.protocol) ? u.href : null; } catch { return null; } };
  const parse = html => {
    const match = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
    if (!match) throw new Error('Arc folder data not found. The page may have changed.');
    const d = JSON.parse(match[1]).props?.pageProps?.data;
    if (!d?.items || !d.rootID) throw new Error('Unexpected Arc folder format.');
    const byId = new Map(d.items.map(x => [x.id, x]));
    const root = byId.get(d.rootID);
    if (!root) throw new Error('Folder root not found.');
    const walk = (item, depth = 0, visited = new Set()) => {
      if (depth > 16 || visited.has(item.id)) return [];
      const next = new Set(visited); next.add(item.id);
      const url = safeURL(item.data?.tab?.savedURL);
      if (url) return [{title: item.data?.tab?.savedTitle || item.title || url, url, depth}];
      return (item.childrenIds || []).flatMap(id => byId.has(id) ? walk(byId.get(id), depth + 1, next) : []);
    };
    return {title: root.title || 'Shared Arc folder', tabs: walk(root)};
  };
  const mask = el('div', 'az-mask');
  const panel = el('section', 'az-panel');
  mask.append(panel);
  doc.documentElement.append(mask);
  const close = () => { mask.classList.remove('az-visible'); current = null; };
  mask.addEventListener('click', e => { if (e.target === mask) close(); });
  const heading = el('header', 'az-head');
  const logo = el('span', 'az-logo', '✦');
  const headingText = el('div');
  headingText.append(el('div', 'az-eyebrow', 'ARC → ZEN'), el('h1', '', 'Import a shared folder'));
  const exit = el('button', 'az-close', '×'); exit.addEventListener('click', close);
  heading.append(logo, headingText, exit);
  const intro = el('p', 'az-intro', 'Bring your Arc collections into Zen. Preview every link before importing.');
  const input = el('input', 'az-input'); input.placeholder = 'https://arc.net/folder/…'; input.setAttribute('aria-label','Arc folder URL');
  const load = el('button', 'az-primary', 'Preview folder');
  const status = el('div', 'az-status'); status.setAttribute('role', 'status');
  const content = el('div', 'az-content');
  const foot = el('div', 'az-foot');
  const pin = el('button', 'az-primary', 'Import as pinned tabs');
  const regular = el('button', 'az-secondary', 'Open as regular tabs');
  foot.append(pin, regular);
  panel.append(heading, intro, input, load, status, content, foot);
  const setStatus = (msg, error = false) => { status.textContent = msg; status.classList.toggle('az-error', error); };
  const render = folder => {
    content.replaceChildren();
    content.append(el('div', 'az-folder-title', folder.title), el('div', 'az-count', `${folder.tabs.length} links ready to import`));
    for (const t of folder.tabs) {
      const row = el('div', 'az-link'); row.style.paddingLeft = `${12 + Math.min(t.depth, 8) * 10}px`;
      const favicon = el('img', 'az-favicon');
      // Do not request remote favicons or inject arbitrary HTML.
      favicon.alt = ''; favicon.src = 'chrome://global/skin/icons/defaultFavicon.svg';
      const info = el('div', 'az-link-info'); info.append(el('div', 'az-link-title', t.title), el('div', 'az-link-url', t.url));
      row.append(favicon, info); content.append(row);
    }
    foot.classList.toggle('az-show', !!folder.tabs.length);
  };
  async function preview() {
    current = null; content.replaceChildren(); foot.classList.remove('az-show');
    let url;
    try { url = new URL(input.value.trim()); } catch { setStatus('Enter a valid Arc folder URL.', true); return; }
    if (url.protocol !== 'https:' || url.hostname !== 'arc.net' || !/^\/folder\/[0-9a-f-]{36}\/?$/i.test(url.pathname)) {
      setStatus('Use an https://arc.net/folder/… link.', true); return;
    }
    load.disabled = true; setStatus('Loading folder…');
    try {
      const response = await fetch(url.href, {credentials:'omit'});
      if (!response.ok) throw new Error(`Arc returned HTTP ${response.status}`);
      const html = await response.text();
      if (html.length > 5_000_000) throw new Error('Folder page is unexpectedly large.');
      current = parse(html); render(current); setStatus('Preview loaded. Choose how to import.');
    } catch (e) { setStatus(e.message || 'Could not load the folder.', true); }
    finally { load.disabled = false; }
  }
  async function importTabs(pinned) {
    if (!current?.tabs?.length || !window.gBrowser) return;
    const tabs = current.tabs.slice(0, 100);
    let added = 0;
    for (const t of tabs) {
      try {
        const tab = window.gBrowser.addTab(t.url, {inBackground: true, triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal()});
        if (pinned) window.gBrowser.pinTab(tab);
        added++;
      } catch (e) { console.error('[Arc Zen] import failed', e); }
    }
    setStatus(`Imported ${added} of ${tabs.length} tabs${pinned ? ' (pinned)' : ''}.`);
  }
  load.addEventListener('click', preview);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') preview(); });
  pin.addEventListener('click', () => importTabs(true));
  regular.addEventListener('click', () => importTabs(false));
  const launch = el('button', 'az-launch', '✦ Import Arc folder');
  launch.title = 'Import an Arc shared folder';
  launch.addEventListener('click', () => {
    const spec = window.gBrowser?.selectedBrowser?.currentURI?.spec || '';
    if (/^https:\/\/arc\.net\/folder\//i.test(spec)) input.value = spec;
    mask.classList.add('az-visible'); input.focus();
    if (input.value) preview();
  });
  // Browser chrome entry point: visible on every site, including Arc folder pages.
  const target = doc.getElementById('nav-bar') || doc.getElementById('navigator-toolbox') || doc.documentElement;
  target.append(launch);
  window.addEventListener('unload', () => {mask.remove(); launch.remove();}, {once:true});
})();
