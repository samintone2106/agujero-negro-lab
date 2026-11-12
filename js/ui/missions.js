/* -------------------------------------------------------------------------- */
/* CATÁLOGO DE MISIONES (MODAL) Y EVIDENCIA REAL EN EL GÉNESIS                 */
/* -------------------------------------------------------------------------- */
const missionsDom = {
    modal: document.getElementById('modal-missions'),
    title: document.getElementById('missions-title-text'),
    subtitle: document.getElementById('missions-subtitle'),
    filters: document.getElementById('missions-filters'),
    list: document.getElementById('missions-list')
};
const MISSION_STATUS = {
    activa: ['ACTIVA', 'is-active'],
    'en ruta': ['EN RUTA', 'is-route'],
    futura: ['FUTURA', 'is-future'],
    finalizada: ['COMPLETADA', 'is-done'],
    hito: ['HITO', 'is-done']
};
const missionPhotoCache = {};
const missionsUi = { target: null, filter: 'all', returnFocus: null };

function astroShortName(id) {
    return ASTRO_TARGETS[id].name.split(' (')[0];
}

function openMissions(targetId = state.currentTarget, highlight = null) {
    missionsUi.target = targetId;
    missionsUi.filter = 'all';
    missionsUi.returnFocus = document.activeElement;
    renderMissions(highlight);
    missionsDom.modal.classList.remove('hidden');
    missionsDom.modal.classList.add('flex');
    const first = missionsDom.filters.querySelector('button');
    if (first) first.focus();
}

function closeMissions() {
    if (missionsDom.modal.classList.contains('hidden')) return;
    missionsDom.modal.classList.add('hidden');
    missionsDom.modal.classList.remove('flex');
    if (missionsUi.returnFocus && missionsUi.returnFocus.focus) missionsUi.returnFocus.focus();
}

function renderMissions(highlight) {
    const id = missionsUi.target;
    const list = MISSIONS[id] || [];
    missionsDom.title.textContent = `Misiones · ${astroShortName(id)}`;
    const active = list.filter(m => m[4] === 'activa' || m[4] === 'en ruta').length;
    missionsDom.subtitle.textContent = `${list.length} MISIONES REALES` + (active ? ` · ${active} ACTIVAS O EN CAMINO` : '');

    // filtros solo con los tipos que existen para este astro
    const types = [...new Set(list.map(m => m[3]))];
    missionsDom.filters.replaceChildren();
    [['all', 'TODAS'], ...types.map(t => [t, MISSION_TYPES[t].toUpperCase()])].forEach(([key, label]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'mission-filter';
        b.textContent = label;
        b.setAttribute('aria-pressed', String(missionsUi.filter === key));
        b.addEventListener('click', () => {
            audioEngine.playClickTone(760, 0.04);
            missionsUi.filter = key;
            missionsDom.filters.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
            renderMissionList();
        });
        missionsDom.filters.appendChild(b);
    });
    renderMissionList(highlight);
}

function renderMissionList(highlight = null) {
    const list = (MISSIONS[missionsUi.target] || []).filter(m => missionsUi.filter === 'all' || m[3] === missionsUi.filter);
    missionsDom.list.replaceChildren();
    if (list.length === 0) {
        const li = document.createElement('li');
        li.className = 'text-xs text-slate-400 py-6 text-center';
        li.textContent = 'No hay misiones de este tipo para este astro.';
        missionsDom.list.appendChild(li);
        return;
    }
    let highlighted = null;
    list.forEach(([year, name, agency, type, status, text, query]) => {
        const li = document.createElement('li');
        li.className = 'mission-card';
        if (highlight && name === highlight) { li.classList.add('is-highlight'); highlighted = li; }

        const yearEl = document.createElement('div');
        yearEl.className = 'mission-year';
        yearEl.textContent = year;

        const body = document.createElement('div');
        body.className = 'min-w-0';
        const head = document.createElement('div');
        head.className = 'flex flex-wrap items-center gap-x-2 gap-y-1';
        const h = document.createElement('h4');
        h.className = 'text-sm font-bold text-white';
        h.textContent = name;
        const [statusLabel, statusClass] = MISSION_STATUS[status] || [status.toUpperCase(), 'is-done'];
        const st = document.createElement('span');
        st.className = `mission-status ${statusClass}`;
        st.textContent = statusLabel;
        head.append(h, st);

        const meta = document.createElement('div');
        meta.className = 'font-mono text-[9px] text-slate-400 mt-0.5';
        meta.textContent = `${agency} · ${MISSION_TYPES[type]}`;

        const p = document.createElement('p');
        p.className = 'text-[11px] sm:text-xs text-slate-300 leading-snug mt-1';
        p.textContent = text;
        body.append(head, meta, p);

        if (query) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'mission-photos-btn';
            btn.textContent = 'FOTOS NASA';
            btn.setAttribute('aria-expanded', 'false');
            const gallery = document.createElement('div');
            gallery.className = 'mission-gallery';
            gallery.hidden = true;
            btn.addEventListener('click', () => {
                const open = gallery.hidden;
                gallery.hidden = !open;
                btn.setAttribute('aria-expanded', String(open));
                btn.textContent = open ? 'OCULTAR FOTOS' : 'FOTOS NASA';
                if (open) loadMissionPhotos(query, gallery);
            });
            body.append(btn, gallery);
        }
        li.append(yearEl, body);
        missionsDom.list.appendChild(li);
    });
    if (highlighted) requestAnimationFrame(() => highlighted.scrollIntoView({ block: 'nearest' }));
}

function setGalleryMessage(gallery, text) {
    gallery.replaceChildren();
    const msg = document.createElement('p');
    msg.className = 'col-span-full font-mono text-[10px] text-slate-400 py-2';
    msg.textContent = text;
    gallery.appendChild(msg);
}

async function loadMissionPhotos(query, gallery) {
    if (gallery.dataset.loaded === '1') return;
    setGalleryMessage(gallery, 'Buscando en el archivo de la NASA…');
    try {
        let items = missionPhotoCache[query];
        if (!items) {
            const res = await fetch(`https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image`);
            if (!res.ok) throw new Error('NASA API ' + res.status);
            const json = await res.json();
            items = ((json.collection && json.collection.items) || [])
                .filter(it => it.links && it.links[0] && it.links[0].href && it.data && it.data[0])
                .slice(0, 6)
                .map(it => ({ src: it.links[0].href, title: it.data[0].title || query, date: (it.data[0].date_created || '').slice(0, 10) }));
            missionPhotoCache[query] = items;
        }
        if (items.length === 0) { setGalleryMessage(gallery, 'La NASA no tiene fotos para esta búsqueda.'); return; }
        gallery.replaceChildren();
        items.forEach(it => {
            const a = document.createElement('a');
            a.href = it.src;
            a.target = '_blank';
            a.rel = 'noopener';
            a.className = 'mission-thumb';
            a.title = `${it.title}${it.date ? ' · ' + it.date : ''}`;
            const img = document.createElement('img');
            img.src = it.src;
            img.alt = it.title;
            img.loading = 'lazy';
            a.appendChild(img);
            gallery.appendChild(a);
        });
        gallery.dataset.loaded = '1';
    } catch (err) {
        setGalleryMessage(gallery, 'Sin conexión con la NASA ahora mismo. Inténtalo de nuevo más tarde.');
    }
}

document.querySelectorAll('[data-open-missions]').forEach(btn => {
    btn.addEventListener('click', () => {
        audioEngine.playClickTone(900, 0.05);
        if (!dom.modalNasa.classList.contains('hidden')) {
            dom.modalNasa.classList.add('hidden');
            dom.modalNasa.classList.remove('flex');
        }
        openMissions();
    });
});
missionsDom.modal.addEventListener('click', (e) => { if (e.target === missionsDom.modal) closeMissions(); });
missionsDom.modal.querySelector('[data-close-modal]')?.addEventListener('click', () => {
    if (missionsUi.returnFocus && missionsUi.returnFocus.focus) missionsUi.returnFocus.focus();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMissions(); });

/* --------------------- evidencia real dentro del Génesis --------------------- */
const genesisProofDom = {
    box: document.getElementById('genesis-proof'),
    text: document.getElementById('genesis-proof-text'),
    btn: document.getElementById('genesis-proof-btn')
};
// Se muestra en la última fase: "así sabemos que esto pasó".
function updateGenesisProof(targetId, phase) {
    const proof = GENESIS_PROOF[targetId];
    const show = !!proof && phase >= GENESIS_PHASES - 2;
    genesisProofDom.box.hidden = !show;
    if (!show) return;
    genesisProofDom.text.textContent = proof[0];
    genesisProofDom.btn.textContent = `Ver misión ${proof[1]} →`;
    genesisProofDom.btn.onclick = () => {
        if (genesis.active && !genesis.paused) toggleGenesisPause();
        openMissions(targetId, proof[1]);
    };
}
