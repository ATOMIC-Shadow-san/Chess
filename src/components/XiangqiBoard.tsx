import React, { useState, useEffect } from 'react';
import { BoardState, Color, Position, getLegalMoves, makeMove, isCheck, hasLegalMoves } from '../game/engine';
import { getBestMove } from '../game/ai';
import { io, Socket } from 'socket.io-client';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Tutorial } from '../game/tutorials';

export function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface XiangqiBoardProps {
  mode: 'local' | 'ai' | 'online' | 'tutorial';
  initialBoard: BoardState;
  aiDifficulty?: 'easy' | 'medium' | 'hard' | 'hell';
  tutorial?: Tutorial;
  targetRoomId?: string;
  onGameEnd?: (winner: Color | 'draw') => void;
}

const PIECE_TEXT = {
  red: { k: '帥', a: '仕', e: '相', h: '傌', r: '俥', c: '炮', p: '兵' },
  black: { k: '將', a: '士', e: '象', h: '馬', r: '車', c: '砲', p: '卒' },
};

export default function XiangqiBoard({ mode, initialBoard, aiDifficulty = 'medium', tutorial, targetRoomId, onGameEnd }: XiangqiBoardProps) {
  const [board, setBoard] = useState<BoardState>(initialBoard);
  const [turn, setTurn] = useState<Color>('red');
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [legalMoves, setLegalMoves] = useState<Position[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Position; to: Position } | null>(null);
  const [checkPos, setCheckPos] = useState<Position | null>(null);
  const [myColor, setMyColor] = useState<Color>('red'); // For AI and Online modes
  const [socket, setSocket] = useState<Socket | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('Red to move');
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);

  // Initialize Socket for Online Mode
  useEffect(() => {
    if (mode === 'online' && targetRoomId) {
      const newSocket = io(import.meta.env.VITE_APP_URL || window.location.origin);
      setSocket(newSocket);

      newSocket.emit('join_room', targetRoomId);
      setIsWaiting(true);
      setStatus(`Connecting to room ${targetRoomId}...`);

      newSocket.on('waiting_in_room', (data: { roomId: string; color: Color }) => {
        setRoomId(data.roomId);
        setMyColor(data.color);
        setStatus(`房間 ID: ${data.roomId} - 等待對手加入...`);
      });

      newSocket.on('match_found', (data: { roomId: string; color: Color }) => {
        setRoomId(data.roomId);
        setMyColor(data.color);
        setIsWaiting(false);
        setStatus(`對手已加入！你是 ${data.color === 'red' ? '紅方' : '黑方'}。紅方先手。`);
      });

      newSocket.on('room_full', () => {
        setStatus('該房間已滿！請返回主選單並嘗試其他房間 ID。');
        setGameOver(true);
        newSocket.disconnect();
      });

      newSocket.on('opponent_moved', (move: { from: Position; to: Position }) => {
        setBoard((prev) => makeMove(prev, move.from, move.to));
        setLastMove(move);
        setTurn((prev) => (prev === 'red' ? 'black' : 'red'));
      });

      newSocket.on('opponent_disconnected', () => {
        setStatus('對手已斷線。你贏了！');
        setGameOver(true);
      });

      return () => {
        newSocket.disconnect();
      };
    } else if (mode === 'ai' || mode === 'tutorial') {
      setMyColor('red'); // Player is always red in AI and tutorial modes
    }
  }, [mode, targetRoomId]);

  // Handle Tutorial Reset
  useEffect(() => {
    if (mode === 'tutorial' && tutorial) {
      setBoard(tutorial.initialBoard);
      setTurn('red');
      setLastMove(null);
      setCheckPos(null);
      setStatus('Red to move. Find the checkmate!');
      setGameOver(false);
    }
  }, [tutorial, mode]);

  // Handle Game State Updates
  useEffect(() => {
    if (gameOver || isWaiting) return;

    const currentCheck = isCheck(board, turn);
    const hasMoves = hasLegalMoves(board, turn);

    if (!hasMoves) {
      setGameOver(true);
      const winner = turn === 'red' ? 'black' : 'red';
      setStatus(`絕殺！ (Checkmate!) ${winner.toUpperCase()} wins!`);
      setCheckPos(null);
      if (onGameEnd) onGameEnd(winner);
      return;
    }

    if (currentCheck) {
      if (mode !== 'tutorial') {
        setStatus(`⚠️ 將軍！ (CHECK!) ${turn.toUpperCase()} to move.`);
      }
      // Find the king that is in check
      let kp = null;
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 9; c++) {
          const p = board[r][c];
          if (p && p.type === 'k' && p.color === turn) {
            kp = { r, c };
          }
        }
      }
      setCheckPos(kp);
    } else {
      if (mode !== 'tutorial') {
        setStatus(`${turn.toUpperCase()} to move.`);
      }
      setCheckPos(null);
    }

    // AI Turn
    if (mode === 'ai' && turn !== myColor && !isThinking) {
      setIsThinking(true);
      setTimeout(() => {
        let depth = 3;
        if (aiDifficulty === 'easy') depth = 2;
        if (aiDifficulty === 'hard') depth = 4;
        if (aiDifficulty === 'hell') depth = 5;
        
        const bestMove = getBestMove(board, turn, depth);
        if (bestMove) {
          handleMove(bestMove.from, bestMove.to);
        }
        setIsThinking(false);
      }, 50); // Small delay to let React render the "Thinking..." state
    }
  }, [board, turn, mode, myColor, isWaiting, gameOver, aiDifficulty, tutorial]);

  const handleMove = (from: Position, to: Position) => {
    const newBoard = makeMove(board, from, to);
    setBoard(newBoard);
    setLastMove({ from, to });
    setTurn((prev) => (prev === 'red' ? 'black' : 'red'));
    setSelectedPos(null);
    setLegalMoves([]);

    if (mode === 'tutorial' && tutorial) {
      const isMate = !hasLegalMoves(newBoard, 'black') && isCheck(newBoard, 'black');
      if (isMate) {
        setStatus('🎉 恭喜！絕殺成功！ (Success!)');
        setGameOver(true);
      } else {
        setStatus('❌ 錯誤！這不是絕殺，請再試一次。 (Try again)');
        setTimeout(() => {
          setBoard(tutorial.initialBoard);
          setTurn('red');
          setLastMove(null);
          setCheckPos(null);
          setStatus('Red to move. Find the checkmate!');
        }, 1500);
      }
      return;
    }

    if (mode === 'online' && socket && roomId) {
      socket.emit('make_move', { roomId, move: { from, to } });
    }
  };

  const onSquareClick = (r: number, c: number) => {
    if (gameOver || isWaiting || isThinking) return;
    if ((mode === 'ai' || mode === 'online' || mode === 'tutorial') && turn !== myColor) return;

    const piece = board[r][c];

    // If a piece is already selected, check if clicking a legal move
    if (selectedPos) {
      const isLegal = legalMoves.some((m) => m.r === r && m.c === c);
      if (isLegal) {
        handleMove(selectedPos, { r, c });
        return;
      }
    }

    // Select a piece
    if (piece && piece.color === turn) {
      setSelectedPos({ r, c });
      setLegalMoves(getLegalMoves(board, r, c));
    } else {
      setSelectedPos(null);
      setLegalMoves([]);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-full">
      {mode === 'tutorial' && tutorial && (
        <div className="bg-amber-100 border-l-4 border-amber-500 p-2 sm:p-4 max-w-[500px] w-full rounded shadow-sm text-sm sm:text-base">
          <h3 className="font-bold text-amber-900">{tutorial.name}</h3>
          <p className="text-amber-800 mt-1">{tutorial.description}</p>
        </div>
      )}
      <div className="text-lg sm:text-xl font-bold h-8 flex items-center gap-2 text-center">
        {status}
        {isThinking && <span className="text-red-500 text-sm animate-pulse">(AI 思考中...)</span>}
      </div>
      
      {/* Board Wrapper - Scales to fit viewport height and width */}
      <div className="w-full flex justify-center">
        <div 
          className="relative bg-[#f0d9b5] border-4 border-[#8b5a2b] shadow-2xl rounded-sm @container"
          style={{ 
            width: 'min(100vw - 1rem, calc((100dvh - 8rem) * 0.9))',
            padding: 'calc(min(100vw - 1rem, calc((100dvh - 8rem) * 0.9)) * 0.0555)'
          }}
        >
          {/* Board Grid - 8x9 squares */}
          <div className="w-full aspect-[8/9] grid grid-cols-8 grid-rows-9 gap-0 border-2 border-[#8b5a2b] relative bg-[#f0d9b5]">
          {/* Render 72 cells for background lines */}
          {Array.from({ length: 9 }).map((_, r) => (
            Array.from({ length: 8 }).map((_, c) => (
              <div key={`cell-${r}-${c}`} className="border border-[#8b5a2b] relative box-border w-full h-full">
                {/* River */}
                {r === 4 && (
                  <div className="absolute inset-0 bg-[#f0d9b5] flex items-center justify-center z-10 border-t-0 border-b-0">
                    {c === 1 && <span className="text-[#8b5a2b] font-bold text-[6cqw]">楚</span>}
                    {c === 2 && <span className="text-[#8b5a2b] font-bold text-[6cqw]">河</span>}
                    {c === 5 && <span className="text-[#8b5a2b] font-bold text-[6cqw]">漢</span>}
                    {c === 6 && <span className="text-[#8b5a2b] font-bold text-[6cqw]">界</span>}
                  </div>
                )}
                {/* Palace Diagonal Lines (Black) */}
                {(r === 0 && c === 3) && <svg className="absolute w-[200%] h-[200%] z-0 pointer-events-none" style={{ top: 0, left: 0 }}><line x1="0" y1="0" x2="100%" y2="100%" stroke="#8b5a2b" strokeWidth="2" /></svg>}
                {(r === 0 && c === 4) && <svg className="absolute w-[200%] h-[200%] z-0 pointer-events-none" style={{ top: 0, left: '-100%' }}><line x1="100%" y1="0" x2="0" y2="100%" stroke="#8b5a2b" strokeWidth="2" /></svg>}
                
                {/* Palace Diagonal Lines (Red) */}
                {(r === 7 && c === 3) && <svg className="absolute w-[200%] h-[200%] z-0 pointer-events-none" style={{ top: 0, left: 0 }}><line x1="0" y1="0" x2="100%" y2="100%" stroke="#8b5a2b" strokeWidth="2" /></svg>}
                {(r === 7 && c === 4) && <svg className="absolute w-[200%] h-[200%] z-0 pointer-events-none" style={{ top: 0, left: '-100%' }}><line x1="100%" y1="0" x2="0" y2="100%" stroke="#8b5a2b" strokeWidth="2" /></svg>}
              </div>
            ))
          ))}

          {/* Render Pieces on Intersections */}
          <div className="absolute inset-0 pointer-events-none">
            {board.map((row, r) => (
              row.map((piece, c) => {
                const isSelected = selectedPos?.r === r && selectedPos?.c === c;
                const isLegalMove = legalMoves.some((m) => m.r === r && m.c === c);
                const isLastMoveFrom = lastMove?.from.r === r && lastMove?.from.c === c;
                const isLastMoveTo = lastMove?.to.r === r && lastMove?.to.c === c;
                const isCheckPos = checkPos?.r === r && checkPos?.c === c;

                return (
                  <div
                    key={`pos-${r}-${c}`}
                    className="absolute flex items-center justify-center pointer-events-auto cursor-pointer z-20"
                    style={{ 
                      top: `${(r / 9) * 100}%`, 
                      left: `${(c / 8) * 100}%`,
                      width: '12.5%',
                      height: '11.111%',
                      transform: 'translate(-50%, -50%)'
                    }}
                    onClick={() => onSquareClick(r, c)}
                  >
                    {/* Last Move Highlight (From) */}
                    {isLastMoveFrom && !piece && (
                      <div className="absolute w-[60%] h-[60%] border-2 border-dashed border-yellow-500 rounded-full z-10 opacity-70"></div>
                    )}
                    
                    {/* Last Move Highlight (To) */}
                    {isLastMoveTo && (
                      <div className="absolute w-[90%] h-[90%] bg-yellow-300 rounded-full z-10 opacity-40"></div>
                    )}

                    {/* Legal Move Dot */}
                    {isLegalMove && !piece && (
                      <div className="w-[30%] h-[30%] rounded-full bg-green-500 opacity-60 z-20"></div>
                    )}
                    
                    {/* Legal Capture Highlight */}
                    {isLegalMove && piece && (
                      <div className="absolute w-[90%] h-[90%] border-4 border-green-500 rounded-full z-20 opacity-60"></div>
                    )}
                    
                    {/* The Piece */}
                    {piece && (
                      <div
                        className={cn(
                          "w-[85%] h-[85%] rounded-full flex items-center justify-center font-bold shadow-md border-2 z-30 bg-[#ffe4c4]",
                          piece.color === 'red' ? "text-red-600 border-red-600" : "text-black border-black",
                          isSelected && "ring-4 ring-blue-500 bg-yellow-100",
                          isCheckPos && "ring-4 ring-red-600 animate-pulse bg-red-300 shadow-[0_0_15px_rgba(220,38,38,0.8)]"
                        )}
                        style={{ fontSize: 'clamp(12px, 6cqw, 64px)' }}
                      >
                        {PIECE_TEXT[piece.color][piece.type]}
                      </div>
                    )}
                  </div>
                );
              })
            ))}
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
