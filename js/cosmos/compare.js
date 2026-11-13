/* -------------------------------------------------------------------------- */
/* COMPARADOR DE TAMAÑOS: DE LA LUNA AL AGUJERO NEGRO DE M87                   */
/* -------------------------------------------------------------------------- */
// Radios reales (km). Las estrellas gigantes tienen radios inciertos: se usan
// valores publicados recientes y se marcan con "~".
const SIZE_LADDER = [
    { name: 'Luna', km: 1737, tex: 'moon.jpg', text: 'Nuestro satélite: 1/4 del tamaño de la Tierra.' },
    { name: 'Tierra', km: 6371, tex: 'earth_atmos_2048.jpg', text: 'Nuestro hogar.' },
    { name: 'Júpiter', km: 69911, tex: 'jupiter.jpg', text: 'Dentro cabrían unas 1,300 Tierras.' },
    { name: 'Sol', km: 696340, tex: 'sun.jpg', glow: 0xffb040, text: 'Dentro cabrían 1.3 millones de Tierras.' },
    { name: 'Sirio A', km: 1.19e6, color: 0xcfe0ff, text: 'La estrella más brillante del cielo: 1.7 veces el Sol.' },
    { name: 'Arturo', km: 1.77e7, color: 0xffb070, text: 'Gigante naranja: ~25 veces el Sol.' },
    { name: 'Betelgeuse', km: 5.3e8, color: 0xff6a3a, approx: true, text: 'Supergigante roja: ~760 veces el Sol. Puesta en su lugar llegaría más allá de Marte.' },
    { name: 'UY Scuti', km: 6.3e8, color: 0xff5530, approx: true, text: 'Una de las estrellas más grandes conocidas: ~900 veces el Sol (Gaia, 2023).' },
    { name: 'M87* (horizonte)', km: 1.9e10, hole: true, text: 'Agujero negro de 6,500 millones de soles: su horizonte es ~30 veces más ancho que UY Scuti, más grande que la órbita de Plutón.' }
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

function showCompareCard() {
    const b = SIZE_LADDER[compare.target];
    const ratio = compare.target ? b.km / SIZE_LADDER[compare.target - 1].km : 1;
    cosmosInfo(`RADIO: ${b.approx ? '~' : ''}${fmtKm(b.km)}${compare.target ? ` · ${ratio.toLocaleString('es-CO', { maximumFractionDigits: 1 })}× ${SIZE_LADDER[compare.target - 1].name}` : ''}`,
        b.name, b.text, [
            ['◀ ANTERIOR', () => { if (compare.target > 0) { compare.target--; showCompareCard(); } }],
            ['SIGUIENTE ▶', () => { if (compare.target < SIZE_LADDER.length - 1) { compare.target++; showCompareCard(); } }]
        ]);
}

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
