/* -------------------------------------------------------------------------- */
/* SUPERFICIE JUGABLE: FÍSICA RAPIER + ASTRONAUTA ANIMADO + COHETE              */
/* -------------------------------------------------------------------------- */
// Corre como módulo y usa lo que dejan los scripts de js/ (surface, player, biomes)
// en tiempo de ejecución. La física del cuerpo (g, aire, viento, propulsor) es la misma
// de js/surface/player.js; aquí se agregan choques reales, el modelo y el cohete.
import RAPIER from '@dimforge/rapier3d-compat';

const THREE = window.THREE;
const MODELS = { rana: 'assets/models/astro-rana.glb', conejo: 'assets/models/astro-conejo.glb', flamenco: 'assets/models/astro-flamenco.glb' };
const ROCKET_URL = 'assets/models/cohete.glb';
const ROCKET_H = 11;          // m de alto del cohete
const ASTRO_H = 1.75;         // m de alto del astronauta
const CAP_HALF = 0.5, CAP_R = 0.35; // cápsula del personaje (alto total ≈ 1.7 m)
const SHIP_AT = { x: 7, z: -6 };    // dónde se posa el cohete (cerca del punto de llegada)

const game = {
    ready: false, active: false, phase: 'off', t: 0, id: null,
    world: null, kcc: null, body: null, col: null,
    astro: null, mixer: null, actions: {}, current: null,
    ship: null, shipParts: null, samples: [], got: 0, props: [],
    skin: 'rana', prompt: null
};
try { const s = localStorage.getItem('eh.skin'); if (MODELS[s]) game.skin = s; } catch (e) { /* sin almacenamiento */ }

/* ------------------------------ carga ------------------------------ */
const loader = new THREE.GLTFLoader();
const loadGLB = (url) => new Promise((res, rej) => loader.load(url, res, undefined, rej));
const cache = {};
async function getModel(url) {
    if (!cache[url]) cache[url] = loadGLB(url);
    return cache[url];
}

async function boot() {
    await RAPIER.init();
    await Promise.all([getModel(MODELS[game.skin]), getModel(ROCKET_URL)]);
    game.ready = true;
}
boot().catch((e) => console.warn('Superficie: sin física avanzada', e));

/* ------------------------------ astronauta ------------------------------ */
async function buildAstronaut() {
    const gltf = await getModel(MODELS[game.skin]);
    const root = THREE.SkeletonUtils.clone(gltf.scene);
    root.traverse(o => {
        if (/pistol|gun|weapon/i.test(o.name)) o.visible = false; // sin armas: es un explorador
        if (o.isMesh) {
            o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false;
            // un poco de luz propia: sin cielo que ilumine, de espaldas al Sol el traje se vería negro
            o.material = o.material.clone();
            if (o.material.map) { o.material.emissiveMap = o.material.map; o.material.emissive = new THREE.Color(0.32, 0.32, 0.34); }
        }
    });
    // escalar a 1.75 m y apoyar los pies en y = 0. Se mide la malla ya deformada por el
    // esqueleto (setFromObject preciso): el modelo viene de FBX con huesos en centímetros.
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root, true);
    const h = box.max.y - box.min.y;
    const wrap = new THREE.Group();
    root.scale.multiplyScalar(ASTRO_H / h);
    root.position.y = -box.min.y * (ASTRO_H / h);
    root.rotation.y = Math.PI; // el modelo mira a +z; el juego usa −z como frente
    wrap.add(root);
    const mixer = new THREE.AnimationMixer(root);
    const actions = {};
    gltf.animations.forEach(clip => {
        const name = clip.name.split('|').pop();
        actions[name] = mixer.clipAction(clip);
    });
    ['Jump', 'Jump_Land'].forEach(n => { if (actions[n]) { actions[n].setLoop(THREE.LoopOnce); actions[n].clampWhenFinished = true; } });
    return { wrap, mixer, actions };
}

function play(name, fade = 0.18, speed = 1) {
    const a = game.actions[name];
    if (!a) return;
    a.timeScale = speed;
    if (game.current === name) return;
    const prev = game.actions[game.current];
    a.reset().fadeIn(fade).play();
    if (prev) prev.fadeOut(fade);
    game.current = name;
}

/* ------------------------------ cohete ------------------------------ */
async function buildShip() {
    const gltf = await getModel(ROCKET_URL);
    const model = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const tall = Math.max(size.x, size.y, size.z);
    // si viene acostado (eje z más largo), se pone de pie
    if (size.z === tall) model.rotation.x = -Math.PI / 2;
    const box2 = new THREE.Box3().setFromObject(model);
    const k = ROCKET_H / (box2.max.y - box2.min.y);
    model.scale.multiplyScalar(k);
    const box3 = new THREE.Box3().setFromObject(model);
    model.position.y -= box3.min.y;
    model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    const group = new THREE.Group();
    group.add(model);
    const R = Math.max(box3.max.x - box3.min.x, box3.max.z - box3.min.z) * 0.22; // radio del cuerpo
    // escotilla y rampa (en el costado que mira al punto de llegada)
    const hatchY = ROCKET_H * 0.27;
    const hatch = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.8, 0.12), new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.5, metalness: 0.4 }));
    const hatchPivot = new THREE.Group();
    hatchPivot.position.set(0, hatchY - 0.9, R + 0.05);
    hatch.position.set(0, 0.9, 0);
    hatchPivot.add(hatch);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 1.7), new THREE.MeshBasicMaterial({ color: 0xffe2a8, transparent: true, opacity: 0 }));
    glow.position.set(0, hatchY, R + 0.02);
    const rampLen = Math.hypot(hatchY - 0.9, 3.2);
    const rampPivot = new THREE.Group();
    rampPivot.position.set(0, hatchY - 0.95, R + 0.1);
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.08, rampLen), new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.6, metalness: 0.5 }));
    ramp.position.set(0, 0, rampLen / 2);
    ramp.castShadow = ramp.receiveShadow = true;
    rampPivot.add(ramp);
    group.add(hatchPivot, glow, rampPivot);
    // llama y polvo
    const flame = new THREE.Group();
    const core = makeGlowSprite(0xfff1c2, 3.5, 0), outer = makeGlowSprite(0xff7a2a, 8, 0);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.9, 6, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffb35a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    cone.rotation.x = Math.PI; cone.position.y = -2.6;
    flame.add(core, outer, cone);
    flame.position.y = 0.3;
    group.add(flame);
    const rampAngle = Math.atan2(hatchY - 0.95, 3.2);
    return { group, hatchPivot, rampPivot, rampAngle, glow, flame, core, outer, cone, R, hatchY, rampLen };
}

// Polvo levantado por el motor (anillo que se expande).
function buildDust(color) {
    const n = 900, pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), life = new Float32Array(n);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(g, new THREE.PointsMaterial({ color, size: 0.9, transparent: true, opacity: 0.55, depthWrite: false, map: roundDotTexture }));
    pts.frustumCulled = false;
    let spawn = 0;
    const update = (dt, rate, at, gGrav, airy) => {
        spawn += rate * dt;
        for (let i = 0; i < n; i++) {
            const j = i * 3;
            if (life[i] <= 0 && spawn >= 1) {
                spawn -= 1; life[i] = 1;
                const a = Math.random() * 6.283, sp = 6 + Math.random() * 14;
                pos[j] = at.x + Math.cos(a) * 1.5; pos[j + 1] = at.y + 0.3; pos[j + 2] = at.z + Math.sin(a) * 1.5;
                vel[j] = Math.cos(a) * sp; vel[j + 1] = 1 + Math.random() * 4; vel[j + 2] = Math.sin(a) * sp;
            }
            if (life[i] > 0) {
                life[i] -= dt * (airy ? 0.5 : 0.8);
                // sin aire el polvo vuela en parábolas limpias; con aire se frena y flota
                const drag = airy ? Math.exp(-dt * 1.5) : 1;
                vel[j] *= drag; vel[j + 2] *= drag; vel[j + 1] = vel[j + 1] * drag - gGrav * dt;
                pos[j] += vel[j] * dt; pos[j + 1] = Math.max(at.y - 1, pos[j + 1] + vel[j + 1] * dt); pos[j + 2] += vel[j + 2] * dt;
            } else pos[j + 1] = -9999;
        }
        g.attributes.position.needsUpdate = true;
    };
    return { pts, update };
}

/* ------------------------------ mundo físico ------------------------------ */
const HF_SIZE = 600, HF_N = 240;
function buildWorld(built, g) {
    const world = new RAPIER.World({ x: 0, y: -g, z: 0 });
    // terreno: heightfield por columnas; en Rapier las filas van por z y las columnas por x
    // (comprobado con rayos contra heightFn)
    const n = HF_N, step = HF_SIZE / n;
    const heights = new Float32Array((n + 1) * (n + 1));
    for (let c = 0; c <= n; c++) for (let r = 0; r <= n; r++) {
        const x = -HF_SIZE / 2 + c * step, z = -HF_SIZE / 2 + r * step;
        heights[c * (n + 1) + r] = built.heightFn(x, z);
    }
    world.createCollider(RAPIER.ColliderDesc.heightfield(n, n, heights, { x: HF_SIZE, y: 1, z: HF_SIZE }).setFriction(0.9));
    (built.colliders || []).forEach(c => {
        if (Math.hypot(c.x, c.z) > HF_SIZE / 2) return;
        const d = c.t === 'ball' ? RAPIER.ColliderDesc.ball(c.r) : RAPIER.ColliderDesc.cylinder(c.h / 2, c.r);
        world.createCollider(d.setTranslation(c.x, c.y, c.z));
    });
    return world;
}

/* ------------------------------ muestras y rocas sueltas ------------------------------ */
function sampleColor(id) { return { moon: 0x9fd8ff, mars: 0xff8a5c, venus: 0xffd27a, earth: 0x86efac, titan: 0xffb36b, europa: 0xa5f3fc, io: 0xfde047 }[id] || 0xc4b5fd; }
function buildSamples(built, id) {
    const rnd = surfRng(4242 + id.length * 7);
    const list = [];
    const color = sampleColor(id);
    for (let i = 0; i < 5; i++) {
        const a = rnd() * 6.283, d = 22 + rnd() * 70;
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        const g = new THREE.Group();
        const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, roughness: 0.25, metalness: 0.2 }));
        gem.castShadow = true;
        const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 30, 6, 1, true), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending }));
        beacon.position.y = 15;
        g.add(gem, beacon, makeGlowSprite(color, 2.2, 0.8));
        g.position.set(x, built.heightFn(x, z) + 0.6, z);
        list.push({ g, gem, got: false });
    }
    return list;
}

function buildProps(world, built, id) {
    // rocas sueltas que se pueden patear: con poca gravedad vuelan lejos
    const rnd = surfRng(99 + id.length);
    const [lo] = built.site.ground;
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(lo[0] * 1.1, lo[1] * 1.1, lo[2] * 1.1), roughness: 0.95 });
    const props = [];
    for (let i = 0; i < 14; i++) {
        const a = rnd() * 6.283, d = 4 + rnd() * 22, r = 0.18 + rnd() * 0.3;
        const x = Math.cos(a) * d, z = Math.sin(a) * d, y = built.heightFn(x, z) + r + 0.05;
        const geo = new THREE.IcosahedronGeometry(r, 1);
        const p = geo.attributes.position;
        for (let k = 0; k < p.count; k++) { const s = 0.8 + rnd() * 0.35; p.setXYZ(k, p.getX(k) * s, p.getY(k) * s * 0.85, p.getZ(k) * s); }
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = mesh.receiveShadow = true;
        const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z).setLinearDamping(built.site.fog ? 0.6 : 0.02).setAngularDamping(0.3));
        world.createCollider(RAPIER.ColliderDesc.ball(r * 0.9).setDensity(2.6).setRestitution(0.35).setFriction(0.8), body);
        props.push({ mesh, body });
    }
    return props;
}

/* ------------------------------ entrar / salir ------------------------------ */
const sunOffset = new THREE.Vector3();
async function enter(id, opts = {}) {
    const built = surface.site;
    const ph = PHYS[id] || { g: 1.62 };
    game.id = id;
    if (game.world) { game.world.free(); game.world = null; }
    const world = buildWorld(built, ph.g);
    game.world = world;
    // personaje
    const sx = SHIP_AT.x, sz = SHIP_AT.z;
    const start = new THREE.Vector3(sx, built.heightFn(sx, sz + 4.8), sz + 4.8);
    game.body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(start.x, start.y + CAP_HALF + CAP_R + 0.05, start.z));
    game.col = world.createCollider(RAPIER.ColliderDesc.capsule(CAP_HALF, CAP_R).setFriction(0.5), game.body);
    game.kcc = world.createCharacterController(0.03);
    game.kcc.enableAutostep(0.45, 0.25, false);
    game.kcc.enableSnapToGround(0.35);
    game.kcc.setMaxSlopeClimbAngle(48 * Math.PI / 180);
    game.kcc.setMinSlopeSlideAngle(55 * Math.PI / 180);
    game.kcc.setApplyImpulsesToDynamicBodies(true);
    game.kcc.setCharacterMass(PL_BODY + (ph.suit === false ? 0 : PL_SUIT));
    // modelo
    const a = await buildAstronaut();
    game.astro = a.wrap; game.mixer = a.mixer; game.actions = a.actions; game.current = null;
    surface.scene.add(game.astro);
    if (plModel) { plModel.root.visible = false; plModel.root.userData.hidden = true; }
    // cohete
    const ship = await buildShip();
    game.ship = ship;
    ship.group.position.set(sx, built.heightFn(sx, sz), sz);
    ship.group.rotation.y = 0;
    surface.scene.add(ship.group);
    world.createCollider(RAPIER.ColliderDesc.cylinder(ROCKET_H / 2, ship.R).setTranslation(sx, ship.group.position.y + ROCKET_H / 2, sz));
    game.dust = buildDust(new THREE.Color(...built.site.ground[1]));
    surface.scene.add(game.dust.pts);
    // muestras y rocas
    game.samples = buildSamples(built, id); game.got = 0;
    game.samples.forEach(s => surface.scene.add(s.g));
    game.props = buildProps(world, built, id);
    game.props.forEach(p => surface.scene.add(p.mesh));
    // sombras del Sol que siguen al jugador
    game.sun = built.root.children.find(o => o.isDirectionalLight);
    if (game.sun) {
        sunOffset.copy(game.sun.position).normalize().multiplyScalar(80);
        game.sun.castShadow = true;
        const s = game.sun.shadow;
        s.mapSize.set(2048, 2048);
        Object.assign(s.camera, { left: -28, right: 28, top: 28, bottom: -28, near: 1, far: 220 });
        s.camera.updateProjectionMatrix();
        s.bias = -0.0006; s.normalBias = 0.03;
        surface.scene.add(game.sun.target);
    }
    built.root.traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === 'PlaneGeometry' && o.geometry.parameters.width === SURF_NEAR) o.receiveShadow = true; if (o.isInstancedMesh) { o.castShadow = true; o.receiveShadow = true; } });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // estado
    Object.assign(player, { onGround: true, best: 0, lastAir: 0, air: 0 });
    player.pos.copy(start); player.vel.set(0, 0, 0);
    player.facing = 0;
    surface.yaw = Math.PI * 0.15; surface.pitch = 0.1;
    game.active = true;
    game.t = 0;
    setMission();
    if (opts.landing) startLanding();
    else { setShipOpen(1); game.phase = 'play'; game.astro.visible = true; }
}

function exit() {
    game.active = false;
    game.phase = 'off';
    if (game.world) { game.world.free(); game.world = null; }
    [game.astro, game.ship && game.ship.group, game.dust && game.dust.pts].forEach(o => o && surface.scene.remove(o));
    game.samples.forEach(s => surface.scene.remove(s.g));
    game.props.forEach(p => surface.scene.remove(p.mesh));
    game.samples = []; game.props = [];
    renderer.shadowMap.enabled = false;
    hidePrompt();
    const box = document.getElementById('play-mission'); if (box) box.hidden = true;
}

/* ------------------------------ cinemáticas ------------------------------ */
function setShipOpen(k) {
    const s = game.ship;
    s.hatchPivot.rotation.x = k * 1.5;
    s.rampPivot.rotation.x = (1 - k) * -Math.PI / 2 + k * s.rampAngle;
    s.glow.material.opacity = k * 0.9;
}
function setFlame(k) {
    const s = game.ship;
    s.core.material.opacity = k; s.outer.material.opacity = k * 0.7; s.cone.material.opacity = k * 0.55;
    s.cone.scale.set(1, 0.6 + k * 0.6 + Math.random() * 0.15 * k, 1);
}
function startLanding() {
    game.phase = 'landing'; game.t = 0;
    game.astro.visible = false;
    setShipOpen(0);
    showSkip(true);
}
function startTakeoff() {
    game.phase = 'board'; game.t = 0;
    hidePrompt();
    showSkip(true);
}

const LAND_T = 8, OPEN_T = 1.6, WALK_T = 2.6, BOARD_T = 1.6, LIFT_T = 4.5;
const camTmp = new THREE.Vector3(), look = new THREE.Vector3();
function cinematic(dt) {
    const s = game.ship, base = s.group.position, cam = surface.camera;
    const gy = surface.site.heightFn(base.x, base.z);
    const airy = !!surface.site.site.fog;
    const g = (PHYS[game.id] || { g: 1.62 }).g;
    game.t += dt;
    if (game.phase === 'landing') {
        // descenso propulsado que frena al final (velocidad ∝ altura)
        const k = Math.min(1, game.t / LAND_T);
        const h = 260 * Math.pow(1 - k, 2.6);
        base.y = gy + h;
        setFlame(k < 0.98 ? 0.6 + 0.4 * Math.min(1, (1 - k) * 4) : 0);
        game.dust.update(dt, h < 40 ? (40 - h) * 22 : 0, { x: base.x, y: gy, z: base.z }, g, airy);
        // primero acompaña al cohete desde cerca; los últimos metros, desde el suelo mirando hacia arriba
        const near = Math.min(1, Math.max(0, (60 - h) / 50));
        camTmp.set(base.x + 12 + near * 10, (base.y + ROCKET_H * 0.4) * (1 - near) + (gy + 3) * near, base.z + 16 + near * 10);
        cam.position.lerp(camTmp, game.t < 0.1 ? 1 : 0.1);
        look.set(base.x, base.y + ROCKET_H * 0.45, base.z);
        cam.lookAt(look);
        if (!reduceMotion.matches && h < 25 && h > 0.5) { cam.position.x += (Math.random() - 0.5) * 0.15; cam.position.y += (Math.random() - 0.5) * 0.15; }
        if (k >= 1) { game.phase = 'open'; game.t = 0; base.y = gy; audioEngine.playClickTone(180, 0.1); }
    } else if (game.phase === 'open') {
        setFlame(0);
        game.dust.update(dt, 0, { x: base.x, y: gy, z: base.z }, g, airy);
        setShipOpen(Math.min(1, game.t / OPEN_T));
        camTmp.set(base.x + 9, gy + 3.2, base.z + 12);
        cam.position.lerp(camTmp, 0.06);
        look.set(base.x, gy + s.hatchY - 0.5, base.z + s.R);
        cam.lookAt(look);
        if (game.t >= OPEN_T) { game.phase = 'walkout'; game.t = 0; game.astro.visible = true; }
    } else if (game.phase === 'walkout') {
        // baja por la rampa hasta el suelo
        const k = Math.min(1, game.t / WALK_T);
        const top = new THREE.Vector3(base.x, gy + s.hatchY - 0.9, base.z + s.R + 0.3);
        const bottom = new THREE.Vector3(base.x, surface.site.heightFn(base.x, base.z + s.R + 3.6), base.z + s.R + 3.6);
        player.pos.lerpVectors(top, bottom, k);
        player.facing = Math.PI; // de frente hacia la cámara (+z)
        game.astro.position.copy(player.pos);
        game.astro.rotation.y = player.facing;
        play('Walk', 0.2, 0.9);
        camTmp.set(base.x + 6, gy + 2.6, base.z + s.R + 9);
        cam.position.lerp(camTmp, 0.05);
        look.copy(player.pos).add(new THREE.Vector3(0, 1.1, 0));
        cam.lookAt(look);
        if (k >= 1) toPlay(bottom);
    } else if (game.phase === 'board') {
        // camina hasta la rampa y entra
        const k = Math.min(1, game.t / BOARD_T);
        const door = new THREE.Vector3(base.x, gy + s.hatchY - 0.9, base.z + s.R + 0.3);
        player.pos.lerp(door, 1 - Math.pow(1 - k, 2));
        game.astro.position.copy(player.pos);
        game.astro.rotation.y = 0;
        play('Walk', 0.2, 1);
        if (k >= 1) { game.astro.visible = false; game.phase = 'lift'; game.t = 0; audioEngine.playClickTone(140, 0.12); }
    } else if (game.phase === 'lift') {
        const k = Math.min(1, game.t / LIFT_T);
        setShipOpen(Math.max(0, 1 - k * 4));
        setFlame(Math.min(1, k * 3));
        base.y = gy + Math.pow(Math.max(0, k - 0.15), 2) * 320;
        game.dust.update(dt, k < 0.6 ? 500 : 0, { x: base.x, y: gy, z: base.z }, g, airy);
        camTmp.set(base.x + 24, gy + 5, base.z + 26);
        cam.position.lerp(camTmp, 0.05);
        look.set(base.x, base.y + ROCKET_H * 0.5, base.z);
        cam.lookAt(look);
        if (k >= 1) { game.phase = 'gone'; showSkip(false); exitSurface(); }
    }
    game.mixer && game.mixer.update(dt);
}
function toPlay(at) {
    game.phase = 'play';
    showSkip(false);
    game.body.setNextKinematicTranslation({ x: at.x, y: at.y + CAP_HALF + CAP_R + 0.05, z: at.z });
    game.body.setTranslation({ x: at.x, y: at.y + CAP_HALF + CAP_R + 0.05, z: at.z }, true);
    player.pos.copy(at); player.vel.set(0, 0, 0); player.onGround = true;
    surface.yaw = Math.PI * 0.15; surface.pitch = 0.1;
    if (typeof showToast === 'function') showToast(`Misión: encuentra las 5 muestras brillantes (sigue los rayos de luz). Mantén Espacio para saltar más alto · E para recoger.`);
}
function skipCinematic() {
    if (!game.active) return;
    if (game.phase === 'landing' || game.phase === 'open' || game.phase === 'walkout') {
        const s = game.ship, base = s.group.position;
        base.y = surface.site.heightFn(base.x, base.z);
        setFlame(0); setShipOpen(1); game.astro.visible = true;
        toPlay(new THREE.Vector3(base.x, surface.site.heightFn(base.x, base.z + s.R + 3.6), base.z + s.R + 3.6));
    } else if (game.phase === 'board' || game.phase === 'lift') {
        game.phase = 'gone'; showSkip(false); exitSurface();
    }
}

/* ------------------------------ física del jugador ------------------------------ */
const wish = new THREE.Vector3(), fwd = new THREE.Vector3(), right = new THREE.Vector3(), rel = new THREE.Vector3();
function stepBody(dt) {
    const k = surface.keys, ph = player.phys, g = ph.g, rho = ph.rho || 0;
    const mass = PL_BODY + (ph.suit === false ? 0 : PL_SUIT);
    const run = k.has('shift');
    const mf = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0) - player.joy.y;
    const mr = (k.has('d') ? 1 : 0) - (k.has('a') ? 1 : 0) + player.joy.x;
    if (k.has('arrowleft')) surface.yaw += dt * 1.6;
    if (k.has('arrowright')) surface.yaw -= dt * 1.6;
    fwd.set(-Math.sin(surface.yaw), 0, -Math.cos(surface.yaw));
    right.set(-fwd.z, 0, fwd.x);
    wish.set(0, 0, 0).addScaledVector(fwd, mf).addScaledVector(right, mr);
    const wl = Math.min(1, wish.length());
    if (wl > 0.01) wish.normalize();
    // viento (mismo modelo que js/surface/player.js)
    const t = performance.now() / 1000;
    if (ph.wind) {
        const [b, gust] = ph.wind;
        const sp = b + gust * Math.max(0, fbm2D(t * 0.15, 3.1, 3) - 0.35) * 1.6, dir = 0.6 + (fbm2D(t * 0.02, 9.7, 2) - 0.5) * 1.2;
        player.wind.set(Math.cos(dir) * sp, 0, Math.sin(dir) * sp);
    } else player.wind.set(0, 0, 0);
    player.wind.add(player.gust);
    const { walk, run: runV } = plWalkSpeeds(g);
    const target = wl * (run ? runV : walk);
    if (player.onGround) {
        const acc = Math.max(0.25, Math.min(14, 0.9 * g + 0.3));
        const hx = player.vel.x, hz = player.vel.z;
        const dx = wish.x * target - hx, dz = wish.z * target - hz, dl = Math.hypot(dx, dz);
        if (dl > 0) { const s = Math.min(1, acc * dt / dl); player.vel.x += dx * s; player.vel.z += dz * s; }
        if (wl > 0.01) player.facing = Math.atan2(-wish.x, -wish.z);
        let jump = 0;
        if (player.jumpQueued) jump = player.jumpQueued;
        else if (run && wl > 0.3 && g < 2.5 && Math.hypot(player.vel.x, player.vel.z) > runV * 0.6) jump = Math.min(PL_V0, 0.55 * Math.sqrt(g) + 0.15);
        if (jump > 0) {
            player.vel.y = jump; player.onGround = false; player.jumped = true;
            player.air = 0; player.takeoffY = player.pos.y; player.peak = player.pos.y;
            if (player.jumpQueued) { audioEngine.playClickTone(260 + (player.jumpQueued / PL_V0 - 1) * 400, 0.05); play('Jump', 0.08); }
            player.jumpQueued = 0;
        }
    }
    let ax = 0, ay = -g, az = 0;
    rel.copy(player.vel).sub(player.wind);
    const rl = rel.length();
    player.windF = 0.5 * rho * PL_CD_A * player.wind.lengthSq();
    if (rho > 0 && rl > 0) { const a = 0.5 * rho * PL_CD_A * rl / mass; ax -= a * rel.x; ay -= a * rel.y; az -= a * rel.z; }
    player.jetting = !player.onGround && player.jetHeld && ph.suit !== false;
    if (player.jetting) ay -= PL_JET;
    player.flapping = !player.onGround && k.has(' ') && rho > 2;
    if (player.flapping) { ay += Math.min(4, 0.34 * rho); ax += wish.x * 0.8; az += wish.z * 0.8; }
    if (player.onGround) { ax = 0; az = 0; ay = -g; if (player.vel.y < 0) player.vel.y = 0; }
    player.vel.x += ax * dt; player.vel.y += ay * dt; player.vel.z += az * dt;

    // mover con choques reales
    const want = { x: player.vel.x * dt, y: player.vel.y * dt, z: player.vel.z * dt };
    game.kcc.computeColliderMovement(game.col, want);
    const m = game.kcc.computedMovement();
    const grounded = game.kcc.computedGrounded();
    const cur = game.body.translation();
    const next = { x: cur.x + m.x, y: cur.y + m.y, z: cur.z + m.z };
    // si chocó, se pierde la velocidad en esa dirección (no se "pega" a las paredes)
    if (Math.abs(m.x - want.x) > 1e-4) player.vel.x = m.x / dt;
    if (Math.abs(m.z - want.z) > 1e-4) player.vel.z = m.z / dt;
    if (m.y > want.y + 1e-4 && player.vel.y < 0) player.vel.y = 0;      // apoyado
    if (m.y < want.y - 1e-4 && player.vel.y > 0) player.vel.y = 0;      // techo
    const lim = HF_SIZE * 0.45;
    next.x = Math.max(-lim, Math.min(lim, next.x)); next.z = Math.max(-lim, Math.min(lim, next.z));
    game.body.setNextKinematicTranslation(next);
    player.pos.set(next.x, next.y - CAP_HALF - CAP_R, next.z);

    const wasAir = !player.onGround;
    if (!player.onGround) { player.air += dt; player.peak = Math.max(player.peak, player.pos.y); }
    if (grounded && player.vel.y <= 0) {
        if (wasAir) {
            const h = player.peak - player.takeoffY;
            // solo cuentan los saltos (no caerse de un borde)
            if (player.jumped && h > 0.05) { player.lastH = h; player.lastAir = player.air; player.best = Math.max(player.best, h); }
            player.jumped = false;
            if (h > 0.25) { audioEngine.playClickTone(140, 0.05); play('Jump_Land', 0.05); game.landT = 0.35; }
        }
        player.onGround = true;
    } else if (!grounded && player.onGround) { player.onGround = false; player.air = 0; player.takeoffY = player.pos.y; player.peak = player.pos.y; }
}

/* ------------------------------ animación ------------------------------ */
function animate(dt) {
    const a = game.astro;
    // los pies sobre el suelo que se ve (el de la física es un poco más grueso)
    const vis = surface.site.heightFn(player.pos.x, player.pos.z);
    const y = player.onGround && Math.abs(player.pos.y - vis) < 0.6 ? vis : player.pos.y;
    a.position.set(player.pos.x, y, player.pos.z);
    let d = player.facing - a.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
    a.rotation.y += d * Math.min(1, dt * 10);
    a.visible = player.cam === 'third';
    const hs = Math.hypot(player.vel.x, player.vel.z), g = player.phys.g;
    const low = g < 2.5 ? 0.7 : 1; // con poca gravedad todo va más lento
    game.landT = Math.max(0, (game.landT || 0) - dt);
    if (!player.onGround) play(player.vel.y > 0.3 && game.current === 'Jump' ? 'Jump' : 'Jump_Idle', 0.15, low);
    else if (game.landT > 0) { /* termina la animación de aterrizaje */ }
    else if (plChargeLevel() > 0.05) play('Duck', 0.12);
    else if (hs > 2.2) play('Run', 0.2, Math.max(0.6, hs / 4) * low);
    else if (hs > 0.15) play('Walk', 0.2, Math.max(0.5, hs / 1.4) * low);
    else play('Idle', 0.3);
    game.mixer.update(dt);
}

/* ------------------------------ objetivos ------------------------------ */
const missionDom = () => document.getElementById('play-mission');
function setMission() {
    const box = missionDom(); if (!box) return;
    box.hidden = false;
    box.textContent = `MUESTRAS ${game.got}/5`;
}
function showPrompt(text) {
    const el = document.getElementById('play-prompt'); if (!el) return;
    if (game.prompt === text) return;
    game.prompt = text; el.textContent = text; el.hidden = !text;
}
function hidePrompt() { showPrompt(''); }
function showSkip(on) { const b = document.getElementById('play-skip'); if (b) b.hidden = !on; }

function interact() {
    if (!game.active || game.phase !== 'play') return;
    const s = nearestSample();
    if (s && s.d < 2.6) {
        s.s.got = true; surface.scene.remove(s.s.g); game.got++;
        audioEngine.playClickTone(1200 + game.got * 120, 0.08);
        setMission();
        if (typeof showToast === 'function') showToast(game.got >= 5 ? '¡Misión completa! Recogiste las 5 muestras. Vuelve al cohete (E) cuando quieras.' : `Muestra ${game.got}/5 recogida.`);
        if (game.got >= 5 && typeof unlock === 'function') unlock('muestras');
        return;
    }
    if (shipDist() < 5) startTakeoff();
}
function nearestSample() {
    let best = null;
    game.samples.forEach(s => { if (s.got) return; const d = s.g.position.distanceTo(player.pos); if (!best || d < best.d) best = { s, d }; });
    return best;
}
function shipDist() { const p = game.ship.group.position; return Math.hypot(player.pos.x - p.x, player.pos.z - (p.z + game.ship.R + 2.5)); }

/* ------------------------------ por cuadro ------------------------------ */
function update(dt, time) {
    if (!game.active) return;
    game.world.timestep = Math.min(dt, 1 / 30);
    if (game.phase !== 'play') {
        cinematic(dt);
        game.world.step();
        syncProps();
        updateSun();
        return;
    }
    const n = Math.max(1, Math.ceil(dt / (1 / 60)));
    for (let i = 0; i < n; i++) { game.world.timestep = dt / n; stepBody(dt / n); game.world.step(); }
    syncProps();
    animate(dt);
    placePlayerCamera();
    updateVisor(dt);
    updatePlayHud(false);
    plBreath(dt);
    updateSun();
    // muestras: giran y avisan cuando estás cerca
    game.samples.forEach((s, i) => { if (!s.got) { s.gem.rotation.y = time * 1.5 + i; s.gem.position.y = Math.sin(time * 2 + i) * 0.12; } });
    const ns = nearestSample();
    if (ns && ns.d < 2.6) showPrompt('E · recoger muestra');
    else if (shipDist() < 5) showPrompt('E · subir al cohete y despegar');
    else hidePrompt();
}
function syncProps() {
    game.props.forEach(p => { const t = p.body.translation(), r = p.body.rotation(); p.mesh.position.set(t.x, t.y, t.z); p.mesh.quaternion.set(r.x, r.y, r.z, r.w); });
}
function updateSun() {
    if (!game.sun) return;
    const c = game.phase === 'play' ? player.pos : game.ship.group.position;
    game.sun.target.position.copy(c);
    game.sun.position.copy(c).add(sunOffset);
}

/* ------------------------------ controles ------------------------------ */
window.addEventListener('keydown', (e) => {
    if (!game.active || e.target.closest('input, textarea, select')) return;
    if (e.key.toLowerCase() === 'e' && !e.repeat) interact();
});
document.getElementById('play-use')?.addEventListener('click', interact);
document.getElementById('play-skip')?.addEventListener('click', skipCinematic);
document.querySelectorAll('input[name="play-skin"]').forEach(r => r.addEventListener('change', () => {
    if (!MODELS[r.value]) return;
    game.skin = r.value;
    try { localStorage.setItem('eh.skin', r.value); } catch (e) { /* sin almacenamiento */ }
    getModel(MODELS[r.value]).then(async () => {
        if (!game.active) return;
        const keep = game.astro;
        const a = await buildAstronaut();
        surface.scene.remove(keep);
        game.astro = a.wrap; game.mixer = a.mixer; game.actions = a.actions; game.current = null;
        surface.scene.add(game.astro);
    });
}));

// API para los scripts clásicos (js/surface/surface.js)
window.surfaceGame = {
    get ready() { return game.ready; },
    get active() { return game.active; },
    get phase() { return game.phase; },
    get skin() { return game.skin; },
    enter, exit, update, skip: skipCinematic, takeoff: () => { if (game.active && game.phase === 'play') startTakeoff(); },
    debug: game, RAPIER
};
