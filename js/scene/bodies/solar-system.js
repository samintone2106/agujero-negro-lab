const sunMesh = createPhotorealisticPlanet('sun', 2.85, true);
const sunCorona = new THREE.Mesh(
    new THREE.RingGeometry(2.8, 6.2, 64, 16),
    new THREE.MeshBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.28, side: THREE.DoubleSide, blending: THREE.AdditiveBlending })
);
sunCorona.visible = false;
targetGroups.sun.add(sunCorona);
targetGroups.sun.add(makeGlowSprite(0xff9a3c, 15, 1.0));
targetGroups.sun.add(makeGlowSprite(0xfff1c1, 8.5, 0.8));

// Solar prominences: glowing loops that slowly breathe around the limb.
const prominenceGroup = new THREE.Group();
for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.random() * 0.4;
    const h = 0.35 + Math.random() * 0.75;
    const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(Math.cos(a - 0.12) * 2.8, Math.sin(a - 0.12) * 2.8, 0),
        new THREE.Vector3(Math.cos(a) * (2.85 + h * 1.6), Math.sin(a) * (2.85 + h * 1.6), 0),
        new THREE.Vector3(Math.cos(a + 0.12) * 2.8, Math.sin(a + 0.12) * 2.8, 0)
    );
    const loop = new THREE.Mesh(
        new THREE.TubeGeometry(curve, 32, 0.035 + Math.random() * 0.03, 8, false),
        new THREE.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    prominenceGroup.add(loop);
}
const prominenceBillboard = new THREE.Group();
prominenceBillboard.add(prominenceGroup);
targetGroups.sun.add(prominenceBillboard);

const mercuryMesh = createPhotorealisticPlanet('mercury', 2.1, false);
const venusMesh = createPhotorealisticPlanet('venus', 2.45, true);
const earthMesh = createPhotorealisticPlanet('earth', 2.5, true);

const earthCloudsMat = new THREE.MeshLambertMaterial({
    transparent: true,
    opacity: 0.42,
    blending: THREE.AdditiveBlending,
    depthWrite: false
});
loadTextureWithFallback([ASTRO_TARGETS.earth.cloudsUrl], (cloudTex) => {
    earthCloudsMat.map = cloudTex;
    earthCloudsMat.needsUpdate = true;
});
const earthCloudsMesh = new THREE.Mesh(new THREE.SphereGeometry(2.525, 64, 64), earthCloudsMat);
targetGroups.earth.add(earthCloudsMesh);

const moonMesh = createPhotorealisticPlanet('moon', 1.95, false);
const ioMesh = createPhotorealisticPlanet('io', 1.9, true);
const europaMesh = createPhotorealisticPlanet('europa', 1.85, true);
const titanMesh = createPhotorealisticPlanet('titan', 2.1, true);
const plutoMesh = createPhotorealisticPlanet('pluto', 1.7, true);

// Io: sulfur volcanic plumes (Pele-style umbrellas) made of particles.
const ioPlumeGeo = new THREE.BufferGeometry();
const ioPlumeCount = 1400;
const ioPlumePos = new Float32Array(ioPlumeCount * 3);
const ioVents = [[0.6, 0.35], [-1.1, 0.9], [2.3, -0.4], [-2.6, -0.8]];
for (let i = 0; i < ioPlumeCount; i++) {
    const vent = ioVents[i % ioVents.length];
    const lon = vent[0], lat = vent[1];
    const t = Math.random();
    const spread = Math.sin(t * Math.PI) * 0.32;
    const ang = Math.random() * Math.PI * 2;
    const r = 1.9 + t * 0.9;
    const la = lat + Math.sin(ang) * spread, lo = lon + Math.cos(ang) * spread;
    ioPlumePos[i * 3] = Math.cos(la) * Math.cos(lo) * r;
    ioPlumePos[i * 3 + 1] = Math.sin(la) * r;
    ioPlumePos[i * 3 + 2] = Math.cos(la) * Math.sin(lo) * r;
}
ioPlumeGeo.setAttribute('position', new THREE.BufferAttribute(ioPlumePos, 3));
const ioPlumes = new THREE.Points(ioPlumeGeo, new THREE.PointsMaterial({
    map: roundDotTexture, alphaTest: 0.01,
    color: 0xffe08a, size: 0.06, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false
}));
ioMesh.add(ioPlumes);

// Jupiter hanging in Io's / Europa's sky, Saturn behind Titan: sense of scale.
function addParentPlanetBackdrop(group, texUrl, radius, pos, tint) {
    const m = new THREE.MeshPhongMaterial({ color: tint, shininess: 4 });
    loadTextureWithFallback([texUrl], (tx) => { m.map = tx; m.color.set(0xffffff); m.needsUpdate = true; });
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 64), m);
    mesh.position.set(...pos);
    mesh.userData.backdrop = true;
    group.add(mesh);
    return mesh;
}
const ioJupiter = addParentPlanetBackdrop(targetGroups.io, TEX + 'jupiter.jpg', 16, [-38, 10, -70], 0xd9b38c);
const europaJupiter = addParentPlanetBackdrop(targetGroups.europa, TEX + 'jupiter.jpg', 14, [42, -6, -80], 0xd9b38c);
const titanSaturn = addParentPlanetBackdrop(targetGroups.titan, TEX + 'saturn.jpg', 13, [-40, 14, -85], 0xe8d5a0);
const titanSaturnRing = new THREE.Mesh(
    new THREE.RingGeometry(16, 29, 128, 4),
    new THREE.MeshBasicMaterial({ color: 0xe9dcc0, side: THREE.DoubleSide, transparent: true, opacity: 0.45 })
);
titanSaturnRing.position.copy(titanSaturn.position);
titanSaturnRing.rotation.x = Math.PI * 0.44;
titanSaturnRing.userData.backdrop = true;
targetGroups.titan.add(titanSaturnRing);

// Pluto's companion Charon.
const charon = new THREE.Mesh(new THREE.SphereGeometry(0.85, 48, 48), new THREE.MeshPhongMaterial({ color: 0x9a948e, shininess: 3 }));
charon.position.set(9.5, 1.2, -6);
targetGroups.pluto.add(charon);
charon.userData.genesisLate = 'charon';
const marsMesh = createPhotorealisticPlanet('mars', 2.25, true);

const uranusMesh = createPhotorealisticPlanet('uranus', 2.4, true);
const uranusRings = new THREE.Mesh(
    new THREE.RingGeometry(3.2, 5.8, 96, 16),
    new THREE.MeshBasicMaterial({ color: 0x7dd3fc, side: THREE.DoubleSide, transparent: true, opacity: 0.12, depthWrite: false })
);
uranusRings.rotation.y = Math.PI * 0.08;
targetGroups.uranus.add(uranusRings);

const neptuneMesh = createPhotorealisticPlanet('neptune', 2.4, true);
const neptuneRings = new THREE.Mesh(
    new THREE.RingGeometry(3.5, 5.9, 96, 8),
    new THREE.MeshBasicMaterial({ color: 0x60a5fa, side: THREE.DoubleSide, transparent: true, opacity: 0.18 })
);
neptuneRings.rotation.x = Math.PI * 0.42;
targetGroups.neptune.add(neptuneRings);
