/**
 * Texture Generator Module for Grave Escape 3D.
 * Dynamically draws retro chiptune sprites, tiles, and animations on a canvas sheet at runtime.
 */

export const TILE_SIZE = 64;
export const texturesCanvas = document.createElement('canvas');
texturesCanvas.width = TILE_SIZE * 30; // Expanded to 30 columns to fit keycards, doors, ghouls, elite guards
texturesCanvas.height = TILE_SIZE;
const texCtx = texturesCanvas.getContext('2d');

export function generateTextures() {
  // Clear
  texCtx.clearRect(0, 0, texturesCanvas.width, texturesCanvas.height);

  // Utility noise generator for texture roughness
  function applyNoise(xOffset, yOffset, w, h, opacity = 0.15) {
    for (let x = 0; x < w; x += 2) {
      for (let y = 0; y < h; y += 2) {
        if (Math.random() > 0.5) {
          texCtx.fillStyle = `rgba(255,255,255,${Math.random() * opacity})`;
        } else {
          texCtx.fillStyle = `rgba(0,0,0,${Math.random() * opacity})`;
        }
        texCtx.fillRect(xOffset + x, yOffset + y, 2, 2);
      }
    }
  }

  // TEXTURE 1: Steel Rivet Wall (Grey Sci-Fi Metal Panel)
  let o = 0 * TILE_SIZE;
  texCtx.fillStyle = '#5a5d6a';
  texCtx.fillRect(o, 0, TILE_SIZE, TILE_SIZE);
  // Panel borders
  texCtx.fillStyle = '#7a7e93';
  texCtx.fillRect(o, 0, TILE_SIZE, 4);
  texCtx.fillRect(o, 0, 4, TILE_SIZE);
  texCtx.fillStyle = '#393b45';
  texCtx.fillRect(o, TILE_SIZE - 4, TILE_SIZE, 4);
  texCtx.fillRect(o + TILE_SIZE - 4, 0, 4, TILE_SIZE);
  // Panels grooves
  texCtx.fillRect(o + TILE_SIZE/2 - 2, 0, 4, TILE_SIZE);
  texCtx.fillRect(o, TILE_SIZE/2 - 2, TILE_SIZE, 4);
  // Rivets
  const rivets = [
    [8, 8], [TILE_SIZE-8, 8], [8, TILE_SIZE-8], [TILE_SIZE-8, TILE_SIZE-8],
    [TILE_SIZE/2 - 8, TILE_SIZE/2 - 8], [TILE_SIZE/2 + 8, TILE_SIZE/2 + 8]
  ];
  rivets.forEach(([rx, ry]) => {
    texCtx.fillStyle = '#9aa1bd';
    texCtx.fillRect(o + rx - 2, ry - 2, 4, 4);
    texCtx.fillStyle = '#222';
    texCtx.fillRect(o + rx, ry, 2, 2);
  });
  applyNoise(o, 0, TILE_SIZE, TILE_SIZE, 0.12);

  // TEXTURE 2: Red Brick Wall
  o = 1 * TILE_SIZE;
  texCtx.fillStyle = '#7e3021';
  texCtx.fillRect(o, 0, TILE_SIZE, TILE_SIZE);
  // Mortar lines (vertical and horizontal)
  texCtx.fillStyle = '#1e1a18';
  for (let y = 0; y < TILE_SIZE; y += 8) {
    texCtx.fillRect(o, y, TILE_SIZE, 2);
    let offset = (y % 16 === 0) ? 0 : 8;
    for (let x = offset; x < TILE_SIZE; x += 16) {
      texCtx.fillRect(o + x, y, 2, 8);
    }
  }
  // Brick texture weathering
  for (let i = 0; i < 40; i++) {
    texCtx.fillStyle = '#a64432';
    texCtx.fillRect(o + Math.floor(Math.random() * (TILE_SIZE-4)), Math.floor(Math.random() * (TILE_SIZE-4)), 4, 2);
  }
  applyNoise(o, 0, TILE_SIZE, TILE_SIZE, 0.15);

  // TEXTURE 3: Blue Mossy Cyber Wall
  o = 2 * TILE_SIZE;
  texCtx.fillStyle = '#22384a';
  texCtx.fillRect(o, 0, TILE_SIZE, TILE_SIZE);
  // Circuit board cyber pattern
  texCtx.strokeStyle = '#417aa3';
  texCtx.lineWidth = 2;
  texCtx.beginPath();
  texCtx.moveTo(o + 10, 10); texCtx.lineTo(o + 10, 54);
  texCtx.lineTo(o + 30, 54); texCtx.lineTo(o + 54, 30);
  texCtx.lineTo(o + 54, 10);
  texCtx.stroke();
  // Glowing terminals
  texCtx.fillStyle = '#39ff33';
  texCtx.fillRect(o + 15, 20, 8, 6);
  texCtx.fillStyle = '#ff3333';
  texCtx.fillRect(o + 15, 30, 8, 6);
  // Moss spots
  for (let i = 0; i < 15; i++) {
    texCtx.fillStyle = 'rgba(51,255,51,0.3)';
    texCtx.fillRect(o + Math.random()*50, Math.random()*50, 6, 6);
  }
  applyNoise(o, 0, TILE_SIZE, TILE_SIZE, 0.15);

  // TEXTURE 4: Elevator Doors (Exit Tile)
  o = 3 * TILE_SIZE;
  texCtx.fillStyle = '#25262c';
  texCtx.fillRect(o, 0, TILE_SIZE, TILE_SIZE);
  // Yellow-black warning stripes on door frame
  texCtx.fillStyle = '#ffd700';
  for (let x = 0; x < TILE_SIZE; x += 8) {
    texCtx.beginPath();
    texCtx.moveTo(o + x, 0);
    texCtx.lineTo(o + x + 6, 0);
    texCtx.lineTo(o + x - 2, 8);
    texCtx.lineTo(o + x - 8, 8);
    texCtx.closePath();
    texCtx.fill();
    
    texCtx.beginPath();
    texCtx.moveTo(o + x, TILE_SIZE - 8);
    texCtx.lineTo(o + x + 6, TILE_SIZE - 8);
    texCtx.lineTo(o + x - 2, TILE_SIZE);
    texCtx.lineTo(o + x - 8, TILE_SIZE);
    texCtx.closePath();
    texCtx.fill();
  }
  // Steel elevator door seams
  texCtx.fillStyle = '#4a4d5e';
  texCtx.fillRect(o + 8, 8, TILE_SIZE - 16, TILE_SIZE - 16);
  texCtx.fillStyle = '#111';
  texCtx.fillRect(o + TILE_SIZE/2 - 2, 8, 4, TILE_SIZE - 16); // Center split
  // Big neon arrow indicator
  texCtx.fillStyle = '#33ff33';
  texCtx.beginPath();
  texCtx.moveTo(o + TILE_SIZE/2, 16);
  texCtx.lineTo(o + TILE_SIZE/2 - 12, 28);
  texCtx.lineTo(o + TILE_SIZE/2 - 5, 28);
  texCtx.lineTo(o + TILE_SIZE/2 - 5, 48);
  texCtx.lineTo(o + TILE_SIZE/2 + 5, 48);
  texCtx.lineTo(o + TILE_SIZE/2 + 5, 28);
  texCtx.lineTo(o + TILE_SIZE/2 + 12, 28);
  texCtx.closePath();
  texCtx.fill();
  applyNoise(o, 0, TILE_SIZE, TILE_SIZE, 0.1);

  // SPRITE 5: Column Decorative Pillar (Sprite Sheet)
  o = 4 * TILE_SIZE;
  let gradient = texCtx.createLinearGradient(o + 16, 0, o + 48, 0);
  gradient.addColorStop(0, '#111');
  gradient.addColorStop(0.3, '#8e94a5');
  gradient.addColorStop(0.5, '#dbe0ee');
  gradient.addColorStop(0.8, '#525564');
  gradient.addColorStop(1, '#111');
  texCtx.fillStyle = gradient;
  texCtx.fillRect(o + 16, 0, 32, TILE_SIZE);
  // Band decorations at top and bottom
  texCtx.fillStyle = '#ffaa00';
  texCtx.fillRect(o + 14, 8, 36, 6);
  texCtx.fillRect(o + 14, TILE_SIZE - 14, 36, 6);
  applyNoise(o + 16, 0, 32, TILE_SIZE, 0.1);

  // SPRITE 6: Medkit item
  o = 5 * TILE_SIZE;
  texCtx.fillStyle = '#fff';
  texCtx.fillRect(o + 16, 24, 32, 24); // Case
  texCtx.fillStyle = '#dcdcdc';
  texCtx.fillRect(o + 16, 44, 32, 4); // Shading
  texCtx.fillStyle = '#ff3333';
  // Red Cross
  texCtx.fillRect(o + 28, 30, 8, 12);
  texCtx.fillRect(o + 26, 32, 12, 8);
  // Handle
  texCtx.fillStyle = '#555';
  texCtx.fillRect(o + 26, 20, 12, 4);
  texCtx.clearRect(o + 28, 22, 8, 2); // Hole

  // SPRITE 7: Ammo box item
  o = 6 * TILE_SIZE;
  texCtx.fillStyle = '#1c331c';
  texCtx.fillRect(o + 16, 26, 32, 22); // Box
  texCtx.fillStyle = '#ffd700'; // Bullets
  for (let bx = 0; bx < 4; bx++) {
    texCtx.fillRect(o + 20 + bx * 6, 20, 4, 6);
  }
  texCtx.fillStyle = '#2d542d';
  texCtx.fillRect(o + 14, 28, 36, 4); // Lid
  applyNoise(o + 16, 26, 32, 22, 0.2);

  // SPRITE 8: Enemy - Walk Frame 1 (Front View)
  o = 7 * TILE_SIZE;
  drawEnemyFrame(o, 0);

  // SPRITE 9: Enemy - Walk Frame 2 (Alternating frame)
  o = 8 * TILE_SIZE;
  drawEnemyFrame(o, 1);

  // SPRITE 10: Enemy - Shooting Frame (Flashing gun)
  o = 9 * TILE_SIZE;
  drawEnemyFrame(o, 2);

  // SPRITE 11: Enemy - Hurt/Pain Frame (Flashing red)
  o = 10 * TILE_SIZE;
  drawEnemyFrame(o, 3);

  // SPRITE 12: Enemy - Dead Frame (Flattened corpse)
  o = 11 * TILE_SIZE;
  drawEnemyFrame(o, 4);
  
  // SPRITE 13: Weapon 1 - Pistol Sprite (HUD overlay)
  o = 12 * TILE_SIZE;
  drawWeaponGraphics(o, 0);

  // SPRITE 14: Weapon 2 - Shotgun Sprite
  o = 13 * TILE_SIZE;
  drawWeaponGraphics(o, 1);

  // SPRITE 15: Weapon 3 - Minigun Sprite
  o = 14 * TILE_SIZE;
  drawWeaponGraphics(o, 2);

  // =========================================================================
  // NEW SPRITES & TILES FOR THE EXPANSION FEATURES
  // =========================================================================

  // TEXTURE 16: Locked Red Door (index 15)
  o = 15 * TILE_SIZE;
  drawLockedDoor(o, '#a61c1c', '#ff5555');

  // TEXTURE 17: Locked Blue Door (index 16)
  o = 16 * TILE_SIZE;
  drawLockedDoor(o, '#1c4ea6', '#33a6ff');

  // SPRITE 18: Red Keycard (index 17)
  o = 17 * TILE_SIZE;
  drawKeycard(o, '#ff3333');

  // SPRITE 19: Blue Keycard (index 18)
  o = 18 * TILE_SIZE;
  drawKeycard(o, '#33a6ff');

  // SPRITES 20-24: Feral Ghoul Enemy Animation Frames (index 19-23)
  for (let f = 0; f < 5; f++) {
    drawGhoulFrame(19 * TILE_SIZE + f * TILE_SIZE, f);
  }

  // SPRITES 25-29: Heavy Elite Enemy Animation Frames (index 24-28)
  for (let f = 0; f < 5; f++) {
    drawHeavyFrame(24 * TILE_SIZE + f * TILE_SIZE, f);
  }
}

// Helper to draw pixelized enemies (Standard Green Guard)
function drawEnemyFrame(offset, frameType) {
  const c = texCtx;
  
  if (frameType === 4) {
    // DEAD/CORPSE
    c.fillStyle = '#800'; // Blood puddle
    c.beginPath();
    c.ellipse(offset + 32, 54, 26, 8, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#2b331c';
    c.fillRect(offset + 14, 48, 36, 8);
    c.fillStyle = '#ffd700'; // Visor helmet
    c.fillRect(offset + 8, 48, 10, 10);
    c.fillStyle = '#ffaa00'; // Boots
    c.fillRect(offset + 42, 50, 12, 6);
    return;
  }

  // Draw shadow
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath();
  c.ellipse(offset + 32, 58, 18, 5, 0, 0, Math.PI * 2);
  c.fill();

  // Pain flash overlay
  if (frameType === 3) {
    c.fillStyle = '#ff3333';
    c.fillRect(offset + 16, 8, 32, 50);
    return;
  }

  // Legs / Movement bounce
  let legOffset = (frameType === 1) ? 2 : 0;
  c.fillStyle = '#222';
  c.fillRect(offset + 20, 46 + legOffset, 8, 12);
  c.fillRect(offset + 36, 46 - legOffset, 8, 12);

  // Body armor (Green fatigues)
  c.fillStyle = '#3a4f28';
  c.fillRect(offset + 16, 20, 32, 26);
  c.fillStyle = '#212d17';
  c.fillRect(offset + 20, 24, 24, 18);

  // Head (Orange mask/cyber helmet)
  c.fillStyle = '#ffd700';
  c.fillRect(offset + 24, 6, 16, 14);
  c.fillStyle = '#ff3333'; // Visor
  c.fillRect(offset + 26, 10, 12, 4);

  // Arms & Weapon holding
  c.fillStyle = '#3a4f28';
  if (frameType === 2) {
    // Shooting frame
    c.fillRect(offset + 12, 24, 12, 10);
    c.fillRect(offset + 40, 24, 12, 10);
    c.fillStyle = '#777';
    c.fillRect(offset + 22, 28, 20, 8);
    c.fillStyle = '#ffd700'; // Muzzle flash
    c.fillRect(offset + 18, 24, 8, 16);
    c.fillRect(offset + 38, 24, 8, 16);
  } else {
    // Walking frames
    c.fillRect(offset + 10, 22 + legOffset, 8, 16);
    c.fillRect(offset + 46, 22 - legOffset, 8, 16);
    c.fillStyle = '#444'; // Gun carried
    c.fillRect(offset + 38, 32, 14, 8);
  }
}

// Helper to draw locked doors
function drawLockedDoor(offset, doorColor, detailColor) {
  const c = texCtx;
  // Steel base background panel
  c.fillStyle = '#25262c';
  c.fillRect(offset, 0, TILE_SIZE, TILE_SIZE);
  
  // Door borders
  c.fillStyle = '#4a4d5e';
  c.fillRect(offset, 0, TILE_SIZE, 6);
  c.fillRect(offset, 0, 6, TILE_SIZE);
  c.fillStyle = '#111';
  c.fillRect(offset, TILE_SIZE - 6, TILE_SIZE, 6);
  c.fillRect(offset + TILE_SIZE - 6, 0, 6, TILE_SIZE);
  
  // Locked central panel (Colored red or blue)
  c.fillStyle = doorColor;
  c.fillRect(offset + 12, 12, TILE_SIZE - 24, TILE_SIZE - 24);
  
  // Security keypad symbol
  c.fillStyle = '#111';
  c.fillRect(offset + 24, 20, 16, 24);
  c.fillStyle = detailColor; // Neon blinking indicator
  c.fillRect(offset + 28, 24, 8, 4);
  c.fillStyle = '#ffd700'; // Keypad yellow buttons
  c.fillRect(offset + 28, 32, 3, 3);
  c.fillRect(offset + 33, 32, 3, 3);
  c.fillRect(offset + 28, 37, 3, 3);
  c.fillRect(offset + 33, 37, 3, 3);
}

// Helper to draw keycard item sprite
function drawKeycard(offset, cardColor) {
  const c = texCtx;
  // Card base
  c.fillStyle = cardColor;
  c.fillRect(offset + 16, 20, 32, 24);
  
  // Magnetic stripe
  c.fillStyle = '#111';
  c.fillRect(offset + 16, 24, 32, 5);
  
  // Gold chip contact
  c.fillStyle = '#ffd700';
  c.fillRect(offset + 20, 32, 6, 6);
  
  // Hologram seal
  c.fillStyle = '#fff';
  c.fillRect(offset + 34, 33, 8, 4);
}

// Helper to draw ghoulish organic enemy frames
function drawGhoulFrame(offset, frameType) {
  const c = texCtx;
  
  if (frameType === 4) {
    // DEAD/CORPSE
    c.fillStyle = '#600'; // Blood puddle
    c.beginPath();
    c.ellipse(offset + 32, 56, 28, 6, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#4d3b54'; // Purple-grey remains
    c.fillRect(offset + 10, 50, 44, 8);
    c.fillStyle = '#a00';
    c.fillRect(offset + 20, 48, 6, 6);
    return;
  }

  // Shadow
  c.fillStyle = 'rgba(0,0,0,0.3)';
  c.beginPath();
  c.ellipse(offset + 32, 58, 16, 4, 0, 0, Math.PI * 2);
  c.fill();

  if (frameType === 3) {
    // HURT FLASH
    c.fillStyle = '#ff6666';
    c.fillRect(offset + 16, 12, 32, 46);
    return;
  }

  // Legs
  let legOffset = (frameType === 1) ? 2 : 0;
  c.fillStyle = '#1c1721';
  c.fillRect(offset + 20, 46 + legOffset, 8, 12);
  c.fillRect(offset + 36, 46 - legOffset, 8, 12);

  // Torso (Ghoulish ribcage / organic skin)
  c.fillStyle = '#4d3b54';
  c.fillRect(offset + 18, 24, 28, 22);
  c.fillStyle = '#785e82'; // Ribcage detail
  c.fillRect(offset + 22, 28, 20, 2);
  c.fillRect(offset + 24, 34, 16, 2);
  c.fillRect(offset + 26, 40, 12, 2);

  // Head (Feral ghoul)
  c.fillStyle = '#4d3b54';
  c.fillRect(offset + 24, 10, 16, 14);
  c.fillStyle = '#ffd700'; // Glowing yellow eyes
  c.fillRect(offset + 26, 14, 3, 3);
  c.fillRect(offset + 35, 14, 3, 3);
  
  // Jaw (open feral scream)
  c.fillStyle = '#111';
  c.fillRect(offset + 28, 20, 8, 4);

  // Feral claws (Ghoul attack reaches forward)
  c.fillStyle = '#785e82';
  if (frameType === 2) {
    // Attack frame - claws out front!
    c.fillRect(offset + 10, 24, 12, 6);
    c.fillRect(offset + 42, 24, 12, 6);
    c.fillStyle = '#a00'; // Blood dripping claws
    c.fillRect(offset + 8, 24, 2, 8);
    c.fillRect(offset + 54, 24, 2, 8);
  } else {
    // Walk frames - arms dangling
    c.fillRect(offset + 12, 24 + legOffset, 6, 16);
    c.fillRect(offset + 46, 24 - legOffset, 6, 16);
  }
}

// Helper to draw bulky Elite Guard frames
function drawHeavyFrame(offset, frameType) {
  const c = texCtx;

  if (frameType === 4) {
    // DEAD
    c.fillStyle = '#800'; // Blood
    c.beginPath();
    c.ellipse(offset + 32, 54, 30, 8, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#d35400'; // Bulk orange armor remains
    c.fillRect(offset + 12, 46, 40, 10);
    c.fillStyle = '#222';
    c.fillRect(offset + 24, 48, 16, 6);
    return;
  }

  // Shadow
  c.fillStyle = 'rgba(0,0,0,0.35)';
  c.beginPath();
  c.ellipse(offset + 32, 58, 20, 5, 0, 0, Math.PI * 2);
  c.fill();

  if (frameType === 3) {
    // HURT
    c.fillStyle = '#ffaa66';
    c.fillRect(offset + 12, 6, 40, 52);
    return;
  }

  // Legs (Thick black/grey pants)
  let legOffset = (frameType === 1) ? 2 : 0;
  c.fillStyle = '#2c3e50';
  c.fillRect(offset + 18, 44 + legOffset, 10, 14);
  c.fillRect(offset + 36, 44 - legOffset, 10, 14);

  // Bulky orange armor body
  c.fillStyle = '#d35400';
  c.fillRect(offset + 14, 18, 36, 26);
  c.fillStyle = '#222'; // Chest shield plate
  c.fillRect(offset + 18, 22, 28, 18);

  // Head (Enclosed dome helmet)
  c.fillStyle = '#d35400';
  c.fillRect(offset + 22, 4, 20, 14);
  c.fillStyle = '#00ffff'; // Neon cyan visor
  c.fillRect(offset + 24, 8, 16, 3);

  // Weapons (Heavy Elite carries a heavy blaster / minigun)
  c.fillStyle = '#222';
  if (frameType === 2) {
    // Shoot frame - firing dual barrels forward!
    c.fillRect(offset + 8, 24, 12, 8);
    c.fillRect(offset + 44, 24, 12, 8);
    c.fillStyle = '#7f8c8d'; // Gun barrels
    c.fillRect(offset + 16, 26, 32, 6);
    c.fillStyle = '#ff3333'; // Double red muzzle flash
    c.fillRect(offset + 12, 22, 8, 14);
    c.fillRect(offset + 44, 22, 8, 14);
  } else {
    // Walking frames - gun carried
    c.fillRect(offset + 10, 22 + legOffset, 8, 12);
    c.fillRect(offset + 46, 22 - legOffset, 8, 12);
    c.fillStyle = '#111';
    c.fillRect(offset + 34, 30, 18, 8);
  }
}

// Helper to draw retro HUD weapons
function drawWeaponGraphics(offset, type) {
  const c = texCtx;
  c.fillStyle = 'rgba(0,0,0,0)';
  c.fillRect(offset, 0, TILE_SIZE, TILE_SIZE);

  if (type === 0) {
    // PISTOL
    c.fillStyle = '#3a3a44';
    c.fillRect(offset + 24, 24, 16, 40);
    c.fillStyle = '#1c1c20';
    c.fillRect(offset + 28, 12, 8, 30);
    c.fillStyle = '#ffad87'; // Hands
    c.fillRect(offset + 18, 44, 28, 20);
  } else if (type === 1) {
    // SHOTGUN
    c.fillStyle = '#5c4033';
    c.fillRect(offset + 16, 36, 32, 28);
    c.fillStyle = '#4f525d';
    c.fillRect(offset + 22, 10, 8, 30);
    c.fillRect(offset + 34, 10, 8, 30);
    c.fillStyle = '#222';
    c.fillRect(offset + 20, 25, 24, 4);
    c.fillStyle = '#ffad87';
    c.fillRect(offset + 12, 48, 40, 16);
  } else if (type === 2) {
    // MINIGUN
    c.fillStyle = '#1a1a1a';
    c.fillRect(offset + 14, 30, 36, 34);
    c.fillStyle = '#555';
    c.fillRect(offset + 22, 4, 4, 28);
    c.fillRect(offset + 28, 4, 4, 28);
    c.fillRect(offset + 34, 4, 4, 28);
    c.fillStyle = '#ffd700'; // Ammo belt
    c.fillRect(offset + 6, 40, 12, 10);
    c.fillStyle = '#ffad87';
    c.fillRect(offset + 10, 50, 44, 14);
  }
}
