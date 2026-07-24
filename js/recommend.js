// 인바디 결과 기반 추천 목표 (순수 로직, 규칙 기반).
// 입력: { sex:'남'|'여'|'', heightCm:number|null, entries:[{date,weightKg,skeletalMuscleKg,bodyFatPct}] (오름차순) }
// 출력: { goal, label, reason, metrics } 또는 { goal:null, reason }
import { GOAL_LABELS } from './templates.js';
import { round1 } from './core-util.js';

function num(v) { if (v === '' || v == null) return null; const n = Number(v); return isNaN(n) ? null : n; }
function fmtSigned(x) { return (x > 0 ? '+' : '') + round1(x); }

export function recommendGoal({ sex, heightCm, entries } = {}) {
  const valid = (entries || []).filter(
    (e) => e && (num(e.weightKg) != null || num(e.bodyFatPct) != null || num(e.skeletalMuscleKg) != null)
  );
  if (!valid.length) {
    return { goal: null, reason: '인바디 값을 하나 이상 입력하면 추천해 드려요.' };
  }

  const latest = valid[valid.length - 1];
  const first = valid[0];
  const female = sex === '여';

  const bf = num(latest.bodyFatPct);
  const smm = num(latest.skeletalMuscleKg);
  const wt = num(latest.weightKg);
  const h = num(heightCm);
  const bmi = (wt && h) ? wt / Math.pow(h / 100, 2) : null;

  const n = valid.length;
  const dBF = n >= 2 ? diff(latest.bodyFatPct, first.bodyFatPct) : null;
  const dSMM = n >= 2 ? diff(latest.skeletalMuscleKg, first.skeletalMuscleKg) : null;

  // 체지방률 기준(대략): 남성 20%↑ 높음 / 14%↓ 낮음, 여성 28%↑ / 22%↓
  const bfHigh = female ? 28 : 20;
  const bfLow = female ? 22 : 14;
  const bfMid = female ? 25 : 17;

  const reasons = [];
  let goal;

  if (bf != null && bf >= bfHigh) {
    goal = 'fatloss';
    reasons.push(`체지방률 ${bf}%로 ${female ? '여성' : '남성'} 기준 다소 높은 편이에요.`);
    if (dBF != null && dBF > 0.5) reasons.push(`최근 체지방률이 ${fmtSigned(dBF)}%p 오르는 추세.`);
  } else if (bmi != null && bmi >= 25 && (bf == null || bf >= bfLow)) {
    goal = 'fatloss';
    reasons.push(`BMI ${bmi.toFixed(1)}로 과체중 범위예요.`);
  } else if ((bf != null && bf <= bfLow) || (bmi != null && bmi < 20)) {
    goal = 'hypertrophy';
    if (bf != null) reasons.push(`체지방률 ${bf}%로 낮은 편 — 근육량을 늘릴 여지가 커요.`);
    if (bmi != null && bmi < 20) reasons.push(`BMI ${bmi.toFixed(1)}로 마른 편이에요.`);
  } else if (dSMM != null && dSMM <= -0.4) {
    goal = 'hypertrophy';
    reasons.push(`골격근량이 ${fmtSigned(dSMM)}kg 줄어드는 추세 — 근육을 되찾는 데 집중하는 게 좋아요.`);
  } else if (dBF != null && dBF >= 1) {
    goal = 'fatloss';
    reasons.push(`체지방률이 ${fmtSigned(dBF)}%p 오르는 추세예요.`);
  } else if (bf != null && bf >= bfMid) {
    goal = 'fatloss';
    reasons.push(`체지방률 ${bf}%로 약간의 감량 여지가 있어요.`);
  } else {
    goal = 'hypertrophy';
    reasons.push('체성분이 양호한 편 — 근육량을 늘리며 체형을 다듬기 좋아요.');
  }

  const cardioHint = goal === 'fatloss'
    ? ' 유산소를 주 3~4회 병행하면 감량이 빨라져요.'
    : ' 유산소는 회복에 지장 없게 가볍게(주 2회 정도) 곁들이면 좋아요.';

  return {
    goal,
    label: GOAL_LABELS[goal] || goal,
    reason: reasons.join(' ') + cardioHint,
    metrics: { bf, smm, wt, bmi: bmi != null ? round1(bmi) : null, dBF, dSMM, samples: n },
  };
}

function diff(a, b) {
  const x = num(a), y = num(b);
  if (x == null || y == null) return null;
  return round1(x - y);
}
