/* -------------------------------------------------------------------------- */
/* GÉNESIS: DISEÑO SONORO (SÍNTESIS + SONIFICACIONES REALES DE NASA/CHANDRA)   */
/* -------------------------------------------------------------------------- */
// Capa real por tipo de formación (assets/audio/genesis, dominio público NASA/CXC/SAO).
const GENESIS_SONIFICATIONS = {
    rocky: 'nebulosa-carina.mp3',
    gas: 'nebulosa-carina.mp3',
    star: 'pilares-creacion.mp3',
    nova: 'cassiopeia-a.mp3',
    hole: 'centro-galactico.mp3'
};

class GenesisSound {
    constructor(engine) {
        this.engine = engine;
        this.ctx = null;
        this.master = null;
        this.nodes = [];
        this.timers = [];
        this.bed = null;
        this.real = {};
        this.active = false;
    }

    get on() { return this.engine.isPlaying; }

    setup() {
        this.engine.init();
        if (this.master) return true;
        const ctx = this.ctx = this.engine.ctx;
        this.master = ctx.createGain();
        this.master.gain.value = 0;
        const comp = ctx.createDynamicsCompressor();
        comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 6;
        comp.attack.value = 0.004; comp.release.value = 0.4;
        this.master.connect(comp);
        comp.connect(ctx.destination);
        this.reverb = ctx.createConvolver();
        this.reverb.buffer = this.makeImpulse(4.2, 2.6);
        this.reverbIn = ctx.createGain();
        this.reverbIn.gain.value = 0.8;
        this.reverbIn.connect(this.reverb);
        this.reverb.connect(this.master);
        this.white = this.makeNoise(false);
        this.brown = this.makeNoise(true);
        return true;
    }

    makeImpulse(seconds, decay) {
        const ctx = this.ctx;
        const len = Math.floor(ctx.sampleRate * seconds);
        const buf = ctx.createBuffer(2, len, ctx.sampleRate);
        for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch);
            for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
        }
        return buf;
    }

    makeNoise(brown) {
        const ctx = this.ctx;
        const len = ctx.sampleRate * 3;
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = buf.getChannelData(0);
        let last = 0;
        for (let i = 0; i < len; i++) {
            const w = Math.random() * 2 - 1;
            if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
        }
        return buf;
    }

    // Conecta una fuente al master (seco) y a la reverberación (húmedo).
    out(node, wet = 0.4, dry = 1) {
        const g = this.ctx.createGain(); g.gain.value = dry;
        const s = this.ctx.createGain(); s.gain.value = wet;
        node.connect(g); g.connect(this.master);
        node.connect(s); s.connect(this.reverbIn);
        this.nodes.push(g, s);
    }

    noise(brown, loop = true) {
        const src = this.ctx.createBufferSource();
        src.buffer = brown ? this.brown : this.white;
        src.loop = loop;
        src.loopStart = Math.random() * 2;
        this.nodes.push(src);
        return src;
    }

    /* ----------------------------- capa continua ----------------------------- */
    start(typeKey) {
        if (!this.on || !this.setup()) return;
        this.stop(true);
        this.active = true;
        this.typeKey = typeKey;
        const ctx = this.ctx, t = ctx.currentTime;
        this.master.gain.cancelScheduledValues(t);
        this.master.gain.setValueAtTime(0, t);
        this.master.gain.linearRampToValueAtTime(0.9, t + 2.5);

        // drone grave del espacio profundo: dos sinusoides casi afinadas + subgrave
        const drone = ctx.createGain(); drone.gain.value = 0.0;
        drone.gain.linearRampToValueAtTime(0.16, t + 4);
        [41.2, 41.7, 61.8].forEach((f, i) => {
            const o = ctx.createOscillator();
            o.type = i === 2 ? 'triangle' : 'sine';
            o.frequency.value = f;
            o.connect(drone); o.start();
            this.nodes.push(o);
        });
        this.out(drone, 0.5);

        // viento cósmico: ruido marrón filtrado que se abre con el calor
        const wind = this.noise(true);
        const windF = ctx.createBiquadFilter();
        windF.type = 'bandpass'; windF.frequency.value = 220; windF.Q.value = 0.8;
        const windG = ctx.createGain(); windG.gain.value = 0.0;
        windG.gain.linearRampToValueAtTime(0.5, t + 3);
        wind.connect(windF); windF.connect(windG); wind.start();
        this.out(windG, 0.6);

        // retumbe del colapso: subgrave que se intensifica cuando la materia cae
        const rumble = this.noise(true);
        const rumbleF = ctx.createBiquadFilter();
        rumbleF.type = 'lowpass'; rumbleF.frequency.value = 90;
        const rumbleG = ctx.createGain(); rumbleG.gain.value = 0;
        rumble.connect(rumbleF); rumbleF.connect(rumbleG); rumble.start();
        this.out(rumbleG, 0.2);

        // siseo de acreción: ruido blanco por banda que sube de tono
        const hiss = this.noise(false);
        const hissF = ctx.createBiquadFilter();
        hissF.type = 'bandpass'; hissF.frequency.value = 900; hissF.Q.value = 2.5;
        const hissG = ctx.createGain(); hissG.gain.value = 0;
        hiss.connect(hissF); hissF.connect(hissG); hiss.start();
        this.out(hissG, 0.5);

        this.bed = { drone, windF, windG, rumbleF, rumbleG, hissF, hissG };
        this.playReal(typeKey);
        this.engine.duck(true);
    }

    playReal(typeKey) {
        const file = GENESIS_SONIFICATIONS[typeKey];
        if (!file) return;
        let rec = this.real[file];
        if (!rec) {
            const el = new Audio(AUDIO + 'genesis/' + file);
            el.loop = true; el.preload = 'auto';
            const direct = location.protocol === 'file:';
            let gain = null;
            if (!direct) {
                const src = this.ctx.createMediaElementSource(el);
                const lp = this.ctx.createBiquadFilter();
                lp.type = 'lowpass'; lp.frequency.value = 2400;
                gain = this.ctx.createGain(); gain.gain.value = 0;
                src.connect(lp); lp.connect(gain);
                gain.connect(this.master); gain.connect(this.reverbIn);
            } else {
                el.volume = 0;
            }
            rec = this.real[file] = { el, gain, direct, failed: false };
            el.addEventListener('error', () => { rec.failed = true; });
        }
        if (rec.failed) return;
        this.realRec = rec;
        rec.el.currentTime = 0;
        rec.el.play().then(() => {
            if (this.realRec !== rec || !this.active) { rec.el.pause(); return; }
            if (rec.gain) rec.gain.gain.setTargetAtTime(0.32, this.ctx.currentTime, 1.5);
            else rec.el.volume = 0.3;
        }).catch(() => { rec.failed = true; });
    }

    // Llamado cada cuadro con el estado de la simulación.
    update(v) {
        if (!this.active || !this.bed) return;
        const t = this.ctx.currentTime, b = this.bed;
        b.windF.frequency.setTargetAtTime(160 + v.heat * 1400 + v.collapse * 300, t, 0.3);
        b.rumbleG.gain.setTargetAtTime(v.collapse * 0.9, t, 0.4);
        b.rumbleF.frequency.setTargetAtTime(60 + v.collapse * 90, t, 0.4);
        b.hissG.gain.setTargetAtTime(v.accretion * 0.14, t, 0.3);
        b.hissF.frequency.setTargetAtTime(500 + v.accretion * 2600, t, 0.3);
        b.drone.gain.setTargetAtTime(0.16 * (1 - v.reveal * 0.7), t, 0.6);
        if (this.realRec && this.realRec.gain) this.realRec.gain.gain.setTargetAtTime(0.32 * (1 - v.reveal), t, 0.8);
    }

    setPaused(p) {
        if (!this.master) return;
        const t = this.ctx.currentTime;
        this.master.gain.setTargetAtTime(p ? 0 : 0.9, t, 0.15);
        if (this.realRec) p ? this.realRec.el.pause() : this.realRec.el.play().catch(() => {});
    }

    stop(immediate = false) {
        this.timers.forEach(clearTimeout);
        this.timers = [];
        if (this.realRec) {
            const rec = this.realRec;
            if (rec.gain) rec.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.3);
            setTimeout(() => { if (this.realRec !== rec || !this.active) rec.el.pause(); }, immediate ? 0 : 1200);
        }
        if (!this.active) return;
        this.active = false;
        const nodes = this.nodes;
        this.nodes = [];
        this.bed = null;
        const kill = () => nodes.forEach(n => { try { if (n.stop) n.stop(); n.disconnect(); } catch (e) {} });
        if (immediate) { kill(); } else {
            const t = this.ctx.currentTime;
            this.master.gain.setTargetAtTime(0, t, 0.5);
            setTimeout(kill, 2600);
        }
        this.engine.duck(false);
    }

    /* ------------------------------- eventos ------------------------------- */
    // Golpe grave con caída de tono (impactos, supernova).
    boom(gain = 1, f0 = 120, f1 = 26, dur = 2.6) {
        const ctx = this.ctx, t = ctx.currentTime;
        const o = ctx.createOscillator(); o.type = 'sine';
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const shaper = ctx.createWaveShaper();
        const curve = new Float32Array(256);
        for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 2.4); }
        shaper.curve = curve;
        o.connect(shaper); shaper.connect(g); o.start(t); o.stop(t + dur + 0.1);
        this.nodes.push(o);
        this.out(g, 0.7);
    }

    // Ráfaga de ruido filtrado (crujido, explosión, viento de choque).
    burst(gain, type, fFrom, fTo, dur, brown = false, wet = 0.6) {
        const ctx = this.ctx, t = ctx.currentTime;
        const src = this.noise(brown, false);
        const f = ctx.createBiquadFilter();
        f.type = type; f.Q.value = 0.9;
        f.frequency.setValueAtTime(fFrom, t);
        f.frequency.exponentialRampToValueAtTime(fTo, t + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f); f.connect(g); src.start(t); src.stop(t + dur + 0.1);
        this.out(g, wet);
    }

    // Lluvia de chasquidos (escombros, roca que se agrieta al enfriarse).
    crackle(count, spread, gain = 0.12) {
        for (let i = 0; i < count; i++) {
            this.timers.push(setTimeout(() => {
                if (!this.active) return;
                this.burst(gain * (0.4 + Math.random()), 'bandpass', 1800 + Math.random() * 4000, 900, 0.05 + Math.random() * 0.12, false, 0.5);
            }, Math.random() * spread));
        }
    }

    // Barrido de tono (whistler, chirp de ondas gravitacionales, ignición).
    sweep(type, fFrom, fTo, dur, gain, wet = 0.5, attack = 0.05) {
        const ctx = this.ctx, t = ctx.currentTime;
        const o = ctx.createOscillator(); o.type = type;
        o.frequency.setValueAtTime(fFrom, t);
        o.frequency.exponentialRampToValueAtTime(fTo, t + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
        o.connect(lp); lp.connect(g); o.start(t); o.stop(t + dur + 0.05);
        this.nodes.push(o);
        this.out(g, wet);
    }

    // Acorde brillante cuando una estrella se enciende.
    shimmer(dur = 7) {
        const ctx = this.ctx, t = ctx.currentTime;
        [220, 277.18, 329.63, 440, 659.25].forEach((f, i) => {
            const o = ctx.createOscillator(); o.type = i % 2 ? 'triangle' : 'sine';
            o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 12;
            const g = ctx.createGain();
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(0.05, t + 1.2 + i * 0.25);
            g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g); o.start(t); o.stop(t + dur + 0.1);
            this.nodes.push(o);
            this.out(g, 0.9, 0.6);
        });
    }

    cue(name) {
        if (!this.active) return;
        switch (name) {
            case 'impact':
                this.boom(1.0, 110, 22, 3.4);
                this.burst(0.5, 'highpass', 2500, 500, 0.6);
                this.burst(0.6, 'lowpass', 1200, 80, 3.2, true, 0.8);
                this.crackle(60, 2600, 0.1);
                break;
            case 'meteor':
                this.burst(0.18, 'bandpass', 3500, 400, 0.45, false, 0.4);
                this.timers.push(setTimeout(() => this.active && this.boom(0.35, 160, 50, 0.8), 380));
                break;
            case 'cooling':
                this.crackle(40, 4000, 0.06);
                break;
            case 'shock':
                this.burst(0.45, 'bandpass', 3000, 160, 2.6, false, 0.7);
                this.boom(0.4, 70, 30, 2.0);
                break;
            case 'ignite':
                this.sweep('sawtooth', 45, 900, 2.4, 0.16, 0.6, 1.8);
                this.timers.push(setTimeout(() => {
                    if (!this.active) return;
                    this.boom(0.8, 90, 30, 3);
                    this.burst(0.4, 'lowpass', 6000, 300, 3.5, false, 0.9);
                    this.shimmer(8);
                }, 2300));
                break;
            case 'supernova':
                this.boom(1.0, 80, 18, 5);
                this.burst(0.9, 'lowpass', 9000, 120, 5.5, false, 0.9);
                this.burst(0.7, 'lowpass', 600, 40, 6, true, 0.8);
                this.crackle(80, 3000, 0.09);
                break;
            case 'collapse':
                this.sweep('sine', 180, 28, 1.4, 0.5, 0.5, 0.02);
                break;
            case 'chirp':
                // onda gravitacional de una fusión: frecuencia y amplitud suben, luego ringdown
                this.sweep('sine', 32, 260, 3.2, 0.35, 0.4, 3.0);
                this.timers.push(setTimeout(() => {
                    if (!this.active) return;
                    this.sweep('sine', 260, 190, 1.6, 0.4, 0.8, 0.01);
                    this.boom(0.7, 60, 20, 3);
                }, 3150));
                break;
            case 'whistler':
                for (let i = 0; i < 4; i++) {
                    this.timers.push(setTimeout(() => this.active && this.sweep('sine', 6500, 700, 1.3, 0.05, 0.6, 0.01), i * 900 + Math.random() * 400));
                }
                break;
            case 'pulsar': {
                // pulsos a 11.2 Hz, como el púlsar de Vela
                const ctx = this.ctx;
                const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 11.2;
                const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
                const g = ctx.createGain(); g.gain.value = 0.0001;
                g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 1.5);
                o.connect(hp); hp.connect(g); o.start();
                this.nodes.push(o);
                this.out(g, 0.3);
                break;
            }
            case 'phase':
                this.sweep('sine', 880, 660, 0.35, 0.025, 0.8, 0.01);
                break;
        }
    }
}
