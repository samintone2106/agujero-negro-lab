/* -------------------------------------------------------------------------- */
/* ESTRELLAS REALES (CATÁLOGO HYG v3.8, CC BY-SA 4.0)                          */
/* -------------------------------------------------------------------------- */
// assets/data/stars.json: las 8,920 estrellas visibles a simple vista (magnitud ≤ 6.5)
// con ascensión recta, declinación, magnitud, índice de color B-V y distancia.
const FAMOUS_STARS = {
    Sirius: { es: 'Sirio', fact: 'La estrella más brillante del cielo nocturno, a 8.6 años luz. La acompaña una enana blanca, Sirio B.' },
    Canopus: { es: 'Canopo', fact: 'La segunda más brillante, a ~310 años luz. Las sondas espaciales la usan como guía para orientarse.' },
    Arcturus: { es: 'Arturo', fact: 'Gigante naranja a 37 años luz, la más brillante del hemisferio norte celeste.' },
    'Rigil Kentaurus': { es: 'Alfa Centauri A', fact: 'Parte del sistema estelar más cercano al Sol: 4.37 años luz.' },
    Vega: { es: 'Vega', fact: 'A 25 años luz. Hace ~12,000 años fue la estrella polar y volverá a serlo dentro de ~13,000.' },
    Capella: { es: 'Capella', fact: 'En realidad son dos gigantes amarillas que giran juntas, a 43 años luz.' },
    Rigel: { es: 'Rigel', fact: 'Supergigante azul de Orión a ~860 años luz: brilla como ~120,000 soles.' },
    Procyon: { es: 'Proción', fact: 'A 11.5 años luz; como Sirio, tiene una enana blanca compañera.' },
    Betelgeuse: { es: 'Betelgeuse', fact: 'Supergigante roja de Orión a ~550–700 años luz. Puesta en lugar del Sol llegaría más allá de Marte. Explotará como supernova algún día (en los próximos ~100,000 años).' },
    Altair: { es: 'Altair', fact: 'A 17 años luz. Gira tan rápido (una vuelta cada ~9 horas) que está achatada.' },
    Aldebaran: { es: 'Aldebarán', fact: 'Gigante roja, el "ojo del Toro", a 65 años luz.' },
    Spica: { es: 'Espiga', fact: 'Dos estrellas azules muy calientes que se orbitan cada 4 días, a ~250 años luz.' },
    Antares: { es: 'Antares', fact: 'Supergigante roja, el "corazón del Escorpión", a ~550 años luz.' },
    Polaris: { es: 'Estrella Polar', fact: 'Casi alineada con el eje de la Tierra: no se mueve en el cielo. Está a ~430 años luz.' },
    Deneb: { es: 'Deneb', fact: 'Una de las estrellas más luminosas que conocemos, a unos 2,600 años luz (su distancia es incierta).' },
    Pollux: { es: 'Pólux', fact: 'Gigante naranja a 34 años luz; tiene un planeta gigante confirmado.' },
    Fomalhaut: { es: 'Fomalhaut', fact: 'A 25 años luz, rodeada por un disco de polvo fotografiado por Hubble y Webb.' },
    Regulus: { es: 'Régulo', fact: 'El "corazón del León", a 79 años luz; gira tan rápido que casi se deshace.' },
    Achernar: { es: 'Achernar', fact: 'La estrella más achatada conocida por su giro veloz, a ~140 años luz.' }
};

const starCatalog = { ready: false, stars: null, names: null, famous: [] };
const LY_PER_PC = 3.26156;

// Color aproximado de una estrella a partir de su índice B-V (azul caliente -> rojo frío).
function bvToColor(bv) {
    const stops = [[-0.4, [0.6, 0.7, 1.0]], [0.0, [0.82, 0.88, 1.0]], [0.4, [0.98, 0.97, 0.95]], [0.65, [1.0, 0.93, 0.8]], [1.0, [1.0, 0.8, 0.58]], [1.6, [1.0, 0.6, 0.38]]];
    if (bv <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) {
        if (bv <= stops[i][0]) {
            const [a, ca] = stops[i - 1], [b, cb] = stops[i];
            const t = (bv - a) / (b - a);
            return [ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t];
        }
    }
    return stops[stops.length - 1][1];
}

// Dirección en el cielo (coordenadas ecuatoriales -> eje Y hacia el polo norte celeste).
function raDecToDir(raHours, decDeg, out = new THREE.Vector3()) {
    const ra = raHours / 24 * Math.PI * 2, dec = THREE.MathUtils.degToRad(decDeg);
    return out.set(Math.cos(dec) * Math.cos(ra), Math.sin(dec), -Math.cos(dec) * Math.sin(ra));
}

const STAR_POINT_VS = `
    attribute float aSize;
    attribute vec3 aColor;
    varying vec3 vColor;
    void main() {
        vColor = aColor;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize;
        gl_Position = projectionMatrix * mv;
    }
`;
const STAR_POINT_FS = `
    uniform float uOpacity;
    varying vec3 vColor;
    void main() {
        vec2 q = gl_PointCoord - 0.5;
        float d = dot(q, q) * 4.0;
        if (d > 1.0) discard;
        float core = exp(-d * 5.0);
        gl_FragColor = vec4(vColor * (0.6 + core * 0.8), (core + exp(-d * 1.5) * 0.3) * uOpacity);
    }
`;

// Puntos de estrellas: en el cielo (radius) o en 3D según su distancia (scale años luz -> unidades).
function buildStarPoints(list, { radius = null, lyScale = 1, sizeMul = 1 } = {}) {
    const n = list.length;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), size = new Float32Array(n);
    const v = new THREE.Vector3();
    const pr = Math.min(2, renderer.getPixelRatio());
    list.forEach((s, i) => {
        raDecToDir(s[0], s[1], v);
        v.multiplyScalar(radius !== null ? radius : Math.max(0.5, s[4] * LY_PER_PC * lyScale));
        pos.set([v.x, v.y, v.z], i * 3);
        col.set(bvToColor(s[3]), i * 3);
        size[i] = Math.max(1.2, Math.min(9, (6.8 - s[2]) * 1.15)) * sizeMul * pr;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
    const pts = new THREE.Points(g, new THREE.ShaderMaterial({
        uniforms: { uOpacity: { value: 1 } }, vertexShader: STAR_POINT_VS, fragmentShader: STAR_POINT_FS,
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false
    }));
    pts.frustumCulled = false;
    return pts;
}

function loadStarCatalog() {
    if (starCatalog.promise) return starCatalog.promise;
    starCatalog.promise = fetch('assets/data/stars.json')
        .then(r => { if (!r.ok) throw new Error('stars.json ' + r.status); return r.json(); })
        .then(d => {
            starCatalog.stars = d.stars;
            starCatalog.names = d.names;
            starCatalog.famous = Object.keys(FAMOUS_STARS).filter(k => d.names[k] !== undefined)
                .map(k => ({ key: k, ...FAMOUS_STARS[k], star: d.stars[d.names[k]] }));
            starCatalog.ready = true;
            return starCatalog;
        });
    return starCatalog.promise;
}

// El cielo de fondo del simulador pasa a tener las estrellas reales.
loadStarCatalog().then(cat => {
    const sky = buildStarPoints(cat.stars, { radius: 380 });
    sky.renderOrder = -1;
    scene.add(sky);
}).catch(() => { /* sin catálogo (p. ej. abierto como file://): se queda el cielo procedural */ });
