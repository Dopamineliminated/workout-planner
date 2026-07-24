// 지난주 기록 기반 다음 주 목표 자동 조정 (이중 점진 과부하 + 무게 단위 + 인바디 추세 + 유산소).
// 규칙 요약:
//  - 모든 세트에서 목표 최대 반복 달성 → 무게 1스텝 증량(크게 초과하면 2스텝), 반복은 하단으로 리셋
//  - 절반 이상 최소 반복 미달 → 크게 미달이면 1~2스텝 감량, 아니면 같은 무게로 반복
//  - 범위 안(최상단은 아님) → 무게 유지, 다음엔 반복수 상향 도전
//  - 무게 스텝(step)은 운동별 학습값(사용자가 넣는 무게 변화에서 인식) 또는 기본값 사용
//  - 인바디 추세(intensityFactor)로 증량폭 가감, 유산소는 달성/추세 기반으로 점진 증가

import { getExercise } from './exercises.js';
import { WEEKDAYS, WEEKDAY_LABELS, CARDIO_CAPS } from './templates.js';
import { roundToPlate, addDays, toISODate, round1 } from './core-util.js';
import { bodyTrend } from './trend.js';

function median(nums) {
  if (!nums.length) return null;
  const s = nums.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// 무게 스텝 기본값(운동 증량 등급): big 5kg / mid 2.5kg / small 1.25kg. 학습값이 있으면 그걸 우선.
function defaultStep(ex) {
  const meta = getExercise(ex.id);
  const inc = (meta && meta.inc) || 'small';
  return inc === 'big' ? 5 : inc === 'mid' ? 2.5 : 1.25;
}
function fmtKg(x) { return (Math.round(x * 100) / 100) + 'kg'; }

// 한 운동에 대한 조정 계산. step: 이 운동의 무게 단위, intensityFactor: 추세 배수.
function adjustExercise(ex, log, progression, intensityFactor, step) {
  const isBW = !!ex.bodyweight;
  const next = { ...ex, repMin: ex.repMin, repMax: ex.repMax, weightKg: ex.weightKg, note: '' };

  const working = (log && log.sets ? log.sets : [])
    .filter((s) => s && Number(s.reps) > 0)
    .map((s) => ({ reps: Number(s.reps), weight: s.weight != null && s.weight !== '' ? Number(s.weight) : null }));

  if (working.length === 0) {
    return { next, change: makeChange(ex, next, 'hold', '기록 없음 — 목표 유지') };
  }

  const weights = working.map((s) => s.weight).filter((w) => w != null && !isNaN(w) && w > 0);
  const rawBase = weights.length ? median(weights) : (ex.weightKg != null ? ex.weightKg : null);
  const base = rawBase != null ? roundToPlate(rawBase, step) : null; // 무게 단위 격자에 맞춤
  const reps = working.map((s) => s.reps);
  const minReps = Math.min(...reps);
  const hitMaxCount = working.filter((s) => s.reps >= ex.repMax).length;
  const belowMinCount = working.filter((s) => s.reps < ex.repMin).length;
  const didAllSets = working.length >= ex.sets;

  let type = 'hold';
  let reason = '';

  if (didAllSets && hitMaxCount >= ex.sets) {
    type = 'up';
    const overshoot = minReps - ex.repMax; // 0 이상
    let steps = 1;
    if (overshoot >= 2) steps = 2;
    if (progression === 'aggressive') steps += 1;
    if (progression === 'conservative') steps = 1;
    steps = Math.max(1, Math.round(steps * (intensityFactor || 1))); // 인바디 추세 반영

    if (isBW || base == null) {
      next.repMin = ex.repMin + 2; next.repMax = ex.repMax + 2; next.weightKg = base;
      reason = '자중 운동 목표 달성 — 반복 목표 상향';
    } else {
      const inc = steps * step;
      next.weightKg = roundToPlate(base + inc, step);
      next.repMin = ex.repMin; next.repMax = ex.repMax;
      reason = overshoot >= 2
        ? `전 세트 목표 초과(+${overshoot}회) — ${fmtKg(inc)} 증량`
        : `전 세트 목표 달성 — ${fmtKg(inc)} 증량`;
    }
  } else if (belowMinCount >= Math.ceil(ex.sets / 2)) {
    const shortfall = ex.repMin - minReps; // 1 이상
    if (base != null && base > 0 && !isBW) {
      const dSteps = shortfall >= 5 ? 2 : 1;
      const nw = Math.max(step, roundToPlate(base - dSteps * step, step));
      if (nw < base) {
        type = 'down'; next.weightKg = nw;
        reason = `목표 미달(-${shortfall}회) — ${fmtKg(base - nw)} 감량 후 재도전`;
      } else {
        type = 'hold'; next.weightKg = base; reason = '목표 미달 — 같은 무게로 반복 숙달';
      }
    } else {
      type = 'hold'; next.weightKg = base; reason = '목표 미달 — 같은 무게로 반복 숙달';
    }
  } else {
    type = 'hold'; next.weightKg = base;
    reason = '범위 내 수행 — 무게 유지, 반복수 상향 도전';
  }

  return { next, change: makeChange(ex, next, type, reason) };
}

function makeChange(from, to, type, reason) {
  return {
    exerciseId: from.id, name: from.name, kind: from.kind,
    fromWeight: from.weightKg, toWeight: to.weightKg,
    fromReps: [from.repMin, from.repMax], toReps: [to.repMin, to.repMax],
    type, reason,
  };
}

// 유산소 점진 조정. stats: { sessions, totalMinutes }, nudge: 추세(-1/0/+1)
function adjustCardio(prev, stats, goal, nudge) {
  if (!prev) return { cardio: null, change: null };
  const caps = CARDIO_CAPS[goal] || CARDIO_CAPS.maintain;
  const targetTotal = prev.perWeek * prev.minutes;
  const met = stats.sessions >= prev.perWeek && stats.totalMinutes >= targetTotal;
  const next = { ...prev };
  let type = 'hold', reason = '';

  if (met || nudge > 0) {
    if (next.minutes < caps.maxMinutes) {
      next.minutes = Math.min(caps.maxMinutes, next.minutes + 5); type = 'up';
    } else if (next.perWeek < caps.maxPerWeek) {
      next.perWeek = next.perWeek + 1; type = 'up';
    }
    reason = type === 'up'
      ? (met ? '지난주 유산소 목표 달성 — 다음 주 상향' : '체지방 증가 추세 — 유산소 강화')
      : '이미 권장 상한 — 유지';
  } else if (nudge < 0 && next.minutes > 15) {
    next.minutes = Math.max(15, next.minutes - 5); type = 'down';
    reason = '골격근량 감소 추세 — 회복 위해 유산소 소폭 완화';
  } else {
    reason = stats.sessions > 0 ? '유산소 목표 미달 — 같은 목표 유지' : '지난주 유산소 기록 없음 — 목표 유지';
  }

  return {
    cardio: next,
    change: { type, fromPerWeek: prev.perWeek, fromMin: prev.minutes, toPerWeek: next.perWeek, toMin: next.minutes, reason },
  };
}

// 지난주 루틴 + 기록 → 다음 주 루틴 + 변경 요약
// opts: { cardioEntries: [], bodyEntries: [], steps: { id: kg } }
export function generateNextWeek(prevRoutine, logs, goals, opts = {}) {
  const progression = (goals && goals.progression) || 'standard';
  const goal = (goals && goals.primaryGoal) || 'hypertrophy';
  const steps = opts.steps || {};
  const prevWeek = prevRoutine.weekNumber;
  const nextWeek = prevWeek + 1;

  const trend = bodyTrend(opts.bodyEntries || []);
  const intensityFactor = trend.intensityFactor;

  const days = {};
  const changes = [];
  let up = 0, hold = 0, down = 0;
  let targetSets = 0, doneSets = 0, volPrev = 0, volNext = 0;

  for (const wd of WEEKDAYS) {
    const prevDay = prevRoutine.days[wd];
    if (!prevDay || prevDay.type !== 'workout') {
      days[wd] = { type: 'rest', label: '휴식', dayLabel: WEEKDAY_LABELS[wd], focus: [], exercises: [] };
      continue;
    }
    const log = logs[`${prevWeek}:${wd}`];
    const logById = {};
    if (log && Array.isArray(log.exercises)) for (const le of log.exercises) logById[le.id] = le;

    const exercises = prevDay.exercises.map((ex) => {
      const step = steps[ex.id] || defaultStep(ex);
      const { next, change } = adjustExercise(ex, logById[ex.id], progression, intensityFactor, step);
      change.dayKey = wd;
      change.dayLabel = WEEKDAY_LABELS[wd];
      changes.push(change);
      if (change.type === 'up') up++; else if (change.type === 'down') down++; else hold++;

      targetSets += ex.sets;
      const le = logById[ex.id];
      if (le && le.sets) {
        for (const s of le.sets) {
          if (Number(s.reps) > 0) { doneSets++; volPrev += Number(s.reps) * (Number(s.weight) || 0); }
        }
      }
      const midReps = (next.repMin + next.repMax) / 2;
      volNext += next.sets * midReps * (Number(next.weightKg) || 0);
      return { ...next, _priority: undefined };
    });

    days[wd] = {
      type: 'workout', sessionType: prevDay.sessionType, label: prevDay.label,
      dayLabel: WEEKDAY_LABELS[wd], focus: prevDay.focus, estMinutes: prevDay.estMinutes, exercises,
    };
  }

  // 유산소 조정
  const cardioEntries = opts.cardioEntries || [];
  const cardioStats = {
    sessions: cardioEntries.length,
    totalMinutes: cardioEntries.reduce((a, x) => a + (Number(x.minutes) || 0), 0),
  };
  const { cardio: nextCardio, change: cardioChange } = adjustCardio(prevRoutine.cardio, cardioStats, goal, trend.cardioNudge);

  const routine = {
    weekNumber: nextWeek, method: 'progression', split: prevRoutine.split,
    generatedAt: new Date().toISOString(),
    startDate: toISODate(addDays(prevRoutine.startDate, 7)),
    basedOnWeek: prevWeek,
    cardio: nextCardio || prevRoutine.cardio || null,
    days,
  };

  const summary = {
    prevWeek, nextWeek,
    adherence: targetSets ? round1((doneSets / targetSets) * 100) : 0,
    counts: { up, hold, down },
    volumePrev: Math.round(volPrev), volumeNext: Math.round(volNext),
    volumeDeltaPct: volPrev > 0 ? round1(((volNext - volPrev) / volPrev) * 100) : null,
    trend: { status: trend.status, note: trend.note, dMuscle: trend.dMuscle, dFat: trend.dFat },
    cardio: cardioChange,
  };

  return { routine, changes, summary };
}
