import React, { useRef } from 'react';
import { Box, Zap, Radiation, Activity, Biohazard } from 'lucide-react';

const DraggablePart = ({ id, name, type, hazardType, onDragStart }) => {

    // Generic Hazard Style (Obfuscated)
    const hazardStyle = "shadow-[0_0_15px_rgba(255,255,255,0.8)] border-white animate-pulse text-white bg-gray-900/50";

    const baseStyle = "border-cyan-500/50 hover:border-cyan-400 bg-black/40 text-cyan-100 hover:bg-cyan-900/20";
    const currentStyle = hazardType ? hazardStyle : baseStyle;

    const handleDragStart = (e) => {
        e.dataTransfer.setData("application/json", JSON.stringify({ id, name, type, hazardType }));
        if (onDragStart) onDragStart(id);
    };

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            className={`cursor-grab active:cursor-grabbing p-3 mb-2 rounded border transition-all duration-300 flex items-center gap-3 select-none ${currentStyle}`}
        >
            <div className={`p-2 rounded-full ${hazardType ? 'bg-black/50' : 'bg-cyan-900/30'}`}>
                {type === 'engine' && <Zap size={20} />}
                {type === 'core' && <Radiation size={20} />}
                {type === 'fluid' && <Biohazard size={20} />}
                {!['engine', 'core', 'fluid'].includes(type) && <Box size={20} />}
            </div>

            <div className="flex-1">
                <h4 className="font-mono text-sm uppercase font-bold tracking-wider">{name}</h4>
                {hazardType && (
                    <div className="text-xs font-black tracking-widest uppercase mt-1 text-red-500 animate-pulse bg-black/80 px-1 rounded inline-block">
                        HAZARD DETECTED
                    </div>
                )}
            </div>
        </div>
    );
};

export default DraggablePart;
