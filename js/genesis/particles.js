/* -------------------------------------------------------------------------- */
/* GÉNESIS: PARTÍCULAS (GAS BRILLANTE + POLVO OSCURO)                          */
/* -------------------------------------------------------------------------- */
// Cada partícula guarda su posición inicial (aStart) y semillas (aSeed).
// El shader la mueve según el tipo de formación:
//  0 disco rocoso: rotación kepleriana, anillos y huecos (como HL Tauri), caída al planeta.
//  1 colapso estelar: filamentos -> disco + protoestrella, el viento barre el disco.
//  2 supernova: capa que se expande con dedos de Rayleigh-Taylor.
//  3 agujero negro: caída en espiral a un disco delgado con brillo Doppler.
//  4 gigante gaseoso: núcleo de guijarros y luego envoltura de gas en bandas.

const GENESIS_PARTICLE_VS = `
    attribute vec3 aStart;
    attribute vec4 aSeed;
    uniform float uTime;
    uniform float uMode;
    uniform float uP;
    uniform float uClump;
    uniform float uExpand;
    uniform float uHeat;
    uniform float uFinalR;
    uniform float uBand;
    uniform float uSize;
    uniform float uPx;
    uniform float uDust;
    uniform vec3 uColA;
    uniform vec3 uColB;
    uniform vec3 uDustCol;
    varying vec3 vCol;
    varying float vA;

    vec3 blackbody(float t) {
        vec3 c = mix(vec3(0.35, 0.02, 0.0), vec3(1.0, 0.28, 0.04), smoothstep(0.0, 0.25, t));
        c = mix(c, vec3(1.0, 0.72, 0.36), smoothstep(0.25, 0.5, t));
        c = mix(c, vec3(1.0, 0.96, 0.9), smoothstep(0.5, 0.78, t));
        return mix(c, vec3(0.68, 0.8, 1.0), smoothstep(0.82, 1.0, t));
    }

    void main() {
        float rnd = aSeed.x;
        float rnd2 = aSeed.y;
        float p = clamp(uP * (0.72 + rnd * 0.56), 0.0, 1.0);
        float e = 1.0 - pow(1.0 - p, 3.0);
        float r0 = length(aStart.xz);
        float a0 = atan(aStart.z, aStart.x);
        vec3 sdir = normalize(aStart + vec3(1e-4));
        vec3 pos;
        float t = 0.0;
        float alpha = 1.0;
        float beam = 1.0;

        if (uMode < 0.5) {
            // disco rocoso -> anillos -> planeta
            float band = (floor(r0 / uBand) + 0.5) * uBand;
            float r = mix(r0, band, uClump * step(0.25, rnd2));
            r *= 1.0 + 0.05 * sin(2.0 * a0 - 3.0 * log(r0 + 1.0) + uTime * 0.3);
            float rc = mix(r, uFinalR, e);
            float a = a0 + uTime * 2.6 * pow(max(rc, 0.6), -1.5) * 3.0;
            vec3 disk = vec3(cos(a) * rc, aStart.y * (1.0 - uClump * 0.6), sin(a) * rc);
            vec3 surf = normalize(vec3(cos(a), aSeed.z, sin(a))) * uFinalR * (0.96 + rnd * 0.05);
            pos = mix(disk, surf, smoothstep(0.55, 1.0, e));
            t = uHeat * (0.25 + e * 0.75) + 0.35 / (1.0 + rc * 0.25);
            alpha = 1.0 - smoothstep(0.92, 1.0, e) * 0.85;
        } else if (uMode < 1.5) {
            // nube filamentosa -> disco + protoestrella
            bool toStar = rnd < 0.5;
            float targetR = toStar ? uFinalR * 0.92 : uFinalR * (1.6 + rnd2 * 6.0);
            float r = mix(length(aStart), targetR, e);
            float a = a0 + uTime * (0.15 + e * 2.2) * pow(max(r, 0.8), -1.0);
            vec3 d = vec3(cos(a) * length(sdir.xz), sdir.y, sin(a) * length(sdir.xz));
            d.y *= toStar ? 1.0 : (1.0 - e * 0.94);
            pos = normalize(d) * r;
            if (!toStar) {
                pos.xz *= 1.0 + uExpand * (2.0 + rnd * 3.0);
                alpha = 1.0 - uExpand;
            }
            t = uHeat * (toStar ? 1.0 : 0.45) * (0.2 + e * 0.8) + 0.1;
        } else if (uMode < 2.5) {
            // capa de supernova con dedos de Rayleigh-Taylor
            float finger = 1.0 + pow(rnd, 5.0) * 0.9 + 0.12 * sin(sdir.x * 9.0 + sdir.y * 7.0 + sdir.z * 5.0);
            float r = mix(uFinalR * 0.4, length(aStart) * finger, 1.0 - pow(1.0 - uExpand, 2.4));
            pos = sdir * r;
            t = uHeat * (1.0 - uExpand * 0.6);
            alpha = smoothstep(0.0, 0.02, uExpand) * (1.0 - smoothstep(0.75, 1.0, uExpand) * 0.6);
        } else if (uMode < 3.5) {
            // caída al agujero negro -> disco delgado
            bool plunge = rnd < 0.14;
            float diskR = plunge ? 0.0 : uFinalR * (1.25 + pow(rnd2, 1.4) * 4.8);
            float r = mix(length(aStart), diskR, e);
            float w = 3.2 * pow(max(r, 0.7), -1.5);
            float a = a0 + uTime * w * (0.3 + e * 1.4);
            vec3 d = vec3(cos(a) * length(sdir.xz), sdir.y * (1.0 - e * 0.97), sin(a) * length(sdir.xz));
            pos = normalize(d) * r;
            vec3 vel = normalize(vec3(-sin(a), 0.0, cos(a)));
            vec3 velV = normalize((modelViewMatrix * vec4(vel, 0.0)).xyz);
            beam = 1.0 + 0.85 * velV.z * e;
            t = clamp(uHeat * 1.6 / (1.0 + r * 0.22), 0.0, 1.0);
            alpha = (smoothstep(uFinalR * 0.95, uFinalR * 1.15, r) + (1.0 - e) * 0.6) * 0.55;
            beam *= 0.5; // el disco es denso: sin esto se satura y tapa la sombra
        } else {
            // gigante gaseoso: guijarros -> núcleo; luego gas -> envoltura en bandas
            bool core = rnd < 0.3;
            float rc = mix(r0, core ? uFinalR * 0.34 : r0 * 0.85, e);
            float a = a0 + uTime * 2.4 * pow(max(rc, 0.6), -1.5) * 2.5;
            vec3 disk = vec3(cos(a) * rc, aStart.y * (1.0 - e * 0.5), sin(a) * rc);
            vec3 coreP = normalize(vec3(cos(a), aSeed.z, sin(a))) * uFinalR * 0.34;
            pos = core ? mix(disk, coreP, smoothstep(0.6, 1.0, e)) : disk;
            if (!core) {
                float bandI = floor((aSeed.z * 0.5 + 0.5) * 13.0);
                float dirB = mod(bandI, 2.0) * 2.0 - 1.0;
                float ab = a0 + uTime * (0.4 + uExpand) * dirB;
                vec3 env = normalize(vec3(cos(ab), aSeed.z * 0.92, sin(ab))) * uFinalR * (1.08 + rnd2 * 0.06);
                pos = mix(pos, env, smoothstep(0.0, 1.0, uExpand * (0.7 + rnd * 0.6)));
            }
            t = uHeat * (core ? 0.9 : 0.4) + 0.1;
            alpha = core ? 1.0 - smoothstep(0.7, 0.95, uExpand) : 1.0;
        }

        t = clamp(t, 0.0, 1.0);
        vec3 base = mix(uColA, uColB, rnd2);
        vec3 hot = blackbody(t);
        vCol = uDust > 0.5 ? uDustCol * (0.6 + rnd * 0.6) : mix(base, hot, smoothstep(0.15, 0.55, t)) * (0.55 + t * 1.4) * beam;
        vA = alpha;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        float sz = uDust > 0.5 ? (0.5 + rnd2) : (0.35 + rnd * rnd * 2.2);
        gl_PointSize = clamp(uSize * sz * uPx / max(0.5, -mv.z), 0.0, 64.0);
        gl_Position = projectionMatrix * mv;
    }
`;

const GENESIS_PARTICLE_FS = `
    uniform float uAlpha;
    uniform float uDust;
    varying vec3 vCol;
    varying float vA;
    void main() {
        vec2 q = gl_PointCoord - 0.5;
        float d2 = dot(q, q) * 4.0;
        if (d2 > 1.0) discard;
        float soft = uDust > 0.5 ? (1.0 - d2) * 0.42 : exp(-d2 * 3.2) * 0.85;
        gl_FragColor = vec4(vCol, soft * vA * uAlpha);
    }
`;

const GENESIS_GAS_COUNT = isCoarsePointer ? 7000 : 22000;
const GENESIS_DUST_COUNT = isCoarsePointer ? 2500 : 7000;

function makeGenesisLayer(count, dust) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aStart', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(count * 4), 4));
    const mat = new THREE.ShaderMaterial({
        vertexShader: GENESIS_PARTICLE_VS,
        fragmentShader: GENESIS_PARTICLE_FS,
        uniforms: {
            uTime: { value: 0 }, uMode: { value: 0 }, uP: { value: 0 }, uClump: { value: 0 },
            uExpand: { value: 0 }, uHeat: { value: 0 }, uFinalR: { value: 2.4 }, uBand: { value: 2 },
            // uSize = tamaño en unidades del mundo; uPx = píxeles por unidad a distancia 1
            uSize: { value: dust ? 0.045 : 0.07 }, uPx: { value: 1000 }, uDust: { value: dust ? 1 : 0 },
            uAlpha: { value: 0 },
            uColA: { value: new THREE.Color() }, uColB: { value: new THREE.Color() }, uDustCol: { value: new THREE.Color() }
        },
        transparent: true,
        depthWrite: false,
        blending: dust ? THREE.NormalBlending : THREE.AdditiveBlending
    });
    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    points.visible = false;
    points.renderOrder = dust ? 2 : 3;
    scene.add(points);
    return { geo, mat, points, count };
}

const genesisGas = makeGenesisLayer(GENESIS_GAS_COUNT, false);
const genesisDust = makeGenesisLayer(GENESIS_DUST_COUNT, true);

const gaussRand = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;

// Forma inicial de la nube según el tipo de formación.
function genesisStartPoint(mode, R, out) {
    if (mode === 0 || mode === 4) {
        // disco protoplanetario ensanchado hacia afuera
        const r = R * 1.4 + Math.pow(Math.random(), 0.75) * R * 6.5;
        const a = Math.random() * Math.PI * 2;
        out.set(Math.cos(a) * r, gaussRand() * (0.05 + r * 0.045), Math.sin(a) * r);
    } else if (mode === 1) {
        // filamentos de una nube molecular
        const f = Math.floor(Math.random() * 5);
        const s = Math.random() * 2 - 1;
        const ang = f * 1.2566 + 0.4;
        const len = R * 11;
        out.set(
            Math.cos(ang) * s * len + Math.sin(s * 3 + f) * R * 1.5,
            Math.sin(s * 2.4 + f * 1.7) * R * 2.2,
            Math.sin(ang) * s * len + Math.cos(s * 2 + f) * R * 1.5
        );
        out.x += gaussRand() * R * 0.9;
        out.y += gaussRand() * R * 0.9;
        out.z += gaussRand() * R * 0.9;
    } else if (mode === 2) {
        const v = new THREE.Vector3(gaussRand(), gaussRand(), gaussRand()).normalize();
        out.copy(v).multiplyScalar(R * (7 + Math.random() * 3.5));
    } else {
        const v = new THREE.Vector3(gaussRand(), gaussRand() * 0.7, gaussRand()).normalize();
        out.copy(v).multiplyScalar(R * (4 + Math.random() * 10));
    }
    return out;
}

function seedGenesisLayer(layer, mode, R) {
    const start = layer.geo.attributes.aStart.array;
    const seed = layer.geo.attributes.aSeed.array;
    const v = new THREE.Vector3();
    for (let i = 0; i < layer.count; i++) {
        genesisStartPoint(mode, R, v);
        start[i * 3] = v.x; start[i * 3 + 1] = v.y; start[i * 3 + 2] = v.z;
        seed[i * 4] = Math.random();
        seed[i * 4 + 1] = Math.random();
        seed[i * 4 + 2] = Math.random() * 2 - 1;
        seed[i * 4 + 3] = Math.random();
    }
    layer.geo.attributes.aStart.needsUpdate = true;
    layer.geo.attributes.aSeed.needsUpdate = true;
}

function setupGenesisParticles(type, R, atmoColor) {
    [genesisGas, genesisDust].forEach(layer => {
        seedGenesisLayer(layer, type.mode, R);
        const u = layer.mat.uniforms;
        u.uMode.value = type.mode;
        u.uFinalR.value = R;
        u.uBand.value = R * 0.9;
        u.uColA.value.set(type.gas[0]);
        u.uColB.value.setRGB(...(atmoColor || [1, 1, 1])).lerp(new THREE.Color(type.gas[1]), 0.4);
        u.uDustCol.value.set(type.dust);
        u.uP.value = 0; u.uClump.value = 0; u.uExpand.value = 0; u.uHeat.value = 0; u.uAlpha.value = 0;
        layer.points.visible = true;
    });
    // el polvo solo tiene sentido en discos y nubes, no en la supernova
    genesisDust.points.visible = type.mode !== 2;
}

// Actualiza todos los uniforms compartidos entre gas y polvo.
function setGenesisParticleUniforms(values) {
    [genesisGas, genesisDust].forEach(layer => {
        const u = layer.mat.uniforms;
        for (const k in values) u[k].value = values[k];
    });
    genesisDust.mat.uniforms.uAlpha.value = values.uAlpha * 0.8;
}

function hideGenesisParticles() {
    genesisGas.points.visible = false;
    genesisDust.points.visible = false;
}
