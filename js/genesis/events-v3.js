/* -------------------------------------------------------------------------- */
/* GÉNESIS v3: UN EVENTO FIRMA POR ASTRO + FOCO PARA LA CÁMARA                 */
/* -------------------------------------------------------------------------- */
// Se suma a GENESIS_SCRIPTS (js/genesis/events.js). Cada guion puede:
//  - o.focus / o.occluders: qué mirar y qué cuerpos no deben taparlo;
//  - o.after(): ajustes después de que el director escala el astro.

// Compone un guion nuevo con el que ya existía para ese astro.
function extendScript(id, ext) {
    const base = GENESIS_SCRIPTS[id] || {};
    GENESIS_SCRIPTS[id] = {
        start(R) { base.start && base.start.call(base, R); ext.start && ext.start.call(ext, R); },
        update(p, time, dt, R, o) { base.update && base.update.call(base, p, time, dt, R, o); ext.update && ext.update.call(ext, p, time, dt, R, o); },
        stop() { base.stop && base.stop.call(base); ext.stop && ext.stop.call(ext); }
    };
}

/* ------------------------------ actores nuevos ------------------------------ */
// Mancha/remolino pegado a la superficie de un planeta (Gran Mancha Roja, Mancha Oscura, corazón de Plutón).
function makeDecal(color, swirl) {
    const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { uColor: { value: new THREE.Color(color) }, uK: { value: 0 }, uTime: sharedUniforms.uTime, uSwirl: { value: swirl ? 1 : 0 } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `
            uniform vec3 uColor; uniform float uK, uTime, uSwirl; varying vec2 vUv;
            void main() {
                vec2 p = (vUv - 0.5) * 2.0; p.x *= 0.62;
                float r = length(p);
                float a = atan(p.y, p.x) + uSwirl * (uTime * 0.8 + r * 6.0);
                float arms = 0.65 + 0.35 * sin(a * 3.0);
                float body = (1.0 - smoothstep(0.55, 1.0, r / max(uK, 0.001)));
                gl_FragColor = vec4(uColor * (0.75 + arms * 0.4), body * arms * min(1.0, uK * 1.4) * 0.9);
            }
        `
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    m.visible = false;
    return m;
}
// Coloca una calcomanía sobre la esfera `host` en (u, v) de la textura.
function placeDecal(decal, host, u, v, size) {
    const r = host.geometry.parameters.radius * 1.004;
    const phi = u * Math.PI * 2, theta = (1 - v) * Math.PI;
    const dir = new THREE.Vector3(-Math.cos(phi) * Math.sin(theta), Math.cos(theta), Math.sin(phi) * Math.sin(theta));
    decal.position.copy(dir).multiplyScalar(r);
    decal.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    decal.scale.setScalar(size);
    host.add(decal);
}

const grsDecal = makeDecal(0xc2502c, true);
const darkSpotDecal = makeDecal(0x0b1a4a, true);
const heartDecal = makeDecal(0xfff4ec, false);

// Eje de giro de Urano: línea fija = perpendicular a su órbita; línea cian = su polo, que se tumba 98°.
const axisLine = new THREE.Group();
const axisPole = new THREE.Group();
(() => {
    const mk = (color, opacity) => {
        const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1, 0), new THREE.Vector3(0, 1, 0)]),
            new THREE.LineDashedMaterial({ color, dashSize: 0.08, gapSize: 0.05, transparent: true, opacity, depthTest: false }));
        l.computeLineDistances();
        return l;
    };
    axisLine.add(mk(0xffffff, 0.35));   // referencia: el "arriba" de la órbita
    axisPole.add(mk(0x9ff7ff, 0.95));   // polo del planeta
    axisLine.add(axisPole);
    axisLine.visible = false;
    genesisFx.add(axisLine);
})();

// Lluvia de metano en Titán.
const RAIN_N = 1500;
const rainGeo = new THREE.BufferGeometry();
const rainPos = new Float32Array(RAIN_N * 3), rainSeed = new Float32Array(RAIN_N * 3);
for (let i = 0; i < RAIN_N; i++) { rainSeed[i * 3] = Math.random(); rainSeed[i * 3 + 1] = Math.random(); rainSeed[i * 3 + 2] = Math.random(); }
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rainPts = new THREE.Points(rainGeo, new THREE.PointsMaterial({ map: roundDotTexture, color: 0xffc27a, size: 0.05, transparent: true, opacity: 0, depthWrite: false }));
rainPts.frustumCulled = false; rainPts.visible = false;
genesisFx.add(rainPts);

// Corte de Europa: océano salado bajo una cáscara de hielo.
const europaCut = new THREE.Group();
const europaOcean = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48), new THREE.MeshBasicMaterial({ color: 0x0a3a7a }));
const europaCore = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshStandardMaterial({ color: 0x6b5644, roughness: 1 }));
const europaShell = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 48, 0, Math.PI * 1.5), new THREE.MeshStandardMaterial({ color: 0x8a9aa8, roughness: 0.8, side: THREE.DoubleSide }));
europaCut.add(europaOcean, europaCore, europaShell);
europaCut.visible = false;
genesisFx.add(europaCut);

const V3_ACTORS = () => {
    [grsDecal, darkSpotDecal, heartDecal, axisLine, rainPts, europaCut].forEach(a => { a.visible = false; });
    SURFACE_ANIM.hex.value = 1;
};

/* ------------------------------ guiones ------------------------------ */
// Luna: la cámara sigue el choque, luego el anillo y luego la Luna; la Tierra nunca tapa la escena.
extendScript('moon', {
    update(p, time, dt, R, o) {
        const E = gxBodies[0].mesh.position;
        const contact = gxBodies[1].mesh.visible ? gxBodies[1].mesh.position.clone().lerp(E, 0.35) : E.clone();
        if (p < 0.2) o.focus = contact;
        else if (p < 0.34) o.focus = E.clone().lerp(V(0, 0, 0), 0.5);
        else o.focus = V(0, 0, 0);
        o.occluders = [{ c: E.clone(), r: gxBodies[0].mesh.scale.x * 1.08 }];
    }
});

// Tierra: tras la Luna y los océanos, la "Gran Oxidación" vuelve azul el cielo.
extendScript('earth', {
    update(p, time, dt, R, o) {
        const h = sm(0.86, 0.92, p) * (1 - sm(0.97, 1, p));
        hazeShell.visible = h > 0.01;
        if (hazeShell.visible) {
            hazeShell.scale.setScalar(R * 1.05);
            hazeShell.material.uniforms.uColor.value.set(0x5aa8ff);
            hazeShell.material.uniforms.uOpacity.value = h * 0.6;
            hazeShell.material.uniforms.uTime.value = time;
        }
        if (p > 0.56 && p < 0.62) o.focus = genesis.contact ? genesis.contact.clone() : null;
    }
});

// Sol: nudos Herbig-Haro a lo largo de los chorros y una ola de viento solar al encenderse.
extendScript('sun', {
    start() { this.next = 0.34; },
    update(p, time, dt, R) {
        if (p > this.next && p < 0.62) {
            this.next += 0.045;
            const dir = new THREE.Vector3(0, 1, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), 0.3);
            const side = Math.random() < 0.5 ? 1 : -1;
            fireShock(dir.multiplyScalar(side * R * (4 + Math.random() * 6)), R * 2.2, 0xff8ab0, 1400);
        }
        once('gx-wind', 0.8, p, () => fireShock(new THREE.Vector3(), R * 40, 0xffe2a0, 4200));
    }
});

// Mercurio: un choque rozante ("hit-and-run") le arranca el manto y el otro cuerpo sigue de largo.
extendScript('mercury', {
    start(R) {
        this.dir = V(1, 0.15, 0.35).normalize();
        this.side = V(0, 1, 0).cross(this.dir).normalize();
        gxDisk.setup({ center: V(0, 0, 0), rIn: R * 1.1, rOut: R * 1.6, thick: R * 0.3, spawn: this.side.clone().multiplyScalar(R * 1.05), size: 0.12 });
    },
    update(p, time, dt, R, o) {
        const t = sm(0.48, 0.66, p);
        const path = this.side.clone().multiplyScalar(R * 1.25).addScaledVector(this.dir, R * (-16 + t * 32));
        gxBodies[2].set(path, p > 0.47 && p < 0.7 ? R * 0.75 : 0, 0.55, time, 0.4);
        once('gx-graze', 0.57, p, () => { fireShock(this.side.clone().multiplyScalar(R * 1.1), R * 10, 0xffb070, 2200); genesisSound.cue('impact'); genesis.shake = 1.2; });
        o.flash = Math.max(o.flash, pulse(0.57, 0.02, p));
        // el manto arrancado sale en un chorro que acompaña al impactor
        gxDisk.update(dt, { spread: sm(0.57, 0.68, p), opacity: p < 0.57 ? 0 : 1 - sm(0.72, 0.8, p), spin: 0.3 });
        if (p > 0.57) gxDisk.points.position.copy(this.dir).multiplyScalar(R * 4 * sm(0.57, 0.75, p));
        o.focus = p > 0.5 && p < 0.72 ? this.side.clone().multiplyScalar(R) : null;
    },
    stop() { gxDisk.points.position.set(0, 0, 0); }
});

// Venus: océano → hierve → nubes amarillas en superrotación → lava.
extendScript('venus', {
    update(p, time) {
        const u = lavaShell.material.uniforms;
        u.uOcean.value = sm(0.6, 0.66, p) * (1 - sm(0.72, 0.78, p));
        const steam = sm(0.72, 0.76, p);
        hazeShell.material.uniforms.uColor.value.set(steam > 0.5 && p > 0.8 ? 0xffd27a : 0xffffff);
        hazeShell.rotation.y = time * 0.6; // la atmósfera da la vuelta en ~4 días: mucho más rápido que el planeta
    }
});

// Marte: un océano en el norte que se seca.
extendScript('mars', {
    update(p) { lavaShell.material.uniforms.uOcean.value = sm(0.66, 0.72, p) * (1 - sm(0.8, 0.86, p)); }
});

// Júpiter: nace la Gran Mancha Roja.
extendScript('jupiter', {
    start() { placeDecal(grsDecal, jupiterSphere, 0.366, 0.391, 0.42); },
    update(p) { grsDecal.visible = p > 0.84; grsDecal.material.uniforms.uK.value = sm(0.86, 0.96, p) * (1 - sm(0.98, 1, p)); }
});

// Saturno: el hexágono del polo norte se forma al final.
extendScript('saturn', {
    update(p) { SURFACE_ANIM.hex.value = sm(0.88, 0.98, p); }
});

// Urano: el eje dibujado se tumba hasta 98°.
extendScript('uranus', {
    update(p, time, dt, R) {
        axisLine.visible = p > 0.4;
        axisLine.scale.setScalar(R * 2.2);
        // la referencia es la orientación previa al golpe; el polo sigue al planeta
        axisLine.rotation.z = (genesis.baseRotZ || 0) - THREE.MathUtils.degToRad(98);
        axisPole.rotation.z = targetGroups.uranus.rotation.z - axisLine.rotation.z;
    }
});

// Neptuno: además de Tritón, se forma la Gran Mancha Oscura.
extendScript('neptune', {
    start() { placeDecal(darkSpotDecal, neptuneMesh, 0.3, 0.38, 0.4); },
    update(p) { darkSpotDecal.visible = p > 0.88; darkSpotDecal.material.uniforms.uK.value = sm(0.9, 0.98, p); }
});

// Ío: la marea de Júpiter lo estira y lo encoge (exagerado) y calienta su interior.
extendScript('io', {
    update(p, time, dt, R, o) {
        const flex = sm(0.5, 0.56, p) * (1 - sm(0.8, 0.86, p));
        if (flex > 0.001) {
            const main = targetGroups.io.children[0];
            o.after = () => { const s = Math.sin(time * 3) * 0.07 * flex; main.scale.x *= 1 + s; main.scale.y *= 1 - s * 0.5; main.scale.z *= 1 - s * 0.5; };
            lavaShell.material.uniforms.uHeat.value = Math.max(lavaShell.material.uniforms.uHeat.value, 0.35 + 0.25 * Math.abs(Math.sin(time * 3)) * flex);
        }
    }
});

// Europa: vista en corte del océano bajo el hielo.
extendScript('europa', {
    update(p, time, dt, R, o) {
        const show = p > 0.6 && p < 0.86;
        europaCut.visible = show;
        const main = targetGroups.europa.children[0];
        if (show) {
            europaShell.scale.setScalar(R); europaOcean.scale.setScalar(R * 0.92); europaCore.scale.setScalar(R * 0.62);
            // la cuña abierta (centrada en φ = 1.75π de la esfera) mira siempre a la cámara
            const cx = camera.position.x - genesisFx.position.x, cz = camera.position.z - genesisFx.position.z;
            europaCut.rotation.y = Math.atan2(cx, cz) - Math.atan2(-Math.cos(Math.PI * 1.75), Math.sin(Math.PI * 1.75));
            o.hazeMul = 0;
            o.particleAlpha = 0.15;
            o.after = () => { main.visible = false; };
        } else o.after = () => { main.visible = true; };
    },
    stop() { targetGroups.europa.children[0].visible = true; }
});

// Titán: lluvia de metano bajo la neblina.
extendScript('titan', {
    update(p, time, dt, R) {
        const k = sm(0.82, 0.86, p) * (1 - sm(0.96, 1, p));
        rainPts.visible = k > 0.01;
        rainPts.material.opacity = k * 0.7;
        if (!rainPts.visible) return;
        for (let i = 0; i < RAIN_N; i++) {
            const lat = (rainSeed[i * 3] - 0.5) * Math.PI, lon = rainSeed[i * 3 + 1] * Math.PI * 2;
            const h = 1 - ((rainSeed[i * 3 + 2] + time * 0.35) % 1);
            const r = R * (1.0 + h * 0.18);
            rainPos[i * 3] = Math.cos(lat) * Math.cos(lon) * r; rainPos[i * 3 + 1] = Math.sin(lat) * r; rainPos[i * 3 + 2] = Math.cos(lat) * Math.sin(lon) * r;
        }
        rainGeo.attributes.position.needsUpdate = true;
    }
});

// Plutón: el "corazón" de nitrógeno se congela al final.
extendScript('pluto', {
    start() { placeDecal(heartDecal, targetGroups.pluto.children[0], 0.6, 0.6, 0.9); },
    update(p) { heartDecal.visible = p > 0.86; heartDecal.material.uniforms.uK.value = sm(0.88, 0.98, p) * (1 - sm(0.985, 1, p)); }
});

// Púlsar: un destello de neutrinos sale justo antes de la explosión.
extendScript('pulsar', {
    update(p, time, dt, R) {
        once('gx-neutrinos', 0.34, p, () => { fireShock(new THREE.Vector3(), R * 70, 0x9ff7ff, 1300); });
    }
});

// Limpiar los actores v3 al empezar y terminar cada Génesis.
const _startGenesisScript = startGenesisScript;
startGenesisScript = function (id, R) { V3_ACTORS(); _startGenesisScript(id, R); };
const _stopGenesisScript = stopGenesisScript;
stopGenesisScript = function (id) { _stopGenesisScript(id); V3_ACTORS(); };
