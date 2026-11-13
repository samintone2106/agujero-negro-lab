/* -------------------------------------------------------------------------- */
/* SITIOS DE ATERRIZAJE: DATOS REALES DE CADA SUPERFICIE                       */
/* -------------------------------------------------------------------------- */
// 1 unidad = 1 metro. radiusKm da la curvatura (y la distancia real al horizonte).
// sky: colores cénit/horizonte y halo del Sol · fog: densidad de la atmósfera ·
// skyBody: astro grande en el cielo con su tamaño aparente real (grados).
const SURFACE_SITES = {
    moon: {
        place: 'Mar de la Tranquilidad', note: 'Donde alunizó el Apolo 11 (1969).',
        radiusKm: 1737, gravity: '1.62 m/s² (1/6 de la Tierra)', temp: '-173 °C a 127 °C', pressure: 'Casi vacío (exosfera)',
        sky: { zenith: 0x000000, horizon: 0x000000, halo: 0x000000, stars: true, sunDeg: 0.53, sunColor: 0xffffff, sunElev: 18 },
        fog: 0, ground: [[0.17, 0.165, 0.16], [0.3, 0.29, 0.275]], relief: 14, craters: 420, roughness: 1,
        skyBody: { tex: 'earth_atmos_2048.jpg', deg: 1.9, elev: 35, az: 140 },
        facts: ['El horizonte está a solo ~2.4 km: la Luna es pequeña y se curva rápido.', 'Sin aire no hay cielo azul ni sonido: el cielo es negro aun de día.', 'La Tierra se ve casi 4 veces más grande que la Luna llena desde aquí.']
    },
    mercury: {
        place: 'Borde de la cuenca Caloris', note: 'Una de las cuencas de impacto más grandes del Sistema Solar (1,550 km).',
        radiusKm: 2440, gravity: '3.7 m/s²', temp: '-180 °C de noche a 430 °C de día', pressure: 'Casi vacío (exosfera)',
        sky: { zenith: 0x000000, horizon: 0x000000, halo: 0x332211, stars: true, sunDeg: 1.4, sunColor: 0xfffbf0, sunElev: 12 },
        fog: 0, ground: [[0.16, 0.155, 0.15], [0.3, 0.29, 0.27]], relief: 18, craters: 380, roughness: 1,
        facts: ['El Sol se ve 2 a 3 veces más grande que desde la Tierra.', 'Un día solar dura 176 días terrestres.', 'MESSENGER halló hielo en los cráteres polares que nunca reciben sol.']
    },
    venus: {
        place: 'Phoebe Regio', note: 'Cerca de donde aterrizó la Venera 13 (1982).',
        radiusKm: 6052, gravity: '8.87 m/s²', temp: '465 °C (más caliente que Mercurio)', pressure: '92 bar (como 900 m bajo el mar)',
        sky: { zenith: 0x8a5a1c, horizon: 0xd29a48, halo: 0xe8b060, stars: false, sunDeg: 0, sunColor: 0xffd590, sunElev: 40 },
        fog: 0.0016, ground: [[0.34, 0.22, 0.12], [0.55, 0.38, 0.2]], relief: 5, craters: 0, plates: true, roughness: 0.9,
        facts: ['Las nubes de ácido sulfúrico dejan pasar luz anaranjada y tenue: el Sol no se ve.', 'La Venera 13 sobrevivió 127 minutos antes de fundirse.', 'Las rocas son placas planas de basalto.']
    },
    earth: {
        place: 'Costa del Caribe', note: 'Tu planeta: agua líquida, aire respirable y vida.',
        radiusKm: 6371, gravity: '9.81 m/s²', temp: '~27 °C', pressure: '1 bar',
        sky: { zenith: 0x2f6fd8, horizon: 0xbfdcff, halo: 0xfff4d8, stars: false, sunDeg: 0.53, sunColor: 0xffffff, sunElev: 30 },
        fog: 0.00012, ground: [[0.20, 0.32, 0.12], [0.45, 0.42, 0.28]], relief: 30, craters: 0, sea: 0x1d5f8f, roughness: 0.95,
        facts: ['El cielo es azul porque el aire dispersa más la luz azul (dispersión de Rayleigh).', 'El horizonte está a ~4.7 km para alguien de pie en la playa.', 'Es el único lugar conocido con vida.']
    },
    mars: {
        place: 'Cráter Jezero', note: 'Un antiguo lago donde explora Perseverance desde 2021.',
        radiusKm: 3390, gravity: '3.72 m/s² (38 % de la Tierra)', temp: '-80 °C a 20 °C', pressure: '~6 milibares (0.6 % de la Tierra)',
        sky: { zenith: 0xb98a62, horizon: 0xe2b98e, halo: 0x9cb8e0, stars: false, sunDeg: 0.35, sunColor: 0xfff2e0, sunElev: 22 },
        fog: 0.00009, ground: [[0.42, 0.22, 0.12], [0.66, 0.42, 0.26]], relief: 22, craters: 120, dunes: true, roughness: 1,
        devils: true,
        facts: ['De día el cielo es color caramelo por el polvo; al atardecer se vuelve azul alrededor del Sol.', 'Los torbellinos de polvo miden de cientos de metros a ~20 km de alto: varios están en el horizonte.', 'El horizonte está a ~3.4 km.']
    },
    io: {
        place: 'Llanuras de Ío cerca de Prometeo', note: 'Volcán con una pluma de ~100 km de alto.',
        radiusKm: 1822, gravity: '1.80 m/s²', temp: '-130 °C (lava a 1,600 °C)', pressure: 'Casi vacío',
        sky: { zenith: 0x000000, horizon: 0x000000, halo: 0x000000, stars: true, sunDeg: 0.1, sunColor: 0xffffff, sunElev: 25 },
        fog: 0, ground: [[0.62, 0.55, 0.22], [0.86, 0.78, 0.42]], relief: 16, craters: 0, lava: true, roughness: 1,
        skyBody: { tex: 'jupiter.jpg', deg: 19, elev: 28, az: 200 }, plume: true,
        facts: ['Júpiter ocupa 19° del cielo: casi 40 veces el tamaño de la Luna llena vista desde la Tierra.', 'No hay cráteres: los volcanes repavimentan todo.', 'El azufre pinta el suelo de amarillo, rojo y blanco.']
    },
    europa: {
        place: 'Conamara Chaos', note: 'Bloques de hielo que se rompieron y volvieron a congelar sobre el océano.',
        radiusKm: 1561, gravity: '1.31 m/s²', temp: '-160 °C', pressure: 'Casi vacío',
        sky: { zenith: 0x000000, horizon: 0x000000, halo: 0x000000, stars: true, sunDeg: 0.1, sunColor: 0xffffff, sunElev: 20 },
        fog: 0, ground: [[0.62, 0.58, 0.52], [0.9, 0.9, 0.92]], relief: 12, craters: 6, ridges: true, roughness: 0.6,
        skyBody: { tex: 'jupiter.jpg', deg: 12, elev: 30, az: 160 },
        facts: ['Bajo tus pies hay entre 15 y 25 km de hielo y luego un océano salado.', 'Júpiter se ve 24 veces más grande que nuestra Luna llena.', 'Las crestas dobles se forman cuando la marea abre y cierra grietas.']
    },
    titan: {
        place: 'Zona de aterrizaje de Huygens', note: 'Llanura con guijarros de hielo redondeados por líquidos (2005).',
        radiusKm: 2575, gravity: '1.35 m/s²', temp: '-179 °C', pressure: '1.5 bar (más que en la Tierra)',
        sky: { zenith: 0x8a5a24, horizon: 0xd08a3c, halo: 0xe0a050, stars: false, sunDeg: 0, sunColor: 0xffd090, sunElev: 30 },
        fog: 0.0028, ground: [[0.34, 0.24, 0.14], [0.52, 0.38, 0.22]], relief: 8, craters: 0, pebbles: true, lake: 0x1a1208, roughness: 0.9,
        facts: ['Con aire denso y poca gravedad, una persona podría volar batiendo alas.', 'Los "guijarros" son hielo de agua tan duro como roca.', 'Llueve metano: los lagos son de hidrocarburos líquidos.']
    },
    pluto: {
        place: 'Sputnik Planitia', note: 'El "corazón": un glaciar de nitrógeno de 1,000 km que se renueva.',
        radiusKm: 1188, gravity: '0.62 m/s²', temp: '-230 °C', pressure: '~0.01 milibares',
        sky: { zenith: 0x000002, horizon: 0x0a1428, halo: 0x10203a, stars: true, sunDeg: 0.016, sunColor: 0xfff6e8, sunElev: 14 },
        fog: 0, ground: [[0.62, 0.58, 0.56], [0.86, 0.82, 0.78]], relief: 6, craters: 0, cells: true, roughness: 0.7,
        skyBody: { look: 'charon', deg: 3.5, elev: 22, az: 130 },
        facts: ['Caronte nunca se mueve en el cielo: Plutón y Caronte se miran siempre la misma cara.', 'La luz del Sol es ~1,000 veces más débil que en la Tierra, pero más brillante que la Luna llena.', 'El hielo forma celdas de convección de 20–30 km.']
    }
};
