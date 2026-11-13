/* -------------------------------------------------------------------------- */
/* MARTE: TORBELLINOS DE POLVO ("DUST DEVILS")                                 */
/* -------------------------------------------------------------------------- */
// Columnas de polvo que giran y deambulan por la superficie. Spirit, Curiosity y
// Perseverance los han filmado; desde órbita HiRISE fotografió en 2012 uno de ~20 km
// de alto y apenas ~70 m de ancho en Amazonis Planitia. Son columnas altísimas y
// finas: a escala real (20 km sobre un radio de 3,390 km) serían invisibles desde
// órbita, así que aquí se exageran unas 50 veces conservando la forma alta y delgada.
const MARS_DEVIL_COUNT = 24;
const MARS_DEVIL_NOTE = 'Torbellinos de polvo: hasta ~20 km de alto y decenas de metros de ancho (HiRISE, 2012). Aquí van exagerados ×50 para verlos desde órbita.';

const marsDevilMat = new THREE.ShaderMaterial({
    uniforms: { uTime: sharedUniforms.uTime, uVis: { value: 0 } },
    vertexShader: `
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
        uniform float uTime;
        uniform float uVis;
        varying vec2 vUv;
        float h(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
        float n(vec2 p) {
            vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
            return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y);
        }
        void main() {
            float y = vUv.y;
            // embudo: estrecho abajo, se abre y se deshace arriba
            float width = mix(0.12, 0.55, pow(y, 2.2));
            float x = (vUv.x - 0.5) / width;
            float body = 1.0 - smoothstep(0.55, 1.0, abs(x));
            // franjas que suben en espiral
            float swirl = n(vec2(x * 3.0 + uTime * 4.0 + y * 9.0, y * 7.0 - uTime * 2.2));
            swirl = mix(swirl, n(vec2(x * 7.0 - uTime * 6.0, y * 16.0 - uTime * 3.0)), 0.4);
            float fade = smoothstep(0.0, 0.08, y) * (1.0 - smoothstep(0.55, 1.0, y));
            float a = body * fade * (0.35 + swirl * 0.75) * uVis;
            vec3 col = mix(vec3(0.32, 0.18, 0.1), vec3(0.8, 0.56, 0.36), swirl * (1.0 - y * 0.5));
            gl_FragColor = vec4(col, a);
        }
    `,
    transparent: true, depthWrite: false, side: THREE.DoubleSide
});

// Remolino de polvo en el suelo: lo que se ve del torbellino mirándolo desde arriba.
const marsDustSwirlMat = new THREE.ShaderMaterial({
    uniforms: { uTime: sharedUniforms.uTime, uVis: marsDevilMat.uniforms.uVis },
    vertexShader: marsDevilMat.vertexShader,
    fragmentShader: `
        uniform float uTime;
        uniform float uVis;
        varying vec2 vUv;
        void main() {
            vec2 p = (vUv - 0.5) * 2.0;
            float r = length(p);
            float a = atan(p.y, p.x);
            float arms = 0.5 + 0.5 * sin(a * 3.0 + log(r + 0.05) * 7.0 - uTime * 5.0);
            float alpha = pow(max(0.0, 1.0 - r), 1.6) * (0.35 + arms * 0.65) * uVis;
            gl_FragColor = vec4(mix(vec3(0.28, 0.15, 0.08), vec3(0.75, 0.5, 0.32), arms), alpha * 0.85);
        }
    `,
    transparent: true, depthWrite: false, side: THREE.DoubleSide
});

const marsDevils = [];
(() => {
    const R = 2.25;
    // 0.4 de alto x s (hasta 1.8) ≈ 0.7 unidades ≈ 1,000 km = 20 km reales x 50
    const geo = new THREE.PlaneGeometry(0.08, 0.4);
    geo.translate(0, 0.2, 0);
    const baseGeo = new THREE.CircleGeometry(0.11, 32);
    baseGeo.rotateX(-Math.PI / 2);
    baseGeo.translate(0, 0.012, 0);
    const up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < MARS_DEVIL_COUNT; i++) {
        // dos planos cruzados: se ven con volumen desde cualquier ángulo sin girarlos cada cuadro
        const devil = new THREE.Group();
        const a = new THREE.Mesh(geo, marsDevilMat);
        const b = new THREE.Mesh(geo, marsDevilMat);
        b.rotation.y = Math.PI / 2;
        const base = new THREE.Mesh(baseGeo, marsDustSwirlMat);
        devil.add(a, b, base);
        devil.renderOrder = 2;
        const s = 0.7 + Math.random() * 1.1;
        devil.scale.set(s, s * (0.7 + Math.random() * 0.6), s);
        devil.userData = {
            lat: (Math.random() - 0.5) * 1.6,
            lon: Math.random() * Math.PI * 2,
            heading: Math.random() * Math.PI * 2,
            speed: 0.02 + Math.random() * 0.03,
            spin: 2 + Math.random() * 3,
            R, up
        };
        marsDevils.push(devil);
        marsMesh.add(devil);
    }
})();

const marsDevilTmp = new THREE.Vector3();
function updateMarsWeather(time, dt) {
    const vis = Math.min(1, Math.max(0, (sharedUniforms.uDetail.value - 0.25) / 0.45));
    marsDevilMat.uniforms.uVis.value = vis;
    const show = vis > 0.01;
    const note = document.getElementById('surface-note');
    if (note) {
        const want = vis > 0.5 ? MARS_DEVIL_NOTE : '';
        if (note.textContent !== want) note.textContent = want;
        note.hidden = !want;
    }
    marsDevils.forEach(d => {
        d.visible = show;
        if (!show) return;
        const u = d.userData;
        // deambulan cambiando de rumbo poco a poco
        u.heading += Math.sin(time * 0.3 + u.lon * 5.0) * dt * 0.6;
        u.lat = Math.max(-0.9, Math.min(0.9, u.lat + Math.cos(u.heading) * u.speed * dt));
        u.lon += Math.sin(u.heading) * u.speed * dt / Math.max(0.3, Math.cos(u.lat));
        marsDevilTmp.set(Math.cos(u.lat) * Math.cos(u.lon), Math.sin(u.lat), -Math.cos(u.lat) * Math.sin(u.lon));
        d.position.copy(marsDevilTmp).multiplyScalar(u.R * 0.999);
        d.quaternion.setFromUnitVectors(u.up, marsDevilTmp);
        d.rotateY(time * u.spin);
    });
}
