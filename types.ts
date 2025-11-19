export interface Coordinates {
  latitude: number;
  longitude: number;
  heading: number | null;
  speed: number | null; // meters per second
}

export enum RideMode {
  CYCLING = 'CYCLING',
  RUNNING = 'RUNNING',
}

export enum SignalType {
  SLOW_DOWN = 'SLOW_DOWN',
  SPEED_UP = 'SPEED_UP',
  STOP = 'STOP',
  MOVE_LEFT = 'MOVE_LEFT',
  MOVE_RIGHT = 'MOVE_RIGHT',
  PING = 'PING',
  NONE = 'NONE'
}

export interface RiderState {
  id: string;
  name: string;
  position: Coordinates;
  lastUpdated: number;
  activeSignal: SignalType;
}

export interface RideStats {
  distanceApart: number; // meters
  bearingToPartner: number; // degrees
  relativeSpeed: number; // km/h diff
  isAhead: boolean;
}

export enum ConnectionStatus {
  IDLE = 'IDLE',
  CREATING = 'CREATING',
  WAITING = 'WAITING', // Hosting, waiting for peer
  JOINING = 'JOINING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export type NetworkMessage = 
  | { type: 'UPDATE'; payload: { position: Coordinates; name: string } }
  | { type: 'SIGNAL'; payload: SignalType };
