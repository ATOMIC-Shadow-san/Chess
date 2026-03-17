import React, { useState, useEffect, useRef } from 'react';
import { BoardState, Color, INITIAL_BOARD, hasLegalMoves, isCheck, makeMove, PieceType } from '../game/engine';
import { XiangqiRL, hashBoard, evaluateBoardScore, ReplayBuffer, calculateSpatialReward } from '../game/rl';
import { getBestMove as getMinimaxMove, getDummyMove } from '../game/ai';
import ReadOnlyBoard from './ReadOnlyBoard';

type Difficulty = 'Dummy' | 'Easy' | 'Medium' | 'Hard' | 'Hell';
type SubLevel = 1 | 2 | 3 | 4 | 5 | 6;
type LegacyStage = 'Level 1' | 'Level 2' | 'Level 3' | 'Level 4' | 'Level 5' | 'Level 6' | 'Level 7';
type TrainingStage = LegacyStage | `${Difficulty} ${SubLevel}` | 'Chess King';

const LEGACY_STAGES: LegacyStage[] = ['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5', 'Level 6', 'Level 7'];
const DIFFICULTIES: Difficulty[] = ['Dummy', 'Easy', 'Medium', 'Hard', 'Hell'];
const STAGES: TrainingStage[] = [...LEGACY_STAGES];
for (const d of DIFFICULTIES) {
  for (let i = 1; i <= 6; i++) {
    STAGES.push(`${d} ${i}` as TrainingStage);
  }
}
STAGES.push('Chess King');

const STAGE_DEPTHS: Record<TrainingStage, number> = STAGES.reduce((acc, stage) => {
  if (stage === 'Chess King') {
    acc[stage] = 0;
  } else if (stage.startsWith('Level')) {
    acc[stage] = 1;
  } else {
    const [diff] = stage.split(' ') as [Difficulty, string];
    acc[stage] = diff === 'Dummy' ? 0 : (diff === 'Easy' ? 1 : (diff === 'Medium' ? 2 : (diff === 'Hard' ? 3 : 4)));
  }
  return acc;
}, {} as Record<TrainingStage, number>);

const NEXT_STAGE: Record<TrainingStage, TrainingStage | null> = STAGES.reduce((acc, stage, i) => {
  acc[stage] = STAGES[i + 1] || null;
  return acc;
}, {} as Record<TrainingStage, TrainingStage | null>);

const PREV_STAGE: Record<TrainingStage, TrainingStage | null> = STAGES.reduce((acc, stage, i) => {
  acc[stage] = STAGES[i - 1] || null;
  return acc;
}, {} as Record<TrainingStage, TrainingStage | null>);

const getStageMaxSteps = (stage: TrainingStage): number => {
  if (stage === 'Level 1') return 60;
  if (stage === 'Level 2') return 40;
  if (stage === 'Level 3') return 60;
  if (stage === 'Level 4') return 70;
  if (stage === 'Level 5') return 80;
  if (stage === 'Level 6') return 80;
  if (stage === 'Level 7') return 100;
  if (stage === 'Chess King') return 200;
  const subLevel = parseInt(stage.split(' ')[1]);
  return 100 + subLevel * 15;
};

const generateBoardForStage = (stage: TrainingStage): BoardState => {
  const board = Array(10).fill(null).map(() => Array(9).fill(null)) as BoardState;
  
  const placePiece = (color: Color, type: PieceType, minR: number, maxR: number, minC: number, maxC: number, condition?: (r: number, c: number) => boolean) => {
    let r, c;
    let attempts = 0;
    do {
      r = Math.floor(Math.random() * (maxR - minR + 1)) + minR;
      c = Math.floor(Math.random() * (maxC - minC + 1)) + minC;
      attempts++;
    } while ((board[r][c] !== null || (condition && !condition(r, c))) && attempts < 100);
    board[r][c] = { type, color };
    return { r, c };
  };

  if (stage.startsWith('Level')) {
    const bk = placePiece('black', 'k', 0, 2, 3, 5);
    const rk = placePiece('red', 'k', 7, 9, 3, 5);

    if (stage === 'Level 1') {
      placePiece('red', 'r', 0, 6, 0, 8, (r, c) => Math.abs(r - bk.r) + Math.abs(c - bk.c) > 3);
    } else if (stage === 'Level 2') {
      placePiece('red', 'r', 0, 4, 0, 8);
      placePiece('red', 'r', 5, 9, 0, 8, (r, c) => board[r][c] === null);
    } else if (stage === 'Level 3') {
      placePiece('red', 'r', 0, 9, 0, 8, (r, c) => board[r][c] === null);
      placePiece('red', 'p', 0, 4, 0, 8, (r, c) => board[r][c] === null && Math.abs(r - bk.r) + Math.abs(c - bk.c) > 2);
    } else if (stage === 'Level 4') {
      placePiece('red', 'r', 0, 9, 0, 8, (r, c) => board[r][c] === null);
      placePiece('red', 'p', 0, 4, 0, 8, (r, c) => board[r][c] === null && Math.abs(r - bk.r) + Math.abs(c - bk.c) > 2);
      const advPos = [[0,3], [0,5], [1,4], [2,3], [2,5]];
      const validAdv = advPos.filter(([r, c]) => board[r][c] === null);
      if (validAdv.length > 0) {
        const [ar, ac] = validAdv[Math.floor(Math.random() * validAdv.length)];
        board[ar][ac] = { type: 'a', color: 'black' };
      }
    } else if (stage === 'Level 5') {
      placePiece('red', 'r', 0, 9, 0, 8, (r, c) => board[r][c] === null);
      placePiece('red', 'h', 0, 6, 0, 8, (r, c) => board[r][c] === null);
    } else if (stage === 'Level 6') {
      placePiece('red', 'r', 0, 9, 0, 8, (r, c) => board[r][c] === null);
      placePiece('red', 'c', 0, 9, 0, 8, (r, c) => board[r][c] === null);
    } else if (stage === 'Level 7') {
      placePiece('red', 'r', 0, 9, 0, 8, (r, c) => board[r][c] === null);
      placePiece('red', 'p', 0, 4, 0, 8, (r, c) => board[r][c] === null);
      placePiece('red', 'p', 0, 6, 0, 8, (r, c) => board[r][c] === null);
      
      const advPos = [[0,3], [0,5], [1,4], [2,3], [2,5]];
      const validAdv = advPos.filter(([r, c]) => board[r][c] === null);
      if (validAdv.length > 0) {
        const [ar, ac] = validAdv[Math.floor(Math.random() * validAdv.length)];
        board[ar][ac] = { type: 'a', color: 'black' };
      }
      const elePos = [[0,2], [0,6], [2,0], [2,4], [2,8], [4,2], [4,6]];
      const validEle = elePos.filter(([r, c]) => board[r][c] === null);
      if (validEle.length > 0) {
        const [er, ec] = validEle[Math.floor(Math.random() * validEle.length)];
        board[er][ec] = { type: 'e', color: 'black' };
      }
      placePiece('black', 'p', 3, 6, 0, 8, (r, c) => board[r][c] === null);
    }
    return board;
  }

  // Red (Agent) always has full pieces
  const redPieces: {type: PieceType, r: number, c: number}[] = [
    {type: 'r', r: 9, c: 0}, {type: 'h', r: 9, c: 1}, {type: 'e', r: 9, c: 2}, {type: 'a', r: 9, c: 3}, {type: 'k', r: 9, c: 4}, {type: 'a', r: 9, c: 5}, {type: 'e', r: 9, c: 6}, {type: 'h', r: 9, c: 7}, {type: 'r', r: 9, c: 8},
    {type: 'c', r: 7, c: 1}, {type: 'c', r: 7, c: 7},
    {type: 'p', r: 6, c: 0}, {type: 'p', r: 6, c: 2}, {type: 'p', r: 6, c: 4}, {type: 'p', r: 6, c: 6}, {type: 'p', r: 6, c: 8}
  ];
  redPieces.forEach(p => board[p.r][p.c] = { type: p.type, color: 'red' });

  // Black (Opponent) pieces depend on sub-level
  if (stage === 'Chess King') {
    const blackPieces: {type: PieceType, r: number, c: number}[] = [
      {type: 'r', r: 0, c: 0}, {type: 'h', r: 0, c: 1}, {type: 'e', r: 0, c: 2}, {type: 'a', r: 0, c: 3}, {type: 'k', r: 0, c: 4}, {type: 'a', r: 0, c: 5}, {type: 'e', r: 0, c: 6}, {type: 'h', r: 0, c: 7}, {type: 'r', r: 0, c: 8},
      {type: 'c', r: 2, c: 1}, {type: 'c', r: 2, c: 7},
      {type: 'p', r: 3, c: 0}, {type: 'p', r: 3, c: 2}, {type: 'p', r: 3, c: 4}, {type: 'p', r: 3, c: 6}, {type: 'p', r: 3, c: 8}
    ];
    blackPieces.forEach(p => board[p.r][p.c] = { type: p.type, color: 'black' });
    return board;
  }

  const subLevel = parseInt(stage.split(' ')[1]) as SubLevel;
  
  // Base pieces (King + 2 Advisors)
  board[0][4] = { type: 'k', color: 'black' };
  board[0][3] = { type: 'a', color: 'black' };
  board[0][5] = { type: 'a', color: 'black' };

  if (subLevel >= 2) {
    board[0][2] = { type: 'e', color: 'black' };
    board[0][6] = { type: 'e', color: 'black' };
  }
  if (subLevel >= 3) {
    board[3][0] = {type: 'p', color: 'black'};
    board[3][2] = {type: 'p', color: 'black'};
    board[3][4] = {type: 'p', color: 'black'};
    board[3][6] = {type: 'p', color: 'black'};
    board[3][8] = {type: 'p', color: 'black'};
  }
  if (subLevel >= 4) {
    board[0][1] = { type: 'h', color: 'black' };
    board[0][7] = { type: 'h', color: 'black' };
  }
  if (subLevel >= 5) {
    board[2][1] = { type: 'c', color: 'black' };
    board[2][7] = { type: 'c', color: 'black' };
  }
  if (subLevel >= 6) {
    board[0][0] = { type: 'r', color: 'black' };
    board[0][8] = { type: 'r', color: 'black' };
  }

  return board;
};

export default function TrainingArena() {
  const [isTraining, setIsTraining] = useState(false);
  const [episode, setEpisode] = useState(0);
  const [epsilon, setEpsilon] = useState(1.0);
  const [board, setBoard] = useState<BoardState>(INITIAL_BOARD);
  const [lastMove, setLastMove] = useState<{ from: {r: number, c: number}, to: {r: number, c: number} } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [stage, setStage] = useState<TrainingStage>('Level 1');
  const [recentResults, setRecentResults] = useState<('win' | 'loss' | 'draw')[]>([]);
  const [fastMode, setFastMode] = useState(true);
  
  const agentRef = useRef<XiangqiRL | null>(null);
  const replayBufferRef = useRef<ReplayBuffer>(new ReplayBuffer(10000));
  const isTrainingRef = useRef(false);
  const resultsRef = useRef<('win' | 'loss' | 'draw')[]>([]);
  const stageRef = useRef<TrainingStage>('Level 1');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const consecutiveMaxStepsRef = useRef(0);
  const consecutiveRepetitionsRef = useRef(0);
  const level7HalfWinCountRef = useRef(0);

  useEffect(() => {
    agentRef.current = new XiangqiRL();
    addLog('RL Agent initialized. Ready to train.');
  }, []);

  const addLog = (msg: string) => {
    setLogs(prev => [msg, ...prev].slice(0, 50));
  };

  const startTraining = async () => {
    if (!agentRef.current || isTrainingRef.current) return;
    
    setIsTraining(true);
    isTrainingRef.current = true;
    addLog(`Training started... Current Stage: ${stageRef.current}`);

    let currentEpisode = episode;
    let currentEpsilon = epsilon;

    while (isTrainingRef.current) {
      currentEpisode++;
      
      let currentBoard = generateBoardForStage(stageRef.current);
      let turn: Color = 'red';
      const history: string[] = [];
      
      let gameOver = false;
      let winner: Color | 'draw' | null = null;
      let stepCount = 0;
      let drawReason: 'max_steps' | 'repetition' | null = null;
      const MAX_STEPS = getStageMaxSteps(stageRef.current);

      const agentColor = 'red';
      const opponentColor = 'black';

      while (!gameOver && isTrainingRef.current) {
        if (!fastMode && stepCount % 5 === 0) {
          setBoard(currentBoard);
          await new Promise(r => setTimeout(r, 0)); 
        } else if (fastMode && stepCount % 50 === 0) {
          await new Promise(r => setTimeout(r, 0));
        }

        // --- Agent's Turn ---
        const bestMove = await agentRef.current.getBestMove(currentBoard, agentColor, currentEpsilon);
        if (!bestMove) {
          gameOver = true;
          winner = opponentColor;
          break;
        }

        const stateAfterAgent = makeMove(currentBoard, bestMove.from, bestMove.to);
        let stepReward = -0.01; // Step penalty

        // Material reward
        const scoreBefore = evaluateBoardScore(currentBoard);
        const scoreAfter = evaluateBoardScore(stateAfterAgent);
        if (scoreAfter > scoreBefore) {
          stepReward += (scoreAfter - scoreBefore) * 0.05;
        }

        // Spatial reward (very important for Level 0/1)
        stepReward += calculateSpatialReward(currentBoard, stateAfterAgent, agentColor, stageRef.current);

        // Check if agent won
        if (!hasLegalMoves(stateAfterAgent, opponentColor)) {
          gameOver = true;
          winner = agentColor;
          stepReward += 3.0 + ((MAX_STEPS - stepCount) / 100) * 3; // 速勝獎勵
          replayBufferRef.current.add({ state: currentBoard, reward: stepReward, nextState: stateAfterAgent, done: true });
          addLog(`Episode ${currentEpisode}: Agent wins by checkmate at step ${stepCount}`);
          currentBoard = stateAfterAgent;
          break;
        }

        // --- Opponent's Turn ---
        let opponentMove;
        if (stageRef.current.startsWith('Dummy')) {
          if (!fastMode) await new Promise(r => setTimeout(r, 10));
          opponentMove = getDummyMove(stateAfterAgent, opponentColor);
        } else if (stageRef.current === 'Chess King') {
          opponentMove = await agentRef.current.getBestMove(stateAfterAgent, opponentColor, currentEpsilon);
        } else {
          const depth = STAGE_DEPTHS[stageRef.current];
          if (!fastMode) await new Promise(r => setTimeout(r, 10));
          opponentMove = getMinimaxMove(stateAfterAgent, opponentColor, depth);
        }

        if (!opponentMove) {
          gameOver = true;
          winner = agentColor;
          stepReward += 3.0 + ((MAX_STEPS - stepCount) / 100) * 3;
          replayBufferRef.current.add({ state: currentBoard, reward: stepReward, nextState: stateAfterAgent, done: true });
          addLog(`Episode ${currentEpisode}: Agent wins (Opponent no moves) at step ${stepCount}`);
          currentBoard = stateAfterAgent;
          break;
        }

        const stateAfterOpponent = makeMove(stateAfterAgent, opponentMove.from, opponentMove.to);

        // Check if opponent won
        if (!hasLegalMoves(stateAfterOpponent, agentColor)) {
          gameOver = true;
          winner = opponentColor;
          stepReward -= 1.0;
          replayBufferRef.current.add({ state: currentBoard, reward: stepReward, nextState: stateAfterOpponent, done: true });
          addLog(`Episode ${currentEpisode}: Opponent wins by checkmate at step ${stepCount}`);
          currentBoard = stateAfterOpponent;
          break;
        }

        // Update UI for the move
        if (!fastMode && (stepCount % 5 === 0 || gameOver)) {
           setLastMove(opponentMove);
        }

        const hash = hashBoard(stateAfterOpponent);
        history.push(hash);

        // Check repetition
        const repetitions = history.filter(h => h === hash).length;
        if (repetitions >= 3) {
          gameOver = true;
          winner = 'draw';
          drawReason = 'repetition';
          stepReward -= 0.5; // Repetition penalty
          stepReward -= 0.8; // Base draw penalty
          replayBufferRef.current.add({ state: currentBoard, reward: stepReward, nextState: stateAfterOpponent, done: true });
          addLog(`Episode ${currentEpisode}: Draw by repetition at step ${stepCount}`);
          currentBoard = stateAfterOpponent;
          break;
        }

        // Check max steps
        if (stepCount >= MAX_STEPS) {
          gameOver = true;
          winner = 'draw';
          drawReason = 'max_steps';
          stepReward -= 0.8; // Base draw penalty
          replayBufferRef.current.add({ state: currentBoard, reward: stepReward, nextState: stateAfterOpponent, done: true });
          addLog(`Episode ${currentEpisode}: Draw by max steps (${MAX_STEPS})`);
          currentBoard = stateAfterOpponent;
          break;
        }

        // Not game over, add transition
        replayBufferRef.current.add({ state: currentBoard, reward: stepReward, nextState: stateAfterOpponent, done: false });
        currentBoard = stateAfterOpponent;
        stepCount++;
      }

      if (!isTrainingRef.current) break;

      let result: 'win' | 'loss' | 'draw' = 'draw';
      if (winner === agentColor) result = 'win';
      else if (winner === opponentColor) result = 'loss';

      // Epsilon Restart Logic
      if (result === 'draw') {
        if (drawReason === 'max_steps') consecutiveMaxStepsRef.current++;
        if (drawReason === 'repetition') consecutiveRepetitionsRef.current++;
      } else {
        consecutiveMaxStepsRef.current = 0;
        consecutiveRepetitionsRef.current = 0;
      }

      currentEpsilon = Math.max(0.01, currentEpsilon * 0.995); // Normal decay
      
      if (result === 'draw') {
        if (currentEpsilon + 0.01 <= 0.1) {
          currentEpsilon += 0.01;
        }
      }
      
      const isEndgame = stageRef.current.includes('1') || stageRef.current.includes('2');
      const repRestart = isEndgame ? 0.30 : 0.05;
      const maxStepRestart = isEndgame ? 0.50 : 0.05;

      if (consecutiveRepetitionsRef.current >= 3) {
        currentEpsilon = Math.max(currentEpsilon, repRestart);
        consecutiveRepetitionsRef.current = 0;
        
        // Add penalty for repetitions to discourage looping
        for (let i = 0; i < 5; i++) {
          replayBufferRef.current.add({ 
            state: currentBoard, 
            reward: -0.5, 
            nextState: currentBoard, 
            done: true 
          });
        }
        
        addLog(`🔄 Minor Epsilon Restart (${repRestart.toFixed(2)}) due to repetitions! 給予 -0.5 懲罰`);
      } else if (consecutiveMaxStepsRef.current >= 5) {
        currentEpsilon = Math.max(currentEpsilon, maxStepRestart);
        consecutiveMaxStepsRef.current = 0;
        addLog(`🔄 Major Epsilon Restart (${maxStepRestart.toFixed(2)}) due to max steps!`);
      }

      // Train on mini-batches from Replay Buffer
      for (let i = 0; i < 4; i++) {
        await agentRef.current.trainMiniBatch(replayBufferRef.current, 64, 0.95);
      }

      // Sync Target Network every 10 episodes
      if (currentEpisode % 10 === 0) {
        agentRef.current.syncTargetNetwork();
      }

      // Update recent results
      const newResults = [...resultsRef.current, result].slice(-100);
      resultsRef.current = newResults;
      setRecentResults(newResults);

      // Check for stage advancement or desperation restart
      if (newResults.length === 100) {
        const wins = newResults.filter(r => r === 'win').length;
        const losses = newResults.filter(r => r === 'loss').length;
        const draws = newResults.filter(r => r === 'draw').length;
        const nonWins = losses + draws;
        
        let shouldAdvance = false;
        let shouldResetResults = false;

        if (stageRef.current === 'Level 7') {
          if (wins >= 55 && losses < 20) {
            level7HalfWinCountRef.current += 1;
            shouldResetResults = true;
            if (level7HalfWinCountRef.current >= 2) {
              shouldAdvance = true;
            } else {
              addLog(`⭐ Level 7 達成 55% 勝率且敗場低於 20%！(累計 ${level7HalfWinCountRef.current}/2 次)`);
            }
          }
        } else {
          if (wins >= 65 && losses < 20) {
            shouldAdvance = true;
          }
        }
        
        if (shouldAdvance) {
          const nextStage = NEXT_STAGE[stageRef.current];
          if (nextStage) {
            const previousStage = stageRef.current;
            stageRef.current = nextStage;
            setStage(nextStage);
            shouldResetResults = true;
            if (previousStage === 'Level 7') {
              level7HalfWinCountRef.current = 0;
              addLog(`🎉 恭喜！模型在 ${previousStage} 難度累計兩次 55% 勝率且敗場低於 20%，晉級至 ${nextStage}！`);
            } else {
              addLog(`🎉 恭喜！模型在 ${previousStage} 難度達成 100 戰 ${wins} 勝且敗場低於 20%，晉級至 ${nextStage}！`);
            }
          }
        } else if (nonWins > 70 && !isEndgame) {
          // Desperation restart for full games if stuck
          currentEpsilon = Math.max(currentEpsilon, 0.2);
          shouldResetResults = true;
          
          // Add extra penalty to replay buffer to discourage current policy
          for (let i = 0; i < 10; i++) {
            replayBufferRef.current.add({ 
              state: currentBoard, 
              reward: -1.0, 
              nextState: currentBoard, 
              done: true 
            });
          }
          
          const prevStage = PREV_STAGE[stageRef.current];
          if (prevStage && !prevStage.startsWith('Level')) {
            stageRef.current = prevStage;
            setStage(prevStage);
            addLog(`⚠️ 敗場(含合棋)高於 70% 觸發破釜沉舟！探索率拉高至 0.2，給予 -1.0 懲罰並降級至 ${prevStage}！`);
          } else {
            addLog(`⚠️ 敗場(含合棋)高於 70% 觸發破釜沉舟重置！探索率拉高至 0.2，並給予 -1.0 懲罰`);
          }
        }

        if (shouldResetResults) {
          resultsRef.current = [];
          setRecentResults([]);
        }
      }

      setEpisode(currentEpisode);
      setEpsilon(currentEpsilon);
      setBoard(currentBoard);
      // Keep the last move of the episode visible
      if (!fastMode) {
        // The last move is already set if not fastMode, but just in case
      } else {
        setLastMove(null); // Clear highlight in fast mode
      }
      
      if (currentEpisode % 10 === 0) {
        addLog(`Completed episode ${currentEpisode}. Epsilon: ${currentEpsilon.toFixed(3)}`);
      }
    }
  };

  const stopTraining = () => {
    setIsTraining(false);
    isTrainingRef.current = false;
    addLog('Training stopped.');
  };

  const downloadModel = async () => {
    if (agentRef.current) {
      addLog('Downloading model...');
      await agentRef.current.saveModel();
      addLog('Model downloaded successfully.');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length !== 2) {
      alert('請同時選擇 .json 和 .bin 兩個模型檔案 (按住 Ctrl 或 Shift 複選)');
      return;
    }

    const jsonFile = (Array.from(files) as File[]).find(f => f.name.endsWith('.json'));
    const binFile = (Array.from(files) as File[]).find(f => f.name.endsWith('.bin'));

    if (!jsonFile || !binFile) {
      alert('必須包含一個 .json 檔案和一個 .bin 檔案');
      return;
    }

    if (agentRef.current) {
      try {
        addLog('Loading model...');
        await agentRef.current.loadModel(jsonFile, binFile);
        addLog('Model loaded successfully. You can now continue training.');
      } catch (err) {
        addLog(`Error loading model: ${err}`);
        alert('載入模型失敗，請檢查檔案格式。');
      }
    }
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getWinRate = () => {
    if (recentResults.length === 0) return 0;
    const wins = recentResults.filter(r => r === 'win').length;
    return Math.round((wins / recentResults.length) * 100);
  };

  return (
    <div className="flex flex-col md:flex-row gap-4 w-full max-w-6xl mx-auto p-4">
      <div className="flex-1">
        <h2 className="text-2xl font-bold mb-4">強化學習訓練場 (Curriculum RL)</h2>
        
        <div className="bg-white p-4 rounded-lg shadow-md mb-4 flex flex-col gap-4">
          
          {/* Stage Display */}
          <div className="flex flex-col items-center justify-center py-2">
            <div className="text-sm text-gray-500 font-bold uppercase tracking-wider mb-1">當前訓練階段</div>
            <div className="text-3xl font-black text-blue-600 flex items-center gap-2">
              {stage.startsWith('Level') && <span className="text-blue-500">{stage}</span>}
              {stage.includes('Dummy') && <span className="text-gray-400">沙包</span>}
              {stage.includes('Easy') && <span className="text-green-500">簡單</span>}
              {stage.includes('Medium') && <span className="text-yellow-500">中等</span>}
              {stage.includes('Hard') && <span className="text-orange-500">困難</span>}
              {stage.includes('Hell') && <span className="text-red-600">地獄</span>}
              {stage === 'Chess King' && <span className="text-purple-600">👑 棋王</span>}
              {!stage.startsWith('Level') && stage !== 'Chess King' && <span>{stage.split(' ')[1]}</span>}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center mt-2">
            <div className="bg-blue-50 p-2 rounded">
              <div className="text-xs text-gray-500">訓練回合</div>
              <div className="text-xl font-bold text-blue-700">{episode}</div>
            </div>
            <div className="bg-green-50 p-2 rounded">
              <div className="text-xs text-gray-500">探索率</div>
              <div className="text-xl font-bold text-green-700">{epsilon.toFixed(3)}</div>
            </div>
            <div className="bg-purple-50 p-2 rounded">
              <div className="text-xs text-gray-500">近期勝率 ({recentResults.length || 0}場)</div>
              <div className="text-xl font-bold text-purple-700">{getWinRate()}%</div>
            </div>
          </div>

          <div className="flex gap-2 justify-center mt-2">
            {!isTraining ? (
              <button 
                onClick={startTraining}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-bold transition-colors"
              >
                開始訓練
              </button>
            ) : (
              <button 
                onClick={stopTraining}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded font-bold transition-colors"
              >
                停止訓練
              </button>
            )}
            <button 
              onClick={downloadModel}
              className="bg-gray-800 hover:bg-gray-900 text-white px-6 py-2 rounded font-bold transition-colors"
            >
              下載模型
            </button>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded font-bold transition-colors"
            >
              載入模型
            </button>
            <input 
              type="file" 
              multiple 
              accept=".json,.bin" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileUpload} 
            />
          </div>
          
          <div className="flex justify-center mt-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={fastMode}
                onChange={(e) => setFastMode(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700 font-bold">極速訓練模式 (關閉動畫與特效)</span>
            </label>
          </div>
          
          <div className="text-sm text-gray-600 mt-2">
            <p>💡 <strong>課程學習 (Curriculum Learning) 說明：</strong></p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>經驗回放 (Replay Buffer) 與目標網路 (Target Net)</strong>：打破時間相關性，解決災難性遺忘，讓 AI 穩步成長。</li>
              <li><strong>殘局特訓 (Reverse Curriculum)</strong>：從「單車殺單將」開始，逐步增加敵方防禦與我方子力，最後才進入完整開局。</li>
              <li><strong>空間引導獎勵 (Spatial Reward)</strong>：利用曼哈頓距離，引導 AI 將攻擊子力靠近敵方主帥，解決「不知如何進攻」的問題。</li>
              <li><strong>步數懲罰與動態 ε 重啟</strong>：每走一步扣 0.01 分，並將 ε 重啟上限調降至 0.15，徹底打破「高隨機率 → 亂走 → 拖和」的死亡螺旋。</li>
            </ul>
          </div>
        </div>

        <div className="bg-gray-900 text-green-400 p-4 rounded-lg shadow-md h-64 overflow-y-auto font-mono text-sm">
          <div className="font-bold text-white mb-2">訓練日誌 (Training Logs)</div>
          {logs.map((log, i) => (
            <div key={i} className="border-b border-gray-800 py-1">{log}</div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex justify-center items-start">
        <div className="w-full max-w-md">
          <ReadOnlyBoard board={board} lastMove={lastMove} />
        </div>
      </div>
    </div>
  );
}
