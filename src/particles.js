/**
 * Particle Systems Module for Grave Escape 3D.
 * Manages spawning and updating of 3D blood splatters, sparks, and damage text indicators.
 */

import { particles } from './map.js';
import { Player } from './main.js';

export function spawnBlood(x, y, count = 8) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x,
      y: y,
      z: 0.1 + Math.random() * 0.3,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      vz: (Math.random() * 2),
      color: (Math.random() > 0.3) ? '#900' : '#d00',
      size: 0.04 + Math.random() * 0.04,
      life: 0.4 + Math.random() * 0.4
    });
  }
}

export function spawnSpark(x, y, count = 6, color = '#ffd700') {
  let speedMult = 1.0;
  if (Player.upgrades && Player.upgrades.bouncy > 0) {
    count += 5 * Player.upgrades.bouncy;
    speedMult += 0.30 * Player.upgrades.bouncy;
  }
  for (let i = 0; i < count; i++) {
    particles.push({
      x: x,
      y: y,
      z: 0.1 + Math.random() * 0.3,
      vx: (Math.random() - 0.5) * 3 * speedMult,
      vy: (Math.random() - 0.5) * 3 * speedMult,
      vz: (Math.random() * 3) * speedMult,
      color: color,
      size: 0.02 + Math.random() * 0.03,
      life: 0.2 + Math.random() * 0.2
    });
  }
}

export function spawnDamageText(x, y, amount, isCrit = false) {
  particles.push({
    x: x,
    y: y,
    z: 0.2 + Math.random() * 0.1, // float slightly above enemy base
    vx: (Math.random() - 0.5) * 0.5,
    vy: (Math.random() - 0.5) * 0.5,
    vz: 0.8, // upward float speed
    color: isCrit ? '#ff3333' : '#ffd700',
    text: isCrit ? 'CRIT!' : `-${amount}`,
    size: 0.05,
    life: 0.75
  });
}

export function handleParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.vz -= 9.8 * dt; // gravity

    p.life -= dt;
    if (p.life <= 0 || p.z < 0) {
      particles.splice(i, 1);
    }
  }
}
