import React from 'react';
import {
  ArrowUpCircle,
  BookOpen,
  BoxSelect,
  Check,
  Compass,
  Copy,
  Eraser,
  Pause,
  Play,
  RotateCw,
  Search,
  Trash2,
  Volume2,
  VolumeX,
  Lock,
  Menu,
  X,
} from 'lucide-react';
import {
  ALL_ITEMS,
  BUILDABLE_ORDER,
  BUILDINGS,
  ITEM_INFO,
  MILESTONES,
  ORE_INFO,
  RECIPES,
} from '../game/constants';
import {
  BuildingKind,
  HudSnapshot,
  ItemType,
  RecipeId,
  ToolMode,
} from '../game/types';
import { BuildingIcon, ItemIcon } from './Icons';
import { Minimap } from './Minimap';

interface GameHUDProps {
  hud: HudSnapshot;
  tool: ToolMode;
  buildKind: BuildingKind;
  buildDir: number;
  muted: boolean;
  isPastingBlueprint: boolean;
  hasSelectionRect: boolean;
  minimapCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  onJumpTo: (gx: number, gy: number) => void;
  onSelectBuildingTool: (kind: BuildingKind) => void;
  onSetTool: (tool: ToolMode) => void;
  onRotate: () => void;
  onToggleSimSpeed: (speed: number) => void;
  onToggleMute: () => void;
  onOpenUpgrades: () => void;
  onOpenGuide: () => void;
  onOpenPause: () => void;
  onCenterCore: () => void;
  onSetSorterFilter: (buildingId: number, item: ItemType | null) => void;
  onSetCrafterRecipe: (buildingId: number, recipeId: RecipeId | null) => void;
  onRotateSelected: (buildingId: number) => void;
  onDeleteSelected: (x: number, y: number) => void;
  onCopySelection: () => void;
  onEraseSelection: () => void;
  onTogglePasteBlueprint: () => void;
  onCloseInspector: () => void;
}

const DIR_LABELS = ['С', 'В', 'Ю', 'З'];

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  tool,
  buildKind,
  buildDir,
  muted,
  isPastingBlueprint,
  hasSelectionRect,
  minimapCanvasRef,
  onJumpTo,
  onSelectBuildingTool,
  onSetTool,
  onRotate,
  onToggleSimSpeed,
  onToggleMute,
  onOpenUpgrades,
  onOpenGuide,
  onOpenPause,
  onCenterCore,
  onSetSorterFilter,
  onSetCrafterRecipe,
  onRotateSelected,
  onDeleteSelected,
  onCopySelection,
  onEraseSelection,
  onTogglePasteBlueprint,
  onCloseInspector,
}) => {
  const milestone =
    hud.mode === 'career' && !hud.allMilestonesDone
      ? MILESTONES[hud.milestoneIndex]
      : null;

  const totalRate = ALL_ITEMS.reduce((acc, item) => acc + hud.rates[item], 0);

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between p-3">
      {/* Top Row: Left Goal/Telemetry & Right Controls */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left: Goal & Core Telemetry */}
        <div className="pointer-events-auto flex flex-col gap-2 max-w-md">
          <div className="flex items-center gap-3 px-3.5 py-2.5 bg-[#161B24] border border-[#2A3242] rounded-lg">
            {milestone ? (
              <>
                <div className="p-1.5 bg-[#1F2633] border border-[#2F3A4E] rounded-md shrink-0">
                  <ItemIcon item={milestone.targetItem} size={22} />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-[#F1F5F9] truncate">
                      Этап {milestone.level}: {milestone.title}
                    </span>
                    <span className="text-[11px] font-mono text-[#8E9BB0] shrink-0">
                      {ITEM_INFO[milestone.targetItem].name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span
                      className={
                        hud.inventory[milestone.targetItem] >= milestone.targetTotal
                          ? 'text-[#10B981]'
                          : 'text-[#E8EDF5]'
                      }
                    >
                      {hud.inventory[milestone.targetItem]}/{milestone.targetTotal} шт
                    </span>
                    <span className="text-[#475569]">·</span>
                    <span
                      className={
                        hud.rates[milestone.targetItem] >= milestone.targetRate
                          ? 'text-[#10B981]'
                          : 'text-[#F59E0B]'
                      }
                    >
                      {hud.rates[milestone.targetItem].toFixed(1)}/{milestone.targetRate.toFixed(1)} шт/с
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-4">
                <div>
                  <div className="text-xs font-bold text-[#F1F5F9]">
                    {hud.mode === 'sandbox' ? 'Свободная песочница' : 'Все этапы пройдены'}
                  </div>
                  <div className="text-xs font-mono text-[#8E9BB0] mt-0.5">
                    Всего в Ядре: <span className="text-[#E8EDF5]">{hud.totalDelivered}</span> ·{' '}
                    <span className="text-[#10B981]">{totalRate.toFixed(1)} шт/с</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={onOpenUpgrades}
              title="Модернизация и ресурсы (U)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#222938] hover:bg-[#2C3548] border border-[#344056] rounded-md text-xs font-semibold text-[#F1F5F9] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ArrowUpCircle className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Улучшения</span>
            </button>
          </div>

          {hud.milestoneCompleteFlash && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#152923] border border-[#10B981] rounded-md text-xs font-semibold text-[#A7F3D0]">
              <Check className="w-4 h-4 text-[#10B981] shrink-0" />
              <span>Этап выполнен! Открыты новые узлы и цели.</span>
            </div>
          )}
        </div>

        {/* Top-Right: Speed & System Actions */}
        <div className="pointer-events-auto flex items-center gap-1.5 px-2 py-1.5 bg-[#161B24] border border-[#2A3242] rounded-lg">
          <button
            type="button"
            onClick={() => onToggleSimSpeed(hud.simSpeed === 0 ? 1 : 0)}
            title={hud.simSpeed === 0 ? 'Возобновить симуляцию' : 'Пауза симуляции'}
            className={`p-1.5 rounded-md transition-colors cursor-pointer ${
              hud.simSpeed === 0
                ? 'bg-[#F59E0B] text-[#12161D]'
                : 'text-[#CBD5E1] hover:bg-[#222938]'
            }`}
          >
            {hud.simSpeed === 0 ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={() => onToggleSimSpeed(hud.simSpeed === 2 ? 1 : 2)}
            title="Ускорение 2×"
            className={`px-2 py-1 rounded-md text-xs font-mono font-bold transition-colors cursor-pointer ${
              hud.simSpeed === 2
                ? 'bg-[#F59E0B] text-[#12161D]'
                : 'text-[#CBD5E1] hover:bg-[#222938]'
            }`}
          >
            2×
          </button>

          <div className="w-px h-4 bg-[#2A3242] mx-0.5" />

          <button
            type="button"
            onClick={onCenterCore}
            title="Центрировать камеру на Ядре (C)"
            className="p-1.5 rounded-md text-[#CBD5E1] hover:bg-[#222938] transition-colors cursor-pointer"
          >
            <Compass className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            title={muted ? 'Включить звук' : 'Выключить звук'}
            className="p-1.5 rounded-md text-[#CBD5E1] hover:bg-[#222938] transition-colors cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onOpenGuide}
            title="Справочник рецептов и клавиш"
            className="p-1.5 rounded-md text-[#CBD5E1] hover:bg-[#222938] transition-colors cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onOpenPause}
            title="Меню (Esc)"
            className="p-1.5 rounded-md text-[#CBD5E1] hover:bg-[#222938] transition-colors cursor-pointer"
          >
            <Menu className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Middle Area: Right-side Block Properties Inspector */}
      <div className="flex-1 flex items-center justify-end pointer-events-none my-2">
        {hud.selectedBuilding && (
          <div className="pointer-events-auto w-72 bg-[#161B24] border border-[#2A3242] rounded-lg p-3.5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <BuildingIcon kind={hud.selectedBuilding.kind} size={22} />
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#F1F5F9] truncate">
                    {BUILDINGS[hud.selectedBuilding.kind].name}
                  </div>
                  <div className="text-[11px] font-mono text-[#64748B]">
                    {hud.selectedBuilding.x},{hud.selectedBuilding.y}
                    {BUILDINGS[hud.selectedBuilding.kind].rotatable &&
                      ` · Напр: ${DIR_LABELS[hud.selectedBuilding.dir]}`}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseInspector}
                title="Закрыть панель свойств"
                className="p-1 rounded text-[#64748B] hover:text-[#E8EDF5] hover:bg-[#222938] transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-[#8E9BB0] leading-snug">
              {BUILDINGS[hud.selectedBuilding.kind].description}
            </p>

            {/* Primary Speed & Throughput Telemetry */}
            <div className="grid grid-cols-2 gap-2 p-2.5 bg-[#12161D] border border-[#222938] rounded-md">
              <div>
                <div className="text-[10px] text-[#64748B]">Текущий поток</div>
                <div className="text-xs font-mono font-bold text-[#10B981]">
                  {hud.selectedBuilding.localRate.toFixed(2)} шт/с
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#64748B]">
                  {hud.selectedBuilding.kind === 'core'
                    ? 'Суммарный поток'
                    : hud.selectedBuilding.kind === 'smelter' ||
                      hud.selectedBuilding.kind === 'assembler'
                    ? 'Скорость выпуска'
                    : hud.selectedBuilding.kind === 'drill' ||
                      hud.selectedBuilding.kind === 'turbo_drill'
                    ? 'Скорость добычи'
                    : 'Макс. пропускная'}
                </div>
                <div className="text-xs font-mono font-bold text-[#F1F5F9]">
                  {hud.selectedBuilding.maxRate.toFixed(2)} шт/с
                </div>
              </div>
              {hud.selectedBuilding.cycleSec !== null && (
                <div>
                  <div className="text-[10px] text-[#64748B]">Время цикла</div>
                  <div className="text-xs font-mono text-[#CBD5E1]">
                    {hud.selectedBuilding.cycleSec.toFixed(2)} с
                  </div>
                </div>
              )}
              <div>
                <div className="text-[10px] text-[#64748B]">
                  {hud.selectedBuilding.kind === 'core' ? 'Всего принято' : 'Всего прошло'}
                </div>
                <div className="text-xs font-mono text-[#CBD5E1]">
                  {hud.selectedBuilding.throughputCount} шт
                </div>
              </div>
            </div>

            {/* Drill Ore Readout */}
            {(hud.selectedBuilding.kind === 'drill' ||
              hud.selectedBuilding.kind === 'turbo_drill') && (
              <div className="flex items-center justify-between text-xs px-2.5 py-1.5 bg-[#1B212C] border border-[#262E3E] rounded">
                <span className="text-[#8E9BB0]">
                  Залежь ({hud.selectedBuilding.oreTilesCount}/
                  {hud.selectedBuilding.kind === 'turbo_drill' ? 4 : 1}):
                </span>
                {hud.selectedBuilding.oreUnderneath ? (
                  <span
                    className="font-semibold"
                    style={{ color: ORE_INFO[hud.selectedBuilding.oreUnderneath].glow }}
                  >
                    {ORE_INFO[hud.selectedBuilding.oreUnderneath].name}
                  </span>
                ) : (
                  <span className="font-semibold text-[#EF4444]">Нет руды</span>
                )}
              </div>
            )}

            {/* Bridge Telemetry */}
            {hud.selectedBuilding.kind === 'bridge' && (
              <div className="flex items-center justify-between text-xs px-2.5 py-1.5 bg-[#1B212C] border border-[#262E3E] rounded">
                <span className="text-[#8E9BB0]">
                  {hud.selectedBuilding.bridgeRole === 'entry'
                    ? 'Вход в туннель'
                    : hud.selectedBuilding.bridgeRole === 'exit'
                    ? 'Выход из туннеля'
                    : 'Нет ответного моста'}
                </span>
                {hud.selectedBuilding.bridgeSpan !== null && (
                  <span className="font-mono text-[#38BDF8]">
                    {hud.selectedBuilding.bridgeSpan} кл.
                  </span>
                )}
              </div>
            )}

            {/* Buffer & Items Currently Inside */}
            {hud.selectedBuilding.bufferCap > 0 && (
              <div className="flex items-center justify-between gap-2 text-xs px-2.5 py-1.5 bg-[#1B212C] border border-[#262E3E] rounded">
                <span className="text-[#8E9BB0]">
                  Буфер ({hud.selectedBuilding.bufferUsed}/{hud.selectedBuilding.bufferCap}):
                </span>
                <div className="flex items-center gap-1 min-w-0">
                  {hud.selectedBuilding.itemsInside.length > 0 ? (
                    hud.selectedBuilding.itemsInside.slice(0, 5).map((item, idx) => (
                      <ItemIcon key={`${item}-${idx}`} item={item} size={14} />
                    ))
                  ) : (
                    <span className="text-[#64748B]">Пусто</span>
                  )}
                </div>
              </div>
            )}

            {/* Sorter Filter Selector */}
            {hud.selectedBuilding.kind === 'sorter' && (
              <div className="space-y-1.5">
                <div className="text-xs font-medium text-[#8E9BB0]">Фильтр (прямо):</div>
                <div className="grid grid-cols-6 gap-1">
                  {ALL_ITEMS.map((item) => {
                    const active = hud.selectedBuilding?.filterItem === item;
                    return (
                      <button
                        key={item}
                        type="button"
                        title={ITEM_INFO[item].name}
                        onClick={() => onSetSorterFilter(hud.selectedBuilding!.id, item)}
                        className={`p-1.5 rounded border flex items-center justify-center transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#263348] border-[#38BDF8]'
                            : 'bg-[#1B212C] border-[#262E3E] hover:border-[#3D4A63]'
                        }`}
                      >
                        <ItemIcon item={item} size={15} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Crafter Recipe Selector & Input Buffer */}
            {(hud.selectedBuilding.kind === 'smelter' ||
              hud.selectedBuilding.kind === 'assembler') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8E9BB0]">Рецепт:</span>
                  <span className="font-mono text-[#E8EDF5]">
                    {hud.selectedBuilding.recipeId
                      ? RECIPES[hud.selectedBuilding.recipeId].name
                      : hud.selectedBuilding.activeRecipeId
                      ? `Авто (${RECIPES[hud.selectedBuilding.activeRecipeId].name})`
                      : 'Автовыбор'}
                  </span>
                </div>

                {/* Input Buffer Counts */}
                {Object.values(hud.selectedBuilding.inputBuffer).some((v) => (v || 0) > 0) && (
                  <div className="flex flex-wrap items-center gap-2 px-2.5 py-1.5 bg-[#1B212C] border border-[#262E3E] rounded text-xs font-mono">
                    <span className="text-[#8E9BB0] font-sans">Сырьё:</span>
                    {(Object.entries(hud.selectedBuilding.inputBuffer) as Array<[ItemType, number]>)
                      .filter(([, qty]) => qty > 0)
                      .map(([item, qty]) => (
                        <span key={item} className="flex items-center gap-1 text-[#E8EDF5]">
                          <ItemIcon item={item} size={13} />
                          <span>{qty}</span>
                        </span>
                      ))}
                  </div>
                )}

                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => onSetCrafterRecipe(hud.selectedBuilding!.id, null)}
                    className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-medium border transition-colors cursor-pointer ${
                      hud.selectedBuilding.recipeId === null
                        ? 'bg-[#252D3D] border-[#F59E0B] text-[#F1F5F9]'
                        : 'bg-[#1B212C] border-[#262E3E] text-[#8E9BB0] hover:text-[#E8EDF5]'
                    }`}
                  >
                    Автоопределение по сырью
                  </button>
                  {Object.values(RECIPES)
                    .filter((r) => r.building === hud.selectedBuilding?.kind)
                    .map((r) => {
                      const active = hud.selectedBuilding?.recipeId === r.id;
                      const craftMult = 1 + (hud.upgrades.craftLevel - 1) * 0.35;
                      const outPerSec = (r.outputCount * craftMult) / r.craftTime;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => onSetCrafterRecipe(hud.selectedBuilding!.id, r.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs border transition-colors cursor-pointer ${
                            active
                              ? 'bg-[#252D3D] border-[#F59E0B] text-[#F1F5F9] font-semibold'
                              : 'bg-[#1B212C] border-[#262E3E] text-[#CBD5E1] hover:border-[#3D4A63]'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <ItemIcon item={r.output} size={14} />
                            <span>{r.name}</span>
                          </span>
                          <span className="text-[11px] font-mono text-[#8E9BB0]">
                            {outPerSec.toFixed(1)}/с
                          </span>
                        </button>
                      );
                    })}
                </div>

                {/* Progress Bar */}
                <div className="h-1.5 bg-[#12161D] rounded overflow-hidden">
                  <div
                    className="h-full bg-[#F59E0B]"
                    style={{ width: `${Math.round(hud.selectedBuilding.craftProgress * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {hud.selectedBuilding.kind === 'core' ? (
              <button
                type="button"
                onClick={onOpenUpgrades}
                className="w-full py-1.5 px-3 bg-[#222938] hover:bg-[#2C3548] border border-[#344056] rounded text-xs font-semibold text-[#F1F5F9] cursor-pointer"
              >
                Открыть сводку ресурсов и улучшения
              </button>
            ) : (
              <div className="flex items-center gap-2 pt-1 border-t border-[#252D3D]">
                {BUILDINGS[hud.selectedBuilding.kind].rotatable && (
                  <button
                    type="button"
                    onClick={() => onRotateSelected(hud.selectedBuilding!.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-[#1E2534] hover:bg-[#283145] border border-[#2F394C] rounded text-xs font-medium text-[#E8EDF5] cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Повернуть</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    onDeleteSelected(hud.selectedBuilding!.x, hud.selectedBuilding!.y)
                  }
                  className="flex items-center justify-center gap-1.5 py-1.5 px-2.5 bg-[#2B1D24] hover:bg-[#3A242E] border border-[#522933] rounded text-xs font-medium text-[#FCA5A5] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Снести</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Row: Hover Readout + Building Hotbar */}
      <div className="flex flex-col items-center gap-2">
        {/* Contextual Blueprint / Selection Bar */}
        {(hasSelectionRect || hud.blueprintCount > 0) && (
          <div className="pointer-events-auto flex items-center gap-2 px-3 py-1.5 bg-[#161B24] border border-[#2A3242] rounded-lg">
            {hasSelectionRect && (
              <>
                <button
                  type="button"
                  onClick={onCopySelection}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[#222938] hover:bg-[#2C3548] rounded text-xs font-semibold text-[#E8EDF5] cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>Копировать (Ctrl+C)</span>
                </button>
                <button
                  type="button"
                  onClick={onEraseSelection}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-[#2B1D24] hover:bg-[#3A242E] rounded text-xs font-semibold text-[#FCA5A5] cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Удалить область</span>
                </button>
              </>
            )}
            {hud.blueprintCount > 0 && (
              <button
                type="button"
                onClick={onTogglePasteBlueprint}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                  isPastingBlueprint
                    ? 'bg-[#F59E0B] text-[#12161D]'
                    : 'bg-[#222938] hover:bg-[#2C3548] text-[#E8EDF5]'
                }`}
              >
                <span>
                  {isPastingBlueprint
                    ? `Вставка (${hud.blueprintCount} шт) · R Поворот`
                    : `Вставить чертёж (${hud.blueprintCount})`}
                </span>
              </button>
            )}
          </div>
        )}

        <div className="w-full flex items-end justify-between gap-3">
          {/* Bottom-Left Subtle Tile Readout */}
          <div className="hidden lg:flex items-center gap-2.5 px-3 py-2 bg-[#161B24] border border-[#2A3242] rounded-lg min-w-[210px] h-11">
            {hud.hoveredInfo ? (
              <div className="flex items-center gap-2 text-xs truncate">
                <span className="font-mono text-[#64748B]">
                  {hud.hoveredInfo.gx},{hud.hoveredInfo.gy}
                </span>
                {hud.hoveredInfo.ore && (
                  <span
                    className="font-semibold"
                    style={{ color: ORE_INFO[hud.hoveredInfo.ore].glow }}
                  >
                    {ORE_INFO[hud.hoveredInfo.ore].name}
                  </span>
                )}
                {hud.hoveredInfo.buildingKind && (
                  <span className="text-[#E8EDF5] font-medium">
                    {BUILDINGS[hud.hoveredInfo.buildingKind].name}
                    {hud.hoveredInfo.localRate > 0.05 && (
                      <span className="font-mono text-[#10B981] ml-1.5">
                        {hud.hoveredInfo.localRate.toFixed(1)}/с
                      </span>
                    )}
                  </span>
                )}
                {!hud.hoveredInfo.ore && !hud.hoveredInfo.buildingKind && (
                  <span className="text-[#64748B]">Свободный грунт</span>
                )}
              </div>
            ) : (
              <span className="text-xs text-[#64748B]">Наведите на клетку</span>
            )}
          </div>

          {/* Center Building Hotbar */}
          <div className="pointer-events-auto mx-auto flex items-center gap-1 p-1.5 bg-[#161B24] border border-[#2A3242] rounded-xl overflow-x-auto max-w-full">
            {BUILDABLE_ORDER.map((kind) => {
              const def = BUILDINGS[kind];
              const unlocked =
                hud.mode === 'sandbox' || hud.milestoneIndex >= def.unlockTier;
              const active =
                !isPastingBlueprint && tool === 'build' && buildKind === kind;

              return (
                <button
                  key={kind}
                  type="button"
                  disabled={!unlocked}
                  onClick={() => onSelectBuildingTool(kind)}
                  title={`${def.name} (${def.hotkey}) — ${def.description}${
                    !unlocked ? ` [Откроется на этапе ${def.unlockTier + 1}]` : ''
                  }`}
                  className={`relative flex flex-col items-center justify-center w-14 h-12 rounded-lg border transition-colors shrink-0 ${
                    !unlocked
                      ? 'bg-[#141820] border-[#202634] opacity-40 cursor-not-allowed'
                      : active
                      ? 'bg-[#252D3D] border-[#F59E0B] cursor-pointer'
                      : 'bg-[#1B212C] border-[#262E3E] hover:border-[#3D4A63] cursor-pointer'
                  }`}
                >
                  <span className="absolute top-0.5 left-1 text-[9px] font-mono text-[#64748B]">
                    {def.hotkey}
                  </span>
                  {unlocked ? (
                    <BuildingIcon kind={kind} size={20} />
                  ) : (
                    <Lock className="w-4 h-4 text-[#64748B]" />
                  )}
                  <span className="text-[10px] text-[#CBD5E1] font-medium mt-0.5 truncate max-w-[50px]">
                    {def.name}
                  </span>
                </button>
              );
            })}

            <div className="w-px h-8 bg-[#2A3242] mx-1 shrink-0" />

            <button
              type="button"
              onClick={onRotate}
              title={`Повернуть (R) — текущее: ${DIR_LABELS[buildDir]}`}
              className="flex flex-col items-center justify-center w-12 h-12 rounded-lg bg-[#1B212C] border border-[#262E3E] hover:border-[#3D4A63] text-[#CBD5E1] transition-colors shrink-0 cursor-pointer"
            >
              <RotateCw className="w-4 h-4" />
              <span className="text-[10px] font-mono mt-0.5">R · {DIR_LABELS[buildDir]}</span>
            </button>

            <button
              type="button"
              onClick={() => onSetTool('inspect')}
              title="Осмотр свойств любого блока, включая ленты (V)"
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg border transition-colors shrink-0 cursor-pointer ${
                tool === 'inspect' && !isPastingBlueprint
                  ? 'bg-[#222E40] border-[#10B981] text-[#F1F5F9]'
                  : 'bg-[#1B212C] border-[#262E3E] hover:border-[#3D4A63] text-[#CBD5E1]'
              }`}
            >
              <Search className="w-4 h-4" />
              <span className="text-[10px] font-medium mt-0.5">Осмотр</span>
            </button>

            <button
              type="button"
              onClick={() => onSetTool('select')}
              title="Выделение области и копирование чертежей (B)"
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg border transition-colors shrink-0 cursor-pointer ${
                tool === 'select' && !isPastingBlueprint
                  ? 'bg-[#222E40] border-[#38BDF8] text-[#F1F5F9]'
                  : 'bg-[#1B212C] border-[#262E3E] hover:border-[#3D4A63] text-[#CBD5E1]'
              }`}
            >
              <BoxSelect className="w-4 h-4" />
              <span className="text-[10px] font-medium mt-0.5">Чертёж</span>
            </button>

            <button
              type="button"
              onClick={() => onSetTool('erase')}
              title="Снос построек (X)"
              className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg border transition-colors shrink-0 cursor-pointer ${
                tool === 'erase'
                  ? 'bg-[#361E26] border-[#EF4444] text-[#FCA5A5]'
                  : 'bg-[#1B212C] border-[#262E3E] hover:border-[#3D4A63] text-[#CBD5E1]'
              }`}
            >
              <Eraser className="w-4 h-4" />
              <span className="text-[10px] font-medium mt-0.5">Снос</span>
            </button>
          </div>

          {/* Bottom-Right Interactive Minimap */}
          <div className="flex justify-end lg:min-w-[210px]">
            <Minimap canvasRef={minimapCanvasRef} onJumpTo={onJumpTo} />
          </div>
        </div>
      </div>
    </div>
  );
};
