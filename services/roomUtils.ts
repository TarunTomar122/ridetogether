export const ROOM_PREFIX = 'ridetogether-app-v1-';

export const generateRoomId = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const getFullRoomId = (shortCode: string): string => {
  return `${ROOM_PREFIX}${shortCode.toUpperCase()}`;
};
