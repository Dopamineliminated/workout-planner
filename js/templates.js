// 분할(split) 구성, 세션별 운동 슬롯, 목표별 세트/횟수 스킴.

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
export const WEEKDAY_LABELS = { mon: '월', tue: '화', wed: '수', thu: '목', fri: '금', sat: '토', sun: '일' };

// 주당 운동일수 → 실제 배치할 요일(휴식일 간격 고려)
const DAY_SCHEDULE = {
  1: ['mon'],
  2: ['mon', 'thu'],
  3: ['mon', 'wed', 'fri'],
  4: ['mon', 'tue', 'thu', 'fri'],
  5: ['mon', 'tue', 'wed', 'thu', 'fri'],
  6: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
};

export function trainingDaysFor(daysPerWeek) {
  const n = Math.max(1, Math.min(6, daysPerWeek || 3));
  return DAY_SCHEDULE[n];
}

// 세션 타입별 라벨
export const SESSION_LABELS = {
  push: '푸시(가슴·어깨·삼두)',
  pull: '풀(등·이두)',
  legs: '하체',
  upper: '상체',
  lower: '하체',
  full_a: '전신 A',
  full_b: '전신 B',
  full_c: '전신 C',
  bro_chest: '가슴',
  bro_back: '등',
  bro_legs: '하체',
  bro_shoulders: '어깨',
  bro_arms: '팔(이두·삼두)',
};

// 각 세션의 운동 슬롯. priority 낮을수록 우선(시간/경력 제한 시 뒤쪽부터 제거).
// focus: 해당 근육이 '집중 근육'일 때 추가로 살아남기 쉬운 보조 슬롯 표시.
const SLOTS = {
  push: [
    { muscle: 'chest', kind: 'compound', sub: 'horizontal', priority: 1 },
    { muscle: 'chest', kind: 'compound', sub: 'incline', priority: 2 },
    { muscle: 'shoulders', kind: 'compound', sub: 'press', priority: 2 },
    { muscle: 'chest', kind: 'isolation', priority: 3 },
    { muscle: 'shoulders', kind: 'isolation', sub: 'lateral', priority: 3 },
    { muscle: 'triceps', kind: 'isolation', priority: 3 },
    { muscle: 'triceps', kind: 'isolation', priority: 4 },
  ],
  pull: [
    { muscle: 'back', kind: 'compound', sub: 'vertical', priority: 1 },
    { muscle: 'back', kind: 'compound', sub: 'horizontal', priority: 2 },
    { muscle: 'back', kind: 'compound', priority: 2 },
    { muscle: 'rear_delt', kind: 'isolation', priority: 3 },
    { muscle: 'biceps', kind: 'isolation', priority: 3 },
    { muscle: 'biceps', kind: 'isolation', priority: 4 },
  ],
  legs: [
    { muscle: 'quads', kind: 'compound', sub: 'squat', priority: 1 },
    { muscle: 'hamstrings', kind: 'compound', sub: 'hinge', priority: 2 },
    { muscle: 'quads', kind: 'compound', sub: 'press', priority: 2 },
    { muscle: 'hamstrings', kind: 'isolation', priority: 3 },
    { muscle: 'quads', kind: 'isolation', priority: 3 },
    { muscle: 'calves', kind: 'isolation', priority: 3 },
  ],
  upper: [
    { muscle: 'chest', kind: 'compound', sub: 'horizontal', priority: 1 },
    { muscle: 'back', kind: 'compound', sub: 'horizontal', priority: 1 },
    { muscle: 'shoulders', kind: 'compound', sub: 'press', priority: 2 },
    { muscle: 'back', kind: 'compound', sub: 'vertical', priority: 2 },
    { muscle: 'shoulders', kind: 'isolation', sub: 'lateral', priority: 3 },
    { muscle: 'biceps', kind: 'isolation', priority: 3 },
    { muscle: 'triceps', kind: 'isolation', priority: 3 },
  ],
  lower: [
    { muscle: 'quads', kind: 'compound', sub: 'squat', priority: 1 },
    { muscle: 'hamstrings', kind: 'compound', sub: 'hinge', priority: 2 },
    { muscle: 'quads', kind: 'compound', sub: 'press', priority: 2 },
    { muscle: 'hamstrings', kind: 'isolation', priority: 3 },
    { muscle: 'glutes', kind: 'compound', sub: 'thrust', priority: 3 },
    { muscle: 'calves', kind: 'isolation', priority: 3 },
    { muscle: 'abs', kind: 'isolation', priority: 4 },
  ],
  full_a: [
    { muscle: 'quads', kind: 'compound', sub: 'squat', priority: 1 },
    { muscle: 'chest', kind: 'compound', sub: 'horizontal', priority: 1 },
    { muscle: 'back', kind: 'compound', sub: 'horizontal', priority: 2 },
    { muscle: 'shoulders', kind: 'isolation', sub: 'lateral', priority: 3 },
    { muscle: 'triceps', kind: 'isolation', priority: 3 },
    { muscle: 'calves', kind: 'isolation', priority: 4 },
  ],
  full_b: [
    { muscle: 'hamstrings', kind: 'compound', sub: 'hinge', priority: 1 },
    { muscle: 'back', kind: 'compound', sub: 'vertical', priority: 1 },
    { muscle: 'shoulders', kind: 'compound', sub: 'press', priority: 2 },
    { muscle: 'chest', kind: 'isolation', priority: 3 },
    { muscle: 'biceps', kind: 'isolation', priority: 3 },
    { muscle: 'abs', kind: 'isolation', priority: 4 },
  ],
  full_c: [
    { muscle: 'quads', kind: 'compound', sub: 'press', priority: 1 },
    { muscle: 'chest', kind: 'compound', sub: 'incline', priority: 1 },
    { muscle: 'back', kind: 'compound', sub: 'horizontal', priority: 2 },
    { muscle: 'hamstrings', kind: 'isolation', priority: 3 },
    { muscle: 'biceps', kind: 'isolation', priority: 3 },
    { muscle: 'triceps', kind: 'isolation', priority: 3 },
  ],
  bro_chest: [
    { muscle: 'chest', kind: 'compound', sub: 'horizontal', priority: 1 },
    { muscle: 'chest', kind: 'compound', sub: 'incline', priority: 2 },
    { muscle: 'chest', kind: 'isolation', priority: 2 },
    { muscle: 'chest', kind: 'isolation', priority: 3 },
    { muscle: 'triceps', kind: 'isolation', priority: 3 },
  ],
  bro_back: [
    { muscle: 'back', kind: 'compound', sub: 'vertical', priority: 1 },
    { muscle: 'back', kind: 'compound', sub: 'horizontal', priority: 2 },
    { muscle: 'back', kind: 'compound', priority: 2 },
    { muscle: 'rear_delt', kind: 'isolation', priority: 3 },
    { muscle: 'traps', kind: 'isolation', priority: 3 },
  ],
  bro_legs: [
    { muscle: 'quads', kind: 'compound', sub: 'squat', priority: 1 },
    { muscle: 'quads', kind: 'compound', sub: 'press', priority: 2 },
    { muscle: 'hamstrings', kind: 'compound', sub: 'hinge', priority: 2 },
    { muscle: 'hamstrings', kind: 'isolation', priority: 3 },
    { muscle: 'quads', kind: 'isolation', priority: 3 },
    { muscle: 'calves', kind: 'isolation', priority: 3 },
  ],
  bro_shoulders: [
    { muscle: 'shoulders', kind: 'compound', sub: 'press', priority: 1 },
    { muscle: 'shoulders', kind: 'isolation', sub: 'lateral', priority: 2 },
    { muscle: 'rear_delt', kind: 'isolation', priority: 2 },
    { muscle: 'shoulders', kind: 'isolation', sub: 'lateral', priority: 3 },
    { muscle: 'traps', kind: 'isolation', priority: 3 },
  ],
  bro_arms: [
    { muscle: 'biceps', kind: 'isolation', priority: 1 },
    { muscle: 'triceps', kind: 'isolation', priority: 1 },
    { muscle: 'biceps', kind: 'isolation', priority: 2 },
    { muscle: 'triceps', kind: 'isolation', priority: 2 },
    { muscle: 'biceps', kind: 'isolation', priority: 3 },
    { muscle: 'triceps', kind: 'isolation', priority: 3 },
  ],
};

export function slotsFor(sessionType) {
  return (SLOTS[sessionType] || []).map((s) => ({ ...s }));
}

// 분할 결정: 사용자가 지정했으면 그 분할, 'auto'면 일수/경력으로 자동.
// 반환: 각 운동일에 배정할 세션 타입 배열(길이 = 운동일수)
export function buildSessionSequence(split, daysPerWeek, experience) {
  const days = Math.max(1, Math.min(6, daysPerWeek || 3));
  const chosen = split && split !== 'auto' ? split : autoSplit(days, experience);

  const cycles = {
    fullbody: ['full_a', 'full_b', 'full_c'],
    upper_lower: ['upper', 'lower'],
    ppl: ['push', 'pull', 'legs'],
    bro: ['bro_chest', 'bro_back', 'bro_legs', 'bro_shoulders', 'bro_arms'],
  };
  const cycle = cycles[chosen] || cycles.fullbody;

  const seq = [];
  for (let i = 0; i < days; i++) seq.push(cycle[i % cycle.length]);
  return { split: chosen, sequence: seq };
}

function autoSplit(days, experience) {
  if (days <= 2) return 'fullbody';
  if (days === 3) return experience === 'beginner' ? 'fullbody' : 'ppl';
  if (days === 4) return 'upper_lower';
  if (days === 5) return 'ppl'; // push,pull,legs,push,pull 로 자연 순환
  return 'ppl'; // 6일: PPL x2
}

// 목표별 세트/횟수/휴식 스킴. big=대근육 다관절 여부.
const SCHEMES = {
  strength: {
    compound: { sets: 5, repMin: 3, repMax: 6, restSec: 180 },
    isolation: { sets: 3, repMin: 6, repMax: 10, restSec: 90 },
  },
  hypertrophy: {
    compound: { sets: 4, repMin: 6, repMax: 10, restSec: 120 },
    isolation: { sets: 3, repMin: 10, repMax: 15, restSec: 60 },
  },
  fatloss: {
    compound: { sets: 3, repMin: 10, repMax: 12, restSec: 60 },
    isolation: { sets: 3, repMin: 12, repMax: 20, restSec: 45 },
  },
  endurance: {
    compound: { sets: 3, repMin: 12, repMax: 15, restSec: 60 },
    isolation: { sets: 3, repMin: 15, repMax: 20, restSec: 45 },
  },
  maintain: {
    compound: { sets: 3, repMin: 8, repMax: 12, restSec: 90 },
    isolation: { sets: 3, repMin: 10, repMax: 15, restSec: 60 },
  },
};

export function schemeFor(goal, kind) {
  const g = SCHEMES[goal] || SCHEMES.hypertrophy;
  return { ...(kind === 'compound' ? g.compound : g.isolation) };
}

export const GOAL_LABELS = {
  strength: '근력 향상',
  hypertrophy: '근비대(벌크업)',
  fatloss: '체지방 감량',
  endurance: '근지구력',
  maintain: '체력 유지',
};

// 경력별: 근육당 최대 슬롯 수 / 세션당 총 운동 상한
export const EXPERIENCE_CAPS = {
  beginner: { perMuscle: 2, maxExercises: 5, setBias: -1 },
  intermediate: { perMuscle: 3, maxExercises: 7, setBias: 0 },
  advanced: { perMuscle: 4, maxExercises: 8, setBias: 0 },
};
