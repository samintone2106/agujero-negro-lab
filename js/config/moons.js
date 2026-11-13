/* -------------------------------------------------------------------------- */
/* LUNAS REALES DE CADA PLANETA                                                */
/* -------------------------------------------------------------------------- */
// period: días reales de una órbita · km: radio medio real · found: descubrimiento
// (NASA Planetary Fact Sheets / JPL). Distancias y tamaños en escena están
// comprimidos para que quepan en pantalla; el orden y la proporción de los
// periodos se respetan (ver MOON_TIME_SCALE en js/scene/bodies/moons.js).
// orbit: radio en escena · size: radio en escena · tex: mapa real local · look: textura con sus rasgos.
const MOONS = {
    earth: [
        { name: 'Luna', period: 27.32, orbit: 9.5, size: 0.62, tex: 'moon.jpg', incl: 0.09, km: 1737.4, found: 'Conocida desde siempre',
          fact: 'A 384,400 km. Siempre nos muestra la misma cara y se aleja 3.8 cm por año.' }
    ],
    mars: [
        { name: 'Fobos', period: 0.319, orbit: 3.6, size: 0.16, look: 'phobos', lumpy: 0.35, km: 11.3, found: 'Asaph Hall, 1877',
          fact: 'Da tres vueltas a Marte cada día. Su cráter Stickney mide 9 km de sus 22. En unos 50 Ma se romperá en un anillo.' },
        { name: 'Deimos', period: 1.263, orbit: 5.4, size: 0.11, look: 'deimos', lumpy: 0.3, km: 6.2, found: 'Asaph Hall, 1877',
          fact: 'Mide 12 km: desde Marte se ve como una estrella brillante.' }
    ],
    jupiter: [
        { name: 'Amaltea', period: 0.498, orbit: 3.7, size: 0.1, look: 'amalthea', lumpy: 0.4, km: 83.5, found: 'E. E. Barnard, 1892',
          fact: 'La más roja del Sistema Solar y con forma de papa: su polvo alimenta el tenue anillo de Júpiter.' },
        { name: 'Ío', period: 1.769, orbit: 5.0, size: 0.24, look: 'io', km: 1821.6, found: 'Galileo Galilei, 1610',
          fact: 'El mundo más volcánico del Sistema Solar: la marea de Júpiter lo amasa y lo funde por dentro.' },
        { name: 'Europa', period: 3.551, orbit: 6.4, size: 0.21, tex: 'europa.jpg', km: 1560.8, found: 'Galileo Galilei, 1610',
          fact: 'Bajo 15–25 km de hielo hay un océano salado con más agua que todos los de la Tierra.' },
        { name: 'Ganímedes', period: 7.155, orbit: 8.4, size: 0.34, look: 'ganymede', km: 2634.1, found: 'Galileo Galilei, 1610',
          fact: 'La luna más grande del Sistema Solar, mayor que Mercurio, y la única con campo magnético propio.' },
        { name: 'Calisto', period: 16.69, orbit: 11.0, size: 0.31, look: 'callisto', km: 2410.3, found: 'Galileo Galilei, 1610',
          fact: 'La superficie más llena de cráteres conocida; la cuenca Valhalla tiene anillos de 3,800 km.' }
    ],
    saturn: [
        { name: 'Mimas', period: 0.942, orbit: 13.0, size: 0.13, look: 'mimas', km: 198.2, found: 'William Herschel, 1789',
          fact: 'Su cráter Herschel ocupa un tercio de su diámetro.' },
        { name: 'Encélado', period: 1.370, orbit: 14.6, size: 0.15, look: 'enceladus', km: 252.1, found: 'William Herschel, 1789',
          fact: 'Las "rayas de tigre" del polo sur lanzan géiseres de agua que alimentan el anillo E (Cassini).' },
        { name: 'Tetis', period: 1.888, orbit: 15.3, size: 0.2, look: 'tethys', km: 531.1, found: 'Giovanni Cassini, 1684',
          fact: 'Casi toda de hielo de agua. Su cráter Odiseo mide 450 km y el cañón Ítaca recorre tres cuartos de su vuelta.' },
        { name: 'Dione', period: 2.737, orbit: 16.4, size: 0.21, look: 'dione', km: 561.4, found: 'Giovanni Cassini, 1684',
          fact: 'Sus "rayas finas" brillantes son acantilados de hielo de cientos de metros (Cassini).' },
        { name: 'Rea', period: 4.518, orbit: 18.0, size: 0.22, look: 'rhea', km: 763.8, found: 'Giovanni Cassini, 1672',
          fact: 'Segunda luna de Saturno: hielo y roca muy antiguos.' },
        { name: 'Titán', period: 15.945, orbit: 22.0, size: 0.42, tex: 'titan.jpg', km: 2574.7, found: 'Christiaan Huygens, 1655',
          fact: 'Atmósfera más densa que la de la Tierra, lluvia de metano y lagos de hidrocarburos.' },
        { name: 'Hiperión', period: 21.28, orbit: 24.5, size: 0.14, look: 'hyperion', lumpy: 0.5, km: 135, found: 'Bond y Lassell, 1848', tumble: true,
          fact: 'Parece una esponja y gira de forma caótica: nadie puede predecir hacia dónde apuntará.' },
        { name: 'Jápeto', period: 79.33, orbit: 29.0, size: 0.28, look: 'iapetus', km: 734.4, found: 'Giovanni Cassini, 1671', incl: 0.27,
          fact: 'Mitad negra como el carbón y mitad blanca como la nieve, con una cresta en el ecuador de hasta 20 km de alto.' }
    ],
    uranus: [
        { name: 'Miranda', period: 1.413, orbit: 5.2, size: 0.13, look: 'miranda', km: 235.8, found: 'Gerard Kuiper, 1948',
          fact: 'Tiene el acantilado más alto conocido: Verona Rupes, unos 20 km de caída.' },
        { name: 'Ariel', period: 2.520, orbit: 6.8, size: 0.19, look: 'ariel', km: 578.9, found: 'William Lassell, 1851',
          fact: 'La luna más brillante de Urano, cruzada por cañones.' },
        { name: 'Umbriel', period: 4.144, orbit: 8.2, size: 0.2, look: 'umbriel', km: 584.7, found: 'William Lassell, 1851',
          fact: 'La luna más oscura de Urano; el anillo brillante del cráter Wunda resalta como un aro.' },
        { name: 'Titania', period: 8.706, orbit: 9.6, size: 0.24, look: 'titania', km: 788.9, found: 'William Herschel, 1787',
          fact: 'La mayor luna de Urano.' },
        { name: 'Oberón', period: 13.46, orbit: 11.2, size: 0.23, look: 'oberon', km: 761.4, found: 'William Herschel, 1787',
          fact: 'La más lejana de las grandes lunas de Urano, con cráteres de fondo oscuro.' }
    ],
    neptune: [
        { name: 'Proteo', period: 1.122, orbit: 4.4, size: 0.13, look: 'proteus', lumpy: 0.35, km: 210, found: 'Voyager 2, 1989',
          fact: 'Casi del tamaño máximo que puede tener un cuerpo sin volverse esférico por su propia gravedad.' },
        { name: 'Tritón', period: 5.877, orbit: 7.2, size: 0.3, look: 'triton', retro: true, incl: 0.4, km: 1353.4, found: 'William Lassell, 1846',
          fact: 'Gira al revés que Neptuno: es un objeto del cinturón de Kuiper capturado. Voyager 2 vio géiseres de nitrógeno.' },
        { name: 'Nereida', period: 360.1, orbit: 13, ecc: 0.75, size: 0.1, look: 'deimos', km: 170, found: 'Gerard Kuiper, 1949',
          fact: 'Una de las órbitas más excéntricas conocidas: su distancia a Neptuno va de 1.4 a 9.7 millones de km.' }
    ],
    pluto: [
        { name: 'Estigia', period: 20.16, orbit: 13, size: 0.05, look: 'deimos', lumpy: 0.4, km: 5, found: 'Telescopio Hubble, 2012', fact: 'Una de las lunas más pequeñas de Plutón (unos 10 km).' },
        { name: 'Nix', period: 24.85, orbit: 14.5, size: 0.08, look: 'deimos', lumpy: 0.45, km: 25, found: 'Telescopio Hubble, 2005', fact: 'Alargada (unos 50 km) y con un cráter rojizo visto por New Horizons.' },
        { name: 'Cerbero', period: 32.17, orbit: 15.5, size: 0.05, look: 'deimos', lumpy: 0.5, km: 6, found: 'Telescopio Hubble, 2011', fact: 'Parece dos bolitas pegadas.' },
        { name: 'Hidra', period: 38.2, orbit: 17, size: 0.08, look: 'deimos', lumpy: 0.45, km: 25, found: 'Telescopio Hubble, 2005', fact: 'Su superficie es casi hielo de agua puro y muy brillante.' }
    ]
};

// Caronte vive en js/scene/bodies/solar-system.js (crece en el Génesis de Plutón).
const CHARON_INFO = { name: 'Caronte', period: 6.387, km: 606, found: 'James Christy, 1978',
    fact: 'Tan grande frente a Plutón que ambos giran alrededor de un punto en el espacio, siempre mirándose la misma cara.' };
