/**
 * Raycaster Render Engine Module for Grave Escape 3D.
 * Performs DDA ray projection, z-buffered sprite billboard rendering, particle updates, and minimap HUD drawing.
 * Supports locked door textures and 3D floating damage text particles.
 */

import { map, visitedMap, sprites, particles, MapWidth, MapHeight } from './map.js';
import { texturesCanvas, TILE_SIZE } from './textures.js';

let canvas = null;
let ctx = null;
let screenWidth = 320;
let screenHeight = 200;
let ZBuffer = [];

export function initRaycaster(gameCanvas) {
  canvas = gameCanvas;
  ctx = canvas.getContext('2d', { alpha: false });
  screenWidth = canvas.width;
  screenHeight = canvas.height;
}

export function render3D(player, weapons, keys) {
  if (!ctx) return;

  // Clear viewport
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0, 0, screenWidth, screenHeight);

  // 1. Draw ceiling and floor gradients
  const gradCeiling = ctx.createLinearGradient(0, 0, 0, screenHeight/2);
  gradCeiling.addColorStop(0, '#0a0d1a');
  gradCeiling.addColorStop(1, '#000000');
  ctx.fillStyle = gradCeiling;
  ctx.fillRect(0, 0, screenWidth, screenHeight/2);

  const gradFloor = ctx.createLinearGradient(0, screenHeight/2, 0, screenHeight);
  gradFloor.addColorStop(0, '#080808');
  gradFloor.addColorStop(1, '#1b1b1e');
  ctx.fillStyle = gradFloor;
  ctx.fillRect(0, screenHeight/2, screenWidth, screenHeight/2);

  // Initialize zBuffer
  ZBuffer = [];

  // 2. WALL RENDERING (Raycasting Loop)
  for (let x = 0; x < screenWidth; x++) {
    // Calculate ray position and direction
    const cameraX = 2 * x / screenWidth - 1; // x in camera space
    const rayDirX = player.dirX + player.planeX * cameraX;
    const rayDirY = player.dirY + player.planeY * cameraX;

    // Current tile coordinates
    let mapX = Math.floor(player.x);
    let mapY = Math.floor(player.y);

    // Length of ray from current position to next x or y-side
    let sideDistX, sideDistY;

    // Length of ray from one side to next in x or y direction
    const deltaDistX = Math.abs(1 / rayDirX);
    const deltaDistY = Math.abs(1 / rayDirY);
    let perpWallDist;

    // DDA stepping variables
    let stepX, stepY;
    let hit = 0; // Was wall hit?
    let side = 0; // N/S or E/W wall?

    // Calculate DDA step and initial sideDist
    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (player.x - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1.0 - player.x) * deltaDistX;
    }
    
    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (player.y - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1.0 - player.y) * deltaDistY;
    }

    // Perform DDA
    while (hit === 0) {
      // Jump to next map square, either in x-direction or in y-direction
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }

      // Bounds validation
      if (mapX < 0 || mapX >= MapWidth || mapY < 0 || mapY >= MapHeight) {
        hit = 1;
        break;
      }

      // Check if ray hit a wall
      if (map[mapY][mapX] > 0) {
        hit = map[mapY][mapX];
      }
    }

    // Calculate distance projected on camera direction (removes fisheye distortion)
    if (side === 0) {
      perpWallDist = (sideDistX - deltaDistX);
    } else {
      perpWallDist = (sideDistY - deltaDistY);
    }

    // Avoid infinite height wall spikes or division by zero
    if (perpWallDist < 0.1) perpWallDist = 0.1;

    // Set Z-Buffer for sprite projection clipping later
    ZBuffer[x] = perpWallDist;

    // Calculate height of wall slice to draw on screen
    const lineHeight = Math.floor(screenHeight / perpWallDist);

    // Calculate lowest and highest pixel to fill in current stripe
    let drawStart = -lineHeight / 2 + screenHeight / 2;
    let drawEnd = lineHeight / 2 + screenHeight / 2;

    // Wall Texture coordinates
    let texNum = hit - 1; // 0-based index mapped to generateTextures output
    if (hit === 4) {
      texNum = 3; // Elevator exit door uses elevator doors texture
    } else if (hit === 5) {
      texNum = 15; // Red locked door
    } else if (hit === 6) {
      texNum = 16; // Blue locked door
    }
    
    // Exact horizontal hit position on wall
    let wallX;
    if (side === 0) {
      wallX = player.y + perpWallDist * rayDirY;
    } else {
      wallX = player.x + perpWallDist * rayDirX;
    }
    wallX -= Math.floor(wallX);

    // x coordinate on the texture
    let texX = Math.floor(wallX * TILE_SIZE);
    if (side === 0 && rayDirX > 0) texX = TILE_SIZE - texX - 1;
    if (side === 1 && rayDirY < 0) texX = TILE_SIZE - texX - 1;

    // Ensure within texture sheet column bounds
    const srcX = (texNum * TILE_SIZE) + texX;

    // Draw textured slice
    ctx.drawImage(
      texturesCanvas, 
      srcX, 0, 1, TILE_SIZE,
      x, drawStart, 1, drawEnd - drawStart
    );

    // 3. Directional Shading and Fog Depth Tinting
    let opacity = 0;
    
    // Depth Fog: Further walls fade to black
    const maxFogDist = 12.0;
    opacity += Math.min(1.0, perpWallDist / maxFogDist);

    // Side Shading (makes side walls darker to emphasize lighting)
    if (side === 1) {
      opacity += 0.3; // dark side shadow
    }

    if (opacity > 0) {
      ctx.fillStyle = `rgba(10,10,12,${Math.min(1.0, opacity)})`;
      ctx.fillRect(x, drawStart, 1, drawEnd - drawStart);
    }
  }

  // 4. SPRITE (BILLBOARD) RENDERING
  // Distance sort sprites (farthest first)
  const sortedSprites = sprites
    .map((s, idx) => ({ sprite: s, dist: ((player.x - s.x) * (player.x - s.x) + (player.y - s.y) * (player.y - s.y)) }))
    .sort((a, b) => b.dist - a.dist);

  sortedSprites.forEach(({ sprite }) => {
    let texNum = sprite.texture;
    
    if (sprite.type === 'enemy') {
      const animOffset = (sprite.subtype === 'ghoul') ? 19 : (sprite.subtype === 'heavy' ? 24 : 7);
      
      if (sprite.state === 'dead') {
        texNum = animOffset + 4; // Dead frame
      } else if (sprite.state === 'hurt') {
        texNum = animOffset + 3; // Hurt frame
      } else if (sprite.state === 'shoot') {
        texNum = animOffset + 2; // Shoot/Attack frame
      } else {
        texNum = animOffset + sprite.animFrame; // Walk loops
      }
    }

    // Relative coordinates to player
    const spriteX = sprite.x - player.x;
    const spriteY = sprite.y - player.y;

    // Transform sprite with inverse camera matrix
    const invDet = 1.0 / (player.planeX * player.dirY - player.dirX * player.planeY);
    const transformX = invDet * (player.dirY * spriteX - player.dirX * spriteY);
    const transformY = invDet * (-player.planeY * spriteX + player.planeX * spriteY); // depth

    // If behind player, don't draw
    if (transformY <= 0.05) return;

    // Screen projection details
    const spriteScreenX = Math.floor((screenWidth / 2) * (1 + transformX / transformY));
    const spriteHeight = Math.abs(Math.floor(screenHeight / transformY));
    const spriteWidth = spriteHeight;

    let drawStartY = Math.floor(-spriteHeight / 2 + screenHeight / 2);
    let drawEndY = Math.floor(spriteHeight / 2 + screenHeight / 2);

    let drawStartX = Math.floor(-spriteWidth / 2 + spriteScreenX);
    let drawEndX = Math.floor(spriteWidth / 2 + spriteScreenX);

    // Draw vertical columns
    for (let stripe = Math.max(0, drawStartX); stripe < Math.min(screenWidth, drawEndX); stripe++) {
      if (transformY < ZBuffer[stripe]) {
        const texX = Math.floor(256 * (stripe - (-spriteWidth / 2 + spriteScreenX)) * TILE_SIZE / spriteWidth) / 256;
        const srcX = (texNum * TILE_SIZE) + Math.max(0, Math.min(TILE_SIZE - 1, texX));

        ctx.drawImage(
          texturesCanvas,
          srcX, 0, 1, TILE_SIZE,
          stripe, drawStartY, 1, drawEndY - drawStartY
        );

        // Shading overlay
        const maxFogDist = 12.0;
        const opacity = Math.min(1.0, transformY / maxFogDist);
        if (opacity > 0) {
          ctx.fillStyle = `rgba(10,10,12,${opacity})`;
          ctx.fillRect(stripe, drawStartY, 1, drawEndY - drawStartY);
        }
      }
    }
  });

  // 5. 3D PARTICLE SYSTEMS
  particles.forEach((p) => {
    const spriteX = p.x - player.x;
    const spriteY = p.y - player.y;

    const invDet = 1.0 / (player.planeX * player.dirY - player.dirX * player.planeY);
    const transformX = invDet * (player.dirY * spriteX - player.dirX * spriteY);
    const transformY = invDet * (-player.planeY * spriteX + player.planeX * spriteY);

    if (transformY <= 0.05) return;

    const spriteScreenX = Math.floor((screenWidth / 2) * (1 + transformX / transformY));
    const heightOffset = Math.floor(p.z * screenHeight / transformY);
    const spriteScreenY = Math.floor(screenHeight / 2 + heightOffset);
    const size = Math.abs(Math.floor(p.size * screenHeight / transformY));

    if (spriteScreenX >= 0 && spriteScreenX < screenWidth && transformY < ZBuffer[spriteScreenX]) {
      if (p.text) {
        // Render floating 3D text (damage numbers)
        ctx.save();
        const fontSize = Math.max(6, Math.floor(10 / transformY));
        ctx.font = `${fontSize}px 'Press Start 2P', monospace`;
        ctx.textAlign = 'center';
        
        // Draw drop-shadow
        ctx.fillStyle = '#000000';
        ctx.fillText(p.text, spriteScreenX + 1, spriteScreenY - heightOffset + 1);
        
        // Draw main colored text
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, spriteScreenX, spriteScreenY - heightOffset);
        ctx.restore();
      } else {
        // Draw standard physical pixel particle
        ctx.fillStyle = p.color;
        ctx.fillRect(
          spriteScreenX - size/2,
          spriteScreenY - size/2,
          size, size
        );
      }
    }
  });

  // 6. DRAW RETRO CROSSHAIR
  ctx.fillStyle = 'rgba(0, 255, 0, 0.5)';
  ctx.fillRect(screenWidth/2 - 4, screenHeight/2 - 1, 8, 2);
  ctx.fillRect(screenWidth/2 - 1, screenHeight/2 - 4, 2, 8);

  // 7. DRAW RETRO RADAR MINIMAP
  drawMinimap(player);

  // 8. WEAPON OVERLAY (Render on viewport bottom)
  const currentWeap = weapons[player.currentWeapon];
  const weapTexOffset = (12 + player.currentWeapon) * TILE_SIZE;
  
  let frame = 0;
  if (player.isShooting) {
    if (player.shootFrame === 1) frame = TILE_SIZE / 2;
    else if (player.shootFrame === 2) frame = TILE_SIZE / 2 * -1;
  }

  const weapSize = Math.floor(screenHeight * currentWeap.scale);
  const weapX = screenWidth / 2 - weapSize / 2 + (Math.sin(performance.now() * 0.015) * (keys.w || keys.s ? 4 : 0)); // Swaying
  const weapY = screenHeight - weapSize + (player.isShooting ? 16 : 0); // Recoil dip

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    texturesCanvas,
    weapTexOffset, 0, TILE_SIZE, TILE_SIZE,
    weapX, weapY, weapSize, weapSize
  );
  ctx.restore();
}

function drawMinimap(player) {
  if (!visitedMap || visitedMap.length === 0) return;

  const maxDim = Math.max(MapWidth, MapHeight);
  const targetSize = 90; // Minimap largest side will be 90px
  const tileSize = targetSize / maxDim;
  const mapWidthSize = MapWidth * tileSize;
  const mapHeightSize = MapHeight * tileSize;
  const offsetX = 8;
  const offsetY = 8;

  // 1. Background panel
  ctx.fillStyle = 'rgba(10, 10, 12, 0.7)';
  ctx.fillRect(offsetX, offsetY, mapWidthSize, mapHeightSize);

  ctx.strokeStyle = 'rgba(74, 77, 94, 0.6)';
  ctx.lineWidth = 1;
  ctx.strokeRect(offsetX, offsetY, mapWidthSize, mapHeightSize);

  // 2. Draw map cells
  for (let y = 0; y < MapHeight; y++) {
    for (let x = 0; x < MapWidth; x++) {
      if (!visitedMap[y] || !visitedMap[y][x]) continue;

      const tile = map[y][x];
      const tx = offsetX + x * tileSize;
      const ty = offsetY + y * tileSize;

      if (tile > 0) {
        if (tile === 4) {
          const pulse = Math.sin(performance.now() * 0.01) * 0.25 + 0.75;
          ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
        } else if (tile === 5) {
          // Locked Red Door map representation
          ctx.fillStyle = '#ff3333';
        } else if (tile === 6) {
          // Locked Blue Door map representation
          ctx.fillStyle = '#33a6ff';
        } else {
          ctx.fillStyle = '#4a4d5e';
        }
        ctx.fillRect(tx, ty, tileSize, tileSize);
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
        ctx.fillRect(tx, ty, tileSize, tileSize);
      }
    }
  }

  // 3. Draw items and enemies inside visited tiles
  sprites.forEach(s => {
    const sx = Math.floor(s.x);
    const sy = Math.floor(s.y);
    if (sx >= 0 && sx < MapWidth && sy >= 0 && sy < MapHeight && visitedMap[sy][sx]) {
      const tx = offsetX + s.x * tileSize;
      const ty = offsetY + s.y * tileSize;

      if (s.type === 'enemy' && s.state !== 'dead') {
        ctx.fillStyle = '#ff3333';
        ctx.fillRect(tx - 0.5, ty - 0.5, 1.5, 1.5);
      } else if (s.type === 'medkit' || s.type === 'ammo') {
        ctx.fillStyle = '#33ff33';
        ctx.fillRect(tx - 0.5, ty - 0.5, 1.5, 1.5);
      } else if (s.type === 'key_red') {
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(tx - 0.5, ty - 0.5, 2.0, 2.0);
      } else if (s.type === 'key_blue') {
        ctx.fillStyle = '#3498db';
        ctx.fillRect(tx - 0.5, ty - 0.5, 2.0, 2.0);
      }
    }
  });

  // 4. Draw Player
  const px = offsetX + player.x * tileSize;
  const py = offsetY + player.y * tileSize;
  
  ctx.fillStyle = '#33ff33';
  ctx.fillRect(px - 1, py - 1, 2, 2);

  ctx.strokeStyle = '#33ff33';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + player.dirX * 3.5, py + player.dirY * 3.5);
  ctx.stroke();
}
