export type LocationPrecision = 'exata' | 'aproximada';

export type Upa = {
  id: string;
  cnes: string;
  name: string;
  neighborhood: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string | null;
  openingHours?: string | null;
  cep?: string | null;
  cityCode?: number | null;
  lastUpdated?: string | null;
  distanceKm?: number | null;
  locationPrecision: LocationPrecision;
  openNow?: boolean | null;
  openingPrecision?: 'exata' | 'estimada' | 'desconhecida';

  /** Reservado para integrações municipais de fila. Hoje sempre nulo. */
  waitMinutes?: number | null;
  waitSource?: string | null;
};

export type UF = {
  code: number;
  sigla: string;
  name: string;
};

export type ChatRole = 'assistant' | 'user';

export type ChatKind = 'nearest' | 'list' | 'emergency' | 'unavailable' | 'help' | 'assistant';

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  createdAt: string;
  kind?: ChatKind;
  /** Link universal de rota validado pelo backend; nunca contém chave de API. */
  routeUrl?: string | null;
};

export type DataSource = 'api' | 'demo';

export type Coordinates = {
  latitude: number;
  longitude: number;
};

/** Por que a lista de unidades não pôde ser carregada. */
export type LoadStatus =
  | { state: 'idle' }
  | { state: 'locating' }
  | { state: 'loading' }
  | { state: 'ready' }
  | { state: 'permission-denied' }
  | { state: 'uf-unknown' }
  | { state: 'location-unavailable' }
  | { state: 'offline' }
  | { state: 'error'; message: string };
