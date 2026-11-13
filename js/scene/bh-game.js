/* -------------------------------------------------------------------------- */
/* JUEGO: CORREO AL FUTURO (DILATACIÓN DEL TIEMPO EN GARGANTÚA)                */
/* -------------------------------------------------------------------------- */
// Bajas hacia el horizonte y te quedas flotando con los motores: cerca de la masa
// el tiempo corre más lento. Para la estación (lejos) pasan años mientras para ti
// pasan días. Hay que volver a la estación justo dentro de la ventana de entrega.
// Reloj de quien flota quieto a una distancia r: dτ/dt = √(1 − r_s / r)  (Schwarzschild).
const MAIL_SHIP_DAYS_PER_S = 1;      // 1 s de juego = 1 día de tu reloj
const MAIL_BURN = 1.5, MAIL_BURN_EXP = 0.2; // combustible por segundo ≈ 1.5·(1/f)^0.2: abajo cuesta más sostenerse
const MAIL_LEVELS = [
    { name: 'Primer correo', from: 18, to: 22, msg: 'Tu hermana cumple 30 años: entrégale la carta entre los años 18 y 22 de la estación.' },
    { name: 'Un siglo', from: 95, to: 105, msg: 'La estación pide la cápsula del tiempo para su centenario: entre los años 95 y 105.' },
    { name: 'Mil años', from: 970, to: 1030, msg: 'Una civilización futura espera tu mensaje en el año 1000 de la estación (±30).' }
];
// Profundidad d ∈ [0, 1]: d = 0 es la estación (r = 10 r_s); d = 1 es r − r_s = 10⁻¹² r_s (allí 1 día tuyo ≈ 2,700 años).
const MAIL_XMIN = -12;
const mailX = (d) => Math.pow(10, Math.log10(9) + (MAIL_XMIN - Math.log10(9)) * d); // r/r_s − 1
const mailF = (d) => { const x = mailX(d); return Math.sqrt(x / (1 + x)); };   // ritmo de tu reloj (respecto a muy lejos)
const MAIL_F_STATION = mailF(0);                                                // la estación flota a 10 r_s: su reloj también va un poco lento
const MAIL_UP = 0.22;                                                           // velocidad de subida (profundidad por segundo)
// Si subes ahora mismo, ¿en qué día de la estación llegas? (integra el ascenso)
function mailArrivalDays() {
    // misma subida que en el juego: arranca lenta y acelera (si ya vas subiendo, sigue desde donde vas)
    let d = mail.d, st = mail.stationDays, held = mail.dir < 0 ? mail.holdT || 0 : 0;
    const dt = 1 / 30;
    for (let i = 0; i < 2000 && d > 0; i++) {
        st += dt * MAIL_SHIP_DAYS_PER_S * MAIL_F_STATION / mailF(d);
        held += dt;
        d -= MAIL_UP * Math.min(1, 0.3 + held * 0.9) * dt;
    }
    return st;
}

const mail = {
    active: false, level: 0, d: 0, dir: 0, fuel: 100, shipDays: 0, stationDays: 0,
    result: null, lastMsgYear: -1, savedPercent: 0, fall: 0, best: {}
};
try { mail.best = JSON.parse(localStorage.getItem('eh.mailBest') || '{}'); } catch (e) { mail.best = {}; }

const mailDom = {
    hud: document.getElementById('cf-hud'),
    level: document.getElementById('cf-level'), mission: document.getElementById('cf-mission'),
    ship: document.getElementById('cf-ship'), station: document.getElementById('cf-station'),
    rate: document.getElementById('cf-rate'), depth: document.getElementById('cf-depth'), depthBar: document.getElementById('cf-depth-bar'),
    window: document.getElementById('cf-window'), fuel: document.getElementById('cf-fuel'), stage: document.getElementById('cf-stage'),
    feed: document.getElementById('cf-feed'), hold: document.getElementById('cf-hold'), deliver: document.getElementById('cf-deliver'),
    end: document.getElementById('cf-end'), endTitle: document.getElementById('cf-end-title'), endText: document.getElementById('cf-end-text'),
    stars: document.getElementById('cf-stars'), next: document.getElementById('cf-next')
};
const mailFmt = (n, d = 0) => n.toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d });
function mailYears(days) { return days / 365.25; }
function mailClock(days) {
    const y = Math.floor(days / 365.25), rem = days - y * 365.25;
    return y > 0 ? `${mailFmt(y)} años ${mailFmt(Math.floor(rem))} d` : `${mailFmt(days, 1)} días`;
}

// Cómo se ve la estación según los años que pasaron allá (cambia mientras estás abajo).
const STATION_STAGES = [
    [0, '🛰️', 'Estación Kepler', 'Tu tripulación te despide por radio.'],
    [5, '🛰️', 'Estación Kepler', 'Tus amigos ya tienen canas en las sienes.'],
    [20, '🏗️', 'Estación ampliada', 'Le añadieron un anillo nuevo. Tu hermana es adulta.'],
    [60, '🏛️', 'Estación-museo', 'Nadie de tu tripulación sigue allí. Hay una estatua tuya.'],
    [150, '🌆', 'Ciudad orbital', 'Miles de personas viven donde antes había 6.'],
    [500, '🪐', 'Colonia del sistema', 'Hablan un idioma que ya casi no entiendes.'],
    [1200, '✨', 'Civilización nueva', 'Te reciben como una leyenda del pasado.']
];
function stationStage(years) { let s = STATION_STAGES[0]; STATION_STAGES.forEach(st => { if (years >= st[0]) s = st; }); return s; }

function mailFeed(text) {
    const li = document.createElement('li');
    li.textContent = text;
    mailDom.feed.prepend(li);
    while (mailDom.feed.children.length > 3) mailDom.feed.lastChild.remove();
}

/* ------------------------------ control ------------------------------ */
function startMailGame(level = mail.level) {
    // no se mezcla con otros modos (superficie, viaje, tour, universo)
    if ((typeof surface !== 'undefined' && surface.active) || (typeof journey !== 'undefined' && journey.active) || (typeof voyage !== 'undefined' && voyage.active) || (typeof cosmos !== 'undefined' && cosmos.active)) return;
    if (typeof tourState !== 'undefined' && tourState.active) endTour();
    if (typeof genesis !== 'undefined' && genesis.active) stopGenesis(true);
    if (state.currentTarget !== 'gargantua') switchTarget('gargantua');
    if (!mail.active) mail.saved = { percent: state.descentPercent, cam: camera.position.clone(), target: controls.target.clone() };
    const L = MAIL_LEVELS[level];
    Object.assign(mail, { active: true, level, d: 0, dir: 0, holdT: 0, fuel: 100, shipDays: 0, stationDays: 0, result: null, lastMsgYear: -1, fall: 0, warnedFuel: false });
    document.body.classList.add('cf-mode');
    mailDom.hud.hidden = false;
    mailDom.end.hidden = true;
    mailDom.level.textContent = `NIVEL ${level + 1}/${MAIL_LEVELS.length} · ${L.name.toUpperCase()}`;
    mailDom.mission.textContent = L.msg;
    mailDom.window.textContent = `Entrega: años ${L.from}–${L.to} de la estación`;
    mailDom.feed.replaceChildren();
    mailFeed('Mantén BAJAR para acercarte al horizonte (tu reloj se frena). Suelta para quedarte flotando. Mantén SUBIR para volver a la estación.');
    audioEngine.playClickTone(520, 0.08);
}
function exitMailGame() {
    if (!mail.active) return;
    mail.active = false;
    mail.dir = 0;
    document.body.classList.remove('cf-mode');
    mailDom.hud.hidden = true;
    mailDom.end.hidden = true;
    if (mail.saved) { updateRelativityTelemetry(mail.saved.percent); camera.position.copy(mail.saved.cam); controls.target.copy(mail.saved.target); mail.saved = null; }
    document.getElementById('gg-start')?.focus();
}

function mailFinish(result, text) {
    mail.result = result;
    mail.dir = 0;
    const L = MAIL_LEVELS[mail.level];
    let stars = 0;
    if (result === 'win') {
        const mid = (L.from + L.to) / 2, half = (L.to - L.from) / 2;
        const err = Math.abs(mailYears(mail.stationDays) - mid) / half; // 0 = justo en el centro
        stars = 1 + (err < 0.5 ? 1 : 0) + (mail.fuel > 25 ? 1 : 0);
        const prev = mail.best[mail.level] || 0;
        if (stars > prev) { mail.best[mail.level] = stars; try { localStorage.setItem('eh.mailBest', JSON.stringify(mail.best)); } catch (e) { /* sin almacenamiento */ } }
    }
    mailDom.endTitle.textContent = result === 'win' ? '¡Entregado a tiempo!' : result === 'fall' ? 'Cruzaste el horizonte' : 'Fuera de la ventana';
    mailDom.endText.textContent = text;
    mailDom.stars.textContent = result === 'win' ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '';
    mailDom.next.hidden = !(result === 'win' && mail.level < MAIL_LEVELS.length - 1);
    mailDom.end.hidden = false;
    (result === 'win' ? mailDom.next.hidden ? document.getElementById('cf-retry') : mailDom.next : document.getElementById('cf-retry')).focus();
    audioEngine.playClickTone(result === 'win' ? 880 : 150, 0.15);
}

function mailDeliver() {
    if (!mail.active || mail.result) return;
    if (mail.d > 0.02) { mailFeed('Primero sube hasta la estación para entregar.'); return; }
    const L = MAIL_LEVELS[mail.level], y = mailYears(mail.stationDays);
    const you = mailClock(mail.shipDays), them = mailFmt(y, 1);
    if (y >= L.from && y <= L.to) mailFinish('win', `Para ti pasaron ${you}; en la estación, ${them} años. Ese es el efecto de la gravedad sobre el tiempo: cerca del horizonte tu reloj iba más lento.`);
    else mailFinish('miss', y < L.from
        ? `Llegaste en el año ${them}: demasiado pronto. Baja más profundo o quédate más tiempo abajo para que pasen más años allá arriba.`
        : `Llegaste en el año ${them}: demasiado tarde. Abajo, cada segundo tuyo eran meses o años de la estación.`);
}

/* ------------------------------ por cuadro ------------------------------ */
let mailT = 0;
function updateMailGame(dt) {
    if (!mail.active) return;
    if (!mail.result) {
        // mantener BAJAR o SUBIR; sin tocar nada, los motores te sostienen donde estás
        const noFuel = mail.fuel <= 0;
        mail.holdT = mail.dir ? (mail.holdT || 0) + dt : 0;
        const ramp = Math.min(1, 0.3 + mail.holdT * 0.9); // toques cortos = ajuste fino
        const dd = noFuel ? 0.12 : mail.dir > 0 ? 0.16 * ramp : mail.dir < 0 ? -MAIL_UP * ramp : 0;
        mail.d = Math.min(1, Math.max(0, mail.d + dd * dt));
        const f = mailF(mail.d);
        const ship = dt * MAIL_SHIP_DAYS_PER_S;
        mail.shipDays += ship;
        mail.stationDays += ship * MAIL_F_STATION / f;
        // flotar cerca del horizonte cuesta mucho más empuje (≈ 1/f): más combustible
        if (mail.d > 0.01) mail.fuel = Math.max(0, mail.fuel - dt * MAIL_BURN * Math.pow(1 / f, MAIL_BURN_EXP));
        if (noFuel && mail.d > 0 && !mail.warnedFuel) { mail.warnedFuel = true; mailFeed('¡Sin combustible! La nave cae…'); }
        if (noFuel && mail.d >= 1) mailFinish('fall', 'Sin combustible no hay forma de sostenerse: caíste. Desde la estación te verían frenar y enrojecer en el borde para siempre.');
        // mensajes de la estación (llegan corridos al rojo: más graves cuanto más abajo estás)
        const y = Math.floor(mailYears(mail.stationDays));
        const st = stationStage(y);
        if (st[0] !== mail.lastMsgYear && y >= st[0]) {
            mail.lastMsgYear = st[0];
            if (st[0] > 0) { mailFeed(`Año ${y} en la estación: ${st[3]}`); audioEngine.playClickTone(Math.max(90, 900 * f), 0.08); }
        }
    }
    // escena: la cámara se acerca a Gargantúa según la profundidad
    if ((mailT = (mailT + 1) % 2) === 0) updateRelativityTelemetry(Math.min(99, Math.pow(mail.d, 0.6) * 100));
    // interfaz
    const f = mailF(mail.d), x = mailX(mail.d);
    const L = MAIL_LEVELS[mail.level], y = mailYears(mail.stationDays);
    mailDom.ship.textContent = mailClock(mail.shipDays);
    mailDom.station.textContent = mailClock(mail.stationDays);
    const arrive = mailYears(mailArrivalDays());
    const fr = f / MAIL_F_STATION;
    mailDom.rate.classList.toggle('is-good', mail.d > 0.02 && arrive >= L.from && arrive <= L.to); // subir ahora = entrega a tiempo
    mailDom.rate.textContent = (mail.d > 0.02 ? `Si subes ahora llegas en el año ${mailFmt(arrive, arrive < 100 ? 1 : 0)} · ` : '') + (fr > 0.2 ? `1 día tuyo = ${mailFmt(1 / fr, 2)} días allá` : 1 / fr < 365 ? `1 día tuyo = ${mailFmt(1 / fr, 0)} días allá` : `1 día tuyo = ${mailFmt(1 / fr / 365.25, 1)} años allá`);
    mailDom.depth.textContent = x > 0.01 ? `${mailFmt(1 + x, 2)} r_s` : `horizonte + ${x.toExponential(0).replace('e', '×10^')} r_s`;
    mailDom.depthBar.style.transform = `scaleY(${mail.d.toFixed(3)})`;
    mailDom.fuel.style.transform = `scaleX(${(mail.fuel / 100).toFixed(3)})`;
    mailDom.fuel.classList.toggle('is-low', mail.fuel < 25);
    const st = stationStage(y);
    mailDom.stage.textContent = `${st[1]} ${st[2]}`;
    const inWin = y >= L.from && y <= L.to;
    mailDom.window.classList.toggle('is-open', inWin);
    mailDom.window.classList.toggle('is-late', y > L.to);
    mailDom.deliver.disabled = mail.d > 0.02 || !!mail.result;
    mailDom.deliver.textContent = mail.d > 0.02 ? 'SUBE PARA ENTREGAR' : inWin ? 'ENTREGAR AHORA ✓' : 'ENTREGAR';
}

/* ------------------------------ controles ------------------------------ */
(() => {
    const go = (v) => { if (mail.active && !mail.result) mail.dir = v; };
    const stop = (v) => { if (mail.dir === v) mail.dir = 0; };
    const bindHold = (el, v) => {
        if (!el) return;
        el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); go(v); });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => el.addEventListener(ev, () => stop(v)));
    };
    bindHold(mailDom.hold, 1);
    bindHold(document.getElementById('cf-up'), -1);
    const isDown = (k) => k === ' ' || k === 'ArrowDown' || k.toLowerCase() === 's';
    const isUp = (k) => k === 'ArrowUp' || k.toLowerCase() === 'w';
    window.addEventListener('keydown', (e) => {
        if (!mail.active || e.target.closest('input, textarea, select')) return;
        // con el diálogo final abierto, el teclado es de sus botones
        if (mail.result) { if (e.key === 'Escape') { e.stopImmediatePropagation(); exitMailGame(); } return; }
        const k = e.key;
        let used = true;
        if (isDown(k)) { e.preventDefault(); go(1); }
        else if (isUp(k)) { e.preventDefault(); go(-1); }
        else if ((k.toLowerCase() === 'e' || k === 'Enter') && !e.repeat && !e.target.closest('button')) mailDeliver();
        else if (k === 'Escape') exitMailGame();
        else used = false;
        if (used) e.stopImmediatePropagation(); // que no lo reciban la superficie ni el tour
    }, true);
    window.addEventListener('keyup', (e) => { if (isDown(e.key)) stop(1); if (isUp(e.key)) stop(-1); });
    window.addEventListener('blur', () => { mail.dir = 0; });
    mailDom.deliver?.addEventListener('click', mailDeliver);
    document.getElementById('gg-start')?.addEventListener('click', () => startMailGame(0));
    document.getElementById('cf-exit')?.addEventListener('click', exitMailGame);
    document.getElementById('cf-retry')?.addEventListener('click', () => startMailGame(mail.level));
    mailDom.next?.addEventListener('click', () => startMailGame(mail.level + 1));
    document.getElementById('cf-leave')?.addEventListener('click', exitMailGame);
})();
