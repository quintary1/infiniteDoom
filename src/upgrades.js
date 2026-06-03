/**
 * Upgrades Pool and Drafting Module for Grave Escape 3D.
 * Defines the 25 stackable upgrades and handles drafting UI rendering.
 */

import { SoundEngine } from './audio.js';

export const UPGRADE_POOL = [
  { id: 'titanium', name: 'TITANIUM PLATES', desc: '+20 Max Health.', icon: '🛡️', apply: (player) => { player.maxHealth += 20; player.health = Math.min(player.maxHealth, player.health + 20); } },
  { id: 'bandolier', name: 'BANDOLIER', desc: '+30 Max Ammo.', icon: '🎒', apply: (player) => { player.maxAmmo += 30; player.ammo += 30; } },
  { id: 'vampire', name: 'VAMPIRIC ROUNDS', desc: '5% chance to heal 2 HP on hit.', icon: '🦇' },
  { id: 'double_tap', name: 'DOUBLE TAP', desc: 'Weapon fire rate increased by 8%.', icon: '⚡' },
  { id: 'boots', name: 'BA BOOTS', desc: '10% faster player speed.', icon: '🥾' },
  { id: 'lead_pour', name: 'LEAD POUR', desc: '+15% raw bullet damage.', icon: '🔥' },
  { id: 'hollow_point', name: 'HOLLOW POINTS', desc: '10% Critical Hit chance (x2 damage).', icon: '🎯' },
  { id: 'knockback', name: 'HEAVY IMPACT', desc: 'Pushes shot hostiles backward.', icon: '🤜' },
  { id: 'ammo_scav', name: 'SCAVENGER', desc: '+25% ammo from supply crates.', icon: '🔋' },
  { id: 'medic_syringe', name: 'MED SYRINGE', desc: '+25% health from medical kits.', icon: '💉' },
  { id: 'magnet', name: 'GOLD MAGNET', desc: '+20% score multipliers.', icon: '🧲' },
  { id: 'shield_plating', name: 'TITAN SHIELD', desc: 'All incoming damage reduced by 10%.', icon: '🧱' },
  { id: 'phoenix', name: 'PHOENIX FLAME', desc: 'When hit, damage nearby hostiles.', icon: '🐦' },
  { id: 'adrenaline', name: 'ADRENALINE', desc: '+30% speed on kill for 3 seconds.', icon: '🧠' },
  { id: 'second_wind', name: 'SECOND WIND', desc: 'Revive once at 50% HP on fatal blow.', icon: '😇' },
  { id: 'poison', name: 'TOXIC ROUNDS', desc: 'Shots deal DoT poison damage.', icon: '🧪' },
  { id: 'bouncy', name: 'BOUNCY SPARKS', desc: 'Sparks fly faster and count +5.', icon: '✨' },
  { id: 'lucky', name: 'LUCKY FINDER', desc: '+15% item drop chance on kills.', icon: '🍀' },
  { id: 'brake', name: 'MUZZLE BRAKE', desc: 'Less gun recoil & camera kick.', icon: '🌀' },
  { id: 'surgical', name: 'SURGICAL EYE', desc: '+1 Shotgun pellet & Pistol range.', icon: '👁️' },
  { id: 'toxic_blood', name: 'TOXIC BLOOM', desc: 'Slayed enemies explode into acid.', icon: '☣️' },
  { id: 'lead_shield', name: 'SHIELD BARRIER', desc: 'Spawn +25 Shield HP per floor.', icon: '💎', apply: (player) => { player.maxShield = (player.maxShield || 0) + 25; player.shield = player.maxShield; } },
  { id: 'overcharge', name: 'OVERCHARGE', desc: '5% chance to not consume ammo.', icon: '🔋' },
  { id: 'spitfire', name: 'SPITFIRE', desc: 'Shots set enemies on fire.', icon: '☄️' },
  { id: 'soul_feast', name: 'SOUL FEAST', desc: 'Every 5 kills grants +2 Max HP.', icon: '👻' }
];

export function triggerUpgradeDraft(player, onDraftComplete) {
  // Pick 3 random, unique upgrades from pool
  const pool = [...UPGRADE_POOL];
  const choices = [];
  for (let i = 0; i < 3; i++) {
    const randIdx = Math.floor(Math.random() * pool.length);
    choices.push(pool.splice(randIdx, 1)[0]);
  }

  // Clear and construct cards HTML
  const container = document.getElementById('upgrade-draft-container');
  container.innerHTML = '';
  
  choices.forEach(up => {
    const owned = player.upgrades[up.id] || 0;
    const card = document.createElement('div');
    card.className = 'upgrade-card';
    card.innerHTML = `
      <div class="upgrade-icon">${up.icon}</div>
      <div class="upgrade-name">${up.name}</div>
      <div class="upgrade-desc">${up.desc}</div>
      <div class="upgrade-stack">STAX: ${owned}</div>
    `;
    
    card.addEventListener('click', () => {
      // Play pick sound
      SoundEngine.play('pickup_item');
      
      // Apply upgrade
      player.upgrades[up.id]++;
      if (up.apply) {
        up.apply(player);
      }
      
      // Highlight selected, disable other cards
      document.querySelectorAll('.upgrade-card').forEach(c => {
        c.classList.add('disabled');
        if (c === card) {
          c.classList.add('selected');
        }
      });
      
      // Reveal next floor button
      document.getElementById('btn-next-floor').classList.remove('hidden');
      
      // Re-render floor stats with all active boosts
      renderActiveUpgradesList(player);
      
      if (onDraftComplete) {
        onDraftComplete();
      }
    });
    
    container.appendChild(card);
  });
}

export function renderActiveUpgradesList(player) {
  // Build string listing all currently active upgrades
  let list = [];
  UPGRADE_POOL.forEach(up => {
    const count = player.upgrades[up.id] || 0;
    if (count > 0) {
      list.push(`${up.icon} ${up.name} (x${count})`);
    }
  });
  
  const statsEl = document.getElementById('floor-stats');
  const baseBonus = player.floor * 100;
  const killBonus = player.kills * 50;
  
  statsEl.innerHTML = `
    FLOOR CLEAR BONUS: +${baseBonus} PTS<br>
    HOSTILES SLAIN: ${player.kills} / ${player.maxKills}<br>
    KILL BONUS: +${killBonus} PTS<br><br>
    <span style="color:#ffd700; font-weight:bold;">CURRENT ACTIVE BOOSTS:</span><br>
    ${list.length > 0 ? list.join(' | ') : 'None (Draft an upgrade above!)'}
  `;
}
