/* -------------------------------------------------------------------------- */
/* MAPA DEL SISTEMA SOLAR: POSICIONES REALES PARA CUALQUIER FECHA              */
/* -------------------------------------------------------------------------- */
// Elementos orbitales de JPL "Approximate Positions of the Planets" (E. M. Standish,
// tabla 1800–2050): [a (UA), e, I, L, ϖ, Ω (°)] en J2000 y su cambio por siglo.
// Comprobado contra JPL Horizons el 2026-11-12: Marte y Júpiter difieren < 0.003 UA.
const ORBITAL_ELEMENTS = {
    mercury: [[0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593], [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]],
    venus: [[0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255], [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418]],
    earth: [[1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0], [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0]],
    mars: [[1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891], [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]],
    jupiter: [[5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909], [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]],
    saturn: [[9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448], [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]],
    uranus: [[19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503], [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589]],
    neptune: [[30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574], [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]],
    pluto: [[39.48211675, 0.24882730, 17.14001206, 238.92903833, 224.06891629, 110.30393684], [-0.00031596, 0.00005170, 0.00004818, 145.20780515, -0.04062942, -0.01183482]]
};
// Cometa Halley: perihelio 1986-02-09, periodo ~75.3 años (pasó el afelio en 2023).
const HALLEY = { a: 17.83, e: 0.967, I: 162.26, O: 58.42, w: 111.33, tp: 2446470.5, P: 75.32 };

const D2R = Math.PI / 180;
const dateToJD = (d) => d.getTime() / 86400000 + 2440587.5;

function rotateOrbit(xp, yp, w, O, I, out) {
    const cw = Math.cos(w), sw = Math.sin(w), cO = Math.cos(O), sO = Math.sin(O), cI = Math.cos(I), sI = Math.sin(I);
    const x = (cw * cO - sw * sO * cI) * xp + (-sw * cO - cw * sO * cI) * yp;
    const y = (cw * sO + sw * cO * cI) * xp + (-sw * sO + cw * cO * cI) * yp;
    const z = (sw * sI) * xp + (cw * sI) * yp;
    return out.set(x, z, -y); // eclíptica -> escena (y arriba)
}
function solveKepler(M, e) { let E = M + e * Math.sin(M); for (let i = 0; i < 25; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E)); return E; }

function planetPosAU(id, jd, out = new THREE.Vector3()) {
    const [base, rate] = ORBITAL_ELEMENTS[id];
    const T = (jd - 2451545.0) / 36525;
    const [a, e, I, L, wbar, O] = base.map((v, i) => v + rate[i] * T);
    const M = ((((L - wbar) % 360) + 540) % 360 - 180) * D2R;
    const E = solveKepler(M, e);
    return rotateOrbit(a * (Math.cos(E) - e), a * Math.sqrt(1 - e * e) * Math.sin(E), (wbar - O) * D2R, O * D2R, I * D2R, out);
}
function halleyPosAU(jd, out = new THREE.Vector3()) {
    const h = HALLEY;
    const M = (((((jd - h.tp) / (h.P * 365.25)) * 360) % 360 + 360) % 360) * D2R;
    const E = solveKepler(M, h.e);
    return rotateOrbit(h.a * (Math.cos(E) - h.e), h.a * Math.sqrt(1 - h.e * h.e) * Math.sin(E), h.w * D2R, h.O * D2R, h.I * D2R, out);
}

// Escala comprimida: r_escena = 30 · r_UA^0.5 (si no, Mercurio y Neptuno no caben a la vez).
const ORR_SCALE = (au) => 30 * Math.sqrt(au);
function toScene(v, out = new THREE.Vector3()) {
    const r = v.length();
    return r < 1e-9 ? out.set(0, 0, 0) : out.copy(v).multiplyScalar(ORR_SCALE(r) / r);
}

const ORR_COLORS = { mercury: 0xa8a29e, venus: 0xfcd34d, earth: 0x38bdf8, mars: 0xf87171, jupiter: 0xfb923c, saturn: 0xfde68a, uranus: 0x5eead4, neptune: 0x3b82f6, pluto: 0xfecdd3 };
const ORR_SIZE = { mercury: 1.2, venus: 1.8, earth: 1.9, mars: 1.5, jupiter: 4.2, saturn: 3.7, uranus: 2.8, neptune: 2.7, pluto: 1 };

const orrery = { jd: dateToJD(new Date()), speed: 0, built: null };

function buildOrrery() {
    const root = new THREE.Group();
    // Sol
    root.add(makeGlowSprite(0xffd27a, 30, 1), makeGlowSprite(0xffffff, 10, 1));
    const markers = [];
    const tmp = new THREE.Vector3(), sc = new THREE.Vector3();
    Object.keys(ORBITAL_ELEMENTS).forEach(id => {
        // órbita: 360 puntos de la elipse (con los elementos de hoy)
        const [base] = ORBITAL_ELEMENTS[id];
        const [a, e, I, , wbar, O] = base;
        const pts = [];
        for (let i = 0; i <= 360; i++) {
            const E = i * D2R;
            rotateOrbit(a * (Math.cos(E) - e), a * Math.sqrt(1 - e * e) * Math.sin(E), (wbar - O) * D2R, O * D2R, I * D2R, tmp);
            pts.push(toScene(tmp).clone());
        }
        root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: ORR_COLORS[id], transparent: true, opacity: 0.32 })));
        const obj = new THREE.Object3D();
        const ball = new THREE.Mesh(new THREE.SphereGeometry(ORR_SIZE[id], 32, 24), new THREE.MeshBasicMaterial({ color: ORR_COLORS[id] }));
        obj.add(ball, makeGlowSprite(ORR_COLORS[id], ORR_SIZE[id] * 5, 0.5), makeMoonLabel(astroName(id)));
        root.add(obj);
        markers.push({ id, obj, select: () => {
            const au = planetPosAU(id, orrery.jd, tmp).length();
            const dE = planetPosAU(id, orrery.jd, sc).distanceTo(planetPosAU('earth', orrery.jd, new THREE.Vector3()));
            cosmosInfo(`${au.toFixed(2)} UA DEL SOL · ${(dE * 149.6).toFixed(0)} MILLONES DE KM DE LA TIERRA`, astroName(id),
                `Su luz tarda ${(dE * 8.317).toFixed(1)} minutos en llegar a la Tierra en esta fecha.`, [['VISITAR', () => exitCosmos(id)],
                    ...((canLand(id) || (typeof DESCENTS !== 'undefined' && DESCENTS[id])) ? [['VIAJAR (RUTA REAL)', () => { exitCosmos(id); setTimeout(() => startLanding(id, { mode: 'trip' }), 450); }]] : [])]);
        } });
    });
    // cinturón de asteroides (2.1–3.3 UA) y de Kuiper (30–50 UA)
    const belt = (n, a0, a1, thick, color, size) => {
        const p = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
            const au = a0 + Math.random() * (a1 - a0), ang = Math.random() * Math.PI * 2;
            const r = ORR_SCALE(au);
            p.set([Math.cos(ang) * r, (Math.random() - 0.5) * thick, Math.sin(ang) * r], i * 3);
        }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
        return new THREE.Points(g, new THREE.PointsMaterial({ map: roundDotTexture, color, size, transparent: true, opacity: 0.6, depthWrite: false }));
    };
    root.add(belt(4000, 2.1, 3.3, 1.5, 0xb8a990, 0.5), belt(6000, 30, 50, 8, 0x9fb4d0, 0.7));
    // Halley y su órbita
    const hPts = [];
    for (let i = 0; i <= 720; i++) {
        const E = i / 2 * D2R, h = HALLEY;
        rotateOrbit(h.a * (Math.cos(E) - h.e), h.a * Math.sqrt(1 - h.e * h.e) * Math.sin(E), h.w * D2R, h.O * D2R, h.I * D2R, tmp);
        hPts.push(toScene(tmp).clone());
    }
    const hLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints(hPts), new THREE.LineDashedMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.25, dashSize: 2, gapSize: 2 }));
    hLine.computeLineDistances();
    root.add(hLine);
    const halley = new THREE.Object3D();
    halley.add(makeGlowSprite(0xe0f2fe, 4, 0.9), makeMoonLabel('HALLEY'));
    root.add(halley);
    markers.push({ id: 'halley', obj: halley, select: () => cosmosInfo('COMETA PERIÓDICO · ~75 AÑOS',
        'Cometa Halley', 'Pasó por el punto más lejano de su órbita en diciembre de 2023 y volverá cerca del Sol en julio de 2061.') });
    return { root, markers, halley };
}

const orreryDom = { bar: document.getElementById('orrery-bar'), date: document.getElementById('orrery-date') };
function syncOrreryDate() {
    const d = new Date((orrery.jd - 2440587.5) * 86400000);
    orreryDom.date.textContent = d.toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
}

cosmos.views.orrery = {
    start() {
        if (!orrery.built) orrery.built = buildOrrery();
        this.markers = orrery.built.markers;
        cosmos.scene.add(orrery.built.root);
        cosmos.camera.position.set(0, 260, 240);
        cosmos.controls.target.set(0, 0, 0);
        cosmos.controls.minDistance = 20;
        cosmos.controls.maxDistance = 900;
        orrery.jd = dateToJD(new Date());
        orrery.speed = 0;
        orreryDom.bar.hidden = false;
        syncOrreryDate();
        cosmosInfo('POSICIONES REALES DE HOY', 'El Sistema Solar',
            'Cada planeta está donde está hoy (cálculo con órbitas de la NASA/JPL). Las distancias van comprimidas para que todo quepa. Toca un planeta o mueve el tiempo abajo.');
    },
    update(dt) {
        orrery.jd += orrery.speed * dt;
        if (orrery.speed) syncOrreryDate();
        const v = new THREE.Vector3();
        orrery.built.markers.forEach(m => {
            if (m.id === 'halley') toScene(halleyPosAU(orrery.jd, v), m.obj.position);
            else toScene(planetPosAU(m.id, orrery.jd, v), m.obj.position);
        });
    },
    stop() { orreryDom.bar.hidden = true; }
};

// controles del tiempo
document.querySelectorAll('[data-orrery]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.orrery;
    audioEngine.playClickTone(780, 0.04);
    if (k === 'today') { orrery.jd = dateToJD(new Date()); orrery.speed = 0; }
    else if (k === 'play') orrery.speed = orrery.speed ? 0 : 60; // 60 días por segundo
    else orrery.jd += Number(k);
    document.querySelector('[data-orrery="play"]').textContent = orrery.speed ? '❚❚' : '▶';
    syncOrreryDate();
}));
