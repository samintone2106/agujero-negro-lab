/* -------------------------------------------------------------------------- */
/* GÉNESIS: POSTPROCESO CINEMATOGRÁFICO (BLOOM + VIÑETA + GRANO)               */
/* -------------------------------------------------------------------------- */
// Solo se usa durante el Génesis; el resto del simulador sigue con render directo.
// Three r128 aplica el tone mapping también dentro del render target, así que
// aquí no se vuelve a aplicar: la pasada final solo añade viñeta y grano.
const genesisPost = (() => {
    if (!THREE.EffectComposer || !THREE.RenderPass || !THREE.UnrealBloomPass || !THREE.ShaderPass) return null;
    const lowEnd = isCoarsePointer || (navigator.hardwareConcurrency || 8) <= 4;
    const size = renderer.getSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, {
        format: THREE.RGBAFormat,
        type: renderer.capabilities.isWebGL2 ? THREE.HalfFloatType : THREE.UnsignedByteType
    });
    const composer = new THREE.EffectComposer(renderer, rt);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(size.x, size.y);
    composer.addPass(new THREE.RenderPass(scene, camera));

    const bloomScale = lowEnd ? 0.5 : 1;
    const bloom = new THREE.UnrealBloomPass(new THREE.Vector2(size.x * bloomScale, size.y * bloomScale), 1.0, 0.55, 0.62);
    composer.addPass(bloom);

    const finish = new THREE.ShaderPass({
        uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uVignette: { value: 0.35 }, uFlash: { value: 0 } },
        vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `
            uniform sampler2D tDiffuse;
            uniform float uTime;
            uniform float uVignette;
            uniform float uFlash;
            varying vec2 vUv;
            float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
            void main() {
                vec3 c = texture2D(tDiffuse, vUv).rgb;
                vec2 q = vUv - 0.5;
                c *= 1.0 - dot(q, q) * uVignette * 2.2;
                c += (hash(vUv * 900.0) - 0.5) * 0.025;
                c = mix(c, vec3(1.0), uFlash);
                gl_FragColor = vec4(c, 1.0);
            }
        `
    });
    composer.addPass(finish);

    // El simulador cambia el tamaño del renderer en fitViewport(); aquí solo se sigue.
    const last = new THREE.Vector2(size.x, size.y);
    const now = new THREE.Vector2();
    let lastRatio = renderer.getPixelRatio();
    function syncSize() {
        renderer.getSize(now);
        const ratio = renderer.getPixelRatio();
        if (now.equals(last) && ratio === lastRatio) return;
        last.copy(now);
        lastRatio = ratio;
        composer.setPixelRatio(ratio);
        composer.setSize(now.x, now.y);
        bloom.setSize(now.x * bloomScale, now.y * bloomScale);
    }

    return {
        bloom, finish,
        render(time) {
            syncSize();
            finish.uniforms.uTime.value = time % 100;
            composer.render();
        }
    };
})();
