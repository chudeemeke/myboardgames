import React from 'react';
import { TileData } from '../types';
import { motion } from 'framer-motion';

interface Tile3DProps {
  tile: TileData;
  size?: number;
  className?: string;
  selected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  isGhost?: boolean;
  layoutIdPrefix?: string;
}

const Tile3D: React.FC<Tile3DProps> = ({ tile, size, className = '', selected, onClick, isGhost, layoutIdPrefix = 'tile' }) => {
  return (
    <motion.div
      layoutId={`${layoutIdPrefix}-${tile.id}`}
      onClick={onClick}
      className={`
        relative cursor-pointer select-none
        ${className} 
        ${selected ? 'z-[100]' : 'z-10'}
      `}
      style={{
        width: size ? `${size}px` : '100%',
        height: size ? `${size}px` : '100%',
        opacity: isGhost ? 0.5 : 1,
      }}
      // We animate the visuals inside, but the layoutId handles the position
      initial={false}
      animate={{
        y: selected ? -12 : 0,
        scale: selected ? 1.1 : 1,
        zIndex: selected ? 100 : 10,
      }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25
      }}
    >
      {/* Dynamic Shadow */}
      <motion.div 
        className="absolute inset-0 bg-black/50 rounded-[4px] blur-md"
        animate={{
            y: selected ? 18 : 2,
            scale: selected ? 0.9 : 0.95,
            opacity: selected ? 0.2 : 0.4
        }}
      />

      {/* Main Tile Body */}
      <div
        className={`
            absolute inset-0 rounded-[5px] flex items-center justify-center
            bg-[#f3e6d5] overflow-hidden
            border-b-[4px] border-r-[2px] border-[#8a6d4b]
        `}
        style={{
          background: 'linear-gradient(135deg, #f8efe4 0%, #e6cdac 100%)',
          boxShadow: `
            inset 1px 1px 0px rgba(255, 255, 255, 0.9),
            inset -1px -1px 2px rgba(0, 0, 0, 0.1)
          `
        }}
      >
        {/* Letter */}
        <span 
            className="tile-font text-[#2b2b2b] font-bold leading-none relative top-[-2px]"
            style={{
                fontSize: size ? `${size * 0.6}px` : 'clamp(1rem, 4vw, 1.8rem)',
            }}
        >
          {tile.letter}
        </span>

        {/* Value */}
        <span 
            className="absolute bottom-[10%] right-[10%] font-bold text-[#2b2b2b] leading-none"
            style={{ 
                fontSize: size ? `${size * 0.25}px` : 'clamp(0.4rem, 1.5vw, 0.6rem)',
                opacity: 0.7
            }}
        >
          {tile.value > 0 ? tile.value : ''}
        </span>
        
        {/* Specular Highlight */}
        <div className="absolute top-0 left-0 right-0 h-[30%] bg-gradient-to-b from-white/40 to-transparent pointer-events-none" />
      </div>
    </motion.div>
  );
};

export default Tile3D;