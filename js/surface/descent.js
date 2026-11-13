/* -------------------------------------------------------------------------- */
/* DESCENDER EN LOS GIGANTES GASEOSOS Y ROZAR LA CORONA DEL SOL                */
/* -------------------------------------------------------------------------- */
// Gigantes: no hay suelo. Se cae a través de sus capas de nubes mientras la
// presión y la temperatura suben. Valores aproximados de los modelos de
// condensación y de la sonda Galileo (Júpiter, 1995: se perdió a ~22 bar y
// ~153 °C tras 58 minutos). En Saturno, Urano y Neptuno las capas profundas
// no se han medido: son predicciones de modelos (se indica con ~).
// Keyframes: [progreso, profundidad km, presión bar, temperatura °C, capa, color nube, ¿rayos?]
const DESCENTS = {
    jupiter: {
        sky: 0xd9b48a, note: 'Así cayó la sonda Galileo, sola, durante 58 minutos.',
        keys: [
            [0.0, -50, 0.1, -160, 'Neblina alta (encima de las nubes)', 0xf3e2c4, false],
            [0.22, -10, 0.7, -130, 'Nubes de hielo de amoníaco', 0xf6efe4, false],
            [0.45, 25, 2, -70, 'Nubes de hidrosulfuro de amonio', 0xb27a4a, false],
            [0.68, 75, 5, 0, 'Nubes de agua: aquí nacen los rayos', 0x4a5a74, true],
            [1.0, 150, 22, 153, 'Fin de la señal de Galileo', 0x2a1a10, false]
        ],
        end: 'Aquí se perdió la señal de Galileo (1995). Más abajo, la presión y el calor aplastan cualquier nave; a miles de km el hidrógeno se vuelve un metal líquido.'
    },
    saturn: {
        sky: 0xe6d3a2, note: 'Ninguna sonda ha bajado aún a Saturno: Cassini se desintegró en su atmósfera alta en 2017.',
        keys: [
            [0.0, -60, 0.1, -180, 'Neblina alta', 0xf1e6c8, false],
            [0.25, 0, 1.5, -140, 'Nubes de hielo de amoníaco', 0xf5ecd6, false],
            [0.5, 80, 5, -60, '~Nubes de hidrosulfuro de amonio', 0xc4a06a, false],
            [0.74, 170, 12, 0, '~Nubes de agua y tormentas eléctricas', 0x56607a, true],
            [1.0, 260, 30, 120, '~Más allá: gas cada vez más denso', 0x241a12, false]
        ],
        end: 'En 2017 Cassini entró en esta atmósfera a unos 113,000 km/h y se desintegró. Las capas profundas que viste son predicciones de modelos.'
    },
    uranus: {
        sky: 0x9ad6de, note: 'Solo Voyager 2 lo ha visitado (1986). Nadie ha entrado en su atmósfera.',
        keys: [
            [0.0, -50, 0.1, -220, 'Neblina alta', 0xbfe8ee, false],
            [0.3, 0, 1.2, -200, 'Nubes de metano (de ahí el color cian)', 0x8fd8e2, false],
            [0.62, 40, 4, -170, '~Nubes de ácido sulfhídrico (huele a huevo podrido)', 0x6fa9b6, false],
            [1.0, 200, 40, -50, '~Hacia el manto de agua y amoníaco "calientes"', 0x18323c, false]
        ],
        end: 'Más abajo se cree que hay un manto denso de agua, amoníaco y metano, quizá con "lluvia de diamantes" (hipótesis).'
    },
    neptune: {
        sky: 0x4c78d8, note: 'Vientos de más de 2,000 km/h: los más rápidos del Sistema Solar.',
        keys: [
            [0.0, -50, 0.1, -218, 'Neblina alta', 0x8fb2f0, false],
            [0.3, 0, 1.2, -201, 'Nubes de metano', 0x6f98ee, false],
            [0.62, 40, 4, -170, '~Nubes de ácido sulfhídrico', 0x3d62b8, false],
            [1.0, 200, 40, -50, '~Hacia el manto de agua y amoníaco', 0x0c1838, false]
        ],
        end: 'Como en Urano, debajo se espera un manto denso de agua, amoníaco y metano (hipótesis).'
    },
    sun: { corona: true }
};

const descent = {
    active: false, id: null, t: 0, dur: 42,
    scene: new THREE.Scene(), camera: new THREE.PerspectiveCamera(70, 1, 0.5, 400000), flash: 0
};

/* ------------------------------ gigantes: capas de nubes ------------------------------ */
const CLOUD_FS = GENESIS_NOISE_GLSL + `
    uniform vec3 uColor; uniform vec3 uFogColor; uniform float uTime; uniform float uOpacity; uniform float uFlash; uniform float uSeed;
    varying vec3 vW;
    void main() {
        // nubes grandes y suaves (cúmulos de cientos de metros), estiradas por los vientos zonales
        vec2 p = vW.xz * vec2(0.00022, 0.00055) + uSeed;
        float n = fbm3(vec3(p + vec2(uTime * 0.004, 0.0), uSeed)) * 0.7 + fbm3(vec3(p * 4.0, uTime * 0.01 + uSeed)) * 0.3;
        float a = smoothstep(-0.05, 0.5, n) * uOpacity;
        // los bordes del plano se pierden en la bruma
        float dist = length(vW - cameraPosition);
        float far = smoothstep(2500.0, 11000.0, dist);
        a *= 1.0 - far;
        vec3 c = uColor * (0.5 + n * 1.0) + vec3(0.9, 0.95, 1.0) * uFlash * 0.8;
        c = mix(c, uFogColor, smoothstep(600.0, 8000.0, dist) * 0.85);
        gl_FragColor = vec4(c, a);
    }
`;
// cada capa = 4 láminas apiladas (da espesor y volumen al atravesarla)
const cloudLayers = [];
const SHEETS = 4, SHEET_GAP = 70;
for (let i = 0; i < 5 * SHEETS; i++) {
    const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
        uniforms: { uColor: { value: new THREE.Color() }, uFogColor: { value: new THREE.Color() }, uTime: sharedUniforms.uTime, uOpacity: { value: 0.75 }, uFlash: { value: 0 }, uSeed: { value: (i % SHEETS) * 3.7 } },
        vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
        fragmentShader: CLOUD_FS
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000, 1, 1), mat);
    m.rotation.x = -Math.PI / 2;
    cloudLayers.push(m);
    descent.scene.add(m);
}
const wisps = Array.from({ length: 40 }, () => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: genesisCloudTexture, transparent: true, depthWrite: false, opacity: 0, fog: false }));
    s.scale.set(700, 500, 1);
    s.position.set((Math.random() - 0.5) * 1600, -Math.random() * 1600 + 800, (Math.random() - 0.5) * 1600);
    return s;
});
const dSky = new THREE.Mesh(new THREE.SphereGeometry(40000, 32, 16), new THREE.MeshBasicMaterial({ side: THREE.BackSide, fog: false }));
descent.scene.add(dSky);

/* ------------------------------ Sol: la corona ------------------------------ */
const dSunGroup = new THREE.Group();
const dSunBig = new THREE.Mesh(new THREE.SphereGeometry(5000, 128, 96), new THREE.ShaderMaterial({
    uniforms: { uTime: sharedUniforms.uTime, uMap: { value: null }, uHasMap: { value: 0 } },
    vertexShader: commonVertexShader, fragmentShader: sunFragmentShader
}));
loadTextureWithFallback([ASTRO_TARGETS.sun.textureUrl], (t) => { dSunBig.material.uniforms.uMap.value = t; dSunBig.material.uniforms.uHasMap.value = 1; });
const dSunHalo = makeGlowSprite(0xffa040, 16000, 0.9);
const dSunCorona = makeGlowSprite(0xfff1c8, 12500, 0.6);
dSunGroup.add(dSunBig, dSunHalo, dSunCorona);
// protuberancias: arcos de plasma
for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2, s = 300 + Math.random() * 900;
    const loop = new THREE.Mesh(new THREE.TorusGeometry(s, s * 0.06, 8, 48, Math.PI), new THREE.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    const dir = new THREE.Vector3(Math.cos(a), Math.random() * 0.6 - 0.1, Math.sin(a)).normalize();
    loop.position.copy(dir).multiplyScalar(5000);
    loop.lookAt(dir.clone().multiplyScalar(6000));
    loop.rotateX(Math.PI / 2);
    dSunGroup.add(loop);
}
// viento solar
const SW_N = 1500;
const swGeo = new THREE.BufferGeometry();
const swPos = new Float32Array(SW_N * 3), swSeed = new Float32Array(SW_N * 3);
for (let i = 0; i < SW_N; i++) { const d = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(); swSeed.set([d.x, d.y, d.z], i * 3); swPos.set([d.x * 5100, d.y * 5100, d.z * 5100], i * 3); }
swGeo.setAttribute('position', new THREE.BufferAttribute(swPos, 3));
const solarWind = new THREE.Points(swGeo, new THREE.PointsMaterial({ map: roundDotTexture, color: 0xffd9a0, size: 18, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
solarWind.frustumCulled = false;
dSunGroup.add(solarWind);
// escudo térmico de la Parker (hexágono de carbono) delante de la cámara
// Parker Solar Probe: escudo hexagonal blanco (cara al Sol), cuerpo y paneles solares recogidos detrás
const parker = new THREE.Group();
const parkerShield = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.25, 6), new THREE.MeshStandardMaterial({ color: 0xf2f2f0, roughness: 0.9, emissive: 0xff6a20, emissiveIntensity: 0 }));
parkerShield.rotation.x = Math.PI / 2;
const parkerBody = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 2.2, 6), new THREE.MeshStandardMaterial({ color: 0x9aa3ad, roughness: 0.5, metalness: 0.6 }));
parkerBody.rotation.x = Math.PI / 2; parkerBody.position.z = -1.4;
[-1, 1].forEach(s => {
    const panel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.05, 0.7), new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.3, metalness: 0.5 }));
    panel.position.set(s * 1.6, 0, -2.2); panel.rotation.z = s * 0.4; parker.add(panel);
});
parker.add(parkerShield, parkerBody);
const parkerLight = new THREE.DirectionalLight(0xffe0b0, 3);

/* ------------------------------ entrar / salir ------------------------------ */
function startDescent(id) {
    const cfg = DESCENTS[id];
    if (!cfg) return;
    if (typeof genesis !== 'undefined' && genesis.active) stopGenesis(true);
    fadeThen(() => {
        descent.scene.clear();
        Object.assign(descent, { active: true, id, t: 0, cfg, flash: 0, dur: cfg.corona ? 34 : 42, shownLayer: -1, ended: false });
        if (cfg.corona) {
            descent.scene.add(dSunGroup, parker, parkerLight, new THREE.AmbientLight(0x553322, 0.5));
            descent.scene.fog = null;
        } else {
            descent.scene.add(dSky, ...cloudLayers, ...wisps);
            wisps.forEach(w => w.position.y += 2000); // se reubican al primer cuadro
            descent.scene.fog = new THREE.FogExp2(cfg.sky, 0.00012);
        }
        controls.enabled = false;
        document.body.classList.add('surface-mode');
        surfaceDom.title.textContent = cfg.corona ? 'SOL · Corona, junto a la Parker Solar Probe' : `${astroName(id)} · Descenso en la atmósfera`;
        surfaceDom.note.textContent = cfg.corona ? 'El objeto humano más cercano al Sol y el más rápido jamás construido.' : cfg.note;
        surfaceDom.fact.textContent = '';
        document.getElementById('surface-next-fact').hidden = true;
        document.body.classList.add('descent-mode');
        surfaceDom.hud.hidden = false;
    });
}

function exitDescent() {
    if (!descent.active) return;
    if (descent.camera.fov !== 70) { descent.camera.fov = 70; descent.camera.updateProjectionMatrix(); }
    fadeThen(() => {
        descent.active = false;
        controls.enabled = true;
        document.body.classList.remove('surface-mode');
        surfaceDom.hud.hidden = true;
        document.getElementById('surface-next-fact').hidden = false;
        document.body.classList.remove('descent-mode');
    });
}

function setReadout(rows) {
    surfaceDom.data.replaceChildren(...rows.map(([k, v]) => {
        const d = document.createElement('div');
        const dt = document.createElement('dt'); dt.className = 'text-slate-400'; dt.textContent = k;
        const dd = document.createElement('dd'); dd.className = 'text-white font-bold tabular-nums'; dd.textContent = v;
        d.append(dt, dd); return d;
    }));
}

const lerpKeys = (keys, p, i) => {
    let k = 0; while (k < keys.length - 2 && p > keys[k + 1][0]) k++;
    const a = keys[k], b = keys[k + 1];
    const t = Math.min(1, Math.max(0, (p - a[0]) / (b[0] - a[0])));
    return { v: a[i] + (b[i] - a[i]) * t, k, t };
};

function updateDescent(dt, time) {
    const cam = descent.camera;
    const size = renderer.getSize(new THREE.Vector2());
    if (cam.aspect !== size.x / size.y) { cam.aspect = size.x / size.y; cam.updateProjectionMatrix(); }
    descent.t = Math.min(1, descent.t + dt / descent.dur);
    const p = descent.t;
    const cfg = descent.cfg;

    if (cfg.corona) {
        // De ~25 a 6.1 millones de km de la superficie (récord de dic. 2024), a 692,000 km/h.
        const dKm = 25e6 - (25e6 - 6.1e6) * smooth01(0, 0.85, p);
        const solarR = 696000;
        const sceneD = 5000 * (1 + dKm / solarR) ;
        // teleobjetivo: el Sol llena la toma (su tamaño aparente real a esta distancia es ~2·asin(R/d))
        if (cam.fov !== 32) { cam.fov = 32; cam.updateProjectionMatrix(); }
        cam.position.set(sceneD * 0.12, sceneD * 0.06, sceneD);
        cam.lookAt(sceneD * 0.07, -sceneD * 0.02, 0);
        cam.rotateZ(Math.sin(time * 0.2) * 0.015);
        parker.position.copy(cam.position).add(new THREE.Vector3(4.2, -2.4, -20).applyQuaternion(cam.quaternion));
        parker.lookAt(0, 0, 0); // +z hacia el Sol: el escudo (z = 0) queda delante; cuerpo y paneles detrás, en su sombra
        parkerLight.position.set(0, 0, 0); parkerLight.target = parker;
        const heat = smooth01(0.1, 0.85, p);
        parkerShield.material.emissiveIntensity = heat * 0.9;
        for (let i = 0; i < SW_N; i++) {
            const r = 5100 + ((time * 900 + i * 37) % 30000);
            swPos[i * 3] = swSeed[i * 3] * r; swPos[i * 3 + 1] = swSeed[i * 3 + 1] * r; swPos[i * 3 + 2] = swSeed[i * 3 + 2] * r;
        }
        swGeo.attributes.position.needsUpdate = true;
        dSunGroup.rotation.y = time * 0.01;
        setReadout([
            ['DISTANCIA A LA SUPERFICIE', `${(dKm / 1e6).toFixed(1)} millones de km`],
            ['VELOCIDAD', `${Math.round(200000 + 492000 * smooth01(0, 0.85, p)).toLocaleString('es-CO')} km/h`],
            ['ESCUDO TÉRMICO (CARA AL SOL)', `${Math.round(200 + 1177 * heat).toLocaleString('es-CO')} °C`]
        ]);
        surfaceDom.fact.textContent = p < 0.4
            ? 'La corona está a más de un millón de grados, pero es tan poco densa que casi no transfiere calor: por eso la nave sobrevive.'
            : p < 0.85 ? 'Detrás de su escudo de carbono de 11 cm, los instrumentos se mantienen a unos 30 °C.'
            : 'Récord: 6.1 millones de km de la superficie y 692,000 km/h (24 de diciembre de 2024), el objeto más rápido hecho por humanos.';
        return;
    }

    // gigantes: la cámara cae por el eje y; cada capa de nubes es un plano a su altitud
    const keys = cfg.keys;
    const depth = lerpKeys(keys, p, 1).v;
    const pressure = lerpKeys(keys, p, 2).v;
    const temp = lerpKeys(keys, p, 3).v;
    const { k } = lerpKeys(keys, p, 1);
    const scale = 40; // 1 km = 40 unidades
    cam.position.set(Math.sin(time * 0.05) * 60, -depth * scale, Math.cos(time * 0.04) * 60);
    cam.rotation.set(-0.18 + Math.sin(time * 0.3) * 0.03, time * 0.03, Math.sin(time * 0.5) * 0.02, 'YXZ');
    cloudLayers.forEach((m, j) => {
        const i = Math.floor(j / SHEETS), s = j % SHEETS;
        const key = keys[Math.min(i + 1, keys.length - 1)];
        m.visible = i < keys.length - 1;
        m.position.y = -key[1] * scale + (s - SHEETS / 2) * SHEET_GAP;
        m.material.uniforms.uColor.value.set(key[5]);
        m.material.uniforms.uFlash.value = descent.flash;
    });
    // color del cielo y de la niebla según la capa actual
    const col = new THREE.Color(keys[k][5]).lerp(new THREE.Color(keys[Math.min(k + 1, keys.length - 1)][5]), lerpKeys(keys, p, 1).t);
    const dark = 1 - smooth01(0.4, 1, p) * 0.75;
    dSky.material.color.copy(col).multiplyScalar(dark).lerp(new THREE.Color(0xffffff), descent.flash * 0.6);
    descent.scene.fog.color.copy(dSky.material.color);
    cloudLayers.forEach(m => m.material.uniforms.uFogColor.value.copy(dSky.material.color));
    // jirones de nube que pasan junto a la cámara: sensación de caída
    wisps.forEach((w, i) => {
        w.position.y += dt * 260;
        if (w.position.y > cam.position.y + 900) { w.position.set(cam.position.x + (Math.random() - 0.5) * 1600, cam.position.y - 700, cam.position.z + (Math.random() - 0.5) * 1600); }
        w.material.color.copy(col);
        w.material.opacity = 0.35 * (1 - Math.abs(w.position.y - cam.position.y) / 900);
    });
    descent.scene.fog.density = 0.00006 + smooth01(0.2, 1, p) * 0.0004;
    // rayos en la capa de agua
    const storm = keys[Math.min(k + 1, keys.length - 1)][6] || keys[k][6];
    if (storm && Math.random() < dt * 0.9) { descent.flash = 1; if (audioEngine.isPlaying) audioEngine.playClickTone(70 + Math.random() * 40, 0.4); }
    descent.flash *= Math.exp(-dt * 7);

    const layer = keys[Math.min(k + (lerpKeys(keys, p, 1).t > 0.5 ? 1 : 0), keys.length - 1)];
    setReadout([
        ['PROFUNDIDAD', `${Math.round(depth)} km`],
        ['PRESIÓN', `${pressure < 1 ? pressure.toFixed(2) : pressure.toFixed(1)} bar`],
        ['TEMPERATURA', `${Math.round(temp)} °C`]
    ]);
    surfaceDom.fact.textContent = p >= 1 ? cfg.end : `Capa: ${layer[4]}`;
}

document.getElementById('surface-exit')?.addEventListener('click', exitDescent);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && descent.active) exitDescent(); });
