/* -------------------------------------------------------------------------- */
/* TOUR CINEMATOGRÁFICO CON NARRADOR: DEL BIG BANG A PISAR LA TIERRA            */
/* -------------------------------------------------------------------------- */
// Cada paso: [segundos mínimos, subtítulo, acción al empezar, acción por cuadro, narración]
// La narración usa la voz del navegador (speechSynthesis): el paso espera a que termine.
const TOUR_STEPS = [
    [11, 'Hace 13,800 millones de años, todo empezó en un instante.', () => { enterCosmos('origin'); origin.elapsed = origin.cfg.duration * 0.0; originDom.card.hidden = true; }, (p) => { origin.elapsed = origin.cfg.duration * (0.02 + Math.min(1, p) * 0.5); },
        'Hace trece mil ochocientos millones de años, todo lo que hoy vemos estaba concentrado y más caliente que cualquier cosa imaginable. En un instante empezó a expandirse. Lo llamamos el Big Bang.'],
    [9, 'La gravedad tejió una red de galaxias. Una de ellas sería la nuestra.', null, (p) => { origin.elapsed = origin.cfg.duration * (0.55 + Math.min(1, p) * 0.33); },
        'Al enfriarse, la gravedad juntó el gas en filamentos gigantes. En sus nudos se encendieron las primeras estrellas y nacieron las galaxias.'],
    [10, 'La Vía Láctea: unos 100,000 años luz y cientos de miles de millones de estrellas.', () => { enterCosmos('galaxy'); cosmosDom.panel.hidden = true; },
        (p) => {
            const t = 1 - Math.pow(1 - Math.min(1, p), 3);
            const sun = cosmos.built.galaxy.markers[0].obj.getWorldPosition(new THREE.Vector3()); // el Sol gira con la galaxia
            cosmos.camera.position.lerpVectors(new THREE.Vector3(-520, 520, 620), sun.clone().add(new THREE.Vector3(-30, 40, 50)), t);
            cosmos.controls.target.lerpVectors(new THREE.Vector3(-60, 0, 0), sun, t);
        },
        'Esta es la Vía Láctea: un disco de cien mil años luz con cientos de miles de millones de estrellas, que gira alrededor de un agujero negro de cuatro millones de soles.'],
    [8, 'En un brazo tranquilo, a 26,000 años luz del centro, brilla una estrella común: el Sol.', () => switchTarget('sun'), null,
        'En un brazo tranquilo, a veintiséis mil años luz del centro, se formó hace cuatro mil seiscientos millones de años una estrella común. Nuestro Sol.'],
    [6, 'Júpiter, el gigante que moldeó el Sistema Solar.', () => switchTarget('jupiter'), null,
        'Júpiter tiene más masa que todos los demás planetas juntos. Su gravedad ordenó el Sistema Solar y todavía desvía cometas.'],
    [6, 'Saturno y sus anillos de hielo, quizá más jóvenes que los dinosaurios.', () => switchTarget('saturn'), null,
        'Saturno y sus anillos de hielo: casi tan anchos como la distancia a la Luna, pero en partes de apenas diez metros de espesor.'],
    [6, 'Y un pequeño punto azul…', () => switchTarget('earth'), null,
        'Y aquí, un pequeño punto azul. El único lugar donde sabemos que existe la vida.'],
    [3, 'Bienvenido a casa.', () => startLanding('earth', { mode: 'trip' }), null, 'Bienvenido a casa.']
];

const tourState = { active: false, step: -1, t: 0, speaking: false, voiceOn: true };
const tourDom = { box: document.getElementById('tour-caption'), text: document.getElementById('tour-text'), voice: document.getElementById('tour-voice') };
try { tourState.voiceOn = localStorage.getItem('eh.tourVoice') !== '0'; } catch (e) { /* sin almacenamiento */ }

/* ------------------------------ narrador ------------------------------ */
const hasSpeech = typeof window.speechSynthesis !== 'undefined' && typeof SpeechSynthesisUtterance !== 'undefined';
let tourVoice = null;
function pickTourVoice() {
    if (!hasSpeech) return null;
    const vs = speechSynthesis.getVoices();
    const pref = ['es-CO', 'es-MX', 'es-US', 'es-419', 'es-ES'];
    for (const lang of pref) { const v = vs.find(x => x.lang === lang || x.lang.replace('_', '-') === lang); if (v) return v; }
    return vs.find(x => x.lang && x.lang.toLowerCase().startsWith('es')) || null;
}
if (hasSpeech) { tourVoice = pickTourVoice(); speechSynthesis.addEventListener?.('voiceschanged', () => { tourVoice = pickTourVoice(); }); }

// Narración grabada con voz neuronal (es-CO, assets/audio/tour/paso-N.mp3); si falla, la voz del navegador.
let tourAudio = null;
function stopNarration() {
    if (tourAudio) { tourAudio.onended = tourAudio.onerror = null; tourAudio.pause(); tourAudio = null; }
    if (hasSpeech) speechSynthesis.cancel();
    tourState.speaking = false;
}
function narrate(text, step) {
    stopNarration();
    if (!tourState.voiceOn || !text) return;
    const a = new Audio(`assets/audio/tour/paso-${step}.mp3`);
    const vol = document.getElementById('volume-slider');
    a.volume = vol ? Math.min(1, Number(vol.value) / 100) : 0.9;
    tourAudio = a;
    tourState.speaking = true;
    a.onended = () => { if (tourAudio === a) { tourState.speaking = false; tourAudio = null; } };
    a.onerror = () => { if (tourAudio === a) { tourAudio = null; speakFallback(text); } };
    a.play().catch(() => { if (tourAudio === a) { tourAudio = null; speakFallback(text); } });
}
function speakFallback(text) {
    if (!hasSpeech || !tourState.voiceOn || !text) { tourState.speaking = false; return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = tourVoice ? tourVoice.lang : 'es-ES';
    if (tourVoice) u.voice = tourVoice;
    u.rate = 0.98; u.pitch = 0.95;
    tourState.speaking = true;
    const done = () => { tourState.speaking = false; };
    u.onend = done; u.onerror = done;
    speechSynthesis.speak(u);
}
function syncTourVoiceBtn() {
    if (!tourDom.voice) return;
    tourDom.voice.hidden = false;
    tourDom.voice.textContent = tourState.voiceOn ? '🔊 NARRADOR' : '🔇 NARRADOR';
    tourDom.voice.setAttribute('aria-pressed', String(tourState.voiceOn));
}

/* ------------------------------ control ------------------------------ */
function startTour() {
    Object.assign(tourState, { active: true, step: -1, t: 0, speaking: false });
    tourDom.box.hidden = false;
    document.body.classList.add('tour-mode');
    syncTourVoiceBtn();
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
    narrate(s[4], tourState.step);
    if (s[2]) s[2]();
}
function endTour() {
    if (!tourState.active) return;
    tourState.active = false;
    stopNarration();
    tourDom.box.hidden = true;
    document.body.classList.remove('tour-mode');
    genesisSound.stop();
}
function updateTour(dt) {
    if (!tourState.active) return;
    const s = TOUR_STEPS[tourState.step];
    tourState.t += dt;
    if (s[3]) s[3](tourState.t / s[0]);
    // avanza cuando pasó el tiempo mínimo Y el narrador terminó la frase (máximo 30 s por si la voz falla)
    if (tourState.t >= s[0] && (!tourState.speaking || tourState.t > 30)) nextTourStep();
}

cosmos.views.tour = { start() { requestAnimationFrame(startTour); } };
document.getElementById('tour-stop')?.addEventListener('click', () => { endTour(); if (cosmos.active) exitCosmos('earth'); });
tourDom.voice?.addEventListener('click', () => {
    tourState.voiceOn = !tourState.voiceOn;
    try { localStorage.setItem('eh.tourVoice', tourState.voiceOn ? '1' : '0'); } catch (e) { /* sin almacenamiento */ }
    if (!tourState.voiceOn) stopNarration();
    syncTourVoiceBtn();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && tourState.active) endTour(); });
// el volumen del narrador sigue al deslizador también a mitad de una frase
document.getElementById('volume-slider')?.addEventListener('input', (e) => { if (tourAudio) tourAudio.volume = Math.min(1, Number(e.target.value) / 100); });
