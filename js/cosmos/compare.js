/* -------------------------------------------------------------------------- */
/* COMPARADOR DE TAMAÑOS: DE LA LUNA AL AGUJERO NEGRO DE M87                   */
/* -------------------------------------------------------------------------- */
// Radios reales (km). Las estrellas gigantes tienen radios inciertos: se usan
// valores publicados recientes y se marcan con "~".
const SIZE_LADDER = [
    { name: 'Luna', km: 1737, tex: 'moon.jpg', text: 'Nuestro satélite: 1/4 del tamaño de la Tierra.' },
    { name: 'Mercurio', km: 2440, tex: 'mercury.jpg', text: 'El planeta más pequeño: apenas un poco más grande que nuestra Luna.' },
    { name: 'Marte', km: 3390, tex: 'mars.jpg', text: 'La mitad de ancho que la Tierra, pero con el volcán más alto del Sistema Solar (Olympus Mons, ~22 km).' },
    { name: 'Tierra', km: 6371, tex: 'earth_atmos_2048.jpg', text: 'Nuestro hogar.' },
    { name: 'Neptuno', km: 24622, tex: 'neptune.jpg', text: 'Casi 4 veces el ancho de la Tierra; tiene los vientos más rápidos medidos (~2,100 km/h).' },
    { name: 'Júpiter', km: 69911, tex: 'jupiter.jpg', text: 'Dentro cabrían unas 1,300 Tierras.' },
    { name: 'Próxima Centauri', km: 1.07e5, color: 0xff8a5a, text: 'La estrella más cercana al Sol (4.24 años luz) es una enana roja apenas más ancha que Júpiter.' },
    { name: 'Sol', km: 696340, tex: 'sun.jpg', glow: 0xffb040, text: 'Dentro cabrían 1.3 millones de Tierras.' },
    { name: 'Sirio A', km: 1.19e6, color: 0xcfe0ff, text: 'La estrella más brillante del cielo: 1.7 veces el Sol.' },
    { name: 'Sagitario A* (horizonte)', km: 1.27e7, hole: true, text: 'El agujero negro del centro de nuestra galaxia (4.3 millones de soles): su horizonte cabría dentro de la órbita de Mercurio.' },
    { name: 'Arturo', km: 1.77e7, color: 0xffb070, text: 'Gigante naranja: ~25 veces el Sol.' },
    { name: 'Rigel', km: 5.5e7, color: 0xb8ccff, approx: true, text: 'Supergigante azul de Orión: ~79 veces el Sol y ~120,000 veces más luminosa.' },
    { name: 'Betelgeuse', km: 5.3e8, color: 0xff6a3a, approx: true, text: 'Supergigante roja: ~760 veces el Sol. Puesta en su lugar llegaría más allá de Marte.' },
    { name: 'UY Scuti', km: 6.3e8, color: 0xff5530, approx: true, text: 'Una de las estrellas más grandes conocidas: ~900 veces el Sol (Gaia, 2023).' },
    { name: 'VY Canis Majoris', km: 9.9e8, color: 0xff4a2a, approx: true, text: 'Hipergigante roja de ~1,400 radios solares (estimación incierta): en lugar del Sol llegaría más allá de Júpiter.' },
    { name: 'M87* (horizonte)', km: 1.9e10, hole: true, text: 'Agujero negro de 6,500 millones de soles: su horizonte es ~30 veces más ancho que UY Scuti, más grande que la órbita de Plutón.' },
    { name: 'TON 618 (horizonte)', km: 1.95e11, hole: true, approx: true, text: 'Uno de los agujeros negros más masivos medidos (~66,000 millones de soles): su horizonte mediría ~1,300 veces la distancia Tierra–Sol.' }
];

const compare = { idx: 0, k: 0, target: 0, built: null };
const fmtKm = (km) => km >= 1e9 ? `${(km / 1e9).toLocaleString('es-CO', { maximumFractionDigits: 1 })} mil millones de km`
    : km >= 1e6 ? `${(km / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} millones de km` : `${Math.round(km).toLocaleString('es-CO')} km`;

function buildCompare() {
    const root = new THREE.Group();
    root.add(new THREE.AmbientLight(0x404050, 0.6));
    const sun = new THREE.DirectionalLight(0xffffff, 1.6); sun.position.set(-40, 20, 60); root.add(sun);
    const bodies = SIZE_LADDER.map(b => {
        const g = new THREE.Group();
        let mat;
        if (b.hole) mat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        else if (b.tex === 'sun.jpg' || b.color) {
            // estrella: oscurecimiento hacia el borde (como se ve el Sol de verdad)
            mat = new THREE.ShaderMaterial({
                uniforms: { uColor: { value: new THREE.Color(b.color || 0xffc070) }, map: { value: null }, uHasMap: { value: 0 } },
                vertexShader: 'varying vec3 vN; varying vec2 vUv; void main() { vUv = uv; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
                fragmentShader: `uniform vec3 uColor; uniform sampler2D map; uniform float uHasMap; varying vec3 vN; varying vec2 vUv;
                    void main() { float mu = max(0.0, vN.z); vec3 c = uHasMap > 0.5 ? texture2D(map, vUv).rgb * 1.3 : uColor;
                        gl_FragColor = vec4(c * (0.35 + 0.75 * pow(mu, 0.5)), 1.0); }`
            });
        }
        else mat = new THREE.MeshStandardMaterial({ roughness: 1 });
        if (b.tex) loadTextureWithFallback([TEX + b.tex], (t) => {
            if (mat.uniforms) { mat.uniforms.map.value = t; mat.uniforms.uHasMap.value = 1; } else { mat.map = t; mat.needsUpdate = true; }
        });
        g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), mat));
        if (b.color || b.glow) g.add(makeGlowSprite(b.glow || b.color, 3.2, 0.6));
        if (b.hole) {
            const ring = new THREE.Mesh(new THREE.RingGeometry(1.25, 2.1, 128), new THREE.MeshBasicMaterial({ color: 0xff9a40, transparent: true, opacity: 0.6, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
            g.add(ring, makeGlowSprite(0xff8a30, 5, 0.6));
        }
        root.add(g);
        return g;
    });
    const labels = SIZE_LADDER.map(b => { const l = makeMoonLabel(b.name.toUpperCase()); l.center.set(0.5, 1.2); root.add(l); return l; });
    return { root, bodies, labels };
}

const COMPARE_H = 9; // la estrella/astro grande ocupa ~9 unidades de radio en pantalla

// "Cabrían N" por volumen (radio al cubo), en palabras fáciles.
const fmtCount = (n) => n >= 1e12 ? `${(n / 1e12).toLocaleString('es-CO', { maximumFractionDigits: 1 })} billones`
    : n >= 1e6 ? `${(n / 1e6).toLocaleString('es-CO', { maximumFractionDigits: 1 })} millones` : Math.round(n).toLocaleString('es-CO');
const EARTH_KM = 6371;

function compareStep(d) {
    const t = Math.max(0, Math.min(SIZE_LADDER.length - 1, compare.target + d));
    if (t === compare.target) return;
    compare.target = t;
    audioEngine.playClickTone(600 + t * 25, 0.04);
    showCompareCard();
}

function showCompareCard() {
    const b = SIZE_LADDER[compare.target];
    const prev = SIZE_LADDER[compare.target - 1];
    const ratio = prev ? b.km / prev.km : 1;
    const earths = Math.pow(b.km / EARTH_KM, 3);
    const fits = b.km > EARTH_KM * 1.5 ? ` Por volumen cabrían ${fmtCount(earths)} Tierras${prev ? ` y ${fmtCount(Math.pow(ratio, 3))} veces ${prev.name}` : ''}.` : '';
    cosmosInfo(`${compare.target + 1}/${SIZE_LADDER.length} · RADIO: ${b.approx ? '~' : ''}${fmtKm(b.km)}${prev ? ` · ${ratio.toLocaleString('es-CO', { maximumFractionDigits: 1 })}× ${prev.name}` : ''}`,
        b.name, b.text + fits, [
            ['◀ ANTERIOR', () => compareStep(-1)],
            ['SIGUIENTE ▶', () => compareStep(1)]
        ]);
}
// flechas del teclado y rueda del mouse para recorrer la escalera
document.addEventListener('keydown', (e) => {
    if (!cosmos.active || cosmos.mode !== 'compare' || e.target.closest('input, textarea, select')) return;
    if (e.key === 'ArrowRight') compareStep(1);
    if (e.key === 'ArrowLeft') compareStep(-1);
});
let compareWheelT = 0;
renderer.domElement.addEventListener('wheel', (e) => {
    if (!cosmos.active || cosmos.mode !== 'compare') return;
    const now = performance.now();
    if (now - compareWheelT < 350) return;
    compareWheelT = now;
    compareStep(e.deltaY > 0 ? 1 : -1);
}, { passive: true });

cosmos.views.compare = {
    start() {
        if (!compare.built) compare.built = buildCompare();
        cosmos.scene.add(compare.built.root);
        cosmos.camera.position.set(0, 0, 40);
        cosmos.controls.target.set(0, 0, 0);
        cosmos.controls.enabled = false;
        cosmos.camera.lookAt(0, 0, 0);
        compare.k = 0; compare.target = 0;
        showCompareCard();
    },
    update(dt, time) {
        // zoom logarítmico suave hacia el astro elegido: el anterior se encoge hasta ser un punto
        compare.k += (compare.target - compare.k) * (1 - Math.exp(-dt * 1.6));
        const i = Math.floor(compare.k), f = compare.k - i;
        const r0 = SIZE_LADDER[i].km, r1 = SIZE_LADDER[Math.min(i + 1, SIZE_LADDER.length - 1)].km;
        const ref = Math.exp(Math.log(r0) + (Math.log(r1) - Math.log(r0)) * f); // radio "de referencia" que llena la pantalla
        const s = COMPARE_H / ref;
        // alineados por el borde inferior, uno al lado del otro
        let x = -18;
        compare.built.bodies.forEach((g, j) => {
            const r = SIZE_LADDER[j].km * s;
            // solo lo ya visto y el que estamos mirando (lo que sigue aparece al avanzar)
            g.visible = r > 0.004 && r < 400 && j <= Math.ceil(compare.k - 0.02);
            const label = compare.built.labels[j];
            label.visible = g.visible && r > 0.15;
            g.scale.setScalar(Math.max(r, 0.004));
            g.position.set(x + r, -COMPARE_H + r, 0);
            label.position.set(x + r, -COMPARE_H - 1.2, 0);
            g.rotation.y = time * 0.05;
            if (SIZE_LADDER[j].hole) g.children[1].quaternion.copy(cosmos.camera.quaternion);
            x += 2 * r + 0.6;
        });
    },
    stop() { cosmos.controls.enabled = true; }
};
