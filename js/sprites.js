/*
 * Sprites: todo el arte se genera por código (pixel art), sin imágenes externas.
 *  - Font: fuente de píxeles 3x5 para el HUD del canvas.
 *  - Naves, enemigos y jefes: mapas de caracteres / formas pintadas por código.
 *  - Cada sprite tiene 2 fotogramas (animación) y una versión "flash" blanca.
 */
(function (root) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /* Utilidades                                                          */
  /* ------------------------------------------------------------------ */
  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    return c;
  }

  // PRNG determinista para decoración (mismo aspecto en cada partida).
  function rng(seed) {
    let s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function flashOf(canvas) {
    const f = makeCanvas(canvas.width, canvas.height);
    const x = f.getContext('2d');
    x.drawImage(canvas, 0, 0);
    x.globalCompositeOperation = 'source-in';
    x.fillStyle = '#fff';
    x.fillRect(0, 0, f.width, f.height);
    return f;
  }

  // Añade un contorno oscuro de 1px alrededor de los píxeles opacos.
  function outline(canvas, color) {
    const w = canvas.width, h = canvas.height;
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, w, h).data;
    const solid = (x, y) => x >= 0 && y >= 0 && x < w && y < h && data[(y * w + x) * 4 + 3] > 0;
    ctx.fillStyle = color;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (solid(x, y)) continue;
        if (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)) ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Sprites a partir de mapas de caracteres (mitad izquierda + espejo)  */
  /* ------------------------------------------------------------------ */
  function fromHalf(rows, pal, pal2) {
    const hw = rows[0].length;
    const w = hw * 2 - 1, h = rows.length;
    const frames = [pal, pal2 || pal].map(function (p) {
      const c = makeCanvas(w, h);
      const x = c.getContext('2d');
      rows.forEach(function (row, y) {
        if (row.length !== hw) console.warn('sprite row width mismatch', row);
        const full = row + row.slice(0, -1).split('').reverse().join('');
        for (let i = 0; i < full.length; i++) {
          const k = full[i];
          if (k === '.' || !p[k]) continue;
          x.fillStyle = p[k];
          x.fillRect(i, y, 1, 1);
        }
      });
      return c;
    });
    return { w, h, frames, flash: flashOf(frames[0]) };
  }

  /* ------------------------------------------------------------------ */
  /* Naves del jugador (solo estética)                                   */
  /* o contorno · a casco · b sombra · c acento · w cabina · y motor     */
  /* ------------------------------------------------------------------ */
  const SHIP_DEFS = [
    {
      id: 'falcon', name: 'HALCÓN', desc: 'Caza clásico equilibrado',
      pal: { o: '#0b1030', a: '#e8eef8', b: '#8da2c8', c: '#ff3b3b', w: '#4fd8ff', y: '#ffd23f' },
      rows: [
        '.......c',
        '.......a',
        '......oa',
        '......ab',
        '.....oaw',
        '.....abw',
        '.o...abw',
        '.oa..abb',
        '.oab.oab',
        'oaabooab',
        'oaabbbab',
        'oabbbbab',
        'ocb.obbb',
        'oc..ooab',
        '.....oyy',
        '......oy',
      ],
    },
    {
      id: 'viper', name: 'VÍBORA', desc: 'Ala delta veloz',
      pal: { o: '#07200f', a: '#7dff6b', b: '#2fae45', c: '#fff36b', w: '#c8fff0', y: '#ff7a2f' },
      rows: [
        '.......a',
        '.......a',
        '......ab',
        '......ab',
        '.....oaw',
        '....oabw',
        '...oaabb',
        '..oaabbb',
        '.oaabbbb',
        'oaaabcbb',
        'oaabbccb',
        'oabb.cbb',
        'ob..ooab',
        'o....oyb',
        '......oy',
        '.......y',
      ],
    },
    {
      id: 'phoenix', name: 'FÉNIX', desc: 'Alas de fuego',
      pal: { o: '#2a0707', a: '#ff5a2a', b: '#b8200f', c: '#ffd23f', w: '#fff2b0', y: '#fff2b0' },
      rows: [
        '.......w',
        '......ow',
        '......oa',
        'o.....oa',
        'oc....ab',
        'oac..oab',
        'oaac.oaw',
        'oabaaoaw',
        '.obbbaab',
        '.oabbbab',
        '..ocbbab',
        '...ocbab',
        '....obbb',
        '....ooyb',
        '......oy',
        '.......y',
      ],
    },
    {
      id: 'tempest', name: 'TEMPESTAD', desc: 'Doble casco eléctrico',
      pal: { o: '#150a2e', a: '#b58cff', b: '#6a3fd0', c: '#4fffe0', w: '#e9fbff', y: '#4fffe0' },
      rows: [
        '.......c',
        '.......a',
        '..o....a',
        '.oa...oa',
        '.oa...ow',
        '.ob...ow',
        '.oab..ow',
        '.oab..ab',
        'oaabb.ab',
        'oaabbbab',
        'ocabbbab',
        'oc.obbab',
        'o...ooab',
        '.....oyb',
        '......oy',
        '.......y',
      ],
    },
    {
      id: 'eclipse', name: 'ECLIPSE', desc: 'Sigilo de largo alcance',
      pal: { o: '#000000', a: '#4a5568', b: '#262d3a', c: '#00e5ff', w: '#00e5ff', y: '#00e5ff' },
      rows: [
        '.......c',
        '.......a',
        '......oa',
        '.....oab',
        '....oabw',
        '....oabw',
        '...oaabb',
        '..oaabbb',
        '.oaabccb',
        'oaabbccb',
        'oabbbbbb',
        'ob.obbbb',
        'o...obab',
        '.....oab',
        '......oy',
        '.......y',
      ],
    },
  ];

  /* ------------------------------------------------------------------ */
  /* Enemigos                                                            */
  /* ------------------------------------------------------------------ */
  const ENEMY_DEFS = {
    drone: {
      rows: [
        '....oo',
        '...oww',
        '..oaww',
        '.oaaaa',
        'oabcbc',
        '.oaabb',
        '..ooo.',
      ],
      pal: { o: '#1a0b2e', a: '#9aa6c7', b: '#5a6690', c: '#ff4d6d', w: '#7dffb0' },
      pal2: { o: '#1a0b2e', a: '#9aa6c7', b: '#5a6690', c: '#ffd23f', w: '#7dffb0' },
    },
    scout: {
      rows: [
        'oa...a',
        'oab.ab',
        'oabbab',
        '.oabaw',
        '.oabbw',
        '..oabb',
        '...oab',
        '....oa',
        '.....o',
      ],
      pal: { o: '#0a2a12', a: '#6bff7b', b: '#2a9a3d', w: '#ff4d6d' },
      pal2: { o: '#0a2a12', a: '#6bff7b', b: '#2a9a3d', w: '#ffd23f' },
    },
    zig: {
      rows: [
        'oo..oa',
        'oaoabb',
        'oabbbc',
        '.oabbc',
        '..oabw',
        '...ooa',
        '.....o',
      ],
      pal: { o: '#2e0a1c', a: '#ff7ab8', b: '#c23a80', c: '#ffd23f', w: '#fff' },
      pal2: { o: '#2e0a1c', a: '#ff7ab8', b: '#c23a80', c: '#ff4d6d', w: '#fff' },
    },
    squid: {
      rows: [
        '....oo',
        '..ooaa',
        '.oaabb',
        'oaawbb',
        'oaabbb',
        'oabbbb',
        '.ooaab',
        '.oa.oa',
        'oa..o.',
        'o..oa.',
      ],
      pal: { o: '#1d0a33', a: '#d58cff', b: '#8a3fd0', w: '#ffffff' },
      pal2: { o: '#1d0a33', a: '#d58cff', b: '#8a3fd0', w: '#ffffff' },
      // los tentáculos se animan con un segundo mapa
      rows2: [
        '....oo',
        '..ooaa',
        '.oaabb',
        'oaawbb',
        'oaabbb',
        'oabbbb',
        '.ooaab',
        '.oa.oa',
        '..oao.',
        '.oa..a',
      ],
    },
    cruiser: {
      rows: [
        '........ooo',
        '......ooaaa',
        '.....oabbbb',
        '....oabwwww',
        '..ooaabwwww',
        '.oaaabbbbbb',
        'oaabbbcbcbc',
        'oabbbbbbbbb',
        'oaabbbbbbbb',
        '.oaaabbbbbb',
        '..ooaabbooo',
        '....oabo...',
        '.....ooo...',
      ],
      pal: { o: '#1f0f08', a: '#d9a066', b: '#8a5a2b', c: '#ff4d2f', w: '#5fe0ff' },
      pal2: { o: '#1f0f08', a: '#d9a066', b: '#8a5a2b', c: '#ffd23f', w: '#5fe0ff' },
    },
  };

  function buildEnemy(def) {
    const s = fromHalf(def.rows, def.pal, def.pal2);
    if (def.rows2) {
      const s2 = fromHalf(def.rows2, def.pal2 || def.pal);
      s.frames[1] = s2.frames[0];
    }
    return s;
  }

  // Asteroides generados proceduralmente (3 variantes).
  function buildAsteroid(size, seed) {
    const r = rng(seed);
    const c = makeCanvas(size, size);
    const x = c.getContext('2d');
    const cx = size / 2, cy = size / 2;
    const rad = size / 2 - 1;
    const bumps = [];
    for (let i = 0; i < 12; i++) bumps.push(0.78 + r() * 0.3);
    const radiusAt = (a) => {
      const f = (a / (Math.PI * 2)) * 12;
      const i = Math.floor(f) % 12, j = (i + 1) % 12, t = f - Math.floor(f);
      return rad * (bumps[i] * (1 - t) + bumps[j] * t);
    };
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const dx = px + 0.5 - cx, dy = py + 0.5 - cy;
        let a = Math.atan2(dy, dx); if (a < 0) a += Math.PI * 2;
        if (Math.hypot(dx, dy) > radiusAt(a)) continue;
        const light = (-dx - dy) / (rad * 1.6);
        x.fillStyle = light > 0.25 ? '#b9a98f' : light > -0.15 ? '#8c7d68' : '#5d5245';
        x.fillRect(px, py, 1, 1);
      }
    }
    for (let i = 0; i < 3; i++) { // cráteres
      const px = Math.floor(size * (0.25 + r() * 0.5)), py = Math.floor(size * (0.25 + r() * 0.5));
      x.fillStyle = '#4a4036'; x.fillRect(px, py, 2, 2);
      x.fillStyle = '#a8977d'; x.fillRect(px - 1, py - 1, 1, 1);
    }
    outline(c, '#1b1510');
    return { w: size + 2, h: size + 2, frames: [c, c], flash: flashOf(c), pad: 0 };
  }

  /* ------------------------------------------------------------------ */
  /* Jefes (uno por nivel), pintados por código con simetría             */
  /* ------------------------------------------------------------------ */
  function painter(w, h, fn) {
    const frames = [0, 1].map(function (frame) {
      const c = makeCanvas(w, h);
      const x = c.getContext('2d');
      const P = {
        w, h, frame,
        rect(rx, ry, rw, rh, col, mirror) {
          x.fillStyle = col;
          x.fillRect(rx, ry, rw, rh);
          if (mirror) x.fillRect(w - rx - rw, ry, rw, rh);
        },
        px(rx, ry, col, mirror) { P.rect(rx, ry, 1, 1, col, mirror); },
        ell(cx, cy, rx, ry, col, mirror) {
          const draw = (ccx) => {
            x.fillStyle = col;
            for (let yy = Math.floor(cy - ry); yy <= Math.ceil(cy + ry); yy++) {
              const t = (yy + 0.5 - cy) / ry;
              if (Math.abs(t) > 1) continue;
              const half = rx * Math.sqrt(1 - t * t);
              const x0 = Math.round(ccx - half), x1 = Math.round(ccx + half);
              if (x1 > x0) x.fillRect(x0, yy, x1 - x0, 1);
            }
          };
          draw(cx);
          if (mirror && Math.abs(cx - w / 2) > 0.5) draw(w - cx);
        },
        line(x0, y0, x1, y1, col, mirror) {
          const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
          for (let i = 0; i <= n; i++) {
            const t = n ? i / n : 0;
            P.px(Math.round(x0 + (x1 - x0) * t), Math.round(y0 + (y1 - y0) * t), col, mirror);
          }
        },
      };
      fn(P);
      outline(c, '#0a0612');
      return c;
    });
    return { w, h, frames, flash: flashOf(frames[0]) };
  }

  const BOSS_BUILDERS = [
    // 0 · Nave nodriza (platillo gigante)
    () => painter(58, 38, (P) => {
      P.ell(29, 22, 28, 11, '#3b4468');
      P.ell(29, 19, 26, 9, '#5d6a9c');
      P.ell(24, 16, 17, 4, '#8f9fd6');
      P.ell(29, 11, 12, 10, '#2aa8c8');
      P.ell(29, 10, 10, 8, '#7dffd8');
      P.ell(26, 7, 5, 3, '#d8fff4');
      P.ell(29, 12, 4, 4, '#2f8f3a');           // alienígena en la cúpula
      P.rect(27, 11, 2, 2, '#fff');
      P.rect(30, 11, 2, 2, '#fff');
      P.px(28, 12, '#000'); P.px(31, 12, '#000');
      for (let i = 0; i < 6; i++) {             // luces
        P.rect(6 + i * 4, 22, 2, 2, (i + P.frame) % 2 ? '#ff4d6d' : '#ffd23f', true);
      }
      P.rect(14, 31, 5, 6, '#3b4468', true); P.rect(15, 35, 3, 3, '#ff4d6d', true);
      P.rect(27, 31, 4, 6, '#3b4468'); P.rect(28, 35, 2, 3, '#ffd23f');
    }),
    // 1 · Gólem de roca
    () => painter(58, 46, (P) => {
      P.ell(29, 22, 20, 18, '#5d5245');
      P.ell(27, 19, 17, 15, '#8c7d68');
      P.ell(23, 14, 9, 7, '#b9a98f');
      P.ell(9, 28, 8, 9, '#5d5245', true);      // puños
      P.ell(8, 26, 6, 7, '#8c7d68', true);
      P.ell(12, 14, 7, 6, '#6e6254', true);     // hombros
      const glow = P.frame ? '#ff7a2f' : '#ff3b3b';
      P.rect(20, 15, 5, 4, glow); P.rect(33, 15, 5, 4, glow);
      P.rect(21, 16, 2, 2, '#fff2b0'); P.rect(34, 16, 2, 2, '#fff2b0');
      for (let i = 0; i < 6; i++) P.rect(20 + i * 3, 26 + (i % 2) * 2, 2, 3, '#2b2218'); // boca
      P.line(29, 6, 26, 12, '#ff7a2f'); P.line(26, 12, 28, 18, '#ff7a2f'); // grieta de lava
      P.rect(14, 36, 6, 8, '#5d5245', true);
    }),
    // 2 · Ojo de la nebulosa
    () => painter(58, 50, (P) => {
      for (let i = 0; i < 5; i++) P.line(10 + i * 4, 34, 6 + i * 6 + (P.frame ? 2 : -2), 48, '#8a3fd0', true); // tentáculos
      P.ell(29, 24, 25, 22, '#4a1f8f');
      P.ell(29, 22, 23, 20, '#7a3fd0');
      P.ell(22, 14, 12, 8, '#a97dff');
      P.ell(29, 24, 15, 13, '#fff');             // esclerótica
      P.ell(29, 25, 8, 8, P.frame ? '#ff2d55' : '#ff5a2a');
      P.ell(29, 25, 4, 5, '#12001f');
      P.rect(26, 21, 2, 2, '#fff');
      for (let i = 0; i < 4; i++) P.rect(4 + i * 3, 12 + i * 4, 3, 3, '#ffd23f', true); // espinas
      P.line(18, 18, 22, 22, '#ff7a9a', true); P.line(16, 26, 21, 26, '#ff7a9a', true);
    }),
    // 3 · Reina de la colmena
    () => painter(60, 52, (P) => {
      P.ell(12, 20, 12, 16, P.frame ? '#bffff0' : '#9ae8e0', true); // alas
      P.ell(12, 20, 9, 13, '#e8fffb', true);
      P.ell(30, 12, 10, 10, '#3f8f2a');          // abdomen
      P.ell(30, 10, 8, 7, '#6bd13f');
      for (let i = 0; i < 3; i++) P.rect(24, 5 + i * 5, 13, 2, '#ffd23f');
      P.ell(30, 26, 12, 10, '#2f7a24');          // tórax
      P.ell(28, 24, 9, 7, '#8ef05a');
      P.ell(30, 40, 11, 9, '#3f8f2a');           // cabeza
      P.ell(30, 39, 9, 7, '#6bd13f');
      P.rect(21, 37, 5, 5, '#ff2d55', true); P.rect(22, 38, 2, 2, '#fff', true); // ojos
      P.line(25, 46, 21, 51, '#ffd23f', true); P.line(21, 51, 25, 50, '#ffd23f', true); // mandíbulas
      for (let i = 0; i < 3; i++) P.line(21, 24 + i * 4, 4 - i * 2, 30 + i * 6, '#2f7a24', true); // patas
    }),
    // 4 · Acorazado del núcleo
    () => painter(66, 50, (P) => {
      P.rect(0, 14, 66, 8, '#3a3f4f');           // alas
      P.rect(2, 16, 62, 3, '#6b7390');
      P.rect(4, 22, 12, 14, '#3a3f4f', true);    // torretas laterales
      P.rect(6, 24, 8, 8, '#6b7390', true);
      P.rect(8, 34, 4, 10, '#252a38', true);
      P.rect(9, 40, 2, 6, P.frame ? '#ff7a2f' : '#ffd23f', true); // cañones
      P.ell(33, 24, 18, 20, '#3a3f4f');
      P.ell(33, 22, 16, 18, '#6b7390');
      P.ell(28, 14, 9, 6, '#98a1c4');
      P.ell(33, 26, 10, 10, '#1f2230');          // núcleo
      P.ell(33, 26, 8, 8, P.frame ? '#ff2d55' : '#ff6a3d');
      P.ell(33, 26, 4, 4, '#fff2b0');
      P.rect(31, 6, 4, 8, '#252a38'); P.rect(32, 4, 2, 4, '#ff4d6d');
      for (let i = 0; i < 4; i++) P.rect(10 + i * 3, 8 + (i % 2) * 2, 2, 5, '#ffd23f', true);
    }),
  ];

  /* ------------------------------------------------------------------ */
  /* Fondos / decoración                                                 */
  /* ------------------------------------------------------------------ */
  function buildPlanet(r, c1, c2, c3, ring) {
    const size = r * 2 + (ring ? r : 0) + 2;
    const c = makeCanvas(size, size);
    const x = c.getContext('2d');
    const cx = size / 2, cy = size / 2;
    for (let py = 0; py < size; py++) {
      for (let px = 0; px < size; px++) {
        const dx = px + 0.5 - cx, dy = py + 0.5 - cy;
        if (Math.hypot(dx, dy) > r) continue;
        const l = (-dx * 0.7 - dy * 0.7) / r;
        x.fillStyle = l > 0.35 ? c3 : l > -0.2 ? c2 : c1;
        x.fillRect(px, py, 1, 1);
      }
    }
    if (ring) {
      x.strokeStyle = 'rgba(255,230,180,0.7)';
      x.lineWidth = 2;
      x.beginPath();
      x.ellipse(cx, cy, r * 1.45, r * 0.38, -0.35, 0, Math.PI * 2);
      x.stroke();
    }
    return c;
  }

  function buildCloud(w, h, color, seed, density) {
    const r = rng(seed);
    const c = makeCanvas(w, h);
    const x = c.getContext('2d');
    const cell = 3;
    const blobs = [];
    for (let i = 0; i < 6; i++) blobs.push([r() * w, r() * h, w * (0.12 + r() * 0.2)]);
    for (let py = 0; py < h; py += cell) {
      for (let px = 0; px < w; px += cell) {
        let v = 0;
        for (const b of blobs) v += Math.max(0, 1 - Math.hypot(px - b[0], py - b[1]) / b[2]);
        v *= density;
        if (v > 0.9) x.globalAlpha = 0.55;
        else if (v > 0.55) x.globalAlpha = 0.35;
        else if (v > 0.25 && ((px / cell + py / cell) % 2 === 0)) x.globalAlpha = 0.25; // trama
        else continue;
        x.fillStyle = color;
        x.fillRect(px, py, cell, cell);
      }
    }
    x.globalAlpha = 1;
    return c;
  }

  function buildMetalTile(size, base, line, rivet) {
    const c = makeCanvas(size, size);
    const x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, size, size);
    x.fillStyle = line;
    x.fillRect(0, 0, size, 1); x.fillRect(0, 0, 1, size);
    x.fillRect(size / 2, 0, 1, size / 2); x.fillRect(0, size / 2, size, 1);
    x.fillStyle = rivet;
    [[3, 3], [size - 4, 3], [3, size - 4], [size - 4, size - 4], [size / 2 + 3, size / 2 + 3]].forEach(function (p) { x.fillRect(p[0], p[1], 2, 2); });
    return c;
  }

  function buildHiveTile(size, base, a, b, seed) {
    const r = rng(seed);
    const c = makeCanvas(size, size);
    const x = c.getContext('2d');
    x.fillStyle = base; x.fillRect(0, 0, size, size);
    for (let i = 0; i < 9; i++) {
      const px = Math.floor(r() * size), py = Math.floor(r() * size), rad = 3 + Math.floor(r() * 5);
      for (let yy = -rad; yy <= rad; yy++) for (let xx = -rad; xx <= rad; xx++) {
        const d = Math.hypot(xx, yy);
        if (d > rad) continue;
        x.fillStyle = d > rad - 1.2 ? a : b;
        // se envuelve para que el mosaico sea continuo
        x.fillRect(((px + xx) % size + size) % size, ((py + yy) % size + size) % size, 1, 1);
      }
    }
    return c;
  }

  const LEVEL_BACKDROPS = [
    // 0 · Órbita
    () => ({
      base: '#04061a', star: '#cfe3ff',
      decor: [buildPlanet(26, '#14306b', '#2a63c4', '#6fb4ff', false), buildPlanet(16, '#6b2a14', '#c4632a', '#ffb46f', true), buildPlanet(34, '#0f4a3a', '#1f9a6f', '#7dffc0', false)],
    }),
    // 1 · Asteroides
    () => ({
      base: '#0a0a12', star: '#e9e0cf',
      decor: [buildAsteroid(18, 11), buildAsteroid(26, 23), buildAsteroid(34, 37), buildAsteroid(14, 5)].map(function (a) { return a.frames[0]; }),
      dim: true,
    }),
    // 2 · Nebulosa
    () => ({
      base: '#12031f', star: '#ffd0f0',
      decor: [buildCloud(130, 110, '#ff3d8f', 3, 1.3), buildCloud(120, 120, '#7a3dff', 9, 1.3), buildCloud(140, 100, '#ff7a3d', 14, 1.2)],
    }),
    // 3 · Colmena
    () => ({
      base: '#06160a', star: '#c8ffb0', tile: buildHiveTile(64, '#0b2410', '#2f7a24', '#144a1a', 7),
      decor: [buildCloud(120, 100, '#9ae83f', 21, 1.1)],
    }),
    // 4 · Núcleo del Mothership
    () => ({
      base: '#0d0f16', star: '#ff9a8a', tile: buildMetalTile(48, '#1b1f2c', '#2d3347', '#4a526b'),
      decor: [],
    }),
  ];

  /* ------------------------------------------------------------------ */
  /* Fuente de píxeles 3x5                                               */
  /* ------------------------------------------------------------------ */
  const GLYPHS = {
    A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
    E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
    I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
    M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100',
    Q: '010101101110011', R: '110101110101101', S: '011100010001110', T: '111010010010010',
    U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
    Y: '101101010010010', Z: '111001010100111',
    0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
    4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010',
    8: '111101111101111', 9: '111101111001110',
    ':': '000010000010000', '.': '000000000000010', '-': '000000111000000', '!': '010010010000010',
    '/': '001001010100100', '+': '000010111010000', '?': '110001010000010', ',': '000000000010100',
    '^': '010111111000000', '>': '100010001010100', '<': '001010100010001', ' ': '000000000000000',
    '%': '101001010100101', "'": '010010000000000', '*': '101010111010101',
  };

  function plain(str) {
    return String(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  }

  function textWidth(str, scale) { return plain(str).length * 4 * (scale || 1) - (scale || 1); }

  function drawText(ctx, str, x, y, color, scale, align) {
    scale = scale || 1;
    const s = plain(str);
    let cx = x;
    if (align === 'center') cx = Math.round(x - textWidth(str, scale) / 2);
    else if (align === 'right') cx = Math.round(x - textWidth(str, scale));
    ctx.fillStyle = color;
    for (let i = 0; i < s.length; i++) {
      const g = GLYPHS[s[i]] || GLYPHS['?'];
      for (let k = 0; k < 15; k++) {
        if (g[k] === '1') ctx.fillRect(cx + (k % 3) * scale, y + Math.floor(k / 3) * scale, scale, scale);
      }
      cx += 4 * scale;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Pequeños iconos                                                     */
  /* ------------------------------------------------------------------ */
  function icon(rows, pal) {
    const w = rows[0].length, h = rows.length;
    const c = makeCanvas(w, h);
    const x = c.getContext('2d');
    rows.forEach(function (row, yy) {
      for (let xx = 0; xx < w; xx++) {
        if (pal[row[xx]]) { x.fillStyle = pal[row[xx]]; x.fillRect(xx, yy, 1, 1); }
      }
    });
    return c;
  }

  function build() {
    const S = {};
    S.ships = SHIP_DEFS.map(function (d) {
      const s = fromHalf(d.rows, d.pal);
      s.id = d.id; s.name = d.name; s.desc = d.desc; s.pal = d.pal;
      return s;
    });
    S.enemies = {};
    Object.keys(ENEMY_DEFS).forEach(function (k) { S.enemies[k] = buildEnemy(ENEMY_DEFS[k]); });
    S.enemies.asteroids = [buildAsteroid(11, 101), buildAsteroid(13, 202), buildAsteroid(15, 303)];
    S.enemies.ufo = painter(25, 14, (P) => {
      P.ell(12.5, 9, 12, 4.5, '#2a3f8f');
      P.ell(12.5, 8, 11, 3.5, '#4f6fd8');
      P.ell(12.5, 5, 6, 5, '#5fe0ff');
      P.ell(11, 3.5, 3, 2, '#e8ffff');
      for (let i = 0; i < 4; i++) P.rect(3 + i * 3, 9, 2, 2, (i + P.frame) % 2 ? '#ff4d6d' : '#ffd23f', true);
      P.rect(11, 12, 3, 2, '#ffd23f');
    });
    S.bosses = BOSS_BUILDERS.map(function (b) { return b(); });
    S.backdrops = LEVEL_BACKDROPS.map(function (b) { return b(); });
    S.heart = icon(['.oo.oo.', 'orroarro', 'orrrrro', 'orrrrro', '.orrro.', '..orro.', '...o...'].map(function (r) { return r.slice(0, 7); }), { o: '#3a0612', r: '#ff3b5c', a: '#ff9aab' });
    S.heartEmpty = icon(['.oo.oo.', 'o..o..o', 'o.....o', 'o.....o', '.o...o.', '..o.o..', '...o...'], { o: '#4a3a52' });
    S.bomb = icon(['..yy...', '.yo....', '..ooo..', '.obbbo.', 'obwbbbo', 'obbbbbo', '.obbbo.', '..ooo..'], { o: '#0a0a1a', b: '#ffb12f', w: '#fff2b0', y: '#ff7a2f' });
    return S;
  }

  root.Sprites = {
    build, drawText, textWidth, plain, rng, makeCanvas, SHIP_DEFS,
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
