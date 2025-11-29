import React, { useState, useEffect, useRef } from 'react';
import Board from './components/Board';
import Rack from './components/Rack';
import { 
  createInitialBoard, 
  findNewWords, 
  getAllTempTiles, 
  calculateTurnScore, 
  validateMoveStructure 
} from './services/scrabbleLogic';
import { generateBag, INITIAL_TIME, RACK_SIZE } from './constants';
import { BoardSquare, Player, TileData, GamePhase } from './types';
import { validateWordsWithGemini } from './services/gemini';
import { LayoutGroup, motion, AnimatePresence } from 'framer-motion';

const App: React.FC = () => {
  // -- Game State --
  const [board, setBoard] = useState<BoardSquare[][]>(createInitialBoard());
  const [bag, setBag] = useState<TileData[]>([]);
  const [players, setPlayers] = useState<Player[]>([
    { id: 0, name: 'Player 1', score: 0, rack: [], timeLeft: INITIAL_TIME, isActive: true },
    { id: 1, name: 'Player 2', score: 0, rack: [], timeLeft: INITIAL_TIME, isActive: false }
  ]);
  const [currPlayerIdx, setCurrPlayerIdx] = useState(0);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [swapMode, setSwapMode] = useState(false);
  const [tilesToSwap, setTilesToSwap] = useState<Set<string>>(new Set());

  const [gamePhase, setGamePhase] = useState<GamePhase>(GamePhase.Setup);
  const [gameMessage, setGameMessage] = useState<string>("Tap Start to Begin");
  const [isValidating, setIsValidating] = useState(false);
  const [consecutivePasses, setConsecutivePasses] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -- Initialization --
  useEffect(() => {
    startNewGame();
    return () => stopTimer();
  }, []);

  // -- Timer Logic --
  useEffect(() => {
    if (gamePhase === GamePhase.Playing) {
      stopTimer();
      timerRef.current = setInterval(() => {
        setPlayers(prev => {
          const newPlayers = [...prev];
          const p = newPlayers[currPlayerIdx];
          if (p.timeLeft > 0) {
            p.timeLeft -= 1;
          } else {
            stopTimer();
            setGameMessage(`${p.name} ran out of time!`);
            handlePass();
          }
          return newPlayers;
        });
      }, 1000);
    } else {
      stopTimer();
    }
    return () => stopTimer();
  }, [gamePhase, currPlayerIdx]);

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // -- Game Actions --

  const startNewGame = () => {
    const newBag = generateBag();
    const p1Rack: TileData[] = [];
    const p2Rack: TileData[] = [];
    
    for (let i = 0; i < RACK_SIZE; i++) {
       if (newBag.length) p1Rack.push(newBag.pop()!);
       if (newBag.length) p2Rack.push(newBag.pop()!);
    }

    setBag(newBag);
    setPlayers([
      { id: 0, name: 'Player 1', score: 0, rack: p1Rack, timeLeft: INITIAL_TIME, isActive: true },
      { id: 1, name: 'Player 2', score: 0, rack: p2Rack, timeLeft: INITIAL_TIME, isActive: false }
    ]);
    setBoard(createInitialBoard());
    setCurrPlayerIdx(0);
    setGamePhase(GamePhase.Playing);
    setGameMessage("Player 1's Turn");
    setConsecutivePasses(0);
    setSwapMode(false);
    setTilesToSwap(new Set());
  };

  const handleSelectTile = (tileId: string) => {
    if (gamePhase !== GamePhase.Playing) return;
    const player = players[currPlayerIdx];
    const ownsTile = player.rack.find(t => t.id === tileId);
    if (!ownsTile) return;

    if (swapMode) {
        setTilesToSwap(prev => {
            const next = new Set(prev);
            if (next.has(tileId)) next.delete(tileId);
            else next.add(tileId);
            return next;
        });
        // Also toggle selected for visual feedback
        if (selectedTileId === tileId) setSelectedTileId(null);
        else setSelectedTileId(tileId);
    } else {
        if (selectedTileId === tileId) {
          setSelectedTileId(null);
        } else {
          setSelectedTileId(tileId);
        }
    }
  };

  const handleSquareClick = (r: number, c: number) => {
    if (gamePhase !== GamePhase.Playing || swapMode) return;
    const sq = board[r][c];

    // 1. Placing a tile
    if (selectedTileId && !sq.tile) {
      const player = players[currPlayerIdx];
      const tileToPlace = player.rack.find(t => t.id === selectedTileId);
      
      if (tileToPlace) {
        if (tileToPlace.isBlank && tileToPlace.value === 0) { // Only prompt if not already set
            const letter = prompt("Enter letter for blank tile:")?.toUpperCase();
            if (letter && /^[A-Z]$/.test(letter)) {
                tileToPlace.letter = letter;
            } else {
                return; // Cancel placement
            }
        }

        const newBoard = [...board];
        newBoard[r][c] = { ...sq, tile: tileToPlace, isTemp: true };
        setBoard(newBoard);

        const newPlayers = [...players];
        newPlayers[currPlayerIdx].rack = player.rack.filter(t => t.id !== selectedTileId);
        setPlayers(newPlayers);

        setSelectedTileId(null);
      }
    } 
    // 2. Retrieving a temp tile
    else if (sq.tile && sq.isTemp) {
      const tileToReturn = sq.tile;
      
      const newBoard = [...board];
      newBoard[r][c] = { ...sq, tile: null, isTemp: false };
      setBoard(newBoard);

      const newPlayers = [...players];
      // Reset blank tile
      if (tileToReturn.isBlank) { 
          tileToReturn.letter = ' '; 
          tileToReturn.value = 0;
      }
      newPlayers[currPlayerIdx].rack.push(tileToReturn);
      setPlayers(newPlayers);
    }
  };

  const handleRecall = () => {
    if (gamePhase !== GamePhase.Playing) return;
    const tempTiles = getAllTempTiles(board);
    if (tempTiles.length === 0) return;

    const newBoard = board.map(row => row.map(sq => sq.isTemp ? { ...sq, tile: null, isTemp: false } : sq));
    setBoard(newBoard);

    const returnedTiles = tempTiles.map(sq => {
        const t = sq.tile!;
        if (t.isBlank) { t.letter = ' '; t.value = 0; }
        return t;
    });

    setPlayers(prev => {
      const newP = [...prev];
      newP[currPlayerIdx].rack = [...newP[currPlayerIdx].rack, ...returnedTiles];
      return newP;
    });
    setSelectedTileId(null);
  };

  const handlePlay = async () => {
    if (gamePhase !== GamePhase.Playing || isValidating) return;
    
    const structureCheck = validateMoveStructure(board);
    if (!structureCheck.valid) {
      setGameMessage(`❌ ${structureCheck.message}`);
      setTimeout(() => setGameMessage("Player " + (currPlayerIdx + 1)), 2000);
      return;
    }

    setIsValidating(true);
    setGameMessage("Checking Dictionary...");

    const newWords = findNewWords(board);
    const validation = await validateWordsWithGemini(newWords);
    
    if (!validation.valid) {
      setIsValidating(false);
      setGameMessage(`❌ Invalid: ${validation.invalidWords.join(', ')}`);
      return;
    }

    const { totalScore } = calculateTurnScore(board);
    
    // Lock tiles
    const newBoard = board.map(row => row.map(sq => sq.isTemp ? { ...sq, isTemp: false } : sq));
    setBoard(newBoard);

    setPlayers(prev => {
      const newP = [...prev];
      newP[currPlayerIdx].score += totalScore;
      return newP;
    });

    refillRack(currPlayerIdx);
    setGameMessage(`✅ Played for ${totalScore} pts`);
    setIsValidating(false);
    setConsecutivePasses(0);
    switchTurn();
  };

  const handleSwapClick = () => {
    if (swapMode) {
        // Confirm Swap
        if (tilesToSwap.size === 0) {
            setSwapMode(false); // Cancel
            return;
        }
        
        if (bag.length < tilesToSwap.size) {
            setGameMessage("Not enough tiles in bag");
            setSwapMode(false);
            return;
        }

        // Return tiles to bag
        const p = players[currPlayerIdx];
        const tilesKeeping = p.rack.filter(t => !tilesToSwap.has(t.id));
        const tilesReturning = p.rack.filter(t => tilesToSwap.has(t.id));

        // Update bag (add returned, shuffle implicitly by push)
        const newBag = [...bag, ...tilesReturning];
        // Shuffle simple
        for (let i = newBag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newBag[i], newBag[j]] = [newBag[j], newBag[i]];
        }
        
        // Draw new
        const drawn: TileData[] = [];
        for(let i=0; i<tilesReturning.length; i++) {
            drawn.push(newBag.pop()!);
        }
        
        setBag(newBag);
        setPlayers(prev => {
            const newP = [...prev];
            newP[currPlayerIdx].rack = [...tilesKeeping, ...drawn];
            return newP;
        });

        setGameMessage("Swapped Tiles");
        setSwapMode(false);
        setTilesToSwap(new Set());
        handlePass(); // Swapping costs a turn
    } else {
        // Enter Swap Mode
        handleRecall(); // Clear board first
        setSwapMode(true);
        setGameMessage("Select tiles to swap");
    }
  };

  const refillRack = (pIdx: number) => {
    const tilesNeeded = RACK_SIZE - players[pIdx].rack.length;
    if (tilesNeeded > 0 && bag.length > 0) {
      const newBag = [...bag];
      const drawnTiles: TileData[] = [];
      for(let i=0; i<tilesNeeded; i++) {
        if (newBag.length) drawnTiles.push(newBag.pop()!);
      }
      setBag(newBag);
      setPlayers(prev => {
        const newP = [...prev];
        newP[pIdx].rack = [...newP[pIdx].rack, ...drawnTiles];
        return newP;
      });
    }
  };

  const handlePass = () => {
    handleRecall(); 
    setConsecutivePasses(prev => {
        const next = prev + 1;
        if (next >= 4) { // 2 passes each ends game usually, but let's say 4 total
            setGamePhase(GamePhase.GameOver);
            setGameMessage("Game Over (Passes)");
        } else {
            // setGameMessage("Turn Passed");
        }
        return next;
    });
    switchTurn();
  };

  const switchTurn = () => {
    const nextIdx = currPlayerIdx === 0 ? 1 : 0;
    setCurrPlayerIdx(nextIdx);
    setSelectedTileId(null);
    setSwapMode(false);
    setTilesToSwap(new Set());
    setGameMessage(`Player ${nextIdx + 1}'s Turn`);
  };

  // -- Render Components --
  
  const PlayerControls = ({ playerIdx, inverted }: { playerIdx: number, inverted?: boolean }) => {
    const p = players[playerIdx];
    const isTurn = currPlayerIdx === playerIdx;

    return (
      <div 
        className={`flex flex-col items-center gap-1 ${inverted ? 'mb-1' : 'mt-1'} w-full transition-opacity duration-300 ${isTurn ? 'opacity-100' : 'opacity-80'}`}
      >
        {/* Score Info */}
        <div className={`flex items-center gap-6 text-white ${inverted ? 'flex-row-reverse rotate-180' : ''}`}>
             <div className="flex flex-col items-center">
                <span className="text-[10px] md:text-xs font-bold opacity-60 uppercase tracking-widest">{p.name}</span>
                <span className="text-2xl md:text-3xl font-bold text-yellow-400 drop-shadow-md">{p.score}</span>
             </div>
             <div className={`px-2 py-0.5 rounded bg-black/40 font-mono text-xs md:text-sm border transition-colors duration-300 ${isTurn ? 'text-green-400 border-green-500/50' : 'text-gray-500 border-white/5'}`}>
                {formatTime(p.timeLeft)}
             </div>
        </div>

        {/* The Rack */}
        <Rack 
           tiles={p.rack}
           isActive={isTurn}
           onSelectTile={handleSelectTile}
           selectedTileId={selectedTileId}
           inverted={inverted}
           isSwapMode={isTurn && swapMode}
        />

        {/* Action Buttons - Always rendered to preserve layout, visually disabled if not turn */}
        <div className={`
            flex gap-2 h-[36px] items-center justify-center
            transition-all duration-300
            ${inverted ? 'rotate-180' : ''}
            ${!isTurn ? 'opacity-0 pointer-events-none grayscale' : 'opacity-100 pointer-events-auto'}
        `}>
             {!swapMode ? (
                <>
                    <button onClick={handlePass} className="px-3 py-1.5 bg-gray-700 text-white rounded text-[10px] font-bold shadow hover:bg-gray-600 border-b-2 border-gray-900 active:scale-95 transition-transform">PASS</button>
                    <button onClick={handleSwapClick} className="px-3 py-1.5 bg-blue-700 text-white rounded text-[10px] font-bold shadow hover:bg-blue-600 border-b-2 border-blue-900 active:scale-95 transition-transform">SWAP</button>
                    <button onClick={handleRecall} className="px-3 py-1.5 bg-amber-800 text-white rounded text-[10px] font-bold shadow hover:bg-amber-700 border-b-2 border-amber-950 active:scale-95 transition-transform">CLEAR</button>
                    <button 
                        onClick={handlePlay} 
                        disabled={isValidating}
                        className="px-6 py-1.5 bg-green-600 text-white rounded text-[10px] font-bold shadow hover:bg-green-500 min-w-[80px] border-b-2 border-green-800 active:scale-95 transition-transform disabled:opacity-50"
                    >
                        {isValidating ? '...' : 'PLAY'}
                    </button>
                </>
             ) : (
                <>
                     <span className="text-white text-[10px] font-bold mr-2">Select tiles...</span>
                     <button onClick={() => setSwapMode(false)} className="px-3 py-1.5 bg-gray-600 text-white rounded text-[10px] font-bold shadow hover:bg-gray-500 border-b-2 border-gray-800">CANCEL</button>
                     <button onClick={handleSwapClick} className="px-4 py-1.5 bg-blue-600 text-white rounded text-[10px] font-bold shadow hover:bg-blue-500 border-b-2 border-blue-800">CONFIRM SWAP ({tilesToSwap.size})</button>
                </>
             )}
        </div>
      </div>
    );
  };

  return (
    <LayoutGroup>
      <div className="fixed inset-0 w-full h-full flex flex-col bg-gradient-to-br from-[#121212] via-[#1a1a1a] to-[#0a0a0a] overflow-hidden touch-none select-none">
        
        {/* TOP: Player 2 Area (Inverted) */}
        <div className="flex-none pt-2 z-20">
          <PlayerControls playerIdx={1} inverted />
        </div>

        {/* CENTER: Board */}
        <div className="flex-grow flex items-center justify-center relative z-10 w-full perspective-board">
           {/* Game Status Message Toast */}
           <AnimatePresence mode="wait">
             <motion.div 
               key={gameMessage}
               initial={{ opacity: 0, scale: 0.9, y: 10 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.9, y: -10 }}
               className="absolute top-4 md:top-8 z-50 pointer-events-none"
             >
                 <div className="bg-black/70 backdrop-blur-md text-white px-6 py-2 rounded-full text-sm font-bold shadow-[0_4px_20px_rgba(0,0,0,0.5)] border border-white/10 tracking-wide">
                     {gameMessage}
                 </div>
             </motion.div>
           </AnimatePresence>

           <Board 
              board={board} 
              onSquareClick={handleSquareClick} 
              isInteractive={gamePhase === GamePhase.Playing}
           />
        </div>

        {/* BOTTOM: Player 1 Area */}
        <div className="flex-none pb-4 z-20">
           <PlayerControls playerIdx={0} />
        </div>

        {/* Game Over Modal */}
        {gamePhase === GamePhase.GameOver && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="absolute inset-0 bg-black/95 z-[100] flex items-center justify-center flex-col text-white backdrop-blur-sm"
            >
                <motion.h1 
                  initial={{ y: -50 }} 
                  animate={{ y: 0 }} 
                  className="text-5xl md:text-7xl font-bold mb-8 text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-lg"
                >
                  GAME OVER
                </motion.h1>
                
                <div className="flex gap-12 md:gap-24 mb-12 text-center items-end">
                    <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
                        <div className="text-gray-400 text-xs font-bold tracking-widest mb-2">PLAYER 1</div>
                        <div className="text-6xl md:text-8xl font-bold text-white">{players[0].score}</div>
                    </motion.div>
                    <div className="h-24 w-px bg-white/20"></div>
                    <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
                        <div className="text-gray-400 text-xs font-bold tracking-widest mb-2">PLAYER 2</div>
                        <div className="text-6xl md:text-8xl font-bold text-white">{players[1].score}</div>
                    </motion.div>
                </div>

                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startNewGame}
                    className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-full text-lg font-bold shadow-[0_0_30px_rgba(0,255,0,0.3)] transition-colors"
                >
                    New Game
                </motion.button>
            </motion.div>
        )}
      </div>
    </LayoutGroup>
  );
};

export default App;