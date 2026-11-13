const dom = {
    descentSlider: document.getElementById('descent-slider'),
    descentPercentage: document.getElementById('descent-percentage'),
    metricRs: document.getElementById('metric-rs'),
    metricGamma: document.getElementById('metric-gamma'),
    metricRedshift: document.getElementById('metric-redshift'),
    metricTidal: document.getElementById('metric-tidal'),
    unitDistLabel: document.getElementById('unit-dist-label'),
    gravityMetricLabel: document.getElementById('gravity-metric-label'),
    comparisonPill: document.getElementById('comparison-pill'),
    timeOffsetReadout: document.getElementById('time-offset-readout'),
    rsRealBadge: document.getElementById('rs-real-badge'),
    soundscapeReadout: document.getElementById('soundscape-readout'),
    targetLockText: document.getElementById('target-lock-text'),
    dopplerStatus: document.getElementById('doppler-status'),
    dopplerMarker: document.getElementById('doppler-marker'),
    zoneBadge: document.getElementById('zone-badge'),
    velocityReadout: document.getElementById('velocity-readout'),
    storyCard: document.getElementById('story-card'),
    storyTitle: document.getElementById('story-title'),
    storyDesc: document.getElementById('story-desc'),
    alarmOverlay: document.getElementById('alarm-overlay'),
    statusPanel: document.getElementById('status-panel'),
    systemBadge: document.getElementById('system-badge'),
    telemetryPanel: document.getElementById('telemetry-panel'),
    gyroValue: document.getElementById('gyro-value'),
    m1Val: document.getElementById('m1-val'), m1Lbl: document.getElementById('m1-lbl'),
    m2Val: document.getElementById('m2-val'), m2Lbl: document.getElementById('m2-lbl'),
    m3Val: document.getElementById('m3-val'), m3Lbl: document.getElementById('m3-lbl'),
    m4Val: document.getElementById('m4-val'), m4Lbl: document.getElementById('m4-lbl'),
    modalSpaghetti: document.getElementById('modal-spaghetti'),
    modalLaser: document.getElementById('modal-laser'),
    modalCompare: document.getElementById('modal-compare'),
    bhMassSlider: document.getElementById('bh-mass-slider'),
    bhMassLabel: document.getElementById('bh-mass-label'),
    spaghettiRs: document.getElementById('spaghetti-rs'),
    spaghettiDeltag: document.getElementById('spaghetti-deltag'),
    astronautWrapper: document.getElementById('astronaut-wrapper'),
    spaghettiStatusTag: document.getElementById('spaghetti-status-tag'),
    laserSubtitle: document.getElementById('laser-subtitle'),
    laserRs: document.getElementById('laser-rs'),
    laserZ: document.getElementById('laser-z'),
    laserFreq: document.getElementById('laser-freq'),
    compareTableBody: document.getElementById('compare-table-body'),
    modalNasa: document.getElementById('modal-nasa'),
    nasaApiStatus: document.getElementById('nasa-api-status'),
    nasaWidgetImg: document.getElementById('nasa-widget-img'),
    nasaWidgetCenter: document.getElementById('nasa-widget-center'),
    nasaWidgetDate: document.getElementById('nasa-widget-date'),
    nasaWidgetTitle: document.getElementById('nasa-widget-title'),
    nasaWidgetDesc: document.getElementById('nasa-widget-desc'),
    nasaModalMainImg: document.getElementById('nasa-modal-main-img'),
    nasaModalCenter: document.getElementById('nasa-modal-center'),
    nasaModalDate: document.getElementById('nasa-modal-date'),
    nasaModalTitle: document.getElementById('nasa-modal-title'),
    nasaModalDesc: document.getElementById('nasa-modal-desc'),
    nasaModalThumbs: document.getElementById('nasa-modal-thumbs'),
    modalNasaSubtitle: document.getElementById('modal-nasa-subtitle')
};

const nasaCache = {};

async function fetchNasaMissionTelemetry(targetId, forceRefresh = false) {
    const cfg = ASTRO_TARGETS[targetId];
    if (!cfg) return;

    dom.modalNasaSubtitle.textContent = `OBJETIVO ACTIVO: ${cfg.name} · QUERY: "${cfg.nasaQuery}"`;

    if (!forceRefresh && nasaCache[targetId] && nasaCache[targetId].length > 0) {
        renderNasaTelemetryItems(nasaCache[targetId]);
        return;
    }

    dom.nasaApiStatus.textContent = 'NASA API: SYNCING...';
    dom.nasaWidgetTitle.textContent = `Consultando NASA (${cfg.name.split(' ')[0]})...`;

    try {
        const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(cfg.nasaQuery)}&media_type=image`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('NASA API status ' + response.status);
        const json = await response.json();
        const rawItems = (json.collection && json.collection.items) ? json.collection.items : [];

        const parsed = rawItems
            .filter(item => item.links && item.links[0] && item.links[0].href && item.data && item.data[0])
            .slice(0, 6)
            .map(item => {
                const d = item.data[0];
                return {
                    imgUrl: item.links[0].href,
                    title: d.title || cfg.name,
                    desc: d.description || cfg.summary,
                    center: d.center || 'NASA / JPL',
                    nasaId: d.nasa_id || 'NASA-ARCHIVE',
                    date: d.date_created ? d.date_created.substring(0, 10) : 'Misión Oficial'
                };
            });

        if (parsed.length > 0) {
            nasaCache[targetId] = parsed;
            dom.nasaApiStatus.textContent = 'NASA API: ONLINE';
            renderNasaTelemetryItems(parsed);
        } else {
            throw new Error('Sin resultados');
        }
    } catch (err) {
        dom.nasaApiStatus.textContent = 'NASA API: LOCAL CACHE';
        const fallbackItem = [{
            imgUrl: (cfg.id === 'io' ? null : cfg.textureUrl) || `https://placehold.co/800x500/05050e/00f0ff?text=${encodeURIComponent(cfg.name)}`,
            title: `${cfg.name} — Telemetría de Misión Espacial`,
            desc: `${cfg.summary} Radio real: ${cfg.realRadiusText} | Radio de Schwarzschild: ${cfg.rsRealText}.`,
            center: 'NASA / JPL-Caltech',
            nasaId: `MISSION-${targetId.toUpperCase()}`,
            date: 'Archivo Histórico'
        }];
        renderNasaTelemetryItems(fallbackItem);
    }
}

function selectNasaItem(item) {
    dom.nasaWidgetImg.src = item.imgUrl;
    dom.nasaWidgetCenter.textContent = `NASA / ${item.center}`;
    if (dom.nasaWidgetDate) dom.nasaWidgetDate.textContent = item.date;
    if (dom.nasaWidgetTitle) dom.nasaWidgetTitle.textContent = item.title;
    if (dom.nasaWidgetDesc) dom.nasaWidgetDesc.textContent = item.desc;
    if (dom.nasaModalMainImg) dom.nasaModalMainImg.src = item.imgUrl;
    dom.nasaModalCenter.textContent = `CENTRO: ${item.center}`;
    dom.nasaModalDate.textContent = item.date;
    dom.nasaModalTitle.textContent = item.title;
    dom.nasaModalDesc.textContent = item.desc;

    const closeupImg = document.getElementById('closeup-real-img');
    const closeupTitle = document.getElementById('closeup-real-title');
    if (closeupImg) closeupImg.src = item.imgUrl;
    if (closeupTitle) closeupTitle.textContent = item.title;
}

function renderNasaTelemetryItems(items) {
    if (!items || items.length === 0) return;
    selectNasaItem(items[0]);

    dom.nasaModalThumbs.innerHTML = '';
    items.forEach((item, index) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `relative h-14 rounded-lg overflow-hidden border transition-all ${index === 0 ? 'border-singularity-emerald ring-2 ring-singularity-emerald/50' : 'border-white/15 opacity-75 hover:opacity-100'}`;
        btn.innerHTML = `<img src="${item.imgUrl}" alt="${item.title.replace(/"/g, '')}" class="w-full h-full object-cover">`;
        btn.addEventListener('click', () => {
            audioEngine.playClickTone(880, 0.04);
            selectNasaItem(item);
            Array.from(dom.nasaModalThumbs.children).forEach(c => {
                c.className = 'relative h-14 rounded-lg overflow-hidden border border-white/15 opacity-75 hover:opacity-100 transition-all';
            });
            btn.className = 'relative h-14 rounded-lg overflow-hidden border border-singularity-emerald ring-2 ring-singularity-emerald/50 transition-all';
        });
        dom.nasaModalThumbs.appendChild(btn);
    });
}

function populateCompareTable() {
    dom.compareTableBody.innerHTML = '';
    Object.values(ASTRO_TARGETS).forEach(cfg => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-singularity-cyan/10 cursor-pointer transition-colors';
        tr.innerHTML = `
            <td class="py-2 px-2 font-bold ${cfg.colorClass}">${cfg.name}</td>
            <td class="py-2 px-2">${cfg.realRadiusText}</td>
            <td class="py-2 px-2 text-singularity-cyan">${cfg.rsRealText}</td>
            <td class="py-2 px-2">${cfg.id === 'gargantua' || cfg.id === 'pulsar' ? 'ΔG Marea Letal' : cfg.surfaceG + ' G'}</td>
            <td class="py-2 px-2 text-singularity-amber">${cfg.timeDriftText}</td>
            <td class="py-2 px-2 text-[11px] text-slate-300">${cfg.summary}</td>
        `;
        tr.addEventListener('click', () => {
            audioEngine.playClickTone(880, 0.05);
            switchTarget(cfg.id);
            dom.modalCompare.classList.add('hidden');
            dom.modalCompare.classList.remove('flex');
        });
        dom.compareTableBody.appendChild(tr);
    });
}
populateCompareTable();
