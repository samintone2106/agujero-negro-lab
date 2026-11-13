/* -------------------------------------------------------------------------- */
/* NAVEGADOR CÓSMICO EN ÁRBOL: ORIGEN › VÍA LÁCTEA › SISTEMA SOLAR › EXÓTICOS  */
/* -------------------------------------------------------------------------- */
// Secciones plegables; cada planeta despliega sus lunas debajo. Las lunas con
// vista propia (Luna, Ío, Europa, Titán) abren esa vista; las demás se enfocan.
const navEl = document.querySelector('nav[aria-label^="Selector"]');
const breadcrumbEl = document.getElementById('breadcrumb');
const astroName = (id) => ASTRO_TARGETS[id].name.split(' (')[0];

const NAV_DOT = {
    sun: '#fbbf24', mercury: '#a8a29e', venus: '#fcd34d', earth: '#38bdf8', moon: '#cbd5e1', mars: '#f87171',
    jupiter: '#fb923c', io: '#fde047', europa: '#e0f2fe', saturn: '#fde68a', titan: '#fdba74', uranus: '#5eead4',
    neptune: '#3b82f6', pluto: '#fecdd3', pulsar: '#00f0ff', gargantua: '#ff0055'
};
const MOON_TARGET = { Luna: 'moon', 'Ío': 'io', Europa: 'europa', 'Titán': 'titan' };
const PLANETS = ['sun', 'mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const navState = { open: { origin: false, galaxy: false, solar: true, exotic: true, tools: false }, expanded: new Set(), mobileOpen: false };

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };

function navMoons(planet) {
    const list = (MOONS[planet] || []).map((m, i) => ({ name: m.name, target: MOON_TARGET[m.name], get: () => moonSystems[planet].moons[i].mesh }));
    if (planet === 'pluto') list.unshift({ name: 'Caronte', get: () => charon });
    return list;
}

function isCurrentMoon(m) {
    if (cosmos.active) return false;
    if (m.target) return state.currentTarget === m.target;
    return !!moonFocus.mesh && moonFocus.mesh === m.get();
}

function planetOfTarget(id) {
    const hit = Object.entries(MOON_TARGET).find(([, t]) => t === id);
    if (!hit) return id;
    return Object.keys(MOONS).find(p => MOONS[p].some(m => m.name === hit[0])) || id;
}

function closeMobileNav() { navState.mobileOpen = false; navEl.classList.remove('is-open'); }

function goTarget(id) {
    audioEngine.playClickTone(860, 0.05);
    state.ringSkimMode = false;
    if (moonFocus.mesh) clearMoonFocus();
    switchTarget(id);
    closeMobileNav();
}

function section(key, title, buildItems) {
    const wrap = el('div', 'nav-section');
    const head = el('button', 'nav-section-head');
    head.type = 'button';
    head.setAttribute('aria-expanded', String(navState.open[key]));
    head.append(el('span', 'nav-chev', '▸'), el('span', '', title));
    head.addEventListener('click', () => { navState.open[key] = !navState.open[key]; renderNav(); });
    wrap.appendChild(head);
    if (navState.open[key]) {
        const body = el('div', 'nav-section-body');
        buildItems(body);
        wrap.appendChild(body);
    }
    return wrap;
}

function itemButton({ label, dot, active, onClick, count, expanded, onToggle }) {
    const row = el('div', 'nav-row');
    const b = el('button', 'nav-item');
    b.type = 'button';
    if (active) b.setAttribute('aria-current', 'true');
    const d = el('span', 'nav-dot'); d.style.background = dot; d.style.color = dot;
    b.append(d, el('span', 'nav-label', label));
    b.addEventListener('click', onClick);
    row.appendChild(b);
    if (count) {
        const t = el('button', 'nav-toggle');
        t.type = 'button';
        t.setAttribute('aria-expanded', String(!!expanded));
        t.setAttribute('aria-label', `${expanded ? 'Ocultar' : 'Ver'} ${count} lunas de ${label}`);
        t.append(el('span', 'nav-count', String(count)), el('span', 'nav-chev', '▸'));
        t.addEventListener('click', onToggle);
        row.appendChild(t);
    }
    return row;
}

function renderNav() {
    if (!navEl) return;
    const scrollTop = navEl.querySelector('.nav-tree')?.scrollTop || 0;
    navEl.replaceChildren();

    // botón del móvil: muestra dónde estás y abre el árbol
    const mobile = el('button', 'nav-mobile-toggle');
    mobile.type = 'button';
    mobile.setAttribute('aria-expanded', String(navState.mobileOpen));
    const here = cosmos.active ? ({ galaxy: 'Vía Láctea', neighborhood: 'Estrellas cercanas', origin: 'Big Bang', orrery: 'Mapa del Sistema Solar', compare: 'Comparador', tour: 'Tour' }[cosmos.mode] || 'Universo') : astroName(state.currentTarget);
    mobile.append(el('span', 'nav-mobile-kicker', 'NAVEGADOR'), el('span', 'nav-mobile-here', here), el('span', 'nav-chev', '▾'));
    mobile.addEventListener('click', () => { navState.mobileOpen = !navState.mobileOpen; navEl.classList.toggle('is-open', navState.mobileOpen); mobile.setAttribute('aria-expanded', String(navState.mobileOpen)); });
    navEl.appendChild(mobile);

    const tree = el('div', 'nav-tree');
    const cosmosItem = (body, mode, label, dot) => body.appendChild(itemButton({
        label, dot, active: cosmos.active && cosmos.mode === mode,
        onClick: () => { audioEngine.playClickTone(900, 0.05); closeMobileNav(); enterCosmos(mode); }
    }));

    tree.appendChild(section('origin', 'ORIGEN', (b) => cosmosItem(b, 'origin', 'Big Bang', '#ffd27a')));
    tree.appendChild(section('galaxy', 'VÍA LÁCTEA', (b) => {
        cosmosItem(b, 'galaxy', 'Galaxia', '#a5b4fc');
        cosmosItem(b, 'neighborhood', 'Estrellas cercanas', '#bae6fd');
        if (cosmos.views.orrery) cosmosItem(b, 'orrery', 'Mapa del Sistema Solar', '#fde68a');
    }));
    tree.appendChild(section('solar', 'SISTEMA SOLAR', (body) => {
        PLANETS.forEach(id => {
            const moons = navMoons(id);
            const onPlanet = !cosmos.active && state.currentTarget === id && !moonFocus.mesh;
            const expanded = navState.expanded.has(id);
            body.appendChild(itemButton({
                label: astroName(id), dot: NAV_DOT[id], active: onPlanet,
                onClick: () => goTarget(id), count: moons.length, expanded,
                onToggle: () => { expanded ? navState.expanded.delete(id) : navState.expanded.add(id); renderNav(); }
            }));
            if (expanded && moons.length) {
                const list = el('div', 'nav-moons');
                moons.forEach(m => {
                    const mb = el('button', 'nav-moon', m.name);
                    mb.type = 'button';
                    if (isCurrentMoon(m)) mb.setAttribute('aria-current', 'true');
                    if (m.target) mb.classList.add('has-view');
                    mb.addEventListener('click', () => {
                        audioEngine.playClickTone(1000, 0.05);
                        if (cosmos.active || state.currentTarget !== id) switchTarget(id);
                        if (!moonsState.visible) setMoonsVisible(true);
                        requestAnimationFrame(() => { focusMoon(m.get()); closeMobileNav(); });
                        // las lunas con vista propia: mismo acercamiento que las demás y luego se entra a su vista
                        if (m.target) setTimeout(() => { if (moonFocus.mesh === m.get()) fadeThen(() => goTarget(m.target)); }, 1300);
                    });
                    list.appendChild(mb);
                });
                body.appendChild(list);
            }
        });
    }));
    tree.appendChild(section('exotic', 'EXÓTICOS', (body) => {
        ['pulsar', 'gargantua'].forEach(id => body.appendChild(itemButton({
            label: id === 'pulsar' ? 'Púlsar de Vela' : 'Gargantúa', dot: NAV_DOT[id],
            active: !cosmos.active && state.currentTarget === id, onClick: () => goTarget(id)
        })));
    }));
    if (cosmos.views.compare || cosmos.views.tour) {
        tree.appendChild(section('tools', 'HERRAMIENTAS', (b) => {
            if (cosmos.views.compare) cosmosItem(b, 'compare', 'Comparador de tamaños', '#f0abfc');
            if (cosmos.views.tour) cosmosItem(b, 'tour', 'Tour cinematográfico', '#fca5a5');
        }));
    }
    navEl.appendChild(tree);
    tree.scrollTop = scrollTop;
}

function syncNav() {
    // el planeta actual (o el dueño de la luna actual) se despliega solo
    const p = planetOfTarget(state.currentTarget);
    if (!cosmos.active && navMoons(p).length) navState.expanded.add(p);
    renderNav();
}

function crumb(label, fn) {
    const e = el(fn ? 'button' : 'span', '', label);
    if (fn) { e.type = 'button'; e.addEventListener('click', fn); }
    return e;
}

function updateBreadcrumb() {
    if (!breadcrumbEl) return;
    const parts = [crumb('Universo', null)];
    if (cosmos.active && cosmos.mode === 'origin') parts.push(crumb('Origen · Big Bang', null));
    else {
        parts.push(crumb('Vía Láctea', () => enterCosmos('galaxy')));
        if (cosmos.active) {
            const names = { neighborhood: 'Vecindario solar', orrery: 'Sistema Solar hoy', compare: 'Comparador', tour: 'Tour' };
            if (names[cosmos.mode]) parts.push(crumb(names[cosmos.mode], null));
        } else {
            const t = state.currentTarget;
            if (t === 'pulsar') parts.push(crumb('Brazo de Orión · Vela', null));
            else if (t === 'gargantua') parts.push(crumb('Agujero negro (ilustración)', null));
            else {
                parts.push(crumb('Sistema Solar', () => { clearMoonFocus(); switchTarget('sun'); }));
                const p = planetOfTarget(t);
                if (p !== t) parts.push(crumb(astroName(p), () => switchTarget(p)));
                parts.push(crumb(astroName(t), moonFocus.mesh ? () => { clearMoonFocus(); } : null));
                if (moonFocus.mesh) parts.push(crumb(moonFocus.mesh.userData.moon.cfg.name, null));
            }
        }
    }
    breadcrumbEl.replaceChildren();
    parts.forEach((p, i) => {
        if (i) { const s = el('span', 'crumb-sep', '›'); s.setAttribute('aria-hidden', 'true'); breadcrumbEl.appendChild(s); }
        breadcrumbEl.appendChild(p);
    });
}

// Mantener menú y migas al día cuando cambia el astro o la luna enfocada.
const _switchTarget = switchTarget;
switchTarget = function (id) {
    if (cosmos.active) {
        // salir del universo si se elige un astro
        const view = cosmos.views[cosmos.mode];
        if (view && view.stop) view.stop();
        cosmos.scene.clear();
        cosmos.active = false;
        cosmos.mode = null;
        cosmos.controls.enabled = false; controls.enabled = true;
        document.body.classList.remove('cosmos-mode'); delete document.body.dataset.cosmos;
        cosmosDom.panel.hidden = true;
    }
    _switchTarget(id);
    navState.expanded.clear(); // solo queda abierto el planeta actual
    syncNav();
    updateBreadcrumb();
};
const _focusMoon = focusMoon;
focusMoon = function (mesh) { _focusMoon(mesh); syncNav(); updateBreadcrumb(); };
const _clearMoonFocus = clearMoonFocus;
clearMoonFocus = function () { _clearMoonFocus(); syncNav(); updateBreadcrumb(); };
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && navState.mobileOpen) { closeMobileNav(); renderNav(); } });
renderNav();
