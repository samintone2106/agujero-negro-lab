/* -------------------------------------------------------------------------- */
/* PASAPORTE ESPACIAL: SELLOS POR MUNDO PISADO Y LOGROS                        */
/* -------------------------------------------------------------------------- */
// Se guarda en este navegador (localStorage). Si no hay almacenamiento, dura la sesión.
const PASS_KEY = 'eh.passport';
const ACHIEVEMENTS = [
    ['luna2m', '🦘', 'Canguro lunar', 'Salta 2 m en la Luna.'],
    ['encelado25', '🚀', 'Casi en órbita', 'Salta más de 25 m en Encélado.'],
    ['fobos100', '🪐', 'Sin peso', 'Sube más de 100 m de un salto en Fobos.'],
    ['torbellino', '🌪️', 'Cazador de torbellinos', 'Deja que te alcance un torbellino en Marte.'],
    ['muestras', '💎', 'Geólogo espacial', 'Recoge las 5 muestras de un mundo.'],
    ['viaje', '🧭', 'Navegante', 'Completa un viaje con la ruta real sin saltarlo.'],
    ['gg_win', '🕳️', 'Rozaste el abismo', 'Escapa de Gargantúa tras bajar de 3 r_s.'],
    ['gg_lose', '⏳', 'Congelado en el tiempo', 'Cruza el horizonte de Gargantúa.'],
    ['tour', '🎬', 'Del Big Bang a casa', 'Mira el tour completo con el narrador.'],
    ['mundos5', '🛂', 'Trotamundos', 'Pisa 5 mundos distintos.'],
    ['mundos12', '👑', 'Explorador del Sistema Solar', 'Pisa 12 mundos distintos.']
];
const passport = (() => {
    try { const p = JSON.parse(localStorage.getItem(PASS_KEY) || '{}'); return { stamps: p.stamps || {}, got: p.got || {} }; }
    catch (e) { return { stamps: {}, got: {} }; }
})();
function savePassport() { try { localStorage.setItem(PASS_KEY, JSON.stringify(passport)); } catch (e) { /* sin almacenamiento */ } }

function unlock(id) {
    if (passport.got[id]) return;
    const a = ACHIEVEMENTS.find(x => x[0] === id); if (!a) return;
    passport.got[id] = new Date().toISOString().slice(0, 10);
    savePassport();
    showAchievement(a);
    audioEngine.playClickTone(1320, 0.08);
    renderPassport();
}
function stamp(id) {
    if (passport.stamps[id]) return;
    passport.stamps[id] = new Date().toISOString().slice(0, 10);
    savePassport();
    const n = Object.keys(passport.stamps).length;
    if (n >= 5) unlock('mundos5');
    if (n >= 12) unlock('mundos12');
    renderPassport();
}

/* ------------------------------ ventana ------------------------------ */
const passDom = { btn: document.getElementById('passport-btn'), box: document.getElementById('passport'), stamps: document.getElementById('passport-stamps'), ach: document.getElementById('passport-ach'), count: document.getElementById('passport-count'),
    worlds: document.getElementById('passport-worlds'), got: document.getElementById('passport-got'), ring: document.getElementById('passport-ring') };

// Aviso de logro (tarjeta propia, arriba a la derecha).
let achTimer = null;
function showAchievement(a) {
    const el = document.getElementById('ach-toast'); if (!el) return;
    document.getElementById('ach-icon').textContent = a[1];
    document.getElementById('ach-name').textContent = a[2];
    document.getElementById('ach-how').textContent = a[3];
    el.hidden = false; el.classList.remove('is-out');
    clearTimeout(achTimer);
    achTimer = setTimeout(() => { el.classList.add('is-out'); setTimeout(() => { el.hidden = true; }, 260); }, 4500);
}
function renderPassport() {
    if (!passDom.box) return;
    const ids = Object.keys(SURFACE_SITES);
    const nW = Object.keys(passport.stamps).length, nA = Object.keys(passport.got).length;
    passDom.count.textContent = `${nW}/${ids.length} mundos · ${nA}/${ACHIEVEMENTS.length} logros`;
    passDom.worlds.textContent = `${nW}/${ids.length}`;
    passDom.got.textContent = `${nA}/${ACHIEVEMENTS.length}`;
    const k = (nW / ids.length + nA / ACHIEVEMENTS.length) / 2;
    passDom.ring.style.strokeDashoffset = String(97.4 * (1 - k));
    passDom.stamps.replaceChildren(...ids.map(id => {
        const li = document.createElement('li');
        const got = !!passport.stamps[id];
        li.className = 'pass-stamp' + (got ? ' is-got' : '');
        li.textContent = siteName(id);
        li.title = got ? `Pisado el ${passport.stamps[id]}` : 'Todavía no';
        return li;
    }));
    // primero los conseguidos
    const ordered = [...ACHIEVEMENTS].sort((x, y) => (passport.got[y[0]] ? 1 : 0) - (passport.got[x[0]] ? 1 : 0));
    passDom.ach.replaceChildren(...ordered.map(([id, icon, name, how]) => {
        const li = document.createElement('li');
        li.className = 'pass-ach' + (passport.got[id] ? ' is-got' : '');
        const i = document.createElement('span'); i.textContent = icon; i.setAttribute('aria-hidden', 'true');
        const t = document.createElement('div');
        const b = document.createElement('b'); b.textContent = name;
        const s = document.createElement('small'); s.textContent = how;
        t.append(b, s);
        li.append(i, t);
        return li;
    }));
}
function setPassportOpen(open) {
    passDom.box.hidden = !open;
    passDom.btn.setAttribute('aria-expanded', String(open));
    if (open) { renderPassport(); document.getElementById('passport-close')?.focus(); }
}
passDom.btn?.addEventListener('click', () => setPassportOpen(passDom.box.hidden));
document.getElementById('passport-close')?.addEventListener('click', () => { setPassportOpen(false); passDom.btn.focus(); });
passDom.box?.addEventListener('click', (e) => { if (e.target === passDom.box) setPassportOpen(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && passDom.box && !passDom.box.hidden) setPassportOpen(false); });

/* ------------------------------ qué se vigila ------------------------------ */
// Viaje completo sin saltar: se envuelve endVoyage (se llama por nombre global).
if (typeof endVoyage === 'function') {
    const baseEndVoyage = endVoyage;
    endVoyage = function (skip) { if (voyage.active && !skip && voyage.frac >= 1) unlock('viaje'); return baseEndVoyage(skip); };
}
setInterval(() => {
    if (surface.active && surface.id) {
        stamp(surface.id);
        const best = player.best || 0;
        if (surface.id === 'moon' && best >= 2) unlock('luna2m');
        if (surface.id === 'Encélado' && best > 25) unlock('encelado25');
        if (surface.id === 'Fobos' && best > 100) unlock('fobos100');
        if (surface.id === 'mars' && player.gust.lengthSq() > 1) unlock('torbellino');
    }
    if (gg.over === 'win') unlock('gg_win');
    if (gg.over === 'lose') unlock('gg_lose');
    if (tourState.active && tourState.step === TOUR_STEPS.length - 1) unlock('tour');
}, 500);
