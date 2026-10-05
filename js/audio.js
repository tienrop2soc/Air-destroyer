/*
 * Audio: efectos y música chiptune generados con WebAudio (sin archivos).
 * El contexto de audio se crea tras el primer gesto del usuario.
 */
(function (root) {
  'use strict';

  let ac = null, master = null, noiseBuf = null;
  let muted = false;
  let musicTimer = null, musicMode = null, musicStep = 0, musicNext = 0, musicRoot = 110;

  function init() {
    if (ac) return;
    try {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
  }

  let unlocked = false;
  function resume() {
    init();
    if (!ac) return;
    if (ac.state === 'suspended' || ac.state === 'interrupted') ac.resume();
    if (!unlocked) {                       // iOS: hay que reproducir algo dentro de un gesto
      unlocked = true;
      const b = ac.createBuffer(1, 1, 22050);
      const src = ac.createBufferSource();
      src.buffer = b; src.connect(ac.destination); src.start(0);
    }
  }
  // iOS solo desbloquea el audio con touchend/click (no con pointerdown)
  ['touchend', 'click', 'keydown'].forEach(function (ev) {
    root.addEventListener(ev, resume, { passive: true });
  });

  function tone(type, f0, f1, dur, vol, delay) {
    if (!ac) return;
    const t = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.03);
  }

  function noise(dur, vol, fStart, fEnd, delay) {
    if (!ac) return;
    const t = ac.currentTime + (delay || 0);
    const s = ac.createBufferSource();
    s.buffer = noiseBuf;
    const f = ac.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(fStart, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, fEnd), t + dur);
    const g = ac.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.03);
  }

  let lastShot = 0;
  const sfx = {
    shoot() {
      if (!ac || ac.currentTime - lastShot < 0.11) return;
      lastShot = ac.currentTime;
      tone('square', 880, 440, 0.06, 0.035);
    },
    hit() { tone('square', 220, 160, 0.04, 0.03); },
    explode() { noise(0.28, 0.22, 2400, 200); tone('square', 180, 50, 0.2, 0.08); },
    bigExplode() { noise(0.9, 0.4, 3000, 80); tone('sawtooth', 200, 30, 0.8, 0.12); },
    hurt() { noise(0.35, 0.3, 1800, 120); tone('sawtooth', 300, 60, 0.3, 0.12); },
    power() { [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.08, 0.06, i * 0.06)); },
    pickup() { tone('square', 660, 990, 0.1, 0.06); },
    bomb() { noise(1.1, 0.45, 4000, 60); tone('sawtooth', 600, 40, 1.0, 0.12); },
    warning() { for (let i = 0; i < 4; i++) { tone('square', 440, 440, 0.18, 0.07, i * 0.5); tone('square', 330, 330, 0.18, 0.07, i * 0.5 + 0.25); } },
    levelUp() { [392, 523, 659, 784, 1047, 1319].forEach((f, i) => tone('square', f, f, 0.14, 0.07, i * 0.09)); },
    select() { tone('square', 520, 780, 0.07, 0.05); },
    gameOver() { [330, 262, 196, 131].forEach((f, i) => tone('triangle', f, f * 0.95, 0.3, 0.12, i * 0.28)); },
  };

  /* Música: bajo triangular + arpegio cuadrado, 16 pasos por compás. */
  const MUSIC = {
    level: { step: 0.15, bass: [0, 0, 12, 0, 0, 0, 10, 0, 7, 7, 19, 7, 5, 5, 3, 5], lead: [12, 15, 19, 15, 24, 19, 15, 19, 12, 15, 19, 15, 22, 19, 14, 19], leadVol: 0.018, bassVol: 0.06 },
    boss: { step: 0.105, bass: [0, 0, 1, 0, 0, 0, 6, 0, 0, 0, 1, 0, 7, 6, 1, 0], lead: [12, 13, 18, 13, 24, 18, 13, 18, 12, 13, 18, 13, 25, 18, 13, 6], leadVol: 0.03, bassVol: 0.07 },
  };
  const ROOTS = [110, 98, 123.47, 87.31, 103.83];

  function musicTick() {
    if (!ac || !musicMode) return;
    const m = MUSIC[musicMode];
    while (musicNext < ac.currentTime + 0.15) {
      const delay = Math.max(0, musicNext - ac.currentTime);
      const i = musicStep % 16;
      const bf = musicRoot * Math.pow(2, m.bass[i] / 12);
      tone('triangle', bf, bf, m.step * 0.9, m.bassVol, delay);
      if (i % 2 === 0 || musicMode === 'boss') {
        const lf = musicRoot * 2 * Math.pow(2, m.lead[i] / 12);
        tone('square', lf, lf, m.step * 0.7, m.leadVol, delay);
      }
      if (i % 4 === 0) noise(0.05, musicMode === 'boss' ? 0.05 : 0.03, 6000, 3000, delay);
      musicStep++;
      musicNext += m.step;
    }
  }

  function music(mode, levelIdx) {
    if (!ac) return;
    if (!mode) {
      musicMode = null;
      if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
      return;
    }
    if (mode === musicMode) return;
    musicMode = mode;
    musicRoot = ROOTS[(levelIdx || 0) % ROOTS.length] * (mode === 'boss' ? 1 : 1);
    musicStep = 0;
    musicNext = ac.currentTime + 0.05;
    if (!musicTimer) musicTimer = setInterval(musicTick, 30);
  }

  function setMuted(v) {
    muted = !!v;
    if (master) master.gain.value = muted ? 0 : 0.5;
  }

  root.Sound = { resume, sfx, music, setMuted, isMuted: () => muted };
})(typeof globalThis !== 'undefined' ? globalThis : this);
