/* -------------------------------------------------------------------------- */
/* ORIGEN: EL BIG BANG                                                         */
/* -------------------------------------------------------------------------- */
// Cronología del modelo cosmológico estándar (ΛCDM), Planck 2018 y JWST.
const ORIGIN_SCIENCE = {
    sound: 'hole', duration: 78000, end: 'Entrar al Sistema Solar',
    steps: [
        ['Hace 13,800 Ma', 'El inicio', 'Todo lo que existe está en un estado diminuto, caliente y denso. Qué hubo "antes" no lo sabe la física: sus leyes no alcanzan ese instante.', 0.0],
        ['10⁻³⁶ segundos', 'Inflación', 'En una fracción ínfima de segundo el espacio se estira al menos 10²⁶ veces. Sus pequeñas arrugas cuánticas serán la semilla de las galaxias.', 0.07],
        ['Una millonésima de segundo', 'Sopa de quarks', 'Un plasma de quarks y gluones a billones de grados se enfría y se forman los primeros protones y neutrones.', 0.17],
        ['3 minutos', 'Los primeros núcleos', 'Se forman núcleos de hidrógeno y helio: ~75 % y ~25 % de la masa. Así sigue siendo casi todo el universo.', 0.27],
        ['380,000 años', 'Se hace la luz que aún vemos', 'Los electrones se unen a los núcleos y la luz por fin viaja libre. Esa luz es el fondo cósmico de microondas: hoy la vemos a 2.7 K. (Patrón simulado al estilo del mapa del satélite Planck.)', 0.38],
        ['~100–200 Ma', 'Primeras estrellas', 'Tras una "edad oscura", la gravedad junta el gas en la red cósmica de materia oscura y se encienden estrellas gigantes y azules.', 0.52],
        ['~300–400 Ma', 'Primeras galaxias', 'Las estrellas se agrupan en galaxias. El telescopio Webb ha visto algunas de solo ~300 Ma después del inicio.', 0.64],
        ['Hace ~13,000 Ma', 'Nace la Vía Láctea', 'Galaxias pequeñas se fusionan y forman la nuestra; sus estrellas más viejas tienen unos 13,000 millones de años.', 0.76],
        ['Hace 4,600 Ma', 'Nace el Sol', 'En un brazo de la Vía Láctea, una nube de gas colapsa y nace el Sol con sus planetas.', 0.9]
    ]
};

/* ------------------------------ partículas ------------------------------ */
const ORIGIN_N = 70000;
const originParticles = (() => {
    const seed = new Float32Array(ORIGIN_N * 4), web = new Float32Array(ORIGIN_N * 3), gal = new Float32Array(ORIGIN_N * 3);
    const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
    // red cósmica: nodos (cúmulos) unidos por filamentos, con vacíos entre ellos
    const nodes = Array.from({ length: 70 }, () => new THREE.Vector3((Math.random() - 0.5) * 360, (Math.random() - 0.5) * 360, (Math.random() - 0.5) * 360));
    nodes[0].set(0, 0, 0); // la futura Vía Láctea
    const links = [];
    nodes.forEach((a, i) => {
        nodes.map((b, j) => [j, a.distanceTo(b)]).filter(([j]) => j !== i).sort((x, y) => x[1] - y[1]).slice(0, 3).forEach(([j]) => links.push([i, j]));
    });
    const tmp = new THREE.Vector3();
    for (let i = 0; i < ORIGIN_N; i++) {
        seed[i * 4] = Math.random(); seed[i * 4 + 1] = Math.random(); seed[i * 4 + 2] = Math.random(); seed[i * 4 + 3] = Math.random();
        const r = Math.random();
        if (r < 0.32) { const n = nodes[Math.floor(Math.random() * nodes.length)]; tmp.set(gauss(), gauss(), gauss()).multiplyScalar(9).add(n); }
        else if (r < 0.85) { const [a, b] = links[Math.floor(Math.random() * links.length)]; tmp.copy(nodes[a]).lerp(nodes[b], Math.random()).add(new THREE.Vector3(gauss(), gauss(), gauss()).multiplyScalar(4)); }
        else tmp.set((Math.random() - 0.5) * 380, (Math.random() - 0.5) * 380, (Math.random() - 0.5) * 380);
        web.set([tmp.x, tmp.y, tmp.z], i * 3);
        // destino en la Vía Láctea: disco espiral pequeño en el nodo 0
        const arm = Math.floor(Math.random() * 2) * Math.PI;
        const rr = 2 + Math.pow(Math.random(), 0.7) * 34;
        const ang = arm + Math.log(rr / 2) / 0.25 + gauss() * 0.2;
        gal.set([Math.cos(ang) * rr + gauss() * 1.2, gauss() * 0.8, Math.sin(ang) * rr + gauss() * 1.2], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ORIGIN_N * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    g.setAttribute('aWeb', new THREE.BufferAttribute(web, 3));
    g.setAttribute('aGal', new THREE.BufferAttribute(gal, 3));
    const mat = new THREE.ShaderMaterial({
        uniforms: {
            uScale: { value: 0 }, uWeb: { value: 0 }, uGal: { value: 0 }, uTemp: { value: 1 }, uStars: { value: 0 },
            uAlpha: { value: 1 }, uTime: { value: 0 }
        },
        vertexShader: `
            attribute vec4 aSeed; attribute vec3 aWeb; attribute vec3 aGal;
            uniform float uScale, uWeb, uGal, uTemp, uStars, uTime, uAlpha;
            varying vec3 vCol; varying float vA;
            vec3 hot(float t) { // de blanco-azul (muy caliente) a rojo apagado (frío)
                return mix(vec3(0.55, 0.12, 0.05), mix(vec3(1.0, 0.62, 0.25), vec3(0.85, 0.92, 1.0), smoothstep(0.5, 1.0, t)), smoothstep(0.05, 0.5, t));
            }
            void main() {
                vec3 dir = normalize(aSeed.xyz - 0.5 + 1e-4);
                vec3 base = dir * pow(aSeed.w, 0.333) * 190.0;
                vec3 p = mix(base * uScale, aWeb, uWeb);
                // la galaxia gira despacio
                float ga = uTime * 0.08;
                vec3 g = vec3(cos(ga) * aGal.x - sin(ga) * aGal.z, aGal.y, sin(ga) * aGal.x + cos(ga) * aGal.z);
                p = mix(p, g, uGal * step(0.5, aSeed.x));
                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                bool star = aSeed.y < 0.06;
                vec3 c = hot(uTemp);
                // en la galaxia: estrellas amarillas (viejas, centro) y azules (jóvenes, brazos)
                c = mix(c, mix(vec3(1.0, 0.84, 0.6), vec3(0.62, 0.74, 1.0), aSeed.z), uGal * step(0.5, aSeed.x));
                if (star) c = mix(c, mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.9, 0.7), aSeed.z), uStars);
                vCol = c * (star ? 1.0 + uStars * 2.0 : 1.0);
                vA = uAlpha * (star ? 1.0 : mix(1.0, 0.35, uStars));
                gl_PointSize = clamp((star ? 3.4 : 1.8) * 300.0 / -mv.z, 0.8, 8.0);
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: `
            varying vec3 vCol; varying float vA;
            void main() { vec2 q = gl_PointCoord - 0.5; float d = dot(q, q) * 4.0; if (d > 1.0) discard;
                gl_FragColor = vec4(vCol, exp(-d * 3.0) * vA); }
        `,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const pts = new THREE.Points(g, mat);
    pts.frustumCulled = false;
    return pts;
})();

// Fondo cósmico de microondas: la "superficie de última dispersión" nos rodea por todos lados.
// Patrón generado con ruido (simulación); el mapa real es el del satélite Planck (ESA).
const cmbSphere = (() => {
    const mat = new THREE.ShaderMaterial({
        side: THREE.BackSide, transparent: true, depthWrite: false,
        uniforms: { uOpacity: { value: 0 } },
        vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: GENESIS_NOISE_GLSL + `
            uniform float uOpacity; varying vec3 vDir;
            void main() {
                float n = fbm3(vDir * 4.0) * 0.6 + snoise(vDir * 14.0) * 0.25 + snoise(vDir * 36.0) * 0.15;
                vec3 cold = vec3(0.05, 0.25, 0.65), mid = vec3(0.9, 0.85, 0.55), warm = vec3(0.85, 0.25, 0.08);
                vec3 c = n < 0.0 ? mix(mid, cold, clamp(-n * 2.4, 0.0, 1.0)) : mix(mid, warm, clamp(n * 2.4, 0.0, 1.0));
                gl_FragColor = vec4(c * 0.85, uOpacity);
            }
        `
    });
    return new THREE.Mesh(new THREE.SphereGeometry(1400, 64, 48), mat);
})();

const originFlash = makeGlowSprite(0xffffff, 1, 0);
// resplandor del plasma primordial: opaco y caliente hasta que el universo se vuelve transparente
const originGlow = makeGlowSprite(0xffffff, 1, 0);
const originSun = makeGlowSprite(0xffe9a8, 1, 0);

/* ------------------------------ director ------------------------------ */
const originDom = {
    card: document.getElementById('origin-card'),
    kicker: document.getElementById('origin-kicker'),
    clock: document.getElementById('origin-clock'),
    title: document.getElementById('origin-title'),
    text: document.getElementById('origin-text'),
    segs: document.getElementById('origin-segs'),
    pause: document.getElementById('origin-pause'),
    end: document.getElementById('origin-end')
};
const origin = { cfg: null, elapsed: 0, paused: false, phase: -1 };

function originStart() {
    origin.cfg = ORIGIN_SCIENCE;
    origin.elapsed = 0; origin.paused = false; origin.phase = -1;
    cosmos.scene.add(originParticles, cmbSphere, originFlash, originSun, originGlow);
    cosmos.scene.fog = null;
    cosmos.controls.enabled = false;
    originDom.kicker.textContent = 'ORIGEN · MODELO COSMOLÓGICO ΛCDM';
    originDom.segs.replaceChildren(...origin.cfg.steps.map(() => { const s = document.createElement('div'); s.className = 'genesis-seg'; s.appendChild(document.createElement('span')); return s; }));
    originDom.segs.style.gridTemplateColumns = `repeat(${origin.cfg.steps.length}, minmax(0, 1fr))`;
    originDom.end.textContent = origin.cfg.end.toUpperCase();
    originDom.end.hidden = true;
    originDom.pause.textContent = 'PAUSA';
    originDom.card.hidden = false;
    requestAnimationFrame(() => originDom.card.classList.add('is-on'));
    genesisSound.start(origin.cfg.sound);
}

function originStop() {
    cosmos.scene.remove(originParticles, cmbSphere, originFlash, originSun, originGlow);
    originDom.card.classList.remove('is-on');
    originDom.card.hidden = true;
    genesisSound.stop(true);
}

const sm2 = (a, b, x) => smooth01(a, b, x);
function originUpdate(dt, time) {
    if (!origin.paused) origin.elapsed += dt * 1000;
    const p = Math.min(1, origin.elapsed / origin.cfg.duration);
    const u = originParticles.material.uniforms;
    time = origin.elapsed / 1000; // reloj propio: PAUSA congela todo
    u.uTime.value = time;
    const cam = cosmos.camera;
    let flash = 0, sunK = 0, camDist, camH;

    // escala: punto -> inflación explosiva -> expansión lenta
    u.uScale.value = 0.002 + sm2(0.06, 0.12, p) * 0.5 + sm2(0.12, 0.5, p) * 0.5;
    u.uTemp.value = 1 - sm2(0.1, 0.45, p);
    u.uWeb.value = sm2(0.42, 0.62, p);
    u.uStars.value = sm2(0.5, 0.58, p);
    u.uGal.value = sm2(0.72, 0.86, p);
    u.uAlpha.value = sm2(0, 0.02, p) * (1 - sm2(0.38, 0.42, p) * 0.75) + sm2(0.44, 0.5, p) * 0.75;
    cmbSphere.material.uniforms.uOpacity.value = sm2(0.36, 0.4, p) * (1 - sm2(0.47, 0.52, p));
    flash = pulse(0.07, 0.03, p);
    sunK = sm2(0.9, 0.95, p);
    camDist = 60 + sm2(0.07, 0.5, p) * 380 - sm2(0.66, 0.9, p) * 330;
    camH = 0.25 + sm2(0.7, 0.85, p) * 0.5;
    // cámara en órbita lenta
    const ang = time * 0.05;
    cam.position.set(Math.cos(ang) * camDist, camDist * camH, Math.sin(ang) * camDist);
    cam.lookAt(0, 0, 0);

    // plasma: blanco-azulado muy caliente -> naranja -> se apaga al hacerse transparente (380 mil años)
    const glowK = sm2(0.04, 0.08, p) * (1 - sm2(0.36, 0.41, p));
    originGlow.visible = glowK > 0.01;
    originGlow.material.opacity = glowK * 0.85;
    originGlow.material.color.setRGB(1, 0.55 + u.uTemp.value * 0.4, 0.3 + u.uTemp.value * 0.7);
    originGlow.scale.setScalar(camDist * 2.6);
    originFlash.visible = flash > 0.01;
    originFlash.material.opacity = flash;
    originFlash.scale.setScalar(80 + flash * 600);
    originSun.visible = sunK > 0.01;
    originSun.material.opacity = sunK;
    originSun.scale.setScalar(12 * sunK);
    originSun.position.set(14, 0, 6);
    if (genesisPost) { genesisPost.bloom.strength = 0.6 + flash * 2; genesisPost.bloom.threshold = 0.7; genesisPost.finish.uniforms.uFlash.value = flash * flash * 0.5; }

    // fase y textos
    const steps = origin.cfg.steps;
    let idx = 0;
    steps.forEach((s, i) => { if (p >= s[3]) idx = i; });
    if (idx !== origin.phase) {
        origin.phase = idx;
        const [clock, title, text] = steps[idx];
        originDom.clock.textContent = clock;
        originDom.title.textContent = title;
        originDom.text.textContent = text;
        if (idx > 0) genesisSound.cue(idx === 1 ? 'shock' : 'phase');
    }
    Array.from(originDom.segs.children).forEach((seg, i) => {
        const a = steps[i][3], b = i + 1 < steps.length ? steps[i + 1][3] : 1;
        seg.firstChild.style.transform = `scaleX(${Math.min(1, Math.max(0, (p - a) / (b - a))).toFixed(3)})`;
    });
    originDom.end.hidden = p < 0.9;
}

cosmos.views.origin = { start() { originStart(); }, update: originUpdate, stop: originStop };

originDom.pause?.addEventListener('click', () => {
    origin.paused = !origin.paused;
    originDom.pause.textContent = origin.paused ? 'SEGUIR' : 'PAUSA';
    genesisSound.setPaused(origin.paused);
});
document.getElementById('origin-skip')?.addEventListener('click', () => { origin.elapsed = origin.cfg.duration * 0.92; });
originDom.end?.addEventListener('click', () => exitCosmos('sun'));
document.getElementById('origin-exit')?.addEventListener('click', () => exitCosmos());
