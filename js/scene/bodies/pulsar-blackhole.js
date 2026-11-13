const pulsarCore = new THREE.Mesh(new THREE.SphereGeometry(1.15, 48, 48), new THREE.MeshBasicMaterial({ color: 0xdcfce7 }));
targetGroups.pulsar.add(pulsarCore);
const pulsarGlow = makeGlowSprite(0x7df9ff, 9, 0.9);
targetGroups.pulsar.add(pulsarGlow);
const pulsarCrust = new THREE.Mesh(new THREE.SphereGeometry(1.22, 24, 24), new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.22 }));
targetGroups.pulsar.add(pulsarCrust);
const jetMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.38, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
const northJet = new THREE.Mesh(new THREE.ConeGeometry(1.6, 14, 32, 1, true), jetMat);
northJet.position.y = 7.0; northJet.rotation.x = Math.PI;
const southJet = new THREE.Mesh(new THREE.ConeGeometry(1.6, 14, 32, 1, true), jetMat);
southJet.position.y = -7.0;
const pulsarJetAxis = new THREE.Group();
pulsarJetAxis.add(northJet); pulsarJetAxis.add(southJet); pulsarJetAxis.rotation.z = 0.38;
targetGroups.pulsar.add(pulsarJetAxis);
const pulsarLensRing = new THREE.Mesh(
    new THREE.RingGeometry(1.6, 4.8, 64, 16),
    new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending })
);
pulsarLensRing.rotation.x = Math.PI * 0.42;
targetGroups.pulsar.add(pulsarLensRing);

const horizonMesh = new THREE.Mesh(new THREE.SphereGeometry(2.0, 64, 64), new THREE.MeshBasicMaterial({ color: 0x000000 }));
targetGroups.gargantua.add(horizonMesh);
const photonSphereMesh = new THREE.Mesh(new THREE.SphereGeometry(3.0, 32, 32), new THREE.MeshBasicMaterial({ color: 0x00f0ff, wireframe: true, transparent: true, opacity: 0.05, depthWrite: false }));
targetGroups.gargantua.add(photonSphereMesh);
const ergoGeo = new THREE.SphereGeometry(4.4, 36, 24); ergoGeo.scale(1.28, 0.78, 1.28);
const ergosphereMesh = new THREE.Mesh(ergoGeo, new THREE.MeshBasicMaterial({ color: 0xffaa00, wireframe: true, transparent: true, opacity: 0.045, depthWrite: false }));
targetGroups.gargantua.add(ergosphereMesh);

const accretionFragmentShader = `
    uniform float uTime;
    uniform float uRedshiftFactor;
    varying vec2 vUv;
    varying vec3 vPos;
    float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
    float noise(vec2 p) {
        vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    void main() {
        float r = length(vPos.xy);
        float angle = atan(vPos.y, vPos.x);
        float normR = clamp((r - 2.3) / (11.5 - 2.3), 0.0, 1.0);
        float speed = 2.8 / pow(normR + 0.25, 1.15);
        float spiralAngle = angle + uTime * speed + normR * 12.0;
        float n1 = noise(vec2(normR * 18.0, spiralAngle * 3.0));
        float n2 = noise(vec2(normR * 36.0 - uTime * 1.2, spiralAngle * 6.0));
        float rings = sin(normR * 55.0 - uTime * 4.0) * 0.5 + 0.5;
        float gasIntensity = mix(n1, n2, 0.5) * 0.75 + rings * 0.35;
        float dopplerAsymmetry = clamp(-vPos.x / 8.5, -1.0, 1.0);
        vec3 blueShiftColor = vec3(0.0, 0.94, 1.0);
        vec3 coreAmberColor = vec3(1.0, 0.68, 0.05);
        vec3 redShiftColor  = vec3(1.0, 0.02, 0.33);
        vec3 baseColor = mix(coreAmberColor, blueShiftColor, clamp(dopplerAsymmetry * 0.85, 0.0, 1.0));
        baseColor = mix(baseColor, redShiftColor, clamp(-dopplerAsymmetry * 0.9, 0.0, 1.0));
        float innerGlow = pow(1.0 - normR, 2.2) * 1.8;
        baseColor += vec3(1.0, 0.92, 0.8) * innerGlow * 0.55;
        baseColor = mix(baseColor, redShiftColor, clamp(uRedshiftFactor * 0.35, 0.0, 0.75));
        float alphaEdge = smoothstep(0.0, 0.08, normR) * (1.0 - smoothstep(0.75, 1.0, normR));
        float dopplerBrightness = 1.0 + dopplerAsymmetry * 0.38;
        float finalAlpha = clamp(gasIntensity * alphaEdge * dopplerBrightness * 1.25, 0.0, 0.96);
        gl_FragColor = vec4(baseColor * (gasIntensity + innerGlow * 0.6) * dopplerBrightness, finalAlpha);
    }
`;
const diskMat = new THREE.ShaderMaterial({
    vertexShader: commonVertexShader, fragmentShader: accretionFragmentShader,
    uniforms: sharedUniforms, transparent: true, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending
});
const accretionDisk = new THREE.Mesh(new THREE.RingGeometry(2.3, 11.5, 128, 64), diskMat);
accretionDisk.rotation.x = Math.PI * 0.44;
targetGroups.gargantua.add(accretionDisk);
const lensedHalo = new THREE.Mesh(new THREE.RingGeometry(2.15, 6.2, 128, 32), diskMat);
lensedHalo.rotation.x = -Math.PI * 0.06;
targetGroups.gargantua.add(lensedHalo);
