/* -------------------------------------------------------------------------- */
/* DATOS CURIOSOS POR ASTRO ("¿SABÍAS QUE?")                                  */
/* -------------------------------------------------------------------------- */
// Cifras redondeadas de NASA/ESA. Lo que todavía se discute va marcado como tal.
const ASTRO_FACTS = {
    sun: [
        'La luz que ves del Sol salió de su superficie hace 8 minutos y 20 segundos.',
        'Un fotón tarda entre 10,000 y 170,000 años en salir desde el núcleo hasta la superficie.',
        'Cada segundo convierte unos 4 millones de toneladas de materia en energía.',
        'Tiene el 99.86 % de toda la masa del Sistema Solar.',
        'Dentro de unos 5,000 millones de años se hinchará como gigante roja.'
    ],
    mercury: [
        'Un año en Mercurio (88 días) dura menos que dos de sus días solares (176 días).',
        'Aunque es el más cercano al Sol, no es el más caliente: Venus lo supera por su efecto invernadero.',
        'Tiene hielo de agua en cráteres de los polos que nunca reciben luz.',
        'Se está encogiendo: al enfriarse su núcleo, la corteza se arruga en acantilados de kilómetros.'
    ],
    venus: [
        'Gira al revés que casi todos los planetas: allí el Sol sale por el oeste.',
        'Su día (243 días terrestres) es más largo que su año (225 días).',
        'La presión en el suelo es 92 veces la de la Tierra: como estar a 900 m bajo el mar.',
        'Es el objeto natural más brillante del cielo nocturno después de la Luna.'
    ],
    earth: [
        'Es el planeta más denso del Sistema Solar.',
        'El día se alarga ~1.8 milisegundos por siglo porque la Luna frena la rotación con las mareas.',
        'La atmósfera tiene ~100 km de espesor: a escala, más fina que la cáscara de una manzana.',
        'Viajas alrededor del Sol a unos 107,000 km/h sin sentirlo.'
    ],
    moon: [
        'Se aleja de la Tierra unos 3.8 cm por año (lo miden láseres que rebotan en espejos del Apolo).',
        'Siempre nos muestra la misma cara porque gira una vez por cada vuelta a la Tierra.',
        'Las huellas del Apolo pueden durar millones de años: no hay viento ni lluvia que las borre.',
        'Se formó probablemente de los restos de un choque entre la Tierra joven y un planeta del tamaño de Marte (Theia).'
    ],
    mars: [
        'Olympus Mons mide ~22 km de alto: casi 2.5 veces el Everest.',
        'Valles Marineris es tan largo como Estados Unidos de costa a costa.',
        'Sus atardeceres son azules: el polvo dispersa la luz al revés que el aire de la Tierra.',
        'Perseverance guarda muestras de roca para traerlas algún día a la Tierra.'
    ],
    jupiter: [
        'La Gran Mancha Roja es una tormenta más ancha que la Tierra, observada desde hace más de 150 años.',
        'Su día dura apenas ~10 horas: es el planeta que gira más rápido.',
        'Tiene más de 90 lunas conocidas.',
        'Su gravedad desvía muchos cometas que, si no, podrían cruzar más cerca de la Tierra.'
    ],
    io: [
        'Es el lugar con más volcanes activos del Sistema Solar: más de 400.',
        'Las mareas de Júpiter lo estiran y aplastan hasta ~100 m de altura, y eso lo calienta por dentro.',
        'Sus volcanes lanzan azufre a cientos de kilómetros de altura.'
    ],
    europa: [
        'Bajo su hielo hay un océano con más agua que todos los océanos de la Tierra juntos.',
        'Es uno de los mejores lugares para buscar vida fuera de la Tierra; la misión Europa Clipper va en camino (2024).',
        'Su superficie es de las más lisas del Sistema Solar: casi no tiene montañas.'
    ],
    saturn: [
        'Es tan poco denso que, en una bañera gigante, flotaría.',
        'Sus anillos miden ~280,000 km de ancho, pero en muchas partes solo ~10 m de espesor.',
        'En su polo norte hay una tormenta con forma de hexágono.',
        'Los anillos podrían tener solo unos cientos de millones de años (todavía se debate).'
    ],
    titan: [
        'Es la única luna con una atmósfera densa: más que la de la Tierra.',
        'Tiene lagos y mares de metano y etano líquidos; llueve metano.',
        'Con alas en los brazos, una persona podría volar allí aleteando.',
        'La misión Dragonfly (NASA) mandará un dron volador en la década de 2030.'
    ],
    uranus: [
        'Gira acostado: su eje está inclinado ~98°.',
        'Cada polo vive 42 años de luz seguidos y 42 de oscuridad.',
        'Fue el primer planeta descubierto con telescopio (William Herschel, 1781).'
    ],
    neptune: [
        'Tiene los vientos más rápidos medidos en un planeta: ~2,100 km/h.',
        'Se descubrió primero con matemáticas (1846), por cómo tironeaba a Urano.',
        'Desde su descubrimiento ha completado una sola vuelta al Sol (en 2011).'
    ],
    pluto: [
        'Su "corazón" es un glaciar de nitrógeno que se renueva como una lava lenta.',
        'Tiene montañas de hielo de agua de varios kilómetros de alto.',
        'Plutón y Caronte se miran siempre la misma cara: giran juntos como un par de bailarines.',
        'New Horizons tardó 9.5 años en llegar y pasó a su lado en 2015.'
    ],
    pulsar: [
        'Una estrella de neutrones es tan densa que una cucharadita pesaría miles de millones de toneladas.',
        'El púlsar de Vela gira ~11 veces por segundo.',
        'Algunos púlsares son relojes tan precisos como los relojes atómicos.',
        'A veces "saltan" de golpe a girar un poco más rápido: un glitch por reacomodos en su interior.'
    ],
    gargantua: [
        'Cerca de un agujero negro el tiempo corre más lento: en la película, 1 hora en el planeta de Miller eran 7 años en la Tierra.',
        'Gargantúa se diseñó con ayuda del físico Kip Thorne, Nobel 2017.',
        'La foto real de M87* (2019) y la de Sagitario A* (2022) muestran el mismo anillo de luz que predice la relatividad.',
        'Un agujero negro de miles de millones de soles tiene mareas suaves en su horizonte; uno pequeño te estiraría como espagueti antes de llegar.'
    ]
};
