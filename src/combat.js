/**
 * Combat, AI, and Pickup Module for Grave Escape 3D.
 * Handles shooting calculations, player/enemy damage, line-of-sight checks,
 * enemy movement/attack states, and items retrieval.
 */

import { Player, Weapons, keys, showHudFlashMessage, flashScreen } from './main.js';
import { sprites, map, MapWidth, MapHeight, checkCollisions } from './map.js';
import { SoundEngine } from './audio.js';
import { spawnBlood, spawnSpark, spawnDamageText } from './particles.js';
import { DebugCheats } from './settings.js';

export function triggerEnemyDeath(enemy) {
  enemy.state = 'dead';
  enemy.solid = false;
  Player.kills++;
  Player.totalKills++;
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

export function handleShoot() {
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
          const finalPos = checkCollisions(nearestTarget, newX, newY, false, 0.22);
          nearestTarget.x = finalPos.x;
          nearestTarget.y = finalPos.y;
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
        const finalPos = checkCollisions(nearestTarget, newX, newY, false, 0.22);
        nearestTarget.x = finalPos.x;
        nearestTarget.y = finalPos.y;
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

export function checkLineOfSight(sprite) {
  const dx = Player.x - sprite.x;
  const dy = Player.y - sprite.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) return true;
  
  const steps = Math.floor(dist * 4);
  for (let i = 1; i < steps; i++) {
    const cx = Math.floor(sprite.x + (dx * i / steps));
    const cy = Math.floor(sprite.y + (dy * i / steps));
    if (map[cy] && map[cy][cx] > 0 && map[cy][cx] !== 4) {
      return false; // Blocked by wall or locked door
    }
  }
  return true;
}

export function handleEnemyAI(dt) {
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
        
        const finalPos = checkCollisions(sprite, moveX, moveY, false, 0.22);
        sprite.x = finalPos.x;
        sprite.y = finalPos.y;
      } else {
        sprite.state = 'shoot';
        // Cooldowns depend on subtype
        if (sprite.subtype === 'ghoul') {
          sprite.shootCooldown = 300 + Math.random() * 200; // fast ghouls attack rapidly
        } else if (sprite.subtype === 'heavy') {
          if (sprite.shootCooldown <= 0) {
            sprite.shootCooldown = 600 + Math.random() * 400; // heavy elite initial burst warning delay
          }
        } else {
          sprite.shootCooldown = 600 + Math.random() * 400; // standard guard
        }
      }
    } else if (sprite.state === 'shoot') {
      // 1. FAST GHOUL ATTACK
      if (sprite.subtype === 'ghoul') {
        if (sprite.shootCooldown <= 0) {
          if (dist < 1.0 && checkLineOfSight(sprite)) {
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
        if (sprite.shootCooldown <= 0) {
          if (!sprite.burstCount) {
            sprite.burstCount = 3;
            sprite.burstTimer = 0;
          }

          sprite.burstTimer -= dt * 1000;
          if (sprite.burstTimer <= 0 && sprite.burstCount > 0) {
            // Check line of sight before each shot in the burst
            if (checkLineOfSight(sprite)) {
              SoundEngine.play('enemy_shoot');
              spawnSpark(sprite.x, sprite.y, 4, '#ff3333');

              const hitChance = Math.max(0.1, 0.55 - (dist * 0.10));
              if (Math.random() < hitChance) {
                let dmg = 4 + Math.floor(Math.random() * 5) + Math.floor(Player.floor * 0.5);
                dmg *= Math.pow(0.9, Player.upgrades.shield_plating || 0);
                dmg = Math.floor(dmg);

                applyPlayerDamage(dmg);
              }
            }
            sprite.burstCount--;
            sprite.burstTimer = 150; // 150ms delay
          }

          if (sprite.burstCount === 0) {
            sprite.burstCount = undefined;
            sprite.state = 'chase';
            sprite.shootCooldown = 1600 + Math.random() * 600; // delay between bursts
          }
        }
      } 
      // 3. STANDARD GUARD
      else {
        if (sprite.shootCooldown <= 0) {
          // Check line of sight before shooting
          if (checkLineOfSight(sprite)) {
            SoundEngine.play('enemy_shoot');
            spawnSpark(sprite.x, sprite.y, 4, '#ff3333');

            const hitChance = Math.max(0.1, 0.8 - (dist * 0.15));
            if (Math.random() < hitChance) {
              let dmg = 8 + Math.floor(Math.random() * 12) + Player.floor;
              dmg *= Math.pow(0.9, Player.upgrades.shield_plating || 0);
              dmg = Math.floor(dmg);

              applyPlayerDamage(dmg);
            }
          }
          sprite.state = 'chase';
        }
      }
    }
  });
}

export function applyPlayerDamage(dmg) {
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

export function handlePickups() {
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
