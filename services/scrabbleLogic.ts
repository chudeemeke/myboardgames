import { BoardSquare, TileData, MultiplierType } from '../types';
import { BOARD_SIZE, getMultiplierAt } from '../constants';

export const createInitialBoard = (): BoardSquare[][] => {
  const board: BoardSquare[][] = [];
  for (let r = 0; r < BOARD_SIZE; r++) {
    const row: BoardSquare[] = [];
    for (let c = 0; c < BOARD_SIZE; c++) {
      row.push({
        row: r,
        col: c,
        multiplier: getMultiplierAt(r, c),
        tile: null,
        isTemp: false,
      });
    }
    board.push(row);
  }
  return board;
};

const isValidPos = (r: number, c: number) => r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE;

export const getTempTiles = (board: BoardSquare[]) => {
  return board.filter(sq => sq.isTemp && sq.tile);
};

export const getAllTempTiles = (board: BoardSquare[][]) => {
  const temps: BoardSquare[] = [];
  board.forEach(row => row.forEach(sq => {
    if (sq.isTemp && sq.tile) temps.push(sq);
  }));
  return temps;
};

/**
 * Validates the structural integrity of the move locally.
 * Does not check dictionary.
 */
export const validateMoveStructure = (board: BoardSquare[][]): { valid: boolean; message?: string } => {
  const tempTiles = getAllTempTiles(board);
  if (tempTiles.length === 0) {
    return { valid: false, message: "No tiles placed." };
  }

  // 1. Check Linearity
  const rows = new Set(tempTiles.map(t => t.row));
  const cols = new Set(tempTiles.map(t => t.col));
  
  const isHorizontal = rows.size === 1;
  const isVertical = cols.size === 1;

  if (!isHorizontal && !isVertical) {
    return { valid: false, message: "Tiles must be placed in a straight line." };
  }

  // 2. Check Continuity (no gaps in the main line)
  // We sort the tiles and check if every square between min and max in that line is occupied
  if (isHorizontal) {
    const r = tempTiles[0].row;
    const sortedCols = tempTiles.map(t => t.col).sort((a, b) => a - b);
    const minC = sortedCols[0];
    const maxC = sortedCols[sortedCols.length - 1];
    for (let c = minC; c <= maxC; c++) {
      if (!board[r][c].tile) {
        return { valid: false, message: "There are gaps in your word." };
      }
    }
  } else {
    const c = tempTiles[0].col;
    const sortedRows = tempTiles.map(t => t.row).sort((a, b) => a - b);
    const minR = sortedRows[0];
    const maxR = sortedRows[sortedRows.length - 1];
    for (let r = minR; r <= maxR; r++) {
      if (!board[r][c].tile) {
        return { valid: false, message: "There are gaps in your word." };
      }
    }
  }

  // 3. Check Connectivity
  // Case A: First move? Must touch center (7,7)
  const isFirstMove = !board.some(row => row.some(sq => !sq.isTemp && sq.tile !== null));
  
  if (isFirstMove) {
    const touchesCenter = tempTiles.some(t => t.row === 7 && t.col === 7);
    if (!touchesCenter) {
      return { valid: false, message: "First word must cross the center star." };
    }
    if (tempTiles.length < 2) {
      return { valid: false, message: "First word must be at least 2 letters." };
    }
  } else {
    // Case B: Not first move. Must touch existing tiles.
    // A new tile touches an existing tile if:
    // 1. It is adjacent to an existing tile.
    // 2. OR it is placed in a line that fills a gap between existing tiles (handled by continuity check + adjacency check).
    
    let touchesExisting = false;
    
    // Check adjacency for all temp tiles
    for (const t of tempTiles) {
      const neighbors = [
        { r: t.row - 1, c: t.col },
        { r: t.row + 1, c: t.col },
        { r: t.row, c: t.col - 1 },
        { r: t.row, c: t.col + 1 },
      ];
      
      for (const n of neighbors) {
        if (isValidPos(n.r, n.c)) {
          const sq = board[n.r][n.c];
          if (sq.tile && !sq.isTemp) {
            touchesExisting = true;
            break;
          }
        }
      }
      if (touchesExisting) break;
    }
    
    // Special case: extending an existing word linearly
    // We need to check if the "Word" created actually incorporates existing tiles
    // The continuity check above ensures that if we bridge two existing parts, we fill gaps.
    // So simple adjacency check is usually sufficient for Scrabble rules, provided the line is continuous.
    if (!touchesExisting) {
      // One last check: did we place strictly linear to an existing tile without direct side adjacency?
      // E.g. Existing: WORD. We place S at end. S is adjacent to D. Handled above.
      return { valid: false, message: "Word must connect to existing tiles." };
    }
  }

  return { valid: true };
};


// Returns list of all new words formed
export const findNewWords = (board: BoardSquare[][]): string[] => {
  const tempTiles = getAllTempTiles(board);
  if (tempTiles.length === 0) return [];

  const words = new Set<string>();
  const scoredKeys = new Set<string>(); // "r,c,dir"

  // Helper to get word at position for a direction
  const scanWord = (r: number, c: number, dr: number, dc: number) => {
    // Backtrack
    let currR = r;
    let currC = c;
    while(isValidPos(currR - dr, currC - dc) && board[currR - dr][currC - dc].tile) {
      currR -= dr;
      currC -= dc;
    }
    
    const startR = currR;
    const startC = currC;
    const key = `${startR},${startC},${dr},${dc}`;
    
    if (scoredKeys.has(key)) return;

    let word = "";
    let hasTemp = false;
    let len = 0;

    while(isValidPos(currR, currC) && board[currR][currC].tile) {
      const sq = board[currR][currC];
      word += sq.tile!.letter;
      if (sq.isTemp) hasTemp = true;
      len++;
      currR += dr;
      currC += dc;
    }

    if (len > 1 && hasTemp) {
      words.add(word);
      scoredKeys.add(key);
    }
  };

  tempTiles.forEach(sq => {
    scanWord(sq.row, sq.col, 0, 1); // Horizontal
    scanWord(sq.row, sq.col, 1, 0); // Vertical
  });

  return Array.from(words);
};

export const calculateTurnScore = (board: BoardSquare[][]): { totalScore: number, wordsFormatted: string[] } => {
   const tempTiles = getAllTempTiles(board);
   if (tempTiles.length === 0) return { totalScore: 0, wordsFormatted: [] };

   let totalScore = 0;
   const scoredWords = new Set<string>(); 
   const wordsFormatted: string[] = [];

   const scoreWord = (r: number, c: number, dr: number, dc: number) => {
      let cr = r, cc = c;
      while(isValidPos(cr - dr, cc - dc) && board[cr - dr][cc - dc].tile) {
         cr -= dr;
         cc -= dc;
      }
      
      const key = `${cr},${cc},${dr},${dc}`;
      if (scoredWords.has(key)) return;

      let wordScore = 0;
      let wordMult = 1;
      let length = 0;
      let hasTemp = false;
      let wordStr = "";

      while(isValidPos(cr, cc) && board[cr][cc].tile) {
         const sq = board[cr][cc];
         let letterVal = sq.tile!.value;
         wordStr += sq.tile!.letter;
         
         if (sq.isTemp) {
            hasTemp = true;
            if (sq.multiplier === MultiplierType.DL) letterVal *= 2;
            if (sq.multiplier === MultiplierType.TL) letterVal *= 3;
            
            if (sq.multiplier === MultiplierType.DW || sq.multiplier === MultiplierType.Star) wordMult *= 2;
            if (sq.multiplier === MultiplierType.TW) wordMult *= 3;
         }

         wordScore += letterVal;
         length++;
         cr += dr;
         cc += dc;
      }

      if (length > 1 && hasTemp) {
         const final = wordScore * wordMult;
         totalScore += final;
         wordsFormatted.push(`${wordStr} (${final})`);
         scoredWords.add(key);
      }
   };

   tempTiles.forEach(t => {
      scoreWord(t.row, t.col, 0, 1);
      scoreWord(t.row, t.col, 1, 0);
   });
   
   if (tempTiles.length === 7) {
     totalScore += 50;
     wordsFormatted.push("BINGO! (+50)");
   }

   return { totalScore, wordsFormatted };
};