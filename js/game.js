/*
 * AIR DESTROYER — shoot'em up retro con vista cenital.
 * Resolución interna 240x360 escalada con píxeles nítidos.
 */
(function () {
  'use strict';

  const BASE_W = 240;
  let W = BASE_W;               // ancho lógico: crece en pantallas anchas (iPad horizontal)
  const H = 360;
  const B = Balance;
  const S = Sprites.build();
  const text = Sprites.drawText;

  const params = new URLSearchParams(location.search);
  const DEBUG = {
    boss: parseFloat(params.get('boss')) || 0,     // segundos hasta el jefe (pruebas)
    tier: parseInt(params.get('tier'), 10) || 0,   // rango inicial (pruebas)
    god: params.get('god') === '1',                // invulnerable (pruebas)
  };
  const BOSS_INTERVAL = DEBUG.boss || B.BOSS_INTERVAL;

  /* ================================================================== */
  /* Datos: niveles, enemigos, jefes                                    */
  /* ================================================================== */
  const LEVELS = [
    { name: 'ÓRBITA TERRESTRE', sub: 'La invasión comienza', diff: 1.0, baseTier: 0, accent: '#4fd8ff', boss: 'NAVE MADRE',
      roster: { drone: 5, scout: 3, zig: 3, ufo: 1.2 } },
    { name: 'CINTURÓN DE ASTEROIDES', sub: 'Roca, polvo y ovnis', diff: 1.05, baseTier: 1, accent: '#d9a066', boss: 'GÓLEM DE ROCA',
      roster: { drone: 2, scout: 2, zig: 2, asteroid: 6, ufo: 1 } },
    { name: 'NEBULOSA CARMESÍ', sub: 'Algo te observa', diff: 1.1, baseTier: 2, accent: '#ff5fa8', boss: 'OJO DEL VACÍO',
      roster: { drone: 1, scout: 3, zig: 3, ufo: 2, squid: 3 } },
    { name: 'COLMENA ALIENÍGENA', sub: 'El enjambre despierta', diff: 1.15, baseTier: 3, accent: '#7dff6b', boss: 'REINA ENJAMBRE',
      roster: { scout: 2, zig: 2, ufo: 2, squid: 4, cruiser: 1 } },
    { name: 'NÚCLEO DEL MOTHERSHIP', sub: 'El corazón de la flota', diff: 1.2, baseTier: 4, accent: '#ff6a3d', boss: 'ACORAZADO NÚCLEO',
      roster: { scout: 2, zig: 2, ufo: 3, squid: 3, cruiser: 2, asteroid: 1 } },
  ];

  // hp base, radio de colisión, puntos, probabilidad de soltar mejora
  const ENEMY = {
    drone:    { hp: 2,  r: 5,  score: 100, drop: 0.05 },
    scout:    { hp: 3,  r: 5,  score: 150, drop: 0.06 },
    zig:      { hp: 3,  r: 5,  score: 150, drop: 0.06 },
    ufo:      { hp: 7,  r: 8,  score: 300, drop: 0.14 },
    squid:    { hp: 5,  r: 6,  score: 250, drop: 0.10 },
    cruiser:  { hp: 26, r: 10, score: 800, drop: 0.55 },
    asteroid: { hp: 6,  r: 6,  score: 80,  drop: 0.04 },
  };

  const BOSSES = [
    { w: 58, h: 38, hw: 24, hh: 13, amp: 70, speed: 0.8, muzzles: [[-14, 14], [14, 14]],
      phases: [['aimed', 'fan'], ['aimed', 'ring', 'fan'], ['ring', 'spiral', 'aimed']] },
    { w: 58, h: 46, hw: 20, hh: 18, amp: 62, speed: 0.7, muzzles: [[-14, 16], [14, 16]],
      phases: [['fan', 'rain'], ['rain', 'aimed', 'wall'], ['wall', 'rain', 'ring']] },
    { w: 58, h: 50, hw: 22, hh: 20, amp: 60, speed: 0.75, muzzles: [[0, 4]],
      phases: [['spiral', 'aimed'], ['ring', 'spiral', 'fan'], ['spiral', 'ring', 'aimed']] },
    { w: 60, h: 52, hw: 18, hh: 20, amp: 66, speed: 0.9, muzzles: [[-8, 18], [8, 18]],
      phases: [['minions', 'fan'], ['minions', 'wall', 'aimed'], ['wall', 'spiral', 'minions']] },
    { w: 66, h: 50, hw: 26, hh: 19, amp: 62, speed: 0.85, muzzles: [[-20, 18], [0, 14], [20, 18]],
      phases: [['aimed', 'fan', 'rain'], ['spiral', 'wall', 'ring'], ['spiral', 'ring', 'wall', 'minions']] },
  ];
  const ATTACK = {            // duración y cadencia (s) de cada ataque
    aimed:   { dur: 3.0, tick: 0.55 },
    fan:     { dur: 3.0, tick: 0.75 },
    ring:    { dur: 3.2, tick: 0.85 },
    spiral:  { dur: 3.4, tick: 0.075 },
    wall:    { dur: 3.8, tick: 1.15 },
    rain:    { dur: 3.0, tick: 0.12 },
    minions: { dur: 3.0, tick: 1.0 },
  };

  // Patrones de disparo del jugador por nivel de arma (a = grados, m = misil)
  const WEAPONS = [null,
    [{ dx: 0, a: 0 }],
    [{ dx: -3, a: 0 }, { dx: 3, a: 0 }],
    [{ dx: 0, a: 0 }, { dx: -5, a: -9 }, { dx: 5, a: 9 }],
    [{ dx: -3, a: 0 }, { dx: 3, a: 0 }, { dx: -7, a: -12 }, { dx: 7, a: 12 }],
    [{ dx: 0, a: 0 }, { dx: -4, a: 0 }, { dx: 4, a: 0 }, { dx: -8, a: -14 }, { dx: 8, a: 14 }],
    [{ dx: 0, a: 0 }, { dx: -4, a: 0 }, { dx: 4, a: 0 }, { dx: -8, a: -14 }, { dx: 8, a: 14 }, { dx: -6, a: -4, m: 1 }, { dx: 6, a: 4, m: 1 }],
    [{ dx: -2, a: 0 }, { dx: 2, a: 0 }, { dx: -6, a: -6 }, { dx: 6, a: 6 }, { dx: -9, a: -16 }, { dx: 9, a: 16 }, { dx: -8, a: -2, m: 1 }, { dx: 8, a: 2, m: 1 }],
    [{ dx: 0, a: 0 }, { dx: -4, a: 0 }, { dx: 4, a: 0 }, { dx: -7, a: -8 }, { dx: 7, a: 8 }, { dx: -10, a: -16 }, { dx: 10, a: 16 }, { dx: -9, a: -4, m: 1 }, { dx: 9, a: 4, m: 1 }],
    [{ dx: 0, a: 0 }, { dx: -3, a: 0 }, { dx: 3, a: 0 }, { dx: -6, a: -6 }, { dx: 6, a: 6 }, { dx: -9, a: -12 }, { dx: 9, a: 12 }, { dx: -11, a: -20 }, { dx: 11, a: 20 }, { dx: -8, a: -3, m: 1 }, { dx: 8, a: 3, m: 1 }, { dx: -12, a: -8, m: 1 }, { dx: 12, a: 8, m: 1 }],
  ];
  const BULLET_COLORS = ['#7df9ff', '#b8ff8a', '#ffc04a', '#d9b8ff', '#5ff6ff'];

  const POWERUPS = {
    P: { color: '#ff9a2f', label: 'P' },
    H: { color: '#ff4d6d', label: 'H' },
    S: { color: '#4fd8ff', label: 'S' },
    B: { color: '#ffd23f', label: 'B' },
  };

  /* ================================================================== */
  /* Progreso guardado (localStorage)                                   */
  /* ================================================================== */
  const SAVE_KEY = 'airDestroyer.save.v1';

  function defaultSave() {
    return {
      v: 1, ship: 0, level: 0, muted: false, unlocked: 1,
      settings: { sfx: 70, music: 70, sens: 100 },
      levels: LEVELS.map((l) => ({ best: 0, tier: l.baseTier, bosses: 0, plays: 0 })),
      totals: { bosses: 0, kills: 0, plays: 0, time: 0 },
    };
  }

  // Valida un objeto de progreso (de localStorage o de una copia de seguridad).
  function sanitizeSave(s) {
    const d = defaultSave();
    if (!s || typeof s !== 'object' || s.v !== 1) return null;
    d.ship = Math.min(S.ships.length - 1, Math.max(0, s.ship | 0));
    d.level = Math.min(LEVELS.length - 1, Math.max(0, s.level | 0));
    d.muted = !!s.muted;
    if (s.settings && typeof s.settings === 'object') {
      const st = s.settings, num = (v, a, b, def) => (typeof v === 'number' && isFinite(v) ? clamp(Math.round(v), a, b) : def);
      d.settings.sfx = num(st.sfx, 0, 100, 70);
      d.settings.music = num(st.music, 0, 100, 70);
      d.settings.sens = num(st.sens, 50, 200, 100);
    }
    d.unlocked = Math.min(LEVELS.length, Math.max(1, s.unlocked | 0));
    if (Array.isArray(s.levels)) {
      d.levels.forEach((l, i) => {
        Object.assign(l, pick(s.levels[i], ['best', 'tier', 'bosses', 'plays']));
        l.tier = Math.max(l.tier, LEVELS[i].baseTier);
      });
    }
    Object.assign(d.totals, pick(s.totals, ['bosses', 'kills', 'plays', 'time']));
    return d;
  }

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return (raw && sanitizeSave(JSON.parse(raw))) || defaultSave();
    } catch (e) { return defaultSave(); }
  }

  // Copia de seguridad: texto "AIRD1:..." que se puede copiar, guardar en un archivo y restaurar.
  const BACKUP_PREFIX = 'AIRD1:';
  function exportSave() {
    return BACKUP_PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify(save))));
  }
  function importSave(text) {
    try {
      const t = String(text).trim();
      if (!t.startsWith(BACKUP_PREFIX)) return false;
      const d = sanitizeSave(JSON.parse(decodeURIComponent(escape(atob(t.slice(BACKUP_PREFIX.length))))));
      if (!d) return false;
      save = d;
      persist();
      Sound.setMuted(save.muted);
      Sound.setVolumes(save.settings.sfx, save.settings.music);
      return true;
    } catch (e) { return false; }
  }
  function pick(o, keys) {
    const r = {};
    if (o && typeof o === 'object') keys.forEach(k => { if (typeof o[k] === 'number' && isFinite(o[k])) r[k] = o[k]; });
    return r;
  }
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) { /* sin almacenamiento */ }
  }
  let save = loadSave();
  Sound.setMuted(save.muted);
  Sound.setVolumes(save.settings.sfx, save.settings.music);

  /* ================================================================== */
  /* Utilidades                                                         */
  /* ================================================================== */
  const rand = (a, b) => a + Math.random() * (b - a);
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const pad = (n, len) => String(Math.floor(n)).padStart(len, '0');
  function weightedPick(obj) {
    let total = 0;
    for (const k in obj) total += obj[k];
    let r = Math.random() * total;
    for (const k in obj) { r -= obj[k]; if (r <= 0) return k; }
    return Object.keys(obj)[0];
  }

  /* ================================================================== */
  /* Entrada                                                            */
  /* ================================================================== */
  const keys = {};
  const pointer = { active: false, lastX: 0, lastY: 0, dx: 0, dy: 0 };
  let bombPressed = false;

  window.addEventListener('keydown', (e) => {
    Sound.resume();
    const k = e.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(k)) e.preventDefault();
    if (e.repeat) return;
    keys[k.toLowerCase()] = true;
    if (mode === 'playing') {
      if (k === ' ' || k.toLowerCase() === 'b' || k.toLowerCase() === 'x') bombPressed = true;
      if (k === 'p' || k === 'P' || k === 'Escape') pause();
    } else if (mode === 'paused') {
      if (k === 'p' || k === 'P' || k === 'Escape') resume();
    }
    if (k.toLowerCase() === 'm') toggleMute();
  });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; if (mode === 'playing') pause(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && mode === 'playing') pause(); });

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  let viewScale = 2;

  // iPad/iOS: sin zoom por pellizco, sin menú contextual en pulsación larga
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(ev => document.addEventListener(ev, (e) => e.preventDefault()));
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  // Toda la pantalla es el mando: se arrastra con un dedo en cualquier punto y la nave
  // se mueve en relación al movimiento del dedo (no salta hacia él ni queda tapada).
  let activePointer = null;
  document.addEventListener('pointerdown', (e) => {
    Sound.resume();
    if (mode !== 'playing' || activePointer !== null) return;
    if (e.target.closest && e.target.closest('button')) return;     // botones: pausa, sonido, bomba
    activePointer = e.pointerId;
    pointer.active = true; pointer.lastX = e.clientX; pointer.lastY = e.clientY;
  });
  document.addEventListener('pointermove', (e) => {
    if (e.pointerId !== activePointer) return;
    const k = save.settings.sens / 100;
    pointer.dx += (e.clientX - pointer.lastX) / viewScale * k;
    pointer.dy += (e.clientY - pointer.lastY) / viewScale * k;
    pointer.lastX = e.clientX; pointer.lastY = e.clientY;
  });
  const endPointer = (e) => {
    if (e.pointerId !== activePointer) return;
    activePointer = null; pointer.active = false;
  };
  document.addEventListener('pointerup', endPointer);
  document.addEventListener('pointercancel', endPointer);
  // iOS: evita el rebote/desplazamiento de la página mientras se juega
  document.addEventListener('touchmove', (e) => { if (mode === 'playing') e.preventDefault(); }, { passive: false });

  // Ajusta el tamaño del canvas. En pantallas anchas (iPad horizontal) el campo de juego
  // se ensancha para ocupar toda la pantalla; en vertical (iPhone) no cambia.
  // El ancho solo cambia fuera de partida, para no mover a los enemigos a mitad de nivel.
  function layout(allowWidthChange) {
    const vw = window.innerWidth, vh = window.innerHeight;
    if (allowWidthChange) {
      const wide = vw / vh > 0.75;
      const nw = wide ? clamp(Math.ceil(vw / (vh / H)), BASE_W, 560) : BASE_W;
      if (nw !== W) {
        W = nw;
        canvas.width = W;                     // reinicia el contexto
        ctx.imageSmoothingEnabled = false;
        if (bgState.levelIdx >= 0) setupBackground(bgState.levelIdx);
      }
    }
    const avail = Math.min(vw / W, vh / H);
    if (W === BASE_W) {
      // Escala con píxeles nítidos (múltiplos de 0.5) salvo que se pierda más de un 8 % de pantalla
      const snapped = Math.floor(avail * 2) / 2;
      viewScale = avail >= 1 && snapped >= avail * 0.92 ? snapped : avail;
    } else {
      viewScale = avail;                      // pantalla ancha: ocupar toda la pantalla
    }
    canvas.style.width = Math.ceil(W * viewScale) + 'px';
    canvas.style.height = Math.ceil(H * viewScale) + 'px';
  }
  window.addEventListener('resize', () => layout(mode !== 'playing' && mode !== 'paused'));

  /* ================================================================== */
  /* Estado de la partida                                               */
  /* ================================================================== */
  let mode = 'menu';           // menu | playing | paused | over
  let lastResult = null;       // resumen del último nivel completado (se muestra en el menú)
  let G = null;
  let time = 0;                // reloj global de animación

  const bgState = { stars: [], decor: [], levelIdx: -1, scroll: 0 };

  function setupBackground(levelIdx) {
    bgState.levelIdx = levelIdx;
    bgState.scroll = 0;
    bgState.stars = [];
    const layers = [{ n: 40, sp: 8, a: 0.4 }, { n: 28, sp: 20, a: 0.7 }, { n: 14, sp: 42, a: 1 }];
    layers.forEach((l, li) => {
      for (let i = 0, n = Math.round(l.n * W / BASE_W); i < n; i++) bgState.stars.push({ x: Math.random() * W, y: Math.random() * H, sp: l.sp * rand(0.8, 1.2), a: l.a, big: li === 2 && Math.random() < 0.4 });
    });
    bgState.decor = [];
    const bd = S.backdrops[levelIdx];
    if (bd.decor.length) {
      for (let i = 0; i < 3 + Math.floor(W / 400); i++) spawnDecor(i * 130 + rand(0, 40));
    }
  }

  function spawnDecor(y) {
    const bd = S.backdrops[bgState.levelIdx];
    const img = bd.decor[randi(0, bd.decor.length - 1)];
    bgState.decor.push({ img, x: rand(-10, W - img.width + 10), y: y - img.height, sp: bd.dim ? rand(22, 40) : rand(10, 18), dim: bd.dim });
  }

  function updateBackground(dt, speedMul) {
    speedMul = speedMul || 1;
    bgState.scroll += dt * 26 * speedMul;
    bgState.stars.forEach(s => {
      s.y += s.sp * dt * speedMul;
      if (s.y > H) { s.y -= H + 2; s.x = Math.random() * W; }
    });
    bgState.decor.forEach(d => { d.y += d.sp * dt * speedMul; });
    bgState.decor = bgState.decor.filter(d => d.y < H + 4);
    const bd = S.backdrops[bgState.levelIdx];
    if (bd.decor.length && bgState.decor.length < 3 + Math.floor(W / 400) && Math.random() < dt * 0.6 &&
        bgState.decor.every(d => d.y > 60)) spawnDecor(0);
  }

  function drawBackground() {
    const bd = S.backdrops[bgState.levelIdx];
    ctx.fillStyle = bd.base;
    ctx.fillRect(0, 0, W, H);
    if (bd.tile) {
      const t = bd.tile, ts = t.width;
      const off = Math.floor(bgState.scroll) % ts;
      ctx.globalAlpha = 0.9;
      for (let y = -ts + off; y < H; y += ts) for (let x = 0; x < W; x += ts) ctx.drawImage(t, x, y);
      ctx.globalAlpha = 1;
    }
    bgState.decor.forEach(d => {
      ctx.globalAlpha = d.dim ? 0.55 : 1;
      ctx.drawImage(d.img, Math.round(d.x), Math.round(d.y));
    });
    ctx.globalAlpha = 1;
    bgState.stars.forEach(s => {
      ctx.globalAlpha = s.a;
      ctx.fillStyle = bd.star;
      ctx.fillRect(Math.round(s.x), Math.round(s.y), s.big ? 2 : 1, s.big ? 2 : 1);
    });
    ctx.globalAlpha = 1;
  }

  /* ================================================================== */
  /* Inicio / fin de partida                                            */
  /* ================================================================== */
  function startRun(levelIdx, startTier) {
    layout(true);
    activePointer = null;
    const level = LEVELS[levelIdx];
    const tier = Math.max(DEBUG.tier, startTier || 0, level.baseTier);
    const stats = B.playerStats(tier, 0);
    G = {
      levelIdx, level, tier, startTier: tier,
      ship: S.ships[save.ship], shipIdx: save.ship,
      score: 0, kills: 0, runTime: 0, bossClock: 0, bossesThisRun: 0,
      enemies: [], bullets: [], ebullets: [], powerups: [], parts: [], rings: [], floaters: [], queue: [],
      boss: null, warn: 0, spawnT: 1.2,
      shake: 0, flash: 0, banner: null, bombFx: null, over: 0,
      power: 0, powerFlash: 0,
      fireT: 0, shotCount: 0, hurtFlash: 0,
      player: { x: W / 2, y: H - 40, hp: stats.maxHp, maxHp: stats.maxHp, bombs: 2, invuln: 2, shield: 0, dead: false },
      ended: false, prevBest: save.levels[levelIdx].best,
    };
    G.stats = B.playerStats(G.tier, G.power);
    G.escale = B.enemyScale(G.tier, level.diff);
    save.level = levelIdx;
    save.levels[levelIdx].plays++;
    save.totals.plays++;
    persist();
    setupBackground(levelIdx);
    pointer.dx = pointer.dy = 0;
    bombPressed = false;
    lastResult = null;
    showScreen(null);
    mode = 'playing';
    document.body.classList.add('playing');
    Sound.resume();
    Sound.music('level', levelIdx);
    setBanner([
      { text: level.name, color: '#ffffff', scale: 1 },
      { text: 'RANGO ' + (G.tier + 1), color: level.accent, scale: 1 },
    ], 2.4);
  }

  // Guarda récord y estadísticas de la partida (una sola vez por partida).
  function commitRun() {
    if (!G || G.committed) return false;
    G.committed = true;
    const lv = save.levels[G.levelIdx];
    const newBest = G.score > G.prevBest;
    if (newBest) lv.best = Math.max(lv.best, Math.floor(G.score));
    save.totals.kills += G.kills;
    save.totals.time += G.runTime;
    persist();
    return newBest;
  }
  window.addEventListener('pagehide', commitRun);

  function endRun() {
    if (G.ended) return;
    G.ended = true;
    const lv = save.levels[G.levelIdx];
    const newBest = commitRun();
    Sound.music(null);
    Sound.sfx.gameOver();
    mode = 'over';
    document.body.classList.remove('playing');
    const o = document.getElementById('overStats');
    o.innerHTML =
      '<div><span>PUNTOS</span><b>' + pad(G.score, 6) + '</b></div>' +
      '<div><span>RÉCORD</span><b>' + pad(lv.best, 6) + '</b></div>' +
      '<div><span>BAJAS</span><b>' + G.kills + '</b></div>' +
      '<div><span>NIVEL</span><b>' + (G.levelIdx + 1) + '</b></div>' +
      '<div><span>RANGO</span><b>' + (G.tier + 1) + '</b></div>' +
      '<div><span>TIEMPO</span><b>' + fmtTime(G.runTime) + '</b></div>';
    document.getElementById('overNew').classList.toggle('hidden', !newBest || G.score <= 0);
    showScreen('over');
  }

  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }

  function pause() {
    if (mode !== 'playing') return;
    mode = 'paused';
    activePointer = null; pointer.active = false;
    Sound.music(null);
    showScreen('pause');
  }
  function resume() {
    if (mode !== 'paused') return;
    mode = 'playing';
    showScreen(null);
    Sound.music(G.boss ? 'boss' : 'level', G.levelIdx);
  }
  function toMenu() {
    commitRun();
    mode = 'menu';
    G = null;
    activePointer = null;
    layout(true);
    document.body.classList.remove('playing');
    Sound.music(null);
    buildMenu();
    showScreen('menu');
  }
  function toggleMute() {
    save.muted = !save.muted;
    Sound.setMuted(save.muted);
    persist();
    document.getElementById('btnMute').classList.toggle('off', save.muted);
    document.getElementById('menuMute').textContent = save.muted ? 'SONIDO: NO' : 'SONIDO: SÍ';
  }

  /* ================================================================== */
  /* Efectos: explosiones, partículas, textos                           */
  /* ================================================================== */
  const EXPLO_COLORS = ['#fff2b0', '#ffd23f', '#ff9a2f', '#ff4d2f', '#a8321f'];

  function explode(x, y, size) {
    const n = Math.round(6 + size * 1.6);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = rand(15, 45 + size * 3);
      G.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.25, 0.6 + size * 0.02), max: 0.9, c: EXPLO_COLORS[randi(0, 4)], s: Math.random() < 0.3 ? 2 : 1 });
    }
    G.rings.push({ x, y, r: 2, max: 6 + size * 0.9, life: 0 });
    if (size > 12) { G.shake = Math.max(G.shake, Math.min(5, size / 6)); }
  }

  function floater(x, y, str, color) {
    G.floaters.push({ x, y, str, color, life: 1.1 });
  }

  function setBanner(lines, dur) {
    G.banner = { lines, t: 0, dur };
  }

  /* ================================================================== */
  /* Generación de enemigos                                             */
  /* ================================================================== */
  function enemyHp(type) { return Math.max(1, Math.round(ENEMY[type].hp * G.escale.hp * 10) / 10); }

  function spawnEnemy(type, x, y, opts) {
    const def = ENEMY[type];
    const e = Object.assign({
      type, x, y, vx: 0, vy: 0, t: 0, baseX: x, phase: rand(0, 6.28),
      hp: enemyHp(type), r: def.r, flash: 0, fireT: rand(0.6, 1.8), dir: Math.random() < 0.5 ? -1 : 1,
      spin: 0, frameT: Math.random(), target: null, minion: false,
    }, opts || {});
    e.maxhp = e.hp;
    if (type === 'asteroid') {
      e.variant = randi(0, 2);
      const spr = S.enemies.asteroids[e.variant];
      e.r = spr.w / 2 - 1;
      e.hp = e.maxhp = Math.round(def.hp * G.escale.hp * (0.7 + e.r / 10) * 10) / 10;
      e.vx = rand(-12, 12);
      e.vy = rand(35, 70) * G.escale.speed;
      e.rot = randi(0, 3);
    }
    G.enemies.push(e);
    return e;
  }

  function spawnWave() {
    const lvl = G.level;
    const roster = {};
    for (const k in lvl.roster) {
      let w = lvl.roster[k];
      if ((k === 'cruiser' || k === 'ufo') && G.bossClock < 25) w *= 0.15;   // los pesados tardan en llegar
      if (k === 'cruiser') w *= 1 + G.tier * 0.15;
      roster[k] = w;
    }
    if (G.boss) { for (const k of ['cruiser', 'ufo', 'squid', 'asteroid']) delete roster[k]; }
    if (!Object.keys(roster).length) roster.drone = 1;
    const type = weightedPick(roster);
    const formation = (type === 'drone' || type === 'zig' || type === 'scout') && Math.random() < 0.55;
    if (!formation) {
      const x = rand(18, W - 18);
      if (type === 'ufo') spawnEnemy(type, x, -14, { targetY: rand(55, 130) });
      else spawnEnemy(type, x, -14);
      return;
    }
    const kind = ['row', 'stream', 'vee'][randi(0, 2)];
    const n = randi(3, 5);
    const cx = rand(50, W - 50);
    if (kind === 'row') {
      for (let i = 0; i < n; i++) G.queue.push({ t: i * 0.04, type, x: clamp(cx + (i - (n - 1) / 2) * 26, 12, W - 12), y: -12 });
    } else if (kind === 'stream') {
      for (let i = 0; i < n + 1; i++) G.queue.push({ t: i * 0.4, type, x: cx, y: -12, amp: 30 });
    } else {
      for (let i = 0; i < 5; i++) {
        const off = Math.abs(i - 2);
        G.queue.push({ t: 0, type, x: clamp(cx + (i - 2) * 22, 12, W - 12), y: -12 - off * 14 });
      }
    }
  }

  function updateSpawner(dt) {
    // los avisos de jefe detienen todo; durante el jefe baja la frecuencia
    if (G.warn > 0) return;
    for (let i = G.queue.length - 1; i >= 0; i--) {
      const q = G.queue[i];
      q.t -= dt;
      if (q.t <= 0) {
        const e = spawnEnemy(q.type, q.x, q.y);
        if (q.amp) e.amp = q.amp;
        G.queue.splice(i, 1);
      }
    }
    const ramp = 1 + (G.bossClock / BOSS_INTERVAL) * 0.6;
    const rate = G.escale.spawn * ramp * (G.boss ? 0.3 : 1) * (0.2 + 0.8 * W / BASE_W);
    G.spawnT -= dt;
    if (G.spawnT <= 0) {
      spawnWave();
      G.spawnT = rand(0.8, 1.7) / rate;
    }
  }

  /* ================================================================== */
  /* Disparos enemigos                                                  */
  /* ================================================================== */
  function ebullet(x, y, ang, speed, big) {
    const sp = speed * G.escale.bulletSpeed;
    G.ebullets.push({ x, y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, big: !!big, r: big ? 3 : 2 });
  }
  function aimAngle(x, y) { return Math.atan2(G.player.y - y, G.player.x - x); }

  function fireFan(x, y, baseAng, n, spreadDeg, speed, big) {
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : (i / (n - 1) - 0.5);
      ebullet(x, y, baseAng + t * spreadDeg * Math.PI / 180, speed, big);
    }
  }

  /* ================================================================== */
  /* Jugador                                                            */
  /* ================================================================== */
  function playerFire(dt) {
    const p = G.player;
    G.fireT -= dt;
    if (G.fireT > 0 || p.dead) return;
    const st = G.stats;
    G.fireT = st.interval;
    const pattern = WEAPONS[st.level];
    const col = BULLET_COLORS[G.shipIdx % BULLET_COLORS.length];
    pattern.forEach(w => {
      const a = w.a * Math.PI / 180;
      const sp = w.m ? st.bulletSpeed * 0.75 : st.bulletSpeed;
      G.bullets.push({
        x: p.x + w.dx, y: p.y - 8, vx: Math.sin(a) * sp, vy: -Math.cos(a) * sp,
        dmg: w.m ? st.damage * 1.5 : st.damage, missile: !!w.m, col, life: 2.2,
      });
    });
    Sound.sfx.shoot();
  }

  function useBomb() {
    const p = G.player;
    if (p.bombs <= 0 || p.dead || G.bombFx) return;
    p.bombs--;
    p.invuln = Math.max(p.invuln, 1.2);
    G.bombFx = { x: p.x, y: p.y, t: 0 };
    G.flash = 0.6;
    G.shake = 4;
    Sound.sfx.bomb();
    G.ebullets.forEach(b => { G.parts.push({ x: b.x, y: b.y, vx: 0, vy: -20, life: 0.4, max: 0.4, c: '#fff', s: 1 }); });
    G.ebullets.length = 0;
    const dmg = 14 * G.stats.damage * G.stats.level;
    G.enemies.slice().forEach(e => { if (!e.dying) hitEnemy(e, dmg); });
    if (G.boss && G.boss.state === 'fight') damageBoss(G.boss.maxhp * 0.05);
  }

  function hurtPlayer(amount) {
    const p = G.player;
    if (p.dead || p.invuln > 0 || DEBUG.god) return;
    if (p.shield > 0) {
      p.shield = 0; p.invuln = 0.8;
      Sound.sfx.hurt();
      G.shake = 2;
      return;
    }
    p.hp -= amount;
    p.invuln = 1.6;
    G.hurtFlash = 0.35;
    G.shake = 4;
    if (G.power > 0) { G.power--; G.stats = B.playerStats(G.tier, G.power); }
    Sound.sfx.hurt();
    if (p.hp <= 0) {
      p.hp = 0; p.dead = true;
      explode(p.x, p.y, 16);
      Sound.sfx.bigExplode();
      G.over = 1.6;
    }
  }

  function collectPowerup(pu) {
    const p = G.player;
    if (pu.kind === 'P') {
      if (G.power < B.MAX_POWER) {
        G.power++;
        G.stats = B.playerStats(G.tier, G.power);
        floater(p.x, p.y - 14, 'ARMA LV ' + G.stats.level, '#ff9a2f');
      } else {
        G.score += 500 * (1 + G.tier * 0.15);
        floater(p.x, p.y - 14, '+500', '#ff9a2f');
      }
      Sound.sfx.power();
    } else if (pu.kind === 'H') {
      p.hp = Math.min(p.maxHp, p.hp + 2);
      floater(p.x, p.y - 14, 'REPARACION', '#ff4d6d');
      Sound.sfx.pickup();
    } else if (pu.kind === 'S') {
      p.shield = 1;
      floater(p.x, p.y - 14, 'ESCUDO', '#4fd8ff');
      Sound.sfx.pickup();
    } else if (pu.kind === 'B') {
      p.bombs = Math.min(5, p.bombs + 1);
      floater(p.x, p.y - 14, '+BOMBA', '#ffd23f');
      Sound.sfx.pickup();
    }
  }

  function dropPowerup(x, y, force) {
    const kinds = { P: 36, H: 24, S: 18, B: 22 };
    if (G.power >= B.MAX_POWER) kinds.P = 8;
    if (G.player.hp >= G.player.maxHp) kinds.H = 6;
    const kind = force || weightedPick(kinds);
    G.powerups.push({ x, y, kind, t: 0, vx: rand(-8, 8) });
  }

  /* ================================================================== */
  /* Daño y destrucción                                                 */
  /* ================================================================== */
  function hitEnemy(e, dmg) {
    e.hp -= dmg;
    e.flash = 0.06;
    if (e.hp <= 0 && !e.dying) killEnemy(e);
    else Sound.sfx.hit();
  }

  function killEnemy(e) {
    e.dying = true;
    const def = ENEMY[e.type];
    G.score += def.score * (1 + 0.15 * G.tier);
    G.kills++;
    explode(e.x, e.y, def.r + 2);
    Sound.sfx.explode();
    if (Math.random() < def.drop) dropPowerup(e.x, e.y);
  }

  function damageBoss(dmg) {
    const b = G.boss;
    if (!b || b.state !== 'fight') return;
    b.hp -= dmg;
    b.flash = 0.05;
    if (b.hp <= 0) {
      b.hp = 0;
      b.state = 'dying';
      b.deadT = 0;
      G.ebullets.length = 0;
      Sound.music(null);
    }
  }

  /* ================================================================== */
  /* Jefes                                                              */
  /* ================================================================== */
  function spawnBoss() {
    const def = BOSSES[G.levelIdx];
    const spr = S.bosses[G.levelIdx];
    const hp = B.bossHp(G.tier);
    G.boss = {
      def, spr, x: W / 2, y: -spr.h, t: 0, hp, maxhp: hp, state: 'enter', flash: 0,
      cur: null, rest: 1.0, rot: 0, spin: 0, deadT: 0, nextBoom: 0,
    };
    Sound.music('boss', G.levelIdx);
    setBanner([{ text: G.level.boss, color: '#ff4d6d', scale: 1 }], 2.4);
  }

  function bossStep(b, name) {
    const es = G.escale;
    const px = b.x, py = b.y;
    const extra = es.extraBullets;
    switch (name) {
      case 'aimed':
        b.def.muzzles.forEach(m => {
          const x = px + m[0], y = py + m[1];
          fireFan(x, y, aimAngle(x, y), 3 + extra, 22 + extra * 4, 95);
        });
        break;
      case 'fan':
        fireFan(px, py + b.def.h / 2 - 6, Math.PI / 2 + Math.sin(b.t) * 0.2, 7 + extra * 2, 95, 70, false);
        break;
      case 'ring': {
        const n = 14 + extra * 2;
        b.rot += 0.21;
        for (let i = 0; i < n; i++) ebullet(px, py + 4, b.rot + (i / n) * Math.PI * 2, 60, i % 4 === 0);
        break;
      }
      case 'spiral': {
        const arms = 2 + (G.tier >= 3 ? 1 : 0) + (G.tier >= 7 ? 1 : 0);
        b.spin += 0.33;
        for (let i = 0; i < arms; i++) ebullet(px, py + 4, b.spin + (i / arms) * Math.PI * 2, 78);
        break;
      }
      case 'wall': {
        const gap = clamp(G.player.x + rand(-40, 40), 30, W - 30);
        const hole = 22 + Math.max(0, 6 - G.tier * 1.5);
        for (let x = 6; x < W; x += 12) {
          if (Math.abs(x - gap) < hole) continue;
          ebullet(x, py + 8, Math.PI / 2, 55);
        }
        break;
      }
      case 'rain':
        for (let i = 0, n = Math.round((1 + (extra > 1 ? 1 : 0)) * W / BASE_W); i < n; i++) {
          G.ebullets.push({ x: rand(6, W - 6), y: -2, vx: 0, vy: rand(70, 110) * es.bulletSpeed, big: false, r: 2 });
        }
        break;
      case 'minions':
        if (G.enemies.length < 9) {
          [-1, 1].forEach(s => {
            const e = spawnEnemy(G.levelIdx === 3 ? 'scout' : 'drone', px + s * 20, py + 8, { minion: true });
            e.vx = s * 40;
          });
        }
        break;
    }
  }

  function updateBoss(dt) {
    const b = G.boss;
    b.t += dt;
    if (b.flash > 0) b.flash -= dt;
    if (b.state === 'enter') {
      b.y += (62 - b.y) * Math.min(1, dt * 1.6) + 8 * dt;
      if (b.y >= 60) { b.y = 62; b.state = 'fight'; b.t = 0; }
      return;
    }
    if (b.state === 'dying') {
      b.deadT += dt;
      b.nextBoom -= dt;
      if (b.nextBoom <= 0) {
        b.nextBoom = 0.07;
        explode(b.x + rand(-b.def.w / 2, b.def.w / 2), b.y + rand(-b.def.h / 2, b.def.h / 2), rand(4, 10));
        Sound.sfx.explode();
      }
      G.shake = 3;
      b.y += 6 * dt;
      if (b.deadT > 2.4) bossDefeated();
      return;
    }
    // luchando
    b.x = W / 2 + Math.sin(b.t * b.def.speed * G.escale.speed) * b.def.amp * Math.min(2, W / BASE_W);
    b.y = 62 + Math.sin(b.t * 0.9) * 4;
    const frac = b.hp / b.maxhp;
    const phase = frac > 0.66 ? 0 : frac > 0.33 ? 1 : 2;
    if (b.phase !== phase) {
      if (b.phase !== undefined) { floater(b.x, b.y + 24, 'FURIA!', '#ff4d6d'); G.shake = 3; }
      b.phase = phase;
      b.cur = null; b.rest = 0.6;
    }
    if (b.rest > 0) { b.rest -= dt; return; }
    if (!b.cur) {
      const list = b.def.phases[phase];
      let name = list[randi(0, list.length - 1)];
      if (name === b.last && list.length > 1) name = list[(list.indexOf(name) + 1) % list.length];
      b.last = name;
      b.cur = { name, left: ATTACK[name].dur, tick: 0.2 };
    }
    const c = b.cur;
    c.left -= dt; c.tick -= dt;
    if (c.tick <= 0) {
      bossStep(b, c.name);
      c.tick = ATTACK[c.name].tick / G.escale.fire;
    }
    if (c.left <= 0) { b.cur = null; b.rest = 0.9 / Math.sqrt(G.escale.fire); }
  }

  // Derrotar al jefe completa el nivel: la partida termina y se vuelve al menú.
  function bossDefeated() {
    const b = G.boss;
    const lv = save.levels[G.levelIdx];
    explode(b.x, b.y, 30);
    G.flash = 1;
    Sound.sfx.bigExplode();
    G.score += 5000 * (1 + 0.5 * G.tier);
    G.kills++;
    G.boss = null;
    G.bossesThisRun++;
    G.warn = 0;
    G.ebullets.length = 0;
    G.enemies.forEach(e => { if (!e.dying) { e.hp = 0; killEnemy(e); } });
    G.player.invuln = 999;

    // El jefe sube el rango: el siguiente nivel empieza con arma y enemigos mejorados.
    const newTier = G.tier + 1;
    const weapon = B.playerStats(newTier, G.power).level;
    const next = G.levelIdx + 1;
    const last = next >= LEVELS.length;
    lv.bosses++;
    lv.best = Math.max(lv.best, Math.floor(G.score));
    save.totals.bosses++;
    const lines = [
      { text: 'JEFE DESTRUIDO', color: '#7dff6b', scale: 1 },
      { text: 'NIVEL COMPLETADO', color: '#ffffff', scale: 1 },
      { text: 'ARMA NIVEL ' + weapon + '  ^', color: '#ff9a2f', scale: 1 },
      { text: 'ENEMIGOS MAS FUERTES', color: '#ff4d6d', scale: 1 },
    ];
    if (!last) {
      save.levels[next].tier = Math.max(save.levels[next].tier, newTier);
      if (save.unlocked < next + 1) save.unlocked = next + 1;
      save.level = next;
      lines.push({ text: 'NIVEL ' + (next + 1) + ' DESBLOQUEADO', color: '#4fd8ff', scale: 1 });
    } else {
      lines.push({ text: 'JUEGO COMPLETADO!', color: '#ffd23f', scale: 1 });
    }
    persist();
    G.won = { t: 0, dur: 5, newTier, weapon, last, next };
    setBanner(lines, 5);
    Sound.sfx.levelUp();
  }

  function finishWin() {
    const w = G.won;
    const newBest = commitRun();
    lastResult = {
      levelIdx: G.levelIdx, score: Math.floor(G.score), best: save.levels[G.levelIdx].best,
      kills: G.kills, time: G.runTime, newBest: newBest && G.score > 0,
      rank: w.newTier + 1, weapon: w.weapon, last: w.last, next: w.next,
    };
    toMenu();
  }

  /* ================================================================== */
  /* Actualización por fotograma                                        */
  /* ================================================================== */
  function updateEnemy(e, dt) {
    const es = G.escale;
    const p = G.player;
    e.t += dt;
    e.frameT += dt;
    if (e.flash > 0) e.flash -= dt;
    switch (e.type) {
      case 'drone':
        e.vy = 55 * es.speed;
        e.x = e.baseX + Math.sin(e.t * 2.2 + e.phase) * (e.amp || 22) + (e.minion ? e.vx * e.t : 0);
        e.y += e.vy * dt;
        if (G.tier >= 2 && e.t > 0.8 && e.fireT > 0 && (e.fireT -= dt * es.fire) <= 0) { ebullet(e.x, e.y + 4, aimAngle(e.x, e.y), 70); e.fireT = rand(2.5, 4); }
        break;
      case 'scout': {
        e.vy = 85 * es.speed;
        if (e.t > 0.5 && e.y < p.y - 30) e.vx += clamp(p.x - e.x, -1, 1) * 120 * dt;
        e.vx = clamp(e.vx, -45, 45);
        e.x += e.vx * dt; e.y += e.vy * dt;
        if (e.t > 0.7 && !e.shot) { e.shot = true; fireFan(e.x, e.y + 4, aimAngle(e.x, e.y), 1 + (es.extraBullets > 0 ? 2 : 0), 20, 85); }
        break;
      }
      case 'zig': {
        const period = 1.7;
        const tri = Math.abs(((e.t + e.phase) % period) / period * 2 - 1) * 2 - 1;
        e.x = e.baseX + tri * (e.amp || 38) * e.dir;
        e.y += 72 * es.speed * dt;
        if (e.t > 1 && e.fireT > 0 && (e.fireT -= dt * es.fire) <= 0 && G.tier >= 1) { ebullet(e.x, e.y + 4, Math.PI / 2, 80); e.fireT = rand(2.2, 3.5); }
        break;
      }
      case 'ufo': {
        const ty = e.targetY || 90;
        if (e.y < ty && !e.leaving) e.y += 55 * es.speed * dt;
        else {
          if (!e.leaving) {
            e.x += Math.sin(e.t * 0.9 + e.phase) * 38 * es.speed * dt * 1.6;
            if (e.t > 7 + rand(0, 0.001)) e.leaving = true;
          } else e.y += 60 * dt;
        }
        e.x = clamp(e.x, 12, W - 12);
        if (!e.leaving && e.y >= ty - 2 && (e.fireT -= dt * es.fire) <= 0) {
          fireFan(e.x, e.y + 6, aimAngle(e.x, e.y), 3 + es.extraBullets, 24, 90);
          e.fireT = 1.8;
        }
        break;
      }
      case 'squid': {
        const ang = Math.atan2(p.y - e.y, p.x - e.x);
        const maxSp = 52 * es.speed;
        e.vx += Math.cos(ang) * 90 * dt;
        e.vy += Math.sin(ang) * 90 * dt + 22 * dt;
        const sp = Math.hypot(e.vx, e.vy);
        if (sp > maxSp) { e.vx = e.vx / sp * maxSp; e.vy = e.vy / sp * maxSp; }
        if (e.y < 20) e.vy += 60 * dt;
        e.x += e.vx * dt; e.y += e.vy * dt;
        break;
      }
      case 'cruiser':
        e.y += (e.y < 50 ? 30 : 16) * es.speed * dt;
        e.x = e.baseX + Math.sin(e.t * 0.6 + e.phase) * 24;
        if ((e.fireT -= dt * es.fire) <= 0) {
          fireFan(e.x, e.y + 8, Math.PI / 2, 5 + es.extraBullets * 2, 70, 75, true);
          e.fireT = 2.4;
        }
        break;
      case 'asteroid':
        e.x += e.vx * dt; e.y += e.vy * dt;
        e.spin += dt;
        break;
    }
  }

  function update(dt) {
    time += dt;
    const p = G.player;
    G.runTime += dt;
    updateBackground(dt, G.boss ? 1.4 : 1);

    /* --- jugador --- */
    if (!p.dead) {
      let dx = 0, dy = 0;
      if (keys['arrowleft'] || keys['a']) dx -= 1;
      if (keys['arrowright'] || keys['d']) dx += 1;
      if (keys['arrowup'] || keys['w']) dy -= 1;
      if (keys['arrowdown'] || keys['s']) dy += 1;
      const sp = 120 * Math.min(1.5, 0.6 + W / 600) * (save.settings.sens / 100);
      const len = Math.hypot(dx, dy) || 1;
      p.x += dx / len * sp * dt + pointer.dx;
      p.y += dy / len * sp * dt + pointer.dy;
      pointer.dx = pointer.dy = 0;
      p.x = clamp(p.x, 8, W - 8);
      p.y = clamp(p.y, 40, H - 12);
      if (p.invuln > 0) p.invuln -= dt;
      if (p.shield > 0) { /* dura hasta recibir un golpe */ }
      playerFire(dt);
      if (bombPressed) useBomb();
    }
    bombPressed = false;

    /* --- reloj del jefe --- */
    if (!G.boss && G.warn <= 0 && !p.dead && !G.won) {
      G.bossClock += dt;
      if (G.bossClock >= BOSS_INTERVAL) {
        G.warn = 3.2;
        Sound.sfx.warning();
      }
    }
    if (G.warn > 0) {
      G.warn -= dt;
      if (G.warn <= 0) { G.warn = 0; spawnBoss(); }
    }

    if (!p.dead && !G.won) updateSpawner(dt);
    if (G.won) {
      G.won.t += dt;
      if (G.won.t >= G.won.dur) { finishWin(); return; }
    }

    /* --- balas del jugador --- */
    G.bullets.forEach(b => {
      if (b.missile) {
        let target = null, best = 1e9;
        G.enemies.forEach(e => { const d = dist(b.x, b.y, e.x, e.y); if (!e.dying && d < best && e.y > 0) { best = d; target = e; } });
        if (G.boss && G.boss.state === 'fight') { const d = dist(b.x, b.y, G.boss.x, G.boss.y); if (d < best) { best = d; target = G.boss; } }
        if (target) {
          const sp = Math.hypot(b.vx, b.vy);
          const want = Math.atan2(target.y - b.y, target.x - b.x);
          let cur = Math.atan2(b.vy, b.vx);
          let diff = want - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          cur += clamp(diff, -4 * dt, 4 * dt);
          b.vx = Math.cos(cur) * sp; b.vy = Math.sin(cur) * sp;
        }
      }
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    });

    /* --- enemigos --- */
    G.enemies.forEach(e => { if (!e.dying) updateEnemy(e, dt); });
    if (G.boss) updateBoss(dt);

    /* --- colisiones: balas jugador vs enemigos / jefe --- */
    G.bullets.forEach(b => {
      if (b.dead) return;
      for (const e of G.enemies) {
        if (e.dying || e.y < -6) continue;
        if (Math.abs(b.x - e.x) < e.r + 1.5 && Math.abs(b.y - e.y) < e.r + 2) {
          b.dead = true;
          hitEnemy(e, b.dmg);
          break;
        }
      }
      const bs = G.boss;
      if (!b.dead && bs && bs.state !== 'dying' && Math.abs(b.x - bs.x) < bs.def.hw + 1 && Math.abs(b.y - bs.y) < bs.def.hh + 2) {
        b.dead = true;
        if (bs.state === 'fight') { damageBoss(b.dmg); Sound.sfx.hit(); }
        G.parts.push({ x: b.x, y: b.y, vx: rand(-20, 20), vy: rand(10, 30), life: 0.25, max: 0.25, c: '#fff', s: 1 });
      }
    });

    /* --- colisiones con el jugador --- */
    if (!p.dead) {
      G.ebullets.forEach(b => {
        b.x += b.vx * dt; b.y += b.vy * dt;
        if (!b.dead && dist(b.x, b.y, p.x, p.y) < b.r + 2.5) { b.dead = true; hurtPlayer(1); }
      });
      G.enemies.forEach(e => {
        if (e.dying) return;
        if (dist(e.x, e.y, p.x, p.y) < e.r + 4) {
          hurtPlayer(e.type === 'cruiser' ? 2 : 1);
          if (e.type !== 'cruiser' && e.type !== 'ufo') killEnemy(e);
        }
      });
      const bs = G.boss;
      if (bs && bs.state === 'fight' && Math.abs(p.x - bs.x) < bs.def.hw + 3 && Math.abs(p.y - bs.y) < bs.def.hh + 3) hurtPlayer(2);
    } else {
      G.ebullets.forEach(b => { b.x += b.vx * dt; b.y += b.vy * dt; });
    }

    /* --- mejoras --- */
    G.powerups.forEach(pu => {
      pu.t += dt;
      pu.y += 32 * dt;
      pu.x += pu.vx * dt;
      if (pu.x < 8 || pu.x > W - 8) pu.vx = -pu.vx;
      if (!p.dead && dist(pu.x, pu.y, p.x, p.y) < 12) { pu.dead = true; collectPowerup(pu); }
    });

    /* --- partículas y efectos --- */
    G.parts.forEach(q => { q.x += q.vx * dt; q.y += q.vy * dt; q.vx *= 0.97; q.vy *= 0.97; q.life -= dt; });
    G.rings.forEach(r => { r.life += dt; r.r += (r.max - r.r) * Math.min(1, dt * 8); });
    G.floaters.forEach(f => { f.life -= dt; f.y -= 14 * dt; });
    if (G.bombFx) { G.bombFx.t += dt; if (G.bombFx.t > 0.9) G.bombFx = null; }
    if (G.banner) { G.banner.t += dt; if (G.banner.t > G.banner.dur) G.banner = null; }
    if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 8);
    if (G.flash > 0) G.flash -= dt * 1.6;
    if (G.hurtFlash > 0) G.hurtFlash -= dt;

    /* --- limpieza --- */
    G.bullets = G.bullets.filter(b => !b.dead && b.life > 0 && b.x > -10 && b.x < W + 10 && b.y > -10);
    G.ebullets = G.ebullets.filter(b => !b.dead && b.x > -8 && b.x < W + 8 && b.y > -8 && b.y < H + 8);
    G.enemies = G.enemies.filter(e => !e.dying && e.y < H + 24 && e.y > -40 && e.x > -30 && e.x < W + 30);
    G.powerups = G.powerups.filter(pu => !pu.dead && pu.y < H + 10);
    G.parts = G.parts.filter(q => q.life > 0);
    G.rings = G.rings.filter(r => r.life < 0.35);
    G.floaters = G.floaters.filter(f => f.life > 0);

    if (p.dead) {
      G.over -= dt;
      if (G.over <= 0) endRun();
    }
  }

  /* ================================================================== */
  /* Dibujo                                                             */
  /* ================================================================== */
  function drawSprite(spr, x, y, flash, frame) {
    const img = flash ? spr.flash : spr.frames[frame ? 1 : 0];
    ctx.drawImage(img, Math.round(x - spr.w / 2), Math.round(y - spr.h / 2));
  }

  function drawEnemy(e) {
    const frame = Math.floor(e.frameT * 4) % 2;
    if (e.type === 'asteroid') {
      const spr = S.enemies.asteroids[e.variant];
      const img = e.flash > 0 ? spr.flash : spr.frames[0];
      ctx.save();
      ctx.translate(Math.round(e.x), Math.round(e.y));
      ctx.rotate((Math.floor(e.spin * 1.5) % 4) * Math.PI / 2);
      ctx.drawImage(img, -Math.floor(img.width / 2), -Math.floor(img.height / 2));
      ctx.restore();
      return;
    }
    const spr = S.enemies[e.type];
    drawSprite(spr, e.x, e.y, e.flash > 0, frame);
    if (e.type === 'cruiser' && e.hp < e.maxhp) {      // barra de vida
      const f = Math.max(0, e.hp / e.maxhp);
      ctx.fillStyle = '#300'; ctx.fillRect(Math.round(e.x - 10), Math.round(e.y - 12), 20, 2);
      ctx.fillStyle = '#ff4d4d'; ctx.fillRect(Math.round(e.x - 10), Math.round(e.y - 12), Math.round(20 * f), 2);
    }
  }

  function drawPlayer() {
    const p = G.player;
    if (p.dead) return;
    if (p.invuln > 0 && Math.floor(time * 18) % 2 === 0 && p.invuln < 100 && !G.bombFx) return;
    const spr = G.ship;
    const x = Math.round(p.x), y = Math.round(p.y);
    // llama del motor
    const fl = 2 + (Math.floor(time * 30) % 3);
    ctx.fillStyle = '#ff7a2f'; ctx.fillRect(x - 1, y + 7, 3, fl);
    ctx.fillStyle = '#fff2b0'; ctx.fillRect(x, y + 7, 1, fl - 1);
    ctx.drawImage(spr.frames[0], x - Math.floor(spr.w / 2), y - Math.floor(spr.h / 2));
    if (p.shield > 0) {
      ctx.strokeStyle = Math.floor(time * 10) % 2 ? '#4fd8ff' : '#bff6ff';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(x + 0.5, y + 0.5, 12, 0, Math.PI * 2); ctx.stroke();
    }
  }

  function drawBullets() {
    G.bullets.forEach(b => {
      const x = Math.round(b.x), y = Math.round(b.y);
      if (b.missile) {
        ctx.fillStyle = '#ff7a2f'; ctx.fillRect(x - 1, y, 2, 4);
        ctx.fillStyle = '#fff2b0'; ctx.fillRect(x - 1, y - 2, 2, 2);
        ctx.fillStyle = 'rgba(255,200,100,0.5)'; ctx.fillRect(x - 1, y + 4, 2, 3);
      } else {
        ctx.fillStyle = b.col; ctx.fillRect(x - 1, y - 3, 2, 6);
        ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 3, 1, 2);
      }
    });
    G.ebullets.forEach(b => {
      const x = Math.round(b.x), y = Math.round(b.y);
      if (b.big) {
        ctx.fillStyle = '#ff9a2f'; ctx.fillRect(x - 2, y - 2, 5, 5);
        ctx.fillStyle = '#fff2b0'; ctx.fillRect(x - 1, y - 1, 3, 3);
        ctx.fillStyle = '#ff9a2f'; ctx.fillRect(x, y, 1, 1);
      } else {
        ctx.fillStyle = '#ff2d55'; ctx.fillRect(x - 1, y - 2, 3, 5); ctx.fillRect(x - 2, y - 1, 5, 3);
        ctx.fillStyle = '#ffd0da'; ctx.fillRect(x - 1, y - 1, 2, 2);
      }
    });
  }

  function drawPowerups() {
    G.powerups.forEach(pu => {
      const def = POWERUPS[pu.kind];
      const x = Math.round(pu.x), y = Math.round(pu.y + Math.sin(pu.t * 5) * 1.5);
      ctx.fillStyle = '#10142a'; ctx.fillRect(x - 6, y - 6, 12, 12);
      ctx.fillStyle = def.color; ctx.fillRect(x - 5, y - 5, 10, 10);
      ctx.fillStyle = Math.floor(pu.t * 6) % 2 ? '#ffffff' : '#10142a';
      ctx.fillRect(x - 5, y - 5, 10, 1); ctx.fillRect(x - 5, y + 4, 10, 1);
      text(ctx, def.label, x - 1, y - 2, '#10142a', 1);
    });
  }

  function drawEffects() {
    G.parts.forEach(q => {
      ctx.globalAlpha = Math.min(1, q.life / (q.max * 0.5));
      ctx.fillStyle = q.c;
      ctx.fillRect(Math.round(q.x), Math.round(q.y), q.s, q.s);
    });
    ctx.globalAlpha = 1;
    G.rings.forEach(r => {
      ctx.strokeStyle = 'rgba(255,240,200,' + (1 - r.life / 0.35) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5, r.r, 0, Math.PI * 2); ctx.stroke();
    });
    if (G.bombFx) {
      const f = G.bombFx;
      const r = f.t * 420;
      ctx.strokeStyle = 'rgba(255,255,255,' + (1 - f.t / 0.9) + ')';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,200,80,' + (0.8 - f.t / 0.9) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, r * 0.8, 0, Math.PI * 2); ctx.stroke();
    }
    G.floaters.forEach(f => text(ctx, f.str, f.x, Math.round(f.y), f.color, 1, 'center'));
  }

  function drawHUD() {
    const p = G.player;
    ctx.fillStyle = 'rgba(0,0,10,0.45)';
    ctx.fillRect(0, 0, W, 24);
    text(ctx, 'PUNTOS ' + pad(G.score, 6), 4, 3, '#ffffff', 1);
    text(ctx, 'RANGO ' + (G.tier + 1), W - 4, 3, '#ffd23f', 1, 'right');
    // vida
    for (let i = 0; i < p.maxHp; i++) {
      ctx.drawImage(i < p.hp ? S.heart : S.heartEmpty, 4 + i * 8, 10);
    }
    // bombas
    ctx.drawImage(S.bomb, W - 30, 9);
    text(ctx, 'X' + p.bombs, W - 4, 11, '#ffd23f', 1, 'right');
    // jefe / reloj de jefe
    if (G.boss) {
      const b = G.boss;
      text(ctx, G.level.boss, W / 2, 11, '#ff6b8a', 1, 'center');
      ctx.fillStyle = '#3a0010'; ctx.fillRect(4, 19, W - 8, 4);
      ctx.fillStyle = '#ff2d55'; ctx.fillRect(4, 19, Math.round((W - 8) * b.hp / b.maxhp), 4);
      ctx.fillStyle = '#ffd0da'; ctx.fillRect(4, 19, Math.round((W - 8) * b.hp / b.maxhp), 1);
    } else if (G.won) {
      text(ctx, 'NIVEL COMPLETADO', W / 2, 11, '#7dff6b', 1, 'center');
    } else {
      const left = Math.max(0, BOSS_INTERVAL - G.bossClock);
      text(ctx, 'JEFE EN ' + fmtTime(left), W / 2, 11, G.warn > 0 ? '#ff4d4d' : '#9fb4e8', 1, 'center');
      ctx.fillStyle = '#10204a'; ctx.fillRect(4, 20, W - 8, 2);
      ctx.fillStyle = left < 30 ? '#ff9a2f' : '#4fd8ff';
      ctx.fillRect(4, 20, Math.round((W - 8) * G.bossClock / BOSS_INTERVAL), 2);
    }
    // arma
    text(ctx, 'ARMA LV ' + G.stats.level + (G.power > 0 ? ' +' + G.power : ''), 4, H - 8, '#ff9a2f', 1);
    if (save.muted) text(ctx, 'MUDO', W - 4, H - 8, '#8a90b0', 1, 'right');
  }

  function drawBanner() {
    if (G.warn > 0) {
      const on = Math.floor(G.warn * 4) % 2 === 0;
      ctx.fillStyle = 'rgba(160,0,20,' + (on ? 0.25 : 0.1) + ')';
      ctx.fillRect(0, 0, W, H);
      if (on) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 130, W, 40);
        text(ctx, 'ADVERTENCIA', W / 2, 138, '#ff4d4d', 2, 'center');
        text(ctx, 'UN JEFE SE ACERCA', W / 2, 156, '#ffd0da', 1, 'center');
      }
    }
    const bn = G.banner;
    if (bn) {
      const a = Math.min(1, bn.t / 0.3, (bn.dur - bn.t) / 0.4);
      ctx.globalAlpha = Math.max(0, a);
      const h = bn.lines.length * 10 + 10;
      const y0 = 100;
      ctx.fillStyle = 'rgba(0,0,12,0.6)'; ctx.fillRect(0, y0, W, h);
      bn.lines.forEach((l, i) => text(ctx, l.text, W / 2, y0 + 6 + i * 10, l.color, l.scale || 1, 'center'));
      ctx.globalAlpha = 1;
    }
  }

  function render() {
    ctx.save();
    if (G && G.shake > 0) ctx.translate(randi(-1, 1) * Math.ceil(G.shake / 2), randi(-1, 1) * Math.ceil(G.shake / 2));
    drawBackground();
    if (G) {
      drawPowerups();
      G.enemies.forEach(drawEnemy);
      if (G.boss) {
        const b = G.boss;
        const frame = Math.floor(time * 3) % 2;
        const img = b.flash > 0 ? b.spr.flash : b.spr.frames[frame];
        ctx.drawImage(img, Math.round(b.x - b.spr.w / 2), Math.round(b.y - b.spr.h / 2));
      }
      drawPlayer();
      drawBullets();
      drawEffects();
    }
    ctx.restore();
    if (G) {
      if (G.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + Math.min(0.8, G.flash) + ')'; ctx.fillRect(0, 0, W, H); }
      if (G.hurtFlash > 0) { ctx.fillStyle = 'rgba(255,0,40,' + G.hurtFlash * 0.6 + ')'; ctx.fillRect(0, 0, W, H); }
      drawBanner();
      drawHUD();
    }
  }

  /* ================================================================== */
  /* Bucle principal                                                    */
  /* ================================================================== */
  let last = 0;
  function frame(ts) {
    const dt = Math.min(0.05, (ts - last) / 1000 || 0);
    last = ts;
    if (mode === 'playing') update(dt);
    else {
      time += dt;
      if (mode === 'menu' && bgState.levelIdx < 0) setupBackground(save.level);
    }
    if (mode === 'menu') updateBackground(dt, 0.6);
    render();
    requestAnimationFrame(frame);
  }

  /* ================================================================== */
  /* Interfaz: menú, pausa, fin de partida                              */
  /* ================================================================== */
  const screens = { menu: document.getElementById('menu'), pause: document.getElementById('pause'), over: document.getElementById('over'), backup: document.getElementById('backup'), settings: document.getElementById('settings') };
  function showScreen(name) {
    Object.keys(screens).forEach(k => screens[k].classList.toggle('hidden', k !== name));
    if (name) screens[name].scrollTop = 0;
  }

  function spriteCanvas(spr, scale, frame) {
    const c = document.createElement('canvas');
    c.width = spr.w; c.height = spr.h;
    c.style.width = spr.w * scale + 'px';
    c.style.height = spr.h * scale + 'px';
    c.getContext('2d').drawImage(spr.frames[frame || 0], 0, 0);
    return c;
  }

  function buildMenu() {
    // --- naves ---
    const shipsEl = document.getElementById('ships');
    shipsEl.innerHTML = '';
    S.ships.forEach((spr, i) => {
      const b = document.createElement('button');
      b.className = 'ship' + (i === save.ship ? ' sel' : '');
      b.title = spr.name;
      b.setAttribute('aria-label', 'Nave ' + spr.name);
      b.appendChild(spriteCanvas(spr, 3));
      b.addEventListener('click', () => { save.ship = i; persist(); Sound.resume(); Sound.sfx.select(); buildMenu(); });
      shipsEl.appendChild(b);
    });
    const cur = S.ships[save.ship];
    const big = document.getElementById('shipBig');
    big.innerHTML = '';
    big.appendChild(spriteCanvas(cur, 5));
    document.getElementById('shipName').textContent = cur.name;
    document.getElementById('shipDesc').textContent = cur.desc;

    // --- niveles ---
    const lvEl = document.getElementById('levels');
    lvEl.innerHTML = '';
    LEVELS.forEach((lv, i) => {
      const locked = i >= save.unlocked;
      const rec = save.levels[i];
      const b = document.createElement('button');
      b.className = 'level' + (i === save.level ? ' sel' : '') + (locked ? ' locked' : '');
      b.style.setProperty('--accent', lv.accent);
      b.disabled = locked;
      const thumb = document.createElement('div');
      thumb.className = 'thumb';
      thumb.appendChild(spriteCanvas(S.bosses[i], 1));
      const info = document.createElement('div');
      info.className = 'info';
      const entry = Math.max(rec.tier, lv.baseTier) + 1;
      info.innerHTML = '<b>' + (i + 1) + '. ' + lv.name + (rec.bosses > 0 ? ' <i>✔ COMPLETADO</i>' : '') + '</b><span>' +
        (locked ? 'BLOQUEADO — derrota al jefe del nivel ' + i : lv.sub + ' · Jefe: ' + lv.boss) + '</span>' +
        (locked ? '' : '<em>RÉCORD ' + pad(rec.best, 6) + ' · ENTRADA: RANGO ' + entry + '</em>');
      b.appendChild(thumb); b.appendChild(info);
      b.addEventListener('click', () => { save.level = i; persist(); Sound.resume(); Sound.sfx.select(); buildMenu(); });
      lvEl.appendChild(b);
    });

    // --- resultado del último nivel completado ---
    const res = document.getElementById('result');
    res.classList.toggle('hidden', !lastResult);
    if (lastResult) {
      const r = lastResult;
      res.innerHTML =
        '<b>¡NIVEL COMPLETADO!</b><span>' + LEVELS[r.levelIdx].name + ' · Jefe: ' + LEVELS[r.levelIdx].boss + '</span>' +
        '<div class="rgrid"><div><span>PUNTOS</span><b>' + pad(r.score, 6) + '</b></div>' +
        '<div><span>BAJAS</span><b>' + r.kills + '</b></div>' +
        '<div><span>TIEMPO</span><b>' + fmtTime(r.time) + '</b></div></div>' +
        (r.newBest ? '<em class="newrec">¡NUEVO RÉCORD!</em>' : '') +
        '<p>Tu arma sube al <b>nivel ' + r.weapon + '</b> y los enemigos serán más duros (rango ' + r.rank + ').</p>' +
        '<p class="go">' + (r.last ? '¡Has completado todos los niveles! Puedes repetirlos para mejorar tu récord.' : 'Elige el siguiente nivel y pulsa JUGAR.') + '</p>';
    }
    const t = save.totals;
    document.getElementById('totals').textContent =
      'Jefes derrotados: ' + t.bosses + '  ·  Enemigos destruidos: ' + t.kills + '  ·  Partidas: ' + t.plays + '  ·  Tiempo: ' + fmtTime(t.time) + '  ·  v9';
    document.getElementById('menuMute').textContent = save.muted ? 'SONIDO: NO' : 'SONIDO: SÍ';
    document.getElementById('btnMute').classList.toggle('off', save.muted);
  }

  function startFromMenu() {
    startRun(save.level, save.levels[save.level].tier);
  }

  document.getElementById('btnPlay').addEventListener('click', startFromMenu);
  document.getElementById('menuMute').addEventListener('click', () => { Sound.resume(); toggleMute(); });
  // Confirmación en dos pasos (confirm() no funciona en todos los entornos)
  const btnReset = document.getElementById('btnReset');
  let resetTimer = null;
  btnReset.addEventListener('click', () => {
    if (!resetTimer) {
      btnReset.textContent = '¿SEGURO? PULSA OTRA VEZ';
      resetTimer = setTimeout(() => { resetTimer = null; btnReset.textContent = 'BORRAR PROGRESO'; }, 4000);
      return;
    }
    clearTimeout(resetTimer); resetTimer = null;
    btnReset.textContent = 'BORRAR PROGRESO';
    save = defaultSave();
    persist();
    buildMenu();
  });
  document.getElementById('btnResume').addEventListener('click', resume);
  document.getElementById('btnQuit').addEventListener('click', toMenu);
  document.getElementById('btnRetry').addEventListener('click', () => {
    startRun(G.levelIdx, save.levels[G.levelIdx].tier);
  });
  document.getElementById('btnMenu').addEventListener('click', toMenu);
  document.getElementById('btnPause').addEventListener('click', () => { if (mode === 'playing') pause(); else if (mode === 'paused') resume(); });
  document.getElementById('btnBomb').addEventListener('click', () => { if (mode === 'playing') bombPressed = true; });
  document.getElementById('btnMute').addEventListener('click', () => { Sound.resume(); toggleMute(); });
  ['btnBomb', 'btnPause', 'btnMute'].forEach(id => {
    document.getElementById(id).addEventListener('pointerdown', (e) => e.stopPropagation());
  });

  /* --- Ajustes --- */
  let settingsFrom = 'menu';
  // Controles de ajuste propios (barra + botones − / +): se ven y funcionan igual en cualquier navegador.
  const ctls = [
    { id: 'setSfx', out: 'outSfx', preview: () => { Sound.resume(); Sound.sfx.explode(); } },
    { id: 'setMusic', out: 'outMusic', preview: () => { Sound.resume(); Sound.sfx.musicPreview(); } },
    { id: 'setSens', out: 'outSens', preview: null },
  ].map(c => {
    const el = document.getElementById(c.id);
    c.el = el;
    c.key = el.dataset.key;
    c.min = +el.dataset.min; c.max = +el.dataset.max; c.step = +el.dataset.step;
    c.bar = el.querySelector('.bar'); c.fill = el.querySelector('.fill');
    return c;
  });
  function paintCtl(c) {
    const v = save.settings[c.key];
    c.fill.style.width = ((v - c.min) / (c.max - c.min) * 100) + '%';
    c.bar.setAttribute('aria-valuenow', v);
    document.getElementById(c.out).textContent = v + '%';
  }
  function setCtl(c, v) {
    v = clamp(Math.round(v / c.step) * c.step, c.min, c.max);
    save.settings[c.key] = v;
    paintCtl(c);
    Sound.setVolumes(save.settings.sfx, save.settings.music);
  }
  function syncSettingsUI() {
    ctls.forEach(paintCtl);
    document.getElementById('setMute').textContent = save.muted ? 'SONIDO: NO' : 'SONIDO: SÍ';
  }
  function openSettings(from) {
    settingsFrom = from;
    syncSettingsUI();
    showScreen('settings');
  }
  ctls.forEach(c => {
    const done = () => { persist(); if (c.preview) c.preview(); };
    c.el.querySelector('.minus').addEventListener('click', () => { setCtl(c, save.settings[c.key] - c.step); done(); });
    c.el.querySelector('.plus').addEventListener('click', () => { setCtl(c, save.settings[c.key] + c.step); done(); });
    const fromX = (e) => {
      const r = c.bar.getBoundingClientRect();
      setCtl(c, c.min + clamp((e.clientX - r.left) / r.width, 0, 1) * (c.max - c.min));
    };
    let dragging = null;
    c.bar.addEventListener('pointerdown', (e) => { dragging = e.pointerId; try { c.bar.setPointerCapture(e.pointerId); } catch (err) { /* ok */ } fromX(e); });
    c.bar.addEventListener('pointermove', (e) => { if (dragging === e.pointerId) fromX(e); });
    const end = (e) => { if (dragging === e.pointerId) { dragging = null; done(); } };
    c.bar.addEventListener('pointerup', end);
    c.bar.addEventListener('pointercancel', end);
    c.bar.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : 0;
      if (d) { e.preventDefault(); e.stopPropagation(); setCtl(c, save.settings[c.key] + d * c.step); done(); }
    });
  });
  document.getElementById('setMute').addEventListener('click', () => { Sound.resume(); toggleMute(); syncSettingsUI(); });
  document.getElementById('btnSettingsReset').addEventListener('click', () => {
    save.settings = { sfx: 70, music: 70, sens: 100 };
    Sound.setVolumes(70, 70);
    persist(); syncSettingsUI();
  });
  document.getElementById('btnSettingsClose').addEventListener('click', () => {
    persist();
    if (settingsFrom === 'menu') buildMenu();
    showScreen(settingsFrom);
  });
  document.getElementById('btnSettings').addEventListener('click', () => openSettings('menu'));
  document.getElementById('btnSettingsTop').addEventListener('click', () => openSettings('menu'));
  document.getElementById('btnPauseSettings').addEventListener('click', () => openSettings('pause'));

  /* --- Copia de seguridad --- */
  const backupText = document.getElementById('backupText');
  const backupMsg = document.getElementById('backupMsg');
  function backupSay(msg, ok) { backupMsg.textContent = msg; backupMsg.className = 'note ' + (ok ? 'ok' : 'err'); }

  function openBackup() {
    backupText.value = exportSave();
    backupSay('', true);
    const st = document.getElementById('storageState');
    st.textContent = 'Guardado en este dispositivo (localStorage).';
    if (navigator.storage && navigator.storage.persisted) {
      navigator.storage.persisted().then(p => {
        st.textContent = 'Guardado en este dispositivo' + (p ? ' · almacenamiento protegido.' : ' · el sistema podría borrarlo si falta espacio: haz una copia.');
      }).catch(() => {});
    }
    showScreen('backup');
  }
  document.getElementById('btnBackup').addEventListener('click', openBackup);
  document.getElementById('btnBackupClose').addEventListener('click', () => { buildMenu(); showScreen('menu'); });
  document.getElementById('btnBackupCopy').addEventListener('click', () => {
    backupText.value = exportSave();
    const done = () => backupSay('Copiado. Pégalo en un lugar seguro (Notas, mensaje a ti mismo...).', true);
    const fallback = () => { backupText.select(); backupSay('Selecciona el texto y cópialo manualmente.', false); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(backupText.value).then(done, fallback);
    else fallback();
  });
  document.getElementById('btnBackupLoad').addEventListener('click', () => {
    if (importSave(backupText.value)) { backupSay('Progreso restaurado.', true); }
    else backupSay('El texto no es una copia válida de Air Destroyer.', false);
  });
  document.getElementById('btnBackupSave').addEventListener('click', () => {
    const blob = new Blob([exportSave()], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'air-destroyer-progreso.txt';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    backupSay('Archivo generado.', true);
  });
  document.getElementById('backupFile').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      backupText.value = String(reader.result);
      const ok = importSave(backupText.value);
      backupSay(ok ? 'Progreso restaurado desde el archivo.' : 'El archivo no es una copia válida.', ok);
    };
    reader.readAsText(f);
    e.target.value = '';
  });

  // Gancho para pruebas automáticas
  window.AirDestroyer = {
    get game() { return G; }, get mode() { return mode; }, get save() { return save; },
    startRun, endRun, pause, B, LEVELS, update, forceBoss() { if (G) G.bossClock = BOSS_INTERVAL; },
  };

  layout(true);
  buildMenu();
  showScreen('menu');
  requestAnimationFrame(frame);
})();
