/**
 * Controls & Input Binding Module for Grave Escape 3D.
 * Registers input listeners for keyboard, mouse, scroll wheel, touchscreen gestures,
 * and DPAD mobile buttons, translating them to player rotation and movement states.
 */

import { Player, Weapons, keys, activeScreen, showScreen, updateLeaderboardsUI, switchLeaderboardTab } from './main.js';
import { generateFloor } from './map.js';
import { SoundEngine } from './audio.js';
import { handleShoot } from './combat.js';
import { toggleSettingsMenu, toggleDebugMenu, DebugCheats } from './settings.js';
import { saveLocalScore, submitGlobalScore } from './leaderboard.js';

export let mouseSensitivity = 0.0025;

export function rotateCamera(angle) {
  const oldDirX = Player.dirX;
  Player.dirX = Player.dirX * Math.cos(angle) - Player.dirY * Math.sin(angle);
  Player.dirY = oldDirX * Math.sin(angle) + Player.dirY * Math.cos(angle);
  
  const oldPlaneX = Player.planeX;
  Player.planeX = Player.planeX * Math.cos(angle) - Player.planeY * Math.sin(angle);
  Player.planeY = oldPlaneX * Math.sin(angle) + Player.planeY * Math.cos(angle);
}

export function setupControls(canvas) {
  canvas.addEventListener('click', () => {
    const isDebugVisible = !document.getElementById('debug-menu').classList.contains('hidden');
    const isSettingsVisible = !document.getElementById('settings-menu').classList.contains('hidden');
    if (activeScreen === 'game' && !isDebugVisible && !isSettingsVisible) {
      canvas.requestPointerLock();
    }
  });

  document.addEventListener('mousemove', (e) => {
    const isDebugVisible = !document.getElementById('debug-menu').classList.contains('hidden');
    const isSettingsVisible = !document.getElementById('settings-menu').classList.contains('hidden');
    if (document.pointerLockElement === canvas && activeScreen === 'game' && !isDebugVisible && !isSettingsVisible) {
      rotateCamera(e.movementX * mouseSensitivity);
    }
  });

  window.addEventListener('keydown', (e) => {
    const isDebugVisible = !document.getElementById('debug-menu').classList.contains('hidden');
    const isSettingsVisible = !document.getElementById('settings-menu').classList.contains('hidden');
    
    if (e.key === 'Escape') {
      if (isDebugVisible) {
        toggleDebugMenu();
        e.preventDefault();
        return;
      } else {
        toggleSettingsMenu();
        e.preventDefault();
        return;
      }
    }

    if (isDebugVisible || isSettingsVisible) return;

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
    const isSettingsVisible = !document.getElementById('settings-menu').classList.contains('hidden');
    if (activeScreen !== 'game' || isDebugVisible || isSettingsVisible) return;
    if (e.deltaY > 0) {
      Player.currentWeapon = (Player.currentWeapon + 1) % Weapons.length;
    } else {
      Player.currentWeapon = (Player.currentWeapon - 1 + Weapons.length) % Weapons.length;
    }
    SoundEngine.play('click');
  });

  canvas.addEventListener('mousedown', (e) => {
    const isDebugVisible = !document.getElementById('debug-menu').classList.contains('hidden');
    const isSettingsVisible = !document.getElementById('settings-menu').classList.contains('hidden');
    if (e.button === 0 && activeScreen === 'game' && !isDebugVisible && !isSettingsVisible) {
      handleShoot();
    }
  });

  // Buttons Bindings
  document.getElementById('btn-start').addEventListener('click', () => {
    SoundEngine.init();
    SoundEngine.play('click');
    SoundEngine.startMusic();
    Player.reset();
    generateFloor(Player, DebugCheats.customWidth, DebugCheats.customHeight);
    showScreen('game-screen');
    canvas.requestPointerLock?.();
  });

  document.getElementById('btn-next-floor').addEventListener('click', () => {
    SoundEngine.play('click');
    Player.floor++;
    generateFloor(Player, DebugCheats.customWidth, DebugCheats.customHeight);
    showScreen('game-screen');
    canvas.requestPointerLock?.();
  });

  document.getElementById('btn-restart').addEventListener('click', () => {
    SoundEngine.play('click');
    SoundEngine.startMusic();
    Player.reset();
    generateFloor(Player, DebugCheats.customWidth, DebugCheats.customHeight);
    showScreen('game-screen');
    canvas.requestPointerLock?.();
  });

  // Settings Menu Buttons Bindings
  document.getElementById('settings-btn-resume').addEventListener('click', () => {
    toggleSettingsMenu();
    SoundEngine.play('click');
  });

  document.getElementById('settings-btn-restart').addEventListener('click', () => {
    toggleSettingsMenu();
    SoundEngine.play('click');
    SoundEngine.startMusic();
    Player.reset();
    generateFloor(Player, DebugCheats.customWidth, DebugCheats.customHeight);
    showScreen('game-screen');
    canvas.requestPointerLock?.();
  });

  // High Scores Submission Listener
  document.getElementById('btn-submit-score').addEventListener('click', () => {
    const nameInput = document.getElementById('arcade-name-input');
    const name = nameInput.value.trim().toUpperCase() || 'AAA';
    
    // Save locally
    saveLocalScore(name, Player.score, Player.floor, Player.totalKills);
    
    // Stub global submit
    submitGlobalScore(name, Player.score, Player.floor, Player.totalKills);

    // Refresh UI & switch back to start screen
    updateLeaderboardsUI();
    showScreen('start-screen');
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


}
