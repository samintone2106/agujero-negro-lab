/* -------------------------------------------------------------------------- */
/* GÉNESIS: DIRECTOR (LÍNEA DE TIEMPO, CÁMARA, SONIDO E INTERFAZ)              */
/* -------------------------------------------------------------------------- */
const GENESIS_PHASES = 6;
const GENESIS_ORDER = Object.keys(GENESIS);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const genesisSound = new GenesisSound(audioEngine);

const genesisDom = {
    card: document.getElementById('genesis-card'),
    kicker: document.getElementById('genesis-kicker'),
    clock: document.getElementById('genesis-clock'),
    phase: document.getElementById('genesis-phase'),
    step: document.getElementById('genesis-step'),
    title: document.getElementById('genesis-title'),
    text: document.getElementById('genesis-text'),
    segs: document.getElementById('genesis-segs'),
    pause: document.getElementById('genesis-pause'),
    sound: document.getElementById('genesis-sound'),
    tour: document.getElementById('genesis-tour'),
    skip: document.getElementById('genesis-skip')
};

const genesis = {
    active: false, paused: false, tour: false, target: null,
    elapsed: 0, last: 0, duration: 30000, phase: -1,
    scaled: [], fired: new Set(), shake: 0, theta: 0, flash: 0
};

const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const pulse = (at, width, x) => Math.max(0, 1 - Math.abs(x - at) / width);
const hasFx = (name) => genesis.fx.some(f => f === name);
const impactFx = () => { const f = genesis.fx.find(f => typeof f === 'object' && f.impact); return f ? f.impact : null; };

function setGenesisScale(k, lateK = k) {
    genesis.scaled.forEach(({ obj, base }) => {
        const f = obj.userData.genesisLate ? lateK : k;
        obj.scale.copy(base).multiplyScalar(Math.max(0.0001, f));
    });
}

// Ejecuta `fn` una sola vez cuando el progreso cruza `at`.
function once(key, at, prog, fn) {
    if (prog >= at && !genesis.fired.has(key)) { genesis.fired.add(key); fn(); }
}

function buildGenesisSegments() {
    genesisDom.segs.replaceChildren();
    for (let i = 0; i < GENESIS_PHASES; i++) {
        const seg = document.createElement('div');
        seg.className = 'genesis-seg';
        seg.appendChild(document.createElement('span'));
        genesisDom.segs.appendChild(seg);
    }
}
buildGenesisSegments();

function showGenesisPhase(idx) {
    const cfg = GENESIS[genesis.target];
    const step = cfg.steps[idx];
    genesisDom.step.classList.add('is-swapping');
    setTimeout(() => {
        genesisDom.phase.textContent = `FASE ${idx + 1}/${GENESIS_PHASES}`;
        genesisDom.clock.textContent = cfg.clock[idx];
        genesisDom.title.textContent = step[0];
        genesisDom.text.textContent = step[1];
        genesisDom.step.classList.remove('is-swapping');
        updateGenesisProof(genesis.target, idx);
    }, 180);
}

function syncGenesisButtons() {
    genesisDom.pause.textContent = genesis.paused ? 'SEGUIR' : 'PAUSA';
    genesisDom.pause.setAttribute('aria-pressed', String(genesis.paused));
    genesisDom.sound.textContent = audioEngine.isPlaying ? 'SONIDO ON' : 'SONIDO';
    genesisDom.sound.title = audioEngine.isPlaying ? 'Silenciar' : 'Activar sonido';
    genesisDom.sound.classList.toggle('is-off', !audioEngine.isPlaying);
    genesisDom.sound.setAttribute('aria-pressed', String(audioEngine.isPlaying));
    genesisDom.tour.textContent = genesis.tour ? 'MARATÓN ON' : 'MARATÓN';
    genesisDom.tour.setAttribute('aria-pressed', String(genesis.tour));
    genesisDom.skip.textContent = genesis.tour ? 'SIGUIENTE' : 'SALTAR';
}

function startGenesis(targetId) {
    const cfg = GENESIS[targetId];
    if (!cfg) return;
    if (genesis.active) stopGenesis(true);
    if (state.currentTarget !== targetId) switchTarget(targetId);
    const type = GENESIS_TYPES[cfg.type];
    const group = targetGroups[targetId];
    genesis.scaled = group.children
        .filter(c => !c.userData.backdrop)
        .map(obj => ({ obj, base: obj.scale.clone() }));
    const mainMesh = group.children[0];
    const R = mainMesh && mainMesh.geometry && mainMesh.geometry.parameters.radius
        ? mainMesh.geometry.parameters.radius : 2.2;

    Object.assign(genesis, {
        active: true, paused: false, target: targetId, cfg, type, typeKey: cfg.type,
        fx: cfg.fx || [], R, elapsed: 0, last: performance.now(), phase: -1,
        duration: reduceMotion.matches ? 14000 : 30000,
        fired: new Set(), shake: 0, flash: 0, baseRotZ: group.rotation.z
    });

    setupGenesisParticles(type, R, ASTRO_TARGETS[targetId].atmoColor);
    resetGenesisFx();
    genesisFx.visible = true;
    genesisFx.position.copy(group.position);
    genesisFx.rotation.set(0, 0, 0);
    lavaShell.scale.setScalar(R * 1.012);
    coreMesh.scale.setScalar(0.0001);
    hazeShell.scale.setScalar(R * 1.07);
    const hazeColor = { titan: 0xff9a3a, venus: 0xffd27a, europa: 0xbfe6ff, pluto: 0xd8e4ff, mars: 0x9cc4ff }[targetId] || 0xbfe6ff;
    hazeShell.material.uniforms.uColor.value.set(hazeColor);
    lavaShell.material.uniforms.uOcean.value = 0;
    supergiant.scale.setScalar(R * 5.5);
    genesisJets.scale.setScalar(R / 2.5);
    jetMatStar.uniforms.uColor.value.set(cfg.type === 'hole' ? 0x8fd8ff : 0xffc890);
    genesisJets.rotation.set(0, 0, cfg.type === 'hole' ? 0.18 : 0.3);
    if (type.nebula) placeNebula(R, type.nebula);

    const imp = impactFx();
    if (imp) {
        impactor.scale.setScalar(R * imp.size);
        genesis.impDir = new THREE.Vector3(...imp.dir).normalize();
        genesis.contact = genesis.impDir.clone().multiplyScalar(R * (1 + imp.size * 0.55));
        const pos = debrisGeo.attributes.position.array;
        const v = new THREE.Vector3();
        for (let i = 0; i < DEBRIS_COUNT; i++) {
            pos[i * 3] = genesis.contact.x; pos[i * 3 + 1] = genesis.contact.y; pos[i * 3 + 2] = genesis.contact.z;
            v.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().addScaledVector(genesis.impDir, 0.9).normalize();
            const sp = R * (0.8 + Math.random() * 3.2);
            debrisVel[i * 3] = v.x * sp; debrisVel[i * 3 + 1] = v.y * sp; debrisVel[i * 3 + 2] = v.z * sp;
        }
        debrisGeo.attributes.position.needsUpdate = true;
    }
    if (hasFx('bombard')) scheduleMeteors(R, 0.68, 0.8);
    startGenesisScript(targetId, R);
    if (targetId === 'io') ioPlumes.visible = false;
    // las guías en alambre (esfera de fotones, ergosfera) brillan de más con el bloom
    genesis.guides = group.children.filter(c => c.material && c.material.wireframe && c.visible);
    genesis.guides.forEach(c => { c.visible = false; });
    setGenesisScale(0.0001);

    // cámara: la toma el director; el usuario la recupera al terminar
    genesis.saved = {
        autoRotate: controls.autoRotate, autoRotateSpeed: controls.autoRotateSpeed,
        minDistance: controls.minDistance, maxDistance: controls.maxDistance
    };
    controls.enabled = false;
    controls.autoRotate = false;
    controls.minDistance = 0.5;
    controls.maxDistance = 400;
    controls.target.copy(group.position);
    const off = camera.position.clone().sub(controls.target);
    genesis.theta = Math.atan2(off.x, off.z);
    genesis.camFrom = null;

    document.body.classList.add('genesis-mode');
    genesisDom.kicker.textContent = `GÉNESIS · ${ASTRO_TARGETS[targetId].name.split(' (')[0]}`;
    genesisDom.card.hidden = false;
    requestAnimationFrame(() => genesisDom.card.classList.add('is-on'));
    syncGenesisButtons();
    genesisSound.start(cfg.type);
}

function stopGenesis(silent = false) {
    if (!genesis.active) return;
    genesis.active = false;
    genesisSound.stop(silent);
    stopGenesisScript(genesis.target);
    setGenesisScale(1);
    const group = targetGroups[genesis.target];
    if (group) group.rotation.z = genesis.baseRotZ || 0;
    ioPlumes.visible = true;
    (genesis.guides || []).forEach(c => { c.visible = true; });
    genesisFx.visible = false;
    hideGenesisParticles();
    genesisFlash.visible = false;
    if (genesisPost) genesisPost.finish.uniforms.uFlash.value = 0;

    controls.enabled = true;
    controls.autoRotate = !!genesis.saved.autoRotate;
    controls.autoRotateSpeed = genesis.saved.autoRotateSpeed || 2;
    controls.minDistance = genesis.saved.minDistance;
    controls.maxDistance = genesis.saved.maxDistance;
    updateRelativityTelemetry(state.descentPercent);

    document.body.classList.remove('genesis-mode');
    updateGenesisProof(null, -1);
    if (!silent) {
        genesisDom.card.classList.remove('is-on');
        setTimeout(() => { if (!genesis.active) genesisDom.card.hidden = true; }, 260);
    }
}

function nextGenesisTarget() {
    const i = GENESIS_ORDER.indexOf(genesis.target);
    return GENESIS_ORDER[(i + 1) % GENESIS_ORDER.length];
}

function finishGenesis() {
    if (genesis.tour) {
        const next = nextGenesisTarget();
        stopGenesis(true);
        startGenesis(next);
    } else {
        stopGenesis();
    }
}

function toggleGenesisPause() {
    if (!genesis.active) return;
    genesis.paused = !genesis.paused;
    genesisSound.setPaused(genesis.paused);
    syncGenesisButtons();
}

/* ------------------------------ cámara ------------------------------ */
const genesisCamTmp = new THREE.Vector3();
function updateGenesisCamera(prog, dt) {
    const shots = GENESIS_SHOTS_BY_TARGET[genesis.target] || GENESIS_SHOTS[genesis.typeKey];
    const f = prog * GENESIS_PHASES;
    const i = Math.min(GENESIS_PHASES - 1, Math.floor(f));
    const j = Math.min(GENESIS_PHASES - 1, i + 1);
    // cada toma se mantiene y en el último 35 % de la fase se funde con la siguiente
    const k = smooth01(0.65, 1, f - i);
    const a = shots[i], b = shots[j];
    const dist = (a[0] + (b[0] - a[0]) * k) * genesis.R;
    const phi = a[1] + (b[1] - a[1]) * k;
    const speed = a[2] + (b[2] - a[2]) * k;
    if (!reduceMotion.matches) genesis.theta += speed * dt;
    genesisCamTmp.setFromSphericalCoords(dist, phi, genesis.theta).add(controls.target);
    if (genesis.shake > 0.001 && !reduceMotion.matches) {
        const s = genesis.shake * genesis.R * 0.12;
        genesisCamTmp.x += (Math.random() - 0.5) * s;
        genesisCamTmp.y += (Math.random() - 0.5) * s;
    }
    genesis.shake *= Math.exp(-dt * 2.2);
    // entrada suave desde donde estaba la cámara
    if (!genesis.camFrom) genesis.camFrom = camera.position.clone();
    const intro = smooth01(0, 0.05, prog);
    camera.position.copy(genesis.camFrom).lerp(genesisCamTmp, intro);
    camera.lookAt(controls.target);
}

/* ------------------------------ por cuadro ------------------------------ */
function updateGenesis() {
    if (!genesis.active) return;
    const now = performance.now();
    const dtMs = Math.min(100, now - genesis.last);
    genesis.last = now;
    if (!genesis.paused) genesis.elapsed += dtMs;
    const dt = genesis.paused ? 0 : dtMs / 1000;
    const prog = Math.min(1, genesis.elapsed / genesis.duration);
    const time = genesis.elapsed / 1000;
    const { type, typeKey, R } = genesis;
    const group = targetGroups[genesis.target];

    // valores comunes; cada tipo los ajusta
    let clump = 0, collapse = 0, expand = 0, heat = 0, grow = 0, lateK = null;
    let nebula = 0, flash = 0, accretion = 0;
    const alpha = smooth01(0, 0.04, prog) * (1 - smooth01(0.86, 0.97, prog) * 0.92);
    const reveal = smooth01(0.83, 0.95, prog);

    if (typeKey === 'rocky') {
        clump = smooth01(0.12, 0.3, prog);
        collapse = smooth01(0.3, 0.62, prog);
        heat = 0.15 + smooth01(0.3, 0.5, prog) * (1 - smooth01(0.7, 0.9, prog)) * 0.85;
        grow = smooth01(type.grow[0], type.grow[1], prog);
        nebula = 0.45 * (1 - smooth01(0.15, 0.45, prog));
        accretion = smooth01(0.1, 0.35, prog) * (1 - smooth01(0.55, 0.7, prog));
        if (hasFx('charon')) lateK = smooth01(0.6, 0.78, prog);
    } else if (typeKey === 'gas') {
        collapse = smooth01(0.15, 0.42, prog);
        expand = smooth01(0.45, 0.78, prog);
        heat = 0.3 + 0.5 * smooth01(0.45, 0.7, prog) * (1 - smooth01(0.8, 0.95, prog));
        grow = smooth01(type.grow[0], type.grow[1], prog);
        nebula = 0.35 * (1 - smooth01(0.2, 0.5, prog));
        accretion = smooth01(0.45, 0.6, prog) * (1 - smooth01(0.75, 0.85, prog));
        if (hasFx('rings')) lateK = smooth01(0.72, 0.92, prog);
        const c = smooth01(0.18, 0.42, prog);
        coreMesh.visible = c > 0.001 && prog < 0.7;
        coreMesh.scale.setScalar(R * 0.34 * Math.max(0.0001, c));
        coreMesh.material.uniforms.uHeat.value = 0.75;
        coreMesh.material.uniforms.uCover.value = 1;
        coreMesh.material.uniforms.uTime.value = time;
        once('whistler', 0.52, prog, () => genesisSound.cue('whistler'));
    } else if (typeKey === 'star') {
        collapse = smooth01(0.1, 0.5, prog);
        expand = smooth01(0.62, 0.85, prog);
        heat = smooth01(0.25, 0.55, prog);
        grow = smooth01(type.grow[0], type.grow[1], prog);
        nebula = 1 - smooth01(0.5, 0.85, prog) * 0.9;
        accretion = smooth01(0.3, 0.5, prog) * (1 - smooth01(0.55, 0.62, prog));
        once('wave', 0.17, prog, () => {
            fireShock(new THREE.Vector3(-R * 6, 0, -R * 4), R * 30, 0xff9ad0, 3800);
            genesisSound.cue('shock');
            genesis.shake = 0.6;
        });
        once('ignite-sound', type.flashAt - 0.08, prog, () => genesisSound.cue('ignite'));
        once('ignite', type.flashAt, prog, () => {
            fireShock(new THREE.Vector3(), R * 12, 0xffe2a0, 2600);
            genesis.shake = 1;
        });
    } else if (typeKey === 'nova') {
        const sgLife = 1 - smooth01(0.33, 0.36, prog);
        const swell = 1 + Math.sin(time * 1.4) * 0.04 + prog * 0.3;
        supergiant.visible = sgLife > 0.01;
        supergiantGlow.visible = supergiant.visible;
        supergiant.scale.setScalar(R * 5.5 * swell * Math.max(0.0001, sgLife));
        supergiantGlow.scale.setScalar(R * 20 * swell * Math.max(0.0001, sgLife));
        supergiantMat.uniforms.uTime.value = time;
        supergiantMat.uniforms.uCollapse.value = smooth01(0.3, 0.35, prog);
        expand = smooth01(type.flashAt, 1, prog);
        heat = prog < type.flashAt ? 0 : 1 - smooth01(type.flashAt, 0.8, prog) * 0.7;
        grow = smooth01(type.grow[0], type.grow[1], prog);
        nebula = 0.25 * (1 - smooth01(0.3, 0.36, prog)) + smooth01(0.4, 0.7, prog) * 0.8;
        once('collapse', 0.33, prog, () => genesisSound.cue('collapse'));
        once('boom', type.flashAt, prog, () => {
            genesisSound.cue('supernova');
            fireShock(new THREE.Vector3(), R * 50, 0xbff6ff, 4500);
            fireShock(new THREE.Vector3(), R * 32, 0xff7ab8, 3400);
            genesis.shake = 1.6;
        });
        once('pulsar', 0.72, prog, () => genesisSound.cue('pulsar'));
    } else if (typeKey === 'hole') {
        const star = 1 - smooth01(0.1, 0.12, prog);
        supergiant.visible = star > 0.01;
        supergiantGlow.visible = supergiant.visible;
        supergiant.scale.setScalar(R * 2.2 * Math.max(0.0001, star));
        supergiantGlow.scale.setScalar(R * 9 * Math.max(0.0001, star));
        supergiantMat.uniforms.uTime.value = time;
        supergiantMat.uniforms.uCollapse.value = smooth01(0.06, 0.11, prog);
        collapse = smooth01(0.45, 0.8, prog);
        heat = smooth01(0.5, 0.75, prog);
        grow = prog < type.flashAt ? 0 : 0.18 + 0.82 * smooth01(type.grow[0], type.grow[1], prog);
        nebula = 0.5 * (1 - smooth01(0.4, 0.7, prog));
        accretion = smooth01(0.5, 0.7, prog);
        once('collapse', 0.07, prog, () => genesisSound.cue('collapse'));
        once('seed', type.flashAt, prog, () => { fireShock(new THREE.Vector3(), R * 14, 0xffffff, 2200); genesisSound.cue('shock'); genesis.shake = 0.8; });
        // fusión de dos agujeros negros
        const m = smooth01(0.3, 0.33, prog) * (1 - smooth01(0.47, 0.475, prog));
        mergerGroup.visible = m > 0.001;
        if (mergerGroup.visible) {
            const inspiral = smooth01(0.33, 0.47, prog);
            const sep = R * (4.5 * (1 - inspiral) + 0.3);
            const ang = time * (0.6 + inspiral * inspiral * 14);
            mergerBodies[0].position.set(Math.cos(ang) * sep, 0, Math.sin(ang) * sep);
            mergerBodies[1].position.set(-Math.cos(ang) * sep, 0, -Math.sin(ang) * sep);
            mergerBodies.forEach(b => b.scale.setScalar(R * 0.55 * m));
        }
        once('chirp', 0.36, prog, () => genesisSound.cue('chirp'));
        once('merge', 0.475, prog, () => { fireShock(new THREE.Vector3(), R * 40, 0x9fe8ff, 3600); genesis.shake = 1.2; });
        flash = Math.max(flash, pulse(0.475, 0.02, prog));
        if (hasFx('spinup')) accretionDisk.rotation.z = time * (0.2 + smooth01(0.5, 0.95, prog) * 2.5);
    }

    // evento propio del astro (puede cambiar cuándo crece, el destello y las lunas)
    const ov = { flash, grow: null, particleAlpha: 1, hideMoons: false, hazeMul: 1 };
    updateGenesisScript(genesis.target, prog, time, dt, R, ov);
    flash = ov.flash;
    if (ov.grow !== null) grow = ov.grow;
    genesis.hideMoons = ov.hideMoons;

    // flash del tipo (ignición, supernova, semilla del agujero negro)
    if (type.flashAt !== undefined) flash = Math.max(flash, pulse(type.flashAt, typeKey === 'nova' ? 0.05 : 0.03, prog));

    // impacto gigante (Theia, Caronte, el golpe que tumbó a Urano)
    const imp = impactFx();
    let reheat = 0;
    if (imp) {
        const t0 = imp.at - 0.14;
        const k = smooth01(t0, imp.at, prog);
        impactor.visible = prog > t0 && prog < imp.at + 0.004;
        impactorGlow.visible = impactor.visible;
        if (impactor.visible) {
            const far = genesis.impDir.clone().multiplyScalar(R * 10).add(new THREE.Vector3(0, R * 1.8, R * 1.5));
            impactor.position.copy(far).lerp(genesis.contact, k * k);
            impactorMat.uniforms.uHeat.value = 0.1 + k * 0.6;
            impactorMat.uniforms.uTime.value = time;
            impactorGlow.position.copy(impactor.position);
            impactorGlow.material.opacity = 0.2 + k * 0.8;
            impactorGlow.scale.setScalar(R * imp.size * (2 + k * 3));
        }
        once('impact', imp.at, prog, () => {
            genesisSound.cue('impact');
            fireShock(genesis.contact, R * 9, 0xffc080, 2400);
            genesis.shake = 1.4;
        });
        flash = Math.max(flash, pulse(imp.at, 0.025, prog) * 0.9);
        reheat = 1 - smooth01(imp.at, imp.at + 0.14, prog);
        if (prog < imp.at) reheat = 0;
        const dtI = prog - imp.at;
        debrisPoints.visible = dtI > 0 && dtI < 0.32;
        if (debrisPoints.visible) {
            const pos = debrisGeo.attributes.position.array;
            const tt = dtI * genesis.duration / 1000;
            const settle = imp.debris ? smooth01(0.06, 0.28, dtI) : 0;
            const e = 1 - Math.exp(-tt * 1.4);
            for (let i = 0; i < DEBRIS_COUNT; i++) {
                let x = genesis.contact.x + debrisVel[i * 3] * e;
                let y = genesis.contact.y + debrisVel[i * 3 + 1] * e * 0.35;
                let z = genesis.contact.z + debrisVel[i * 3 + 2] * e;
                if (settle > 0) {
                    const a = Math.atan2(z, x) + tt * 0.7;
                    const r = Math.hypot(x, z);
                    x = x * (1 - settle) + Math.cos(a) * r * settle;
                    z = z * (1 - settle) + Math.sin(a) * r * settle;
                    y *= 1 - settle;
                }
                pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
            }
            debrisGeo.attributes.position.needsUpdate = true;
            debrisPoints.material.opacity = (1 - smooth01(0.16, 0.32, dtI)) * 0.95;
        }
        if (hasFx('tilt')) group.rotation.z = (genesis.baseRotZ || 0) - 1.6 * (1 - smooth01(imp.at, imp.at + 0.1, prog));
    }

    // océano de magma que se enfría
    if (hasFx('molten')) {
        const cover = grow > 0.001 ? 1 - smooth01(0.84, 0.94, prog) : 0;
        lavaShell.visible = cover > 0.002;
        const lavaHeat = Math.max(1 - smooth01(0.62, 0.84, prog), reheat * 0.9);
        const u = lavaShell.material.uniforms;
        u.uHeat.value = lavaHeat;
        u.uCover.value = cover;
        u.uTime.value = time;
        if (hasFx('ocean')) u.uOcean.value = smooth01(0.72, 0.84, prog);
        lavaShell.scale.setScalar(R * 1.012 * Math.max(0.0001, 1 - Math.pow(1 - grow, 3)));
        once('cooling', 0.66, prog, () => genesisSound.cue('cooling'));
        heat = Math.max(heat, lavaHeat * grow * 0.6);
    }
    // escarcha / neblina final (lunas heladas, Titán, Venus)
    if (hasFx('frost') || hasFx('haze')) {
        const h = smooth01(0.68, 0.84, prog) * (1 - smooth01(0.9, 1, prog));
        hazeShell.visible = h > 0.01;
        hazeShell.material.uniforms.uOpacity.value = h * (hasFx('haze') ? 0.9 : 0.55) * ov.hazeMul;
        hazeShell.material.uniforms.uTime.value = time;
    }
    // chorros bipolares de la protoestrella o del agujero negro
    if (hasFx('jets')) {
        const jt = typeKey === 'hole'
            ? smooth01(0.66, 0.74, prog) * (1 - smooth01(0.86, 0.95, prog))
            : smooth01(0.3, 0.4, prog) * (1 - smooth01(0.56, 0.66, prog));
        genesisJets.visible = jt > 0.01;
        jetMatStar.uniforms.uOpacity.value = jt;
        jetMatStar.uniforms.uTime.value = time;
    }
    if (hasFx('bombard')) updateMeteors(prog, () => genesisSound.cue('meteor'));
    if (hasFx('plumes')) ioPlumes.visible = prog > 0.8;

    updateNebula(nebula * (type.nebula ? 1 : 0), time);
    updateShocks(now);

    // partículas
    const pxPerUnit = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    setGenesisParticleUniforms({
        uTime: time, uClump: clump, uP: collapse, uExpand: expand,
        uHeat: heat, uAlpha: alpha * ov.particleAlpha * (typeKey === 'nova' ? smooth01(type.flashAt - 0.01, type.flashAt + 0.01, prog) : 1)
            // en los gigantes gaseosos la envoltura de partículas se disuelve cuando aparece el planeta
            * (typeKey === 'gas' ? 1 - smooth01(0.7, 0.82, prog) * 0.95 : 1),
        uPx: pxPerUnit
    });

    // el astro real crece desde la nube
    const k = 1 - Math.pow(1 - grow, 3);
    setGenesisScale(k, lateK === null ? k : lateK);

    // destello global
    genesis.flash = flash;
    genesisFlash.visible = flash > 0.001;
    if (genesisFlash.visible) {
        genesisFlash.material.opacity = flash;
        const s = R * (3 + flash * 16);
        genesisFlash.scale.set(s, s, 1);
        genesisFlash.position.copy(group.position);
    }
    if (genesisPost) {
        genesisPost.bloom.strength = type.bloom * (0.7 + heat * 0.5) + flash * 2.2;
        genesisPost.bloom.threshold = type.bloomThreshold || 0.62;
        genesisPost.finish.uniforms.uFlash.value = flash * flash * 0.55;
    }

    updateGenesisCamera(prog, dt);

    genesisSound.update({ heat, collapse: typeKey === 'nova' ? 0 : collapse * (1 - collapse) * 4, accretion, reveal });

    // interfaz
    const phase = Math.min(GENESIS_PHASES - 1, Math.floor(prog * GENESIS_PHASES));
    if (phase !== genesis.phase) {
        if (genesis.phase >= 0) genesisSound.cue('phase');
        genesis.phase = phase;
        showGenesisPhase(phase);
    }
    const fills = genesisDom.segs.children;
    for (let i = 0; i < fills.length; i++) {
        const f = Math.min(1, Math.max(0, prog * GENESIS_PHASES - i));
        fills[i].firstChild.style.transform = `scaleX(${f.toFixed(3)})`;
    }

    if (prog >= 1) finishGenesis();
}

// Render del cuadro: con bloom durante el Génesis. Devuelve true si ya dibujó.
function renderGenesisFrame(time) {
    if (!genesis.active || !genesisPost) return false;
    genesisPost.render(time);
    return true;
}

/* ------------------------------ controles ------------------------------ */
document.getElementById('genesis-btn')?.addEventListener('click', () => {
    audioEngine.playClickTone(660, 0.08);
    startGenesis(state.currentTarget);
});
genesisDom.skip.addEventListener('click', () => {
    audioEngine.playClickTone(440, 0.05);
    if (genesis.tour) finishGenesis(); else stopGenesis();
});
genesisDom.pause.addEventListener('click', toggleGenesisPause);
genesisDom.tour.addEventListener('click', () => { genesis.tour = !genesis.tour; syncGenesisButtons(); });
genesisDom.sound.addEventListener('click', () => {
    toggleAudioUI();
    if (genesis.active && audioEngine.isPlaying) {
        genesisSound.start(genesis.typeKey);
        if (genesis.paused) genesisSound.setPaused(true);
    }
    syncGenesisButtons();
});
document.addEventListener('keydown', (e) => {
    if (!genesis.active || e.target.closest('input, textarea, select')) return;
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); toggleGenesisPause(); }
    if (e.key === 'ArrowRight' && genesis.tour) finishGenesis();
});
