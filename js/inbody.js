// 인바디(InBody) 앱 내보내기 CSV 파서 (순수 로직).
// 헤더 예: 날짜,측정장비,체중(kg),골격근량(kg),근육량(kg),체지방량(kg),BMI(kg/m²),체지방률(%),기초대사량(kcal),...
// 값이 '-' 이거나 비면 해당 항목 없음으로 처리. 날짜는 YYYYMMDDHHMMSS → 'YYYY-MM-DD'.

// 헤더(괄호/공백 제거한 기본명) → 저장 필드 키
const HEADER_MAP = {
  '날짜': 'date',
  '체중': 'weightKg',
  '골격근량': 'skeletalMuscleKg',
  '근육량': 'muscleMassKg',
  '체지방량': 'fatMassKg',
  'BMI': 'bmi',
  '체지방률': 'bodyFatPct',
  '기초대사량': 'bmr',
  '인바디점수': 'inbodyScore',
  '복부지방률': 'whr',
  '내장지방레벨': 'visceralFat',
  '체수분': 'bodyWaterL',
  '단백질': 'proteinKg',
  '무기질': 'mineralKg',
  'SMI': 'smi',
};

// 표시용 라벨(항목 늘리기 UI에서 사용)
export const INBODY_METRICS = [
  { key: 'weightKg', label: '체중', unit: 'kg' },
  { key: 'skeletalMuscleKg', label: '골격근량', unit: 'kg' },
  { key: 'bodyFatPct', label: '체지방률', unit: '%' },
  { key: 'fatMassKg', label: '체지방량', unit: 'kg' },
  { key: 'bmi', label: 'BMI', unit: '' },
  { key: 'bmr', label: '기초대사량', unit: 'kcal' },
  { key: 'inbodyScore', label: '인바디점수', unit: '점' },
  { key: 'visceralFat', label: '내장지방레벨', unit: '' },
  { key: 'whr', label: '복부지방률', unit: '' },
  { key: 'bodyWaterL', label: '체수분', unit: 'L' },
  { key: 'proteinKg', label: '단백질', unit: 'kg' },
  { key: 'mineralKg', label: '무기질', unit: 'kg' },
  { key: 'muscleMassKg', label: '근육량', unit: 'kg' },
  { key: 'smi', label: 'SMI', unit: '' },
];

function baseName(h) {
  return h.replace(/\(.*\)/, '').replace(/\s+/g, ' ').trim();
}
function cleanNum(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === '' || s === '-') return null;
  const n = Number(s);
  return isNaN(n) ? null : n;
}
function parseInbodyDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  const m = s.match(/^(\d{4})(\d{2})(\d{2})/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const mm = +mo, dd = +d;
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
  return `${y}-${mo}-${d}`;
}

// CSV 텍스트 → [{ date, weightKg, ... }] (오름차순)
export function parseInbodyCsv(text) {
  const lines = String(text).split(/\r?\n/).filter((l) => l.trim() !== '');
  if (lines.length < 2) return [];
  const headers = lines[0].split(',');
  const idx = {}; // fieldKey → 컬럼 인덱스
  headers.forEach((h, i) => {
    const key = HEADER_MAP[baseName(h)];
    if (key && idx[key] == null) idx[key] = i;
  });
  if (idx.date == null) return [];

  const out = [];
  for (let li = 1; li < lines.length; li++) {
    const cols = lines[li].split(',');
    const date = parseInbodyDate(cols[idx.date]);
    if (!date) continue;
    const entry = { date };
    let hasData = false;
    for (const [key, i] of Object.entries(idx)) {
      if (key === 'date') continue;
      const v = cleanNum(cols[i]);
      if (v != null) { entry[key] = v; hasData = true; }
    }
    if (hasData) out.push(entry);
  }
  // 같은 날짜 중복 시 뒤 항목 우선(마지막 측정) — 정렬 후 중복 제거
  out.sort((a, b) => a.date.localeCompare(b.date));
  const byDate = new Map();
  for (const e of out) byDate.set(e.date, { ...(byDate.get(e.date) || {}), ...e });
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
