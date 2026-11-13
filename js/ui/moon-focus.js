/* -------------------------------------------------------------------------- */
/* ENFOCAR UNA LUNA: CLIC (O MENÚ) -> LA CÁMARA LA SIGUE CON SU FICHA REAL     */
/* -------------------------------------------------------------------------- */
const moonFocusDom = {
    card: document.getElementById('moon-card'),
    name: document.getElementById('moon-card-name'),
    planet: document.getElementById('moon-card-planet'),
    km: document.getElementById('moon-card-km'),
    period: document.getElementById('moon-card-period'),
    found: document.getElementById('moon-card-found'),
    fact: document.getElementById('moon-card-fact'),
    back: document.getElementById('moon-card-back')
};
const moonFocus = { mesh: null, saved: null, blend: 0 };
const moonFocusRay = new THREE.Raycaster();
const moonFocusPtr = new THREE.Vector2();
const moonFocusWorld = new THREE.Vector3();
const moonFocusDelta = new THREE.Vector3();

function moonPickables() {
    const list = [];
    const sys = moonSystems[state.currentTarget];
    if (sys && moonsState.visible) sys.moons.forEach(m => list.push(m.mesh));
    if (state.currentTarget === 'pluto') list.push(charon);
    return list;
}

function focusMoon(mesh) {
    const info = mesh.userData.moon;
    if (!info) return;
    if (!moonFocus.mesh) {
        moonFocus.saved = { minDistance: controls.minDistance, autoRotate: controls.autoRotate, target: controls.target.clone(), descent: state.descentPercent };
    }
    moonFocus.mesh = mesh;
    moonFocus.blend = 0;
    if (!mesh.geometry.boundingSphere) mesh.geometry.computeBoundingSphere();
    const radius = mesh.geometry.boundingSphere.radius;
    moonFocus.dist = Math.max(0.5, radius * 4.2);
    controls.minDistance = Math.max(0.15, radius * 1.4);
    controls.autoRotate = false;

    const { cfg, planetId } = info;
    moonFocusDom.name.textContent = cfg.name;
    moonFocusDom.planet.textContent = `LUNA DE ${ASTRO_TARGETS[planetId].name.split(' (')[0]}`;
    moonFocusDom.km.textContent = `${cfg.km.toLocaleString('es-CO')} km`;
    moonFocusDom.period.textContent = cfg.period < 2 ? `${(cfg.period * 24).toFixed(1)} h` : `${cfg.period.toLocaleString('es-CO')} días`;
    moonFocusDom.found.textContent = cfg.found;
    moonFocusDom.fact.textContent = cfg.fact;
    moonFocusDom.back.textContent = `← VOLVER A ${ASTRO_TARGETS[planetId].name.split(' (')[0]}`;
    moonFocusDom.card.hidden = false;
    audioEngine.playClickTone(1040, 0.05);
}

function clearMoonFocus() {
    if (!moonFocus.mesh) return;
    moonFocus.mesh = null;
    controls.minDistance = moonFocus.saved.minDistance;
    controls.autoRotate = moonFocus.saved.autoRotate;
    controls.target.copy(moonFocus.saved.target);
    moonFocusDom.card.hidden = true;
    updateRelativityTelemetry(moonFocus.saved.descent); // vuelve a encuadrar el planeta como estaba
}

// Se llama cada cuadro antes de controls.update(): la cámara viaja con la luna.
function updateMoonFocus(dt) {
    if (!moonFocus.mesh) return;
    moonFocus.mesh.getWorldPosition(moonFocusWorld);
    moonFocusDelta.copy(moonFocusWorld).sub(controls.target);
    if (moonFocus.blend < 1) {
        // acercamiento suave la primera vez
        moonFocus.blend = Math.min(1, moonFocus.blend + dt * 1.6);
        const k = 1 - Math.pow(1 - moonFocus.blend, 3);
        controls.target.addScaledVector(moonFocusDelta, k);
        const off = camera.position.clone().sub(controls.target);
        const d = off.length();
        off.setLength(d + (moonFocus.dist - d) * k * 0.25);
        camera.position.copy(controls.target).add(off);
    } else {
        controls.target.add(moonFocusDelta);
        camera.position.add(moonFocusDelta);
    }
}

// Clic sin arrastre sobre una luna
let moonPointerDown = null;
renderer.domElement.addEventListener('pointerdown', (e) => { moonPointerDown = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', (e) => {
    if (!moonPointerDown || (typeof genesis !== 'undefined' && genesis.active)) return;
    const moved = Math.hypot(e.clientX - moonPointerDown.x, e.clientY - moonPointerDown.y);
    moonPointerDown = null;
    if (moved > 6) return;
    const rect = renderer.domElement.getBoundingClientRect();
    moonFocusPtr.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    moonFocusRay.setFromCamera(moonFocusPtr, camera);
    // tolerancia: las lunas son pequeñas, se acepta el clic cerca del disco
    const hits = moonFocusRay.intersectObjects(moonPickables(), false);
    let target = hits.length ? hits[0].object : null;
    if (!target) {
        let best = 0.06;
        moonPickables().forEach(m => {
            m.getWorldPosition(moonFocusWorld);
            const p = moonFocusWorld.project(camera);
            const dd = Math.hypot(p.x - moonFocusPtr.x, (p.y - moonFocusPtr.y) / camera.aspect);
            if (p.z < 1 && dd < best) { best = dd; target = m; }
        });
    }
    if (target) focusMoon(target);
});

moonFocusDom.back?.addEventListener('click', () => { audioEngine.playClickTone(520, 0.05); clearMoonFocus(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') clearMoonFocus(); });
