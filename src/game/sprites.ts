import { ITEM_INFO, ORE_INFO } from './constants';
import { Dir, ItemType, OreType } from './types';

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

function makeRotatedVariants(base: HTMLCanvasElement): [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement] {
  const w = base.width;
  const h = base.height;
  const variants: HTMLCanvasElement[] = [base];
  for (let d = 1 as Dir; d <= 3; d = (d + 1) as Dir) {
    const [c, ctx] = makeCanvas(w, h);
    ctx.translate(w / 2, h / 2);
    ctx.rotate((d * Math.PI) / 2);
    ctx.drawImage(base, -w / 2, -h / 2, w, h);
    variants.push(c);
  }
  return variants as [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement];
}

function p(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, w = 1, h = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawBevelBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: string,
  hi: string,
  lo: string,
  outline = '#0B0E14'
) {
  p(ctx, x, y, outline, w, h);
  p(ctx, x + 1, y + 1, fill, w - 2, h - 2);
  p(ctx, x + 1, y + 1, hi, w - 2, 1);
  p(ctx, x + 1, y + 1, hi, 1, h - 2);
  p(ctx, x + 1, y + h - 2, lo, w - 2, 1);
  p(ctx, x + w - 2, y + 1, lo, 1, h - 2);
}

function drawRivets(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color = '#4A5568') {
  p(ctx, x + 3, y + 3, color);
  p(ctx, x + w - 4, y + 3, color);
  p(ctx, x + 3, y + h - 4, color);
  p(ctx, x + w - 4, y + h - 4, color);
}

export type DirSprites = [HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement, HTMLCanvasElement];

export interface SpriteAtlas {
  floor: HTMLCanvasElement[];
  ores: Record<OreType, HTMLCanvasElement[]>;
  belt: DirSprites[]; // [frame][dir]
  drill: DirSprites[]; // [frame][dir]
  turboDrill: DirSprites[]; // [frame][dir] (64x64)
  router: HTMLCanvasElement;
  junction: HTMLCanvasElement;
  sorter: DirSprites; // [dir]
  bridge: {
    unlinked: DirSprites;
    entry: DirSprites;
    exit: DirSprites;
  };
  trash: HTMLCanvasElement[]; // 2 frames
  smelter: DirSprites[]; // [frame][dir] (64x64)
  assembler: DirSprites[]; // [frame][dir] (64x64)
  core: HTMLCanvasElement[]; // 4 frames (96x96)
  items: Record<ItemType, HTMLCanvasElement>; // 16x16
}

let cachedAtlas: SpriteAtlas | null = null;

export function getSpriteAtlas(): SpriteAtlas {
  if (cachedAtlas) return cachedAtlas;

  // 1. Floor Tiles (32x32 x 4 variants)
  const floor: HTMLCanvasElement[] = [];
  for (let v = 0; v < 4; v++) {
    const [c, ctx] = makeCanvas(32, 32);
    p(ctx, 0, 0, '#141923', 32, 32);
    for (let y = 0; y < 32; y += 2) {
      for (let x = y % 4 === 0 ? 0 : 1; x < 32; x += 4) {
        if ((x * 7 + y * 13 + v * 19) % 11 === 0) {
          p(ctx, x, y, '#181F2B');
        }
      }
    }
    if (v === 1) {
      p(ctx, 6, 9, '#1B2230', 2, 1);
      p(ctx, 21, 23, '#10141C', 2, 2);
    } else if (v === 2) {
      p(ctx, 18, 7, '#1B2230', 3, 1);
      p(ctx, 8, 22, '#1D2534', 1, 2);
    } else if (v === 3) {
      p(ctx, 4, 4, '#1A212E', 2, 2);
      p(ctx, 24, 15, '#10141C', 2, 1);
    }
    p(ctx, 0, 0, '#1A202C', 32, 1);
    p(ctx, 0, 0, '#1A202C', 1, 32);
    floor.push(c);
  }

  // 2. Ore Tiles (32x32 x 2 variants per ore)
  const ores = {} as Record<OreType, HTMLCanvasElement[]>;
  (Object.keys(ORE_INFO) as OreType[]).forEach((ore) => {
    const info = ORE_INFO[ore];
    ores[ore] = [];
    for (let v = 0; v < 2; v++) {
      const [c, ctx] = makeCanvas(32, 32);
      p(ctx, 0, 0, '#141923', 32, 32);
      p(ctx, 2, 3, info.dark, 28, 26);
      p(ctx, 4, 2, info.dark, 24, 28);
      p(ctx, 4, 27, '#0D1017', 24, 2);
      p(ctx, 27, 5, '#0D1017', 2, 22);

      const ox = v === 0 ? 0 : 2;
      const oy = v === 0 ? 0 : -1;
      p(ctx, 7 + ox, 7 + oy, info.color, 10, 9);
      p(ctx, 9 + ox, 5 + oy, info.color, 6, 13);
      p(ctx, 8 + ox, 7 + oy, info.glow, 4, 3);
      p(ctx, 9 + ox, 6 + oy, '#FFFFFF', 2, 1);

      p(ctx, 16 - ox, 15 - oy, info.color, 9, 8);
      p(ctx, 18 - ox, 13 - oy, info.color, 5, 11);
      p(ctx, 17 - ox, 15 - oy, info.glow, 3, 3);

      p(ctx, 6 + ox, 19, info.color, 7, 6);
      p(ctx, 7 + ox, 20, info.glow, 2, 2);

      p(ctx, 20, 6 + oy, info.color, 5, 5);
      p(ctx, 21, 7 + oy, info.glow, 2, 2);

      ores[ore].push(c);
    }
  });

  // 3. Conveyor Belt (32x32 x 4 frames x 4 dirs)
  const belt: DirSprites[] = [];
  for (let f = 0; f < 4; f++) {
    const [c, ctx] = makeCanvas(32, 32);
    p(ctx, 2, 0, '#0B0E14', 28, 32);
    p(ctx, 3, 0, '#374151', 3, 32);
    p(ctx, 26, 0, '#374151', 3, 32);
    p(ctx, 4, 0, '#4B5563', 1, 32);
    p(ctx, 27, 0, '#262E3D', 1, 32);
    p(ctx, 6, 0, '#1B2230', 20, 32);

    const offset = (3 - f) * 2;
    for (let base = -8; base < 32; base += 8) {
      const y = base + offset;
      p(ctx, 6, y, '#141923', 20, 1);
      p(ctx, 14, y + 2, '#64748B', 4, 2);
      p(ctx, 12, y + 3, '#475569', 2, 2);
      p(ctx, 18, y + 3, '#475569', 2, 2);
      p(ctx, 10, y + 4, '#334155', 2, 2);
      p(ctx, 20, y + 4, '#334155', 2, 2);
    }
    for (let ry = 4; ry < 32; ry += 12) {
      p(ctx, 4, ry, '#94A3B8');
      p(ctx, 27, ry, '#94A3B8');
    }
    belt.push(makeRotatedVariants(c));
  }

  // 4. Basic Drill (32x32 x 4 frames x 4 dirs)
  const drill: DirSprites[] = [];
  for (let f = 0; f < 4; f++) {
    const [c, ctx] = makeCanvas(32, 32);
    drawBevelBox(ctx, 1, 1, 30, 30, '#273142', '#475569', '#161C26');
    drawRivets(ctx, 1, 1, 30, 30, '#64748B');
    drawBevelBox(ctx, 6, 6, 20, 20, '#11161F', '#1A2230', '#334155');
    const col = f % 2 === 0 ? '#CBD5E1' : '#94A3B8';
    const hi = '#F8FAFC';
    if (f % 2 === 0) {
      p(ctx, 14, 8, col, 4, 16);
      p(ctx, 8, 14, col, 16, 4);
      p(ctx, 15, 9, hi, 2, 14);
      p(ctx, 9, 15, hi, 14, 2);
    } else {
      for (let k = -5; k <= 5; k++) {
        p(ctx, 15 + k, 15 + k, col, 2, 2);
        p(ctx, 15 + k, 15 - k, col, 2, 2);
      }
    }
    p(ctx, 13, 13, '#F59E0B', 6, 6);
    p(ctx, 14, 14, '#FDE68A', 2, 2);
    p(ctx, 12, 0, '#F59E0B', 8, 3);
    p(ctx, 13, 0, '#FDE68A', 6, 1);
    drill.push(makeRotatedVariants(c));
  }

  // 5. Turbo Drill 2x2 (64x64 x 4 frames x 4 dirs)
  const turboDrill: DirSprites[] = [];
  for (let f = 0; f < 4; f++) {
    const [c, ctx] = makeCanvas(64, 64);
    drawBevelBox(ctx, 2, 2, 60, 60, '#242E40', '#4A5973', '#141A24');
    p(ctx, 5, 5, '#38BDF8', 8, 3);
    p(ctx, 51, 5, '#38BDF8', 8, 3);
    p(ctx, 5, 56, '#38BDF8', 8, 3);
    p(ctx, 51, 56, '#38BDF8', 8, 3);
    drawRivets(ctx, 3, 3, 58, 58, '#94A3B8');
    drawBevelBox(ctx, 12, 12, 40, 40, '#0F141C', '#1B2433', '#3E4C63');

    const blade = f % 2 === 0 ? '#E2E8F0' : '#94A3B8';
    const alt = f % 2 === 0 ? '#94A3B8' : '#E2E8F0';
    if (f === 0 || f === 2) {
      p(ctx, 29, 15, blade, 6, 34);
      p(ctx, 15, 29, blade, 34, 6);
      p(ctx, 20, 20, alt, 24, 24);
      p(ctx, 24, 24, '#1B2433', 16, 16);
    } else {
      for (let d = -12; d <= 12; d++) {
        p(ctx, 30 + d, 30 + d, blade, 4, 4);
        p(ctx, 30 + d, 30 - d, blade, 4, 4);
      }
      p(ctx, 23, 23, alt, 18, 18);
      p(ctx, 26, 26, '#1B2433', 12, 12);
    }
    p(ctx, 27, 27, '#38BDF8', 10, 10);
    p(ctx, 29, 29, '#BAE6FD', 4, 4);
    p(ctx, 12, 0, '#38BDF8', 8, 4);
    p(ctx, 44, 0, '#38BDF8', 8, 4);
    turboDrill.push(makeRotatedVariants(c));
  }

  // 6. Router (32x32)
  const router = (() => {
    const [c, ctx] = makeCanvas(32, 32);
    drawBevelBox(ctx, 2, 2, 28, 28, '#2C374B', '#52627D', '#181F2B');
    p(ctx, 12, 1, '#151B24', 8, 5);
    p(ctx, 12, 26, '#151B24', 8, 5);
    p(ctx, 1, 12, '#151B24', 5, 8);
    p(ctx, 26, 12, '#151B24', 5, 8);
    p(ctx, 14, 6, '#CBD5E1', 4, 20);
    p(ctx, 6, 14, '#CBD5E1', 20, 4);
    p(ctx, 12, 12, '#F59E0B', 8, 8);
    p(ctx, 13, 13, '#FDE68A', 3, 3);
    drawRivets(ctx, 2, 2, 28, 28, '#94A3B8');
    return c;
  })();

  // 7. Junction (32x32)
  const junction = (() => {
    const [c, ctx] = makeCanvas(32, 32);
    drawBevelBox(ctx, 1, 1, 30, 30, '#1D2432', '#3D4B63', '#10141C');
    p(ctx, 1, 11, '#2E394D', 30, 10);
    p(ctx, 1, 11, '#475569', 30, 1);
    p(ctx, 1, 20, '#141923', 30, 1);
    p(ctx, 11, 1, '#3B4861', 10, 30);
    p(ctx, 11, 1, '#64748B', 1, 30);
    p(ctx, 20, 1, '#181F2C', 1, 30);
    p(ctx, 13, 13, '#94A3B8', 6, 6);
    p(ctx, 14, 14, '#1E2634', 4, 4);
    return c;
  })();

  // 8. Sorter (32x32 x 4 dirs)
  const sorter = (() => {
    const [c, ctx] = makeCanvas(32, 32);
    drawBevelBox(ctx, 2, 2, 28, 28, '#243044', '#38BDF8', '#151D2B');
    p(ctx, 1, 12, '#141923', 4, 8);
    p(ctx, 27, 12, '#141923', 4, 8);
    p(ctx, 14, 4, '#38BDF8', 4, 3);
    p(ctx, 12, 6, '#38BDF8', 8, 2);
    drawBevelBox(ctx, 9, 10, 14, 14, '#0E131B', '#1E293B', '#475569');
    return makeRotatedVariants(c);
  })();

  // 9. Bridge (32x32 variants x 4 dirs)
  const makeBridgeSprite = (variant: 'unlinked' | 'entry' | 'exit'): DirSprites => {
    const [c, ctx] = makeCanvas(32, 32);
    const borderHi = variant === 'entry' ? '#38BDF8' : variant === 'exit' ? '#10B981' : '#64748B';
    drawBevelBox(ctx, 2, 2, 28, 28, '#222B3C', borderHi, '#121822');
    if (variant === 'entry') {
      p(ctx, 7, 3, '#0B0F17', 18, 10);
      p(ctx, 7, 3, '#38BDF8', 18, 2);
      p(ctx, 13, 16, '#BAE6FD', 6, 4);
      p(ctx, 15, 14, '#BAE6FD', 2, 8);
    } else if (variant === 'exit') {
      p(ctx, 7, 19, '#0B0F17', 18, 10);
      p(ctx, 7, 27, '#10B981', 18, 2);
      p(ctx, 13, 8, '#A7F3D0', 6, 4);
      p(ctx, 15, 6, '#A7F3D0', 2, 8);
    } else {
      p(ctx, 8, 8, '#141923', 16, 16);
      p(ctx, 14, 10, '#94A3B8', 4, 12);
      p(ctx, 12, 12, '#94A3B8', 8, 3);
    }
    drawRivets(ctx, 2, 2, 28, 28, borderHi);
    return makeRotatedVariants(c);
  };

  // 10. Trash (32x32 x 2 frames)
  const trash: HTMLCanvasElement[] = [];
  for (let f = 0; f < 2; f++) {
    const [c, ctx] = makeCanvas(32, 32);
    drawBevelBox(ctx, 2, 2, 28, 28, '#2B1B22', '#EF4444', '#160D12');
    p(ctx, 7, 7, '#11090D', 18, 18);
    p(ctx, 10, 10, f === 0 ? '#EF4444' : '#F97316', 4, 4);
    p(ctx, 18, 12, f === 1 ? '#EF4444' : '#F97316', 4, 4);
    p(ctx, 13, 18, '#F59E0B', 6, 3);
    p(ctx, 7, 11, '#3F2730', 18, 2);
    p(ctx, 7, 19, '#3F2730', 18, 2);
    trash.push(c);
  }

  // 11. Smelter 2x2 (64x64 x 4 frames x 4 dirs)
  const smelter: DirSprites[] = [];
  for (let f = 0; f < 4; f++) {
    const [c, ctx] = makeCanvas(64, 64);
    drawBevelBox(ctx, 2, 2, 60, 60, '#222836', '#4E5A70', '#12161E');
    drawBevelBox(ctx, 6, 6, 12, 12, '#161B24', '#334155', '#0B0E14');
    drawBevelBox(ctx, 46, 6, 12, 12, '#161B24', '#334155', '#0B0E14');
    drawBevelBox(ctx, 6, 46, 12, 12, '#161B24', '#334155', '#0B0E14');
    drawBevelBox(ctx, 46, 46, 12, 12, '#161B24', '#334155', '#0B0E14');
    drawBevelBox(ctx, 16, 16, 32, 32, '#11151E', '#1F2937', '#475569');
    const glowCols = ['#B45309', '#D97706', '#F59E0B', '#D97706'];
    p(ctx, 20, 20, glowCols[f], 24, 24);
    p(ctx, 24, 24, '#FDE68A', 16, 16);
    p(ctx, 28, 28, '#FEF3C7', 8, 8);
    p(ctx, 16, 30, '#283142', 32, 4);
    p(ctx, 30, 16, '#283142', 4, 32);
    p(ctx, 13, 0, '#F59E0B', 6, 3);
    p(ctx, 45, 0, '#F59E0B', 6, 3);
    smelter.push(makeRotatedVariants(c));
  }

  // 12. Assembler 2x2 (64x64 x 4 frames x 4 dirs)
  const assembler: DirSprites[] = [];
  for (let f = 0; f < 4; f++) {
    const [c, ctx] = makeCanvas(64, 64);
    drawBevelBox(ctx, 2, 2, 60, 60, '#1E2936', '#465B73', '#10161F');
    drawRivets(ctx, 4, 4, 56, 56, '#64748B');
    drawBevelBox(ctx, 12, 12, 40, 40, '#0E151D', '#1E293B', '#334155');
    for (let gx = 16; gx < 48; gx += 8) {
      p(ctx, gx, 14, '#182430', 1, 36);
    }
    const railY = 20 + [0, 6, 12, 6][f];
    p(ctx, 13, railY, '#334155', 38, 6);
    p(ctx, 13, railY, '#64748B', 38, 1);
    const headX = 24 + [0, 6, 10, 4][f];
    p(ctx, headX, railY - 2, '#10B981', 10, 10);
    p(ctx, headX + 3, railY + 1, '#A7F3D0', 4, 4);
    p(ctx, 13, 0, '#10B981', 6, 3);
    p(ctx, 45, 0, '#10B981', 6, 3);
    assembler.push(makeRotatedVariants(c));
  }

  // 13. Core Citadel 3x3 (96x96 x 4 frames)
  const core: HTMLCanvasElement[] = [];
  for (let f = 0; f < 4; f++) {
    const [c, ctx] = makeCanvas(96, 96);
    drawBevelBox(ctx, 3, 3, 90, 90, '#222A3A', '#F59E0B', '#11161F');
    for (let k = 0; k < 3; k++) {
      const pos = 11 + k * 32;
      p(ctx, pos, 1, '#0F131A', 10, 5);
      p(ctx, pos, 90, '#0F131A', 10, 5);
      p(ctx, 1, pos, '#0F131A', 5, 10);
      p(ctx, 90, pos, '#0F131A', 5, 10);
      p(ctx, pos + 3, 2, '#F59E0B', 4, 2);
      p(ctx, pos + 3, 92, '#F59E0B', 4, 2);
      p(ctx, 2, pos + 3, '#F59E0B', 2, 4);
      p(ctx, 92, pos + 3, '#F59E0B', 2, 4);
    }

    drawBevelBox(ctx, 16, 16, 64, 64, '#171E2B', '#334155', '#0D1118');
    drawRivets(ctx, 18, 18, 60, 60, '#94A3B8');
    p(ctx, 22, 22, '#F59E0B', 6, 3);
    p(ctx, 68, 22, '#F59E0B', 6, 3);
    p(ctx, 22, 71, '#F59E0B', 6, 3);
    p(ctx, 68, 71, '#F59E0B', 6, 3);

    drawBevelBox(ctx, 30, 30, 36, 36, '#0E131B', '#1E293B', '#475569');
    const pulseCols = ['#D97706', '#F59E0B', '#FBBF24', '#F59E0B'];
    const rSize = [16, 20, 22, 20][f];
    const rOff = 48 - rSize / 2;
    p(ctx, rOff, rOff, pulseCols[f], rSize, rSize);
    p(ctx, 41, 41, '#FDE68A', 14, 14);
    p(ctx, 45, 45, '#FFFFFF', 6, 6);

    core.push(c);
  }

  // 14. Items (16x16 crisp pixel art with 1px dark outline)
  const items = {} as Record<ItemType, HTMLCanvasElement>;
  (Object.keys(ITEM_INFO) as ItemType[]).forEach((item) => {
    const info = ITEM_INFO[item];
    const [c, ctx] = makeCanvas(16, 16);

    if (info.shape === 'ore') {
      p(ctx, 4, 2, '#0B0E14', 8, 12);
      p(ctx, 2, 4, '#0B0E14', 12, 8);
      p(ctx, 5, 3, info.color, 6, 10);
      p(ctx, 3, 5, info.color, 10, 6);
      p(ctx, 5, 4, info.accent, 3, 3);
      p(ctx, 6, 4, '#FFFFFF', 1, 1);
    } else if (info.shape === 'coil') {
      p(ctx, 3, 2, '#0B0E14', 10, 12);
      p(ctx, 2, 3, '#0B0E14', 12, 10);
      p(ctx, 4, 3, info.color, 8, 10);
      p(ctx, 3, 4, info.color, 10, 8);
      p(ctx, 6, 6, '#0B0E14', 4, 4);
      p(ctx, 4, 4, info.accent, 4, 2);
    } else if (info.shape === 'ingot') {
      p(ctx, 2, 4, '#0B0E14', 12, 8);
      p(ctx, 3, 5, info.color, 10, 6);
      p(ctx, 4, 6, info.accent, 8, 2);
      p(ctx, 3, 10, '#64748B', 10, 1);
    } else if (info.shape === 'chip') {
      p(ctx, 2, 2, '#0B0E14', 12, 12);
      p(ctx, 3, 3, info.color, 10, 10);
      p(ctx, 5, 5, '#0F172A', 6, 6);
      p(ctx, 6, 6, info.accent, 4, 4);
      p(ctx, 4, 1, '#F59E0B', 2, 1);
      p(ctx, 10, 1, '#F59E0B', 2, 1);
      p(ctx, 4, 14, '#F59E0B', 2, 1);
      p(ctx, 10, 14, '#F59E0B', 2, 1);
    } else if (info.shape === 'plate') {
      p(ctx, 4, 2, '#0B0E14', 8, 12);
      p(ctx, 2, 4, '#0B0E14', 12, 8);
      p(ctx, 4, 3, info.color, 8, 10);
      p(ctx, 3, 5, info.color, 10, 6);
      p(ctx, 5, 4, info.accent, 4, 3);
      p(ctx, 9, 9, '#0369A1', 3, 2);
    } else {
      p(ctx, 2, 2, '#0B0E14', 12, 12);
      p(ctx, 3, 3, info.color, 10, 10);
      p(ctx, 5, 5, '#1E1B2E', 6, 6);
      p(ctx, 6, 6, info.accent, 4, 4);
      p(ctx, 7, 7, '#FFFFFF', 2, 2);
    }

    items[item] = c;
  });

  cachedAtlas = {
    floor,
    ores,
    belt,
    drill,
    turboDrill,
    router,
    junction,
    sorter,
    bridge: {
      unlinked: makeBridgeSprite('unlinked'),
      entry: makeBridgeSprite('entry'),
      exit: makeBridgeSprite('exit'),
    },
    trash,
    smelter,
    assembler,
    core,
    items,
  };
  return cachedAtlas;
}
