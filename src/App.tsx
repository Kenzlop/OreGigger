import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameHUD } from './components/GameHUD';
import { GuideModal, PauseModal, UpgradesModal } from './components/Modals';
import { TitleScreen } from './components/TitleScreen';
import {
  ANIM_FPS,
  BRIDGE_MAX_RANGE,
  BUILDABLE_ORDER,
  BUILDINGS,
  CORE_POS,
  CORE_SIZE,
  GRID_SIZE,
  ORE_INFO,
  TILE_PX,
} from './game/constants';
import { FactoryEngine, rotateDir } from './game/engine';
import { Camera, renderWorld } from './game/renderer';
import { sound } from './game/sound';
import {
  BlueprintTile,
  BuildingKind,
  Dir,
  GameMode,
  GameScreen,
  HudSnapshot,
  ItemType,
  RecipeId,
  ToolMode,
  UpgradeState,
} from './game/types';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<FactoryEngine>(new FactoryEngine());
  const cameraRef = useRef<Camera>({
    x: CORE_POS + CORE_SIZE / 2 - 3,
    y: CORE_POS + CORE_SIZE / 2,
    zoom: 1.5,
  });

  // Mutable interaction refs so the 60fps render loop never depends on React state
  const toolRef = useRef<ToolMode>('build');
  const buildKindRef = useRef<BuildingKind>('belt');
  const buildDirRef = useRef<Dir>(1);
  const hoverTileRef = useRef<{ gx: number | null; gy: number | null }>({ gx: null, gy: null });
  const selectedBuildingIdRef = useRef<number | null>(null);
  const selectRectRef = useRef<{
    start: { x: number; y: number } | null;
    end: { x: number | null; y: number | null } | null;
  }>({ start: null, end: null });
  const selectEndRef = useRef<{ x: number; y: number } | null>(null);
  const blueprintRef = useRef<BlueprintTile[]>([]);
  const isPastingRef = useRef<boolean>(false);
  const bridgeDragStartRef = useRef<{ x: number; y: number } | null>(null);
  const minimapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapTerrainRef = useRef<HTMLCanvasElement | null>(null);
  const minimapTerrainKeyRef = useRef<string>('');

  const heldKeysRef = useRef<Set<string>>(new Set());
  const screenRef = useRef<GameScreen>('TITLE_MENU');

  // Pointer drag states
  const dragStateRef = useRef<{
    lmbDown: boolean;
    rmbDown: boolean;
    mmbDown: boolean;
    rmbMoved: boolean;
    startClientX: number;
    startClientY: number;
    camStartX: number;
    camStartY: number;
    lastBuildGx: number | null;
    lastBuildGy: number | null;
  }>({
    lmbDown: false,
    rmbDown: false,
    mmbDown: false,
    rmbMoved: false,
    startClientX: 0,
    startClientY: 0,
    camStartX: 0,
    camStartY: 0,
    lastBuildGx: null,
    lastBuildGy: null,
  });

  // React UI state
  const [screen, setScreen] = useState<GameScreen>('TITLE_MENU');
  const [hasSave, setHasSave] = useState<boolean>(() => FactoryEngine.hasSavedGame());
  const [activeModal, setActiveModal] = useState<'none' | 'upgrades' | 'guide'>('none');
  const [muted, setMuted] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const [tool, setTool] = useState<ToolMode>('build');
  const [buildKind, setBuildKind] = useState<BuildingKind>('belt');
  const [buildDir, setBuildDir] = useState<Dir>(1);
  const [isPastingBlueprint, setIsPastingBlueprint] = useState<boolean>(false);
  const [hasSelectionRect, setHasSelectionRect] = useState<boolean>(false);
  const [hud, setHud] = useState<HudSnapshot>(() =>
    engineRef.current.getHudSnapshot(null, null, null, 0)
  );

  // Keep screenRef synced
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  // Initialize Demo factory for Title Screen on mount
  useEffect(() => {
    engineRef.current.initNewWorld(104729, 'career', true);
    cameraRef.current = {
      x: CORE_POS - 1.5,
      y: CORE_POS + 1.2,
      zoom: 1.5,
    };
  }, []);

  const syncHud = useCallback(() => {
    setHud(
      engineRef.current.getHudSnapshot(
        selectedBuildingIdRef.current,
        hoverTileRef.current.gx,
        hoverTileRef.current.gy,
        blueprintRef.current.length
      )
    );
  }, []);

  const centerCameraOnCore = useCallback(() => {
    cameraRef.current.x = CORE_POS + CORE_SIZE / 2;
    cameraRef.current.y = CORE_POS + CORE_SIZE / 2;
    cameraRef.current.zoom = 1.5;
  }, []);

  const startNewGame = useCallback(
    (mode: GameMode) => {
      const seed = Math.floor(100000 + Math.random() * 899999);
      engineRef.current.initNewWorld(seed, mode, false);
      selectedBuildingIdRef.current = null;
      selectRectRef.current.start = null;
      selectEndRef.current = null;
      bridgeDragStartRef.current = null;
      isPastingRef.current = false;
      setIsPastingBlueprint(false);
      setHasSelectionRect(false);
      setActiveModal('none');
      setSaveStatus(null);
      centerCameraOnCore();
      setScreen('PLAYING');
      engineRef.current.saveToLocalStorage();
      setHasSave(true);
      syncHud();
    },
    [centerCameraOnCore, syncHud]
  );

  const continueSavedGame = useCallback(() => {
    const loaded = engineRef.current.loadFromLocalStorage();
    if (!loaded) {
      startNewGame('career');
      return;
    }
    selectedBuildingIdRef.current = null;
    selectRectRef.current.start = null;
    selectEndRef.current = null;
    bridgeDragStartRef.current = null;
    isPastingRef.current = false;
    setIsPastingBlueprint(false);
    setHasSelectionRect(false);
    setActiveModal('none');
    setSaveStatus(null);
    centerCameraOnCore();
    setScreen('PLAYING');
    syncHud();
  }, [centerCameraOnCore, startNewGame, syncHud]);

  const selectBuildingTool = useCallback((kind: BuildingKind) => {
    if (!engineRef.current.isUnlocked(kind)) return;
    toolRef.current = 'build';
    buildKindRef.current = kind;
    isPastingRef.current = false;
    bridgeDragStartRef.current = null;
    selectRectRef.current.start = null;
    selectEndRef.current = null;
    setTool('build');
    setBuildKind(kind);
    setIsPastingBlueprint(false);
    setHasSelectionRect(false);
  }, []);

  const handleSetTool = useCallback((nextTool: ToolMode) => {
    toolRef.current = nextTool;
    isPastingRef.current = false;
    bridgeDragStartRef.current = null;
    if (nextTool !== 'select') {
      selectRectRef.current.start = null;
      selectEndRef.current = null;
      setHasSelectionRect(false);
    }
    setTool(nextTool);
    setIsPastingBlueprint(false);
  }, []);

  const handleRotate = useCallback((steps = 1) => {
    if (isPastingRef.current && blueprintRef.current.length > 0) {
      let rotated = blueprintRef.current;
      const count = ((steps % 4) + 4) % 4;
      for (let i = 0; i < count; i++) {
        rotated = engineRef.current.rotateBlueprint(rotated);
      }
      blueprintRef.current = rotated;
      sound.playRotate();
      return;
    }
    const nextDir = rotateDir(buildDirRef.current, steps);
    buildDirRef.current = nextDir;
    setBuildDir(nextDir);
    sound.playRotate();
  }, []);

  const handleCopySelection = useCallback(() => {
    const s = selectRectRef.current.start;
    const e = selectEndRef.current;
    if (!s || !e) return;
    const bp = engineRef.current.copyRegion(s.x, s.y, e.x, e.y);
    if (bp.length > 0) {
      blueprintRef.current = bp;
      isPastingRef.current = true;
      setIsPastingBlueprint(true);
      sound.playPlace();
      syncHud();
    }
  }, [syncHud]);

  const handleEraseSelection = useCallback(() => {
    const s = selectRectRef.current.start;
    const e = selectEndRef.current;
    if (!s || !e) return;
    engineRef.current.eraseRegion(s.x, s.y, e.x, e.y);
    if (selectedBuildingIdRef.current !== null && !engineRef.current.buildings.has(selectedBuildingIdRef.current)) {
      selectedBuildingIdRef.current = null;
    }
    selectRectRef.current.start = null;
    selectEndRef.current = null;
    setHasSelectionRect(false);
    syncHud();
  }, [syncHud]);

  const handleDownloadPC = useCallback(async () => {
    try {
      const res = await fetch('./rudopotok-pc.html');
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Rudopotok-PC.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      const a = document.createElement('a');
      a.href = './rudopotok-pc.html';
      a.download = 'Rudopotok-PC.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  }, []);

  const handleExportSave = useCallback(() => {
    const json = engineRef.current.exportSaveJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rudopotok-save-${engineRef.current.seed}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSaveStatus('Сохранение скачано');
  }, []);

  const handleImportSave = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string' && engineRef.current.importSaveJson(reader.result)) {
          selectedBuildingIdRef.current = null;
          selectRectRef.current.start = null;
          selectEndRef.current = null;
          bridgeDragStartRef.current = null;
          isPastingRef.current = false;
          setIsPastingBlueprint(false);
          setHasSelectionRect(false);
          engineRef.current.saveToLocalStorage();
          setHasSave(true);
          centerCameraOnCore();
          syncHud();
          setSaveStatus('Сохранение загружено');
        } else {
          setSaveStatus('Неверный формат файла сохранения');
        }
      };
      reader.readAsText(file);
    },
    [centerCameraOnCore, syncHud]
  );

  // Fixed 24 FPS simulation & pixel-art animation loop (smooth input/camera)
  useEffect(() => {
    let rafId = 0;
    let lastTime = performance.now();
    let hudTimer = 0;
    let saveTimer = 0;
    let animAccumulator = 0;
    const STEP_DT = 1 / ANIM_FPS;

    const frame = (now: number) => {
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const clampedDt = Math.min(rawDt, 0.05);

      const canvas = canvasRef.current;
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const rectW = window.innerWidth;
        const rectH = window.innerHeight;
        if (canvas.width !== Math.floor(rectW * dpr) || canvas.height !== Math.floor(rectH * dpr)) {
          canvas.width = Math.floor(rectW * dpr);
          canvas.height = Math.floor(rectH * dpr);
        }

        const engine = engineRef.current;
        const cam = cameraRef.current;

        animAccumulator += clampedDt;

        if (screenRef.current === 'TITLE_MENU') {
          while (animAccumulator >= STEP_DT) {
            animAccumulator -= STEP_DT;
            engine.step(STEP_DT);
          }
          cam.x = CORE_POS - 2.0 + Math.sin(Math.floor(engine.simTime * ANIM_FPS) / ANIM_FPS * 0.16) * 2.2;
          cam.y = CORE_POS + 1.0 + Math.cos(Math.floor(engine.simTime * ANIM_FPS) / ANIM_FPS * 0.12) * 1.4;
        } else if (screenRef.current === 'PLAYING') {
          // Continuous WASD / Arrow camera pan
          const keys = heldKeysRef.current;
          const panSpeed = (18 / cam.zoom) * clampedDt;
          if (keys.has('KeyW') || keys.has('ArrowUp')) cam.y -= panSpeed;
          if (keys.has('KeyS') || keys.has('ArrowDown')) cam.y += panSpeed;
          if (keys.has('KeyA') || keys.has('ArrowLeft')) cam.x -= panSpeed;
          if (keys.has('KeyD') || keys.has('ArrowRight')) cam.x += panSpeed;

          cam.x = Math.max(0, Math.min(GRID_SIZE, cam.x));
          cam.y = Math.max(0, Math.min(GRID_SIZE, cam.y));

          // Step simulation & animations strictly at 24 FPS cadence
          while (animAccumulator >= STEP_DT) {
            animAccumulator -= STEP_DT;
            engine.step(STEP_DT);
          }

          hudTimer += clampedDt;
          if (hudTimer >= 0.1) {
            hudTimer = 0;
            syncHud();

            // Render tactical minimap at 10Hz using cached static ore terrain layer
            const mm = minimapCanvasRef.current;
            if (mm) {
              const mctx = mm.getContext('2d');
              if (mctx) {
                const mw = mm.width;
                const mh = mm.height;
                const scale = mw / GRID_SIZE;
                const terrainKey = `${engine.seed}:${mw}:${mh}`;

                if (!minimapTerrainRef.current || minimapTerrainKeyRef.current !== terrainKey) {
                  const tc = minimapTerrainRef.current || document.createElement('canvas');
                  tc.width = mw;
                  tc.height = mh;
                  const tctx = tc.getContext('2d');
                  if (tctx) {
                    tctx.fillStyle = '#12161D';
                    tctx.fillRect(0, 0, mw, mh);
                    for (let gy = 0; gy < GRID_SIZE; gy++) {
                      const rowOffset = gy * GRID_SIZE;
                      for (let gx = 0; gx < GRID_SIZE; gx++) {
                        const ore = engine.oreGrid[rowOffset + gx];
                        if (ore) {
                          tctx.fillStyle = ORE_INFO[ore].color;
                          tctx.fillRect(gx * scale, gy * scale, Math.max(1, scale * 1.15), Math.max(1, scale * 1.15));
                        }
                      }
                    }
                  }
                  minimapTerrainRef.current = tc;
                  minimapTerrainKeyRef.current = terrainKey;
                }

                mctx.drawImage(minimapTerrainRef.current, 0, 0);

                // Draw placed buildings
                for (const b of engine.buildings.values()) {
                  mctx.fillStyle = b.kind === 'core' ? '#F59E0B' : '#94A3B8';
                  mctx.fillRect(b.x * scale, b.y * scale, Math.max(1.2, b.w * scale), Math.max(1.2, b.h * scale));
                }

                // Draw camera viewport box
                const tileSize = TILE_PX * cam.zoom;
                const viewW = rectW / tileSize;
                const viewH = rectH / tileSize;
                mctx.strokeStyle = '#F8FAFC';
                mctx.lineWidth = 1;
                mctx.strokeRect(
                  (cam.x - viewW / 2) * scale,
                  (cam.y - viewH / 2) * scale,
                  viewW * scale,
                  viewH * scale
                );
              }
            }
          }

          saveTimer += clampedDt;
          if (saveTimer >= 4.0) {
            saveTimer = 0;
            engine.saveToLocalStorage();
            setHasSave(true);
          }
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);
          renderWorld(ctx, rectW, rectH, engine, cam, {
            tool: toolRef.current,
            buildKind: buildKindRef.current,
            buildDir: buildDirRef.current,
            hoverGx: hoverTileRef.current.gx,
            hoverGy: hoverTileRef.current.gy,
            selectedBuildingId: selectedBuildingIdRef.current,
            selectStart: selectRectRef.current.start,
            selectEnd: selectEndRef.current,
            blueprint: blueprintRef.current,
            isPastingBlueprint: isPastingRef.current,
            bridgeDragStart: bridgeDragStartRef.current,
          });
          ctx.restore();
        }
      }

      rafId = requestAnimationFrame(frame);
    };

    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [syncHud]);

  // Global keyboard bindings & blur reset
  useEffect(() => {
    const onBlur = () => {
      heldKeysRef.current.clear();
      dragStateRef.current.lmbDown = false;
      dragStateRef.current.rmbDown = false;
      dragStateRef.current.mmbDown = false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (screenRef.current === 'TITLE_MENU') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          if (FactoryEngine.hasSavedGame()) {
            continueSavedGame();
          } else {
            startNewGame('career');
          }
        }
        return;
      }

      heldKeysRef.current.add(e.code);

      if (e.code === 'Escape') {
        e.preventDefault();
        if (activeModal !== 'none') {
          setActiveModal('none');
          return;
        }
        if (isPastingRef.current) {
          isPastingRef.current = false;
          setIsPastingBlueprint(false);
          return;
        }
        if (selectedBuildingIdRef.current !== null) {
          selectedBuildingIdRef.current = null;
          syncHud();
          return;
        }
        if (screenRef.current === 'PLAYING') {
          engineRef.current.saveToLocalStorage();
          setScreen('PAUSED');
        } else if (screenRef.current === 'PAUSED') {
          setScreen('PLAYING');
        }
        return;
      }

      if (screenRef.current !== 'PLAYING' || activeModal !== 'none') return;

      // Hotkeys 1..0 for buildings
      const hotkeyIdx = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0'].indexOf(e.code);
      if (hotkeyIdx !== -1 && BUILDABLE_ORDER[hotkeyIdx]) {
        selectBuildingTool(BUILDABLE_ORDER[hotkeyIdx]);
        return;
      }

      if (e.code === 'KeyR') {
        e.preventDefault();
        handleRotate(e.shiftKey ? -1 : 1);
      } else if (e.code === 'KeyX') {
        handleSetTool('erase');
      } else if (e.code === 'KeyB') {
        handleSetTool('select');
      } else if (e.code === 'KeyV' && !e.ctrlKey && !e.metaKey) {
        handleSetTool('inspect');
      } else if (e.code === 'KeyC' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleCopySelection();
      } else if (e.code === 'KeyV' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (blueprintRef.current.length > 0) {
          isPastingRef.current = true;
          setIsPastingBlueprint(true);
        }
      } else if ((e.code === 'Delete' || e.code === 'Backspace') && selectRectRef.current.start && selectEndRef.current) {
        e.preventDefault();
        handleEraseSelection();
      } else if (e.code === 'KeyC' && !e.ctrlKey && !e.metaKey) {
        centerCameraOnCore();
      } else if (e.code === 'KeyU') {
        setActiveModal('upgrades');
      } else if (e.code === 'KeyQ') {
        const { gx, gy } = hoverTileRef.current;
        if (gx !== null && gy !== null) {
          const b = engineRef.current.getBuildingAt(gx, gy);
          if (b && b.kind !== 'core') {
            selectBuildingTool(b.kind);
            if (BUILDINGS[b.kind].rotatable) {
              buildDirRef.current = b.dir;
              setBuildDir(b.dir);
            }
          }
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      heldKeysRef.current.delete(e.code);
    };

    window.addEventListener('blur', onBlur);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [
    activeModal,
    centerCameraOnCore,
    continueSavedGame,
    handleCopySelection,
    handleEraseSelection,
    handleRotate,
    handleSetTool,
    selectBuildingTool,
    startNewGame,
    syncHud,
  ]);

  // Helper: convert client coordinates to grid tile (gx, gy)
  const screenToTile = (clientX: number, clientY: number) => {
    const cam = cameraRef.current;
    const tileSize = TILE_PX * cam.zoom;
    const gx = Math.floor(cam.x + (clientX - window.innerWidth / 2) / tileSize);
    const gy = Math.floor(cam.y + (clientY - window.innerHeight / 2) / tileSize);
    return { gx, gy };
  };

  const applyDragAction = (gx: number, gy: number) => {
    if (gx < 0 || gy < 0 || gx >= GRID_SIZE || gy >= GRID_SIZE) return;
    const engine = engineRef.current;
    const ds = dragStateRef.current;

    if (toolRef.current === 'erase') {
      if (engine.removeAt(gx, gy) && selectedBuildingIdRef.current !== null) {
        if (!engine.buildings.has(selectedBuildingIdRef.current)) {
          selectedBuildingIdRef.current = null;
        }
      }
      return;
    }

    if (toolRef.current === 'build') {
      if (buildKindRef.current === 'belt') {
        if (ds.lastBuildGx !== null && ds.lastBuildGy !== null) {
          const dx = gx - ds.lastBuildGx;
          const dy = gy - ds.lastBuildGy;
          if (Math.abs(dx) + Math.abs(dy) === 1) {
            let dragDir: Dir = buildDirRef.current;
            if (dx === 1) dragDir = 1;
            else if (dx === -1) dragDir = 3;
            else if (dy === 1) dragDir = 2;
            else if (dy === -1) dragDir = 0;

            // Orient the previous belt tile toward the new tile for seamless corners
            const prev = engine.getBuildingAt(ds.lastBuildGx, ds.lastBuildGy);
            if (prev && prev.kind === 'belt') {
              prev.dir = dragDir;
            }
            buildDirRef.current = dragDir;
            setBuildDir(dragDir);
          }
        }
        engine.placeBuilding('belt', gx, gy, buildDirRef.current);
        ds.lastBuildGx = gx;
        ds.lastBuildGy = gy;
      } else {
        engine.placeBuilding(buildKindRef.current, gx, gy, buildDirRef.current);
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (screenRef.current !== 'PLAYING' || activeModal !== 'none') return;
    const { gx, gy } = screenToTile(e.clientX, e.clientY);
    const ds = dragStateRef.current;
    ds.startClientX = e.clientX;
    ds.startClientY = e.clientY;
    ds.camStartX = cameraRef.current.x;
    ds.camStartY = cameraRef.current.y;

    // Middle-click: Eyedropper or Pan
    if (e.button === 1) {
      e.preventDefault();
      const b = engineRef.current.getBuildingAt(gx, gy);
      if (b && b.kind !== 'core') {
        selectBuildingTool(b.kind);
        if (BUILDINGS[b.kind].rotatable) {
          buildDirRef.current = b.dir;
          setBuildDir(b.dir);
        }
      } else {
        ds.mmbDown = true;
      }
      return;
    }

    // Right-click: Pan on drag, or erase on tap
    if (e.button === 2) {
      ds.rmbDown = true;
      ds.rmbMoved = false;
      return;
    }

    // Left-click
    if (e.button === 0) {
      if (isPastingRef.current && blueprintRef.current.length > 0) {
        engineRef.current.pasteBlueprint(blueprintRef.current, gx, gy);
        sound.playPlace();
        syncHud();
        return;
      }

      if (toolRef.current === 'select') {
        ds.lmbDown = true;
        selectRectRef.current.start = { x: gx, y: gy };
        selectEndRef.current = { x: gx, y: gy };
        setHasSelectionRect(true);
        return;
      }

      if (toolRef.current === 'inspect') {
        const existing = engineRef.current.getBuildingAt(gx, gy);
        selectedBuildingIdRef.current = existing ? existing.id : null;
        syncHud();
        return;
      }

      // If clicking an existing building (excluding belts so belt-laying stays uninterrupted) in build mode, select it for inspection
      if (toolRef.current === 'build') {
        const existing = engineRef.current.getBuildingAt(gx, gy);
        if (existing && existing.kind !== 'belt') {
          selectedBuildingIdRef.current = existing.id;
          syncHud();
          return;
        }
        selectedBuildingIdRef.current = null;
      }

      // Bridge drag-to-span: start tracking from first tile
      if (toolRef.current === 'build' && buildKindRef.current === 'bridge') {
        ds.lmbDown = true;
        bridgeDragStartRef.current = { x: gx, y: gy };
        return;
      }

      ds.lmbDown = true;
      ds.lastBuildGx = null;
      ds.lastBuildGy = null;
      applyDragAction(gx, gy);
      syncHud();
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { gx, gy } = screenToTile(e.clientX, e.clientY);
    hoverTileRef.current = {
      gx: gx >= 0 && gx < GRID_SIZE ? gx : null,
      gy: gy >= 0 && gy < GRID_SIZE ? gy : null,
    };

    if (screenRef.current !== 'PLAYING' || activeModal !== 'none') return;

    const ds = dragStateRef.current;
    const tileSize = TILE_PX * cameraRef.current.zoom;

    if (ds.rmbDown || ds.mmbDown) {
      const dx = e.clientX - ds.startClientX;
      const dy = e.clientY - ds.startClientY;
      if (Math.hypot(dx, dy) > 4) {
        ds.rmbMoved = true;
      }
      cameraRef.current.x = Math.max(0, Math.min(GRID_SIZE, ds.camStartX - dx / tileSize));
      cameraRef.current.y = Math.max(0, Math.min(GRID_SIZE, ds.camStartY - dy / tileSize));
      return;
    }

    if (ds.lmbDown) {
      if (toolRef.current === 'select') {
        selectEndRef.current = {
          x: Math.max(0, Math.min(GRID_SIZE - 1, gx)),
          y: Math.max(0, Math.min(GRID_SIZE - 1, gy)),
        };
        return;
      }
      if (toolRef.current === 'build' && buildKindRef.current === 'bridge' && bridgeDragStartRef.current) {
        return;
      }
      applyDragAction(gx, gy);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const ds = dragStateRef.current;
    if (e.button === 0) {
      if (bridgeDragStartRef.current && screenRef.current === 'PLAYING') {
        const start = bridgeDragStartRef.current;
        const { gx, gy } = screenToTile(e.clientX, e.clientY);
        const dxRaw = gx - start.x;
        const dyRaw = gy - start.y;
        let ex = start.x;
        let ey = start.y;
        if (Math.abs(dxRaw) >= Math.abs(dyRaw) && dxRaw !== 0) {
          ex = start.x + Math.max(-BRIDGE_MAX_RANGE, Math.min(BRIDGE_MAX_RANGE, dxRaw));
        } else if (dyRaw !== 0) {
          ey = start.y + Math.max(-BRIDGE_MAX_RANGE, Math.min(BRIDGE_MAX_RANGE, dyRaw));
        }
        if (ex !== start.x || ey !== start.y) {
          engineRef.current.placeBridgeSpan(start.x, start.y, ex, ey);
          const spanDir: Dir = ex > start.x ? 1 : ex < start.x ? 3 : ey > start.y ? 2 : 0;
          buildDirRef.current = spanDir;
          setBuildDir(spanDir);
        } else {
          engineRef.current.placeBuilding('bridge', start.x, start.y, buildDirRef.current);
        }
        bridgeDragStartRef.current = null;
        syncHud();
      }
      ds.lmbDown = false;
      ds.lastBuildGx = null;
      ds.lastBuildGy = null;
    }
    if (e.button === 1) {
      ds.mmbDown = false;
    }
    if (e.button === 2) {
      if (!ds.rmbMoved && screenRef.current === 'PLAYING' && activeModal === 'none') {
        if (isPastingRef.current) {
          isPastingRef.current = false;
          setIsPastingBlueprint(false);
        } else {
          const { gx, gy } = screenToTile(e.clientX, e.clientY);
          engineRef.current.removeAt(gx, gy);
          if (selectedBuildingIdRef.current !== null) {
            const sel = engineRef.current.buildings.get(selectedBuildingIdRef.current);
            if (!sel) selectedBuildingIdRef.current = null;
          }
          syncHud();
        }
      }
      ds.rmbDown = false;
      ds.rmbMoved = false;
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    if (screenRef.current !== 'PLAYING' || activeModal !== 'none') return;
    const cam = cameraRef.current;
    const oldTileSize = TILE_PX * cam.zoom;
    const worldMouseX = cam.x + (e.clientX - window.innerWidth / 2) / oldTileSize;
    const worldMouseY = cam.y + (e.clientY - window.innerHeight / 2) / oldTileSize;

    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    const nextZoom = Math.max(0.25, Math.min(3.0, cam.zoom * factor));
    cam.zoom = nextZoom;

    const newTileSize = TILE_PX * nextZoom;
    cam.x = Math.max(0, Math.min(GRID_SIZE, worldMouseX - (e.clientX - window.innerWidth / 2) / newTileSize));
    cam.y = Math.max(0, Math.min(GRID_SIZE, worldMouseY - (e.clientY - window.innerHeight / 2) / newTileSize));
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0D1017]">
      {/* Isolated Full-Viewport Pixel-Art Game Canvas */}
      <canvas
        ref={canvasRef}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          dragStateRef.current.lmbDown = false;
          dragStateRef.current.rmbDown = false;
          dragStateRef.current.mmbDown = false;
          bridgeDragStartRef.current = null;
        }}
        onPointerLeave={() => {
          dragStateRef.current.lmbDown = false;
          dragStateRef.current.rmbDown = false;
          dragStateRef.current.mmbDown = false;
          bridgeDragStartRef.current = null;
          hoverTileRef.current = { gx: null, gy: null };
        }}
        onWheel={handleWheel}
        className={`block w-full h-full touch-none [image-rendering:pixelated] ${
          tool === 'inspect' ? 'cursor-pointer' : 'cursor-crosshair'
        }`}
      />

      {screen === 'TITLE_MENU' && (
        <TitleScreen
          hasSave={hasSave}
          onContinue={continueSavedGame}
          onStartNew={startNewGame}
          onDownloadPC={handleDownloadPC}
        />
      )}

      {screen !== 'TITLE_MENU' && (
        <GameHUD
          hud={hud}
          tool={tool}
          buildKind={buildKind}
          buildDir={buildDir}
          muted={muted}
          isPastingBlueprint={isPastingBlueprint}
          hasSelectionRect={hasSelectionRect}
          minimapCanvasRef={minimapCanvasRef}
          onJumpTo={(gx, gy) => {
            cameraRef.current.x = Math.max(0, Math.min(GRID_SIZE, gx));
            cameraRef.current.y = Math.max(0, Math.min(GRID_SIZE, gy));
          }}
          onSelectBuildingTool={selectBuildingTool}
          onSetTool={handleSetTool}
          onRotate={() => handleRotate(1)}
          onToggleSimSpeed={(spd) => {
            engineRef.current.simSpeed = spd;
            syncHud();
          }}
          onToggleMute={() => {
            const next = !muted;
            setMuted(next);
            sound.setMuted(next);
          }}
          onOpenUpgrades={() => setActiveModal('upgrades')}
          onOpenGuide={() => setActiveModal('guide')}
          onOpenPause={() => {
            engineRef.current.saveToLocalStorage();
            setSaveStatus(null);
            setScreen('PAUSED');
          }}
          onCenterCore={centerCameraOnCore}
          onSetSorterFilter={(id, item: ItemType | null) => {
            engineRef.current.setSorterFilter(id, item);
            syncHud();
          }}
          onSetCrafterRecipe={(id, recipeId: RecipeId | null) => {
            engineRef.current.setBuildingRecipe(id, recipeId);
            syncHud();
          }}
          onRotateSelected={(id) => {
            engineRef.current.rotatePlacedBuilding(id);
            syncHud();
          }}
          onDeleteSelected={(x, y) => {
            engineRef.current.removeAt(x, y);
            selectedBuildingIdRef.current = null;
            syncHud();
          }}
          onCopySelection={handleCopySelection}
          onEraseSelection={handleEraseSelection}
          onTogglePasteBlueprint={() => {
            const next = !isPastingRef.current;
            isPastingRef.current = next;
            setIsPastingBlueprint(next);
          }}
          onCloseInspector={() => {
            selectedBuildingIdRef.current = null;
            syncHud();
          }}
        />
      )}

      {screen === 'PLAYING' && activeModal === 'upgrades' && (
        <UpgradesModal
          hud={hud}
          onBuyUpgrade={(key: keyof UpgradeState) => {
            engineRef.current.buyUpgrade(key);
            syncHud();
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {screen === 'PLAYING' && activeModal === 'guide' && (
        <GuideModal onClose={() => setActiveModal('none')} />
      )}

      {screen === 'PAUSED' && (
        <PauseModal
          onResume={() => {
            setSaveStatus(null);
            setScreen('PLAYING');
          }}
          onNewMap={() => startNewGame(engineRef.current.mode)}
          onQuitToTitle={() => {
            engineRef.current.saveToLocalStorage();
            setHasSave(FactoryEngine.hasSavedGame());
            engineRef.current.initNewWorld(104729, 'career', true);
            setSaveStatus(null);
            setScreen('TITLE_MENU');
          }}
          onDownloadPC={handleDownloadPC}
          onExportSave={handleExportSave}
          onImportSave={handleImportSave}
          saveStatus={saveStatus}
        />
      )}
    </div>
  );
}
