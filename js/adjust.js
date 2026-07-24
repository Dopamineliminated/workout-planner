// 지난주 기록 기반 다음 주 목표 자동 조정 (이중 점진 과부하, double progression).
// 규칙 요약:
//  - 모든 세트에서 목표 최대 반복 달성 → 무게 증량(초과 정도가 크면 증량폭 2배), 반복은 하단으로 리셋
//  - 절반 이상 최소 반복 미달 → 미달이 크면 무게 감량(디로드), 아니면 같은 무게로 반복
//  - 범위 안(최상단은 아님) → 무게 유지, 다음엔 반복수 상향 도전
//  - 기록 없음(스킵) → 목표 유지

import { getExercise, INCREMENT_KG } from './exercises.js';
import { WEEKDAYS, WEEKDAY_LABELS } from './templates.js';
import { roundToPlate, addDays, toISODate, round1 } from './core-util.js';

function progressionFactor(p) {
  return p === 'conservative' ? 0.5 : p === 'aggressive' ? 1.5 : 1.0;
}

function median(nums) {
  if (!nums.length) return null;
  const s = nums.slice().sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

// 한 운동에 대한 조정 계산
function adjustExercise(ex, log, progression) {
  const meta = getExercise(ex.id);
  const incKg = INCREMENT_KG[(meta && meta.inc) || 'small'] * progressionFactor(progression);
  const isBW = !!ex.bodyweight;

  const next = {
    ...ex,
    repMin: ex.repMin,
    repMax: ex.repMax,
    weightKg: ex.weightKg,
    note: '',
  };

  const working = (log && log.sets ? log.sets : [])
    .filter((s) => s && Number(s.reps) > 0)
    .map((s) => ({ reps: Number(s.reps), weight: s.weight != null && s.weight !== '' ? Number(s.weight) : null }));

  if (working.length === 0) {
    return { next, change: makeChange(ex, next, 'hold', '기록 없음 — 목표 유지') };
  }

  const weights = working.map((s) => s.weight).filter((w) => w != null && !isNaN(w) && w > 0);
  const baseWeight = weights.length ? median(weights) : (ex.weightKg != null ? ex.weightKg : null);
  const reps = working.map((s) => s.reps);
  const minReps = Math.min(...reps);
  const hitMaxCount = working.filter((s) => s.reps >= ex.repMax).length;
  const belowMinCount = working.filter((s) => s.reps < ex.repMin).length;
  const didAllSets = working.length >= ex.sets;

  let type = 'hold';
  let reason = '';

  if (didAllSets && hitMaxCount >= ex.sets) {
    // 초과 달성 → 증량
    type = 'up';
    const overshoot = minReps - ex.repMax; // 0 이상
    let step = incKg;
    if (overshoot >= 2) { step *= 2; reason = `전 세트 목표 초과(+${overshoot}회) — 증량폭 상향`; }
    else { reason = '전 세트 목표 반복 달성 — 증량'; }

    if (isBW || baseWeight == null) {
      // 자중 운동: 무게 대신 반복 목표 상향
      next.repMin = ex.repMin + 2;
      next.repMax = ex.repMax + 2;
      next.weightKg = baseWeight;
      reason = (isBW ? '자중 운동 목표 달성 — 반복 목표 상향' : reason);
    } else {
      next.weightKg = roundToPlate(baseWeight + step);
      next.repMin = ex.repMin; // 반복은 하단으로 리셋
      next.repMax = ex.repMax;
    }
  } else if (belowMinCount >= Math.ceil(ex.sets / 2)) {
    // 절반 이상 미달
    const shortfall = ex.repMin - minReps; // 1 이상
    if (shortfall >= 3 && baseWeight != null && baseWeight > 0 && !isBW) {
      type = 'down';
      next.weightKg = roundToPlate(baseWeight * 0.9);
      reason = `목표 크게 미달(-${shortfall}회) — 무게 10% 감량 후 재도전`;
    } else {
      type = 'hold';
      next.weightKg = baseWeight;
      reason = `목표 미달 — 같은 무게로 반복 숙달`;
    }
  } else {
    // 범위 내 수행 (최상단 미도달)
    type = 'hold';
    next.weightKg = baseWeight;
    reason = '범위 내 수행 — 무게 유지, 반복수 상향 도전';
  }

  return { next, change: makeChange(ex, next, type, reason) };
}

function makeChange(from, to, type, reason) {
  return {
    exerciseId: from.id,
    name: from.name,
    kind: from.kind,
    fromWeight: from.weightKg,
    toWeight: to.weightKg,
    fromReps: [from.repMin, from.repMax],
    toReps: [to.repMin, to.repMax],
    type, // 'up' | 'hold' | 'down'
    reason,
  };
}

// 지난주 루틴 + 기록 → 다음 주 루틴 + 변경 요약
export function generateNextWeek(prevRoutine, logs, goals) {
  const progression = (goals && goals.progression) || 'standard';
  const prevWeek = prevRoutine.weekNumber;
  const nextWeek = prevWeek + 1;

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
    if (log && Array.isArray(log.exercises)) {
      for (const le of log.exercises) logById[le.id] = le;
    }

    const exercises = prevDay.exercises.map((ex) => {
      const { next, change } = adjustExercise(ex, logById[ex.id], progression);
      change.dayKey = wd;
      change.dayLabel = WEEKDAY_LABELS[wd];
      changes.push(change);
      if (change.type === 'up') up++; else if (change.type === 'down') down++; else hold++;

      targetSets += ex.sets;
      const le = logById[ex.id];
      if (le && le.sets) {
        for (const s of le.sets) {
          if (Number(s.reps) > 0) {
            doneSets++;
            volPrev += Number(s.reps) * (Number(s.weight) || 0);
          }
        }
      }
      const midReps = (next.repMin + next.repMax) / 2;
      volNext += next.sets * midReps * (Number(next.weightKg) || 0);

      return { ...next, _priority: undefined };
    });

    days[wd] = {
      type: 'workout',
      sessionType: prevDay.sessionType,
      label: prevDay.label,
      dayLabel: WEEKDAY_LABELS[wd],
      focus: prevDay.focus,
      estMinutes: prevDay.estMinutes,
      exercises,
    };
  }

  const routine = {
    weekNumber: nextWeek,
    method: 'progression',
    split: prevRoutine.split,
    generatedAt: new Date().toISOString(),
    startDate: toISODate(addDays(prevRoutine.startDate, 7)),
    basedOnWeek: prevWeek,
    days,
  };

  const summary = {
    prevWeek,
    nextWeek,
    adherence: targetSets ? round1((doneSets / targetSets) * 100) : 0,
    counts: { up, hold, down },
    volumePrev: Math.round(volPrev),
    volumeNext: Math.round(volNext),
    volumeDeltaPct: volPrev > 0 ? round1(((volNext - volPrev) / volPrev) * 100) : null,
  };

  return { routine, changes, summary };
}
