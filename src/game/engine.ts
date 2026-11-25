import {
  ALL_ITEMS,
  ASSEMBLER_RECIPES,
  BRIDGE_MAX_RANGE,
  BUILDING_VALID_INPUTS,
  BUILDINGS,
  CORE_POS,
  CORE_SIZE,
  GRID_SIZE,
  MILESTONES,
  RECIPE_INPUT_LIST,
  RECIPES,
  SMELTER_RECIPES,
  getUpgradeCost,
} from './constants';
import { sound } from './sound';
import {
  BlueprintTile,
  Building,
  BuildingKind,
  Dir,
  GameMode,
  HudSnapshot,
  ItemType,
  OreType,
  Particle,
  RecipeId,
  UpgradeState,
} from './types';

export const DX: Record<Dir, number> = { 0: 0, 1: 1, 2: 0, 3: -1 };
export const DY: Record<Dir, number> = { 0: -1, 1: 0, 2: 1, 3: 0 };

export function oppositeDir(d: Dir): Dir {
  return ((d + 2) % 4) as Dir;
}

export function rotateDir(d: Dir, steps = 1): Dir {
  return (((d + steps) % 4 + 4) % 4) as Dir;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SavePayload {
  version: number;
  gridSize?: number;
  seed: number;
  mode: GameMode;
  milestoneIndex: number;
  allMilestonesDone: boolean;
  inventory: Record<ItemType, number>;
  upgrades: UpgradeState;
  buildings: Array<{
    kind: BuildingKind;
    x: number;
    y: number;
    dir: Dir;
    filterItem?: ItemType | null;
    recipeId?: RecipeId | null;
  }>;
}

const SAVE_KEY = 'rudopotok_save_v2';

export class FactoryEngine {
  public seed = 104729;
  public mode: GameMode = 'career';
  public simTime = 0;
  public simSpeed = 1;
  public isDemo = false;

  public oreGrid: (OreType | null)[] = new Array(GRID_SIZE * GRID_SIZE).fill(null);
  public cellToBuilding: (Building | null)[] = new Array(GRID_SIZE * GRID_SIZE).fill(null);
  public buildings: Map<number, Building> = new Map();
  public bridges: Set<Building> = new Set();
  private nextBuildingId = 1;

  public inventory: Record<ItemType, number> = this.createEmptyItemMap();
  public deliveryTimestamps: Record<ItemType, number[]> = this.createEmptyTimestampMap();
  public rates: Record<ItemType, number> = this.createEmptyItemMap();
  public totalDelivered = 0;

  public upgrades: UpgradeState = {
    drillLevel: 1,
    beltLevel: 1,
    craftLevel: 1,
  };

  public milestoneIndex = 0;
  public allMilestonesDone = false;
  public milestoneFlashTimer = 0;
  public lastCompletedMilestoneTitle: string | null = null;

  public particles: Particle[] = [];

  constructor() {
    this.initNewWorld(this.seed, 'career', false);
  }

  private createEmptyItemMap(): Record<ItemType, number> {
    return {
      copper: 0,
      iron: 0,
      coal: 0,
      quartz: 0,
      titanium: 0,
      coil: 0,
      steel: 0,
      silicon: 0,
      circuit: 0,
      composite: 0,
      hyperblock: 0,
    };
  }

  private createEmptyTimestampMap(): Record<ItemType, number[]> {
    return {
      copper: [],
      iron: [],
      coal: [],
      quartz: [],
      titanium: [],
      coil: [],
      steel: [],
      silicon: [],
      circuit: [],
      composite: [],
      hyperblock: [],
    };
  }

  public initNewWorld(seed: number, mode: GameMode, demo = false) {
    this.seed = seed;
    this.mode = mode;
    this.isDemo = demo;
    this.simTime = 0;
    this.simSpeed = 1;
    this.oreGrid.fill(null);
    this.cellToBuilding.fill(null);
    this.buildings.clear();
    this.bridges.clear();
    this.nextBuildingId = 1;
    this.inventory = this.createEmptyItemMap();
    this.deliveryTimestamps = this.createEmptyTimestampMap();
    this.rates = this.createEmptyItemMap();
    this.totalDelivered = 0;
    this.upgrades = { drillLevel: 1, beltLevel: 1, craftLevel: 1 };
    this.milestoneIndex = 0;
    this.allMilestonesDone = false;
    this.milestoneFlashTimer = 0;
    this.lastCompletedMilestoneTitle = null;
    this.particles = [];

    this.generateOres(seed);
    this.placeBuildingInternal('core', CORE_POS, CORE_POS, 0);

    if (demo) {
      this.seedDemoFactory();
    }
  }

  private generateOres(seed: number) {
    const rng = mulberry32(seed);
    const center = CORE_POS + 1;

    const stampPatch = (cx: number, cy: number, radius: number, ore: OreType) => {
      const icx = Math.round(cx);
      const icy = Math.round(cy);
      const rCeil = Math.ceil(radius) + 1;
      for (let dy = -rCeil; dy <= rCeil; dy++) {
        for (let dx = -rCeil; dx <= rCeil; dx++) {
          const x = icx + dx;
          const y = icy + dy;
          if (x < 1 || y < 1 || x >= GRID_SIZE - 1 || y >= GRID_SIZE - 1) continue;
          // Keep immediate 2-tile apron around Core clear
          if (
            x >= CORE_POS - 2 &&
            x < CORE_POS + CORE_SIZE + 2 &&
            y >= CORE_POS - 2 &&
            y < CORE_POS + CORE_SIZE + 2
          ) {
            continue;
          }
          const dist = Math.hypot(dx, dy);
          const jitter = (rng() - 0.5) * 0.9;
          if (dist + jitter <= radius) {
            this.oreGrid[y * GRID_SIZE + x] = ore;
          }
        }
      }
    };

    const veinCenters: Array<{ x: number; y: number }> = [];
    const registerPatch = (cx: number, cy: number, radius: number, ore: OreType) => {
      veinCenters.push({ x: Math.round(cx), y: Math.round(cy) });
      stampPatch(cx, cy, radius, ore);
    };

    // Well-spaced starter patches around the Core
    registerPatch(center - 15, center - 7, 3.0, 'copper');
    registerPatch(center - 16, center + 13, 2.7, 'copper');
    registerPatch(center + 15, center - 6, 3.0, 'iron');
    registerPatch(center + 14, center + 14, 2.7, 'iron');
    registerPatch(center - 2, center + 16, 2.9, 'coal');
    registerPatch(center + 2, center - 16, 2.9, 'quartz');
    registerPatch(center + 29, center + 24, 3.0, 'titanium');
    registerPatch(center - 29, center - 24, 3.0, 'titanium');

    // Scatter additional large veins across the 192x192 map with strict minimum spacing
    const MIN_VEIN_DISTANCE = 22;
    const orePool: OreType[] = ['copper', 'iron', 'coal', 'quartz', 'titanium'];
    let placed = 0;
    let attempts = 0;
    while (placed < 64 && attempts < 900) {
      attempts++;
      const ore = orePool[placed % orePool.length];
      const angle = rng() * Math.PI * 2;
      const dist = 24 + rng() * 62;
      const cx = Math.round(center + Math.cos(angle) * dist);
      const cy = Math.round(center + Math.sin(angle) * dist);
      if (cx < 6 || cy < 6 || cx >= GRID_SIZE - 6 || cy >= GRID_SIZE - 6) continue;

      const tooClose = veinCenters.some(
        (vc) => Math.hypot(vc.x - cx, vc.y - cy) < MIN_VEIN_DISTANCE
      );
      if (tooClose) continue;

      const radius = 2.6 + rng() * 1.5;
      registerPatch(cx, cy, radius, ore);
      placed++;
    }
  }

  private seedDemoFactory() {
    // Build a clean live demonstration factory around the Core for the Title Screen
    const cx = CORE_POS;
    // Guarantee demo ores right under the demo drills
    for (let y = cx - 4; y <= cx - 2; y++) {
      this.oreGrid[y * GRID_SIZE + (cx - 8)] = 'copper';
    }
    this.oreGrid[(cx - 2) * GRID_SIZE + (cx + 9)] = 'iron';
    this.oreGrid[(cx - 1) * GRID_SIZE + (cx + 9)] = 'iron';

    // Left copper drills -> belts -> smelter -> core
    for (let y = cx - 4; y <= cx - 2; y++) {
      this.placeBuildingInternal('drill', cx - 8, y, 1);
      this.placeBuildingInternal('belt', cx - 7, y, 1);
      this.placeBuildingInternal('belt', cx - 6, y, 1);
    }
    this.placeBuildingInternal('belt', cx - 5, cx - 4, 2);
    this.placeBuildingInternal('belt', cx - 5, cx - 2, 0);
    this.placeBuildingInternal('belt', cx - 5, cx - 3, 1);
    this.placeBuildingInternal('smelter', cx - 4, cx - 3, 1);
    this.buildings.get(this.cellToBuilding[(cx - 3) * GRID_SIZE + (cx - 4)]!.id)!.recipeId = 'coil';
    this.placeBuildingInternal('belt', cx - 2, cx - 3, 2);
    this.placeBuildingInternal('belt', cx - 2, cx - 2, 2);
    this.placeBuildingInternal('belt', cx - 2, cx - 1, 2);
    this.placeBuildingInternal('belt', cx - 2, cx, 1);
    this.placeBuildingInternal('belt', cx - 1, cx, 1);

    // Right iron drills -> belts directly to core
    this.placeBuildingInternal('drill', cx + 9, cx - 2, 3);
    this.placeBuildingInternal('drill', cx + 9, cx - 1, 3);
    for (let x = cx + 8; x >= cx + 3; x--) {
      this.placeBuildingInternal('belt', x, cx - 2, 3);
      this.placeBuildingInternal('belt', x, cx - 1, 3);
    }
    this.placeBuildingInternal('belt', cx + 3, cx, 3);
    this.placeBuildingInternal('belt', cx + 4, cx, 3);
    this.placeBuildingInternal('belt', cx + 3, cx - 2, 2);
    this.placeBuildingInternal('belt', cx + 3, cx - 1, 2);
  }

  public getOre(x: number, y: number): OreType | null {
    if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return null;
    return this.oreGrid[y * GRID_SIZE + x];
  }

  public getBuildingAt(x: number, y: number): Building | null {
    if (x < 0 || y < 0 || x >= GRID_SIZE || y >= GRID_SIZE) return null;
    return this.cellToBuilding[y * GRID_SIZE + x];
  }

  public isUnlocked(kind: BuildingKind): boolean {
    if (this.mode === 'sandbox') return true;
    const def = BUILDINGS[kind];
    return this.milestoneIndex >= def.unlockTier;
  }

  public canPlaceBuilding(kind: BuildingKind, x: number, y: number): boolean {
    if (kind === 'core') return false;
    const def = BUILDINGS[kind];
    if (x < 0 || y < 0 || x + def.size > GRID_SIZE || y + def.size > GRID_SIZE) return false;

    for (let dy = 0; dy < def.size; dy++) {
      for (let dx = 0; dx < def.size; dx++) {
        const occ = this.cellToBuilding[(y + dy) * GRID_SIZE + (x + dx)];
        if (occ) {
          if (occ.kind === 'core') return false;
          // Allow replacing a 1x1 belt seamlessly with another 1x1 logistics tile
          if (def.size === 1 && occ.kind === 'belt') {
            continue;
          }
          return false;
        }
      }
    }
    return true;
  }

  public placeBuilding(kind: BuildingKind, x: number, y: number, dir: Dir): Building | null {
    if (!this.isUnlocked(kind)) return null;
    if (!this.canPlaceBuilding(kind, x, y)) return null;

    const def = BUILDINGS[kind];
    // If replacing a belt with a belt of same dir, skip
    const existing = this.getBuildingAt(x, y);
    if (existing && existing.kind === 'belt' && kind === 'belt' && existing.dir === dir) {
      return existing;
    }

    // Clear replaceable belt(s)
    for (let dy = 0; dy < def.size; dy++) {
      for (let dx = 0; dx < def.size; dx++) {
        const occ = this.getBuildingAt(x + dx, y + dy);
        if (occ) {
          this.removeBuildingInternal(occ);
        }
      }
    }

    const b = this.placeBuildingInternal(kind, x, y, dir);
    if (kind === 'belt') {
      sound.playBeltTick();
    } else {
      sound.playPlace();
    }
    return b;
  }

  private placeBuildingInternal(kind: BuildingKind, x: number, y: number, dir: Dir): Building {
    const def = BUILDINGS[kind];
    const id = this.nextBuildingId++;
    const b: Building = {
      id,
      kind,
      x,
      y,
      w: def.size,
      h: def.size,
      dir,
      throughputCount: 0,
      throughputRate: 0,
      throughputHistory: [],
    };

    if (kind === 'belt') b.beltItems = [];
    if (kind === 'junction') b.junctionItems = [];
    if (kind === 'router') {
      b.routerBuffer = null;
      b.rrIndex = 0;
    }
    if (kind === 'sorter') {
      b.filterItem = 'copper';
      b.sorterBuffer = null;
      b.sorterSideToggle = 0;
    }
    if (kind === 'drill' || kind === 'turbo_drill') {
      b.drillTimer = 0;
      b.drillBuffer = null;
      b.drillOutToggle = 0;
    }
    if (kind === 'bridge') {
      b.bridgeQueue = [];
    }
    if (kind === 'smelter' || kind === 'assembler') {
      b.recipeId = null;
      b.activeRecipeId = null;
      b.inputBuffer = {};
      b.outputBuffer = [];
      b.craftTimer = 0;
      b.craftPulse = 0;
    }

    this.buildings.set(id, b);
    if (kind === 'bridge') {
      this.bridges.add(b);
    }
    for (let dy = 0; dy < b.h; dy++) {
      for (let dx = 0; dx < b.w; dx++) {
        this.cellToBuilding[(y + dy) * GRID_SIZE + (x + dx)] = b;
      }
    }
    return b;
  }

  public removeAt(x: number, y: number): boolean {
    const b = this.getBuildingAt(x, y);
    if (!b || b.kind === 'core') return false;
    this.removeBuildingInternal(b);
    sound.playErase();
    return true;
  }

  private removeBuildingInternal(b: Building) {
    this.buildings.delete(b.id);
    if (b.kind === 'bridge') {
      this.bridges.delete(b);
    }
    for (let dy = 0; dy < b.h; dy++) {
      for (let dx = 0; dx < b.w; dx++) {
        const idx = (b.y + dy) * GRID_SIZE + (b.x + dx);
        if (this.cellToBuilding[idx]?.id === b.id) {
          this.cellToBuilding[idx] = null;
        }
      }
    }
  }

  public setBuildingRecipe(buildingId: number, recipeId: RecipeId | null) {
    const b = this.buildings.get(buildingId);
    if (!b || (b.kind !== 'smelter' && b.kind !== 'assembler')) return;
    b.recipeId = recipeId;
    b.activeRecipeId = recipeId;
    b.craftTimer = 0;
    // Drop incompatible items from inputBuffer so switching recipes never deadlocks
    if (recipeId) {
      const def = RECIPES[recipeId];
      const cleaned: Partial<Record<ItemType, number>> = {};
      for (const [k, v] of Object.entries(b.inputBuffer || {})) {
        if (def.inputs[k as ItemType]) {
          cleaned[k as ItemType] = v;
        }
      }
      b.inputBuffer = cleaned;
    } else {
      b.inputBuffer = {};
    }
    sound.playRotate();
  }

  public setSorterFilter(buildingId: number, item: ItemType | null) {
    const b = this.buildings.get(buildingId);
    if (!b || b.kind !== 'sorter') return;
    b.filterItem = item;
    sound.playRotate();
  }

  public rotatePlacedBuilding(buildingId: number) {
    const b = this.buildings.get(buildingId);
    if (!b || !BUILDINGS[b.kind].rotatable) return;
    b.dir = rotateDir(b.dir, 1);
    sound.playRotate();
  }

  public canAffordUpgrade(key: keyof UpgradeState): boolean {
    if (this.mode === 'sandbox') return true;
    const costs = getUpgradeCost(key, this.upgrades[key]);
    return costs.every((c) => this.inventory[c.item] >= c.amount);
  }

  public buyUpgrade(key: keyof UpgradeState): boolean {
    if (!this.canAffordUpgrade(key)) return false;
    if (this.mode !== 'sandbox') {
      const costs = getUpgradeCost(key, this.upgrades[key]);
      for (const c of costs) {
        this.inventory[c.item] -= c.amount;
      }
    }
    this.upgrades[key] += 1;
    sound.playUpgrade();
    return true;
  }

  public getDrillSpeedMult(): number {
    return 1 + (this.upgrades.drillLevel - 1) * 0.35;
  }

  public getBeltSpeed(): number {
    // Base 1.35 tiles/sec -> at 0.5 spacing = 2.7 items/sec
    return 1.35 * (1 + (this.upgrades.beltLevel - 1) * 0.35);
  }

  public getCraftSpeedMult(): number {
    return 1 + (this.upgrades.craftLevel - 1) * 0.35;
  }

  private recordBuildingThroughput(b: Building) {
    b.throughputCount = (b.throughputCount || 0) + 1;
    if (!b.throughputHistory) b.throughputHistory = [];
    b.throughputHistory.push(this.simTime);
  }

  private spawnParticle(gx: number, gy: number, color: string, count = 3) {
    if (this.particles.length > 260) return;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.4 + Math.random() * 1.4;
      this.particles.push({
        x: gx + 0.5,
        y: gy + 0.5,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.5,
        color,
        size: 2 + Math.random() * 2,
      });
    }
  }

  public step(rawDt: number) {
    const dt = Math.min(rawDt, 0.05) * this.simSpeed;
    if (dt <= 0) return;

    this.simTime += dt;
    if (this.milestoneFlashTimer > 0) {
      this.milestoneFlashTimer = Math.max(0, this.milestoneFlashTimer - rawDt);
    }

    const beltSpeed = this.getBeltSpeed();
    const drillMult = this.getDrillSpeedMult();
    const craftMult = this.getCraftSpeedMult();
    const windowSec = 3.5;
    const cutoff = this.simTime - windowSec;

    // Single-pass update + throughput history pruning
    for (const b of this.buildings.values()) {
      switch (b.kind) {
        case 'drill':
          this.updateDrill(b, dt, drillMult);
          break;
        case 'turbo_drill':
          this.updateTurboDrill(b, dt, drillMult);
          break;
        case 'belt':
          this.updateBelt(b, dt, beltSpeed);
          break;
        case 'junction':
          this.updateJunction(b, dt, beltSpeed);
          break;
        case 'router':
          this.updateRouter(b);
          break;
        case 'sorter':
          this.updateSorter(b);
          break;
        case 'bridge':
          this.updateBridge(b, dt, beltSpeed);
          break;
        case 'smelter':
        case 'assembler':
          this.updateCrafter(b, dt, craftMult);
          break;
      }

      const hist = b.throughputHistory;
      if (hist && hist.length > 0) {
        let drop = 0;
        while (drop < hist.length && hist[drop] < cutoff) {
          drop++;
        }
        if (drop > 0) {
          hist.splice(0, drop);
        }
        b.throughputRate = hist.length / windowSec;
      } else {
        b.throughputRate = 0;
      }
    }

    // Update rolling global delivery windows
    for (const item of ALL_ITEMS) {
      const arr = this.deliveryTimestamps[item];
      let drop = 0;
      while (drop < arr.length && arr[drop] < cutoff) {
        drop++;
      }
      if (drop > 0) {
        arr.splice(0, drop);
      }
      this.rates[item] = arr.length / windowSec;
    }

    // Check milestones in career mode
    if (!this.isDemo && this.mode === 'career' && !this.allMilestonesDone) {
      const m = MILESTONES[this.milestoneIndex];
      if (m) {
        const countOk = this.inventory[m.targetItem] >= m.targetTotal;
        const rateOk = this.rates[m.targetItem] >= m.targetRate;
        if (countOk && rateOk) {
          this.lastCompletedMilestoneTitle = m.title;
          this.milestoneFlashTimer = 3.5;
          sound.playMilestone();
          if (this.milestoneIndex + 1 < MILESTONES.length) {
            this.milestoneIndex += 1;
          } else {
            this.allMilestonesDone = true;
          }
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateDrill(b: Building, dt: number, drillMult: number) {
    const ore = this.getOre(b.x, b.y);
    if (!ore) return;

    if (!b.drillBuffer) {
      const cycle = 1.15 / drillMult;
      b.drillTimer = (b.drillTimer || 0) + dt;
      if (b.drillTimer >= cycle) {
        b.drillTimer -= cycle;
        b.drillBuffer = ore;
      }
    }

    if (b.drillBuffer) {
      const tx = b.x + DX[b.dir];
      const ty = b.y + DY[b.dir];
      const target = this.getBuildingAt(tx, ty);
      if (target && this.tryInsert(target, b.drillBuffer, oppositeDir(b.dir), 0)) {
        this.recordBuildingThroughput(b);
        b.drillBuffer = null;
      }
    }
  }

  private updateTurboDrill(b: Building, dt: number, drillMult: number) {
    let oreCount = 0;
    let minedOre: OreType | null = null;
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const o = this.getOre(b.x + dx, b.y + dy);
        if (o) {
          oreCount++;
          if (!minedOre) minedOre = o;
        }
      }
    }
    if (!minedOre || oreCount === 0) return;

    if (!b.drillBuffer) {
      // Mines proportionally faster based on covered ore tiles
      const cycle = 1.05 / (drillMult * (0.8 + oreCount * 0.75));
      b.drillTimer = (b.drillTimer || 0) + dt;
      if (b.drillTimer >= cycle) {
        b.drillTimer -= cycle;
        b.drillBuffer = minedOre;
      }
    }

    if (b.drillBuffer) {
      if (this.tryPushFrom2x2(b, b.drillBuffer)) {
        this.recordBuildingThroughput(b);
        b.drillBuffer = null;
      }
    }
  }

  private updateBelt(b: Building, dt: number, beltSpeed: number) {
    const items = b.beltItems;
    if (!items || items.length === 0) return;

    // Max 2 items on a belt: swap instead of Array.sort
    if (items.length === 2 && items[0].progress < items[1].progress) {
      const tmp = items[0];
      items[0] = items[1];
      items[1] = tmp;
    }

    const step = beltSpeed * dt;
    items[0].progress = Math.min(1.0, items[0].progress + step);
    if (items.length === 2) {
      const maxProg = Math.max(0, items[0].progress - 0.5);
      items[1].progress = Math.min(maxProg, items[1].progress + step);
    }

    // Attempt handoff of lead item
    const lead = items[0];
    if (lead.progress >= 1.0) {
      const nx = b.x + DX[b.dir];
      const ny = b.y + DY[b.dir];
      const target = this.getBuildingAt(nx, ny);
      if (target) {
        const residual = Math.max(0, lead.progress - 1.0);
        if (this.tryInsert(target, lead.item, oppositeDir(b.dir), residual)) {
          this.recordBuildingThroughput(b);
          items.shift();
        }
      }
    }
  }

  private updateJunction(b: Building, dt: number, beltSpeed: number) {
    const list = b.junctionItems;
    if (!list || list.length === 0) return;

    for (let i = list.length - 1; i >= 0; i--) {
      const it = list[i];
      it.progress = Math.min(1.0, it.progress + beltSpeed * 1.4 * dt);
      if (it.progress >= 1.0) {
        const nx = b.x + DX[it.moveDir];
        const ny = b.y + DY[it.moveDir];
        const target = this.getBuildingAt(nx, ny);
        if (target && this.tryInsert(target, it.item, oppositeDir(it.moveDir), 0)) {
          this.recordBuildingThroughput(b);
          list.splice(i, 1);
        }
      }
    }
  }

  private updateRouter(b: Building) {
    if (!b.routerBuffer) return;
    const { item, fromDir } = b.routerBuffer;
    const startIdx = b.rrIndex || 0;

    for (let offset = 0; offset < 4; offset++) {
      const d = ((startIdx + offset) % 4) as Dir;
      if (d === fromDir) continue;
      const nx = b.x + DX[d];
      const ny = b.y + DY[d];
      const target = this.getBuildingAt(nx, ny);
      if (!target) continue;
      // Do not push into a building whose intake points away / back at this router
      if (
        (target.kind === 'belt' || target.kind === 'sorter' || target.kind === 'bridge') &&
        target.dir === oppositeDir(d)
      ) {
        continue;
      }
      if (target.kind === 'drill' || target.kind === 'turbo_drill') continue;

      if (this.tryInsert(target, item, oppositeDir(d), 0)) {
        this.recordBuildingThroughput(b);
        b.routerBuffer = null;
        b.rrIndex = (d + 1) % 4;
        return;
      }
    }
  }

  private updateSorter(b: Building) {
    if (!b.sorterBuffer) return;
    const { item, fromDir } = b.sorterBuffer;
    const matches = b.filterItem === null || item === b.filterItem;

    if (matches) {
      const d = b.dir;
      if (d !== fromDir) {
        const target = this.getBuildingAt(b.x + DX[d], b.y + DY[d]);
        if (
          target &&
          !(target.kind === 'belt' && target.dir === oppositeDir(d)) &&
          this.tryInsert(target, item, oppositeDir(d), 0)
        ) {
          this.recordBuildingThroughput(b);
          b.sorterBuffer = null;
        }
      }
    } else {
      const left = rotateDir(b.dir, 3);
      const right = rotateDir(b.dir, 1);
      const pair = (b.sorterSideToggle || 0) % 2 === 0 ? [left, right] : [right, left];
      for (const d of pair) {
        if (d === fromDir) continue;
        const target = this.getBuildingAt(b.x + DX[d], b.y + DY[d]);
        if (!target) continue;
        if (target.kind === 'belt' && target.dir === oppositeDir(d)) continue;
        if (this.tryInsert(target, item, oppositeDir(d), 0)) {
          this.recordBuildingThroughput(b);
          b.sorterBuffer = null;
          b.sorterSideToggle = ((b.sorterSideToggle || 0) + 1) % 2;
          return;
        }
      }
    }
  }

  public findBridgeExit(b: Building): Building | null {
    for (let dist = 1; dist <= BRIDGE_MAX_RANGE; dist++) {
      const tx = b.x + DX[b.dir] * dist;
      const ty = b.y + DY[b.dir] * dist;
      const candidate = this.getBuildingAt(tx, ty);
      if (candidate && candidate.kind === 'bridge' && candidate.dir === b.dir) {
        return candidate;
      }
    }
    return null;
  }

  public findBridgeEntrance(b: Building): Building | null {
    const back = oppositeDir(b.dir);
    for (let dist = 1; dist <= BRIDGE_MAX_RANGE; dist++) {
      const tx = b.x + DX[back] * dist;
      const ty = b.y + DY[back] * dist;
      const candidate = this.getBuildingAt(tx, ty);
      if (candidate && candidate.kind === 'bridge' && candidate.dir === b.dir) {
        return candidate;
      }
    }
    return null;
  }

  public placeBridgeSpan(x1: number, y1: number, x2: number, y2: number): boolean {
    if (!this.isUnlocked('bridge')) return false;
    const dx = x2 - x1;
    const dy = y2 - y1;
    if (dx !== 0 && dy !== 0) return false;
    const dist = Math.abs(dx) + Math.abs(dy);
    if (dist < 1 || dist > BRIDGE_MAX_RANGE) return false;

    let dir: Dir = 1;
    if (dx > 0) dir = 1;
    else if (dx < 0) dir = 3;
    else if (dy > 0) dir = 2;
    else if (dy < 0) dir = 0;

    if (!this.canPlaceBuilding('bridge', x1, y1) || !this.canPlaceBuilding('bridge', x2, y2)) {
      return false;
    }
    this.placeBuilding('bridge', x1, y1, dir);
    this.placeBuilding('bridge', x2, y2, dir);
    return true;
  }

  private updateBridge(b: Building, dt: number, beltSpeed: number) {
    const queue = b.bridgeQueue;
    if (!queue || queue.length === 0) return;

    const exit = this.findBridgeExit(b);
    if (!exit) return;

    const dist = Math.abs(exit.x - b.x) + Math.abs(exit.y - b.y);
    const speed = beltSpeed * 1.15;

    // Only sort when order is not already monotonically decreasing
    if (queue.length > 1) {
      let sorted = true;
      for (let i = 1; i < queue.length; i++) {
        if (queue[i].progress > queue[i - 1].progress) {
          sorted = false;
          break;
        }
      }
      if (!sorted) queue.sort((a, c) => c.progress - a.progress);
    }

    for (let i = 0; i < queue.length; i++) {
      const it = queue[i];
      const maxProg = i === 0 ? dist : Math.max(0, queue[i - 1].progress - 0.5);
      it.progress = Math.min(maxProg, it.progress + speed * dt);
    }

    const lead = queue[0];
    if (lead && lead.progress >= dist) {
      const outX = exit.x + DX[exit.dir];
      const outY = exit.y + DY[exit.dir];
      const target = this.getBuildingAt(outX, outY);
      if (target) {
        const residual = Math.max(0, lead.progress - dist);
        if (this.tryInsert(target, lead.item, oppositeDir(exit.dir), residual)) {
          this.recordBuildingThroughput(b);
          this.recordBuildingThroughput(exit);
          queue.shift();
        }
      }
    }
  }

  private resolveCrafterRecipe(b: Building): RecipeId | null {
    if (b.recipeId) return b.recipeId;
    if (b.activeRecipeId) return b.activeRecipeId;

    const buf = b.inputBuffer;
    if (!buf) return null;
    const candidates = b.kind === 'smelter' ? SMELTER_RECIPES : ASSEMBLER_RECIPES;

    for (let i = 0; i < candidates.length; i++) {
      const r = candidates[i];
      const reqs = RECIPE_INPUT_LIST[r.id];
      let hasAll = true;
      for (let j = 0; j < reqs.length; j++) {
        if ((buf[reqs[j][0]] || 0) < reqs[j][1]) {
          hasAll = false;
          break;
        }
      }
      if (hasAll) {
        b.activeRecipeId = r.id;
        return r.id;
      }
    }

    // Check unique non-ambiguous first ingredient
    let matchId: RecipeId | null = null;
    let matchCount = 0;
    let hasAnyInput = false;
    for (const itemKey in buf) {
      if ((buf[itemKey as ItemType] || 0) > 0) {
        hasAnyInput = true;
        break;
      }
    }
    if (hasAnyInput) {
      for (let i = 0; i < candidates.length; i++) {
        const r = candidates[i];
        let compatible = true;
        for (const itemKey in buf) {
          if ((buf[itemKey as ItemType] || 0) > 0 && !r.inputs[itemKey as ItemType]) {
            compatible = false;
            break;
          }
        }
        if (compatible) {
          matchId = r.id;
          matchCount++;
          if (matchCount > 1) break;
        }
      }
      if (matchCount === 1 && matchId) {
        b.activeRecipeId = matchId;
        return matchId;
      }
    }
    return null;
  }

  private updateCrafter(b: Building, dt: number, craftMult: number) {
    if (b.craftPulse && b.craftPulse > 0) {
      b.craftPulse = Math.max(0, b.craftPulse - dt * 2.5);
    }

    // Clear stale auto-detected recipe once machine buffers are completely empty
    if (!b.recipeId && b.activeRecipeId && (b.craftTimer || 0) === 0 && (!b.outputBuffer || b.outputBuffer.length === 0)) {
      let empty = true;
      const buf = b.inputBuffer;
      if (buf) {
        for (const k in buf) {
          if ((buf[k as ItemType] || 0) > 0) {
            empty = false;
            break;
          }
        }
      }
      if (empty) {
        b.activeRecipeId = null;
      }
    }

    const rId = this.resolveCrafterRecipe(b);
    if (rId) {
      const recipe = RECIPES[rId];
      const reqs = RECIPE_INPUT_LIST[rId];
      const buf = b.inputBuffer!;
      const out = b.outputBuffer!;
      let hasInputs = true;
      for (let i = 0; i < reqs.length; i++) {
        if ((buf[reqs[i][0]] || 0) < reqs[i][1]) {
          hasInputs = false;
          break;
        }
      }

      if (hasInputs && out.length < 4) {
        b.craftTimer = (b.craftTimer || 0) + dt * craftMult;
        if (b.craftTimer >= recipe.craftTime) {
          b.craftTimer -= recipe.craftTime;
          for (let i = 0; i < reqs.length; i++) {
            const [itemKey, qty] = reqs[i];
            buf[itemKey] = (buf[itemKey] || 0) - qty;
          }
          for (let i = 0; i < recipe.outputCount; i++) {
            out.push(recipe.output);
          }
          b.craftPulse = 1;
        }
      }
    }

    // Push output
    if (b.outputBuffer && b.outputBuffer.length > 0) {
      const item = b.outputBuffer[0];
      if (this.tryPushFrom2x2(b, item)) {
        this.recordBuildingThroughput(b);
        b.outputBuffer.shift();
      }
    }
  }

  private tryPushFrom2x2(b: Building, item: ItemType): boolean {
    let p0x = b.x;
    let p0y = b.y;
    let p1x = b.x;
    let p1y = b.y;
    const outDir = b.dir;

    if (outDir === 0) {
      p0x = b.x; p0y = b.y - 1;
      p1x = b.x + 1; p1y = b.y - 1;
    } else if (outDir === 1) {
      p0x = b.x + 2; p0y = b.y;
      p1x = b.x + 2; p1y = b.y + 1;
    } else if (outDir === 2) {
      p0x = b.x; p0y = b.y + 2;
      p1x = b.x + 1; p1y = b.y + 2;
    } else {
      p0x = b.x - 1; p0y = b.y;
      p1x = b.x - 1; p1y = b.y + 1;
    }

    const start = b.drillOutToggle || 0;
    const opp = oppositeDir(outDir);
    for (let i = 0; i < 2; i++) {
      const useFirst = (start + i) % 2 === 0;
      const nx = useFirst ? p0x : p1x;
      const ny = useFirst ? p0y : p1y;
      const target = this.getBuildingAt(nx, ny);
      if (target && !(target.kind === 'belt' && target.dir === opp)) {
        if (this.tryInsert(target, item, opp, 0)) {
          b.drillOutToggle = (start + 1) % 2;
          return true;
        }
      }
    }
    return false;
  }

  private tryInsert(target: Building, item: ItemType, fromDir: Dir, residual: number): boolean {
    switch (target.kind) {
      case 'core': {
        this.inventory[item] += 1;
        this.totalDelivered += 1;
        this.deliveryTimestamps[item].push(this.simTime);
        this.recordBuildingThroughput(target);
        return true;
      }
      case 'trash': {
        this.recordBuildingThroughput(target);
        this.spawnParticle(target.x, target.y, '#EF4444', 2);
        return true;
      }
      case 'belt': {
        // Cannot enter belt from its own front exit
        if (fromDir === target.dir) return false;
        const items = target.beltItems!;
        if (items.length >= 2) return false;
        if (items.length === 1) {
          const last = items[0];
          if (last.progress < 0.5) return false;
          items.push({
            item,
            progress: Math.max(0, Math.min(residual, last.progress - 0.5)),
            fromDir,
          });
        } else {
          items.push({ item, progress: Math.max(0, Math.min(residual, 0.45)), fromDir });
        }
        return true;
      }
      case 'junction': {
        const moveDir = oppositeDir(fromDir);
        const list = target.junctionItems!;
        if (list.some((x) => x.moveDir === moveDir)) return false;
        list.push({ item, progress: 0, moveDir });
        return true;
      }
      case 'router': {
        if (target.routerBuffer) return false;
        target.routerBuffer = { item, fromDir };
        return true;
      }
      case 'sorter': {
        if (target.sorterBuffer) return false;
        if (fromDir === target.dir) return false;
        target.sorterBuffer = { item, fromDir };
        return true;
      }
      case 'bridge': {
        if (fromDir === target.dir) return false;
        const exit = this.findBridgeExit(target);
        if (!exit) return false;
        const dist = Math.abs(exit.x - target.x) + Math.abs(exit.y - target.y);
        const maxCap = Math.max(2, dist * 2);
        const queue = target.bridgeQueue!;
        if (queue.length >= maxCap) return false;
        if (queue.length > 0) {
          const last = queue[queue.length - 1];
          if (last.progress < 0.5) return false;
          queue.push({ item, progress: Math.max(0, Math.min(residual, last.progress - 0.5)) });
        } else {
          queue.push({ item, progress: Math.max(0, Math.min(residual, 0.45)) });
        }
        return true;
      }
      case 'smelter':
      case 'assembler': {
        const lockedId = target.recipeId || target.activeRecipeId;
        if (lockedId) {
          const rec = RECIPES[lockedId];
          if (!rec.inputs[item]) return false;
          const cur = target.inputBuffer![item] || 0;
          if (cur >= 5) return false;
          target.inputBuffer![item] = cur + 1;
          return true;
        }
        if (!BUILDING_VALID_INPUTS[target.kind].has(item)) return false;
        const cur = target.inputBuffer![item] || 0;
        if (cur >= 5) return false;
        target.inputBuffer![item] = cur + 1;
        return true;
      }
      default:
        return false;
    }
  }

  public copyRegion(x1: number, y1: number, x2: number, y2: number): BlueprintTile[] {
    const minX = Math.max(0, Math.min(x1, x2));
    const maxX = Math.min(GRID_SIZE - 1, Math.max(x1, x2));
    const minY = Math.max(0, Math.min(y1, y2));
    const maxY = Math.min(GRID_SIZE - 1, Math.max(y1, y2));

    const seen = new Set<number>();
    const list: BlueprintTile[] = [];
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const b = this.getBuildingAt(x, y);
        if (!b || b.kind === 'core' || seen.has(b.id)) continue;
        if (b.x < minX || b.y < minY) continue;
        seen.add(b.id);
        list.push({
          dx: b.x - minX,
          dy: b.y - minY,
          kind: b.kind,
          dir: b.dir,
          filterItem: b.filterItem ?? null,
          recipeId: b.recipeId ?? null,
        });
      }
    }
    return list;
  }

  public eraseRegion(x1: number, y1: number, x2: number, y2: number): number {
    const minX = Math.max(0, Math.min(x1, x2));
    const maxX = Math.min(GRID_SIZE - 1, Math.max(x1, x2));
    const minY = Math.max(0, Math.min(y1, y2));
    const maxY = Math.min(GRID_SIZE - 1, Math.max(y1, y2));

    let count = 0;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (this.removeAt(x, y)) count++;
      }
    }
    return count;
  }

  public rotateBlueprint(bp: BlueprintTile[]): BlueprintTile[] {
    if (bp.length === 0) return bp;
    let maxW = 0;
    let maxH = 0;
    for (const t of bp) {
      const sz = BUILDINGS[t.kind].size;
      maxW = Math.max(maxW, t.dx + sz);
      maxH = Math.max(maxH, t.dy + sz);
    }
    return bp.map((t) => {
      const sz = BUILDINGS[t.kind].size;
      const newDx = maxH - (t.dy + sz);
      const newDy = t.dx;
      return {
        ...t,
        dx: newDx,
        dy: newDy,
        dir: rotateDir(t.dir, 1),
      };
    });
  }

  public pasteBlueprint(bp: BlueprintTile[], originX: number, originY: number): number {
    let placed = 0;
    for (const t of bp) {
      if (!this.isUnlocked(t.kind)) continue;
      const b = this.placeBuilding(t.kind, originX + t.dx, originY + t.dy, t.dir);
      if (b) {
        if (t.kind === 'sorter' && t.filterItem !== undefined) {
          b.filterItem = t.filterItem;
        }
        if ((t.kind === 'smelter' || t.kind === 'assembler') && t.recipeId) {
          b.recipeId = t.recipeId;
          b.activeRecipeId = t.recipeId;
        }
        placed++;
      }
    }
    return placed;
  }

  public getHudSnapshot(
    selectedBuildingId: number | null,
    hoverGx: number | null,
    hoverGy: number | null,
    blueprintCount: number
  ): HudSnapshot {
    let selectedInfo: HudSnapshot['selectedBuilding'] = null;
    if (selectedBuildingId !== null) {
      const b = this.buildings.get(selectedBuildingId);
      if (b) {
        let craftProgress = 0;
        let maxRate = 0;
        let cycleSec: number | null = null;
        let oreUnderneath: OreType | null = null;
        let oreTilesCount = 0;
        let bufferUsed = 0;
        let bufferCap = 0;
        let itemsInside: ItemType[] = [];
        let bridgeRole: 'entry' | 'exit' | 'unlinked' | null = null;
        let bridgeSpan: number | null = null;

        const beltSpeed = this.getBeltSpeed();
        const drillMult = this.getDrillSpeedMult();
        const craftMult = this.getCraftSpeedMult();

        if (b.kind === 'belt') {
          maxRate = beltSpeed / 0.5;
          bufferUsed = b.beltItems?.length || 0;
          bufferCap = 2;
          itemsInside = (b.beltItems || []).map((x) => x.item);
        } else if (b.kind === 'junction') {
          maxRate = beltSpeed * 1.4 * 2;
          bufferUsed = b.junctionItems?.length || 0;
          bufferCap = 4;
          itemsInside = (b.junctionItems || []).map((x) => x.item);
        } else if (b.kind === 'router') {
          maxRate = beltSpeed / 0.5;
          bufferUsed = b.routerBuffer ? 1 : 0;
          bufferCap = 1;
          if (b.routerBuffer) itemsInside = [b.routerBuffer.item];
        } else if (b.kind === 'sorter') {
          maxRate = beltSpeed / 0.5;
          bufferUsed = b.sorterBuffer ? 1 : 0;
          bufferCap = 1;
          if (b.sorterBuffer) itemsInside = [b.sorterBuffer.item];
        } else if (b.kind === 'bridge') {
          const exit = this.findBridgeExit(b);
          const entrance = this.findBridgeEntrance(b);
          if (exit) {
            bridgeRole = 'entry';
            bridgeSpan = Math.abs(exit.x - b.x) + Math.abs(exit.y - b.y);
            maxRate = (beltSpeed * 1.15) / 0.5;
            bufferUsed = b.bridgeQueue?.length || 0;
            bufferCap = Math.max(2, bridgeSpan * 2);
            itemsInside = (b.bridgeQueue || []).map((q) => q.item);
          } else if (entrance) {
            bridgeRole = 'exit';
            bridgeSpan = Math.abs(b.x - entrance.x) + Math.abs(b.y - entrance.y);
            maxRate = (beltSpeed * 1.15) / 0.5;
            bufferUsed = entrance.bridgeQueue?.length || 0;
            bufferCap = Math.max(2, bridgeSpan * 2);
            itemsInside = (entrance.bridgeQueue || []).map((q) => q.item);
          } else {
            bridgeRole = 'unlinked';
          }
        } else if (b.kind === 'drill') {
          oreUnderneath = this.getOre(b.x, b.y);
          oreTilesCount = oreUnderneath ? 1 : 0;
          if (oreUnderneath) {
            cycleSec = 1.15 / drillMult;
            maxRate = 1 / cycleSec;
          }
          bufferUsed = b.drillBuffer ? 1 : 0;
          bufferCap = 1;
          if (b.drillBuffer) itemsInside = [b.drillBuffer];
        } else if (b.kind === 'turbo_drill') {
          for (let dy = 0; dy < 2; dy++) {
            for (let dx = 0; dx < 2; dx++) {
              const o = this.getOre(b.x + dx, b.y + dy);
              if (o) {
                oreTilesCount++;
                if (!oreUnderneath) oreUnderneath = o;
              }
            }
          }
          if (oreTilesCount > 0) {
            cycleSec = 1.05 / (drillMult * (0.8 + oreTilesCount * 0.75));
            maxRate = 1 / cycleSec;
          }
          bufferUsed = b.drillBuffer ? 1 : 0;
          bufferCap = 1;
          if (b.drillBuffer) itemsInside = [b.drillBuffer];
        } else if (b.kind === 'smelter' || b.kind === 'assembler') {
          const rId = b.recipeId || b.activeRecipeId;
          if (rId && RECIPES[rId]) {
            const rec = RECIPES[rId];
            cycleSec = rec.craftTime / craftMult;
            maxRate = rec.outputCount / cycleSec;
            craftProgress = Math.min(1, (b.craftTimer || 0) / rec.craftTime);
          }
          bufferUsed = b.outputBuffer?.length || 0;
          bufferCap = 4;
          itemsInside = [...(b.outputBuffer || [])];
        } else if (b.kind === 'core') {
          maxRate = 12 * (beltSpeed / 0.5);
        }

        selectedInfo = {
          id: b.id,
          kind: b.kind,
          x: b.x,
          y: b.y,
          dir: b.dir,
          filterItem: b.filterItem ?? null,
          recipeId: b.recipeId ?? null,
          activeRecipeId: b.activeRecipeId ?? null,
          inputBuffer: { ...(b.inputBuffer || {}) },
          outputCount: b.outputBuffer?.length || 0,
          craftProgress,
          localRate: b.throughputRate || 0,
          throughputCount: b.throughputCount || 0,
          maxRate,
          cycleSec,
          oreUnderneath,
          oreTilesCount,
          bufferUsed,
          bufferCap,
          itemsInside,
          bridgeRole,
          bridgeSpan,
        };
      }
    }

    let hoveredInfo: HudSnapshot['hoveredInfo'] = null;
    if (
      hoverGx !== null &&
      hoverGy !== null &&
      hoverGx >= 0 &&
      hoverGy >= 0 &&
      hoverGx < GRID_SIZE &&
      hoverGy < GRID_SIZE
    ) {
      const b = this.getBuildingAt(hoverGx, hoverGy);
      let itemOnTile: ItemType | null = null;
      if (b?.beltItems && b.beltItems.length > 0) itemOnTile = b.beltItems[0].item;
      else if (b?.drillBuffer) itemOnTile = b.drillBuffer;
      else if (b?.routerBuffer) itemOnTile = b.routerBuffer.item;
      else if (b?.sorterBuffer) itemOnTile = b.sorterBuffer.item;
      else if (b?.outputBuffer && b.outputBuffer.length > 0) itemOnTile = b.outputBuffer[0];

      hoveredInfo = {
        gx: hoverGx,
        gy: hoverGy,
        ore: this.getOre(hoverGx, hoverGy),
        buildingKind: b?.kind || null,
        localRate: b?.throughputRate || 0,
        itemOnTile,
      };
    }

    return {
      mode: this.mode,
      simSpeed: this.simSpeed,
      milestoneIndex: this.milestoneIndex,
      milestoneCompleteFlash: this.milestoneFlashTimer > 0,
      allMilestonesDone: this.allMilestonesDone,
      inventory: { ...this.inventory },
      rates: { ...this.rates },
      upgrades: { ...this.upgrades },
      buildingCount: Math.max(0, this.buildings.size - 1),
      totalDelivered: this.totalDelivered,
      selectedBuilding: selectedInfo,
      hoveredInfo,
      blueprintCount,
    };
  }

  public exportSaveJson(): string {
    const payload: SavePayload = {
      version: 2,
      gridSize: GRID_SIZE,
      seed: this.seed,
      mode: this.mode,
      milestoneIndex: this.milestoneIndex,
      allMilestonesDone: this.allMilestonesDone,
      inventory: this.inventory,
      upgrades: this.upgrades,
      buildings: Array.from(this.buildings.values())
        .filter((b) => b.kind !== 'core')
        .map((b) => ({
          kind: b.kind,
          x: b.x,
          y: b.y,
          dir: b.dir,
          filterItem: b.filterItem ?? null,
          recipeId: b.recipeId ?? null,
        })),
    };
    return JSON.stringify(payload);
  }

  public importSaveJson(raw: string): boolean {
    try {
      const data = JSON.parse(raw) as SavePayload;
      if (!data || data.version !== 2 || data.gridSize !== GRID_SIZE) return false;

      this.initNewWorld(data.seed || 104729, data.mode || 'career', false);
      this.milestoneIndex = Math.max(0, Math.min(MILESTONES.length - 1, data.milestoneIndex || 0));
      this.allMilestonesDone = Boolean(data.allMilestonesDone);
      if (data.inventory) {
        this.inventory = { ...this.createEmptyItemMap(), ...data.inventory };
      }
      if (data.upgrades) {
        this.upgrades = { ...this.upgrades, ...data.upgrades };
      }
      for (const sb of data.buildings || []) {
        if (!sb || !BUILDINGS[sb.kind] || sb.kind === 'core') continue;
        if (!this.canPlaceBuilding(sb.kind, sb.x, sb.y)) continue;
        const safeDir = ((((sb.dir || 0) % 4) + 4) % 4) as Dir;
        const b = this.placeBuildingInternal(sb.kind, sb.x, sb.y, safeDir);
        if (sb.kind === 'sorter' && sb.filterItem !== undefined) {
          b.filterItem = sb.filterItem;
        }
        if ((sb.kind === 'smelter' || sb.kind === 'assembler') && sb.recipeId && RECIPES[sb.recipeId]) {
          b.recipeId = sb.recipeId;
          b.activeRecipeId = sb.recipeId;
        }
      }
      return true;
    } catch {
      return false;
    }
  }

  public saveToLocalStorage() {
    if (this.isDemo) return;
    try {
      localStorage.setItem(SAVE_KEY, this.exportSaveJson());
    } catch {
      // Ignore storage quota errors
    }
  }

  public static hasSavedGame(): boolean {
    try {
      return Boolean(localStorage.getItem(SAVE_KEY));
    } catch {
      return false;
    }
  }

  public loadFromLocalStorage(): boolean {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      return this.importSaveJson(raw);
    } catch {
      return false;
    }
  }
}
