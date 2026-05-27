// Sistema de puntuación aditivo (V2)
// Cada criterio que aciertes suma puntos de forma independiente.
// Máximo por partido = resultado + golesLocal + golesVisitante + diferencia (default: 10 pts)

interface ScoreInput {
  homeScore: string;
  awayScore: string;
}

// ─── Configuración de puntuación ─────────────────────────────────────────────

export interface ScoringConfig {
  resultado: number;         // resultado correcto 1X2        (default 5)
  golesLocal: number;        // goles del local exactos        (default 2)
  golesVisitante: number;    // goles del visitante exactos    (default 2)
  diferencia: number;        // diferencia de goles exacta     (default 1)
  dobleEliminatoria: boolean; // duplicar puntos en knockout   (default false)
  bonusUnico: boolean;        // +1 si solo un participante acertó exacto (default false)
}

export const DEFAULT_SCORING: ScoringConfig = {
  resultado: 5,
  golesLocal: 2,
  golesVisitante: 2,
  diferencia: 1,
  dobleEliminatoria: false,
  bonusUnico: false,
};

// ─── Configuración de predicción final ───────────────────────────────────────

export interface ChampionConfig {
  enabled: boolean;
  champion: number;    // puntos por campeón acertado     (default 15)
  runnerUp: number;    // puntos por subcampeón acertado  (default 10)
  thirdPlace: number;  // puntos por 3er lugar acertado   (default 5)
}

export const DEFAULT_CHAMPION: ChampionConfig = {
  enabled: false,
  champion: 15,
  runnerUp: 10,
  thirdPlace: 5,
};

// ─── Configuración del premio ─────────────────────────────────────────────────

export interface PrizeConfig {
  entryFee: number;                           // valor de entrada por participante
  currency: string;                           // 'COP', 'USD', etc.
  distribution: 'winner_takes_all' | 'top3'; // distribución del pozo
  percentages: {
    first: number;   // % para el 1er lugar
    second: number;  // % para el 2do lugar
    third: number;   // % para el 3er lugar
  };
}

export const DEFAULT_PRIZE: PrizeConfig = {
  entryFee: 0,
  currency: 'COP',
  distribution: 'winner_takes_all',
  percentages: { first: 100, second: 0, third: 0 },
};

// ─── Etiquetas de fases eliminatorias ────────────────────────────────────────

export const KNOCKOUT_STAGES = new Set([
  'ROUND_OF_16',
  'LAST_16',
  'QUARTER_FINAL',
  'SEMI_FINAL',
  'THIRD_PLACE',
  'FINAL',
  'PLAYOFF',
]);

export function isKnockoutStage(stage?: string): boolean {
  if (!stage) return false;
  return KNOCKOUT_STAGES.has(stage.toUpperCase());
}

// ─── Función de puntuación principal (aditiva) ───────────────────────────────

export interface PointsBreakdown {
  total: number;
  resultado: number;
  golesLocal: number;
  golesVisitante: number;
  diferencia: number;
  multiplied: boolean; // true si se aplicó doble por eliminatoria
}

export function getMatchBreakdown(
  pred: ScoreInput | undefined,
  result: ScoreInput | undefined,
  config: ScoringConfig,
  stage?: string,
): PointsBreakdown {
  const empty: PointsBreakdown = {
    total: 0, resultado: 0, golesLocal: 0, golesVisitante: 0, diferencia: 0, multiplied: false,
  };

  if (!pred || pred.homeScore === '' || pred.awayScore === '') return empty;
  if (!result || result.homeScore === '' || result.awayScore === '') return empty;

  const pH = Number(pred.homeScore);
  const pA = Number(pred.awayScore);
  const rH = Number(result.homeScore);
  const rA = Number(result.awayScore);

  const predOut = pH > pA ? 'H' : pH < pA ? 'A' : 'D';
  const realOut = rH > rA ? 'H' : rH < rA ? 'A' : 'D';

  // Usar 0 como fallback por si algún campo del config llega undefined (pollas viejas)
  const breakdown: PointsBreakdown = {
    resultado:      predOut === realOut                       ? (config.resultado    ?? 0) : 0,
    golesLocal:     pH === rH                                 ? (config.golesLocal   ?? 0) : 0,
    golesVisitante: pA === rA                                 ? (config.golesVisitante ?? 0) : 0,
    diferencia:     Math.abs(pH - pA) === Math.abs(rH - rA)  ? (config.diferencia   ?? 0) : 0,
    multiplied: false,
    total: 0,
  };

  breakdown.total = breakdown.resultado + breakdown.golesLocal + breakdown.golesVisitante + breakdown.diferencia;

  // Fase eliminatoria: duplicar puntos
  if (config.dobleEliminatoria && isKnockoutStage(stage)) {
    breakdown.total *= 2;
    breakdown.multiplied = true;
  }

  return breakdown;
}

/** Puntos totales de una predicción (versión simplificada) */
export function getMatchPoints(
  pred: ScoreInput | undefined,
  result: ScoreInput | undefined,
  config: ScoringConfig,
  stage?: string,
): number {
  return getMatchBreakdown(pred, result, config, stage).total;
}

/** Máximo de puntos posibles por partido */
export function getMaxMatchPoints(config: ScoringConfig, knockout = false): number {
  const base = config.resultado + config.golesLocal + config.golesVisitante + config.diferencia;
  return knockout && config.dobleEliminatoria ? base * 2 : base;
}

// ─── Color del badge según puntos obtenidos vs máximo posible ─────────────────

export function getBadgeColor(points: number, maxPoints: number): string {
  if (points === 0) return '#94A3B8';
  const ratio = points / maxPoints;
  if (ratio >= 1) return '#16A34A';    // exacto (todo acertado)
  if (ratio >= 0.6) return '#2563EB';  // buen acierto
  return '#EAB308';                    // acierto parcial
}
