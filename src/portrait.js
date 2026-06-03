/**
 * Portrait Module for Grave Escape 3D.
 * Dynamically draws the retro pixel marine face with animations responding to health and actions.
 */

let canvas = null;
let pCtx = null;

export function initPortrait() {
  canvas = document.getElementById('portrait-canvas');
  if (canvas) {
    pCtx = canvas.getContext('2d');
  }
}

export function renderPortrait(player) {
  if (!pCtx || !canvas) return;

  const w = canvas.width;
  const h = canvas.height;

  // Clear
  pCtx.fillStyle = '#22232b';
  pCtx.fillRect(0, 0, w, h);

  // Background lighting ring
  pCtx.fillStyle = '#4a4d5e';
  pCtx.beginPath();
  pCtx.arc(w/2, h/2, 26, 0, Math.PI * 2);
  pCtx.fill();

  const hp = player.health;
  const t = performance.now();

  if (hp <= 0) {
    // DEAD FACE
    pCtx.fillStyle = '#7a7e93'; // Skin
    pCtx.fillRect(16, 16, 32, 32);
    pCtx.fillStyle = '#000'; // Dead eyes
    pCtx.fillRect(20, 24, 6, 4);
    pCtx.fillRect(38, 24, 6, 4);
    pCtx.fillStyle = '#ff3333'; // Blood tears
    pCtx.fillRect(22, 28, 2, 8);
    pCtx.fillRect(40, 28, 2, 8);
    pCtx.fillStyle = '#000'; // Open mouth
    pCtx.fillRect(24, 38, 16, 6);
    return;
  }

  // DETERMINED FACE
  // Skin tone
  pCtx.fillStyle = (hp < 30) ? '#e6a6a6' : '#ffd0a6';
  pCtx.fillRect(16, 14, 32, 34);

  // Hair (high-and-tight marine)
  pCtx.fillStyle = '#111';
  pCtx.fillRect(16, 12, 32, 8);
  pCtx.fillRect(14, 16, 4, 16);
  pCtx.fillRect(46, 16, 4, 16);

  // Eyes (looking around based on time)
  const lookOffset = Math.floor(Math.sin(t * 0.001) * 2);
  pCtx.fillStyle = '#fff';
  pCtx.fillRect(20, 22, 6, 4);
  pCtx.fillRect(38, 22, 6, 4);
  pCtx.fillStyle = '#417aa3'; // Pupil
  pCtx.fillRect(22 + lookOffset, 22, 3, 4);
  pCtx.fillRect(40 + lookOffset, 22, 3, 4);

  // Brows
  pCtx.fillStyle = '#111';
  pCtx.fillRect(18, 20, 10, 2);
  pCtx.fillRect(36, 20, 10, 2);

  // Nose
  pCtx.fillStyle = '#cca07c';
  pCtx.fillRect(30, 26, 4, 6);

  // Mouth
  pCtx.fillStyle = '#b84d4d';
  if (player.isShooting) {
    pCtx.fillStyle = '#fff'; // teeth
    pCtx.fillRect(24, 36, 16, 4);
    pCtx.fillStyle = '#000';
    pCtx.fillRect(24, 38, 16, 2);
  } else if (hp < 40) {
    // Grimace
    pCtx.fillRect(26, 38, 12, 2);
    pCtx.fillRect(24, 36, 2, 2);
    pCtx.fillRect(38, 36, 2, 2);
  } else {
    pCtx.fillRect(26, 37, 12, 2);
  }

  // Damage splatters
  if (hp < 75) {
    pCtx.fillStyle = '#800'; // Bruise
    pCtx.fillRect(18, 28, 4, 4);
  }
  if (hp < 45) {
    pCtx.fillStyle = '#ff3333'; // Cuts
    pCtx.fillRect(36, 16, 2, 6);
    pCtx.fillRect(20, 32, 6, 2);
  }
  if (hp < 25) {
    pCtx.fillStyle = '#ff0000'; // Head wound
    pCtx.fillRect(24, 18, 4, 8);
  }
}
