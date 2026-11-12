/* -------------------------------------------------------------------------- */
/* 12 ASTROPHYSICAL TARGET DEFINITIONS + NASA API QUERIES & TEXTURE URLS      */
/* -------------------------------------------------------------------------- */
const TEX = 'assets/textures/';
const AUDIO = 'assets/audio/';
// id -> file inside assets/audio (e.g. saturn: 'saturn.ogg'). Only listed ids request a recording.
// Real recordings / sonifications: NASA (Sun sonification, EMFISIS chorus, Juno Waves at Ganymede),
// NASA/CXC Chandra (Vela pulsar, Perseus black hole).
const AUDIO_FILES = {
    sun: 'sun.mp3',
    earth: 'earth.mp3',
    jupiter: 'jupiter.mp3',
    pulsar: 'pulsar.mp3',
    gargantua: 'gargantua.mp3'
};
const ASTRO_TARGETS = {
    sun: {
        id: 'sun', name: 'SOL (ESTRELLA G2V)', colorClass: 'text-yellow-300',
        nasaQuery: 'Sun Solar Dynamics Observatory flare',
        textureUrl: TEX + 'sun.jpg', textureFallback: 'https://upload.wikimedia.org/wikipedia/commons/c/cb/Solarsystemscope_texture_2k_sun.jpg',
        atmoColor: [1.0, 0.58, 0.08],
        lockTitle: 'OBJETIVO: SOL (1.0 M☉ · PLASMA TERMONUCLEAR)',
        realRadiusText: '696,340 km', rsRealText: 'r_s = 2.95 km',
        soundscapeName: 'CONVECCIÓN SOLAR', unitLabel: 'R_☉', gravityLabel: 'GRAVEDAD SOLAR',
        comparisonPill: 'ESTRELLA G2V (PLASMA)', surfaceG: 27.9, baseZ: 2.12e-6,
        timeDriftText: '+66.8 seg por año',
        summary: 'Granulación fotosférica turbulenta y rugido acústico de convección nuclear.',
        milestones: [
            { val: '15 R_☉', lbl: 'Órbita Parker' },
            { val: '5.0 R_☉', lbl: 'Corona Exterior' },
            { val: '1.8 R_☉', lbl: 'Llamaradas' },
            { val: '1.05 R_☉', lbl: 'Fotosfera (28G)' }
        ],
        stories: [
            ['SOL // SONDA PARKER', 'Viento Solar Supersónico', 'El Sol concentra el 99.86% de la masa del Sistema Solar. Su radio de Schwarzschild es de 2.95 km, oculto profundamente bajo 696,340 km de plasma.'],
            ['SOL // CORONA SOLAR', 'Inmersión en Plasma Magnético', 'La temperatura coronal supera el millón de grados. La gravedad aquí desvía la luz de las estrellas de fondo en 1.75 segundos de arco (experimento de Eddington de 1919).'],
            ['SOL // FOTOSFERA (27.9 G)', 'Aplastamiento Gravitatorio Solar', 'En la superficie solar pesas 28 veces más que en la Tierra y un reloj pierde 67 segundos cada año debido a la dilatación temporal gravitacional.']
        ]
    },
    mercury: {
        id: 'mercury', name: 'MERCURIO', colorClass: 'text-stone-300',
        nasaQuery: 'Mercury MESSENGER planet crater',
        textureUrl: TEX + 'mercury.jpg', textureFallback: 'https://upload.wikimedia.org/wikipedia/commons/9/92/Solarsystemscope_texture_2k_mercury.jpg',
        atmoColor: [0.65, 0.62, 0.58],
        lockTitle: 'OBJETIVO: MERCURIO (0.055 M⊕ · PRECESIÓN RELATIVISTA)',
        realRadiusText: '2,439.7 km', rsRealText: 'r_s = 0.48 mm',
        soundscapeName: 'VIENTO SOLAR MERCURIO', unitLabel: 'R_mer', gravityLabel: 'GRAVEDAD LOCAL',
        comparisonPill: 'PLANETA ROCOSO INTERIOR', surfaceG: 0.38, baseZ: 1.0e-10,
        timeDriftText: '+3.1 ms por año (Local)',
        summary: 'Corteza basáltica hipercraterizada medida por la sonda MESSENGER; su órbita probó la Relatividad de Einstein.',
        milestones: [
            { val: '15 R_m', lbl: 'Aproximación' },
            { val: '5.0 R_m', lbl: 'Exosfera Sodio' },
            { val: '2.0 R_m', lbl: 'Cuenca Caloris' },
            { val: '1.05 R_m', lbl: 'Regolito (0.38G)' }
        ],
        stories: [
            ['MERCURIO // ÓRBITA MESSENGER', 'El Planeta que Confirmó a Einstein', 'Mercurio está tan cerca del pozo gravitacional del Sol que su órbita precesa 43 segundos de arco por siglo, algo inexplicable sin la Relatividad General.'],
            ['MERCURIO // CUENCA CALORIS Y RAYOS DE IMPACTO', 'Geología Real Captada por MESSENGER', 'Su superficie sin erosión atmosférica conserva cráteres con rayos brillantes de silicatos y enormes acantilados lobulados (rupes) formados al enfriarse su núcleo de hierro.'],
            ['MERCURIO // SUPERFICIE CRATERIZADA', 'Baja Gravedad Escarpada (0.38 G)', 'Sobre sus llanuras volcánicas y cráteres sientes apenas el 38% de la gravedad terrestre.']
        ]
    },
    venus: {
        id: 'venus', name: 'VENUS', colorClass: 'text-amber-300',
        nasaQuery: 'Venus Magellan clouds planet',
        textureUrl: TEX + 'venus_atmosphere.jpg', textureFallback: 'https://upload.wikimedia.org/wikipedia/commons/6/63/Solarsystemscope_texture_2k_venus_atmosphere.jpg',
        atmoColor: [1.0, 0.78, 0.35],
        lockTitle: 'OBJETIVO: VENUS (0.815 M⊕ · SUPERROTACIÓN ÁCIDA)',
        realRadiusText: '6,051.8 km', rsRealText: 'r_s = 7.24 mm',
        soundscapeName: 'PRESIÓN BAROMÉTRICA 92 BAR', unitLabel: 'R_ven', gravityLabel: 'GRAVEDAD LOCAL',
        comparisonPill: 'MUNDO INVERNADERO', surfaceG: 0.904, baseZ: 6.0e-10,
        timeDriftText: '+18.9 ms por año',
        summary: 'Nubes densas de ácido sulfúrico en superrotación y resonancia acústica profunda.',
        milestones: [
            { val: '15 R_v', lbl: 'Órbita Akatsuki' },
            { val: '4.5 R_v', lbl: 'Vórtice Polar' },
            { val: '1.8 R_v', lbl: 'Nubes H₂SO₄' },
            { val: '1.05 R_v', lbl: 'Domo Térmico' }
        ],
        stories: [
            ['VENUS // VELO SULFÚRICO', 'El Gemelo Atmosférico Extremo', 'Las nubes de ácido sulfúrico reflejan el 75% de la luz solar. Para convertir a Venus en un agujero negro habría que comprimirlo a 7.24 milímetros.'],
            ['VENUS // SUPERROTACIÓN', 'Vientos Huracanados de 360 km/h', 'La atmósfera superior da la vuelta al planeta en solo 4 días terrestres mientras el suelo gira lentamente en sentido retrógrado.'],
            ['VENUS // DENSA CAPA INFERIOR', 'Gravedad Casi Terrestre (0.90 G)', 'Con una gravedad del 90% de la Tierra, la dilatación temporal es de apenas 19 milisegundos por año.']
        ]
    },
    earth: {
        id: 'earth', name: 'TIERRA', colorClass: 'text-sky-400',
        nasaQuery: 'Earth Blue Marble ISS planet',
        textureUrl: TEX + 'earth_atmos_2048.jpg',
        normalUrl: TEX + 'earth_normal_2048.jpg',
        specularUrl: TEX + 'earth_specular_2048.jpg',
        cloudsUrl: TEX + 'earth_clouds_1024.png',
        nightUrl: TEX + 'earth_lights_2048.png',
        atmoColor: [0.18, 0.65, 1.0],
        lockTitle: 'OBJETIVO: TIERRA (1.0 M⊕ · REFERENCIA HUMANA Y GPS)',
        realRadiusText: '6,371 km', rsRealText: 'r_s = 8.87 mm (Canica)',
        soundscapeName: 'CORO MAGNETOSFERA VAN ALLEN', unitLabel: 'R_⊕', gravityLabel: 'GRAVEDAD BASE',
        comparisonPill: 'REFERENCIA HUMANA (1.00 G)', surfaceG: 1.00, baseZ: 6.95e-10,
        timeDriftText: '+21.9 ms por año (Satélites GPS)',
        summary: 'Océanos especulares, nubes dinámicas y corrección relativista obligatoria en satélites GPS.',
        milestones: [
            { val: '15 R_⊕', lbl: 'Órbita GPS' },
            { val: '5.0 R_⊕', lbl: 'Van Allen' },
            { val: '1.8 R_⊕', lbl: 'Órbita ISS' },
            { val: '1.05 R_⊕', lbl: 'Atmósfera (1G)' }
        ],
        stories: [
            ['TIERRA // CONSTELACIÓN GPS', 'Relatividad en tu Teléfono Móvil', 'Los relojes de los satélites GPS laten 45 microsegundos más rápido cada día porque están más lejos de la curvatura gravitacional terrestre.'],
            ['TIERRA // CINTURONES DE VAN ALLEN', 'Coro Electromagnético Terrestre', 'La magnetosfera atrapa partículas solares generando ondas de plasma audibles en radio llamadas "Dawn Chorus".'],
            ['TIERRA // ÓRBITA BAJA (1.0 G)', 'La Canica de Schwarzschild (8.87 mm)', 'Si comprimiéramos toda la masa de la Tierra dentro de una esfera de 8.87 milímetros, se convertiría en un agujero negro.']
        ]
    },
    moon: {
        id: 'moon', name: 'LUNA', colorClass: 'text-slate-300',
        nasaQuery: 'Moon Lunar Reconnaissance Orbiter craters',
        textureUrl: TEX + 'moon.jpg', textureFallback: TEX + 'moon_1024.jpg', textureFallback2: 'https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/planets/moon_1024.jpg',
        atmoColor: [0.6, 0.65, 0.7],
        lockTitle: 'OBJETIVO: LUNA (0.012 M⊕ · MARES BASÁLTICOS)',
        realRadiusText: '1,737.4 km', rsRealText: 'r_s = 0.109 mm',
        soundscapeName: 'SILENCIO CÓSMICO LUNAR', unitLabel: 'R_luna', gravityLabel: 'MICRO-GRAVEDAD',
        comparisonPill: 'SATÉLITE NATURAL (0.16 G)', surfaceG: 0.165, baseZ: 3.1e-11,
        timeDriftText: '+0.98 ms por año',
        summary: 'Cráteres de impacto LRO con sombras duras y relojes que adelantan 56 microsegundos/día frente a la Tierra.',
        milestones: [
            { val: '15 R_L', lbl: 'Gateway' },
            { val: '5.0 R_L', lbl: 'Órbita Apolo' },
            { val: '2.0 R_L', lbl: 'Mar Tranquilidad' },
            { val: '1.05 R_L', lbl: 'Cráter Tycho' }
        ],
        stories: [
            ['LUNA // ÓRBITA CISLUNAR', 'Tiempo Lunar Estándar (LTC)', 'Debido a su menor gravedad, un reloj en la Luna adelanta 56 microsegundos por día respecto a un reloj en la Tierra.'],
            ['LUNA // MARES BASÁLTICOS', 'Sin Atmósfera ni Dispersión de Luz', 'Su radio de Schwarzschild es de apenas 0.11 milímetros (el grosor de una hoja de papel).'],
            ['LUNA // SUPERFICIE (0.165 G)', 'Flotación de Baja Gravedad', 'Con un sexto de la gravedad terrestre, el cuerpo humano flota suavemente sin ninguna fuerza de marea diferencial.']
        ]
    },
    mars: {
        id: 'mars', name: 'MARTE', colorClass: 'text-red-400',
        nasaQuery: 'Mars Perseverance Viking globe',
        textureUrl: TEX + 'mars.jpg', textureFallback: 'https://upload.wikimedia.org/wikipedia/commons/4/46/Solarsystemscope_texture_2k_mars.jpg',
        atmoColor: [0.95, 0.45, 0.22],
        lockTitle: 'OBJETIVO: MARTE (0.107 M⊕ · ÓXIDO DE HIERRO Y POLVO)',
        realRadiusText: '3,389.5 km', rsRealText: 'r_s = 0.95 mm',
        soundscapeName: 'VIENTO MARCIANO PERSEVERANCE', unitLabel: 'R_mar', gravityLabel: 'GRAVEDAD LOCAL',
        comparisonPill: 'PLANETA ROJO (0.38 G)', surfaceG: 0.379, baseZ: 1.4e-10,
        timeDriftText: '+4.4 ms por año',
        summary: 'Valles Marineris, Monte Olimpo y tormentas acústicas captadas por el micrófono del rover Perseverance.',
        milestones: [
            { val: '15 R_♂', lbl: 'Órbita Fobos' },
            { val: '5.0 R_♂', lbl: 'Monte Olimpo' },
            { val: '2.0 R_♂', lbl: 'Valles Marineris' },
            { val: '1.05 R_♂', lbl: 'Cráter Jezero' }
        ],
        stories: [
            ['MARTE // ÓRBITA DE FOBOS', 'El Planeta Rojo en Alta Resolución', 'Su horizonte de sucesos teórico mide menos de 1 milímetro (0.95 mm). La luz viaja sin curvatura perceptible.'],
            ['MARTE // VALLES MARINERIS', 'Atmósfera Tenue de CO₂', 'El polvo en suspensión tiñe el cielo de tonos ámbar y atenúa las frecuencias agudas del sonido, tal como registró el rover Perseverance.'],
            ['MARTE // CRÁTER JEZERO (0.38 G)', 'Gravedad Marciana Confortable', 'Un astronauta pesa casi una tercera parte que en la Tierra, sin deformación relativista alguna.']
        ]
    },
    jupiter: {
        id: 'jupiter', name: 'JÚPITER', colorClass: 'text-orange-400',
        nasaQuery: 'Jupiter Juno Great Red Spot',
        textureUrl: TEX + 'jupiter.jpg', textureFallback: 'https://upload.wikimedia.org/wikipedia/commons/b/be/Solarsystemscope_texture_2k_jupiter.jpg',
        atmoColor: [0.95, 0.68, 0.38],
        lockTitle: 'OBJETIVO: JÚPITER (317.8 M⊕ · GRAN MANCHA ROJA)',
        realRadiusText: '69,911 km', rsRealText: 'r_s = 2.82 metros',
        soundscapeName: 'PLASMA JUNO / TORO DE ÍO', unitLabel: 'R_jup', gravityLabel: 'GRAVEDAD GIGANTE',
        comparisonPill: 'GIGANTE GASEOSO (2.53 G)', surfaceG: 2.528, baseZ: 2.02e-8,
        timeDriftText: '+0.64 seg por año',
        summary: 'El planeta más masivo: bandas de amoníaco, Gran Mancha Roja y feroz magnetosfera captada por la sonda Juno.',
        milestones: [
            { val: '15 R_J', lbl: 'Órbita Europa' },
            { val: '5.5 R_J', lbl: 'Toro de Ío' },
            { val: '2.2 R_J', lbl: 'Auroras Polares' },
            { val: '1.05 R_J', lbl: 'Mancha Roja (2.5G)' }
        ],
        stories: [
            ['JÚPITER // ÓRBITA GALILEANA', 'El Gigante del Sistema Solar', 'Júpiter tiene 318 veces la masa de la Tierra. Su radio de Schwarzschild es de 2.82 metros (el tamaño de una furgoneta).'],
            ['JÚPITER // TORO DE PLASMA DE ÍO', 'Rugido Electromagnético de la Sonda Juno', 'Su campo magnético acelera electrones generando silbidos de ciclotrón intensos.'],
            ['JÚPITER // GRAN MANCHA ROJA (2.53 G)', 'Compresión Gravitatoria Pesada', 'Sentirías 2.53 veces tu peso comprimiendo tu columna vertebral, pero sin estiramiento de marea.']
        ]
    },
    saturn: {
        id: 'saturn', name: 'SATURNO (ANILLOS 3D REALISTAS)', colorClass: 'text-amber-200',
        nasaQuery: 'Saturn Cassini rings planet',
        textureUrl: TEX + 'saturn.jpg', textureFallback: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Solarsystemscope_texture_2k_saturn.jpg',
        atmoColor: [0.94, 0.84, 0.58],
        lockTitle: 'OBJETIVO: SATURNO (95.16 M⊕ · SISTEMA DE ANILLOS LOD 3D)',
        realRadiusText: '58,232 km', rsRealText: 'r_s = 0.85 metros (85 cm)',
        soundscapeName: 'CORO Y CRISTALES DE HIELO CASSINI', unitLabel: 'R_sat', gravityLabel: 'GRAVEDAD LOCAL',
        comparisonPill: 'ANILLOS DE HIELO (1.06 G)', surfaceG: 1.065, baseZ: 6.4e-9,
        timeDriftText: '+0.20 seg por año',
        summary: 'Atmósfera dorada de amoníaco con el hexágono polar y anillos (D, C, B, División de Cassini, A, Encke y F) con hielo 3D.',
        milestones: [
            { val: '15 R_s', lbl: 'Vista Global' },
            { val: '5.5 R_s', lbl: 'Div. Cassini' },
            { val: '2.2 R_s', lbl: 'Inmersión Hielo' },
            { val: '1.05 R_s', lbl: 'Anillo D / Nubes' }
        ],
        stories: [
            ['SATURNO // VISTA TELESCÓPICA CASSINI', 'Anillos Clásicos vs. Disco de Acreción Relativista', 'A diferencia del agujero negro, los anillos de Saturno son hielo puro a -180 °C orbitando a 18 km/s: la luz viaja recta sin lente gravitacional ni asimetría Doppler.'],
            ['SATURNO // DIVISIÓN DE CASSINI Y BRECHA DE ENCKE', 'Acercamiento a los Anillos A, B y C', 'Al acercarte o pulsar "VISTA ANILLOS", entras en el plano ecuatorial observando la sombra proyectada por Saturno y miles de rocas de hielo 3D.'],
            ['SATURNO // INMERSIÓN CASSINI GRAND FINALE', 'Volando Entre Cristales de Hielo en 3D', 'Escucha los micro-impactos cristalinos captados por la sonda Cassini. El radio de Schwarzschild de Saturno es de solo 85 centímetros.']
        ]
    },
    uranus: {
        id: 'uranus', name: 'URANO', colorClass: 'text-teal-300',
        nasaQuery: 'Uranus Voyager Hubble rings',
        textureUrl: TEX + 'uranus.jpg', textureFallback: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Solarsystemscope_texture_2k_uranus.jpg',
        atmoColor: [0.35, 0.92, 0.98],
        lockTitle: 'OBJETIVO: URANO (14.5 M⊕ · INCLINACIÓN AXIAL 97.7°)',
        realRadiusText: '25,362 km', rsRealText: 'r_s = 12.8 cm',
        soundscapeName: 'VIENTO HELADO AXIAL', unitLabel: 'R_ura', gravityLabel: 'GRAVEDAD LOCAL',
        comparisonPill: 'GIGANTE DE HIELO (0.89 G)', surfaceG: 0.886, baseZ: 2.5e-9,
        timeDriftText: '+78.8 ms por año',
        summary: 'Planeta inclinado 97.7° que rueda de lado con anillos verticales tenues y atmósfera de metano cian.',
        milestones: [
            { val: '15 R_u', lbl: 'Órbita Titania' },
            { val: '5.0 R_u', lbl: 'Anillo Épsilon' },
            { val: '2.0 R_u', lbl: 'Polo Iluminado' },
            { val: '1.05 R_u', lbl: 'Hielo Metano' }
        ],
        stories: [
            ['URANO // EL PLANETA QUE RUEDA DE LADO', 'Inclinación Axial Extrema de 97.77°', 'Urano gira prácticamente acostado sobre su órbita, junto con su sistema de 13 anillos oscuros verticales.'],
            ['URANO // ANILLO ÉPSILON', 'Gigante de Hielo y Metano', 'Su radio de Schwarzschild es de 12.8 centímetros (el tamaño de un pomelo).'],
            ['URANO // CAPA DE NUBES (-224 °C)', 'La Atmósfera Más Fría del Sistema Solar', 'Pese a ser 4 veces más ancho que la Tierra, su baja densidad hace que su gravedad superficial sea del 89% de la terrestre.']
        ]
    },
    neptune: {
        id: 'neptune', name: 'NEPTUNO', colorClass: 'text-blue-400',
        nasaQuery: 'Neptune Voyager 2 Great Dark Spot',
        textureUrl: TEX + 'neptune.jpg', textureFallback: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Solarsystemscope_texture_2k_neptune.jpg',
        atmoColor: [0.20, 0.52, 1.0],
        lockTitle: 'OBJETIVO: NEPTUNO (17.1 M⊕ · VIENTOS SUPERSÓNICOS)',
        realRadiusText: '24,622 km', rsRealText: 'r_s = 15.2 cm',
        soundscapeName: 'TORMENTA SUPERSÓNICA 2100 KM/H', unitLabel: 'R_nep', gravityLabel: 'GRAVEDAD LOCAL',
        comparisonPill: 'GIGANTE AZUL (1.14 G)', surfaceG: 1.14, baseZ: 3.1e-9,
        timeDriftText: '+97.7 ms por año',
        summary: 'Descubierto por perturbaciones gravitatorias; alberga los vientos más rápidos del Sistema Solar (2,100 km/h).',
        milestones: [
            { val: '15 R_n', lbl: 'Órbita Tritón' },
            { val: '5.0 R_n', lbl: 'Arcos Adams' },
            { val: '2.0 R_n', lbl: 'Cirros Metano' },
            { val: '1.05 R_n', lbl: 'Mancha Oscura' }
        ],
        stories: [
            ['NEPTUNO // DESCUBIERTO CON MATEMÁTICAS', 'Triunfo de la Gravitación Universal', 'Neptuno fue predicho matemáticamente antes de ser visto al observar cómo su gravedad tiraba de la órbita de Urano.'],
            ['NEPTUNO // ANILLOS DE ADAMS Y ARCOS', 'Vientos Supersónicos de 2,100 km/h', 'Su radio de Schwarzschild es de 15.2 centímetros.'],
            ['NEPTUNO // GRAN MANCHA OSCURA (1.14 G)', 'Profundidades de Hielo a Alta Presión', 'La gravedad es apenas un 14% mayor que en la Tierra, con una dilatación temporal de solo 98 milisegundos al año.']
        ]
    },
    io: {
        id: 'io', name: 'ÍO (LUNA DE JÚPITER)', colorClass: 'text-yellow-300',
        nasaQuery: 'Io volcano Jupiter moon Galileo',
        textureUrl: TEX + 'io.jpg',
        atmoColor: [1.0, 0.82, 0.25],
        lockTitle: 'OBJETIVO: ÍO (0.015 M⊕ · 400 VOLCANES ACTIVOS)',
        realRadiusText: '1,821.6 km', rsRealText: 'r_s = 0.13 mm',
        soundscapeName: 'PLASMA DEL TORO DE ÍO (JUNO)', unitLabel: 'R_ío', gravityLabel: 'GRAVEDAD LOCAL',
        comparisonPill: 'MUNDO VOLCÁNICO (0.18 G)', surfaceG: 0.183, baseZ: 3.6e-11,
        timeDriftText: '+1.1 ms por año (Local)',
        summary: 'El cuerpo más volcánico del Sistema Solar: la marea de Júpiter lo amasa y lanza penachos de azufre a 400 km de altura.',
        milestones: [
            { val: '15 R_ío', lbl: 'Órbita Juno' },
            { val: '5.0 R_ío', lbl: 'Penacho Pele' },
            { val: '2.0 R_ío', lbl: 'Loki Patera' },
            { val: '1.05 R_ío', lbl: 'Lava (0.18G)' }
        ],
        stories: [
            ['ÍO // MAREA DE JÚPITER', 'Una Luna Amasada por la Gravedad', 'La gravedad de Júpiter deforma la corteza de Ío hasta 100 metros en cada órbita. Esa fricción interna funde la roca y alimenta más de 400 volcanes activos.'],
            ['ÍO // PENACHO DE PELE', 'Fuentes de Azufre a 400 km', 'Los penachos volcánicos son tan altos que escapan al espacio y forman el toro de plasma que rodea a Júpiter, el mismo que la sonda Juno escucha en radio.'],
            ['ÍO // LOKI PATERA (0.18 G)', 'Un Lago de Lava de 200 km', 'Loki Patera es un lago de lava mayor que muchos países. Con 0.18 G un salto te elevaría más de 5 metros sobre la costra de azufre.']
        ]
    },
    europa: {
        id: 'europa', name: 'EUROPA (OCÉANO BAJO EL HIELO)', colorClass: 'text-sky-200',
        nasaQuery: 'Europa ice moon Jupiter Juno Galileo',
        textureUrl: TEX + 'europa.jpg',
        atmoColor: [0.75, 0.88, 1.0],
        lockTitle: 'OBJETIVO: EUROPA (0.008 M⊕ · OCÉANO SUBTERRÁNEO)',
        realRadiusText: '1,560.8 km', rsRealText: 'r_s = 0.071 mm',
        soundscapeName: 'SOBREVUELO JUNO DE EUROPA', unitLabel: 'R_eur', gravityLabel: 'GRAVEDAD LOCAL',
        comparisonPill: 'OCÉANO HELADO (0.13 G)', surfaceG: 0.134, baseZ: 2.3e-11,
        timeDriftText: '+0.72 ms por año (Local)',
        summary: 'Corteza de hielo surcada por grietas rojizas sobre un océano salado con el doble de agua que la Tierra.',
        milestones: [
            { val: '15 R_eur', lbl: 'Europa Clipper' },
            { val: '5.0 R_eur', lbl: 'Líneas Rojas' },
            { val: '2.0 R_eur', lbl: 'Caos Conamara' },
            { val: '1.05 R_eur', lbl: 'Hielo (0.13G)' }
        ],
        stories: [
            ['EUROPA // OBJETIVO EUROPA CLIPPER', 'El Mejor Lugar para Buscar Vida', 'Bajo 15–25 km de hielo hay un océano global de agua salada que contiene más agua que todos los océanos de la Tierra juntos.'],
            ['EUROPA // LINEAE', 'Cicatrices de la Marea', 'Las grietas rojizas (lineae) se abren y cierran con la marea de Júpiter. El color proviene de sales y compuestos de azufre que suben desde el océano.'],
            ['EUROPA // CAOS CONAMARA (0.13 G)', 'Icebergs Congelados', 'Bloques de hielo del tamaño de ciudades se desprendieron y volvieron a congelarse. Aquí pesarías apenas 9 kg.']
        ]
    },
    titan: {
        id: 'titan', name: 'TITÁN (LUNA DE SATURNO)', colorClass: 'text-orange-300',
        nasaQuery: 'Titan Saturn moon Cassini Huygens',
        textureUrl: TEX + 'titan.jpg',
        atmoColor: [1.0, 0.62, 0.18],
        lockTitle: 'OBJETIVO: TITÁN (0.0225 M⊕ · ATMÓSFERA DE 1.5 BAR)',
        realRadiusText: '2,574.7 km', rsRealText: 'r_s = 0.20 mm',
        soundscapeName: 'DESCENSO HUYGENS 2005', unitLabel: 'R_tit', gravityLabel: 'GRAVEDAD LOCAL',
        comparisonPill: 'MARES DE METANO (0.14 G)', surfaceG: 0.138, baseZ: 3.9e-11,
        timeDriftText: '+1.2 ms por año (Local)',
        summary: 'Única luna con atmósfera densa: neblina naranja, lluvia de metano y mares de hidrocarburos. Aquí aterrizó la sonda Huygens.',
        milestones: [
            { val: '15 R_tit', lbl: 'Órbita Cassini' },
            { val: '5.0 R_tit', lbl: 'Neblina Tolina' },
            { val: '2.0 R_tit', lbl: 'Kraken Mare' },
            { val: '1.05 R_tit', lbl: 'Huygens (0.14G)' }
        ],
        stories: [
            ['TITÁN // NEBLINA NARANJA', 'Un Mundo Envuelto en Smog Orgánico', 'Su atmósfera de nitrógeno es 50% más densa que la terrestre. Las tolinas, moléculas orgánicas complejas, la tiñen de naranja e impiden ver la superficie en luz visible.'],
            ['TITÁN // KRAKEN MARE', 'Mares de Metano Líquido', 'Es el único otro lugar del Sistema Solar con líquidos estables en superficie: mares de metano y etano a -179 °C.'],
            ['TITÁN // SITIO HUYGENS (0.14 G)', 'Podrías Volar con Alas', 'Con 0.14 G y 1.5 bar de presión, un humano con alas en los brazos podría volar. El 14 de enero de 2005 la sonda Huygens grabó el sonido del descenso.']
        ]
    },
    pluto: {
        id: 'pluto', name: 'PLUTÓN (PLANETA ENANO)', colorClass: 'text-rose-200',
        nasaQuery: 'Pluto New Horizons heart Tombaugh',
        textureUrl: TEX + 'pluto.jpg',
        atmoColor: [0.45, 0.65, 1.0],
        lockTitle: 'OBJETIVO: PLUTÓN (0.0022 M⊕ · CORAZÓN DE NITRÓGENO)',
        realRadiusText: '1,188.3 km', rsRealText: 'r_s = 0.019 mm',
        soundscapeName: 'SILENCIO DEL CINTURÓN DE KUIPER', unitLabel: 'R_plu', gravityLabel: 'MICRO-GRAVEDAD',
        comparisonPill: 'PLANETA ENANO (0.06 G)', surfaceG: 0.063, baseZ: 8.1e-12,
        timeDriftText: '+0.26 ms por año (Local)',
        summary: 'El corazón Tombaugh Regio es un glaciar de nitrógeno; montañas de hielo de agua y una neblina azul captada por New Horizons en 2015.',
        milestones: [
            { val: '15 R_plu', lbl: 'New Horizons' },
            { val: '5.0 R_plu', lbl: 'Neblina Azul' },
            { val: '2.0 R_plu', lbl: 'Sputnik Planitia' },
            { val: '1.05 R_plu', lbl: 'Glaciar (0.06G)' }
        ],
        stories: [
            ['PLUTÓN // SOBREVUELO NEW HORIZONS', 'A 5,900 Millones de Kilómetros', 'La luz del Sol tarda 5.5 horas en llegar. New Horizons pasó a 12,500 km de su superficie el 14 de julio de 2015.'],
            ['PLUTÓN // NEBLINA AZUL', 'Una Atmósfera que se Congela', 'Su tenue atmósfera de nitrógeno dispersa la luz en azul. Cuando Plutón se aleja del Sol, la atmósfera se congela y cae como nieve.'],
            ['PLUTÓN // SPUTNIK PLANITIA (0.06 G)', 'El Corazón de Hielo de Nitrógeno', 'Un glaciar de 1,000 km de nitrógeno sólido que se renueva por convección. Aquí una persona de 70 kg pesaría solo 4.4 kg.']
        ]
    },
    pulsar: {
        id: 'pulsar', name: 'PÚLSAR VELA (ESTRELLA DE NEUTRONES)', colorClass: 'text-singularity-cyan',
        nasaQuery: 'Vela Pulsar Chandra neutron star jet',
        atmoColor: [0.0, 0.94, 1.0],
        lockTitle: 'OBJETIVO: PÚLSAR PSR B0833-45 (1.4 M☉ EN 10 KM)',
        realRadiusText: '10.0 km (2.4 r_s)', rsRealText: 'r_s = 4.13 km',
        soundscapeName: 'PULSOS FARO MAGNÉTICO VELA', unitLabel: 'r_s', gravityLabel: 'MAREA LETAL',
        comparisonPill: 'ESLABÓN RELATIVISTA (γ = 1.30x)', surfaceG: 200000000000, baseZ: 0.30,
        timeDriftText: '+7.2 horas por día',
        summary: 'El eslabón perdido: 1.4 masas solares en una esfera de 10 km con jets relativistas y curvatura de luz visible.',
        milestones: [
            { val: '15 r_s', lbl: 'Magnetosfera' },
            { val: '8.0 r_s', lbl: 'Cono de Jets' },
            { val: '4.0 r_s', lbl: 'Lente Visible' },
            { val: '2.4 r_s', lbl: 'Corteza (Límite)' }
        ],
        stories: [
            ['PÚLSAR // FARO CÓSMICO DE NEUTRONES', 'El Eslabón entre Planetas y Agujeros Negros', 'Comprime 1.4 veces la masa del Sol en una bola del tamaño de una ciudad (10 km). Su superficie está a solo 2.4 radios de Schwarzschild.'],
            ['PÚLSAR // CHORROS RELATIVISTAS POLARES', 'Lente Gravitacional sin Horizonte de Sucesos', 'La gravedad dobla la luz permitiéndote ver más del 50% de la cara trasera de la estrella al mismo tiempo.'],
            ['PÚLSAR // CORTEZA DE HIERRO NUCLEAR (2.4 r_s)', 'Dilatación Temporal del 30% y Espaguetificación', 'El tiempo transcurre un 30% más lento que en la Tierra y las fuerzas de marea destrozan cualquier objeto.']
        ]
    },
    gargantua: {
        id: 'gargantua', name: 'GARGANTÚA (AGUJERO NEGRO KERR)', colorClass: 'text-singularity-crimson',
        nasaQuery: 'Black Hole accretion disk M87 Event Horizon',
        atmoColor: [1.0, 0.05, 0.35],
        lockTitle: 'OBJETIVO: GARGANTÚA (4.0×10⁶ M☉ · SINGULARIDAD KERR)',
        realRadiusText: '= 1.0 r_s (Horizonte)', rsRealText: 'r_s = 1.18×10⁷ km',
        soundscapeName: 'SINGULARIDAD KERR & GEIGER', unitLabel: 'r_s', gravityLabel: 'FUERZA MAREA',
        comparisonPill: 'EXTREMO RELATIVISTA (γ ➔ ∞)', surfaceG: 999999, baseZ: 0.074,
        timeDriftText: '➔ ∞ en el Horizonte',
        summary: 'Asimetría Doppler azul/roja, lente gravitacional 360°, ergosfera y sombra del horizonte.',
        milestones: [
            { val: '15 r_s', lbl: 'Estable' },
            { val: '5 r_s', lbl: 'Ergosfera' },
            { val: '1.5 r_s', lbl: 'Fotones' },
            { val: '1.0 r_s', lbl: 'Horizonte' }
        ],
        stories: [
            ['GARGANTÚA // ÓRBITA ESTABLE EXTERIOR', 'Asimetría Doppler y Lente Gravitacional 360°', 'A diferencia de los anillos de hielo de Saturno, este plasma gira a velocidades cercanas a la luz: el lado izquierdo brilla en azul y el derecho en rojo.'],
            ['GARGANTÚA // ERGOSFERA Y ESFERA DE FOTONES', 'Arrastre del Espacio-Tiempo (Frame Dragging)', 'El giro del agujero negro arrastra el espacio-tiempo mismo. A 1.5 r_s la luz queda atrapada en órbitas circulares.'],
            ['GARGANTÚA // HORIZONTE DE SUCESOS (1.0 r_s)', 'Frontera de No Retorno', 'La dilatación temporal tiende a infinito respecto a la Tierra y el zumbido gravitacional cae hacia el infrasonido.']
        ]
    }
};
