import React from 'react';
import { X, ArrowRight, RotateCcw, Play, Home, Download, Upload, FileDown } from 'lucide-react';
import {
  ALL_ITEMS,
  ITEM_INFO,
  MILESTONES,
  RECIPES,
  getUpgradeCost,
} from '../game/constants';
import { HudSnapshot, ItemType, UpgradeState } from '../game/types';
import { ItemIcon } from './Icons';

interface UpgradesModalProps {
  hud: HudSnapshot;
  onBuyUpgrade: (key: keyof UpgradeState) => void;
  onClose: () => void;
}

export const UpgradesModal: React.FC<UpgradesModalProps> = ({
  hud,
  onBuyUpgrade,
  onClose,
}) => {
  const upgradeList: Array<{
    key: keyof UpgradeState;
    title: string;
    desc: string;
    level: number;
  }> = [
    {
      key: 'drillLevel',
      title: 'Скорость бурения',
      desc: 'Ускоряет все буры и карьерные буры на +35% за уровень.',
      level: hud.upgrades.drillLevel,
    },
    {
      key: 'beltLevel',
      title: 'Пропускная лента',
      desc: 'Увеличивает скорость конвейеров и перекрёстков на +35% за уровень.',
      level: hud.upgrades.beltLevel,
    },
    {
      key: 'craftLevel',
      title: 'Темп переработки',
      desc: 'Ускоряет плавильни и сборочные цеха на +35% за уровень.',
      level: hud.upgrades.craftLevel,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl max-h-[86vh] flex flex-col bg-[#161B24] border border-[#2A3242] rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#252D3D]">
          <div>
            <h2 className="text-lg font-bold text-[#F1F5F9]">Модернизация и ресурсы Ядра</h2>
            <p className="text-xs text-[#8E9BB0] mt-0.5">
              Улучшайте узлы завода за счёт накопленных материалов и отслеживайте общий поток
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#8E9BB0] hover:text-[#F1F5F9] hover:bg-[#222938] transition-colors cursor-pointer"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Upgrades Section */}
          <div>
            <h3 className="text-sm font-semibold text-[#E8EDF5] mb-3">Узлы модернизации</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {upgradeList.map((u) => {
                const costs = getUpgradeCost(u.key, u.level);
                const canAfford =
                  hud.mode === 'sandbox' ||
                  costs.every((c) => hud.inventory[c.item] >= c.amount);
                const mult = (1 + (u.level - 1) * 0.35).toFixed(2);

                return (
                  <div
                    key={u.key}
                    className="flex flex-col justify-between p-4 bg-[#1B212C] border border-[#2A3242] rounded-lg space-y-4"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-bold text-[#F1F5F9]">{u.title}</span>
                        <span className="text-xs font-mono text-[#F59E0B]">
                          Ур. {u.level} · ×{mult}
                        </span>
                      </div>
                      <p className="text-xs text-[#8E9BB0] leading-relaxed">{u.desc}</p>
                    </div>

                    <div className="space-y-3">
                      {hud.mode !== 'sandbox' ? (
                        <div className="flex flex-wrap gap-3 text-xs font-mono">
                          {costs.map((c) => {
                            const have = hud.inventory[c.item];
                            const ok = have >= c.amount;
                            return (
                              <div key={c.item} className="flex items-center gap-1.5">
                                <ItemIcon item={c.item} size={15} />
                                <span className={ok ? 'text-[#E8EDF5]' : 'text-[#EF4444]'}>
                                  {have}/{c.amount}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-[#8E9BB0]">Бесплатно в песочнице</div>
                      )}

                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => onBuyUpgrade(u.key)}
                        className={`w-full py-2 px-3 rounded-md text-xs font-bold transition-colors whitespace-nowrap ${
                          canAfford
                            ? 'bg-[#F59E0B] hover:bg-[#FBBF24] text-[#12161D] cursor-pointer'
                            : 'bg-[#232A38] text-[#64748B] cursor-not-allowed'
                        }`}
                      >
                        Улучшить до ур. {u.level + 1}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Core Telemetry Table */}
          <div>
            <h3 className="text-sm font-semibold text-[#E8EDF5] mb-3">Сводка по ресурсам</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
              {ALL_ITEMS.map((item) => (
                <div
                  key={item}
                  className="flex items-center justify-between px-3 py-2.5 bg-[#1B212C] border border-[#262E3E] rounded-lg"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ItemIcon item={item} size={18} />
                    <span className="text-xs font-medium text-[#CBD5E1] truncate">
                      {ITEM_INFO[item].name}
                    </span>
                  </div>
                  <div className="text-right font-mono shrink-0 ml-2">
                    <div className="text-xs font-bold text-[#F1F5F9]">
                      {hud.inventory[item]}
                    </div>
                    <div className="text-[11px] text-[#10B981]">
                      {hud.rates[item].toFixed(1)}/с
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Career Milestones Roadmap */}
          {hud.mode === 'career' && (
            <div>
              <h3 className="text-sm font-semibold text-[#E8EDF5] mb-3">Этапы оптимизации</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {MILESTONES.map((m, idx) => {
                  const done = hud.allMilestonesDone || idx < hud.milestoneIndex;
                  const active = !hud.allMilestonesDone && idx === hud.milestoneIndex;
                  return (
                    <div
                      key={m.level}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg border ${
                        active
                          ? 'bg-[#222938] border-[#F59E0B]'
                          : done
                          ? 'bg-[#172121] border-[#1E3A34]'
                          : 'bg-[#191E28] border-[#252D3D] opacity-65'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ItemIcon item={m.targetItem} size={20} />
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[#F1F5F9] truncate">
                            {m.level}. {m.title}
                          </div>
                          <div className="text-[11px] text-[#8E9BB0] font-mono">
                            {m.targetTotal} шт · {m.targetRate}/с
                            {m.unlocks ? ` · Откр: ${m.unlocks}` : ''}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`text-[11px] font-semibold shrink-0 ml-2 ${
                          done ? 'text-[#10B981]' : active ? 'text-[#F59E0B]' : 'text-[#64748B]'
                        }`}
                      >
                        {done ? 'Выполнен' : active ? 'В работе' : 'Закрыт'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface GuideModalProps {
  onClose: () => void;
}

export const GuideModal: React.FC<GuideModalProps> = ({ onClose }) => {
  const recipes = Object.values(RECIPES);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-[#161B24] border border-[#2A3242] rounded-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#252D3D]">
          <div>
            <h2 className="text-lg font-bold text-[#F1F5F9]">Справочник рецептов и управления</h2>
            <p className="text-xs text-[#8E9BB0] mt-0.5">
              Производственные цепочки плавильни и сборочного цеха
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[#8E9BB0] hover:text-[#F1F5F9] hover:bg-[#222938] transition-colors cursor-pointer"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-[#E8EDF5] mb-3">Рецепты переработки</h3>
            <div className="space-y-2">
              {recipes.map((r) => (
                <div
                  key={r.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#1B212C] border border-[#262E3E] rounded-lg"
                >
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-semibold text-[#8E9BB0] w-28">
                      {r.building === 'smelter' ? 'Плавильня' : 'Сборочный цех'}
                    </span>
                    <div className="flex items-center gap-2">
                      {(Object.entries(r.inputs) as Array<[ItemType, number]>).map(([item, qty], idx) => (
                        <React.Fragment key={item}>
                          {idx > 0 && <span className="text-xs text-[#64748B]">+</span>}
                          <div className="flex items-center gap-1.5 text-xs text-[#E8EDF5] font-mono">
                            <ItemIcon item={item} size={16} />
                            <span>{qty}× {ITEM_INFO[item].name}</span>
                          </div>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <ArrowRight className="w-4 h-4 text-[#64748B]" />
                    <div className="flex items-center gap-1.5 text-xs font-bold text-[#F1F5F9]">
                      <ItemIcon item={r.output} size={17} />
                      <span>{r.name}</span>
                    </div>
                    <span className="text-xs font-mono text-[#8E9BB0] ml-2">
                      {r.craftTime.toFixed(1)}с
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-[#1B212C] border border-[#262E3E] rounded-lg space-y-2">
              <h4 className="text-sm font-bold text-[#F1F5F9]">Советы по логистике</h4>
              <ul className="text-xs text-[#9AA6BA] space-y-1.5 leading-relaxed">
                <li>• Зажмите ЛКМ и ведите мышью, чтобы ленты автоматически поворачивали по маршруту.</li>
                <li>• 3 обычных бура полностью загружают 1 базовую конвейерную ленту.</li>
                <li>• Мост перебрасывает поток через другие линии на расстояние до 10 клеток (можно протянуть мышью от входа к выходу).</li>
                <li>• Нажмите на фильтр, чтобы выбрать ресурс, который пойдёт строго прямо.</li>
              </ul>
            </div>

            <div className="p-4 bg-[#1B212C] border border-[#262E3E] rounded-lg space-y-2">
              <h4 className="text-sm font-bold text-[#F1F5F9]">Горячие клавиши</h4>
              <div className="grid grid-cols-2 gap-y-1.5 text-xs">
                <span className="text-[#8E9BB0]">Камера</span>
                <span className="font-mono text-[#E8EDF5]">WASD / ПКМ</span>
                <span className="text-[#8E9BB0]">Поворот</span>
                <span className="font-mono text-[#E8EDF5]">R / Shift+R</span>
                <span className="text-[#8E9BB0]">Пипетка</span>
                <span className="font-mono text-[#E8EDF5]">Q / СКМ</span>
                <span className="text-[#8E9BB0]">Осмотр блока</span>
                <span className="font-mono text-[#E8EDF5]">V или клик</span>
                <span className="text-[#8E9BB0]">Снос</span>
                <span className="font-mono text-[#E8EDF5]">X или ЛКМ в сносе</span>
                <span className="text-[#8E9BB0]">Выделение / Чертёж</span>
                <span className="font-mono text-[#E8EDF5]">B · Ctrl+C / Ctrl+V</span>
                <span className="text-[#8E9BB0]">Модернизация</span>
                <span className="font-mono text-[#E8EDF5]">U</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface PauseModalProps {
  onResume: () => void;
  onNewMap: () => void;
  onQuitToTitle: () => void;
  onDownloadPC: () => void;
  onExportSave: () => void;
  onImportSave: (file: File) => void;
  saveStatus: string | null;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  onResume,
  onNewMap,
  onQuitToTitle,
  onDownloadPC,
  onExportSave,
  onImportSave,
  saveStatus,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const isLocalFile = typeof window !== 'undefined' && window.location.protocol === 'file:';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm bg-[#161B24] border border-[#2A3242] rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-[#F1F5F9]">Пауза</h2>
          <p className="text-xs text-[#8E9BB0] mt-1">
            Прогресс завода автоматически сохраняется локально.
          </p>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onResume}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#F59E0B] hover:bg-[#FBBF24] text-[#12161D] font-bold text-sm rounded-lg transition-colors cursor-pointer"
          >
            <Play className="w-4 h-4" />
            <span>Продолжить</span>
          </button>

          <button
            type="button"
            onClick={onNewMap}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#1E2534] hover:bg-[#273044] border border-[#2F394C] text-[#E8EDF5] font-semibold text-sm rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Создать новую карту</span>
          </button>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={onExportSave}
              title="Сохранить завод в файл .json для переноса"
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#1B212C] hover:bg-[#242C3B] border border-[#2A3242] text-[#CBD5E1] font-medium text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <FileDown className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Экспорт (.json)</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Загрузить завод из файла .json"
              className="flex items-center justify-center gap-1.5 py-2 px-3 bg-[#1B212C] hover:bg-[#242C3B] border border-[#2A3242] text-[#CBD5E1] font-medium text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Импорт (.json)</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  onImportSave(file);
                  e.target.value = '';
                }
              }}
            />
          </div>

          {!isLocalFile && (
            <button
              type="button"
              onClick={onDownloadPC}
              title="Скачать автономный файл игры для запуска на ПК без интернета"
              className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[#1B212C] hover:bg-[#242C3B] border border-[#2A3242] text-[#E8EDF5] font-semibold text-xs rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 text-[#38BDF8]" />
              <span>Скачать игру для ПК (.html)</span>
            </button>
          )}

          {saveStatus && (
            <p className="text-xs text-center text-[#10B981] font-medium">{saveStatus}</p>
          )}

          <button
            type="button"
            onClick={onQuitToTitle}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-[#191E28] hover:bg-[#222938] border border-[#2A3242] text-[#9AA6BA] font-semibold text-sm rounded-lg transition-colors cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>В главное меню</span>
          </button>
        </div>
      </div>
    </div>
  );
};
