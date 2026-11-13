# Event Horizon

Laboratorio interactivo de exploración espacial y gravedad relativista. La portada está en `index.html` y el simulador en `simulador.html` (el enlace antiguo `event_horizon_viaje_interactivo_hacia_un_agujero_negro.html` redirige al nuevo).

## Ejecutar localmente

Desde la raíz del repositorio:

```sh
python -m http.server 8000
```

Abre `http://localhost:8000/`. No requiere instalación de paquetes ni compilación.

## Estructura

```
index.html                 Portada
simulador.html             Simulador (HTML de la interfaz)
css/simulador.css          Estilos del simulador
js/config/targets.js       Datos de los 16 astros, texturas y audios
js/config/moons.js         Lunas reales de cada planeta (periodos NASA)
js/config/missions.js      Catálogo de misiones por astro y datos reales del Génesis
js/state.js                Estado global
js/audio/engine.js         Motor de audio (síntesis + grabaciones reales)
js/scene/core.js           Escena, cámara, luces y texturas procedurales
js/scene/materials.js      Shaders y materiales de planetas
js/scene/bodies/           Astros, lunas en órbita y torbellinos de polvo de Marte
js/scene/lens.js           Lente gravitacional de Gargantúa (modos cine, EHT, caída)
js/scene/sky.js            Fondo estelar
js/ui/                     Íconos, panel NASA, telemetría, controles y catálogo de misiones
js/surface/                Aterrizar: sitios reales y escena de superficie caminable
js/cosmos/                 Universo: estrellas reales (HYG), Vía Láctea, vecindario estelar, Big Bang y navegador
assets/data/stars.json     8,920 estrellas visibles a simple vista (HYG v3.8, CC BY-SA 4.0)
js/genesis/                Modo Génesis
js/main.js                 Bucle de animación y arranque
assets/                    Texturas y audios
```

Los scripts se cargan en orden desde `simulador.html` y comparten el ámbito global.

## Navegación

La portada enlaza al laboratorio completo y permite abrir destinos concretos mediante el parámetro `target`:

- `?target=saturn`: Saturno.
- `?target=gargantua`: agujero negro.
- `?target=pulsar`: estrella de neutrones.
- `?view=galaxy`, `?view=neighborhood` y `?view=origin` (Big Bang): vistas del universo.

También se admiten los demás identificadores definidos en `ASTRO_TARGETS`. Si no se indica un destino o no es válido, se abre Saturno. El enlace **Inicio** del laboratorio permite regresar a la portada.

## Diseño y dependencias

La portada utiliza HTML, CSS y una ilustración SVG propia, sin JavaScript ni recursos externos. Incluye estilos adaptables, navegación con teclado y respeto por la preferencia de movimiento reducido.

El simulador usa dependencias externas: Tailwind CSS, Lucide, Three.js r128, fuentes, texturas y archivos de la NASA. Requiere conexión a Internet y un navegador con WebGL. Las representaciones visuales son ilustrativas.
