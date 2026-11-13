/* -------------------------------------------------------------------------- */
/* TOUR CINEMATOGRÁFICO: DEL BIG BANG A PISAR LA TIERRA                        */
/* -------------------------------------------------------------------------- */
// Cada paso: [segundos, texto, acción al empezar, acción por cuadro opcional]
const TOUR_STEPS = [
    [11, 'Hace 13,800 millones de años, todo empezó en un instante.', () => { enterCosmos('origin'); origin.elapsed = origin.cfg.duration * 0.0; originDom.card.hidden = true; }, (p) => { origin.elapsed = origin.cfg.duration * (0.02 + p * 0.5); }],
    [9, 'La gravedad tejió una red de galaxias. Una de ellas sería la nuestra.', null, (p) => { origin.elapsed = origin.cfg.duration * (0.55 + p * 0.33); }],
    [10, 'La Vía Láctea: unos 100,000 años luz y cientos de miles de millones de estrellas.', () => { enterCosmos('galaxy'); cosmosDom.panel.hidden = true; },
        (p) => {
            const t = 1 - Math.pow(1 - p, 3);
            const sun = cosmos.built.galaxy.markers[0].obj.getWorldPosition(new THREE.Vector3()); // el Sol gira con la galaxia
            cosmos.camera.position.lerpVectors(new THREE.Vector3(-520, 520, 620), sun.clone().add(new THREE.Vector3(-30, 40, 50)), t);
            cosmos.controls.target.lerpVectors(new THREE.Vector3(-60, 0, 0), sun, t);
        }],
    [8, 'En un brazo tranquilo, a 26,000 años luz del centro, brilla una estrella común: el Sol.', () => switchTarget('sun')],
    [6, 'Júpiter, el gigante que moldeó el Sistema Solar.', () => switchTarget('jupiter')],
    [6, 'Saturno y sus anillos de hielo, quizá más jóvenes que los dinosaurios.', () => switchTarget('saturn')],
    [6, 'Y un pequeño punto azul…', () => switchTarget('earth')],
    [3, 'Bienvenido a casa.', () => startLanding('earth')]
];

const tourState = { active: false, step: -1, t: 0 };
const tourDom = { box: document.getElementById('tour-caption'), text: document.getElementById('tour-text') };

function startTour() {
    Object.assign(tourState, { active: true, step: -1, t: 0 });
    tourDom.box.hidden = false;
    document.body.classList.add('tour-mode');
    if (audioEngine.isPlaying) genesisSound.start('star');
    nextTourStep();
}
function nextTourStep() {
    tourState.step++;
    tourState.t = 0;
    const s = TOUR_STEPS[tourState.step];
    if (!s) { endTour(); return; }
    tourDom.text.classList.remove('is-on');
    requestAnimationFrame(() => { tourDom.text.textContent = s[1]; tourDom.text.classList.add('is-on'); });
    if (s[2]) s[2]();
}
function endTour() {
    if (!tourState.active) return;
    tourState.active = false;
    tourDom.box.hidden = true;
    document.body.classList.remove('tour-mode');
    genesisSound.stop();
}
function updateTour(dt) {
    if (!tourState.active) return;
    const s = TOUR_STEPS[tourState.step];
    tourState.t += dt;
    if (s[3]) s[3](Math.min(1, tourState.t / s[0]));
    if (tourState.t >= s[0]) nextTourStep();
}

cosmos.views.tour = { start() { requestAnimationFrame(startTour); } };
document.getElementById('tour-stop')?.addEventListener('click', () => { endTour(); if (cosmos.active) exitCosmos('earth'); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && tourState.active) endTour(); });
