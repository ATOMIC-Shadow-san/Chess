import React from 'react';
import { BoardState, Position } from '../game/engine';
import { cn } from './XiangqiBoard';

interface ReadOnlyBoardProps {
  board: BoardState;
  lastMove?: { from: Position; to: Position } | null;
}

const PIECE_TEXT = {
  red: { k: '帥', a: '仕', e: '相', h: '傌', r: '俥', c: '炮', p: '兵' },
  black: { k: '將', a: '士', e: '象', h: '馬', r: '車', c: '砲', p: '卒' },
};

export default function ReadOnlyBoard({ board, lastMove }: ReadOnlyBoardProps) {
  return (
    <div className="w-full flex justify-center">
      <div 
        className="relative bg-[#f0d9b5] border-4 border-[#8b5a2b] shadow-2xl rounded-sm @container"
        style={{ 
          width: 'min(100vw - 1rem, calc((100dvh - 8rem) * 0.9))',
          padding: 'calc(min(100vw - 1rem, calc((100dvh - 8rem) * 0.9)) * 0.0555)'
        }}
      >
        <div className="w-full aspect-[8/9] grid grid-cols-8 grid-rows-9 gap-0 border-2 border-[#8b5a2b] relative bg-[#f0d9b5]">
          {Array.from({ length: 9 }).map((_, r) => (
            Array.from({ length: 8 }).map((_, c) => (
              <div key={`cell-${r}-${c}`} className="border border-[#8b5a2b] relative box-border w-full h-full">
                {r === 4 && (
                  <div className="absolute inset-0 bg-[#f0d9b5] flex items-center justify-center z-10 border-t-0 border-b-0">
                    {c === 1 && <span className="text-[#8b5a2b] font-bold text-[6cqw]">楚</span>}
                    {c === 2 && <span className="text-[#8b5a2b] font-bold text-[6cqw]">河</span>}
                    {c === 5 && <span className="text-[#8b5a2b] font-bold text-[6cqw]">漢</span>}
                    {c === 6 && <span className="text-[#8b5a2b] font-bold text-[6cqw]">界</span>}
                  </div>
                )}
                {(r === 0 && c === 3) && <svg className="absolute w-[200%] h-[200%] z-0 pointer-events-none" style={{ top: 0, left: 0 }}><line x1="0" y1="0" x2="100%" y2="100%" stroke="#8b5a2b" strokeWidth="2" /></svg>}
                {(r === 0 && c === 4) && <svg className="absolute w-[200%] h-[200%] z-0 pointer-events-none" style={{ top: 0, left: '-100%' }}><line x1="100%" y1="0" x2="0" y2="100%" stroke="#8b5a2b" strokeWidth="2" /></svg>}
                {(r === 7 && c === 3) && <svg className="absolute w-[200%] h-[200%] z-0 pointer-events-none" style={{ top: 0, left: 0 }}><line x1="0" y1="0" x2="100%" y2="100%" stroke="#8b5a2b" strokeWidth="2" /></svg>}
                {(r === 7 && c === 4) && <svg className="absolute w-[200%] h-[200%] z-0 pointer-events-none" style={{ top: 0, left: '-100%' }}><line x1="100%" y1="0" x2="0" y2="100%" stroke="#8b5a2b" strokeWidth="2" /></svg>}
              </div>
            ))
          ))}

          <div className="absolute inset-0 pointer-events-none">
            {board.map((row, r) => (
              row.map((piece, c) => {
                const isLastMoveFrom = lastMove?.from.r === r && lastMove?.from.c === c;
                const isLastMoveTo = lastMove?.to.r === r && lastMove?.to.c === c;

                // Render empty square with highlight if it's the 'from' position
                if (!piece) {
                  if (isLastMoveFrom) {
                    return (
                      <div
                        key={`pos-${r}-${c}`}
                        className="absolute flex items-center justify-center pointer-events-auto z-20"
                        style={{ 
                          top: `${(r / 9) * 100}%`, 
                          left: `${(c / 8) * 100}%`,
                          width: '12.5%',
                          height: '11.111%',
                          transform: 'translate(-50%, -50%)'
                        }}
                      >
                        <div className="absolute w-[60%] h-[60%] border-2 border-dashed border-yellow-500 rounded-full z-10 opacity-70"></div>
                      </div>
                    );
                  }
                  return null;
                }

                return (
                  <div
                    key={`pos-${r}-${c}`}
                    className="absolute flex items-center justify-center pointer-events-auto z-20"
                    style={{ 
                      top: `${(r / 9) * 100}%`, 
                      left: `${(c / 8) * 100}%`,
                      width: '12.5%',
                      height: '11.111%',
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    {isLastMoveFrom && (
                      <div className="absolute w-[60%] h-[60%] border-2 border-dashed border-yellow-500 rounded-full z-10 opacity-70"></div>
                    )}
                    
                    {isLastMoveTo && (
                      <div className="absolute w-full h-full bg-yellow-400 opacity-40 rounded-full z-10 animate-pulse"></div>
                    )}

                    <div
                      className={cn(
                        "w-[85%] h-[85%] rounded-full flex items-center justify-center font-bold shadow-md border-2 z-30 bg-[#ffe4c4]",
                        piece.color === 'red' ? "text-red-600 border-red-600" : "text-black border-black",
                        isLastMoveTo && "ring-4 ring-yellow-400 ring-opacity-50"
                      )}
                      style={{ fontSize: 'clamp(12px, 6cqw, 64px)' }}
                    >
                      {PIECE_TEXT[piece.color][piece.type]}
                    </div>
                  </div>
                );
              })
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
