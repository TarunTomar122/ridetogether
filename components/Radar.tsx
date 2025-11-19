import React from 'react';
import { RideStats } from '../types';

interface RadarProps {
  stats: RideStats;
  className?: string;
}

export const Radar: React.FC<RadarProps> = ({ stats, className }) => {
  const size = 280;
  const center = size / 2;
  const maxRange = 200;

  const clampedDist = Math.min(stats.distanceApart, maxRange);
  const normalizedDist = (clampedDist / maxRange) * (center - 40); 
  
  // Partner Position Logic
  // 0 degrees is UP (Ahead), 180 is DOWN (Behind)
  const angleDeg = stats.isAhead ? 0 : 180;
  const angleRad = (angleDeg - 90) * (Math.PI / 180); 
  
  const x = center + normalizedDist * Math.cos(angleRad);
  const y = center + normalizedDist * Math.sin(angleRad);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Radar Track Background */}
      <div className="absolute inset-0 bg-neutral-900 rounded-full shadow-inner border-4 border-neutral-800"></div>
      
      <svg width={size} height={size} className="absolute z-10">
        {/* Distance Rings */}
        <circle cx={center} cy={center} r={center * 0.33} fill="none" stroke="#404040" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
        <circle cx={center} cy={center} r={center * 0.66} fill="none" stroke="#404040" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
        
        {/* Cross Axis */}
        <line x1={center} y1="20" x2={center} y2={size-20} stroke="#404040" strokeWidth="1" opacity="0.3" />
        <line x1="20" y1={center} x2={size-20} y2={center} stroke="#404040" strokeWidth="1" opacity="0.3" />

        {/* ME Indicator (Center) */}
        <circle cx={center} cy={center} r="8" fill="#FC4C02" stroke="white" strokeWidth="3" />
        <circle cx={center} cy={center} r="8" fill="#FC4C02" className="animate-ping opacity-40" />

        {/* PARTNER Indicator */}
        <g transform={`translate(${x}, ${y})`} className="transition-all duration-700 ease-out">
           {/* Shadow */}
           <circle r="10" fill="black" opacity="0.3" cy="2" />
           {/* Dot */}
           <circle r="10" fill="white" stroke={stats.isAhead ? "#10b981" : "#f59e0b"} strokeWidth="4" />
           
           {/* Distance Label Tag */}
           <rect x="-24" y="-34" width="48" height="20" rx="4" fill="#262626" opacity="0.9" />
           <text 
             y="-20" 
             x="0" 
             textAnchor="middle" 
             fill="white" 
             fontSize="11" 
             fontWeight="800"
             fontFamily="Inter"
             dominantBaseline="middle"
           >
             {Math.round(stats.distanceApart)}m
           </text>
        </g>
      </svg>

      {/* Labels */}
      <div className="absolute top-6 text-[10px] font-bold text-neutral-500 tracking-widest">AHEAD</div>
      <div className="absolute bottom-6 text-[10px] font-bold text-neutral-500 tracking-widest">BEHIND</div>
    </div>
  );
};
