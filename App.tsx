import React, { useState, useEffect, useRef } from 'react';
import { Coordinates, RideMode, RiderState, SignalType, RideStats, ConnectionStatus, NetworkMessage } from './types';
import { calculateDistance, calculateBearing, formatSpeed } from './services/mathUtils';
import { generateRoomId } from './services/roomUtils';
import { Radar } from './components/Radar';
import { SignalControl } from './components/SignalControl';
import { Bike, Activity, Copy, MapPin, Zap, Wifi, X, Navigation, Share2, Settings, ChevronRight } from 'lucide-react';
import Peer, { DataConnection } from 'peerjs';

const App: React.FC = () => {
  // --- App State ---
  const [mode, setMode] = useState<RideMode>(RideMode.CYCLING);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.IDLE);
  const [myName, setMyName] = useState('');
  const [roomId, setRoomId] = useState(''); 
  const [joinInputId, setJoinInputId] = useState('');
  
  // --- Networking Refs ---
  const peerRef = useRef<Peer | null>(null);
  const connRef = useRef<DataConnection | null>(null);

  // --- Rider States ---
  const [myLoc, setMyLoc] = useState<Coordinates | null>(null);
  const [partnerState, setPartnerState] = useState<RiderState>({
    id: 'partner',
    name: 'Partner',
    position: { latitude: 0, longitude: 0, heading: 0, speed: 0 },
    lastUpdated: 0,
    activeSignal: SignalType.NONE,
  });
  const [mySignal, setMySignal] = useState<SignalType>(SignalType.NONE);

  // --- Derived Stats ---
  const [stats, setStats] = useState<RideStats>({
    distanceApart: 0,
    bearingToPartner: 0,
    relativeSpeed: 0,
    isAhead: false,
  });

  // --- 1. Geolocation (Real User) ---
  useEffect(() => {
    if (connectionStatus === ConnectionStatus.IDLE) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading, speed } = pos.coords;
        const newCoords = {
          latitude,
          longitude,
          heading: heading || 0,
          speed: speed || 0, 
        };
        setMyLoc(newCoords);

        if (connRef.current && connRef.current.open) {
          const msg: NetworkMessage = {
            type: 'UPDATE',
            payload: { position: newCoords, name: myName }
          };
          connRef.current.send(msg);
        }
      },
      (err) => console.error("Geo error", err),
      { enableHighAccuracy: true, maximumAge: 2000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [connectionStatus, myName]);

  // --- 2. Networking Setup ---
  
  useEffect(() => {
    if (connectionStatus === ConnectionStatus.IDLE) {
      if (peerRef.current) {
        peerRef.current.destroy();
        peerRef.current = null;
      }
      connRef.current = null;
      setRoomId('');
      setPartnerState({
        id: 'partner',
        name: 'Partner',
        position: { latitude: 0, longitude: 0, heading: 0, speed: 0 },
        lastUpdated: 0,
        activeSignal: SignalType.NONE,
      });
    }
  }, [connectionStatus]);

  const initializePeer = (customId?: string) => {
    if (peerRef.current) peerRef.current.destroy();

    // Generate ID if Hosting, otherwise auto (though for joining we don't use this ID usually)
    const newId = customId || generateRoomId();
    console.log("Initializing Peer with ID:", newId);

    // Try to use the readable ID
    const peer = new Peer(newId); 
    peerRef.current = peer;

    peer.on('open', (id) => {
      console.log("Peer ID generated:", id);
      setRoomId(id);
      setConnectionStatus(prev => prev === ConnectionStatus.CREATING ? ConnectionStatus.WAITING : prev);
    });

    peer.on('connection', (conn) => {
      handleConnection(conn);
    });

    peer.on('error', (err) => {
      console.error("Peer Error:", err);
      if (err.type === 'unavailable-id') {
         // If ID taken, try again with a new random one (rare with 4 words, but possible)
         if (connectionStatus === ConnectionStatus.CREATING) {
             setTimeout(() => initializePeer(), 500);
         }
      } else {
         setConnectionStatus(ConnectionStatus.ERROR);
      }
    });
  };

  const joinRoom = () => {
    if (!joinInputId) return;
    setConnectionStatus(ConnectionStatus.JOINING);
    
    if (peerRef.current) peerRef.current.destroy();
    
    // When joining, we don't need a specific ID for ourselves, just let PeerJS assign one
    const peer = new Peer();
    peerRef.current = peer;
    
    peer.on('open', () => {
      if (!peerRef.current) return;
      // Connect to the Host's Readable ID
      const conn = peerRef.current.connect(joinInputId);
      handleConnection(conn);
    });

    peer.on('error', (err) => {
       console.error("Join Error", err);
       setConnectionStatus(ConnectionStatus.ERROR);
    });
  };

  const handleConnection = (conn: DataConnection) => {
    connRef.current = conn;

    conn.on('open', () => {
      setConnectionStatus(ConnectionStatus.CONNECTED);
      if (myLoc) {
        conn.send({ type: 'UPDATE', payload: { position: myLoc, name: myName } });
      }
    });

    conn.on('data', (data: unknown) => {
       const msg = data as NetworkMessage;
       if (msg.type === 'UPDATE') {
          setPartnerState(prev => ({
            ...prev,
            name: msg.payload.name,
            position: msg.payload.position,
            lastUpdated: Date.now()
          }));
       } else if (msg.type === 'SIGNAL') {
          setPartnerState(prev => ({
             ...prev,
             activeSignal: msg.payload,
             lastUpdated: Date.now()
          }));
          // Clear signal after 3s
          setTimeout(() => {
            setPartnerState(prev => ({ ...prev, activeSignal: SignalType.NONE }));
          }, 3000);
       }
    });

    conn.on('close', () => {
       setConnectionStatus(ConnectionStatus.ERROR);
    });
  };

  const startHosting = () => {
    if (!myName) return;
    setConnectionStatus(ConnectionStatus.CREATING);
    setTimeout(() => initializePeer(), 0);
  };

  const startJoining = () => {
    if (!myName) return;
    joinRoom();
  };

  const resetConnection = () => {
    setConnectionStatus(ConnectionStatus.IDLE);
  };


  // --- 3. Calculate Stats ---
  useEffect(() => {
    if (!myLoc || partnerState.position.latitude === 0) return;
    const dist = calculateDistance(myLoc, partnerState.position);
    const bearing = calculateBearing(myLoc, partnerState.position);
    let isAhead = false;
    const myHeading = myLoc.heading || 0;
    const diffAngle = Math.abs(bearing - myHeading);
    if (diffAngle < 90 || diffAngle > 270) {
        isAhead = true;
    }
    const relSpeed = ((myLoc.speed || 0) - (partnerState.position.speed || 0)) * 3.6; // km/h diff
    setStats({
      distanceApart: dist,
      bearingToPartner: bearing,
      relativeSpeed: relSpeed,
      isAhead
    });
  }, [myLoc, partnerState]);

  // --- 4. Signal Handler ---
  const handleSignal = (signal: SignalType) => {
    setMySignal(signal);
    if (connRef.current && connRef.current.open) {
       connRef.current.send({ type: 'SIGNAL', payload: signal });
    }
    setTimeout(() => {
      setMySignal(SignalType.NONE);
    }, 3000);
  };

  // --- VIEW RENDERING ---

  // 1. LOBBY VIEW
  if (connectionStatus !== ConnectionStatus.CONNECTED) {
    return (
      <div className="min-h-screen bg-black text-white p-6 flex flex-col relative font-sans selection:bg-orange-500 selection:text-white">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-12 pt-4">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center">
               <Navigation size={16} className="text-white transform -rotate-45" />
             </div>
             <span className="font-black text-xl tracking-tighter italic">RIDE<span className="text-orange-500">TOGETHER</span></span>
           </div>
           <button className="p-2 rounded-full hover:bg-neutral-900">
             <Settings size={20} className="text-neutral-500" />
           </button>
        </div>

        <div className="flex-grow flex flex-col justify-center max-w-md mx-auto w-full animate-fade-in">
          
          {/* Main Card */}
          <div className="space-y-8">
             
             {/* Intro */}
             <div>
               <h1 className="text-4xl font-black mb-2 leading-tight">Let's get <br/> moving.</h1>
               <p className="text-neutral-500 font-medium">Sync up with a partner in real-time.</p>
             </div>

             {/* Inputs */}
             <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-neutral-600 uppercase tracking-widest mb-2 block">Your Athlete ID</label>
                  <input 
                    type="text" 
                    value={myName}
                    onChange={(e) => setMyName(e.target.value)}
                    placeholder="Name"
                    className="w-full bg-neutral-900 border-2 border-neutral-800 rounded-xl p-4 text-white text-lg font-bold focus:outline-none focus:border-orange-600 transition-colors"
                  />
                </div>

                {/* Mode Toggle */}
                <div className="grid grid-cols-2 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
                   <button 
                     onClick={() => setMode(RideMode.CYCLING)}
                     className={`flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${mode === RideMode.CYCLING ? 'bg-neutral-800 text-white shadow-md' : 'text-neutral-500'}`}
                   >
                     <Bike size={20} /> Ride
                   </button>
                   <button 
                     onClick={() => setMode(RideMode.RUNNING)}
                     className={`flex items-center justify-center gap-2 py-3 rounded-lg font-bold transition-all ${mode === RideMode.RUNNING ? 'bg-neutral-800 text-white shadow-md' : 'text-neutral-500'}`}
                   >
                     <Activity size={20} /> Run
                   </button>
                </div>
             </div>

             {/* Action Buttons */}
             {connectionStatus === ConnectionStatus.IDLE && (
               <div className="pt-4 space-y-3">
                  <button 
                    disabled={!myName}
                    onClick={startHosting}
                    className="w-full py-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-lg font-black tracking-wide disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-[0.98]"
                  >
                    START ACTIVITY
                  </button>
                  
                  <div className="relative flex items-center py-2">
                     <div className="flex-grow border-t border-neutral-800"></div>
                     <span className="flex-shrink mx-4 text-neutral-600 text-xs font-bold uppercase">or join friend</span>
                     <div className="flex-grow border-t border-neutral-800"></div>
                  </div>

                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={joinInputId}
                      onChange={(e) => setJoinInputId(e.target.value)}
                      placeholder="e.g. fast-blue-bike-run"
                      className="flex-grow bg-neutral-900 border border-neutral-800 rounded-xl px-4 text-sm focus:outline-none focus:border-white font-mono placeholder:font-sans"
                    />
                    <button 
                      disabled={!myName || !joinInputId}
                      onClick={startJoining}
                      className="px-6 rounded-xl bg-white text-black font-bold disabled:opacity-50 hover:bg-neutral-200 transition-colors"
                    >
                      JOIN
                    </button>
                  </div>
               </div>
             )}

             {/* Waiting State */}
             {(connectionStatus === ConnectionStatus.CREATING || connectionStatus === ConnectionStatus.WAITING) && (
               <div className="bg-neutral-900 p-6 rounded-2xl border border-neutral-800 text-center relative overflow-hidden">
                 <button onClick={resetConnection} className="absolute top-4 right-4 text-neutral-500 hover:text-white"><X size={20}/></button>
                 
                 <div className="mb-4 flex justify-center">
                    <div className="w-16 h-16 bg-orange-600/20 rounded-full flex items-center justify-center animate-pulse">
                       <Wifi size={32} className="text-orange-500" />
                    </div>
                 </div>
                 
                 <h3 className="text-white font-bold text-lg mb-1">Ready to Sync</h3>
                 <p className="text-neutral-400 text-sm mb-6">Share this code with your partner</p>
                 
                 <div className="flex items-center gap-2 bg-black rounded-xl p-4 border border-neutral-800 mb-4 cursor-pointer group" onClick={() => navigator.clipboard.writeText(roomId)}>
                   <code className="flex-grow text-lg font-mono font-bold text-orange-500">{roomId}</code>
                   <Copy size={18} className="text-neutral-500 group-hover:text-white transition-colors" />
                 </div>
                 
                 <div className="text-xs text-neutral-500 font-mono">Waiting for connection...</div>
               </div>
             )}

             {/* Joining State */}
             {connectionStatus === ConnectionStatus.JOINING && (
               <div className="text-center py-12">
                 <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-orange-600 border-r-transparent mx-auto mb-4"></div>
                 <h3 className="font-bold text-xl">Syncing...</h3>
               </div>
             )}
             
             {/* Error State */}
             {connectionStatus === ConnectionStatus.ERROR && (
               <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/20 text-center">
                  <h3 className="text-red-500 font-bold mb-2">Connection Failed</h3>
                  <button onClick={resetConnection} className="text-white underline text-sm">Try Again</button>
               </div>
             )}

          </div>
        </div>
      </div>
    );
  }

  // 2. DASHBOARD VIEW
  return (
    <div className="min-h-screen bg-black text-white pb-safe relative overflow-hidden flex flex-col">
      
      {/* Signal Overlay (Toast Style) */}
      <div className={`fixed top-20 left-0 right-0 z-50 flex justify-center pointer-events-none transition-all duration-500 ${partnerState.activeSignal !== SignalType.NONE ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="bg-orange-600 text-white px-6 py-3 rounded-full shadow-2xl shadow-orange-900/50 flex items-center gap-3">
             <Zap className="fill-white" size={20} />
             <span className="font-black uppercase tracking-wider text-sm">{partnerState.activeSignal.replace('_', ' ')}</span>
          </div>
      </div>

      {/* Top Bar */}
      <header className="px-4 py-3 flex justify-between items-center border-b border-neutral-900 bg-black/80 backdrop-blur-sm sticky top-0 z-40">
         <div className="flex items-center gap-2">
           <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
           <span className="text-xs font-black tracking-widest text-neutral-400 uppercase">Recording</span>
         </div>
         <div className="flex items-center gap-2 text-xs font-bold text-neutral-500 bg-neutral-900 px-3 py-1 rounded-full">
            <UsersIcon size={12} />
            <span>{partnerState.name}</span>
         </div>
      </header>

      {/* Main Scrollable Content */}
      <main className="flex-grow overflow-y-auto pt-6 pb-32 px-4">
        
        {/* Primary Metric: Speed */}
        <div className="mb-8 text-center">
           <div className="text-neutral-500 text-xs font-bold uppercase tracking-wider mb-1">My Pace</div>
           <div className="text-[5rem] leading-[1] font-black tracking-tighter text-white italic">
              {formatSpeed(myLoc?.speed || 0, mode)}
              <span className="text-2xl font-bold text-neutral-600 not-italic ml-2">{mode === RideMode.CYCLING ? 'km/h' : 'min/km'}</span>
           </div>
        </div>

        {/* Partner Stats Card */}
        <div className="bg-neutral-900 rounded-3xl p-1 mb-6 border border-neutral-800 shadow-2xl">
           <div className="bg-neutral-900 rounded-[1.3rem] p-5">
             <div className="flex justify-between items-end mb-4">
                <span className="text-sm font-bold text-neutral-400 uppercase">Gap to Partner</span>
                <span className={`text-xs font-black px-2 py-1 rounded uppercase ${stats.isAhead ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                  {stats.isAhead ? 'You are Ahead' : 'You are Behind'}
                </span>
             </div>
             
             <div className="flex items-baseline justify-between">
                <div className="text-5xl font-black tracking-tighter">
                  {Math.round(stats.distanceApart)}<span className="text-lg text-neutral-500 ml-1">m</span>
                </div>
                <div className="text-right">
                   <div className="text-xs text-neutral-500 font-bold uppercase mb-1">Diff</div>
                   <div className={`text-xl font-bold ${Math.abs(stats.relativeSpeed) < 1 ? 'text-neutral-400' : (stats.relativeSpeed > 0 ? 'text-green-500' : 'text-red-500')}`}>
                      {stats.relativeSpeed > 0 ? '+' : ''}{stats.relativeSpeed.toFixed(1)} <span className="text-xs">km/h</span>
                   </div>
                </div>
             </div>
           </div>
           
           {/* Radar Section */}
           <div className="bg-black rounded-[1.3rem] p-6 mt-1 flex justify-center border-t border-neutral-800">
              <Radar stats={stats} />
           </div>
        </div>

      </main>

      {/* Bottom Controls (Fixed) */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black to-transparent pt-12 pb-6 px-4 z-50">
         <SignalControl onSendSignal={handleSignal} lastSentSignal={mySignal} />
         
         <button onClick={resetConnection} className="w-full mt-6 py-3 text-neutral-600 font-bold text-xs hover:text-white transition-colors flex items-center justify-center gap-2">
            <X size={14} /> END ACTIVITY
         </button>
      </div>

    </div>
  );
};

const UsersIcon = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export default App;
