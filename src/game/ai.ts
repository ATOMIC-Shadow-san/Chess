import { BoardState, Color, getLegalMoves, makeMove, isCheck, hasLegalMoves, Position } from './engine';

// Piece values for evaluation
const PIECE_VALUES = {
  k: 10000,
  r: 900,
  c: 450,
  h: 400,
  e: 200,
  a: 200,
  p: 100, // Pawn value increases after crossing river
};

// Evaluate the board from the perspective of the given color
export function evaluateBoard(board: BoardState, color: Color): number {
  let score = 0;
  
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (piece) {
        let value = PIECE_VALUES[piece.type];
        
        // Positional bonuses
        if (piece.type === 'p') {
          // Bonus for pawns crossing the river and advancing
          if (piece.color === 'red') {
            if (r <= 4) value += 100 + (4 - r) * 10;
            if (c >= 3 && c <= 5) value += 20; // Center pawn bonus
          } else {
            if (r >= 5) value += 100 + (r - 5) * 10;
            if (c >= 3 && c <= 5) value += 20;
          }
        } else if (piece.type === 'h') {
          // Horse center bonus (avoid edges)
          if (c >= 2 && c <= 6) value += 20;
          if (r >= 2 && r <= 7) value += 20;
        } else if (piece.type === 'c') {
          // Cannon central file bonus
          if (c === 4) value += 30;
        } else if (piece.type === 'r') {
          // Rook open file / advanced bonus
          if (piece.color === 'red' && r <= 4) value += 30;
          if (piece.color === 'black' && r >= 5) value += 30;
        }

        if (piece.color === color) {
          score += value;
        } else {
          score -= value;
        }
      }
    }
  }

  // Checkmate detection
  if (!hasLegalMoves(board, color)) {
    if (isCheck(board, color)) return -100000; // Checkmate
    return -50000; // Stalemate (loss in Xiangqi)
  }
  
  const opponent = color === 'red' ? 'black' : 'red';
  if (!hasLegalMoves(board, opponent)) {
    if (isCheck(board, opponent)) return 100000; // Checkmate
    return 50000; // Stalemate win
  }

  return score;
}

// Minimax with Alpha-Beta Pruning
export function minimax(
  board: BoardState, 
  depth: number, 
  alpha: number, 
  beta: number, 
  isMaximizing: boolean, 
  color: Color
): number {
  if (depth === 0) {
    return evaluateBoard(board, color);
  }

  const currentPlayer = isMaximizing ? color : (color === 'red' ? 'black' : 'red');
  
  // Generate all legal moves
  const moves: { from: Position, to: Position }[] = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (piece && piece.color === currentPlayer) {
        const legalMoves = getLegalMoves(board, r, c);
        for (const to of legalMoves) {
          moves.push({ from: { r, c }, to });
        }
      }
    }
  }

  if (moves.length === 0) {
    if (isCheck(board, currentPlayer)) return isMaximizing ? -100000 : 100000;
    return isMaximizing ? -50000 : 50000;
  }

  // Sort moves to improve alpha-beta pruning (captures first)
  moves.sort((a, b) => {
    const targetA = board[a.to.r][a.to.c];
    const targetB = board[b.to.r][b.to.c];
    const valA = targetA ? PIECE_VALUES[targetA.type] : 0;
    const valB = targetB ? PIECE_VALUES[targetB.type] : 0;
    return valB - valA;
  });

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newBoard = makeMove(board, move.from, move.to);
      const ev = minimax(newBoard, depth - 1, alpha, beta, false, color);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newBoard = makeMove(board, move.from, move.to);
      const ev = minimax(newBoard, depth - 1, alpha, beta, true, color);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// Find the best move for the AI
export function getBestMove(board: BoardState, color: Color, depth: number = 3): { from: Position, to: Position } | null {
  let bestMove: { from: Position, to: Position } | null = null;
  let maxEval = -Infinity;
  let alpha = -Infinity;
  let beta = Infinity;

  const moves: { from: Position, to: Position }[] = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        const legalMoves = getLegalMoves(board, r, c);
        for (const to of legalMoves) {
          moves.push({ from: { r, c }, to });
        }
      }
    }
  }

  if (moves.length === 0) return null;

  // Sort moves
  moves.sort((a, b) => {
    const targetA = board[a.to.r][a.to.c];
    const targetB = board[b.to.r][b.to.c];
    const valA = targetA ? PIECE_VALUES[targetA.type] : 0;
    const valB = targetB ? PIECE_VALUES[targetB.type] : 0;
    return valB - valA;
  });

  for (const move of moves) {
    const newBoard = makeMove(board, move.from, move.to);
    const ev = minimax(newBoard, depth - 1, alpha, beta, false, color);
    if (ev > maxEval) {
      maxEval = ev;
      bestMove = move;
    }
    alpha = Math.max(alpha, ev);
  }

  return bestMove;
}

// Dummy Bot (Level 0): Greedy capture, or random forward, or random move
export function getDummyMove(board: BoardState, color: Color): { from: Position, to: Position } | null {
  const moves: { from: Position, to: Position, isCapture: boolean, isForward: boolean }[] = [];
  
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (piece && piece.color === color) {
        const legalMoves = getLegalMoves(board, r, c);
        for (const to of legalMoves) {
          const targetPiece = board[to.r][to.c];
          const isCapture = targetPiece !== null;
          // Red moves up (smaller r), Black moves down (larger r)
          const isForward = color === 'red' ? to.r < r : to.r > r;
          moves.push({ from: { r, c }, to, isCapture, isForward });
        }
      }
    }
  }

  if (moves.length === 0) return null;

  // 1. Occasional Greedy Capture (only 20% chance to even try capturing greedily)
  const captures = moves.filter(m => m.isCapture);
  if (captures.length > 0 && Math.random() < 0.2) {
    // Sort captures by value of the target piece (greedy)
    captures.sort((a, b) => {
      const targetA = board[a.to.r][a.to.c]!;
      const targetB = board[b.to.r][b.to.c]!;
      return PIECE_VALUES[targetB.type] - PIECE_VALUES[targetA.type];
    });
    // Pick the best capture, or randomly among the best if there are ties
    // For simplicity, just pick the highest value capture
    return captures[0];
  }

  // 2. Random Forward Move (50% chance if available)
  const forwardMoves = moves.filter(m => m.isForward);
  if (forwardMoves.length > 0 && Math.random() > 0.5) {
    return forwardMoves[Math.floor(Math.random() * forwardMoves.length)];
  }

  // 3. Completely Random Move
  return moves[Math.floor(Math.random() * moves.length)];
}
