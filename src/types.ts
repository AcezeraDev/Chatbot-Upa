export type QueueStatus = 'low' | 'moderate' | 'high';

export type Upa = {
  id: string;
  name: string;
  neighborhood: string;
  address: string;
  waitMinutes: number;
  patients: number;
  status: QueueStatus;
  lastUpdated: string;
  distanceKm?: number;
};

export type ChatRole = 'assistant' | 'user';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
};

export type DataSource = 'api' | 'demo';

