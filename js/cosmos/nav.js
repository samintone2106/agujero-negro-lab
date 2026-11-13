/* -------------------------------------------------------------------------- */
/* NAVEGADOR CÓSMICO: ORIGEN › VÍA LÁCTEA › SISTEMA SOLAR › PLANETA › LUNA     */
/* -------------------------------------------------------------------------- */
const navEl = document.querySelector('nav[aria-label^="Selector"]');
const breadcrumbEl = document.getElementById('breadcrumb');
const astroName = (id) => ASTRO_TARGETS[id].name.split(' (')[0];

function navHeader(text) {
    const h = document.createElement('div');
    h.className = 'nav-group';
    h.textContent = text;
    return h;
}

function navCosmosButton(mode, label, dot) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cosmos-btn';
    b.dataset.cosmos = mode;
    const d = document.createElement('span'); d.className = 'nav-dot'; d.style.background = dot;
    const t = document.createElement('span'); t.className = 'truncate'; t.textContent = label;
    b.append(d, t);
    b.addEventListener('click', () => { audioEngine.playClickTone(900, 0.05); enterCosmos(mode); });
    return b;
}

(() => {
    if (!navEl) return;
    const title = navEl.querySelector('div span');
    if (title) title.textContent = 'NAVEGADOR';
    const first = navEl.querySelector('.target-btn');
    const before = (node, ref) => navEl.insertBefore(node, ref);
    before(navHeader('ORIGEN'), first);
    before(navCosmosButton('origin', 'BIG BANG', '#ffd27a'), first);
    before(navCosmosButton('origin-faith', 'EN EL PRINCIPIO', '#fff4cf'), first);
    before(navHeader('VÍA LÁCTEA'), first);
    before(navCosmosButton('galaxy', 'GALAXIA', '#a5b4fc'), first);
    before(navCosmosButton('neighborhood', 'ESTRELLAS CERCANAS', '#bae6fd'), first);
    before(navHeader('SISTEMA SOLAR'), first);
    const pulsarBtn = navEl.querySelector('.target-btn[data-target="pulsar"]');
    if (pulsarBtn) before(navHeader('EXÓTICOS'), pulsarBtn);
})();

// Lunas del planeta elegido, como subelementos debajo de su botón.
const moonList = document.createElement('div');
moonList.className = 'nav-moons';
function syncNav() {
    if (!navEl) return;
    navEl.querySelectorAll('.cosmos-btn').forEach(b => b.setAttribute('aria-pressed', String(cosmos.active && cosmos.mode === b.dataset.cosmos)));
    navEl.classList.toggle('in-cosmos', cosmos.active);
    const planet = state.currentTarget;
    const list = (MOONS[planet] || []).map((m, i) => ({ name: m.name, get: () => moonSystems[planet].moons[i].mesh }));
    if (planet === 'pluto') list.push({ name: 'Caronte', get: () => charon });
    moonList.replaceChildren();
    if (!list.length || cosmos.active) { moonList.remove(); return; }
    list.forEach(m => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'nav-moon';
        b.textContent = m.name;
        const focused = moonFocus.mesh && moonFocus.mesh === m.get();
        b.setAttribute('aria-pressed', String(!!focused));
        b.addEventListener('click', () => {
            if (!moonsState.visible) setMoonsVisible(true);
            focusMoon(m.get());
            syncNav();
            updateBreadcrumb();
        });
        moonList.appendChild(b);
    });
    const btn = navEl.querySelector(`.target-btn[data-target="${planet}"]`);
    if (btn) btn.after(moonList);
}

function crumb(label, fn) {
    const el = document.createElement(fn ? 'button' : 'span');
    el.textContent = label;
    if (fn) { el.type = 'button'; el.addEventListener('click', fn); }
    return el;
}

function updateBreadcrumb() {
    if (!breadcrumbEl) return;
    const parts = [crumb('Universo', null)];
    if (cosmos.active && cosmos.mode.startsWith('origin')) {
        parts.push(crumb(cosmos.mode === 'origin' ? 'Origen · ciencia' : 'Origen · fe', null));
    } else {
        parts.push(crumb('Vía Láctea', () => enterCosmos('galaxy')));
        if (cosmos.active && cosmos.mode === 'neighborhood') parts.push(crumb('Vecindario solar', null));
        if (!cosmos.active) {
            const t = state.currentTarget;
            if (t === 'pulsar') parts.push(crumb('Brazo de Orión · Vela', null));
            else if (t === 'gargantua') parts.push(crumb('Agujero negro (ilustración)', null));
            else {
                parts.push(crumb('Sistema Solar', () => { clearMoonFocus(); switchTarget('sun'); }));
                parts.push(crumb(astroName(t), moonFocus.mesh ? () => { clearMoonFocus(); updateBreadcrumb(); syncNav(); } : null));
                if (moonFocus.mesh) parts.push(crumb(moonFocus.mesh.userData.moon.cfg.name, null));
            }
        }
    }
    breadcrumbEl.replaceChildren();
    parts.forEach((p, i) => {
        if (i) { const s = document.createElement('span'); s.className = 'crumb-sep'; s.textContent = '›'; s.setAttribute('aria-hidden', 'true'); breadcrumbEl.appendChild(s); }
        breadcrumbEl.appendChild(p);
    });
}

// Mantener menú y migas al día cuando cambia el astro o la luna enfocada.
const _switchTarget = switchTarget;
switchTarget = function (id) {
    if (cosmos.active) { cosmos.active = false; } // salir del universo si se elige un astro
    _switchTarget(id);
    if (!cosmos.active) {
        cosmos.controls.enabled = false; controls.enabled = true;
        document.body.classList.remove('cosmos-mode'); delete document.body.dataset.cosmos;
        cosmosDom.panel.hidden = true;
        ['origin', 'origin-faith'].forEach(m => { if (cosmos.mode === m) originStop(); });
        cosmos.mode = null;
    }
    syncNav();
    updateBreadcrumb();
    // en la tira horizontal del móvil, llevar a la vista el astro elegido
    navEl?.querySelector(`.target-btn[data-target="${id}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' });
};
const _focusMoon = focusMoon;
focusMoon = function (mesh) { _focusMoon(mesh); syncNav(); updateBreadcrumb(); };
const _clearMoonFocus = clearMoonFocus;
clearMoonFocus = function () { _clearMoonFocus(); syncNav(); updateBreadcrumb(); };
