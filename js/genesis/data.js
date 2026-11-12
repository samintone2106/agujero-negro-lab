/* -------------------------------------------------------------------------- */
/* GÉNESIS: DATOS CIENTÍFICOS DE CADA FORMACIÓN (6 FASES POR ASTRO)            */
/* -------------------------------------------------------------------------- */
// Tipos de formación. `mode` elige la física de partículas del shader:
// 0 disco protoplanetario, 1 colapso de nube molecular, 2 supernova,
// 3 caída de gas a un agujero negro, 4 núcleo + envoltura de gas.
const GENESIS_TYPES = {
    rocky: { mode: 0, gas: [0xc98a52, 0xffe0b0], dust: 0x3a2618, grow: [0.36, 0.6], nebula: [0x5a3a2a, 0x2a1a30], bloom: 0.9 },
    gas:   { mode: 4, gas: [0x9fd8ff, 0xffd59e], dust: 0x2a2a3a, grow: [0.46, 0.78], nebula: [0x24324a, 0x3a2a40], bloom: 0.8, bloomThreshold: 0.88 },
    star:  { mode: 1, gas: [0xff6a2a, 0xffe7a3], dust: 0x2a1410, grow: [0.5, 0.66], flashAt: 0.55, nebula: [0x8a2a4a, 0x2a3a7a], bloom: 1.4 },
    nova:  { mode: 2, gas: [0x7df9ff, 0xff4fa3], dust: 0x301020, grow: [0.6, 0.82], flashAt: 0.36, nebula: [0x2a4a7a, 0x6a1a4a], bloom: 1.6 },
    hole:  { mode: 3, gas: [0xffa040, 0x9fe8ff], dust: 0x201008, grow: [0.5, 0.84], flashAt: 0.12, nebula: [0x4a2a1a, 0x1a2a4a], bloom: 0.45, bloomThreshold: 0.92 }
};

// Encuadre de cámara por fase: [distancia en radios finales, ángulo polar, velocidad de órbita].
const GENESIS_SHOTS = {
    rocky: [[14, 0.55, 0.10], [9, 1.25, 0.16], [5.5, 1.05, 0.22], [4.2, 1.2, 0.14], [3.6, 1.0, 0.10], [3.4, 1.15, 0.06]],
    gas:   [[13, 0.6, 0.08], [8, 1.3, 0.14], [5.2, 1.1, 0.2], [4.6, 1.2, 0.16], [4.8, 0.95, 0.1], [5.2, 0.9, 0.06]],
    star:  [[16, 0.9, 0.05], [11, 0.5, 0.1], [7, 1.35, 0.16], [5, 1.15, 0.08], [5.5, 1.2, 0.08], [6, 1.1, 0.05]],
    nova:  [[5.5, 1.2, 0.05], [4.2, 1.3, 0.08], [9, 1.35, 0.1], [16, 1.0, 0.06], [8, 1.2, 0.12], [6, 1.4, 0.1]],
    hole:  [[14, 1.1, 0.06], [10, 1.3, 0.12], [9, 1.25, 0.16], [6.5, 1.38, 0.2], [5, 1.3, 0.16], [6, 1.25, 0.08]]
};

// Cada astro: tipo, efectos (fx), reloj cósmico por fase y 6 fases [título, texto].
// Eventos: { impact: { at, size, dir, debris } } con `at` en progreso 0..1 de toda la secuencia.
const GENESIS = {
    sun: {
        type: 'star', fx: ['jets', 'nebula'],
        clock: ['Hace 4,600 Ma', '+10 mil años', '+50 mil años', '+100 mil años', '+10 Ma', 'Hoy'],
        steps: [
            ['Una nube molecular fría', 'Una nube de gas y polvo a -260 °C, de varios años luz, flota en un brazo de la Vía Láctea.'],
            ['La onda de una supernova', 'La onda de choque de una estrella que explotó cerca comprime la nube y la gravedad empieza a ganar.'],
            ['Colapso y disco', 'Al caer gira más rápido y se aplana en un disco. El centro se calienta: nace una protoestrella que lanza chorros por sus polos.'],
            ['Ignición', 'El núcleo llega a ~15 millones de °C: el hidrógeno se fusiona en helio y la luz frena el colapso.'],
            ['Viento solar', 'El viento de la joven estrella barre el gas sobrante del disco. Lo que queda serán los planetas.'],
            ['Nace el Sol', 'Una estrella G2V con el 99.86 % de la masa del Sistema Solar. Le quedan ~5,000 millones de años de combustible.']
        ]
    },
    mercury: {
        type: 'rocky', fx: ['molten', 'bombard', { impact: { at: 0.6, size: 0.55, dir: [-1, 0.2, 0.5], debris: true } }],
        clock: ['Hace 4,568 Ma', '+100 mil años', '+1 Ma', '+10 Ma', '+30 Ma', 'Hoy'],
        steps: [
            ['Solo roca y metal', 'Tan cerca del joven Sol el hielo se evapora: en el disco sobreviven granos de silicato y hierro.'],
            ['De polvo a planetesimales', 'Los granos se pegan en guijarros y estos en planetesimales de kilómetros que chocan sin parar.'],
            ['Un embrión fundido', 'Los choques liberan tanta energía que el pequeño planeta se mantiene derretido.'],
            ['Un impacto gigante', 'Una colisión violenta le arranca gran parte del manto rocoso y lo lanza al espacio.'],
            ['Bombardeo y enfriamiento', 'La lluvia de asteroides marca su superficie con cráteres que aún vemos hoy.'],
            ['Un planeta casi todo núcleo', 'Su núcleo de hierro ocupa ~85 % de su radio: el mayor del Sistema Solar en proporción.']
        ]
    },
    venus: {
        type: 'rocky', fx: ['molten', 'bombard', 'haze', { impact: { at: 0.5, size: 0.3, dir: [1, 0.3, 0.4] } }],
        clock: ['Hace 4,560 Ma', '+100 mil años', '+1 Ma', '+20 Ma', '+500 Ma', 'Hoy'],
        steps: [
            ['La zona interior del disco', 'Venus crece con roca y metal en la región caliente del disco, igual que la Tierra.'],
            ['Planetesimales', 'Millones de cuerpos de kilómetros chocan y se fusionan en embriones planetarios.'],
            ['Choque de embriones', 'Embriones del tamaño de la Luna colisionan durante decenas de millones de años.'],
            ['Océano de magma', 'El planeta queda cubierto de lava; el hierro se hunde y forma su núcleo.'],
            ['Invernadero desbocado', 'Los volcanes liberan CO₂ y, sin océanos que lo absorban, el calor queda atrapado.'],
            ['El infierno gemelo', 'Hoy su superficie soporta 92 bar y 465 °C bajo nubes de ácido sulfúrico.']
        ]
    },
    earth: {
        type: 'rocky', fx: ['molten', 'bombard', 'ocean', { impact: { at: 0.56, size: 0.53, dir: [-1, 0.25, 0.6], debris: true } }],
        clock: ['Hace 4,567 Ma', '+100 mil años', '+10 Ma', '+30 Ma', '+300 Ma', 'Hoy'],
        steps: [
            ['Polvo alrededor del Sol', 'Granos de roca y metal orbitan al joven Sol dentro de un disco de gas.'],
            ['Planetesimales', 'Se pegan en cuerpos de kilómetros que chocan y crecen sin parar.'],
            ['Una Tierra fundida', 'Los impactos la mantienen derretida: el hierro se hunde al núcleo y la roca ligera forma el manto.'],
            ['El impacto de Theia', 'Un planeta del tamaño de Marte choca con la Tierra. Los escombros que quedan en órbita formarán la Luna.'],
            ['Bombardeo y océanos', 'La corteza se enfría; el vapor volcánico y el hielo de cometas y asteroides se condensan en océanos.'],
            ['Un mundo azul', 'Con agua líquida, atmósfera y campo magnético, la Tierra está lista para la vida.']
        ]
    },
    moon: {
        type: 'rocky', fx: ['molten', 'bombard', { impact: { at: 0.14, size: 0.9, dir: [1, 0.15, 0.5], debris: true } }],
        clock: ['Hace 4,510 Ma', '+1 hora', '+1 día', '+100 años', '+100 Ma', 'Hoy'],
        steps: [
            ['Theia golpea la Tierra', 'Un protoplaneta del tamaño de Marte impacta a la joven Tierra en un ángulo oblicuo.'],
            ['Un anillo de roca vaporizada', 'Una nube de roca fundida y vapor queda girando alrededor de la Tierra.'],
            ['La Luna se agrega', 'Los escombros se juntan muy rápido, quizá en menos de un siglo.'],
            ['Océano de magma', 'La Luna nace fundida; los minerales ligeros flotan y forman la corteza clara de las tierras altas.'],
            ['Gran bombardeo', 'Enormes impactos excavan cuencas que la lava rellena: los mares oscuros que vemos.'],
            ['La Luna de hoy', 'Fría y sin aire, conserva intacto el registro de 4,500 millones de años de impactos.']
        ]
    },
    mars: {
        type: 'rocky', fx: ['molten', 'bombard', { impact: { at: 0.5, size: 0.25, dir: [-0.6, 0.6, 0.6] } }],
        clock: ['Hace 4,600 Ma', '+500 mil años', '+2 Ma', '+4 Ma', '+500 Ma', 'Hoy'],
        steps: [
            ['Un disco empobrecido', 'Júpiter migra hacia dentro y luego hacia fuera, y deja sin material la región de Marte.'],
            ['Crecimiento veloz', 'Marte se forma en solo 2 a 4 millones de años: un embrión planetario que nunca creció más.'],
            ['Un mundo pequeño', 'Termina con apenas el 11 % de la masa de la Tierra.'],
            ['Un impacto gigante', 'Un golpe enorme pudo crear la diferencia entre su hemisferio norte bajo y el sur alto.'],
            ['Ríos y luego el silencio', 'Tuvo agua líquida, pero su núcleo se enfrió, perdió el campo magnético y el viento solar le arrancó el aire.'],
            ['El planeta rojo', 'Un desierto frío con cauces fósiles como los del cráter Jezero.']
        ]
    },
    jupiter: {
        type: 'gas', fx: ['core', 'nebula'],
        clock: ['Hace 4,600 Ma', '+100 mil años', '+1 Ma', '+2 Ma', '+3 Ma', 'Hoy'],
        steps: [
            ['Más allá de la línea de hielo', 'Lejos del Sol el agua se congela: hay mucho más material sólido para construir planetas.'],
            ['Guijarros de hielo', 'Guijarros de hielo y roca caen en espiral hacia una semilla que crece rapidísimo.'],
            ['Un núcleo gigante', 'En ~1 millón de años el núcleo llega a unas 10 masas terrestres.'],
            ['Acreción desbocada', 'Su gravedad traga hidrógeno y helio del disco cada vez más rápido.'],
            ['Abre un hueco en el disco', 'Tan masivo, Júpiter limpia su órbita y frena el crecimiento de Marte y del cinturón de asteroides.'],
            ['El primer planeta', '318 masas terrestres: el planeta que moldeó todo el Sistema Solar.']
        ]
    },
    saturn: {
        type: 'gas', fx: ['core', 'rings', 'nebula'],
        clock: ['Hace 4,600 Ma', '+300 mil años', '+2 Ma', '+4 Ma', 'Hace ~200 Ma', 'Hoy'],
        steps: [
            ['Núcleo helado lejano', 'Más lejos que Júpiter, su núcleo de hielo y roca crece más despacio.'],
            ['Guijarros de hielo', 'Los guijarros caen en espiral hasta formar un núcleo de unas 15 masas terrestres.'],
            ['Gas, pero tarde', 'Captura hidrógeno y helio mientras el disco se disipa.'],
            ['El menos denso', 'Termina con 95 masas terrestres y menos densidad que el agua.'],
            ['Una luna despedazada', 'Una luna helada o un cometa se acerca demasiado y la marea de Saturno lo rompe.'],
            ['Anillos jóvenes', 'Esos restos forman anillos de hielo casi puro, quizá de solo 100 a 400 millones de años.']
        ]
    },
    uranus: {
        type: 'gas', fx: ['core', 'tilt', { impact: { at: 0.66, size: 0.45, dir: [1, -0.2, 0.5], debris: true } }],
        clock: ['Hace 4,500 Ma', '+1 Ma', '+3 Ma', '+5 Ma', '+10 Ma', 'Hoy'],
        steps: [
            ['Gigante de hielo', 'En la parte fría del disco crece un núcleo de hielo de agua, amoníaco y metano.'],
            ['Un núcleo grande', 'El núcleo acapara la mayor parte de su masa final.'],
            ['Llegó tarde al gas', 'El gas del disco casi se había ido: solo captura una envoltura delgada.'],
            ['El golpe que lo tumbó', 'Un impacto gigante lo deja girando de lado, con su eje inclinado 98°.'],
            ['Migración', 'Según el modelo de Niza, los gigantes migran y dispersan cometas por todo el Sistema Solar.'],
            ['Un mundo de lado', 'Cada polo tiene 42 años de luz continua y 42 años de noche.']
        ]
    },
    neptune: {
        type: 'gas', fx: ['core'],
        clock: ['Hace 4,500 Ma', '+1 Ma', '+3 Ma', '+500 Ma', '+600 Ma', 'Hoy'],
        steps: [
            ['Nace más cerca del Sol', 'Neptuno probablemente se forma más adentro de donde está hoy.'],
            ['Núcleo de hielo', 'Agua, amoníaco y metano helados forman un gran núcleo.'],
            ['Envoltura delgada', 'Como Urano, solo captura una capa modesta de hidrógeno y helio.'],
            ['Migra hacia afuera', 'Las interacciones con los otros gigantes lo empujan a las afueras del Sistema Solar.'],
            ['Captura a Tritón', 'Atrapa a Tritón, un objeto del cinturón de Kuiper, en una órbita al revés.'],
            ['El planeta de los vientos', 'Hoy tiene los vientos más rápidos conocidos: más de 2,000 km/h.']
        ]
    },
    io: {
        type: 'rocky', fx: ['molten', 'plumes'],
        clock: ['Hace 4,500 Ma', '+10 mil años', '+1 Ma', '+10 Ma', '+100 Ma', 'Hoy'],
        steps: [
            ['Un mini sistema solar', 'Alrededor del joven Júpiter se forma un disco de gas y polvo.'],
            ['Demasiado cerca para el hielo', 'El calor de Júpiter evapora el hielo cerca de él: Ío se forma de roca.'],
            ['Crece una luna', 'Los planetesimales se juntan en una luna del tamaño de la nuestra.'],
            ['Resonancia 1:2:4', 'Ío, Europa y Ganímedes se sincronizan y sus órbitas nunca dejan de ser elípticas.'],
            ['Calentada por marea', 'La marea de Júpiter amasa su interior hasta fundirlo.'],
            ['El mundo más volcánico', 'Más de 400 volcanes activos lanzan azufre a cientos de km de altura.']
        ]
    },
    europa: {
        type: 'rocky', fx: ['frost', 'bombard'],
        clock: ['Hace 4,500 Ma', '+10 mil años', '+1 Ma', '+10 Ma', '+100 Ma', 'Hoy'],
        steps: [
            ['Disco circumjoviano', 'Europa crece dentro del disco de gas y polvo que rodea a Júpiter.'],
            ['Roca con agua', 'Se forma lo bastante lejos para conservar hielo de agua.'],
            ['Se separa en capas', 'El núcleo rocoso queda abajo y unos 100 km de agua arriba.'],
            ['Marea y calor interno', 'La resonancia con Ío y Ganímedes flexiona su interior y genera calor.'],
            ['Corteza de hielo', 'La superficie se congela en una corteza agrietada.'],
            ['Un océano escondido', 'Bajo el hielo hay un océano salado con más agua que todos los de la Tierra.']
        ]
    },
    titan: {
        type: 'rocky', fx: ['frost', 'haze'],
        clock: ['Hace 4,500 Ma', '+10 mil años', '+1 Ma', '+100 Ma', '+1,000 Ma', 'Hoy'],
        steps: [
            ['El disco de Saturno', 'Alrededor de Saturno se forma un disco rico en hielo, amoníaco y polvo.'],
            ['La luna dominante', 'Titán acapara el 96 % de toda la masa que orbita a Saturno.'],
            ['Hielo y roca', 'Crece una luna más grande que Mercurio.'],
            ['Una atmósfera desde dentro', 'El amoníaco de su interior se transforma en nitrógeno y el metano escapa a la superficie.'],
            ['Neblina de tolinas', 'La luz ultravioleta rompe el metano y forma tolinas: la neblina naranja que la envuelve.'],
            ['Lluvia de metano', 'Tiene ríos, lagos y lluvia, pero de metano líquido a -179 °C.']
        ]
    },
    pluto: {
        type: 'rocky', fx: ['frost', 'charon', { impact: { at: 0.56, size: 0.5, dir: [-1, 0.3, 0.4], debris: true } }],
        clock: ['Hace 4,500 Ma', '+1 Ma', '+10 Ma', '+30 Ma', '+500 Ma', 'Hoy'],
        steps: [
            ['El borde helado del disco', 'Más allá de Neptuno el material es hielo y roca a -230 °C.'],
            ['Crecimiento lento', 'Los planetesimales se juntan muy despacio y nunca alcanzan tamaño planetario.'],
            ['Un mundo enano', 'Plutón termina con solo un sexto de la masa de la Luna.'],
            ['Nace Caronte', 'Un impacto gigante crea a Caronte, igual que la Luna nació de la Tierra.'],
            ['Atrapado por Neptuno', 'La migración de Neptuno lo encierra en resonancia 3:2 dentro del cinturón de Kuiper.'],
            ['Un corazón de hielo', 'Sputnik Planitia, su "corazón", es un glaciar de nitrógeno de 1,000 km.']
        ]
    },
    pulsar: {
        type: 'nova', fx: ['supergiant', 'nebula'],
        clock: ['Hace ~10 Ma', 'Hace 11,000 años', '1 segundo', '+1 hora', '+1,000 años', 'Hoy'],
        steps: [
            ['Una supergigante roja', 'Una estrella de ~15 masas solares agota su combustible en solo ~10 millones de años.'],
            ['Un núcleo de hierro', 'En su centro se acumula hierro, que ya no libera energía al fusionarse.'],
            ['Colapso y rebote', 'El núcleo colapsa en menos de un segundo, rebota y la estrella explota en supernova.'],
            ['Brilla más que la galaxia', 'Durante semanas la explosión brilla como miles de millones de soles.'],
            ['Materia de neutrones', 'En el centro queda 1.4 masas solares comprimidas en una esfera de 20 km.'],
            ['Un faro cósmico', 'El púlsar de Vela gira 11 veces por segundo y sus haces de radio barren el espacio.']
        ]
    },
    gargantua: {
        type: 'hole', fx: ['spinup', 'jets', 'merger', 'nebula'],
        clock: ['Hace 13,000 Ma', '+1 segundo', '+100 Ma', '+1,000 Ma', '+5,000 Ma', 'Hoy'],
        steps: [
            ['Una semilla', 'Una estrella gigantesca del universo temprano colapsa sin explotar y deja un agujero negro.'],
            ['Un horizonte se forma', 'Nada, ni la luz, puede salir de ese radio: nace el horizonte de sucesos.'],
            ['Fusiones', 'Dos agujeros negros giran uno alrededor del otro cada vez más rápido y se fusionan, sacudiendo el espacio-tiempo con ondas gravitacionales.'],
            ['Disco de acreción', 'El gas que cae se calienta a millones de grados y brilla más que galaxias enteras.'],
            ['Chorros relativistas', 'Los campos magnéticos lanzan chorros de plasma casi a la velocidad de la luz.'],
            ['Un monstruo dormido', 'Millones de masas solares ocultas tras un horizonte del que nada escapa.']
        ]
    }
};
