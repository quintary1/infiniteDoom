/**
 * Map Generator Module for Grave Escape 3D.
 * Handles procedural room building, hallway carving, entity placement, and box collisions.
 * Supports colored keycards, locked doors, and enemy subtypes (Ghouls, Heavy Guards).
 * Fully Debugged: Uses AABB non-overlapping rooms, small 3x3 locked alcoves, branch connectivity,
 * and a flood-fill reachability algorithm to guarantee deadlock-free keycard spawning.
 */

export let MapWidth = 24;
export let MapHeight = 24;
export let map = [];
export let visitedMap = [];
export let sprites = [];
export let particles = [];

// Helper to set map layout directly
export function setMapCell(x, y, value) {
  if (y >= 0 && y < MapHeight && x >= 0 && x < MapWidth) {
    map[y][x] = value;
  }
}

export function resetParticles() {
  particles.length = 0;
}

export function removeSprite(index) {
  sprites.splice(index, 1);
}

export function addSprite(sprite) {
  sprites.push(sprite);
}

// AABB Overlap test
function rectsOverlap(r1, r2) {
  return r1.x < r2.x + r2.w &&
         r1.x + r1.w > r2.x &&
         r1.y < r2.y + r2.h &&
         r1.y + r1.h > r2.y;
}

export function generateFloor(player, customWidth = 0, customHeight = 0) {
  // Randomize map dimensions between 20 and 40, unless overridden by debug cheats
  MapWidth = (customWidth >= 20 && customWidth <= 40) ? customWidth : 20 + Math.floor(Math.random() * 21);
  MapHeight = (customHeight >= 20 && customHeight <= 40) ? customHeight : 20 + Math.floor(Math.random() * 21);

  // 1. Build blank solid map
  map = [];
  visitedMap = [];
  for (let y = 0; y < MapHeight; y++) {
    map.push(new Array(MapWidth).fill(1)); // 1 is steel wall
    visitedMap.push(new Array(MapWidth).fill(false));
  }

  const rooms = [];
  
  // Helper to carve a room and push to the rooms list
  function carveRoom(rx, ry, rw, rh) {
    for (let x = rx; x < rx + rw; x++) {
      for (let y = ry; y < ry + rh; y++) {
        if (x >= 0 && x < MapWidth && y >= 0 && y < MapHeight) {
          map[y][x] = 0; // 0 is walkable path
        }
      }
    }
    rooms.push({ x: rx, y: ry, w: rw, h: rh, cx: rx + Math.floor(rw/2), cy: ry + Math.floor(rh/2) });
  }

  // 2. Generate random non-overlapping rooms
  const roomCount = 6 + Math.floor(Math.random() * 3);
  for (let i = 0; i < roomCount; i++) {
    // Force elevator room (last) and vault room (second-to-last) to be small 3x3 alcoves
    const isLockedRoom = (i === roomCount - 1 || i === roomCount - 2);
    const rw = isLockedRoom ? 3 : 4 + Math.floor(Math.random() * 4);
    const rh = isLockedRoom ? 3 : 4 + Math.floor(Math.random() * 4);
    
    let rx, ry, newRoom;
    let attempts = 0;
    let overlap = false;
    
    do {
      rx = 2 + Math.floor(Math.random() * (MapWidth - rw - 4));
      ry = 2 + Math.floor(Math.random() * (MapHeight - rh - 4));
      newRoom = { x: rx, y: ry, w: rw, h: rh };
      
      overlap = false;
      for (const r of rooms) {
        // Padded overlap check (ensures rooms never touch and are separated by wall margins)
        const paddedR = { x: r.x - 1, y: r.y - 1, w: r.w + 2, h: r.h + 2 };
        if (rectsOverlap(newRoom, paddedR)) {
          overlap = true;
          break;
        }
      }
      attempts++;
    } while (overlap && attempts < 100);
    
    if (!overlap) {
      carveRoom(rx, ry, rw, rh);
    }
  }

  // Fallback if room count is too low
  if (rooms.length < 3) {
    rooms.length = 0;
    carveRoom(2, 2, 5, 5);      // Room 0 (Start)
    carveRoom(10, 2, 4, 4);     // Room 1 (Main path)
    carveRoom(17, 10, 3, 3);    // Room 2 (Vault alcove)
    carveRoom(10, 17, 3, 3);    // Room 3 (Elevator alcove)
  }

  const elevatorRoom = rooms[rooms.length - 1];
  const vaultRoom = rooms[rooms.length - 2];

  // Helper to carve a hallway between two rooms
  function carveTunnel(r1, r2) {
    // Carve X tunnel
    let startX = Math.min(r1.cx, r2.cx);
    let endX = Math.max(r1.cx, r2.cx);
    for (let x = startX; x <= endX; x++) {
      map[r1.cy][x] = 0;
    }
    // Carve Y tunnel
    let startY = Math.min(r1.cy, r2.cy);
    let endY = Math.max(r1.cy, r2.cy);
    for (let y = startY; y <= endY; y++) {
      map[y][r2.cx] = 0;
    }
  }

  // 3. Connect rooms: Ensure locked rooms are dead-end branches off the main path
  // Main open path sequence (excludes vault room)
  const mainRooms = rooms.filter((r) => r !== vaultRoom);
  for (let i = 0; i < mainRooms.length - 1; i++) {
    carveTunnel(mainRooms[i], mainRooms[i + 1]);
  }

  // Connect the Vault Room (dead-end branch off an early main room)
  const vaultConnectionIndex = Math.floor(Math.random() * (mainRooms.length - 1)); // exclude elevator room
  const vaultParent = mainRooms[vaultConnectionIndex];
  carveTunnel(vaultRoom, vaultParent);

  // 4. Paint room variety (mix steel, bricks, cyber boards)
  for (let y = 1; y < MapHeight - 1; y++) {
    for (let x = 1; x < MapWidth - 1; x++) {
      if (map[y][x] === 1) {
        let rnd = Math.random();
        if (rnd < 0.2) map[y][x] = 2; // brick wall
        else if (rnd < 0.28) map[y][x] = 3; // blue cyber wall
      }
    }
  }

  // Ensure solid borders
  for (let x = 0; x < MapWidth; x++) {
    map[0][x] = 1;
    map[MapHeight - 1][x] = 1;
  }
  for (let y = 0; y < MapHeight; y++) {
    map[y][0] = 1;
    map[y][MapWidth - 1] = 1;
  }

  // 5. Place Exit Elevator
  const elevatorX = elevatorRoom.cx;
  const elevatorY = elevatorRoom.cy;
  map[elevatorY][elevatorX] = 4; // Elevator exit code

  // 6. Reset Player Position (Safely in Room 0 center)
  player.x = rooms[0].cx + 0.5;
  player.y = rooms[0].cy + 0.5;
  
  player.dirX = 1;
  player.dirY = 0;
  player.planeX = 0;
  player.planeY = 0.66;

  // Reset keys for the new floor
  player.hasRedKey = false;
  player.hasBlueKey = false;

  // 7. Clear old entities
  sprites.length = 0;
  particles.length = 0;

  // 8. Place Locked Doors (value 5: Red, value 6: Blue)
  // Red door blocks elevator room entrance
  let placedRedDoor = false;
  for (let x = elevatorRoom.x - 1; x <= elevatorRoom.x + elevatorRoom.w; x++) {
    for (let y = elevatorRoom.y - 1; y <= elevatorRoom.y + elevatorRoom.h; y++) {
      if (x === elevatorRoom.x - 1 || x === elevatorRoom.x + elevatorRoom.w || y === elevatorRoom.y - 1 || y === elevatorRoom.y + elevatorRoom.h) {
        if (y >= 0 && y < MapHeight && x >= 0 && x < MapWidth) {
          if (map[y][x] === 0) {
            map[y][x] = 5; // Red locked door
            placedRedDoor = true;
          }
        }
      }
    }
  }
  if (!placedRedDoor) {
    map[elevatorY][elevatorX - 1] = 5; // Fallback
  }

  // Blue door blocks vault room entrance
  let placedBlueDoor = false;
  for (let x = vaultRoom.x - 1; x <= vaultRoom.x + vaultRoom.w; x++) {
    for (let y = vaultRoom.y - 1; y <= vaultRoom.y + vaultRoom.h; y++) {
      if (x === vaultRoom.x - 1 || x === vaultRoom.x + vaultRoom.w || y === vaultRoom.y - 1 || y === vaultRoom.y + vaultRoom.h) {
        if (y >= 0 && y < MapHeight && x >= 0 && x < MapWidth) {
          if (map[y][x] === 0) {
            map[y][x] = 6; // Blue locked door
            placedBlueDoor = true;
          }
        }
      }
    }
  }
  if (!placedBlueDoor) {
    map[vaultRoom.cy][vaultRoom.cx - 1] = 6; // Fallback
  }

  // Spawn high value loot in the vault
  sprites.push({ type: 'medkit', x: vaultRoom.cx - 0.2, y: vaultRoom.cy - 0.2, texture: 5, value: 50 });
  sprites.push({ type: 'ammo', x: vaultRoom.cx + 0.2, y: vaultRoom.cy + 0.2, texture: 6, value: 60 });

  // 9. Run Flood-Fill reachability analysis to guarantee deadlock-free keycard placement
  const reachable = new Array(MapHeight).fill(0).map(() => new Array(MapWidth).fill(false));
  const queue = [{ x: Math.floor(player.x), y: Math.floor(player.y) }];
  reachable[queue[0].y][queue[0].x] = true;
  
  while (queue.length > 0) {
    const curr = queue.shift();
    const neighbors = [
      { x: curr.x + 1, y: curr.y },
      { x: curr.x - 1, y: curr.y },
      { x: curr.x, y: curr.y + 1 },
      { x: curr.x, y: curr.y - 1 }
    ];
    for (const n of neighbors) {
      if (n.x >= 0 && n.x < MapWidth && n.y >= 0 && n.y < MapHeight) {
        // Can only traverse walkable grid cells (0) that are not walls (1-3) or locked doors (5-6)
        if (map[n.y][n.x] === 0 && !reachable[n.y][n.x]) {
          reachable[n.y][n.x] = true;
          queue.push(n);
        }
      }
    }
  }

  // Filter which rooms are accessible to the player
  const reachableRoomIndices = [];
  rooms.forEach((r, idx) => {
    if (reachable[r.cy][r.cx]) {
      reachableRoomIndices.push(idx);
    }
  });

  // Safe fallback if only the starting room is reachable
  if (reachableRoomIndices.length === 0) {
    reachableRoomIndices.push(0);
  }

  // Place Red Keycard in a random reachable room (preferring index > 0 for exploration)
  const redKeyIndex = reachableRoomIndices.length > 1 
    ? reachableRoomIndices[1 + Math.floor(Math.random() * (reachableRoomIndices.length - 1))] 
    : 0;
  const redKeyRoom = rooms[redKeyIndex];
  sprites.push({ type: 'key_red', x: redKeyRoom.cx, y: redKeyRoom.cy, texture: 17 });

  // Place Blue Keycard in a random reachable room (excluding red key room if possible)
  const availableBlueIndices = reachableRoomIndices.filter(idx => idx !== redKeyIndex);
  const blueKeyIndex = availableBlueIndices.length > 0 
    ? availableBlueIndices[Math.floor(Math.random() * availableBlueIndices.length)] 
    : 0;
  const blueKeyRoom = rooms[blueKeyIndex];
  sprites.push({ type: 'key_blue', x: blueKeyRoom.cx, y: blueKeyRoom.cy, texture: 18 });

  // Place decorative pillars
  rooms.forEach((r, idx) => {
    if (r.w >= 5 && r.h >= 5 && idx > 0) {
      sprites.push({ type: 'pillar', x: r.x + 1.2, y: r.y + 1.2, texture: 4, solid: true });
      sprites.push({ type: 'pillar', x: r.x + r.w - 1.2, y: r.y + 1.2, texture: 4, solid: true });
      sprites.push({ type: 'pillar', x: r.x + 1.2, y: r.y + r.h - 1.2, texture: 4, solid: true });
      sprites.push({ type: 'pillar', x: r.x + r.w - 1.2, y: r.y + r.h - 1.2, texture: 4, solid: true });
    }

    // Place normal room loot (outside elevator/vault rooms)
    if (idx > 0 && r !== elevatorRoom && r !== vaultRoom) {
      let lootRoll = Math.random();
      if (lootRoll < 0.45) {
        sprites.push({
          type: 'medkit',
          x: r.x + 0.5 + Math.random() * (r.w - 1),
          y: r.y + 0.5 + Math.random() * (r.h - 1),
          texture: 5,
          value: 35
        });
      }
      if (lootRoll > 0.35) {
        sprites.push({
          type: 'ammo',
          x: r.x + 0.5 + Math.random() * (r.w - 1),
          y: r.y + 0.5 + Math.random() * (r.h - 1),
          texture: 6,
          value: 40
        });
      }
    }
  });

  // 10. Populate enemies
  const baseEnemies = 5 + player.floor * 2;
  player.maxKills = 0;
  rooms.forEach((r, idx) => {
    if (idx === 0) return; // Never in starting room
    
    let spawns = 1;
    if (idx > 3) spawns = 2;
    
    for (let s = 0; s < spawns; s++) {
      if (sprites.filter(x => x.type === 'enemy').length >= baseEnemies) break;

      let enemyRoll = Math.random();
      let subtype = 'guard';
      let health = 50 + player.floor * 15;
      let maxHp = health;
      let speed = 1.2 + Math.min(player.floor * 0.15, 1.2);
      let texStart = 7;

      if (player.floor === 1) {
        if (enemyRoll < 0.5) {
          subtype = 'ghoul';
          health = 30 + player.floor * 8;
          maxHp = health;
          speed = 1.9 + player.floor * 0.1;
          texStart = 19;
        }
      } else {
        if (enemyRoll < 0.35) {
          subtype = 'ghoul';
          health = 30 + player.floor * 8;
          maxHp = health;
          speed = 2.0 + player.floor * 0.1;
          texStart = 19;
        } else if (enemyRoll > 0.75) {
          subtype = 'heavy';
          health = 130 + player.floor * 30;
          maxHp = health;
          speed = 0.8;
          texStart = 24;
        }
      }

      sprites.push({
        type: 'enemy',
        subtype: subtype,
        x: r.x + 0.5 + Math.random() * (r.w - 1),
        y: r.y + 0.5 + Math.random() * (r.h - 1),
        health: health,
        maxHp: maxHp,
        state: 'idle',
        speed: speed,
        shootCooldown: 0,
        animTimer: 0,
        animFrame: 0,
        texture: texStart,
        solid: true
      });
      player.maxKills++;
    }
  });
  player.kills = 0;
  player.treasures = 0;

  if (player.maxShield > 0) {
    player.shield = player.maxShield;
  }
}

export function checkCollisions(player, newX, newY, debugCheats, radius = 0.25) {
  if (debugCheats && debugCheats.noclip) {
    return { x: newX, y: newY };
  }
  const res = { x: player.x, y: player.y };

  function isBlocked(x, y) {
    // Check map boundary with radius
    if (x - radius < 0 || x + radius >= MapWidth || y - radius < 0 || y + radius >= MapHeight) {
      return true;
    }

    // Determine overlapping grid cells based on player bounding box
    const minGridX = Math.floor(x - radius);
    const maxGridX = Math.floor(x + radius);
    const minGridY = Math.floor(y - radius);
    const maxGridY = Math.floor(y + radius);

    for (let gY = minGridY; gY <= maxGridY; gY++) {
      for (let gX = minGridX; gX <= maxGridX; gX++) {
        if (gX < 0 || gX >= MapWidth || gY < 0 || gY >= MapHeight) {
          return true;
        }
        
        // Grid cell is blocked if it is a wall/door (not walkable, and not elevator exit 4)
        if (map[gY][gX] > 0 && map[gY][gX] !== 4) {
          // Find the closest point on the cell's AABB to the circle center (x, y)
          const closestX = Math.max(gX, Math.min(x, gX + 1));
          const closestY = Math.max(gY, Math.min(y, gY + 1));
          
          // Distance check
          const distX = x - closestX;
          const distY = y - closestY;
          if (distX * distX + distY * distY < radius * radius) {
            return true;
          }
        }
      }
    }

    let sprHit = false;
    sprites.forEach(s => {
      if (s.solid && s !== player) {
        const dx = x - s.x;
        const dy = y - s.y;
        if (dx * dx + dy * dy < 0.2) sprHit = true;
      }
    });
    return sprHit;
  }

  if (!isBlocked(newX, player.y)) {
    res.x = newX;
  }
  if (!isBlocked(player.x, newY)) {
    res.y = newY;
  }

  return res;
}
