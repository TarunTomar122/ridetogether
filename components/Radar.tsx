import React from 'react';
import { RideStats } from '../types';

interface RadarProps {
  stats: RideStats;
  className?: string;
}

export const Radar: React.FC<RadarProps> = ({ stats, className }) => {
  // Visual constants
  const size = 240;
  const center = size / 2;
  const maxRange = 200; // Max displayable distance on radar in meters (logarithmic scaling applied below)

  // We want to visualize where the partner is relative to "ME" (facing UP).
  // Bearing to partner relative to my heading.
  // Since we simulate stats.bearingToPartner as absolute, and we don't strictly track "My Heading" in the simulation loop perfectly,
  // we will simplify: 
  // If isAhead is true -> Dot is at top.
  // If isAhead is false -> Dot is at bottom.
  // We'll use a slight randomization for X axis to make it feel "live" if exact bearing isn't available.
  
  // Normalize distance for visual display (clamp it)
  const clampedDist = Math.min(stats.distanceApart, maxRange);
  const normalizedDist = (clampedDist / maxRange) * (center - 20); // -20 for padding
  
  // Calculate Position on Circle
  // If ahead: angle is roughly 0 (top). If behind: angle is roughly 180 (bottom).
  const angleDeg = stats.isAhead ? 0 : 180;
  const angleRad = (angleDeg - 90) * (Math.PI / 180); // -90 to rotate so 0 is UP
  
  const x = center + normalizedDist * Math.cos(angleRad);
  const y = center + normalizedDist * Math.sin(angleRad);

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <div className="absolute inset-0 bg-slate-900 rounded-full opacity-50 border border-slate-700"></div>
      
      {/* Radar Rings */}
      <svg width={size} height={size} className="absolute z-10">
        <circle cx={center} cy={center} r={center * 0.33} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx={center} cy={center} r={center * 0.66} fill="none" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />
        <circle cx={center} cy={center} r={center - 1} fill="none" stroke="#475569" strokeWidth="2" />
        
        {/* Crosshairs */}
        <line x1={center} y1="0" x2={center} y2={size} stroke="#1e293b" strokeWidth="1" />
        <line x1="0" y1={center} x2={size} y2={center} stroke="#1e293b" strokeWidth="1" />

        {/* ME Indicator */}
        <circle cx={center} cy={center} r="6" fill="#3b82f6" stroke="white" strokeWidth="2" />
        
        {/* Pulse Animation for ME */}
        <circle cx={center} cy={center} r="6" fill="#3b82f6" className="animate-ping opacity-75" />

        {/* PARTNER Indicator */}
        <g transform={`translate(${x}, ${y})`}>
           <circle r="8" fill={stats.isAhead ? "#22c55e" : "#f59e0b"} stroke="white" strokeWidth="2" />
           <text 
             y="-12" 
             x="0" 
             textAnchor="middle" 
             fill="white" 
             fontSize="10" 
             fontWeight="bold"
             className="drop-shadow-md"
           >
             {Math.round(stats.distanceApart)}m
           </text>
        </g>
      </svg>

      {/* Labels */}
      <div className="absolute top-2 text-[10px] text-slate-500 font-mono">AHEAD</div>
      <div className="absolute bottom-2 text-[10px] text-slate-500 font-mono">BEHIND</div>
    </div>
  );
};