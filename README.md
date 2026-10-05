# AIR DESTROYER

Juego de naves retro con vista cenital (shoot'em up vertical) hecho con HTML5 Canvas y JavaScript puro.
Sin dependencias ni imágenes: todo el arte (pixel art) y el sonido (chiptune) se generan por código.

## Cómo jugar

Abre `index.html` en el navegador (o sirve la carpeta con cualquier servidor estático, p. ej. `npx http-server`).

| Acción | Teclado | Táctil / ratón |
| --- | --- | --- |
| Mover | Flechas / WASD | Arrastrar sobre el juego |
| Disparar | Automático | Automático |
| Bomba | Espacio / B / X | Botón BOMBA |
| Pausa | P / Esc | Botón II |
| Sonido | M | Botón ♪ |

## Instalar como app (PWA)

Es una app web instalable que funciona sin conexión y a pantalla completa.
Hay que servirla por HTTPS (por ejemplo con GitHub Pages, ver abajo) y abrirla en el móvil:

- **Android / Chrome:** botón *INSTALAR APP* del menú, o menú ⋮ → *Instalar aplicación*.
- **iPhone / Safari:** *Compartir* → *Añadir a pantalla de inicio*.
- **PC (Chrome/Edge):** icono de instalar en la barra de direcciones.

**Publicar con GitHub Pages:** en el repositorio, *Settings → Pages → Source: GitHub Actions*.
El workflow `.github/workflows/pages.yml` publica el juego en cada push.
Al cambiar archivos, sube `VERSION` en `sw.js` para que las apps instaladas se actualicen.

## Qué incluye

- **5 naves** a elegir (solo estética): Halcón, Víbora, Fénix, Tempestad y Eclipse.
- **5 niveles** con fondo, enemigos y jefe propios. Se desbloquean al derrotar al jefe del nivel anterior.
- **Enemigos aleatorios**: drones, exploradores, zigzag, ovnis, calamares alienígenas, cruceros y asteroides, en filas, hileras y formaciones en V.
- **Un jefe cada 5 minutos** (avisa con una alarma) con 3 fases de ataque. Tiene mucha más vida que un enemigo normal.
- **Cada jefe destruido sube el rango**: mejora el arma (más disparos, daño, cadencia, misiles teledirigidos) y también la dificultad (más vida, más enemigos, balas más rápidas). La nave está calibrada para ser **levemente superior** (~8 %), ver `js/balance.js`.
- **Mejoras**: P (arma), H (reparación), S (escudo), B (bomba).
- **Progreso guardado** en `localStorage`: nave elegida, niveles desbloqueados, récord por nivel, rango alcanzado (puedes *continuar* desde él o empezar de cero) y estadísticas totales.

## Estructura

```
index.html        pantalla, menús (DOM) y canvas
manifest.webmanifest, sw.js, icons/, js/pwa.js   app instalable y modo sin conexión
css/style.css     estilo retro de menús y botones
js/balance.js     fórmulas de dificultad y poder del jugador
js/sprites.js     pixel art generado por código + fuente de píxeles
js/audio.js       efectos y música con WebAudio
js/game.js        lógica del juego, jefes, guardado e interfaz
```

## Parámetros de prueba (URL)

- `?boss=15` el jefe aparece a los 15 s en vez de a los 5 min.
- `?tier=3` empieza con el rango indicado.
- `?god=1` jugador invulnerable.
