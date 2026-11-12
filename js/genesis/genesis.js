/* -------------------------------------------------------------------------- */
/* GÉNESIS: HOW EACH BODY FORMED (SCIENTIFIC TIMELINE, PARTICLE SIMULATION)    */
/* modes: 0 protoplanetary/circumplanetary disk accretion, 1 nebula collapse, */
/*        2 supernova shell, 3 gas infall onto a black hole                    */
/* -------------------------------------------------------------------------- */
const GENESIS_TYPES = {
    rocky: { mode: 0, colors: [0xc79a6b, 0xffe2b8], growFrom: 0.38, growTo: 0.82 },
    gas:   { mode: 4, colors: [0x9fd8ff, 0xffd59e], growFrom: 0.30, growTo: 0.86 },
    star:  { mode: 1, colors: [0xff7a2a, 0xffe7a3], growFrom: 0.55, growTo: 0.8, flashAt: 0.62 },
    nova:  { mode: 2, colors: [0x7df9ff, 0xff4fa3], growFrom: 0.22, growTo: 0.4, flashAt: 0.14 },
    hole:  { mode: 3, colors: [0xffa040, 0x7df9ff], growFrom: 0.5, growTo: 0.9, flashAt: 0.72 }
};
// Camera framing per formation type: polar angle (phi), zoom % and orbit speed.
const GENESIS_CAMERA = {
    rocky: { phi: 1.05, zoom: 14, spin: 0.9 },
    gas:   { phi: 1.35, zoom: 4, spin: 0.5 },
    star:  { phi: 0.75, zoom: 0, spin: 0.35 },
    nova:  { phi: 1.45, zoom: 0, spin: 1.6 },
    hole:  { phi: 1.2, zoom: 10, spin: 1.2 }
};
const GENESIS = {
    sun: { fx: ['jets'], type: 'star', age: 'Hace 4,600 millones de años', steps: [
        ['Una nube molecular colapsa', 'Una nube de gas y polvo de la Vía Láctea, probablemente empujada por la onda de choque de una supernova cercana, empieza a hundirse por su propia gravedad.'],
        ['El giro la aplana en un disco', 'Al contraerse gira cada vez más rápido (conservación del momento angular) y se aplana. El centro se comprime y se calienta.'],
        ['Ignición de la protoestrella', 'El núcleo alcanza unos 10 millones de °C y se enciende la fusión de hidrógeno en helio: la presión de la luz frena el colapso.'],
        ['Nace el Sol', 'El 99.86% de la masa quedó en la estrella. El disco sobrante es la materia prima de todos los planetas.']
    ] },
    mercury: { fx: ['molten', { impact: { at: 0.62, size: 0.55, dir: [-1, 0.2, 0.5] } }], type: 'rocky', age: 'Hace 4,570 millones de años', steps: [
        ['Solo roca y metal', 'Tan cerca del joven Sol el hielo se evapora: en el disco solo sobreviven granos de silicato y hierro.'],
        ['De polvo a planetesimales', 'Los granos se pegan en guijarros y estos en planetesimales de kilómetros que chocan y se fusionan.'],
        ['Un impacto gigante', 'Una colisión violenta pudo arrancar gran parte del manto rocoso de Mercurio.'],
        ['Un planeta casi todo núcleo', 'Resultado: su núcleo de hierro ocupa el 85% del radio, el mayor proporcionalmente del Sistema Solar.']
    ] },
    venus: { fx: ['molten', { impact: { at: 0.5, size: 0.35, dir: [1, 0.3, 0.4] } }], type: 'rocky', age: 'Hace 4,560 millones de años', steps: [
        ['Zona interior del disco', 'Venus crece con roca y metal en la región caliente del disco, muy parecida a la de la Tierra.'],
        ['Choques de embriones', 'Embriones planetarios del tamaño de la Luna colisionan durante decenas de millones de años.'],
        ['Volcanes y CO₂', 'Su vulcanismo libera enormes cantidades de CO₂ y sin océanos estables que lo absorban se dispara el efecto invernadero.'],
        ['Un infierno gemelo', 'Hoy su superficie soporta 92 bar de presión y 465 °C, más caliente que Mercurio.']
    ] },
    earth: { fx: ['molten', { impact: { at: 0.62, size: 0.53, dir: [-1, 0.25, 0.6], debris: true } }], type: 'rocky', age: 'Hace 4,540 millones de años', steps: [
        ['Acreción en el disco', 'Polvo y roca orbitando el Sol se aglomeran en planetesimales que chocan sin parar.'],
        ['Una Tierra fundida', 'Los impactos la mantienen derretida: el hierro se hunde y forma el núcleo, la roca ligera flota y forma el manto.'],
        ['El impacto de Theia', 'Hace ~4,500 millones de años un cuerpo del tamaño de Marte choca con la Tierra. Los escombros formarán la Luna.'],
        ['Nacen los océanos', 'La corteza se enfría; el vapor volcánico y el agua de asteroides y cometas se condensan en océanos.']
    ] },
    moon: { fx: ['molten', { impact: { at: 0.22, size: 0.9, dir: [1, 0.15, 0.5], debris: true } }], type: 'rocky', age: 'Hace ~4,500 millones de años', steps: [
        ['Theia impacta la joven Tierra', 'Un protoplaneta del tamaño de Marte golpea a la Tierra en un ángulo oblicuo.'],
        ['Un anillo de roca vaporizada', 'Una nube de roca fundida y vapor queda en órbita alrededor de la Tierra.'],
        ['La Luna se agrega', 'Los escombros se juntan en la Luna en muy poco tiempo, quizás en menos de un siglo.'],
        ['Océano de magma', 'Al enfriarse forma la corteza clara de las tierras altas; después la lava rellena los mares oscuros.']
    ] },
    mars: { fx: ['molten', { impact: { at: 0.45, size: 0.25, dir: [-0.6, 0.6, 0.6] } }], type: 'rocky', age: 'Hace 4,600 millones de años', steps: [
        ['Crecimiento veloz', 'Marte se forma en solo 2–4 millones de años, muy rápido para un planeta rocoso.'],
        ['Júpiter le roba material', 'La migración de Júpiter vació su región del disco: Marte quedó con apenas el 11% de la masa terrestre.'],
        ['Pierde su escudo', 'Su núcleo se enfrió, se apagó el campo magnético y el viento solar arrancó la mayor parte de su atmósfera.'],
        ['Un desierto con ríos fósiles', 'Quedó frío y seco, con cauces de antiguos ríos y lagos como el cráter Jezero.']
    ] },
    jupiter: { fx: ['core'], type: 'gas', age: 'Hace ~4,600 millones de años', steps: [
        ['Más allá de la línea de hielo', 'Lejos del Sol el agua se congela: hay mucho más material sólido para construir planetas.'],
        ['Un núcleo de hielo y roca', 'En ~1 millón de años crece un núcleo de unas 10 masas terrestres.'],
        ['Acreción desbocada de gas', 'Su gravedad empieza a tragar hidrógeno y helio del disco cada vez más rápido.'],
        ['El primer planeta', 'Júpiter fue probablemente el primer planeta: 318 masas terrestres que moldearon todo el Sistema Solar.']
    ] },
    saturn: { fx: ['core', 'rings'], type: 'gas', age: 'Hace ~4,500 millones de años', steps: [
        ['Núcleo helado lejano', 'Más lejos que Júpiter, su núcleo de hielo y roca crece más despacio.'],
        ['Gas, pero tarde', 'Captura hidrógeno y helio mientras el disco se disipa: termina con 95 masas terrestres.'],
        ['El planeta menos denso', 'Su densidad media es menor que la del agua: flotaría en un océano gigante.'],
        ['Anillos jóvenes', 'Sus anillos podrían ser recientes: restos de una luna o cometa despedazado por la marea hace 100–400 millones de años.']
    ] },
    uranus: { fx: ['core', { impact: { at: 0.68, size: 0.45, dir: [1, -0.2, 0.5] } }, 'tilt'], type: 'gas', age: 'Hace ~4,500 millones de años', steps: [
        ['Gigante de hielo', 'En la parte fría y externa del disco crece un núcleo de hielo de agua, amoníaco y metano.'],
        ['Llegó tarde al gas', 'El gas del disco casi se había ido: solo capturó una envoltura delgada de hidrógeno y helio.'],
        ['Un golpe que lo tumbó', 'Un impacto gigante, o varios, lo dejó girando de lado con una inclinación de 98°.'],
        ['Migración hacia afuera', 'Según el modelo de Niza, los gigantes migraron y dispersaron cometas por todo el Sistema Solar.']
    ] },
    neptune: { fx: ['core'], type: 'gas', age: 'Hace ~4,500 millones de años', steps: [
        ['Nace más cerca del Sol', 'Neptuno probablemente se formó más adentro y migró hacia afuera.'],
        ['Envoltura delgada', 'Como Urano, es un gigante de hielo con poca capa de hidrógeno y helio.'],
        ['Empuja el cinturón de Kuiper', 'Su migración atrapó a Plutón y a miles de objetos helados en resonancia.'],
        ['Captura a Tritón', 'Tritón, un objeto del cinturón de Kuiper, quedó atrapado en una órbita retrógrada.']
    ] },
    io: { fx: ['molten', 'plumes'], type: 'rocky', age: 'Hace ~4,500 millones de años', steps: [
        ['Un mini sistema solar', 'Alrededor del joven Júpiter se forma un disco de gas y polvo: un sistema solar en miniatura.'],
        ['Demasiado cerca para el hielo', 'El calor de Júpiter evapora el hielo cerca de él: Ío se forma de roca.'],
        ['Resonancia 1:2:4', 'Ío, Europa y Ganímedes quedan sincronizadas y sus órbitas nunca dejan de ser elípticas.'],
        ['Calentado por marea', 'La marea de Júpiter amasa su interior hasta fundirlo: nace el mundo más volcánico conocido.']
    ] },
    europa: { fx: ['frost'], type: 'rocky', age: 'Hace ~4,500 millones de años', steps: [
        ['Disco circumjoviano', 'Europa crece dentro del disco de gas y polvo que rodeaba a Júpiter.'],
        ['Roca con agua', 'Se forma lo bastante lejos para conservar agua: una capa de unos 100 km cubre su núcleo rocoso.'],
        ['Marea y calor interno', 'La resonancia con Ío y Ganímedes flexiona su interior y genera calor.'],
        ['Un océano escondido', 'Ese calor mantiene líquido un océano salado bajo la corteza de hielo: candidato a albergar vida.']
    ] },
    titan: { fx: ['frost'], type: 'rocky', age: 'Hace ~4,500 millones de años', steps: [
        ['El disco de Saturno', 'Alrededor de Saturno se forma un disco rico en hielo, amoníaco y polvo.'],
        ['La luna dominante', 'Titán acapara el 96% de toda la masa que orbita a Saturno.'],
        ['Una atmósfera desde dentro', 'El amoníaco de su interior se transforma en nitrógeno y el metano escapa a la superficie.'],
        ['Neblina de tolinas', 'La luz ultravioleta rompe el metano y forma tolinas: la neblina naranja que lo envuelve.']
    ] },
    pluto: { fx: [{ impact: { at: 0.6, size: 0.5, dir: [-1, 0.3, 0.4], debris: true } }, 'charon'], type: 'rocky', age: 'Hace ~4,500 millones de años', steps: [
        ['El borde helado del disco', 'Más allá de Neptuno el material es una mezcla de hielo y roca a -230 °C.'],
        ['Crecimiento lento', 'Los planetesimales se juntan muy despacio y nunca alcanzan tamaño planetario.'],
        ['Nace Caronte', 'Un impacto gigante crea a Caronte, igual que la Luna nació de la Tierra.'],
        ['Atrapado por Neptuno', 'La migración de Neptuno lo encierra en resonancia 3:2 dentro del cinturón de Kuiper.']
    ] },
    pulsar: { fx: ['supergiant'], type: 'nova', age: 'Hace ~11,000 años', steps: [
        ['Una estrella gigante agoniza', 'Una estrella de 8 a 20 masas solares quema su combustible en solo ~10 millones de años.'],
        ['Supernova', 'Su núcleo de hierro colapsa en menos de un segundo, rebota y la estrella explota: así nació el remanente de Vela.'],
        ['Materia de neutrones', 'Protones y electrones se fusionan en neutrones: 1.4 masas solares en una esfera de 10 km.'],
        ['Un faro cósmico', 'Al encogerse gira cada vez más rápido: 11 vueltas por segundo con haces de radio que barren el espacio.']
    ] },
    gargantua: { fx: ['spinup'], type: 'hole', age: 'Miles de millones de años', steps: [
        ['Una semilla', 'Los agujeros negros supermasivos nacen de estrellas colapsadas o de nubes de gas que colapsan directamente.'],
        ['Crecimiento por fusiones', 'Durante miles de millones de años devoran gas y se fusionan con otros agujeros negros.'],
        ['Disco de acreción', 'El gas que cae gira cada vez más rápido y se calienta a millones de grados: brilla más que galaxias enteras.'],
        ['Horizonte de sucesos', 'Millones de masas solares quedan ocultas tras un horizonte del que ni la luz escapa.']
    ] }
};

const genesisVertexShader = `
    attribute vec4 aSeed;
    uniform float uP;
    uniform float uMode;
    uniform float uTime;
    uniform float uSize;
    uniform float uFinalR;
    varying float vMix;
    void main() {
        float r0 = aSeed.x;
        float a0 = aSeed.y;
        float h0 = aSeed.z;
        float rnd = aSeed.w;
        float p = clamp(uP * (0.7 + rnd * 0.6), 0.0, 1.0);
        float e = 1.0 - pow(1.0 - p, 3.0);
        float ring = sqrt(max(0.0, 1.0 - h0 * h0));
        vec3 dir = vec3(cos(a0) * ring, h0, sin(a0) * ring);
        vec3 pos;
        if (uMode < 0.5) {
            float r = mix(r0, uFinalR, e);
            float a = a0 + uTime * (2.4 / max(r, 0.6));
            pos = vec3(cos(a) * r, h0 * 0.5 * (1.0 - e), sin(a) * r);
        } else if (uMode < 1.5) {
            float r = mix(r0, uFinalR, e);
            float a = uTime * (1.6 / max(r, 0.6)) * (0.2 + e);
            vec3 d = vec3(dir.x * cos(a) - dir.z * sin(a), dir.y * (1.0 - e * 0.85), dir.x * sin(a) + dir.z * cos(a));
            pos = d * r;
        } else if (uMode < 2.5) {
            pos = dir * mix(uFinalR, r0 * 1.9, e);
        } else if (uMode < 3.5) {
            float r = mix(r0 * 1.3, uFinalR, e);
            float a = a0 + uTime * (2.0 / max(r, 0.6)) * e;
            pos = vec3(cos(a) * r * ring, h0 * r * (1.0 - e * 0.92), sin(a) * r * ring);
        } else {
            float r = mix(r0, uFinalR * 1.18, e);
            float band = floor((h0 * 0.5 + 0.5) * 11.0);
            float dirB = mod(band, 2.0) * 2.0 - 1.0;
            float a = a0 + uTime * (0.35 + e * 1.1) * dirB;
            pos = vec3(cos(a) * r * ring, h0 * r * mix(1.0, 0.86, e), sin(a) * r * ring);
        }
        vMix = rnd;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = uSize * (0.5 + rnd) * (30.0 / max(0.5, -mv.z));
        gl_Position = projectionMatrix * mv;
    }
`;
const genesisFragmentShader = `
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform float uAlpha;
    varying float vMix;
    void main() {
        float d = length(gl_PointCoord - 0.5);
        float soft = 1.0 - smoothstep(0.0, 0.5, d);
        gl_FragColor = vec4(mix(uColorA, uColorB, vMix), soft * uAlpha);
    }
`;

const GENESIS_COUNT = isCoarsePointer ? 3500 : 7000;
const genesisGeo = new THREE.BufferGeometry();
const genesisSeeds = new Float32Array(GENESIS_COUNT * 4);
genesisGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(GENESIS_COUNT * 3), 3));
genesisGeo.setAttribute('aSeed', new THREE.BufferAttribute(genesisSeeds, 4));
const genesisMat = new THREE.ShaderMaterial({
    vertexShader: genesisVertexShader,
    fragmentShader: genesisFragmentShader,
    uniforms: {
        uP: { value: 0 }, uMode: { value: 0 }, uTime: { value: 0 }, uSize: { value: 2.2 },
        uFinalR: { value: 2.4 }, uAlpha: { value: 0 },
        uColorA: { value: new THREE.Color() }, uColorB: { value: new THREE.Color() }
    },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
});
const genesisCloud = new THREE.Points(genesisGeo, genesisMat);
genesisCloud.frustumCulled = false;
genesisCloud.visible = false;
scene.add(genesisCloud);
const genesisFlash = makeGlowSprite(0xffffff, 1, 0);
genesisFlash.visible = false;
scene.add(genesisFlash);

const genesisDom = {
    card: document.getElementById('genesis-card'),
    kicker: document.getElementById('genesis-kicker'),
    step: document.getElementById('genesis-step'),
    title: document.getElementById('genesis-title'),
    text: document.getElementById('genesis-text'),
    bar: document.getElementById('genesis-bar')
};
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const genesis = { active: false, target: null, start: 0, duration: 16000, stepIdx: -1, scaled: [] };

function seedGenesis(mode, finalR) {
    for (let i = 0; i < GENESIS_COUNT; i++) {
        const i4 = i * 4;
        const disk = mode === 0;
        genesisSeeds[i4] = disk ? finalR * 1.6 + Math.pow(Math.random(), 0.7) * 12 : finalR * 2.5 + Math.random() * 10;
        genesisSeeds[i4 + 1] = Math.random() * Math.PI * 2;
        genesisSeeds[i4 + 2] = disk ? (Math.random() - 0.5) * 1.2 : Math.random() * 2 - 1;
        genesisSeeds[i4 + 3] = Math.random();
    }
    genesisGeo.attributes.aSeed.needsUpdate = true;
}

function setGenesisScale(k, lateK = k) {
    genesis.scaled.forEach(({ obj, base }) => {
        const f = obj.userData.genesisLate ? lateK : k;
        obj.scale.copy(base).multiplyScalar(Math.max(0.0001, f));
    });
}

// Temporary actors that make each formation story different.
const genesisFx = new THREE.Group();
genesisFx.visible = false;
scene.add(genesisFx);
const DEBRIS_COUNT = 900;
const debrisGeo = new THREE.BufferGeometry();
debrisGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(DEBRIS_COUNT * 3), 3));
const debrisVel = new Float32Array(DEBRIS_COUNT * 3);
const debrisPoints = new THREE.Points(debrisGeo, new THREE.PointsMaterial({
    map: roundDotTexture, color: 0xffb070, size: 0.16, transparent: true, opacity: 0,
    blending: THREE.AdditiveBlending, depthWrite: false
}));
debrisPoints.frustumCulled = false;
genesisFx.add(debrisPoints);

const impactorMat = new THREE.MeshPhongMaterial({ color: 0x8a7766, emissive: 0x3a1204, shininess: 4 });
const impactor = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), impactorMat);
genesisFx.add(impactor);

const moltenMat = new THREE.MeshBasicMaterial({ color: 0xff5a14, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
const moltenShell = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), moltenMat);
genesisFx.add(moltenShell);

const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), new THREE.MeshPhongMaterial({ color: 0x6b5644, emissive: 0x2a0d00, shininess: 3 }));
genesisFx.add(coreMesh);

const supergiant = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), new THREE.MeshBasicMaterial({ color: 0xff4a1c, transparent: true, opacity: 0.95 }));
genesisFx.add(supergiant);
const supergiantGlow = makeGlowSprite(0xff5a2a, 1, 0.9);
genesisFx.add(supergiantGlow);

const jetMatG = new THREE.MeshBasicMaterial({ color: 0xffd08a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false });
const jetN = new THREE.Mesh(new THREE.ConeGeometry(0.9, 12, 32, 1, true), jetMatG);
jetN.position.y = 6.4; jetN.rotation.x = Math.PI;
const jetS = new THREE.Mesh(new THREE.ConeGeometry(0.9, 12, 32, 1, true), jetMatG);
jetS.position.y = -6.4;
const jets = new THREE.Group();
jets.add(jetN, jetS);
jets.rotation.z = 0.25;
genesisFx.add(jets);

const frostMat = new THREE.MeshBasicMaterial({ color: 0xbfe6ff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
const frostShell = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 48), frostMat);
genesisFx.add(frostShell);

const smooth01 = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const hasFx = (name) => genesis.fx.some(f => f === name);
const impactFx = () => { const f = genesis.fx.find(f => typeof f === 'object' && f.impact); return f ? f.impact : null; };

function showGenesisStep(idx) {
    const cfg = GENESIS[genesis.target];
    const step = cfg.steps[idx];
    genesisDom.step.classList.add('is-swapping');
    setTimeout(() => {
        genesisDom.title.textContent = `${idx + 1}/4 · ${step[0]}`;
        genesisDom.text.textContent = step[1];
        genesisDom.step.classList.remove('is-swapping');
    }, 160);
}

function startGenesis(targetId) {
    const cfg = GENESIS[targetId];
    if (!cfg) return;
    if (genesis.active) stopGenesis();
    if (state.currentTarget !== targetId) switchTarget(targetId);
    const type = GENESIS_TYPES[cfg.type];
    const group = targetGroups[targetId];
    genesis.scaled = group.children
        .filter(c => !c.userData.backdrop)
        .map(obj => ({ obj, base: obj.scale.clone() }));
    const mainMesh = group.children[0];
    const finalR = mainMesh && mainMesh.geometry && mainMesh.geometry.parameters.radius
        ? mainMesh.geometry.parameters.radius : 2.2;

    seedGenesis(type.mode, finalR);
    genesisMat.uniforms.uMode.value = type.mode;
    genesisMat.uniforms.uFinalR.value = type.mode === 2 ? finalR * 0.6 : finalR;
    genesisMat.uniforms.uColorA.value.set(type.colors[0]);
    genesisMat.uniforms.uColorB.value.setRGB(...(ASTRO_TARGETS[targetId].atmoColor || [1, 1, 1]));
    genesisMat.uniforms.uColorB.value.lerp(new THREE.Color(type.colors[1]), 0.35);
    genesisMat.uniforms.uP.value = 0;
    genesisMat.uniforms.uAlpha.value = 0;
    genesisCloud.visible = true;

    genesis.active = true;
    genesis.target = targetId;
    genesis.type = type;
    genesis.fx = cfg.fx || [];
    genesis.finalR = finalR;
    genesis.baseRotZ = group.rotation.z;
    genesisFx.visible = true;
    genesisFx.position.copy(group.position);
    [impactor, moltenShell, coreMesh, supergiant, supergiantGlow, jets, frostShell, debrisPoints].forEach(o => { o.visible = false; });
    moltenShell.scale.setScalar(finalR * 1.012);
    frostShell.scale.setScalar(finalR * 1.02);
    coreMesh.scale.setScalar(finalR * 0.32);
    const imp = impactFx();
    if (imp) {
        impactor.scale.setScalar(finalR * imp.size);
        genesis.impDir = new THREE.Vector3(...imp.dir).normalize();
        const contact = genesis.impDir.clone().multiplyScalar(finalR * (1 + imp.size * 0.6));
        const pos = debrisGeo.attributes.position.array;
        for (let i = 0; i < DEBRIS_COUNT; i++) {
            pos[i * 3] = contact.x; pos[i * 3 + 1] = contact.y; pos[i * 3 + 2] = contact.z;
            const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().add(genesis.impDir.clone().multiplyScalar(0.9)).normalize();
            const sp = 2 + Math.random() * 7;
            debrisVel[i * 3] = v.x * sp; debrisVel[i * 3 + 1] = v.y * sp; debrisVel[i * 3 + 2] = v.z * sp;
        }
        genesis.contact = contact;
        debrisGeo.attributes.position.needsUpdate = true;
    }
    if (targetId === 'io') ioPlumes.visible = false;
    genesis.duration = reduceMotion.matches ? 7000 : 10000;
    genesis.start = performance.now();
    genesis.stepIdx = -1;
    setGenesisScale(type.mode === 2 ? 0 : 0.0001);

    const cam = GENESIS_CAMERA[cfg.type] || GENESIS_CAMERA.rocky;
    dom.descentSlider.value = cam.zoom;
    updateRelativityTelemetry(cam.zoom);
    genesis.cam = cam;
    genesis.prevAutoRotate = controls.autoRotate;
    genesis.prevAutoRotateSpeed = controls.autoRotateSpeed;
    controls.autoRotate = !reduceMotion.matches;
    controls.autoRotateSpeed = cam.spin * (Object.keys(GENESIS).indexOf(targetId) % 2 ? -1 : 1);
    const off = camera.position.clone().sub(controls.target);
    const sph = new THREE.Spherical().setFromVector3(off);
    sph.phi = cam.phi;
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sph));
    controls.update();

    genesisDom.kicker.textContent = `GÉNESIS · ${cfg.age}`;
    genesisDom.card.hidden = false;
    requestAnimationFrame(() => genesisDom.card.classList.add('is-on'));
    if (audioEngine.isPlaying) audioEngine.playTelemetryPing();
}

function stopGenesis() {
    if (!genesis.active) return;
    genesis.active = false;
    controls.autoRotate = !!genesis.prevAutoRotate;
    controls.autoRotateSpeed = genesis.prevAutoRotateSpeed || 2;
    setGenesisScale(1);
    if (genesis.target && targetGroups[genesis.target]) targetGroups[genesis.target].rotation.z = genesis.baseRotZ || 0;
    ioPlumes.visible = true;
    genesisFx.visible = false;
    genesisCloud.visible = false;
    genesisFlash.visible = false;
    genesisDom.card.classList.remove('is-on');
    setTimeout(() => { if (!genesis.active) genesisDom.card.hidden = true; }, 260);
}

function updateGenesis(elapsedTime) {
    if (!genesis.active) return;
    const prog = Math.min(1, (performance.now() - genesis.start) / genesis.duration);
    const type = genesis.type;
    const u = genesisMat.uniforms;
    u.uTime.value = elapsedTime;

    // particles: fade in, contract (or explode), fade out
    u.uP.value = Math.min(1, Math.max(0, (prog - 0.06) / 0.72));
    u.uAlpha.value = Math.min(1, prog / 0.08) * (1 - Math.max(0, (prog - 0.84) / 0.16)) * 0.9;

    const R = genesis.finalR;
    const group = targetGroups[genesis.target];

    // the body grows out of the cloud (gas giants: rocky core first, then the envelope)
    let growFrom = type.growFrom;
    if (hasFx('core')) {
        growFrom = 0.48;
        const c = smooth01(0.18, 0.4, prog);
        coreMesh.visible = c > 0.001 && prog < 0.75;
        coreMesh.scale.setScalar(R * 0.32 * c);
    }
    const g = Math.min(1, Math.max(0, (prog - growFrom) / (type.growTo - growFrom)));
    const lateK = hasFx('rings') ? smooth01(0.8, 0.97, prog) : (hasFx('charon') ? smooth01(0.7, 0.9, prog) : 1 - Math.pow(1 - g, 3));
    setGenesisScale(1 - Math.pow(1 - g, 3), lateK);

    // hot, molten proto-planet that cools down
    if (hasFx('molten')) {
        const heat = g * (1 - smooth01(0.6, 0.97, prog));
        moltenShell.visible = heat > 0.01;
        moltenMat.opacity = heat * 0.85;
        moltenShell.scale.setScalar(R * 1.012 * Math.max(0.001, 1 - Math.pow(1 - g, 3)));
    }
    // icy moons: frost settles over the surface at the end
    if (hasFx('frost')) {
        const fr = smooth01(0.7, 0.85, prog) * (1 - smooth01(0.88, 1.0, prog));
        frostShell.visible = fr > 0.01;
        frostMat.color.set(genesis.target === 'titan' ? 0xffa040 : 0xbfe6ff);
        frostMat.opacity = fr * 0.5;
    }
    // protostar bipolar jets
    if (hasFx('jets')) {
        const jt = smooth01(0.3, 0.42, prog) * (1 - smooth01(0.62, 0.75, prog));
        jets.visible = jt > 0.01;
        jetMatG.opacity = jt * 0.55;
        jets.rotation.y = elapsedTime * 0.6;
    }
    // red supergiant that collapses before the supernova
    if (hasFx('supergiant')) {
        const life = 1 - smooth01(0.1, 0.15, prog);
        const swell = 6 + Math.sin(elapsedTime * 2.2) * 0.25 + prog * 6;
        supergiant.visible = life > 0.01;
        supergiantGlow.visible = life > 0.01;
        supergiant.scale.setScalar(swell * life);
        supergiantGlow.scale.set(swell * 3.2 * life, swell * 3.2 * life, 1);
        genesisCloud.visible = prog > 0.12;
    }
    // giant impact (Theia, Charon, the blow that tilted Uranus)
    const imp = impactFx();
    let impactFlash = 0;
    if (imp) {
        const t0 = imp.at - 0.16;
        const k = smooth01(t0, imp.at, prog);
        impactor.visible = prog > t0 && prog < imp.at + 0.01;
        const far = genesis.impDir.clone().multiplyScalar(R * 9).add(new THREE.Vector3(0, R * 1.5, 0));
        impactor.position.copy(far).lerp(genesis.contact, k * k);
        impactFlash = Math.max(0, 1 - Math.abs(prog - imp.at) / 0.035);
        {
            const dt = prog - imp.at;
            debrisPoints.visible = dt > 0 && dt < 0.3;
            if (debrisPoints.visible) {
                const pos = debrisGeo.attributes.position.array;
                const tt = dt * genesis.duration / 1000;
                const settle = imp.debris ? smooth01(0.08, 0.3, dt) : 0;
                for (let i = 0; i < DEBRIS_COUNT; i++) {
                    const e = 1 - Math.exp(-tt * 1.6);
                    let x = genesis.contact.x + debrisVel[i * 3] * e;
                    let y = genesis.contact.y + debrisVel[i * 3 + 1] * e * 0.35;
                    let z = genesis.contact.z + debrisVel[i * 3 + 2] * e;
                    if (settle > 0) {
                        const a = Math.atan2(z, x) + tt * 0.8;
                        const r = Math.hypot(x, z);
                        x = x * (1 - settle) + Math.cos(a) * r * settle;
                        z = z * (1 - settle) + Math.sin(a) * r * settle;
                        y *= 1 - settle;
                    }
                    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
                }
                debrisGeo.attributes.position.needsUpdate = true;
                debrisPoints.material.opacity = (1 - smooth01(0.18, 0.3, dt)) * 0.9;
            }
        }
        if (hasFx('tilt')) {
            group.rotation.z = (genesis.baseRotZ || 0) + (1 - smooth01(imp.at, imp.at + 0.12, prog)) * -1.6 + 0;
        }
    }
    // volcanoes ignite once Io is fully formed
    if (hasFx('plumes')) ioPlumes.visible = prog > 0.82;
    // black hole: the disk spins up hard
    if (hasFx('spinup')) {
        accretionDisk.rotation.z = elapsedTime * (0.2 + smooth01(0.5, 0.95, prog) * 2.5);
    }

    // ignition / explosion / impact flash
    const typeFlash = type.flashAt !== undefined ? Math.max(0, 1 - Math.abs(prog - type.flashAt) / 0.06) : 0;
    const f = Math.max(typeFlash, impactFlash);
    genesisFlash.visible = f > 0.001;
    if (genesisFlash.visible) {
        genesisFlash.material.opacity = f;
        const size = (impactFlash > typeFlash ? 4 : 6) + f * (impactFlash > typeFlash ? 14 : 30);
        genesisFlash.scale.set(size, size, 1);
        genesisFlash.position.copy(group.position);
        if (impactFlash > typeFlash && genesis.contact) genesisFlash.position.add(genesis.contact);
    }

    const stepIdx = Math.min(3, Math.floor(prog * 4));
    if (stepIdx !== genesis.stepIdx) {
        genesis.stepIdx = stepIdx;
        showGenesisStep(stepIdx);
    }
    genesisDom.bar.style.transform = `scaleX(${prog.toFixed(4)})`;

    if (prog >= 1) stopGenesis();
}

document.getElementById('genesis-btn')?.addEventListener('click', () => {
    audioEngine.playClickTone(660, 0.08);
    startGenesis(state.currentTarget);
});
document.getElementById('genesis-skip')?.addEventListener('click', () => {
    audioEngine.playClickTone(440, 0.05);
    stopGenesis();
});
