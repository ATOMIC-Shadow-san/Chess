import * as tf from '@tensorflow/tfjs';
import { BoardState, Color, getLegalMoves, makeMove, Position, isCheck, hasLegalMoves, Piece } from './engine';

// --- 位置附加價值模型 (Piece-Square Tables, PST) ---
// 以紅方視角出發 (底線為 r=9)
const PST_R = [
  [  0,  0,  0,  0,  0,  0,  0,  0,  0], // r=0 (敵方底線)
  [  0,  0,  0,  0,  0,  0,  0,  0,  0],
  [  0,  0,  0,  0,  0,  0,  0,  0,  0],
  [  0,  0,  0,  0,  0,  0,  0,  0,  0],
  [  0,  0,  0, 50, 50, 50,  0,  0,  0], // r=4 (騎河線)
  [  0,  0,  0, 50, 50, 50,  0,  0,  0], // r=5 (巡河線)
  [  0,  0,  0,  0,  0,  0,  0,  0,  0],
  [  0,  0,  0, 50,  0, 50,  0,  0,  0], // r=7 (肋道)
  [  0,  0,  0, 50,  0, 50,  0,  0,  0], // r=8 (肋道)
  [-50,  0,  0, 50,  0, 50,  0,  0,-50], // r=9 (己方底線)
];

const PST_H = [
  [-50,-50,-50,-50,-50,-50,-50,-50,-50], // r=0
  [-50,  0, 40, 40, 40, 40, 40,  0,-50],
  [-50, 40, 60, 80, 80, 80, 60, 40,-50],
  [-50, 40, 60, 80, 80, 80, 60, 40,-50],
  [-50, 40, 60, 80, 80, 80, 60, 40,-50],
  [-50,  0, 40, 60, 60, 60, 40,  0,-50],
  [-50,  0, 20, 40, 40, 40, 20,  0,-50],
  [-50,  0, 20, 20, 20, 20, 20,  0,-50],
  [-50,  0,  0,  0,  0,  0,  0,  0,-50],
  [-100,-50,-50,-50,-50,-50,-50,-50,-100], // r=9
];

const PST_C = [
  [ 30, 30, 30, 60, 60, 60, 30, 30, 30], // r=0 (沉底炮)
  [  0,  0,  0, 30, 30, 30,  0,  0,  0],
  [  0,  0,  0, 30, 30, 30,  0,  0,  0],
  [  0,  0,  0, 30, 30, 30,  0,  0,  0],
  [  0,  0,  0, 30, 30, 30,  0,  0,  0],
  [  0,  0,  0, 30, 30, 30,  0,  0,  0],
  [  0,  0,  0, 30, 30, 30,  0,  0,  0],
  [  0,  0,  0, 30, 30, 30,  0,  0,  0],
  [-20,  0,  0, 30, 30, 30,  0,  0,-20],
  [-20,  0,  0, 30, 30, 30,  0,  0,-20], // r=9
];

const PST_P = [
  [-50,-50,-50,-50,-50,-50,-50,-50,-50], // r=0 (老兵/底兵)
  [ 50, 50,100,150,150,150,100, 50, 50], // r=1 (士角線)
  [ 50, 50,100,150,150,150,100, 50, 50], // r=2
  [ 50, 50,100,150,150,150,100, 50, 50], // r=3 (敵方兵線)
  [  0,  0,  0, 50, 50, 50,  0,  0,  0], // r=4 (騎河)
  [  0,  0,  0,  0,  0,  0,  0,  0,  0], // r=5
  [-50,  0,  0,  0,  0,  0,  0,  0,-50], // r=6 (己方兵線)
  [  0,  0,  0,  0,  0,  0,  0,  0,  0],
  [  0,  0,  0,  0,  0,  0,  0,  0,  0],
  [  0,  0,  0,  0,  0,  0,  0,  0,  0],
];

export function getPieceScore(piece: Piece, r: number, c: number): number {
  let score = 0;
  // 黑方視角反轉 row
  const pstR = piece.color === 'red' ? r : 9 - r;
  
  switch (piece.type) {
    case 'k':
      score = 10000;
      break;
    case 'r':
      score = 900 + PST_R[pstR][c];
      break;
    case 'c':
      score = 450 + PST_C[pstR][c];
      break;
    case 'h':
      score = 400 + PST_H[pstR][c];
      break;
    case 'e':
      score = 200;
      break;
    case 'a':
      score = 200;
      break;
    case 'p':
      const isCrossed = piece.color === 'red' ? r <= 4 : r >= 5;
      score = (isCrossed ? 200 : 100) + PST_P[pstR][c];
      break;
  }
  
  // 縮放分數以利於神經網路輸入 (除以 1000)
  return score / 1000.0;
}

export function evaluateBoardScore(board: BoardState): number {
  let score = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p) {
        const val = getPieceScore(p, r, c);
        score += p.color === 'red' ? val : -val;
      }
    }
  }
  return score;
}

export function encodeBoard(board: BoardState): number[] {
  const encoded: number[] = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (!p) {
        encoded.push(0);
      } else {
        const val = getPieceScore(p, r, c);
        encoded.push(p.color === 'red' ? val : -val);
      }
    }
  }
  return encoded;
}

export function hashBoard(board: BoardState): string {
  return encodeBoard(board).join(',');
}

export interface Transition {
  state: BoardState;
  reward: number;
  nextState: BoardState;
  done: boolean;
}

export class ReplayBuffer {
  private buffer: Transition[] = [];
  private capacity: number;
  private pointer = 0;

  constructor(capacity = 10000) {
    this.capacity = capacity;
  }

  add(transition: Transition) {
    if (this.buffer.length < this.capacity) {
      this.buffer.push(transition);
    } else {
      this.buffer[this.pointer] = transition;
    }
    this.pointer = (this.pointer + 1) % this.capacity;
  }

  sample(batchSize: number): Transition[] {
    const batch: Transition[] = [];
    for (let i = 0; i < batchSize; i++) {
      const index = Math.floor(Math.random() * this.buffer.length);
      batch.push(this.buffer[index]);
    }
    return batch;
  }

  size() { return this.buffer.length; }
}

export function findPiece(board: BoardState, color: Color, type: string): Position | null {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p && p.color === color && p.type === type) return { r, c };
    }
  }
  return null;
}

export function getAttackerDistanceSum(board: BoardState, color: Color, target: Position): number {
  let sum = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p && p.color === color && ['r', 'h', 'c', 'p'].includes(p.type)) {
        sum += Math.abs(r - target.r) + Math.abs(c - target.c);
      }
    }
  }
  return sum;
}

export function calculateSpatialReward(boardBefore: BoardState, boardAfter: BoardState, aiColor: Color, stage: string): number {
  const enemyColor = aiColor === 'red' ? 'black' : 'red';
  const enemyGeneralPos = findPiece(boardAfter, enemyColor, 'k');
  if (!enemyGeneralPos) return 0;

  let reward = 0;

  const distBefore = getAttackerDistanceSum(boardBefore, aiColor, enemyGeneralPos);
  const distAfter = getAttackerDistanceSum(boardAfter, aiColor, enemyGeneralPos);

  const beta = 0.02;
  reward += (distBefore - distAfter) * beta;

  if (stage === 'Level 1' || stage === 'Level 2') {
    const enemyGeneralPosBefore = findPiece(boardBefore, enemyColor, 'k');
    if (enemyGeneralPosBefore) {
      const edgeDistBefore = Math.min(enemyGeneralPosBefore.r, enemyGeneralPosBefore.c, 8 - enemyGeneralPosBefore.c);
      const edgeDistAfter = Math.min(enemyGeneralPos.r, enemyGeneralPos.c, 8 - enemyGeneralPos.c);
      if (edgeDistAfter < edgeDistBefore) reward += 0.05;
    }
  }

  if (stage === 'Level 3' || stage === 'Level 4' || stage === 'Level 7') {
    let pawnRSumBefore = 0;
    let pawnRSumAfter = 0;
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        if (boardBefore[r][c]?.type === 'p' && boardBefore[r][c]?.color === aiColor) pawnRSumBefore += r;
        if (boardAfter[r][c]?.type === 'p' && boardAfter[r][c]?.color === aiColor) pawnRSumAfter += r;
      }
    }
    if (pawnRSumAfter < pawnRSumBefore) reward += 0.03;
  }

  if (stage === 'Level 6') {
    const cannonPos = findPiece(boardAfter, aiColor, 'c');
    if (cannonPos && (cannonPos.r === enemyGeneralPos.r || cannonPos.c === enemyGeneralPos.c)) {
      reward += 0.02;
    }
  }

  return reward;
}

export class XiangqiRL {
  model: tf.LayersModel;
  targetModel: tf.LayersModel;
  gamma: number = 0.95; // Discount factor
  learningRate: number = 0.001;

  constructor() {
    this.model = this.createModel();
    this.targetModel = this.createModel();
    this.syncTargetNetwork();
  }

  syncTargetNetwork() {
    this.targetModel.setWeights(this.model.getWeights());
  }

  createModel(): tf.LayersModel {
    const model = tf.sequential();
    // Input layer: 90 squares
    model.add(tf.layers.dense({ units: 128, inputShape: [90], activation: 'relu' }));
    model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
    // Output layer: 1 value representing the evaluation of the board for Red (-1 to 1)
    model.add(tf.layers.dense({ units: 1, activation: 'tanh' }));

    model.compile({
      optimizer: tf.train.adam(this.learningRate),
      loss: 'meanSquaredError'
    });

    return model;
  }

  // Evaluate a board state
  async evaluate(board: BoardState): Promise<number> {
    return tf.tidy(() => {
      const input = tf.tensor2d([encodeBoard(board)]);
      const prediction = this.model.predict(input) as tf.Tensor;
      return prediction.dataSync()[0];
    });
  }

  // Batch evaluate multiple board states
  async evaluateBatch(boards: BoardState[]): Promise<number[]> {
    if (boards.length === 0) return [];
    return tf.tidy(() => {
      const inputs = tf.tensor2d(boards.map(encodeBoard));
      const predictions = this.model.predict(inputs) as tf.Tensor;
      return Array.from(predictions.dataSync());
    });
  }

  // Get the best move using epsilon-greedy strategy
  async getBestMove(board: BoardState, color: Color, epsilon: number): Promise<{ from: Position, to: Position } | null> {
    const legalMoves: { from: Position, to: Position }[] = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c]?.color === color) {
          const moves = getLegalMoves(board, r, c);
          for (const to of moves) {
            legalMoves.push({ from: { r, c }, to });
          }
        }
      }
    }

    if (legalMoves.length === 0) return null;

    // Exploration
    if (Math.random() < epsilon) {
      return legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }

    // Exploitation
    const nextStates = legalMoves.map(m => makeMove(board, m.from, m.to));
    const values = await this.evaluateBatch(nextStates);

    let bestMove = legalMoves[0];
    let bestValue = values[0];

    for (let i = 1; i < legalMoves.length; i++) {
      // Red wants to maximize, Black wants to minimize
      if (color === 'red') {
        if (values[i] > bestValue) {
          bestValue = values[i];
          bestMove = legalMoves[i];
        }
      } else {
        if (values[i] < bestValue) {
          bestValue = values[i];
          bestMove = legalMoves[i];
        }
      }
    }

    return bestMove;
  }

  // Train the model on a mini-batch from Replay Buffer using Target Network
  async trainMiniBatch(buffer: ReplayBuffer, batchSize = 64, gamma = 0.95) {
    if (buffer.size() < batchSize) return;
    const batch = buffer.sample(batchSize);

    const { states, ys } = tf.tidy(() => {
      const statesTensor = tf.tensor2d(batch.map(b => encodeBoard(b.state)));
      const nextStatesTensor = tf.tensor2d(batch.map(b => encodeBoard(b.nextState)));

      const nextValues = this.targetModel.predict(nextStatesTensor) as tf.Tensor;
      const nextValuesData = nextValues.dataSync();

      const targets = batch.map((b, i) => {
        if (b.done) return b.reward;
        return b.reward + gamma * nextValuesData[i];
      });

      const ysTensor = tf.tensor2d(targets, [batchSize, 1]);
      return { states: statesTensor, ys: ysTensor };
    });

    await this.model.fit(states, ys, {
      epochs: 1,
      verbose: 0
    });

    states.dispose();
    ys.dispose();
  }

  async saveModel() {
    await this.model.save('downloads://xiangqi-rl-model');
  }

  async loadModel(jsonFile: File, weightsFile: File) {
    // 讀取 JSON 內容並動態修改 weightsManifest，以解決瀏覽器自動重新命名檔案 (例如加上 (1)) 導致的載入失敗問題
    const jsonText = await jsonFile.text();
    const modelTopology = JSON.parse(jsonText);
    
    if (modelTopology.weightsManifest && modelTopology.weightsManifest.length > 0) {
      modelTopology.weightsManifest[0].paths = [weightsFile.name];
    }
    
    const patchedJsonFile = new File([JSON.stringify(modelTopology)], jsonFile.name, { type: jsonFile.type });
    
    this.model = await tf.loadLayersModel(tf.io.browserFiles([patchedJsonFile, weightsFile]));
    this.model.compile({
      optimizer: tf.train.adam(this.learningRate),
      loss: 'meanSquaredError'
    });
  }
}
