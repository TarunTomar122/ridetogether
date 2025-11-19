export const ADJECTIVES = [
  'fast', 'slow', 'red', 'blue', 'wild', 'calm', 'epic', 'bold', 
  'cool', 'hot', 'safe', 'free', 'neon', 'dark', 'gold', 'pure',
  'aero', 'pro', 'mad', 'zen', 'raw', 'hyper', 'super', 'ultra'
];

export const NOUNS = [
  'rider', 'runner', 'bike', 'pacer', 'dash', 'road', 'trail', 'path',
  'track', 'peak', 'hill', 'city', 'wind', 'storm', 'bolt', 'team',
  'crew', 'squad', 'pulse', 'beat', 'vibe', 'zone', 'grid', 'lane'
];

export const generateRoomId = (): string => {
  const getRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
  // Format: word-word-word-word (e.g., fast-blue-aero-rider)
  return `${getRandom(ADJECTIVES)}-${getRandom(ADJECTIVES)}-${getRandom(ADJECTIVES)}-${getRandom(NOUNS)}`;
};

