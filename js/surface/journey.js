/* -------------------------------------------------------------------------- */
/* CINEMÁTICA DE VIAJE: DESPEGUE DESDE LA TIERRA -> CRUCERO -> LLEGADA         */
/* -------------------------------------------------------------------------- */
// Tiempos de viaje reales de misiones que hicieron ese trayecto.
const TRAVEL = {
    moon: ['384,400 km', '~3 días', 'Apolo 11, 1969'],
    mercury: ['~77–222 millones de km', '6.5 años', 'MESSENGER (con 6 sobrevuelos para frenar)'],
    venus: ['~40–260 millones de km', '~5 meses', 'Venus Express, 2005'],
    earth: ['órbita baja (~400 km)', '~10 minutos', 'subir y volver a entrar'],
    mars: ['~225 millones de km', '~7 meses', 'Perseverance, 2020–2021'],
    jupiter: ['~630 millones de km', '~5 años', 'Juno, 2011–2016'],
    saturn: ['~1,300 millones de km', '~7 años', 'Cassini-Huygens, 1997–2004'],
    uranus: ['~2,700 millones de km', '~8.5 años', 'Voyager 2, 1977–1986'],
    neptune: ['~4,400 millones de km', '~12 años', 'Voyager 2, 1977–1989'],
    pluto: ['~4,800 millones de km', '~9.5 años', 'New Horizons, 2006–2015'],
    sun: ['~150 millones de km', '~3 meses al primer perihelio', 'Parker Solar Probe, 2018'],
    io: 'jupiter', europa: 'jupiter', 'Ganímedes': 'jupiter', 'Calisto': 'jupiter',
    titan: 'saturn', 'Encélado': 'saturn', 'Mimas': 'saturn', 'Miranda': 'uranus', 'Tritón': 'neptune', 'Caronte': 'pluto', 'Fobos': 'mars'
};
const travelFor = (id) => { const t = TRAVEL[id]; return typeof t === 'string' ? TRAVEL[t] : t; };
const HAS_AIR = ['venus', 'earth', 'mars', 'titan'];

const journey = {
    active: false, t: 0, dur: 15, dest: null, onArrive: null,
    scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(60, 1, 0.1, 50000)
};

/* ------------------------------ escena ------------------------------ */
const jSky = new THREE.Mesh(new THREE.SphereGeometry(20000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: { uAir: { value: 1 }, uTint: { value: new THREE.Color(0x4a8fe0) } },
    vertexShader: 'varying vec3 vD; void main() { vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
        uniform float uAir; uniform vec3 uTint; varying vec3 vD;
        float h(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 45.164))) * 43758.5453); }
        void main() {
            float stars = step(0.9975, h(floor(vD * 420.0))) * (1.0 - uAir);
            vec3 sky = mix(uTint * 0.35, uTint, pow(max(vD.y, 0.0), 0.4));
            gl_FragColor = vec4(mix(vec3(stars), sky, uAir), 1.0);
        }
    `
}));
journey.scene.add(jSky);
const jSun = new THREE.DirectionalLight(0xffffff, 2.2); jSun.position.set(300, 500, 400);
journey.scene.add(jSun, new THREE.AmbientLight(0x404858, 0.25));

// Tierra a escala de la escena (radio 600) y destino (se le pone la textura del astro)
const jEarth = new THREE.Mesh(new THREE.SphereGeometry(600, 96, 64), new THREE.MeshPhongMaterial({ shininess: 20 }));
loadTextureWithFallback([ASTRO_TARGETS.earth.textureUrl, ASTRO_TARGETS.earth.textureFallback], (t) => { jEarth.material.map = t; jEarth.material.needsUpdate = true; });
// La plataforma (+Y) queda en Cabo Cañaveral (28.5°N, 80.6°O) y el este apunta a +X,
// hacia donde se inclina el cohete al girar: así se lanza de verdad (aprovecha la rotación).
(() => {
    const onSphere = (latDeg, lonDeg) => {
        // mismo mapeo que THREE.SphereGeometry con textura equirectangular (u = 0 en 180°O)
        const phi = (lonDeg + 180) / 360 * Math.PI * 2, lat = THREE.MathUtils.degToRad(latDeg);
        return new THREE.Vector3(-Math.cos(phi) * Math.cos(lat), Math.sin(lat), Math.sin(phi) * Math.cos(lat));
    };
    const pad = onSphere(28.5, -80.6);
    const east = onSphere(28.5, -80.5).sub(pad).normalize();
    const toUp = new THREE.Quaternion().setFromUnitVectors(pad, new THREE.Vector3(0, 1, 0));
    east.applyQuaternion(toUp).setY(0).normalize();
    const toEast = new THREE.Quaternion().setFromUnitVectors(east, new THREE.Vector3(1, 0, 0));
    jEarth.quaternion.copy(toEast.multiply(toUp));
})();
const jEarthGlow = makeGlowSprite(0x6ab4ff, 1500, 0.6);
const jDest = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 64), new THREE.MeshLambertMaterial());
const jDestGlow = makeGlowSprite(0xffffff, 1, 0.5);
journey.scene.add(jEarth, jEarthGlow, jDest, jDestGlow);

// Cohete: cuerpo, punta, aletas y tobera
const jRocket = new THREE.Group();
(() => {
    const white = new THREE.MeshStandardMaterial({ color: 0xeef2f6, roughness: 0.45, metalness: 0.2 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.6, metalness: 0.4 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 5, 32), white);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 32), white); nose.position.y = 3.2;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.51, 0.51, 0.4, 32), dark); band.position.y = 1.6;
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.55, 0.7, 24, 1, true), dark); nozzle.position.y = -2.85;
    jRocket.add(body, nose, band, nozzle);
    for (let i = 0; i < 4; i++) {
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.8), dark);
        fin.position.set(Math.cos(i * Math.PI / 2) * 0.62, -2.1, Math.sin(i * Math.PI / 2) * 0.62);
        fin.rotation.y = -i * Math.PI / 2;
        jRocket.add(fin);
    }
})();
journey.scene.add(jRocket);

// Llama y humo (partículas que salen de la tobera)
const J_N = 2200;
const jFlameGeo = new THREE.BufferGeometry();
const jFlamePos = new Float32Array(J_N * 3), jFlameAge = new Float32Array(J_N), jFlameVel = new Float32Array(J_N * 3);
jFlameGeo.setAttribute('position', new THREE.BufferAttribute(jFlamePos, 3));
jFlameGeo.setAttribute('aAge', new THREE.BufferAttribute(jFlameAge, 1));
const jFlame = new THREE.Points(jFlameGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.NormalBlending,
    uniforms: { uSmoke: { value: 1 } },
    vertexShader: `
        attribute float aAge; varying float vAge;
        void main() { vAge = aAge; vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = clamp((4.0 + aAge * 60.0) * 30.0 / -mv.z, 1.0, 90.0); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `
        uniform float uSmoke; varying float vAge;
        void main() { vec2 q = gl_PointCoord - 0.5; float d = dot(q, q) * 4.0; if (d > 1.0) discard;
            vec3 fire = mix(vec3(1.6, 1.2, 0.7), vec3(1.0, 0.35, 0.05), smoothstep(0.0, 0.18, vAge));
            vec3 smoke = vec3(0.55, 0.55, 0.58) * uSmoke;
            vec3 c = mix(fire, smoke, smoothstep(0.15, 0.45, vAge));
            float a = exp(-d * 2.5) * (1.0 - smoothstep(0.5, 1.0, vAge)) * mix(0.9, 0.35 * uSmoke, smoothstep(0.15, 0.45, vAge));
            gl_FragColor = vec4(c, a); }`
}));
jFlame.frustumCulled = false;
journey.scene.add(jFlame);
let jSpawn = 0;
function updateFlame(dt, throttle, worldDown) {
    const noz = jRocket.localToWorld(new THREE.Vector3(0, -3.2, 0));
    jSpawn += throttle * 1400 * dt;
    for (let i = 0; i < J_N; i++) {
        if (jFlameAge[i] >= 1 && jSpawn >= 1) {
            jSpawn -= 1;
            jFlameAge[i] = 0;
            jFlamePos.set([noz.x, noz.y, noz.z], i * 3);
            const s = 3.2;
            jFlameVel[i * 3] = worldDown.x * 26 + (Math.random() - 0.5) * s;
            jFlameVel[i * 3 + 1] = worldDown.y * 26 + (Math.random() - 0.5) * s;
            jFlameVel[i * 3 + 2] = worldDown.z * 26 + (Math.random() - 0.5) * s;
        }
        if (jFlameAge[i] < 1) {
            jFlameAge[i] += dt * 0.9;
            jFlamePos[i * 3] += jFlameVel[i * 3] * dt; jFlamePos[i * 3 + 1] += jFlameVel[i * 3 + 1] * dt; jFlamePos[i * 3 + 2] += jFlameVel[i * 3 + 2] * dt;
            jFlameVel[i * 3] *= 0.97; jFlameVel[i * 3 + 1] *= 0.97; jFlameVel[i * 3 + 2] *= 0.97;
        } else jFlameAge[i] = 1;
    }
    jFlameGeo.attributes.position.needsUpdate = true;
    jFlameGeo.attributes.aAge.needsUpdate = true;
}

// Estelas de estrellas durante el crucero
const jStreaks = (() => {
    const n = 500, pos = new Float32Array(n * 6);
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * 300, z = -Math.random() * 3000;
        pos.set([Math.cos(a) * r, Math.sin(a) * r, z, Math.cos(a) * r, Math.sin(a) * r, z - 60], i * 6);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    l.frustumCulled = false;
    return l;
})();
journey.scene.add(jStreaks);

// Plasma de reentrada (frente al escudo) y polvo de los retrocohetes al tocar suelo
const jPlasma = makeGlowSprite(0xff7a2a, 1, 0);
journey.scene.add(jPlasma);
// envolvente de plasma: cono incandescente que abraza la nave durante la reentrada
const jSheath = new THREE.Mesh(new THREE.ConeGeometry(2.6, 11, 48, 1, true), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.NormalBlending, side: THREE.DoubleSide,
    uniforms: { uK: { value: 0 }, uTime: sharedUniforms.uTime },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
        uniform float uK, uTime; varying vec2 vUv;
        void main() {
            float flick = 0.7 + 0.3 * sin(vUv.x * 40.0 + uTime * 30.0) * sin(vUv.y * 13.0 - uTime * 22.0);
            float front = pow(vUv.y, 2.2);
            vec3 c = mix(vec3(1.0, 0.2, 0.45), vec3(1.0, 0.85, 0.45), front);
            gl_FragColor = vec4(c, clamp(front * flick * uK * 1.3, 0.0, 0.95));
        }
    `
}));
jSheath.rotation.x = -Math.PI / 2; // la base (ancha) delante, la punta hacia atrás
jSheath.position.set(0, 0, 0.5);
journey.scene.add(jSheath);

/* ------------------------------ interfaz ------------------------------ */
const journeyDom = {
    box: document.getElementById('journey-hud'),
    phase: document.getElementById('journey-phase'),
    title: document.getElementById('journey-title'),
    text: document.getElementById('journey-text'),
    bar: document.getElementById('journey-bar')
};

function destTexture(id) {
    const moonCfg = Object.values(MOONS).flat().find(m => m.name === id);
    if (moonCfg) return moonCfg.tex ? { url: TEX + moonCfg.tex } : (moonCfg.look ? { map: makeMoonTexture(moonCfg.look).map } : null);
    if (id === 'Caronte') return { map: makeMoonTexture('charon').map };
    const cfg = ASTRO_TARGETS[id];
    return cfg && cfg.textureUrl ? { url: cfg.textureUrl, fallback: cfg.textureFallback } : null;
}

/* ------------------------------ control ------------------------------ */
// Inicia el viaje; al terminar llama a onArrive (aterrizar o descender).
function startJourney(id, onArrive) {
    if (typeof genesis !== 'undefined' && genesis.active) stopGenesis(true);
    const tex = destTexture(id);
    jDest.material.map = null; jDest.material.color.set(0xbbbbbb);
    if (tex && tex.map) { jDest.material.map = tex.map; jDest.material.color.set(0xffffff); }
    else if (tex && tex.url) loadTextureWithFallback([tex.url, tex.fallback], (t) => { jDest.material.map = t; jDest.material.color.set(0xffffff); jDest.material.needsUpdate = true; });
    jDest.material.needsUpdate = true;
    const isSun = id === 'sun';
    jDest.material.emissive = new THREE.Color(isSun ? 0xff8a2a : 0x000000);
    jDest.material.emissiveIntensity = isSun ? 1.2 : 0;
    Object.assign(journey, { active: true, t: 0, dest: id, onArrive, air: HAS_AIR.includes(id), info: travelFor(id) || ['', '', ''], phaseShown: -1 });
    for (let i = 0; i < J_N; i++) jFlameAge[i] = 1;
    controls.enabled = false;
    document.body.classList.add('journey-mode');
    journeyDom.box.hidden = false;
    document.getElementById('journey-skip-big').hidden = false;
    if (typeof journeyRumble === 'function') journeyRumble(true);
}

function endJourney(arrived) {
    if (!journey.active) return;
    journey.active = false;
    document.body.classList.remove('journey-mode');
    journeyDom.box.hidden = true;
    document.getElementById('journey-skip-big').hidden = true;
    if (typeof journeyRumble === 'function') journeyRumble(false);
    if (arrived && journey.onArrive) journey.onArrive();
    else controls.enabled = true;
}

const J_PHASES = [
    [0, 'DESPEGUE', 'Cabo Cañaveral, Florida', 'Motores a máxima potencia: el cohete empuja con millones de newtons contra la gravedad de la Tierra.'],
    [0.22, 'ÓRBITA', 'Rumbo al espacio', 'A 100 km el cielo se vuelve negro: ya no hay aire que disperse la luz del Sol.'],
    [0.36, 'CRUCERO', null, null],
    [0.68, 'LLEGADA', null, null],
    [0.9, 'CONTACTO', null, null]
];

const jTmp = new THREE.Vector3(), jDown = new THREE.Vector3();
function updateJourney(dt) {
    const cam = journey.camera;
    const size = renderer.getSize(new THREE.Vector2());
    if (cam.aspect !== size.x / size.y) { cam.aspect = size.x / size.y; cam.updateProjectionMatrix(); }
    journey.t += dt / journey.dur;
    const p = Math.min(1, journey.t);
    const sm = (a, b) => smooth01(a, b, p);
    const [dist, time, mission] = journey.info;
    const name = SURFACE_SITES[journey.dest] ? siteName(journey.dest) : astroName(journey.dest);

    // fases y textos
    let idx = 0; J_PHASES.forEach((ph, i) => { if (p >= ph[0]) idx = i; });
    if (idx !== journey.phaseShown) {
        journey.phaseShown = idx;
        const ph = J_PHASES[idx];
        journeyDom.phase.textContent = ph[1];
        journeyDom.title.textContent = ph[2] || (idx === 2 ? `Rumbo a ${name}` : idx === 3 ? (journey.air ? `Entrada atmosférica en ${name}` : `Descenso propulsado sobre ${name}`) : `${name}: contacto`);
        journeyDom.text.textContent = ph[3] || (idx === 2 ? `${dist} · viaje real: ${time} (${mission}). Aquí lo comprimimos en segundos.`
            : idx === 3 ? (journey.air ? 'El aire frena la nave a miles de km/h: el escudo se calienta a más de 1,000 °C y la rodea un plasma brillante.' : 'Sin aire para frenar, los retrocohetes encienden y bajan la nave poco a poco.')
            : 'Toque suave. Bienvenido.');
        if (idx >= 2) audioEngine.playClickTone(idx === 4 ? 420 : 660, 0.09);
    }
    journeyDom.bar.style.transform = `scaleX(${p.toFixed(3)})`;

    // 1) despegue: el cohete sube desde la superficie de la Tierra; el cielo se oscurece
    const lift = sm(0.02, 0.36);
    const altitude = 602 + lift * lift * 900;
    jRocket.position.set(0, altitude, 0);
    jRocket.rotation.set(0, 0, -sm(0.12, 0.34) * 0.9); // maniobra de giro gradual (gravity turn)
    jEarth.position.set(0, 0, 0);
    jEarthGlow.position.copy(jEarth.position);
    jSky.material.uniforms.uAir.value = 1 - sm(0.08, 0.24);
    jSky.material.uniforms.uTint.value.set(0x4a8fe0);
    jDown.set(0, -1, 0).applyQuaternion(jRocket.quaternion);

    // 2) crucero: la Tierra queda atrás, estelas, el destino crece
    const cruise = sm(0.36, 0.7);
    jEarth.visible = jEarthGlow.visible = p < 0.5;
    jStreaks.material.opacity = sm(0.36, 0.42) * (1 - sm(0.62, 0.7)) * 0.8;
    jStreaks.position.z = (journey.t * 9000) % 3000;
    const destR = 500;
    const destDist = 40000 * Math.pow(1 - cruise, 2.4) + destR * (1.02 + 0.6 * (1 - sm(0.68, 0.95)));

    let throttle = p < 0.36 ? 1 : 0;
    if (p >= 0.36) {
        // el cohete viaja por el eje -z hacia el destino
        jRocket.rotation.set(-Math.PI / 2, 0, 0);
        jRocket.position.set(0, 0, 0);
        jDest.visible = jDestGlow.visible = true;
        jDest.scale.setScalar(destR);
        jDest.position.set(0, -destR * sm(0.68, 0.95), -destDist);
        jDest.rotation.y += dt * 0.05;
        jDest.material.color.setScalar(journey.air ? 1 - sm(0.68, 0.8) * 0.45 : 1);
        jDestGlow.position.copy(jDest.position);
        jDestGlow.scale.setScalar(destR * 2.8);
        jDestGlow.material.color.set(journey.air ? 0xffb070 : 0xaaccff);
        jDestGlow.material.opacity = journey.dest === 'sun' ? 1 : 0.25;
        // 3) llegada: con aire, plasma frente al escudo; sin aire, retrocohetes
        const arrive = sm(0.7, 0.88) * (1 - sm(0.9, 0.97));
        if (journey.air) {
            jPlasma.position.set(0, 0, -4.5);
            jPlasma.scale.setScalar(8 + arrive * 18);
            jPlasma.material.opacity = arrive;
            jSheath.material.uniforms.uK.value = arrive;
            throttle = 0;
        } else {
            jPlasma.material.opacity = 0;
            jSheath.material.uniforms.uK.value = 0;
            throttle = sm(0.72, 0.78) * (1 - sm(0.95, 1)) * 0.8;
            jRocket.rotation.set(Math.PI / 2, 0, 0); // giro para frenar con el motor por delante
        }
        jDown.set(0, -1, 0).applyQuaternion(jRocket.quaternion);
    } else {
        jDest.visible = jDestGlow.visible = false;
        jPlasma.material.opacity = 0;
        jSheath.material.uniforms.uK.value = 0;
    }
    jFlame.material.uniforms.uSmoke.value = 1 - sm(0.16, 0.3);
    updateFlame(dt, throttle, jDown);

    // cámara: detrás y un poco al lado del cohete, con vibración
    const shake = (p < 0.3 ? 0.18 * (1 - sm(0.2, 0.3)) : 0) + (journey.air ? 0.25 : 0.08) * sm(0.72, 0.8) * (1 - sm(0.9, 0.96));
    if (p < 0.36) {
        // al principio, desde la plataforma mirando hacia arriba; luego persecución
        // primero desde la plataforma; al subir, la cámara se eleva para ver la curva de la Tierra
        jTmp.set(16 - lift * 6, -6 + lift * 26, 30 - lift * 6).add(jRocket.position);
        if (lift < 0.02) jTmp.y = 603; // la cámara no baja del suelo
        cam.position.copy(jTmp);
        cam.lookAt(jRocket.position.x, jRocket.position.y + 1 - lift * 14, 0);
    } else {
        // en la llegada la cámara se pega a la nave, de lado, para ver el plasma o los retrocohetes
        const close = sm(0.68, 0.76);
        cam.position.set(4.5 + close * 2.5, 2.2 - close * 0.8, 12 - close * 4.5);
        cam.lookAt(0, -close * 2, -30 + close * 26);
    }
    if (!reduceMotion.matches && shake > 0) { cam.position.x += (Math.random() - 0.5) * shake; cam.position.y += (Math.random() - 0.5) * shake; }

    if (typeof journeyRumbleLevel === 'function') journeyRumbleLevel(throttle + (journey.air ? sm(0.72, 0.8) * (1 - sm(0.9, 0.96)) : 0));
    if (p >= 1) fadeThen(() => endJourney(true));
}

/* ------------------------------ sonido ------------------------------ */
// Rugido grave del motor y viento de reentrada (ruido filtrado).
let jNoise = null;
function journeyRumble(on) {
    if (!audioEngine.isPlaying || !audioEngine.ctx) return;
    const ctx = audioEngine.ctx;
    if (on && !jNoise) {
        const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const d = buf.getChannelData(0); let last = 0;
        for (let i = 0; i < d.length; i++) { last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.5; }
        const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
        const g = ctx.createGain(); g.gain.value = 0;
        src.connect(lp); lp.connect(g); g.connect(audioEngine.output()); src.start();
        jNoise = { src, lp, g };
    } else if (!on && jNoise) {
        const n = jNoise; jNoise = null;
        n.g.gain.setTargetAtTime(0, ctx.currentTime, 0.2);
        setTimeout(() => { try { n.src.stop(); } catch (e) { /* ya detenido */ } }, 900);
    }
}
function journeyRumbleLevel(k) {
    if (!jNoise) return;
    const t = audioEngine.ctx.currentTime;
    jNoise.g.gain.setTargetAtTime(Math.min(1, k) * 0.9, t, 0.1);
    jNoise.lp.frequency.setTargetAtTime(250 + k * 900, t, 0.1);
}

document.getElementById('journey-skip')?.addEventListener('click', () => { journey.t = 0.995; });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && journey.active) journey.t = 0.995; });

/* ------------------------------ punto de entrada ------------------------------ */
// ATERRIZAR (superficie sólida) o DESCENDER (gigantes gaseosos / rozar el Sol), con viaje antes.
// Antes de salir se pregunta si ver el viaje o ir directo (la elección se puede recordar).
const LAND_PREF_KEY = 'eh.landMode';
const readLandPref = () => { try { return localStorage.getItem(LAND_PREF_KEY); } catch (e) { return null; } };
const saveLandPref = (v) => { try { localStorage.setItem(LAND_PREF_KEY, v); } catch (e) { /* almacenamiento bloqueado */ } };
const landChoiceDom = {
    box: document.getElementById('land-choice'),
    trip: document.getElementById('land-choice-trip'),
    direct: document.getElementById('land-choice-direct'),
    remember: document.getElementById('land-choice-remember'),
    cancel: document.getElementById('land-choice-cancel')
};
let landChoicePending = null, landChoiceReturn = null;

function closeLandChoice() {
    landChoiceDom.box.hidden = true;
    landChoicePending = null;
    if (landChoiceReturn) { landChoiceReturn.focus(); landChoiceReturn = null; }
}
function pickLandMode(mode) {
    const go = landChoicePending;
    if (landChoiceDom.remember.checked) saveLandPref(mode);
    closeLandChoice();
    if (go) go(mode);
}

function startLanding(id = state.currentTarget, opts = {}) {
    if (typeof clearMoonFocus === 'function' && moonFocus.mesh) clearMoonFocus();
    const arrive = () => (typeof DESCENTS !== 'undefined' && DESCENTS[id]) ? startDescent(id) : enterSurface(id);
    const go = (mode) => (mode === 'direct' || reduceMotion.matches) ? arrive() : startJourney(id, arrive);
    if (opts.mode) { go(opts.mode); return; }
    const pref = readLandPref();
    if (pref === 'trip' || pref === 'direct') { go(pref); return; }
    landChoicePending = go;
    landChoiceReturn = document.activeElement;
    landChoiceDom.remember.checked = false;
    landChoiceDom.box.hidden = false;
    landChoiceDom.trip.focus();
}

landChoiceDom.trip?.addEventListener('click', () => pickLandMode('trip'));
landChoiceDom.direct?.addEventListener('click', () => pickLandMode('direct'));
landChoiceDom.cancel?.addEventListener('click', closeLandChoice);
landChoiceDom.box?.addEventListener('click', (e) => { if (e.target === landChoiceDom.box) closeLandChoice(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !landChoiceDom.box.hidden) closeLandChoice(); });
document.getElementById('journey-skip-big')?.addEventListener('click', () => { journey.t = 0.995; });
