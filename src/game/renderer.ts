import {
  ANIM_FPS,
  BRIDGE_MAX_RANGE,
  BUILDINGS,
  GRID_SIZE,
  ITEM_INFO,
  ORE_INFO,
  RECIPES,
  TILE_PX,
} from './constants';
import { DX, DY, FactoryEngine, oppositeDir } from './engine';
import { getSpriteAtlas, SpriteAtlas } from './sprites';
import { BlueprintTile, Building, BuildingKind, Dir, ItemType, ToolMode } from './types';

export interface Camera {
  x: number; // world tile coord at screen center
  y: number;
  zoom: number; // multiplier on TILE_PX
}

export interface RenderInteractionState {
  tool: ToolMode;
  buildKind: BuildingKind;
  buildDir: Dir;
  hoverGx: number | null;
  hoverGy: number | null;
  selectedBuildingId: number | null;
  selectStart: { x: number; y: number } | null;
  selectEnd: { x: number; y: number } | null;
  blueprint: BlueprintTile[];
  isPastingBlueprint: boolean;
  bridgeDragStart: { x: number; y: number } | null;
}

const visibleBuildingsScratch = new Set<Building>();

function drawPixelDirectionArrow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dir: Dir,
  size: number,
  color: string
) {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  ctx.rotate((dir * Math.PI) / 2);
  ctx.fillStyle = color;
  const u = Math.max(2, Math.round(size / 6));
  ctx.fillRect(-u, -u * 2, u * 2, u);
  ctx.fillRect(-u * 2, -u, u * 4, u);
  ctx.fillRect(-u, 0, u * 2, u * 2);
  ctx.restore();
}

export function renderWorld(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  engine: FactoryEngine,
  camera: Camera,
  ui: RenderInteractionState
) {
  const atlas = getSpriteAtlas();
  const tileSize = TILE_PX * camera.zoom;

  // Enforce crisp nearest-neighbor pixel rendering
  ctx.imageSmoothingEnabled = false;

  // Quantize animation clock strictly to 24 FPS
  const animTick = Math.floor(engine.simTime * ANIM_FPS);
  const animTime = animTick / ANIM_FPS;

  // Clear outer void
  ctx.fillStyle = '#0D1017';
  ctx.fillRect(0, 0, width, height);

  const halfW = width / 2;
  const halfH = height / 2;
  const worldToScreenX = (gx: number) => Math.round(halfW + (gx - camera.x) * tileSize);
  const worldToScreenY = (gy: number) => Math.round(halfH + (gy - camera.y) * tileSize);

  const minGx = Math.max(0, Math.floor(camera.x - halfW / tileSize) - 1);
  const maxGx = Math.min(GRID_SIZE - 1, Math.ceil(camera.x + halfW / tileSize) + 1);
  const minGy = Math.max(0, Math.floor(camera.y - halfH / tileSize) - 1);
  const maxGy = Math.min(GRID_SIZE - 1, Math.ceil(camera.y + halfH / tileSize) + 1);

  const mapLeft = worldToScreenX(0);
  const mapTop = worldToScreenY(0);
  const mapRight = worldToScreenX(GRID_SIZE);
  const mapBottom = worldToScreenY(GRID_SIZE);

  // Layer 0: Pixel Floor Tiles & Ore Deposits
  if (tileSize >= 10) {
    for (let gy = minGy; gy <= maxGy; gy++) {
      const sy = worldToScreenY(gy);
      const sh = worldToScreenY(gy + 1) - sy;
      for (let gx = minGx; gx <= maxGx; gx++) {
        const sx = worldToScreenX(gx);
        const sw = worldToScreenX(gx + 1) - sx;
        const hash = ((gx * 73856093) ^ (gy * 19349663)) >>> 0;
        const ore = engine.oreGrid[gy * GRID_SIZE + gx];
        if (ore) {
          const sprite = atlas.ores[ore][hash % 2];
          ctx.drawImage(sprite, sx, sy, sw, sh);
        } else {
          const floorSprite = atlas.floor[hash % 4];
          ctx.drawImage(floorSprite, sx, sy, sw, sh);
        }
      }
    }
  } else {
    // Ultra zoomed-out fast LOD
    ctx.fillStyle = '#141923';
    ctx.fillRect(mapLeft, mapTop, mapRight - mapLeft, mapBottom - mapTop);
    for (let gy = minGy; gy <= maxGy; gy++) {
      for (let gx = minGx; gx <= maxGx; gx++) {
        const ore = engine.oreGrid[gy * GRID_SIZE + gx];
        if (!ore) continue;
        ctx.fillStyle = ORE_INFO[ore].color;
        ctx.fillRect(worldToScreenX(gx), worldToScreenY(gy), Math.ceil(tileSize), Math.ceil(tileSize));
      }
    }
  }

  // Subtle 8x8 chunk borders
  if (tileSize >= 12) {
    ctx.strokeStyle = 'rgba(42, 50, 66, 0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const startChunkX = Math.floor(minGx / 8) * 8;
    const startChunkY = Math.floor(minGy / 8) * 8;
    for (let gx = startChunkX; gx <= maxGx + 8; gx += 8) {
      if (gx < 0 || gx > GRID_SIZE) continue;
      const sx = worldToScreenX(gx) + 0.5;
      ctx.moveTo(sx, Math.max(0, mapTop));
      ctx.lineTo(sx, Math.min(height, mapBottom));
    }
    for (let gy = startChunkY; gy <= maxGy + 8; gy += 8) {
      if (gy < 0 || gy > GRID_SIZE) continue;
      const sy = worldToScreenY(gy) + 0.5;
      ctx.moveTo(Math.max(0, mapLeft), sy);
      ctx.lineTo(Math.min(width, mapRight), sy);
    }
    ctx.stroke();
  }

  // Map Boundary
  ctx.strokeStyle = '#3B475E';
  ctx.lineWidth = 2;
  ctx.strokeRect(mapLeft, mapTop, mapRight - mapLeft, mapBottom - mapTop);

  // Gather visible unique buildings
  visibleBuildingsScratch.clear();
  for (let gy = minGy; gy <= maxGy; gy++) {
    const rowOffset = gy * GRID_SIZE;
    for (let gx = minGx; gx <= maxGx; gx++) {
      const b = engine.cellToBuilding[rowOffset + gx];
      if (b) visibleBuildingsScratch.add(b);
    }
  }

  // 24 FPS stepped animation frames
  const beltFrame = Math.floor(animTime * engine.getBeltSpeed() * 4) % 4;
  const drillFrame = Math.floor(animTime * 12) % 4;
  const turboFrame = Math.floor(animTime * 16) % 4;
  const machineFrame = Math.floor(animTime * 8) % 4;
  const coreFrame = Math.floor(animTime * 6) % 4;
  const trashFrame = Math.floor(animTime * 8) % 2;

  // Layer 1: Belts (drawn under other structures & items)
  const beltSprites = atlas.belt[beltFrame];
  for (const b of visibleBuildingsScratch) {
    if (b.kind !== 'belt') continue;
    const sx = worldToScreenX(b.x);
    const sy = worldToScreenY(b.y);
    const sw = worldToScreenX(b.x + 1) - sx;
    const sh = worldToScreenY(b.y + 1) - sy;
    ctx.drawImage(beltSprites[b.dir], sx, sy, sw, sh);
  }

  // Layer 2: Machinery & Logistics Buildings
  for (const b of visibleBuildingsScratch) {
    if (b.kind === 'belt') continue;
    const sx = worldToScreenX(b.x);
    const sy = worldToScreenY(b.y);
    const sw = worldToScreenX(b.x + b.w) - sx;
    const sh = worldToScreenY(b.y + b.h) - sy;

    drawBuildingSprite(
      ctx,
      atlas,
      engine,
      b,
      sx,
      sy,
      sw,
      sh,
      tileSize,
      drillFrame,
      turboFrame,
      machineFrame,
      coreFrame,
      trashFrame,
      b.id === ui.selectedBuildingId
    );
  }

  // Layer 3: 16x16 Pixel Items Moving Along Belts & Junctions (snapped to 24fps pixel grid)
  const itemPxSize = Math.max(6, Math.round(tileSize * 0.5));
  for (const b of visibleBuildingsScratch) {
    if (b.kind === 'belt' && b.beltItems && b.beltItems.length > 0) {
      const sx = worldToScreenX(b.x);
      const sy = worldToScreenY(b.y);
      const sw = worldToScreenX(b.x + 1) - sx;
      const sh = worldToScreenY(b.y + 1) - sy;
      const cx = sx + sw * 0.5;
      const cy = sy + sh * 0.5;

      for (const it of b.beltItems) {
        // Quantize progress to crisp 16-subpixel steps matching 24fps retro cadence
        const p = Math.round(it.progress * 16) / 16;
        let ix = cx;
        let iy = cy;
        if (p < 0.5) {
          const t = p * 2;
          const startX = cx + DX[it.fromDir] * sw * 0.5;
          const startY = cy + DY[it.fromDir] * sh * 0.5;
          ix = startX + (cx - startX) * t;
          iy = startY + (cy - startY) * t;
        } else {
          const t = (p - 0.5) * 2;
          const endX = cx + DX[b.dir] * sw * 0.5;
          const endY = cy + DY[b.dir] * sh * 0.5;
          ix = cx + (endX - cx) * t;
          iy = cy + (endY - cy) * t;
        }
        ctx.drawImage(
          atlas.items[it.item],
          Math.round(ix - itemPxSize / 2),
          Math.round(iy - itemPxSize / 2),
          itemPxSize,
          itemPxSize
        );
      }
    } else if (b.kind === 'junction' && b.junctionItems && b.junctionItems.length > 0) {
      const sx = worldToScreenX(b.x);
      const sy = worldToScreenY(b.y);
      const cx = sx + tileSize * 0.5;
      const cy = sy + tileSize * 0.5;
      for (const it of b.junctionItems) {
        const p = Math.round(it.progress * 16) / 16;
        const offset = (p - 0.5) * tileSize;
        const ix = cx + DX[it.moveDir] * offset;
        const iy = cy + DY[it.moveDir] * offset;
        ctx.drawImage(
          atlas.items[it.item],
          Math.round(ix - itemPxSize / 2),
          Math.round(iy - itemPxSize / 2),
          itemPxSize,
          itemPxSize
        );
      }
    }
  }

  // Layer 4: Subtle underground bridge arcs + animated underground pixel cargo
  for (const b of engine.bridges) {
    const exit = engine.findBridgeExit(b);
    if (!exit) continue;
    const x1 = worldToScreenX(b.x) + tileSize / 2;
    const y1 = worldToScreenY(b.y) + tileSize / 2;
    const x2 = worldToScreenX(exit.x) + tileSize / 2;
    const y2 = worldToScreenY(exit.y) + tileSize / 2;

    if (
      Math.max(x1, x2) < -tileSize ||
      Math.min(x1, x2) > width + tileSize ||
      Math.max(y1, y2) < -tileSize ||
      Math.min(y1, y2) > height + tileSize
    ) {
      continue;
    }

    drawDashedLink(ctx, x1, y1, x2, y2, 'rgba(56, 189, 248, 0.32)', 2);

    if (b.bridgeQueue && b.bridgeQueue.length > 0 && tileSize >= 12) {
      const dist = Math.max(1, Math.abs(exit.x - b.x) + Math.abs(exit.y - b.y));
      const dotSz = Math.max(4, Math.round(tileSize * 0.22));
      for (const q of b.bridgeQueue) {
        const t = Math.max(0, Math.min(1, Math.round((q.progress / dist) * 24) / 24));
        const px = Math.round(x1 + (x2 - x1) * t - dotSz / 2);
        const py = Math.round(y1 + (y2 - y1) * t - dotSz / 2);
        ctx.fillStyle = ITEM_INFO[q.item].color;
        ctx.fillRect(px, py, dotSz, dotSz);
      }
    }
  }

  // Highlighted Bridge Connection Arcs when hovering/selected a bridge
  if (ui.selectedBuildingId !== null) {
    const sel = engine.buildings.get(ui.selectedBuildingId);
    if (sel && sel.kind === 'bridge') {
      drawBridgeLink(ctx, engine, sel, worldToScreenX, worldToScreenY, tileSize);
    }
  }
  if (ui.hoverGx !== null && ui.hoverGy !== null) {
    const hov = engine.getBuildingAt(ui.hoverGx, ui.hoverGy);
    if (hov && hov.kind === 'bridge') {
      drawBridgeLink(ctx, engine, hov, worldToScreenX, worldToScreenY, tileSize);
    }
  }

  // Layer 5: Square Pixel Particles
  for (const pt of engine.particles) {
    const alpha = Math.max(0, pt.life / pt.maxLife);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = pt.color;
    const sz = Math.max(2, Math.round(pt.size * camera.zoom));
    ctx.fillRect(
      Math.round(worldToScreenX(pt.x) - sz / 2),
      Math.round(worldToScreenY(pt.y) - sz / 2),
      sz,
      sz
    );
  }
  ctx.globalAlpha = 1;

  // Layer 6: Placement / Blueprint / Selection Previews
  if (ui.hoverGx !== null && ui.hoverGy !== null && !engine.isDemo) {
    if (ui.isPastingBlueprint && ui.blueprint.length > 0) {
      for (const bt of ui.blueprint) {
        const gx = ui.hoverGx + bt.dx;
        const gy = ui.hoverGy + bt.dy;
        const def = BUILDINGS[bt.kind];
        const valid = engine.isUnlocked(bt.kind) && engine.canPlaceBuilding(bt.kind, gx, gy);
        const sx = worldToScreenX(gx);
        const sy = worldToScreenY(gy);
        const sz = def.size * tileSize;
        ctx.fillStyle = valid ? 'rgba(245, 158, 11, 0.24)' : 'rgba(239, 68, 68, 0.28)';
        ctx.strokeStyle = valid ? '#F59E0B' : '#EF4444';
        ctx.lineWidth = 2;
        ctx.fillRect(sx + 1, sy + 1, sz - 2, sz - 2);
        ctx.strokeRect(sx + 1, sy + 1, sz - 2, sz - 2);
        if (def.rotatable) {
          drawPixelDirectionArrow(ctx, sx + sz / 2, sy + sz / 2, bt.dir, sz * 0.45, '#FDE68A');
        }
      }
    } else if (ui.tool === 'build') {
      const def = BUILDINGS[ui.buildKind];
      const valid = engine.isUnlocked(ui.buildKind) && engine.canPlaceBuilding(ui.buildKind, ui.hoverGx, ui.hoverGy);
      const sx = worldToScreenX(ui.hoverGx);
      const sy = worldToScreenY(ui.hoverGy);
      const sz = def.size * tileSize;

      ctx.fillStyle = valid ? 'rgba(245, 158, 11, 0.22)' : 'rgba(239, 68, 68, 0.25)';
      ctx.strokeStyle = valid ? '#F59E0B' : '#EF4444';
      ctx.lineWidth = 2;
      ctx.fillRect(sx + 1, sy + 1, sz - 2, sz - 2);
      ctx.strokeRect(sx + 1, sy + 1, sz - 2, sz - 2);

      if (def.rotatable) {
        drawPixelDirectionArrow(
          ctx,
          sx + sz / 2,
          sy + sz / 2,
          ui.buildDir,
          Math.min(tileSize * 0.65, sz * 0.45),
          valid ? '#FDE68A' : '#FCA5A5'
        );
      }

      if (ui.buildKind === 'bridge') {
        if (ui.bridgeDragStart) {
          const sx0 = ui.bridgeDragStart.x;
          const sy0 = ui.bridgeDragStart.y;
          const dxRaw = ui.hoverGx - sx0;
          const dyRaw = ui.hoverGy - sy0;
          let ex = sx0;
          let ey = sy0;
          let spanDir: Dir = ui.buildDir;
          if (Math.abs(dxRaw) >= Math.abs(dyRaw) && dxRaw !== 0) {
            const clamped = Math.max(-BRIDGE_MAX_RANGE, Math.min(BRIDGE_MAX_RANGE, dxRaw));
            ex = sx0 + clamped;
            spanDir = clamped > 0 ? 1 : 3;
          } else if (dyRaw !== 0) {
            const clamped = Math.max(-BRIDGE_MAX_RANGE, Math.min(BRIDGE_MAX_RANGE, dyRaw));
            ey = sy0 + clamped;
            spanDir = clamped > 0 ? 2 : 0;
          }

          if (ex !== sx0 || ey !== sy0) {
            const startValid = engine.canPlaceBuilding('bridge', sx0, sy0);
            const endValid = engine.canPlaceBuilding('bridge', ex, ey);
            const startX = worldToScreenX(sx0);
            const startY = worldToScreenY(sy0);
            const endX = worldToScreenX(ex);
            const endY = worldToScreenY(ey);

            ctx.fillStyle = startValid ? 'rgba(56, 189, 248, 0.28)' : 'rgba(239, 68, 68, 0.28)';
            ctx.strokeStyle = startValid ? '#38BDF8' : '#EF4444';
            ctx.lineWidth = 2;
            ctx.fillRect(startX + 1, startY + 1, tileSize - 2, tileSize - 2);
            ctx.strokeRect(startX + 1, startY + 1, tileSize - 2, tileSize - 2);
            drawPixelDirectionArrow(ctx, startX + tileSize / 2, startY + tileSize / 2, spanDir, tileSize * 0.4, '#BAE6FD');

            ctx.fillStyle = endValid ? 'rgba(16, 185, 129, 0.28)' : 'rgba(239, 68, 68, 0.28)';
            ctx.strokeStyle = endValid ? '#10B981' : '#EF4444';
            ctx.fillRect(endX + 1, endY + 1, tileSize - 2, tileSize - 2);
            ctx.strokeRect(endX + 1, endY + 1, tileSize - 2, tileSize - 2);
            drawPixelDirectionArrow(ctx, endX + tileSize / 2, endY + tileSize / 2, spanDir, tileSize * 0.4, '#A7F3D0');

            drawDashedLink(
              ctx,
              startX + tileSize / 2,
              startY + tileSize / 2,
              endX + tileSize / 2,
              endY + tileSize / 2,
              startValid && endValid ? '#38BDF8' : '#EF4444',
              2.5
            );
          }
        } else {
          for (let dist = 1; dist <= BRIDGE_MAX_RANGE; dist++) {
            const tx = ui.hoverGx + DX[ui.buildDir] * dist;
            const ty = ui.hoverGy + DY[ui.buildDir] * dist;
            const cand = engine.getBuildingAt(tx, ty);
            if (cand && cand.kind === 'bridge' && cand.dir === ui.buildDir) {
              drawDashedLink(
                ctx,
                sx + tileSize / 2,
                sy + tileSize / 2,
                worldToScreenX(tx) + tileSize / 2,
                worldToScreenY(ty) + tileSize / 2
              );
              break;
            }
          }
          const back = oppositeDir(ui.buildDir);
          for (let dist = 1; dist <= BRIDGE_MAX_RANGE; dist++) {
            const tx = ui.hoverGx + DX[back] * dist;
            const ty = ui.hoverGy + DY[back] * dist;
            const cand = engine.getBuildingAt(tx, ty);
            if (cand && cand.kind === 'bridge' && cand.dir === ui.buildDir) {
              drawDashedLink(
                ctx,
                worldToScreenX(tx) + tileSize / 2,
                worldToScreenY(ty) + tileSize / 2,
                sx + tileSize / 2,
                sy + tileSize / 2
              );
              break;
            }
          }
        }
      }
    } else if (ui.tool === 'erase') {
      const sx = worldToScreenX(ui.hoverGx);
      const sy = worldToScreenY(ui.hoverGy);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.fillRect(sx + 1, sy + 1, tileSize - 2, tileSize - 2);
      ctx.strokeRect(sx + 1, sy + 1, tileSize - 2, tileSize - 2);
    } else if (ui.tool === 'inspect') {
      const hov = engine.getBuildingAt(ui.hoverGx, ui.hoverGy);
      const sx = worldToScreenX(hov ? hov.x : ui.hoverGx);
      const sy = worldToScreenY(hov ? hov.y : ui.hoverGy);
      const sw = (hov ? hov.w : 1) * tileSize;
      const sh = (hov ? hov.h : 1) * tileSize;
      ctx.fillStyle = hov ? 'rgba(56, 189, 248, 0.16)' : 'rgba(56, 189, 248, 0.08)';
      ctx.strokeStyle = hov ? '#38BDF8' : 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 2;
      ctx.fillRect(sx + 1, sy + 1, sw - 2, sh - 2);
      ctx.strokeRect(sx + 1, sy + 1, sw - 2, sh - 2);
    }
  }

  // Selection rectangle marquee
  if (ui.selectStart && ui.selectEnd) {
    const x1 = Math.min(ui.selectStart.x, ui.selectEnd.x);
    const x2 = Math.max(ui.selectStart.x, ui.selectEnd.x) + 1;
    const y1 = Math.min(ui.selectStart.y, ui.selectEnd.y);
    const y2 = Math.max(ui.selectStart.y, ui.selectEnd.y) + 1;
    const sx = worldToScreenX(x1);
    const sy = worldToScreenY(y1);
    const sw = (x2 - x1) * tileSize;
    const sh = (y2 - y1) * tileSize;
    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.fillRect(sx, sy, sw, sh);
    ctx.strokeRect(sx, sy, sw, sh);
    ctx.setLineDash([]);
  }
}

function drawDashedLink(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color = '#38BDF8',
  lineWidth = 2.5
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(Math.round(x1), Math.round(y1));
  ctx.lineTo(Math.round(x2), Math.round(y2));
  ctx.stroke();
  ctx.restore();
}

function drawBridgeLink(
  ctx: CanvasRenderingContext2D,
  engine: FactoryEngine,
  b: Building,
  worldToScreenX: (gx: number) => number,
  worldToScreenY: (gy: number) => number,
  tileSize: number
) {
  const exit = engine.findBridgeExit(b);
  if (exit) {
    drawDashedLink(
      ctx,
      worldToScreenX(b.x) + tileSize / 2,
      worldToScreenY(b.y) + tileSize / 2,
      worldToScreenX(exit.x) + tileSize / 2,
      worldToScreenY(exit.y) + tileSize / 2
    );
  }
  const entrance = engine.findBridgeEntrance(b);
  if (entrance) {
    drawDashedLink(
      ctx,
      worldToScreenX(entrance.x) + tileSize / 2,
      worldToScreenY(entrance.y) + tileSize / 2,
      worldToScreenX(b.x) + tileSize / 2,
      worldToScreenY(b.y) + tileSize / 2
    );
  }
}

function drawBuildingSprite(
  ctx: CanvasRenderingContext2D,
  atlas: SpriteAtlas,
  engine: FactoryEngine,
  b: Building,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  tileSize: number,
  drillFrame: number,
  turboFrame: number,
  machineFrame: number,
  coreFrame: number,
  trashFrame: number,
  isSelected: boolean
) {
  if (b.kind === 'core') {
    ctx.drawImage(atlas.core[coreFrame], sx, sy, sw, sh);
  } else if (b.kind === 'drill') {
    const hasOre = Boolean(engine.getOre(b.x, b.y));
    const frame = hasOre ? drillFrame : 0;
    ctx.drawImage(atlas.drill[frame][b.dir], sx, sy, sw, sh);
    if (!hasOre) {
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 1, sy + 1, sw - 2, sh - 2);
    }
  } else if (b.kind === 'turbo_drill') {
    let hasOre = false;
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        if (engine.getOre(b.x + dx, b.y + dy)) hasOre = true;
      }
    }
    const frame = hasOre ? turboFrame : 0;
    ctx.drawImage(atlas.turboDrill[frame][b.dir], sx, sy, sw, sh);
    if (!hasOre) {
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 1, sy + 1, sw - 2, sh - 2);
    }
  } else if (b.kind === 'router') {
    ctx.drawImage(atlas.router, sx, sy, sw, sh);
  } else if (b.kind === 'junction') {
    ctx.drawImage(atlas.junction, sx, sy, sw, sh);
  } else if (b.kind === 'sorter') {
    ctx.drawImage(atlas.sorter[b.dir], sx, sy, sw, sh);
    if (b.filterItem) {
      const pad = Math.round(tileSize * 0.25);
      ctx.drawImage(
        atlas.items[b.filterItem],
        sx + pad,
        sy + pad,
        sw - pad * 2,
        sh - pad * 2
      );
    }
  } else if (b.kind === 'bridge') {
    const hasExit = Boolean(engine.findBridgeExit(b));
    const hasEntrance = Boolean(engine.findBridgeEntrance(b));
    const dirSet = hasExit
      ? atlas.bridge.entry
      : hasEntrance
      ? atlas.bridge.exit
      : atlas.bridge.unlinked;
    ctx.drawImage(dirSet[b.dir], sx, sy, sw, sh);
  } else if (b.kind === 'trash') {
    ctx.drawImage(atlas.trash[trashFrame], sx, sy, sw, sh);
  } else if (b.kind === 'smelter' || b.kind === 'assembler') {
    const rId = b.recipeId || b.activeRecipeId;
    const recipe = rId ? RECIPES[rId] : null;
    const isWorking = Boolean(recipe && b.craftTimer && b.craftTimer > 0);
    const frame = isWorking ? machineFrame : 0;
    const dirSet = b.kind === 'smelter' ? atlas.smelter[frame] : atlas.assembler[frame];
    ctx.drawImage(dirSet[b.dir], sx, sy, sw, sh);

    if (recipe) {
      // Draw crisp 16x16 pixel output emblem centered on machine
      const iconSz = Math.round(tileSize * 0.72);
      ctx.drawImage(
        atlas.items[recipe.output],
        Math.round(sx + sw / 2 - iconSz / 2),
        Math.round(sy + sh / 2 - iconSz / 2),
        iconSz,
        iconSz
      );
    }

    // Crisp pixel progress bar along bottom edge
    if (recipe && b.craftTimer && b.craftTimer > 0) {
      const frac = Math.min(1, b.craftTimer / recipe.craftTime);
      const barW = Math.round(sw * 0.7);
      const barH = Math.max(3, Math.round(tileSize * 0.14));
      const bx = Math.round(sx + (sw - barW) / 2);
      const by = Math.round(sy + sh - barH - tileSize * 0.14);
      ctx.fillStyle = '#0B0E14';
      ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
      ctx.fillStyle = ITEM_INFO[recipe.output].color;
      ctx.fillRect(bx, by, Math.round(barW * frac), barH);
    }
  }

  if (isSelected) {
    ctx.strokeStyle = '#F8FAFC';
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1, sy + 1, sw - 2, sh - 2);
  }
}
