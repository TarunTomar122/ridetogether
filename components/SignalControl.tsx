import React from 'react';
import { SignalType } from '../types';
import { ArrowBigUp, ArrowBigDown, Hand, ArrowLeft, ArrowRight, Bell, Zap } from 'lucide-react';

interface SignalControlProps {
  onSendSignal: (signal: SignalType) => void;
  lastSentSignal: SignalType;
}

export const SignalControl: React.FC<SignalControlProps> = ({ onSendSignal, lastSentSignal }) => {
  
  // Increased base height from h-16 to h-20 for bigger touch targets
  const btnBase = "flex flex-col items-center justify-center h-20 rounded-2xl transition-all active:scale-95 shadow-sm";
  const btnInactive = "bg-neutral-800 text-neutral-400 hover:bg-neutral-700";
  const btnActive = "bg-orange-600 text-white ring-2 ring-orange-400 ring-offset-2 ring-offset-black";

  const getStyle = (type: SignalType) => `${btnBase} ${lastSentSignal === type ? btnActive : btnInactive}`;

  return (
    <div className="grid grid-cols-4 gap-3 w-full px-2">
      
      {/* PING - Main Action - Spans 2 cols */}
      <button onClick={() => onSendSignal(SignalType.PING)} className={`col-span-2 h-20 rounded-2xl flex items-center justify-center gap-2 font-bold uppercase tracking-wide transition-all active:scale-95 ${lastSentSignal === SignalType.PING ? 'bg-orange-600 text-white' : 'bg-white text-black hover:bg-neutral-200'}`}>
        <Zap size={24} className={lastSentSignal === SignalType.PING ? 'text-white' : 'text-orange-600'} fill="currentColor" />
        <span className="text-lg">Kudos</span>
      </button>

      {/* Speed Controls */}
      <button onClick={() => onSendSignal(SignalType.SPEED_UP)} className={getStyle(SignalType.SPEED_UP)}>
        <ArrowBigUp size={36} />
      </button>

      <button onClick={() => onSendSignal(SignalType.SLOW_DOWN)} className={getStyle(SignalType.SLOW_DOWN)}>
        <ArrowBigDown size={36} />
      </button>

      {/* Directionals */}
      <button onClick={() => onSendSignal(SignalType.MOVE_LEFT)} className={getStyle(SignalType.MOVE_LEFT)}>
        <ArrowLeft size={32} />
      </button>
      
      <button onClick={() => onSendSignal(SignalType.STOP)} className={`${getStyle(SignalType.STOP)} !bg-red-500/10 !text-red-500 border border-red-500/20`}>
        <Hand size={32} />
      </button>
      
      <button onClick={() => onSendSignal(SignalType.MOVE_RIGHT)} className={getStyle(SignalType.MOVE_RIGHT)}>
        <ArrowRight size={32} />
      </button>

      <div className="col-span-1"></div> {/* Spacer or extra slot */}
    </div>
  );
};
