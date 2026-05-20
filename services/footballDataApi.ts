const BASE_URL = 'https://api.football-data.org/v4';
const API_KEY = process.env.EXPO_PUBLIC_FOOTBALL_DATA_KEY!;

export const TOURNAMENTS = [
  { code: 'WC',  name: 'Mundial 2026',      color: '#15803D' },
  { code: 'CL',  name: 'Champions League',  color: '#1E40AF' },
  { code: 'PD',  name: 'La Liga',           color: '#B91C1C' },
  { code: 'CDR', name: 'Copa del Rey',      color: '#A16207' },
  { code: 'PL',  name: 'Premier League',    color: '#6D28D9' },
  { code: 'BL1', name: 'Bundesliga',        color: '#B45309' },
  { code: 'SA',  name: 'Serie A',           color: '#0369A1' },
] as const;

export type TournamentCode = typeof TOURNAMENTS[number]['code'];

export interface ApiMatch {
  id: number;
  utcDate: string;
  status: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
}

export interface AvailableTournament {
  code: TournamentCode;
  name: string;
  color: string;
  startDate: string;
  endDate: string;
  totalMatches: number;
}

// Caché en memoria para no repetir llamadas en la misma sesión
const matchCache: Partial<Record<TournamentCode, ApiMatch[]>> = {};

async function fetchJSON(url: string) {
  const res = await fetch(url, { headers: { 'X-Auth-Token': API_KEY } });
  if (!res.ok) throw new Error(`Error ${res.status}`);
  return res.json();
}

/**
 * Consulta la API por cada torneo y devuelve solo los que:
 * - Aún no han comenzado (startDate > hoy)
 * - Tienen partidos confirmados (SCHEDULED)
 */
export async function getAvailableTournaments(): Promise<AvailableTournament[]> {
  const today = new Date();

  const results = await Promise.allSettled(
    TOURNAMENTS.map(async (t) => {
      // 1. Info de la competición para saber si ya inició
      const info = await fetchJSON(`${BASE_URL}/competitions/${t.code}`);
      const season = info.currentSeason;
      if (!season) return null;

      const startDate = new Date(season.startDate);
      if (startDate <= today) return null; // ya inició → no mostrar en V1

      // 2. Partidos programados (confirma que los fixtures existen)
      const matchData = await fetchJSON(
        `${BASE_URL}/competitions/${t.code}/matches?status=SCHEDULED`,
      );
      const matches: ApiMatch[] = matchData.matches ?? [];
      if (matches.length === 0) return null; // sin fixtures → no mostrar

      // Guardar en caché para reutilizar al crear la polla
      matchCache[t.code as TournamentCode] = matches;

      return {
        code: t.code as TournamentCode,
        name: t.name,
        color: t.color,
        startDate: season.startDate,
        endDate: season.endDate,
        totalMatches: matches.length,
      } satisfies AvailableTournament;
    }),
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<AvailableTournament> =>
        r.status === 'fulfilled' && r.value !== null,
    )
    .map((r) => r.value);
}

/**
 * Devuelve los partidos programados de un torneo.
 * Usa caché si ya se consultó en esta sesión.
 */
export async function getScheduledMatches(code: TournamentCode): Promise<ApiMatch[]> {
  if (matchCache[code]) return matchCache[code]!;

  const data = await fetchJSON(
    `${BASE_URL}/competitions/${code}/matches?status=SCHEDULED`,
  );
  const matches: ApiMatch[] = data.matches ?? [];
  matchCache[code] = matches;
  return matches;
}

export function formatMatchDate(utcDate: string): string {
  const date = new Date(utcDate);
  return date.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatShortDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
