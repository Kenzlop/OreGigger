import React from 'react';
import { GRID_SIZE } from '../game/constants';

interface MinimapProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onJumpTo: (gx: number, gy: number) => void;
}

export const Minimap: React.FC<MinimapProps> = ({ canvasRef, onJumpTo }) => {
  const draggingRef = React.useRef(false);

  const handlePointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
    onJumpTo(nx * GRID_SIZE, ny * GRID_SIZE);
  };

  return (
    <div className="pointer-events-auto hidden md:flex flex-col bg-[#161B24] border border-[#2A3242] rounded-lg p-1.5 shrink-0">
      <canvas
        ref={canvasRef}
        width={128}
        height={128}
        onPointerDown={(e) => {
          e.stopPropagation();
          draggingRef.current = true;
          handlePointer(e);
        }}
        onPointerMove={(e) => {
          if (!draggingRef.current) return;
          e.stopPropagation();
          handlePointer(e);
        }}
        onPointerUp={() => {
          draggingRef.current = false;
        }}
        onPointerLeave={() => {
          draggingRef.current = false;
        }}
        className="w-32 h-32 rounded cursor-pointer block"
        title="Карта мира (нажмите для перемещения камеры)"
      />
    </div>
  );
};
