import { BuildingKind, ItemType, MilestoneDef, OreType, RecipeDef, RecipeId } from './types';

export const GRID_SIZE = 192;
export const CORE_POS = 95; // 3x3 occupies 95..97
export const CORE_SIZE = 3;
export const TILE_PX = 32;
export const ANIM_FPS = 24;
export const BRIDGE_MAX_RANGE = 10;

export const ORE_INFO: Record<
  OreType,
  { name: string; color: string; glow: string; dark: string; short: string }
> = {
  copper: {
    name: 'Медь',
    color: '#E07A38',
    glow: '#F4A261',
    dark: '#7C3A16',
    short: 'Cu',
  },
  iron: {
    name: 'Железо',
    color: '#6B9AC4',
    glow: '#9BC1E2',
    dark: '#335370',
    short: 'Fe',
  },
  coal: {
    name: 'Уголь',
    color: '#5C647A',
    glow: '#8892AD',
    dark: '#2A2F3D',
    short: 'C',
  },
  quartz: {
    name: 'Кварц',
    color: '#D4B483',
    glow: '#EDD6B0',
    dark: '#7B633F',
    short: 'SiO₂',
  },
  titanium: {
    name: 'Титан',
    color: '#38BDF8',
    glow: '#7DD3FC',
    dark: '#145E85',
    short: 'Ti',
  },
};

export const ITEM_INFO: Record<
  ItemType,
  { name: string; color: string; accent: string; shape: 'ore' | 'ingot' | 'coil' | 'chip' | 'plate' | 'core' }
> = {
  copper: { name: 'Медная руда', color: '#E07A38', accent: '#F4A261', shape: 'ore' },
  iron: { name: 'Железная руда', color: '#6B9AC4', accent: '#A8CBE8', shape: 'ore' },
  coal: { name: 'Уголь', color: '#586076', accent: '#909AB3', shape: 'ore' },
  quartz: { name: 'Кварц', color: '#D4B483', accent: '#F3DFC1', shape: 'ore' },
  titanium: { name: 'Титан', color: '#38BDF8', accent: '#BAE6FD', shape: 'ore' },
  coil: { name: 'Медная катушка', color: '#F59E0B', accent: '#FDE68A', shape: 'coil' },
  steel: { name: 'Сталь', color: '#CBD5E1', accent: '#F8FAFC', shape: 'ingot' },
  silicon: { name: 'Кремний', color: '#818CF8', accent: '#C7D2FE', shape: 'chip' },
  circuit: { name: 'Микросхема', color: '#10B981', accent: '#6EE7B7', shape: 'chip' },
  composite: { name: 'Композит', color: '#0EA5E9', accent: '#E0F2FE', shape: 'plate' },
  hyperblock: { name: 'Гиперблок', color: '#F43F5E', accent: '#FECDD3', shape: 'core' },
};

export const ALL_ITEMS: ItemType[] = [
  'copper',
  'iron',
  'coal',
  'quartz',
  'titanium',
  'coil',
  'steel',
  'silicon',
  'circuit',
  'composite',
  'hyperblock',
];

export const RECIPES: Record<RecipeId, RecipeDef> = {
  coil: {
    id: 'coil',
    name: 'Медная катушка',
    building: 'smelter',
    inputs: { copper: 2 },
    output: 'coil',
    outputCount: 1,
    craftTime: 1.1,
  },
  steel: {
    id: 'steel',
    name: 'Сталь',
    building: 'smelter',
    inputs: { iron: 1, coal: 1 },
    output: 'steel',
    outputCount: 1,
    craftTime: 1.3,
  },
  silicon: {
    id: 'silicon',
    name: 'Кремний',
    building: 'smelter',
    inputs: { quartz: 1, coal: 1 },
    output: 'silicon',
    outputCount: 1,
    craftTime: 1.4,
  },
  circuit: {
    id: 'circuit',
    name: 'Микросхема',
    building: 'assembler',
    inputs: { silicon: 1, coil: 1 },
    output: 'circuit',
    outputCount: 1,
    craftTime: 1.6,
  },
  composite: {
    id: 'composite',
    name: 'Композит',
    building: 'assembler',
    inputs: { steel: 1, titanium: 1 },
    output: 'composite',
    outputCount: 1,
    craftTime: 1.8,
  },
  hyperblock: {
    id: 'hyperblock',
    name: 'Гиперблок',
    building: 'assembler',
    inputs: { circuit: 1, composite: 1 },
    output: 'hyperblock',
    outputCount: 1,
    craftTime: 2.2,
  },
};

export const ALL_RECIPES: RecipeDef[] = Object.values(RECIPES);
export const SMELTER_RECIPES: RecipeDef[] = ALL_RECIPES.filter((r) => r.building === 'smelter');
export const ASSEMBLER_RECIPES: RecipeDef[] = ALL_RECIPES.filter((r) => r.building === 'assembler');

export const RECIPE_INPUT_LIST: Record<RecipeId, Array<[ItemType, number]>> = {
  coil: Object.entries(RECIPES.coil.inputs) as Array<[ItemType, number]>,
  steel: Object.entries(RECIPES.steel.inputs) as Array<[ItemType, number]>,
  silicon: Object.entries(RECIPES.silicon.inputs) as Array<[ItemType, number]>,
  circuit: Object.entries(RECIPES.circuit.inputs) as Array<[ItemType, number]>,
  composite: Object.entries(RECIPES.composite.inputs) as Array<[ItemType, number]>,
  hyperblock: Object.entries(RECIPES.hyperblock.inputs) as Array<[ItemType, number]>,
};

export const BUILDING_VALID_INPUTS: Record<'smelter' | 'assembler', Set<ItemType>> = {
  smelter: new Set(SMELTER_RECIPES.flatMap((r) => Object.keys(r.inputs) as ItemType[])),
  assembler: new Set(ASSEMBLER_RECIPES.flatMap((r) => Object.keys(r.inputs) as ItemType[])),
};

export interface BuildingDef {
  kind: BuildingKind;
  name: string;
  hotkey: string;
  size: 1 | 2 | 3;
  rotatable: boolean;
  description: string;
  unlockTier: number;
}

export const BUILDINGS: Record<BuildingKind, BuildingDef> = {
  core: {
    kind: 'core',
    name: 'Ядро',
    hotkey: '',
    size: 3,
    rotatable: false,
    description: 'Центр приёма ресурсов. Замеряет суммарный поток.',
    unlockTier: 0,
  },
  belt: {
    kind: 'belt',
    name: 'Лента',
    hotkey: '1',
    size: 1,
    rotatable: true,
    description: 'Транспортирует предметы. Зажмите ЛКМ и тяните для автомаршрута.',
    unlockTier: 0,
  },
  drill: {
    kind: 'drill',
    name: 'Бур',
    hotkey: '2',
    size: 1,
    rotatable: true,
    description: 'Ставится на залежи руды и подаёт сырьё по стрелке.',
    unlockTier: 0,
  },
  router: {
    kind: 'router',
    name: 'Разветвитель',
    hotkey: '3',
    size: 1,
    rotatable: false,
    description: 'Делит входящий поток поровну на все выходные стороны.',
    unlockTier: 0,
  },
  junction: {
    kind: 'junction',
    name: 'Перекрёсток',
    hotkey: '4',
    size: 1,
    rotatable: false,
    description: 'Пропускает два пересекающихся потока без смешивания.',
    unlockTier: 0,
  },
  bridge: {
    kind: 'bridge',
    name: 'Мост',
    hotkey: '5',
    size: 1,
    rotatable: true,
    description: 'Подземный переход до 10 клеток. Можно протянуть мышью от входа до выхода.',
    unlockTier: 1,
  },
  sorter: {
    kind: 'sorter',
    name: 'Фильтр',
    hotkey: '6',
    size: 1,
    rotatable: true,
    description: 'Пропускает выбранный ресурс прямо, остальные отводит вбок.',
    unlockTier: 1,
  },
  smelter: {
    kind: 'smelter',
    name: 'Плавильня',
    hotkey: '7',
    size: 2,
    rotatable: true,
    description: 'Переплавляет руду в катушки, сталь и кремний (2×2).',
    unlockTier: 2,
  },
  turbo_drill: {
    kind: 'turbo_drill',
    name: 'Карьерный бур',
    hotkey: '8',
    size: 2,
    rotatable: true,
    description: 'Охватывает 4 клетки руды сразу и выгружает в два потока (2×2).',
    unlockTier: 3,
  },
  assembler: {
    kind: 'assembler',
    name: 'Сборочный цех',
    hotkey: '9',
    size: 2,
    rotatable: true,
    description: 'Собирает микросхемы, композит и гиперблоки (2×2).',
    unlockTier: 4,
  },
  trash: {
    kind: 'trash',
    name: 'Утилизатор',
    hotkey: '0',
    size: 1,
    rotatable: false,
    description: 'Уничтожает лишние предметы для разгрузки линий.',
    unlockTier: 0,
  },
};

export const BUILDABLE_ORDER: BuildingKind[] = [
  'belt',
  'drill',
  'router',
  'junction',
  'bridge',
  'sorter',
  'smelter',
  'turbo_drill',
  'assembler',
  'trash',
];

export const MILESTONES: MilestoneDef[] = [
  {
    level: 1,
    title: 'Первая линия добычи',
    description: 'Наладьте подачу медной руды в Ядро с помощью буров и лент.',
    targetItem: 'copper',
    targetTotal: 25,
    targetRate: 1.5,
    unlocks: 'Мост и Фильтр',
  },
  {
    level: 2,
    title: 'Железный поток',
    description: 'Подключите железные жилы и ускорьте подачу до устойчивого темпа.',
    targetItem: 'iron',
    targetTotal: 50,
    targetRate: 3.0,
    unlocks: 'Плавильня (2×2)',
  },
  {
    level: 3,
    title: 'Индустриальная плавка',
    description: 'Переплавляйте медь в катушки внутри Плавильни.',
    targetItem: 'coil',
    targetTotal: 40,
    targetRate: 2.0,
    unlocks: 'Карьерный бур (2×2)',
  },
  {
    level: 4,
    title: 'Стальной каркас',
    description: 'Сведите потоки железа и угля в Плавильне для выплавки стали.',
    targetItem: 'steel',
    targetTotal: 50,
    targetRate: 2.5,
    unlocks: 'Сборочный цех (2×2)',
  },
  {
    level: 5,
    title: 'Кремниевая база',
    description: 'Совместите кварц и уголь, чтобы наладить стабильный выпуск кремния.',
    targetItem: 'silicon',
    targetTotal: 60,
    targetRate: 3.0,
  },
  {
    level: 6,
    title: 'Электроника завода',
    description: 'Подайте кремний и катушки в Сборочный цех для выпуска микросхем.',
    targetItem: 'circuit',
    targetTotal: 50,
    targetRate: 2.5,
  },
  {
    level: 7,
    title: 'Титановый композит',
    description: 'Протяните магистрали с дальних титановых жил и выплавьте композит.',
    targetItem: 'composite',
    targetTotal: 50,
    targetRate: 2.5,
  },
  {
    level: 8,
    title: 'Абсолютный гиперблок',
    description: 'Объедините микросхемы и композит в вершину производственной цепочки.',
    targetItem: 'hyperblock',
    targetTotal: 40,
    targetRate: 2.0,
  },
];

export interface UpgradeCost {
  item: ItemType;
  amount: number;
}

export function getUpgradeCost(key: 'drillLevel' | 'beltLevel' | 'craftLevel', currentLevel: number): UpgradeCost[] {
  const step = currentLevel - 1;
  if (key === 'drillLevel') {
    if (step === 0) return [{ item: 'copper', amount: 30 }, { item: 'iron', amount: 20 }];
    if (step === 1) return [{ item: 'coil', amount: 40 }, { item: 'steel', amount: 30 }];
    if (step === 2) return [{ item: 'circuit', amount: 40 }, { item: 'steel', amount: 60 }];
    return [{ item: 'circuit', amount: 60 * step }, { item: 'composite', amount: 40 * step }];
  }
  if (key === 'beltLevel') {
    if (step === 0) return [{ item: 'copper', amount: 25 }, { item: 'iron', amount: 25 }];
    if (step === 1) return [{ item: 'coil', amount: 35 }, { item: 'silicon', amount: 25 }];
    if (step === 2) return [{ item: 'circuit', amount: 45 }, { item: 'composite', amount: 30 }];
    return [{ item: 'circuit', amount: 50 * step }, { item: 'hyperblock', amount: 20 * step }];
  }
  // craftLevel
  if (step === 0) return [{ item: 'coil', amount: 30 }, { item: 'iron', amount: 40 }];
  if (step === 1) return [{ item: 'steel', amount: 45 }, { item: 'silicon', amount: 35 }];
  if (step === 2) return [{ item: 'circuit', amount: 50 }, { item: 'composite', amount: 40 }];
  return [{ item: 'hyperblock', amount: 25 * step }, { item: 'circuit', amount: 60 * step }];
}
