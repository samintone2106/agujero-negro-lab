/* -------------------------------------------------------------------------- */
/* VISTA DE SUPERFICIE: ATERRIZAR Y CAMINAR                                    */
/* -------------------------------------------------------------------------- */
// Escena aparte, a escala real (1 unidad = 1 m): terreno con la curvatura del
// astro (el horizonte cae donde caería de verdad), cielo propio, rocas cercanas
// y rasgos de cada sitio (torbellinos de Marte, pluma de Ío, lago de Titán...).
const surface = {
    active: false, site: null, id: null,
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(68, 1, 0.05, 90000),
    yaw: 0, pitch: 0.05, keys: new Set(),
    built: {}
};

const SURF_NEAR = 700, SURF_FAR = 14000;
// Objetos sólidos del sitio (rocas, árboles, naves) para la física: los llena buildSite.
let SURF_COLLIDERS = null;
function surfCollide(c) { if (SURF_COLLIDERS) SURF_COLLIDERS.push(c); }

function surfRng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

// Altura del terreno en (x, z) metros, incluida la caída por curvatura.
function makeHeightFn(site, seed) {
    const rnd = surfRng(seed);
    const craters = [];
    for (let i = 0; i < (site.craters || 0); i++) {
        const r = 6 + Math.pow(rnd(), 3.2) * 900;
        const c = { x: (rnd() - 0.5) * SURF_FAR * 1.6, z: (rnd() - 0.5) * SURF_FAR * 1.6, r, d: r * (0.18 + rnd() * 0.08) };
        if (Math.hypot(c.x, c.z) < r * 1.8 + 40) continue; // el punto de llegada queda en terreno llano
        craters.push(c);
    }
    // un cráter cercano siempre visible para dar escala
    if (site.craters) craters.push({ x: 120, z: -260, r: 70, d: 14 });
    // cráteres hondos a pocos pasos, para bajar caminando o saltando: [x, z, radio]
    (site.nearCraters || []).forEach(([x, z, r]) => craters.push({ x, z, r, d: r * 0.3 }));
    const R = site.radiusKm * 1000;
    const pk = site.peaks || 0;
    return (x, z) => {
        let h = 0;
        if (pk) {
            // cordillera lejana: plana cerca de la llegada, montañas hacia el horizonte
            const dist = Math.hypot(x, z);
            const far = Math.min(1, Math.max(0, (dist - 900) / 2600));
            if (far > 0) h += pk * far * far * Math.pow(Math.max(0, fbm2D(x / 2600 + 4, z / 2600 - 2, 4) - 0.42) * 2.4, 1.6);
        }
        h += (fbm2D(x / 900 + seed, z / 900, 5) - 0.5) * site.relief * 4
            + (fbm2D(x / 120, z / 120 + seed, 4) - 0.5) * site.relief * 0.6
            + (fbm2D(x / 12, z / 12, 3) - 0.5) * site.relief * 0.05;
        if (site.dunes) h += Math.sin((x * 0.8 + z * 0.6) / 38 + fbm2D(x / 300, z / 300, 2) * 6) * 1.6;
        if (site.ridges) {
            const ridge = (u) => Math.exp(-Math.pow(((u % 260) + 260) % 260 - 130, 2) / 30);
            h += ridge(x * 0.9 + z * 0.4 + fbm2D(x / 400, z / 400, 2) * 200) * 9 + ridge(x * -0.3 + z * 0.95) * 6;
        }
        if (site.cells) {
            const cx = Math.floor(x / 260), cz = Math.floor(z / 260);
            let best = 1e9, second = 1e9;
            for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
                const px = (cx + i + pseudoNoise2D(cx + i, cz + j)) * 260, pz = (cz + j + pseudoNoise2D(cz + j, cx + i + 7)) * 260;
                const d = Math.hypot(x - px, z - pz);
                if (d < best) { second = best; best = d; } else if (d < second) second = d;
            }
            h += Math.min(1, (second - best) / 25) * 3 - 3; // surcos entre celdas de convección
        }
        for (let i = 0; i < craters.length; i++) {
            const c = craters[i];
            const dx = x - c.x, dz = z - c.z;
            const d2 = dx * dx + dz * dz;
            const lim = c.r * 1.6;
            if (d2 > lim * lim) continue;
            const t = Math.sqrt(d2) / c.r;
            h += t < 1 ? -c.d * (1 - t * t) + c.d * 0.25 : c.d * 0.25 * Math.exp(-Math.pow((t - 1) * 3, 2));
        }
        // curvatura: a una distancia s el suelo baja s²/2R
        return h - (x * x + z * z) / (2 * R);
    };
}

function buildTerrainMesh(size, segs, heightFn, site, far) {
    const geo = new THREE.PlaneGeometry(size, size, segs, segs);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const [lo, hi] = site.ground;
    for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), z = pos.getZ(i);
        const y = heightFn(x, z);
        pos.setY(i, y);
        const n = fbm2D(x / 60 + 3, z / 60, 3);
        const t = Math.min(1, Math.max(0, n * 1.3 - 0.15));
        colors[i * 3] = lo[0] + (hi[0] - lo[0]) * t;
        colors[i * 3 + 1] = lo[1] + (hi[1] - lo[1]) * t;
        colors[i * 3 + 2] = lo[2] + (hi[2] - lo[2]) * t;
        if (site.lava) {
            // azufre rojo y lava negra de los volcanes de Ío
            const sp = fbm2D(x / 140 + 11, z / 140, 3);
            if (sp > 0.62) { colors[i * 3] = 0.55; colors[i * 3 + 1] = 0.18; colors[i * 3 + 2] = 0.08; }
            if (sp > 0.7) { colors[i * 3] = 0.06; colors[i * 3 + 1] = 0.05; colors[i * 3 + 2] = 0.04; }
        }
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: site.roughness, metalness: 0, flatShading: false });
    if (far) { mat.polygonOffset = true; mat.polygonOffsetFactor = 2; mat.polygonOffsetUnits = 8; }
    // grano fino del suelo en espacio de mundo (no depende del tamaño de los polígonos)
    mat.onBeforeCompile = (sh) => {
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWorldP;')
            .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
            varying vec3 vWorldP;
            float sH(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
            float sN(vec2 p) { vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
                return mix(mix(sH(i), sH(i + vec2(1, 0)), f.x), mix(sH(i + vec2(0, 1)), sH(i + vec2(1, 1)), f.x), f.y); }`)
            .replace('#include <color_fragment>', `#include <color_fragment>
            // grano del suelo: las frecuencias finas se apagan con la distancia (si no, hacen moiré)
            float camD = length(vWorldP - cameraPosition);
            float fine = 1.0 - smoothstep(6.0, 40.0, camD);
            float mid = 1.0 - smoothstep(40.0, 260.0, camD);
            float g = sN(vWorldP.xz * 0.6) * 0.35 + (sN(vWorldP.xz * 3.0) * 0.5 - 0.25) * mid + (sN(vWorldP.xz * 18.0) * 0.15 - 0.075) * fine + 0.33;
            diffuseColor.rgb *= 0.8 + g * 0.36;`)
            // relieve fino (piedritas, ondulaciones) con un gradiente suave: no depende del tamaño de los polígonos
            .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
            {
                float fade = 1.0 - smoothstep(8.0, 45.0, length(vWorldP - cameraPosition));
                if (fade > 0.0) {
                    vec2 q = vWorldP.xz; float e = 0.04;
                    float h0 = sN(q * 1.3) * 0.7 + sN(q * 5.0) * 0.3;
                    float hx = sN((q + vec2(e, 0.0)) * 1.3) * 0.7 + sN((q + vec2(e, 0.0)) * 5.0) * 0.3;
                    float hz = sN((q + vec2(0.0, e)) * 1.3) * 0.7 + sN((q + vec2(0.0, e)) * 5.0) * 0.3;
                    vec3 bumpW = vec3(-(hx - h0) / e, 0.0, -(hz - h0) / e) * 0.05 * fade;
                    normal = normalize(normal + (viewMatrix * vec4(bumpW, 0.0)).xyz);
                }
            }`);
    };
    return new THREE.Mesh(geo, mat);
}

function buildSky(site) {
    const s = site.sky;
    const sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - s.sunElev), THREE.MathUtils.degToRad(35)).normalize();
    const mat = new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: {
            uZenith: { value: new THREE.Color(s.zenith) }, uHorizon: { value: new THREE.Color(s.horizon) },
            uHalo: { value: new THREE.Color(s.halo) }, uSun: { value: sunDir }, uSunColor: { value: new THREE.Color(s.sunColor) },
            uSunSize: { value: THREE.MathUtils.degToRad(Math.max(0.05, s.sunDeg) / 2) }, uSunVisible: { value: s.sunDeg > 0 ? 1 : 0 }
        },
        vertexShader: 'varying vec3 vDir; void main() { vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `
            uniform vec3 uZenith, uHorizon, uHalo, uSun, uSunColor;
            uniform float uSunSize, uSunVisible;
            varying vec3 vDir;
            void main() {
                vec3 d = normalize(vDir);
                float e = max(d.y, 0.0);
                vec3 col = mix(uHorizon, uZenith, pow(e, 0.45));
                float cosA = dot(d, uSun);
                float ang = acos(clamp(cosA, -1.0, 1.0));
                col += uHalo * exp(-ang * 4.0) * 0.6 + uHalo * exp(-ang * 18.0) * 0.6;
                float disk = 1.0 - smoothstep(uSunSize * 0.9, uSunSize * 1.1, ang);
                col = mix(col, uSunColor * 2.5, disk * uSunVisible);
                col += uSunColor * exp(-ang / max(uSunSize, 0.002) * 0.5) * 0.25 * uSunVisible;
                if (d.y < 0.0) col = mix(col, uHorizon * 0.6, smoothstep(0.0, -0.2, d.y));
                gl_FragColor = vec4(col, 1.0);
            }
        `
    });
    const sky = new THREE.Mesh(new THREE.SphereGeometry(60000, 48, 24), mat);
    return { sky, sunDir };
}

function buildStars() {
    const n = 4000, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
        const u = Math.random() * 2 - 1, th = Math.random() * Math.PI * 2, s = Math.sqrt(1 - u * u);
        const v = new THREE.Vector3(s * Math.cos(th), u, s * Math.sin(th)).multiplyScalar(55000);
        if (v.y < -2000) v.y = -v.y;
        p.set([v.x, v.y, v.z], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    return new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, map: roundDotTexture, transparent: true, depthWrite: false, fog: false }));
}

function buildRocks(site, heightFn, seed) {
    const rnd = surfRng(seed + 99);
    const count = Math.round((site.pebbles ? 2600 : 1600) * (site.rockMul ?? 1));
    const geo = new THREE.SphereGeometry(1, 22, 16); // indexada: normales suaves, sin facetas
    if (!site.pebbles) {
        const p = geo.attributes.position;
        // roca: esfera achatada y abollada con ruido suave (sin facetas)
        const v = new THREE.Vector3();
        for (let i = 0; i < p.count; i++) {
            v.fromBufferAttribute(p, i);
            const n = 1 + (fbm2D(v.x * 1.7 + 3, v.y * 1.7 + v.z * 1.3, 3) - 0.5) * 0.6;
            p.setXYZ(i, v.x * n, v.y * n * 0.6, v.z * n);
        }
        geo.computeVertexNormals();
    } else geo.scale(1, 0.6, 1);
    const [lo, hi] = site.ground;
    const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(lo[0] * 0.9, lo[1] * 0.9, lo[2] * 0.9), roughness: site.pebbles ? 0.55 : 0.95 });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
        const r = Math.sqrt(rnd()) * 260, a = rnd() * Math.PI * 2;
        p.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        const size = 0.04 + Math.pow(rnd(), 4) * (site.pebbles ? 0.25 : 1.6);
        p.y = heightFn(p.x, p.z) + size * 0.2;
        if (size > 0.25) surfCollide({ t: 'ball', x: p.x, y: p.y, z: p.z, r: size * 0.7 });
        q.setFromEuler(new THREE.Euler(rnd() * 3, rnd() * 3, rnd() * 3));
        s.set(size, size, size);
        mesh.setMatrixAt(i, m.compose(p, q, s));
    }
    return mesh;
}

// Astro grande en el cielo (Tierra desde la Luna, Júpiter desde Ío...) con su fase real.
function buildSkyBody(sb) {
    const D = 40000;
    const radius = D * Math.tan(THREE.MathUtils.degToRad(sb.deg / 2));
    const mat = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, fog: false });
    if (sb.tex) loadTextureWithFallback([TEX + sb.tex], (t) => { mat.map = t; mat.needsUpdate = true; });
    if (sb.look) { const t = makeMoonTexture(sb.look); mat.map = t.map; }
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 64), mat);
    const group = new THREE.Group();
    group.position.setFromSphericalCoords(D, THREE.MathUtils.degToRad(90 - sb.elev), THREE.MathUtils.degToRad(sb.az));
    group.add(mesh);
    group.lookAt(0, 0, 0); // +z del grupo hacia quien observa
    if (sb.rings) {
        // desde una luna que orbita en el plano de los anillos, se ven casi de canto (una línea fina)
        const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 1.24, radius * 2.27, 160, 1),
            new THREE.MeshBasicMaterial({ color: 0xd8ccb0, side: THREE.DoubleSide, transparent: true, opacity: 0.7, fog: false }));
        ring.rotation.x = Math.PI / 2 - THREE.MathUtils.degToRad(2.5);
        group.add(ring);
        group.rotateZ(THREE.MathUtils.degToRad(-12));
    }
    return group;
}

// Géiseres (Encélado: vapor de agua blanco; Tritón: nitrógeno con polvo oscuro).
function buildGeysers(color, heightFn, seed) {
    const rnd = surfRng(seed + 31);
    const dark = new THREE.Color(color).getHSL({}).l < 0.3;
    const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
        uniforms: { uTime: sharedUniforms.uTime, uColor: { value: new THREE.Color(color) } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `
            uniform float uTime; uniform vec3 uColor; varying vec2 vUv;
            float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
            void main() {
                float y = vUv.y, x = (vUv.x - 0.5) / mix(0.08, 0.5, pow(y, 0.8));
                float body = exp(-x * x * 3.0) * smoothstep(0.0, 0.05, y) * (1.0 - smoothstep(0.6, 1.0, y));
                float flick = 0.7 + 0.3 * sin(y * 30.0 - uTime * 6.0 + h(vec2(floor(vUv.x * 8.0))) * 6.0);
                gl_FragColor = vec4(uColor, body * flick * ${dark ? '0.75' : '0.55'});
            }
        `
    });
    const group = new THREE.Group();
    for (let i = 0; i < 6; i++) {
        const d = 700 + rnd() * 2800, a = rnd() * Math.PI * 2;
        const x = Math.cos(a) * d, z = Math.sin(a) * d;
        const H = dark ? 2000 + rnd() * 6000 : 800 + rnd() * 2500;
        const g = new THREE.Group();
        [0, Math.PI / 2].forEach(r => {
            const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
            const m = new THREE.Mesh(geo, mat); m.rotation.y = r; m.scale.set(H * 0.35, H, 1); g.add(m);
        });
        if (dark) g.rotation.z = 0.35; // en Tritón el viento tuerce las columnas
        g.position.set(x, heightFn(x, z), z);
        group.add(g);
    }
    return group;
}

// Torbellinos de polvo de Marte a escala real: 100–200 m de ancho, 1–8 km de alto.
function buildDevils(heightFn, seed) {
    const rnd = surfRng(seed + 7);
    const mat = marsDevilMat.clone();
    mat.uniforms.uTime = sharedUniforms.uTime;
    mat.uniforms.uVis = { value: 1 };
    mat.fog = false;
    const group = new THREE.Group();
    for (let i = 0; i < 7; i++) {
        const h = 1200 + Math.pow(rnd(), 2) * 7000, w = 90 + rnd() * 160;
        const devil = new THREE.Group();
        [0, Math.PI / 2].forEach(r => {
            const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0);
            const m = new THREE.Mesh(geo, mat); m.rotation.y = r; m.scale.set(w * 1.6, h, 1);
            devil.add(m);
        });
        const d = 4000 + rnd() * 9000, a = rnd() * Math.PI * 2; // el horizonte está a ~3.4 km: algunos asoman por detrás
        devil.userData = { a, d, speed: (rnd() - 0.5) * 0.01 };
        group.add(devil);
    }
    group.userData.heightFn = heightFn;
    return group;
}

// Pluma volcánica de Ío (paraguas de azufre).
function buildPlume() {
    const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
        uniforms: { uTime: sharedUniforms.uTime },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `
            uniform float uTime; varying vec2 vUv;
            void main() {
                vec2 p = vUv - vec2(0.5, 0.0);
                float r = length(vec2(p.x * 1.2, p.y - 0.62));
                float umbrella = smoothstep(0.42, 0.3, r) * smoothstep(0.08, 0.3, vUv.y);
                float stem = smoothstep(0.06, 0.0, abs(p.x)) * (1.0 - smoothstep(0.0, 0.7, vUv.y));
                float a = max(umbrella * (0.25 + 0.15 * sin(uTime + vUv.y * 20.0)), stem * 0.7);
                gl_FragColor = vec4(vec3(0.95, 0.9, 0.7), a * 0.6);
            }
        `
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(200000, 120000), mat);
    m.position.set(-60000, 50000, -110000);
    m.lookAt(0, 0, 0);
    return m;
}

function buildSite(id) {
    if (surface.built[id]) return surface.built[id];
    const site = SURFACE_SITES[id];
    const seed = [...id].reduce((a, c) => a + c.charCodeAt(0), 0) * 7 + 13;
    const heightFn = makeHeightFn(site, seed);
    SURF_COLLIDERS = [];
    const root = new THREE.Group();
    const near = buildTerrainMesh(SURF_NEAR, 400, heightFn, site, false); // ~1.75 m por polígono
    const far = buildTerrainMesh(SURF_FAR, 256, heightFn, site, true);
    root.add(near, far);
    const { sky, sunDir } = buildSky(site);
    root.add(sky);
    if (site.sky.stars) root.add(buildStars());
    const sun = new THREE.DirectionalLight(site.sky.sunColor, site.fog > 0.001 ? 1.2 : (site.sky.stars ? 1.5 : 2.2));
    sun.position.copy(sunDir).multiplyScalar(1000);
    root.add(sun);
    root.add(new THREE.HemisphereLight(site.sky.horizon, 0x0a0806, site.sky.stars ? 0.12 : 0.55));
    root.add(buildRocks(site, heightFn, seed));
    if (site.skyBody) root.add(buildSkyBody(site.skyBody));
    let devils = null;
    if (site.devils) { devils = buildDevils(heightFn, seed); root.add(devils); }
    if (site.plume) root.add(buildPlume());
    if (site.geysers) root.add(buildGeysers(site.geysers, heightFn, seed));
    if (site.sea || site.lake) {
        const water = new THREE.Mesh(new THREE.CircleGeometry(SURF_FAR * 0.7, 96), new THREE.MeshStandardMaterial({
            color: site.sea || site.lake, roughness: 0.15, metalness: 0.3, transparent: true, opacity: site.lake ? 0.95 : 0.85
        }));
        water.rotation.x = -Math.PI / 2;
        water.position.y = site.lake ? -4 : -10;
        root.add(water);
    }
    // vida y detalle propios de cada mundo (árboles, rover, módulo lunar, lluvia...): js/surface/biomes.js
    const biome = buildBiome(id, site, heightFn, seed, devils);
    if (biome) root.add(biome.group);
    const colliders = SURF_COLLIDERS; SURF_COLLIDERS = null;
    return (surface.built[id] = { root, heightFn, devils, site, biome, colliders });
}

/* ------------------------------ entrar / salir ------------------------------ */
const surfaceDom = {
    btn: document.getElementById('land-btn'),
    hud: document.getElementById('surface-hud'),
    title: document.getElementById('surface-title'),
    note: document.getElementById('surface-note-text'),
    data: document.getElementById('surface-data'),
    fact: document.getElementById('surface-fact'),
    fade: document.getElementById('surface-fade')
};

function canLand(id) { return !!SURFACE_SITES[id]; }
const siteName = (id) => SURFACE_SITES[id].name || ASTRO_TARGETS[id].name.split(' (')[0];

function syncLandButton() {
    if (!surfaceDom.btn) return;
    const id = state.currentTarget;
    const descend = typeof DESCENTS !== 'undefined' && !!DESCENTS[id];
    surfaceDom.btn.hidden = !(canLand(id) || descend);
    const label = surfaceDom.btn.querySelector('span');
    if (label) label.textContent = id === 'sun' ? 'ROZAR LA CORONA' : descend ? 'DESCENDER' : 'ATERRIZAR';
    surfaceDom.btn.setAttribute('aria-label', label ? label.textContent : 'Aterrizar');
}

function fadeThen(fn) {
    surfaceDom.fade.classList.add('is-on');
    setTimeout(() => {
        try { fn(); } finally { requestAnimationFrame(() => surfaceDom.fade.classList.remove('is-on')); }
    }, 320);
}

function enterSurface(id = state.currentTarget, opts = {}) {
    if (!canLand(id)) return;
    if (typeof genesis !== 'undefined' && genesis.active) stopGenesis(true);
    fadeThen(() => {
        const built = buildSite(id);
        surface.scene.clear();
        surface.scene.add(built.root);
        const site = built.site;
        surface.scene.fog = site.fog ? new THREE.FogExp2(site.sky.horizon, site.fog) : null;
        surface.active = true; surface.id = id; surface.site = built;
        surface.yaw = Math.PI * 0.8; surface.pitch = 0.04;
        controls.enabled = false;
        document.body.classList.add('surface-mode');
        const s = SURFACE_SITES[id];
        surfaceDom.title.textContent = `${siteName(id)} · ${s.place}`;
        surfaceDom.note.textContent = s.note;
        surfaceDom.data.replaceChildren(...[['GRAVEDAD', s.gravity], ['TEMPERATURA', s.temp], ['PRESIÓN', s.pressure]].map(([k, v]) => {
            const d = document.createElement('div');
            const dt = document.createElement('dt'); dt.className = 'text-slate-400'; dt.textContent = k;
            const dd = document.createElement('dd'); dd.className = 'text-white font-bold'; dd.textContent = v;
            d.append(dt, dd); return d;
        }));
        surface.factIdx = 0;
        surfaceDom.fact.textContent = s.facts[0];
        surfaceDom.hud.hidden = false;
        resetPlayer(id);
        // física real, astronauta animado y cohete (src/surface/game.js) si ya cargó
        if (window.surfaceGame && surfaceGame.ready) surfaceGame.enter(id, opts);
        audioEngine.playClickTone(520, 0.08);
    });
}

function exitSurface() {
    if (!surface.active) return;
    fadeThen(() => {
        surface.active = false;
        controls.enabled = true;
        document.body.classList.remove('surface-mode');
        surfaceDom.hud.hidden = true;
        if (window.surfaceGame) surfaceGame.exit(); // también cancela una carga en curso
        syncPlayerCam();
    });
}

/* ------------------------------ por cuadro ------------------------------ */
function updateSurface(dt, time) {
    const cam = surface.camera;
    const size = renderer.getSize(new THREE.Vector2());
    if (cam.aspect !== size.x / size.y) { cam.aspect = size.x / size.y; cam.updateProjectionMatrix(); }
    // caminar, correr, saltar y la cámara: src/surface/game.js (o js/surface/player.js mientras carga)
    if (window.surfaceGame && surfaceGame.active) surfaceGame.update(dt, time);
    else updatePlayer(dt);

    if (surface.site.biome) surface.site.biome.update(dt, time);
    const dv = surface.site.devils;
    if (dv) dv.children.forEach(d => {
        d.userData.a += d.userData.speed * dt;
        const x = Math.cos(d.userData.a) * d.userData.d, z = Math.sin(d.userData.a) * d.userData.d;
        d.position.set(x, surface.site.heightFn(x, z), z);
    });
}

/* ------------------------------ controles ------------------------------ */
(() => {
    // un solo dedo gira la cámara (el del joystick no cuenta): se sigue por pointerId
    let drag = null;
    const el = renderer.domElement;
    el.addEventListener('pointerdown', (e) => { if (surface.active && !drag) drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
    const endDrag = (e) => { if (!e || !drag || e.pointerId === drag.id) drag = null; };
    window.addEventListener('pointerup', endDrag);
    window.addEventListener('pointercancel', endDrag);
    window.addEventListener('blur', () => { drag = null; });
    window.addEventListener('pointermove', (e) => {
        if (!surface.active || !drag || e.pointerId !== drag.id) return;
        surface.yaw += (e.clientX - drag.x) * 0.004;
        surface.pitch = Math.max(-1.2, Math.min(1.2, surface.pitch + (e.clientY - drag.y) * 0.004));
        drag = { id: drag.id, x: e.clientX, y: e.clientY };
    });
    window.addEventListener('keydown', (e) => {
        if (!surface.active || e.target.closest('input, textarea, select')) return;
        if (e.key === 'Escape') { exitSurface(); return; }
        surface.keys.add(e.key.toLowerCase());
    });
    window.addEventListener('keyup', (e) => surface.keys.delete(e.key.toLowerCase()));
    window.addEventListener('blur', () => surface.keys.clear());

    surfaceDom.btn?.addEventListener('click', () => startLanding());
    // SUBIR: volver al cohete y despegar (si hay cohete), si no, salir directo
    document.getElementById('surface-exit')?.addEventListener('click', () => {
        if (!surface.active) return;
        if (window.surfaceGame && surfaceGame.active && surfaceGame.phase === 'play') surfaceGame.takeoff();
        else exitSurface();
    });
    document.getElementById('surface-next-fact')?.addEventListener('click', () => {
        const facts = SURFACE_SITES[surface.id].facts;
        surface.factIdx = (surface.factIdx + 1) % facts.length;
        surfaceDom.fact.textContent = facts[surface.factIdx];
    });
    // joystick y botones táctiles: js/surface/player.js
})();
