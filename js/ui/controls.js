document.querySelectorAll('.target-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-target');
        if (targetId && ASTRO_TARGETS[targetId]) {
            audioEngine.playClickTone(860, 0.05);
            state.ringSkimMode = false;
            switchTarget(targetId);
            btn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
        }
    });
});

controls.addEventListener('change', () => {
    // con una luna enfocada la distancia es a la luna: no debe mover el propulsor del planeta
    if (typeof moonFocus !== 'undefined' && moonFocus.mesh) return;
    const dist = camera.position.distanceTo(controls.target);
    sharedUniforms.uCameraDist.value = dist;
    const far = frameFarFor(state.currentTarget);
    const computedPct = Math.max(0, Math.min(100, ((far - dist) / (far - FRAME_NEAR)) * 100));
    if (Math.abs(computedPct - state.descentPercent) > 1.2) {
        state.descentPercent = computedPct;
        dom.descentSlider.value = computedPct;
        dom.descentPercentage.textContent = `${computedPct.toFixed(0)}%`;
        const miniSlider = document.getElementById('mini-descent-slider');
        const miniPct = document.getElementById('mini-descent-percentage');
        if (miniSlider) miniSlider.value = computedPct;
        if (miniPct) miniPct.textContent = `${computedPct.toFixed(0)}%`;
    }
});

dom.descentSlider.addEventListener('input', (e) => updateRelativityTelemetry(e.target.value));
document.getElementById('mini-descent-slider')?.addEventListener('input', (e) => {
    dom.descentSlider.value = e.target.value;
    updateRelativityTelemetry(e.target.value);
});

document.getElementById('toggle-bottom-hud-btn')?.addEventListener('click', () => {
    audioEngine.playClickTone(840, 0.05);
    const deck = document.getElementById('bottom-hud-deck');
    const miniBar = document.getElementById('mini-zoom-bar');
    const label = document.getElementById('toggle-bottom-hud-label');
    const icon = document.getElementById('toggle-bottom-hud-icon');
    const shortLabel = document.getElementById('toggle-bottom-hud-short');
    if (!deck) return;

    const isHidden = deck.classList.toggle('hidden');
    document.getElementById('toggle-bottom-hud-btn')?.setAttribute('aria-expanded', String(!isHidden));
    if (isHidden) {
        miniBar?.classList.remove('hidden');
        miniBar?.classList.add('flex');
        if (label) label.textContent = 'EXPANDIR PANEL DE TELEMETRÍA';
        if (shortLabel) shortLabel.textContent = 'MOSTRAR PANEL';
        icon?.setAttribute('data-lucide', 'chevron-up');
        controls.target.set(0, 0, 0);
    } else {
        miniBar?.classList.add('hidden');
        miniBar?.classList.remove('flex');
        if (label) label.textContent = 'MINIMIZAR PANEL INFERIOR (VISTA DESPEJADA)';
        if (shortLabel) shortLabel.textContent = 'OCULTAR PANEL';
        icon?.setAttribute('data-lucide', 'chevron-down');
        updateRelativityTelemetry(state.descentPercent);
    }
    lucide.createIcons();
});

document.querySelectorAll('.milestone-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetVal = parseFloat(btn.getAttribute('data-milestone'));
        audioEngine.playClickTone(740, 0.06);
        dom.descentSlider.value = targetVal;
        updateRelativityTelemetry(targetVal);
    });
});

document.querySelectorAll('.spaghetti-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        state.spaghettiPreset = btn.getAttribute('data-spaghetti-preset');
        audioEngine.playClickTone(780, 0.05);
        updateSpaghettificationSimulation();
    });
});

function toggleRingSkim() {
    audioEngine.playClickTone(920, 0.07);
    state.ringSkimMode = !state.ringSkimMode;
    if (state.currentTarget !== 'saturn' && state.currentTarget !== 'uranus' && state.currentTarget !== 'neptune') {
        switchTarget('saturn');
    }
    if (state.ringSkimMode && state.descentPercent < 60) {
        dom.descentSlider.value = 76;
    }
    const skimBtn = document.getElementById('skim-btn');
    if (skimBtn) {
        skimBtn.classList.toggle('border-singularity-amber', state.ringSkimMode);
    }
    updateRelativityTelemetry(dom.descentSlider.value);
}
document.getElementById('skim-btn')?.addEventListener('click', toggleRingSkim);

function triggerWarp() {
    audioEngine.playClickTone(520, 0.12);
    state.warpActive = true;
    const startVal = parseFloat(dom.descentSlider.value);
    const targetVal = Math.min(100, startVal + 20);
    let step = 0;
    const warpInterval = setInterval(() => {
        step += 0.05;
        const current = startVal + (targetVal - startVal) * Math.min(1, step);
        dom.descentSlider.value = current;
        updateRelativityTelemetry(current);
        if (step >= 1) {
            clearInterval(warpInterval);
            setTimeout(() => { state.warpActive = false; }, 350);
        }
    }, 20);
}
document.getElementById('warp-btn')?.addEventListener('click', triggerWarp);

function toggleAudioUI() {
    const active = audioEngine.toggle();
    state.audioEnabled = active;
    const audioLabel = document.getElementById('audio-label');
    const audioIcon = document.getElementById('audio-icon');
    document.getElementById('audio-btn')?.setAttribute('aria-pressed', String(active));
    if (active) {
        audioEngine.playClickTone(980, 0.06);
        if (audioLabel) { audioLabel.textContent = 'SONIDO: ENCENDIDO'; audioLabel.className = 'hidden 2xl:inline font-mono text-[10px] sm:text-xs font-semibold text-singularity-cyan glow-cyan'; }
        audioIcon?.setAttribute('data-lucide', 'volume-2');
    } else {
        if (audioLabel) { audioLabel.textContent = 'SONIDO: APAGADO'; audioLabel.className = 'hidden 2xl:inline font-mono text-[10px] sm:text-xs font-semibold text-slate-300'; }
        audioIcon?.setAttribute('data-lucide', 'volume-x');
    }
    lucide.createIcons();
}
const SOUND_PREF_KEY = 'eh-sound';
const readPref = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const writePref = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* almacenamiento bloqueado: se ignora */ } };

document.getElementById('audio-btn')?.addEventListener('click', () => {
    toggleAudioUI();
    writePref(SOUND_PREF_KEY, audioEngine.isPlaying ? 'on' : 'off');
});

// Los navegadores solo dejan sonar audio tras un gesto: el primer toque en la página lo enciende,
// salvo que la persona lo haya apagado antes a propósito.
window.addEventListener('pointerdown', (e) => {
    if (audioEngine.isPlaying || readPref(SOUND_PREF_KEY) === 'off' || e.target.closest('#audio-btn')) return;
    toggleAudioUI();
}, { once: true, capture: true });

const volumeSlider = document.getElementById('volume-slider');
if (volumeSlider) {
    const saved = parseInt(readPref('eh-volume'), 10);
    if (!Number.isNaN(saved)) volumeSlider.value = saved;
    audioEngine.setVolume(volumeSlider.value / 100);
    volumeSlider.addEventListener('input', () => {
        audioEngine.setVolume(volumeSlider.value / 100);
        writePref('eh-volume', volumeSlider.value);
    });
}

document.getElementById('open-spaghetti-btn').addEventListener('click', () => {
    audioEngine.playClickTone(820, 0.05);
    state.spaghettiPreset = state.currentTarget;
    updateSpaghettificationSimulation();
    dom.modalSpaghetti.classList.remove('hidden');
    dom.modalSpaghetti.classList.add('flex');
});
document.getElementById('open-laser-btn').addEventListener('click', () => {
    audioEngine.playClickTone(880, 0.05);
    updateLaserModalReadouts();
    dom.modalLaser.classList.remove('hidden');
    dom.modalLaser.classList.add('flex');
});
document.getElementById('open-compare-btn')?.addEventListener('click', () => {
    audioEngine.playClickTone(920, 0.05);
    dom.modalCompare.classList.remove('hidden');
    dom.modalCompare.classList.add('flex');
});

function openNasaModal() {
    audioEngine.playClickTone(940, 0.06);
    dom.modalNasa.classList.remove('hidden');
    dom.modalNasa.classList.add('flex');
}
document.getElementById('open-nasa-btn')?.addEventListener('click', openNasaModal);
document.getElementById('nasa-live-btn')?.addEventListener('click', openNasaModal);
document.getElementById('open-nasa-modal-from-widget')?.addEventListener('click', openNasaModal);
document.getElementById('nasa-widget-thumb-box')?.addEventListener('click', openNasaModal);
document.getElementById('expand-closeup-btn')?.addEventListener('click', openNasaModal);

document.getElementById('nasa-refresh-btn')?.addEventListener('click', () => {
    audioEngine.playClickTone(860, 0.05);
    fetchNasaMissionTelemetry(state.currentTarget, true);
});

document.getElementById('open-compare-from-nasa')?.addEventListener('click', () => {
    audioEngine.playClickTone(880, 0.05);
    dom.modalNasa.classList.add('hidden');
    dom.modalNasa.classList.remove('flex');
    dom.modalCompare.classList.remove('hidden');
    dom.modalCompare.classList.add('flex');
});

document.getElementById('toggle-nasa-widget')?.addEventListener('click', () => {
    const body = document.getElementById('nasa-widget-body');
    if (body) body.classList.toggle('hidden');
});

document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
        audioEngine.playClickTone(440, 0.05);
        const modalEl = document.getElementById(btn.getAttribute('data-close-modal'));
        modalEl.classList.add('hidden');
        modalEl.classList.remove('flex');
    });
});

[dom.modalSpaghetti, dom.modalLaser, dom.modalCompare, dom.modalNasa].forEach(modal => {
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            audioEngine.playClickTone(440, 0.05);
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    });
});

dom.bhMassSlider.addEventListener('input', () => {
    state.spaghettiPreset = 'gargantua';
    updateSpaghettificationSimulation();
});

document.getElementById('emit-ping-btn').addEventListener('click', () => {
    state.pingWaveProgress = 0;
    audioEngine.playTelemetryPing();
});

window.addEventListener('pointermove', (e) => {
    const normX = (e.clientX / window.innerWidth) * 2 - 1;
    const normY = (e.clientY / window.innerHeight) * 2 - 1;
    if (dom.gyroValue) {
        dom.gyroValue.textContent = `${(normY * 18).toFixed(1)}° CABECEO / ${(normX * 24).toFixed(1)}° GUIÑADA`;
    }
});

// Keep the scene framed on any screen: widen the vertical FOV on portrait
// screens so the target never gets cropped at the sides.
const BASE_FOV = 60;
function fitViewport() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / h;
    camera.aspect = aspect;
    if (aspect < 1) {
        const halfV = THREE.MathUtils.degToRad(BASE_FOV / 2);
        const fov = 2 * THREE.MathUtils.radToDeg(Math.atan(Math.tan(halfV) / aspect * 0.8));
        camera.fov = Math.min(90, Math.max(BASE_FOV, fov));
    } else {
        camera.fov = BASE_FOV;
    }
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
}
let resizeRaf = 0;
function scheduleFit() {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(fitViewport);
}
window.addEventListener('resize', scheduleFit);
window.addEventListener('orientationchange', scheduleFit);
window.visualViewport?.addEventListener('resize', scheduleFit);
fitViewport();

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    // con el catálogo abierto, Escape solo lo cierra (lo maneja js/ui/missions.js)
    if (document.getElementById('modal-missions')?.classList.contains('flex')) return;
    stopGenesis();
    [dom.modalSpaghetti, dom.modalLaser, dom.modalCompare, dom.modalNasa].forEach(modal => {
        if (modal && !modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    });
});
