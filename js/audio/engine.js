/* -------------------------------------------------------------------------- */
/* PROCEDURAL WEB AUDIO SYNTHESIZER (12 DISTINCT ACOUSTIC SIGNATURES)         */
/* -------------------------------------------------------------------------- */
class SpatialAudioEngine {
    constructor() {
        this.ctx = null;
        this.isPlaying = false;
        this.activeNodes = [];
        this.timers = [];
        this.primaryOsc = null;
        this.secondaryOsc = null;
        this.mainFilter = null;
        this.noiseFilter = null;
        this.noiseGain = null;
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }

    toggle() {
        this.init();
        if (this.isPlaying) {
            this.stopAll();
            return false;
        } else {
            this.isPlaying = true;
            this.switchTargetSoundscape(state.currentTarget);
            return true;
        }
    }

    clearCurrentNodes() {
        this.timers.forEach(t => clearTimeout(t));
        this.timers = [];
        this.activeNodes.forEach(node => {
            try {
                if (node.stop) node.stop();
                if (node.disconnect) node.disconnect();
            } catch (e) {}
        });
        this.activeNodes = [];
        this.primaryOsc = null;
        this.secondaryOsc = null;
        this.mainFilter = null;
        this.noiseFilter = null;
        this.noiseGain = null;
    }

    synthBus() {
        if (!this.bus) {
            this.bus = this.ctx.createGain();
            this.bus.gain.value = 1.0;
            this.bus.connect(this.ctx.destination);
        }
        return this.bus;
    }

    // Real mission recordings / sonifications (assets/audio/<id>.mp3).
    // They play through a low-pass that opens as you approach, and their
    // playback rate follows gravitational time dilation (1/γ).
    playRecording(targetId) {
        const prev = this.recording;
        if (prev) {
            const t = this.ctx.currentTime;
            if (prev.gain) {
                prev.gain.gain.cancelScheduledValues(t);
                prev.gain.gain.setTargetAtTime(0, t, 0.25);
            } else {
                prev.el.volume = 0;
            }
            const el = prev.el;
            setTimeout(() => { if (this.recording !== prev) el.pause(); }, 900);
        }
        this.recording = null;
        this.recordingOk = false;
        if (this.synthBus()) this.bus.gain.setTargetAtTime(1.0, this.ctx.currentTime, 0.2);

        if (!AUDIO_FILES[targetId]) return;
        if (!this.recordings) this.recordings = {};
        let rec = this.recordings[targetId];
        if (!rec) {
            const el = new Audio();
            el.src = AUDIO + AUDIO_FILES[targetId];
            el.loop = true;
            el.preload = 'auto';
            if ('preservesPitch' in el) el.preservesPitch = false;
            if ('webkitPreservesPitch' in el) el.webkitPreservesPitch = false;
            // Opened as file:// the browser mutes local media routed through Web Audio,
            // so in that case the recording plays directly (volume/rate still follow telemetry).
            const direct = location.protocol === 'file:';
            let filter = null;
            let gain = null;
            if (!direct) {
                const src = this.ctx.createMediaElementSource(el);
                filter = this.ctx.createBiquadFilter();
                filter.type = 'lowpass';
                filter.frequency.value = 1800;
                gain = this.ctx.createGain();
                gain.gain.value = 0;
                src.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
            } else {
                el.volume = 0;
            }
            rec = { el, filter, gain, direct, failed: false };
            el.addEventListener('error', () => { rec.failed = true; });
            this.recordings[targetId] = rec;
        }
        if (rec.failed) return;
        this.recording = rec;
        rec.el.currentTime = 0;
        rec.el.play().then(() => {
            if (this.recording !== rec || !this.isPlaying) { rec.el.pause(); return; }
            this.recordingOk = true;
            const t = this.ctx.currentTime;
            if (rec.gain) rec.gain.gain.setTargetAtTime(0.9, t, 0.4);
            else rec.el.volume = 0.6;
            this.bus.gain.setTargetAtTime(0.35, t, 0.4);
            this.updateByTelemetry(state.rs);
        }).catch((err) => { if (err && err.name === 'AbortError') return; rec.failed = true; });
    }

    createLoopingNoiseBuffer() {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        return src;
    }

    switchTargetSoundscape(targetId) {
        if (!this.isPlaying) return;
        this.init();
        this.clearCurrentNodes();
        this.playRecording(targetId);
        const now = this.ctx.currentTime;

        if (targetId === 'saturn') {
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const lfo = this.ctx.createOscillator();
            const lfoGain = this.ctx.createGain();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();

            osc1.type = 'sine'; osc1.frequency.setValueAtTime(523.25, now);
            osc2.type = 'triangle'; osc2.frequency.setValueAtTime(783.99, now);
            lfo.type = 'sine'; lfo.frequency.setValueAtTime(0.35, now);
            lfoGain.gain.setValueAtTime(16, now);

            filter.type = 'bandpass'; filter.frequency.setValueAtTime(720, now); filter.Q.setValueAtTime(2.8, now);
            gain.gain.setValueAtTime(0.085, now);

            lfo.connect(lfoGain); lfoGain.connect(osc1.frequency);
            osc1.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(this.synthBus());
            osc1.start(); osc2.start(); lfo.start();

            this.primaryOsc = osc1; this.secondaryOsc = osc2; this.mainFilter = filter;
            this.activeNodes.push(osc1, osc2, lfo, lfoGain, filter, gain);

            const scheduleIceChime = () => {
                if (!this.isPlaying || state.currentTarget !== 'saturn') return;
                const prox = state.descentPercent / 100;
                const delay = Math.max(45, 420 - prox * 360);
                const timer = setTimeout(() => {
                    if (!this.isPlaying || state.currentTarget !== 'saturn') return;
                    const t = this.ctx.currentTime;
                    const ping = this.ctx.createOscillator();
                    const pGain = this.ctx.createGain();
                    const notes = [1046.5, 1174.66, 1318.5, 1567.98, 2093.0, 2637.0];
                    const freq = notes[Math.floor(Math.random() * notes.length)];
                    ping.type = 'sine';
                    ping.frequency.setValueAtTime(freq, t);
                    ping.frequency.exponentialRampToValueAtTime(freq * 0.78, t + 0.18);
                    pGain.gain.setValueAtTime(0.02 + prox * 0.055, t);
                    pGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
                    ping.connect(pGain); pGain.connect(this.synthBus());
                    ping.start(t); ping.stop(t + 0.22);
                    scheduleIceChime();
                }, delay);
                this.timers.push(timer);
            };
            scheduleIceChime();

        } else if (targetId === 'sun') {
            const noise = this.createLoopingNoiseBuffer();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();
            const subOsc = this.ctx.createOscillator();

            subOsc.type = 'sawtooth'; subOsc.frequency.setValueAtTime(48, now);
            filter.type = 'lowpass'; filter.frequency.setValueAtTime(145, now); filter.Q.setValueAtTime(3.5, now);
            gain.gain.setValueAtTime(0.18, now);

            noise.connect(filter); subOsc.connect(filter); filter.connect(gain); gain.connect(this.synthBus());
            noise.start(); subOsc.start();
            this.primaryOsc = subOsc; this.mainFilter = filter;
            this.activeNodes.push(noise, subOsc, filter, gain);

        } else if (targetId === 'earth') {
            const osc = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();
            osc.type = 'sine'; osc.frequency.setValueAtTime(432, now);
            filter.type = 'bandpass'; filter.frequency.setValueAtTime(520, now);
            gain.gain.setValueAtTime(0.05, now);
            osc.connect(filter); filter.connect(gain); gain.connect(this.synthBus());
            osc.start();
            this.primaryOsc = osc; this.mainFilter = filter;
            this.activeNodes.push(osc, filter, gain);

            const scheduleChorus = () => {
                if (!this.isPlaying || state.currentTarget !== 'earth') return;
                const timer = setTimeout(() => {
                    if (!this.isPlaying || state.currentTarget !== 'earth') return;
                    const t = this.ctx.currentTime;
                    const cOsc = this.ctx.createOscillator();
                    const cGain = this.ctx.createGain();
                    cOsc.type = 'sine';
                    const baseF = 900 + Math.random() * 600;
                    cOsc.frequency.setValueAtTime(baseF, t);
                    cOsc.frequency.exponentialRampToValueAtTime(baseF * 1.65, t + 0.32);
                    cGain.gain.setValueAtTime(0.035, t);
                    cGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
                    cOsc.connect(cGain); cGain.connect(this.synthBus());
                    cOsc.start(t); cOsc.stop(t + 0.36);
                    scheduleChorus();
                }, 450 + Math.random() * 650);
                this.timers.push(timer);
            };
            scheduleChorus();

        } else if (['mars', 'venus', 'mercury', 'moon', 'uranus', 'neptune', 'io', 'europa', 'titan', 'pluto'].includes(targetId)) {
            const noise = this.createLoopingNoiseBuffer();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();
            const padOsc = this.ctx.createOscillator();

            const freqMap = { mercury: 680, venus: 95, moon: 310, mars: 260, uranus: 420, neptune: 190, io: 140, europa: 520, titan: 120, pluto: 360 };
            const oscMap = { mercury: 293.66, venus: 65.41, moon: 196.0, mars: 146.83, uranus: 329.63, neptune: 110.0, io: 73.42, europa: 246.94, titan: 87.31, pluto: 220.0 };

            padOsc.type = targetId === 'venus' ? 'sawtooth' : 'sine';
            padOsc.frequency.setValueAtTime(oscMap[targetId], now);

            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(freqMap[targetId], now);
            filter.Q.setValueAtTime(targetId === 'moon' ? 8.0 : 3.5, now);

            gain.gain.setValueAtTime((targetId === 'moon' || targetId === 'pluto') ? 0.04 : 0.11, now);

            noise.connect(filter); padOsc.connect(filter); filter.connect(gain); gain.connect(this.synthBus());
            noise.start(); padOsc.start();
            this.primaryOsc = padOsc; this.mainFilter = filter;
            this.activeNodes.push(noise, padOsc, filter, gain);

        } else if (targetId === 'jupiter') {
            const osc1 = this.ctx.createOscillator();
            const osc2 = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();
            osc1.type = 'sawtooth'; osc1.frequency.setValueAtTime(82.4, now);
            osc2.type = 'triangle'; osc2.frequency.setValueAtTime(123.47, now);
            filter.type = 'lowpass'; filter.frequency.setValueAtTime(240, now); filter.Q.setValueAtTime(5.5, now);
            gain.gain.setValueAtTime(0.13, now);
            osc1.connect(filter); osc2.connect(filter); filter.connect(gain); gain.connect(this.synthBus());
            osc1.start(); osc2.start();
            this.primaryOsc = osc1; this.secondaryOsc = osc2; this.mainFilter = filter;
            this.activeNodes.push(osc1, osc2, filter, gain);

        } else if (targetId === 'pulsar') {
            const humOsc = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();
            humOsc.type = 'sawtooth'; humOsc.frequency.setValueAtTime(110, now);
            filter.type = 'bandpass'; filter.frequency.setValueAtTime(340, now);
            gain.gain.setValueAtTime(0.08, now);
            humOsc.connect(filter); filter.connect(gain); gain.connect(this.synthBus());
            humOsc.start();
            this.primaryOsc = humOsc; this.mainFilter = filter;
            this.activeNodes.push(humOsc, filter, gain);

            const schedulePulsarBeat = () => {
                if (!this.isPlaying || state.currentTarget !== 'pulsar') return;
                const beatInterval = 110 * state.gamma;
                const timer = setTimeout(() => {
                    if (!this.isPlaying || state.currentTarget !== 'pulsar') return;
                    const t = this.ctx.currentTime;
                    const pOsc = this.ctx.createOscillator();
                    const pGain = this.ctx.createGain();
                    pOsc.type = 'square';
                    pOsc.frequency.setValueAtTime(640, t);
                    pOsc.frequency.exponentialRampToValueAtTime(140, t + 0.035);
                    pGain.gain.setValueAtTime(0.07, t);
                    pGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
                    pOsc.connect(pGain); pGain.connect(this.synthBus());
                    pOsc.start(t); pOsc.stop(t + 0.045);
                    schedulePulsarBeat();
                }, beatInterval);
                this.timers.push(timer);
            };
            schedulePulsarBeat();

        } else {
            const droneOsc = this.ctx.createOscillator();
            const droneSubOsc = this.ctx.createOscillator();
            const droneFilter = this.ctx.createBiquadFilter();
            const droneGain = this.ctx.createGain();
            droneOsc.type = 'sawtooth'; droneOsc.frequency.setValueAtTime(68, now);
            droneSubOsc.type = 'sine'; droneSubOsc.frequency.setValueAtTime(34, now);
            droneFilter.type = 'lowpass'; droneFilter.frequency.setValueAtTime(160, now); droneFilter.Q.setValueAtTime(4.5, now);
            droneGain.gain.setValueAtTime(0.15, now);
            droneOsc.connect(droneFilter); droneSubOsc.connect(droneFilter); droneFilter.connect(droneGain); droneGain.connect(this.synthBus());
            droneOsc.start(); droneSubOsc.start();

            const whiteNoise = this.createLoopingNoiseBuffer();
            const thrusterFilter = this.ctx.createBiquadFilter();
            thrusterFilter.type = 'bandpass'; thrusterFilter.frequency.setValueAtTime(320, now);
            const thrusterGain = this.ctx.createGain();
            thrusterGain.gain.setValueAtTime(0.05, now);
            whiteNoise.connect(thrusterFilter); thrusterFilter.connect(thrusterGain); thrusterGain.connect(this.synthBus());
            whiteNoise.start();

            this.primaryOsc = droneOsc; this.secondaryOsc = droneSubOsc;
            this.mainFilter = droneFilter; this.noiseFilter = thrusterFilter; this.noiseGain = thrusterGain;
            this.activeNodes.push(droneOsc, droneSubOsc, droneFilter, droneGain, whiteNoise, thrusterFilter, thrusterGain);

            const scheduleNextClick = () => {
                if (!this.isPlaying || state.currentTarget !== 'gargantua') return;
                const proximity = Math.max(0, Math.min(1, (15 - state.rs) / 13.95));
                const minDelay = 45 + (1 - proximity) * 700;
                const timer = setTimeout(() => {
                    if (!this.isPlaying || state.currentTarget !== 'gargantua') return;
                    const t = this.ctx.currentTime;
                    const osc = this.ctx.createOscillator();
                    const gain = this.ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(1400 + Math.random() * 1200, t);
                    osc.frequency.exponentialRampToValueAtTime(180, t + 0.018);
                    gain.gain.setValueAtTime(0.03 + proximity * 0.08, t);
                    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);
                    osc.connect(gain); gain.connect(this.synthBus());
                    osc.start(t); osc.stop(t + 0.02);
                    scheduleNextClick();
                }, minDelay * (0.5 + Math.random()));
                this.timers.push(timer);
            };
            scheduleNextClick();
        }

        this.updateByTelemetry(state.rs);
    }

    playClickTone(freq = 880, duration = 0.05) {
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 0.5, now + duration);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + duration);
    }

    playTelemetryPing() {
        this.init();
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startFreq = 1320;
        const endFreq = Math.max(130, 1320 / Math.min(9, state.gamma));
        osc.type = 'sine';
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.65);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.72);
    }

    updateByTelemetry(rs) {
        if (!this.isPlaying || !this.ctx) return;
        const now = this.ctx.currentTime;
        const prox = Math.max(0, Math.min(1, state.descentPercent / 100));

        if (this.recording && this.recordingOk) {
            if (this.recording.direct) {
                this.recording.el.volume = Math.min(1, 0.55 + prox * 0.45);
            } else {
                this.recording.filter.frequency.setTargetAtTime(900 + Math.pow(prox, 1.6) * 15000, now, 0.15);
                this.recording.gain.gain.setTargetAtTime(0.55 + prox * 0.45, now, 0.2);
            }
            const rate = Math.max(0.5, Math.min(1, 1 / Math.max(1, state.gamma)));
            this.recording.el.playbackRate = rate;
        }
        if (!this.primaryOsc) return;

        if (state.currentTarget === 'gargantua') {
            const baseFreq = 72 - prox * 44;
            this.primaryOsc.frequency.setTargetAtTime(baseFreq, now, 0.1);
            if (this.secondaryOsc) this.secondaryOsc.frequency.setTargetAtTime(baseFreq * 0.5, now, 0.1);
            if (this.mainFilter) this.mainFilter.frequency.setTargetAtTime(140 + prox * 220, now, 0.1);
        } else if (state.currentTarget === 'saturn') {
            this.primaryOsc.frequency.setTargetAtTime(523.25 + prox * 85, now, 0.1);
            if (this.mainFilter) this.mainFilter.frequency.setTargetAtTime(650 + prox * 1200, now, 0.1);
        } else if (this.mainFilter) {
            this.mainFilter.frequency.setTargetAtTime(220 + prox * 650, now, 0.1);
        }
    }

    stopAll() {
        this.isPlaying = false;
        this.clearCurrentNodes();
        if (this.recording) this.recording.el.pause();
        this.recording = null;
        this.recordingOk = false;
    }
}

const audioEngine = new SpatialAudioEngine();
