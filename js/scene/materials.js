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

// Superficie viva: detalle y relieve al acercarse, cráteres, tormentas de polvo,
// bandas de nubes que fluyen, vórtices (Gran Mancha Roja, hexágono de Saturno),
// sombra de nubes y luces nocturnas. Cada opción se compila solo si se usa.
const DERIV_OK = '(defined(GL_OES_standard_derivatives) || __VERSION__ >= 300)';
function enhancePlanetMaterial(mat, opts = {}) {
    const o = {
        detail: opts.detail ?? 0.32, relief: opts.relief ?? 0, craters: opts.craters ?? 0,
        night: !!opts.night, dust: !!opts.dust, bands: opts.bands ?? 0, spot: opts.spot || null,
        hexagon: !!opts.hexagon, cloudShadow: opts.cloudShadow || null, tint: opts.tint || null, gamma: opts.gamma ?? 1
    };
    const f = (v) => Number(v).toFixed(4);
    const cacheKey = 'planet-' + JSON.stringify({ ...o, cloudShadow: !!o.cloudShadow });
    mat.customProgramCacheKey = () => cacheKey;
    mat.onBeforeCompile = (shader) => {
        shader.uniforms.uSunDirView = sharedUniforms.uSunDirView;
        shader.uniforms.uDetail = sharedUniforms.uDetail;
        shader.uniforms.uTime = sharedUniforms.uTime;
        if (o.cloudShadow) {
            shader.uniforms.uCloudMap = o.cloudShadow.map;
            shader.uniforms.uCloudShift = o.cloudShadow.shift;
        }
        shader.fragmentShader = `
            uniform vec3 uSunDirView;
            uniform float uDetail;
            uniform float uTime;
            ${o.cloudShadow ? 'uniform sampler2D uCloudMap; uniform float uCloudShift;' : ''}
            float dHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
            float dNoise(vec2 p) {
                vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
                return mix(mix(dHash(i), dHash(i + vec2(1.0, 0.0)), f.x), mix(dHash(i + vec2(0.0, 1.0)), dHash(i + vec2(1.0, 1.0)), f.x), f.y);
            }
            float dFbm(vec2 p) { float v = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { v += a * dNoise(p); p *= 2.1; a *= 0.5; } return v; }
            // cráter: cuenco hundido con borde levantado; no todas las celdas tienen uno
            float dCraters(vec2 uv, vec2 scale) {
                vec2 g = uv * scale; vec2 ci = floor(g); vec2 cf = fract(g);
                if (dHash(ci + 1.3) < 0.62) return 0.0;
                float r = 0.12 + dHash(ci + 5.1) * 0.3;
                vec2 c = 0.25 + vec2(dHash(ci + 3.1), dHash(ci + 7.7)) * 0.5;
                float d = length((cf - c) * vec2(1.0, 2.0)) / r;
                return -0.7 * (1.0 - smoothstep(0.0, 1.0, d)) + 0.4 * exp(-pow((d - 1.0) * 4.5, 2.0));
            }
            // rota la uv alrededor de un centro: remolino que decae con la distancia
            vec2 dSwirl(vec2 uv, vec2 c, vec2 rad, float spin) {
                vec2 d = (uv - c) / rad; float r = length(d);
                float a = spin * exp(-r * r * 1.6);
                float s = sin(a), co = cos(a);
                return c + vec2(co * d.x - s * d.y, s * d.x + co * d.y) * rad;
            }
            // corriente en chorro: desplazamiento en x según la latitud
            float dJet(float lat) { return sin(lat * 47.12) * 0.6 + sin(lat * 91.1 + 1.3) * 0.4; }
            #if ${DERIV_OK}
            // fbm que apaga las octavas más finas que un píxel (sin esto el relieve parpadea)
            float dFbmAA(vec2 uv, vec2 scale) {
                vec2 fw = fwidth(uv) * scale; float px = max(fw.x, fw.y);
                vec2 p = uv * scale; float v = 0.0; float a = 0.5; float fq = 1.0;
                for (int i = 0; i < 5; i++) { v += a * dNoise(p) * (1.0 - smoothstep(0.2, 0.55, px * fq)); p *= 2.1; fq *= 2.1; a *= 0.5; }
                return v;
            }
            float dCratersAA(vec2 uv, vec2 scale) {
                vec2 fw = fwidth(uv) * scale;
                return dCraters(uv, scale) * (1.0 - smoothstep(0.06, 0.22, max(fw.x, fw.y)));
            }
            // normal perturbada con un gradiente de altura medido en uv (base tangente suave,
            // a diferencia de dFdx(h), que sale en bloques de 2x2 píxeles)
            float dHeight(vec2 uv) {
                return dFbmAA(uv, vec2(300.0, 150.0)) * ${f(o.relief)}
                    + (dCratersAA(uv, vec2(70.0, 35.0)) + dCratersAA(uv + 0.37, vec2(220.0, 110.0)) * 0.5) * ${f(o.craters)};
            }
            vec3 dPerturbUV(vec3 eyePos, vec3 n, vec2 uv, vec2 g) {
                vec3 q0 = dFdx(eyePos); vec3 q1 = dFdy(eyePos);
                vec2 st0 = dFdx(uv); vec2 st1 = dFdy(uv);
                vec3 q1perp = cross(q1, n); vec3 q0perp = cross(n, q0);
                vec3 T = q1perp * st0.x + q0perp * st1.x;
                vec3 B = q1perp * st0.y + q0perp * st1.y;
                float det = max(dot(T, T), dot(B, B));
                float sc = det == 0.0 ? 0.0 : inversesqrt(det);
                return normalize(n - (T * g.x + B * g.y) * sc);
            }
            #endif
        ` + shader.fragmentShader;

        let uvCode = 'vec2 pUv = vUv;';
        if (o.bands) {
            uvCode += `
            pUv.x += uTime * ${f(o.bands)} * dJet(pUv.y);
            pUv.x += (dFbm(vec2(pUv.x * 40.0, pUv.y * 260.0) + uTime * 0.03) - 0.5) * 0.0025;`;
        }
        if (o.spot) {
            const [u, v, ru, rv] = o.spot;
            uvCode += `
            pUv = dSwirl(pUv, vec2(${f(u)}, ${f(v)}), vec2(${f(ru)}, ${f(rv)}), uTime * 0.35);`;
        }

        shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
            ${uvCode}
            #ifdef USE_MAP
            vec4 texelColor = texture2D(map, pUv);
            texelColor = mapTexelToLinear(texelColor);
            diffuseColor *= texelColor;
            ${o.gamma !== 1 ? `diffuseColor.rgb = pow(diffuseColor.rgb, vec3(${f(o.gamma)}));` : ''}
            ${o.tint ? `diffuseColor.rgb *= vec3(${o.tint.map(f).join(', ')});` : ''}
            float detailN = dFbm(vUv * vec2(320.0, 160.0)) * 0.6 + dFbm(vUv * vec2(1400.0, 700.0)) * 0.4;
            diffuseColor.rgb *= mix(1.0, 0.72 + detailN * 0.56, uDetail * ${f(o.detail)});
            #endif
            ${o.dust ? `
            // tormenta de polvo regional que avanza despacio
            float storm = smoothstep(0.62, 0.85, dFbm(vec2(vUv.x * 5.0 - uTime * 0.006, vUv.y * 3.0) + 2.0));
            storm *= smoothstep(0.15, 0.35, vUv.y) * (1.0 - smoothstep(0.7, 0.85, vUv.y));
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(1.05, 0.82, 0.68) + vec3(0.06, 0.03, 0.01), storm * (0.45 + dNoise(vUv * 90.0 + uTime * 0.05) * 0.25));` : ''}
            ${o.hexagon ? `
            // hexágono del polo norte (~78° N)
            float colat = (1.0 - vUv.y) * 3.14159;
            if (colat < 0.5) {
                float ang = vUv.x * 6.28318 + uTime * 0.01;
                float seg = mod(ang, 1.0472) - 0.5236;
                float hexR = 0.2 * cos(0.5236) / cos(seg);
                float edge = exp(-pow((colat - hexR) * 60.0, 2.0));
                float inside = 1.0 - smoothstep(hexR - 0.01, hexR + 0.01, colat);
                diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.7, 0.8, 0.88), inside * 0.6);
                diffuseColor.rgb *= 1.0 - edge * 0.35;
                diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.25, 0.3, 0.35), (1.0 - smoothstep(0.0, 0.06, colat)) * 0.6);
            }` : ''}
            ${o.cloudShadow ? `
            // sombra de las nubes (giran un poco más rápido que la superficie)
            float cloudA = texture2D(uCloudMap, vec2(vUv.x - uCloudShift + 0.004, vUv.y)).r;
            diffuseColor.rgb *= 1.0 - cloudA * 0.38;` : ''}
        `);
        if (o.relief || o.craters) {
            shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
                #include <normal_fragment_maps>
                #if ${DERIV_OK}
                if (uDetail > 0.001) {
                    vec2 e = vec2(0.00025, 0.0);
                    float h0 = dHeight(vUv);
                    vec2 g = vec2(dHeight(vUv + e.xy) - h0, dHeight(vUv + e.yx) - h0) / e.x;
                    normal = dPerturbUV(-vViewPosition, normal, vUv, g * uDetail * 0.0035);
                }
                #endif
            `);
        }
        if (o.night) {
            shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
                #include <emissivemap_fragment>
                float nightMask = 1.0 - smoothstep(-0.12, 0.22, dot(normal, normalize(uSunDirView)));
                totalEmissiveRadiance *= nightMask;
            `);
        }
    };
    mat.needsUpdate = true;
}

// Ajustes de superficie por astro (el resto usa solo el detalle básico).
const SURFACE_OPTS = {
    mercury: { relief: 1.0, craters: 1.4, gamma: 1.25, tint: [0.86, 0.8, 0.72] },
    moon: { relief: 1.0, craters: 1.6, gamma: 1.2 },
    venus: { gamma: 1.4, tint: [1.0, 0.86, 0.6] },
    mars: { relief: 0.55, craters: 0.22, dust: true, tint: [0.92, 0.72, 0.6] },
    io: { relief: 0.8 },
    europa: { relief: 0.6 },
    pluto: { relief: 0.9, craters: 0.6 },
    jupiter: { bands: 0.0009, spot: [0.366, 0.391, 0.024, 0.016], gamma: 1.6, tint: [1.0, 0.9, 0.8] },
    saturn: { bands: 0.0006, hexagon: true, gamma: 1.3 },
    uranus: { bands: 0.0003, gamma: 1.3, tint: [0.78, 0.95, 1.0] },
    neptune: { bands: 0.0007 }
};

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

function createPhotorealisticPlanet(bodyId, radius = 2.5, hasAtmosphere = true, extraSurface = {}) {
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
            if (SURFACE_OPTS[bodyId] && SURFACE_OPTS[bodyId].bands) nasaTex.wrapS = THREE.RepeatWrapping;
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
        enhancePlanetMaterial(mat, { detail: gasGiant ? 0.1 : 0.38, night: !!cfg.nightUrl, ...(SURFACE_OPTS[bodyId] || {}), ...extraSurface });
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
