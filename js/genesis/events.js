/* -------------------------------------------------------------------------- */
/* GÉNESIS: EVENTOS CIENTÍFICOS PROPIOS DE CADA ASTRO                          */
/* -------------------------------------------------------------------------- */
// Cada astro se formó por un mecanismo distinto. Aquí viven los que no caben en
// la plantilla común (rocoso / gaseoso / estrella...):
//  - Luna: Theia golpea a la proto-Tierra, el anillo de escombros orbita a la
//    TIERRA y la Luna se junta dentro de ese anillo (Canup & Asphaug 2001).
//  - Tierra: tras Theia, una lunita se forma en el anillo y se aleja.
//  - Marte: impacto Borealis en el norte, Fobos y Deimos de los escombros y el
//    viento solar que le arranca la atmósfera (MAVEN).
//  - Venus: repavimentación volcánica global (Magellan).
//  - Júpiter: disco circumplanetario donde nacen las lunas galileanas.
//  - Saturno: una luna helada desgarrada por la marea forma los anillos.
//  - Neptuno: captura de Tritón por intercambio en un sistema binario.
//  - Púlsar: "patada" natal: la estrella de neutrones sale disparada.

/* ------------------------------ actores ------------------------------ */
// Nube de partículas que orbita un centro y puede "juntarse" en uno o más cuerpos.
class GenesisDisk {
    constructor(count, color) {
        this.n = count;
        this.geo = new THREE.BufferGeometry();
        this.pos = new Float32Array(count * 3);
        this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
        this.points = new THREE.Points(this.geo, new THREE.PointsMaterial({
            map: roundDotTexture, color, size: 0.12, transparent: true, opacity: 0,
            blending: THREE.AdditiveBlending, depthWrite: false
        }));
        this.points.frustumCulled = false;
        this.points.visible = false;
        genesisFx.add(this.points);
        this.r = new Float32Array(count); this.a = new Float32Array(count); this.y = new Float32Array(count);
        this.delay = new Float32Array(count); this.target = new Uint8Array(count);
        this.jit = new Float32Array(count * 3);
        this.center = new THREE.Vector3(); this.quat = new THREE.Quaternion();
        this.spawn = null; this.targets = [];
        this.tmp = new THREE.Vector3(); this.tmp2 = new THREE.Vector3();
    }
    setup({ center, quat, rIn, rOut, thick, spawn = null, targets = [], size = 0.12 }) {
        this.center.copy(center);
        this.quat.copy(quat || new THREE.Quaternion());
        this.spawn = spawn ? spawn.clone() : null;
        this.targets = targets;
        this.points.material.size = size;
        for (let i = 0; i < this.n; i++) {
            this.r[i] = rIn + Math.pow(Math.random(), 0.8) * (rOut - rIn);
            this.a[i] = Math.random() * Math.PI * 2;
            this.y[i] = (Math.random() - 0.5) * thick;
            this.delay[i] = Math.random();
            this.target[i] = targets.length ? Math.floor(Math.random() * targets.length) : 0;
            this.jit[i * 3] = Math.random() - 0.5; this.jit[i * 3 + 1] = Math.random() - 0.5; this.jit[i * 3 + 2] = Math.random() - 0.5;
        }
    }
    // spread: 0 = todo en el punto de impacto, 1 = ya en el anillo · gather: 0..1 cae a su cuerpo
    update(dt, { spread = 1, gather = 0, opacity = 1, spin = 1, jitterR = 0.3 }) {
        this.points.visible = opacity > 0.005;
        this.points.material.opacity = opacity;
        if (!this.points.visible) return;
        for (let i = 0; i < this.n; i++) {
            const r = this.r[i];
            this.a[i] += spin * 2.2 * Math.pow(Math.max(0.6, r), -1.5) * dt;
            const p = this.tmp.set(Math.cos(this.a[i]) * r, this.y[i], Math.sin(this.a[i]) * r).applyQuaternion(this.quat).add(this.center);
            if (this.spawn) {
                const s = Math.min(1, Math.max(0, (spread * 1.6 - this.delay[i] * 0.6)));
                this.tmp2.copy(p);
                p.lerpVectors(this.spawn, this.tmp2, s * s * (3 - 2 * s));
            }
            if (gather > 0 && this.targets.length) {
                const g = Math.min(1, Math.max(0, gather * 1.5 - this.delay[i] * 0.5));
                const t = this.targets[this.target[i]];
                const j = jitterR * (1 - g);
                this.tmp2.set(t.x + this.jit[i * 3] * j, t.y + this.jit[i * 3 + 1] * j, t.z + this.jit[i * 3 + 2] * j);
                p.lerp(this.tmp2, g * g * (3 - 2 * g));
            }
            this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
        }
        this.geo.attributes.position.needsUpdate = true;
    }
    hide() { this.points.visible = false; }
}

// Cuerpo fundido (proto-Tierra, Theia, lunitas...) con el mismo shader de lava del Génesis.
function makeProtoBody() {
    const mat = makeLavaMaterial();
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), mat);
    mesh.visible = false;
    genesisFx.add(mesh);
    const glow = makeGlowSprite(0xff8a3a, 1, 0);
    glow.visible = false;
    genesisFx.add(glow);
    return {
        mesh, glow, u: mat.uniforms,
        set(pos, radius, heat, time, glowK = 0.5) {
            mesh.visible = radius > 0.0005;
            glow.visible = mesh.visible && heat > 0.15;
            if (!mesh.visible) return;
            mesh.position.copy(pos);
            mesh.scale.setScalar(radius);
            this.u.uHeat.value = heat; this.u.uTime.value = time; this.u.uCover.value = 1;
            glow.position.copy(pos);
            glow.scale.setScalar(radius * 3.2);
            glow.material.opacity = heat * glowK;
        },
        hide() { mesh.visible = false; glow.visible = false; }
    };
}

const gxDisk = new GenesisDisk(4000, 0xff8a3a);
const gxDisk2 = new GenesisDisk(1200, 0xbfe6ff);
const gxBodies = [0, 1, 2, 3, 4].map(() => makeProtoBody());
const GX_ACTORS = () => { gxDisk.hide(); gxDisk2.hide(); gxBodies.forEach(b => b.hide()); };

// Viento solar: rayas que llegan desde el Sol y arrastran gas (Marte).
const windGeo = new THREE.BufferGeometry();
const WIND_N = 900;
const windPos = new Float32Array(WIND_N * 3);
const windSeed = new Float32Array(WIND_N * 3);
for (let i = 0; i < WIND_N; i++) { windSeed[i * 3] = Math.random(); windSeed[i * 3 + 1] = Math.random() - 0.5; windSeed[i * 3 + 2] = Math.random() - 0.5; }
windGeo.setAttribute('position', new THREE.BufferAttribute(windPos, 3));
const windPoints = new THREE.Points(windGeo, new THREE.PointsMaterial({
    map: roundDotTexture, color: 0xffd9a0, size: 0.12, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false
}));
windPoints.frustumCulled = false; windPoints.visible = false;
genesisFx.add(windPoints);
function updateWind(R, time, k) {
    windPoints.visible = k > 0.01;
    windPoints.material.opacity = k * 0.8;
    if (!windPoints.visible) return;
    const d = genesisLightDir; // del Sol hacia el planeta es -d
    const side = new THREE.Vector3(0, 1, 0).cross(d).normalize();
    const up = d.clone().cross(side).normalize();
    for (let i = 0; i < WIND_N; i++) {
        const s = (windSeed[i * 3] + time * 0.35) % 1;
        const along = R * 9 * (1 - s * 2);
        let ox = windSeed[i * 3 + 1] * R * 5, oy = windSeed[i * 3 + 2] * R * 5;
        // se desvía alrededor del planeta (la "magnetosfera" inducida es débil en Marte)
        const rr = Math.hypot(ox, oy);
        if (rr < R * 1.4 && along < R * 1.5) { const f = (R * 1.4) / Math.max(0.01, rr); ox *= f; oy *= f; }
        windPos[i * 3] = d.x * along + side.x * ox + up.x * oy;
        windPos[i * 3 + 1] = d.y * along + side.y * ox + up.y * oy;
        windPos[i * 3 + 2] = d.z * along + side.z * ox + up.z * oy;
    }
    windGeo.attributes.position.needsUpdate = true;
}

/* ------------------------------ guiones ------------------------------ */
const sm = (a, b, x) => smooth01(a, b, x);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const GENESIS_SCRIPTS = {
    // La Luna nace de un anillo que orbita a la Tierra, no de un choque contra sí misma.
    moon: {
        start(R) {
            this.E0 = V(-7.5 * R, 0.4 * R, -2.6 * R);
            this.RE = R * 3.67;                       // radio Tierra / radio Luna real
            this.n = V(0.75, 0.35, 0.55).normalize();  // golpe oblicuo
            this.contact = this.E0.clone().addScaledVector(this.n, this.RE * 1.05);
            this.theiaFrom = this.E0.clone().addScaledVector(V(1, 0.5, 1.3).normalize(), R * 26);
            gxDisk.setup({
                center: this.E0, quat: new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), 0.08),
                rIn: this.RE * 1.25, rOut: this.RE * 2.3, thick: R * 0.5, spawn: this.contact,
                targets: [V(0, 0, 0)], size: 0.42
            });
        },
        update(p, time, dt, R, o) {
            const E = this.E0.clone().multiplyScalar(1 + sm(0.86, 1, p) * 0.5); // la Luna se aleja (3.8 cm/año hoy)
            const earthHeat = p < 0.14 ? 0.42 : Math.max(0.2, 0.62 - sm(0.2, 0.85, p) * 0.42);
            gxBodies[0].set(E, this.RE, earthHeat, time, 0.35);
            gxBodies[0].u.uOcean.value = sm(0.85, 0.97, p);
            // Theia (del tamaño de Marte) llega en ángulo y desaparece en el golpe
            const k = sm(0, 0.14, p);
            gxBodies[1].set(this.theiaFrom.clone().lerp(this.contact, k * k), p < 0.14 ? R * 1.95 : 0, 0.35 + k * 0.5, time, 0.6);
            once('gx-impact', 0.14, p, () => {
                fireShock(this.contact, R * 22, 0xffc080, 2600);
                genesisSound.cue('impact');
                genesis.shake = 1.5;
            });
            o.flash = Math.max(o.flash, pulse(0.14, 0.02, p));
            // anillo de escombros incandescente alrededor de la Tierra -> la Luna se junta en él
            this.diskOn = true;
            gxDisk.center.copy(E);
            gxDisk.update(dt, {
                spread: sm(0.14, 0.26, p), gather: sm(0.32, 0.56, p), spin: 1.2, jitterR: R * 2.5,
                opacity: p < 0.14 ? 0 : 1 - sm(0.52, 0.6, p)
            });
            o.grow = sm(0.34, 0.58, p);
            o.particleAlpha = 0; // el disco genérico (centrado en la Luna) no aplica aquí
        }
    },
    // Tras Theia la lunita se forma en el anillo y se aleja.
    earth: {
        start(R) {},
        update(p, time, dt, R) {
            const g = sm(0.6, 0.74, p);
            const orbitR = R * (2.6 + sm(0.74, 1, p) * 3.4);
            const a = time * 0.35;
            gxBodies[0].set(V(Math.cos(a) * orbitR, R * 0.15, Math.sin(a) * orbitR), R * 0.27 * g, 0.9 - sm(0.7, 0.95, p) * 0.75, time);
        }
    },
    // Borealis + lunas de escombros + viento solar que barre la atmósfera.
    mars: {
        start(R) {},
        update(p, time, dt, R, o) {
            const g = sm(0.58, 0.7, p);
            const a1 = time * 0.9, a2 = time * 0.45;
            gxBodies[0].set(V(Math.cos(a1) * R * 1.75, 0.05 * R, Math.sin(a1) * R * 1.75), R * 0.06 * g, 0.5 - g * 0.3, time, 0.3);
            gxBodies[1].set(V(Math.cos(a2) * R * 2.6, 0.08 * R, Math.sin(a2) * R * 2.6), R * 0.045 * g, 0.5 - g * 0.3, time, 0.3);
            if (p > 0.95) { gxBodies[0].hide(); gxBodies[1].hide(); }
            o.hideMoons = p <= 0.95;
            // atmósfera temprana tenue que el viento solar arranca
            o.hazeMul = 0.3 * (1 - sm(0.83, 0.93, p));
            updateWind(R, time, sm(0.8, 0.86, p) * (1 - sm(0.95, 1, p)));
        }
    },
    // Repavimentación: la lava vuelve a cubrir el planeta hace 300–700 Ma.
    venus: {
        start(R) {},
        update(p, time, dt, R) {
            const v = sm(0.86, 0.9, p) * (1 - sm(0.94, 0.985, p));
            if (v > 0.002) {
                lavaShell.visible = true;
                lavaShell.scale.setScalar(R * 1.012);
                const u = lavaShell.material.uniforms;
                u.uHeat.value = 0.42; u.uCover.value = v * 0.9; u.uTime.value = time; u.uOcean.value = 0;
            }
        }
    },
    // Disco circumplanetario: las lunas galileanas nacen alrededor de Júpiter.
    jupiter: {
        start(R) {
            this.orbits = [5.0, 6.4, 8.4, 11.0];
            this.moonPos = this.orbits.map(() => new THREE.Vector3());
            gxDisk2.setup({ center: V(0, 0, 0), rIn: 4.3, rOut: 11.8, thick: R * 0.12, targets: this.moonPos, size: 0.1 });
        },
        update(p, time, dt, R, o) {
            this.orbits.forEach((r, i) => {
                const a = time * 0.6 * Math.pow(5 / r, 1.5) + i * 1.7;
                this.moonPos[i].set(Math.cos(a) * r, 0, Math.sin(a) * r);
            });
            gxDisk2.update(dt, { gather: sm(0.74, 0.9, p), opacity: sm(0.56, 0.64, p) * (1 - sm(0.9, 0.96, p)), spin: 1.4, jitterR: 1.2 });
            const g = sm(0.76, 0.92, p);
            const sizes = [0.24, 0.21, 0.34, 0.31];
            this.moonPos.forEach((m, i) => gxBodies[i].set(m, sizes[i] * g, 0.4 - g * 0.3, time, 0.25));
            o.hideMoons = true;
        }
    },
    // Hipótesis Chrysalis: una luna helada se acerca demasiado y la marea la desgarra.
    saturn: {
        start(R) {
            this.quat = new THREE.Quaternion().setFromEuler(saturnRingsPivot.rotation).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), Math.PI / 2));
            gxDisk2.setup({ center: V(0, 0, 0), quat: this.quat, rIn: 3.0, rOut: 11.5, thick: 0.08, spawn: V(0, 0, 0), size: 0.09 });
        },
        update(p, time, dt, R, o) {
            const k = sm(0.6, 0.72, p);
            const r = R * (6 - k * 3.2);
            const a = time * 0.8;
            const pos = V(Math.cos(a) * r, 0, Math.sin(a) * r).applyQuaternion(this.quat);
            gxBodies[0].set(pos, p < 0.72 ? R * 0.18 : 0, 0.15, time, 0.1);
            gxBodies[0].u.uHeat.value = 0.05;
            if (p >= 0.72 && !this.torn) { this.torn = true; gxDisk2.spawn = pos.clone(); fireShock(pos, R * 3, 0xd8f0ff, 1600); genesisSound.cue('shock'); }
            gxDisk2.update(dt, { spread: sm(0.72, 0.86, p), opacity: p < 0.72 ? 0 : 1 - sm(0.9, 0.97, p), spin: 1.6 });
            o.hideMoons = true;
        },
        stop() { this.torn = false; }
    },
    // Tritón llega en un par binario; su compañero sale despedido y él queda atrapado al revés.
    neptune: {
        start(R) {},
        update(p, time, dt, R, o) {
            const k = sm(0.62, 0.78, p);   // aproximación
            const c = sm(0.78, 0.9, p);    // ya capturado
            if (p < 0.6 || p > 0.97) { gxBodies[0].hide(); gxBodies[1].hide(); return; }
            const pair = V(R * 14, R * 2.5, -R * 6).lerp(V(R * 3.2, 0.3 * R, 0), k);
            const b = time * 3;
            const sep = R * 0.6;
            if (p < 0.78) {
                gxBodies[0].set(pair.clone().add(V(Math.cos(b) * sep, 0, Math.sin(b) * sep)), R * 0.13, 0.1, time, 0);
                gxBodies[1].set(pair.clone().add(V(-Math.cos(b) * sep, 0, -Math.sin(b) * sep)), R * 0.1, 0.1, time, 0);
            } else {
                const a = -time * 0.9; // órbita retrógrada
                gxBodies[0].set(V(Math.cos(a) * R * 3, 0.3 * R * (1 - c), Math.sin(a) * R * 3), R * 0.13, 0.1, time, 0);
                gxBodies[1].set(V(R * 3.2, 0.3 * R, 0).lerp(V(-R * 30, R * 9, R * 14), c), R * 0.1, 0.1, time, 0);
            }
            once('gx-capture', 0.78, p, () => genesisSound.cue('phase'));
            o.hideMoons = true;
        }
    },
    // Patada natal: la estrella de neutrones sale disparada del centro de la explosión.
    pulsar: {
        start(R) { this.base = genesisFx.position.clone(); this.kick = V(-1, 0.25, -0.35).normalize(); },
        update(p, time, dt, R) {
            const k = sm(0.4, 1, p);
            genesisFx.position.copy(this.base).addScaledVector(this.kick, R * 7 * k);
        },
        stop() { if (this.base) genesisFx.position.copy(this.base); }
    }
};

function startGenesisScript(id, R) {
    GX_ACTORS();
    windPoints.visible = false;
    const s = GENESIS_SCRIPTS[id];
    if (s) s.start(R);
}

function updateGenesisScript(id, p, time, dt, R, overrides) {
    const s = GENESIS_SCRIPTS[id];
    if (s) s.update(p, time, dt, R, overrides);
}

function stopGenesisScript(id) {
    const s = GENESIS_SCRIPTS[id];
    if (s && s.stop) s.stop();
    GX_ACTORS();
    windPoints.visible = false;
}
