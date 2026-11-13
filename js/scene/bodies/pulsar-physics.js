/* -------------------------------------------------------------------------- */
/* PÚLSAR VELA: FARO GIRATORIO CON CAMPO MAGNÉTICO, PULSOS Y GLITCHES          */
/* -------------------------------------------------------------------------- */
// Datos reales del púlsar de Vela (PSR B0833-45 / J0835-4510):
// periodo 89.3 ms (11.19 vueltas por segundo), Ṗ ≈ 1.25×10⁻¹³ s/s, campo dipolar
// ≈ 3.4×10¹² G, distancia ≈ 950 años luz, edad característica ≈ 11,000 años.
// La geometría del haz se ha estimado en α ≈ 70° (eje magnético vs. eje de giro)
// y ζ ≈ 64° (línea de visión): por eso el haz nos barre una vez por vuelta.
const VELA = {
    freq: 11.19, alpha: THREE.MathUtils.degToRad(70), zeta: THREE.MathUtils.degToRad(64),
    beamHalf: THREE.MathUtils.degToRad(11), slow: 40
};

// El eje magnético es el de los haces existentes (pulsarJetAxis): se inclina α.
pulsarJetAxis.rotation.set(0, 0, VELA.alpha);
pulsarLensRing.visible = false;

// Haces con brillo que se desvanece a lo largo y hacia los bordes.
const beamMat = new THREE.ShaderMaterial({
    uniforms: { uFlash: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
        uniform float uFlash;
        varying vec2 vUv;
        void main() {
            float along = 1.0 - vUv.y;               // 1 en la estrella, 0 en la punta
            float edge = sin(vUv.x * 3.14159 * 2.0 * 8.0) * 0.06 + 0.94;
            float a = pow(along, 1.6) * edge * (0.35 + uFlash * 0.65);
            gl_FragColor = vec4(mix(vec3(0.45, 0.95, 1.0), vec3(1.0), uFlash * 0.6), a);
        }
    `,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
});
[northJet, southJet].forEach(j => {
    j.geometry.dispose();
    j.geometry = new THREE.ConeGeometry(Math.tan(VELA.beamHalf) * 16, 16, 40, 1, true);
    j.material = beamMat;
});
northJet.position.y = 8; southJet.position.y = -8;

// Líneas de campo dipolar (r = L·sen²θ medido desde el eje magnético).
const fieldMat = new THREE.LineBasicMaterial({ color: 0x7df9ff, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false });
const openFieldMat = new THREE.LineBasicMaterial({ color: 0xffb36b, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false });
(() => {
    const R = 1.15;
    const addLine = (L, phi, mat, maxR) => {
        const pts = [];
        const th0 = Math.asin(Math.min(1, Math.sqrt(R / L)));
        for (let i = 0; i <= 80; i++) {
            const th = th0 + (Math.PI - 2 * th0) * (i / 80);
            const r = L * Math.sin(th) ** 2;
            if (r > maxR) continue;
            pts.push(new THREE.Vector3(r * Math.sin(th) * Math.cos(phi), r * Math.cos(th), r * Math.sin(th) * Math.sin(phi)));
        }
        if (pts.length > 1) pulsarJetAxis.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    };
    for (let k = 0; k < 6; k++) {
        const phi = (k / 6) * Math.PI * 2;
        [2.0, 3.0, 4.4].forEach(L => addLine(L, phi, fieldMat, 99));
        // líneas abiertas: salen por los polos y no vuelven (cruzan el cilindro de luz)
        [40, 90].forEach(L => addLine(L, phi + 0.2, openFieldMat, 11));
    }
})();

// Cilindro de luz: donde el campo tendría que girar a la velocidad de la luz.
// Real: c/Ω ≈ 4,270 km frente a ~10 km de radio (427 veces). Aquí va a escala reducida.
const lightCylinder = new THREE.Group();
(() => {
    const mat = new THREE.LineBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.16, depthWrite: false });
    const R = 10, H = 12;
    [-H, 0, H].forEach(y => {
        const pts = Array.from({ length: 97 }, (_, i) => new THREE.Vector3(Math.cos(i / 96 * Math.PI * 2) * R, y, Math.sin(i / 96 * Math.PI * 2) * R));
        lightCylinder.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat));
    });
    for (let i = 0; i < 16; i++) {
        const a = i / 16 * Math.PI * 2;
        lightCylinder.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(Math.cos(a) * R, -H, Math.sin(a) * R), new THREE.Vector3(Math.cos(a) * R, H, Math.sin(a) * R)
        ]), mat));
    }
})();
targetGroups.pulsar.add(lightCylinder);

// Nebulosa de viento del púlsar: el toro ecuatorial y los arcos que fotografió Chandra.
const pwnMat = new THREE.ShaderMaterial({
    uniforms: { uTime: sharedUniforms.uTime },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
        uniform float uTime;
        varying vec2 vUv;
        void main() {
            float r = vUv.y;
            float band = exp(-pow((r - 0.55) / 0.18, 2.0));
            float ripple = 0.75 + 0.25 * sin(r * 40.0 - uTime * 2.0);
            gl_FragColor = vec4(vec3(0.55, 0.75, 1.0), band * ripple * 0.22);
        }
    `,
    transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
});
const pwnTorus = new THREE.Mesh(new THREE.RingGeometry(4.5, 8.5, 96, 8), pwnMat);
pwnTorus.rotation.x = -Math.PI / 2;
targetGroups.pulsar.add(pwnTorus);

// Dirección de la Tierra (línea de visión, ζ desde el eje de giro) con su marcador.
const pulsarObserver = new THREE.Vector3(0, Math.cos(VELA.zeta), Math.sin(VELA.zeta)).normalize();
const observerArrow = new THREE.ArrowHelper(pulsarObserver, new THREE.Vector3(), 13, 0x34d399, 0.8, 0.45);
observerArrow.line.material.transparent = true; observerArrow.line.material.opacity = 0.5;
targetGroups.pulsar.add(observerArrow);
const spinAxisLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -12, 0), new THREE.Vector3(0, 12, 0)]),
    new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.4, gapSize: 0.3, transparent: true, opacity: 0.35 }));
spinAxisLine.computeLineDistances();
targetGroups.pulsar.add(spinAxisLine);

/* ------------------------------ simulación ------------------------------ */
const pulsarSim = { phase: 0, realTime: false, glitch: 0, lastPulse: 0, inPulse: false, history: new Float32Array(240), head: 0 };
const pulsarTmp = new THREE.Vector3();

function pulsarAngularSpeed() {
    const base = Math.PI * 2 * VELA.freq / (pulsarSim.realTime ? 1 : VELA.slow);
    return base * (1 + pulsarSim.glitch);
}

function pulsarClick(strength) {
    if (!audioEngine.isPlaying || !audioEngine.ctx) return;
    const ctx = audioEngine.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(300, t + 0.03);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35 * strength, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    o.connect(g); g.connect(audioEngine.output()); o.start(t); o.stop(t + 0.06);
}

function updatePulsar(dt, time) {
    pulsarSim.phase += pulsarAngularSpeed() * dt;
    pulsarSim.glitch *= Math.exp(-dt / 5); // se recupera en segundos (en el real, días a semanas)
    pulsarJetAxis.rotation.y = pulsarSim.phase;
    pulsarCrust.rotation.y = pulsarSim.phase;
    pulsarJetAxis.updateMatrixWorld();

    // intensidad recibida: qué tan cerca pasa cada polo de nuestra línea de visión
    pulsarTmp.set(0, 1, 0).applyQuaternion(pulsarJetAxis.quaternion);
    const angN = pulsarTmp.angleTo(pulsarObserver);
    const angS = Math.PI - angN;
    const w = VELA.beamHalf;
    const I = Math.exp(-((angN / w) ** 2)) + 0.25 * Math.exp(-((angS / w) ** 2));
    beamMat.uniforms.uFlash.value = Math.min(1, I);
    pulsarGlow.material.opacity = 0.45 + Math.min(1, I) * 0.55;
    pulsarGlow.scale.setScalar(9 + I * 6);

    const pulsing = I > 0.5;
    if (pulsing && !pulsarSim.inPulse) pulsarClick(Math.min(1, I));
    pulsarSim.inPulse = pulsing;

    // historial para el gráfico (como lo registra un radiotelescopio)
    pulsarSim.history[pulsarSim.head] = I;
    pulsarSim.head = (pulsarSim.head + 1) % pulsarSim.history.length;
    drawPulseGraph();
}

const pulseCanvas = document.getElementById('pulse-graph');
const pulseCtx = pulseCanvas ? pulseCanvas.getContext('2d') : null;
function drawPulseGraph() {
    if (!pulseCtx || document.getElementById('pulsar-panel').hidden) return;
    const W = pulseCanvas.width, H = pulseCanvas.height, n = pulsarSim.history.length;
    pulseCtx.clearRect(0, 0, W, H);
    pulseCtx.strokeStyle = 'rgba(125, 249, 255, 0.15)';
    pulseCtx.beginPath(); pulseCtx.moveTo(0, H - 6); pulseCtx.lineTo(W, H - 6); pulseCtx.stroke();
    pulseCtx.strokeStyle = '#7df9ff'; pulseCtx.lineWidth = 1.5;
    pulseCtx.beginPath();
    for (let i = 0; i < n; i++) {
        const v = pulsarSim.history[(pulsarSim.head + i) % n];
        const x = (i / (n - 1)) * W, y = H - 6 - Math.min(1.2, v) * (H - 12);
        i ? pulseCtx.lineTo(x, y) : pulseCtx.moveTo(x, y);
    }
    pulseCtx.stroke();
}

/* ------------------------------ panel ------------------------------ */
(() => {
    const speedBtn = document.getElementById('pulsar-speed');
    const glitchBtn = document.getElementById('pulsar-glitch');
    const note = document.getElementById('pulsar-note');
    const sync = () => {
        speedBtn.textContent = pulsarSim.realTime ? 'TIEMPO REAL · 11.19/s' : 'CÁMARA LENTA ×1/40';
        speedBtn.setAttribute('aria-pressed', String(pulsarSim.realTime));
    };
    speedBtn?.addEventListener('click', () => { audioEngine.playClickTone(760, 0.04); pulsarSim.realTime = !pulsarSim.realTime; sync(); });
    glitchBtn?.addEventListener('click', () => {
        pulsarSim.glitch = 0.35;
        note.textContent = 'Glitch: la corteza se reacomoda y el giro se acelera de golpe. En Vela el salto real es de ~2 partes por millón y ocurre cada ~2.5 años; aquí está exagerado para verlo.';
        audioEngine.playClickTone(1400, 0.08);
    });
    sync();
})();

function syncPulsarPanel() {
    const panel = document.getElementById('pulsar-panel');
    if (panel) panel.hidden = state.currentTarget !== 'pulsar';
}
