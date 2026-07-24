// 프론트엔드 공용 유틸: DOM/문자열/날짜 + 간단한 SVG 라인차트.

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export function esc(s) {
  if (s == null) return '';
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function qs(sel, root = document) { return root.querySelector(sel); }
export function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }

export function todayKey() {
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date().getDay()];
}

export function parseISO(s) {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function addDays(iso, n) {
  const d = parseISO(iso); d.setDate(d.getDate() + n); return toISO(d);
}
// 루틴 시작일(월요일) + 요일 오프셋 → 실제 날짜
export function dayDate(startDate, dayKey) {
  const off = WEEKDAYS.indexOf(dayKey);
  return addDays(startDate, off < 0 ? 0 : off);
}
export function fmtDate(iso) {
  if (!iso) return '';
  const d = parseISO(iso);
  const wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `${d.getMonth() + 1}/${d.getDate()}(${wd})`;
}
export function todayISO() { return toISO(new Date()); }

// 간단 토스트 알림
let toastTimer = null;
export function toast(msg, kind = 'info') {
  let box = qs('#toast');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast';
    document.body.appendChild(box);
  }
  box.textContent = msg;
  box.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { box.className = 'toast'; }, 2800);
}

// SVG 라인차트 문자열 생성.
// labels: string[], values: (number|null)[], opts: { unit, color }
export function lineChart(labels, values, opts = {}) {
  const W = 640, H = 220, padL = 44, padR = 16, padT = 16, padB = 28;
  const pts = values.map((v, i) => ({ v, i })).filter((p) => p.v != null && !isNaN(p.v));
  if (pts.length === 0) return '<div class="chart-empty">데이터가 없습니다.</div>';

  const color = opts.color || '#e75fa0';
  const vals = pts.map((p) => p.v);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.1; min -= pad; max += pad;

  const n = values.length;
  const x = (i) => padL + (n <= 1 ? 0 : (i / (n - 1)) * (W - padL - padR));
  const y = (v) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB);

  const line = pts.map((p, k) => `${k === 0 ? 'M' : 'L'} ${x(p.i).toFixed(1)} ${y(p.v).toFixed(1)}`).join(' ');
  const dots = pts.map((p) => `<circle cx="${x(p.i).toFixed(1)}" cy="${y(p.v).toFixed(1)}" r="3.5" fill="${color}"><title>${esc(labels[p.i])}: ${p.v}${esc(opts.unit || '')}</title></circle>`).join('');

  // y축 눈금(3개)
  const ticks = [min + (max - min) * 0.1, (min + max) / 2, max - (max - min) * 0.1];
  const gridY = ticks.map((t) => {
    const yy = y(t).toFixed(1);
    return `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" stroke="var(--border)" stroke-dasharray="3 3"/>` +
      `<text x="${padL - 6}" y="${(+yy + 4).toFixed(1)}" text-anchor="end" class="chart-axis">${t.toFixed(1)}</text>`;
  }).join('');

  const firstL = esc(labels[pts[0].i]);
  const lastL = esc(labels[pts[pts.length - 1].i]);

  return `<svg viewBox="0 0 ${W} ${H}" class="chart" preserveAspectRatio="xMidYMid meet">
    ${gridY}
    <path d="${line}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>
    ${dots}
    <text x="${padL}" y="${H - 8}" class="chart-axis" text-anchor="start">${firstL}</text>
    <text x="${W - padR}" y="${H - 8}" class="chart-axis" text-anchor="end">${lastL}</text>
  </svg>`;
}
