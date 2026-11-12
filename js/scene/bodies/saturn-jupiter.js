const saturnSphere = createPhotorealisticPlanet('saturn', 2.35, true);
saturnSphere.scale.set(1.08, 0.92, 1.08);

const saturnRingsRealisticFragment = `
    uniform float uTime;
    uniform float uCameraDist;
    varying vec3 vPos;

    float hash(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
    }

    void main() {
        float r = length(vPos.xy);
        float angle = atan(vPos.y, vPos.x);
        float normR = clamp((r - 2.85) / (11.8 - 2.85), 0.0, 1.0);
        float fineWaves = sin(normR * 420.0) * 0.18 + cos(normR * 195.0) * 0.22 + sin(normR * 880.0) * 0.10;

        float opticalDepth = 0.0;
        vec3 ringTint = vec3(0.92, 0.88, 0.78);

        if (normR < 0.07) {
            opticalDepth = 0.12 * smoothstep(0.0, 0.07, normR);
            ringTint = vec3(0.62, 0.58, 0.52);
        } else if (normR < 0.24) {
            opticalDepth = 0.34 + fineWaves * 0.25;
            ringTint = mix(vec3(0.68, 0.64, 0.58), vec3(0.84, 0.79, 0.70), (normR - 0.07) / 0.17);
        } else if (normR < 0.61) {
            opticalDepth = 0.88 + fineWaves * 0.35;
            ringTint = mix(vec3(0.90, 0.84, 0.72), vec3(0.98, 0.96, 0.90), sin(normR * 95.0) * 0.5 + 0.5);
        } else if (normR < 0.665) {
            float edge = smoothstep(0.61, 0.62, normR) * (1.0 - smoothstep(0.655, 0.665, normR));
            opticalDepth = mix(0.65, 0.05, edge);
            ringTint = vec3(0.55, 0.52, 0.48);
        } else if (normR < 0.93) {
            float encke = 1.0 - smoothstep(0.858, 0.863, normR) * (1.0 - smoothstep(0.868, 0.873, normR)) * 0.92;
            float keeler = 1.0 - smoothstep(0.918, 0.921, normR) * (1.0 - smoothstep(0.923, 0.926, normR)) * 0.95;
            opticalDepth = (0.64 + fineWaves * 0.22) * encke * keeler;
            ringTint = vec3(0.89, 0.86, 0.80);
        } else if (normR > 0.965 && normR < 0.985) {
            opticalDepth = 0.55 * (1.0 - abs(normR - 0.975) / 0.01);
            ringTint = vec3(0.95, 0.95, 1.0);
        }

        float closeUpFactor = clamp((18.0 - uCameraDist) / 12.0, 0.0, 1.0);
        float iceGrain = hash(floor(vec2(normR * 1200.0, (angle + uTime * 0.03) * 600.0)));
        float sparkle = smoothstep(0.82, 0.99, iceGrain) * closeUpFactor * 0.85;
        ringTint += vec3(0.85, 0.96, 1.0) * sparkle;

        float shadowMask = 1.0;
        if (vPos.y > 0.0) {
            float distFromShadowAxis = abs(vPos.x + vPos.y * 0.32);
            shadowMask = smoothstep(1.95, 2.55, distFromShadowAxis);
        }

        vec3 finalColor = ringTint * (0.12 + 0.88 * shadowMask);
        float finalAlpha = clamp(opticalDepth, 0.0, 0.95);

        gl_FragColor = vec4(finalColor, finalAlpha);
    }
`;

const saturnRingsPivot = new THREE.Group();
saturnRingsPivot.rotation.x = Math.PI * 0.42;
saturnRingsPivot.rotation.y = 0.12;
targetGroups.saturn.add(saturnRingsPivot);
saturnRingsPivot.userData.genesisLate = 'rings';

const saturnRings = new THREE.Mesh(
    new THREE.RingGeometry(2.85, 11.8, 180, 96),
    new THREE.ShaderMaterial({
        vertexShader: commonVertexShader,
        fragmentShader: saturnRingsRealisticFragment,
        uniforms: sharedUniforms,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false
    })
);
saturnRingsPivot.add(saturnRings);

const ringIceCount = 3200;
const ringIceGeo = new THREE.BufferGeometry();
const ringIcePos = new Float32Array(ringIceCount * 3);
const ringIceCol = new Float32Array(ringIceCount * 3);

for (let i = 0; i < ringIceCount; i++) {
    const i3 = i * 3;
    let radius = 3.2 + Math.random() * 8.4;
    if (radius > 7.45 && radius < 7.95) radius += 0.65;
    const theta = Math.random() * Math.PI * 2;
    const verticalThickness = (Math.random() - 0.5) * 0.16;

    ringIcePos[i3] = Math.cos(theta) * radius;
    ringIcePos[i3 + 1] = Math.sin(theta) * radius;
    ringIcePos[i3 + 2] = verticalThickness;

    const shade = 0.82 + Math.random() * 0.18;
    ringIceCol[i3] = shade;
    ringIceCol[i3 + 1] = shade * 0.97;
    ringIceCol[i3 + 2] = Math.min(1.0, shade * 1.05);
}
ringIceGeo.setAttribute('position', new THREE.BufferAttribute(ringIcePos, 3));
ringIceGeo.setAttribute('color', new THREE.BufferAttribute(ringIceCol, 3));

const saturnIceParticles = new THREE.Points(
    ringIceGeo,
    new THREE.PointsMaterial({
        map: roundDotTexture,
        depthWrite: false,
        size: 0.05,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending
    })
);
saturnRingsPivot.add(saturnIceParticles);

const boulderCount = 320;
const boulderGeo = new THREE.IcosahedronGeometry(0.045, 0);
const boulderMat = new THREE.MeshBasicMaterial({ color: 0xe2f1ff, wireframe: false });
const saturnIceBoulders = new THREE.InstancedMesh(boulderGeo, boulderMat, boulderCount);
const dummyMatrix = new THREE.Object3D();

for (let i = 0; i < boulderCount; i++) {
    let r = 3.5 + Math.random() * 7.8;
    if (r > 7.45 && r < 7.95) r += 0.65;
    const a = Math.random() * Math.PI * 2;
    dummyMatrix.position.set(Math.cos(a) * r, Math.sin(a) * r, (Math.random() - 0.5) * 0.22);
    dummyMatrix.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    const s = 0.5 + Math.random() * 1.4;
    dummyMatrix.scale.set(s, s * 0.8, s);
    dummyMatrix.updateMatrix();
    saturnIceBoulders.setMatrixAt(i, dummyMatrix.matrix);
}
saturnRingsPivot.add(saturnIceBoulders);

const jupiterSphere = createPhotorealisticPlanet('jupiter', 2.75, true);
const magnetoTorus = new THREE.Mesh(
    new THREE.TorusGeometry(6.2, 2.2, 20, 64),
    new THREE.MeshBasicMaterial({ color: 0xb026ff, wireframe: true, transparent: true, opacity: 0.05, depthWrite: false })
);
magnetoTorus.rotation.x = Math.PI * 0.46;
targetGroups.jupiter.add(magnetoTorus);
