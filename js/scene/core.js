/* -------------------------------------------------------------------------- */
/* THREE.JS 3D ENGINE: 12 CELESTIAL GROUPS + HYPER-REALISTIC SATURN RINGS     */
/* -------------------------------------------------------------------------- */
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x010103, 0.012);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.08, 1000);
camera.position.set(0, 3.8, 28);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isCoarsePointer ? 1.5 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x22283a, 0.45); // poca luz ambiente: lado nocturno oscuro, como en las fotos reales
scene.add(ambientLight);
const sunDirectionalLight = new THREE.DirectionalLight(0xfff8ed, 2.1);
sunDirectionalLight.position.set(18, 8, 16);
scene.add(sunDirectionalLight);
const rimBackLight = new THREE.DirectionalLight(0x00f0ff, 0.45);
rimBackLight.position.set(-14, -6, -12);
scene.add(rimBackLight);

const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minDistance = 2.4;
controls.maxDistance = 44;
controls.target.set(0, -1.05, 0);

const sharedUniforms = {
    uSunDirView: { value: new THREE.Vector3(0.7, 0.3, 0.6) },
    uDetail: { value: 0.0 },
    uTime: { value: 0 },
    uRedshiftFactor: { value: 0.0 },
    uCameraDist: { value: 28.0 }
};

const commonVertexShader = `
    varying vec2 vUv;
    varying vec3 vPos;
    varying vec3 vNormal;
    void main() {
        vUv = uv;
        vPos = position;
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

const targetGroups = {};
Object.keys(ASTRO_TARGETS).forEach(k => {
    const g = new THREE.Group();
    g.visible = false;
    scene.add(g);
    targetGroups[k] = g;
});

const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin('anonymous');

function pseudoNoise2D(x, y) {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
}
function smoothNoise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y);
    const fx = x - ix, fy = y - iy;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = pseudoNoise2D(ix, iy), b = pseudoNoise2D(ix + 1, iy);
    const c = pseudoNoise2D(ix, iy + 1), d = pseudoNoise2D(ix + 1, iy + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm2D(x, y, octaves = 5) {
    let val = 0, amp = 0.5, freq = 1;
    for (let i = 0; i < octaves; i++) {
        val += amp * smoothNoise(x * freq, y * freq);
        freq *= 2.05;
        amp *= 0.5;
    }
    return val;
}

function generateHiResPlanetaryTextures(bodyId) {
    const width = 1024, height = 512;
    const colorCanvas = document.createElement('canvas');
    colorCanvas.width = width; colorCanvas.height = height;
    const ctx = colorCanvas.getContext('2d');

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = width; bumpCanvas.height = height;
    const bCtx = bumpCanvas.getContext('2d');

    const imgData = ctx.createImageData(width, height);
    const bumpData = bCtx.createImageData(width, height);
    const data = imgData.data;
    const bData = bumpData.data;

    const cratersList = [];
    if (bodyId === 'mercury' || bodyId === 'moon') {
        let seed = bodyId === 'mercury' ? 1337 : 7331;
        const nextRand = () => {
            seed = (seed * 16807) % 2147483647;
            return (seed - 1) / 2147483646;
        };
        const numCraters = 190;
        for (let c = 0; c < numCraters; c++) {
            cratersList.push({
                cx: nextRand(),
                cy: 0.08 + nextRand() * 0.84,
                rad: 0.008 + Math.pow(nextRand(), 3.2) * 0.095,
                hasRays: nextRand() > 0.78,
                depth: 0.5 + nextRand() * 0.6
            });
        }
    }

    for (let y = 0; y < height; y++) {
        const v = y / height;
        const lat = Math.abs(v - 0.5) * 2.0;
        for (let x = 0; x < width; x++) {
            const u = x / width;
            const idx = (y * width + x) * 4;
            let r = 128, g = 128, b = 128, elev = 128;

            if (bodyId === 'sun') {
                const n = fbm2D(u * 28, v * 14, 5);
                const hotspot = Math.pow(n, 2.2);
                r = Math.min(255, 200 + hotspot * 80);
                g = Math.min(255, 75 + hotspot * 175);
                b = Math.min(255, hotspot * 95);
                elev = n * 255;
            } else if (bodyId === 'mercury' || bodyId === 'moon') {
                const macro = fbm2D(u * 6.5, v * 3.5, 5);
                const micro = fbm2D(u * 42.0, v * 21.0, 4);
                const regolithGrain = (pseudoNoise2D(x * 0.7, y * 0.7) - 0.5) * 14;

                const basinMask = smoothNoise(u * 3.8 + 1.2, v * 2.4);
                let baseAlbedo = bodyId === 'mercury'
                    ? (basinMask < 0.42 ? 98 : 134) + macro * 42 + micro * 18
                    : (basinMask < 0.46 ? 72 : 158) + macro * 48 + micro * 16;

                let heightVal = 128 + (macro - 0.5) * 75 + (micro - 0.5) * 32;
                let rayBrightness = 0;

                for (let c = 0; c < cratersList.length; c++) {
                    const cr = cratersList[c];
                    let dx = Math.abs(u - cr.cx);
                    if (dx > 0.5) dx = 1.0 - dx;
                    const dy = (v - cr.cy) * 0.55;
                    const distSq = dx * dx + dy * dy;
                    const maxRange = cr.hasRays ? cr.rad * 3.2 : cr.rad * 1.35;

                    if (distSq < maxRange * maxRange) {
                        const d = Math.sqrt(distSq);
                        const normD = d / cr.rad;
                        if (normD < 0.78) {
                            const bowl = Math.cos(normD / 0.78 * Math.PI * 0.5);
                            heightVal -= bowl * 62 * cr.depth;
                            baseAlbedo -= bowl * 24 * cr.depth;
                            if (cr.rad > 0.045 && normD < 0.18) {
                                heightVal += 28;
                                baseAlbedo += 18;
                            }
                        } else if (normD <= 1.25) {
                            const rim = Math.sin((normD - 0.78) / 0.47 * Math.PI);
                            heightVal += rim * 48 * cr.depth;
                            baseAlbedo += rim * 28 * cr.depth;
                        } else if (cr.hasRays && normD <= 3.2) {
                            const ang = Math.atan2(dy, dx);
                            const rayPattern = Math.pow(Math.max(0, Math.sin(ang * 9.0 + cr.cx * 20.0)), 4.0);
                            const fade = 1.0 - (normD - 1.25) / 1.95;
                            rayBrightness += rayPattern * fade * 38;
                        }
                    }
                }

                const finalShade = Math.max(28, Math.min(245, baseAlbedo + rayBrightness + regolithGrain));
                r = finalShade * (bodyId === 'mercury' ? 1.05 : 1.0);
                g = finalShade * (bodyId === 'mercury' ? 0.99 : 1.0);
                b = finalShade * (bodyId === 'mercury' ? 0.91 : 1.02);
                elev = Math.max(0, Math.min(255, heightVal));
            } else if (bodyId === 'venus') {
                const swirl = fbm2D(u * 8 + Math.sin(v * 6.28) * 0.6, v * 10, 5);
                r = 215 + swirl * 38;
                g = 158 + swirl * 52;
                b = 78 + swirl * 42;
                elev = 120 + swirl * 45;
            } else if (bodyId === 'earth') {
                const cont = fbm2D(u * 7.5, v * 4.2, 6);
                if (lat > 0.84 - cont * 0.08) {
                    r = 240; g = 246; b = 255; elev = 180;
                } else if (cont > 0.51) {
                    const forest = smoothNoise(u * 16, v * 9);
                    r = 45 + forest * 95;
                    g = 105 + forest * 55;
                    b = 42 + forest * 28;
                    elev = 135 + (cont - 0.5) * 240;
                } else {
                    const depth = cont / 0.51;
                    r = 8 + depth * 18;
                    g = 38 + depth * 52;
                    b = 98 + depth * 68;
                    elev = 90;
                }
            } else if (bodyId === 'mars') {
                const n = fbm2D(u * 10, v * 5, 6);
                if (lat > 0.89 - n * 0.04) {
                    r = 242; g = 240; b = 238; elev = 195;
                } else {
                    const basalt = n < 0.44 ? 0.65 : 1.0;
                    r = (178 + n * 65) * basalt;
                    g = (76 + n * 42) * basalt;
                    b = (38 + n * 24) * basalt;
                    elev = 85 + n * 160;
                }
            } else if (bodyId === 'jupiter') {
                const turb = fbm2D(u * 12, v * 24, 4) * 0.04;
                const band = Math.sin((v + turb) * 46.0);
                const zone = Math.cos((v + turb) * 22.0);
                r = 205 + band * 32 + zone * 15;
                g = 152 + band * 42 + zone * 22;
                b = 108 + band * 38;
                const dx = (u - 0.55) * 2.4, dy = (v - 0.64) * 5.2;
                const distGRS = Math.sqrt(dx * dx + dy * dy);
                if (distGRS < 0.16) {
                    const blend = 1 - distGRS / 0.16;
                    r = r * (1 - blend) + 215 * blend;
                    g = g * (1 - blend) + 62 * blend;
                    b = b * (1 - blend) + 35 * blend;
                }
                elev = 128 + band * 18;
            } else if (bodyId === 'saturn') {
                const shear = fbm2D(u * 10.0, v * 28.0, 4) * 0.014;
                const vp = v + shear;
                const b1 = Math.sin(vp * Math.PI * 16.0);
                const b2 = Math.cos(vp * Math.PI * 34.0);
                const b3 = Math.sin(vp * Math.PI * 72.0);
                const eqGlow = Math.exp(-Math.pow((v - 0.5) * 5.5, 2.0)) * 24.0;
                const polarHex = lat > 0.76 ? (lat - 0.76) / 0.24 : 0.0;
                const hexWave = lat > 0.80 ? Math.sin(u * Math.PI * 12.0) * 8.0 : 0.0;

                r = 224 + eqGlow + b1 * 14 + b2 * 7 + b3 * 3 - polarHex * 58 + hexWave;
                g = 198 + eqGlow * 0.9 + b1 * 12 + b2 * 6 + b3 * 3 - polarHex * 36 + hexWave * 0.8;
                b = 146 + eqGlow * 0.6 + b1 * 8 + b2 * 4 - polarHex * 8 + hexWave * 0.5;
                elev = 128 + b1 * 6 + b2 * 4;
            } else if (bodyId === 'uranus') {
                const band = Math.sin(v * 24.0) * 8;
                r = 125 + band; g = 224 + band; b = 236 + band;
                elev = 128;
            } else if (bodyId === 'neptune') {
                const streak = fbm2D(u * 14, v * 28, 4);
                const cirrus = streak > 0.68 ? (streak - 0.68) * 320 : 0;
                r = Math.min(255, 32 + cirrus);
                g = Math.min(255, 86 + streak * 35 + cirrus);
                b = Math.min(255, 212 + streak * 38 + cirrus * 0.5);
                elev = 128 + cirrus * 0.3;
            } else if (bodyId === 'io') {
                const n = fbm2D(u * 9, v * 4.5, 5);
                const sulfur = fbm2D(u * 22 + 3.1, v * 11, 4);
                r = 214 + n * 40; g = 178 + n * 44 - sulfur * 30; b = 70 + sulfur * 40;
                const volc = smoothNoise(u * 38, v * 19);
                if (volc > 0.9) { const k = (volc - 0.9) * 10; r = r * (1 - k) + 40 * k; g = g * (1 - k) + 22 * k; b = b * (1 - k) + 14 * k; }
                else if (volc > 0.84) { const k = (volc - 0.84) * 16; r = r * (1 - k) + 190 * k; g = g * (1 - k) + 70 * k; b = b * (1 - k) + 30 * k; }
                if (lat > 0.7) { const k = (lat - 0.7) / 0.3; r -= k * 70; g -= k * 60; b -= k * 20; }
                elev = 110 + n * 90 - (volc > 0.9 ? 60 : 0);
            } else if (bodyId === 'europa') {
                const n = fbm2D(u * 8, v * 4, 5);
                r = 214 + n * 30; g = 204 + n * 28; b = 188 + n * 26;
                let crack = 0;
                for (let k = 0; k < 5; k++) {
                    const w = Math.abs(Math.sin((u * (6 + k * 3.7) + v * (4 - k * 1.9) + fbm2D(u * 5 + k, v * 5, 3) * 0.9) * Math.PI * 2));
                    crack = Math.max(crack, Math.pow(1 - w, 22));
                }
                r -= crack * 70; g -= crack * 120; b -= crack * 140;
                if (smoothNoise(u * 14, v * 7) > 0.82) { r -= 40; g -= 55; b -= 60; }
                elev = 140 - crack * 70 + n * 30;
            } else if (bodyId === 'titan') {
                const n = fbm2D(u * 6, v * 3, 5);
                const band = Math.sin(v * Math.PI * 6) * 6;
                r = 196 + n * 34 + band; g = 128 + n * 30 + band; b = 52 + n * 18;
                if (lat > 0.72 && smoothNoise(u * 10, v * 5) > 0.55) { r -= 70; g -= 55; b -= 20; }
                elev = 128 + n * 30;
            } else if (bodyId === 'pluto') {
                const n = fbm2D(u * 9, v * 4.5, 5);
                r = 196 + n * 40; g = 160 + n * 36; b = 128 + n * 30;
                const hx = (u - 0.52) * 2.2, hy = (v - 0.52) * 2.6;
                const heart = Math.pow(hx * hx + hy * hy - 0.02, 3) - hx * hx * hy * hy * hy * 1.6;
                if (heart < 0 && Math.abs(hx) < 0.75) { r = 236 + n * 15; g = 226 + n * 15; b = 214 + n * 15; }
                if (v > 0.5 && v < 0.72 && (u < 0.32 || u > 0.86)) { r = 86 + n * 40; g = 46 + n * 24; b = 34 + n * 18; }
                elev = 120 + n * 80 + (heart < 0 ? -30 : 0);
            }

            data[idx] = Math.max(0, Math.min(255, r));
            data[idx + 1] = Math.max(0, Math.min(255, g));
            data[idx + 2] = Math.max(0, Math.min(255, b));
            data[idx + 3] = 255;

            bData[idx] = bData[idx + 1] = bData[idx + 2] = elev;
            bData[idx + 3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);
    bCtx.putImageData(bumpData, 0, 0);

    const colorTex = new THREE.CanvasTexture(colorCanvas);
    const bumpTex = new THREE.CanvasTexture(bumpCanvas);
    return { colorTex, bumpTex };
}
