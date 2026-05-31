const BASE_URL = 'https://api.football-data.org/v4';
const API_KEY = process.env.EXPO_PUBLIC_FOOTBALL_DATA_KEY ?? '';;

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
  // name puede ser null en fases eliminatorias donde aún no se saben los equipos (ej. "TBD")
  homeTeam: { name: string | null };
  awayTeam: { name: string | null };
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
 * - Aún no han comenzado (primer partido SCHEDULED es futuro)
 * - Tienen partidos confirmados con equipos definidos
 *
 * Estrategia: va directo a los partidos programados sin depender de
 * currentSeason (que puede fallar con 400/403 cuando el torneo está
 * entre temporadas o en plan gratuito con acceso limitado).
 */
export async function getAvailableTournaments(): Promise<AvailableTournament[]> {
  if (!API_KEY) throw new Error('API key de fútbol no configurada. Verifica EXPO_PUBLIC_FOOTBALL_DATA_KEY.');

  const today = new Date();

  const results = await Promise.allSettled(
    TOURNAMENTS.map(async (t): Promise<AvailableTournament | null> => {
      // 1. Partidos programados — endpoint siempre disponible en plan gratuito
      const matchData = await fetchJSON(
        `${BASE_URL}/competitions/${t.code}/matches?status=SCHEDULED`,
      );
      const allMatches: ApiMatch[] = matchData.matches ?? [];
      const matches = allMatches.filter(
        (m) => m.homeTeam?.name != null && m.awayTeam?.name != null,
      );
      if (matches.length === 0) return null;

      // 2. Verificar que el primer partido aún no ha ocurrido (torneo no iniciado)
      const firstMatchDate = new Date(matches[0].utcDate);
      if (firstMatchDate <= today) return null; // ya comenzó → no mostrar en V1

      // Guardar en caché para reutilizar al crear la polla
      matchCache[t.code as TournamentCode] = matches;

      // 3. Intentar obtener startDate/endDate reales de la competición
      //    Si falla (400/403), usar fechas del primer y último partido
      let startDate = matches[0].utcDate;
      let endDate   = matches[matches.length - 1].utcDate;
      try {
        const info = await fetchJSON(`${BASE_URL}/competitions/${t.code}`);
        const season = info.currentSeason;
        if (season?.startDate) startDate = season.startDate;
        if (season?.endDate)   endDate   = season.endDate;
      } catch {
        // silenciar — usamos fechas de los partidos como fallback
      }

      return {
        code: t.code as TournamentCode,
        name: t.name as string,
        color: t.color as string,
        startDate,
        endDate,
        totalMatches: matches.length,
      };
    }),
  );

  return results
    .filter((r): r is PromiseFulfilledResult<AvailableTournament | null> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((v): v is AvailableTournament => v !== null);
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
  // Filtrar partidos donde los equipos aún no están definidos (fases eliminatorias TBD)
  const matches: ApiMatch[] = (data.matches ?? []).filter(
    (m: ApiMatch) => m.homeTeam?.name != null && m.awayTeam?.name != null,
  );
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
