import React from 'react';
import { SignalType } from '../types';
import { ArrowBigUp, ArrowBigDown, Hand, ArrowLeft, ArrowRight, Bell } from 'lucide-react';

interface SignalControlProps {
  onSendSignal: (signal: SignalType) => void;
  lastSentSignal: SignalType;
}

export const SignalControl: React.FC<SignalControlProps> = ({ onSendSignal, lastSentSignal }) => {
  
  const btnBase = "flex flex-col items-center justify-center p-3 rounded-xl transition-all active:scale-95 duration-150 shadow-lg";
  const btnInactive = "bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700";
  const btnActive = "bg-blue-600 text-white border-blue-500 ring-2 ring-blue-400 ring-opacity-50";

  const getStyle = (type: SignalType) => lastSentSignal === type ? btnActive : btnInactive;

  return (
    <div className="grid grid-cols-3 gap-3 w-full max-w-md mx-auto mt-4">
      
      {/* Move Left */}
      <button onClick={() => onSendSignal(SignalType.MOVE_LEFT)} className={`${getStyle(SignalType.MOVE_LEFT)}`}>
        <ArrowLeft size={24} />
        <span className="text-xs mt-1 font-bold">Left</span>
      </button>

      {/* Speed Up */}
      <button onClick={() => onSendSignal(SignalType.SPEED_UP)} className={`${getStyle(SignalType.SPEED_UP)}`}>
        <ArrowBigUp size={28} className="text-green-400" />
        <span className="text-xs mt-1 font-bold text-green-400">Speed Up</span>
      </button>

      {/* Move Right */}
      <button onClick={() => onSendSignal(SignalType.MOVE_RIGHT)} className={`${getStyle(SignalType.MOVE_RIGHT)}`}>
        <ArrowRight size={24} />
        <span className="text-xs mt-1 font-bold">Right</span>
      </button>

      {/* Slow Down */}
      <button onClick={() => onSendSignal(SignalType.SLOW_DOWN)} className={`${getStyle(SignalType.SLOW_DOWN)}`}>
        <ArrowBigDown size={28} className="text-amber-400" />
        <span className="text-xs mt-1 font-bold text-amber-400">Slow Down</span>
      </button>

      {/* STOP */}
      <button onClick={() => onSendSignal(SignalType.STOP)} className={`${getStyle(SignalType.STOP)} bg-red-900/30 border-red-900 hover:bg-red-900/50`}>
        <Hand size={24} className="text-red-500" />
        <span className="text-xs mt-1 font-bold text-red-500">STOP</span>
      </button>

       {/* PING */}
       <button onClick={() => onSendSignal(SignalType.PING)} className={`${getStyle(SignalType.PING)}`}>
        <Bell size={24} className="text-purple-400" />
        <span className="text-xs mt-1 font-bold text-purple-400">PING</span>
      </button>

    </div>
  );
};