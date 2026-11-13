/* -------------------------------------------------------------------------- */
/* TEXTURAS DE LUNAS CON SUS RASGOS REALES                                     */
/* -------------------------------------------------------------------------- */
// Mapas equirectangulares procedurales: color + relieve. Cada luna lleva el rasgo
// por el que la reconocen las misiones (Herschel en Mimas, rayas de tigre en
// Encélado, Mordor Macula en Caronte...). Se generan la primera vez que se ven.
const MOON_TEX_W = 1024, MOON_TEX_H = 512;
const PAINT_W = 512, PAINT_H = 256; // espacio en el que se dibujan los rasgos

function rngFrom(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Dibuja en ambos lienzos (color y relieve) corrigiendo el estiramiento de la proyección.
function stampEllipse(g, u, v, rPx, draw) {
    const lat = (0.5 - v) * Math.PI;
    const sx = 1 / Math.max(0.2, Math.cos(lat));
    [u * PAINT_W, u * PAINT_W - PAINT_W, u * PAINT_W + PAINT_W].forEach(x => {
        g.save();
        g.translate(x, v * PAINT_H);
        g.scale(sx, 1);
        draw(g, rPx);
        g.restore();
    });
}

function drawCrater(gc, gb, u, v, rPx, opts = {}) {
    const dark = opts.dark ?? 0.35, rays = opts.rays ?? false;
    stampEllipse(gc, u, v, rPx, (g, r) => {
        const grad = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.25);
        grad.addColorStop(0, `rgba(0,0,0,${dark})`);
        grad.addColorStop(0.7, `rgba(0,0,0,${dark * 0.6})`);
        grad.addColorStop(0.82, 'rgba(255,255,255,0.22)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad;
        g.beginPath(); g.arc(0, 0, r * 1.25, 0, Math.PI * 2); g.fill();
        if (opts.peak) {
            g.fillStyle = 'rgba(255,255,255,0.35)';
            g.beginPath(); g.arc(0, 0, r * 0.14, 0, Math.PI * 2); g.fill();
        }
        if (rays) {
            g.strokeStyle = 'rgba(255,255,255,0.18)';
            for (let i = 0; i < 14; i++) {
                const a = (i / 14) * Math.PI * 2 + i;
                g.lineWidth = 1 + (i % 3);
                g.beginPath(); g.moveTo(Math.cos(a) * r, Math.sin(a) * r);
                g.lineTo(Math.cos(a) * r * (3 + (i % 4)), Math.sin(a) * r * (3 + (i % 4))); g.stroke();
            }
        }
    });
    stampEllipse(gb, u, v, rPx, (g, r) => {
        const grad = g.createRadialGradient(0, 0, 0, 0, 0, r * 1.2);
        grad.addColorStop(0, 'rgba(0,0,0,0.55)');
        grad.addColorStop(0.78, 'rgba(0,0,0,0.3)');
        grad.addColorStop(0.9, 'rgba(255,255,255,0.6)');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = grad;
        g.beginPath(); g.arc(0, 0, r * 1.2, 0, Math.PI * 2); g.fill();
        if (opts.peak) { g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.arc(0, 0, r * 0.15, 0, Math.PI * 2); g.fill(); }
    });
}

function scatterCraters(gc, gb, rnd, count, minR, maxR, opts) {
    for (let i = 0; i < count; i++) {
        const r = minR + Math.pow(rnd(), 3) * (maxR - minR);
        drawCrater(gc, gb, rnd(), 0.08 + rnd() * 0.84, r, { ...opts, peak: r > maxR * 0.5, dark: (opts && opts.dark) ?? 0.3 + rnd() * 0.2 });
    }
}

// Rasgos característicos de cada luna (u, v en 0..1; v = 0 es el polo norte).
const MOON_LOOKS = {
    charon: {
        colors: [[118, 112, 106], [168, 162, 156]], seed: 11, craters: [70, 2, 9],
        paint(gc, gb) {
            // Mordor Macula: casquete rojizo del polo norte (tolinas que llegan desde Plutón)
            const grad = gc.createLinearGradient(0, 0, 0, PAINT_H * 0.22);
            grad.addColorStop(0, 'rgba(110,40,22,0.95)');
            grad.addColorStop(0.6, 'rgba(120,52,32,0.6)');
            grad.addColorStop(1, 'rgba(120,50,30,0)');
            gc.fillStyle = grad; gc.fillRect(0, 0, PAINT_W, PAINT_H * 0.22);
            // Serenity y Mandjet Chasma: cinturón de cañones cerca del ecuador
            [gc, gb].forEach((g, k) => {
                g.strokeStyle = k ? 'rgba(0,0,0,0.7)' : 'rgba(40,36,34,0.55)';
                g.lineWidth = 3;
                g.beginPath();
                for (let x = 0; x <= PAINT_W; x += 8) g.lineTo(x, PAINT_H * 0.42 + Math.sin(x * 0.03) * 10 + Math.sin(x * 0.11) * 3);
                g.stroke();
            });
        }
    },
    phobos: {
        colors: [[92, 82, 72], [128, 116, 104]], seed: 3, craters: [60, 1.5, 6],
        paint(gc, gb, rnd) {
            drawCrater(gc, gb, 0.02, 0.5, 52, { dark: 0.5, peak: false }); // Stickney, 9 km de 22
            // surcos paralelos que salen de Stickney
            [gc, gb].forEach((g, k) => {
                g.strokeStyle = k ? 'rgba(0,0,0,0.5)' : 'rgba(30,26,22,0.35)';
                g.lineWidth = 1.5;
                for (let i = 0; i < 26; i++) {
                    const y = 40 + i * 7 + rnd() * 3;
                    g.beginPath(); g.moveTo(90, y); g.bezierCurveTo(200, y - 10, 320, y + 12, 470, y); g.stroke();
                }
            });
        }
    },
    deimos: { colors: [[150, 138, 122], [182, 170, 154]], seed: 5, craters: [25, 1.5, 5], smooth: true },
    io: {
        colors: [[214, 190, 90], [236, 220, 140]], seed: 7, craters: [0, 0, 0],
        paint(gc, gb, rnd) {
            for (let i = 0; i < 70; i++) {
                const u = rnd(), v = 0.12 + rnd() * 0.76, r = 2 + rnd() * 7;
                stampEllipse(gc, u, v, r, (g, rr) => {
                    g.fillStyle = rnd() > 0.5 ? 'rgba(40,20,10,0.85)' : 'rgba(170,60,20,0.7)';
                    g.beginPath(); g.arc(0, 0, rr, 0, Math.PI * 2); g.fill();
                    g.strokeStyle = 'rgba(200,80,30,0.35)'; g.lineWidth = rr * 1.4;
                    g.beginPath(); g.arc(0, 0, rr * 2.2, 0, Math.PI * 2); g.stroke();
                });
            }
            // Pele: anillo rojo de azufre
            stampEllipse(gc, 0.7, 0.58, 26, (g, r) => { g.strokeStyle = 'rgba(190,70,40,0.6)'; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); });
        }
    },
    ganymede: {
        colors: [[96, 86, 76], [176, 168, 156]], seed: 13, craters: [90, 1.5, 7], rays: true,
        paint(gc, gb, rnd) {
            // terreno oscuro antiguo (Galileo Regio) y bandas claras de surcos más jóvenes
            for (let i = 0; i < 9; i++) {
                const u = rnd(), v = 0.2 + rnd() * 0.6;
                stampEllipse(gc, u, v, 30 + rnd() * 40, (g, r) => { g.fillStyle = 'rgba(60,52,44,0.45)'; g.beginPath(); g.ellipse(0, 0, r * 1.6, r, rnd() * 3, 0, Math.PI * 2); g.fill(); });
            }
            [gc, gb].forEach((g, k) => {
                g.strokeStyle = k ? 'rgba(255,255,255,0.25)' : 'rgba(210,205,195,0.18)';
                g.lineWidth = 1;
                for (let i = 0; i < 180; i++) {
                    const x = rnd() * PAINT_W, y = 30 + rnd() * (PAINT_H - 60), a = rnd() * Math.PI;
                    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 30, y + Math.sin(a) * 30); g.stroke();
                }
            });
        }
    },
    callisto: {
        colors: [[58, 52, 46], [96, 88, 78]], seed: 17, craters: [260, 1, 6], rays: true,
        paint(gc, gb) {
            // Valhalla: cuenca de impacto con anillos concéntricos
            for (let i = 1; i <= 7; i++) {
                stampEllipse(gc, 0.32, 0.45, i * 9, (g, r) => { g.strokeStyle = 'rgba(190,180,165,0.22)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); });
                stampEllipse(gb, 0.32, 0.45, i * 9, (g, r) => { g.strokeStyle = 'rgba(255,255,255,0.4)'; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); });
            }
            stampEllipse(gc, 0.32, 0.45, 14, (g, r) => { g.fillStyle = 'rgba(200,190,175,0.5)'; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); });
        }
    },
    mimas: {
        colors: [[150, 146, 140], [190, 186, 180]], seed: 19, craters: [120, 1.5, 7],
        paint(gc, gb) { drawCrater(gc, gb, 0.18, 0.5, 44, { dark: 0.45, peak: true }); } // Herschel: 1/3 de su diámetro
    },
    enceladus: {
        colors: [[226, 232, 238], [248, 250, 255]], seed: 23, bright: true, craters: [40, 1, 4], dark: 0.12,
        paint(gc, gb) {
            // "rayas de tigre" del polo sur: grietas de donde salen los géiseres
            [gc, gb].forEach((g, k) => {
                g.strokeStyle = k ? 'rgba(0,0,0,0.7)' : 'rgba(110,150,190,0.85)';
                g.lineWidth = 3;
                for (let i = 0; i < 4; i++) {
                    g.beginPath();
                    for (let x = 60; x <= 460; x += 10) g.lineTo(x, PAINT_H * (0.86 + i * 0.03) + Math.sin(x * 0.02 + i) * 4);
                    g.stroke();
                }
            });
        }
    },
    rhea: { colors: [[150, 144, 136], [196, 190, 182]], seed: 29, craters: [200, 1, 6], rays: true },
    miranda: {
        colors: [[128, 124, 120], [176, 172, 168]], seed: 31, craters: [60, 1, 5],
        paint(gc, gb) {
            // coronas: zonas de surcos concéntricos "como pista de carreras"
            [[0.25, 0.6], [0.6, 0.45], [0.85, 0.65]].forEach(([u, v]) => {
                for (let i = 1; i <= 6; i++) {
                    [gc, gb].forEach((g, k) => stampEllipse(g, u, v, i * 6, (gg, r) => {
                        gg.strokeStyle = k ? 'rgba(255,255,255,0.45)' : (i % 2 ? 'rgba(80,76,72,0.5)' : 'rgba(210,206,200,0.4)');
                        gg.lineWidth = 3; gg.strokeRect(-r * 1.3, -r, r * 2.6, r * 2);
                    }));
                }
            });
        }
    },
    ariel: { colors: [[150, 146, 142], [196, 192, 188]], seed: 37, craters: [70, 1, 4], canyons: true },
    titania: { colors: [[132, 124, 116], [176, 168, 160]], seed: 41, craters: [140, 1, 6], canyons: true },
    triton: {
        colors: [[196, 178, 168], [226, 210, 200]], seed: 43, craters: [8, 1, 3],
        paint(gc, gb, rnd) {
            // "piel de melón" en el hemisferio norte
            for (let i = 0; i < 260; i++) {
                const u = rnd(), v = 0.1 + rnd() * 0.4;
                [gc, gb].forEach((g, k) => stampEllipse(g, u, v, 4 + rnd() * 4, (gg, r) => {
                    gg.strokeStyle = k ? 'rgba(0,0,0,0.4)' : 'rgba(120,104,96,0.35)'; gg.lineWidth = 1.2;
                    gg.beginPath(); gg.arc(0, 0, r, 0, Math.PI * 2); gg.stroke();
                }));
            }
            // casquete polar sur rosado de nitrógeno helado con rayas oscuras de géiseres
            const grad = gc.createLinearGradient(0, PAINT_H * 0.62, 0, PAINT_H);
            grad.addColorStop(0, 'rgba(236,190,180,0)'); grad.addColorStop(0.35, 'rgba(236,190,180,0.75)'); grad.addColorStop(1, 'rgba(244,214,206,0.9)');
            gc.fillStyle = grad; gc.fillRect(0, PAINT_H * 0.62, PAINT_W, PAINT_H * 0.38);
            gc.strokeStyle = 'rgba(60,40,36,0.6)'; gc.lineWidth = 2;
            for (let i = 0; i < 40; i++) { const x = rnd() * PAINT_W, y = PAINT_H * (0.72 + rnd() * 0.15); gc.beginPath(); gc.moveTo(x, y); gc.lineTo(x + 14, y - 3); gc.stroke(); }
        }
    }
};

// Lunas añadidas en v3
Object.assign(MOON_LOOKS, {
    amalthea: { colors: [[120, 52, 34], [170, 86, 58]], seed: 47, craters: [30, 1.5, 6] },
    tethys: {
        colors: [[196, 194, 190], [232, 230, 226]], seed: 53, craters: [150, 1, 5], bright: true,
        paint(gc, gb) {
            drawCrater(gc, gb, 0.62, 0.4, 40, { dark: 0.25, peak: true }); // Odiseo
            [gc, gb].forEach((g, k) => {
                g.strokeStyle = k ? 'rgba(0,0,0,0.6)' : 'rgba(120,118,112,0.5)'; g.lineWidth = 6;
                g.beginPath(); for (let x = 0; x <= 380; x += 10) g.lineTo(x + 60, 40 + x * 0.45 + Math.sin(x * 0.05) * 8); g.stroke();
            }); // Ítaca Chasma
        }
    },
    dione: {
        colors: [[150, 148, 144], [200, 198, 194]], seed: 59, craters: [160, 1, 5],
        paint(gc, gb, rnd) {
            [gc, gb].forEach((g, k) => {
                g.strokeStyle = k ? 'rgba(255,255,255,0.5)' : 'rgba(245,248,255,0.55)'; g.lineWidth = 1.2;
                for (let i = 0; i < 40; i++) { const x = 300 + rnd() * 160, y = 40 + rnd() * 180; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 20, y + 15, x - 10, y + 40, x + 15, y + 60); g.stroke(); }
            });
        }
    },
    iapetus: {
        colors: [[200, 196, 188], [236, 232, 224]], seed: 61, craters: [120, 1, 6], bright: true,
        paint(gc, gb) {
            // Cassini Regio: el hemisferio delantero es oscuro como el carbón
            const grad = gc.createLinearGradient(0, 0, PAINT_W, 0);
            grad.addColorStop(0, 'rgba(25,18,12,0)'); grad.addColorStop(0.12, 'rgba(25,18,12,0.95)');
            grad.addColorStop(0.45, 'rgba(25,18,12,0.95)'); grad.addColorStop(0.55, 'rgba(25,18,12,0)');
            gc.fillStyle = grad; gc.fillRect(0, PAINT_H * 0.12, PAINT_W, PAINT_H * 0.76);
            // cresta ecuatorial
            [gc, gb].forEach((g, k) => { g.strokeStyle = k ? 'rgba(255,255,255,0.8)' : 'rgba(80,70,60,0.5)'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, PAINT_H / 2); g.lineTo(PAINT_W * 0.5, PAINT_H / 2 + 2); g.stroke(); });
        }
    },
    hyperion: {
        colors: [[120, 104, 84], [170, 154, 130]], seed: 67, craters: [0, 0, 0],
        paint(gc, gb, rnd) { for (let i = 0; i < 260; i++) drawCrater(gc, gb, rnd(), 0.08 + rnd() * 0.84, 3 + rnd() * 9, { dark: 0.6 }); } // "esponja"
    },
    umbriel: {
        colors: [[62, 62, 64], [92, 92, 96]], seed: 71, craters: [120, 1, 6],
        paint(gc) { stampEllipse(gc, 0.3, 0.2, 14, (g, r) => { g.strokeStyle = 'rgba(230,230,225,0.85)'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); }); } // Wunda
    },
    oberon: { colors: [[110, 100, 94], [150, 140, 132]], seed: 73, craters: [160, 1, 7], rays: true },
    proteus: { colors: [[70, 66, 64], [100, 96, 92]], seed: 79, craters: [50, 1.5, 7] }
});

const moonTextureCache = {};
function makeMoonTexture(kind) {
    if (moonTextureCache[kind]) return moonTextureCache[kind];
    const look = MOON_LOOKS[kind];
    if (!look) return null;
    const rnd = rngFrom(look.seed * 7919);
    const mk = () => { const c = document.createElement('canvas'); c.width = MOON_TEX_W; c.height = MOON_TEX_H; return c; };
    const cc = mk(), cb = mk();
    const gc = cc.getContext('2d'), gb = cb.getContext('2d');

    // base: dos tonos mezclados con ruido fractal. Se calcula a 256x128 y se escala
    // (los rasgos se dibujan encima a resolución completa, así siguen nítidos).
    const BW = 256, BH = 128;
    const small = document.createElement('canvas'); small.width = BW; small.height = BH;
    const smallB = document.createElement('canvas'); smallB.width = BW; smallB.height = BH;
    const sg = small.getContext('2d'), sgb = smallB.getContext('2d');
    const img = sg.createImageData(BW, BH);
    const bimg = sgb.createImageData(BW, BH);
    // las cámaras de las misiones ven estas lunas oscuras: con la luz fuerte de la escena se atenúan
    const dim = look.bright ? 1 : 0.72;
    const [a, b] = look.colors;
    for (let y = 0; y < BH; y++) {
        for (let x = 0; x < BW; x++) {
            const n = fbm2D(x / 23 + look.seed, y / 23, 5);
            const t = Math.min(1, Math.max(0, n * 1.25 - 0.1));
            const i = (y * BW + x) * 4;
            img.data[i] = (a[0] + (b[0] - a[0]) * t) * dim;
            img.data[i + 1] = (a[1] + (b[1] - a[1]) * t) * dim;
            img.data[i + 2] = (a[2] + (b[2] - a[2]) * t) * dim;
            img.data[i + 3] = 255;
            bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = 128 + (n - 0.5) * (look.smooth ? 60 : 120);
            bimg.data[i + 3] = 255;
        }
    }
    sg.putImageData(img, 0, 0);
    sgb.putImageData(bimg, 0, 0);
    gc.imageSmoothingQuality = gb.imageSmoothingQuality = 'high';
    gc.drawImage(small, 0, 0, MOON_TEX_W, MOON_TEX_H);
    gb.drawImage(smallB, 0, 0, MOON_TEX_W, MOON_TEX_H);

    // los rasgos están dibujados en coordenadas de 512x256: se escala el lienzo
    gc.save(); gb.save(); gc.scale(MOON_TEX_W / PAINT_W, MOON_TEX_H / PAINT_H); gb.scale(MOON_TEX_W / PAINT_W, MOON_TEX_H / PAINT_H);
    const [count, minR, maxR] = look.craters;
    if (count) scatterCraters(gc, gb, rnd, count, minR, maxR, { rays: look.rays, dark: look.dark });
    if (look.canyons) {
        [gc, gb].forEach((g, k) => {
            g.strokeStyle = k ? 'rgba(0,0,0,0.6)' : 'rgba(60,56,52,0.5)'; g.lineWidth = 3;
            for (let i = 0; i < 6; i++) {
                const y = 60 + rnd() * 140; g.beginPath(); g.moveTo(rnd() * 200, y);
                g.bezierCurveTo(200, y + 20 * (rnd() - 0.5), 300, y + 30 * (rnd() - 0.5), 300 + rnd() * 200, y + 10); g.stroke();
            }
        });
    }
    if (look.paint) look.paint(gc, gb, rnd);
    gc.restore(); gb.restore();

    const map = new THREE.CanvasTexture(cc);
    const bump = new THREE.CanvasTexture(cb);
    map.wrapS = bump.wrapS = THREE.RepeatWrapping;
    map.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return (moonTextureCache[kind] = { map, bump });
}
