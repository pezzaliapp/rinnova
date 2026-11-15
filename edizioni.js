/* =============================================================
   Edizioni per ruolo — motore generico (PezzaliAPP · Rinnova)
   -------------------------------------------------------------
   Crea, dall'app completa, un UNICO file .html per un ruolo
   (es. agente, cliente) che funziona da solo e offline.

   Le parti riservate vengono TOLTE dal file, non nascoste:
   - nell'HTML: elementi con data-riservato="agente cliente"
     (oppure data-riservato="*" = solo per il titolare)
   - nei dati: l'app passa al motore solo i dati ammessi per
     quel ruolo (funzione raccogli).

   Uso nell'app:
     Edizioni.registra({
       app: 'NomeApp',
       ruoli: { agente: { nome, descrizione, vede: [...], nonVede: [...] } },
       raccogli: async (ruolo) => ({ ...dati ammessi... })
     });
   Nel file creato:
     Edizioni.attiva  -> true
     Edizioni.ruolo   -> 'agente'
     Edizioni.dati    -> i dati incorporati
   ============================================================= */
(function () {
  'use strict';

  const PKG = (() => {
    try {
      const el = document.getElementById('edizione-dati');
      return el ? JSON.parse(el.textContent) : null;
    } catch (_) { return null; }
  })();

  const E = {
    attiva: !!PKG,
    ruolo: PKG ? PKG.ruolo : null,
    dati: PKG ? PKG.dati : null,
    titolo: PKG ? PKG.titolo : '',
    creato: PKG ? PKG.creato : null,
    _cfg: null
  };

  if (PKG) document.documentElement.setAttribute('data-edizione', PKG.ruolo);

  // ---------- regole di visibilità (anche per elementi creati dopo dal codice) ----------
  function riservatoPer(el, ruolo) {
    const v = (el.getAttribute('data-riservato') || '').trim();
    if (!v) return false;
    if (v === '*') return true;
    return v.split(/[\s,]+/).includes(ruolo);
  }
  if (PKG) {
    const st = document.createElement('style');
    st.textContent =
      `[data-riservato="*"],[data-riservato~="${PKG.ruolo}"]{display:none!important}` +
      `.ed-banner{background:#15171c;color:#fff;border-radius:12px;padding:12px 16px;margin:12px 0;display:flex;flex-direction:column;gap:2px}` +
      `.ed-banner b{font-size:17px}.ed-banner span{font-size:13px;opacity:.8}` +
      `@media print{.ed-banner{display:none!important}}`;
    document.head.appendChild(st);
  }

  // ---------- costruzione del file ----------
  const get = async (u, tipo) => {
    const r = await fetch(u, { cache: 'no-cache' });
    if (!r.ok) throw new Error('File dell\'app mancante: ' + u);
    return tipo === 'blob' ? r.blob() : r.text();
  };
  const aDataUrl = blob => new Promise((res, rej) => {
    const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob);
  });
  const locale = u => u && !/^(data:|blob:|https?:|\/\/|#)/i.test(u);

  async function costruisci(ruolo, titolo) {
    const cfg = E._cfg;
    if (!cfg || !cfg.ruoli[ruolo]) throw new Error('Ruolo sconosciuto: ' + ruolo);
    const dati = await cfg.raccogli(ruolo);

    const src = await get(location.pathname.endsWith('/') ? 'index.html' : location.pathname.split('/').pop());
    const doc = new DOMParser().parseFromString(src, 'text/html');

    // 1) togli davvero le parti riservate a questo ruolo
    doc.querySelectorAll('[data-riservato]').forEach(el => { if (riservatoPer(el, ruolo)) el.remove(); });

    // 2) niente installazione PWA: è un file singolo
    doc.querySelectorAll('link[rel="manifest"],link[rel="apple-touch-icon"],link[rel="icon"]').forEach(el => el.remove());

    // 3) fogli di stile locali -> incorporati
    for (const l of [...doc.querySelectorAll('link[rel="stylesheet"]')]) {
      const href = l.getAttribute('href');
      if (!locale(href)) continue;
      const s = doc.createElement('style');
      s.textContent = await get(href);
      l.replaceWith(s);
    }

    // 4) script: locali incorporati; esterni (CDN) tolti, offline non servirebbero
    for (const sc of [...doc.querySelectorAll('script[src]')]) {
      const s = sc.getAttribute('src');
      if (!locale(s)) { sc.remove(); continue; }
      const n = doc.createElement('script');
      n.textContent = '\n' + (await get(s)).replace(/<\/script/gi, '<\\/script') + '\n';
      sc.replaceWith(n);
    }

    // 5) immagini locali -> incorporate
    for (const im of [...doc.querySelectorAll('img[src]')]) {
      const s = im.getAttribute('src');
      if (!locale(s)) continue;
      try { im.setAttribute('src', await aDataUrl(await get(s, 'blob'))); } catch (_) {}
    }

    // 6) dati del ruolo, primo elemento della pagina (letti da qualunque script, anche in <head>)
    const pkg = { formato: 'edizione', v: 1, app: cfg.app || '', ruolo, titolo: titolo || '', creato: new Date().toISOString(), dati };
    const d = doc.createElement('script');
    d.type = 'application/json'; d.id = 'edizione-dati';
    d.textContent = JSON.stringify(pkg).replace(/</g, '\\u003c');
    doc.head.insertBefore(d, doc.head.firstChild);

    const nomeRuolo = cfg.ruoli[ruolo].nome;
    doc.title = (titolo || cfg.app || 'App') + ' · ' + nomeRuolo;
    return '<!DOCTYPE html>\n<!-- Edizione "' + nomeRuolo + '" creata il ' +
      new Date().toLocaleDateString('it-IT') + ': contiene solo i dati previsti per questo ruolo. -->\n' +
      doc.documentElement.outerHTML;
  }

  async function consegna(html, nome) {
    const file = new File([html], nome, { type: 'text/html' });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: nome }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file); a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  // ---------- pannello per il titolare ----------
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  function pannello() {
    const cfg = E._cfg;
    const box = document.createElement('section');
    box.id = 'edizioni-section';
    box.setAttribute('data-riservato', '*');
    box.className = 'edizioni';
    box.innerHTML = `<h2>Edizioni per ruolo</h2>
      <p class="muted">Crea un unico file HTML da condividere: funziona da solo, anche offline. Le parti riservate vengono <b>tolte dal file</b>, non solo nascoste.</p>
      <label class="ed-titolo">Titolo<input id="edTitolo" type="text" placeholder="Es. Listini 2026"></label>
      ${Object.entries(cfg.ruoli).map(([k, r]) => `
        <div class="ed-card">
          <h3>${esc(r.nome)}</h3>
          <p>${esc(r.descrizione || '')}</p>
          <div class="ed-cols">
            <div><b>Vede</b><ul>${(r.vede || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
            <div><b>Non riceve</b><ul>${(r.nonVede || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
          </div>
          <button type="button" class="btn-primary" data-ed-crea="${esc(k)}">Crea file per ${esc(r.nome.toLowerCase())}</button>
        </div>`).join('')}`;
    const st = document.createElement('style');
    st.textContent = `.edizioni .ed-card{border:1px solid rgba(127,127,127,.3);border-radius:12px;padding:12px 14px;margin:12px 0}
      .edizioni .ed-card h3{margin:0 0 4px}.edizioni .ed-card p{margin:0 0 8px;opacity:.85}
      .edizioni .ed-cols{display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:14px;margin-bottom:10px}
      .edizioni .ed-cols ul{margin:4px 0 0;padding-left:18px}
      .edizioni .ed-titolo{display:flex;flex-direction:column;gap:4px;margin:8px 0}
      @media (max-width:520px){.edizioni .ed-cols{grid-template-columns:1fr}}`;
    document.head.appendChild(st);

    box.addEventListener('click', async ev => {
      const b = ev.target.closest('[data-ed-crea]'); if (!b) return;
      const ruolo = b.dataset.edCrea, label = b.textContent;
      b.disabled = true; b.textContent = 'Preparo il file…';
      try {
        if (cfg.prima) { const msg = await cfg.prima(ruolo); if (msg) { alert(msg); return; } }
        const titolo = (document.getElementById('edTitolo').value || '').trim();
        const html = await costruisci(ruolo, titolo);
        const nome = `${(cfg.app || 'app').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${ruolo}-${new Date().toISOString().slice(0, 10)}.html`;
        await consegna(html, nome);
      } catch (e) { alert('Non sono riuscito a creare il file: ' + (e.message || e)); }
      finally { b.disabled = false; b.textContent = label; }
    });

    const dove = cfg.inserisciPrima && document.querySelector(cfg.inserisciPrima);
    if (dove) dove.parentNode.insertBefore(box, dove);
    else (document.querySelector('main') || document.body).appendChild(box);
  }

  function banner() {
    const r = (E._cfg && E._cfg.ruoli[E.ruolo]) || { nome: E.ruolo };
    const b = document.createElement('div');
    b.className = 'ed-banner';
    const d = E.creato ? new Date(E.creato).toLocaleDateString('it-IT') : '';
    b.innerHTML = '<b></b><span></span>';
    b.querySelector('b').textContent = E.titolo || (E._cfg && E._cfg.app) || 'Edizione';
    b.querySelector('span').textContent = `Edizione ${r.nome}${d ? ' · aggiornata al ' + d : ''}`;
    const main = document.querySelector('main') || document.body;
    main.insertBefore(b, main.firstChild);
    if (E.titolo) document.title = E.titolo + ' · ' + r.nome;
  }

  E.registra = function (cfg) {
    E._cfg = cfg;
    const go = () => (PKG ? banner() : pannello());
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  };
  E.costruisci = costruisci; // per i test
  E.riservato = (ruolo) => !!PKG && ruolo === PKG.ruolo;

  window.Edizioni = E;
})();
