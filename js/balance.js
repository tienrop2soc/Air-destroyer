/*
 * Balance: todas las cifras de dificultad / poder del juego en un solo sitio.
 *
 * Regla de diseño: cada vez que se destruye un jefe sube el "rango" (tier).
 *  - El arma del jugador mejora (nivel de arma, daño, cadencia, velocidad).
 *  - La vida de los enemigos crece al ritmo del poder de fuego del jugador,
 *    dividida por PLAYER_EDGE: la nave siempre queda LEVEMENTE por encima.
 *  - Además los enemigos se vuelven más agresivos (más apariciones, disparan
 *    más, balas más rápidas) para que el juego siga aumentando de dificultad.
 */
(function (root) {
  'use strict';

  const BOSS_INTERVAL = 300;      // segundos entre jefes (5 minutos)
  const PLAYER_EDGE = 1.08;       // el jugador es ~8 % superior en daño efectivo
  const MAX_WEAPON = 9;
  const MAX_POWER = 3;            // mejoras "P" que se pueden acumular en una partida

  // Multiplicador de daño EFECTIVO por nivel de arma (las balas en abanico no
  // impactan todas, por eso crece con rendimientos decrecientes).
  const WEAPON_EFF = [0, 1, 1.7, 2.3, 2.8, 3.2, 3.6, 4.0, 4.3, 4.6];

  function weaponLevel(tier, power) {
    return Math.min(MAX_WEAPON, 1 + tier + (power || 0));
  }

  function playerStats(tier, power) {
    const level = weaponLevel(tier, power);
    return {
      level,
      damage: 1 + 0.12 * tier,
      interval: 0.15 / (1 + 0.05 * tier),
      bulletSpeed: 270 + 10 * Math.min(tier, 10),
      maxHp: Math.min(10, 5 + Math.floor(tier / 2)),
    };
  }

  // Daño por segundo efectivo del arma base de un rango (sin mejoras P).
  function playerPower(tier) {
    const s = playerStats(tier, 0);
    return WEAPON_EFF[s.level] * s.damage / s.interval;
  }

  // Cuánto multiplicar la vida de enemigos y jefes.
  function hpScale(tier) {
    return playerPower(tier) / playerPower(0) / PLAYER_EDGE;
  }

  function enemyScale(tier, diff) {
    const aggr = diff * (1 + 0.07 * tier);
    return {
      hp: hpScale(tier),
      aggr,
      speed: Math.min(1.6, 1 + 0.30 * (aggr - 1)),
      bulletSpeed: Math.min(1.55, 1 + 0.25 * (aggr - 1)),
      fire: Math.min(2.3, aggr),
      spawn: Math.min(2.6, aggr),
      extraBullets: Math.floor(tier / 3),
    };
  }

  const BOSS_BASE_HP = 300;
  function bossHp(tier) {
    return Math.round(BOSS_BASE_HP * hpScale(tier));
  }

  const api = {
    BOSS_INTERVAL, PLAYER_EDGE, MAX_WEAPON, MAX_POWER, WEAPON_EFF,
    weaponLevel, playerStats, playerPower, hpScale, enemyScale, bossHp,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Balance = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
