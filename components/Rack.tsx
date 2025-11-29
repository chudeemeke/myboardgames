import React from 'react';
import { TileData } from '../types';
import Tile3D from './Tile3D';
import { motion } from 'framer-motion';

interface RackProps {
  tiles: TileData[];
  selectedTileId: string | null;
  onSelectTile: (id: string) => void;
  isActive: boolean;
  inverted?: boolean;
  isSwapMode?: boolean;
}

const Rack: React.FC<RackProps> = ({ tiles, selectedTileId, onSelectTile, isActive, inverted, isSwapMode }) => {
  return (
    <motion.div 
        className={`
            flex justify-center z-30 relative
            ${inverted ? 'rotate-180' : ''}
        `}
        animate={{
            opacity: isActive ? 1 : 0.6,
            filter: isActive ? 'grayscale(0%)' : 'grayscale(30%)'
        }}
    >
      <div className={`
        relative bg-[#5c3e22] px-3 py-3 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]
        flex gap-1.5 md:gap-3 items-center justify-center min-h-[60px] md:min-h-[75px] min-w-[300px] md:min-w-[400px]
        border-[4px] border-[#3d2616]
      `}>
        {/* Wood Texture */}
        <div className="absolute inset-0 opacity-20 wood-texture pointer-events-none rounded-xl mix-blend-overlay"></div>

        {tiles.length === 0 && (
            <div className="text-white/20 text-xs font-bold uppercase tracking-widest select-none absolute">
                Empty Rack
            </div>
        )}
        
        {/* Tile Container */}
        <div className="flex gap-1 md:gap-2 z-10">
            {tiles.map((tile) => {
                const isSelected = selectedTileId === tile.id;
                return (
                    <div key={tile.id} className="relative w-[36px] h-[36px] md:w-[48px] md:h-[48px]">
                        <Tile3D 
                            tile={tile}
                            selected={isSelected}
                            onClick={(e) => {
                                e.stopPropagation();
                                onSelectTile(tile.id);
                            }}
                            layoutIdPrefix="tile"
                            className={isSwapMode && isSelected ? 'border-2 border-blue-400 rounded' : ''}
                        />
                         {isSwapMode && isSelected && (
                            <motion.div layoutId="swap-indicator" className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full" />
                         )}
                    </div>
                )
            })}
        </div>

        {/* Shelf Bevel Detail */}
        <div className="absolute bottom-0 left-2 right-2 h-[4px] bg-black/20 rounded-b-sm blur-[1px]" />
      </div>
    </motion.div>
  );
};

export default Rack;