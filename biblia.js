/* Leitor de referências da CEB usando a tradução aberta Bíblia Livre (CC BY 4.0). */
(() => {
  'use strict';

  if (window.CEBBibliaLoaded) return;
  window.CEBBibliaLoaded = true;

  const API = 'https://api.midvash.com/v1';
  const VERSION = 'almeida-livre';
  const PREF = 'ceb-preferencias-biblicas-v1';
  const passageCache = new Map();

  // Canonical Portuguese names are sent to /parse; aliases only affect recognition.
  const groups = [
    ['Gênesis', 'gn|gên|gen|genesis'], ['Êxodo', 'ex|êx|exod'],
    ['Levítico', 'lv|lev|levit'], ['Números', 'nm|núm|num'],
    ['Deuteronômio', 'dt|deut|deuteron'], ['Josué', 'js|jos'],
    ['Juízes', 'jz|juíz|juizes'], ['Rute', 'rt'],
    ['1 Samuel', '1sm|1 sm|1sa|1 sa|i samuel'], ['2 Samuel', '2sm|2 sm|2sa|2 sa|ii samuel'],
    ['1 Reis', '1rs|1 rs|i reis'], ['2 Reis', '2rs|2 rs|ii reis'],
    ['1 Crônicas', '1cr|1 cr|1cro|i crônicas|i cronicas'], ['2 Crônicas', '2cr|2 cr|2cro|ii crônicas|ii cronicas'],
    ['Esdras', 'ed|esd'], ['Neemias', 'ne'], ['Ester', 'et|est'], ['Jó', 'job'],
    ['Salmos', 'sl|salmo|sal'], ['Provérbios', 'pv|prov|pr'], ['Eclesiastes', 'ec|ecl'],
    ['Cânticos', 'ct|cantares|cântico dos cânticos|cantico dos canticos|cânticos dos cânticos'],
    ['Isaías', 'is|isa'], ['Jeremias', 'jr|jer'], ['Lamentações', 'lm|lament'],
    ['Ezequiel', 'ez|ezq'], ['Daniel', 'dn|dan'], ['Oseias', 'os|oséias|hos'],
    ['Joel', 'jl'], ['Amós', 'am'], ['Obadias', 'ob'], ['Jonas', 'jn'],
    ['Miquéias', 'mq|miq'], ['Naum', 'na'], ['Habacuque', 'hc|hab'],
    ['Sofonias', 'sf'], ['Ageu', 'ag'], ['Zacarias', 'zc'], ['Malaquias', 'ml'],
    ['Mateus', 'mt|mat'], ['Marcos', 'mc|mar'], ['Lucas', 'lc|luc'], ['João', 'jo|joao'],
    ['Atos', 'at'], ['Romanos', 'rm|ro'], ['1 Coríntios', '1co|1 co|1cor|1 cor|i coríntios|i corintios'],
    ['2 Coríntios', '2co|2 co|2cor|2 cor|ii coríntios|ii corintios'], ['Gálatas', 'gl|ga'],
    ['Efésios', 'ef'], ['Filipenses', 'fp|fl'], ['Colossenses', 'cl|col'],
    ['1 Tessalonicenses', '1ts|1 ts|1tess|1 tess|i tessalonicenses'],
    ['2 Tessalonicenses', '2ts|2 ts|2tess|2 tess|ii tessalonicenses'],
    ['1 Timóteo', '1tm|1 tm|1tim|1 tim|i timóteo|i timoteo'],
    ['2 Timóteo', '2tm|2 tm|2tim|2 tim|ii timóteo|ii timoteo'],
    ['Tito', 'tt|tit'], ['Filemom', 'fm|flm'], ['Hebreus', 'hb|he'], ['Tiago', 'tg'],
    ['1 Pedro', '1pe|1 pe|1ped|1 ped|i pedro'], ['2 Pedro', '2pe|2 pe|2ped|2 ped|ii pedro'],
    ['1 João', '1jo|1 jo|1joão|1 joão|1joao|i joão|i joao'],
    ['2 João', '2jo|2 jo|2joão|2 joão|2joao|ii joão|ii joao'],
    ['3 João', '3jo|3 jo|3joão|3 joão|3joao|iii joão|iii joao'],
    ['Judas', 'jd|jud'], ['Apocalipse', 'ap|apoc']
  ];

  const normalize = value => String(value).normalize('NFD').replace(/\p{M}/gu, '').toLocaleLowerCase('pt-BR').replace(/[.]/g, '').replace(/\s+/g, ' ').trim();
  const bookByAlias = new Map();
  const regexAliases = new Set();
  for (const [book, list] of groups) {
    for (const alias of [book, ...list.split('|')]) {
      const value = alias.trim();
      bookByAlias.set(normalize(value), book);
      regexAliases.add(value);
      regexAliases.add(normalize(value));
    }
  }
  // Full canonical names are always recognized, including their unaccented spelling.
  for (const [book] of groups) {
    bookByAlias.set(normalize(book), book);
    regexAliases.add(book);
    regexAliases.add(normalize(book));
  }

  const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const bookPattern = [...regexAliases].sort((a, b) => b.length - a.length).map(escapeRegex).join('|');
  const referencePattern = new RegExp(`(?<![\\p{L}\\p{N}_])(${bookPattern})(?![\\p{L}\\p{N}_])\\s+(\\d{1,3})(?::(\\d{1,3})(?:\\s*[-–—]\\s*(\\d{1,3})(?::(\\d{1,3}))?)?)?(?![\\p{N}:]|\\s*[-–—]\\s*\\d)`, 'giu');

  const style = document.createElement('style');
  style.textContent = '.bib-ref{color:#174b8a;text-decoration:underline;text-decoration-style:dotted;text-underline-offset:3px;cursor:pointer;font-weight:600}.bib-modal{position:fixed;inset:0;background:#101d3588;z-index:99999;display:flex;align-items:center;justify-content:center;padding:14px}.bib-box{background:#fff;width:min(720px,100%);height:min(82vh,760px);border-radius:15px;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 18px 55px #0004}.bib-head{padding:13px 16px;background:#101d35;color:white;display:flex;align-items:center;justify-content:space-between;gap:10px}.bib-head h2{font-size:1.05rem;margin:0}.bib-close,.bib-retry{background:#d9b66d;color:#101d35;border:0;border-radius:8px;padding:8px 12px;font-weight:bold;cursor:pointer}.bib-content{padding:16px;overflow:auto;flex:1}.bib-help{background:#fff8e7;padding:12px;border-radius:9px}.bib-preview{position:fixed;z-index:100000;max-width:min(420px,calc(100vw - 24px));max-height:180px;overflow:auto;background:#101d35;color:#fff;padding:12px 14px;border:1px solid #d9b66d;border-radius:10px;box-shadow:0 8px 28px #0004;font-size:14px;line-height:1.45;pointer-events:none}.bib-preview strong{display:block;color:#e5c77e;margin-bottom:5px}.bib-passage{font-size:1.02rem;line-height:1.75;white-space:pre-wrap}.bib-credit{display:block;color:#687386;font-size:.78rem;margin-top:12px}.bib-actions{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.bib-actions a{background:#101d35;color:white;padding:9px 12px;border-radius:8px;text-decoration:none;font-weight:600}.bib-source{color:#687386;font-size:.9rem}body.bib-open{overflow:hidden}@media(prefers-reduced-motion:no-preference){.bib-box{animation:bib-in .12s ease-out}@keyframes bib-in{from{transform:translateY(8px);opacity:.6}to{transform:none;opacity:1}}}';
  document.head.append(style);

  function prefs() { try { return JSON.parse(localStorage.getItem(PREF) || '{}'); } catch { return {}; } }
  function savePrefs(value) { localStorage.setItem(PREF, JSON.stringify(value)); }

  function parseReference(raw) {
    referencePattern.lastIndex = 0;
    const match = referencePattern.exec(raw.trim());
    if (!match) return null;
    const book = bookByAlias.get(normalize(match[1]));
    if (!book) return null;
    const suffix = match[0].slice(match[1].length).trim().replace(/[–—]/g, '-');
    return { query: `${book} ${suffix}`, display: match[0].trim() };
  }

  async function fetchJson(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: 'no-cache' });
      let body;
      try { body = await response.json(); } catch { throw new Error('A API respondeu em um formato inválido.'); }
      if (!response.ok || body.error) {
        const code = body.error?.code;
        if (['BOOK_NOT_FOUND', 'INVALID_PARAMS', 'VERSE_NOT_FOUND'].includes(code)) throw new Error('Referência inválida. Confira o nome do livro, o capítulo e os versículos.');
        throw new Error(body.error?.message || `A API respondeu com erro HTTP ${response.status}.`);
      }
      return body;
    } finally { clearTimeout(timer); }
  }

  async function getPassage(query, preview = false) {
    const key = `${query}|${preview ? 'preview' : 'full'}`;
    if (passageCache.has(key)) return passageCache.get(key);
    const task = (async () => {
      const parsed = await fetchJson(`${API}/parse?q=${encodeURIComponent(query)}&version=${VERSION}`);
      const ref = parsed.data;
      if (!ref?.book_slug || !ref.chapter) throw new Error('Referência inválida. Confira o livro, capítulo e versículos.');
      let path = `${API}/${VERSION}/${encodeURIComponent(ref.book_slug)}/${ref.chapter}`;
      if (ref.verse_start != null) path += `/${ref.verse_start}${ref.verse_end && ref.verse_end !== ref.verse_start ? `-${ref.verse_end}` : ''}`;
      else if (preview) path += '?preview=500';
      const result = await fetchJson(path);
      if (!result.data?.text) throw new Error('A API não retornou o texto desta passagem.');
      return { text: result.data.text, reference: result.meta?.reference || query, version: result.data.version || VERSION, credit: result.meta?.copyright || '' };
    })();
    passageCache.set(key, task);
    try { return await task; } catch (error) { passageCache.delete(key); throw error; }
  }

  function versionLabel(version) { return version === VERSION ? 'Bíblia Livre (BLIVRE)' : version; }

  function bibleDotComUrl(display, version) {
    const ids = { ACF: 'acf', ARC: 'arc', NVI: 'nvi', ARA: 'ara' };
    return `https://www.bible.com/pt/bible/129/${encodeURIComponent(display.replace(/\s+/g, '.'))}.${ids[version] || ids.ACF}`;
  }

  function open(reference) {
    const selected = prefs().version || 'ACF';
    const modal = document.createElement('div');
    modal.className = 'bib-modal';
    modal.innerHTML = '<div class="bib-box" role="dialog" aria-modal="true" aria-labelledby="bib-title"><div class="bib-head"><h2 id="bib-title">📖 Leitura bíblica</h2><button class="bib-close" type="button">Fechar ✕</button></div><div class="bib-content"><p class="bib-source"><strong>Texto consultado: Bíblia Livre (BLIVRE)</strong></p><div class="bib-help"><strong id="bib-passage-title">Carregando passagem…</strong><p class="bib-passage" id="bib-passage-text" aria-live="polite">Consultando o texto bíblico.</p><small class="bib-credit" id="bib-credit"></small><div class="bib-actions"><a id="bib-external" target="_blank" rel="noopener">Abrir tradução preferida no Bible.com ↗</a><button class="bib-retry" id="bib-retry" type="button" hidden>Tentar novamente</button></div></div></div></div>';
    document.body.append(modal);
    document.body.classList.add('bib-open');
    const text = modal.querySelector('#bib-passage-text');
    const title = modal.querySelector('#bib-passage-title');
    const credit = modal.querySelector('#bib-credit');
    const retry = modal.querySelector('#bib-retry');
    const external = modal.querySelector('#bib-external');
    external.href = bibleDotComUrl(reference.display, selected);
    function close() { modal.remove(); document.body.classList.remove('bib-open'); document.removeEventListener('keydown', onKey); }
    function onKey(event) { if (event.key === 'Escape') close(); }
    document.addEventListener('keydown', onKey);
    modal.querySelector('.bib-close').onclick = close;
    modal.onclick = event => { if (event.target === modal) close(); };
    retry.onclick = () => load();
    async function load() {
      retry.hidden = true;
      title.textContent = reference.display;
      text.textContent = 'Consultando o texto bíblico…';
      credit.textContent = '';
      try {
        const data = await getPassage(reference.query);
        if (!modal.isConnected) return;
        title.textContent = `${reference.display} · ${versionLabel(data.version)}`;
        text.textContent = data.text;
        credit.textContent = data.credit;
      } catch (error) {
        if (!modal.isConnected) return;
        title.textContent = reference.display;
        text.textContent = `${error.name === 'AbortError' ? 'A consulta demorou demais.' : error.message || 'Não foi possível carregar o texto agora.'} Confira sua conexão e tente novamente.`;
        retry.hidden = false;
      }
    }
    load();
  }

  let previewNode = null;
  let previewTimer = null;
  let previewRequest = 0;
  function hidePreview() { clearTimeout(previewTimer); previewNode?.remove(); previewNode = null; }
  function showPreview(anchor, reference) {
    if (matchMedia('(hover: none)').matches) return;
    clearTimeout(previewTimer);
    const request = ++previewRequest;
    previewTimer = setTimeout(async () => {
      hidePreview();
      const tip = document.createElement('div');
      tip.className = 'bib-preview';
      const title = document.createElement('strong');
      title.textContent = reference.display;
      const body = document.createElement('span');
      body.textContent = 'Carregando texto bíblico…';
      tip.append(title, body);
      document.body.append(tip);
      previewNode = tip;
      const rect = anchor.getBoundingClientRect();
      tip.style.left = `${Math.max(12, Math.min(rect.left, innerWidth - 432))}px`;
      tip.style.top = `${Math.max(12, Math.min(rect.bottom + 8, innerHeight - 190))}px`;
      try {
        const data = await getPassage(reference.query, true);
        if (request !== previewRequest || previewNode !== tip) return;
        title.textContent = `${reference.display} · ${versionLabel(data.version)}`;
        body.textContent = `${data.text.slice(0, 500)}${data.text.length > 500 ? '…' : ''}`;
      } catch {
        if (previewNode === tip) body.textContent = 'Prévia indisponível. Clique para tentar novamente.';
      }
    }, 180);
  }

  function isExcluded(textNode) {
    const parent = textNode.parentElement;
    if (!parent || parent.closest('a,button,input,textarea,select,script,style,code,pre,.bib-ref,[contenteditable="true"]')) return true;
    return false;
  }

  function makeClickable(root) {
    if (!root) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (isExcluded(node)) return NodeFilter.FILTER_REJECT;
        referencePattern.lastIndex = 0;
        return referencePattern.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    for (const node of nodes) {
      const value = node.nodeValue;
      const fragment = document.createDocumentFragment();
      let last = 0;
      referencePattern.lastIndex = 0;
      let match;
      while ((match = referencePattern.exec(value))) {
        const reference = parseReference(match[0]);
        if (!reference) continue;
        fragment.append(value.slice(last, match.index));
        const link = document.createElement('a');
        link.href = '#';
        link.className = 'bib-ref';
        link.textContent = reference.display;
        link.setAttribute('aria-label', `Ler ${reference.display}`);
        link.addEventListener('click', event => { event.preventDefault(); open(reference); });
        link.addEventListener('mouseenter', () => showPreview(link, reference));
        link.addEventListener('mouseleave', hidePreview);
        link.addEventListener('focus', () => showPreview(link, reference));
        link.addEventListener('blur', hidePreview);
        fragment.append(link);
        last = match.index + match[0].length;
      }
      if (last) { fragment.append(value.slice(last)); node.replaceWith(fragment); }
    }
  }

  function openPreferences() {
    const modal = document.createElement('div');
    modal.className = 'bib-modal';
    modal.innerHTML = '<div class="bib-box" role="dialog" aria-modal="true"><div class="bib-head"><h2>⚙️ Preferências Bíblicas</h2><button class="bib-close" type="button">Fechar ✕</button></div><div class="bib-content"><p>O texto exibido pela CEB vem da Bíblia Livre (BLIVRE), disponibilizada sob licença Creative Commons Atribuição 4.0. Sua preferência abaixo define a tradução do link externo.</p><label for="bib-pref-select"><strong>Tradução para abrir no Bible.com</strong></label><p><select id="bib-pref-select"><option value="ACF">Almeida Corrigida Fiel (ACF)</option><option value="ARC">Almeida Revista e Corrigida (ARC)</option><option value="NVI">Nova Versão Internacional (NVI)</option><option value="ARA">Almeida Revista e Atualizada (ARA)</option></select></p><button class="bib-close" id="bib-save" type="button">Salvar preferência</button></div></div>';
    document.body.append(modal);
    const select = modal.querySelector('select');
    select.value = prefs().version || 'ACF';
    const close = () => modal.remove();
    modal.querySelector('.bib-close').onclick = close;
    modal.querySelector('#bib-save').onclick = () => { savePrefs({ ...prefs(), version: select.value }); close(); alert('Preferência bíblica salva neste navegador.'); };
  }

  window.CEBAbrirPreferenciasBiblicas = openPreferences;
  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-bib-pref]');
    if (button) { event.preventDefault(); openPreferences(); }
  });

  function init() {
    makeClickable(document.body);
    const observer = new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE && !node.matches('.bib-modal,.bib-preview,.bib-ref')) makeClickable(node);
        else if (node.nodeType === Node.TEXT_NODE) makeClickable(node.parentElement);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
