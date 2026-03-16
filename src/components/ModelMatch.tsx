import React, { useState, useRef } from 'react';
import { BoardState, Color, INITIAL_BOARD, hasLegalMoves, makeMove } from '../game/engine';
import { XiangqiRL, hashBoard } from '../game/rl';
import ReadOnlyBoard from './ReadOnlyBoard';
import ModelUploader from './ModelUploader';

export default function ModelMatch() {
  const [redModel, setRedModel] = useState<XiangqiRL | null>(null);
  const [blackModel, setBlackModel] = useState<XiangqiRL | null>(null);
  const [board, setBoard] = useState<BoardState>(INITIAL_BOARD);
  const [isMatching, setIsMatching] = useState(false);
  const [slowMode, setSlowMode] = useState(true);
  const [logs, setLogs] = useState<string[]>([]);
  const isMatchingRef = useRef(false);

  const addLog = (msg: string) => setLogs(prev => [msg, ...prev].slice(0, 50));

  const startMatch = async () => {
    if (!redModel || !blackModel) {
      addLog('請先載入紅方與黑方模型！');
      return;
    }
    setIsMatching(true);
    isMatchingRef.current = true;
    setBoard(INITIAL_BOARD);
    addLog('對戰開始！');

    let currentBoard = INITIAL_BOARD;
    let turn: Color = 'red';
    const history: string[] = [];
    let stepCount = 0;

    while (isMatchingRef.current) {
      if (slowMode) {
        await new Promise(r => setTimeout(r, 500));
      } else {
        if (stepCount % 5 === 0) await new Promise(r => setTimeout(r, 0));
      }

      const currentModel = turn === 'red' ? redModel : blackModel;
      const move = await currentModel.getBestMove(currentBoard, turn, 0);

      if (!move) {
        addLog(`${turn === 'red' ? '黑方' : '紅方'} 獲勝 (無步可走)`);
        break;
      }

      currentBoard = makeMove(currentBoard, move.from, move.to);
      setBoard(currentBoard);
      
      const hash = hashBoard(currentBoard);
      history.push(hash);

      const repetitions = history.filter(h => h === hash).length;
      if (repetitions >= 3) {
        addLog(`和局 (重複盤面 3 次)`);
        break;
      }

      const nextTurn = turn === 'red' ? 'black' : 'red';
      if (!hasLegalMoves(currentBoard, nextTurn)) {
        addLog(`${turn === 'red' ? '紅方' : '黑方'} 獲勝 (絕殺)`);
        break;
      }

      if (stepCount >= 300) {
        addLog(`和局 (超過 300 步)`);
        break;
      }

      turn = nextTurn;
      stepCount++;
    }
    setIsMatching(false);
    isMatchingRef.current = false;
  };

  const stopMatch = () => {
    setIsMatching(false);
    isMatchingRef.current = false;
    addLog('對戰已停止。');
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full max-w-6xl mx-auto p-4">
      <div className="flex-1 flex flex-col gap-4">
        <h2 className="text-2xl font-bold">模型對戰 (Model vs Model)</h2>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ModelUploader label="紅方模型 (Red Model)" onModelLoaded={setRedModel} />
          <ModelUploader label="黑方模型 (Black Model)" onModelLoaded={setBlackModel} />
        </div>

        <div className="bg-white p-4 rounded shadow-sm flex flex-col gap-4">
          <label className="flex items-center gap-2 cursor-pointer font-bold text-stone-700">
            <input type="checkbox" checked={slowMode} onChange={e => setSlowMode(e.target.checked)} className="w-5 h-5" />
            慢速模式 (可視化 500ms/步)
          </label>

          <div className="flex gap-2">
            {!isMatching ? (
              <button onClick={startMatch} disabled={!redModel || !blackModel} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold disabled:opacity-50">
                開始對戰
              </button>
            ) : (
              <button onClick={stopMatch} className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-bold">
                停止對戰
              </button>
            )}
          </div>
        </div>

        <div className="bg-gray-900 text-green-400 p-4 rounded-lg shadow-md h-64 overflow-y-auto font-mono text-sm">
          <div className="font-bold text-white mb-2">對戰日誌 (Match Logs)</div>
          {logs.map((log, i) => (
            <div key={i} className="border-b border-gray-800 py-1">{log}</div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex justify-center items-start">
        <div className="w-full max-w-md">
          <ReadOnlyBoard board={board} />
        </div>
      </div>
    </div>
  );
}
