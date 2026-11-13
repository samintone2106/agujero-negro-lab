/* -------------------------------------------------------------------------- */
/* AMBIENTE DE CADA MUNDO: VIDA, NAVES HISTÓRICAS, CLIMA Y HUELLAS             */
/* -------------------------------------------------------------------------- */
// Todo procedural (sin modelos externos). Cada bioma devuelve { group, update }.
const bioSmooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Une geometrías (sin índices) en una sola: pocas llamadas de dibujo.
function bioMerge(geos) {
    const parts = geos.map(g => g.index ? g.toNonIndexed() : g);
    const n = parts.reduce((a, g) => a + g.attributes.position.count, 0);
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
    let o = 0;
    parts.forEach(g => {
        g.computeVertexNormals();
        pos.set(g.attributes.position.array, o * 3);
        nor.set(g.attributes.normal.array, o * 3);
        o += g.attributes.position.count;
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
    return out;
}

// Coloca N instancias sobre el terreno, lejos del punto de llegada.
function bioScatter(mesh, n, heightFn, rnd, rMin, rMax, scaleFn, avoid) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
    let placed = 0, tries = 0;
    while (placed < n && tries++ < n * 6) {
        const r = rMin + Math.sqrt(rnd()) * (rMax - rMin), a = rnd() * Math.PI * 2;
        p.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        if (avoid && avoid(p.x, p.z)) continue;
        p.y = heightFn(p.x, p.z);
        q.setFromEuler(new THREE.Euler((rnd() - 0.5) * 0.12, rnd() * Math.PI * 2, (rnd() - 0.5) * 0.12));
        const k = scaleFn(rnd);
        s.set(k, k * (0.85 + rnd() * 0.3), k);
        mesh.setMatrixAt(placed++, m.compose(p, q, s));
    }
    mesh.count = placed;
    mesh.instanceMatrix.needsUpdate = true;
    return mesh;
}

// Balanceo con el viento (en el shader, por altura del vértice).
function bioSway(mat, amount) {
    mat.onBeforeCompile = (sh) => {
        sh.uniforms.uTime = sharedUniforms.uTime;
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;')
            .replace('#include <begin_vertex>', `#include <begin_vertex>
                float hgt = max(0.0, position.y);
                vec4 wp = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
                float ph = uTime * 1.6 + wp.x * 0.13 + wp.z * 0.09;
                transformed.x += sin(ph) * hgt * hgt * ${amount.toFixed(3)};
                transformed.z += cos(ph * 0.8) * hgt * hgt * ${(amount * 0.6).toFixed(3)};`);
    };
    return mat;
}

/* ------------------------------ huellas ------------------------------ */
// En los mundos sin viento las huellas duran millones de años (las del Apolo siguen ahí).
function bioFootprints(group, heightFn) {
    const MAX = 700;
    const c = document.createElement('canvas'); c.width = 32; c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.beginPath(); g.ellipse(16, 40, 10, 20, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 2;
    for (let y = 26; y < 60; y += 6) { g.beginPath(); g.moveTo(8, y); g.lineTo(24, y); g.stroke(); } // suela del Apolo
    const geo = new THREE.PlaneGeometry(0.16, 0.32); geo.rotateX(-Math.PI / 2);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }), MAX);
    mesh.count = 0;
    mesh.frustumCulled = false;
    group.add(mesh);
    let idx = 0, last = null, side = 1;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    return () => {
        if (!player.onGround) { last = null; return; }
        const cur = player.pos;
        if (!last) { last = cur.clone(); return; }
        const dx = cur.x - last.x, dz = cur.z - last.z;
        if (dx * dx + dz * dz < 0.55 * 0.55) return;
        const yaw = Math.atan2(-dx, -dz);
        side = -side;
        p.set(cur.x + Math.cos(yaw) * 0.13 * side, 0, cur.z - Math.sin(yaw) * 0.13 * side);
        p.y = heightFn(p.x, p.z) + 0.02;
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw);
        mesh.setMatrixAt(idx, m.compose(p, q, s));
        idx = (idx + 1) % MAX;
        mesh.count = Math.min(MAX, mesh.count + 1);
        mesh.instanceMatrix.needsUpdate = true;
        last.copy(cur);
    };
}

/* ------------------------------ naves y objetos reales ------------------------------ */
function bioPlace(obj, heightFn, x, z, rotY = 0) {
    obj.position.set(x, heightFn(x, z), z);
    obj.rotation.y = rotY;
    return obj;
}
const bioMat = (color, opts = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0.1 }, opts));

// Etapa de descenso del módulo lunar del Apolo 11 (quedó en la Luna) y la bandera.
function bioApollo() {
    const g = new THREE.Group();
    const foil = bioMat(0xc89b3c, { metalness: 0.85, roughness: 0.35, emissive: 0x2a1c05 });
    const black = bioMat(0x1b1b1b, { roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 1.6, 8), foil); body.position.y = 1.9; g.add(body);
    const engine = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.7, 0.9, 16, 1, true), black); engine.position.y = 0.95; g.add(engine);
    for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + Math.PI / 4;
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.8, 8), bioMat(0xd8d8d8, { metalness: 0.6 }));
        leg.position.set(Math.cos(a) * 2.6, 1.3, Math.sin(a) * 2.6);
        leg.rotation.set(Math.sin(a) * 0.45, 0, -Math.cos(a) * 0.45);
        const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 16), bioMat(0xd0d0d0, { metalness: 0.5 }));
        pad.position.set(Math.cos(a) * 3.2, 0.05, Math.sin(a) * 3.2);
        g.add(leg, pad);
    }
    const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2, 0.05), bioMat(0xbbbbbb, { metalness: 0.6 }));
    ladder.position.set(0, 1.2, 2.5); ladder.rotation.x = -0.35; g.add(ladder);
    // bandera (con una barra arriba para que "ondee" sin viento, como la real)
    const c = document.createElement('canvas'); c.width = 96; c.height = 64; const x = c.getContext('2d');
    for (let i = 0; i < 13; i++) { x.fillStyle = i % 2 ? '#f4f4f4' : '#b22234'; x.fillRect(0, i * 64 / 13, 96, 64 / 13 + 0.5); }
    x.fillStyle = '#3c3b6e'; x.fillRect(0, 0, 40, 34);
    const flag = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.4, 8), bioMat(0xdddddd, { metalness: 0.7 })); pole.position.y = 1.2;
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(c), side: THREE.DoubleSide, roughness: 0.8, emissive: 0x111111 }));
    cloth.position.set(0.47, 2.05, 0);
    flag.add(pole, cloth);
    flag.position.set(-5, 0, 4);
    g.add(flag);
    return g;
}

// Rover Perseverance (3 m de largo, 6 ruedas, mástil con cámaras, generador RTG atrás).
function bioRover() {
    const g = new THREE.Group();
    const white = bioMat(0xe9e6df, { emissive: 0x15130f }), grey = bioMat(0x6b6b6b), dark = bioMat(0x222222, { roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.7, 2.0), white); body.position.y = 1.15; g.add(body);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 1.8), grey); deck.position.y = 1.54; g.add(deck);
    [-1.05, 0, 1.05].forEach(x => [-1.15, 1.15].forEach(z => {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.24, 20), dark);
        w.rotation.x = Math.PI / 2; w.position.set(x, 0.26, z); g.add(w);
        const rock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.06), grey); rock.position.set(x, 0.6, z * 0.9); g.add(rock);
    }));
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.3, 10), white); mast.position.set(0.9, 2.2, 0.6); g.add(mast);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.25), white); head.position.set(0.9, 2.95, 0.6); g.add(head);
    [-0.12, 0.12].forEach(z => { const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 12), dark); eye.rotation.z = Math.PI / 2; eye.position.set(1.17, 2.95, 0.6 + z); g.add(eye); });
    const rtg = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.7, 14), dark); rtg.rotation.z = 1.1; rtg.position.set(-1.55, 1.5, 0); g.add(rtg);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), white); arm.position.set(1.7, 1.0, -0.4); arm.rotation.z = -0.3; g.add(arm);
    return g;
}

// Venera 13: esfera presurizada sobre un anillo de aterrizaje (1982).
function bioVenera() {
    const g = new THREE.Group();
    const metal = bioMat(0xa7a29a, { metalness: 0.5, roughness: 0.5 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.12, 10, 32), metal); ring.rotation.x = Math.PI / 2; ring.position.y = 0.15; g.add(ring);
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.8, 24, 18), metal); sphere.position.y = 1.0; g.add(sphere);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 0.1, 28), metal); disc.position.y = 2.0; g.add(disc);
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 8), metal); ant.position.y = 2.6; g.add(ant);
    return g;
}

// Sonda Huygens (2005): un "platillo" de 1.3 m sobre los guijarros de hielo.
function bioHuygens() {
    const g = new THREE.Group();
    const m = bioMat(0xb8b0a4, { metalness: 0.5 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.55, 0.3, 28), m); base.position.y = 0.2; g.add(base);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.35, 28), m); top.position.y = 0.52; g.add(top);
    return g;
}

/* ------------------------------ partículas de clima ------------------------------ */
// Partículas en una caja que sigue a la cámara (lluvia, polvo, nieve).
function bioWeather(count, box, color, size, opacity, move) {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) pos.set([(Math.random() - 0.5) * box, Math.random() * box * 0.5, (Math.random() - 0.5) * box], i * 3);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, transparent: true, opacity, depthWrite: false, map: roundDotTexture, fog: false }));
    pts.frustumCulled = false;
    const update = (dt) => {
        const c = surface.camera.position;
        for (let i = 0; i < count; i++) {
            const j = i * 3;
            move(pos, j, dt);
            // re-envuelve alrededor de la cámara
            for (let k = 0; k < 3; k += 2) {
                const half = box / 2, d = pos[j + k] - (k ? c.z : c.x);
                if (d > half) pos[j + k] -= box; else if (d < -half) pos[j + k] += box;
            }
            if (pos[j + 1] < c.y - 6) pos[j + 1] += box * 0.5;
            if (pos[j + 1] > c.y + box * 0.5) pos[j + 1] -= box * 0.5;
        }
        geo.attributes.position.needsUpdate = true;
    };
    return { pts, update };
}

/* ------------------------------ biomas ------------------------------ */
function bioEarth(group, heightFn, rnd) {
    const coast = (x, z) => heightFn(x, z) < -6; // no plantar en el agua
    // palmas: tronco curvo y hojas en abanico
    const trunkGeo = new THREE.CylinderGeometry(0.12, 0.2, 7, 8, 6);
    trunkGeo.translate(0, 3.5, 0);
    const tp = trunkGeo.attributes.position;
    for (let i = 0; i < tp.count; i++) { const y = tp.getY(i); tp.setX(i, tp.getX(i) + Math.pow(y / 7, 2) * 0.9); }
    trunkGeo.computeVertexNormals();
    const leaves = [];
    for (let i = 0; i < 8; i++) {
        const l = new THREE.PlaneGeometry(0.7, 3.2, 1, 4);
        const lp = l.attributes.position;
        for (let k = 0; k < lp.count; k++) { const y = lp.getY(k) + 1.6; lp.setY(k, y); lp.setZ(k, -Math.pow(y / 3.2, 2) * 1.4); lp.setX(k, lp.getX(k) * Math.sin(Math.PI * y / 3.2 + 0.2)); }
        l.rotateX(-Math.PI / 2 + 0.5);
        l.rotateY(i / 8 * Math.PI * 2);
        l.translate(0.9, 7, 0);
        leaves.push(l);
    }
    const palms = new THREE.InstancedMesh(trunkGeo, bioSway(new THREE.MeshStandardMaterial({ color: 0x7a5c3e, roughness: 0.95 }), 0.002), 160);
    const crowns = new THREE.InstancedMesh(bioMerge(leaves), bioSway(new THREE.MeshStandardMaterial({ color: 0x2f7d32, roughness: 0.8, side: THREE.DoubleSide }), 0.003), 160);
    const rp = surfRng(77);
    bioScatter(palms, 160, heightFn, rp, 9, 260, r => 0.8 + r() * 0.5, coast);
    bioScatter(crowns, 160, heightFn, surfRng(77), 9, 260, r => 0.8 + r() * 0.5, coast);
    // árboles de copa ancha más lejos
    const tTrunk = new THREE.CylinderGeometry(0.18, 0.3, 4, 7); tTrunk.translate(0, 2, 0);
    const tCrown = new THREE.IcosahedronGeometry(2.6, 1); tCrown.translate(0, 5.2, 0); tCrown.scale(1, 0.8, 1);
    const trees = new THREE.InstancedMesh(tTrunk, new THREE.MeshStandardMaterial({ color: 0x5a4330, roughness: 1 }), 500);
    const treeTops = new THREE.InstancedMesh(tCrown, bioSway(new THREE.MeshStandardMaterial({ color: 0x3f7a2c, roughness: 0.9, flatShading: true }), 0.0015), 500);
    bioScatter(trees, 500, heightFn, surfRng(91), 60, 330, r => 0.7 + r() * 0.9, coast);
    bioScatter(treeTops, 500, heightFn, surfRng(91), 60, 330, r => 0.7 + r() * 0.9, coast);
    // pasto: hojas finas que se mecen
    const blade = new THREE.BufferGeometry();
    blade.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.03, 0, 0, 0.03, 0, 0, 0, 0.45, 0, 0, 0, -0.03, 0, 0, 0.03, 0, 0.45, 0]), 3));
    blade.computeVertexNormals();
    const grass = new THREE.InstancedMesh(blade, bioSway(new THREE.MeshLambertMaterial({ color: 0x86b04a, side: THREE.DoubleSide }), 0.6), 24000);
    bioScatter(grass, 24000, heightFn, rnd, 1, 50, r => 0.7 + r() * 1.1, coast);
    group.add(palms, crowns, trees, treeTops, grass);

    // nubes y aves
    const cloudTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
        for (let i = 0; i < 14; i++) { const x = 24 + Math.random() * 80, y = 44 + Math.random() * 40, r = 18 + Math.random() * 24;
            const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }
        return new THREE.CanvasTexture(c); })();
    const clouds = new THREE.Group();
    for (let i = 0; i < 22; i++) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.85, depthWrite: false, fog: false }));
        const a = rnd() * Math.PI * 2, d = 1500 + rnd() * 6000;
        sp.position.set(Math.cos(a) * d, 900 + rnd() * 1200, Math.sin(a) * d);
        sp.scale.set(900 + rnd() * 900, 400 + rnd() * 300, 1);
        clouds.add(sp);
    }
    group.add(clouds);
    const birdGeo = new THREE.BufferGeometry();
    birdGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.6, 0.15, 0, 0, 0, 0, 0, 0, 0, 0.6, 0.15, 0]), 3));
    const birds = new THREE.Group();
    for (let i = 0; i < 9; i++) {
        const b = new THREE.LineSegments(birdGeo, new THREE.LineBasicMaterial({ color: 0x1a1a1a }));
        b.userData = { a: rnd() * 6.28, r: 30 + rnd() * 40, h: 25 + rnd() * 20, s: 0.15 + rnd() * 0.1 };
        birds.add(b);
    }
    group.add(birds);
    return (dt, t) => {
        clouds.rotation.y += dt * 0.002;
        birds.children.forEach((b, i) => {
            const u = b.userData; u.a += u.s * dt;
            b.position.set(Math.cos(u.a) * u.r + 40, u.h + Math.sin(t + i) * 1.5, Math.sin(u.a) * u.r - 60);
            b.rotation.y = -u.a;
            b.scale.y = 1 + Math.sin(t * 9 + i) * 0.9; // aleteo
        });
    };
}

function bioMars(group, heightFn, rnd, devils) {
    group.add(bioPlace(bioRover(), heightFn, 16, -14, 0.6));
    // polvo fino suspendido que arrastra el viento
    const dust = bioWeather(1800, 60, 0xd8a77a, 0.06, 0.55, (p, j, dt) => {
        p[j] += player.wind.x * dt * 0.6; p[j + 2] += player.wind.z * dt * 0.6;
        p[j + 1] += Math.sin(p[j] * 0.3 + performance.now() / 900) * dt * 0.2;
    });
    group.add(dust.pts);
    // un torbellino cercano que cruza el valle: se le puede salir al paso
    const mat = marsDevilMat.clone(); mat.uniforms.uTime = sharedUniforms.uTime; mat.uniforms.uVis = { value: 1 }; mat.fog = false;
    const devil = new THREE.Group();
    [0, Math.PI / 2].forEach(r => { const geo = new THREE.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0); const m = new THREE.Mesh(geo, mat); m.rotation.y = r; m.scale.set(26, 420, 1); devil.add(m); });
    const swirlN = 900, sp = new Float32Array(swirlN * 3), sa = new Float32Array(swirlN * 3);
    for (let i = 0; i < swirlN; i++) sa.set([rnd() * 6.28, 2 + rnd() * 10, rnd() * 60], i * 3); // ángulo, radio, altura
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const swirl = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xc89064, size: 0.35, transparent: true, opacity: 0.7, depthWrite: false, map: roundDotTexture }));
    swirl.frustumCulled = false;
    devil.add(swirl);
    group.add(devil);
    const path = { t: 0 };
    let warned = false;
    return (dt, t) => {
        dust.update(dt);
        // cruza de un lado al otro en ~3 minutos y vuelve a empezar
        path.t = (path.t + dt / 190) % 1;
        const x = -260 + path.t * 520, z = 40 + Math.sin(path.t * 6) * 30;
        devil.position.set(x, heightFn(x, z), z);
        for (let i = 0; i < swirlN; i++) {
            const j = i * 3; sa[j] += dt * (1.5 + 8 / sa[j + 1]);
            sa[j + 2] = (sa[j + 2] + dt * 3) % 60;
            const r = sa[j + 1] * (0.6 + sa[j + 2] / 60);
            sp[j] = Math.cos(sa[j]) * r; sp[j + 1] = sa[j + 2]; sp[j + 2] = Math.sin(sa[j]) * r;
        }
        sg.attributes.position.needsUpdate = true;
        // al pasarte encima: viento de ~25 m/s girando... que casi no empuja
        const dx = player.pos.x - x, dz = player.pos.z - z, d = Math.hypot(dx, dz);
        if (d < 22) {
            player.gust.set(-dz / d * 25, 0, dx / d * 25);
            if (!warned && typeof showToast === 'function') { warned = true; showToast('¡Te alcanzó un torbellino! Vientos de ~25 m/s, pero el aire de Marte es tan fino que apenas empuja 4 N (como una brisa suave).'); }
        } else {
            player.gust.set(0, 0, 0);
            if (d > 60) warned = false;
        }
    };
}

function bioMoon(group, heightFn) {
    group.add(bioPlace(bioApollo(), heightFn, 18, -22, 0.4));
    return bioFootprints(group, heightFn);
}

function bioVenus(group, heightFn) {
    group.add(bioPlace(bioVenera(), heightFn, 12, -18, 0.8));
    // destellos: posibles rayos dentro de las nubes (detectados por radio, todavía en debate)
    const flash = new THREE.HemisphereLight(0xffe2b0, 0x000000, 0);
    group.add(flash);
    let next = 6 + Math.random() * 10, k = 0;
    return (dt) => {
        next -= dt;
        if (next < 0) { k = 1; next = 8 + Math.random() * 14; }
        k = Math.max(0, k - dt * 3.5);
        flash.intensity = k * (0.6 + Math.random() * 0.8);
    };
}

function bioTitan(group, heightFn) {
    group.add(bioPlace(bioHuygens(), heightFn, 9, -11, 0));
    // lluvia de metano: gotas grandes que caen lento (~1.6 m/s), como en cámara lenta
    const rain = bioWeather(3200, 50, 0xf0d2a8, 0.22, 0.75, (p, j, dt) => { p[j + 1] -= 1.6 * dt; p[j] += 0.3 * dt; });
    group.add(rain.pts);
    return (dt) => rain.update(dt);
}

function bioIo(group, heightFn, rnd) {
    // lava que brilla entre el azufre
    const glow = new THREE.Group();
    for (let i = 0; i < 40; i++) {
        const a = rnd() * 6.28, d = 30 + rnd() * 900, x = Math.cos(a) * d, z = Math.sin(a) * d;
        const s = makeGlowSprite(0xff5a1a, 8 + rnd() * 30, 0.8);
        s.position.set(x, heightFn(x, z) + 1, z);
        glow.add(s);
    }
    group.add(glow);
    return (dt, t) => glow.children.forEach((s, i) => { s.material.opacity = 0.55 + Math.sin(t * 1.3 + i) * 0.25; });
}

function bioEuropa(group, heightFn) {
    group.add(buildGeysers(0xeaf6ff, heightFn, 4242));
    return bioFootprints(group, heightFn);
}

const BIOMES = {
    earth: bioEarth, mars: bioMars, moon: bioMoon, venus: bioVenus, titan: bioTitan, io: bioIo, europa: bioEuropa
};
// Mundos sin aire ni viento: quedan las huellas.
const BIO_PRINTS = ['mercury', 'pluto', 'Ganímedes', 'Calisto', 'Encélado', 'Mimas', 'Tritón', 'Fobos', 'Caronte', 'Miranda', 'io'];

function buildBiome(id, site, heightFn, seed, devils) {
    const group = new THREE.Group();
    const rnd = surfRng(seed + 555);
    const fns = [];
    if (BIOMES[id]) fns.push(BIOMES[id](group, heightFn, rnd, devils));
    if (BIO_PRINTS.includes(id)) fns.push(bioFootprints(group, heightFn));
    return { group, update: (dt, t) => fns.forEach(f => f && f(dt, t)) };
}

/* ------------------------------ avisos ------------------------------ */
// Aviso breve en pantalla (eventos del juego).
let toastTimer = null;
function showToast(text) {
    const el = document.getElementById('play-toast');
    if (!el) return;
    el.textContent = text;
    el.hidden = false;
    el.classList.remove('is-on'); void el.offsetWidth; el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.classList.remove('is-on'); setTimeout(() => { el.hidden = true; }, 250); }, 6500);
}
