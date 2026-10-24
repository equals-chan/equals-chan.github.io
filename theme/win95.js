/* ==========================================================================
   Win95 Docsify Theme
   Turns a Docsify site into a Windows 95 desktop.

   Requires:
   - Docsify 4/5 with the default hash router
   - loadSidebar: true (for the folder/file tree)
   - WinBox (bundled in theme/vendor/winbox.min.js)

   This file registers itself as a Docsify plugin. Load it BEFORE Docsify
   initializes (i.e. before DOMContentLoaded), usually right after the
   Docsify script tag.
   ========================================================================== */

(function () {
  'use strict';

  if (window.__WIN95_DOCSIFY_LOADED__) {
    return;
  }
  window.__WIN95_DOCSIFY_LOADED__ = true;

  const themeScript =
    document.currentScript ||
    Array.from(document.scripts).find(script =>
      /win95(?:\.min)?\.js(?:\?|$)/i.test(script.src || ''),
    );
  const themeBase = new URL(
    '.',
    (themeScript && themeScript.src) || window.location.href,
  );

  const VERSION = '1.1.0';

  const DEFAULTS = {
    boot: true,
    openWelcome: true,
    drive: 'C:',
    rootName: 'My Computer',
    explorerWidth: 560,
    explorerHeight: 540,
    docWidth: 600,
    docHeight: 560,
    appWidth: 760,
    appHeight: 540,
    exeSuffix: true,
    externalLinks: 'window', // 'window' | 'browser'
    docFooter: true,
    clock24: false,
    wallpaper: '',
    icons: {},
    desktop: null,
    apps: [],
    startMenu: null,
    startBanner: 'Windows 95',
    about: null,
  };

  const ICON_FILES = {
    computer: 'computer.png',
    drive: 'disk.png',
    folder: 'folder.ico',
    file: 'file.ico',
    filePng: 'file.png',
    exe: 'exe.svg',
    recycle: 'recycle.svg',
    help: 'help.svg',
    run: 'run.svg',
    shutdown: 'shutdown.svg',
  };

  const state = {
    enabled: false,
    vm: null,
    opts: null,
    built: false,
    booted: false,
    icons: {},
    seq: 0,
    cascade: 0,
    fs: null,
    fileByPath: new Map(),
    apps: [],
    appWindows: new Map(),
    docWindows: new Map(),
    windows: new Map(),
    activeId: null,
    docQueue: [],
    activeLoad: null,
    lastRenderedPath: '',
    explorer: null,
    explorerCtl: null,
    taskList: null,
    startMenu: null,
    startItems: null,
    startOpen: false,
    clockEl: null,
    bootEl: null,
    docWidthOverride: 0,
    initialDocRect: null,
    lastDocPos: null,
    explorerRect: null,
    viewMode: 'icons',
    treeWidth: 200,
    expanded: new Set(),
  };

  /* ------------------------------------------------------------------------
     Tiny DOM helpers
     ------------------------------------------------------------------------ */

  function el(tag, className, html) {
    const node = document.createElement(tag);
    if (className) {
      node.className = className;
    }
    if (html !== undefined) {
      node.innerHTML = html;
    }
    return node;
  }

  function iconUrl(name) {
    if (!name) {
      return state.icons.file;
    }
    if (ICON_FILES[name]) {
      return state.icons[name];
    }
    if (/^(https?:|data:|\/|\.)/i.test(name)) {
      return name;
    }
    if (name.includes('/')) {
      return name;
    }
    if (/\.[a-z0-9]+$/i.test(name)) {
      return new URL(`assets/icons/${name}`, themeBase).href;
    }
    return state.icons.file;
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, ch => {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      }[ch];
    });
  }

  function underline(label) {
    const text = String(label || '');
    if (!text) {
      return '';
    }
    return `<u>${esc(text.charAt(0))}</u>${esc(text.slice(1))}`;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function taskbarHeight() {
    return parseInt(
      getComputedStyle(document.documentElement).getPropertyValue(
        '--w95-taskbar',
      ),
      10,
    ) || 30;
  }

  function directChild(parent, tag) {
    for (const child of parent.children) {
      if (child.tagName === tag) {
        return child;
      }
    }
    return null;
  }

  function directText(node) {
    let text = '';
    for (const child of node.childNodes) {
      if (child.nodeType === 3) {
        text += child.nodeValue;
      }
    }
    return text.trim();
  }

  /* ------------------------------------------------------------------------
     Route helpers
     ------------------------------------------------------------------------ */

  function canonicalPath(input) {
    let path = String(input == null ? '' : input);

    if (!path) {
      return '/';
    }

    if (/^https?:/i.test(path)) {
      try {
        const url = new URL(path);
        path = url.hash ? url.hash.slice(1) : url.pathname;
      } catch {
        // keep the original value
      }
    }

    const hashIdx = path.indexOf('#');
    if (hashIdx >= 0) {
      path = path.slice(hashIdx + 1);
    }

    path = path.split('?')[0];

    try {
      path = decodeURI(path);
    } catch {
      // ignore malformed URIs
    }

    if (!path.startsWith('/')) {
      path = '/' + path;
    }

    path = path.replace(/\.md$/i, '');
    path = path.replace(/\/README$/i, '/');
    path = path.replace(/\/+$/, '');

    return path || '/';
  }

  function splitHash(href) {
    let raw = String(href || '');
    const hashIdx = raw.indexOf('#');
    if (hashIdx >= 0) {
      raw = raw.slice(hashIdx + 1);
    }
    const parts = raw.split('?');
    return {
      path: parts[0] || '/',
      id: parts[1] ? new URLSearchParams(parts[1]).get('id') || '' : '',
    };
  }

  function hrefToHash(item) {
    const href = String(item.href || '');
    if (href.startsWith('#')) {
      return href;
    }
    const path = item.pathKey || canonicalPath(href);
    const id = item.anchorId ? `?id=${encodeURIComponent(item.anchorId)}` : '';
    return `#${path}${id}`;
  }

  function isExternalHref(href) {
    return /^(https?:)?\/\//i.test(String(href || ''));
  }

  function isAppHref(href, anchor) {
    if (anchor && anchor.classList && anchor.classList.contains('w95-exe')) {
      return true;
    }
    const raw = String(href || '');
    if (!raw) {
      return false;
    }
    if (/^mailto:/i.test(raw) || /^tel:/i.test(raw)) {
      return false;
    }
    if (isExternalHref(raw)) {
      return true;
    }
    const clean = raw.split('?')[0].split('#')[0];
    return /\.(exe|com|bat|cmd|html?|app)$/i.test(clean);
  }

  function isDocHref(href) {
    const raw = String(href || '');
    return raw.startsWith('#/') || /\.(md|markdown)$/i.test(raw.split('?')[0]);
  }

  function hrefToAppUrl(href) {
    const raw = String(href || '');
    if (!raw) {
      return '';
    }
    if (/^(https?:|data:)/i.test(raw)) {
      return raw;
    }
    let path = raw;
    if (path.startsWith('#')) {
      path = path.slice(1);
    }
    path = path.split('#')[0];
    if (!path.startsWith('/')) {
      path = '/' + path;
    }
    try {
      if (state.vm && state.vm.router && state.vm.router.getFile) {
        const file = state.vm.router.getFile(path);
        if (isExternalHref(file)) {
          return file;
        }
        return new URL(file, window.location.origin).href;
      }
    } catch {
      // fall through
    }
    try {
      return new URL(raw, window.location.href).href;
    } catch {
      return raw;
    }
  }

  function configAppUrl(url) {
    const raw = String(url || '');
    if (!raw) {
      return '';
    }
    if (/^(https?:|data:)/i.test(raw)) {
      return raw;
    }
    if (/^www\./i.test(raw)) {
      return `https://${raw}`;
    }
    try {
      return new URL(raw, window.location.href).href;
    } catch {
      return raw;
    }
  }

  function displayDate(index) {
    void index;
    return '95/8/24';
  }

  /* ------------------------------------------------------------------------
     Sidebar parsing → virtual file system
     ------------------------------------------------------------------------ */

  function parseSidebar() {
    const nav = document.querySelector('.sidebar-nav');
    if (!nav) {
      return [];
    }
    const rootUl = Array.prototype.find.call(
      nav.children || [],
      child => child.tagName === 'UL' || child.tagName === 'OL',
    );
    if (!rootUl) {
      return [];
    }
    return parseSidebarList(rootUl);
  }

  function parseSidebarList(ul) {
    const result = [];

    for (const li of Array.from(ul.children)) {
      if (li.tagName !== 'LI') {
        continue;
      }

      const link = directChild(li, 'A');
      const sublist = directChild(li, 'UL') || directChild(li, 'OL');

      if (link) {
        if (link.classList.contains('section-link')) {
          continue;
        }
        const href = link.getAttribute('href') || '';
        const label =
          (link.textContent || '').trim() ||
          link.getAttribute('title') ||
          href;
        if (!href || href === '#' || href.startsWith('javascript:')) {
          continue;
        }
        if (/^mailto:/i.test(href) || /^tel:/i.test(href)) {
          continue;
        }
        const iconClass = Array.from(link.classList || []).find(className =>
          className.startsWith('w95-icon-'),
        );
        const iconKey = iconClass
          ? iconClass.slice('w95-icon-'.length)
          : '';
        const icon =
          iconKey && state.opts.icons
            ? state.opts.icons[iconKey] || ''
            : '';
        result.push({
          type: 'file',
          label,
          href,
          app: isAppHref(href, link),
          icon,
        });
        continue;
      }

      const titleEl = directChild(li, 'P');
      let name = titleEl ? (titleEl.textContent || '').trim() : directText(li);
      if (!name) {
        name = 'Folder';
      }

      let children = [];
      if (sublist && !sublist.classList.contains('app-sub-sidebar')) {
        children = parseSidebarList(sublist);
      }

      result.push({ type: 'folder', name, children });
    }

    return result;
  }

  function makeFolder(name, kind, parent) {
    return {
      id: `w95-fs-${++state.seq}`,
      kind,
      type: 'folder',
      name,
      fileName: name,
      parent,
      children: [],
      pathKey: '',
      displayPath: '',
    };
  }

  function makeFileNode(item, parent) {
    const app = Boolean(item.app);
    let title = item.label;
    let fileName;

    if (app) {
      const base = title.replace(/\.(exe|html?)$/i, '');
      fileName = state.opts.exeSuffix
        ? `${base}.exe`
        : title || 'Program.exe';
      if (/\.exe$/i.test(title)) {
        fileName = title;
      }
    } else {
      fileName = /\.(md|markdown|html?)$/i.test(title)
        ? title
        : `${title}.md`;
    }

    const query = String(item.href || '').split('?')[1] || '';
    const anchorId = query
      ? new URLSearchParams(query).get('id') || ''
      : '';

    return {
      id: `w95-fs-${++state.seq}`,
      kind: app ? 'app' : 'file',
      type: 'file',
      name: title,
      fileName,
      parent,
      children: [],
      href: item.href,
      appUrl: app ? hrefToAppUrl(item.href) : '',
      pathKey: app ? '' : canonicalPath(item.href),
      anchorId,
      icon: item.icon || '',
      displayPath: '',
    };
  }

  function assignPaths(node, parentPath) {
    if (node.kind === 'computer') {
      node.displayPath = state.opts.rootName;
      for (const child of node.children) {
        assignPaths(child, '');
      }
      return;
    }

    if (node.kind === 'drive') {
      node.displayPath = `${node.name}\\`;
      for (const child of node.children) {
        assignPaths(child, node.displayPath);
      }
      return;
    }

    const base = parentPath || '';
    if (node.type === 'folder') {
      node.displayPath = `${base}${node.name}\\`;
      for (const child of node.children) {
        assignPaths(child, node.displayPath);
      }
      return;
    }

    node.displayPath = `${base}${node.fileName}`;
  }

  function buildFileSystem(sidebarItems) {
    if (!sidebarItems.length) {
      const route = canonicalPath(
        (state.vm && state.vm.route && state.vm.route.path) ||
          window.location.hash ||
          '/',
      );
      sidebarItems = [
        {
          type: 'file',
          label:
            route === '/'
              ? 'README'
              : route.split('/').filter(Boolean).pop() || 'Document',
          href: `#${route}`,
          app: false,
        },
      ];
    }

    const computer = makeFolder(state.opts.rootName, 'computer', null);
    const drive = makeFolder(state.opts.drive, 'drive', computer);
    computer.children = [drive];

    function convert(items, parent) {
      const out = [];
      for (const item of items) {
        if (item.type === 'folder') {
          const folder = makeFolder(item.name, 'folder', parent);
          folder.children = convert(item.children || [], folder);
          out.push(folder);
        } else {
          out.push(makeFileNode(item, parent));
        }
      }
      return out;
    }

    drive.children = convert(sidebarItems, drive);
    assignPaths(computer, '');

    state.fileByPath.clear();
    state.apps = [];

    (function collect(node) {
      if (node.type === 'file') {
        if (node.kind === 'app') {
          if (node.appUrl) {
            state.apps.push({
              title: node.name,
              url: node.appUrl,
              icon: node.icon || 'exe',
            });
          }
        } else if (node.pathKey && !state.fileByPath.has(node.pathKey)) {
          state.fileByPath.set(node.pathKey, node);
        }
      }
      for (const child of node.children || []) {
        collect(child);
      }
    })(computer);

    for (const app of state.opts.apps || []) {
      if (!app || !app.url) {
        continue;
      }
      const url = configAppUrl(app.url);
      const existing = state.apps.find(item => item.url === url);
      if (existing) {
        if (app.icon && (!existing.icon || existing.icon === 'exe')) {
          existing.icon = app.icon;
        }
        if (app.width) {
          existing.width = app.width;
        }
        if (app.height) {
          existing.height = app.height;
        }
        continue;
      }
      state.apps.push({
        title: app.title || app.name || 'Program',
        url,
        icon: app.icon || 'exe',
        width: app.width,
        height: app.height,
      });
    }

    state.fs = { computer, drive };
    state.expanded.add(computer.id);
    state.expanded.add(drive.id);
    for (const child of drive.children) {
      if (child.type === 'folder') {
        state.expanded.add(child.id);
      }
    }

    return state.fs;
  }

  /* ------------------------------------------------------------------------
     Window management
     ------------------------------------------------------------------------ */

  function cascadeRect(width, height) {
    const usableHeight = window.innerHeight - taskbarHeight();
    const step = 28;
    const maxX = Math.max(8, window.innerWidth - width - 16);
    const maxY = Math.max(8, usableHeight - height - 16);
    const baseX = state.lastDocPos ? state.lastDocPos.x + step : 180;
    const baseY = state.lastDocPos ? state.lastDocPos.y + step : 54;
    const x = Math.min(baseX, maxX);
    const y = Math.min(baseY, maxY);
    state.cascade = (state.cascade + 1) % 7;
    return { x: Math.max(8, x), y: Math.max(8, y) };
  }

  function centerRect(width, height) {
    const usableHeight = window.innerHeight - taskbarHeight();
    return {
      x: Math.max(8, Math.round((window.innerWidth - width) / 2)),
      y: Math.max(8, Math.round((usableHeight - height) / 2)),
    };
  }

  function updateTaskbar() {
    for (const [id, rec] of state.windows) {
      rec.btn.classList.toggle(
        'active',
        state.activeId === id && !rec.win.min && !rec.win.hidden,
      );
    }
  }

  function registerWindow(win, meta) {
    const id = `w95-window-${++state.seq}`;
    const btn = el('button', 'w95-task-btn');
    btn.type = 'button';
    btn.title = meta.title || '';
    btn.innerHTML = `<img src="${esc(meta.icon || state.icons.file)}" alt=""><span>${esc(
      meta.title || 'Window',
    )}</span>`;
    btn.addEventListener('click', () => {
      if (win.min) {
        win.restore().focus();
      } else if (win.focused) {
        win.minimize();
      } else {
        win.focus();
      }
    });

    state.taskList.appendChild(btn);

    const rec = { id, win, meta, btn };
    state.windows.set(id, rec);
    win._w95Rec = rec;

    win.onfocus = () => {
      state.activeId = id;
      updateTaskbar();
      try {
        btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      } catch {
        // older browsers
      }
    };
    win.onblur = () => {
      if (state.activeId === id) {
        state.activeId = null;
      }
      updateTaskbar();
    };
    win.onminimize = updateTaskbar;
    win.onrestore = updateTaskbar;
    win.onclose = () => {
      state.windows.delete(id);
      btn.remove();
      if (state.activeId === id) {
        state.activeId = null;
      }
      if (typeof meta.onClose === 'function') {
        try {
          meta.onClose();
        } catch (error) {
          console.error('[win95-docsify] onClose handler failed:', error);
        }
      }
      updateTaskbar();
      // WinBox treats a truthy onclose return value as "cancel the close".
      return false;
    };

    if (win.focused) {
      state.activeId = id;
    }
    updateTaskbar();
    return rec;
  }

  function createWindow(options, meta) {
    const win = new window.WinBox({
      header: 20,
      border: 2,
      background: '#c0c0c0',
      class: `w95-window no-full ${options.extraClass || ''}`.trim(),
      minwidth: options.minwidth || 320,
      minheight: options.minheight || 200,
      ...options.winbox,
    });
    registerWindow(win, meta);
    return win;
  }

  /* ------------------------------------------------------------------------
     Menu bar
     ------------------------------------------------------------------------ */

  function closeAllMenus() {
    document.querySelectorAll('.w95-menu.open').forEach(menu => {
      menu.classList.remove('open');
      const popup = menu.querySelector(':scope > .w95-menu-popup');
      if (popup) {
        popup.hidden = true;
      }
    });
  }

  function createMenuBar(definitions) {
    const bar = el('div', 'w95-menubar');

    for (const def of definitions) {
      const trigger = el('div', 'w95-menu');
      trigger.setAttribute('role', 'menuitem');
      trigger.tabIndex = 0;
      trigger.innerHTML = underline(def.label);

      const popup = el('div', 'w95-menu-popup');
      popup.hidden = true;
      trigger.appendChild(popup);

      function buildPopup() {
        popup.innerHTML = '';
        const items =
          typeof def.items === 'function' ? def.items() : def.items || [];

        for (const item of items) {
          if (item === '-' || item.separator) {
            popup.appendChild(el('div', 'w95-menu-sep'));
            continue;
          }

          const entry = el('button', 'w95-menu-entry');
          entry.type = 'button';
          if (item.disabled) {
            entry.disabled = true;
          }

          const check = el(
            'span',
            'w95-check',
            item.checked ? '\u2713' : '',
          );
          const label = el('span', '', esc(item.label || ''));
          entry.appendChild(check);
          entry.appendChild(label);

          if (item.shortcut) {
            entry.appendChild(
              el('span', 'w95-shortcut', esc(item.shortcut)),
            );
          }

          entry.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            closeAllMenus();
            if (!item.disabled && typeof item.action === 'function') {
              item.action();
            }
          });

          popup.appendChild(entry);
        }
      }

      function openMenu() {
        closeAllMenus();
        buildPopup();
        popup.hidden = false;
        trigger.classList.add('open');
      }

      function closeMenu() {
        popup.hidden = true;
        trigger.classList.remove('open');
      }

      trigger.addEventListener('mousedown', event => {
        event.preventDefault();
        event.stopPropagation();
        if (popup.hidden) {
          openMenu();
        } else {
          closeMenu();
        }
      });

      trigger.addEventListener('mouseenter', () => {
        if (
          !popup.hidden ||
          document.querySelector('.w95-menu-popup:not([hidden])')
        ) {
          openMenu();
        }
      });

      trigger.addEventListener('keydown', event => {
        if (
          event.key === 'Enter' ||
          event.key === ' ' ||
          event.key === 'ArrowDown'
        ) {
          event.preventDefault();
          openMenu();
          const first = popup.querySelector('.w95-menu-entry:not([disabled])');
          if (first) {
            first.focus();
          }
        }
      });

      bar.appendChild(trigger);
    }

    return bar;
  }

  document.addEventListener('mousedown', event => {
    if (!event.target.closest('.w95-menu')) {
      closeAllMenus();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      closeAllMenus();
      closeStartMenu();
    }
  });

  /* ------------------------------------------------------------------------
     Desktop icons
     ------------------------------------------------------------------------ */

  function defaultDesktopIcons() {
    const icons = [];

    icons.push({
      title: state.opts.rootName,
      icon: 'computer',
      action: 'explorer',
    });

    const readme =
      state.fileByPath.get('/') ||
      state.fileByPath.get('/README') ||
      state.fileByPath.values().next().value;

    if (readme) {
      icons.push({
        title: readme.fileName || 'README.md',
        icon: 'file',
        action: 'doc',
        pathKey: readme.pathKey,
      });
    }

    if (state.apps.length) {
      icons.push({
        title: state.apps[0].title.endsWith('.exe')
          ? state.apps[0].title
          : `${state.apps[0].title}.exe`,
        icon: state.apps[0].icon || 'exe',
        action: 'app',
        url: state.apps[0].url,
        width: state.apps[0].width,
        height: state.apps[0].height,
      });
    }

    icons.push({
      title: 'Recycle Bin',
      icon: 'recycle',
      action: 'recycle',
    });

    return icons;
  }

  function iconAction(item) {
    const action = item.action;
    if (typeof item.onClick === 'function') {
      item.onClick();
      return;
    }
    if (action === 'explorer') {
      openExplorer();
    } else if (action === 'doc') {
      const docPath = canonicalPath(item.pathKey || item.path || item.href);
      const itemNode = state.fileByPath.get(docPath);
      if (itemNode) {
        openDoc(itemNode);
      } else if (item.href || item.pathKey || item.path) {
        openDocByHref(
          item.href || `#${item.pathKey || item.path}`,
          item.title,
        );
      }
    } else if (action === 'app') {
      openApp({
        title: item.title || 'Program',
        url: configAppUrl(item.url),
        icon: item.icon || 'exe',
        width: item.width,
        height: item.height,
      });
    } else if (action === 'helpdoc') {
      const readme =
        state.fileByPath.get('/') ||
        state.fileByPath.get('/README') ||
        state.fileByPath.values().next().value;
      if (readme) {
        openDoc(readme);
      } else {
        showAbout();
      }
    } else if (action === 'run') {
      showRunDialog();
    } else if (action === 'about') {
      showAbout();
    } else if (action === 'recycle') {
      showRecycle();
    } else if (action === 'shutdown') {
      showShutdownDialog();
    }
  }

  function desktopIconFor(item) {
    if (item.icon) {
      return item.icon;
    }
    if (item.action === 'app') {
      const url = configAppUrl(item.url);
      const app = state.apps.find(entry => entry.url === url);
      return (app && app.icon) || 'exe';
    }
    if (item.action === 'explorer') {
      return 'computer';
    }
    if (item.action === 'recycle') {
      return 'recycle';
    }
    if (item.action === 'run') {
      return 'run';
    }
    if (item.action === 'shutdown') {
      return 'shutdown';
    }
    if (item.action === 'about') {
      return 'help';
    }
    return 'file';
  }

  function renderDesktopIcons() {
    const host = document.getElementById('w95-icons');
    if (!host) {
      return;
    }
    host.innerHTML = '';

    const icons = Array.isArray(state.opts.desktop)
      ? state.opts.desktop
      : defaultDesktopIcons();

    for (const item of icons) {
      if (!item || item === '-') {
        continue;
      }
      const button = el('button', 'w95-desktop-icon');
      button.type = 'button';
      button.title = item.title || '';
      button.innerHTML = `<img class="w95-icon-32" src="${esc(
        iconUrl(desktopIconFor(item)),
      )}" alt=""><span class="w95-label">${esc(item.title || '')}</span>`;
      button.addEventListener('click', () => {
        host
          .querySelectorAll('.w95-desktop-icon.selected')
          .forEach(node => node.classList.remove('selected'));
        button.classList.add('selected');
        iconAction(item);
      });
      button.addEventListener('dblclick', event => {
        event.preventDefault();
      });
      host.appendChild(button);
    }
  }

  /* ------------------------------------------------------------------------
     Start menu / taskbar
     ------------------------------------------------------------------------ */

  function defaultStartItems() {
    const items = [
      { title: state.opts.rootName, icon: 'computer', action: 'explorer' },
      { title: 'Documentation', icon: 'file', action: 'helpdoc' },
      '-',
    ];

    for (const app of state.apps) {
      items.push({
        title: app.title.endsWith('.exe') ? app.title : `${app.title}.exe`,
        icon: app.icon || 'exe',
        action: 'app',
        url: app.url,
        width: app.width,
        height: app.height,
      });
    }

    if (state.apps.length) {
      items.push('-');
    }

    items.push(
      { title: 'Run...', icon: 'run', action: 'run' },
      '-',
      { title: 'Shut Down...', icon: 'shutdown', action: 'shutdown' },
      { title: 'About Win95 Docsify', icon: 'help', action: 'about' },
    );

    return items;
  }

  function startAction(item) {
    closeStartMenu();
    iconAction(item);
  }

  function renderStartMenu() {
    const host = state.startItems;
    if (!host) {
      return;
    }
    host.innerHTML = '';

    const items = Array.isArray(state.opts.startMenu)
      ? state.opts.startMenu
      : defaultStartItems();

    for (const item of items) {
      if (!item || item === '-' || item.separator) {
        host.appendChild(el('div', 'w95-menu-sep'));
        continue;
      }

      const button = el('button', 'w95-start-item');
      button.type = 'button';
      button.innerHTML = `<img src="${esc(
        iconUrl(item.icon || desktopIconFor(item)),
      )}" alt=""><span>${esc(item.title || '')}</span>`;
      button.addEventListener('click', () => startAction(item));
      host.appendChild(button);
    }
  }

  function openStartMenu() {
    state.startOpen = true;
    state.startMenu.hidden = false;
    document.getElementById('w95-start').classList.add('active');
    renderStartMenu();
  }

  function closeStartMenu() {
    if (!state.startMenu) {
      return;
    }
    state.startOpen = false;
    state.startMenu.hidden = true;
    const start = document.getElementById('w95-start');
    if (start) {
      start.classList.remove('active');
    }
  }

  function toggleStartMenu() {
    if (state.startOpen) {
      closeStartMenu();
    } else {
      openStartMenu();
    }
  }

  function tickClock() {
    if (!state.clockEl) {
      return;
    }
    const now = new Date();
    state.clockEl.textContent = now.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: !state.opts.clock24,
    });
    state.clockEl.title = now.toLocaleDateString();
  }

  function buildTaskbar() {
    const bar = el('div');
    bar.id = 'w95-taskbar';

    const start = el('button', 'w95-btn');
    start.id = 'w95-start';
    start.type = 'button';
    start.innerHTML =
      '<span class="w95-start-logo"><i></i><i></i><i></i><i></i></span><span>Start</span>';
    start.addEventListener('click', event => {
      event.stopPropagation();
      toggleStartMenu();
    });

    const divider = el('div');
    divider.id = 'w95-task-divider';

    const list = el('div');
    list.id = 'w95-task-list';
    state.taskList = list;

    const tray = el('div');
    tray.id = 'w95-tray';
    tray.innerHTML =
      '<span class="w95-tray-speaker" aria-hidden="true"></span><span id="w95-clock"></span>';

    bar.appendChild(start);
    bar.appendChild(divider);
    bar.appendChild(list);
    bar.appendChild(tray);

    const menu = el('div');
    menu.id = 'w95-startmenu';
    menu.hidden = true;
    menu.innerHTML = `<div class="w95-start-banner"><span>${esc(
      state.opts.startBanner || 'Windows 95',
    )}</span></div><div id="w95-start-items"></div>`;

    document.body.appendChild(bar);
    document.body.appendChild(menu);

    state.startMenu = menu;
    state.startItems = menu.querySelector('#w95-start-items');
    state.clockEl = menu.ownerDocument.getElementById('w95-clock');

    document.addEventListener('mousedown', event => {
      if (
        state.startOpen &&
        !event.target.closest('#w95-startmenu') &&
        !event.target.closest('#w95-start')
      ) {
        closeStartMenu();
      }
    });

    list.addEventListener(
      'wheel',
      event => {
        if (event.deltaY && list.scrollWidth > list.clientWidth) {
          list.scrollLeft += event.deltaY;
          event.preventDefault();
        }
      },
      { passive: false },
    );

    tickClock();
    setInterval(tickClock, 15000);
  }

  /* ------------------------------------------------------------------------
     Explorer
     ------------------------------------------------------------------------ */

  function openExplorer() {
    if (state.explorer && document.body.contains(state.explorer.window)) {
      if (state.explorer.min) {
        state.explorer.restore();
      }
      state.explorer.focus();
      return state.explorer;
    }

    const width = clamp(
      state.opts.explorerWidth,
      340,
      Math.max(360, window.innerWidth - 20),
    );
    const height = clamp(
      state.opts.explorerHeight,
      260,
      Math.max(280, window.innerHeight - taskbarHeight() - 20),
    );
    const rect = window.innerWidth < 760
      ? { x: 0, y: 0 }
      : { x: Math.max(8, Math.min(96, window.innerWidth - width - 8)), y: 20 };

    state.explorerRect = { x: rect.x, y: rect.y, width, height };

    const win = createWindow(
      {
        extraClass: 'w95-explorer-window',
        minwidth: 360,
        minheight: 260,
        winbox: {
          title: state.opts.rootName,
          icon: state.icons.computer,
          width,
          height,
          x: rect.x,
          y: rect.y,
          class: 'w95-window no-full w95-explorer-window',
        },
      },
      {
        title: state.opts.rootName,
        icon: state.icons.computer,
        kind: 'explorer',
        onClose: () => {
          state.explorer = null;
          state.explorerCtl = null;
        },
      },
    );

    const ctl = buildExplorerShell(win);
    state.explorer = win;
    state.explorerCtl = ctl;

    if (window.innerWidth < 760) {
      win.maximize();
    }

    win.focus();
    return win;
  }

  function buildExplorerShell(win) {
    const shell = el('div', 'w95-explorer');

    let current = state.fs.drive;
    const navStack = [state.fs.computer, state.fs.drive];
    let navIndex = 1;

    const addressText = el('div', 'w95-address');
    const treePane = el('div', 'w95-tree-pane');
    const splitter = el('div', 'w95-splitter');
    const filePane = el('div', 'w95-file-pane');
    const statusLeft = el('span', 'w95-status-cell', '');
    const statusRight = el('span', 'w95-status-cell', '');
    const btnBack = makeToolButton('Back', 'left.png');
    const btnForward = makeToolButton('Forward', 'right.png');
    const btnUp = makeToolButton('Up', 'up.png');
    const btnViews = makeToolButton('Views', 'views.svg');

    let treeWidth = clamp(Number(state.treeWidth) || 200, 110, 640);
    if (window.innerWidth < 760) {
      treeWidth = Math.min(treeWidth, 150);
    }
    treePane.style.flexBasis = `${treeWidth}px`;
    splitter.tabIndex = 0;
    splitter.setAttribute('role', 'separator');
    splitter.setAttribute('aria-orientation', 'vertical');
    splitter.setAttribute('aria-label', 'Resize folder tree');
    splitter.setAttribute('aria-valuemin', '110');
    splitter.setAttribute('aria-valuemax', '640');
    splitter.setAttribute('aria-valuenow', String(treeWidth));
    splitter.title = 'Drag to resize';

    function updateToolbar() {
      btnBack.disabled = navIndex <= 0;
      btnForward.disabled = navIndex >= navStack.length - 1;
      btnUp.disabled = !current.parent;
    }

    function go(node, push) {
      if (!node) {
        return;
      }
      if (push !== false && node !== current) {
        navStack.splice(navIndex + 1);
        navStack.push(node);
        navIndex = navStack.length - 1;
      }
      current = node;

      if (node.type === 'folder') {
        state.expanded.add(node.id);
        let parent = node.parent;
        while (parent) {
          state.expanded.add(parent.id);
          parent = parent.parent;
        }
      }

      renderTree();
      renderFiles();
      addressText.textContent = node.displayPath;
      addressText.title = node.displayPath;
      statusRight.textContent = node.displayPath;
      const title =
        node.kind === 'folder'
          ? node.displayPath.replace(/\\$/, '')
          : state.opts.rootName;
      win.setTitle(title);
      if (win._w95Rec) {
        win._w95Rec.meta.title = title;
        win._w95Rec.btn.title = title;
        const label = win._w95Rec.btn.querySelector('span');
        if (label) {
          label.textContent = title;
        }
      }
      updateToolbar();
    }

    function goBack() {
      if (navIndex > 0) {
        navIndex -= 1;
        go(navStack[navIndex], false);
      }
    }

    function goForward() {
      if (navIndex < navStack.length - 1) {
        navIndex += 1;
        go(navStack[navIndex], false);
      }
    }

    function goUp() {
      if (current.parent) {
        go(current.parent);
      }
    }

    function activateNode(node) {
      if (node.type === 'folder') {
        go(node);
        return;
      }
      if (node.kind === 'app') {
        openApp({
          title: node.name,
          url: node.appUrl,
          icon: node.icon || undefined,
        });
      } else {
        openDoc(node);
      }
    }

    function makeFileCard(node) {
      const card = el('div', 'w95-file-card');
      card.tabIndex = 0;
      card.title = node.fileName || node.name;
      card.innerHTML = `<img class="w95-icon-32" src="${esc(
        fileIconFor(node),
      )}" alt=""><span class="w95-file-name">${esc(
        node.fileName || node.name,
      )}</span>`;

      function select() {
        filePane
          .querySelectorAll('.w95-file-card.selected, .w95-file-table tr.selected')
          .forEach(selected => selected.classList.remove('selected'));
        card.classList.add('selected');
        statusLeft.textContent = `${node.fileName || node.name} \u2014 ${
          node.type === 'folder' ? 'File Folder' : fileTypeFor(node)
        }`;
      }

      card.addEventListener('mousedown', select);
      card.addEventListener('click', () => activateNode(node));
      card.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activateNode(node);
        }
      });
      card.addEventListener('dblclick', event => {
        event.preventDefault();
      });
      return card;
    }

    function makeFileRow(node, index) {
      const tr = el('tr');
      tr.tabIndex = 0;
      tr.title = node.displayPath || node.fileName || node.name;
      tr.innerHTML = `
        <td class="w95-file-cell-name"><img src="${esc(
          fileIconFor(node),
        )}" alt=""><span>${esc(node.fileName || node.name)}</span></td>
        <td>${esc(
          node.type === 'folder' ? 'File Folder' : fileTypeFor(node),
        )}</td>
        <td>${node.type === 'folder' ? '' : '1 KB'}</td>
        <td>${esc(displayDate(index))}</td>`;

      function select() {
        filePane
          .querySelectorAll('.w95-file-card.selected, .w95-file-table tr.selected')
          .forEach(selected => selected.classList.remove('selected'));
        tr.classList.add('selected');
        statusLeft.textContent = `${node.fileName || node.name} \u2014 ${
          node.type === 'folder' ? 'File Folder' : fileTypeFor(node)
        }`;
      }

      tr.addEventListener('mousedown', select);
      tr.addEventListener('click', () => activateNode(node));
      tr.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          activateNode(node);
        }
      });
      return tr;
    }

    function renderFiles() {
      filePane.innerHTML = '';
      statusLeft.textContent = `${current.children.length} object(s)`;

      const items = current.children.slice().sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return (a.fileName || a.name).localeCompare(
          b.fileName || b.name,
          undefined,
          { numeric: true, sensitivity: 'base' },
        );
      });

      if (state.viewMode === 'details') {
        const table = el('table', 'w95-file-table');
        table.innerHTML = `
          <colgroup>
            <col class="w95-col-name">
            <col class="w95-col-type">
            <col class="w95-col-size">
            <col class="w95-col-date">
          </colgroup>
          <thead><tr><th>Name</th><th>Type</th><th>Size</th><th>Modified</th></tr></thead>
          <tbody></tbody>`;
        const tbody = table.querySelector('tbody');
        items.forEach((node, index) => {
          tbody.appendChild(makeFileRow(node, index));
        });
        filePane.appendChild(table);
      } else {
        const grid = el('div', 'w95-file-grid');
        for (const node of items) {
          grid.appendChild(makeFileCard(node));
        }
        filePane.appendChild(grid);
      }
    }

    function renderTree() {
      treePane.innerHTML = '';
      treePane.appendChild(
        renderTreeNode(state.fs.computer, 0, function (node) {
          go(node);
        }),
      );
    }

    function renderTreeNode(node, depth, onSelect) {
      const wrap = el('div');
      const hasChildren = node.children && node.children.length > 0;
      const expanded = state.expanded.has(node.id);

      const row = el('div', 'w95-tree-item');
      row.style.paddingLeft = `${depth * 10 + 1}px`;
      row.dataset.nodeId = node.id;
      row.title = node.displayPath || node.fileName || node.name;
      if (node === current) {
        row.classList.add('selected');
      }

      const toggle = el(
        'span',
        `w95-tree-toggle${hasChildren ? '' : ' empty'}`,
        expanded ? '\u2212' : '+',
      );
      row.appendChild(toggle);
      row.appendChild(
        (() => {
          const img = el('img', 'w95-tree-icon');
          img.src = fileIconFor(node);
          img.alt = '';
          return img;
        })(),
      );
      row.appendChild(
        el('span', 'w95-tree-label', esc(node.fileName || node.name)),
      );

      toggle.addEventListener('click', event => {
        event.stopPropagation();
        if (!hasChildren) {
          return;
        }
        if (state.expanded.has(node.id)) {
          state.expanded.delete(node.id);
        } else {
          state.expanded.add(node.id);
        }
        renderTree();
        renderFiles();
      });

      row.addEventListener('click', () => {
        if (node.type === 'file') {
          activateNode(node);
        } else {
          onSelect(node);
        }
      });

      row.tabIndex = 0;
      row.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (node.type === 'file') {
            activateNode(node);
          } else {
            onSelect(node);
          }
        }
      });
      wrap.appendChild(row);

      if (hasChildren && expanded) {
        const children = el('div', 'w95-tree-children');
        for (const child of node.children) {
          children.appendChild(renderTreeNode(child, depth + 1, onSelect));
        }
        wrap.appendChild(children);
      }

      return wrap;
    }

    function makeToolButton(label, iconFile) {
      const button = el('button', 'w95-btn');
      button.type = 'button';
      button.title = label;
      button.innerHTML = `<img src="${esc(iconUrl(iconFile))}" alt=""><span>${esc(
        label,
      )}</span>`;
      return button;
    }

    const menuBar = createMenuBar([
      {
        label: 'File',
        items: [
          { label: 'Close', action: () => win.close() },
          '-',
          {
            label: 'Exit',
            action: () => {
              Array.from(state.windows.values()).forEach(rec => rec.win.close());
            },
          },
        ],
      },
      {
        label: 'Edit',
        items: [
          {
            label: 'Select All',
            action: () => {
              const all = filePane.querySelectorAll(
                '.w95-file-card, .w95-file-table tbody tr',
              );
              all.forEach(node => node.classList.add('selected'));
              statusLeft.textContent = `${all.length} object(s) selected`;
            },
          },
        ],
      },
      {
        label: 'View',
        items: () => [
          {
            label: 'Large Icons',
            checked: state.viewMode === 'icons',
            action: () => {
              state.viewMode = 'icons';
              renderFiles();
            },
          },
          {
            label: 'Details',
            checked: state.viewMode === 'details',
            action: () => {
              state.viewMode = 'details';
              renderFiles();
            },
          },
          '-',
          { label: 'Refresh', action: () => go(current, false) },
        ],
      },
      {
        label: 'Go',
        items: () => [
          {
            label: 'Back',
            disabled: navIndex <= 0,
            action: goBack,
          },
          {
            label: 'Forward',
            disabled: navIndex >= navStack.length - 1,
            action: goForward,
          },
          {
            label: 'Up One Level',
            disabled: !current.parent,
            action: goUp,
          },
        ],
      },
      {
        label: 'Help',
        items: [{ label: 'About Win95 Docsify', action: showAbout }],
      },
    ]);

    const toolbar = el('div', 'w95-toolbar');
    const sep1 = el('div', 'w95-tool-sep');
    const sep2 = el('div', 'w95-tool-sep');
    const addressWrap = el('div', 'w95-address-wrap');
    addressWrap.innerHTML =
      '<span class="w95-address-label">Address</span>';
    addressWrap.appendChild(addressText);

    btnBack.addEventListener('click', goBack);
    btnForward.addEventListener('click', goForward);
    btnUp.addEventListener('click', goUp);
    btnViews.addEventListener('click', () => {
      state.viewMode = state.viewMode === 'icons' ? 'details' : 'icons';
      renderFiles();
    });

    toolbar.appendChild(btnBack);
    toolbar.appendChild(btnForward);
    toolbar.appendChild(btnUp);
    toolbar.appendChild(sep1);
    toolbar.appendChild(btnViews);
    toolbar.appendChild(sep2);
    toolbar.appendChild(addressWrap);

    const main = el('div', 'w95-explorer-main');
    main.appendChild(treePane);
    main.appendChild(splitter);
    main.appendChild(filePane);

    function setTreeWidth(width) {
      const max = Math.max(110, main.clientWidth - 147);
      treeWidth = clamp(Math.round(width), 110, Math.min(640, max));
      treePane.style.flexBasis = `${treeWidth}px`;
      state.treeWidth = treeWidth;
      splitter.setAttribute('aria-valuenow', String(treeWidth));
    }

    splitter.addEventListener('pointerdown', event => {
      if (event.button !== undefined && event.button !== 0) {
        return;
      }
      event.preventDefault();
      win.focus();
      const startX = event.clientX;
      const startWidth = treePane.getBoundingClientRect().width;
      const pointerId = event.pointerId;
      document.body.classList.add('w95-col-resizing');

      try {
        splitter.setPointerCapture(pointerId);
      } catch {
        // ignore
      }

      const onMove = moveEvent => {
        setTreeWidth(startWidth + moveEvent.clientX - startX);
      };
      const stop = () => {
        document.body.classList.remove('w95-col-resizing');
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', stop);
        document.removeEventListener('pointercancel', stop);
        try {
          splitter.releasePointerCapture(pointerId);
        } catch {
          // ignore
        }
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', stop);
      document.addEventListener('pointercancel', stop);
    });

    splitter.addEventListener('dblclick', event => {
      event.preventDefault();
      setTreeWidth(200);
    });

    splitter.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return;
      }
      event.preventDefault();
      setTreeWidth(treeWidth + (event.key === 'ArrowRight' ? 16 : -16));
    });

    const status = el('div', 'w95-statusbar');
    status.appendChild(statusLeft);
    status.appendChild(statusRight);

    shell.appendChild(menuBar);
    shell.appendChild(toolbar);
    shell.appendChild(main);
    shell.appendChild(status);

    win.mount(shell);

    // Parent pointer for the Up button.
    (function setParents(node) {
      for (const child of node.children || []) {
        child.parent = node;
        setParents(child);
      }
    })(state.fs.computer);

    go(state.fs.drive, false);

    return {
      go,
      goBack,
      goForward,
      goUp,
      refresh: () => go(current, false),
    };
  }

  function fileIconFor(node) {
    if (node.kind === 'computer') {
      return state.icons.computer;
    }
    if (node.kind === 'drive') {
      return state.icons.drive;
    }
    if (node.type === 'folder') {
      return state.icons.folder;
    }
    if (node.icon) {
      return iconUrl(node.icon);
    }
    if (node.kind === 'app') {
      const app = state.apps.find(
        item => item.url && item.url === node.appUrl,
      );
      return iconUrl((app && app.icon) || 'exe');
    }
    return state.icons.file;
  }

  function fileTypeFor(node) {
    if (node.kind === 'app') {
      return 'Application';
    }
    if (/\.md$/i.test(node.fileName || '')) {
      return 'Markdown';
    }
    if (/\.html?$/i.test(node.fileName || '')) {
      return 'HTML';
    }
    return 'Document';
  }

  /* ------------------------------------------------------------------------
     Documents
     ------------------------------------------------------------------------ */

  function mainHasContent() {
    const main = document.getElementById('main');
    return Boolean(main && main.children.length > 0);
  }

  function fillDoc(win, item) {
    if (!win || !win._w95 || !document.body.contains(win.window)) {
      return false;
    }

    const main = document.getElementById('main');
    const scroll = win._w95.scroll;
    if (!main) {
      showDocError(win, 'The document renderer is not available.');
      return false;
    }

    scroll.innerHTML = '';

    if (!main.children.length) {
      scroll.innerHTML =
        '<div class="w95-loading">This document is empty.</div>';
      return true;
    }

    const fragment = document.createDocumentFragment();
    for (const child of Array.from(main.childNodes)) {
      fragment.appendChild(child.cloneNode(true));
    }
    scroll.appendChild(fragment);

    if (state.opts.docFooter) {
      const footer = el('div', 'w95-doc-footer');
      footer.textContent = `${item.displayPath || item.fileName} \u2014 Win95 Docsify`;
      scroll.appendChild(footer);
    }

    win.setTitle(item.fileName || item.name || 'Document');
    if (win._w95) {
      win._w95.statusLeft.textContent = 'Done.';
      win._w95.statusRight.textContent =
        item.displayPath || item.pathKey || '';
      win._w95.loaded = true;
    }

    scroll.scrollTop = 0;

    if (item.anchorId) {
      requestAnimationFrame(() => scrollToId(win, item.anchorId));
    }

    return true;
  }

  function showDocError(win, message) {
    if (!win || !win._w95) {
      return;
    }
    win._w95.scroll.innerHTML = `<div class="w95-loading">${esc(
      message,
    )}</div>`;
    win._w95.statusLeft.textContent = 'Error';
  }

  function scrollToId(win, id) {
    if (!win || !win._w95 || !id) {
      return;
    }
    let target = null;
    try {
      target = win._w95.scroll.querySelector(
        `#${window.CSS && CSS.escape ? CSS.escape(id) : id}`,
      );
    } catch {
      target = null;
    }
    if (!target) {
      try {
        target = win._w95.scroll.querySelector(
          `[id="${String(id).replace(/"/g, '\\"')}"]`,
        );
      } catch {
        target = null;
      }
    }
    if (target) {
      target.scrollIntoView({ block: 'start', inline: 'nearest' });
    }
  }

  function createDocWindow(item) {
    const width = clamp(
      state.docWidthOverride || state.opts.docWidth,
      340,
      Math.max(360, window.innerWidth - 40),
    );
    const height = clamp(
      state.opts.docHeight,
      260,
      Math.max(280, window.innerHeight - taskbarHeight() - 40),
    );
    let rect;
    if (state.initialDocRect) {
      rect = { x: state.initialDocRect.x, y: state.initialDocRect.y };
      state.initialDocRect = null;
    } else {
      rect =
        window.innerWidth < 760
          ? { x: 0, y: 0 }
          : cascadeRect(width, height);
    }
    state.docWidthOverride = 0;
    state.lastDocPos = { x: rect.x, y: rect.y };

    const win = createWindow(
      {
        extraClass: 'w95-doc-window',
        minwidth: 320,
        minheight: 220,
        winbox: {
          title: item.fileName || item.name || 'Document',
          icon: item.icon ? iconUrl(item.icon) : state.icons.file,
          width,
          height,
          x: rect.x,
          y: rect.y,
          class: 'w95-window no-full w95-doc-window',
        },
      },
      {
        title: item.fileName || item.name || 'Document',
        icon: item.icon ? iconUrl(item.icon) : state.icons.file,
        kind: 'doc',
        onClose: () => {
          if (state.docWindows.get(item.pathKey) === win) {
            state.docWindows.delete(item.pathKey);
          }
        },
      },
    );

    const shell = el('div', 'w95-doc-shell');
    const menuBar = createMenuBar([
      {
        label: 'File',
        items: [
          { label: 'Close', action: () => win.close() },
        ],
      },
      {
        label: 'Edit',
        items: [
          {
            label: 'Select All',
            action: () => {
              const selection = window.getSelection();
              const range = document.createRange();
              range.selectNodeContents(win._w95.scroll);
              selection.removeAllRanges();
              selection.addRange(range);
            },
          },
        ],
      },
      {
        label: 'View',
        items: () => [
          {
            label: 'Zoom In',
            action: () => zoomDoc(win, 1),
          },
          {
            label: 'Zoom Out',
            action: () => zoomDoc(win, -1),
          },
          {
            label: 'Reset Zoom',
            action: () => zoomDoc(win, 0),
          },
        ],
      },
      {
        label: 'Help',
        items: [{ label: 'About Win95 Docsify', action: showAbout }],
      },
    ]);

    const scroll = el('div', 'w95-doc-scroll');
    scroll.innerHTML =
      '<div class="w95-loading"><span class="w95-hourglass"></span><span>Opening document...</span></div>';

    const status = el('div', 'w95-statusbar');
    const statusLeft = el('span', 'w95-status-cell', 'Opening...');
    const statusRight = el('span', 'w95-status-cell', '');
    status.appendChild(statusLeft);
    status.appendChild(statusRight);

    shell.appendChild(menuBar);
    shell.appendChild(scroll);
    shell.appendChild(status);

    win.mount(shell);

    win._w95 = {
      item,
      scroll,
      statusLeft,
      statusRight,
      loaded: false,
    };

    attachDocLinkHandler(win);

    if (window.innerWidth < 760) {
      win.maximize();
    }

    return win;
  }

  function zoomDoc(win, direction) {
    if (!win || !win._w95) {
      return;
    }
    const current = Number(win._w95.zoom || 13);
    const next =
      direction === 0 ? 13 : clamp(current + (direction > 0 ? 1 : -1), 10, 22);
    win._w95.zoom = next;
    win._w95.scroll.style.fontSize = `${next}px`;
  }

  function openDocByHref(href, label, options) {
    const raw = String(href || '');
    if (!raw) {
      return null;
    }

    if (isAppHref(raw)) {
      return openAppFromHref(raw, label);
    }

    if (!isDocHref(raw)) {
      if (isExternalHref(raw)) {
        if (state.opts.externalLinks === 'browser') {
          window.open(raw, '_blank', 'noopener');
          return null;
        }
        return openApp({ title: label || raw, url: raw });
      }
      return openAppFromHref(raw, label);
    }

    const { path, id } = splitHash(raw);
    const pathKey = canonicalPath(path);
    let item = state.fileByPath.get(pathKey);

    if (!item) {
      const display = label || pathKey.split('/').pop() || 'Document';
      item = {
        id: `w95-synthetic-${++state.seq}`,
        kind: 'file',
        type: 'file',
        name: display,
        fileName: /\.(md|markdown|html?)$/i.test(display)
          ? display
          : `${display}.md`,
        href: raw.startsWith('#') ? raw : `#${pathKey}`,
        pathKey,
        displayPath: pathKey,
        children: [],
        parent: null,
        anchorId: id,
      };
    } else if (id) {
      item = Object.assign({}, item, { anchorId: id });
    }

    return openDoc(item, options);
  }

  function openDoc(item, options) {
    if (!item) {
      return null;
    }
    const key = item.pathKey || canonicalPath(item.href || '');
    item.pathKey = key;

    const existing = state.docWindows.get(key);
    if (existing && document.body.contains(existing.win.window)) {
      if (existing.win.min) {
        existing.win.restore();
      }
      existing.win.focus();
      if (item.anchorId) {
        requestAnimationFrame(() => scrollToId(existing.win, item.anchorId));
      }
      return existing.win;
    }

    const win = createDocWindow(item);
    state.docWindows.set(key, { win, item });
    state.docQueue.push({ win, item, key });
    pumpDocQueue();
    return win;
  }

  function pumpDocQueue() {
    if (state.activeLoad || !state.docQueue.length) {
      return;
    }

    const req = state.docQueue.shift();

    if (!document.body.contains(req.win.window)) {
      setTimeout(pumpDocQueue, 0);
      return;
    }

    if (
      canonicalPath(req.key) === state.lastRenderedPath &&
      mainHasContent()
    ) {
      fillDoc(req.win, req.item);
      setTimeout(pumpDocQueue, 0);
      return;
    }

    state.activeLoad = req;
    req.started = Date.now();
    clearTimeout(req.timer);
    req.timer = setTimeout(() => {
      if (state.activeLoad !== req) {
        return;
      }
      state.activeLoad = null;
      showDocError(req.win, 'The document is taking too long to open.');
      pumpDocQueue();
    }, 12000);

    const target = hrefToHash(req.item);
    if (window.location.hash !== target) {
      window.location.hash = target;
    }
  }

  function splitRouteFromAnchor(href) {
    const raw = String(href || '');
    const hashIdx = raw.indexOf('#');
    let hash = hashIdx >= 0 ? raw.slice(hashIdx + 1) : raw;
    if (hash.startsWith('/')) {
      hash = hash.slice(1);
    }
    const [path, query] = hash.split('?');
    return {
      path: path || '/',
      id: query ? new URLSearchParams(query).get('id') || '' : '',
    };
  }

  function attachDocLinkHandler(win) {
    win._w95.scroll.addEventListener('click', event => {
      const anchor = event.target.closest('a');
      if (!anchor) {
        return;
      }
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        anchor.hasAttribute('download')
      ) {
        return;
      }

      const href = anchor.getAttribute('href') || '';
      if (!href || href.startsWith('javascript:')) {
        return;
      }
      if (/^(mailto:|tel:)/i.test(href)) {
        return;
      }

      // Docsify heading anchors look like "#/path?id=heading".
      if (href.startsWith('#/')) {
        event.preventDefault();
        const route = splitRouteFromAnchor(href);
        const currentKey = win._w95.item.pathKey;
        if (canonicalPath(route.path) === canonicalPath(currentKey)) {
          scrollToId(win, route.id);
        } else {
          openDocByHref(`#/${route.path.replace(/^\//, '')}${
            route.id ? `?id=${encodeURIComponent(route.id)}` : ''
          }`, anchor.textContent.trim());
        }
        return;
      }

      // In-page anchor.
      if (href.startsWith('#')) {
        if (href === '#') {
          event.preventDefault();
          return;
        }
        event.preventDefault();
        scrollToId(win, decodeURIComponent(href.slice(1)));
        return;
      }

      event.preventDefault();

      if (isExternalHref(href)) {
        if (state.opts.externalLinks === 'browser') {
          window.open(anchor.href, '_blank', 'noopener');
        } else {
          openApp({
            title: anchor.textContent.trim() || href,
            url: anchor.href,
          });
        }
        return;
      }

      if (isAppHref(href, anchor)) {
        openAppFromHref(href, anchor.textContent.trim());
        return;
      }

      if (isDocHref(href)) {
        openDocByHref(href, anchor.textContent.trim());
        return;
      }

      if (/\.(html?|pdf)$/i.test(href)) {
        openAppFromHref(href, anchor.textContent.trim());
        return;
      }

      window.open(anchor.href, '_blank', 'noopener');
    });
  }

  /* ------------------------------------------------------------------------
     iframe / .exe app windows
     ------------------------------------------------------------------------ */

  function openAppFromHref(href, title) {
    const url = hrefToAppUrl(href);
    return openApp({ title: title || 'Program', url });
  }

  function openApp(options) {
    const url = configAppUrl(options.url);
    if (!url) {
      return null;
    }

    const existing = state.appWindows.get(url);
    if (existing && document.body.contains(existing.window)) {
      if (existing.min) {
        existing.restore();
      }
      existing.focus();
      return existing;
    }

    const appMeta = state.apps.find(app => app.url === url) || {};
    const width = clamp(
      options.width || appMeta.width || state.opts.appWidth,
      340,
      Math.max(360, window.innerWidth - 40),
    );
    const height = clamp(
      options.height || appMeta.height || state.opts.appHeight,
      260,
      Math.max(280, window.innerHeight - taskbarHeight() - 40),
    );
    const rect =
      window.innerWidth < 760 ? { x: 0, y: 0 } : cascadeRect(width, height);
    const title = options.title || appMeta.title || 'Program';
    const icon = iconUrl(options.icon || appMeta.icon || 'exe');

    const win = createWindow(
      {
        extraClass: 'w95-app-window',
        minwidth: 340,
        minheight: 240,
        winbox: {
          title: `${title.replace(/\.(exe|html?)$/i, '')}.exe`,
          icon,
          width,
          height,
          x: rect.x,
          y: rect.y,
          class: 'w95-window no-full w95-app-window',
        },
      },
      {
        title: `${title.replace(/\.(exe|html?)$/i, '')}.exe`,
        icon,
        kind: 'app',
        onClose: () => {
          if (state.appWindows.get(url) === win) {
            state.appWindows.delete(url);
          }
        },
      },
    );

    const shell = el('div', 'w95-app-shell');

    const toolbar = el('div', 'w95-toolbar w95-app-toolbar');
    const btnReload = el('button', 'w95-btn');
    btnReload.type = 'button';
    btnReload.innerHTML = '<span>Reload</span>';
    const address = el('div', 'w95-input');
    address.textContent = url;
    address.title = url;
    const btnOpen = el('button', 'w95-btn');
    btnOpen.type = 'button';
    btnOpen.innerHTML = '<span>Open</span>';
    const addressWrap = el('div', 'w95-address-wrap');
    addressWrap.appendChild(address);
    toolbar.appendChild(btnReload);
    toolbar.appendChild(addressWrap);
    toolbar.appendChild(btnOpen);

    const frameWrap = el('div', 'w95-app-frame');
    const iframe = el('iframe');
    iframe.setAttribute('title', title);
    iframe.setAttribute('referrerpolicy', 'no-referrer');
    iframe.setAttribute('allow', 'clipboard-read; clipboard-write; fullscreen');
    iframe.src = url;
    frameWrap.appendChild(iframe);

    const hint = el('div', 'w95-app-hint');
    hint.textContent = '';

    const status = el('div', 'w95-statusbar');
    const statusLeft = el('span', 'w95-status-cell', 'Opening...');
    const statusRight = el('span', 'w95-status-cell', url);
    statusRight.title = url;
    status.appendChild(statusLeft);
    status.appendChild(statusRight);

    shell.appendChild(toolbar);
    shell.appendChild(frameWrap);
    shell.appendChild(hint);
    shell.appendChild(status);

    win.mount(shell);

    state.appWindows.set(url, win);

    btnReload.addEventListener('click', () => {
      try {
        iframe.src = iframe.src;
      } catch {
        iframe.src = url;
      }
      statusLeft.textContent = 'Reloading...';
    });

    btnOpen.addEventListener('click', () => {
      window.open(url, '_blank', 'noopener');
    });

    iframe.addEventListener('load', () => {
      statusLeft.textContent = 'Done.';
      const sameOrigin = (() => {
        try {
          return new URL(url, window.location.href).origin === window.location.origin;
        } catch {
          return false;
        }
      })();
      hint.textContent = sameOrigin
        ? ''
        : 'If this program looks blank, the website refused to be embedded (X-Frame-Options / CSP). Use Open to view it in a browser tab.';
    });

    iframe.addEventListener('error', () => {
      statusLeft.textContent = 'Failed to load.';
    });

    if (window.innerWidth < 760) {
      win.maximize();
    }

    return win;
  }

  /* ------------------------------------------------------------------------
     Dialogs
     ------------------------------------------------------------------------ */

  function dialogWindow(options) {
    const width = Math.min(
      options.width || 390,
      Math.max(300, window.innerWidth - 20),
    );
    const height = Math.min(
      options.height || 200,
      Math.max(160, window.innerHeight - taskbarHeight() - 20),
    );
    const rect = centerRect(width, height);

    const win = createWindow(
      {
        extraClass: 'w95-dialog-window no-min no-max no-resize',
        minwidth: width,
        minheight: height,
        winbox: {
          title: options.title || 'Win95 Docsify',
          icon: options.icon || state.icons.help,
          width,
          height,
          x: rect.x,
          y: rect.y,
          class:
            'w95-window no-full no-min no-max no-resize w95-dialog-window',
        },
      },
      {
        title: options.title || 'Win95 Docsify',
        icon: options.icon || state.icons.help,
        kind: 'dialog',
      },
    );

    const shell = el('div', 'w95-dialog');
    const body = el('div', 'w95-dialog-body');
    const img = el('img');
    img.src = options.icon || state.icons.help;
    img.alt = '';
    const text = el('div', 'w95-dialog-text');
    text.innerHTML = options.html || `<p>${esc(options.text || '')}</p>`;
    body.appendChild(img);
    body.appendChild(text);

    const buttons = el('div', 'w95-dialog-buttons');
    shell.appendChild(body);
    shell.appendChild(buttons);

    win.mount(shell);

    function close() {
      win.close();
    }

    function addButton(label, primary, action) {
      const btn = el('button', 'w95-btn');
      btn.type = 'button';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        const result = action ? action() : undefined;
        if (result !== false) {
          close();
        }
      });
      buttons.appendChild(btn);
      if (primary) {
        setTimeout(() => btn.focus(), 30);
      }
      return btn;
    }

    win._w95 = { close, addButton, text, shell };

    if (options.setup) {
      options.setup(win, {
        close,
        addButton,
        text,
        buttons,
        shell,
      });
    }

    return win;
  }

  function showAbout() {
    const about = state.opts.about;
    const html = about && about.html
      ? about.html
      : `
        <p><strong>Win95 Docsify Theme v${VERSION}</strong></p>
        <p>A Windows 95 desktop shell for Docsify. Folders are sidebar groups, documents are files, and programs are iframes.</p>
        <p>Made with Docsify, WinBox, and far too much teal.</p>
        <p><a href="https://docsify.js.org" target="_blank" rel="noopener">docsify.js.org</a></p>
      `;

    dialogWindow({
      title: about && about.title ? about.title : 'About Win95 Docsify',
      icon: state.icons.help,
      html,
      width: 430,
      height: 260,
      setup(win, api) {
        api.addButton('OK', true);
      },
    });
  }

  function showRecycle() {
    dialogWindow({
      title: 'Recycle Bin',
      icon: state.icons.recycle,
      html: '<p>The Recycle Bin is empty.</p>',
      width: 360,
      height: 170,
      setup(win, api) {
        api.addButton('OK', true);
      },
    });
  }

  function showRunDialog() {
    dialogWindow({
      title: 'Run',
      icon: state.icons.run,
      html: `
        <p>Type the name of a document, or the address of a program.</p>
        <p><input type="text" class="w95-run-input" placeholder="C:\\README.md or https://example.com" autocomplete="off"></p>
      `,
      width: 440,
      height: 230,
      setup(win, api) {
        const input = api.text.querySelector('.w95-run-input');
        const run = () => {
          const value = input.value.trim();
          if (!value) {
            return false;
          }
          if (/^(https?:|www\.)/i.test(value)) {
            openApp({
              title: value.replace(/^https?:\/\//, '').split('/')[0],
              url: /^https?:/i.test(value) ? value : `https://${value}`,
            });
          } else if (value.startsWith('#/') || /\.(md|markdown)$/i.test(value)) {
            openDocByHref(
              value.startsWith('#') ? value : `#/${value.replace(/^\/+/, '')}`,
              value,
            );
          } else {
            openApp({
              title: value.split('/').pop() || value,
              url: configAppUrl(value),
            });
          }
          return true;
        };
        api.addButton('OK', true, run);
        api.addButton('Cancel');
        input.addEventListener('keydown', event => {
          if (event.key === 'Enter') {
            event.preventDefault();
            if (run()) {
              win.close();
            }
          }
        });
        setTimeout(() => input.focus(), 40);
      },
    });
  }

  function showShutdownDialog() {
    dialogWindow({
      title: 'Shut Down Windows',
      icon: state.icons.shutdown,
      html: `
        <p>Are you sure you want to shut down Win95 Docsify?</p>
        <p style="color:#444">You can come back by refreshing the page.</p>
      `,
      width: 400,
      height: 210,
      setup(win, api) {
        api.addButton('Yes', true, () => {
          Array.from(state.windows.values()).forEach(rec => {
            if (rec.win !== win) {
              rec.win.close();
            }
          });
          const overlay = el('div');
          overlay.id = 'w95-shutdown';
          overlay.innerHTML =
            "<span>It's now safe to turn off your computer.<br><small style=\"font-size:12px\">Click anywhere to restart.</small></span>";
          overlay.addEventListener('click', () => window.location.reload());
          document.body.appendChild(overlay);
          return true;
        });
        api.addButton('No');
      },
    });
  }

  function showMessage(title, text) {
    dialogWindow({
      title,
      icon: state.icons.help,
      text,
      width: 390,
      height: 180,
      setup(win, api) {
        api.addButton('OK', true);
      },
    });
  }

  /* ------------------------------------------------------------------------
     Boot screen
     ------------------------------------------------------------------------ */

  function showBoot() {
    if (!state.opts.boot || state.booted) {
      return;
    }
    state.booted = true;
    const boot = el('div');
    boot.id = 'w95-boot';
    boot.innerHTML = `
      <div class="w95-boot-logo">
        <div class="w95-boot-flag"><i></i><i></i><i></i><i></i></div>
        <div class="w95-boot-word"><strong>Windows 95</strong><span>DOCSIFY EDITION</span></div>
      </div>
      <div class="w95-boot-note">Starting Win95 Docsify</div>`;
    document.body.appendChild(boot);
    state.bootEl = boot;
  }

  function hideBoot() {
    if (!state.bootEl) {
      return;
    }
    state.bootEl.classList.add('done');
    const node = state.bootEl;
    state.bootEl = null;
    setTimeout(() => node.remove(), 400);
  }

  /* ------------------------------------------------------------------------
     Build the desktop
     ------------------------------------------------------------------------ */

  function buildDesktop() {
    if (state.built) {
      return;
    }
    state.built = true;

    document.body.classList.add('w95-mode');

    // Docsify's sidebar toggle would toggle a hidden sidebar and mark the
    // desktop as inert. The Win95 shell does not need it.
    document
      .querySelectorAll('button.sidebar-toggle, .sidebar-toggle-button')
      .forEach(node => node.remove());

    for (const key of Object.keys(ICON_FILES)) {
      state.icons[key] = new URL(
        `assets/icons/${ICON_FILES[key]}`,
        themeBase,
      ).href;
    }

    const desktop = el('div');
    desktop.id = 'w95-desktop';
    if (state.opts.wallpaper) {
      desktop.style.backgroundImage = `url("${String(
        state.opts.wallpaper,
      ).replace(/"/g, '%22')}")`;
    }
    desktop.innerHTML = '<div id="w95-icons"></div>';

    document.body.appendChild(desktop);
    buildTaskbar();

    const sidebarItems = parseSidebar();
    buildFileSystem(sidebarItems);

    renderDesktopIcons();
    renderStartMenu();
    openExplorer();

    const er = state.explorerRect || {
      x: 96,
      y: 20,
      width: state.opts.explorerWidth,
      height: state.opts.explorerHeight,
    };
    const docAvailable = window.innerWidth - (er.x + er.width) - 32;
    state.initialDocRect = {
      x: Math.max(8, Math.min(er.x + er.width + 16, window.innerWidth - 500)),
      y: 58,
    };
    state.docWidthOverride = clamp(
      docAvailable,
      500,
      Math.min(state.opts.docWidth, window.innerWidth - 40),
    );

    const routePath = canonicalPath(
      (state.vm && state.vm.route && state.vm.route.path) ||
        window.location.hash ||
        '/',
    );
    let initial = state.fileByPath.get(routePath);

    if (!initial && routePath === '/') {
      initial =
        state.fileByPath.get('/') ||
        state.fileByPath.get('/README') ||
        state.fileByPath.values().next().value;
    }

    if (!initial && mainHasContent()) {
      const routeName =
        routePath === '/'
          ? 'README'
          : routePath.split('/').filter(Boolean).pop() || 'Document';
      initial = {
        id: `w95-synthetic-${++state.seq}`,
        kind: 'file',
        type: 'file',
        name: routeName,
        fileName: `${routeName}.md`,
        pathKey: routePath,
        href: `#${routePath}`,
        displayPath: routePath,
        children: [],
        parent: null,
      };
    }

    state.lastRenderedPath = canonicalPath(
      (state.vm && state.vm.route && state.vm.route.path) || routePath,
    );

    if (initial && state.opts.openWelcome !== false) {
      openDoc(initial);
    }

    // Let the initial Docsify render settle before hiding the splash.
    setTimeout(hideBoot, 450);
    setTimeout(hideBoot, 2600);
  }

  /* ------------------------------------------------------------------------
     Docsify plugin
     ------------------------------------------------------------------------ */

  function plugin(hook, vm) {
    hook.init(() => {
      if (vm.config && vm.config.win95 === false) {
        state.enabled = false;
        return;
      }
      state.enabled = true;
      state.vm = vm;
      state.opts = Object.assign(
        {},
        DEFAULTS,
        (vm.config && vm.config.win95) || {},
      );
      if (vm.config && vm.config.routerMode && vm.config.routerMode !== 'hash') {
        console.warn(
          '[win95-docsify] The Win95 shell currently requires the Docsify hash router (routerMode: "hash").',
        );
      }
      if (document.body) {
        document.body.classList.add('w95-mode');
      }
      document.documentElement.classList.add('w95-enabled');
    });

    hook.mounted(() => {
      if (!state.enabled) {
        return;
      }
      if (typeof window.WinBox !== 'function') {
        console.error(
          '[win95-docsify] WinBox was not found. Load theme/vendor/winbox.min.js before theme/win95.js.',
        );
        state.enabled = false;
        document.body.classList.remove('w95-mode');
        document.documentElement.classList.remove('w95-enabled');
        return;
      }
      showBoot();
      setTimeout(hideBoot, 5200);
    });

    hook.ready(() => {
      if (!state.enabled) {
        return;
      }
      try {
        buildDesktop();
      } catch (error) {
        console.error('[win95-docsify] Failed to build desktop:', error);
        hideBoot();
        Array.from(state.windows.values()).forEach(rec => {
          try {
            rec.win.close();
          } catch {
            // ignore
          }
        });
        ['w95-desktop', 'w95-taskbar', 'w95-startmenu', 'w95-shutdown'].forEach(
          id => {
            const node = document.getElementById(id);
            if (node) {
              node.remove();
            }
          },
        );
        document
          .querySelectorAll('.winbox.w95-window')
          .forEach(node => node.remove());
        document.body.classList.remove('w95-mode');
        document.documentElement.classList.remove('w95-enabled');
      }
    });

    hook.doneEach(() => {
      if (!state.enabled) {
        return;
      }

      state.lastRenderedPath = canonicalPath(
        (vm.route && vm.route.path) || window.location.hash || '/',
      );

      const req = state.activeLoad;
      if (!req) {
        return;
      }

      if (
        !document.body.contains(req.win.window) ||
        canonicalPath(req.key) === state.lastRenderedPath
      ) {
        clearTimeout(req.timer);
        state.activeLoad = null;
        if (document.body.contains(req.win.window)) {
          fillDoc(req.win, req.item);
        }
        setTimeout(pumpDocQueue, 0);
      }
    });
  }

  // Expose a small API for power users.
  window.Win95Docsify = {
    version: VERSION,
    openDoc,
    openDocByHref,
    openApp,
    openAppFromHref,
    openExplorer,
    showAbout,
    showRunDialog,
    state,
  };

  window.$docsify = window.$docsify || {};
  const existingPlugins = window.$docsify.plugins;
  window.$docsify.plugins = (Array.isArray(existingPlugins)
    ? existingPlugins
    : existingPlugins
      ? [existingPlugins]
      : []
  ).concat([plugin]);
})();
