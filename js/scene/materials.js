const atmosphereVertexShader = `
    varying vec3 vNormal;
    void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;
const atmosphereFragmentShader = `
    uniform vec3 uAtmoColor;
    uniform vec3 uSunDirView;
    uniform float uAtmoStrength;
    varying vec3 vNormal;
    void main() {
        float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.8);
        float lit = 0.25 + 0.95 * smoothstep(-0.35, 0.6, dot(-vNormal, normalize(uSunDirView)) * -1.0);
        gl_FragColor = vec4(uAtmoColor * lit * 1.15, clamp(intensity * 0.95 * lit * uAtmoStrength, 0.0, 0.9));
    }
`;

// Adds close-range surface detail and (optionally) city lights on the night side.
function enhancePlanetMaterial(mat, opts = {}) {
    const detailStrength = (opts.detail ?? 0.32).toFixed(3);
    mat.customProgramCacheKey = () => `planet-${detailStrength}-${opts.night ? 1 : 0}`;
    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uSunDirView = sharedUniforms.uSunDirView;
        shader.uniforms.uDetail = sharedUniforms.uDetail;
        shader.fragmentShader = `
            uniform vec3 uSunDirView;
            uniform float uDetail;
            float dHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
            float dNoise(vec2 p) {
                vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
                return mix(mix(dHash(i), dHash(i + vec2(1.0, 0.0)), f.x), mix(dHash(i + vec2(0.0, 1.0)), dHash(i + vec2(1.0, 1.0)), f.x), f.y);
            }
            float dFbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { v += a * dNoise(p); p *= 2.1; a *= 0.5; } return v; }
        ` + shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
            #include <map_fragment>
            #ifdef USE_MAP
            float detailN = dFbm(vUv * vec2(320.0, 160.0)) * 0.6 + dFbm(vUv * vec2(1400.0, 700.0)) * 0.4;
            diffuseColor.rgb *= mix(1.0, 0.72 + detailN * 0.56, uDetail * ${detailStrength});
            #endif
        `);
        if (opts.night) {
            shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
                #include <emissivemap_fragment>
                float nightMask = 1.0 - smoothstep(-0.12, 0.22, dot(normal, normalize(uSunDirView)));
                totalEmissiveRadiance *= nightMask;
            `);
        }
    };
    mat.needsUpdate = true;
}

// Soft additive halo used for stars, atmospheres and the pulsar.
function makeGlowSprite(color, size, opacity = 1.0) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    const col = new THREE.Color(color);
    const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
    const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, `rgba(${rgb},1)`);
    grad.addColorStop(0.3, `rgba(${rgb},0.75)`);
    grad.addColorStop(0.55, `rgba(${rgb},0.28)`);
    grad.addColorStop(0.8, `rgba(${rgb},0.07)`);
    grad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 256, 256);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending,
        transparent: true, depthWrite: false, opacity
    }));
    sprite.scale.set(size, size, 1);
    return sprite;
}

const THREE_PLANETS = 'https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/planets/';
function loadTextureWithFallback(urls, onLoad, onFail) {
    const list = urls.filter(Boolean);
    // Opening the file directly (file://) blocks local textures in WebGL: also try the public copy.
    urls.filter(u => u && u.startsWith(TEX)).forEach(u => {
        const name = u.slice(TEX.length);
        if (/^(earth_|moon_1024)/.test(name)) list.push(THREE_PLANETS + name);
    });
    const tryAt = (i) => {
        if (i >= list.length) { if (onFail) onFail(); return; }
        textureLoader.load(list[i], onLoad, undefined, () => tryAt(i + 1));
    };
    tryAt(0);
}

const sunFragmentShader = `
    uniform float uTime;
    uniform sampler2D uMap;
    uniform float uHasMap;
    varying vec2 vUv;
    varying vec3 vNormal;
    float sHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float sNoise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(sHash(i), sHash(i + vec2(1.0, 0.0)), f.x), mix(sHash(i + vec2(0.0, 1.0)), sHash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    float sFbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 5; i++) { v += a * sNoise(p); p *= 2.07; a *= 0.5; } return v; }
    void main() {
        vec2 uv = vUv;
        float t = uTime * 0.06;
        vec2 warp = vec2(sFbm(uv * vec2(18.0, 9.0) + t), sFbm(uv * vec2(18.0, 9.0) - t + 4.3));
        float gran = sFbm(uv * vec2(90.0, 45.0) + warp * 2.2 + vec2(t * 2.0, 0.0));
        float cells = sFbm(uv * vec2(260.0, 130.0) - warp * 3.0 + t * 3.0);
        vec3 base = mix(vec3(1.0, 0.42, 0.04), vec3(1.0, 0.86, 0.45), gran);
        if (uHasMap > 0.5) base = mix(base, texture2D(uMap, uv + warp * 0.004).rgb * vec3(1.15, 1.0, 0.85), 0.45);
        base *= 0.78 + cells * 0.45;
        float spots = smoothstep(0.72, 0.8, sFbm(uv * vec2(14.0, 7.0) + vec2(t * 0.4, 1.7)));
        base *= 1.0 - spots * 0.75 * smoothstep(0.25, 0.4, abs(uv.y - 0.5)) * (1.0 - smoothstep(0.4, 0.5, abs(uv.y - 0.5)));
        float mu = clamp(dot(normalize(vNormal), vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
        float limb = 0.35 + 0.65 * pow(mu, 0.55);
        vec3 col = base * limb * 1.35 + vec3(1.0, 0.5, 0.1) * pow(1.0 - mu, 3.0) * 0.6;
        gl_FragColor = vec4(col, 1.0);
    }
`;

// Round, soft dot for every particle system (default GL points are squares).
const roundDotTexture = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.85)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
})();

const ATMO_STRENGTH = { titan: 1.8, venus: 1.4, earth: 1.25, pluto: 0.7, io: 0.45, europa: 0.5, mars: 0.8 };
const ATMO_SCALE = { titan: 1.09, venus: 1.06, pluto: 1.035, io: 1.03, europa: 1.03 };

function createPhotorealisticPlanet(bodyId, radius = 2.5, hasAtmosphere = true) {
    const cfg = ASTRO_TARGETS[bodyId];
    // Real maps load first; the (slow) procedural texture is only built if they fail.
    const useProcedural = () => generateHiResPlanetaryTextures(bodyId);
    const { colorTex, bumpTex } = cfg.textureUrl ? { colorTex: null, bumpTex: null } : useProcedural();
    const reliefFromMap = ['moon', 'mercury', 'mars', 'io', 'europa', 'pluto'].includes(bodyId);

    let mat;
    if (bodyId === 'sun') {
        mat = new THREE.ShaderMaterial({
            uniforms: { uTime: sharedUniforms.uTime, uMap: { value: colorTex }, uHasMap: { value: 0.0 } },
            vertexShader: commonVertexShader,
            fragmentShader: sunFragmentShader
        });
    } else {
        mat = new THREE.MeshPhongMaterial({
            map: colorTex,
            bumpMap: bumpTex,
            color: colorTex ? 0xffffff : new THREE.Color(...(cfg.atmoColor || [0.5, 0.5, 0.5])).multiplyScalar(0.55),
            bumpScale: (bodyId === 'moon' || bodyId === 'mercury') ? 0.11 : (bodyId === 'mars' ? 0.065 : 0.012),
            specular: new THREE.Color(bodyId === 'earth' ? 0x1c2c3c : (bodyId === 'saturn' ? 0x050505 : 0x111111)),
            shininess: bodyId === 'earth' ? 40 : (bodyId === 'saturn' ? 3 : 6)
        });
    }

    if (cfg.textureUrl) {
        loadTextureWithFallback([cfg.textureUrl, cfg.textureFallback, cfg.textureFallback2], (nasaTex) => {
            nasaTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
            if (mat.uniforms && mat.uniforms.uMap) {
                mat.uniforms.uMap.value = nasaTex;
                mat.uniforms.uHasMap.value = 1.0;
            } else {
                mat.map = nasaTex;
                mat.color.set(0xffffff);
                if (reliefFromMap && !mat.bumpMap) { mat.bumpMap = nasaTex; mat.bumpScale *= 0.45; }
                mat.needsUpdate = true;
            }
        }, () => {
            // No real map reachable: build the procedural one off the critical path.
            setTimeout(() => {
                const proc = useProcedural();
                if (mat.uniforms && mat.uniforms.uMap) {
                    mat.uniforms.uMap.value = proc.colorTex;
                } else {
                    mat.map = proc.colorTex;
                    mat.bumpMap = proc.bumpTex;
                    mat.color.set(0xffffff);
                    mat.needsUpdate = true;
                }
            }, 0);
        });
    }
    if (cfg.nightUrl && mat.isMeshPhongMaterial) {
        loadTextureWithFallback([cfg.nightUrl], (nightTex) => {
            mat.emissiveMap = nightTex;
            mat.emissive = new THREE.Color(0xffd9a0);
            mat.emissiveIntensity = 1.6;
            mat.needsUpdate = true;
        });
    }
    if (mat.isMeshPhongMaterial) {
        const gasGiant = ['jupiter', 'saturn', 'uranus', 'neptune', 'venus', 'titan'].includes(bodyId);
        enhancePlanetMaterial(mat, { detail: gasGiant ? 0.1 : 0.38, night: !!cfg.nightUrl });
    }
    if (cfg.normalUrl) {
        loadTextureWithFallback([cfg.normalUrl], (normTex) => {
            mat.normalMap = normTex;
            mat.needsUpdate = true;
        });
    }
    if (cfg.specularUrl) {
        loadTextureWithFallback([cfg.specularUrl], (specTex) => {
            mat.specularMap = specTex;
            mat.needsUpdate = true;
        });
    }

    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 64), mat);
    targetGroups[bodyId].add(mesh);

    if (hasAtmosphere && cfg.atmoColor) {
        const atmoMesh = new THREE.Mesh(
            new THREE.SphereGeometry(radius * (ATMO_SCALE[bodyId] ?? 1.045), 64, 64),
            new THREE.ShaderMaterial({
                vertexShader: atmosphereVertexShader,
                fragmentShader: atmosphereFragmentShader,
                uniforms: {
                    uAtmoColor: { value: new THREE.Color(...cfg.atmoColor) },
                    uSunDirView: sharedUniforms.uSunDirView,
                    uAtmoStrength: { value: ATMO_STRENGTH[bodyId] ?? 1.0 }
                },
                blending: THREE.AdditiveBlending,
                side: THREE.BackSide,
                transparent: true,
                depthWrite: false
            })
        );
        targetGroups[bodyId].add(atmoMesh);
    }

    return mesh;
}
