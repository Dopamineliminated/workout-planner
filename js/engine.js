// 루틴 생성 엔진: 프로필 + 목표 → 요일별 루틴.
// 트레이너 로직을 코드로 구현(분할 선택 → 슬롯 구성 → 운동 선택 → 세트/횟수 배정 → 시간 예산 조정).

import { allowedEquipment, candidatesFor, MUSCLE_LABELS } from './exercises.js';
import {
  WEEKDAYS, WEEKDAY_LABELS, trainingDaysFor, buildSessionSequence,
  slotsFor, schemeFor, SESSION_LABELS, EXPERIENCE_CAPS, cardioFor,
} from './templates.js';
import { toISODate, addDays } from './core-util.js';

// 장비 선호도(같은 슬롯 후보 정렬용)
function equipPreference(ex, kind) {
  const order = kind === 'compound'
    ? ['barbell', 'machine', 'dumbbell', 'cable', 'bodyweight']
    : ['machine', 'cable', 'dumbbell', 'barbell', 'bodyweight'];
  let best = order.length;
  for (const q of ex.equipment) {
    const idx = order.indexOf(q);
    if (idx >= 0 && idx < best) best = idx;
  }
  return best;
}

// 예상 소요 시간(분): 세트당 (휴식 + 수행) + 워밍업.
function estimateMinutes(exercises) {
  let secs = 8 * 60; // 준비/워밍업
  for (const ex of exercises) {
    const perSet = ex.restSec + Math.max(20, ex.repMax * 3); // 휴식 + 세트 수행(대략)
    secs += ex.sets * perSet;
  }
  return Math.round(secs / 60);
}

function buildSessionSlots(sessionType, focusMuscles, caps) {
  let slots = slotsFor(sessionType);

  // 집중 근육 보조 슬롯: 세션에 이미 등장하는 근육에 한해 1개 추가
  const present = new Set(slots.map((s) => s.muscle));
  for (const m of focusMuscles || []) {
    if (present.has(m)) {
      slots.push({ muscle: m, kind: 'isolation', priority: 2.5, focus: true });
    }
  }

  // 근육당 최대 슬롯 수 제한(우선순위 높은 것 유지)
  slots.sort((a, b) => a.priority - b.priority);
  const perMuscle = {};
  slots = slots.filter((s) => {
    perMuscle[s.muscle] = (perMuscle[s.muscle] || 0) + 1;
    return perMuscle[s.muscle] <= caps.perMuscle;
  });

  // 세션당 총 운동 수 상한
  if (slots.length > caps.maxExercises) slots = slots.slice(0, caps.maxExercises);
  return slots;
}

function selectExercises(slots, allowed, seed) {
  const used = new Set();
  const chosen = [];
  slots.forEach((slot, i) => {
    let cands = candidatesFor(slot, allowed);
    // 정렬: 장비 선호 → id(안정적)
    cands = cands.slice().sort((a, b) => {
      const pa = equipPreference(a, slot.kind), pb = equipPreference(b, slot.kind);
      return pa !== pb ? pa - pb : a.id.localeCompare(b.id);
    });
    const fresh = cands.filter((e) => !used.has(e.id));
    const pool = fresh.length ? fresh : cands; // 없으면 중복 허용
    if (!pool.length) return;
    const pick = pool[(seed + i) % pool.length];
    used.add(pick.id);
    chosen.push({ exercise: pick, slot });
  });
  return chosen;
}

function trimToTimeBudget(exercises, sessionMinutes) {
  const budget = sessionMinutes || 60;
  // 우선순위 낮은(뒤쪽) 운동부터 제거, 최소 3개는 유지
  const items = exercises.slice();
  while (items.length > 3 && estimateMinutes(items) > budget) {
    // priority 가장 높은 값(=덜 중요) 제거
    let worstIdx = 0;
    for (let i = 1; i < items.length; i++) {
      if ((items[i]._priority ?? 3) >= (items[worstIdx]._priority ?? 3)) worstIdx = i;
    }
    items.splice(worstIdx, 1);
  }
  return items;
}

export function generateRoutine(profile, goals, opts = {}) {
  const weekNumber = opts.weekNumber || 1;
  const startDate = opts.startDate || toISODate(new Date());
  const seed = opts.seed != null ? opts.seed : weekNumber;

  const allowed = allowedEquipment(profile.equipment);
  const caps = EXPERIENCE_CAPS[profile.experience] || EXPERIENCE_CAPS.intermediate;
  const goal = goals.primaryGoal || 'hypertrophy';

  const trainDays = trainingDaysFor(profile.daysPerWeek);
  const { split, sequence } = buildSessionSequence(goals.split, profile.daysPerWeek, profile.experience);

  const days = {};
  for (const wd of WEEKDAYS) {
    days[wd] = { type: 'rest', label: '휴식', dayLabel: WEEKDAY_LABELS[wd], focus: [], exercises: [] };
  }

  trainDays.forEach((wd, idx) => {
    const sessionType = sequence[idx];
    const slots = buildSessionSlots(sessionType, goals.focusMuscles, caps);
    let picks = selectExercises(slots, allowed, seed + idx * 7);

    // 세트/횟수 배정
    let exercises = picks.map(({ exercise, slot }) => {
      const scheme = schemeFor(goal, exercise.kind);
      const sets = Math.max(2, scheme.sets + (caps.setBias || 0));
      return {
        id: exercise.id,
        name: exercise.name,
        muscle: exercise.muscle,
        muscleLabel: MUSCLE_LABELS[exercise.muscle] || exercise.muscle,
        kind: exercise.kind,
        bodyweight: !!exercise.bodyweight,
        timed: !!exercise.timed,
        sets,
        repMin: scheme.repMin,
        repMax: scheme.repMax,
        restSec: scheme.restSec,
        // 이전에 기록한 무게가 있으면 목표로 재사용, 없으면 null(적정 무게 탐색)
        weightKg: (opts.weights && opts.weights[exercise.id] != null) ? opts.weights[exercise.id] : null,
        note: slot.focus ? '집중 부위 추가 볼륨' : '',
        _priority: slot.priority,
      };
    });

    exercises = trimToTimeBudget(exercises, profile.sessionMinutes);
    exercises.forEach((e) => delete e._priority);

    const focusSet = [...new Set(exercises.map((e) => e.muscleLabel))];
    days[wd] = {
      type: 'workout',
      sessionType,
      label: SESSION_LABELS[sessionType] || sessionType,
      dayLabel: WEEKDAY_LABELS[wd],
      focus: focusSet,
      estMinutes: estimateMinutes(exercises),
      exercises,
    };
  });

  return {
    weekNumber,
    method: 'algorithm',
    split,
    generatedAt: new Date().toISOString(),
    startDate,
    cardio: cardioFor(goal),
    days,
  };
}

// 요일별 실제 날짜(월요일 시작 기준)
export function dateForDay(startDate, dayKey) {
  const offset = WEEKDAYS.indexOf(dayKey);
  return toISODate(addDays(startDate, offset < 0 ? 0 : offset));
}
