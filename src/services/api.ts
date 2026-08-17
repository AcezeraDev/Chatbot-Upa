import { createDemoUpas } from '../data/demo';
import type { DataSource, Upa } from '../types';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
const REQUEST_TIMEOUT_MS = 3000;

type UpaResult = {
  data: Upa[];
  source: DataSource;
};

type ChatResult = {
  reply: string;
  source: DataSource;
};

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  if (!API_URL) {
    throw new Error('API não configurada');
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`Falha na API: ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
};

export const getUpas = async (): Promise<UpaResult> => {
  try {
    const data = await requestJson<Upa[]>('/api/upas');
    return { data, source: 'api' };
  } catch {
    return { data: createDemoUpas(), source: 'demo' };
  }
};

const normalize = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const createDemoReply = (message: string): string => {
  const upas = createDemoUpas();
  const best = upas[0];
  const normalized = normalize(message);

  if (!best) {
    return 'Os dados demonstrativos estão indisponíveis no momento.';
  }

  if (normalized.includes('todas') || normalized.includes('lista')) {
    return upas
      .map((upa) => `${upa.name}: cerca de ${upa.waitMinutes} minutos`)
      .join('\n');
  }

  if (normalized.includes('emergencia') || normalized.includes('grave')) {
    return 'Em uma emergência, não escolha a unidade apenas pelo tempo de espera. Procure atendimento imediato pelos canais oficiais da sua cidade.';
  }

  return `${best.name} apresenta a menor espera estimada entre as unidades demonstrativas: cerca de ${best.waitMinutes} minutos. Os dados deste protótipo são fictícios.`;
};

export const sendChatMessage = async (message: string): Promise<ChatResult> => {
  try {
    const response = await requestJson<{ reply: string }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    return { reply: response.reply, source: 'api' };
  } catch {
    await new Promise((resolve) => setTimeout(resolve, 650));
    return { reply: createDemoReply(message), source: 'demo' };
  }
};

