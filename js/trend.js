// 인바디 추세 분석 (순수 로직). 최근 두 측정값으로 다음 주 강도(무게 증량폭·유산소)를 조정.
// intensityFactor: 무게 증량 스텝에 곱하는 배수. cardioNudge: 유산소 방향(+1 강화 / -1 완화).
import { round1 } from './core-util.js';

function num(v) { if (v === '' || v == null) return null; const n = Number(v); return isNaN(n) ? null : n; }
function fmtSigned(x) { return (x > 0 ? '+' : '') + round1(x); }

export function bodyTrend(entries) {
  const list = (entries || []).filter(
    (e) => e && (num(e.skeletalMuscleKg) != null || num(e.bodyFatPct) != null)
  );
  if (list.length < 2) {
    return { status: 'none', note: '', intensityFactor: 1, cardioNudge: 0, dMuscle: null, dFat: null };
  }
  const latest = list[list.length - 1];
  const prev = list[list.length - 2];
  const dMuscle = (num(latest.skeletalMuscleKg) != null && num(prev.skeletalMuscleKg) != null)
    ? round1(num(latest.skeletalMuscleKg) - num(prev.skeletalMuscleKg)) : null;
  const dFat = (num(latest.bodyFatPct) != null && num(prev.bodyFatPct) != null)
    ? round1(num(latest.bodyFatPct) - num(prev.bodyFatPct)) : null;

  const fatUp = dFat != null && dFat >= 0.5;

  // 1) 골격근량 감소 → 회복 우선(증량 완만 + 유산소 완화)
  if (dMuscle != null && dMuscle <= -0.3) {
    return {
      status: 'muscle_loss', dMuscle, dFat, intensityFactor: 0.5, cardioNudge: -1,
      note: `골격근량 ${fmtSigned(dMuscle)}kg — 무게는 무리하지 말고 회복·단백질 섭취에 신경 쓰세요.`,
    };
  }
  // 2) 골격근량 증가 & 체지방 안 늘어남 → 잘 되는 중(조금 더 push)
  if (dMuscle != null && dMuscle >= 0.2 && !fatUp) {
    return {
      status: 'progress', dMuscle, dFat, intensityFactor: 1.2, cardioNudge: 0,
      note: `골격근량 ${fmtSigned(dMuscle)}kg${dFat != null && dFat <= -0.3 ? `, 체지방 ${fmtSigned(dFat)}%p` : ''} — 잘 되고 있어요. 무게를 조금 더 올려봅니다.`,
    };
  }
  // 3) 체지방 증가 → 유산소 강화
  if (fatUp) {
    return {
      status: 'fat_gain', dMuscle, dFat, intensityFactor: 1, cardioNudge: 1,
      note: `체지방률 ${fmtSigned(dFat)}%p — 유산소를 강화합니다.`,
    };
  }
  return { status: 'stable', dMuscle, dFat, intensityFactor: 1, cardioNudge: 0, note: '체성분 큰 변화 없음 — 표준 진행.' };
}
