export type Dir = 0 | 1 | 2 | 3; // 0: North, 1: East, 2: South, 3: West

export type OreType = 'copper' | 'iron' | 'coal' | 'quartz' | 'titanium';

export type ItemType =
  | OreType
  | 'coil'
  | 'steel'
  | 'silicon'
  | 'circuit'
  | 'composite'
  | 'hyperblock';

export type BuildingKind =
  | 'core'
  | 'belt'
  | 'drill'
  | 'turbo_drill'
  | 'junction'
  | 'router'
  | 'sorter'
  | 'bridge'
  | 'smelter'
  | 'assembler'
  | 'trash';

export type RecipeId =
  | 'coil'
  | 'steel'
  | 'silicon'
  | 'circuit'
  | 'composite'
  | 'hyperblock';

export interface RecipeDef {
  id: RecipeId;
  name: string;
  building: 'smelter' | 'assembler';
  inputs: Partial<Record<ItemType, number>>;
  output: ItemType;
  outputCount: number;
  craftTime: number;
}

export interface BeltItem {
  item: ItemType;
  progress: number; // 0..1 along tile
  fromDir: Dir;
}

export interface JunctionLaneItem {
  item: ItemType;
  progress: number; // 0..1
  moveDir: Dir;
}

export interface BridgeItem {
  item: ItemType;
  progress: number; // 0..dist in tiles
}

export interface Building {
  id: number;
  kind: BuildingKind;
  x: number; // top-left anchor x
  y: number; // top-left anchor y
  w: number;
  h: number;
  dir: Dir;
  // Belt
  beltItems?: BeltItem[];
  // Junction
  junctionItems?: JunctionLaneItem[];
  // Router
  routerBuffer?: { item: ItemType; fromDir: Dir } | null;
  rrIndex?: number;
  // Sorter
  filterItem?: ItemType | null;
  sorterBuffer?: { item: ItemType; fromDir: Dir } | null;
  sorterSideToggle?: number;
  // Drill
  drillTimer?: number;
  drillBuffer?: ItemType | null;
  drillOutToggle?: number;
  // Bridge
  bridgeQueue?: BridgeItem[];
  // Crafters (smelter / assembler)
  recipeId?: RecipeId | null; // null = auto-detect
  activeRecipeId?: RecipeId | null;
  inputBuffer?: Partial<Record<ItemType, number>>;
  outputBuffer?: ItemType[];
  craftTimer?: number;
  craftPulse?: number;
  // Telemetry
  throughputCount?: number;
  throughputRate?: number;
  throughputHistory?: number[]; // timestamps in simTime
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface BlueprintTile {
  dx: number;
  dy: number;
  kind: BuildingKind;
  dir: Dir;
  filterItem?: ItemType | null;
  recipeId?: RecipeId | null;
}

export type GameMode = 'career' | 'sandbox';
export type GameScreen = 'TITLE_MENU' | 'PLAYING' | 'PAUSED';
export type ToolMode = 'build' | 'erase' | 'select' | 'inspect';

export interface UpgradeState {
  drillLevel: number;
  beltLevel: number;
  craftLevel: number;
}

export interface MilestoneDef {
  level: number;
  title: string;
  description: string;
  targetItem: ItemType;
  targetTotal: number;
  targetRate: number; // items/sec
  unlocks?: string;
}

export interface HudSnapshot {
  mode: GameMode;
  simSpeed: number;
  milestoneIndex: number;
  milestoneCompleteFlash: boolean;
  allMilestonesDone: boolean;
  inventory: Record<ItemType, number>;
  rates: Record<ItemType, number>;
  upgrades: UpgradeState;
  buildingCount: number;
  totalDelivered: number;
  selectedBuilding: {
    id: number;
    kind: BuildingKind;
    x: number;
    y: number;
    dir: Dir;
    filterItem: ItemType | null;
    recipeId: RecipeId | null;
    activeRecipeId: RecipeId | null;
    inputBuffer: Partial<Record<ItemType, number>>;
    outputCount: number;
    craftProgress: number;
    localRate: number;
    throughputCount: number;
    maxRate: number;
    cycleSec: number | null;
    oreUnderneath: OreType | null;
    oreTilesCount: number;
    bufferUsed: number;
    bufferCap: number;
    itemsInside: ItemType[];
    bridgeRole: 'entry' | 'exit' | 'unlinked' | null;
    bridgeSpan: number | null;
  } | null;
  hoveredInfo: {
    gx: number;
    gy: number;
    ore: OreType | null;
    buildingKind: BuildingKind | null;
    localRate: number;
    itemOnTile: ItemType | null;
  } | null;
  blueprintCount: number;
}
