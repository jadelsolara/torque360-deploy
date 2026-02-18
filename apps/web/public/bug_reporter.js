/**
 * GenieOS Universal Bug Reporter v1.0.0
 * ======================================
 * Self-contained bug reporter widget for any web project.
 * Zero dependencies. Drop in with a single script tag.
 *
 * USAGE:
 * ------
 * <!-- Optional: configure before loading -->
 * <script>
 *   window.GENIE_BUG_CONFIG = {
 *     projectName: 'MyProject',   // Name shown in reports (default: 'MyApp')
 *     storageKey: 'myproject_bugs', // localStorage key (default: 'genie_bugs')
 *     maxBugs: 200,               // Max stored bugs (default: 200)
 *     position: 'bottom-right',   // 'bottom-right' | 'bottom-left' (default: 'bottom-right')
 *     theme: 'auto',              // 'dark' | 'light' | 'auto' (default: 'auto')
 *     lang: 'es',                 // 'es' | 'en' (default: 'es')
 *     onSend: function(text) {    // Custom callback when a bug is "sent"
 *       // e.g. fetch('/api/bugs', { method:'POST', body: text })
 *     }
 *   };
 * </script>
 * <script src="bug_reporter_universal.js"></script>
 *
 * That's it. The FAB appears automatically.
 *
 * GenieOS Motors: TERMINATOR (debugging), SIMULATOR (verification), ANTON_EGO (quality)
 * License: Internal GenieOS component — Jose Antonio
 */
;(function() {
  'use strict';

  // ── Config ──────────────────────────────────────────────────────────
  var CFG = Object.assign({
    projectName: 'MyApp',
    storageKey: 'genie_bugs',
    maxBugs: 200,
    position: 'bottom-right',
    theme: 'auto',
    lang: 'es',
    onSend: null
  }, window.GENIE_BUG_CONFIG || {});

  // ── i18n ────────────────────────────────────────────────────────────
  var L = {
    es: {
      title: 'Bug Reporter',
      section: 'Seccion',
      jsErrors: 'Errores JS',
      pending: 'pendiente',
      pendings: 'pendientes',
      sevLow: 'Bajo \u2014 Visual/cosmetico',
      sevMedium: 'Medio \u2014 Funcionalidad parcial',
      sevHigh: 'Alto \u2014 Funcionalidad rota',
      sevCritical: 'Critico \u2014 Perdida de datos/crash',
      sevLabelLow: 'Bajo',
      sevLabelMedium: 'Medio',
      sevLabelHigh: 'Alto',
      sevLabelCritical: 'Critico',
      descPlaceholder: 'Opcional \u2014 describe que paso (requerido si ya reportaste en esta seccion)',
      reportBtn: '+ Reportar Bug',
      attachErr: 'err',
      attached: 'adjuntos',
      noBugs: 'No hay bugs reportados',
      noBugsHint: 'Navega la app y reporta cualquier problema que encuentres',
      pendingHeader: 'Pendientes de envio',
      sentLabel: 'Enviado',
      pendingLabel: 'Pendiente',
      sendBtn: 'Enviar',
      sendAllBtn: 'Enviar',
      exportBtn: 'Exportar',
      clearBtn: 'Limpiar',
      clearConfirm: '\u00bfEliminar todos los bugs reportados?',
      bugSaved: 'Bug guardado \u2014 sigue navegando',
      bugCopied: 'Bug copiado al portapapeles \u2014 pegalo en email o chat',
      bugsCopied: 'bug(s) copiados al portapapeles \u2014 listos para enviar',
      bugsExported: 'Bugs exportados',
      noPending: 'No hay bugs pendientes',
      duplicateWarn: 'Ya hay un bug en esta seccion \u2014 agrega detalles para diferenciarlo',
      noErrors: 'No hay errores capturados',
      viewErrors: 'Ver errores adjuntos',
      reportTitle: 'Bug Report',
      bugLabel: 'Bug',
      dateLabel: 'Fecha',
      totalLabel: 'Total',
      bugs: 'bugs',
      bug: 'bug',
      sectionLabel: 'Seccion',
      userLabel: 'Usuario',
      viewportLabel: 'Viewport',
      langLabel: 'Lang',
      jsErrorsAttached: 'Errores JS adjuntos',
      onSendDone: 'Bug enviado via callback',
      onSendAllDone: 'Todos los bugs enviados via callback'
    },
    en: {
      title: 'Bug Reporter',
      section: 'Section',
      jsErrors: 'JS Errors',
      pending: 'pending',
      pendings: 'pending',
      sevLow: 'Low \u2014 Visual/cosmetic',
      sevMedium: 'Medium \u2014 Partial functionality',
      sevHigh: 'High \u2014 Broken functionality',
      sevCritical: 'Critical \u2014 Data loss/crash',
      sevLabelLow: 'Low',
      sevLabelMedium: 'Medium',
      sevLabelHigh: 'High',
      sevLabelCritical: 'Critical',
      descPlaceholder: 'Optional \u2014 describe what happened (required if already reported in this section)',
      reportBtn: '+ Report Bug',
      attachErr: 'err',
      attached: 'attached',
      noBugs: 'No bugs reported',
      noBugsHint: 'Browse the app and report any issues you find',
      pendingHeader: 'Pending to send',
      sentLabel: 'Sent',
      pendingLabel: 'Pending',
      sendBtn: 'Send',
      sendAllBtn: 'Send',
      sendAllLabel: 'all',
      exportBtn: 'Export',
      clearBtn: 'Clear',
      clearConfirm: 'Delete all reported bugs?',
      bugSaved: 'Bug saved \u2014 keep browsing',
      bugCopied: 'Bug copied to clipboard \u2014 paste into email or chat',
      bugsCopied: 'bug(s) copied to clipboard \u2014 ready to send',
      bugsExported: 'Bugs exported',
      noPending: 'No pending bugs',
      duplicateWarn: 'Already have a bug in this section \u2014 add details to differentiate it',
      noErrors: 'No captured errors',
      viewErrors: 'View attached errors',
      reportTitle: 'Bug Report',
      bugLabel: 'Bug',
      dateLabel: 'Date',
      totalLabel: 'Total',
      bugs: 'bugs',
      bug: 'bug',
      sectionLabel: 'Section',
      userLabel: 'User',
      viewportLabel: 'Viewport',
      langLabel: 'Lang',
      jsErrorsAttached: 'JS errors attached',
      onSendDone: 'Bug sent via callback',
      onSendAllDone: 'All bugs sent via callback'
    }
  };
  var t = L[CFG.lang] || L.es;

  // ── Theme detection ─────────────────────────────────────────────────
  function isDark() {
    if (CFG.theme === 'dark') return true;
    if (CFG.theme === 'light') return false;
    // auto: check CSS custom props, then prefers-color-scheme
    var bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
    if (bg) {
      var c = bg.replace('#', '');
      if (c.length === 3) c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
      var r = parseInt(c.substring(0,2),16), g = parseInt(c.substring(2,4),16), b = parseInt(c.substring(4,6),16);
      return (r*0.299 + g*0.587 + b*0.114) < 128;
    }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function themeVars() {
    var dark = isDark();
    return {
      card: dark ? '#1a1a2e' : '#ffffff',
      bg: dark ? '#111' : '#f5f5f5',
      border: dark ? '#333' : '#ddd',
      text: dark ? '#eee' : '#222',
      textMuted: dark ? '#666' : '#999',
      codeBg: dark ? 'rgba(255,255,255,.1)' : 'rgba(0,0,0,.06)',
      rowHoverBg: dark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.03)',
      errorDetailBg: dark ? 'rgba(0,0,0,.3)' : 'rgba(0,0,0,.05)'
    };
  }

  // ── Utilities (inline, no external deps) ────────────────────────────
  function sanitize(str) {
    if (typeof str !== 'string') return String(str || '');
    var map = {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'};
    return str.replace(/[&<>"']/g, function(c) { return map[c]; });
  }

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
  }

  // Minimal toast (self-contained, won't conflict)
  var _toastEl = null;
  function toast(msg, isErr) {
    if (!_toastEl) {
      _toastEl = document.createElement('div');
      _toastEl.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);padding:10px 20px;border-radius:8px;font-size:13px;font-family:system-ui,sans-serif;z-index:100001;pointer-events:none;opacity:0;transition:opacity .3s;max-width:90vw;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.3)';
      document.body.appendChild(_toastEl);
    }
    var dark = isDark();
    _toastEl.style.background = isErr
      ? (dark ? '#d32f2f' : '#f44336')
      : (dark ? '#2e7d32' : '#43a047');
    _toastEl.style.color = '#fff';
    _toastEl.textContent = msg;
    _toastEl.style.opacity = '1';
    clearTimeout(_toastEl._timer);
    _toastEl._timer = setTimeout(function() { _toastEl.style.opacity = '0'; }, 3000);
  }

  function copyToClipboard(text, successMsg) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        toast(successMsg);
      }).catch(function() { fallbackCopy(text, successMsg); });
    } else {
      fallbackCopy(text, successMsg);
    }
  }

  function fallbackCopy(text, successMsg) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch(e) {}
    ta.remove();
    toast(successMsg);
  }

  // ── Section auto-detect ─────────────────────────────────────────────
  function detectSection() {
    // 1. Check for global currentSection (common pattern)
    if (typeof window.currentSection !== 'undefined' && window.currentSection) {
      return String(window.currentSection);
    }
    // 2. URL hash
    var hash = window.location.hash.replace(/^#\/?/, '');
    if (hash) return hash;
    // 3. Document title
    var title = document.title;
    if (title) return title.substring(0, 60);
    // 4. Pathname
    var path = window.location.pathname;
    if (path && path !== '/') return path;
    return '?';
  }

  // ── User auto-detect ───────────────────────────────────────────────
  function detectUser() {
    if (typeof window._currentUser !== 'undefined' && window._currentUser && window._currentUser.name) {
      return window._currentUser.name;
    }
    return 'anon';
  }

  // ── JS Error Capture ────────────────────────────────────────────────
  var _bugErrors = [];
  var _BUG_ERROR_CAP = 50;
  var _bugAttachedErrors = null;

  var _prevOnerror = window.onerror;
  window.onerror = function(msg, src, line, col, err) {
    _bugErrors.push({
      ts: new Date().toISOString(),
      type: 'error',
      msg: String(msg),
      src: String(src || '').split('/').pop(),
      line: line,
      col: col,
      stack: (err && err.stack) ? err.stack.substring(0, 300) : '',
      section: detectSection()
    });
    if (_bugErrors.length > _BUG_ERROR_CAP) _bugErrors.shift();
    updateBadge();
    if (typeof _prevOnerror === 'function') return _prevOnerror.apply(this, arguments);
    return false;
  };

  window.addEventListener('unhandledrejection', function(e) {
    var reason = e.reason || {};
    _bugErrors.push({
      ts: new Date().toISOString(),
      type: 'promise',
      msg: String(reason.message || reason || 'Unknown rejection').substring(0, 200),
      src: '',
      line: 0,
      col: 0,
      stack: reason.stack ? reason.stack.substring(0, 300) : '',
      section: detectSection()
    });
    if (_bugErrors.length > _BUG_ERROR_CAP) _bugErrors.shift();
    updateBadge();
  });

  // ── Storage ─────────────────────────────────────────────────────────
  function loadBugs() {
    try { return JSON.parse(localStorage.getItem(CFG.storageKey) || '[]'); }
    catch(e) { return []; }
  }

  function saveBugs(bugs) {
    try {
      localStorage.setItem(CFG.storageKey, JSON.stringify(bugs.slice(-CFG.maxBugs)));
      updateBadge();
    } catch(e) {}
  }

  // ── Badge ───────────────────────────────────────────────────────────
  function updateBadge() {
    var b = document.getElementById('genie-bug-badge');
    if (!b) return;
    try {
      var bugs = JSON.parse(localStorage.getItem(CFG.storageKey) || '[]');
      var unsent = 0;
      for (var i = 0; i < bugs.length; i++) { if (!bugs[i].sent) unsent++; }
      var total = unsent + _bugErrors.length;
      b.textContent = total;
      b.style.display = total ? 'flex' : 'none';
    } catch(e) {
      b.textContent = _bugErrors.length;
      b.style.display = _bugErrors.length ? 'flex' : 'none';
    }
  }

  // ── Format bug text ─────────────────────────────────────────────────
  function formatBugText(b) {
    var sevMap = {
      low: t.sevLabelLow, medium: t.sevLabelMedium,
      high: t.sevLabelHigh, critical: t.sevLabelCritical
    };
    var sev = sevMap[b.severity] || b.severity;
    var txt = '[' + sev.toUpperCase() + '] ' + b.desc +
      '\n' + t.sectionLabel + ': ' + b.section + ' | ' + t.userLabel + ': ' + b.user + ' | ' + new Date(b.ts).toLocaleString() +
      '\n' + t.viewportLabel + ': ' + b.viewport + ' | ' + t.langLabel + ': ' + b.lang;
    if (b.errors && b.errors.length) {
      txt += '\n' + t.jsErrorsAttached + ': ' + b.errors.length;
      for (var i = 0; i < b.errors.length; i++) {
        var e = b.errors[i];
        txt += '\n  ' + (i+1) + '. ' + e.type + ' @ ' + e.src + ':' + e.line + ':' + e.col + ' \u2014 ' + e.msg;
      }
    }
    return txt;
  }

  // ── Toggle panel ────────────────────────────────────────────────────
  function togglePanel() {
    var p = document.getElementById('genie-bug-panel');
    if (!p) return;
    if (p.style.display === 'flex') { p.style.display = 'none'; return; }
    p.style.display = 'flex';
    renderPanel();
  }

  // ── Render panel ────────────────────────────────────────────────────
  function renderPanel() {
    var p = document.getElementById('genie-bug-panel');
    if (!p) return;

    var tv = themeVars();
    // Update panel theme on each render
    p.style.background = tv.card;
    p.style.borderColor = tv.border;
    p.style.color = tv.text;

    var bugs = loadBugs();
    var unsent = [], sent = [];
    for (var i = 0; i < bugs.length; i++) {
      if (bugs[i].sent) sent.push(bugs[i]); else unsent.push(bugs[i]);
    }
    var section = detectSection();
    var errCount = _bugErrors.length;

    var h = '';

    // Header
    h += '<div style="padding:14px 16px;background:linear-gradient(135deg,#ff5722,#d32f2f);color:#fff;font-weight:700;display:flex;justify-content:space-between;align-items:center">';
    h += '<span>\uD83D\uDC1B ' + sanitize(CFG.projectName) + ' ' + t.title + '</span>';
    h += '<div style="display:flex;align-items:center;gap:8px">';
    if (unsent.length) {
      h += '<span style="background:rgba(255,255,255,.25);padding:2px 8px;border-radius:10px;font-size:11px">' +
        unsent.length + ' ' + (unsent.length !== 1 ? t.pendings : t.pending) + '</span>';
    }
    h += '<button id="genie-bug-close" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;padding:0 4px">\u2715</button>';
    h += '</div></div>';

    // Info bar
    h += '<div style="padding:10px 16px;background:rgba(255,152,0,.08);border-bottom:1px solid ' + tv.border + ';font-size:11px">';
    h += '<div style="display:flex;gap:12px;flex-wrap:wrap">';
    h += '<span><strong>' + t.section + ':</strong> <code style="background:' + tv.codeBg + ';padding:1px 6px;border-radius:4px">' + sanitize(section) + '</code></span>';
    h += '<span><strong>' + t.jsErrors + ':</strong> <span style="color:' + (errCount ? '#f44336' : '#4caf50') + ';font-weight:700">' + errCount + '</span></span>';
    h += '</div></div>';

    // Form
    h += '<div style="padding:12px 16px;border-bottom:1px solid ' + tv.border + '">';
    h += '<div style="margin-bottom:8px"><select id="genie-bug-severity" style="width:100%;padding:6px 10px;border-radius:8px;border:1px solid ' + tv.border + ';background:' + tv.bg + ';color:' + tv.text + ';font-size:12px">';
    h += '<option value="low">\uD83D\uDFE1 ' + t.sevLow + '</option>';
    h += '<option value="medium" selected>\uD83D\uDFE0 ' + t.sevMedium + '</option>';
    h += '<option value="high">\uD83D\uDD34 ' + t.sevHigh + '</option>';
    h += '<option value="critical">\uD83D\uDC80 ' + t.sevCritical + '</option>';
    h += '</select></div>';
    h += '<div style="margin-bottom:8px"><textarea id="genie-bug-desc" rows="2" placeholder="' + sanitize(t.descPlaceholder) + '" style="width:100%;padding:8px 10px;border-radius:8px;border:1px solid ' + tv.border + ';background:' + tv.bg + ';color:' + tv.text + ';font-size:12px;resize:vertical;box-sizing:border-box"></textarea></div>';
    h += '<div style="display:flex;gap:8px">';
    h += '<button id="genie-bug-submit" style="flex:1;padding:8px;border:none;border-radius:8px;background:linear-gradient(135deg,#ff5722,#f44336);color:#fff;font-weight:700;cursor:pointer;font-size:12px">' + t.reportBtn + '</button>';
    if (errCount) {
      h += '<button id="genie-bug-attach" style="padding:8px 12px;border:none;border-radius:8px;background:rgba(255,152,0,.2);color:#ff9800;cursor:pointer;font-size:11px;font-weight:600" title="' + t.attachErr + '">\uD83D\uDCCE ' + errCount + ' ' + t.attachErr + '</button>';
    }
    h += '</div></div>';

    // Bug list
    h += '<div style="flex:1;overflow-y:auto;max-height:40vh">';
    if (bugs.length === 0) {
      h += '<div style="text-align:center;padding:30px 16px;color:' + tv.textMuted + '">';
      h += '<div style="font-size:32px;margin-bottom:8px">\u2728</div>';
      h += '<div>' + t.noBugs + '</div>';
      h += '<div style="font-size:11px;margin-top:4px">' + t.noBugsHint + '</div>';
      h += '</div>';
    } else {
      if (unsent.length > 0) {
        h += '<div style="padding:6px 16px;background:rgba(255,87,34,.06);font-size:10px;font-weight:700;color:#ff5722;text-transform:uppercase;letter-spacing:.5px">' + t.pendingHeader + ' (' + unsent.length + ')</div>';
      }
      var reversed = bugs.slice().reverse();
      for (var ri = 0; ri < reversed.length; ri++) {
        var b = reversed[ri];
        var idx = bugs.length - 1 - ri;
        var isSent = !!b.sent;
        var sevIcon = {low:'\uD83D\uDFE1',medium:'\uD83D\uDFE0',high:'\uD83D\uDD34',critical:'\uD83D\uDC80'}[b.severity] || '\uD83D\uDFE0';
        var ts = new Date(b.ts).toLocaleString();
        var errBadge = (b.errors && b.errors.length)
          ? '<span style="background:rgba(244,67,54,.15);color:#f44336;font-size:10px;padding:1px 6px;border-radius:8px;margin-left:4px">' + b.errors.length + ' err</span>'
          : '';
        var sentBadge = isSent
          ? '<span style="background:rgba(76,175,80,.15);color:#4caf50;font-size:10px;padding:1px 6px;border-radius:8px;margin-left:4px">\u2713 ' + t.sentLabel + '</span>'
          : '<span style="background:rgba(255,152,0,.15);color:#ff9800;font-size:10px;padding:1px 6px;border-radius:8px;margin-left:4px">' + t.pendingLabel + '</span>';
        var opacity = isSent ? '0.55' : '1';

        h += '<div style="padding:10px 16px;border-bottom:1px solid ' + tv.border + ';opacity:' + opacity + '">';
        h += '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:6px">';
        h += '<div style="flex:1;min-width:0">';
        h += '<div style="font-size:11px;color:' + tv.textMuted + ';margin-bottom:3px">' + ts + ' \u00b7 <code style="font-size:10px;background:' + tv.codeBg + ';padding:1px 5px;border-radius:4px">' + sanitize(b.section) + '</code> ' + errBadge + ' ' + sentBadge + '</div>';
        h += '<div style="font-size:12px;line-height:1.4">' + sevIcon + ' ' + sanitize(b.desc) + '</div>';

        if (b.errors && b.errors.length) {
          h += '<details style="margin-top:4px"><summary style="font-size:10px;color:#f44336;cursor:pointer">' + t.viewErrors + ' (' + b.errors.length + ')</summary>';
          h += '<div style="margin-top:4px;font-size:10px;font-family:monospace;background:' + tv.errorDetailBg + ';padding:6px 8px;border-radius:6px;max-height:120px;overflow-y:auto">';
          for (var ei = 0; ei < b.errors.length; ei++) {
            var er = b.errors[ei];
            h += '<div style="margin-bottom:4px;border-bottom:1px solid rgba(255,255,255,.05);padding-bottom:3px">';
            h += '<span style="color:#f44336">' + sanitize(er.type) + '</span> @ <span style="color:#64b5f6">' + sanitize(er.src) + ':' + er.line + ':' + er.col + '</span><br>';
            h += '<span style="color:' + tv.text + '">' + sanitize(er.msg) + '</span>';
            if (er.stack) h += '<br><span style="color:' + tv.textMuted + '">' + sanitize(er.stack.substring(0, 150)) + '</span>';
            h += '</div>';
          }
          h += '</div></details>';
        }

        h += '</div>';
        h += '<div style="display:flex;flex-direction:column;gap:4px;flex-shrink:0">';
        if (!isSent) {
          h += '<button data-genie-send="' + idx + '" style="background:none;border:1px solid rgba(76,175,80,.4);color:#4caf50;cursor:pointer;font-size:11px;padding:2px 8px;border-radius:4px;white-space:nowrap" title="' + t.sendBtn + '">\uD83D\uDCE8</button>';
        }
        h += '<button data-genie-delete="' + idx + '" style="background:none;border:none;color:' + tv.textMuted + ';cursor:pointer;font-size:14px;padding:2px;text-align:center" title="Delete">\uD83D\uDDD1</button>';
        h += '</div></div></div>';
      }
    }
    h += '</div>';

    // Footer
    if (bugs.length > 0) {
      h += '<div style="padding:8px 16px;border-top:1px solid ' + tv.border + ';display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:6px">';
      h += '<span style="font-size:11px;color:' + tv.textMuted + '">' + bugs.length + ' ' + (bugs.length !== 1 ? t.bugs : t.bug) + ' \u00b7 ' + unsent.length + ' ' + (unsent.length !== 1 ? t.pendings : t.pending) + '</span>';
      h += '<div style="display:flex;gap:6px;flex-wrap:wrap">';
      if (unsent.length > 0) {
        h += '<button id="genie-bug-sendall" style="padding:4px 10px;border:none;border-radius:6px;background:linear-gradient(135deg,#4caf50,#388e3c);color:#fff;cursor:pointer;font-size:11px;font-weight:600">\uD83D\uDCE8 ' + t.sendAllBtn + (unsent.length > 1 ? ' (' + unsent.length + ')' : '') + '</button>';
      }
      h += '<button id="genie-bug-export" style="padding:4px 10px;border:none;border-radius:6px;background:' + tv.codeBg + ';color:' + tv.text + ';cursor:pointer;font-size:11px">\uD83D\uDCCB ' + t.exportBtn + '</button>';
      h += '<button id="genie-bug-clear" style="padding:4px 10px;border:none;border-radius:6px;background:rgba(244,67,54,.1);color:#f44336;cursor:pointer;font-size:11px">\uD83D\uDDD1 ' + t.clearBtn + '</button>';
      h += '</div></div>';
    }

    p.innerHTML = h;

    // Bind events via delegation
    bindPanelEvents(p);
  }

  // ── Event binding (no inline onclick) ───────────────────────────────
  function bindPanelEvents(panel) {
    // Close button
    var closeBtn = panel.querySelector('#genie-bug-close');
    if (closeBtn) closeBtn.addEventListener('click', function() { panel.style.display = 'none'; });

    // Submit
    var submitBtn = panel.querySelector('#genie-bug-submit');
    if (submitBtn) submitBtn.addEventListener('click', submitBug);

    // Attach errors
    var attachBtn = panel.querySelector('#genie-bug-attach');
    if (attachBtn) attachBtn.addEventListener('click', attachErrors);

    // Send individual
    var sendBtns = panel.querySelectorAll('[data-genie-send]');
    for (var i = 0; i < sendBtns.length; i++) {
      (function(btn) {
        btn.addEventListener('click', function() { sendBug(parseInt(btn.getAttribute('data-genie-send'), 10)); });
      })(sendBtns[i]);
    }

    // Delete individual
    var delBtns = panel.querySelectorAll('[data-genie-delete]');
    for (var i = 0; i < delBtns.length; i++) {
      (function(btn) {
        btn.addEventListener('click', function() { deleteBug(parseInt(btn.getAttribute('data-genie-delete'), 10)); });
      })(delBtns[i]);
    }

    // Send all
    var sendAllBtn = panel.querySelector('#genie-bug-sendall');
    if (sendAllBtn) sendAllBtn.addEventListener('click', sendAllBugs);

    // Export
    var exportBtn = panel.querySelector('#genie-bug-export');
    if (exportBtn) exportBtn.addEventListener('click', exportBugs);

    // Clear
    var clearBtn = panel.querySelector('#genie-bug-clear');
    if (clearBtn) clearBtn.addEventListener('click', clearBugs);
  }

  // ── Actions ─────────────────────────────────────────────────────────
  function submitBug() {
    var descEl = document.getElementById('genie-bug-desc');
    var desc = descEl ? descEl.value.trim() : '';
    var section = detectSection();
    var bugs = loadBugs();
    var sameSection = [];
    for (var i = 0; i < bugs.length; i++) {
      if (bugs[i].section === section && !bugs[i].sent) sameSection.push(bugs[i]);
    }
    if (sameSection.length > 0 && !desc) {
      toast(t.duplicateWarn, true);
      if (descEl) descEl.focus();
      return;
    }
    var sevEl = document.getElementById('genie-bug-severity');
    var bug = {
      id: genId(),
      ts: new Date().toISOString(),
      project: CFG.projectName,
      section: section,
      user: detectUser(),
      severity: sevEl ? sevEl.value : 'medium',
      desc: desc || (t.bugLabel + ' ' + (CFG.lang === 'en' ? 'in' : 'en') + ' ' + section),
      errors: _bugAttachedErrors || null,
      ua: navigator.userAgent.substring(0, 100),
      viewport: window.innerWidth + 'x' + window.innerHeight,
      lang: document.documentElement.lang || navigator.language || '?',
      sent: false
    };
    bugs.push(bug);
    saveBugs(bugs);
    _bugAttachedErrors = null;
    if (descEl) descEl.value = '';
    var unsentCount = 0;
    for (var j = 0; j < bugs.length; j++) { if (!bugs[j].sent) unsentCount++; }
    toast('\uD83D\uDC1B ' + t.bugLabel + ' #' + unsentCount + ' ' + t.bugSaved);
    renderPanel();
  }

  function sendBug(idx) {
    var bugs = loadBugs();
    if (!bugs[idx]) return;
    var b = bugs[idx];
    var txt = formatBugText(b);

    // If custom onSend callback exists, use it
    if (typeof CFG.onSend === 'function') {
      try { CFG.onSend(txt, b); } catch(e) {}
      toast(t.onSendDone);
    } else {
      copyToClipboard(txt, '\uD83D\uDCCB ' + t.bugCopied);
    }

    bugs[idx].sent = true;
    bugs[idx].sentAt = new Date().toISOString();
    saveBugs(bugs);
    renderPanel();
  }

  function sendAllBugs() {
    var bugs = loadBugs();
    var unsent = [];
    for (var i = 0; i < bugs.length; i++) { if (!bugs[i].sent) unsent.push(bugs[i]); }
    if (!unsent.length) { toast(t.noPending, true); return; }

    var report = '\u2550\u2550\u2550 ' + CFG.projectName + ' ' + t.reportTitle + ' \u2550\u2550\u2550\n' +
      t.dateLabel + ': ' + new Date().toLocaleString() + '\n' +
      t.totalLabel + ': ' + unsent.length + ' bug(s)\n\n';
    for (var j = 0; j < unsent.length; j++) {
      report += '--- ' + t.bugLabel + ' ' + (j+1) + ' ---\n' + formatBugText(unsent[j]) + '\n\n';
    }

    // If custom onSend callback exists, use it
    if (typeof CFG.onSend === 'function') {
      try { CFG.onSend(report, unsent); } catch(e) {}
      toast(t.onSendAllDone);
    } else {
      copyToClipboard(report, '\uD83D\uDCE8 ' + unsent.length + ' ' + t.bugsCopied);
    }

    for (var k = 0; k < bugs.length; k++) {
      if (!bugs[k].sent) {
        bugs[k].sent = true;
        bugs[k].sentAt = new Date().toISOString();
      }
    }
    saveBugs(bugs);
    renderPanel();
  }

  function attachErrors() {
    if (!_bugErrors.length) { toast(t.noErrors, true); return; }
    _bugAttachedErrors = _bugErrors.slice();
    var btn = document.getElementById('genie-bug-attach');
    if (btn) {
      btn.style.background = 'rgba(76,175,80,.2)';
      btn.style.color = '#4caf50';
      btn.textContent = '\u2705 ' + _bugErrors.length + ' ' + t.attached;
    }
  }

  function deleteBug(idx) {
    var bugs = loadBugs();
    bugs.splice(idx, 1);
    saveBugs(bugs);
    renderPanel();
  }

  function clearBugs() {
    if (!confirm(t.clearConfirm)) return;
    saveBugs([]);
    renderPanel();
  }

  function exportBugs() {
    var bugs = loadBugs();
    if (!bugs.length) return;
    var blob = new Blob([JSON.stringify(bugs, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = CFG.storageKey + '_' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('\uD83D\uDCCB ' + t.bugsExported + ' (' + bugs.length + ')');
  }

  // ── Inject widget ──────────────────────────────────────────────────
  function injectWidget() {
    var isRight = CFG.position !== 'bottom-left';
    var posH = isRight ? 'right:20px' : 'left:20px';

    // FAB
    var fab = document.createElement('div');
    fab.id = 'genie-bug-fab';
    fab.setAttribute('role', 'button');
    fab.setAttribute('aria-label', 'Bug Reporter');
    fab.setAttribute('tabindex', '0');
    fab.innerHTML = '<span style="font-size:20px">\uD83D\uDC1B</span>' +
      '<span id="genie-bug-badge" style="display:none;position:absolute;top:-4px;' + (isRight ? 'right' : 'left') + ':-4px;background:#f44336;color:#fff;font-size:10px;font-weight:700;min-width:18px;height:18px;border-radius:50%;align-items:center;justify-content:center">0</span>';
    fab.style.cssText = 'position:fixed;bottom:20px;' + posH + ';width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,#ff5722,#f44336);color:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 16px rgba(244,67,54,.4);z-index:99999;transition:transform .2s,box-shadow .2s;user-select:none';
    fab.addEventListener('mouseenter', function() { fab.style.transform = 'scale(1.12)'; fab.style.boxShadow = '0 6px 24px rgba(244,67,54,.5)'; });
    fab.addEventListener('mouseleave', function() { fab.style.transform = 'scale(1)'; fab.style.boxShadow = '0 4px 16px rgba(244,67,54,.4)'; });
    fab.addEventListener('click', togglePanel);
    fab.addEventListener('keydown', function(e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePanel(); } });
    document.body.appendChild(fab);
    updateBadge();

    // Panel
    var panel = document.createElement('div');
    panel.id = 'genie-bug-panel';
    var tv = themeVars();
    panel.style.cssText = 'position:fixed;bottom:80px;' + posH + ';width:400px;max-width:calc(100vw - 24px);max-height:80vh;background:' + tv.card + ';border:1px solid ' + tv.border + ';border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.4);z-index:99998;display:none;flex-direction:column;overflow:hidden;font-family:system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;font-size:13px;color:' + tv.text;
    document.body.appendChild(panel);

    // Close panel on outside click
    document.addEventListener('click', function(e) {
      if (panel.style.display === 'flex' &&
          !panel.contains(e.target) &&
          !fab.contains(e.target)) {
        panel.style.display = 'none';
      }
    });

    // Close on Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && panel.style.display === 'flex') {
        panel.style.display = 'none';
      }
    });
  }

  // ── Boot ────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectWidget);
  } else {
    injectWidget();
  }

  // ── Public API (optional, for programmatic access) ──────────────────
  window.GenieBugReporter = {
    open: function() {
      var p = document.getElementById('genie-bug-panel');
      if (p) { p.style.display = 'flex'; renderPanel(); }
    },
    close: function() {
      var p = document.getElementById('genie-bug-panel');
      if (p) p.style.display = 'none';
    },
    toggle: togglePanel,
    getBugs: loadBugs,
    getErrors: function() { return _bugErrors.slice(); },
    clearErrors: function() { _bugErrors.length = 0; updateBadge(); },
    config: CFG
  };

})();
