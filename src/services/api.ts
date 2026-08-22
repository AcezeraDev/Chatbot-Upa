import type { ChatKind, Coordinates, UF, Upa } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 15000;

export class ApiUnavailableError extends Error {}

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  if (!API_URL) {
    throw new ApiUnavailableError('EXPO_PUBLIC_API_URL não configurada');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...init?.headers },
    });

    if (!response.ok) {
      throw new ApiUnavailableError(`A API respondeu ${response.status}`);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiUnavailableError) throw error;
    throw new ApiUnavailableError('Não foi possível falar com o servidor');
  } finally {
    clearTimeout(timeout);
  }
};

/**
 * Valida o formato antes de confiar na resposta. Um payload inesperado
 * derrubaria a tela ao calcular distâncias, então é melhor tratá-lo como
 * indisponibilidade do que deixar passar.
 */
const parseUnits = (payload: unknown): Upa[] => {
  if (!Array.isArray(payload)) {
    throw new ApiUnavailableError('Resposta em formato inesperado');
  }

  return payload.filter((item): item is Upa => {
    const unit = item as Partial<Upa>;
    return (
      typeof unit?.id === 'string' &&
      typeof unit?.name === 'string' &&
      typeof unit?.latitude === 'number' &&
      typeof unit?.longitude === 'number'
    );
  });
};

/**
 * Reduz a coordenada a 3 casas decimais (~110 m) antes de mandá-la na URL. A URL
 * entra em logs de servidor, proxies e histórico do navegador; a posição exata de
 * quem procura pronto atendimento não precisa ficar registrada ali. Dentro do raio
 * de busca de 60 km, ~110 m não muda a ordenação por distância.
 */
const coarse = (value: number): string => (Math.round(value * 1000) / 1000).toString();

export const getNearbyUpas = async (coords: Coordinates, uf: string): Promise<Upa[]> => {
  const query = new URLSearchParams({
    lat: coarse(coords.latitude),
    lon: coarse(coords.longitude),
    uf,
    limit: '15',
  });

  return parseUnits(await requestJson<unknown>(`/api/upas/nearby?${query.toString()}`));
};

export const getUpasByUf = async (uf: string): Promise<Upa[]> =>
  parseUnits(await requestJson<unknown>(`/api/upas?uf=${encodeURIComponent(uf)}`));

export const getUfs = async (): Promise<UF[]> => {
  const payload = await requestJson<unknown>('/api/ufs');
  return Array.isArray(payload) ? (payload as UF[]) : [];
};

type ChatResponse = {
  reply: string;
  kind: ChatKind;
  routeUrl: string | null;
};

const CHAT_KINDS = new Set<ChatKind>([
  'nearest',
  'list',
  'emergency',
  'unavailable',
  'help',
  'assistant',
]);

const isSafeGoogleMapsRoute = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;

  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'www.google.com' &&
      url.pathname === '/maps/dir/' &&
      url.searchParams.get('api') === '1'
    );
  } catch {
    return false;
  }
};

const parseChatResponse = (payload: unknown): ChatResponse => {
  if (!payload || typeof payload !== 'object') {
    throw new ApiUnavailableError('Resposta do chat em formato inesperado');
  }

  const candidate = payload as Partial<ChatResponse>;
  if (
    typeof candidate.reply !== 'string' ||
    !candidate.reply.trim() ||
    typeof candidate.kind !== 'string' ||
    !CHAT_KINDS.has(candidate.kind as ChatKind)
  ) {
    throw new ApiUnavailableError('Resposta do chat em formato inesperado');
  }

  return {
    reply: candidate.reply,
    kind: candidate.kind as ChatKind,
    routeUrl: isSafeGoogleMapsRoute(candidate.routeUrl) ? candidate.routeUrl : null,
  };
};

export const sendChatMessage = async (
  message: string,
  coords: Coordinates | null,
  uf: string | null,
): Promise<ChatResponse> =>
  requestJson<unknown>('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      message,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      uf,
    }),
  }).then(parseChatResponse);
