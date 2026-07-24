// 클라이언트 상태 관리 + 로직 실행 (정적 사이트 버전).
// 서버 없이 브라우저 localStorage에 저장하고, 루틴 생성/조정을 브라우저에서 직접 수행한다.
// 서버 API(api.js)와 동일한 인터페이스({ store, api })를 제공해 app.js는 거의 그대로 동작.
import { generateRoutine, dateForDay } from './engine.js';
import { generateNextWeek } from './adjust.js';
import { refineRoutine } from './ai.js';
import { nextMonday } from './core-util.js';
import { WEEKDAY_LABELS, GOAL_LABELS, SESSION_LABELS } from './templates.js';
import { MUSCLE_LABELS } from './exercises.js';

const LS_STATE = 'workout-planner:state:v1';
const LS_KEY = 'workout-planner:apikey:v1';

export const store = { state: null, meta: null };

function emptyState() {
  return {
    version: 1, profile: null, goals: null, routine: null,
    logs: {}, body: [], history: [],
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
  };
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

function buildMeta() {
  const opt = (obj) => Object.entries(obj).map(([value, label]) => ({ value, label }));
  return {
    weekdayLabels: WEEKDAY_LABELS, muscleLabels: MUSCLE_LABELS,
    goalLabels: GOAL_LABELS, sessionLabels: SESSION_LABELS,
    goals: opt(GOAL_LABELS), muscleOptions: opt(MUSCLE_LABELS),
    experiences: [
      { value: 'beginner', label: '입문 (~6개월)' },
      { value: 'intermediate', label: '중급 (6개월~2년)' },
      { value: 'advanced', label: '고급 (2년+)' },
    ],
    equipments: [
      { value: 'full_gym', label: '헬스장 (바벨·머신·케이블 전부)' },
      { value: 'dumbbell_only', label: '덤벨 위주' },
      { value: 'home_minimal', label: '홈트 (자중·덤벨)' },
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
      age: num(b.age), heightCm: num(b.heightCm), weightKg: num(b.weightKg),
      experience: b.experience || 'beginner',
      daysPerWeek: clamp(num(b.daysPerWeek) || 3, 2, 6),
      sessionMinutes: clamp(num(b.sessionMinutes) || 60, 20, 180),
      equipment: b.equipment || 'full_gym',
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
      focusMuscles: Array.isArray(b.focusMuscles) ? b.focusMuscles.slice(0, 3) : [],
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
    s.routine = generateRoutine(s.profile, s.goals, { weekNumber, startDate, seed });
    persist();
  },

  async nextWeek() {
    const s = store.state;
    if (!s.routine) throw new Error('먼저 이번 주 루틴을 생성하세요.');
    const { routine, changes, summary } = generateNextWeek(s.routine, s.logs, s.goals || {});
    s.history.push({ weekNumber: s.routine.weekNumber, startDate: s.routine.startDate, summary, archivedAt: new Date().toISOString() });
    s.routine = routine;
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
          done: !!x.done,
        })),
      })),
    };
    persist();
  },

  async saveBody(b) {
    const s = store.state;
    const entry = { date: b.date, weightKg: num(b.weightKg), skeletalMuscleKg: num(b.skeletalMuscleKg), bodyFatPct: num(b.bodyFatPct), note: b.note || '' };
    s.body = s.body.filter((x) => x.date !== b.date);
    s.body.push(entry);
    s.body.sort((a, c) => a.date.localeCompare(c.date));
    persist();
  },

  async deleteBody(date) {
    store.state.body = store.state.body.filter((x) => x.date !== date);
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
