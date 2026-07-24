// 공용 유틸: 날짜, 반올림.

export function pad2(n) { return String(n).padStart(2, '0'); }

// Date → 'YYYY-MM-DD' (로컬 기준)
export function toISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseISODate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(isoOrDate, days) {
  const d = typeof isoOrDate === 'string' ? parseISODate(isoOrDate) : new Date(isoOrDate);
  d.setDate(d.getDate() + days);
  return d;
}

// 기준일(오늘 포함) 이후의 다음 월요일. 오늘이 월요일이면 오늘.
export function nextMonday(from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const day = d.getDay(); // 0=일 .. 1=월
  const delta = (1 - day + 7) % 7; // 월요일까지 남은 일수
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

// 헬스장 원판 단위(1.25kg)로 반올림
export function roundToPlate(kg, step = 1.25) {
  if (kg == null || isNaN(kg)) return kg;
  return Math.round(kg / step) * step;
}

export function round1(n) {
  return Math.round(n * 10) / 10;
}
