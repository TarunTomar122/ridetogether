import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Coordinates, RideMode, RiderState, SignalType, RideStats, ConnectionStatus, NetworkMessage } from './types';
import { calculateDistance, calculateBearing, formatSpeed } from './services/mathUtils';
import { Radar } from './components/Radar';
import { SignalControl } from './components/SignalControl';
import { Bike, Activity, Copy, MapPin, Radio, Users, ArrowRight, Wifi, WifiOff, XCircle, X } from 'lucide-react';
import Peer, { DataConnection } from 'peerjs';

const App: React.FC = () => {
  // --- App State ---
  const [mode, setMode] = useState<RideMode>(RideMode.CYCLING);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(ConnectionStatus.IDLE);
  const [myName, setMyName] = useState('');
  const [roomId, setRoomId] = useState(''); // The Peer ID
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

        // Send update immediately if connected
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
  
  // Cleanup effect when going back to IDLE
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

  const initializePeer = () => {
    // Cleanup existing if any (safety check)
    if (peerRef.current) peerRef.current.destroy();

    const peer = new Peer(); 
    peerRef.current = peer;

    peer.on('open', (id) => {
      console.log("Peer ID generated:", id);
      setRoomId(id);
      // Use functional update to check current state correctly, avoiding stale closure
      setConnectionStatus(prev => prev === ConnectionStatus.CREATING ? ConnectionStatus.WAITING : prev);
    });

    peer.on('connection', (conn) => {
      handleConnection(conn);
    });

    peer.on('error', (err) => {
      console.error("Peer Error:", err);
      setConnectionStatus(ConnectionStatus.ERROR);
    });
  };

  const joinRoom = () => {
    if (!joinInputId) return;
    setConnectionStatus(ConnectionStatus.JOINING);
    
    if (peerRef.current) peerRef.current.destroy();
    const peer = new Peer();
    peerRef.current = peer;
    
    peer.on('open', () => {
      if (!peerRef.current) return;
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
      
      // Send initial hail
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
    // Small timeout to allow state to settle/render before heavy sync op (optional but good practice)
    setTimeout(initializePeer, 0);
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

  // --- VIEW: Onboarding / Lobby ---
  if (connectionStatus !== ConnectionStatus.CONNECTED) {
    return (
      <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center">
        
        <div className="mb-8 text-center animate-bounce-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-600 mb-4 shadow-lg shadow-blue-500/20">
            <Users size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight">RideTogether</h1>
          <p className="text-slate-400 mt-2">Real-time partner dashboard</p>
        </div>

        <div className="w-full max-w-sm bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl">
          
          {/* Name Input */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Your Name</label>
            <input 
              type="text" 
              value={myName}
              onChange={(e) => setMyName(e.target.value)}
              placeholder="Enter your name"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Mode Selection */}
          <div className="grid grid-cols-2 gap-3 mb-8">
             <button 
               onClick={() => setMode(RideMode.CYCLING)}
               className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${mode === RideMode.CYCLING ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
             >
               <Bike size={24} className="mb-1" />
               <span className="text-xs font-bold">Cycling</span>
             </button>
             <button 
               onClick={() => setMode(RideMode.RUNNING)}
               className={`p-3 rounded-xl border flex flex-col items-center justify-center transition-all ${mode === RideMode.RUNNING ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}
             >
               <Activity size={24} className="mb-1" />
               <span className="text-xs font-bold">Running</span>
             </button>
          </div>

          {/* Action Area */}
          {connectionStatus === ConnectionStatus.IDLE && (
             <div className="space-y-3">
                <button 
                  disabled={!myName}
                  onClick={startHosting}
                  className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  Create Room
                </button>
                <div className="relative text-center text-slate-600 text-xs my-2">
                   <span className="bg-slate-900 px-2 relative z-10">OR</span>
                   <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={joinInputId}
                    onChange={(e) => setJoinInputId(e.target.value)}
                    placeholder="Enter Room ID"
                    className="flex-grow bg-slate-950 border border-slate-700 rounded-xl px-4 text-sm focus:outline-none focus:border-blue-500"
                  />
                  <button 
                    disabled={!myName || !joinInputId}
                    onClick={startJoining}
                    className="px-6 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold disabled:opacity-50 transition-colors"
                  >
                    Join
                  </button>
                </div>
             </div>
          )}

          {/* Waiting Room */}
          {(connectionStatus === ConnectionStatus.CREATING || connectionStatus === ConnectionStatus.WAITING) && (
            <div className="text-center py-4 relative">
               <button onClick={resetConnection} className="absolute top-0 right-0 p-2 text-slate-500 hover:text-white"><X size={16} /></button>
               
               {connectionStatus === ConnectionStatus.CREATING ? (
                 <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                    <span className="text-slate-400">Generating Room...</span>
                 </div>
               ) : (
                 <div className="flex flex-col items-center">
                    <span className="text-xs uppercase text-emerald-400 font-bold mb-2 tracking-widest">Room Ready</span>
                    <div className="flex items-center gap-2 bg-slate-950 border border-slate-700 rounded-lg p-3 mb-4 w-full">
                      <code className="flex-grow text-sm font-mono text-blue-300 overflow-hidden text-ellipsis">{roomId}</code>
                      <button 
                        onClick={() => navigator.clipboard.writeText(roomId)}
                        className="p-2 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                    <div className="flex items-center text-slate-400 text-sm animate-pulse">
                      <Wifi size={16} className="mr-2" />
                      Waiting for partner to join...
                    </div>
                 </div>
               )}
            </div>
          )}

          {connectionStatus === ConnectionStatus.JOINING && (
             <div className="flex flex-col items-center py-8 relative">
               <button onClick={resetConnection} className="absolute top-0 right-0 p-2 text-slate-500 hover:text-white"><X size={16} /></button>
               <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500 mb-4"></div>
               <span className="text-indigo-300 font-medium">Connecting to room...</span>
             </div>
          )}

          {connectionStatus === ConnectionStatus.ERROR && (
            <div className="text-center py-4">
               <XCircle size={48} className="mx-auto text-red-500 mb-2" />
               <h3 className="font-bold text-red-400 mb-1">Connection Failed</h3>
               <p className="text-xs text-slate-500 mb-4">Could not connect to the room server. Please try again.</p>
               <button 
                 onClick={resetConnection}
                 className="px-4 py-2 bg-slate-800 rounded-lg text-sm hover:bg-slate-700 text-white"
               >
                 Try Again
               </button>
            </div>
          )}

        </div>
      </div>
    );
  }

  // --- VIEW: Dashboard (Connected) ---
  const unitLabel = mode === RideMode.CYCLING ? 'km/h' : 'min/km';
  const partnerColor = stats.isAhead ? 'text-emerald-400' : 'text-amber-400';
  const partnerStatusText = stats.isAhead ? 'AHEAD' : 'BEHIND';

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-safe relative overflow-hidden flex flex-col">
      
      {/* Top Bar */}
      <header className="flex justify-between items-center p-4 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-mono text-slate-400 uppercase tracking-widest">LIVE</span>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-xs text-slate-500">CONNECTED TO</span>
           <div className="text-sm font-bold text-slate-200 px-2 py-1 bg-slate-800 rounded-md">{partnerState.name}</div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="flex-grow flex flex-col items-center justify-start pt-6 pb-6 px-4 overflow-y-auto">
        
        {/* Warning / Notification Area */}
        {partnerState.activeSignal !== SignalType.NONE && (
           <div className="w-full max-w-md mb-4 animate-bounce-in">
              <div className="bg-indigo-600 text-white p-4 rounded-2xl shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-3">
                 <Radio className="animate-ping" />
                 <span className="font-bold text-lg uppercase tracking-wider">{partnerState.activeSignal.replace('_', ' ')}</span>
              </div>
           </div>
        )}

        {/* Primary HUD: Radar & Stats */}
        <div className="w-full max-w-md grid grid-cols-2 gap-4 mb-6">
          
          {/* Left: Speed & My Stats */}
          <div className="flex flex-col justify-center space-y-4">
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
              <span className="text-xs text-slate-500 uppercase tracking-wider">My Speed</span>
              <div className="text-4xl font-black text-white tabular-nums tracking-tight">
                {formatSpeed(myLoc?.speed || 0, mode)}
                <span className="text-base font-medium text-slate-500 ml-1">{unitLabel}</span>
              </div>
            </div>
            
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
               <span className="text-xs text-slate-500 uppercase tracking-wider">Gap Distance</span>
               <div className={`text-3xl font-bold tabular-nums ${partnerColor}`}>
                 {Math.round(stats.distanceApart)}<span className="text-sm text-slate-500 ml-1">m</span>
               </div>
               <div className={`text-xs font-bold mt-1 ${partnerColor}`}>{partnerStatusText}</div>
            </div>
          </div>

          {/* Right: Radar Visualization */}
          <div className="flex items-center justify-center bg-slate-900/80 rounded-2xl border border-slate-800 aspect-square relative overflow-hidden">
            <Radar stats={stats} />
            {/* Overlay info if I am sending a signal */}
            {mySignal !== SignalType.NONE && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 backdrop-blur-sm">
                <div className="text-center">
                  <div className="font-bold text-blue-400 text-sm tracking-widest">SENDING</div>
                  <div className="text-white font-black text-xl mt-1">{mySignal.replace('_', ' ')}</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Partner Speed Comparison Bar */}
        <div className="w-full max-w-md bg-slate-900 p-4 rounded-2xl mb-6 border border-slate-800">
           <div className="flex justify-between text-xs text-slate-400 mb-2">
             <span>Slower</span>
             <span>Matching</span>
             <span>Faster</span>
           </div>
           <div className="h-2 bg-slate-800 rounded-full overflow-hidden relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-600"></div>
              <div 
                className={`absolute top-0 bottom-0 w-2 rounded-full transition-all duration-500 ${Math.abs(stats.relativeSpeed) < 1 ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ 
                  left: `${50 + (Math.max(-10, Math.min(10, stats.relativeSpeed)) * 5)}%`,
                  transform: 'translateX(-50%)'
                }}
              />
           </div>
           <div className="mt-2 text-center text-xs text-slate-500">
              You are {Math.abs(stats.relativeSpeed).toFixed(1)} km/h {stats.relativeSpeed > 0 ? 'faster' : 'slower'} than {partnerState.name}
           </div>
        </div>

        {/* Controls */}
        <div className="w-full max-w-md mb-20">
          <div className="flex justify-between items-end mb-2 px-2">
             <h3 className="text-sm font-bold text-slate-400 uppercase">Send Signal</h3>
          </div>
          <SignalControl onSendSignal={handleSignal} lastSentSignal={mySignal} />
        </div>
        
        {/* Disconnect Button */}
        <button 
          onClick={resetConnection}
          className="mt-auto mb-8 text-xs text-red-400 hover:text-red-300 flex items-center opacity-50 hover:opacity-100"
        >
          <WifiOff size={12} className="mr-1" />
          Disconnect & Exit
        </button>

      </main>
    </div>
  );
};

export default App;