/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import XiangqiBoard from './components/XiangqiBoard';
import { INITIAL_BOARD } from './game/engine';
import { TUTORIALS, Tutorial } from './game/tutorials';
import TrainingArena from './components/TrainingArena';
import ModelMatch from './components/ModelMatch';
import ModelUploader from './components/ModelUploader';
import { XiangqiRL } from './game/rl';

type GameMode = 'menu' | 'local' | 'ai' | 'online' | 'tutorial' | 'training' | 'model_match';
type AIDifficulty = 'easy' | 'medium' | 'hard' | 'hell';

export default function App() {
  const [mode, setMode] = useState<GameMode>('menu');
  const [aiDifficulty, setAiDifficulty] = useState<AIDifficulty>('medium');
  const [showTutorials, setShowTutorials] = useState(false);
  const [showOnlineSetup, setShowOnlineSetup] = useState(false);
  const [roomIdInput, setRoomIdInput] = useState('');
  const [activeRoomId, setActiveRoomId] = useState<string | undefined>(undefined);
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [customAI, setCustomAI] = useState<XiangqiRL | null>(null);

  return (
    <div className={`min-h-[100dvh] bg-stone-100 flex flex-col items-center justify-center p-2 sm:p-4 ${mode !== 'menu' ? 'overflow-hidden' : ''}`}>
      {mode === 'menu' && (
        <h1 className="text-3xl sm:text-4xl font-bold mb-8 text-stone-800 text-center">中國象棋 (Chinese Chess)</h1>
      )}
      
      {mode === 'menu' && !showTutorials && !showOnlineSetup && (
        <div className="flex flex-col gap-4 w-72">
          <button 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
            onClick={() => setMode('local')}
          >
            雙人本地 (Local Multiplayer)
          </button>
          
          <div className="flex flex-col gap-2 bg-green-50 p-4 rounded-lg border border-green-200">
            <button 
              className="px-6 py-3 bg-green-600 text-white rounded-lg shadow hover:bg-green-700 transition"
              onClick={() => setMode('ai')}
            >
              單人對戰 AI (vs AI)
            </button>
            <div className="flex justify-between mt-2">
              <label className="text-xs font-medium text-green-800 flex items-center gap-1 cursor-pointer">
                <input 
                  type="radio" 
                  name="difficulty" 
                  value="easy" 
                  checked={aiDifficulty === 'easy'} 
                  onChange={() => setAiDifficulty('easy')} 
                /> 簡單
              </label>
              <label className="text-xs font-medium text-green-800 flex items-center gap-1 cursor-pointer">
                <input 
                  type="radio" 
                  name="difficulty" 
                  value="medium" 
                  checked={aiDifficulty === 'medium'} 
                  onChange={() => setAiDifficulty('medium')} 
                /> 中等
              </label>
              <label className="text-xs font-medium text-green-800 flex items-center gap-1 cursor-pointer">
                <input 
                  type="radio" 
                  name="difficulty" 
                  value="hard" 
                  checked={aiDifficulty === 'hard'} 
                  onChange={() => setAiDifficulty('hard')} 
                /> 困難
              </label>
              <label className="text-xs font-bold text-red-600 flex items-center gap-1 cursor-pointer">
                <input 
                  type="radio" 
                  name="difficulty" 
                  value="hell" 
                  checked={aiDifficulty === 'hell'} 
                  onChange={() => setAiDifficulty('hell')} 
                /> 地獄
              </label>
            </div>
            <div className="mt-2 border-t border-green-200 pt-2">
              <div className="text-xs font-bold text-green-800 mb-1">或上傳自訂模型對戰：</div>
              <ModelUploader label="自訂 AI 模型" onModelLoaded={setCustomAI} />
              {customAI && <div className="text-xs text-green-700 mt-1">✅ 已載入自訂模型，將取代預設 AI</div>}
            </div>
          </div>

          <button 
            className="px-6 py-3 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition"
            onClick={() => setShowOnlineSetup(true)}
          >
            雙人連線 (Online Multiplayer)
          </button>

          <button 
            className="px-6 py-3 bg-amber-600 text-white rounded-lg shadow hover:bg-amber-700 transition"
            onClick={() => setShowTutorials(true)}
          >
            教學模式 (Tutorials)
          </button>

          <button 
            className="px-6 py-3 bg-teal-600 text-white rounded-lg shadow hover:bg-teal-700 transition"
            onClick={() => setMode('training')}
          >
            機器學習訓練 (ML Training)
          </button>

          <button 
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-700 transition"
            onClick={() => setMode('model_match')}
          >
            模型對戰 (Model vs Model)
          </button>
        </div>
      )}

      {mode === 'menu' && showOnlineSetup && (
        <div className="flex flex-col gap-4 w-72">
          <h2 className="text-2xl font-bold text-stone-800 mb-2 text-center">加入 / 建立房間</h2>
          <p className="text-sm text-stone-600 text-center mb-2">
            輸入一個房間 ID。第一個進入的人將成為房主 (紅方)，第二個人將成為對手 (黑方)。
          </p>
          <input
            type="text"
            placeholder="輸入房間 ID (例如: room123)"
            className="px-4 py-3 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && roomIdInput.trim()) {
                setActiveRoomId(roomIdInput.trim());
                setMode('online');
                setShowOnlineSetup(false);
              }
            }}
          />
          <button
            className="px-6 py-3 bg-purple-600 text-white rounded-lg shadow hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!roomIdInput.trim()}
            onClick={() => {
              if (roomIdInput.trim()) {
                setActiveRoomId(roomIdInput.trim());
                setMode('online');
                setShowOnlineSetup(false);
              }
            }}
          >
            進入房間
          </button>
          <button
            className="mt-2 px-4 py-2 bg-stone-300 text-stone-800 rounded hover:bg-stone-400 transition"
            onClick={() => setShowOnlineSetup(false)}
          >
            返回 (Back)
          </button>
        </div>
      )}

      {mode === 'menu' && showTutorials && (
        <div className="flex flex-col gap-4 w-72">
          <h2 className="text-2xl font-bold text-stone-800 mb-2 text-center">選擇教學關卡</h2>
          {TUTORIALS.map(t => (
            <button
              key={t.id}
              className="px-4 py-3 bg-amber-100 text-amber-900 rounded-lg shadow border border-amber-300 hover:bg-amber-200 transition text-left"
              onClick={() => {
                setSelectedTutorial(t);
                setMode('tutorial');
                setShowTutorials(false);
              }}
            >
              <div className="font-bold">{t.name}</div>
              <div className="text-xs mt-1 opacity-80">{t.description}</div>
            </button>
          ))}
          <button 
            className="mt-4 px-4 py-2 bg-stone-300 text-stone-800 rounded hover:bg-stone-400 transition"
            onClick={() => setShowTutorials(false)}
          >
            返回 (Back)
          </button>
        </div>
      )}

      {mode !== 'menu' && mode !== 'training' && mode !== 'model_match' && (
        <div className="flex flex-col items-center w-full h-full justify-center">
          <div 
            className="w-full flex justify-between items-center mb-2 px-2"
            style={{ maxWidth: 'min(100vw - 1rem, calc((100dvh - 8rem) * 0.9))' }}
          >
            <button 
              className="px-3 py-1.5 bg-stone-300 text-stone-800 text-sm rounded hover:bg-stone-400 transition"
              onClick={() => {
                setMode('menu');
                setSelectedTutorial(null);
                setActiveRoomId(undefined);
              }}
            >
              ← 返回 (Back)
            </button>
            <div className="text-sm font-bold text-stone-600">
              {mode === 'local' && '雙人本地'}
              {mode === 'ai' && `單人對戰 AI (${aiDifficulty})`}
              {mode === 'online' && '雙人連線'}
              {mode === 'tutorial' && '教學模式'}
            </div>
          </div>
          <XiangqiBoard 
            mode={mode as any} 
            initialBoard={mode === 'tutorial' && selectedTutorial ? selectedTutorial.initialBoard : INITIAL_BOARD} 
            aiDifficulty={aiDifficulty} 
            tutorial={selectedTutorial || undefined}
            targetRoomId={activeRoomId}
            customAI={customAI}
          />
        </div>
      )}

      {mode === 'training' && (
        <div className="w-full h-full overflow-y-auto">
          <div className="p-4">
            <button 
              className="px-4 py-2 bg-stone-300 text-stone-800 text-sm rounded hover:bg-stone-400 transition mb-4"
              onClick={() => setMode('menu')}
            >
              ← 返回主選單 (Back to Menu)
            </button>
            <TrainingArena />
          </div>
        </div>
      )}

      {mode === 'model_match' && (
        <div className="w-full h-full overflow-y-auto">
          <div className="p-4">
            <button 
              className="px-4 py-2 bg-stone-300 text-stone-800 text-sm rounded hover:bg-stone-400 transition mb-4"
              onClick={() => setMode('menu')}
            >
              ← 返回主選單 (Back to Menu)
            </button>
            <ModelMatch />
          </div>
        </div>
      )}
    </div>
  );
}
