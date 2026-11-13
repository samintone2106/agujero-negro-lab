/* -------------------------------------------------------------------------- */
/* EXPLORAR EL UNIVERSO: VOLAR A LO QUE TOCAS Y CONSTELACIONES EN 3D           */
/* -------------------------------------------------------------------------- */
// Vuelo suave de la cámara del universo hacia un punto (ease-out, ~1.4 s).
const cosmosFly = { active: false, t: 0, dur: 1.4, from: new THREE.Vector3(), to: new THREE.Vector3(), tFrom: new THREE.Vector3(), tTo: new THREE.Vector3() };
function cosmosFlyTo(point, dist = 25, camPos = null) {
    const cam = cosmos.camera, ctl = cosmos.controls;
    cosmosFly.from.copy(cam.position); cosmosFly.tFrom.copy(ctl.target);
    cosmosFly.tTo.copy(point);
    if (camPos) cosmosFly.to.copy(camPos); // p. ej. desde la Tierra mirando hacia el punto
    else cosmosFly.to.copy(point).addScaledVector(cam.position.clone().sub(point).normalize(), dist);
    cosmosFly.t = 0;
    cosmosFly.active = true;
    if (reduceMotion.matches) cosmosFly.t = cosmosFly.dur;
    audioEngine.playClickTone(520, 0.05);
}
(function cosmosFlyLoop() {
    requestAnimationFrame(cosmosFlyLoop);
    if (!cosmosFly.active || !cosmos.active) { cosmosFly.active = false; return; }
    cosmosFly.t = Math.min(cosmosFly.dur, cosmosFly.t + 1 / 60);
    const k = 1 - Math.pow(1 - cosmosFly.t / cosmosFly.dur, 3);
    cosmos.camera.position.lerpVectors(cosmosFly.from, cosmosFly.to, k);
    cosmos.controls.target.lerpVectors(cosmosFly.tFrom, cosmosFly.tTo, k);
    if (cosmosFly.t >= cosmosFly.dur) cosmosFly.active = false;
})();

// "Su luz salió en el año…": la luz que vemos hoy partió hace tantos años como años luz de distancia.
function lightYearText(ly) {
    const year = new Date().getFullYear() - ly;
    return year > 0 ? `La luz que ves de ella salió en el año ${Math.round(year)}.`
        : `La luz que ves salió hace ${Math.round(ly).toLocaleString('es-CO')} años, ${-year > 3000 ? 'antes de las pirámides de Egipto' : 'antes de Cristo'}.`;
}

/* ------------------------------ constelaciones ------------------------------ */
// Estrellas principales: [ascensión recta (h), declinación (°), distancia (años luz)] y sus líneas.
// Vistas desde la Tierra forman figuras; en 3D sus estrellas están a distancias muy distintas.
const CONSTELLATIONS = [
    { name: 'ORIÓN', stars: { Betelgeuse: [5.919, 7.407, 548], Rigel: [5.242, -8.202, 863], Bellatrix: [5.419, 6.35, 250], Saiph: [5.796, -9.67, 650],
        Alnitak: [5.679, -1.943, 1260], Alnilam: [5.604, -1.202, 2000], Mintaka: [5.533, -0.299, 1200] },
      lines: [['Betelgeuse', 'Bellatrix'], ['Betelgeuse', 'Alnitak'], ['Bellatrix', 'Mintaka'], ['Alnitak', 'Alnilam'], ['Alnilam', 'Mintaka'], ['Alnitak', 'Saiph'], ['Mintaka', 'Rigel'], ['Saiph', 'Rigel']] },
    { name: 'OSA MAYOR (EL CARRO)', stars: { Dubhe: [11.062, 61.751, 123], Merak: [11.031, 56.382, 79], Phecda: [11.897, 53.695, 83], Megrez: [12.257, 57.033, 81],
        Alioth: [12.9, 55.96, 83], Mizar: [13.399, 54.925, 83], Alkaid: [13.792, 49.313, 104] },
      lines: [['Dubhe', 'Merak'], ['Merak', 'Phecda'], ['Phecda', 'Megrez'], ['Megrez', 'Dubhe'], ['Megrez', 'Alioth'], ['Alioth', 'Mizar'], ['Mizar', 'Alkaid']] },
    { name: 'CRUZ DEL SUR', stars: { Acrux: [12.443, -63.099, 320], Mimosa: [12.795, -59.689, 280], Gacrux: [12.519, -57.113, 88], Imai: [12.252, -58.749, 345] },
      lines: [['Acrux', 'Gacrux'], ['Mimosa', 'Imai']] },
    { name: 'CASIOPEA', stars: { Caph: [0.153, 59.15, 54], Schedar: [0.675, 56.537, 228], 'Gamma Cas': [0.945, 60.717, 550], Ruchbah: [1.43, 60.235, 99], Segin: [1.907, 63.67, 410] },
      lines: [['Caph', 'Schedar'], ['Schedar', 'Gamma Cas'], ['Gamma Cas', 'Ruchbah'], ['Ruchbah', 'Segin']] }
];

function buildConstellations() {
    const group = new THREE.Group();
    const markers = [];
    CONSTELLATIONS.forEach(c => {
        const P = {};
        Object.entries(c.stars).forEach(([n, [ra, dec, ly]]) => { P[n] = raDecToDir(ra, dec).multiplyScalar(ly); });
        const pts = [];
        c.lines.forEach(([a, b]) => pts.push(P[a], P[b]));
        const lines = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts),
            new THREE.LineBasicMaterial({ color: 0x93c5fd, transparent: true, opacity: 0.55, depthWrite: false }));
        group.add(lines);
        // etiqueta en el centro de la figura
        const center = Object.values(P).reduce((a, v) => a.add(v), new THREE.Vector3()).multiplyScalar(1 / Object.keys(P).length);
        const obj = new THREE.Object3D(); obj.position.copy(center);
        obj.add(makeMoonLabel(c.name));
        group.add(obj);
        const dists = Object.values(c.stars).map(s => s[2]);
        markers.push({ obj, select: () => cosmosInfo(`CONSTELACIÓN · ${Math.min(...dists)}–${Math.max(...dists).toLocaleString('es-CO')} AÑOS LUZ`, c.name.charAt(0) + c.name.slice(1).toLowerCase(),
            `Desde la Tierra parecen una figura plana, pero sus estrellas están a distancias muy distintas: de ${Math.min(...dists)} a ${Math.max(...dists).toLocaleString('es-CO')} años luz. Gira la vista para ver cómo se deforma.`,
            [['VOLAR AHÍ', () => cosmosFlyTo(center, Math.max(...dists) * 0.6)], ['VER DESDE LA TIERRA', () => cosmosFlyTo(center, 0, center.clone().normalize().multiplyScalar(-3))]]) });
    });
    return { group, markers };
}
