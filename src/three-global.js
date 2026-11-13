// Puente entre Three.js moderno (módulos) y el código clásico de js/ (scripts con globals).
// Se carga como módulo antes que los scripts `defer`, que se ejecutan después y en orden.
import * as THREE_NS from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { CopyShader } from 'three/examples/jsm/shaders/CopyShader.js';
import { LuminosityHighPassShader } from 'three/examples/jsm/shaders/LuminosityHighPassShader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// Mismo aspecto que con r128: sin gestión de color y con la iluminación clásica.
THREE_NS.ColorManagement.enabled = false;

const THREE = Object.assign({}, THREE_NS, {
    OrbitControls, EffectComposer, RenderPass, ShaderPass, UnrealBloomPass, CopyShader, LuminosityHighPassShader,
    GLTFLoader, SkeletonUtils
});

// El renderizador se crea en js/scene/core.js: se ajusta al construirse.
const BaseRenderer = THREE_NS.WebGLRenderer;
THREE.WebGLRenderer = class extends BaseRenderer {
    constructor(opts) {
        super(opts);
        this.outputColorSpace = THREE_NS.LinearSRGBColorSpace;
        this.useLegacyLights = true;
    }
};

window.THREE = THREE;
