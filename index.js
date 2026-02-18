(() => {
  const NS = 'dreamcord-sillytavern-bridge';
  const API = '/api/plugins/dreamcord-sillytavern-bridge';

  let state = {
    rows: [],
    selectedId: ''
  };

  function el(tag, attrs = {}, children = []) {
    const node = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') node.className = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'text') node.textContent = v;
      else node.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c == null) return;
      if (typeof c === 'string') node.appendChild(document.createTextNode(c));
      else node.appendChild(c);
    });
    return node;
  }

  async function jget(path) {
    const res = await fetch(`${API}${path}`, { credentials: 'include' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  }

  async function jsend(path, method, body) {
    const res = await fetch(`${API}${path}`, {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
    return data;
  }

  function getSelectedRow() {
    return state.rows.find((r) => String(r.source_id) === String(state.selectedId)) || null;
  }

  function showStatus(msg, isErr = false) {
    const out = document.getElementById('dcst-status');
    if (!out) return;
    out.textContent = msg || '';
    out.style.color = isErr ? '#ff9ca8' : '#9dd4ff';
  }

  function fillForm(row) {
    const c = row?.character || {};
    const byId = (id) => document.getElementById(id);
    byId('dcst-name').value = c.name || '';
    byId('dcst-description').value = c.description || '';
    byId('dcst-bio').value = c.bio || '';
    byId('dcst-status-text').value = c.status_text || '';
    byId('dcst-avatar-url').value = c.avatar_url || '';
    byId('dcst-banner-url').value = c.banner_url || '';
    byId('dcst-room-id').value = c.room_id || '';
    const meta = document.getElementById('dcst-meta');
    if (meta) {
      meta.textContent = row
        ? `Mapped app: ${row.mapped_app_name || 'none'}${row.mapped_active ? ' (active)' : ''}`
        : 'No character selected';
    }
  }

  function renderList() {
    const list = document.getElementById('dcst-char-list');
    if (!list) return;
    list.innerHTML = '';
    state.rows.forEach((row) => {
      const btn = el('button', {
        type: 'button',
        class: `dcst-char-btn${String(row.source_id) === String(state.selectedId) ? ' active' : ''}`,
        text: row.character?.name || row.source_id
      });
      btn.onclick = () => {
        state.selectedId = row.source_id;
        renderList();
        fillForm(getSelectedRow());
      };
      list.appendChild(btn);
    });
  }

  async function loadPreview() {
    showStatus('Loading character preview...');
    try {
      const data = await jget('/characters/preview');
      state.rows = Array.isArray(data.rows) ? data.rows : [];
      if (!state.rows.length) {
        state.selectedId = '';
        renderList();
        fillForm(null);
        showStatus('No characters found.');
        return;
      }
      if (!state.rows.some((r) => String(r.source_id) === String(state.selectedId))) {
        state.selectedId = state.rows[0].source_id;
      }
      renderList();
      fillForm(getSelectedRow());
      showStatus(`Loaded ${state.rows.length} characters.`);
    } catch (err) {
      showStatus(`Preview failed: ${err.message || err}`, true);
    }
  }

  async function saveOverride() {
    const row = getSelectedRow();
    if (!row) return showStatus('Select a character first.', true);
    const byId = (id) => document.getElementById(id);
    const payload = {
      name: byId('dcst-name').value,
      description: byId('dcst-description').value,
      bio: byId('dcst-bio').value,
      status_text: byId('dcst-status-text').value,
      avatar_url: byId('dcst-avatar-url').value,
      banner_url: byId('dcst-banner-url').value,
      room_id: byId('dcst-room-id').value
    };
    showStatus('Saving override...');
    try {
      await jsend(`/characters/${encodeURIComponent(row.source_id)}/override`, 'PUT', payload);
      await loadPreview();
      showStatus('Override saved.');
    } catch (err) {
      showStatus(`Save failed: ${err.message || err}`, true);
    }
  }

  async function clearOverride() {
    const row = getSelectedRow();
    if (!row) return showStatus('Select a character first.', true);
    showStatus('Clearing override...');
    try {
      await jsend(`/characters/${encodeURIComponent(row.source_id)}/override`, 'DELETE');
      await loadPreview();
      showStatus('Override cleared.');
    } catch (err) {
      showStatus(`Clear failed: ${err.message || err}`, true);
    }
  }

  async function syncNow(dryRun) {
    showStatus(dryRun ? 'Running dry sync...' : 'Running sync...');
    try {
      const data = await jsend('/sync/characters', 'POST', { dry_run: !!dryRun });
      showStatus(`Sync done: created=${data.created?.length || 0}, updated=${data.updated?.length || 0}, unchanged=${data.unchanged?.length || 0}`);
      await loadPreview();
    } catch (err) {
      showStatus(`Sync failed: ${err.message || err}`, true);
    }
  }

  function mountUi() {
    if (document.getElementById('dcst-panel')) return;

    const style = el('style', { id: 'dcst-style', html: `
      #dcst-panel { border:1px solid #3a4356; border-radius:10px; padding:10px; margin-top:10px; background:#151a24; }
      #dcst-panel h3 { margin:0 0 8px; font-size:14px; color:#dce6ff; }
      #dcst-grid { display:grid; grid-template-columns: 180px 1fr; gap:10px; }
      #dcst-char-list { max-height:260px; overflow:auto; display:flex; flex-direction:column; gap:6px; }
      .dcst-char-btn { text-align:left; border:1px solid #3a4250; background:#1d2330; color:#dbe3f7; border-radius:8px; padding:6px 8px; cursor:pointer; }
      .dcst-char-btn.active { background:#27354f; border-color:#5b7bb1; }
      .dcst-fields { display:grid; gap:6px; }
      .dcst-fields input, .dcst-fields textarea { width:100%; border:1px solid #3a4250; background:#101521; color:#e7ecff; border-radius:7px; padding:6px 8px; }
      .dcst-actions { display:flex; gap:6px; flex-wrap:wrap; margin-top:8px; }
      .dcst-actions button { border:1px solid #43506a; background:#222c3f; color:#e2eaff; border-radius:7px; padding:6px 10px; cursor:pointer; }
      #dcst-meta, #dcst-status { font-size:12px; color:#9dd4ff; margin-top:6px; }
      @media (max-width: 900px) { #dcst-grid { grid-template-columns: 1fr; } #dcst-char-list { max-height:160px; } }
    `});

    const panel = el('div', { id: 'dcst-panel' }, [
      el('h3', { text: 'Dreamcord SillyTavern Bridge' }),
      el('div', { id: 'dcst-grid' }, [
        el('div', {}, [
          el('div', { id: 'dcst-char-list' })
        ]),
        el('div', {}, [
          el('div', { class: 'dcst-fields' }, [
            el('input', { id: 'dcst-name', placeholder: 'Name' }),
            el('input', { id: 'dcst-description', placeholder: 'Description' }),
            el('textarea', { id: 'dcst-bio', placeholder: 'Bio', rows: '4' }),
            el('input', { id: 'dcst-status-text', placeholder: 'Status text' }),
            el('input', { id: 'dcst-avatar-url', placeholder: 'Avatar URL (http/https)' }),
            el('input', { id: 'dcst-banner-url', placeholder: 'Banner URL (http/https)' }),
            el('input', { id: 'dcst-room-id', placeholder: 'Room ID' })
          ]),
          el('div', { class: 'dcst-actions' }, [
            el('button', { id: 'dcst-refresh', type: 'button', text: 'Refresh' }),
            el('button', { id: 'dcst-save', type: 'button', text: 'Save Override' }),
            el('button', { id: 'dcst-clear', type: 'button', text: 'Clear Override' }),
            el('button', { id: 'dcst-sync-dry', type: 'button', text: 'Dry Sync' }),
            el('button', { id: 'dcst-sync', type: 'button', text: 'Sync Now' })
          ]),
          el('div', { id: 'dcst-meta' }),
          el('div', { id: 'dcst-status' })
        ])
      ])
    ]);

    const host = document.getElementById('extensions_settings') || document.getElementById('extensions_settings2') || document.body;
    if (!document.getElementById('dcst-style')) document.head.appendChild(style);
    host.appendChild(panel);

    document.getElementById('dcst-refresh').onclick = () => loadPreview();
    document.getElementById('dcst-save').onclick = () => saveOverride();
    document.getElementById('dcst-clear').onclick = () => clearOverride();
    document.getElementById('dcst-sync-dry').onclick = () => syncNow(true);
    document.getElementById('dcst-sync').onclick = () => syncNow(false);

    loadPreview();
  }

  function start() {
    mountUi();
    const observer = new MutationObserver(() => {
      if (!document.getElementById('dcst-panel')) mountUi();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    console.log(`[${NS}] settings panel mounted`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
