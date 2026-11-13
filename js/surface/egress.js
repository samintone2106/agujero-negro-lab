/* -------------------------------------------------------------------------- */
/* SALIDA: PONERSE EL TRAJE EN LA ESCLUSA Y ABRIR LA COMPUERTA                 */
/* -------------------------------------------------------------------------- */
// ~11 s: casco y visor -> revisión del traje -> igualar presión con afuera -> compuerta.
// Presión exterior real (bar): con vacío, el siseo del aire se apaga (no hay sonido).
const EG_PRESSURE = { venus: 92, earth: 1, mars: 0.006, titan: 1.5 };
const EG_DUR = 11;

const egress = {
    active: false, t: 0, id: null, onDone: null,
    scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(70, 1, 0.05, 100)
};

/* ------------------------------ escena: la esclusa ------------------------------ */
const egBuilt = (() => {
    const s = egress.scene;
    // paneles de la esclusa (textura dibujada)
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#c9ced6'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#8b939e'; g.lineWidth = 3;
    for (let i = 0; i <= 256; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(256, i); g.stroke(); }
    g.fillStyle = '#6b7380'; for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 256, Math.random() * 256, 3, 3);
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 2);
    const room = new THREE.Mesh(new THREE.BoxGeometry(4, 3, 7), new THREE.MeshStandardMaterial({ map: tex, side: THREE.BackSide, roughness: 0.7, metalness: 0.3 }));
    room.position.set(0, 1.5, 0);
    s.add(room);
    // marco de la compuerta y la compuerta (sube al abrirse)
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x3b4250, roughness: 0.5, metalness: 0.6 });
    [[-1.15, 1.25, 0.3, 2.5], [1.15, 1.25, 0.3, 2.5], [0, 2.55, 2.6, 0.3]].forEach(([x, y, w, h]) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.25), frameMat); m.position.set(x, y, -3.4); s.add(m);
    });
    const door = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.4, 0.12), new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.4, metalness: 0.7 }));
    door.position.set(0, 1.2, -3.38);
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.18), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
    stripe.position.set(0, 0.3, 0.07); door.add(stripe);
    s.add(door);
    // afuera: el cielo y la luz del lugar
    const outside = new THREE.Mesh(new THREE.PlaneGeometry(6, 4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    outside.position.set(0, 1.5, -3.6);
    s.add(outside);
    const lamp = new THREE.PointLight(0xfff1dc, 1.2, 12); lamp.position.set(0, 2.8, 0); s.add(lamp);
    const warn = new THREE.PointLight(0xff3b2f, 0, 8); warn.position.set(1.6, 2.6, -2.8); s.add(warn);
    const warnBulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: 0x551111 }));
    warnBulb.position.copy(warn.position); s.add(warnBulb);
    const spill = new THREE.PointLight(0xffffff, 0, 14); spill.position.set(0, 1.4, -3.2); s.add(spill);
    s.add(new THREE.AmbientLight(0x404650, 0.5));
    return { door, outside, warn, warnBulb, spill };
})();

/* ------------------------------ interfaz ------------------------------ */
const egDom = {
    box: document.getElementById('egress-hud'),
    step: document.getElementById('egress-step'),
    list: document.getElementById('egress-list'),
    gauge: document.getElementById('egress-gauge'),
    gaugeTxt: document.getElementById('egress-gauge-txt'),
    visor: document.getElementById('visor')
};

function startEgress(id, onDone) {
    const site = SURFACE_SITES[id];
    if (!site || (typeof PHYS !== 'undefined' && PHYS[id] && PHYS[id].suit === false) || reduceMotion.matches) { onDone(); return; }
    Object.assign(egress, { active: true, ending: false, t: 0, id, onDone, shown: -1, pOut: EG_PRESSURE[id] || 0 });
    egBuilt.door.position.y = 1.2;
    egBuilt.outside.material.color.set(site.sky.horizon).lerp(new THREE.Color(site.sky.sunColor), 0.25);
    egBuilt.spill.color.set(site.sky.horizon);
    controls.enabled = false;
    document.body.classList.add('egress-mode');
    egDom.list.replaceChildren();
    egDom.box.hidden = false;
    egDom.visor.hidden = false;
    egDom.visor.classList.remove('is-closing'); void egDom.visor.offsetWidth; egDom.visor.classList.add('is-closing');
    egHiss(true);
}

function endEgress(skip) {
    if (!egress.active) return;
    egress.active = false;
    egDom.box.hidden = true;
    egDom.visor.classList.remove('is-closing');
    document.body.classList.remove('egress-mode');
    egHiss(false);
    const done = egress.onDone; egress.onDone = null;
    if (done) done(skip);
}

const EG_STEPS = [
    [0, 'Casco puesto y sellado', 'El visor dorado filtra la luz del Sol: sin aire, nada la suaviza.'],
    [2.4, 'Revisando el traje', null],
    [5.2, null, null],
    [8.6, 'Abriendo la compuerta', null]
];
function egCheck(text) {
    const li = document.createElement('li');
    li.textContent = `✓ ${text}`;
    egDom.list.appendChild(li);
    audioEngine.playClickTone(1200, 0.03);
}

function updateEgress(dt) {
    const cam = egress.camera, size = renderer.getSize(new THREE.Vector2());
    if (cam.aspect !== size.x / size.y) { cam.aspect = size.x / size.y; cam.updateProjectionMatrix(); }
    egress.t += dt;
    const t = egress.t, pOut = egress.pOut;
    let idx = 0; EG_STEPS.forEach((s, i) => { if (t >= s[0]) idx = i; });
    if (idx !== egress.shown) {
        egress.shown = idx;
        const s = EG_STEPS[idx];
        const equalize = pOut > 1 ? `Presurizando la esclusa a ${pOut} bar` : 'Despresurizando la esclusa';
        egDom.step.textContent = s[1] || equalize;
        if (idx === 0) egCheck(s[2]);
    }
    // revisión del traje: una marca cada ~0.7 s
    const checks = ['Presión del traje: 0.3 bar (oxígeno puro)', 'Oxígeno: 100 % · 8 horas', 'Radio con la nave: OK', 'Temperatura interna: 21 °C'];
    const nChecks = Math.max(0, Math.min(checks.length, Math.floor((t - 2.4) / 0.7) + 1));
    while (egDom.list.children.length - 1 < nChecks && t >= 2.4) egCheck(checks[egDom.list.children.length - 1]);
    // igualar presión: de 1 bar (cabina) a la de afuera
    const k = smooth01(5.2, 8.4, t);
    const p = 1 + (pOut - 1) * k;
    egDom.gauge.style.transform = `scaleX(${Math.min(1, Math.max(0.02, Math.log10(1 + p * 9) / Math.log10(1 + Math.max(1, pOut) * 9))).toFixed(3)})`;
    egDom.gaugeTxt.textContent = `${p < 0.01 ? p.toFixed(4) : p < 10 ? p.toFixed(2) : p.toFixed(0)} bar${k >= 1 && pOut < 0.01 ? ' · vacío: el siseo se apagó (sin aire no viaja el sonido)' : ''}`;
    egHissLevel(t < 5.2 ? 0.35 : (pOut < 1 ? 0.6 * (1 - k) : 0.6 * (1 - k * 0.6)));
    // luz de alerta girando mientras cambia la presión
    const alarm = t > 5.2 && t < 8.6;
    egBuilt.warn.intensity = alarm ? (Math.sin(t * 9) > 0 ? 1.6 : 0.1) : 0;
    egBuilt.warnBulb.material.color.set(alarm && Math.sin(t * 9) > 0 ? 0xff3b2f : 0x551111);
    // compuerta: sube y entra la luz de afuera
    const open = smooth01(8.6, 10.2, t);
    egBuilt.door.position.y = 1.2 + open * 2.5;
    egBuilt.spill.intensity = open * 2.5;
    // cámara: respiración leve y paso hacia la salida
    const bob = Math.sin(t * 1.6) * 0.012;
    cam.position.set(0, 1.62 + bob, 1.8 - smooth01(9.4, EG_DUR, t) * 2.6);
    cam.rotation.set(-0.02 + bob * 0.5, 0, 0);
    if (t >= EG_DUR && !egress.ending) { egress.ending = true; fadeThen(() => endEgress(false)); }
}

/* ------------------------------ sonido: siseo del aire ------------------------------ */
let egNoise = null;
function egHiss(on) {
    if (!audioEngine.isPlaying || !audioEngine.ctx) return;
    const ctx = audioEngine.ctx;
    if (on && !egNoise) {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
        const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
        const g = ctx.createGain(); g.gain.value = 0;
        src.connect(hp); hp.connect(g); g.connect(audioEngine.output()); src.start();
        egNoise = { src, g };
    } else if (!on && egNoise) {
        const n = egNoise; egNoise = null;
        n.g.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
        setTimeout(() => { try { n.src.stop(); } catch (e) { /* ya detenido */ } }, 600);
    }
}
function egHissLevel(k) { if (egNoise) egNoise.g.gain.setTargetAtTime(k * 0.12, audioEngine.ctx.currentTime, 0.1); }

function skipEgress() { if (egress.active && !egress.ending) { egress.ending = true; fadeThen(() => endEgress(true)); } }
document.getElementById('egress-skip')?.addEventListener('click', skipEgress);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') skipEgress(); });
