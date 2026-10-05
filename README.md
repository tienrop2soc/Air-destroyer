# AIR DESTROYER

Juego de naves retro con vista cenital (shoot'em up vertical) hecho con HTML5 Canvas y JavaScript puro.
Sin dependencias ni imágenes: todo el arte (pixel art) y el sonido (chiptune) se generan por código.

## Cómo jugar

Abre `index.html` en el navegador (o sirve la carpeta con cualquier servidor estático, p. ej. `npx http-server`).

| Acción | Teclado | Táctil / ratón |
| --- | --- | --- |
| Mover | Flechas / WASD | Arrastrar un dedo en cualquier punto de la pantalla (toda la pantalla es el mando) |
| Disparar | Automático | Automático |
| Bomba | Espacio / B / X | Botón BOMBA |
| Pausa | P / Esc | Botón II |
| Sonido | M | Botón ♪ |

## Instalar como app (PWA)

Es una app web instalable que funciona sin conexión y a pantalla completa.
Hay que servirla por HTTPS (por ejemplo con GitHub Pages, ver abajo) y abrirla en el móvil:

- **Android / Chrome:** botón *INSTALAR APP* del menú, o menú ⋮ → *Instalar aplicación*.
- **iPad / iPhone (Safari):** *Compartir* (cuadrado con flecha) → *Añadir a pantalla de inicio*. Se abre a pantalla completa, en vertical u horizontal, y funciona sin conexión. Nota: la app instalada guarda el progreso por separado del que tengas en la pestaña de Safari.
- **PC (Chrome/Edge):** icono de instalar en la barra de direcciones.

**Publicar con GitHub Pages:** en el repositorio, *Settings → Pages → Source: GitHub Actions*.
El workflow `.github/workflows/pages.yml` publica el juego en cada push.
Al cambiar archivos, sube `VERSION` en `sw.js` para que las apps instaladas se actualicen.

## Pantallas anchas (iPad horizontal)

El campo de juego se ensancha para ocupar toda la pantalla (hasta 560 píxeles lógicos de ancho) y la
frecuencia de enemigos se ajusta al ancho. En vertical (iPhone) no cambia. El ancho solo se recalcula
al empezar un nivel o en el menú, no a mitad de partida.

## Dónde se guarda el progreso

Todo queda en tu dispositivo: la app instalada guarda los archivos del juego (modo sin conexión) y el progreso en el almacenamiento del navegador. No se envía a ningún servidor.
Desde el menú, **COPIA DE SEGURIDAD** permite copiar o guardar el progreso como texto/archivo y restaurarlo (por ejemplo si borras los datos del navegador o cambias de dispositivo).

## Qué incluye

- **5 naves** a elegir (solo estética): Halcón, Víbora, Fénix, Tempestad y Eclipse.
- **5 niveles** con fondo, enemigos y jefe propios. Se desbloquean al derrotar al jefe del nivel anterior.
- **Cada nivel dura 5 minutos exactos y termina con su jefe** (aviso con alarma, a hora fija, no aleatorio). Al derrotarlo se completa el nivel, la partida termina y vuelves al menú principal con el resultado y el siguiente nivel ya seleccionado.
- **Enemigos aleatorios**: drones, exploradores, zigzag, ovnis, calamares alienígenas, cruceros y asteroides, en filas, hileras y formaciones en V.
- **Jefes** con 3 fases de ataque y mucha más vida que un enemigo normal.
- **Cada jefe destruido sube el rango**: el siguiente nivel empieza con mejores armas (más disparos, daño, cadencia, misiles teledirigidos) y con enemigos y jefes más duros (más vida, más apariciones, balas más rápidas). La nave está calibrada para ser **levemente superior** (~8 %), ver `js/balance.js`.
- **Ajustes** (menú y pausa): volumen de efectos, volumen de música, sonido sí/no y sensibilidad del control (50–200 %). Se guardan con el progreso.
- **Mejoras**: P (arma), H (reparación), S (escudo), B (bomba).
- **Progreso guardado** en `localStorage`: nave elegida, niveles desbloqueados, récord por nivel, rango de entrada de cada nivel y estadísticas totales.

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
