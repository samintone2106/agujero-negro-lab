/* -------------------------------------------------------------------------- */
/* LUNAS EN ÓRBITA                                                             */
/* -------------------------------------------------------------------------- */
// Segundos de animación por órbita = MOON_TIME_SCALE * sqrt(días reales):
// comprime el tiempo sin perder el orden (Fobos ~5 s, la Luna ~47 s).
const MOON_TIME_SCALE = 9;

// Textura de roca gris compartida (se tiñe con el color de cada luna).
const moonRockTexture = (() => {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 128;
    const g = c.getContext('2d');
    const img = g.createImageData(256, 128);
    for (let y = 0; y < 128; y++) {
        for (let x = 0; x < 256; x++) {
            const v = 0.55 + fbm2D(x / 24, y / 24, 4) * 0.5 - (pseudoNoise2D(x, y) * 0.08);
            const i = (y * 256 + x) * 4;
            img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v * 255));
            img.data[i + 3] = 255;
        }
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    return t;
})();

function makeMoonLabel(text) {
    const c = document.createElement('canvas');
    const g = c.getContext('2d');
    const font = '600 26px "JetBrains Mono", ui-monospace, monospace';
    g.font = font;
    c.width = Math.ceil(g.measureText(text).width) + 20;
    c.height = 40;
    g.font = font;
    g.fillStyle = 'rgba(5,8,16,0.55)';
    g.fillRect(0, 4, c.width, 32);
    g.fillStyle = '#cfe9ff';
    g.textBaseline = 'middle';
    g.fillText(text, 10, 21);
    const tex = new THREE.CanvasTexture(c);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, sizeAttenuation: false, opacity: 0.85 }));
    const h = 0.032;
    sprite.scale.set(h * c.width / c.height, h, 1);
    sprite.center.set(0.5, -0.6);
    return sprite;
}

// Esfera abollada para lunas pequeñas e irregulares (Fobos, Deimos).
function lumpyGeometry(radius, amount) {
    const geo = new THREE.IcosahedronGeometry(radius, 4);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).normalize();
        const n = fbm2D(v.x * 2.2 + 5, v.y * 2.2 + v.z * 1.7, 3) - 0.5;
        v.multiplyScalar(radius * (1 + n * amount * 2) * (1 + v.x * 0.25));
        pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
}

// Plano de órbitas de cada sistema: el de los anillos cuando el planeta los tiene.
function moonSystemPlane(planetId) {
    if (planetId === 'saturn') return saturnRingsPivot.rotation;
    if (planetId === 'uranus') return new THREE.Euler(0, Math.PI * 0.08, 0);
    return new THREE.Euler(-Math.PI / 2 + 0.08, 0, 0);
}

const moonSystems = {};
const moonsState = { visible: true };

Object.entries(MOONS).forEach(([planetId, list]) => {
    const pivot = new THREE.Group();
    pivot.rotation.copy(moonSystemPlane(planetId));
    targetGroups[planetId].add(pivot);
    const moons = list.map((m, idx) => {
        const orbitPlane = new THREE.Group();
        orbitPlane.rotation.x = m.incl || 0;
        pivot.add(orbitPlane);

        const ring = new THREE.LineLoop(
            new THREE.BufferGeometry().setFromPoints(
                Array.from({ length: 128 }, (_, i) => {
                    const a = (i / 128) * Math.PI * 2;
                    return new THREE.Vector3(Math.cos(a) * m.orbit, Math.sin(a) * m.orbit, 0);
                })
            ),
            new THREE.LineBasicMaterial({ color: 0x7fd4ff, transparent: true, opacity: 0.13, depthWrite: false })
        );
        orbitPlane.add(ring);

        const mat = new THREE.MeshPhongMaterial({
            map: moonRockTexture, bumpMap: moonRockTexture, bumpScale: 0.02,
            color: m.color ?? 0xffffff, shininess: 4, specular: 0x0a0a0a
        });
        if (m.tex) {
            loadTextureWithFallback([TEX + m.tex], (t) => { mat.map = t; mat.bumpMap = t; mat.color.set(0xffffff); mat.needsUpdate = true; });
        }
        const geo = m.lumpy ? lumpyGeometry(m.size, m.lumpy) : new THREE.SphereGeometry(m.size, 32, 32);
        const mesh = new THREE.Mesh(geo, mat);
        const label = makeMoonLabel(m.name.toUpperCase());
        mesh.add(label);
        orbitPlane.add(mesh);

        const periodSec = MOON_TIME_SCALE * Math.sqrt(m.period);
        return { cfg: m, mesh, label, ring, omega: (Math.PI * 2 / periodSec) * (m.retro ? -1 : 1), phase: idx * 2.1 + planetId.length };
    });
    moonSystems[planetId] = { pivot, moons };
});

function updateMoons(planetId, time) {
    const sys = moonSystems[planetId];
    if (!sys) return;
    sys.pivot.visible = moonsState.visible;
    if (!moonsState.visible) return;
    sys.moons.forEach(m => {
        const a = m.phase + time * m.omega;
        m.mesh.position.set(Math.cos(a) * m.cfg.orbit, Math.sin(a) * m.cfg.orbit, 0);
        // rotación sincrónica: siempre la misma cara hacia el planeta
        m.mesh.rotation.z = a;
    });
}

function setMoonsVisible(on) {
    moonsState.visible = on;
    Object.values(moonSystems).forEach(s => { s.pivot.visible = on; });
}

document.getElementById('moons-btn')?.addEventListener('click', (e) => {
    audioEngine.playClickTone(720, 0.05);
    setMoonsVisible(!moonsState.visible);
    e.currentTarget.setAttribute('aria-pressed', String(moonsState.visible));
    e.currentTarget.classList.toggle('opacity-50', !moonsState.visible);
});
