/* -------------------------------------------------------------------------- */
/* GARGANTÚA: LENTE GRAVITACIONAL EN PANTALLA                                  */
/* -------------------------------------------------------------------------- */
// Cada píxel se desvía con la ecuación de una lente puntual: la luz que pasa a
// un ángulo θ del agujero llega desde β = θ (1 − θE² / θ²). Así el fondo y la
// parte trasera del disco se curvan alrededor de la sombra (radio ≈ 2.6 r_s,
// √27/2 veces el horizonte) y aparece el arco por encima y por debajo.
// Modos: CINE (película), EHT (como lo fotografía el Event Horizon Telescope),
// SIN LENTE (render directo) y CAÍDA (la lente crece al acercarse).
const LENS_MODES = {
    cine: { label: 'CINE', note: 'Lente gravitacional: el fondo y la cara oculta del disco se curvan sobre la sombra, como en la película Interstellar.' },
    eht: { label: 'EHT', note: 'Así lo "ve" el Event Horizon Telescope: un anillo borroso de luz alrededor de la sombra. M87* (2019) y Sgr A* (2022), resolución ≈ 20 µas.' },
    fall: { label: 'CAÍDA', note: 'Acércate con el propulsor: la lente crece, el cielo se comprime en un anillo y la luz que cae se corre al azul.' },
    off: { label: 'SIN LENTE', note: 'Modelo 3D sin distorsión: disco de acreción, esfera de fotones y ergosfera como guías.' }
};

const gravLens = (() => {
    const isWebGL2 = renderer.capabilities.isWebGL2;
    const size = renderer.getSize(new THREE.Vector2());
    const pr = renderer.getPixelRatio();
    const makeRT = () => {
        const RT = isWebGL2 && THREE.WebGLMultisampleRenderTarget ? THREE.WebGLMultisampleRenderTarget : THREE.WebGLRenderTarget;
        return new RT(size.x * pr, size.y * pr, { format: THREE.RGBAFormat });
    };
    const rtBack = makeRT();   // fondo + mitad lejana del disco: es lo que la lente curva
    const rtFront = makeRT();  // mitad cercana del disco: pasa por delante de la sombra, sin curvar

    // El disco se corta en dos por un plano que pasa por el agujero, de cara a la cámara.
    renderer.localClippingEnabled = true;
    const clip = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    diskMat.clippingPlanes = [clip];
    const keepAll = () => { clip.normal.set(0, 0, 0); clip.constant = 1; };
    keepAll();
    accretionDisk.layers.enable(1);

    const mat = new THREE.ShaderMaterial({
        uniforms: {
            tBack: { value: rtBack.texture }, tFront: { value: rtFront.texture },
            uCenter: { value: new THREE.Vector2(0.5, 0.5) }, uAspect: { value: 1 },
            uRs: { value: 0.05 }, uEinstein: { value: 3.0 }, uMode: { value: 0 },
            uTime: { value: 0 }, uFall: { value: 0 }, uFront: { value: 1 }
        },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: `
            uniform sampler2D tBack;
            uniform sampler2D tFront;
            uniform vec2 uCenter;
            uniform float uAspect;
            uniform float uRs;
            uniform float uEinstein;
            uniform float uMode;
            uniform float uTime;
            uniform float uFall;
            uniform float uFront;
            varying vec2 vUv;

            vec3 lensed(vec2 p, float thetaE) {
                float r2 = max(dot(p, p), 1e-6);
                vec2 beta = p * (1.0 - thetaE * thetaE / r2);
                vec2 suv = uCenter + beta / vec2(uAspect, 1.0);
                // lo que cae fuera de la pantalla se refleja para no dejar bordes vacíos
                suv = abs(suv); suv = 1.0 - abs(1.0 - suv);
                return texture2D(tBack, suv).rgb;
            }
            vec3 afmhot(float x) { return clamp(vec3(x * 2.0, x * 2.0 - 0.5, x * 2.0 - 1.0), 0.0, 1.0); }

            void main() {
                vec2 p = (vUv - uCenter) * vec2(uAspect, 1.0);
                float r = length(p);
                float grow = 1.0 + uFall * 0.6;
                float shadow = uRs * 2.6 * grow;
                float thetaE = uRs * uEinstein * grow;
                vec3 col;

                if (uMode > 0.5 && uMode < 1.5) {
                    // EHT: solo el anillo de emisión, borroso por la resolución del telescopio
                    float ringR = shadow * 1.04;
                    float w = shadow * 0.32;
                    float ring = exp(-pow((r - ringR) / w, 2.0));
                    float ang = atan(p.y, p.x);
                    float doppler = 1.0 + 0.75 * (-p.y / max(r, 1e-4)) + 0.25 * sin(ang * 2.0 + uTime * 0.6);
                    float flicker = 0.92 + 0.08 * sin(uTime * 1.7 + ang * 3.0);
                    float lum = ring * doppler * flicker * 0.58;
                    lum *= smoothstep(shadow * 0.25, shadow * 0.9, r) * 0.85 + 0.15;
                    col = afmhot(lum);
                } else {
                    float edge = smoothstep(shadow * 0.985, shadow * 1.015, r);
                    // ligera separación de colores al caer (corrimiento al azul de la luz entrante)
                    vec3 c;
                    if (uFall > 0.01) {
                        c.r = lensed(p, thetaE * (1.0 - 0.02 * uFall)).r;
                        c.g = lensed(p, thetaE).g;
                        c.b = lensed(p, thetaE * (1.0 + 0.03 * uFall)).b;
                        c = mix(c, c * vec3(0.75, 0.95, 1.35), uFall * 0.6);
                    } else {
                        c = lensed(p, thetaE);
                    }
                    // anillo de fotones: luz que dio vueltas alrededor del agujero
                    float ring = exp(-pow((r - shadow) / (shadow * 0.035), 2.0));
                    float side = 1.0 + 0.55 * (-p.x / max(r, 1e-4));
                    c += vec3(1.0, 0.78, 0.5) * ring * side * 0.9;
                    col = c * edge + texture2D(tFront, vUv).rgb * uFront;
                    // el cielo se oscurece hacia el borde al caer
                    col *= 1.0 - uFall * 0.45 * smoothstep(0.35, 0.9, length(vUv - 0.5) * 1.4);
                }
                gl_FragColor = vec4(col, 1.0);
            }
        `,
        depthTest: false, depthWrite: false, toneMapped: false
    });
    const quadScene = new THREE.Scene();
    quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
    const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const tmp = new THREE.Vector3();
    const last = new THREE.Vector2(size.x, size.y);
    const now = new THREE.Vector2();
    let lastRatio = pr;
    function syncSize() {
        renderer.getSize(now);
        const ratio = renderer.getPixelRatio();
        if (now.equals(last) && ratio === lastRatio) return;
        last.copy(now); lastRatio = ratio;
        rtBack.setSize(now.x * ratio, now.y * ratio);
        rtFront.setSize(now.x * ratio, now.y * ratio);
    }

    const MODE_ID = { cine: 0, eht: 1, fall: 2 };
    const guides = [photonSphereMesh, ergosphereMesh];

    return {
        mode: 'cine',
        setMode(m) {
            this.mode = m;
            guides.forEach(g => { g.visible = m === 'off'; });
            lensedHalo.visible = m === 'off';
        },
        render(time) {
            if (state.currentTarget !== 'gargantua' || this.mode === 'off') return false;
            syncSize();
            const center = targetGroups.gargantua.position;
            const dist = Math.max(2.05, camera.position.distanceTo(center));
            tmp.copy(center).project(camera);
            const u = mat.uniforms;
            u.uCenter.value.set((tmp.x + 1) / 2, (tmp.y + 1) / 2);
            u.uAspect.value = camera.aspect;
            // tamaño aparente real del horizonte, con tope para que siempre quede un anillo de cielo
            const realRs = Math.tan(Math.asin(2.0 / dist)) / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * 0.5;
            u.uRs.value = Math.min(realRs, 0.12);
            u.uMode.value = MODE_ID[this.mode];
            u.uTime.value = time;
            u.uFall.value = this.mode === 'fall' ? Math.pow(state.descentPercent / 100, 1.5) : 0;
            u.uFront.value = 1 - u.uFall.value * 0.85;
            u.uEinstein.value = 3.0;

            // n: del agujero hacia la cámara. Atrás se queda la mitad con n·p < 0.
            tmp.copy(camera.position).sub(center).normalize();
            horizonMesh.visible = false;
            clip.normal.copy(tmp).negate(); clip.constant = clip.normal.dot(center) * -1;
            renderer.setRenderTarget(rtBack);
            renderer.render(scene, camera);
            clip.normal.copy(tmp); clip.constant = clip.normal.dot(center) * -1;
            camera.layers.set(1);
            renderer.setRenderTarget(rtFront);
            renderer.render(scene, camera);
            camera.layers.set(0);
            horizonMesh.visible = true;
            keepAll();
            renderer.setRenderTarget(null);
            renderer.render(quadScene, quadCam);
            return true;
        }
    };
})();
gravLens.setMode('cine');

/* ------------------------------ selector de vista ------------------------------ */
(() => {
    const wrap = document.getElementById('lens-modes');
    const note = document.getElementById('lens-note');
    if (!wrap) return;
    const buttons = Object.entries(LENS_MODES).map(([id, m]) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'lens-mode-btn';
        b.textContent = m.label;
        b.dataset.mode = id;
        b.addEventListener('click', () => {
            audioEngine.playClickTone(780, 0.05);
            gravLens.setMode(id);
            sync();
        });
        wrap.appendChild(b);
        return b;
    });
    function sync() {
        buttons.forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === gravLens.mode)));
        if (note) note.textContent = LENS_MODES[gravLens.mode].note;
    }
    sync();
})();

function syncLensPanel() {
    const panel = document.getElementById('lens-panel');
    if (panel) panel.hidden = state.currentTarget !== 'gargantua';
}
