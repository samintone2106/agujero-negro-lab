/* -------------------------------------------------------------------------- */
/* JUGAR EN LA SUPERFICIE: SALTAR, CORRER, GRAVEDAD Y VIENTO REALES            */
/* -------------------------------------------------------------------------- */
// 1 unidad = 1 m. Gravedad real de cada mundo; el salto sale con la misma
// velocidad que en la Tierra (2.6 m/s), así que la altura la pone la gravedad:
// h = v²/2g. Con aire, el arrastre es ½·ρ·v²·Cd·A (ρ = densidad real del aire).
const PHYS = {
    moon: { g: 1.62 }, mercury: { g: 3.70 }, io: { g: 1.80 }, europa: { g: 1.31 }, pluto: { g: 0.62 },
    venus: { g: 8.87, rho: 65, wind: [0.5, 0.5] },        // 92 bar de CO₂: casi un líquido
    earth: { g: 9.81, rho: 1.2, wind: [4, 4], suit: false },
    mars: { g: 3.72, rho: 0.02, wind: [7, 18] },          // ráfagas fuertes, pero el aire es 1 % del nuestro
    titan: { g: 1.35, rho: 5.3, wind: [0.4, 0.6] },        // aire 4.4 veces más denso que el de la Tierra
    'Ganímedes': { g: 1.428 }, 'Calisto': { g: 1.235 }, 'Encélado': { g: 0.113 }, 'Mimas': { g: 0.064 },
    'Tritón': { g: 0.779 }, 'Fobos': { g: 0.0057 }, 'Caronte': { g: 0.288 }, 'Miranda': { g: 0.079 }
};
const PL_V0 = 2.6;              // m/s: un buen salto en la Tierra (~0.34 m)
const PL_BODY = 75;             // kg de la persona
const PL_SUIT = 90;             // kg del traje con mochila (como el A7L del Apolo)
const PL_CD_A = 0.7;            // Cd·A de una persona de pie (m²)
const PL_JET = 2.2;             // m/s² del propulsor de la mochila (tecla Q)

const player = {
    pos: new THREE.Vector3(), vel: new THREE.Vector3(), onGround: true,
    facing: 0, phase: 0, air: 0, peak: 0, takeoffY: 0, best: 0, lastAir: 0,
    cam: 'third', phys: PHYS.moon, wind: new THREE.Vector3(), gust: new THREE.Vector3(), windF: 0, jetting: false, flapping: false,
    joy: { x: 0, y: 0 }, jumpHeld: false, jetHeld: false
};

const PL_CAM_KEY = 'eh.camMode';
try { const c = localStorage.getItem(PL_CAM_KEY); if (c === 'helmet' || c === 'third') player.cam = c; } catch (e) { /* sin almacenamiento */ }

/* ------------------------------ modelo ------------------------------ */
// Astronauta (o persona en la Tierra) con articulaciones para animar al caminar.
function plLimb(len, r0, r1, mat) {
    const pivot = new THREE.Group();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, len, 14), mat);
    m.position.y = -len / 2;
    pivot.add(m);
    const joint = new THREE.Group(); joint.position.y = -len;
    pivot.add(joint);
    pivot.userData.joint = joint;
    return pivot;
}

function buildPlayerModel(suit) {
    const root = new THREE.Group();
    // un poco de brillo propio: sin aire no hay luz del cielo y de espaldas al Sol el traje se vería negro
    const white = new THREE.MeshStandardMaterial({ color: suit ? 0xeef0f2 : 0x2d6a8f, roughness: 0.75, emissive: suit ? 0x2a2c30 : 0x000000 });
    const dark = new THREE.MeshStandardMaterial({ color: suit ? 0x9aa3ad : 0x2b2f36, roughness: 0.8, emissive: suit ? 0x16181b : 0x000000 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xc58c64, roughness: 0.7 });
    const legMat = suit ? white : new THREE.MeshStandardMaterial({ color: 0x3b3f46, roughness: 0.9 });
    const R = suit ? 1.25 : 1; // el traje abulta

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * R, 0.17 * R, 0.58, 18), white);
    torso.position.y = 1.22;
    root.add(torso);
    const hips = new THREE.Mesh(new THREE.SphereGeometry(0.18 * R, 16, 12), legMat);
    hips.scale.y = 0.6; hips.position.y = 0.95;
    root.add(hips);

    const legs = [-1, 1].map(s => {
        const thigh = plLimb(0.46, 0.085 * R, 0.07 * R, legMat);
        thigh.position.set(s * 0.1 * R, 0.95, 0);
        const shin = plLimb(0.44, 0.065 * R, 0.055 * R, legMat);
        thigh.userData.joint.add(shin);
        const boot = new THREE.Mesh(new THREE.BoxGeometry(0.13 * R, 0.09, 0.27), dark);
        boot.position.set(0, -0.04, -0.05);
        shin.userData.joint.add(boot);
        root.add(thigh);
        return { thigh, shin };
    });
    const arms = [-1, 1].map(s => {
        const upper = plLimb(0.3, 0.06 * R, 0.055 * R, white);
        upper.position.set(s * 0.27 * R, 1.47, 0);
        upper.rotation.z = s * 0.12;
        const fore = plLimb(0.28, 0.05 * R, 0.045 * R, white);
        upper.userData.joint.add(fore);
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05 * R, 10, 8), suit ? dark : skin);
        hand.position.y = -0.02;
        fore.userData.joint.add(hand);
        root.add(upper);
        return { upper, fore };
    });

    if (suit) {
        const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 28, 20), white);
        helmet.position.y = 1.69;
        // visor dorado (protege del Sol sin aire que lo filtre)
        const visor = new THREE.Mesh(new THREE.SphereGeometry(0.205, 28, 16, Math.PI * 0.62, Math.PI * 0.76, Math.PI * 0.3, Math.PI * 0.38),
            new THREE.MeshStandardMaterial({ color: 0xc9a227, metalness: 0.9, roughness: 0.12, emissive: 0x2a1c02 }));
        visor.position.y = 1.69;
        const pack = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.58, 0.22), white);
        pack.position.set(0, 1.25, 0.24);
        const packTop = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.18), dark);
        packTop.position.set(0, 1.58, 0.23);
        const chest = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.08), dark);
        chest.position.set(0, 1.3, -0.24);
        root.add(helmet, visor, pack, packTop, chest);
    } else {
        const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 10), skin); neck.position.y = 1.56;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.115, 20, 16), skin); head.position.y = 1.68; head.scale.set(1, 1.12, 1);
        const hair = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), new THREE.MeshStandardMaterial({ color: 0x1c140e, roughness: 1 }));
        hair.position.y = 1.7;
        root.add(neck, head, hair);
    }
    root.traverse(o => { if (o.isMesh) o.castShadow = false; });

    // sombra suave bajo los pies: ayuda a medir la altura del salto
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(0,0,0,0.55)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;

    // llama del propulsor
    const jet = makeGlowSprite(0x9fd8ff, 0.6, 0);
    jet.position.set(0, 0.95, 0.42);
    root.add(jet);
    return { root, legs, arms, shadow, jet, suit };
}

let plModel = null;

/* ------------------------------ entrar ------------------------------ */
function resetPlayer(id) {
    player.phys = PHYS[id] || { g: 1.62 };
    const suit = player.phys.suit !== false;
    plModel = buildPlayerModel(suit);
    surface.scene.add(plModel.root, plModel.shadow);
    player.pos.set(0, surface.site.heightFn(0, 0), 0);
    player.vel.set(0, 0, 0);
    Object.assign(player, { onGround: true, facing: surface.yaw, phase: 0, air: 0, peak: 0, best: 0, lastAir: 0, chargeAt: null, jumpQueued: 0 });
    player.wind.set(0, 0, 0); player.gust.set(0, 0, 0);
    plDom.weight.textContent = plWeightText();
    plDom.hint.textContent = plHintText();
    syncPlayerCam();
    updatePlayHud(true);
}

/* ------------------------------ física ------------------------------ */
const plFwd = new THREE.Vector3(), plRight = new THREE.Vector3(), plWish = new THREE.Vector3(), plRel = new THREE.Vector3();

function plWalkSpeeds(g) {
    // con poca gravedad no se puede caminar rápido: el paso "despega" (número de Froude)
    const walk = Math.min(1.4, 0.7 * Math.sqrt(g * 0.9) + 0.3);
    const run = Math.min(5.5, Math.max(walk * 1.4, 1.7 * Math.sqrt(g * 0.9)));
    return { walk, run };
}

function stepPlayer(dt) {
    const k = surface.keys, ph = player.phys, g = ph.g, rho = ph.rho || 0;
    const mass = PL_BODY + (ph.suit === false ? 0 : PL_SUIT);
    const run = k.has('shift');
    const mf = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0) - player.joy.y;
    const mr = (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0) + player.joy.x;
    if (k.has('arrowleft')) surface.yaw += dt * 1.6;
    if (k.has('arrowright')) surface.yaw -= dt * 1.6;
    plFwd.set(-Math.sin(surface.yaw), 0, -Math.cos(surface.yaw));
    plRight.set(-plFwd.z, 0, plFwd.x);
    plWish.set(0, 0, 0).addScaledVector(plFwd, mf).addScaledVector(plRight, mr);
    const wishLen = Math.min(1, plWish.length());
    if (wishLen > 0.01) plWish.normalize();

    // viento con ráfagas (ruido lento)
    const t = performance.now() / 1000;
    if (ph.wind) {
        const [base, gust] = ph.wind;
        const s = base + gust * Math.max(0, fbm2D(t * 0.15, 3.1, 3) - 0.35) * 1.6;
        const dir = 0.6 + (fbm2D(t * 0.02, 9.7, 2) - 0.5) * 1.2;
        player.wind.set(Math.cos(dir) * s, 0, Math.sin(dir) * s);
    } else player.wind.set(0, 0, 0);
    player.wind.add(player.gust); // viento local (p. ej. un torbellino de Marte encima)

    const { walk, run: runV } = plWalkSpeeds(g);
    const target = wishLen * (run ? runV : walk);

    if (player.onGround) {
        // aceleración limitada por el agarre: en Fobos casi no hay de dónde empujar
        const acc = Math.max(0.25, Math.min(14, 0.9 * g + 0.3));
        const hv = new THREE.Vector3(player.vel.x, 0, player.vel.z);
        const want = plWish.clone().multiplyScalar(target);
        const diff = want.sub(hv);
        const dl = diff.length();
        if (dl > 0) hv.addScaledVector(diff, Math.min(1, acc * dt / dl));
        player.vel.x = hv.x; player.vel.z = hv.z;
        if (wishLen > 0.01) player.facing = Math.atan2(-plWish.x, -plWish.z);

        let jump = 0;
        if (player.jumpQueued) jump = player.jumpQueued; // salto cargado: más tiempo apretado = más fuerza
        // con poca gravedad, correr es ir a saltitos (como el Apolo)
        else if (run && wishLen > 0.3 && g < 2.5 && hv.length() > runV * 0.6) jump = Math.min(PL_V0, 0.55 * Math.sqrt(g) + 0.15);
        if (jump > 0) {
            player.vel.y = jump;
            player.onGround = false;
            player.air = 0; player.takeoffY = player.pos.y; player.peak = player.pos.y;
            if (player.jumpQueued) audioEngine.playClickTone(260 + (player.jumpQueued / PL_V0 - 1) * 400, 0.05);
            player.jumpQueued = 0;
        }
    }

    // fuerzas en el aire o en el suelo
    let ax = 0, ay = -g, az = 0;
    plRel.copy(player.vel).sub(player.wind);
    const rl = plRel.length();
    player.windF = 0.5 * rho * PL_CD_A * player.wind.lengthSq();
    if (rho > 0 && rl > 0) {
        const a = 0.5 * rho * PL_CD_A * rl / mass;
        ax -= a * plRel.x; ay -= a * plRel.y; az -= a * plRel.z;
    }
    player.jetting = !player.onGround && player.jetHeld && ph.suit !== false;
    if (player.jetting) ay -= PL_JET;
    // en aire muy denso (Titán) se puede "nadar" hacia arriba agitando los brazos
    player.flapping = !player.onGround && k.has(' ') && rho > 2;
    if (player.flapping) {
        ay += Math.min(4, 0.34 * rho);
        ax += plWish.x * 0.8; az += plWish.z * 0.8;
    }
    if (player.onGround) { ax = 0; az = 0; ay = 0; player.vel.y = 0; }
    player.vel.x += ax * dt; player.vel.y += ay * dt; player.vel.z += az * dt;
    player.pos.addScaledVector(player.vel, dt);

    const lim = SURF_NEAR * 0.45;
    if (Math.abs(player.pos.x) > lim) { player.pos.x = Math.sign(player.pos.x) * lim; player.vel.x = 0; }
    if (Math.abs(player.pos.z) > lim) { player.pos.z = Math.sign(player.pos.z) * lim; player.vel.z = 0; }

    const ground = surface.site.heightFn(player.pos.x, player.pos.z);
    if (player.onGround) {
        player.pos.y = ground;
    } else {
        player.air += dt;
        player.peak = Math.max(player.peak, player.pos.y);
        if (player.pos.y <= ground && player.vel.y <= 0) {
            player.pos.y = ground;
            player.vel.y = 0;
            player.onGround = true;
            const h = player.peak - player.takeoffY;
            if (h > 0.05) { player.lastH = h; player.lastAir = player.air; player.best = Math.max(player.best, h); }
            if (h > 0.25) audioEngine.playClickTone(140, 0.05);
        }
    }
}

/* ------------------------------ animación y cámara ------------------------------ */
function animatePlayerModel(dt) {
    const m = plModel; if (!m) return;
    m.root.position.copy(player.pos);
    // gira suave hacia donde camina
    let d = player.facing - m.root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    m.root.rotation.y += d * Math.min(1, dt * 10);
    const hs = Math.hypot(player.vel.x, player.vel.z);
    if (player.onGround) {
        player.phase += hs * dt * (player.phys.g < 2.5 ? 3.2 : 4.5);
        const amp = Math.min(0.7, hs * 0.35);
        m.legs.forEach((L, i) => {
            const s = Math.sin(player.phase + i * Math.PI);
            L.thigh.rotation.x = s * amp;
            L.shin.rotation.x = -Math.max(0, -Math.cos(player.phase + i * Math.PI)) * amp * 1.2; // la rodilla dobla hacia atrás (el frente es −z)
        });
        m.arms.forEach((A, i) => { A.upper.rotation.x = -Math.sin(player.phase + i * Math.PI) * amp * 0.8; A.fore.rotation.x = 0.25; });
    } else {
        // en el aire: rodillas recogidas al subir, piernas listas al bajar
        const up = player.vel.y > 0 ? 1 : 0.4;
        m.legs.forEach((L) => { L.thigh.rotation.x += (-0.5 * up - L.thigh.rotation.x) * Math.min(1, dt * 6); L.shin.rotation.x += (-0.9 * up - L.shin.rotation.x) * Math.min(1, dt * 6); });
        m.arms.forEach((A, i) => { A.upper.rotation.x += ((player.flapping ? Math.sin(performance.now() / 120) * 1.2 : -0.6) - A.upper.rotation.x) * Math.min(1, dt * 6); });
    }
    // agacharse mientras se carga el salto
    const crouch = player.onGround ? plChargeLevel() : 0;
    if (crouch > 0) m.legs.forEach(L => { L.thigh.rotation.x = 0.9 * crouch; L.shin.rotation.x = -1.6 * crouch; });
    m.root.position.y -= crouch * 0.28;
    if (plDom.charge) plDom.charge.style.transform = `scaleX(${crouch.toFixed(3)})`;
    const ground = surface.site.heightFn(player.pos.x, player.pos.z);
    const h = Math.max(0, player.pos.y - ground);
    m.shadow.position.set(player.pos.x, ground + 0.03, player.pos.z);
    const sc = 0.9 / (1 + h * 0.15);
    m.shadow.scale.set(sc, sc, 1);
    m.shadow.material.opacity = 1 / (1 + h * 0.08);
    m.jet.material.opacity = player.jetting ? 0.6 + Math.random() * 0.3 : 0;
    m.root.visible = player.cam === 'third';
    m.shadow.visible = true;
}

const plCamPos = new THREE.Vector3(), plLook = new THREE.Vector3();
function placePlayerCamera() {
    const cam = surface.camera;
    if (player.cam === 'helmet') {
        cam.position.set(player.pos.x, player.pos.y + 1.66, player.pos.z);
        cam.rotation.set(surface.pitch, surface.yaw, 0, 'YXZ');
        return;
    }
    const pitch = Math.max(-0.35, Math.min(1.1, surface.pitch + 0.25));
    const dist = 4.2;
    plCamPos.set(Math.sin(surface.yaw) * Math.cos(pitch) * dist, Math.sin(pitch) * dist + 1.5, Math.cos(surface.yaw) * Math.cos(pitch) * dist).add(player.pos);
    const gy = surface.site.heightFn(plCamPos.x, plCamPos.z) + 0.4;
    if (plCamPos.y < gy) plCamPos.y = gy;
    cam.position.lerp(plCamPos, 0.35);
    plLook.set(player.pos.x, player.pos.y + 1.35, player.pos.z);
    cam.lookAt(plLook);
}

function updatePlayer(dt) {
    const n = Math.ceil(dt / 0.02);
    for (let i = 0; i < n; i++) stepPlayer(dt / n);
    animatePlayerModel(dt);
    placePlayerCamera();
    updateVisor(dt);
    updatePlayHud(false);
    plBreath(dt);
}

/* ------------------------------ HUD de juego ------------------------------ */
const plDom = {
    hud: document.getElementById('play-hud'),
    alt: document.getElementById('play-alt'),
    air: document.getElementById('play-air'),
    best: document.getElementById('play-best'),
    speed: document.getElementById('play-speed'),
    wind: document.getElementById('play-wind'),
    weight: document.getElementById('play-weight'),
    hint: document.getElementById('play-hint'),
    visor: document.getElementById('visor'),
    visorData: document.getElementById('visor-data'),
    camBtn: document.getElementById('play-cam'),
    gear: document.getElementById('play-gear'),
    settings: document.getElementById('play-settings'),
    charge: document.getElementById('play-charge')
};
const plFmt = (v, d = 1) => v.toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d });

function plWeightText() {
    const g = player.phys.g, suit = player.phys.suit !== false;
    const kgf = (m) => m * g / 9.81;
    const me = kgf(PL_BODY);
    const meTxt = me < 1 ? `${plFmt(me * 1000, 0)} g` : `${plFmt(me, me < 10 ? 1 : 0)} kg`;
    return suit ? `Pesas ${meTxt} (en la Tierra ${PL_BODY} kg) · con traje ${plFmt(kgf(PL_BODY + PL_SUIT), 1)} kg` : `Pesas ${PL_BODY} kg: es tu casa`;
}
function plHintText() {
    const g = player.phys.g;
    const h = PL_V0 * PL_V0 / (2 * g), tAir = 2 * PL_V0 / g;
    const air = tAir < 60 ? `${plFmt(tAir)} s` : `${plFmt(tAir / 60)} min`;
    const hh = h < 100 ? `${plFmt(h, h < 1 ? 2 : 1)} m` : `${plFmt(h, 0)} m`;
    const hMax = Math.pow(PL_V0 * 1.6, 2) / (2 * g);
    return `Un salto como en la Tierra (0.34 m) aquí sube ${hh} y dura ${air} en el aire. Cargado al máximo: ${hMax < 100 ? plFmt(hMax, 1) : plFmt(hMax, 0)} m.`;
}

let plHudT = 0;
function updatePlayHud(force) {
    plHudT += 1;
    if (!force && plHudT % 6) return;
    const ground = surface.site.heightFn(player.pos.x, player.pos.z);
    const h = Math.max(0, player.pos.y - ground);
    plDom.alt.textContent = `${plFmt(h, h < 10 ? 2 : 0)} m`;
    plDom.air.textContent = player.onGround ? (player.lastAir ? `${plFmt(player.lastAir)} s` : '—') : `${plFmt(player.air)} s`;
    plDom.best.textContent = player.best ? `${plFmt(player.best, player.best < 10 ? 2 : 0)} m` : '—';
    plDom.speed.textContent = `${plFmt(player.vel.length())} m/s`;
    const w = player.wind.length();
    plDom.wind.textContent = player.phys.rho ? `${plFmt(w, 0)} m/s · ${plFmt(player.windF, player.windF < 10 ? 1 : 0)} N` : 'sin aire';
    if (plDom.visorData) {
        const s = SURFACE_SITES[surface.id];
        plDom.visorData.textContent = `O₂ 98 %\nTRAJE 0.3 bar\nEXT ${s.temp.split(' (')[0]}\ng ${plFmt(player.phys.g, 2)} m/s²\nALT ${plFmt(h, 1)} m`;
    }
}

/* ------------------------------ visor del casco ------------------------------ */
let plFog = 0;
function syncPlayerCam() {
    const helmetView = player.cam === 'helmet' && player.phys.suit !== false;
    if (plDom.visor) plDom.visor.hidden = !(surface.active && helmetView);
    if (plDom.camBtn) plDom.camBtn.textContent = player.cam === 'helmet' ? 'VISTA: CASCO' : 'VISTA: 3ª PERSONA';
    document.querySelectorAll('input[name="play-cam-mode"]').forEach(r => { r.checked = r.value === player.cam; });
}
function setPlayerCam(mode) {
    player.cam = mode;
    try { localStorage.setItem(PL_CAM_KEY, mode); } catch (e) { /* sin almacenamiento */ }
    if (mode === 'third') surface.camera.position.set(player.pos.x, player.pos.y + 2, player.pos.z + 4);
    syncPlayerCam();
}
function updateVisor(dt) {
    if (!plDom.visor || plDom.visor.hidden) return;
    // el vidrio se empaña un poco al respirar fuerte (correr o saltar) y se aclara solo
    const effort = Math.min(1, player.vel.length() / 3 + (player.onGround ? 0 : 0.3));
    plFog += ((effort * 0.5) - plFog) * Math.min(1, dt * 0.8);
    plDom.visor.style.setProperty('--fog', plFog.toFixed(3));
}

// Respiración dentro del casco: ruido suave filtrado, más rápida si corres.
let plBreathNode = null, plBreathT = 0;
function plBreath(dt) {
    const want = surface.active && player.cam === 'helmet' && player.phys.suit !== false && audioEngine.isPlaying && audioEngine.ctx;
    if (!want) { if (plBreathNode) { plBreathNode.g.gain.setTargetAtTime(0, audioEngine.ctx.currentTime, 0.2); const n = plBreathNode; plBreathNode = null; setTimeout(() => { try { n.src.stop(); } catch (e) { /* ya detenido */ } }, 800); } return; }
    const ctx = audioEngine.ctx;
    if (!plBreathNode) {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
        const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 900; bp.Q.value = 0.7;
        const g = ctx.createGain(); g.gain.value = 0;
        src.connect(bp); bp.connect(g); g.connect(audioEngine.output()); src.start();
        plBreathNode = { src, bp, g };
    }
    const rate = 0.25 + Math.min(1, player.vel.length() / 3) * 0.35; // respiraciones por segundo
    plBreathT += dt * rate;
    const ph = plBreathT % 1;
    const env = ph < 0.4 ? Math.sin(ph / 0.4 * Math.PI) : ph < 0.5 ? 0 : Math.sin((ph - 0.5) / 0.4 * Math.PI) * 0.8;
    plBreathNode.g.gain.setTargetAtTime(Math.max(0, env) * 0.05, ctx.currentTime, 0.05);
    plBreathNode.bp.frequency.setTargetAtTime(ph < 0.5 ? 1100 : 700, ctx.currentTime, 0.1);
}

/* ------------------------------ salto cargado ------------------------------ */
// Apretar y soltar: hasta 0.9 s de carga da 1.6 veces la velocidad (×2.56 de altura).
const PL_CHARGE_MAX = 0.9, PL_CHARGE_MUL = 1.6;
function plChargeStart() { if (surface.active && player.chargeAt == null) player.chargeAt = performance.now(); }
function plChargeLevel() { return player.chargeAt == null ? 0 : Math.min(1, (performance.now() - player.chargeAt) / 1000 / PL_CHARGE_MAX); }
function plChargeRelease() {
    if (player.chargeAt == null) return;
    const k = plChargeLevel();
    player.chargeAt = null;
    if (surface.active && player.onGround) player.jumpQueued = PL_V0 * (1 + (PL_CHARGE_MUL - 1) * k);
}

/* ------------------------------ controles ------------------------------ */
(() => {
    // teclado: espacio salta (sin hacer clic en botones enfocados), V cambia la vista, Q propulsor
    window.addEventListener('keydown', (e) => {
        if (!surface.active || e.target.closest('input, textarea, select')) return;
        const key = e.key.toLowerCase();
        if (key === ' ' || key.startsWith('arrow')) e.preventDefault();
        if (key === ' ' && !e.repeat) plChargeStart();
        if (key === 'q') player.jetHeld = true;
        if (key === 'v' && !e.repeat) setPlayerCam(player.cam === 'helmet' ? 'third' : 'helmet');
    }, true);
    // si la ventana pierde el foco no llega el keyup: se cancela la carga
    window.addEventListener('blur', () => { player.chargeAt = null; player.jetHeld = false; });
    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        if (key === ' ') plChargeRelease();
        if (key === 'q') player.jetHeld = false;
    });

    // joystick táctil
    const joy = document.getElementById('play-joy'), knob = document.getElementById('play-joy-knob');
    if (joy) {
        let id = null;
        const move = (e) => {
            const r = joy.getBoundingClientRect(), R = r.width / 2;
            let x = (e.clientX - r.left - R) / R, y = (e.clientY - r.top - R) / R;
            const l = Math.hypot(x, y); if (l > 1) { x /= l; y /= l; }
            player.joy.x = x; player.joy.y = y;
            knob.style.transform = `translate(${x * R * 0.55}px, ${y * R * 0.55}px)`;
        };
        joy.addEventListener('pointerdown', (e) => { e.preventDefault(); id = e.pointerId; joy.setPointerCapture(id); move(e); });
        joy.addEventListener('pointermove', (e) => { if (e.pointerId === id) move(e); });
        const end = () => { id = null; player.joy.x = player.joy.y = 0; knob.style.transform = ''; };
        ['pointerup', 'pointercancel'].forEach(ev => joy.addEventListener(ev, end));
    }
    const hold = (elId, on, off) => {
        const b = document.getElementById(elId); if (!b) return;
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); on(); });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, off));
    };
    hold('play-jump', () => { plChargeStart(); surface.keys.add(' '); }, () => { plChargeRelease(); surface.keys.delete(' '); });
    hold('play-jet', () => { player.jetHeld = true; }, () => { player.jetHeld = false; });

    plDom.camBtn?.addEventListener('click', () => setPlayerCam(player.cam === 'helmet' ? 'third' : 'helmet'));
    plDom.gear?.addEventListener('click', () => {
        const open = plDom.settings.hidden;
        plDom.settings.hidden = !open;
        plDom.gear.setAttribute('aria-expanded', String(open));
        if (open) {
            let pref = null; try { pref = localStorage.getItem('eh.landMode'); } catch (e) { /* sin almacenamiento */ }
            document.querySelectorAll('input[name="play-land-mode"]').forEach(r => { r.checked = r.value === (pref || 'ask'); });
            document.querySelectorAll('input[name="play-skin"]').forEach(r => { r.checked = !!window.surfaceGame && r.value === surfaceGame.skin; });
            syncPlayerCam();
        }
    });
    document.querySelectorAll('input[name="play-cam-mode"]').forEach(r => r.addEventListener('change', () => setPlayerCam(r.value)));
    document.querySelectorAll('input[name="play-land-mode"]').forEach(r => r.addEventListener('change', () => {
        try { if (r.value === 'ask') localStorage.removeItem('eh.landMode'); else localStorage.setItem('eh.landMode', r.value); } catch (e) { /* sin almacenamiento */ }
    }));
})();
