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
        { name: 'Rea', period: 4.518, orbit: 17.2, size: 0.22, look: 'rhea', km: 763.8, found: 'Giovanni Cassini, 1672',
          fact: 'Segunda luna de Saturno: hielo y roca muy antiguos.' },
        { name: 'Titán', period: 15.945, orbit: 22.0, size: 0.42, tex: 'titan.jpg', km: 2574.7, found: 'Christiaan Huygens, 1655',
          fact: 'Atmósfera más densa que la de la Tierra, lluvia de metano y lagos de hidrocarburos.' }
    ],
    uranus: [
        { name: 'Miranda', period: 1.413, orbit: 5.2, size: 0.13, look: 'miranda', km: 235.8, found: 'Gerard Kuiper, 1948',
          fact: 'Tiene el acantilado más alto conocido: Verona Rupes, unos 20 km de caída.' },
        { name: 'Ariel', period: 2.520, orbit: 6.8, size: 0.19, look: 'ariel', km: 578.9, found: 'William Lassell, 1851',
          fact: 'La luna más brillante de Urano, cruzada por cañones.' },
        { name: 'Titania', period: 8.706, orbit: 9.6, size: 0.24, look: 'titania', km: 788.9, found: 'William Herschel, 1787',
          fact: 'La mayor luna de Urano.' }
    ],
    neptune: [
        { name: 'Tritón', period: 5.877, orbit: 7.2, size: 0.3, look: 'triton', retro: true, incl: 0.4, km: 1353.4, found: 'William Lassell, 1846',
          fact: 'Gira al revés que Neptuno: es un objeto del cinturón de Kuiper capturado. Voyager 2 vio géiseres de nitrógeno.' }
    ]
};

// Caronte vive en js/scene/bodies/solar-system.js (crece en el Génesis de Plutón).
const CHARON_INFO = { name: 'Caronte', period: 6.387, km: 606, found: 'James Christy, 1978',
    fact: 'Tan grande frente a Plutón que ambos giran alrededor de un punto en el espacio, siempre mirándose la misma cara.' };
