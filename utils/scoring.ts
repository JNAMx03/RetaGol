// Lógica de puntuación oficial de la app (configurable por polla en versiones futuras)
// Valores por defecto según la arquitectura V1

export type ResultType = 'exact' | 'one_team' | 'winner' | 'diff' | 'none';

interface ScoreInput {
  homeScore: string;
  awayScore: string;
}

/**
 * Evalúa el tipo de acierto de una predicción contra el resultado real.
 * Cascada de mayor a menor:
 *   exact    → marcador exacto (5 pts)
 *   one_team → un equipo exacto (2 pts)
 *   winner   → ganador/empate correcto (1 pt)
 *   diff     → diferencia de goles en valor absoluto correcta, pero ganador errado (1 pt)
 *   none     → ningún acierto (0 pts)
 */
export function getResultType(
  pred: ScoreInput | undefined,
  result: ScoreInput | undefined,
): ResultType {
  if (!pred || pred.homeScore === '' || pred.awayScore === '') return 'none';
  if (!result) return 'none';

  const pH = Number(pred.homeScore);
  const pA = Number(pred.awayScore);
  const rH = Number(result.homeScore);
  const rA = Number(result.awayScore);

  // 1. Marcador exacto
  if (pH === rH && pA === rA) return 'exact';

  // 2. Un marcador exacto (solo local o solo visitante)
  if (pH === rH || pA === rA) return 'one_team';

  // 3. Ganador o empate correcto
  const predOut = pH > pA ? 'H' : pH < pA ? 'A' : 'D';
  const realOut = rH > rA ? 'H' : rH < rA ? 'A' : 'D';
  if (predOut === realOut) return 'winner';

  // 4. Diferencia de goles en valor absoluto correcta (con ganador errado)
  if (Math.abs(pH - pA) === Math.abs(rH - rA)) return 'diff';

  return 'none';
}

/** Puntos por tipo de acierto */
export const POINTS: Record<ResultType, number> = {
  exact: 5,
  one_team: 2,
  winner: 1,
  diff: 1,
  none: 0,
};

/** Color del badge por tipo de acierto */
export const BADGE_COLORS: Record<ResultType, string> = {
  exact: '#16A34A',
  one_team: '#2563EB',
  winner: '#EAB308',
  diff: '#EAB308',
  none: '#94A3B8',
};

/** Etiqueta corta por tipo de acierto */
export const BADGE_LABELS: Record<ResultType, string> = {
  exact: 'Exacto',
  one_team: 'Parcial',
  winner: 'Ganador',
  diff: 'Diferencia',
  none: '—',
};
