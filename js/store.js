// 클라이언트 상태 관리 + 로직 실행 (정적 사이트 버전).
// 서버 없이 브라우저 localStorage에 저장하고, 루틴 생성/조정을 브라우저에서 직접 수행한다.
// 서버 API(api.js)와 동일한 인터페이스({ store, api })를 제공해 app.js는 거의 그대로 동작.
import { generateRoutine, dateForDay } from './engine.js';
import { generateNextWeek } from './adjust.js';
import { refineRoutine } from './ai.js';
import { nextMonday, addDays, toISODate } from './core-util.js';
import { WEEKDAY_LABELS, GOAL_LABELS, SESSION_LABELS } from './templates.js';
import { MUSCLE_LABELS } from './exercises.js';

const LS_STATE = 'workout-planner:state:v1';
const LS_KEY = 'workout-planner:apikey:v1';

export const store = { state: null, meta: null };

function emptyState() {
  return {
    version: 1, profile: null, goals: null, routine: null,
    logs: {}, body: [], history: [], cardio: [],
    exerciseWeights: {}, // 운동 id → 최근 사용 무게(kg). 루틴 생성 시 목표로 재사용.
    exerciseSteps: {},   // 운동 id → 무게 단위(kg). 사용자가 넣는 무게 변화에서 학습.
    settings: { useAI: false, hasApiKey: false, model: 'claude-opus-4-8', updatedAt: null },
  };
}

function normalizeState(s) {
  const base = emptyState();
  return {
    ...base, ...s,
    settings: { ...base.settings, ...(s.settings || {}) },
    logs: s.logs || {},
    body: Array.isArray(s.body) ? s.body : [],
    history: Array.isArray(s.history) ? s.history : [],
    cardio: Array.isArray(s.cardio) ? s.cardio : [],
    exerciseWeights: (s.exerciseWeights && typeof s.exerciseWeights === 'object') ? s.exerciseWeights : {},
    exerciseSteps: (s.exerciseSteps && typeof s.exerciseSteps === 'object') ? s.exerciseSteps : {},
  };
}

// 세트들의 대표 무게(횟수>0 & 무게>0 인 세트의 중앙값)
function representativeWeight(sets) {
  const ws = (sets || []).filter((x) => Number(x.reps) > 0 && Number(x.weight) > 0).map((x) => Number(x.weight));
  if (!ws.length) return null;
  ws.sort((a, b) => a - b);
  const m = Math.floor(ws.length / 2);
  return ws.length % 2 ? ws[m] : (ws[m - 1] + ws[m]) / 2;
}

function gcdInt(a, b) { a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b)); while (b) { const t = a % b; a = b; b = t; } return a; }

// 이번 세션에서 쓴 무게들 + 이전 작업 무게의 변화폭(≥0.5kg)에서 무게 단위를 학습(gcd 누적).
function learnStep(exerciseId, sets, prevWeight, stepsMap) {
  const used = [...new Set((sets || [])
    .filter((x) => Number(x.reps) > 0 && Number(x.weight) > 0)
    .map((x) => Number(x.weight)))];
  const points = [...new Set(prevWeight != null ? [...used, prevWeight] : used)].sort((a, b) => a - b);
  let gInt = Math.round((stepsMap[exerciseId] || 0) * 100);
  for (let i = 1; i < points.length; i++) {
    const d = Math.round((points[i] - points[i - 1]) * 100);
    if (d >= 50) gInt = gcdInt(gInt, d); // 0.5kg 미만 변화는 노이즈로 무시
  }
  if (gInt >= 50) stepsMap[exerciseId] = gInt / 100;
}

function readState() {
  try {
    const raw = localStorage.getItem(LS_STATE);
    return raw ? normalizeState(JSON.parse(raw)) : emptyState();
  } catch { return emptyState(); }
}
function persist() { localStorage.setItem(LS_STATE, JSON.stringify(store.state)); }
function getKey() { return localStorage.getItem(LS_KEY) || ''; }
function setKey(k) { if (k) localStorage.setItem(LS_KEY, k); else localStorage.removeItem(LS_KEY); }

function num(v) { if (v === '' || v == null) return null; const n = Number(v); return isNaN(n) ? null : n; }
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

const EQUIP_VALID = ['gym', 'barbell', 'dumbbell', 'machine_cable', 'bodyweight', 'outdoor_cardio'];
const EQUIP_LEGACY = { full_gym: ['gym'], dumbbell_only: ['dumbbell'], home_minimal: ['bodyweight', 'dumbbell'] };
function normalizeEquipment(v) {
  if (Array.isArray(v)) { const a = v.filter((x) => EQUIP_VALID.includes(x)); return a.length ? a : ['gym']; }
  if (typeof v === 'string' && EQUIP_LEGACY[v]) return EQUIP_LEGACY[v];
  return ['gym'];
}

// 인바디에서 가져오는 확장 체성분 항목
const BODY_FIELDS = ['weightKg', 'skeletalMuscleKg', 'bodyFatPct', 'fatMassKg', 'bmi', 'bmr', 'inbodyScore', 'whr', 'visceralFat', 'bodyWaterL', 'proteinKg', 'mineralKg', 'muscleMassKg', 'smi'];

function buildMeta() {
  const opt = (obj) => Object.entries(obj).map(([value, label]) => ({ value, label }));
  return {
    weekdayLabels: WEEKDAY_LABELS, muscleLabels: MUSCLE_LABELS,
    goalLabels: GOAL_LABELS, sessionLabels: SESSION_LABELS,
    goals: opt(GOAL_LABELS), muscleOptions: opt(MUSCLE_LABELS),
    volumes: [
      { value: 'beginner', label: '적게 (부담 없이)' },
      { value: 'intermediate', label: '표준' },
      { value: 'advanced', label: '많이 (고볼륨)' },
    ],
    equipments: [
      { value: 'gym', label: '헬스장 (바벨·머신·케이블 전부)' },
      { value: 'barbell', label: '바벨/랙' },
      { value: 'dumbbell', label: '덤벨' },
      { value: 'machine_cable', label: '머신·케이블' },
      { value: 'bodyweight', label: '맨몸(자중)' },
      { value: 'outdoor_cardio', label: '야외 러닝/유산소' },
    ],
    splits: [
      { value: 'auto', label: '자동 추천' },
      { value: 'fullbody', label: '무분할(전신)' },
      { value: 'upper_lower', label: '2분할(상·하체)' },
      { value: 'ppl', label: '3분할(푸시·풀·레그)' },
      { value: 'bro', label: '5분할(부위별)' },
    ],
    progressions: [
      { value: 'conservative', label: '천천히 (안전 우선)' },
      { value: 'standard', label: '표준' },
      { value: 'aggressive', label: '빠르게 (공격적)' },
    ],
    cardioTypes: [
      { value: '빠르게 걷기', label: '빠르게 걷기' },
      { value: '러닝', label: '러닝(달리기)' },
      { value: '사이클', label: '자전거/사이클' },
      { value: '로잉', label: '로잉' },
      { value: '일립티컬', label: '일립티컬' },
      { value: '계단', label: '계단 오르기' },
      { value: 'HIIT', label: '인터벌(HIIT)' },
      { value: '수영', label: '수영' },
    ],
    daysOptions: [2, 3, 4, 5, 6],
    defaultStartDate: nextMonday(),
  };
}

export const api = {
  async load() {
    store.state = readState();
    store.state.settings.hasApiKey = !!getKey();
    store.meta = buildMeta();
    return { state: store.state, meta: store.meta };
  },

  async saveProfile(b) {
    const now = new Date().toISOString();
    const prev = store.state.profile;
    store.state.profile = {
      name: b.name || '', sex: b.sex || '',
      birthDate: b.birthDate || (prev && prev.birthDate) || '',
      heightCm: num(b.heightCm), weightKg: num(b.weightKg),
      experience: b.experience || 'beginner',
      daysPerWeek: clamp(num(b.daysPerWeek) || 3, 2, 6),
      sessionMinutes: clamp(num(b.sessionMinutes) || 60, 20, 180),
      equipment: normalizeEquipment(b.equipment),
      startDate: b.startDate || (prev && prev.startDate) || nextMonday(),
      createdAt: (prev && prev.createdAt) || now,
      updatedAt: now,
    };
    persist();
  },

  async saveGoals(b) {
    store.state.goals = {
      primaryGoal: b.primaryGoal || 'hypertrophy',
      split: b.split || 'auto',
      progression: b.progression || 'standard',
      updatedAt: new Date().toISOString(),
    };
    persist();
  },

  async generate(regenerate = false) {
    const s = store.state;
    if (!s.profile || !s.goals) throw new Error('프로필과 목표를 먼저 입력하세요.');
    const ex = s.routine;
    const weekNumber = ex ? ex.weekNumber : 1;
    const startDate = ex ? ex.startDate : (s.profile.startDate || nextMonday());
    const seed = regenerate ? Math.floor(Math.random() * 997) + weekNumber : weekNumber;
    s.routine = generateRoutine(s.profile, s.goals, { weekNumber, startDate, seed, weights: s.exerciseWeights });
    persist();
  },

  async nextWeek() {
    const s = store.state;
    if (!s.routine) throw new Error('먼저 이번 주 루틴을 생성하세요.');
    const start = s.routine.startDate;
    const end = toISODate(addDays(start, 7));
    const cardioEntries = (s.cardio || []).filter((x) => x.date >= start && x.date < end);
    const { routine, changes, summary } = generateNextWeek(s.routine, s.logs, s.goals || {}, {
      cardioEntries, bodyEntries: s.body || [], steps: s.exerciseSteps,
    });
    s.history.push({ weekNumber: s.routine.weekNumber, startDate: s.routine.startDate, summary, archivedAt: new Date().toISOString() });
    s.routine = routine;
    // 조정된 다음 주 목표 무게를 기억(이후 재생성 시 재사용)
    for (const wd of Object.keys(routine.days)) {
      const d = routine.days[wd];
      if (d.type === 'workout') for (const ex of d.exercises) if (ex.weightKg != null) s.exerciseWeights[ex.id] = ex.weightKg;
    }
    persist();
    return { changes, summary };
  },

  async aiRefine() {
    const s = store.state;
    if (!s.routine || !s.profile || !s.goals) throw new Error('루틴/프로필/목표가 필요합니다.');
    const apiKey = getKey();
    if (!apiKey) throw new Error('API 키가 없습니다. 설정에서 Claude API 키를 입력하세요.');
    const model = (s.settings && s.settings.model) || 'claude-opus-4-8';
    const { routine } = await refineRoutine({ apiKey, model, profile: s.profile, goals: s.goals, routine: s.routine });
    s.routine = routine;
    persist();
  },

  async saveLog(b) {
    const s = store.state;
    const date = s.routine ? dateForDay(s.routine.startDate, b.dayKey) : null;
    s.logs[`${b.weekNumber}:${b.dayKey}`] = {
      weekNumber: b.weekNumber, dayKey: b.dayKey, date,
      completedAt: new Date().toISOString(), note: b.note || '',
      exercises: (b.exercises || []).map((e) => ({
        id: e.id, name: e.name, kind: e.kind,
        targetSets: e.targetSets, repMin: e.repMin, repMax: e.repMax,
        sets: (e.sets || []).map((x) => ({
          reps: x.reps === '' || x.reps == null ? null : Number(x.reps),
          weight: x.weight === '' || x.weight == null ? null : Number(x.weight),
        })),
      })),
    };
    // 무게 단위 학습(이전 무게 대비 변화) 후, 이번 무게를 기억 → 다음 루틴 목표로 반영
    for (const e of (b.exercises || [])) {
      learnStep(e.id, e.sets, s.exerciseWeights[e.id], s.exerciseSteps);
      const w = representativeWeight(e.sets);
      if (w != null) s.exerciseWeights[e.id] = w;
    }
    persist();
  },

  async saveBody(b) {
    const s = store.state;
    if (!b.date) throw new Error('날짜가 필요합니다.');
    const existing = s.body.find((x) => x.date === b.date) || {};
    const entry = { ...existing, date: b.date };
    for (const f of BODY_FIELDS) {
      if (b[f] !== undefined && b[f] !== '' && b[f] !== null) entry[f] = num(b[f]);
    }
    if (b.note !== undefined) entry.note = b.note;
    s.body = s.body.filter((x) => x.date !== b.date);
    s.body.push(entry);
    s.body.sort((a, c) => a.date.localeCompare(c.date));
    persist();
  },

  // 인바디 CSV 등에서 여러 항목을 한 번에 가져오기(날짜별 병합)
  async importBodyEntries(entries) {
    const s = store.state;
    let n = 0;
    for (const e of entries || []) {
      if (!e || !e.date) continue;
      const existing = s.body.find((x) => x.date === e.date) || {};
      const entry = { ...existing, date: e.date };
      for (const f of BODY_FIELDS) {
        const v = num(e[f]);
        if (v != null) entry[f] = v;
      }
      s.body = s.body.filter((x) => x.date !== e.date);
      s.body.push(entry);
      n++;
    }
    s.body.sort((a, c) => a.date.localeCompare(c.date));
    persist();
    return n;
  },

  async deleteBody(date) {
    store.state.body = store.state.body.filter((x) => x.date !== date);
    persist();
  },

  // 일부 필드만 병합 저장(빠른 수정용)
  async patchProfile(partial) { await this.saveProfile({ ...(store.state.profile || {}), ...partial }); },
  async patchGoals(partial) { await this.saveGoals({ ...(store.state.goals || {}), ...partial }); },

  async saveCardio(b) {
    const s = store.state;
    const minutes = num(b.minutes);
    if (!b.date || !minutes) throw new Error('날짜와 시간(분)을 입력하세요.');
    const entry = {
      id: b.id || (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
      date: b.date, type: b.type || '유산소', minutes, note: b.note || '',
    };
    s.cardio.push(entry);
    s.cardio.sort((a, c) => a.date.localeCompare(c.date));
    persist();
  },

  async deleteCardio(id) {
    store.state.cardio = store.state.cardio.filter((x) => x.id !== id);
    persist();
  },

  async saveSettings(b) {
    const s = store.state;
    if (typeof b.useAI === 'boolean') s.settings.useAI = b.useAI;
    if (b.model) s.settings.model = b.model;
    if (b.apiKey !== undefined) setKey((b.apiKey || '').trim());
    s.settings.hasApiKey = !!getKey();
    s.settings.updatedAt = new Date().toISOString();
    persist();
  },

  async reset() {
    setKey('');
    store.state = emptyState();
    persist();
  },

  // 정적 버전 전용: 내보내기/가져오기 (기기 간 이동용)
  exportJson() { return JSON.stringify(store.state, null, 2); },
  async importData(obj) {
    if (!obj || typeof obj !== 'object') throw new Error('올바른 데이터 파일이 아닙니다.');
    store.state = normalizeState(obj);
    store.state.settings.hasApiKey = !!getKey();
    persist();
  },
};
