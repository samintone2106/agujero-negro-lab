// Encuadre: cerca fija y lejos según el tamaño de lo que hay que ver (anillos, discos, haces).
const FRAME_NEAR = 3.4;
const FRAME_FAR = { saturn: 23, gargantua: 30, pulsar: 26, uranus: 15, neptune: 14, jupiter: 15, io: 16, europa: 16, titan: 18, pluto: 14, earth: 13 };
function frameFarFor(id) { return FRAME_FAR[id] || 11.5; }

function switchTarget(targetId) {
    if (typeof genesis !== 'undefined' && genesis.active) stopGenesis();
    state.currentTarget = targetId;
    state.spaghettiPreset = targetId;
    const cfg = ASTRO_TARGETS[targetId];

    Object.keys(targetGroups).forEach(k => {
        targetGroups[k].visible = (k === targetId);
    });

    document.querySelectorAll('.target-btn').forEach(btn => {
        const isSelected = btn.getAttribute('data-target') === targetId;
        if (isSelected) {
            btn.className = 'target-btn shrink-0 w-auto md:w-full text-left px-2.5 md:px-2 py-1.5 md:py-1 rounded-lg font-mono text-[10px] sm:text-[11px] font-bold transition-all duration-200 border border-singularity-cyan bg-singularity-cyan/20 text-singularity-cyan glow-cyan flex items-center gap-2';
        } else {
            btn.className = 'target-btn shrink-0 w-auto md:w-full text-left px-2.5 md:px-2 py-1.5 md:py-1 rounded-lg font-mono text-[10px] sm:text-[11px] font-bold transition-all duration-200 border border-transparent text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2';
        }
    });

    dom.targetLockText.textContent = cfg.lockTitle;
    dom.rsRealBadge.textContent = cfg.rsRealText;
    dom.soundscapeReadout.textContent = cfg.soundscapeName;
    dom.unitDistLabel.textContent = cfg.unitLabel;
    dom.gravityMetricLabel.textContent = cfg.gravityLabel;
    dom.comparisonPill.textContent = cfg.comparisonPill;

    dom.m1Val.textContent = cfg.milestones[0].val; dom.m1Lbl.textContent = cfg.milestones[0].lbl;
    dom.m2Val.textContent = cfg.milestones[1].val; dom.m2Lbl.textContent = cfg.milestones[1].lbl;
    dom.m3Val.textContent = cfg.milestones[2].val; dom.m3Lbl.textContent = cfg.milestones[2].lbl;
    dom.m4Val.textContent = cfg.milestones[3].val; dom.m4Lbl.textContent = cfg.milestones[3].lbl;

    audioEngine.switchTargetSoundscape(targetId);
    updateRelativityTelemetry(state.descentPercent);
    fetchNasaMissionTelemetry(targetId);
    if (typeof syncLensPanel === 'function') syncLensPanel();
    if (typeof syncPulsarPanel === 'function') syncPulsarPanel();
    if (typeof syncLandButton === 'function') syncLandButton();
    if (typeof clearMoonFocus === 'function') clearMoonFocus();
    const surfaceNote = document.getElementById('surface-note');
    if (surfaceNote) surfaceNote.hidden = true;
}

function updateRelativityTelemetry(percentage) {
    state.descentPercent = parseFloat(percentage);
    dom.descentPercentage.textContent = `${state.descentPercent.toFixed(0)}%`;
    const miniSlider = document.getElementById('mini-descent-slider');
    const miniPct = document.getElementById('mini-descent-percentage');
    if (miniSlider) miniSlider.value = state.descentPercent;
    if (miniPct) miniPct.textContent = `${state.descentPercent.toFixed(0)}%`;

    const t = state.currentTarget;
    const cfg = ASTRO_TARGETS[t];
    const prox = state.descentPercent / 100;

    if (t === 'gargantua') {
        state.rs = 15.0 - prox * 13.95;
        const kerrFactor = Math.max(0.001, 1 - 1.048 / state.rs);
        const rawSchwarzschild = Math.max(0.001, 1 - 2.0 / state.rs);
        state.gamma = state.rs > 2.05 ? 1 / Math.sqrt(rawSchwarzschild) : 1 / Math.sqrt(kerrFactor * 0.04);
        state.redshift = state.gamma - 1;
        state.tidalForce = (10 / Math.pow(state.rs, 3)) * 0.5;
        sharedUniforms.uRedshiftFactor.value = Math.min(1.5, state.redshift / 8);

        dom.metricRs.innerHTML = `${state.rs.toFixed(2)} <span class="text-xs font-normal text-slate-400">r_s</span>`;
        dom.metricGamma.innerHTML = `${state.gamma.toFixed(3)} <span class="text-xs font-normal text-slate-400">x</span>`;
        dom.metricRedshift.innerHTML = `${state.redshift.toFixed(3)} <span class="text-xs font-normal text-slate-400">z</span>`;
        dom.metricTidal.innerHTML = `${state.tidalForce.toFixed(3)} <span class="text-xs font-normal text-slate-400">G/m</span>`;
        dom.timeOffsetReadout.textContent = state.gamma > 10
            ? `+${(state.gamma * 0.8).toFixed(1)} años por hora`
            : `+${((state.gamma - 1) * 24).toFixed(1)} horas por día`;
        dom.dopplerMarker.style.marginLeft = `${Math.min(96, 2 + state.descentPercent * 0.94)}%`;
        const wavelengthNm = Math.round(450 * (1 + Math.min(2.2, state.redshift * 0.35)));
        dom.dopplerStatus.textContent = `${wavelengthNm} nm (${state.rs < 2.2 ? 'INFRARROJO' : 'ROJO-ÁMBAR'})`;
        dom.velocityReadout.textContent = `v = ${Math.min(0.999, Math.sqrt(1 / state.rs) * 1.02).toFixed(3)} c`;

    } else if (t === 'pulsar') {
        state.rs = 15.0 - prox * 12.6;
        state.gamma = 1 / Math.sqrt(Math.max(0.01, 1 - 1.0 / state.rs));
        state.redshift = state.gamma - 1;
        state.tidalForce = (1800 / Math.pow(state.rs, 3));

        dom.metricRs.innerHTML = `${state.rs.toFixed(2)} <span class="text-xs font-normal text-slate-400">r_s</span>`;
        dom.metricGamma.innerHTML = `${state.gamma.toFixed(3)} <span class="text-xs font-normal text-slate-400">x</span>`;
        dom.metricRedshift.innerHTML = `${state.redshift.toFixed(3)} <span class="text-xs font-normal text-slate-400">z</span>`;
        dom.metricTidal.innerHTML = `${state.tidalForce.toFixed(1)}k <span class="text-xs font-normal text-slate-400">G/m</span>`;
        dom.timeOffsetReadout.textContent = `+${((state.gamma - 1) * 24).toFixed(1)} horas por día`;
        dom.dopplerMarker.style.marginLeft = `${Math.min(55, 5 + state.descentPercent * 0.45)}%`;
        dom.dopplerStatus.textContent = `${Math.round(450 * state.gamma)} nm (VERDE-ÁMBAR)`;
        dom.velocityReadout.textContent = `v = ${(0.48 / Math.sqrt(state.rs / 2.4)).toFixed(2)} c`;

    } else {
        state.rs = 15.0 - prox * 13.95;
        const localZ = cfg.baseZ / (state.rs / 1.05);
        state.redshift = localZ;
        state.gamma = 1 + localZ;
        state.tidalForce = cfg.surfaceG / Math.pow(state.rs / 1.05, 2);

        dom.metricRs.innerHTML = `${state.rs.toFixed(2)} <span class="text-xs font-normal text-slate-400">${cfg.unitLabel}</span>`;
        dom.metricGamma.innerHTML = t === 'sun'
            ? `1.0000021 <span class="text-[10px] font-normal text-slate-400">x</span>`
            : `1.000000001 <span class="text-[10px] font-normal text-slate-400">x</span>`;
        dom.metricRedshift.innerHTML = `${localZ.toExponential(1)} <span class="text-[10px] font-normal text-slate-400">z</span>`;
        dom.metricTidal.innerHTML = `${state.tidalForce.toFixed(2)} <span class="text-xs font-normal text-slate-400">G</span>`;
        dom.timeOffsetReadout.textContent = cfg.timeDriftText;
        dom.dopplerMarker.style.marginLeft = t === 'sun' ? `12%` : `3%`;
        dom.dopplerStatus.textContent = `450.0 nm (LUZ INTACTA)`;
        const orbVel = (Math.sqrt(cfg.surfaceG * 9.81) * 7.9 / Math.sqrt(state.rs)).toFixed(1);
        dom.velocityReadout.textContent = `v = ${orbVel} km/s`;
    }

    // distancia lejana por astro: el astro llena ~40 % de la pantalla al 0 % del propulsor
    const far = frameFarFor(t);
    const targetZ = FRAME_NEAR + (1 - prox) * (far - FRAME_NEAR);
    sharedUniforms.uCameraDist.value = targetZ;

    const bottomHudDeck = document.getElementById('bottom-hud-deck');
    const isHudCollapsed = bottomHudDeck && bottomHudDeck.classList.contains('hidden');
    const portraitLift = window.innerWidth < window.innerHeight ? -0.2 * targetZ : 0.0;
    const yOffsetTarget = isHudCollapsed ? 0.0 : (-1.05 + portraitLift + prox * 0.45);
    controls.target.set(0, yOffsetTarget, 0);

    const offset = camera.position.clone().sub(controls.target);
    if (offset.lengthSq() < 0.001) offset.set(0, 3.2, 28);

    if (t === 'saturn' && state.ringSkimMode) {
        camera.position.set(2.4, 0.38, targetZ);
    } else if (state.ringSkimMode && (t === 'uranus' || t === 'neptune')) {
        camera.position.set(1.5, 0.35, targetZ);
    } else {
        offset.normalize().multiplyScalar(targetZ);
        offset.y = far * 0.14 * (1 - prox * 0.45);
        camera.position.copy(controls.target).add(offset);
    }
    controls.update();

    const closeupCard = document.getElementById('closeup-real-card');
    if (closeupCard) {
        if (state.descentPercent >= 72) {
            closeupCard.classList.remove('hidden');
        } else {
            closeupCard.classList.add('hidden');
        }
    }

    updateNarrativeAndAlarms();
    updateSpaghettificationSimulation();
    updateLaserModalReadouts();
    audioEngine.updateByTelemetry(state.rs);
}

function updateNarrativeAndAlarms() {
    const t = state.currentTarget;
    const cfg = ASTRO_TARGETS[t];
    const rs = state.rs;

    const isCritical = (t === 'gargantua' && rs < 2.2) || (t === 'pulsar' && rs < 2.8) || (t === 'sun' && rs < 1.8);
    const isWarning = (t === 'gargantua' && rs < 6.0) || (t === 'pulsar' && rs < 6.0) || (t === 'sun' && rs < 5.0);

    if (isCritical) {
        dom.alarmOverlay.classList.add('alarm-active');
        dom.statusPanel.className = 'glass-hud-crimson rounded-xl px-2.5 py-1.5 flex items-center gap-2.5 transition-all duration-300';
        dom.telemetryPanel.className = 'order-3 lg:order-none lg:col-span-4 glass-hud-crimson rounded-xl p-2 transition-all duration-300 flex flex-col justify-between';
        dom.storyCard.className = 'order-1 lg:order-none lg:col-span-5 glass-hud-crimson rounded-xl p-2 sm:p-2.5 flex flex-col justify-between transition-all duration-300';
        dom.systemBadge.textContent = t === 'sun' ? 'ALERTA TÉRMICA: 28G' : 'ALERTA: LÍMITE RELATIVISTA';
        dom.systemBadge.className = 'text-[11px] font-mono font-bold text-singularity-crimson glow-crimson tracking-wide';
    } else if (isWarning) {
        dom.alarmOverlay.classList.remove('alarm-active');
        dom.statusPanel.className = 'glass-hud-amber rounded-xl px-2.5 py-1.5 flex items-center gap-2.5 transition-all duration-300';
        dom.telemetryPanel.className = 'order-3 lg:order-none lg:col-span-4 glass-hud-amber rounded-xl p-2 transition-all duration-300 flex flex-col justify-between';
        dom.storyCard.className = 'order-1 lg:order-none lg:col-span-5 glass-hud-amber rounded-xl p-2 sm:p-2.5 flex flex-col justify-between transition-all duration-300';
        dom.systemBadge.textContent = 'PRECAUCIÓN: CAMPO INTENSO';
        dom.systemBadge.className = 'text-[11px] font-mono font-bold text-singularity-amber glow-amber tracking-wide';
    } else {
        dom.alarmOverlay.classList.remove('alarm-active');
        dom.statusPanel.className = 'glass-hud rounded-xl px-2.5 py-1.5 flex items-center gap-2.5 transition-all duration-300';
        dom.telemetryPanel.className = 'order-3 lg:order-none lg:col-span-4 glass-hud rounded-xl p-2 transition-all duration-300 flex flex-col justify-between';
        dom.storyCard.className = 'order-1 lg:order-none lg:col-span-5 glass-hud rounded-xl p-2 sm:p-2.5 flex flex-col justify-between transition-all duration-300';
        dom.systemBadge.textContent = 'SISTEMAS NOMINALES';
        dom.systemBadge.className = 'text-[11px] font-mono font-bold text-singularity-cyan glow-cyan tracking-wide';
    }

    const stageIdx = state.descentPercent < 38 ? 0 : (state.descentPercent < 78 ? 1 : 2);
    const story = cfg.stories[stageIdx];
    if (story) {
        dom.zoneBadge.textContent = story[0];
        dom.storyTitle.textContent = story[1];
        dom.storyDesc.textContent = story[2];
    }
}

function updateSpaghettificationSimulation() {
    if (!dom.astronautWrapper) return;
    const preset = state.spaghettiPreset || state.currentTarget;
    const cfg = ASTRO_TARGETS[preset] || ASTRO_TARGETS.saturn;
    const massLog = parseFloat(dom.bhMassSlider?.value || 6.6);
    const solarMasses = Math.pow(10, massLog);

    document.querySelectorAll('.spaghetti-preset-btn').forEach(btn => {
        const isSelected = btn.getAttribute('data-spaghetti-preset') === preset;
        if (isSelected) {
            btn.className = 'spaghetti-preset-btn px-1.5 py-1 rounded bg-singularity-amber/25 font-mono text-[9px] font-bold text-singularity-amber border border-singularity-amber shadow-[0_0_10px_rgba(255,170,0,0.35)] truncate';
        } else {
            btn.className = 'spaghetti-preset-btn px-1.5 py-1 rounded bg-white/5 hover:bg-white/10 font-mono text-[9px] text-slate-300 border border-white/10 truncate';
        }
    });

    const bhBox = document.getElementById('bh-mass-control-box');
    if (bhBox) {
        bhBox.style.opacity = (preset === 'gargantua' || preset === 'pulsar') ? '1' : '0.45';
    }

    if (dom.bhMassLabel) {
        dom.bhMassLabel.textContent = solarMasses >= 1000
            ? `${(solarMasses / 1e6).toFixed(2)} × 10⁶ M☉`
            : `${solarMasses.toFixed(0)} M☉`;
    }

    const astroNameEl = document.getElementById('spaghetti-astro-name');
    const weightEquivEl = document.getElementById('spaghetti-weight-equiv');
    const bioDescEl = document.getElementById('spaghetti-bio-desc');
    const surfGEl = document.getElementById('spaghetti-surf-g');
    const astroSvg = document.getElementById('astronaut-svg');
    const floorLine = document.getElementById('spaghetti-floor-line');
    const armL = document.getElementById('astro-arm-l');
    const armR = document.getElementById('astro-arm-r');

    if (astroNameEl) astroNameEl.textContent = `ASTRO: ${cfg.name.split(' ')[0]}`;

    if (preset === 'gargantua' || preset === 'pulsar') {
        const effectiveRs = (state.currentTarget === preset) ? state.rs : 2.1;
        const tidalFactor = (preset === 'pulsar')
            ? (165 / Math.pow(effectiveRs, 3))
            : (620 / (Math.pow(effectiveRs, 3) * Math.pow(solarMasses / 100, 0.32)));

        const stretchY = Math.min(2.45, 1.18 + tidalFactor * 0.55);
        const compressX = Math.max(0.28, 1 / Math.sqrt(stretchY * 1.15));
        dom.astronautWrapper.style.transform = `translateY(0px) scale(${compressX.toFixed(2)}, ${stretchY.toFixed(2)})`;

        if (armL && armR) {
            armL.setAttribute('x2', '21'); armL.setAttribute('y2', '74');
            armR.setAttribute('x2', '59'); armR.setAttribute('y2', '74');
        }
        if (astroSvg) astroSvg.setAttribute('class', 'w-20 h-32 text-singularity-crimson transition-colors duration-300');
        if (floorLine) floorLine.className = 'w-24 h-1 rounded-full bg-singularity-crimson/70 shadow-[0_0_15px_#ff0055] transition-all duration-300';

        if (weightEquivEl) weightEquivEl.textContent = preset === 'pulsar' ? 'Peso: ~1.4×10¹³ kg (Marea Letal)' : 'Tensión Axial Extrema (ΔG)';
        if (surfGEl) surfGEl.textContent = preset === 'pulsar' ? '2.0×10¹¹ G' : 'Tiende a ∞';
        if (dom.spaghettiRs) dom.spaghettiRs.textContent = `${effectiveRs.toFixed(2)} r_s`;
        if (dom.spaghettiDeltag) dom.spaghettiDeltag.textContent = `${(tidalFactor * 18.5).toFixed(1)} G/m (Estiramiento)`;
        if (dom.spaghettiStatusTag) {
            dom.spaghettiStatusTag.textContent = stretchY > 1.4
                ? 'ALERTA CRÍTICA: ESPAGUETIFICACIÓN CELULAR'
                : 'TENSIÓN DE MAREA RELATIVISTA ACTIVA';
            dom.spaghettiStatusTag.className = 'mt-1.5 px-2.5 py-0.5 rounded bg-singularity-crimson/20 font-mono text-[9px] text-singularity-crimson border border-singularity-crimson/50';
        }
        if (bioDescEl) {
            bioDescEl.textContent = preset === 'pulsar'
                ? 'En el Púlsar (1.4 masas solares en 10 km), tus pies están notablemente más cerca del núcleo que tu cabeza: la diferencia gravitatoria (Δg) te estira verticalmente y te comprime lateralmente.'
                : 'En un Agujero Negro hay estiramiento vertical por marea (Δg). Usa el deslizador de masa abajo para comprobar cómo un agujero negro pequeño te espaguetifica mucho más que uno supermasivo.';
        }
    } else {
        const g = cfg.surfaceG;
        const weight70 = (70 * g).toFixed(1);
        if (weightEquivEl) weightEquivEl.textContent = `Persona de 70 kg pesa: ${weight70} kg`;
        if (surfGEl) surfGEl.textContent = `${g.toFixed(2)} G`;
        if (dom.spaghettiRs) dom.spaghettiRs.textContent = `${state.rs.toFixed(2)} ${cfg.unitLabel}`;

        const microTidal = (2 * g / (parseFloat(cfg.realRadiusText.replace(/,/g, '')) * 1000)).toExponential(1);
        if (dom.spaghettiDeltag) dom.spaghettiDeltag.textContent = `${microTidal} G/m (Nulo)`;

        let scaleX = 1.0, scaleY = 1.0, translateY = 0;

        if (g < 0.5) {
            translateY = -14 + g * 20;
            scaleX = 0.98;
            scaleY = 1.04;
            if (armL && armR) {
                armL.setAttribute('x2', '10'); armL.setAttribute('y2', '34');
                armR.setAttribute('x2', '70'); armR.setAttribute('y2', '34');
            }
            if (astroSvg) astroSvg.setAttribute('class', 'w-20 h-32 text-singularity-cyan transition-colors duration-300');
            if (floorLine) floorLine.className = 'w-32 h-1 rounded-full bg-singularity-cyan/30 transition-all duration-300';
            if (dom.spaghettiStatusTag) {
                dom.spaghettiStatusTag.textContent = `FLOTACIÓN LIGERA (${g} G · SIN ESPAGUETIFICACIÓN)`;
                dom.spaghettiStatusTag.className = 'mt-1.5 px-2.5 py-0.5 rounded bg-singularity-cyan/15 font-mono text-[9px] text-singularity-cyan border border-singularity-cyan/40';
            }
            if (bioDescEl) {
                bioDescEl.textContent = `En ${cfg.name.split(' ')[0]} (${g} G), pesas mucho menos que en la Tierra (${weight70} kg). Tu columna vertebral se descomprime ligeramente y flotas al saltar, con cero espaguetificación.`;
            }
        } else if (g <= 1.25) {
            translateY = (g - 1.0) * 12;
            scaleY = 1.0 - (g - 1.0) * 0.08;
            scaleX = 1.0 + (g - 1.0) * 0.05;
            if (armL && armR) {
                armL.setAttribute('x2', '14'); armL.setAttribute('y2', '64');
                armR.setAttribute('x2', '66'); armR.setAttribute('y2', '64');
            }
            if (astroSvg) astroSvg.setAttribute('class', 'w-20 h-32 text-emerald-400 transition-colors duration-300');
            if (floorLine) floorLine.className = 'w-40 h-1 rounded-full bg-emerald-400/60 shadow-[0_0_10px_#10b981] transition-all duration-300';
            if (dom.spaghettiStatusTag) {
                dom.spaghettiStatusTag.textContent = `GRAVEDAD HUMANA TOLERABLE (${g} G UNIFORME)`;
                dom.spaghettiStatusTag.className = 'mt-1.5 px-2.5 py-0.5 rounded bg-emerald-500/15 font-mono text-[9px] text-emerald-300 border border-emerald-400/40';
            }
            if (bioDescEl) {
                bioDescEl.textContent = `En ${cfg.name.split(' ')[0]} la gravedad superficial es de ${g} G (una persona de 70 kg siente ${weight70} kg). La fuerza tira por igual de cabeza y pies, manteniendo tu anatomía intacta.`;
            }
        } else if (g < 5.0) {
            translateY = 14;
            scaleY = 0.76;
            scaleX = 1.22;
            if (armL && armR) {
                armL.setAttribute('x2', '20'); armL.setAttribute('y2', '74');
                armR.setAttribute('x2', '60'); armR.setAttribute('y2', '74');
            }
            if (astroSvg) astroSvg.setAttribute('class', 'w-20 h-32 text-singularity-amber transition-colors duration-300');
            if (floorLine) floorLine.className = 'w-52 h-1.5 rounded-full bg-singularity-amber shadow-[0_0_14px_#ffaa00] transition-all duration-300';
            if (dom.spaghettiStatusTag) {
                dom.spaghettiStatusTag.textContent = `COMPRESIÓN PESADA CONTRA EL SUELO (${g} G)`;
                dom.spaghettiStatusTag.className = 'mt-1.5 px-2.5 py-0.5 rounded bg-singularity-amber/20 font-mono text-[9px] text-singularity-amber border border-singularity-amber/50';
            }
            if (bioDescEl) {
                bioDescEl.textContent = `En Júpiter (${g} G), tu cuerpo pesa ${weight70} kg. En vez de estirarte como un agujero negro, la gravedad uniforme te aplasta hacia abajo dificultando caminar y bombear sangre al cerebro.`;
            }
        } else {
            translateY = 24;
            scaleY = 0.46;
            scaleX = 1.52;
            if (armL && armR) {
                armL.setAttribute('x2', '22'); armL.setAttribute('y2', '76');
                armR.setAttribute('x2', '58'); armR.setAttribute('y2', '76');
            }
            if (astroSvg) astroSvg.setAttribute('class', 'w-20 h-32 text-orange-500 transition-colors duration-300');
            if (floorLine) floorLine.className = 'w-60 h-2 rounded-full bg-orange-500 shadow-[0_0_18px_#f97316] transition-all duration-300';
            if (dom.spaghettiStatusTag) {
                dom.spaghettiStatusTag.textContent = `APLASTAMIENTO GRAVITATORIO SOLAR (${g} G)`;
                dom.spaghettiStatusTag.className = 'mt-1.5 px-2.5 py-0.5 rounded bg-orange-500/20 font-mono text-[9px] text-orange-300 border border-orange-500/50';
            }
            if (bioDescEl) {
                bioDescEl.textContent = `En la fotosfera del Sol (${g} G), una persona de 70 kg pesa ${weight70} kg (casi 2 toneladas). Es el efecto opuesto a la espaguetificación: la gravedad uniforme te aplasta contra la superficie.`;
            }
        }

        dom.astronautWrapper.style.transform = `translateY(${translateY.toFixed(1)}px) scale(${scaleX.toFixed(2)}, ${scaleY.toFixed(2)})`;
    }
}

function updateLaserModalReadouts() {
    const cfg = ASTRO_TARGETS[state.currentTarget];
    if (dom.laserSubtitle) dom.laserSubtitle.textContent = `EMISOR EN ${cfg.name.split(' ')[0]} ➔ TIERRA`;
    if (dom.laserRs) dom.laserRs.textContent = `${state.rs.toFixed(2)} ${cfg.unitLabel}`;
    if (dom.laserZ) {
        dom.laserZ.textContent = state.redshift < 0.001
            ? state.redshift.toExponential(2)
            : state.redshift.toFixed(3);
    }
    const energyPct = Math.max(1, Math.min(100, (1 / state.gamma) * 100));
    if (dom.laserFreq) dom.laserFreq.textContent = `${energyPct.toFixed(1)}%`;
}

const laserCanvas = document.getElementById('redshift-canvas');
const laserCtx = laserCanvas ? laserCanvas.getContext('2d') : null;
let wavePhase = 0;

function renderRedshiftWave() {
    if (!laserCtx || !laserCanvas) return;
    const w = laserCanvas.width;
    const h = laserCanvas.height;
    laserCtx.clearRect(0, 0, w, h);

    wavePhase += 0.14;
    const stretch = Math.min(5.5, 1 + state.redshift * 1.4);

    laserCtx.lineWidth = 2.5;
    const grad = laserCtx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, '#00f0ff');
    grad.addColorStop(0.5, stretch > 1.3 ? '#ffaa00' : '#00f0ff');
    grad.addColorStop(1, stretch > 1.8 ? '#ff0055' : (stretch > 1.15 ? '#ffaa00' : '#00f0ff'));
    laserCtx.strokeStyle = grad;

    laserCtx.beginPath();
    for (let x = 0; x < w; x++) {
        const progress = x / w;
        const localFreq = 0.085 / (1 + progress * (stretch - 1));
        const y = h / 2 + Math.sin(x * localFreq - wavePhase) * (h * 0.34);
        if (x === 0) laserCtx.moveTo(x, y);
        else laserCtx.lineTo(x, y);
    }
    laserCtx.stroke();

    if (state.pingWaveProgress >= 0) {
        const px = state.pingWaveProgress * w;
        laserCtx.fillStyle = '#ffffff';
        laserCtx.beginPath();
        laserCtx.arc(px, h / 2, 5, 0, Math.PI * 2);
        laserCtx.fill();
        state.pingWaveProgress += 0.025;
        if (state.pingWaveProgress > 1) state.pingWaveProgress = -1;
    }
}
