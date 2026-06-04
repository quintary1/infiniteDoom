/**
 * Settings, Debug & Cheats UI Module for Grave Escape 3D.
 * Manages Developer Diagnostics, Settings UI toggles, volume controls,
 * and quick-action cheat bindings.
 */

import { Player, canvas, activeScreen, showHudFlashMessage, updateHUD, handleFloorComplete } from './main.js';
import { SoundEngine } from './audio.js';
import { UPGRADE_POOL } from './upgrades.js';
import { sprites, particles, visitedMap, MapHeight } from './map.js';

export const DebugCheats = {
  godMode: false,
  noclip: false,
  customWidth: 0,
  customHeight: 0
};

export function toggleSettingsMenu() {
  const settingsMenu = document.getElementById('settings-menu');
  if (!settingsMenu) return;
  const isHidden = settingsMenu.classList.contains('hidden');
  if (isHidden) {
    // Hide debug menu if open
    document.getElementById('debug-menu')?.classList.add('hidden');
    settingsMenu.classList.remove('hidden');
    syncSettingsVolumeInputs();
    document.exitPointerLock?.();
  } else {
    settingsMenu.classList.add('hidden');
    if (activeScreen === 'game') {
      canvas.requestPointerLock?.();
    }
  }
}

export function syncSettingsVolumeInputs() {
  const sfxSlider = document.getElementById('settings-volume-sfx');
  const musicSlider = document.getElementById('settings-volume-music');
  if (sfxSlider) sfxSlider.value = SoundEngine.sfxVolume;
  if (musicSlider) musicSlider.value = SoundEngine.musicVolume;
}

export function toggleDebugMenu() {
  const menu = document.getElementById('debug-menu');
  if (!menu) return;
  const isHidden = menu.classList.contains('hidden');
  if (isHidden) {
    // Hide settings menu if open
    document.getElementById('settings-menu')?.classList.add('hidden');
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

export function updateDebugDiagnostics(dt) {
  const fps = Math.round(1 / (dt || 0.016));
  const numSprites = sprites.length;
  const numParticles = particles.length;
  const debugFpsCounter = document.getElementById('debug-fps-counter');
  if (debugFpsCounter) {
    debugFpsCounter.innerText = `FPS: ${fps} | SPRITES: ${numSprites} | PARTICLES: ${numParticles}`;
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
  const mapWInput = document.getElementById('dbg-input-mapw');
  const mapHInput = document.getElementById('dbg-input-maph');

  if (document.activeElement !== hpInput && hpInput) hpInput.value = Player.health;
  if (document.activeElement !== ammoInput && ammoInput) ammoInput.value = Player.ammo;
  if (document.activeElement !== shieldInput && shieldInput) shieldInput.value = Player.shield;
  if (document.activeElement !== floorInput && floorInput) floorInput.value = Player.floor;
  if (document.activeElement !== mapWInput && mapWInput) mapWInput.value = DebugCheats.customWidth || '';
  if (document.activeElement !== mapHInput && mapHInput) mapHInput.value = DebugCheats.customHeight || '';
}

export function setupDebugMenu() {
  // Settings toggle button
  document.getElementById('btn-settings-toggle').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSettingsMenu();
  });

  // Secret gear click mechanism (5 clicks triggers debug menu)
  let gearClickCount = 0;
  document.getElementById('secret-gear-icon').addEventListener('click', (e) => {
    e.stopPropagation();
    gearClickCount++;
    if (gearClickCount >= 5) {
      gearClickCount = 0;
      SoundEngine.play('elevator');
      showHudFlashMessage("DEVELOPER DIAGNOSTICS UNLOCKED");
      toggleDebugMenu();
    } else {
      SoundEngine.play('click');
    }
  });

  // Settings menu volume bindings
  document.getElementById('settings-volume-sfx').addEventListener('input', (e) => {
    SoundEngine.setVolume(parseFloat(e.target.value), SoundEngine.musicVolume);
  });
  document.getElementById('settings-volume-music').addEventListener('input', (e) => {
    const nextVol = parseFloat(e.target.value);
    const wasMuted = SoundEngine.musicVolume <= 0.001;
    SoundEngine.setVolume(SoundEngine.sfxVolume, nextVol);
    if (wasMuted && nextVol > 0.001 && activeScreen === 'game') {
      SoundEngine.startMusic();
    }
  });

  // Toggle debug cheats
  document.getElementById('dbg-godmode').addEventListener('change', (e) => {
    DebugCheats.godMode = e.target.checked;
  });
  document.getElementById('dbg-noclip').addEventListener('change', (e) => {
    DebugCheats.noclip = e.target.checked;
  });

  // Quick Action cheats
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

  // Give keycards cheats
  document.getElementById('dbg-btn-give-redkey').addEventListener('click', () => {
    Player.hasRedKey = true;
    updateHUD();
    SoundEngine.play('pickup_item');
    showHudFlashMessage("CHEATED RED KEYCARD");
  });
  document.getElementById('dbg-btn-give-bluekey').addEventListener('click', () => {
    Player.hasBlueKey = true;
    updateHUD();
    SoundEngine.play('pickup_item');
    showHudFlashMessage("CHEATED BLUE KEYCARD");
  });

  // Spawners & Level controls
  document.getElementById('dbg-btn-spawnenemy').addEventListener('click', () => {
    sprites.push({
      type: 'enemy',
      subtype: 'guard',
      x: Player.x + Player.dirX * 1.5,
      y: Player.y + Player.dirY * 1.5,
      health: 50 + Player.floor * 15,
      maxHp: 50 + Player.floor * 15,
      state: 'chase',
      speed: 1.2 + Math.min(Player.floor * 0.15, 1.2),
      shootCooldown: 0,
      animTimer: 0,
      animFrame: 0,
      texture: 7,
      solid: true
    });
    Player.maxKills++;
    SoundEngine.play('enemy_alert');
  });

  document.getElementById('dbg-btn-spawnghoul').addEventListener('click', () => {
    sprites.push({
      type: 'enemy',
      subtype: 'ghoul',
      x: Player.x + Player.dirX * 1.5,
      y: Player.y + Player.dirY * 1.5,
      health: 30 + Player.floor * 8,
      maxHp: 30 + Player.floor * 8,
      state: 'chase',
      speed: 1.9 + Player.floor * 0.1,
      shootCooldown: 0,
      animTimer: 0,
      animFrame: 0,
      texture: 19,
      solid: true
    });
    Player.maxKills++;
    SoundEngine.play('enemy_alert');
  });

  document.getElementById('dbg-btn-spawnheavy').addEventListener('click', () => {
    sprites.push({
      type: 'enemy',
      subtype: 'heavy',
      x: Player.x + Player.dirX * 1.5,
      y: Player.y + Player.dirY * 1.5,
      health: 130 + Player.floor * 30,
      maxHp: 130 + Player.floor * 30,
      state: 'chase',
      speed: 0.8,
      shootCooldown: 0,
      animTimer: 0,
      animFrame: 0,
      texture: 24,
      solid: true
    });
    Player.maxKills++;
    SoundEngine.play('enemy_alert');
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

  document.getElementById('dbg-btn-revealmap').addEventListener('click', () => {
    if (visitedMap && visitedMap.length > 0) {
      for (let y = 0; y < MapHeight; y++) {
        visitedMap[y].fill(true);
      }
      SoundEngine.play('pickup_item');
    }
  });

  document.getElementById('dbg-btn-clearfloor').addEventListener('click', () => {
    toggleDebugMenu();
    handleFloorComplete();
  });

  document.getElementById('dbg-btn-reset-upgrades').addEventListener('click', () => {
    UPGRADE_POOL.forEach(up => {
      Player.upgrades[up.id] = 0;
      updateUpgradeCountDisplay(up.id);
    });
    SoundEngine.play('hurt');
  });

  // Custom player/map inputs
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
  document.getElementById('dbg-input-mapw').addEventListener('input', (e) => {
    DebugCheats.customWidth = parseInt(e.target.value) || 0;
  });
  document.getElementById('dbg-input-maph').addEventListener('input', (e) => {
    DebugCheats.customHeight = parseInt(e.target.value) || 0;
  });
}
