import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { GameMode } from '../game/types';
import { TitleLogoSvg } from './Icons';

interface TitleScreenProps {
  hasSave: boolean;
  onContinue: () => void;
  onStartNew: (mode: GameMode) => void;
  onDownloadPC: () => void;
}

export const TitleScreen: React.FC<TitleScreenProps> = ({
  hasSave,
  onContinue,
  onStartNew,
  onDownloadPC,
}) => {
  const [selectedMode, setSelectedMode] = useState<GameMode>('career');
  const isLocalFile = typeof window !== 'undefined' && window.location.protocol === 'file:';

  return (
    <div className="fixed inset-0 z-20 flex flex-col justify-between pointer-events-none">
      {/* Contrast scrim leaving the right side open to the live factory canvas */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#12161D]/95 via-[#12161D]/70 to-[#12161D]/15 pointer-events-none" />

      <div className="relative z-10 flex-1 flex items-center px-8 md:px-16">
        <div className="max-w-lg w-full pointer-events-auto space-y-8">
          <TitleLogoSvg className="w-full max-w-[360px] h-auto" />

          <p className="text-base text-[#B6C2D4] leading-relaxed max-w-md">
            Стройте добывающие комплексы, сводите конвейерные магистрали и разгоняйте
            производство до максимальной пропускной способности без единого выстрела.
          </p>

          {/* Mode Selector */}
          <div className="space-y-3">
            <div className="text-xs font-medium text-[#8E9BB0]">Режим игры</div>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#191E28] border border-[#2A3242] rounded-lg">
              <button
                type="button"
                onClick={() => setSelectedMode('career')}
                className={`px-4 py-2.5 text-sm font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  selectedMode === 'career'
                    ? 'bg-[#252D3D] text-[#F1F5F9] border border-[#3B475E]'
                    : 'text-[#8E9BB0] hover:text-[#E8EDF5] border border-transparent'
                }`}
              >
                Карьера
              </button>
              <button
                type="button"
                onClick={() => setSelectedMode('sandbox')}
                className={`px-4 py-2.5 text-sm font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  selectedMode === 'sandbox'
                    ? 'bg-[#252D3D] text-[#F1F5F9] border border-[#3B475E]'
                    : 'text-[#8E9BB0] hover:text-[#E8EDF5] border border-transparent'
                }`}
              >
                Песочница
              </button>
            </div>
            <p className="text-xs text-[#8E9BB0]">
              {selectedMode === 'career'
                ? 'Последовательные цели по потоку (шт/с) и постепенное открытие цехов.'
                : 'Все постройки и рецепты доступны сразу с первой секунды.'}
            </p>
          </div>

          {/* Primary Actions */}
          <div className="space-y-3 pt-1">
            <div className="flex flex-wrap items-center gap-3">
              {hasSave ? (
                <>
                  <button
                    type="button"
                    onClick={onContinue}
                    className="px-6 py-3 bg-[#F59E0B] hover:bg-[#FBBF24] text-[#12161D] font-bold text-sm rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Продолжить завод
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartNew(selectedMode)}
                    className="px-5 py-3 bg-[#191E28] hover:bg-[#242B3A] border border-[#2F394C] text-[#E8EDF5] font-semibold text-sm rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Новая карта
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onStartNew(selectedMode)}
                  className="px-7 py-3.5 bg-[#F59E0B] hover:bg-[#FBBF24] text-[#12161D] font-bold text-sm rounded-lg transition-colors whitespace-nowrap cursor-pointer"
                >
                  Начать игру
                </button>
              )}
            </div>

            {!isLocalFile && (
              <div>
                <button
                  type="button"
                  onClick={onDownloadPC}
                  title="Скачать автономный файл игры для запуска без интернета на любом ПК"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[#161B24] hover:bg-[#1F2735] border border-[#2A3242] rounded-lg text-xs font-semibold text-[#CBD5E1] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#38BDF8]" />
                  <span>Скачать игру для ПК (.html)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Single flat control-hint line */}
      <div className="relative z-10 px-8 md:px-16 pb-6">
        <p className="text-xs text-[#8E9BB0] font-mono">
          WASD / ПКМ Панорама · Колесо Зум · ЛКМ Строить · R Поворот · V Осмотр · Esc Пауза
        </p>
      </div>
    </div>
  );
};
