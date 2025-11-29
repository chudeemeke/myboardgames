import React from 'react';
import { Player } from '../types';

interface GameHUDProps {
  players: Player[];
  currentPlayerIndex: number;
  bagCount: number;
  onPass: () => void;
  onSwap: () => void;
  onRecall: () => void;
  onPlay: () => void;
  isValidating: boolean;
  gameMessage: string;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const GameHUD: React.FC<GameHUDProps> = ({ 
    players, 
    currentPlayerIndex, 
    bagCount,
    onPass,
    onSwap,
    onRecall,
    onPlay,
    isValidating,
    gameMessage
}) => {
  return (
    <div className="w-full max-w-6xl mx-auto flex justify-between items-start px-4 pointer-events-none">
        {/* Left Panel: Player 1 */}
        <div className={`pointer-events-auto p-4 rounded-xl backdrop-blur-md transition-all duration-500 ${currentPlayerIndex === 0 ? 'bg-white/10 border-l-4 border-green-400' : 'bg-black/20'}`}>
            <h2 className="text-xl font-bold text-white mb-1">{players[0].name}</h2>
            <div className="text-4xl font-bold text-yellow-400 mb-2">{players[0].score}</div>
            <div className={`text-sm font-mono ${currentPlayerIndex === 0 ? 'text-green-300 animate-pulse' : 'text-gray-400'}`}>
                ⏱ {formatTime(players[0].timeLeft)}
            </div>
        </div>

        {/* Center Control Cluster */}
        <div className="pointer-events-auto flex flex-col items-center gap-4 mt-4">
             {/* System Message */}
             <div className="min-h-[40px] flex items-center justify-center">
                {gameMessage && (
                    <div className="px-4 py-2 bg-black/60 text-white rounded-full text-sm font-medium backdrop-blur-sm animate-fade-in-up">
                        {gameMessage}
                    </div>
                )}
             </div>

            <div className="flex gap-2">
                <button onClick={onPass} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded shadow-lg font-bold transition-transform active:scale-95">PASS</button>
                <button onClick={onRecall} className="bg-amber-700 hover:bg-amber-600 text-white px-4 py-2 rounded shadow-lg font-bold transition-transform active:scale-95">RECALL</button>
                <button onClick={onSwap} className="bg-blue-700 hover:bg-blue-600 text-white px-4 py-2 rounded shadow-lg font-bold transition-transform active:scale-95">SWAP</button>
                <button 
                    onClick={onPlay} 
                    disabled={isValidating}
                    className={`
                        bg-green-600 hover:bg-green-500 text-white px-8 py-2 rounded shadow-lg font-bold transition-all active:scale-95
                        ${isValidating ? 'opacity-50 cursor-wait' : ''}
                    `}
                >
                    {isValidating ? 'CHECKING...' : 'PLAY'}
                </button>
            </div>
             <div className="text-white/50 text-xs mt-2 font-mono tracking-widest">TILES IN BAG: {bagCount}</div>
        </div>

        {/* Right Panel: Player 2 */}
        <div className={`pointer-events-auto p-4 rounded-xl backdrop-blur-md transition-all duration-500 text-right ${currentPlayerIndex === 1 ? 'bg-white/10 border-r-4 border-green-400' : 'bg-black/20'}`}>
            <h2 className="text-xl font-bold text-white mb-1">{players[1].name}</h2>
            <div className="text-4xl font-bold text-yellow-400 mb-2">{players[1].score}</div>
            <div className={`text-sm font-mono ${currentPlayerIndex === 1 ? 'text-green-300 animate-pulse' : 'text-gray-400'}`}>
                ⏱ {formatTime(players[1].timeLeft)}
            </div>
        </div>
    </div>
  );
};

export default GameHUD;
