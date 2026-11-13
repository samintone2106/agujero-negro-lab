const skyboxVertexShader = `
    varying vec3 vWorldPos;
    varying vec2 vUv;
    void main() {
        vUv = uv;
        vWorldPos = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;
const skyboxFragmentShader = `
    uniform float uTime;
    varying vec3 vWorldPos;
    varying vec2 vUv;

    float hash(vec3 p) {
        p = fract(p * vec3(443.897, 441.423, 437.195));
        p += dot(p, p.yzx + 19.19);
        return fract((p.x + p.y) * p.z);
    }

    float noise3D(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
            mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
            mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y),
            f.z
        );
    }

    float fbm3D(vec3 p) {
        float v = 0.0, a = 0.5;
        for (int i = 0; i < 5; i++) {
            v += a * noise3D(p);
            p *= 2.03;
            a *= 0.5;
        }
        return v;
    }

    void main() {
        vec3 dir = normalize(vWorldPos);
        float galacticPlane = exp(-pow(abs(dir.y * 0.82 - dir.x * 0.42), 1.45) * 5.8);
        float n1 = fbm3D(dir * 3.8);
        float n2 = fbm3D(dir * 8.5 + vec3(2.4));
        float darkDustLane = smoothstep(0.42, 0.68, fbm3D(dir * 6.5 - vec3(1.1))) * galacticPlane;

        vec3 deepVoid = vec3(0.004, 0.006, 0.016);
        vec3 milkyWayCore = vec3(0.18, 0.14, 0.25) * galacticPlane * n1 * 1.9;
        vec3 cyanNebula = vec3(0.02, 0.22, 0.34) * smoothstep(0.48, 0.82, n2) * galacticPlane;
        vec3 warmDust = vec3(0.28, 0.16, 0.08) * pow(galacticPlane, 2.2) * n1;

        vec3 skyColor = deepVoid + milkyWayCore + cyanNebula + warmDust;
        skyColor *= (1.0 - darkDustLane * 0.72);

        float starSeed = hash(floor(dir * 520.0));
        float tinyStars = smoothstep(0.9965, 0.9999, starSeed) * (0.4 + 0.6 * galacticPlane);
        skyColor += vec3(0.92, 0.96, 1.0) * tinyStars * 1.3;

        gl_FragColor = vec4(skyColor, 1.0);
    }
`;

const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(420, 48, 48),
    new THREE.ShaderMaterial({
        vertexShader: skyboxVertexShader,
        fragmentShader: skyboxFragmentShader,
        uniforms: sharedUniforms,
        side: THREE.BackSide,
        depthWrite: false
    })
);
scene.add(skyDome);

const particleCount = 3400;
const particleGeo = new THREE.BufferGeometry();
const positions = new Float32Array(particleCount * 3);
const colors = new Float32Array(particleCount * 3);
const spectralPalette = [
    [0.65, 0.80, 1.0],
    [0.95, 0.97, 1.0],
    [1.0, 0.96, 0.82],
    [1.0, 0.82, 0.60],
    [1.0, 0.65, 0.48]
];
for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 140;
    positions[i3 + 1] = (Math.random() - 0.5) * 140;
    positions[i3 + 2] = (Math.random() - 0.5) * 150;
    const c = spectralPalette[Math.floor(Math.random() * spectralPalette.length)];
    const bright = 0.65 + Math.random() * 0.35;
    colors[i3] = c[0] * bright;
    colors[i3 + 1] = c[1] * bright;
    colors[i3 + 2] = c[2] * bright;
}
particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
const starField = new THREE.Points(particleGeo, new THREE.PointsMaterial({ map: roundDotTexture, size: 0.22, vertexColors: true, transparent: true, opacity: 0.92, depthWrite: false }));
scene.add(starField);
