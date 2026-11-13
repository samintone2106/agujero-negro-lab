/* -------------------------------------------------------------------------- */
/* UNIVERSO: VÍA LÁCTEA, VECINDARIO ESTELAR Y ORIGEN (ESCENAS APARTE)          */
/* -------------------------------------------------------------------------- */
const cosmos = {
    active: false, mode: null,
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(55, 1, 0.1, 400000),
    views: {}, built: {}
};
cosmos.controls = new THREE.OrbitControls(cosmos.camera, renderer.domElement);
cosmos.controls.enabled = false;
cosmos.controls.enableDamping = true;
cosmos.controls.dampingFactor = 0.07;

const cosmosDom = {
    panel: document.getElementById('cosmos-panel'),
    kicker: document.getElementById('cosmos-kicker'),
    title: document.getElementById('cosmos-title'),
    text: document.getElementById('cosmos-text'),
    actions: document.getElementById('cosmos-actions')
};

function cosmosInfo(kicker, title, text, actions = []) {
    cosmosDom.kicker.textContent = kicker;
    cosmosDom.title.textContent = title;
    cosmosDom.text.textContent = text;
    cosmosDom.actions.replaceChildren(...actions.map(([label, fn]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'lens-mode-btn';
        b.textContent = label;
        b.addEventListener('click', () => { audioEngine.playClickTone(820, 0.05); fn(); });
        return b;
    }));
    cosmosDom.panel.hidden = false;
}

function enterCosmos(mode) {
    const view = cosmos.views[mode];
    if (!view) return;
    if (typeof genesis !== 'undefined' && genesis.active) stopGenesis(true);
    if (typeof surface !== 'undefined' && surface.active) { surface.active = false; document.body.classList.remove('surface-mode'); surfaceDom.hud.hidden = true; }
    if (cosmos.active && cosmos.views[cosmos.mode].stop) cosmos.views[cosmos.mode].stop();
    cosmos.scene.clear();
    cosmos.active = true;
    cosmos.mode = mode;
    controls.enabled = false;
    cosmos.controls.enabled = true;
    document.body.classList.add('cosmos-mode');
    document.body.dataset.cosmos = mode;
    cosmosDom.panel.hidden = true;
    view.start();
    if (typeof updateBreadcrumb === 'function') updateBreadcrumb();
    if (typeof syncNav === 'function') syncNav();
}

function exitCosmos(targetId = state.currentTarget) {
    if (!cosmos.active) return;
    const view = cosmos.views[cosmos.mode];
    if (view.stop) view.stop();
    cosmos.scene.clear();
    cosmos.active = false;
    cosmos.mode = null;
    cosmos.controls.enabled = false;
    controls.enabled = true;
    document.body.classList.remove('cosmos-mode');
    delete document.body.dataset.cosmos;
    cosmosDom.panel.hidden = true;
    switchTarget(targetId);
    if (typeof updateBreadcrumb === 'function') updateBreadcrumb();
}

function updateCosmos(dt, time) {
    const size = renderer.getSize(new THREE.Vector2());
    if (cosmos.camera.aspect !== size.x / size.y) { cosmos.camera.aspect = size.x / size.y; cosmos.camera.updateProjectionMatrix(); }
    const view = cosmos.views[cosmos.mode];
    if (view.update) view.update(dt, time);
    if (cosmos.controls.enabled) cosmos.controls.update();
}

// Selección de marcadores por cercanía en pantalla (son puntos pequeños).
function pickMarker(markers, e, maxDist = 0.05) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1, y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    let best = null, bd = maxDist;
    const v = new THREE.Vector3();
    markers.forEach(m => {
        m.obj.getWorldPosition(v).project(cosmos.camera);
        if (v.z > 1) return;
        const d = Math.hypot(v.x - x, (v.y - y) / cosmos.camera.aspect);
        if (d < bd) { bd = d; best = m; }
    });
    return best;
}
let cosmosDown = null;
renderer.domElement.addEventListener('pointerdown', (e) => { if (cosmos.active) cosmosDown = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => {
    if (!cosmos.active || !cosmosDown) return;
    const moved = Math.hypot(e.clientX - cosmosDown.x, e.clientY - cosmosDown.y);
    cosmosDown = null;
    const view = cosmos.views[cosmos.mode];
    if (moved < 6 && view.markers) {
        const m = pickMarker(view.markers, e);
        if (m) m.select();
    }
});
document.getElementById('cosmos-close')?.addEventListener('click', () => { cosmosDom.panel.hidden = true; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && cosmos.active && !document.body.dataset.cosmos.startsWith('origin')) cosmosDom.panel.hidden = true; });

/* ============================== VÍA LÁCTEA ============================== */
// 1 unidad = 100 años luz. Disco de ~100,000 años luz; el Sol a ~26,000 del centro,
// en el brazo de Orión, entre los brazos de Sagitario y Perseo.
const GAL_SUN = new THREE.Vector3(-260, 0, 0); // +x apunta al centro galáctico
function galFromSun(lDeg, distLy) {
    const l = THREE.MathUtils.degToRad(lDeg);
    return GAL_SUN.clone().add(new THREE.Vector3(Math.cos(l), 0, Math.sin(l)).multiplyScalar(distLy / 100));
}

function buildGalaxy() {
    const N = 150000;
    const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
    const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    const b = Math.tan(THREE.MathUtils.degToRad(14)); // ángulo de paso de los brazos (12–14° medidos)
    const arms = [{ a: 0, w: 1 }, { a: Math.PI, w: 1 }, { a: Math.PI / 2, w: 0.55 }, { a: Math.PI * 1.5, w: 0.55 }]; // Escudo-Centauro, Perseo, Norma, Sagitario
    const barAngle = THREE.MathUtils.degToRad(28);
    let i = 0;
    const put = (x, y, z, c, s) => { pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; col[i * 3] = c[0]; col[i * 3 + 1] = c[1]; col[i * 3 + 2] = c[2]; size[i] = s; i++; };
    // bulbo: estrellas viejas, amarillo-naranja
    for (let k = 0; k < 22000; k++) { const r = Math.abs(gauss()) * 32; const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
        put(r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.6, r * Math.sin(ph) * Math.sin(th), [1, 0.78, 0.5], 2.2); }
    // barra central (~27° respecto de la línea Sol-centro)
    for (let k = 0; k < 16000; k++) { const t = gauss() * 70, w = gauss() * 14;
        put(Math.cos(barAngle) * t - Math.sin(barAngle) * w, gauss() * 6, Math.sin(barAngle) * t + Math.cos(barAngle) * w, [1, 0.82, 0.55], 2); }
    // brazos espirales: estrellas jóvenes azuladas y regiones de formación (rosa)
    for (let k = 0; k < 100000; k++) {
        const arm = arms[k % 4];
        if (Math.random() > arm.w) continue;
        const r = 60 + Math.pow(Math.random(), 0.8) * 430;
        const th = Math.log(r / 60) / b;
        const spread = 3 + r * 0.022;
        const ang = arm.a + th + gauss() * 0.06;
        const x = Math.cos(ang) * r + gauss() * spread, z = Math.sin(ang) * r + gauss() * spread;
        const hii = Math.random() < 0.035;
        put(x, gauss() * 3, z, hii ? [1, 0.42, 0.62] : (Math.random() < 0.7 ? [0.62, 0.74, 1] : [0.95, 0.92, 0.85]), hii ? 3.6 : 2.1);
    }
    // brazo (espolón) de Orión, donde vive el Sol
    for (let k = 0; k < 5000; k++) { const t = gauss() * 45, w = gauss() * 7;
        put(GAL_SUN.x + w, gauss() * 2.5, GAL_SUN.z + t, [0.75, 0.82, 1], 1.5); }
    // disco difuso
    while (i < N) { const r = Math.abs(gauss()) * 220 + 20, th = Math.random() * Math.PI * 2;
        put(Math.cos(th) * r, gauss() * 4, Math.sin(th) * r, [0.5, 0.48, 0.46], 0.9); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    const pts = new THREE.Points(g, new THREE.ShaderMaterial({
        uniforms: { uOpacity: { value: 0.55 } },
        vertexShader: `
            attribute float aSize; attribute vec3 aColor; varying vec3 vColor;
            void main() { vColor = aColor; vec4 mv = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = clamp(aSize * 260.0 / -mv.z, 0.6, 7.0); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: STAR_POINT_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    pts.frustumCulled = false;
    const group = new THREE.Group();
    group.add(pts);
    // brillo del núcleo
    const core = makeGlowSprite(0xffd9a0, 260, 0.55); group.add(core);
    return group;
}

const GALAXY_MARKERS = [
    { name: 'SOL', pos: () => GAL_SUN, title: 'El Sol', kicker: 'BRAZO DE ORIÓN · 26,000 AÑOS LUZ DEL CENTRO',
      text: 'Nuestra estrella da una vuelta a la galaxia cada ~230 millones de años, a unos 230 km/s. La última vez que estuvo aquí, empezaban los dinosaurios.',
      actions: [['ENTRAR AL SISTEMA SOLAR', () => exitCosmos('sun')], ['ESTRELLAS CERCANAS', () => enterCosmos('neighborhood')]] },
    { name: 'SGR A*', pos: () => new THREE.Vector3(0, 0, 0), title: 'Sagitario A*', kicker: 'CENTRO DE LA VÍA LÁCTEA',
      text: 'Un agujero negro de 4.3 millones de soles. El Event Horizon Telescope publicó su imagen en 2022; el Nobel de Física 2020 premió el seguimiento de las estrellas que lo orbitan.',
      actions: [['VER UN AGUJERO NEGRO', () => exitCosmos('gargantua')]] },
    { name: 'PÚLSAR VELA', pos: () => galFromSun(263.6, 950), title: 'Púlsar de Vela', kicker: '~950 AÑOS LUZ',
      text: 'Los restos de una supernova de hace ~11,000 años: una estrella de neutrones que gira 11 veces por segundo.',
      actions: [['VISITARLO', () => exitCosmos('pulsar')]] },
    { name: 'NEBULOSA DE ORIÓN', pos: () => galFromSun(209, 1344), title: 'Nebulosa de Orión', kicker: '~1,344 AÑOS LUZ',
      text: 'La fábrica de estrellas más cercana: allí nacen hoy estrellas y discos protoplanetarios como el que formó nuestro Sistema Solar.' },
    { name: 'PILARES DE LA CREACIÓN', pos: () => galFromSun(17, 6500), title: 'Pilares de la Creación (M16)', kicker: '~6,500 AÑOS LUZ',
      text: 'Columnas de gas y polvo de varios años luz de alto donde se forman estrellas; famosas por las fotos de Hubble (1995) y Webb (2022).' },
    { name: 'NEBULOSA DE CARINA', pos: () => galFromSun(287.6, 8500), title: 'Nebulosa de Carina', kicker: '~8,500 AÑOS LUZ',
      text: 'Una de las mayores regiones de formación estelar; allí está Eta Carinae, una estrella gigante que podría explotar.' },
    { name: 'NEBULOSA DEL CANGREJO', pos: () => galFromSun(184.6, 6500), title: 'Nebulosa del Cangrejo', kicker: '~6,500 AÑOS LUZ',
      text: 'Restos de una supernova vista por astrónomos chinos en el año 1054: fue visible de día durante semanas.' }
];

cosmos.views.galaxy = {
    start() {
        if (!cosmos.built.galaxy) {
            const root = new THREE.Group();
            const gal = buildGalaxy();
            root.add(gal);
            const markers = GALAXY_MARKERS.map(m => {
                const obj = new THREE.Object3D();
                obj.position.copy(m.pos());
                const dot = makeGlowSprite(m.name === 'SOL' ? 0xfff1b0 : 0x7df9ff, m.name === 'SGR A*' ? 30 : 14, 0.95);
                obj.add(dot);
                const label = makeMoonLabel(m.name);
                obj.add(label);
                root.add(obj);
                return { obj, label, always: m.name === 'SOL' || m.name === 'SGR A*', select: () => cosmosInfo(m.kicker, m.title, m.text, m.actions || []) };
            });
            cosmos.built.galaxy = { root, gal, markers };
        }
        const b = cosmos.built.galaxy;
        this.markers = b.markers;
        cosmos.scene.add(b.root);
        cosmos.scene.fog = null;
        cosmos.camera.position.set(-520, 520, 620);
        cosmos.controls.target.set(-60, 0, 0);
        cosmos.controls.minDistance = 25;
        cosmos.controls.maxDistance = 2600;
        cosmosInfo('ESCALA: 100,000 AÑOS LUZ', 'La Vía Láctea',
            'Una galaxia espiral barrada con 100,000–400,000 millones de estrellas. Toca un punto azul para saber qué es; el amarillo es el Sol.',
            [['IR AL SOL', () => {
                const sun = cosmos.built.galaxy.markers[0].obj.getWorldPosition(new THREE.Vector3());
                cosmos.controls.target.copy(sun); cosmos.camera.position.copy(sun).add(new THREE.Vector3(-60, 70, 90));
            }]]);
    },
    update(dt) {
        // la galaxia gira en sentido horario vista desde el norte (muy acelerado)
        cosmos.built.galaxy.root.rotation.y -= dt * 0.01; // los marcadores giran con sus brazos
        // las etiquetas cercanas al Sol solo aparecen al acercarse (si no, se enciman)
        cosmos.built.galaxy.markers.forEach(m => {
            m.label.visible = m.always || cosmos.camera.position.distanceTo(m.obj.position) < 260;
        });
    }
};

/* ============================== VECINDARIO ESTELAR ============================== */
// Estrellas visibles a simple vista a menos de 1,000 años luz, en su posición 3D real
// (1 unidad = 1 año luz). Las constelaciones son una ilusión: sus estrellas están a distancias muy distintas.
cosmos.views.neighborhood = {
    start() {
        const go = (cat) => {
            if (!cosmos.active || cosmos.mode !== 'neighborhood') return; // se cambió de vista mientras cargaba
            if (!cosmos.built.neighborhood) {
                const root = new THREE.Group();
                const near = cat.stars.filter(s => s[4] > 0 && s[4] * LY_PER_PC <= 1000);
                root.add(buildStarPoints(near, { lyScale: 1, sizeMul: 1.3 }));
                const sun = new THREE.Object3D();
                sun.add(makeGlowSprite(0xfff1b0, 6, 1)); sun.add(makeMoonLabel('SOL'));
                root.add(sun);
                const markers = [{ obj: sun, select: () => cosmosInfo('TU ESTRELLA', 'El Sol', 'Desde aquí todas las demás estrellas se ven como en el cielo nocturno. Gira la vista: verás las constelaciones deformarse.', [['ENTRAR AL SISTEMA SOLAR', () => exitCosmos('sun')]]) }];
                cat.famous.forEach(f => {
                    if (!(f.star[4] > 0) || f.star[4] * LY_PER_PC > 3000) return;
                    const obj = new THREE.Object3D();
                    raDecToDir(f.star[0], f.star[1], obj.position).multiplyScalar(f.star[4] * LY_PER_PC);
                    obj.add(makeMoonLabel(f.es.toUpperCase()));
                    root.add(obj);
                    const ly = Math.round(f.star[4] * LY_PER_PC);
                    markers.push({ obj, select: () => cosmosInfo(`${ly.toLocaleString('es-CO')} AÑOS LUZ · MAGNITUD ${f.star[2]}`, f.es, f.fact) });
                });
                cosmos.built.neighborhood = { root, markers, count: near.length };
            }
            const b = cosmos.built.neighborhood;
            this.markers = b.markers;
            cosmos.scene.add(b.root);
            cosmosInfo('ESCALA: 1,000 AÑOS LUZ', 'Nuestro vecindario',
                `${b.count.toLocaleString('es-CO')} estrellas reales en su posición 3D (catálogo HYG). Betelgeuse y Rigel parecen vecinas en Orión, pero una está a ~550 años luz y la otra a ~860. Toca un nombre.`,
                [['VOLVER A LA GALAXIA', () => enterCosmos('galaxy')]]);
        };
        cosmos.camera.position.set(0, 60, 160);
        cosmos.controls.target.set(0, 0, 0);
        cosmos.controls.minDistance = 2;
        cosmos.controls.maxDistance = 2500;
        if (starCatalog.ready) go(starCatalog);
        else {
            cosmosInfo('CARGANDO', 'Nuestro vecindario', 'Cargando el catálogo de estrellas…');
            loadStarCatalog().then(go).catch(() => cosmosInfo('SIN DATOS', 'Nuestro vecindario', 'No se pudo cargar el catálogo de estrellas (abre el simulador desde un servidor local).', [['VOLVER', () => enterCosmos('galaxy')]]));
        }
    }
};
