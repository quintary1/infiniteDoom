/**
 * Main Controller Module for Grave Escape 3D.
 * Integrates sound, textures, procedural map generation, raycasting rendering,
 * rogue updates drafting, and local/global leaderboards.
 * Supports keys/doors logic, enemy types, and floating damage numbers.
 */

import { SoundEngine } from './audio.js';
import { generateTextures } from './textures.js';
import { 
  generateFloor, 
  checkCollisions, 
  sprites, 
  particles, 
  map, 
  visitedMap, 
  MapWidth, 
  MapHeight 
} from './map.js';
import { initRaycaster, render3D } from './raycaster.js';
import { initPortrait, renderPortrait } from './portrait.js';
import { UPGRADE_POOL, triggerUpgradeDraft, renderActiveUpgradesList } from './upgrades.js';
import { 
  getLocalScores, 
  saveLocalScore, 
  checkLocalHighScore, 
  fetchGlobalScores, 
  submitGlobalScore 
} from './leaderboard.js';

// Debug Cheats State
export const DebugCheats = {
  godMode: false,
  noclip: false
};

// Player Object
export const Player = {
  x: 3.5,
  y: 3.5,
  dirX: 1,
  dirY: 0,
  planeX: 0,
  planeY: 0.66,
  health: 100,
  maxHealth: 100,
  ammo: 80,
  maxAmmo: 150,
  shield: 0,
  maxShield: 0,
  score: 0,
  floor: 1,
  currentWeapon: 0, // 0: Pistol, 1: Shotgun, 2: Minigun
  isShooting: false,
  shootFrame: 0,
  shootCooldown: 0,
  kills: 0,
  maxKills: 0,
  treasures: 0,
  upgrades: {},
  adrenalineTimer: 0,
  killsForSoulFeast: 0,
  hasRedKey: false,
  hasBlueKey: false,

  reset() {
    this.health = 100;
    this.maxHealth = 100;
    this.ammo = 80;
    this.maxAmmo = 150;
    this.shield = 0;
    this.maxShield = 0;
    this.score = 0;
    this.floor = 1;
    this.currentWeapon = 0;
    this.isShooting = false;
    this.shootFrame = 0;
    this.shootCooldown = 0;
    this.kills = 0;
    this.maxKills = 0;
    this.treasures = 0;
    this.upgrades = {};
    this.adrenalineTimer = 0;
    this.killsForSoulFeast = 0;
    this.hasRedKey = false;
    this.hasBlueKey = false;
    UPGRADE_POOL.forEach(up => { this.upgrades[up.id] = 0; });
  }
};

// Weapon Profiles
export const Weapons = [
  { name: 'Pistol', damage: 35, ammoCost: 1, cooldown: 350, sfx: 'shoot_pistol', scale: 0.5 },
  { name: 'Shotgun', damage: 100, ammoCost: 2, cooldown: 850, sfx: 'shoot_shotgun', scale: 0.6 },
  { name: 'Minigun', damage: 25, ammoCost: 1, cooldown: 120, sfx: 'shoot_minigun', scale: 0.7 }
];

// Keyboard handlers
export const keys = { w: false, a: false, s: false, d: false, q: false, e: false, space: false };

// Mouse sensitivity & Game states
let mouseSensitivity = 0.0025;
let activeScreen = 'start';
let lastTime = 0;
let canvas = null;

// HUD warning flash banner states
let hudFlashText = "";
let hudFlashTimer = 0;

export function showHudFlashMessage(text) {
  hudFlashText = text;
  hudFlashTimer = 2.0; // 2 seconds duration
}

// =========================================================================
// PARTICLE SYSTEMS SPAWNERS
// =========================================================================
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

// =========================================================================
// LEVEL TRANSITIONS & COMBAT TRIGGERS
// =========================================================================
function triggerEnemyDeath(enemy) {
  enemy.state = 'dead';
  enemy.solid = false;
  Player.kills++;
  Player.score += Math.floor(250 * (1 + 0.20 * (Player.upgrades.magnet || 0)));
  SoundEngine.play('enemy_die');

  if (Player.upgrades.adrenaline > 0) {
    Player.adrenalineTimer = 3.0; // 3 seconds speed boost
  }

  if (Player.upgrades.soul_feast > 0) {
    Player.killsForSoulFeast++;
    if (Player.killsForSoulFeast >= 5) {
      Player.maxHealth += 2 * Player.upgrades.soul_feast;
      Player.health = Math.min(Player.maxHealth, Player.health + 2 * Player.upgrades.soul_feast);
      Player.killsForSoulFeast = 0;
      spawnSpark(Player.x, Player.y, 6, '#e0a6ff'); // Soul aura flash
    }
  }

  if (Player.upgrades.toxic_blood > 0) {
    sprites.forEach(s => {
      if (s.type === 'enemy' && s !== enemy && s.state !== 'dead') {
        const edx = s.x - enemy.x;
        const edy = s.y - enemy.y;
        const edist = Math.sqrt(edx*edx + edy*edy);
        if (edist < 2.5) {
          s.health -= 15 * Player.upgrades.toxic_blood;
          s.state = 'hurt';
          spawnBlood(s.x, s.y, 6);
          if (s.health <= 0) {
            triggerEnemyDeath(s);
          }
        }
      }
    });
    spawnSpark(enemy.x, enemy.y, 10, '#33ff33');
  }

  if (Math.random() < 0.45 + 0.15 * (Player.upgrades.lucky || 0)) {
    sprites.push({
      type: Math.random() < 0.65 ? 'ammo' : 'medkit',
      x: enemy.x,
      y: enemy.y,
      texture: Math.random() < 0.65 ? 6 : 5,
      value: Math.random() < 0.65 ? 20 : 25
    });
  }
}

function handleShoot() {
  if (Player.shootCooldown > 0 || Player.ammo <= 0) {
    if (Player.ammo <= 0 && Player.shootCooldown <= 0) {
      SoundEngine.play('click');
      Player.shootCooldown = 400; // anti-spam empty clicking sfx
    }
    return;
  }

  const activeWeap = Weapons[Player.currentWeapon];
  
  let useAmmo = true;
  if (Math.random() < 0.05 * (Player.upgrades.overcharge || 0)) {
    useAmmo = false;
    spawnSpark(Player.x, Player.y, 3, '#33ff33');
  }

  if (useAmmo) {
    Player.ammo = Math.max(0, Player.ammo - activeWeap.ammoCost);
  }

  Player.isShooting = true;
  Player.shootFrame = 1;
  Player.shootCooldown = activeWeap.cooldown * Math.pow(0.92, Player.upgrades.double_tap || 0);

  SoundEngine.play(activeWeap.sfx);

  const kickFactor = Math.pow(0.7, Player.upgrades.brake || 0);
  flashScreen('damage-flash', 'rgba(255,255,255,0.15)', 80);
  
  if (kickFactor > 0.1) {
    document.getElementById('screen-container').classList.add('shake');
    setTimeout(() => {
      document.getElementById('screen-container').classList.remove('shake');
    }, 100 * kickFactor);
  }

  const playerAngle = Math.atan2(Player.dirY, Player.dirX);

  if (Player.currentWeapon === 1) {
    // SHOTGUN MULTI-PELLET
    const numPellets = 5 + (Player.upgrades.surgical || 0);
    const pelletBaseDmg = 20;
    let pelletHitEnemyCount = 0;
    
    for (let p = 0; p < numPellets; p++) {
      const angleOffset = (Math.random() - 0.5) * 0.32;
      const rayDirX = Math.cos(playerAngle + angleOffset);
      const rayDirY = Math.sin(playerAngle + angleOffset);
      
      let nearestTarget = null;
      let minTargetDist = Infinity;
      
      sprites.forEach(sprite => {
        if (sprite.type !== 'enemy' || sprite.state === 'dead') return;
        
        const dx = sprite.x - Player.x;
        const dy = sprite.y - Player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        const angleToSprite = Math.atan2(dy, dx);
        let angleDiff = angleToSprite - (playerAngle + angleOffset);
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        
        const hitThreshold = 0.08;
        
        if (Math.abs(angleDiff) < hitThreshold && dist < minTargetDist) {
          let isBlocked = false;
          const steps = Math.floor(dist * 5);
          for (let i = 1; i < steps; i++) {
            const checkX = Math.floor(Player.x + (dx * i / steps));
            const checkY = Math.floor(Player.y + (dy * i / steps));
            if (map[checkY] && map[checkY][checkX] > 0) {
              isBlocked = true;
              break;
            }
          }
          if (!isBlocked) {
            minTargetDist = dist;
            nearestTarget = sprite;
          }
        }
      });
      
      if (nearestTarget) {
        pelletHitEnemyCount++;
        let dmg = pelletBaseDmg * (1 + 0.15 * (Player.upgrades.lead_pour || 0));
        
        if (Player.upgrades.surgical > 0 && minTargetDist < 3.0) {
          dmg += 3 * Player.upgrades.surgical;
        }
        
        let isCrit = Math.random() < 0.10 * (Player.upgrades.hollow_point || 0);
        if (isCrit) {
          dmg *= 2;
          spawnSpark(nearestTarget.x, nearestTarget.y, 4, '#ff3333');
        }
        
        const finalDmg = Math.floor(dmg);
        nearestTarget.health -= finalDmg;
        nearestTarget.state = 'hurt';
        spawnBlood(nearestTarget.x, nearestTarget.y, 3);
        spawnDamageText(nearestTarget.x, nearestTarget.y, finalDmg, isCrit);
        
        if (Player.upgrades.spitfire > 0) {
          nearestTarget.fireTicks = 3;
          nearestTarget.fireDps = 6 * Player.upgrades.spitfire;
        }
        
        if (Player.upgrades.poison > 0) {
          nearestTarget.poisonTicks = 3;
          nearestTarget.poisonDps = 5 * Player.upgrades.poison;
        }
        
        if (Player.upgrades.knockback > 0) {
          const force = 0.12 * Player.upgrades.knockback;
          const pushX = (nearestTarget.x - Player.x) / minTargetDist * force;
          const pushY = (nearestTarget.y - Player.y) / minTargetDist * force;
          const newX = nearestTarget.x + pushX;
          const newY = nearestTarget.y + pushY;
          if (map[Math.floor(newY)] && map[Math.floor(newY)][Math.floor(newX)] === 0) {
            nearestTarget.x = newX;
            nearestTarget.y = newY;
          }
        }
        
        if (nearestTarget.health <= 0) {
          triggerEnemyDeath(nearestTarget);
        }
      } else {
        // Wall hit sparks
        let dist = 1.0;
        while (dist < 16.0) {
          let testX = Math.floor(Player.x + rayDirX * dist);
          let testY = Math.floor(Player.y + rayDirY * dist);
          if (map[testY] && map[testY][testX] > 0) {
            spawnSpark(Player.x + rayDirX * dist, Player.y + rayDirY * dist, 2, '#ffd700');
            break;
          }
          dist += 0.25;
        }
      }
    }
    
    if (Math.random() < 0.05 * (Player.upgrades.vampire || 0)) {
      Player.health = Math.min(Player.maxHealth, Player.health + 2 * (Player.upgrades.vampire || 0));
      flashScreen('pickup-flash', 'rgba(0, 255, 0, 0.2)', 100);
    }
    
    if (pelletHitEnemyCount > 0) {
      SoundEngine.play('hurt');
    }
  } else {
    // PISTOL & MINIGUN
    let nearestTarget = null;
    let minTargetDist = Infinity;
    
    let maxRange = 16.0;
    if (Player.currentWeapon === 0) { // Pistol
      maxRange = 6.0 + 3.0 * (Player.upgrades.surgical || 0);
    }
    
    sprites.forEach(sprite => {
      if (sprite.type !== 'enemy' || sprite.state === 'dead') return;
      
      const dx = sprite.x - Player.x;
      const dy = sprite.y - Player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > maxRange) return;
      
      const angleToSprite = Math.atan2(dy, dx);
      let angleDiff = angleToSprite - playerAngle;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      
      let hitThreshold = 0.12;
      if (Player.upgrades.surgical > 0 && Player.currentWeapon === 0) {
        hitThreshold += 0.05 * Player.upgrades.surgical;
      }
      
      if (Math.abs(angleDiff) < hitThreshold && dist < minTargetDist) {
        let isBlocked = false;
        const steps = Math.floor(dist * 5);
        for (let i = 1; i < steps; i++) {
          const checkX = Math.floor(Player.x + (dx * i / steps));
          const checkY = Math.floor(Player.y + (dy * i / steps));
          if (map[checkY] && map[checkY][checkX] > 0) {
            isBlocked = true;
            break;
          }
        }
        if (!isBlocked) {
          minTargetDist = dist;
          nearestTarget = sprite;
        }
      }
    });
    
    if (nearestTarget) {
      let dmg = activeWeap.damage * (1 + 0.15 * (Player.upgrades.lead_pour || 0));
      
      if (Player.upgrades.surgical > 0 && Player.currentWeapon === 0 && minTargetDist < 3.0) {
        dmg += 15 * Player.upgrades.surgical;
      }
      
      let isCrit = Math.random() < 0.10 * (Player.upgrades.hollow_point || 0);
      if (isCrit) {
        dmg *= 2;
        spawnSpark(nearestTarget.x, nearestTarget.y, 8, '#ff3333');
      }
      
      const finalDmg = Math.floor(dmg);
      nearestTarget.health -= finalDmg;
      nearestTarget.state = 'hurt';
      spawnBlood(nearestTarget.x, nearestTarget.y, 10);
      spawnDamageText(nearestTarget.x, nearestTarget.y, finalDmg, isCrit);
      SoundEngine.play('hurt');
      
      if (Math.random() < 0.05 * (Player.upgrades.vampire || 0)) {
        Player.health = Math.min(Player.maxHealth, Player.health + 2 * (Player.upgrades.vampire || 0));
        flashScreen('pickup-flash', 'rgba(0, 255, 0, 0.2)', 100);
      }
      
      if (Player.upgrades.spitfire > 0) {
        nearestTarget.fireTicks = 3;
        nearestTarget.fireDps = 6 * Player.upgrades.spitfire;
      }
      
      if (Player.upgrades.poison > 0) {
        nearestTarget.poisonTicks = 3;
        nearestTarget.poisonDps = 5 * Player.upgrades.poison;
      }
      
      if (Player.upgrades.knockback > 0) {
        const force = 0.3 * Player.upgrades.knockback;
        const pushX = (nearestTarget.x - Player.x) / minTargetDist * force;
        const pushY = (nearestTarget.y - Player.y) / minTargetDist * force;
        const newX = nearestTarget.x + pushX;
        const newY = nearestTarget.y + pushY;
        if (map[Math.floor(newY)] && map[Math.floor(newY)][Math.floor(newX)] === 0) {
          nearestTarget.x = newX;
          nearestTarget.y = newY;
        }
      }
      
      if (nearestTarget.health <= 0) {
        triggerEnemyDeath(nearestTarget);
      }
    } else {
      const rayDirX = Player.dirX;
      const rayDirY = Player.dirY;
      let dist = 1.0;
      const maxTraceDist = Math.min(maxRange, 16.0);
      while (dist < maxTraceDist) {
        let testX = Math.floor(Player.x + rayDirX * dist);
        let testY = Math.floor(Player.y + rayDirY * dist);
        if (map[testY] && map[testY][testX] > 0) {
          spawnSpark(Player.x + rayDirX * dist, Player.y + rayDirY * dist, 6, '#ffd700');
          break;
        }
        dist += 0.25;
      }
    }
  }
}

function handleEnemyAI(dt) {
  sprites.forEach(sprite => {
    if (sprite.type !== 'enemy' || sprite.state === 'dead') return;

    const dx = Player.x - sprite.x;
    const dy = Player.y - sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    sprite.animTimer += dt;
    if (sprite.animTimer > 0.25) {
      sprite.animFrame = (sprite.animFrame === 0) ? 1 : 0;
      sprite.animTimer = 0;
    }

    if (sprite.shootCooldown > 0) {
      sprite.shootCooldown -= dt * 1000;
    }

    // Poison DoT ticks
    if (sprite.poisonTicks > 0) {
      if (!sprite.poisonTimer) sprite.poisonTimer = 0;
      sprite.poisonTimer += dt;
      if (sprite.poisonTimer >= 1.0) {
        sprite.health -= sprite.poisonDps;
        sprite.poisonTicks--;
        sprite.poisonTimer = 0;
        spawnBlood(sprite.x, sprite.y, 3);
        spawnDamageText(sprite.x, sprite.y, sprite.poisonDps, false);
        if (sprite.health <= 0) {
          triggerEnemyDeath(sprite);
          return;
        }
      }
    }

    // Fire DoT ticks
    if (sprite.fireTicks > 0) {
      if (!sprite.fireTimer) sprite.fireTimer = 0;
      sprite.fireTimer += dt;
      if (sprite.fireTimer >= 1.0) {
        sprite.health -= sprite.fireDps;
        sprite.fireTicks--;
        sprite.fireTimer = 0;
        spawnSpark(sprite.x, sprite.y, 4, '#ff9900');
        spawnDamageText(sprite.x, sprite.y, sprite.fireDps, false);
        if (sprite.health <= 0) {
          triggerEnemyDeath(sprite);
          return;
        }
      }
    }

    if (sprite.state === 'hurt') {
      if (Math.random() < dt * 5) {
        sprite.state = 'chase';
      }
      return;
    }

    if (sprite.state === 'idle') {
      if (dist < 10.0) {
        let blocked = false;
        const steps = Math.floor(dist * 4);
        for (let i = 1; i < steps; i++) {
          const cx = Math.floor(sprite.x + (dx * i / steps));
          const cy = Math.floor(sprite.y + (dy * i / steps));
          if (map[cy] && map[cy][cx] > 0) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          sprite.state = 'chase';
          SoundEngine.play('enemy_alert');
        }
      }
    } else if (sprite.state === 'chase') {
      if (dist > (sprite.subtype === 'ghoul' ? 0.7 : 2.5)) {
        const step = sprite.speed * dt;
        const moveX = sprite.x + (dx / dist) * step;
        const moveY = sprite.y + (dy / dist) * step;
        
        const cellX = Math.floor(moveX);
        const cellY = Math.floor(moveY);
        if (map[cellY] && map[cellY][cellX] === 0) {
          sprite.x = moveX;
          sprite.y = moveY;
        }
      } else {
        sprite.state = 'shoot';
        // Cooldowns depend on subtype
        if (sprite.subtype === 'ghoul') {
          sprite.shootCooldown = 300 + Math.random() * 200; // fast ghouls attack rapidly
        } else if (sprite.subtype === 'heavy') {
          sprite.shootCooldown = 1500; // heavy elite burst triggers
        } else {
          sprite.shootCooldown = 600 + Math.random() * 400; // standard guard
        }
      }
    } else if (sprite.state === 'shoot') {
      // 1. FAST GHOUL ATTACK
      if (sprite.subtype === 'ghoul') {
        if (sprite.shootCooldown <= 0) {
          if (dist < 1.0) {
            SoundEngine.play('hurt');
            spawnSpark(Player.x, Player.y, 4, '#ff3333'); // Scratch sparks
            
            let dmg = 6 + Math.floor(Math.random() * 6) + Player.floor;
            dmg *= Math.pow(0.9, Player.upgrades.shield_plating || 0);
            dmg = Math.floor(dmg);

            applyPlayerDamage(dmg);
          }
          sprite.state = 'chase';
        }
      } 
      // 2. HEAVY ELITE BURST ATTACK
      else if (sprite.subtype === 'heavy') {
        if (!sprite.burstCount) {
          sprite.burstCount = 3;
          sprite.burstTimer = 0;
        }

        sprite.burstTimer -= dt * 1000;
        if (sprite.burstTimer <= 0 && sprite.burstCount > 0) {
          SoundEngine.play('enemy_shoot');
          spawnSpark(sprite.x, sprite.y, 4, '#ff3333');

          const hitChance = Math.max(0.1, 0.7 - (dist * 0.12));
          if (Math.random() < hitChance) {
            let dmg = 6 + Math.floor(Math.random() * 8) + Player.floor;
            dmg *= Math.pow(0.9, Player.upgrades.shield_plating || 0);
            dmg = Math.floor(dmg);

            applyPlayerDamage(dmg);
          }
          sprite.burstCount--;
          sprite.burstTimer = 150; // 150ms delay
        }

        if (sprite.burstCount === 0) {
          sprite.burstCount = undefined;
          sprite.state = 'chase';
          sprite.shootCooldown = 1400 + Math.random() * 500;
        }
      } 
      // 3. STANDARD GUARD
      else {
        if (sprite.shootCooldown <= 0) {
          SoundEngine.play('enemy_shoot');
          spawnSpark(sprite.x, sprite.y, 4, '#ff3333');

          const hitChance = Math.max(0.1, 0.8 - (dist * 0.15));
          if (Math.random() < hitChance) {
            let dmg = 8 + Math.floor(Math.random() * 12) + Player.floor;
            dmg *= Math.pow(0.9, Player.upgrades.shield_plating || 0);
            dmg = Math.floor(dmg);

            applyPlayerDamage(dmg);
          }
          sprite.state = 'chase';
        }
      }
    }
  });
}

function applyPlayerDamage(dmg) {
  if (Player.upgrades.phoenix > 0) {
    sprites.forEach(s => {
      if (s.type === 'enemy' && s.state !== 'dead') {
        const sdx = s.x - Player.x;
        const sdy = s.y - Player.y;
        const sdist = Math.sqrt(sdx*sdx + sdy*sdy);
        if (sdist < 4.0) {
          s.health -= 12 * Player.upgrades.phoenix;
          s.state = 'hurt';
          spawnSpark(s.x, s.y, 4, '#ff7700');
          if (s.health <= 0) {
            triggerEnemyDeath(s);
          }
        }
      }
    });
  }

  if (Player.shield > 0) {
    if (Player.shield >= dmg) {
      Player.shield -= dmg;
      dmg = 0;
    } else {
      dmg -= Player.shield;
      Player.shield = 0;
    }
  }

  if (dmg > 0 && !DebugCheats.godMode) {
    Player.health = Math.max(0, Player.health - dmg);
  }

  flashScreen('damage-flash', 'rgba(255, 0, 0, 0.45)', 120);
  SoundEngine.play('hurt');

  if (Player.health <= 0 && Player.upgrades.second_wind > 0) {
    Player.upgrades.second_wind--;
    Player.health = Math.floor(Player.maxHealth * 0.5);
    SoundEngine.play('pickup_item');
    flashScreen('pickup-flash', 'rgba(0, 255, 0, 0.5)', 300);
    spawnSpark(Player.x, Player.y, 15, '#33ff33');
  }

  document.getElementById('screen-container').classList.add('shake');
  setTimeout(() => {
    document.getElementById('screen-container').classList.remove('shake');
  }, 120);
}

function handlePickups() {
  for (let i = sprites.length - 1; i >= 0; i--) {
    const sprite = sprites[i];
    if (sprite.type === 'pillar') continue;

    const dx = Player.x - sprite.x;
    const dy = Player.y - sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.45) {
      if (sprite.type === 'medkit' && Player.health < Player.maxHealth) {
        const healAmt = Math.floor(sprite.value * (1 + 0.25 * (Player.upgrades.medic_syringe || 0)));
        Player.health = Math.min(Player.maxHealth, Player.health + healAmt);
        SoundEngine.play('pickup_item');
        flashScreen('pickup-flash', 'rgba(0, 255, 0, 0.35)', 150);
        sprites.splice(i, 1);
      } else if (sprite.type === 'ammo') {
        const ammoAmt = Math.floor(sprite.value * (1 + 0.25 * (Player.upgrades.ammo_scav || 0)));
        Player.ammo = Math.min(Player.maxAmmo, Player.ammo + ammoAmt);
        SoundEngine.play('pickup_item');
        flashScreen('pickup-flash', 'rgba(255, 215, 0, 0.35)', 150);
        sprites.splice(i, 1);
      } else if (sprite.type === 'key_red') {
        Player.hasRedKey = true;
        SoundEngine.play('pickup_item');
        flashScreen('pickup-flash', 'rgba(255, 51, 51, 0.35)', 150);
        sprites.splice(i, 1);
        showHudFlashMessage("ACQUIRED RED KEYCARD");
      } else if (sprite.type === 'key_blue') {
        Player.hasBlueKey = true;
        SoundEngine.play('pickup_item');
        flashScreen('pickup-flash', 'rgba(51, 166, 255, 0.35)', 150);
        sprites.splice(i, 1);
        showHudFlashMessage("ACQUIRED BLUE KEYCARD");
      }
    }
  }
}

function flashScreen(elemId, colorStr, duration) {
  const flash = document.getElementById(elemId);
  if (flash) {
    flash.style.backgroundColor = colorStr;
    setTimeout(() => {
      flash.style.backgroundColor = 'rgba(0,0,0,0)';
    }, duration);
  }
}

function handleParticles(dt) {
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

// =========================================================================
// HUD & STATE VIEW MANAGER
// =========================================================================
function updateHUD() {
  document.getElementById('hud-floor').innerText = Player.floor;
  
  let hpText = `${Player.health}%`;
  if (Player.shield > 0) {
    hpText += ` [SH:${Player.shield}]`;
  }
  
  // Display key indicators next to HP
  let keyText = "";
  if (Player.hasRedKey) keyText += " 🔴";
  if (Player.hasBlueKey) keyText += " 🔵";
  
  document.getElementById('hud-health').innerText = hpText + keyText;
  document.getElementById('hud-ammo').innerText = `${Player.ammo}/${Player.maxAmmo}`;
  document.getElementById('hud-score').innerText = String(Player.score).padStart(6, '0');

  const hpVal = document.getElementById('hud-health');
  if (Player.health < 30) {
    hpVal.classList.add('red');
  } else {
    hpVal.classList.remove('red');
  }

  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById(`weap-dot-${i}`);
    if (Player.currentWeapon === i - 1) {
      dot.classList.add('active');
    } else {
      dot.classList.remove('active');
    }
  }
}

function showScreen(screenId) {
  activeScreen = screenId.replace('-screen', '');
  
  const screens = ['start-screen', 'floor-screen', 'gameover-screen'];
  screens.forEach(s => {
    const el = document.getElementById(s);
    if (s === screenId) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  if (activeScreen !== 'game') {
    document.exitPointerLock?.();
  }
}

// =========================================================================
// GAME OVER & HIGHSCORES HANDLERS
// =========================================================================
function handleGameOver() {
  SoundEngine.play('enemy_die');
  SoundEngine.stopMusic();

  const scoreQualified = checkLocalHighScore(Player.score);
  const promptContainer = document.getElementById('leaderboard-prompt');
  const normalGameOverStats = document.getElementById('gameover-stats');
  const restartButton = document.getElementById('btn-restart');

  if (scoreQualified) {
    promptContainer.classList.remove('hidden');
    normalGameOverStats.classList.add('hidden');
    restartButton.classList.add('hidden');
    
    const nameInput = document.getElementById('arcade-name-input');
    nameInput.value = '';
    setTimeout(() => nameInput.focus(), 150);
  } else {
    promptContainer.classList.add('hidden');
    normalGameOverStats.classList.remove('hidden');
    restartButton.classList.remove('hidden');
    
    normalGameOverStats.innerHTML = `
      FLOORS CLEARED: ${Player.floor - 1}<br>
      FINAL SCORE: ${Player.score} PTS<br><br>
      <span style="color:var(--primary-color);">REST IN PIECES IN THE CATACOMBS</span>
    `;
  }

  showScreen('gameover-screen');
}

function handleFloorComplete() {
  SoundEngine.play('elevator');
  
  const baseBonus = Player.floor * 100;
  const killBonus = Player.kills * 50;
  const finalBonus = baseBonus + killBonus;
  Player.score += Math.floor(finalBonus * (1 + 0.20 * (Player.upgrades.magnet || 0)));

  const ammoAmt = Math.floor(40 * (1 + 0.25 * (Player.upgrades.ammo_scav || 0)));
  const healAmt = Math.floor(20 * (1 + 0.25 * (Player.upgrades.medic_syringe || 0)));
  Player.ammo = Math.min(Player.maxAmmo, Player.ammo + ammoAmt);
  Player.health = Math.min(Player.maxHealth, Player.health + healAmt);

  document.getElementById('floor-transition-title').innerText = `DESCENDING TO FLOOR ${Player.floor + 1}`;
  document.getElementById('btn-next-floor').classList.add('hidden');

  triggerUpgradeDraft(Player, () => {});
  renderActiveUpgradesList(Player);

  showScreen('floor-screen');
}

// =========================================================================
// LEADERBOARD UI RENDERER
// =========================================================================
let currentLeaderboardTab = 'local';

function updateLeaderboardsUI() {
  const localList = getLocalScores();
  
  const elements = [
    {
      table: document.getElementById('start-leaderboard-table'),
      empty: document.getElementById('start-leaderboard-empty')
    },
    {
      table: document.getElementById('gameover-leaderboard-table'),
      empty: document.getElementById('gameover-leaderboard-empty')
    }
  ];

  if (currentLeaderboardTab === 'local') {
    elements.forEach(({ table, empty }) => {
      if (!table || !empty) return;
      if (localList.length === 0) {
        table.classList.add('hidden');
        empty.classList.remove('hidden');
        empty.innerText = "NO RUNS DETECTED YET.";
      } else {
        empty.classList.add('hidden');
        table.classList.remove('hidden');
        
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';
        localList.forEach((s, idx) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="rank-${idx + 1}">${idx + 1}</td>
            <td>${s.name}</td>
            <td>${s.score}</td>
            <td>FL ${s.floor}</td>
            <td>${s.kills} K</td>
            <td>${s.date}</td>
          `;
          tbody.appendChild(tr);
        });
      }
    });
  } else {
    fetchGlobalScores().then(res => {
      elements.forEach(({ table, empty }) => {
        if (!table || !empty) return;
        empty.classList.add('hidden');
        table.classList.remove('hidden');
        
        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';
        res.scores.forEach((s, idx) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td class="rank-${idx + 1}">${idx + 1}</td>
            <td>${s.name}</td>
            <td>${s.score}</td>
            <td>FL ${s.floor}</td>
            <td>${s.kills} K</td>
            <td>${s.date}</td>
          `;
          tbody.appendChild(tr);
        });
        
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="6" style="text-align: center; color: var(--hud-text); font-size: 8px; padding-top: 8px;">[ ${res.message} ]</td>`;
        tbody.appendChild(row);
      });
    });
  }
}

function switchLeaderboardTab(tab) {
  currentLeaderboardTab = tab;
  document.querySelectorAll('.leaderboard-tab').forEach(btn => {
    if (btn.getAttribute('data-tab') === tab) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
  updateLeaderboardsUI();
}

// =========================================================================
// GAME TICKER LOOP
// =========================================================================
function updateGame(timestamp) {
  if (!lastTime) lastTime = timestamp;
  let dt = (timestamp - lastTime) / 1000.0;
  lastTime = timestamp;

  if (dt > 0.1) dt = 0.1;

  if (activeScreen === 'game') {
    if (Player.shootCooldown > 0) {
      Player.shootCooldown -= dt * 1000;
    }

    if (Player.isShooting) {
      Player.shootFrame++;
      if (Player.shootFrame > 3) {
        Player.isShooting = false;
        Player.shootFrame = 0;
      }
    }

    // Player physics
    let speedMultiplier = 1.0 + 0.10 * (Player.upgrades.boots || 0);
    if (Player.adrenalineTimer > 0) {
      Player.adrenalineTimer -= dt;
      speedMultiplier += 0.30 * (Player.upgrades.adrenaline || 0);
    }
    let moveSpeed = 3.2 * dt * speedMultiplier;
    let rotSpeed = 2.4 * dt;
    
    let newX = Player.x;
    let newY = Player.y;

    if (keys.w) {
      newX += Player.dirX * moveSpeed;
      newY += Player.dirY * moveSpeed;
    }
    if (keys.s) {
      newX -= Player.dirX * moveSpeed;
      newY -= Player.dirY * moveSpeed;
    }
    if (keys.d) {
      newX -= Player.dirY * moveSpeed;
      newY += Player.dirX * moveSpeed;
    }
    if (keys.a) {
      newX += Player.dirY * moveSpeed;
      newY -= Player.dirX * moveSpeed;
    }

    if (keys.q) {
      rotateCamera(-rotSpeed);
    }
    if (keys.e) {
      rotateCamera(rotSpeed);
    }

    // Check locked doors collision (Cell 5 represents Locked Red Door, Cell 6 locked Blue Door)
    const checkCellX = Math.floor(newX);
    const checkCellY = Math.floor(newY);
    const targetCell = map[checkCellY] ? map[checkCellY][checkCellX] : 0;
    
    let allowMovement = true;
    
    if (targetCell === 5) { // Red Locked Door
      if (Player.hasRedKey) {
        map[checkCellY][checkCellX] = 0; // Unlock
        SoundEngine.play('elevator'); // slide sound
        showHudFlashMessage("RED DOOR UNLOCKED");
      } else {
        allowMovement = false;
        if (hudFlashText !== "RED KEYCARD REQUIRED!") {
          SoundEngine.play('click');
          showHudFlashMessage("RED KEYCARD REQUIRED!");
        }
      }
    } else if (targetCell === 6) { // Blue Locked Door
      if (Player.hasBlueKey) {
        map[checkCellY][checkCellX] = 0;
        SoundEngine.play('elevator');
        showHudFlashMessage("BLUE DOOR UNLOCKED");
      } else {
        allowMovement = false;
        if (hudFlashText !== "BLUE KEYCARD REQUIRED!") {
          SoundEngine.play('click');
          showHudFlashMessage("BLUE KEYCARD REQUIRED!");
        }
      }
    }

    if (allowMovement) {
      const finalPos = checkCollisions(Player, newX, newY, DebugCheats);
      Player.x = finalPos.x;
      Player.y = finalPos.y;
    } else {
      // Bounce player back slightly
      Player.x -= Player.dirX * 0.05;
      Player.y -= Player.dirY * 0.05;
    }

    // Reveal Map
    const revealRadius = 4.0;
    const px = Math.floor(Player.x);
    const py = Math.floor(Player.y);
    for (let y = Math.max(0, py - 4); y <= Math.min(MapHeight - 1, py + 4); y++) {
      for (let x = Math.max(0, px - 4); x <= Math.min(MapWidth - 1, px + 4); x++) {
        const dx = x + 0.5 - Player.x;
        const dy = y + 0.5 - Player.y;
        if (dx * dx + dy * dy < revealRadius * revealRadius) {
          if (visitedMap[y]) {
            visitedMap[y][x] = true;
          }
        }
      }
    }

    // Elevator exit
    const cellX = Math.floor(Player.x);
    const cellY = Math.floor(Player.y);
    if (map[cellY] && map[cellY][cellX] === 4) {
      handleFloorComplete();
    }

    handleEnemyAI(dt);
    handlePickups();
    handleParticles(dt);

    if (Player.health <= 0) {
      handleGameOver();
    }

    render3D(Player, Weapons, keys);
    renderPortrait(Player);
    updateHUD();
    updateDebugDiagnostics(dt);

    // Draw viewport HUD alerts
    if (hudFlashTimer > 0) {
      hudFlashTimer -= dt;
      const gameCanvas = document.getElementById('gameCanvas');
      const gCtx = gameCanvas.getContext('2d');
      gCtx.save();
      gCtx.font = "8px 'Press Start 2P', monospace";
      gCtx.textAlign = 'center';
      
      // Shadow
      gCtx.fillStyle = '#000000';
      gCtx.fillText(hudFlashText, gameCanvas.width / 2 + 1, gameCanvas.height / 2 + 31);
      
      // Glow text
      gCtx.fillStyle = hudFlashText.includes("ACQUIRED") ? '#33ff33' : '#ff3333';
      gCtx.fillText(hudFlashText, gameCanvas.width / 2, gameCanvas.height / 2 + 30);
      gCtx.restore();
    }
  }

  requestAnimationFrame(updateGame);
}

function rotateCamera(angle) {
  const oldDirX = Player.dirX;
  Player.dirX = Player.dirX * Math.cos(angle) - Player.dirY * Math.sin(angle);
  Player.dirY = oldDirX * Math.sin(angle) + Player.dirY * Math.cos(angle);
  
  const oldPlaneX = Player.planeX;
  Player.planeX = Player.planeX * Math.cos(angle) - Player.planeY * Math.sin(angle);
  Player.planeY = oldPlaneX * Math.sin(angle) + Player.planeY * Math.cos(angle);
}

// =========================================================================
// INPUT & EVENTS BINDING
// =========================================================================
function setupControls() {
  canvas.addEventListener('click', () => {
    const isDebugVisible = !document.getElementById('debug-menu').classList.contains('hidden');
    if (activeScreen === 'game' && !isDebugVisible) {
      canvas.requestPointerLock();
    }
  });

  document.addEventListener('mousemove', (e) => {
    const isDebugVisible = !document.getElementById('debug-menu').classList.contains('hidden');
    if (document.pointerLockElement === canvas && activeScreen === 'game' && !isDebugVisible) {
      rotateCamera(e.movementX * mouseSensitivity);
    }
  });

  window.addEventListener('keydown', (e) => {
    const isDebugVisible = !document.getElementById('debug-menu').classList.contains('hidden');
    
    if (e.key === '`' || e.key === '~' || e.key === 'Escape') {
      if (e.key === 'Escape' && isDebugVisible) {
        toggleDebugMenu();
        e.preventDefault();
        return;
      } else if (e.key === '`' || e.key === '~') {
        toggleDebugMenu();
        e.preventDefault();
        return;
      }
    }

    if (isDebugVisible) return;

    const key = e.key.toLowerCase();
    
    if (key === '1') { Player.currentWeapon = 0; SoundEngine.play('click'); }
    if (key === '2') { Player.currentWeapon = 1; SoundEngine.play('click'); }
    if (key === '3') { Player.currentWeapon = 2; SoundEngine.play('click'); }

    if (key === 'w' || e.key === 'ArrowUp') keys.w = true;
    if (key === 's' || e.key === 'ArrowDown') keys.s = true;
    if (key === 'a' || e.key === 'ArrowLeft') keys.a = true;
    if (key === 'd' || e.key === 'ArrowRight') keys.d = true;
    if (key === 'q') keys.q = true;
    if (key === 'e') keys.e = true;

    if (e.key === ' ' || key === 'spacebar') {
      if (activeScreen === 'game') {
        handleShoot();
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w' || e.key === 'ArrowUp') keys.w = false;
    if (key === 's' || e.key === 'ArrowDown') keys.s = false;
    if (key === 'a' || e.key === 'ArrowLeft') keys.a = false;
    if (key === 'd' || e.key === 'ArrowRight') keys.d = false;
    if (key === 'q') keys.q = false;
    if (key === 'e') keys.e = false;
  });

  window.addEventListener('wheel', (e) => {
    const isDebugVisible = !document.getElementById('debug-menu').classList.contains('hidden');
    if (activeScreen !== 'game' || isDebugVisible) return;
    if (e.deltaY > 0) {
      Player.currentWeapon = (Player.currentWeapon + 1) % Weapons.length;
    } else {
      Player.currentWeapon = (Player.currentWeapon - 1 + Weapons.length) % Weapons.length;
    }
    SoundEngine.play('click');
  });

  canvas.addEventListener('mousedown', (e) => {
    const isDebugVisible = !document.getElementById('debug-menu').classList.contains('hidden');
    if (e.button === 0 && activeScreen === 'game' && !isDebugVisible) {
      handleShoot();
    }
  });

  // Buttons Bindings
  document.getElementById('btn-start').addEventListener('click', () => {
    SoundEngine.init();
    SoundEngine.play('click');
    SoundEngine.startMusic();
    Player.reset();
    generateFloor(Player);
    showScreen('game-screen');
    activeScreen = 'game';
    canvas.requestPointerLock?.();
  });

  document.getElementById('btn-next-floor').addEventListener('click', () => {
    SoundEngine.play('click');
    Player.floor++;
    generateFloor(Player);
    showScreen('game-screen');
    activeScreen = 'game';
    canvas.requestPointerLock?.();
  });

  document.getElementById('btn-restart').addEventListener('click', () => {
    SoundEngine.play('click');
    SoundEngine.startMusic();
    Player.reset();
    generateFloor(Player);
    showScreen('game-screen');
    activeScreen = 'game';
    canvas.requestPointerLock?.();
  });

  // High Scores Submission Listener
  document.getElementById('btn-submit-score').addEventListener('click', () => {
    const nameInput = document.getElementById('arcade-name-input');
    const name = nameInput.value.trim().toUpperCase() || 'AAA';
    
    // Save locally
    saveLocalScore(name, Player.score, Player.floor, Player.kills);
    
    // Stub global submit
    submitGlobalScore(name, Player.score, Player.floor, Player.kills);

    // Refresh UI & switch back to start screen
    updateLeaderboardsUI();
    showScreen('start-screen');
    activeScreen = 'start';
  });

  // Allow enter key in name input
  document.getElementById('arcade-name-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('btn-submit-score').click();
    }
  });

  // Leaderboard tab controls
  document.querySelectorAll('.leaderboard-tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const tab = e.target.getAttribute('data-tab');
      switchLeaderboardTab(tab);
    });
  });

  // Mobile Touch controls
  function bindTouchEvent(elementId, actionDown, actionUp) {
    const btn = document.getElementById(elementId);
    if (!btn) return;
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      actionDown();
    }, { passive: false });

    btn.addEventListener('touchend', (e) => {
      e.preventDefault();
      actionUp();
    }, { passive: false });
  }

  bindTouchEvent('dpad-up', () => { keys.w = true; }, () => { keys.w = false; });
  bindTouchEvent('dpad-down', () => { keys.s = true; }, () => { keys.s = false; });
  bindTouchEvent('dpad-left', () => { keys.a = true; }, () => { keys.a = false; });
  bindTouchEvent('dpad-right', () => { keys.d = true; }, () => { keys.d = false; });

  document.getElementById('btn-shoot').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (activeScreen === 'game') handleShoot();
  });

  document.getElementById('btn-weapon').addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (activeScreen === 'game') {
      Player.currentWeapon = (Player.currentWeapon + 1) % Weapons.length;
      SoundEngine.play('click');
    }
  });

  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    document.getElementById('mobile-controls').style.display = 'block';
    setupTouchCameraLook();
  }
}

function setupTouchCameraLook() {
  let touchStartX = 0;
  canvas.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });

  canvas.addEventListener('touchmove', (e) => {
    if (activeScreen !== 'game') return;
    const currentX = e.touches[0].clientX;
    const diffX = currentX - touchStartX;
    const sensitivity = 0.008;
    rotateCamera(diffX * sensitivity);
    touchStartX = currentX;
  }, { passive: true });
}

// =========================================================================
// SYSTEM DIAGNOSTICS & CHEATS CORE CONTROL
// =========================================================================
function toggleDebugMenu() {
  const menu = document.getElementById('debug-menu');
  if (!menu) return;
  const isHidden = menu.classList.contains('hidden');
  if (isHidden) {
    menu.classList.remove('hidden');
    populateDebugUpgrades();
    syncDebugInputs();
    document.exitPointerLock?.();
  } else {
    menu.classList.add('hidden');
    if (activeScreen === 'game') {
      canvas.requestPointerLock?.();
    }
  }
}

function populateDebugUpgrades() {
  const listEl = document.getElementById('dbg-upgrades-list');
  if (!listEl) return;
  listEl.innerHTML = '';
  
  UPGRADE_POOL.forEach(up => {
    const row = document.createElement('div');
    row.className = 'dbg-upgrade-row';
    
    const name = document.createElement('span');
    name.className = 'dbg-upgrade-name';
    name.innerText = `${up.icon} ${up.name}`;
    name.title = up.desc;
    
    const controls = document.createElement('div');
    controls.className = 'dbg-upgrade-controls';
    
    const minus = document.createElement('button');
    minus.className = 'dbg-upgrade-btn';
    minus.innerText = '-';
    minus.addEventListener('click', () => {
      if (Player.upgrades[up.id] > 0) {
        Player.upgrades[up.id]--;
        updateUpgradeCountDisplay(up.id);
      }
    });
    
    const count = document.createElement('span');
    count.className = 'dbg-upgrade-count';
    count.id = `dbg-count-${up.id}`;
    count.innerText = Player.upgrades[up.id] || 0;
    
    const plus = document.createElement('button');
    plus.className = 'dbg-upgrade-btn';
    plus.innerText = '+';
    plus.addEventListener('click', () => {
      Player.upgrades[up.id] = (Player.upgrades[up.id] || 0) + 1;
      if (up.apply) {
        up.apply(Player);
      }
      updateUpgradeCountDisplay(up.id);
    });
    
    controls.appendChild(minus);
    controls.appendChild(count);
    controls.appendChild(plus);
    
    row.appendChild(name);
    row.appendChild(controls);
    listEl.appendChild(row);
  });
}

function updateUpgradeCountDisplay(id) {
  const countEl = document.getElementById(`dbg-count-${id}`);
  if (countEl) {
    countEl.innerText = Player.upgrades[id] || 0;
  }
}

function syncDebugInputs() {
  const hpInput = document.getElementById('dbg-input-hp');
  const ammoInput = document.getElementById('dbg-input-ammo');
  const shieldInput = document.getElementById('dbg-input-shield');
  const floorInput = document.getElementById('dbg-input-floor');

  if (document.activeElement !== hpInput && hpInput) hpInput.value = Player.health;
  if (document.activeElement !== ammoInput && ammoInput) ammoInput.value = Player.ammo;
  if (document.activeElement !== shieldInput && shieldInput) shieldInput.value = Player.shield;
  if (document.activeElement !== floorInput && floorInput) floorInput.value = Player.floor;
}

function updateDebugDiagnostics(dt) {
  const fps = Math.round(1 / (dt || 0.016));
  const numSprites = sprites.length;
  const numParticles = particles.length;
  const debugFpsCounter = document.getElementById('debug-fps-counter');
  if (debugFpsCounter) {
    debugFpsCounter.innerText = `FPS: ${fps} | SPRITES: ${numSprites} | PARTICLES: ${numParticles}`;
  }
}

function setupDebugMenu() {
  document.getElementById('btn-debug-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDebugMenu();
  });

  document.getElementById('dbg-godmode').addEventListener('change', (e) => {
    DebugCheats.godMode = e.target.checked;
  });
  document.getElementById('dbg-noclip').addEventListener('change', (e) => {
    DebugCheats.noclip = e.target.checked;
  });

  document.getElementById('dbg-btn-fullhp').addEventListener('click', () => {
    Player.health = Player.maxHealth;
    syncDebugInputs();
    SoundEngine.play('pickup_item');
  });
  document.getElementById('dbg-btn-fullammo').addEventListener('click', () => {
    Player.ammo = Player.maxAmmo;
    syncDebugInputs();
    SoundEngine.play('pickup_item');
  });
  document.getElementById('dbg-btn-shield').addEventListener('click', () => {
    Player.maxShield = (Player.maxShield || 0) + 25;
    Player.shield = Player.maxShield;
    syncDebugInputs();
    SoundEngine.play('pickup_item');
  });
  document.getElementById('dbg-btn-score').addEventListener('click', () => {
    Player.score += 5000;
    SoundEngine.play('pickup_item');
  });
  document.getElementById('dbg-btn-reset-upgrades').addEventListener('click', () => {
    UPGRADE_POOL.forEach(up => {
      Player.upgrades[up.id] = 0;
      updateUpgradeCountDisplay(up.id);
    });
    SoundEngine.play('hurt');
  });

  document.getElementById('dbg-btn-clearfloor').addEventListener('click', () => {
    toggleDebugMenu();
    handleFloorComplete();
  });
  document.getElementById('dbg-btn-revealmap').addEventListener('click', () => {
    if (visitedMap && visitedMap.length > 0) {
      for (let y = 0; y < MapHeight; y++) {
        visitedMap[y].fill(true);
      }
      SoundEngine.play('pickup_item');
    }
  });
  document.getElementById('dbg-btn-spawnmed').addEventListener('click', () => {
    sprites.push({
      type: 'medkit',
      x: Player.x + Player.dirX * 1.5,
      y: Player.y + Player.dirY * 1.5,
      texture: 5,
      value: 35
    });
    SoundEngine.play('pickup_item');
  });
  document.getElementById('dbg-btn-spawnammo').addEventListener('click', () => {
    sprites.push({
      type: 'ammo',
      x: Player.x + Player.dirX * 1.5,
      y: Player.y + Player.dirY * 1.5,
      texture: 6,
      value: 40
    });
    SoundEngine.play('pickup_item');
  });
  document.getElementById('dbg-btn-spawnenemy').addEventListener('click', () => {
    sprites.push({
      type: 'enemy',
      x: Player.x + Player.dirX * 1.5,
      y: Player.y + Player.dirY * 1.5,
      health: 50 + Player.floor * 15,
      maxHp: 50 + Player.floor * 15,
      state: 'idle',
      speed: 1.2 + Math.min(Player.floor * 0.15, 1.2),
      shootCooldown: 0,
      animTimer: 0,
      animFrame: 0,
      solid: true
    });
    Player.maxKills++;
    SoundEngine.play('enemy_alert');
  });

  // Slider bindings
  document.getElementById('dbg-volume-sfx').addEventListener('input', (e) => {
    SoundEngine.setVolume(parseFloat(e.target.value), SoundEngine.musicVolume);
  });
  document.getElementById('dbg-volume-music').addEventListener('input', (e) => {
    const nextVol = parseFloat(e.target.value);
    const wasMuted = SoundEngine.musicVolume <= 0.001;
    SoundEngine.setVolume(SoundEngine.sfxVolume, nextVol);
    
    if (wasMuted && nextVol > 0.001 && activeScreen === 'game') {
      SoundEngine.startMusic();
    }
  });

  document.getElementById('dbg-input-hp').addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) Player.health = Math.max(0, val);
  });
  document.getElementById('dbg-input-ammo').addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) Player.ammo = Math.max(0, val);
  });
  document.getElementById('dbg-input-shield').addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) {
      Player.shield = Math.max(0, val);
      Player.maxShield = Math.max(Player.maxShield || 0, val);
    }
  });
  document.getElementById('dbg-input-floor').addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    if (!isNaN(val)) Player.floor = Math.max(1, val);
  });
}

function resizeGame() {
  const cabinet = document.getElementById('cabinet');
  if (!cabinet) return;
  const w = window.innerWidth;
  const h = window.innerHeight;
  const scale = Math.min((w - 10) / 800, (h - 10) / 600);
  cabinet.style.transform = `scale(${scale})`;
  cabinet.style.transformOrigin = 'center center';
}

// =========================================================================
// RUN ENGINE
// =========================================================================
window.addEventListener('resize', resizeGame);

window.addEventListener('load', () => {
  canvas = document.getElementById('gameCanvas');
  
  initRaycaster(canvas);
  initPortrait();
  generateTextures();
  
  setupControls();
  setupDebugMenu();
  resizeGame();
  
  updateLeaderboardsUI();
  
  requestAnimationFrame(updateGame);
});
