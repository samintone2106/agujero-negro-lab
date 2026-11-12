/* -------------------------------------------------------------------------- */
/* GÉNESIS: EFECTOS (LAVA, ONDAS DE CHOQUE, NEBULOSA, CHORROS, IMPACTOS...)     */
/* -------------------------------------------------------------------------- */
// Ruido simplex 3D (Ashima Arts / Stefan Gustavson, licencia MIT).
const GENESIS_NOISE_GLSL = `
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    float snoise(vec3 v) {
        const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0) * 2.0 + 1.0;
        vec4 s1 = floor(b1) * 2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
    }
    float fbm3(vec3 p) {
        float f = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++) { f += a * snoise(p); p *= 2.03; a *= 0.5; }
        return f;
    }
`;

const GENESIS_SPHERE_VS = `
    varying vec3 vPos;
    varying vec3 vNormalW;
    varying vec3 vViewDir;
    void main() {
        vPos = position;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
    }
`;

const genesisLightDir = new THREE.Vector3(18, 8, 16).normalize();

// Océano de magma que se enfría: lava -> corteza con grietas -> (océanos) -> se revela el planeta.
function makeLavaMaterial() {
    return new THREE.ShaderMaterial({
        vertexShader: GENESIS_SPHERE_VS,
        fragmentShader: GENESIS_NOISE_GLSL + `
            uniform float uTime;
            uniform float uHeat;
            uniform float uCover;
            uniform float uOcean;
            uniform vec3 uLight;
            varying vec3 vPos;
            varying vec3 vNormalW;
            varying vec3 vViewDir;
            void main() {
                vec3 p = normalize(vPos) * 2.2;
                float n = fbm3(p + vec3(0.0, uTime * 0.04, 0.0));
                float flow = fbm3(p * 2.0 - vec3(uTime * 0.09, 0.0, uTime * 0.05));
                float crack = 1.0 - smoothstep(0.0, 0.07, abs(snoise(p * 3.2 + flow * 0.4)));
                vec3 lava = mix(vec3(1.4, 0.28, 0.03), vec3(2.2, 1.35, 0.45), smoothstep(-0.2, 0.6, flow));
                float diffuse = max(0.06, dot(vNormalW, uLight));
                vec3 crust = vec3(0.11, 0.085, 0.07) * (0.7 + n * 0.6) * diffuse * 1.6;
                vec3 ocean = vec3(0.02, 0.09, 0.22) * (0.5 + diffuse * 1.4) + pow(max(0.0, dot(reflect(-uLight, vNormalW), vViewDir)), 24.0) * 0.6;
                crust = mix(crust, ocean, uOcean * smoothstep(0.05, -0.15, n));
                float solid = smoothstep(uHeat - 0.18, uHeat + 0.18, n * 0.5 + 0.5);
                vec3 col = mix(lava, crust, solid);
                col += lava * crack * solid * uHeat * 1.4;
                float rim = pow(1.0 - max(0.0, dot(vNormalW, vViewDir)), 3.0);
                col += vec3(1.0, 0.35, 0.08) * rim * uHeat * 0.8;
                gl_FragColor = vec4(col, uCover);
            }
        `,
        uniforms: {
            uTime: { value: 0 }, uHeat: { value: 1 }, uCover: { value: 1 }, uOcean: { value: 0 },
            uLight: { value: genesisLightDir }
        },
        transparent: true
    });
}

// Capa de neblina / escarcha con brillo en el borde (Titán, Venus, lunas heladas).
function makeRimMaterial(color) {
    return new THREE.ShaderMaterial({
        vertexShader: GENESIS_SPHERE_VS,
        fragmentShader: GENESIS_NOISE_GLSL + `
            uniform vec3 uColor;
            uniform float uOpacity;
            uniform float uTime;
            varying vec3 vPos;
            varying vec3 vNormalW;
            varying vec3 vViewDir;
            void main() {
                float rim = pow(1.0 - max(0.0, dot(vNormalW, vViewDir)), 2.2);
                float swirl = 0.75 + 0.25 * snoise(normalize(vPos) * 3.0 + vec3(uTime * 0.05));
                gl_FragColor = vec4(uColor * (0.4 + rim * 1.6) * swirl, (0.25 + rim * 0.75) * uOpacity);
            }
        `,
        uniforms: { uColor: { value: new THREE.Color(color) }, uOpacity: { value: 0 }, uTime: { value: 0 } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
}

// Supergigante roja con granulación convectiva y oscurecimiento del borde.
const supergiantMat = new THREE.ShaderMaterial({
    vertexShader: GENESIS_SPHERE_VS,
    fragmentShader: GENESIS_NOISE_GLSL + `
        uniform float uTime;
        uniform float uCollapse;
        varying vec3 vPos;
        varying vec3 vNormalW;
        varying vec3 vViewDir;
        void main() {
            vec3 p = normalize(vPos) * 3.0;
            float g = fbm3(p + vec3(uTime * 0.12, -uTime * 0.08, uTime * 0.05));
            float mu = max(0.0, dot(vNormalW, vViewDir));
            float limb = pow(mu, 0.6);
            vec3 col = mix(vec3(0.55, 0.06, 0.01), vec3(1.6, 0.55, 0.12), smoothstep(-0.35, 0.55, g)) * limb;
            col = mix(col, vec3(2.5, 2.3, 2.6), uCollapse);
            gl_FragColor = vec4(col, 1.0);
        }
    `,
    uniforms: { uTime: { value: 0 }, uCollapse: { value: 0 } }
});

// Anillo de onda de choque (siempre mirando a la cámara).
function makeShockwave() {
    const mat = new THREE.ShaderMaterial({
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: GENESIS_NOISE_GLSL + `
            uniform float uLife;
            uniform vec3 uColor;
            varying vec2 vUv;
            void main() {
                vec2 q = vUv - 0.5;
                float r = length(q) * 2.0;
                float ang = atan(q.y, q.x);
                float jag = 0.04 * snoise(vec3(cos(ang) * 3.0, sin(ang) * 3.0, uLife * 4.0));
                float dr = (r - 0.86 - jag) / 0.05;
                float ring = exp(-dr * dr);
                float inner = smoothstep(0.86, 0.0, r) * 0.18;
                float a = (ring + inner) * (1.0 - uLife);
                gl_FragColor = vec4(uColor * (1.0 + ring * 2.0), a);
            }
        `,
        uniforms: { uLife: { value: 1 }, uColor: { value: new THREE.Color(0xffd9a0) } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    mesh.visible = false;
    return mesh;
}

// Chorros bipolares con plasma que fluye.
function makeJetMaterial(color) {
    return new THREE.ShaderMaterial({
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: GENESIS_NOISE_GLSL + `
            uniform float uTime;
            uniform float uOpacity;
            uniform vec3 uColor;
            varying vec2 vUv;
            void main() {
                float along = vUv.y;
                float knots = 0.55 + 0.45 * snoise(vec3(vUv.x * 6.0, along * 5.0 - uTime * 3.0, 0.0));
                float a = pow(along, 1.6) * knots * uOpacity;
                gl_FragColor = vec4(uColor * (1.2 + knots), a);
            }
        `,
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 }, uColor: { value: new THREE.Color(color) } },
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide
    });
}

// Textura de nube (ruido fractal en canvas) para la nebulosa.
const genesisCloudTexture = (() => {
    const S = 256;
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    const img = g.createImageData(S, S);
    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const nx = x / S * 4, ny = y / S * 4;
            const n = fbm2D(nx, ny, 5);
            const dx = x / S - 0.5, dy = y / S - 0.5;
            const fall = Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) * 2);
            const v = Math.max(0, Math.min(1, (n - 0.35) * 2.2)) * fall * fall;
            const i = (y * S + x) * 4;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
            img.data[i + 3] = Math.round(v * 255);
        }
    }
    g.putImageData(img, 0, 0);
    return new THREE.CanvasTexture(c);
})();

/* --------------------------- ACTORES DEL GÉNESIS --------------------------- */
const genesisFx = new THREE.Group();
genesisFx.visible = false;
scene.add(genesisFx);

const lavaShell = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), makeLavaMaterial());
lavaShell.renderOrder = 4;
genesisFx.add(lavaShell);

const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), makeLavaMaterial());
genesisFx.add(coreMesh);

const hazeShell = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), makeRimMaterial(0xffa040));
hazeShell.renderOrder = 5;
genesisFx.add(hazeShell);

const impactorMat = makeLavaMaterial();
const impactor = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), impactorMat);
genesisFx.add(impactor);
const impactorGlow = makeGlowSprite(0xff8a3a, 1, 0);
genesisFx.add(impactorGlow);

const supergiant = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), supergiantMat);
genesisFx.add(supergiant);
const supergiantGlow = makeGlowSprite(0xff4a1c, 1, 0.8);
genesisFx.add(supergiantGlow);

const genesisJets = new THREE.Group();
const jetMatStar = makeJetMaterial(0xffc890);
[1, -1].forEach(s => {
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 1.1, 14, 40, 1, true), jetMatStar);
    cone.position.y = s * 7.4;
    if (s < 0) cone.rotation.x = Math.PI;
    genesisJets.add(cone);
});
genesisFx.add(genesisJets);

const genesisShocks = [makeShockwave(), makeShockwave(), makeShockwave()];
genesisShocks.forEach(s => genesisFx.add(s));

const nebulaSprites = [];
for (let i = 0; i < 12; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
        map: genesisCloudTexture, transparent: true, depthWrite: false,
        blending: THREE.AdditiveBlending, opacity: 0, rotation: Math.random() * Math.PI * 2
    }));
    s.userData.phase = Math.random() * Math.PI * 2;
    s.userData.spin = (Math.random() - 0.5) * 0.04;
    nebulaSprites.push(s);
    genesisFx.add(s);
}

// Bombardeo: meteoros que caen y destellan al impactar.
const METEOR_COUNT = 22;
const meteors = [];
for (let i = 0; i < METEOR_COUNT; i++) {
    const head = makeGlowSprite(0xffd2a0, 0.4, 0);
    const hit = makeGlowSprite(0xff7a30, 1, 0);
    genesisFx.add(head, hit);
    meteors.push({ head, hit, t0: 0, dur: 1, from: new THREE.Vector3(), to: new THREE.Vector3(), fired: false });
}

// Dos agujeros negros que espiralean y se fusionan (ondas gravitacionales).
const mergerGroup = new THREE.Group();
const mergerBodies = [0, 1].map(() => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshBasicMaterial({ color: 0x000000 })));
    const halo = makeGlowSprite(0xffb070, 3.2, 0.9);
    g.add(halo);
    mergerGroup.add(g);
    return g;
});
genesisFx.add(mergerGroup);

// Escombros del impacto gigante.
const DEBRIS_COUNT = 1400;
const debrisGeo = new THREE.BufferGeometry();
debrisGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DEBRIS_COUNT * 3), 3));
const debrisVel = new Float32Array(DEBRIS_COUNT * 3);
const debrisPoints = new THREE.Points(debrisGeo, new THREE.PointsMaterial({
    map: roundDotTexture, color: 0xffa060, size: 0.14, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false
}));
debrisPoints.frustumCulled = false;
genesisFx.add(debrisPoints);

const genesisFlash = makeGlowSprite(0xffffff, 1, 0);
genesisFlash.visible = false;
scene.add(genesisFlash);

const GENESIS_FX_ACTORS = [lavaShell, coreMesh, hazeShell, impactor, impactorGlow, supergiant, supergiantGlow,
    genesisJets, mergerGroup, debrisPoints, ...genesisShocks, ...nebulaSprites,
    ...meteors.flatMap(m => [m.head, m.hit])];

function resetGenesisFx() {
    GENESIS_FX_ACTORS.forEach(o => { o.visible = false; });
    meteors.forEach(m => { m.fired = false; });
}

function placeNebula(R, colors) {
    const cA = new THREE.Color(colors[0]);
    const cB = new THREE.Color(colors[1]);
    nebulaSprites.forEach((s, i) => {
        const a = (i / nebulaSprites.length) * Math.PI * 2 + Math.random() * 0.5;
        const d = R * (3 + Math.random() * 9);
        s.position.set(Math.cos(a) * d, (Math.random() - 0.5) * R * 5, Math.sin(a) * d - R * 4);
        const sc = R * (8 + Math.random() * 10);
        s.scale.set(sc, sc, 1);
        s.material.color.copy(cA).lerp(cB, Math.random());
        s.userData.base = 0.18 + Math.random() * 0.22;
    });
}

function updateNebula(k, time) {
    nebulaSprites.forEach(s => {
        s.visible = k > 0.002;
        s.material.opacity = s.userData.base * k * (0.85 + 0.15 * Math.sin(time * 0.4 + s.userData.phase));
        s.material.rotation += s.userData.spin * 0.016;
    });
}

// Lanza un anillo de choque en `pos` (coordenadas locales de genesisFx).
function fireShock(pos, size, color, duration) {
    const s = genesisShocks.find(x => !x.visible) || genesisShocks[0];
    s.visible = true;
    s.position.copy(pos);
    s.userData = { born: performance.now(), size, duration };
    s.material.uniforms.uColor.value.set(color);
    s.material.uniforms.uLife.value = 0;
}

function updateShocks(now) {
    genesisShocks.forEach(s => {
        if (!s.visible) return;
        const life = (now - s.userData.born) / s.userData.duration;
        if (life >= 1) { s.visible = false; return; }
        const sc = s.userData.size * (0.15 + Math.pow(life, 0.55) * 1.0);
        s.scale.set(sc, sc, sc);
        s.quaternion.copy(camera.quaternion);
        s.material.uniforms.uLife.value = life;
    });
}

// Programa los meteoros entre `from` y `to` (progreso 0..1).
function scheduleMeteors(R, from, to, total) {
    meteors.forEach((m, i) => {
        m.t0 = from + (to - from) * (i / METEOR_COUNT) + Math.random() * 0.01;
        m.dur = (0.012 + Math.random() * 0.01);
        const dir = new THREE.Vector3(Math.random() - 0.5, (Math.random() - 0.5) * 0.8, Math.random() - 0.2).normalize();
        m.to.copy(dir).multiplyScalar(R * 1.0);
        m.from.copy(dir).multiplyScalar(R * 7).add(new THREE.Vector3((Math.random() - 0.5) * R * 3, R * 2, 0));
        m.fired = false;
        m.total = total;
    });
}

function updateMeteors(prog, onHit) {
    meteors.forEach(m => {
        const k = (prog - m.t0) / m.dur;
        m.head.visible = k > 0 && k < 1;
        if (m.head.visible) {
            m.head.position.copy(m.from).lerp(m.to, k * k);
            m.head.material.opacity = 0.9;
            const s = 0.25 + k * 0.35;
            m.head.scale.set(s, s, 1);
        }
        if (k >= 1 && !m.fired) { m.fired = true; m.hitAt = prog; onHit && onHit(m); }
        const h = m.fired ? 1 - (prog - m.hitAt) / 0.02 : 0;
        m.hit.visible = h > 0;
        if (m.hit.visible) {
            m.hit.position.copy(m.to).multiplyScalar(1.02);
            m.hit.material.opacity = h;
            const s = 0.6 + (1 - h) * 1.4;
            m.hit.scale.set(s, s, 1);
        }
    });
}
