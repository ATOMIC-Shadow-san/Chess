export type Color = 'red' | 'black';
export type PieceType = 'k' | 'a' | 'e' | 'h' | 'r' | 'c' | 'p'; // king, advisor, elephant, horse, rook, cannon, pawn

export interface Piece {
  type: PieceType;
  color: Color;
}

export type BoardState = (Piece | null)[][]; // 10 rows, 9 cols

export interface Position {
  r: number;
  c: number;
}

export interface Move {
  from: Position;
  to: Position;
  captured?: Piece | null;
}

export const INITIAL_BOARD: BoardState = [
  // Row 0 (Black)
  [{ type: 'r', color: 'black' }, { type: 'h', color: 'black' }, { type: 'e', color: 'black' }, { type: 'a', color: 'black' }, { type: 'k', color: 'black' }, { type: 'a', color: 'black' }, { type: 'e', color: 'black' }, { type: 'h', color: 'black' }, { type: 'r', color: 'black' }],
  Array(9).fill(null),
  [null, { type: 'c', color: 'black' }, null, null, null, null, null, { type: 'c', color: 'black' }, null],
  [{ type: 'p', color: 'black' }, null, { type: 'p', color: 'black' }, null, { type: 'p', color: 'black' }, null, { type: 'p', color: 'black' }, null, { type: 'p', color: 'black' }],
  Array(9).fill(null),
  
  // Row 5 (Red)
  Array(9).fill(null),
  [{ type: 'p', color: 'red' }, null, { type: 'p', color: 'red' }, null, { type: 'p', color: 'red' }, null, { type: 'p', color: 'red' }, null, { type: 'p', color: 'red' }],
  [null, { type: 'c', color: 'red' }, null, null, null, null, null, { type: 'c', color: 'red' }, null],
  Array(9).fill(null),
  // Row 9 (Red)
  [{ type: 'r', color: 'red' }, { type: 'h', color: 'red' }, { type: 'e', color: 'red' }, { type: 'a', color: 'red' }, { type: 'k', color: 'red' }, { type: 'a', color: 'red' }, { type: 'e', color: 'red' }, { type: 'h', color: 'red' }, { type: 'r', color: 'red' }],
];

// Helper to clone board
export function cloneBoard(board: BoardState): BoardState {
  return board.map(row => row.map(cell => cell ? { ...cell } : null));
}

// Check if position is inside the board
export function isInsideBoard(r: number, c: number): boolean {
  return r >= 0 && r <= 9 && c >= 0 && c <= 8;
}

// Check if position is inside the palace
export function isInsidePalace(r: number, c: number, color: Color): boolean {
  if (c < 3 || c > 5) return false;
  if (color === 'red') return r >= 7 && r <= 9;
  return r >= 0 && r <= 2;
}

// Check if position is on the player's side
export function isOwnSide(r: number, color: Color): boolean {
  if (color === 'red') return r >= 5 && r <= 9;
  return r >= 0 && r <= 4;
}

// Get all pseudo-legal moves for a piece (ignoring check)
export function getPseudoLegalMoves(board: BoardState, r: number, c: number): Position[] {
  const piece = board[r][c];
  if (!piece) return [];
  
  const moves: Position[] = [];
  const { type, color } = piece;
  
  const addIfValid = (nr: number, nc: number) => {
    if (isInsideBoard(nr, nc)) {
      const target = board[nr][nc];
      if (!target || target.color !== color) {
        moves.push({ r: nr, c: nc });
      }
    }
  };

  if (type === 'k') {
    // General: 1 step orthogonal, inside palace
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (isInsidePalace(nr, nc, color)) addIfValid(nr, nc);
    }
  } else if (type === 'a') {
    // Advisor: 1 step diagonal, inside palace
    const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (isInsidePalace(nr, nc, color)) addIfValid(nr, nc);
    }
  } else if (type === 'e') {
    // Elephant: 2 steps diagonal, own side, no blocking
    const dirs = [[-2, -2], [-2, 2], [2, -2], [2, 2]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (isInsideBoard(nr, nc) && isOwnSide(nr, color)) {
        // Check elephant eye (blocking)
        if (!board[r + dr / 2][c + dc / 2]) {
          addIfValid(nr, nc);
        }
      }
    }
  } else if (type === 'h') {
    // Horse: 1 ortho, 1 diag, no blocking
    const moves_h = [
      { dr: -2, dc: -1, br: -1, bc: 0 }, { dr: -2, dc: 1, br: -1, bc: 0 },
      { dr: 2, dc: -1, br: 1, bc: 0 }, { dr: 2, dc: 1, br: 1, bc: 0 },
      { dr: -1, dc: -2, br: 0, bc: -1 }, { dr: 1, dc: -2, br: 0, bc: -1 },
      { dr: -1, dc: 2, br: 0, bc: 1 }, { dr: 1, dc: 2, br: 0, bc: 1 }
    ];
    for (const m of moves_h) {
      const nr = r + m.dr, nc = c + m.dc;
      if (isInsideBoard(nr, nc) && !board[r + m.br][c + m.bc]) {
        addIfValid(nr, nc);
      }
    }
  } else if (type === 'r') {
    // Chariot: Orthogonal any distance
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      while (isInsideBoard(nr, nc)) {
        const target = board[nr][nc];
        if (!target) {
          moves.push({ r: nr, c: nc });
        } else {
          if (target.color !== color) moves.push({ r: nr, c: nc });
          break;
        }
        nr += dr; nc += dc;
      }
    }
  } else if (type === 'c') {
    // Cannon: Orthogonal any distance, jump to capture
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      let jumped = false;
      while (isInsideBoard(nr, nc)) {
        const target = board[nr][nc];
        if (!jumped) {
          if (!target) {
            moves.push({ r: nr, c: nc });
          } else {
            jumped = true;
          }
        } else {
          if (target) {
            if (target.color !== color) moves.push({ r: nr, c: nc });
            break;
          }
        }
        nr += dr; nc += dc;
      }
    }
  } else if (type === 'p') {
    // Pawn: 1 step forward, left/right if crossed river
    const dir = color === 'red' ? -1 : 1;
    addIfValid(r + dir, c);
    if (!isOwnSide(r, color)) {
      addIfValid(r, c - 1);
      addIfValid(r, c + 1);
    }
  }

  return moves;
}

// Check if the "Flying General" rule is violated (kings facing each other directly)
export function isFlyingGeneralViolated(board: BoardState): boolean {
  let redKingPos: Position | null = null;
  let blackKingPos: Position | null = null;

  for (let r = 0; r < 10; r++) {
    for (let c = 3; c <= 5; c++) {
      const p = board[r][c];
      if (p?.type === 'k') {
        if (p.color === 'red') redKingPos = { r, c };
        else blackKingPos = { r, c };
      }
    }
  }

  if (redKingPos && blackKingPos && redKingPos.c === blackKingPos.c) {
    let piecesBetween = 0;
    for (let r = blackKingPos.r + 1; r < redKingPos.r; r++) {
      if (board[r][redKingPos.c]) piecesBetween++;
    }
    if (piecesBetween === 0) return true;
  }
  return false;
}

// Check if a color's king is under attack
export function isCheck(board: BoardState, color: Color): boolean {
  // Find king
  let kingPos: Position | null = null;
  for (let r = 0; r < 10; r++) {
    for (let c = 3; c <= 5; c++) {
      const p = board[r][c];
      if (p?.type === 'k' && p.color === color) {
        kingPos = { r, c };
        break;
      }
    }
    if (kingPos) break;
  }
  if (!kingPos) return false; // Should not happen in valid game

  // Check if any enemy piece can attack the king
  const enemyColor = color === 'red' ? 'black' : 'red';
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p && p.color === enemyColor) {
        const pseudoMoves = getPseudoLegalMoves(board, r, c);
        if (pseudoMoves.some(m => m.r === kingPos!.r && m.c === kingPos!.c)) {
          return true;
        }
      }
    }
  }
  return false;
}

// Get all fully legal moves for a piece (including check and flying general rules)
export function getLegalMoves(board: BoardState, r: number, c: number): Position[] {
  const piece = board[r][c];
  if (!piece) return [];
  
  const pseudoMoves = getPseudoLegalMoves(board, r, c);
  const legalMoves: Position[] = [];

  for (const move of pseudoMoves) {
    const newBoard = cloneBoard(board);
    newBoard[move.r][move.c] = piece;
    newBoard[r][c] = null;

    if (!isCheck(newBoard, piece.color) && !isFlyingGeneralViolated(newBoard)) {
      legalMoves.push(move);
    }
  }

  return legalMoves;
}

// Check if a player has any legal moves (Checkmate or Stalemate)
export function hasLegalMoves(board: BoardState, color: Color): boolean {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p && p.color === color) {
        if (getLegalMoves(board, r, c).length > 0) return true;
      }
    }
  }
  return false;
}

// Apply a move and return the new board state
export function makeMove(board: BoardState, from: Position, to: Position): BoardState {
  const newBoard = cloneBoard(board);
  newBoard[to.r][to.c] = newBoard[from.r][from.c];
  newBoard[from.r][from.c] = null;
  return newBoard;
}
