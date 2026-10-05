/*
 * PWA: registro del service worker y botón "Instalar app".
 */
(function () {
  'use strict';

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () { /* sin SW: sigue funcionando online */ });
    });
  }

  // Pide al sistema que no borre los datos del juego (progreso) si falta espacio.
  if (navigator.storage && navigator.storage.persist) {
    const ask = function () { navigator.storage.persist().catch(function () {}); };
    window.addEventListener('pointerup', ask, { once: true });
  }

  const btn = document.getElementById('btnInstall');
  const hint = document.getElementById('installHint');
  if (!btn) return;

  const standalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches || navigator.standalone;
  if (standalone) return;                       // ya está instalada

  let deferred = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferred = e;
    btn.classList.remove('hidden');
  });
  btn.addEventListener('click', function () {
    if (!deferred) return;
    deferred.prompt();
    deferred.userChoice.finally(function () { deferred = null; btn.classList.add('hidden'); });
  });
  window.addEventListener('appinstalled', function () { btn.classList.add('hidden'); hint.classList.add('hidden'); });

  // iOS/Safari no tiene botón de instalación: se explica el gesto.
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios && hint) hint.classList.remove('hidden');
})();
