import React from 'react';
import { BoardSquare, MultiplierType } from '../types';
import Tile3D from './Tile3D';
import { motion } from 'framer-motion';

interface BoardProps {
  board: BoardSquare[][];
  onSquareClick: (row: number, col: number) => void;
  isInteractive: boolean;
}

const getSquareStyle = (m: MultiplierType) => {
  switch (m) {
    case MultiplierType.TW: return 'bg-[#ff4d4d]/30 shadow-[inset_0_0_15px_rgba(255,0,0,0.3)]';
    case MultiplierType.DW: return 'bg-[#ffb6c1]/30 shadow-[inset_0_0_15px_rgba(255,182,193,0.3)]';
    case MultiplierType.TL: return 'bg-[#1e90ff]/30 shadow-[inset_0_0_15px_rgba(30,144,255,0.3)]';
    case MultiplierType.DL: return 'bg-[#87ceeb]/30 shadow-[inset_0_0_15px_rgba(135,206,235,0.3)]';
    case MultiplierType.Star: return 'bg-[#ff69b4]/40';
    default: return 'bg-[#2a1d12]/60';
  }
};

const getSquareLabel = (m: MultiplierType) => {
  switch (m) {
    case MultiplierType.TW: return 'TRIPLE\nWORD';
    case MultiplierType.DW: return 'DOUBLE\nWORD';
    case MultiplierType.TL: return 'TRIPLE\nLETTER';
    case MultiplierType.DL: return 'DOUBLE\nLETTER';
    case MultiplierType.Star: return '★';
    default: return '';
  }
};

const Board: React.FC<BoardProps> = ({ board, onSquareClick, isInteractive }) => {
  return (
    <div className="relative select-none p-3 bg-[#4a3020] rounded-lg shadow-2xl border-[6px] border-[#3d2616]">
        {/* Wood Texture Overlay */}
        <div className="absolute inset-0 opacity-25 wood-texture pointer-events-none mix-blend-overlay rounded-lg"></div>

        {/* The Grid */}
        <div 
            className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-[2px] bg-[#1a120b] p-[2px] rounded-md shadow-inner relative z-10"
            style={{ 
                width: 'min(90vw, 60vh)', 
                height: 'min(90vw, 60vh)' 
            }}
        >
            {board.map((row, rIndex) => (
                row.map((sq, cIndex) => (
                    <div 
                        key={`${rIndex}-${cIndex}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSquareClick(rIndex, cIndex);
                        }}
                        className={`
                            relative w-full h-full flex items-center justify-center rounded-[2px] overflow-visible
                            ${getSquareStyle(sq.multiplier)}
                            ${!sq.tile && isInteractive ? 'hover:bg-white/10 cursor-pointer' : ''}
                            transition-colors duration-200
                        `}
                    >
                        {/* Text Label (Background) */}
                        {!sq.tile && (
                            <span className="text-[0.3rem] md:text-[0.5rem] font-bold text-white/40 text-center leading-tight whitespace-pre-line z-0 pointer-events-none">
                                {getSquareLabel(sq.multiplier)}
                            </span>
                        )}

                        {/* Tile */}
                        {sq.tile && (
                            <div className="absolute inset-0 flex items-center justify-center z-20 p-[1px]">
                                <Tile3D 
                                    tile={sq.tile} 
                                    isGhost={false}
                                    onClick={(e) => {
                                        e.stopPropagation(); 
                                        onSquareClick(rIndex, cIndex);
                                    }}
                                    layoutIdPrefix="tile"
                                />
                            </div>
                        )}
                        
                        {/* Temp Selection Highlight */}
                         {sq.isTemp && (
                             <motion.div 
                                layoutId={`selection-glow`}
                                className="absolute inset-0 border-2 border-green-400/80 pointer-events-none z-30 rounded-[3px] shadow-[0_0_8px_rgba(74,222,128,0.6)]" 
                                transition={{ duration: 0.2 }}
                             />
                         )}
                    </div>
                ))
            ))}
        </div>
    </div>
  );
};

export default Board;