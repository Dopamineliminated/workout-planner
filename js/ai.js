// 선택적 Claude API 연동 — 내장 알고리즘이 만든 기본 루틴을 더 정교하게 다듬는다.
// 브라우저에서 fetch로 Anthropic Messages API를 직접 호출(direct-browser-access).
// API 키는 사용자 브라우저(localStorage)에만 존재하며, 실패 시 store.js가 기존 루틴을 유지한다.

import { EXERCISES, MUSCLE_LABELS } from './exercises.js';
import { WEEKDAYS, WEEKDAY_LABELS, GOAL_LABELS } from './templates.js';
import { ageFromBirth } from './core-util.js';

const API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';

// 응답 JSON 스키마(구조화 출력) — 항상 파싱 가능한 JSON을 보장.
const EXERCISE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    muscle: { type: 'string' },
    kind: { type: 'string', enum: ['compound', 'isolation'] },
    sets: { type: 'integer' },
    repMin: { type: 'integer' },
    repMax: { type: 'integer' },
    restSec: { type: 'integer' },
    weightKg: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    bodyweight: { type: 'boolean' },
    note: { type: 'string' },
  },
  required: ['id', 'name', 'muscle', 'kind', 'sets', 'repMin', 'repMax', 'restSec', 'weightKg', 'bodyweight', 'note'],
};
const DAY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    type: { type: 'string', enum: ['workout', 'rest'] },
    label: { type: 'string' },
    focus: { type: 'array', items: { type: 'string' } },
    exercises: { type: 'array', items: EXERCISE_SCHEMA },
  },
  required: ['type', 'label', 'focus', 'exercises'],
};
const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    days: {
      type: 'object',
      additionalProperties: false,
      properties: Object.fromEntries(WEEKDAYS.map((d) => [d, DAY_SCHEMA])),
      required: [...WEEKDAYS],
    },
    notes: { type: 'string' },
  },
  required: ['days', 'notes'],
};

function catalogText() {
  return EXERCISES.map((e) => `${e.id} | ${e.name} | ${MUSCLE_LABELS[e.muscle] || e.muscle} | ${e.kind}${e.bodyweight ? ' | 자중' : ''}`).join('\n');
}

const SYSTEM_PROMPT = `당신은 근거 기반으로 훈련 프로그램을 설계하는 전문 퍼스널 트레이너입니다.
사용자의 프로필·목표와, 알고리즘이 만든 기본 주간 루틴을 검토해 더 균형 잡히고 효과적인 루틴으로 다듬으세요.

원칙:
- 점진적 과부하, 근육군 균형, 회복(같은 근육군 연속일 지양), 목표(근비대/근력/감량/지구력/유지)에 맞는 세트·반복·휴식.
- 주어진 운동 카탈로그의 id만 사용하세요. 카탈로그에 없는 운동은 만들지 마세요.
- 사용자의 장비 제약과 세션 시간(분)을 지키세요. 운동 수가 시간에 비해 많으면 줄이세요.
- 집중 근육이 있으면 해당 부위 볼륨을 우선 배분하세요.
- 7개 요일(mon~sun)을 모두 반환하세요. 훈련하지 않는 날은 type:"rest", exercises:[] 로.
- weightKg는 사용자가 아직 무게를 기록하지 않았으면 null 로 두세요(1주차).
- name은 카탈로그의 한글 이름을 그대로 사용하세요.
- notes에는 이번 다듬기에서 무엇을 왜 바꿨는지 한국어 2~3문장으로 요약하세요.`;

function buildUserMessage(profile, goals, routine) {
  const compactDays = {};
  for (const wd of WEEKDAYS) {
    const d = routine.days[wd];
    compactDays[wd] = d.type !== 'workout'
      ? { type: 'rest', exercises: [] }
      : {
          type: 'workout', label: d.label,
          exercises: d.exercises.map((e) => ({
            id: e.id, name: e.name, muscle: e.muscle, kind: e.kind,
            sets: e.sets, repMin: e.repMin, repMax: e.repMax, restSec: e.restSec,
            weightKg: e.weightKg, bodyweight: !!e.bodyweight,
          })),
        };
  }
  const age = ageFromBirth(profile.birthDate);
  const volMap = { beginner: '적게', intermediate: '표준', advanced: '많이' };
  const equipMap = { gym: '헬스장(전체)', barbell: '바벨/랙', dumbbell: '덤벨', machine_cable: '머신·케이블', bodyweight: '맨몸', outdoor_cardio: '야외 러닝/유산소' };
  const equipStr = (Array.isArray(profile.equipment) ? profile.equipment : [profile.equipment]).map((e) => equipMap[e] || e).join(', ');
  return `# 사용자 프로필
- 성별/나이: ${profile.sex || '-'} / ${age != null ? age + '세' : '-'}
- 키/몸무게: ${profile.heightCm || '-'}cm / ${profile.weightKg || '-'}kg
- 운동량(볼륨) 성향: ${volMap[profile.experience] || profile.experience}
- 주당 운동일수: ${profile.daysPerWeek}일
- 1회 세션 시간: ${profile.sessionMinutes}분
- 보유 장비: ${equipStr}

# 목표
- 주 목표: ${GOAL_LABELS[goals.primaryGoal] || goals.primaryGoal}
- 분할: ${goals.split}
- 진행 속도: ${goals.progression}

# 운동 카탈로그 (id | 이름 | 부위 | 유형)
${catalogText()}

# 알고리즘 기본 루틴 (요일별)
${JSON.stringify(compactDays, null, 2)}

위 기본 루틴을 검토하고 개선된 주간 루틴을 스키마에 맞춰 JSON으로 반환하세요. 유산소는 앱이 별도로 처방하므로 근력 운동 위주로만 구성하세요.`;
}

// 응답을 우리 루틴 형식으로 정규화(누락 필드 보정, 라벨 재계산).
function normalize(aiDays, baseRoutine) {
  const days = {};
  for (const wd of WEEKDAYS) {
    const d = aiDays[wd] || { type: 'rest', exercises: [] };
    if (d.type !== 'workout' || !Array.isArray(d.exercises) || d.exercises.length === 0) {
      days[wd] = { type: 'rest', label: '휴식', dayLabel: WEEKDAY_LABELS[wd], focus: [], exercises: [] };
      continue;
    }
    const exercises = d.exercises.map((e) => ({
      id: e.id,
      name: e.name,
      muscle: e.muscle,
      muscleLabel: MUSCLE_LABELS[e.muscle] || e.muscle,
      kind: e.kind === 'compound' ? 'compound' : 'isolation',
      bodyweight: !!e.bodyweight,
      timed: false,
      sets: clampInt(e.sets, 1, 8, 3),
      repMin: clampInt(e.repMin, 1, 30, 8),
      repMax: clampInt(e.repMax, e.repMin || 1, 40, 12),
      restSec: clampInt(e.restSec, 20, 300, 90),
      weightKg: e.weightKg == null ? null : Number(e.weightKg),
      note: e.note || '',
    }));
    days[wd] = {
      type: 'workout',
      sessionType: baseRoutine.days[wd] ? baseRoutine.days[wd].sessionType : undefined,
      label: d.label || (baseRoutine.days[wd] ? baseRoutine.days[wd].label : '운동'),
      dayLabel: WEEKDAY_LABELS[wd],
      focus: [...new Set(exercises.map((x) => x.muscleLabel))],
      estMinutes: estMinutes(exercises),
      exercises,
    };
  }
  return days;
}

function clampInt(v, lo, hi, dflt) {
  const n = Math.round(Number(v));
  if (isNaN(n)) return dflt;
  return Math.max(lo, Math.min(hi, n));
}
function estMinutes(exs) {
  let s = 8 * 60;
  for (const e of exs) s += e.sets * (e.restSec + Math.max(20, e.repMax * 3));
  return Math.round(s / 60);
}

export async function refineRoutine({ apiKey, model, profile, goals, routine }) {
  if (!apiKey) throw new Error('API 키가 설정되지 않았습니다.');

  const body = {
    model: model || 'claude-opus-4-8',
    max_tokens: 8000,
    thinking: { type: 'adaptive' },
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(profile, goals, routine) }],
    output_config: {
      effort: 'high',
      format: { type: 'json_schema', schema: RESPONSE_SCHEMA },
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90000);
  let res;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
        // 브라우저에서 직접 호출 허용(정적 사이트). 키는 사용자 브라우저에만 존재.
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    let msg = `Anthropic API 오류 (${res.status})`;
    try { const j = JSON.parse(errText); if (j.error && j.error.message) msg += `: ${j.error.message}`; } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  if (data.stop_reason === 'refusal') throw new Error('모델이 요청을 거부했습니다.');

  const textBlock = (data.content || []).find((b) => b.type === 'text');
  if (!textBlock || !textBlock.text) throw new Error('모델 응답에서 JSON을 찾지 못했습니다.');

  let parsed;
  try { parsed = JSON.parse(textBlock.text); }
  catch { throw new Error('모델 응답 JSON 파싱 실패.'); }
  if (!parsed || !parsed.days) throw new Error('모델 응답 형식이 올바르지 않습니다.');

  const days = normalize(parsed.days, routine);
  const hasWorkout = WEEKDAYS.some((wd) => days[wd].type === 'workout');
  if (!hasWorkout) throw new Error('개선된 루틴에 운동일이 없습니다.');

  return {
    routine: {
      ...routine,
      method: 'ai',
      generatedAt: new Date().toISOString(),
      aiNotes: parsed.notes || '',
      days,
    },
    usage: data.usage || null,
  };
}
