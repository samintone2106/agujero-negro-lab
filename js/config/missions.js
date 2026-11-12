/* -------------------------------------------------------------------------- */
/* CATÁLOGO DE MISIONES REALES POR ASTRO                                       */
/* -------------------------------------------------------------------------- */
// [año, nombre, agencia, tipo, estado, logro, consulta de fotos NASA (opcional)]
// estado: 'activa' | 'finalizada' | 'en ruta' | 'futura' | 'hito' (logro sobre ese astro, sin afirmar su estado actual)
// Las fotos se piden en vivo a images-api.nasa.gov con la consulta indicada.
const MISSION_TYPES = {
    sobrevuelo: 'Sobrevuelo', orbitador: 'Orbitador', aterrizador: 'Aterrizador', rover: 'Rover',
    sonda: 'Sonda atmosférica', observatorio: 'Observatorio', tripulada: 'Tripulada', helicoptero: 'Helicóptero',
    retorno: 'Retorno de muestras', impacto: 'Impactador'
};

const MISSIONS = {
    sun: [
        [1990, 'Ulysses', 'ESA / NASA', 'orbitador', 'finalizada', 'La primera nave que pasó sobre los polos del Sol; midió el viento solar rápido que sale de ellos.'],
        [1995, 'SOHO', 'ESA / NASA', 'observatorio', 'activa', 'Vigila el Sol sin pausa desde el punto L1 y, de paso, ha descubierto más de 5,000 cometas.'],
        [2001, 'Genesis', 'NASA', 'retorno', 'finalizada', 'Atrapó partículas del viento solar y las trajo a la Tierra en 2004 para medir de qué está hecho el Sol.', 'Genesis solar wind'],
        [2010, 'Solar Dynamics Observatory', 'NASA', 'observatorio', 'activa', 'Fotografía el Sol en 10 longitudes de onda cada 12 segundos.', 'Solar Dynamics Observatory'],
        [2018, 'Parker Solar Probe', 'NASA', 'orbitador', 'activa', 'Atravesó la corona: en 2024 pasó a 6.1 millones de km de la superficie a ~690,000 km/h, el objeto humano más rápido.', 'Parker Solar Probe'],
        [2020, 'Solar Orbiter', 'ESA / NASA', 'orbitador', 'activa', 'Tomó las primeras imágenes de los polos del Sol.', 'Solar Orbiter']
    ],
    mercury: [
        [1974, 'Mariner 10', 'NASA', 'sobrevuelo', 'finalizada', 'Primera nave en visitarlo: 3 sobrevuelos y el 45 % de la superficie fotografiada.', 'Mariner 10 Mercury'],
        [2004, 'MESSENGER', 'NASA', 'orbitador', 'finalizada', 'Cuatro años en órbita: mapa completo, núcleo gigante de hierro y hielo en cráteres polares. Terminó estrellándose en 2015.', 'MESSENGER Mercury'],
        [2018, 'BepiColombo', 'ESA / JAXA', 'orbitador', 'en ruta', 'Dos orbitadores viajando juntos; tras seis sobrevuelos, su llegada a la órbita está prevista para finales de 2026.', 'BepiColombo']
    ],
    venus: [
        [1970, 'Venera 7', 'URSS', 'aterrizador', 'finalizada', 'Primer aterrizaje suave en otro planeta: transmitió 23 minutos desde 475 °C.'],
        [1982, 'Venera 13', 'URSS', 'aterrizador', 'finalizada', 'Primeras fotos a color de la superficie; aguantó 127 minutos.'],
        [1989, 'Magellan', 'NASA', 'orbitador', 'finalizada', 'Atravesó las nubes con radar y cartografió el 98 % de la superficie.', 'Magellan Venus radar'],
        [2005, 'Venus Express', 'ESA', 'orbitador', 'finalizada', 'Estudió el invernadero desbocado y el vórtice doble del polo sur.'],
        [2015, 'Akatsuki', 'JAXA', 'orbitador', 'finalizada', 'Siguió la superrotación: la atmósfera da la vuelta al planeta en 4 días.'],
        [2031, 'DAVINCI', 'NASA', 'sonda', 'futura', 'Bajará en paracaídas a través de la atmósfera midiendo gases nobles y fotografiando las montañas Alpha Regio.', 'DAVINCI Venus']
    ],
    earth: [
        [1957, 'Sputnik 1', 'URSS', 'orbitador', 'finalizada', 'El primer satélite artificial de la historia.'],
        [1958, 'Explorer 1', 'NASA', 'orbitador', 'finalizada', 'Descubrió los cinturones de radiación de Van Allen.', 'Explorer 1'],
        [1968, 'Apolo 8', 'NASA', 'tripulada', 'finalizada', 'Primeros humanos en orbitar la Luna; tomaron la foto "Salida de la Tierra".', 'Apollo 8 Earthrise'],
        [1972, 'Landsat', 'NASA / USGS', 'orbitador', 'activa', 'La serie más larga de fotos de la Tierra desde el espacio: más de 50 años de cambios.', 'Landsat'],
        [1998, 'Estación Espacial Internacional', 'NASA / Roscosmos / ESA / JAXA / CSA', 'tripulada', 'activa', 'Habitada sin interrupción desde el año 2000.', 'International Space Station Earth'],
        [2015, 'DSCOVR · EPIC', 'NASA / NOAA', 'observatorio', 'hito', 'Desde 1.5 millones de km fotografía la cara iluminada completa de la Tierra varias veces al día.', 'DSCOVR EPIC Earth']
    ],
    moon: [
        [1959, 'Luna 2', 'URSS', 'impacto', 'finalizada', 'Primer objeto humano en tocar otro mundo.'],
        [1966, 'Luna 9', 'URSS', 'aterrizador', 'finalizada', 'Primer aterrizaje suave y primeras fotos desde la superficie lunar.'],
        [1969, 'Apolo 11', 'NASA', 'tripulada', 'finalizada', 'Armstrong y Aldrin caminan sobre la Luna; traen 21.5 kg de rocas.', 'Apollo 11'],
        [1972, 'Apolo 17', 'NASA', 'tripulada', 'finalizada', 'Última visita humana hasta hoy; el programa Apolo trajo en total 382 kg de muestras.', 'Apollo 17'],
        [2009, 'Lunar Reconnaissance Orbiter', 'NASA', 'orbitador', 'activa', 'El mapa lunar más detallado: ha fotografiado incluso los módulos del Apolo.', 'Lunar Reconnaissance Orbiter'],
        [2019, "Chang'e 4", 'CNSA', 'rover', 'hito', 'Primer aterrizaje en la cara oculta de la Luna.'],
        [2022, 'Artemis I', 'NASA', 'orbitador', 'finalizada', 'La cápsula Orion viajó sin tripulación alrededor de la Luna y volvió.', 'Artemis I Orion'],
        [2023, 'Chandrayaan-3', 'ISRO', 'aterrizador', 'finalizada', 'Primer aterrizaje cerca del polo sur lunar.']
    ],
    mars: [
        [1965, 'Mariner 4', 'NASA', 'sobrevuelo', 'finalizada', 'Primeras fotos de cerca: un mundo de cráteres, lejos de los "canales" imaginados.', 'Mariner 4'],
        [1976, 'Viking 1', 'NASA', 'aterrizador', 'finalizada', 'Aterrizó y buscó vida con experimentos biológicos; funcionó más de 6 años.', 'Viking 1 Mars'],
        [1997, 'Mars Pathfinder · Sojourner', 'NASA', 'rover', 'finalizada', 'El primer rover en otro planeta.', 'Mars Pathfinder Sojourner'],
        [2004, 'Spirit y Opportunity', 'NASA', 'rover', 'finalizada', 'Hallaron rastros de agua antigua; Spirit filmó torbellinos de polvo y Opportunity recorrió 45 km en 14 años.', 'Spirit rover dust devil'],
        [2012, 'Curiosity', 'NASA', 'rover', 'activa', 'Encontró en el cráter Gale los sedimentos de un lago antiguo apto para la vida.', 'Curiosity rover'],
        [2018, 'InSight', 'NASA', 'aterrizador', 'finalizada', 'Sismómetro en la superficie: registró más de 1,300 martemotos y midió el núcleo.', 'InSight Mars'],
        [2021, 'Perseverance · Ingenuity', 'NASA', 'rover', 'activa', 'Guarda muestras en el cráter Jezero; Ingenuity hizo el primer vuelo propulsado en otro planeta (72 vuelos).', 'Perseverance Ingenuity'],
        [2021, 'Tianwen-1 · Zhurong', 'CNSA', 'rover', 'hito', 'Orbitador, aterrizador y rover en la primera misión china a Marte.']
    ],
    jupiter: [
        [1973, 'Pioneer 10', 'NASA', 'sobrevuelo', 'finalizada', 'Primera nave en cruzar el cinturón de asteroides y visitar Júpiter.', 'Pioneer 10 Jupiter'],
        [1979, 'Voyager 1 y 2', 'NASA', 'sobrevuelo', 'finalizada', 'Descubrieron los volcanes de Ío y un tenue sistema de anillos.', 'Voyager Jupiter'],
        [1995, 'Galileo', 'NASA', 'orbitador', 'finalizada', 'Primer orbitador de Júpiter; soltó una sonda dentro de la atmósfera y halló pistas del océano de Europa.', 'Galileo Jupiter'],
        [2016, 'Juno', 'NASA', 'orbitador', 'hito', 'Órbitas polares: ciclones gigantes en los polos y un núcleo "difuso".', 'Juno Jupiter'],
        [2023, 'JUICE', 'ESA', 'orbitador', 'en ruta', 'Llegará en 2031 para estudiar Ganímedes, Calisto y Europa.', 'JUICE Jupiter'],
        [2024, 'Europa Clipper', 'NASA', 'orbitador', 'en ruta', 'Llegará en 2030 para estudiar si el océano de Europa podría albergar vida.', 'Europa Clipper']
    ],
    io: [
        [1979, 'Voyager 1', 'NASA', 'sobrevuelo', 'finalizada', 'Descubrió el primer vulcanismo activo fuera de la Tierra.', 'Voyager Io volcano'],
        [1995, 'Galileo', 'NASA', 'orbitador', 'finalizada', 'Pasó varias veces muy cerca y fotografió erupciones y lagos de lava.', 'Galileo Io'],
        [2007, 'New Horizons', 'NASA', 'sobrevuelo', 'finalizada', 'De camino a Plutón captó una pluma volcánica de 290 km de alto.', 'New Horizons Io'],
        [2023, 'Juno', 'NASA', 'orbitador', 'hito', 'Sobrevuelos a ~1,500 km entre 2023 y 2024: lagos de lava y montañas en detalle.', 'Juno Io']
    ],
    europa: [
        [1979, 'Voyager 2', 'NASA', 'sobrevuelo', 'finalizada', 'Reveló una superficie de hielo cruzada por grietas.', 'Voyager Europa'],
        [1995, 'Galileo', 'NASA', 'orbitador', 'finalizada', 'Su magnetómetro detectó un océano salado bajo el hielo.', 'Galileo Europa'],
        [2016, 'Telescopio Hubble', 'NASA / ESA', 'observatorio', 'activa', 'Observó posibles plumas de vapor de agua saliendo de la superficie.', 'Hubble Europa plumes'],
        [2022, 'Juno', 'NASA', 'orbitador', 'hito', 'Pasó a 352 km de la superficie y tomó las fotos más cercanas en 20 años.', 'Juno Europa'],
        [2024, 'Europa Clipper', 'NASA', 'orbitador', 'en ruta', 'Llegará en 2030 y hará decenas de sobrevuelos para medir el hielo y el océano.', 'Europa Clipper']
    ],
    saturn: [
        [1979, 'Pioneer 11', 'NASA', 'sobrevuelo', 'finalizada', 'Primera nave en visitar Saturno.', 'Pioneer 11 Saturn'],
        [1980, 'Voyager 1', 'NASA', 'sobrevuelo', 'finalizada', 'Detalló los anillos y la atmósfera de Titán.', 'Voyager 1 Saturn'],
        [1981, 'Voyager 2', 'NASA', 'sobrevuelo', 'finalizada', 'Descubrió estructuras finas en los anillos y nuevas lunas.', 'Voyager 2 Saturn'],
        [1997, 'Cassini-Huygens', 'NASA / ESA / ASI', 'orbitador', 'finalizada', '13 años en órbita: géiseres de Encélado, el hexágono polar y el "Grand Finale" entre los anillos. Se sumergió en Saturno en 2017.', 'Cassini Saturn']
    ],
    titan: [
        [1980, 'Voyager 1', 'NASA', 'sobrevuelo', 'finalizada', 'Descubrió que Titán tiene una atmósfera más densa que la de la Tierra.', 'Voyager Titan'],
        [2004, 'Cassini', 'NASA / ESA / ASI', 'orbitador', 'finalizada', 'Más de 120 sobrevuelos: su radar vio mares y lagos de metano.', 'Cassini Titan lakes'],
        [2005, 'Huygens', 'ESA', 'aterrizador', 'finalizada', 'El aterrizaje más lejano jamás logrado (14 de enero de 2005).', 'Huygens Titan'],
        [2028, 'Dragonfly', 'NASA', 'helicoptero', 'futura', 'Un dron nuclear que volará entre dunas de Titán buscando química prebiótica (llegada prevista en 2034).', 'Dragonfly Titan']
    ],
    uranus: [
        [1986, 'Voyager 2', 'NASA', 'sobrevuelo', 'finalizada', 'La única visita: descubrió 10 lunas, 2 anillos y su campo magnético torcido.', 'Voyager 2 Uranus'],
        [1990, 'Telescopio Hubble', 'NASA / ESA', 'observatorio', 'activa', 'Ha seguido sus estaciones extremas y sus auroras.', 'Hubble Uranus'],
        [2023, 'Telescopio James Webb', 'NASA / ESA / CSA', 'observatorio', 'activa', 'Fotografió sus anillos y el casquete polar en infrarrojo.', 'Webb Uranus']
    ],
    neptune: [
        [1989, 'Voyager 2', 'NASA', 'sobrevuelo', 'finalizada', 'La única visita: la Gran Mancha Oscura, vientos de 2,100 km/h y géiseres en Tritón.', 'Voyager 2 Neptune'],
        [1994, 'Telescopio Hubble', 'NASA / ESA', 'observatorio', 'activa', 'Vio que la Gran Mancha Oscura había desaparecido: sus tormentas van y vienen.', 'Hubble Neptune'],
        [2022, 'Telescopio James Webb', 'NASA / ESA / CSA', 'observatorio', 'activa', 'Las mejores imágenes de sus anillos desde Voyager.', 'Webb Neptune rings']
    ],
    pluto: [
        [1930, 'Descubrimiento', 'Observatorio Lowell', 'observatorio', 'finalizada', 'Clyde Tombaugh lo encuentra comparando placas fotográficas.', 'Clyde Tombaugh Pluto'],
        [2005, 'Telescopio Hubble', 'NASA / ESA', 'observatorio', 'activa', 'Descubrió cuatro de sus cinco lunas: Nix, Hidra, Cerbero y Estigia.', 'Hubble Pluto moons'],
        [2015, 'New Horizons', 'NASA', 'sobrevuelo', 'hito', 'Pasó a 12,500 km: el "corazón" de hielo de nitrógeno y montañas de hielo de agua. En 2019 visitó Arrokoth.', 'New Horizons Pluto']
    ],
    pulsar: [
        [1967, 'Primer púlsar', 'Universidad de Cambridge', 'observatorio', 'finalizada', 'Jocelyn Bell detecta pulsos de radio regulares: las estrellas de neutrones existen.'],
        [1968, 'Púlsar de Vela', 'Observatorio Molonglo', 'observatorio', 'finalizada', 'Se descubre este púlsar dentro de los restos de una supernova: la prueba de que nacen en explosiones.'],
        [1999, 'Observatorio Chandra', 'NASA', 'observatorio', 'activa', 'Filmó el chorro de partículas de Vela moviéndose como una manguera sin control.', 'Chandra Vela pulsar'],
        [2008, 'Telescopio Fermi', 'NASA', 'observatorio', 'activa', 'Vela es la fuente de rayos gamma persistente más brillante del cielo.', 'Fermi gamma ray pulsar'],
        [2017, 'NICER', 'NASA', 'observatorio', 'activa', 'Desde la Estación Espacial mide púlsares con tanta precisión que sirvieron para probar navegación espacial.', 'NICER neutron star']
    ],
    gargantua: [
        [1971, 'Uhuru · Cygnus X-1', 'NASA', 'observatorio', 'finalizada', 'El primer objeto aceptado como agujero negro, descubierto por sus rayos X.', 'Cygnus X-1'],
        [1999, 'Observatorio Chandra', 'NASA', 'observatorio', 'activa', 'Ve en rayos X el gas que se calienta a millones de grados antes de caer.', 'Chandra black hole'],
        [2015, 'LIGO · GW150914', 'LIGO / NSF', 'observatorio', 'finalizada', 'Primera onda gravitacional detectada: dos agujeros negros fusionándose. Premio Nobel 2017.', 'LIGO gravitational waves'],
        [2019, 'Event Horizon Telescope · M87*', 'EHT', 'observatorio', 'finalizada', 'La primera foto de un agujero negro: una sombra rodeada por un anillo de luz.', 'Event Horizon Telescope M87'],
        [2022, 'Event Horizon Telescope · Sgr A*', 'EHT', 'observatorio', 'finalizada', 'La imagen del agujero negro del centro de nuestra galaxia.', 'Sagittarius A* Event Horizon Telescope'],
        [2024, 'Gaia BH3', 'ESA', 'observatorio', 'finalizada', 'El agujero negro estelar más masivo de la Vía Láctea: 33 veces el Sol, hallado por el bamboleo de su estrella compañera.']
    ]
};

// Evidencia real que respalda cada Génesis y la misión que la midió.
const GENESIS_PROOF = {
    sun: ['La misión Genesis trajo viento solar a la Tierra para medir de qué está hecho el Sol; los granos más viejos de meteoritos fechan su nacimiento en 4,567 Ma.', 'Genesis'],
    mercury: ['MESSENGER midió su enorme núcleo de hierro y halló hielo en cráteres polares en sombra perpetua.', 'MESSENGER'],
    venus: ['Magellan cartografió el 98 % de su superficie con radar: casi sin cráteres viejos, la renovaron los volcanes.', 'Magellan'],
    earth: ['Las rocas del Apolo tienen casi la misma firma de oxígeno que la Tierra: una pista fuerte del impacto de Theia.', 'Apolo 11'],
    moon: ['Las rocas del Apolo fechan la Luna en unos 4,460 Ma y muestran que estuvo cubierta por un océano de magma.', 'Apolo 11'],
    mars: ['Curiosity encontró en el cráter Gale los sedimentos de un antiguo lago: Marte tuvo agua líquida estable.', 'Curiosity'],
    jupiter: ['Juno descubrió que su núcleo es "difuso": roca y hielo mezclados con hidrógeno, no una bola compacta.', 'Juno'],
    io: ['Juno pasó a unos 1,500 km de Ío y fotografió lagos de lava activos.', 'Juno'],
    europa: ['El magnetómetro de Galileo detectó un océano salado bajo el hielo.', 'Galileo'],
    saturn: ['En su Grand Finale, Cassini pesó los anillos: son jóvenes, quizá de pocos cientos de millones de años.', 'Cassini-Huygens'],
    titan: ['Huygens aterrizó en 2005 sobre un suelo húmedo de metano con guijarros de hielo redondeados por líquidos.', 'Huygens'],
    uranus: ['Voyager 2 midió su campo magnético torcido 59°: otra pista del gran choque que lo dejó de lado.', 'Voyager 2'],
    neptune: ['Voyager 2 midió vientos de 2,100 km/h, los más rápidos del Sistema Solar.', 'Voyager 2'],
    pluto: ['New Horizons vio llanuras de hielo de nitrógeno sin cráteres: Plutón sigue activo.', 'New Horizons'],
    pulsar: ['Fermi ve al púlsar de Vela, nacido en una supernova hace unos 11,000 años, como la fuente de rayos gamma persistente más brillante del cielo.', 'Telescopio Fermi'],
    gargantua: ['LIGO captó en 2015 la fusión de dos agujeros negros; en 2019 el EHT tomó la primera foto de uno.', 'LIGO · GW150914']
};
