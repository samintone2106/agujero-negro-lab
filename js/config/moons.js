/* -------------------------------------------------------------------------- */
/* LUNAS REALES DE CADA PLANETA                                                */
/* -------------------------------------------------------------------------- */
// period: días reales de una órbita (NASA Planetary Fact Sheets). Las distancias y
// tamaños están comprimidos para que quepan en pantalla; el orden y la proporción
// de los periodos se respetan (ver MOON_TIME_SCALE en js/scene/bodies/moons.js).
// orbit: radio en unidades de escena · size: radio en escena · tex: mapa local.
const MOONS = {
    earth: [
        { name: 'Luna', period: 27.32, orbit: 9.5, size: 0.62, tex: 'moon.jpg', incl: 0.09, fact: '384,400 km · nos da siempre la misma cara' }
    ],
    mars: [
        { name: 'Fobos', period: 0.319, orbit: 3.6, size: 0.16, color: 0x8a7a6a, lumpy: 0.35, fact: 'Da 3 vueltas al día · en 50 Ma se romperá en un anillo' },
        { name: 'Deimos', period: 1.263, orbit: 5.4, size: 0.11, color: 0xa69a8a, lumpy: 0.3, fact: '12 km · parece una estrella brillante desde Marte' }
    ],
    jupiter: [
        { name: 'Ío', period: 1.769, orbit: 5.0, size: 0.24, color: 0xe8c860, fact: 'El lugar más volcánico del Sistema Solar' },
        { name: 'Europa', period: 3.551, orbit: 6.4, size: 0.21, tex: 'europa.jpg', fact: 'Océano de agua salada bajo el hielo' },
        { name: 'Ganímedes', period: 7.155, orbit: 8.4, size: 0.34, color: 0x9a8f80, fact: 'La luna más grande: mayor que Mercurio' },
        { name: 'Calisto', period: 16.69, orbit: 11.0, size: 0.31, color: 0x6a6258, fact: 'La superficie con más cráteres conocida' }
    ],
    saturn: [
        { name: 'Mimas', period: 0.942, orbit: 13.0, size: 0.13, color: 0xc8c4bc, fact: 'Su cráter Herschel la hace parecer la Estrella de la Muerte' },
        { name: 'Encélado', period: 1.370, orbit: 14.6, size: 0.15, color: 0xf4f8ff, fact: 'Lanza géiseres de agua al espacio (Cassini)' },
        { name: 'Rea', period: 4.518, orbit: 17.2, size: 0.22, color: 0xbab4aa, fact: 'Segunda luna de Saturno, hielo y roca' },
        { name: 'Titán', period: 15.945, orbit: 22.0, size: 0.42, tex: 'titan.jpg', fact: 'Atmósfera densa y lagos de metano' }
    ],
    uranus: [
        { name: 'Miranda', period: 1.413, orbit: 5.2, size: 0.13, color: 0xb0aca8, fact: 'Acantilado Verona: 20 km de caída' },
        { name: 'Ariel', period: 2.520, orbit: 6.8, size: 0.19, color: 0xc4c0ba, fact: 'La luna más brillante de Urano' },
        { name: 'Titania', period: 8.706, orbit: 9.6, size: 0.24, color: 0xa8a29a, fact: 'La mayor luna de Urano' }
    ],
    neptune: [
        { name: 'Tritón', period: 5.877, orbit: 7.2, size: 0.3, color: 0xd8c4c0, retro: true, incl: 0.4, fact: 'Gira al revés: un planeta enano capturado' }
    ]
};
