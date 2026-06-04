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

// Submodules
import { handleParticles } from './particles.js';
import { handleEnemyAI, handlePickups } from './combat.js';
import { setupControls, rotateCamera } from './controls.js';
import { setupDebugMenu, DebugCheats, updateDebugDiagnostics } from './settings.js';

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
  totalKills: 0,
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
    this.totalKills = 0;
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
  { name: 'Pistol', damage: 35, ammoCost: 1, cooldown: 350, sfx: 'shoot_pistol', scale: 0.35 },
  { name: 'Shotgun', damage: 100, ammoCost: 2, cooldown: 850, sfx: 'shoot_shotgun', scale: 0.44 },
  { name: 'Minigun', damage: 25, ammoCost: 1, cooldown: 120, sfx: 'shoot_minigun', scale: 0.52 }
];

// Keyboard handlers
export const keys = { w: false, a: false, s: false, d: false, q: false, e: false, space: false };

// Game states
export let activeScreen = 'start';
let lastTime = 0;
export let canvas = null;

// HUD warning flash banner states
export let hudFlashText = "";
export let hudFlashTimer = 0;

export function showHudFlashMessage(text) {
  hudFlashText = text;
  hudFlashTimer = 2.0; // 2 seconds duration
}

export function flashScreen(elemId, colorStr, duration) {
  const flash = document.getElementById(elemId);
  if (flash) {
    flash.style.backgroundColor = colorStr;
    setTimeout(() => {
      flash.style.backgroundColor = 'rgba(0,0,0,0)';
    }, duration);
  }
}

// =========================================================================
// HUD & STATE VIEW MANAGER
// =========================================================================
export function updateHUD() {
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

export function showScreen(screenId) {
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
export function handleGameOver() {
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
      FINAL SCORE: ${Player.score} PTS<br>
      HOSTILES ELIMINATED: ${Player.totalKills}<br><br>
      <span style="color:var(--primary-color);">REST IN PIECES IN THE CATACOMBS</span>
    `;
  }

  showScreen('gameover-screen');
}

export function handleFloorComplete() {
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

export function updateLeaderboardsUI() {
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
            <td>${s.kills || 0} K</td>
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
            <td>${s.kills || 0} K</td>
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

export function switchLeaderboardTab(tab) {
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

    // Check locked doors (Cell 5 represents Locked Red Door, Cell 6 locked Blue Door)
    // We check both directly in front of the player (facing requirement) and at the player's potential center as a fallback.
    let targetCell = 0;
    let targetCellX = 0;
    let targetCellY = 0;

    const frontX = Player.x + Player.dirX * 0.5;
    const frontY = Player.y + Player.dirY * 0.5;
    const frontCellX = Math.floor(frontX);
    const frontCellY = Math.floor(frontY);
    const frontCell = map[frontCellY] ? map[frontCellY][frontCellX] : 0;

    if (frontCell === 5 || frontCell === 6) {
      targetCell = frontCell;
      targetCellX = frontCellX;
      targetCellY = frontCellY;
    } else {
      const checkCellX = Math.floor(newX);
      const checkCellY = Math.floor(newY);
      const checkCell = map[checkCellY] ? map[checkCellY][checkCellX] : 0;
      if (checkCell === 5 || checkCell === 6) {
        targetCell = checkCell;
        targetCellX = checkCellX;
        targetCellY = checkCellY;
      }
    }

    if (targetCell === 5) { // Red Locked Door
      if (Player.hasRedKey) {
        map[targetCellY][targetCellX] = 0; // Unlock
        SoundEngine.play('elevator'); // slide sound
        showHudFlashMessage("RED DOOR UNLOCKED");
      } else {
        if (hudFlashText !== "RED KEYCARD REQUIRED!") {
          SoundEngine.play('click');
          showHudFlashMessage("RED KEYCARD REQUIRED!");
        }
      }
    } else if (targetCell === 6) { // Blue Locked Door
      if (Player.hasBlueKey) {
        map[targetCellY][targetCellX] = 0;
        SoundEngine.play('elevator');
        showHudFlashMessage("BLUE DOOR UNLOCKED");
      } else {
        if (hudFlashText !== "BLUE KEYCARD REQUIRED!") {
          SoundEngine.play('click');
          showHudFlashMessage("BLUE KEYCARD REQUIRED!");
        }
      }
    }

    const finalPos = checkCollisions(Player, newX, newY, DebugCheats);
    Player.x = finalPos.x;
    Player.y = finalPos.y;

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
  
  setupControls(canvas);
  setupDebugMenu();
  resizeGame();
  
  updateLeaderboardsUI();
  
  requestAnimationFrame(updateGame);
});
