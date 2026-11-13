/* -------------------------------------------------------------------------- */
/* NAVEGACIÓN: TRANSFERENCIA DE HOHMANN REAL HACIA CADA DESTINO               */
/* -------------------------------------------------------------------------- */
// La ruta más barata entre dos órbitas: media elipse tangente a ambas.
// Tiempo = ½·√(a³) años (a en UA). Tierra→Marte: a = 1.26 UA → 259 días.
// Se busca la próxima "ventana": el día en que, al llegar, el planeta esté justo ahí.
const VY_MU_SUN = 1.32712440018e11; // km³/s²
const VY_AU = 1.495978707e8;        // km
const VY_PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
const VY_A = { mercury: 0.387, venus: 0.723, earth: 1, mars: 1.524, jupiter: 5.203, saturn: 9.537, uranus: 19.19, neptune: 30.07, pluto: 39.48 };

const voyage = {
    active: false, dest: null, planet: null, onDone: null, frac: 0, dur: 16, rate: 1,
    scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(50, 1, 0.1, 5000), controls: null
};
const vyLonOf = (v) => Math.atan2(-v.z, v.x); // escena (x, y, z) = eclíptica (x, z, -y)
const vyWrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const vyFmtDate = (jd) => new Date((jd - 2440587.5) * 86400000).toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
const vyDays = (d) => d < 60 ? `${Math.round(d)} días` : d < 730 ? `${Math.round(d)} días (${(d / 30.44).toFixed(1)} meses)` : `${(d / 365.25).toFixed(1)} años`;

// Planeta del que depende un destino (lunas -> su planeta).
function vyPlanetFor(id) {
    if (id === 'moon') return 'moon';
    if (id === 'sun') return 'sun';
    if (VY_PLANETS.includes(id)) return id;
    const t = TRAVEL[id];
    return typeof t === 'string' ? t : null;
}

// Transferencia: radio de salida (Tierra) y de llegada, tiempo y ventana.
function vyPlan(planet, jdNow) {
    const v = new THREE.Vector3();
    if (planet === 'sun') {
        const r1 = planetPosAU('earth', jdNow, v).length(), r2 = 0.046; // perihelio de la Parker (9.86 R☉)
        const a = (r1 + r2) / 2;
        return { jd0: jdNow, r1, r2, a, days: 0.5 * Math.pow(a, 1.5) * 365.25, lon1: vyLonOf(planetPosAU('earth', jdNow, v)), inner: true, window: 'Hacia el Sol se puede salir cualquier día' };
    }
    const a = (1 + VY_A[planet]) / 2;
    const days = 0.5 * Math.pow(a, 1.5) * 365.25;
    // buscar el mejor día de salida en los próximos ~2.2 años
    // la primera fecha en que el error de fase baja de ~3° (las misiones reales toleran más: no son Hohmann puras)
    const errAt = (jd) => Math.abs(vyWrap(vyLonOf(planetPosAU(planet, jd + days, v)) - (vyLonOf(planetPosAU('earth', jd, v)) + Math.PI)));
    // ¿hay una ventana abierta ahora? (la fecha ideal fue hace poco o es pronto, error < 10°)
    let best = null, ideal = null, idealErr = Infinity;
    for (let d = -60; d <= 60; d += 1) { const err = errAt(jdNow + d); if (err < idealErr) { idealErr = err; ideal = jdNow + d; } }
    for (let d = 0; d <= 800; d += 1) {
        const err = errAt(jdNow + d);
        if (!best || err < best.err) best = { err, jd: jdNow + d };
        if (err < 0.055 && err <= errAt(jdNow + d + 1)) { best = { err, jd: jdNow + d }; break; }
    }
    const openNow = errAt(jdNow) < 0.18;
    const jd0 = openNow ? jdNow : best.jd;
    const r1 = planetPosAU('earth', jd0, v).length();
    const r2 = planetPosAU(planet, jd0 + days, v).length();
    const aR = (r1 + r2) / 2;
    return { jd0, r1, r2, a: aR, days: 0.5 * Math.pow(aR, 1.5) * 365.25, lon1: vyLonOf(planetPosAU('earth', jd0, v)), inner: r2 < r1,
        window: openNow ? `¡Ventana de lanzamiento abierta ahora!${ideal && Math.abs(ideal - jdNow) > 2 ? ` (la fecha ideal ${ideal < jdNow ? 'fue' : 'es'} el ${vyFmtDate(ideal)})` : ''}` : `Próxima ventana de lanzamiento: ${vyFmtDate(jd0)}` };
}

// Posición en la elipse para una fracción del viaje (0 = salida, 1 = llegada), en UA (eclíptica -> escena).
function vyPointAU(plan, frac, out) {
    const { r1, r2, a, lon1, inner } = plan;
    const e = Math.abs(r2 - r1) / (r1 + r2);
    const M = (inner ? Math.PI : 0) + frac * Math.PI;
    const E = solveKepler(M, e);
    const x = a * (Math.cos(E) - e), y = a * Math.sqrt(1 - e * e) * Math.sin(E);
    const w = lon1 + (inner ? Math.PI : 0); // dirección del perihelio
    const X = x * Math.cos(w) - y * Math.sin(w), Y = x * Math.sin(w) + y * Math.cos(w);
    return out.set(X, 0, -Y);
}

/* ------------------------------ escena ------------------------------ */
let vyBuilt = null;
function vyBuild() {
    const s = voyage.scene;
    s.add(new THREE.AmbientLight(0xffffff, 0.6));
    const stars = new Float32Array(3000 * 3);
    for (let i = 0; i < 3000; i++) { const v = new THREE.Vector3().randomDirectionCompat().multiplyScalar(2500); stars.set([v.x, v.y, v.z], i * 3); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(stars, 3));
    s.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.4, sizeAttenuation: false, map: roundDotTexture, transparent: true, depthWrite: false })));
    const ship = new THREE.Group();
    ship.add(makeGlowSprite(0xfff1b8, 6, 1), makeGlowSprite(0xffffff, 2, 1), makeMoonLabel('TU NAVE'));
    s.add(ship);
    const trailN = 400, trailPos = new Float32Array(trailN * 3);
    const trailGeo = new THREE.BufferGeometry(); trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xfde68a }));
    trail.frustumCulled = false;
    s.add(trail);
    const path = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineDashedMaterial({ color: 0xfde68a, dashSize: 2, gapSize: 1.6, transparent: true, opacity: 0.55 }));
    path.frustumCulled = false;
    s.add(path);
    const ghost = new THREE.Group(); // dónde estará el destino al llegar
    ghost.add(makeGlowSprite(0x86efac, 5, 0.7), makeMoonLabel('LLEGADA'));
    s.add(ghost);
    return { ship, trail, trailGeo, trailPos, trailN, path, ghost };
}
// r128 no trae Vector3.randomDirection
THREE.Vector3.prototype.randomDirectionCompat = function () {
    const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
    return this.set(s * Math.cos(t), u, s * Math.sin(t));
};

/* ------------------------------ interfaz ------------------------------ */
const vyDom = {
    box: document.getElementById('voyage-hud'),
    title: document.getElementById('voyage-title'),
    window: document.getElementById('voyage-window'),
    dep: document.getElementById('voyage-dep'),
    arr: document.getElementById('voyage-arr'),
    dur: document.getElementById('voyage-dur'),
    day: document.getElementById('voyage-day'),
    speed: document.getElementById('voyage-speed'),
    dist: document.getElementById('voyage-dist'),
    log: document.getElementById('voyage-log'),
    note: document.getElementById('voyage-note'),
    bar: document.getElementById('voyage-bar')
};
function vyLog(text) {
    const li = document.createElement('li');
    li.textContent = text;
    vyDom.log.prepend(li);
    while (vyDom.log.children.length > 4) vyDom.log.lastChild.remove();
    audioEngine.playClickTone(700, 0.04);
}

/* ------------------------------ control ------------------------------ */
function canVoyage(id) { const p = vyPlanetFor(id); return !!p && p !== 'moon'; }

function startVoyage(id, onDone) {
    const planet = vyPlanetFor(id);
    if (!planet || planet === 'moon') { onDone(); return; }
    if (!orrery.built) orrery.built = buildOrrery();
    if (!vyBuilt) vyBuilt = vyBuild();
    voyage.scene.add(orrery.built.root); // el mismo mapa del Sistema Solar (se mueve a esta escena)
    const plan = vyPlan(planet, dateToJD(new Date()));
    Object.assign(voyage, { active: true, dest: id, planet, onDone, frac: 0, plan, events: vyEvents(plan, planet), evIdx: 0, rate: 1 });
    // trayectoria completa
    const pts = [], tmp = new THREE.Vector3();
    for (let i = 0; i <= 240; i++) pts.push(toScene(vyPointAU(plan, i / 240, tmp)).clone());
    vyBuilt.path.geometry.dispose();
    vyBuilt.path.geometry = new THREE.BufferGeometry().setFromPoints(pts);
    vyBuilt.path.computeLineDistances();
    vyBuilt.trailGeo.setDrawRange(0, 0);
    if (planet !== 'sun') toScene(planetPosAU(planet, plan.jd0 + plan.days, tmp), vyBuilt.ghost.position);
    else vyBuilt.ghost.position.copy(toScene(vyPointAU(plan, 1, tmp)));
    // cámara que encuadra toda la ruta
    const span = Math.max(ORR_SCALE(plan.r1), ORR_SCALE(plan.r2));
    voyage.camera.position.set(span * 0.4, span * 1.5, span * 1.25);
    if (!voyage.controls) {
        voyage.controls = new THREE.OrbitControls(voyage.camera, renderer.domElement);
        voyage.controls.enableDamping = true;
        voyage.controls.enablePan = false;
    }
    voyage.controls.enabled = true;
    voyage.controls.target.set(0, 0, 0);
    voyage.controls.minDistance = 20; voyage.controls.maxDistance = 1400;
    const name = SURFACE_SITES[id] ? siteName(id) : astroName(id);
    vyDom.title.textContent = `Rumbo a ${name}${planet !== id && planet !== 'sun' ? ` (vía ${astroName(planet)})` : ''}`;
    vyDom.window.textContent = plan.window;
    vyDom.dep.textContent = vyFmtDate(plan.jd0);
    vyDom.arr.textContent = vyFmtDate(plan.jd0 + plan.days);
    vyDom.dur.textContent = vyDays(plan.days);
    const info = travelFor(id);
    vyDom.note.textContent = info ? `Misión real: ${info[2]} tardó ${info[1]}. ${planet === 'mercury' || planet === 'sun' ? 'Hacia adentro hay que FRENAR mucho: por eso se usan sobrevuelos de planetas.' : 'Las misiones reales usan rutas parecidas, a veces con sobrevuelos para ganar velocidad.'}` : '';
    vyDom.log.replaceChildren();
    vyLog(`Despegue el ${vyFmtDate(plan.jd0)} desde la órbita de la Tierra a ${(plan.r1 * VY_AU / 1e6).toFixed(0)} millones de km del Sol.`);
    vyDom.box.hidden = false;
    document.body.classList.add('voyage-mode');
}

// Eventos de la ruta: cruces de órbitas, cinturones y acercamientos.
function vyEvents(plan, planet) {
    const ev = [];
    const rAt = (f) => vyPointAU(plan, f, new THREE.Vector3()).length();
    const lo = Math.min(plan.r1, plan.r2), hi = Math.max(plan.r1, plan.r2);
    const find = (r) => { for (let i = 1; i <= 400; i++) { const f = i / 400; if ((rAt(f - 1 / 400) - r) * (rAt(f) - r) <= 0) return f; } return null; };
    Object.entries(VY_A).forEach(([p, a]) => {
        if (p === 'earth' || p === planet || a <= lo || a >= hi) return;
        const f = find(a); if (f !== null) ev.push([f, `Cruzas la órbita de ${astroName(p)} (${(a * VY_AU / 1e6).toFixed(0)} millones de km del Sol).`]);
    });
    if (lo < 2.1 && hi > 3.3) {
        const f = find(2.1);
        if (f !== null) ev.push([f, 'Entras al cinturón de asteroides: hay millones de rocas, pero separadas por ~1 millón de km en promedio. Ninguna sonda ha chocado al cruzarlo.']);
    }
    if (planet === 'sun') ev.push([0.6, 'La luz del Sol ya es 10 veces más intensa que en la Tierra. El escudo térmico apunta hacia él.']);
    ev.push([0.5, 'Mitad del camino: la nave va "cuesta arriba/abajo" del pozo del Sol sin motores, solo por inercia.']);
    ev.push([0.92, `Llegando a ${astroName(planet === 'sun' ? 'sun' : planet)}: encendido para entrar en órbita.`]);
    return ev.sort((a, b) => a[0] - b[0]);
}

function endVoyage(skip) {
    if (!voyage.active) return;
    voyage.active = false;
    vyDom.box.hidden = true;
    document.body.classList.remove('voyage-mode');
    if (voyage.controls) voyage.controls.enabled = false;
    const done = voyage.onDone; voyage.onDone = null;
    if (done) done(skip);
}

const vyTmp = new THREE.Vector3(), vyTmp2 = new THREE.Vector3();
function updateVoyage(dt) {
    const cam = voyage.camera, size = renderer.getSize(new THREE.Vector2());
    if (cam.aspect !== size.x / size.y) { cam.aspect = size.x / size.y; cam.updateProjectionMatrix(); }
    const plan = voyage.plan;
    voyage.frac = Math.min(1, voyage.frac + dt * voyage.rate / voyage.dur);
    const f = voyage.frac;
    const jd = plan.jd0 + f * plan.days;
    // planetas en su lugar real de ese día
    orrery.built.markers.forEach(m => {
        if (m.id === 'halley') toScene(halleyPosAU(jd, vyTmp), m.obj.position);
        else toScene(planetPosAU(m.id, jd, vyTmp), m.obj.position);
    });
    // nave y estela
    const au = vyPointAU(plan, f, vyTmp);
    toScene(au, vyBuilt.ship.position);
    const N = vyBuilt.trailN, n = Math.max(2, Math.ceil(f * (N - 1)) + 1);
    for (let i = 0; i < n; i++) {
        toScene(vyPointAU(plan, Math.min(f, i / (N - 1)), vyTmp2), vyTmp2);
        vyBuilt.trailPos.set([vyTmp2.x, vyTmp2.y + 0.05, vyTmp2.z], i * 3);
    }
    vyBuilt.trailGeo.setDrawRange(0, n);
    vyBuilt.trailGeo.attributes.position.needsUpdate = true;
    // datos: día, velocidad (vis-viva) y distancia recorrida
    const rKm = au.length() * VY_AU, aKm = plan.a * VY_AU;
    const v = Math.sqrt(VY_MU_SUN * (2 / rKm - 1 / aKm));
    vyDom.day.textContent = `Día ${Math.round(f * plan.days)} de ${Math.round(plan.days)} · ${vyFmtDate(jd)}`;
    vyDom.speed.textContent = `${v.toFixed(1)} km/s (${Math.round(v * 3600).toLocaleString('es-CO')} km/h)`;
    vyDom.dist.textContent = `${(rKm / 1e6).toFixed(0)} millones de km`;
    vyDom.bar.style.transform = `scaleX(${f.toFixed(3)})`;
    while (voyage.evIdx < voyage.events.length && voyage.events[voyage.evIdx][0] <= f) vyLog(voyage.events[voyage.evIdx++][1]);
    // la cámara sigue un poco a la nave
    voyage.controls.target.lerp(vyBuilt.ship.position.clone().multiplyScalar(0.35), 0.02);
    voyage.controls.update();
    if (f >= 1) endVoyage(false);
}

document.getElementById('voyage-faster')?.addEventListener('click', () => { voyage.rate = Math.min(4, voyage.rate * 2); vyDom.rate.textContent = `×${voyage.rate}`; });
document.getElementById('voyage-slower')?.addEventListener('click', () => { voyage.rate = Math.max(0.25, voyage.rate / 2); vyDom.rate.textContent = `×${voyage.rate}`; });
vyDom.rate = document.getElementById('voyage-rate');
