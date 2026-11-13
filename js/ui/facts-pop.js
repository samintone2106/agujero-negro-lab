/* -------------------------------------------------------------------------- */
/* ¿SABÍAS QUE?: TARJETA DE DATOS CURIOSOS DEL ASTRO ACTUAL                    */
/* -------------------------------------------------------------------------- */
// Se abre con el botón del encabezado; con "Cambiar solo" rota un dato cada 12 s.
const factPop = { open: false, idx: 0, target: null, auto: false, t: 0, list: [] };
const FACT_EVERY = 12;
const factDom = {
    btn: document.getElementById('facts-btn'), box: document.getElementById('fact-pop'),
    astro: document.getElementById('fact-pop-astro'), text: document.getElementById('fact-pop-text'),
    count: document.getElementById('fact-count'), auto: document.getElementById('fact-auto'), bar: document.getElementById('fact-timer-bar')
};
try { factPop.auto = localStorage.getItem('eh.factAuto') === '1'; } catch (e) { /* sin almacenamiento */ }

function factListFor(id) {
    const own = ASTRO_FACTS[id] || [];
    const site = typeof SURFACE_SITES !== 'undefined' && SURFACE_SITES[id] ? SURFACE_SITES[id].facts : [];
    return [...own, ...site.filter(f => !own.includes(f))];
}
function renderFact() {
    const list = factPop.list;
    if (!list.length) { factDom.text.textContent = 'Todavía no hay datos curiosos para este astro.'; factDom.count.textContent = ''; return; }
    factDom.text.classList.remove('is-on'); void factDom.text.offsetWidth; factDom.text.classList.add('is-on');
    factDom.text.textContent = list[factPop.idx];
    factDom.count.textContent = `${factPop.idx + 1}/${list.length}`;
    factPop.t = 0;
}
function loadFactsFor(id) {
    factPop.target = id;
    factPop.list = factListFor(id);
    factPop.idx = 0;
    factDom.astro.textContent = ASTRO_TARGETS[id] ? ASTRO_TARGETS[id].name.split(' (')[0].toUpperCase() : '';
    renderFact();
}
function stepFact(d) {
    if (!factPop.list.length) return;
    factPop.idx = (factPop.idx + d + factPop.list.length) % factPop.list.length;
    renderFact();
}
function setFactOpen(open) {
    factPop.open = open;
    factDom.box.hidden = !open;
    factDom.btn.setAttribute('aria-expanded', String(open));
    if (open) { loadFactsFor(state.currentTarget); factDom.auto.checked = factPop.auto; audioEngine.playClickTone(980, 0.04); }
}

factDom.btn?.addEventListener('click', () => setFactOpen(!factPop.open));
document.getElementById('fact-pop-close')?.addEventListener('click', () => { setFactOpen(false); factDom.btn.focus(); });
document.getElementById('fact-next')?.addEventListener('click', () => stepFact(1));
document.getElementById('fact-prev')?.addEventListener('click', () => stepFact(-1));
factDom.auto?.addEventListener('change', () => {
    factPop.auto = factDom.auto.checked; factPop.t = 0;
    try { localStorage.setItem('eh.factAuto', factPop.auto ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && factPop.open) setFactOpen(false); });

// Sigue al astro elegido y avanza solo si está en automático.
let factLast = performance.now();
setInterval(() => {
    const now = performance.now(), dt = (now - factLast) / 1000; factLast = now;
    if (!factPop.open) return;
    if (state.currentTarget !== factPop.target) loadFactsFor(state.currentTarget);
    if (factPop.auto) {
        factPop.t += dt;
        if (factPop.t >= FACT_EVERY) stepFact(1);
        factDom.bar.style.transform = `scaleX(${Math.min(1, factPop.t / FACT_EVERY).toFixed(3)})`;
    } else factDom.bar.style.transform = 'scaleX(0)';
}, 100);
