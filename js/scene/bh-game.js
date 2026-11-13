/* -------------------------------------------------------------------------- */
/* JUEGO: ROZAR EL HORIZONTE DE GARGANTÚA                                      */
/* -------------------------------------------------------------------------- */
// Unidades: radio de Schwarzschild r_s = 1. Gravedad de Paczyński–Wiita,
// a = GM/(r − r_s)²: reproduce la órbita estable mínima (3 r_s) y la caída sin
// retorno. Meta: dar una vuelta completa pasando por debajo de 3 r_s y escapar.
const GG_C = 4;                  // velocidad de la luz en unidades del juego (r_s/s)
const GG_GM = GG_C * GG_C / 2;   // porque r_s = 2GM/c²
const GG_RS_KM = 1.18e9;         // Gargantúa del simulador: 4×10⁸ soles -> r_s ≈ 7.9 UA
// Bajar el periapsis de 22 a 2.5 r_s cuesta Δv ≈ 0.07 y escapar desde ahí ≈ 0.10:
// empuje suave para que se pueda dosificar, y tanque con margen para corregir.
const GG_FUEL = 3;               // Δv total del tanque (r_s/s)
const GG_THRUST = 0.5;           // r_s/s²
const GG_START = 22;

const gg = {
    active: false, scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(55, 1, 0.05, 4000),
    pos: new THREE.Vector2(), vel: new THREE.Vector2(), heading: 0, fuel: GG_FUEL, swept: 0, lastAng: 0,
    rMin: Infinity, maxSlow: 1, tauShip: 0, tEarth: 0, over: null, keys: new Set(), fall: 0
};

/* ------------------------------ escena ------------------------------ */
const ggBuilt = (() => {
    const s = gg.scene;
    const starPos = new Float32Array(4000 * 3);
    for (let i = 0; i < 4000; i++) {
        const u = Math.random() * 2 - 1, t = Math.random() * 6.283, q = Math.sqrt(1 - u * u);
        starPos.set([q * Math.cos(t) * 1500, u * 1500, q * Math.sin(t) * 1500], i * 3);
    }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    s.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.3, sizeAttenuation: false, map: roundDotTexture, transparent: true, depthWrite: false })));
    // disco de acreción: más brillante del lado que viene hacia ti (efecto Doppler)
    const disk = new THREE.Mesh(new THREE.RingGeometry(3, 16, 160, 8), new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
        uniforms: { uTime: sharedUniforms.uTime },
        vertexShader: 'varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `
            uniform float uTime; varying vec2 vP;
            float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
            void main() {
                float r = length(vP), a = atan(vP.y, vP.x);
                float spin = a + uTime * 2.2 / pow(r, 1.5) * 3.0;
                float bands = 0.55 + 0.45 * sin(r * 6.0 + sin(spin * 3.0) * 1.5) * sin(spin * 5.0 + r);
                float heat = pow(3.0 / r, 1.3);
                float doppler = 0.6 + 0.6 * sin(a);
                vec3 col = mix(vec3(1.0, 0.35, 0.08), vec3(1.0, 0.9, 0.7), heat) * (0.25 + heat * 1.6) * bands * doppler;
                float edge = smoothstep(3.0, 3.6, r) * (1.0 - smoothstep(12.0, 16.0, r));
                gl_FragColor = vec4(col, edge * 0.9);
            }
        `
    }));
    disk.rotation.x = -Math.PI / 2;
    s.add(disk);
    // horizonte (negro), esfera de fotones (1.5 r_s) y órbita estable mínima (3 r_s)
    const hole = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    s.add(hole);
    s.add(makeGlowSprite(0xff8a3d, 9, 0.35));
    const ring = (r, color, dashed) => {
        const pts = []; for (let i = 0; i <= 160; i++) { const a = i / 160 * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r, 0.02, Math.sin(a) * r)); }
        const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), dashed
            ? new THREE.LineDashedMaterial({ color, dashSize: 0.25, gapSize: 0.2, transparent: true, opacity: 0.7 })
            : new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.6 }));
        if (dashed) l.computeLineDistances();
        return l;
    };
    s.add(ring(1.5, 0xfde68a, true), ring(3, 0x67e8f9, true), ring(40, 0x86efac, true));
    // nave, llama, estela y trayectoria prevista
    const ship = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.5, 16), new THREE.MeshBasicMaterial({ color: 0xe2e8f0 }));
    body.rotation.x = Math.PI / 2;
    const glow = makeGlowSprite(0xbfe3ff, 1.4, 0.8);
    const flame = makeGlowSprite(0x7dd3fc, 0.9, 0); flame.position.z = -0.4; // el frente de la nave es +z
    ship.add(body, glow, flame);
    s.add(ship);
    const mkLine = (n, color, opacity) => {
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
        const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity })); l.frustumCulled = false; s.add(l); return l;
    };
    const trail = mkLine(500, 0x93c5fd, 0.7);
    const predict = mkLine(600, 0xfde68a, 0.45);
    return { ship, body, glow, flame, trail, predict, disk };
})();

/* ------------------------------ física ------------------------------ */
const ggAcc = (p, out) => {
    const r = p.length();
    const k = -GG_GM / Math.pow(Math.max(1e-3, r - 1), 2) / r;
    return out.set(p.x * k, p.y * k);
};
const ggA = new THREE.Vector2(), ggT = new THREE.Vector2();

function ggStep(dt, thrust) {
    // integrador "leapfrog": conserva bien la energía en órbitas cerradas
    ggAcc(gg.pos, ggA);
    if (thrust) ggA.add(ggT.set(Math.cos(gg.heading), Math.sin(gg.heading)).multiplyScalar(GG_THRUST));
    gg.vel.addScaledVector(ggA, dt * 0.5);
    gg.pos.addScaledVector(gg.vel, dt);
    ggAcc(gg.pos, ggA);
    if (thrust) ggA.add(ggT.set(Math.cos(gg.heading), Math.sin(gg.heading)).multiplyScalar(GG_THRUST));
    gg.vel.addScaledVector(ggA, dt * 0.5);
    // ninguna nave pasa la velocidad de la luz
    const v = gg.vel.length();
    if (v > GG_C * 0.98) gg.vel.multiplyScalar(GG_C * 0.98 / v);
}

/* ------------------------------ interfaz ------------------------------ */
const ggDom = {
    hud: document.getElementById('gg-hud'),
    r: document.getElementById('gg-r'), v: document.getElementById('gg-v'), clock: document.getElementById('gg-clock'),
    tide: document.getElementById('gg-tide'), fuel: document.getElementById('gg-fuel'), goal: document.getElementById('gg-goal'),
    end: document.getElementById('gg-end'), endTitle: document.getElementById('gg-end-title'), endText: document.getElementById('gg-end-text')
};
const ggNum = (v, d = 1) => v.toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d });
const ggSci = (x) => x >= 0.01 && x < 1e5 ? ggNum(x, x < 10 ? 2 : 0) : x.toExponential(1).replace('e', '×10^').replace('+', '');

function startBHGame() {
    if (typeof genesis !== 'undefined' && genesis.active) stopGenesis(true);
    Object.assign(gg, { active: true, heading: Math.PI / 2, fuel: GG_FUEL, swept: 0, lastAng: 0, rMin: Infinity, maxSlow: 1, tauShip: 0, tEarth: 0, over: null, fall: 0 });
    gg.pos.set(GG_START, 0);
    const vc = Math.sqrt(GG_GM * GG_START) / (GG_START - 1);
    gg.vel.set(0, vc * 0.42); // muy lento para orbitar: si no haces nada, caes al horizonte
    gg.trailN = 0;
    ggBuilt.trail.geometry.setDrawRange(0, 0);
    ggBuilt.body.material.color.set(0xe2e8f0);
    ggBuilt.ship.scale.set(1, 1, 1);
    controls.enabled = false;
    document.body.classList.add('gg-mode');
    ggDom.hud.hidden = false;
    ggDom.end.hidden = true;
    audioEngine.playClickTone(440, 0.08);
}
function exitBHGame() {
    if (!gg.active) return;
    gg.active = false;
    document.body.classList.remove('gg-mode');
    ggDom.hud.hidden = true;
    ggDom.end.hidden = true;
    controls.enabled = true;
    gg.keys.clear();
}

function ggFinish(win) {
    gg.over = win ? 'win' : 'lose';
    if (!win) gg.pos.setLength(1.03); // visto desde afuera, la nave queda "pegada" al borde
    const earthYears = gg.tEarth / 8766, shipH = gg.tauShip;
    ggDom.endTitle.textContent = win ? '¡Escapaste de Gargantúa!' : 'Cruzaste el horizonte';
    ggDom.endText.textContent = win
        ? `Pasaste a ${ggNum(gg.rMin, 2)} r_s (${ggNum(gg.rMin * GG_RS_KM / 1e6, 0)} millones de km) y diste la vuelta completa. Para ti pasaron ${ggNum(shipH, 1)} h; en la Tierra, ${earthYears >= 1 ? ggNum(earthYears, 1) + ' años' : ggNum(gg.tEarth, 1) + ' h'}: en el punto más bajo tu reloj iba ${ggNum(gg.maxSlow, 1)} veces más lento.`
        : 'Desde afuera te verían frenar, enrojecer y apagarte justo en el borde, para siempre. Tú no sentiste nada al cruzar: Gargantúa es tan grande que sus mareas son suaves. Pero ya no hay salida: todo camino lleva al centro.';
    ggDom.end.hidden = false;
    ggDom.end.querySelector('button')?.focus();
    audioEngine.playClickTone(win ? 880 : 160, 0.15);
}

/* ------------------------------ por cuadro ------------------------------ */
const ggCam = new THREE.Vector3(), ggLook = new THREE.Vector3(), ggP = new THREE.Vector2(), ggV = new THREE.Vector2();
function updateBHGame(dt) {
    const cam = gg.camera, size = renderer.getSize(new THREE.Vector2());
    if (cam.aspect !== size.x / size.y) { cam.aspect = size.x / size.y; cam.updateProjectionMatrix(); }
    const k = gg.keys;
    if (!gg.over) {
        if (k.has('a') || k.has('arrowleft')) gg.heading += dt * 2.6;
        if (k.has('d') || k.has('arrowright')) gg.heading -= dt * 2.6;
        const thrust = (k.has('w') || k.has('arrowup') || k.has(' ')) && gg.fuel > 0;
        if (thrust) gg.fuel = Math.max(0, gg.fuel - GG_THRUST * dt);
        const n = Math.ceil(dt / 0.004);
        for (let i = 0; i < n; i++) ggStep(dt / n, thrust);
        ggBuilt.flame.material.opacity = thrust ? 0.7 + Math.random() * 0.3 : 0;
        const r = gg.pos.length(), v = gg.vel.length();
        // vueltas: ángulo barrido alrededor del agujero
        const ang = Math.atan2(gg.pos.y, gg.pos.x);
        let d = ang - gg.lastAng; d = Math.atan2(Math.sin(d), Math.cos(d));
        gg.swept += d; gg.lastAng = ang;
        gg.rMin = Math.min(gg.rMin, r);
        // tiempo: tu reloj contra el de la Tierra (1 s de juego = 1 h)
        const f = Math.sqrt(Math.max(1e-6, 1 - 1 / r - (v * v) / (GG_C * GG_C)));
        gg.tauShip += dt; gg.tEarth += dt / f; gg.maxSlow = Math.max(gg.maxSlow, 1 / f);
        // mareas sobre una nave de 50 m: Δa = c²·L / (x³ · r_s²)
        const x3 = r * r * r;
        const tideG = 9e16 * 50 / (x3 * Math.pow(GG_RS_KM * 1e3, 2)) / 9.81;
        const tideStellarG = 9e16 * 50 / (x3 * Math.pow(29.5e3, 2)) / 9.81;
        ggDom.r.textContent = `${ggNum(r, 2)} r_s · ${ggNum(r * GG_RS_KM / 1e6, 0)} millones de km`;
        ggDom.v.textContent = `${ggNum(v / GG_C * 100, 1)} % de la luz`;
        ggDom.clock.textContent = `1 h tuya = ${ggSci(1 / f)} h en la Tierra`;
        ggDom.tide.textContent = `${ggSci(tideG)} g (si fuera de 10 soles: ${ggSci(tideStellarG)} g${tideStellarG > 100 ? ' → espaguetizado' : ''})`;
        ggDom.fuel.style.transform = `scaleX(${(gg.fuel / GG_FUEL).toFixed(3)})`;
        const lap = Math.min(1, Math.abs(gg.swept) / (Math.PI * 2));
        ggDom.goal.textContent = `Vuelta: ${Math.round(lap * 100)} % · más cerca: ${gg.rMin < 90 ? ggNum(gg.rMin, 2) + ' r_s' : '—'} ${gg.rMin < 3 ? '✓' : '(baja de 3 r_s)'} · luego escapa más allá de 40 r_s`;
        if (r <= 1.0) ggFinish(false);
        else if (r > 40 && lap >= 1 && gg.rMin < 3) ggFinish(true);
        else if (r > 60) { gg.pos.multiplyScalar(60 / r); gg.vel.multiplyScalar(-0.3); } // no perderse en el espacio
        // la nave se ve corrida al rojo y más lenta (así la vería alguien de lejos)
        const red = Math.min(1, Math.max(0, (2.5 - r) / 1.5));
        ggBuilt.body.material.color.setRGB(0.89, 0.91 - red * 0.6, 0.94 - red * 0.85);
    } else if (gg.over === 'lose') {
        // vista desde afuera: se congela en el borde, enrojece y se apaga
        gg.fall = Math.min(1, gg.fall + dt / 3);
        ggBuilt.body.material.color.setRGB(0.9 * (1 - gg.fall), 0.1 * (1 - gg.fall), 0);
        ggBuilt.glow.material.opacity = 0.8 * (1 - gg.fall);
    }

    // nave
    ggBuilt.ship.position.set(gg.pos.x, 0.05, -gg.pos.y);
    ggBuilt.ship.rotation.set(0, gg.heading + Math.PI / 2, 0); // rumbo 2D (x, y) -> escena (x, −z)
    // estela
    const tp = ggBuilt.trail.geometry.attributes.position;
    gg.trailN = (gg.trailN || 0);
    if (!gg.over) {
        if (gg.trailN < 500) gg.trailN++;
        tp.array.copyWithin(3, 0, (gg.trailN - 1) * 3);
        tp.setXYZ(0, gg.pos.x, 0.03, -gg.pos.y);
        tp.needsUpdate = true;
        ggBuilt.trail.geometry.setDrawRange(0, gg.trailN);
    }
    // trayectoria prevista sin motor (lo que hará la nave si no tocas nada)
    const pp = ggBuilt.predict.geometry.attributes.position;
    ggP.copy(gg.pos); ggV.copy(gg.vel);
    let m = 0;
    for (let i = 0; i < 600 && !gg.over; i++) {
        for (let j = 0; j < 4; j++) {
            ggAcc(ggP, ggA); ggV.addScaledVector(ggA, 0.015); ggP.addScaledVector(ggV, 0.015);
        }
        pp.setXYZ(m++, ggP.x, 0.02, -ggP.y);
        const rr = ggP.length();
        if (rr < 1 || rr > 80) break;
    }
    ggBuilt.predict.geometry.setDrawRange(0, m);
    pp.needsUpdate = true;

    // cámara: desde arriba e inclinada, encuadra el agujero y la nave
    const r = gg.pos.length();
    const dist = Math.max(18, r * 1.25 + 8);
    ggLook.set(gg.pos.x * 0.45, 0, -gg.pos.y * 0.45);
    ggCam.set(ggLook.x, dist * 0.9, ggLook.z + dist * 0.55);
    cam.position.lerp(ggCam, 0.06);
    cam.lookAt(ggLook);
}

/* ------------------------------ controles ------------------------------ */
(() => {
    window.addEventListener('keydown', (e) => {
        if (!gg.active || e.target.closest('input, textarea, select')) return;
        const key = e.key.toLowerCase();
        if (key === 'escape') { exitBHGame(); return; }
        if (key === ' ' || key.startsWith('arrow')) e.preventDefault();
        gg.keys.add(key);
    }, true);
    window.addEventListener('keyup', (e) => gg.keys.delete(e.key.toLowerCase()));
    const hold = (id, key) => {
        const b = document.getElementById(id); if (!b) return;
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); gg.keys.add(key); });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => gg.keys.delete(key)));
    };
    hold('gg-left', 'a'); hold('gg-right', 'd'); hold('gg-thrust', 'w');
    document.getElementById('gg-start')?.addEventListener('click', startBHGame);
    document.getElementById('gg-exit')?.addEventListener('click', exitBHGame);
    document.getElementById('gg-retry')?.addEventListener('click', startBHGame);
    document.getElementById('gg-leave')?.addEventListener('click', exitBHGame);
})();
