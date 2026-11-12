const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const elapsedTime = clock.getElapsedTime();
    sharedUniforms.uTime.value = elapsedTime;

    const t = state.currentTarget;

    if (t === 'saturn') {
        saturnSphere.rotation.y = elapsedTime * 0.14;
        saturnRings.rotation.z = elapsedTime * 0.04;
        saturnIceParticles.rotation.z = -elapsedTime * 0.09;
        saturnIceBoulders.rotation.z = -elapsedTime * 0.12;
    } else if (t === 'gargantua') {
        photonSphereMesh.rotation.y = elapsedTime * 0.22;
        ergosphereMesh.rotation.y = -elapsedTime * 0.35;
        if (state.rs < 2.2) {
            const shake = (2.2 - state.rs) * 0.035;
            targetGroups.gargantua.position.set((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake, 0);
        } else {
            targetGroups.gargantua.position.set(0, 0, 0);
        }
    } else if (t === 'jupiter') {
        jupiterSphere.rotation.y = elapsedTime * 0.25;
        magnetoTorus.rotation.z = -elapsedTime * 0.18;
    } else if (t === 'pulsar') {
        pulsarCrust.rotation.y = elapsedTime * 12.0;
        pulsarJetAxis.rotation.y = elapsedTime * 8.5;
        pulsarLensRing.rotation.z = -elapsedTime * 1.5;
    } else if (t === 'sun') {
        sunMesh.rotation.y = elapsedTime * 0.05;
        sunCorona.rotation.z = -elapsedTime * 0.15;
    } else if (t === 'earth') {
        earthMesh.rotation.y = elapsedTime * 0.14;
        earthCloudsMesh.rotation.y = elapsedTime * 0.175;
    } else {
        const activeGroup = targetGroups[t];
        if (activeGroup && activeGroup.children[0]) {
            activeGroup.children[0].rotation.y = elapsedTime * 0.15;
        }
    }

    camera.updateMatrixWorld();
    sharedUniforms.uSunDirView.value.copy(sunDirectionalLight.position).normalize().transformDirection(camera.matrixWorldInverse);
    sharedUniforms.uDetail.value = Math.min(1, Math.max(0, (state.descentPercent - 35) / 55));

    if (t === 'sun') {
        prominenceBillboard.quaternion.copy(camera.quaternion);
        prominenceGroup.rotation.z = elapsedTime * 0.02;
        prominenceGroup.children.forEach((m, i) => {
            const s = 1 + Math.sin(elapsedTime * 0.6 + i * 1.7) * 0.08;
            m.scale.set(s, s, 1);
            m.material.opacity = 0.25 + Math.sin(elapsedTime * 0.9 + i) * 0.12;
        });
    } else if (t === 'pulsar') {
        pulsarGlow.material.opacity = 0.55 + Math.abs(Math.sin(elapsedTime * 6.0)) * 0.45;
    } else if (t === 'io') {
        ioPlumes.material.opacity = 0.4 + Math.sin(elapsedTime * 1.3) * 0.15;
        ioJupiter.rotation.y = elapsedTime * 0.05;
    } else if (t === 'europa') {
        europaJupiter.rotation.y = elapsedTime * 0.05;
    } else if (t === 'pluto') {
        charon.position.set(Math.cos(elapsedTime * 0.12) * 9.5, 1.2, Math.sin(elapsedTime * 0.12) * 9.5 - 2);
    }

    const posAttr = particleGeo.attributes.position;
    const speedZ = (state.warpActive ? 0.95 : 0.08) + state.descentPercent * 0.004;
    for (let i = 0; i < particleCount; i++) {
        let z = posAttr.getZ(i) + speedZ;
        if (z > 45) z = -75;
        posAttr.setZ(i, z);
    }
    posAttr.needsUpdate = true;

    if (!dom.modalLaser.classList.contains('hidden')) renderRedshiftWave();
    updateGenesis(elapsedTime);

    if (!genesis.active) controls.update();
    if (!renderGenesisFrame(elapsedTime)) renderer.render(scene, camera);
}

window.onload = function () {
    const requestedTarget = new URLSearchParams(window.location.search).get('target');
    const initialTarget = Object.prototype.hasOwnProperty.call(ASTRO_TARGETS, requestedTarget)
        ? requestedTarget
        : 'saturn';
    switchTarget(initialTarget);
    animate();
};
