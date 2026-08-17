import type { Upa } from '../types';

export const createDemoUpas = (): Upa[] => {
  const now = new Date().toISOString();

  return [
    {
      id: 'upa-centro',
      name: 'UPA Centro',
      neighborhood: 'Centro',
      address: 'Av. Principal, 120',
      waitMinutes: 18,
      patients: 7,
      status: 'low',
      lastUpdated: now,
      distanceKm: 2.1,
    },
    {
      id: 'upa-zona-norte',
      name: 'UPA Zona Norte',
      neighborhood: 'Jardim Norte',
      address: 'Rua das Flores, 890',
      waitMinutes: 34,
      patients: 14,
      status: 'moderate',
      lastUpdated: now,
      distanceKm: 4.7,
    },
    {
      id: 'upa-zona-sul',
      name: 'UPA Zona Sul',
      neighborhood: 'Vila Esperança',
      address: 'Av. Saúde, 455',
      waitMinutes: 56,
      patients: 22,
      status: 'high',
      lastUpdated: now,
      distanceKm: 6.3,
    },
  ];
};

