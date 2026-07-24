// 앱 진입점: 상태 로드 → 라우팅 → 뷰 렌더링 → 이벤트 연결.
import { api, store } from './store.js';
import {
  WEEKDAYS, esc, qs, qsa, todayKey, dayDate, addDays, fmtDate, todayISO, toast, lineChart,
} from './util.js';
import { recommendGoal } from './recommend.js';
import { ageFromBirth } from './core-util.js';
import { parseInbodyCsv } from './inbody.js';
import { EXERCISES, getExercise, MUSCLE_LABELS, MUSCLE_ORDER } from './exercises.js';

// 체성분 그래프에 쓸 지표 정의(데이터가 있는 항목만 탭으로 표시)
const BODY_METRICS = [
  { key: 'weightKg', label: '체중', unit: 'kg', color: '#e2703a' },
  { key: 'skeletalMuscleKg', label: '골격근량', unit: 'kg', color: '#3a86c8' },
  { key: 'bodyFatPct', label: '체지방률', unit: '%', color: '#6b8e23' },
  { key: 'fatMassKg', label: '체지방량', unit: 'kg', color: '#c1666b' },
  { key: 'bmi', label: 'BMI', unit: '', color: '#7d6ba0' },
  { key: 'bmr', label: '기초대사량', unit: 'kcal', color: '#c98a3a' },
  { key: 'inbodyScore', label: '인바디점수', unit: '점', color: '#2f9e57' },
  { key: 'visceralFat', label: '내장지방', unit: 'lv', color: '#b5651d' },
  { key: 'bodyWaterL', label: '체수분', unit: 'L', color: '#3aa0a0' },
  { key: 'proteinKg', label: '단백질', unit: 'kg', color: '#8a6d3b' },
];

const NAV = [
  { view: 'dashboard', label: '대시보드' },
  { view: 'routine', label: '루틴' },
  { view: 'log', label: '기록' },
  { view: 'body', label: '체성분' },
  { view: 'settings', label: '설정' },
];

// UI 로컬 상태
let logDay = null;        // 기록 뷰에서 선택된 요일
let bodyMetric = 'weightKg';
let pendingAdjust = null; // 다음 주 생성 직후 표시할 조정 내역
let inbodyStaged = null;  // 설정에서 업로드한 인바디 CSV(저장 시 체성분으로 가져옴)

// ---------- 부트스트랩 ----------
init();
async function init() {
  buildShell();
  try { await api.load(); } catch (e) { toast('상태 로드 실패: ' + e.message, 'error'); }
  window.addEventListener('hashchange', render);
  render();
}

function buildShell() {
  document.body.innerHTML = `
    <header class="topbar">
      <div class="brand">💪 헬스 루틴 플래너</div>
      <nav id="nav">${NAV.map((n) => `<button data-view="${n.view}">${n.label}</button>`).join('')}</nav>
    </header>
    <main id="app"></main>`;
  qs('#nav').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-view]');
    if (b) location.hash = '#' + b.dataset.view;
  });
  // 운동 이름 클릭 → 설명 모달 (전역 위임)
  document.body.addEventListener('click', (e) => {
    const el = e.target.closest('[data-exinfo]');
    if (el) { e.preventDefault(); openExerciseModal(el.dataset.exinfo); }
  });
}

function openExerciseModal(id) {
  const ex = getExercise(id);
  if (!ex) return;
  const kindLabel = ex.kind === 'compound' ? '다관절(복합)' : '단관절(고립)';
  const equipMap = { barbell: '바벨', dumbbell: '덤벨', machine: '머신', cable: '케이블', bodyweight: '맨몸' };
  const equip = (ex.equipment || []).map((q) => equipMap[q] || q).join('·');
  document.body.insertAdjacentHTML('beforeend', `
    <div class="modal-backdrop" id="ex-modal">
      <div class="modal">
        <button class="modal-close" id="ex-modal-close" aria-label="닫기">✕</button>
        <div class="card-eyebrow">${esc(MUSCLE_LABELS[ex.muscle] || ex.muscle)} · ${kindLabel}</div>
        <h2>${esc(ex.name)}</h2>
        <p>${esc(ex.desc || '설명이 준비 중이에요.')}</p>
        <p class="muted small">장비: ${esc(equip || '-')}${ex.bodyweight ? ' · 자중' : ''}</p>
      </div>
    </div>`);
  const modal = qs('#ex-modal');
  const close = () => { if (modal) modal.remove(); };
  qs('#ex-modal-close').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', function onKey(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } });
}

function setupComplete() {
  return store.state && store.state.profile && store.state.goals;
}

function render() {
  const app = qs('#app');
  const nav = qs('#nav');
  if (!setupComplete()) {
    nav.style.visibility = 'hidden';
    app.innerHTML = viewSetup('onboard');
    wireSetup('onboard');
    return;
  }
  nav.style.visibility = 'visible';

  let view = (location.hash || '#dashboard').slice(1);
  if (view === 'setup') { app.innerHTML = viewSetup('edit'); wireSetup('edit'); markNav(''); return; }
  if (!NAV.some((n) => n.view === view)) view = 'dashboard';
  markNav(view);

  const map = {
    dashboard: [viewDashboard, wireDashboard],
    routine: [viewRoutine, wireRoutine],
    log: [viewLog, wireLog],
    body: [viewBody, wireBody],
    settings: [viewSettings, wireSettings],
  };
  const [renderFn, wireFn] = map[view];
  app.innerHTML = renderFn();
  if (wireFn) wireFn();
  app.scrollTop = 0;
  window.scrollTo(0, 0);
}

function markNav(view) {
  qsa('#nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
}

// ---------- 라벨 헬퍼 ----------
function optLabel(listName, value) {
  const list = (store.meta && store.meta[listName]) || [];
  const found = list.find((o) => o.value === value);
  return found ? found.label : value;
}
function selectHtml(id, listName, selected, attrs = '') {
  const list = (store.meta && store.meta[listName]) || [];
  return `<select id="${id}" ${attrs}>${list.map((o) =>
    `<option value="${esc(o.value)}" ${o.value === selected ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
}

// ==================================================
//  설정(온보딩/수정) 뷰
// ==================================================
function viewSetup(mode) {
  const p = (store.state && store.state.profile) || {};
  const g = (store.state && store.state.goals) || {};
  const defStart = (store.meta && store.meta.defaultStartDate) || todayISO();

  return `
  <section class="setup">
    <h1>${mode === 'onboard' ? '시작하기 — 내 정보 입력' : '프로필 · 목표 수정'}</h1>
    <p class="lead">${mode === 'onboard'
      ? '입력한 정보를 분석해 요일별 맞춤 루틴을 만들어 드려요. 나중에 언제든 바꿀 수 있습니다.'
      : '값을 바꾼 뒤 저장하세요. 루틴을 새로 반영하려면 루틴 탭에서 “다시 생성”을 누르세요.'}</p>

    <div class="card">
      <h2>1. 프로필</h2>
      <div class="grid2">
        <label>이름(선택)<input id="f-name" value="${esc(p.name || '')}" placeholder="예: 종우"></label>
        <label>성별
          <select id="f-sex">
            <option value="" ${!p.sex ? 'selected' : ''}>선택 안 함</option>
            <option value="남" ${p.sex === '남' ? 'selected' : ''}>남</option>
            <option value="여" ${p.sex === '여' ? 'selected' : ''}>여</option>
          </select></label>
        <label>생년월일<input id="f-birth" type="date" value="${esc(p.birthDate || '')}" max="${todayISO()}"></label>
        <label>키(cm)<input id="f-height" type="number" inputmode="decimal" value="${p.heightCm ?? ''}" placeholder="cm"></label>
        <label>몸무게(kg)<input id="f-weight" type="number" inputmode="decimal" value="${p.weightKg ?? ''}" placeholder="kg"></label>
        <label>운동량(볼륨)${selectHtml('f-exp', 'volumes', p.experience || 'intermediate')}</label>
        <label>주당 운동일수
          <select id="f-days">${[...new Set([...(store.meta.daysOptions || [3]), p.daysPerWeek].filter(Boolean))].sort((a, b) => a - b).map((d) =>
            `<option value="${d}" ${p.daysPerWeek === d ? 'selected' : ''}>${d}일</option>`).join('')}</select></label>
        <label>1회 세션 시간(분)<input id="f-minutes" type="number" inputmode="numeric" value="${p.sessionMinutes ?? 60}"></label>
        <label>프로그램 시작일<input id="f-start" type="date" value="${esc(p.startDate || defStart)}"></label>
      </div>
      <div class="field">
        <span class="field-label">운동 요일 직접 지정 <span class="muted">(선택 — 체크하면 위 '주당 일수' 대신 이 요일로)</span></span>
        <div class="chips" id="f-days-custom">
          ${WEEKDAYS.map((wd) => `<label class="chip"><input type="checkbox" value="${wd}" ${(p.customDays || []).includes(wd) ? 'checked' : ''}>${(store.meta.weekdayLabels || {})[wd] || wd}</label>`).join('')}
        </div>
      </div>
      <div class="field">
        <span class="field-label">보유 장비 (여러 개 선택 가능)</span>
        <div class="chips" id="f-equip">
          ${(store.meta.equipments || []).map((o) => {
            const eq = Array.isArray(p.equipment) ? p.equipment : ['gym'];
            return `<label class="chip"><input type="checkbox" value="${o.value}" ${eq.includes(o.value) ? 'checked' : ''}>${esc(o.label)}</label>`;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="card">
      <h2>2. 목표 · 세부 설정</h2>
      <div class="grid2">
        <label>주 목표${selectHtml('f-goal', 'goals', g.primaryGoal || 'hypertrophy')}</label>
        <label>분할 방식${selectHtml('f-split', 'splits', g.split || 'auto')}</label>
        <label>진행 속도${selectHtml('f-prog', 'progressions', g.progression || 'standard')}</label>
      </div>
      <details class="reco">
        <summary>🤔 목표를 잘 모르겠다면 — 인바디로 추천받기</summary>
        <p class="muted small">인바디 CSV를 올리거나 결과를 직접 입력하면 추천 목표를 알려드려요(많을수록 추세 반영). 입력값은 체성분 기록에도 함께 저장돼요.</p>
        <div class="actions">
          <label class="btn ghost sm import-label">📄 인바디 CSV 올리기<input type="file" id="reco-csv" accept=".csv,text/csv" hidden></label>
        </div>
        <div id="reco-rows"></div>
        <div class="actions">
          <button type="button" id="reco-add" class="ghost sm">＋ 결과 추가</button>
          <button type="button" id="reco-run" class="ghost sm">추천 받기</button>
        </div>
        <div id="reco-result"></div>
      </details>
    </div>

    ${renderAvailableExercises(p)}

    <div class="actions">
      <button id="setup-save" class="primary">${mode === 'onboard' ? '분석하고 루틴 만들기 →' : '저장'}</button>
      ${mode === 'edit' ? '<button id="setup-cancel" class="ghost">취소</button>' : ''}
    </div>
  </section>`;
}

function renderAvailableExercises(p) {
  const excluded = new Set(p.excludedExercises || []);
  const groups = MUSCLE_ORDER.map((m) => {
    const list = EXERCISES.filter((e) => e.muscle === m);
    if (!list.length) return '';
    const items = list.map((e) => `
      <label class="avail-item">
        <input type="checkbox" class="avail-cb" value="${esc(e.id)}" ${excluded.has(e.id) ? '' : 'checked'}>
        <span class="avail-text"><b>${esc(e.name)}</b><span class="avail-desc">${esc(e.desc || '')}</span></span>
      </label>`).join('');
    return `<div class="avail-group"><div class="avail-muscle">${esc(MUSCLE_LABELS[m] || m)}</div>${items}</div>`;
  }).join('');
  return `<div class="card">
    <h2>3. 헬스장 가능 운동 <span class="muted small">(선택)</span></h2>
    <details class="reco avail">
      <summary>없는 기구·운동 빼기 / 운동 설명 보기</summary>
      <p class="muted small">기본은 전부 가능이에요. 우리 헬스장에 없는 기구나 안 할 운동만 체크를 해제하면 루틴에서 제외됩니다.</p>
      <div class="avail-actions">
        <button type="button" id="avail-all" class="ghost sm">전체 선택</button>
        <button type="button" id="avail-none" class="ghost sm">전체 해제</button>
      </div>
      ${groups}
    </details>
  </div>`;
}

function recoRowHtml() {
  return `<div class="reco-row">
    <input class="rc-date" type="date" max="${todayISO()}" title="측정일(선택)">
    <input class="rc-wt" type="number" inputmode="decimal" placeholder="체중kg">
    <input class="rc-smm" type="number" inputmode="decimal" placeholder="골격근kg">
    <input class="rc-bf" type="number" inputmode="decimal" placeholder="체지방%">
    <button type="button" class="rc-del" title="삭제">✕</button>
  </div>`;
}
function readRecoEntries() {
  return qsa('.reco-row')
    .map((row) => ({
      date: qs('.rc-date', row).value || todayISO(),
      weightKg: qs('.rc-wt', row).value,
      skeletalMuscleKg: qs('.rc-smm', row).value,
      bodyFatPct: qs('.rc-bf', row).value,
    }))
    .filter((e) => e.weightKg || e.skeletalMuscleKg || e.bodyFatPct)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function wireSetup(mode) {
  // 인바디 기반 목표 추천 패널
  inbodyStaged = null;
  const recoRows = qs('#reco-rows');
  if (recoRows) {
    recoRows.insertAdjacentHTML('beforeend', recoRowHtml());
    qs('#reco-add').addEventListener('click', () => {
      if (qsa('.reco-row', recoRows).length >= 4) { toast('최대 4개까지 입력할 수 있어요.'); return; }
      recoRows.insertAdjacentHTML('beforeend', recoRowHtml());
    });
    const recoCsv = qs('#reco-csv');
    if (recoCsv) recoCsv.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const entries = parseInbodyCsv(await file.text());
        if (!entries.length) { toast('인식할 인바디 데이터가 없어요.', 'error'); e.target.value = ''; return; }
        inbodyStaged = entries; // 저장 시 전체 항목을 체성분으로 가져옴
        recoRows.innerHTML = '';
        entries.slice(-4).forEach((en) => {
          recoRows.insertAdjacentHTML('beforeend', recoRowHtml());
          const row = recoRows.lastElementChild;
          qs('.rc-date', row).value = en.date;
          if (en.weightKg != null) qs('.rc-wt', row).value = en.weightKg;
          if (en.skeletalMuscleKg != null) qs('.rc-smm', row).value = en.skeletalMuscleKg;
          if (en.bodyFatPct != null) qs('.rc-bf', row).value = en.bodyFatPct;
        });
        toast(`인바디 ${entries.length}개 인식 · 추천 분석`, 'success');
        qs('#reco-run').click();
      } catch (err) { toast('CSV 읽기 실패: ' + err.message, 'error'); }
      e.target.value = '';
    });
    recoRows.addEventListener('click', (e) => {
      const del = e.target.closest('.rc-del');
      if (del && qsa('.reco-row', recoRows).length > 1) del.closest('.reco-row').remove();
    });
    qs('#reco-run').addEventListener('click', () => {
      const entries = readRecoEntries();
      const rec = recommendGoal({ sex: qs('#f-sex').value, heightCm: qs('#f-height').value, entries });
      const box = qs('#reco-result');
      if (!rec.goal) { box.innerHTML = `<p class="muted small">${esc(rec.reason)}</p>`; return; }
      box.innerHTML = `<div class="reco-out">
        <div><span class="reco-badge">추천 목표</span> <b>${esc(rec.label)}</b></div>
        <p class="muted small">${esc(rec.reason)}</p>
        <button type="button" id="reco-apply" class="primary sm">이 목표로 설정</button>
      </div>`;
      qs('#reco-apply').addEventListener('click', () => {
        qs('#f-goal').value = rec.goal;
        toast(`주 목표를 '${rec.label}'(으)로 설정했어요.`, 'success');
      });
    });
  }

  // 가능 운동 전체 선택/해제
  const availAll = qs('#avail-all'), availNone = qs('#avail-none');
  if (availAll) availAll.addEventListener('click', () => qsa('.avail-cb').forEach((c) => { c.checked = true; }));
  if (availNone) availNone.addEventListener('click', () => qsa('.avail-cb').forEach((c) => { c.checked = false; }));

  qs('#setup-save').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const profile = {
      name: qs('#f-name').value.trim(),
      sex: qs('#f-sex').value,
      birthDate: qs('#f-birth').value,
      heightCm: qs('#f-height').value,
      weightKg: qs('#f-weight').value,
      experience: qs('#f-exp').value,
      daysPerWeek: Number(qs('#f-days').value),
      sessionMinutes: qs('#f-minutes').value,
      equipment: qsa('#f-equip input:checked').map((c) => c.value),
      excludedExercises: qsa('.avail-cb:not(:checked)').map((c) => c.value),
      customDays: qsa('#f-days-custom input:checked').map((c) => c.value),
      startDate: qs('#f-start').value,
    };
    const goals = {
      primaryGoal: qs('#f-goal').value,
      split: qs('#f-split').value,
      progression: qs('#f-prog').value,
    };
    btn.disabled = true; btn.textContent = '저장 중…';
    try {
      await api.saveProfile(profile);
      await api.saveGoals(goals);
      // 추천 패널에 입력/업로드한 인바디 값을 체성분 기록에도 저장
      if (inbodyStaged && inbodyStaged.length) { try { await api.importBodyEntries(inbodyStaged); } catch {} }
      else { for (const en of readRecoEntries()) { try { await api.saveBody(en); } catch {} } }
      inbodyStaged = null;
      const hadRoutine = !!store.state.routine;
      if (mode === 'onboard' || !hadRoutine) {
        await api.generate(false);
        toast('루틴이 생성되었어요! 💪', 'success');
        location.hash = '#routine';
        if (location.hash === '#routine') render();
      } else {
        toast('저장되었어요. 루틴 탭에서 “다시 생성”으로 반영하세요.', 'success');
        location.hash = '#settings';
      }
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false; btn.textContent = '저장';
    }
  });

  const cancel = qs('#setup-cancel');
  if (cancel) cancel.addEventListener('click', () => { location.hash = '#settings'; });
}

// ==================================================
//  대시보드
// ==================================================
function viewDashboard() {
  const s = store.state;
  const p = s.profile, g = s.goals, r = s.routine;
  const name = p.name ? `${esc(p.name)}님, ` : '';
  const tk = todayKey();

  let todayCard = '';
  if (r) {
    const d = r.days[tk];
    const date = fmtDate(dayDate(r.startDate, tk));
    if (d && d.type === 'workout') {
      todayCard = `<div class="card today">
        <div class="card-eyebrow">오늘 · ${date}</div>
        <h2>${esc(d.label)}</h2>
        <div class="focus-tags">${d.focus.map((f) => `<span>${esc(f)}</span>`).join('')}</div>
        <p class="muted">${d.exercises.length}개 운동 · 약 ${d.estMinutes || '-'}분</p>
        <button class="primary" data-go="log" data-day="${tk}">오늘 운동 기록하기 →</button>
      </div>`;
    } else {
      todayCard = `<div class="card today rest">
        <div class="card-eyebrow">오늘 · ${date}</div>
        <h2>휴식일 😌</h2>
        <p class="muted">회복도 훈련의 일부예요. 가벼운 스트레칭이나 걷기를 추천해요.</p>
      </div>`;
    }
  }

  // 이번 주 그리드
  let weekGrid = '';
  if (r) {
    weekGrid = `<div class="card">
      <div class="card-eyebrow">${r.weekNumber}주차 · ${fmtDate(r.startDate)} 시작 · ${splitLabel(r.split)}</div>
      <h2>이번 주 계획</h2>
      <div class="week-grid">
        ${WEEKDAYS.map((wd) => {
          const d = r.days[wd];
          const done = dayDone(r.weekNumber, wd);
          const isToday = wd === tk;
          const cls = d.type === 'workout' ? 'workout' : 'rest';
          return `<button class="week-cell ${cls} ${done ? 'done' : ''} ${isToday ? 'today' : ''}" data-go="routine">
            <span class="wc-day">${dayLabel(wd)}</span>
            <span class="wc-label">${d.type === 'workout' ? esc(shortLabel(d.label)) : '휴식'}</span>
            ${done ? '<span class="wc-check">✓</span>' : ''}
          </button>`;
        }).join('')}
      </div>
    </div>`;
  }

  // 지난주 조정 요약
  let adjustCard = '';
  const lastHist = s.history && s.history.length ? s.history[s.history.length - 1] : null;
  if (lastHist && lastHist.summary) {
    const sm = lastHist.summary;
    adjustCard = `<div class="card">
      <div class="card-eyebrow">지난주 → 이번주 자동 조정</div>
      <h2>달성률 ${sm.adherence}%</h2>
      <div class="stat-row">
        <div class="stat up"><b>${sm.counts.up}</b><span>증량</span></div>
        <div class="stat hold"><b>${sm.counts.hold}</b><span>유지</span></div>
        <div class="stat down"><b>${sm.counts.down}</b><span>감량</span></div>
      </div>
      ${sm.volumeDeltaPct != null ? `<p class="muted small">총 볼륨 목표 ${sm.volumeDeltaPct >= 0 ? '+' : ''}${sm.volumeDeltaPct}% 조정</p>` : ''}
      ${sm.trend && sm.trend.note ? `<p class="muted small">📊 ${esc(sm.trend.note)}</p>` : ''}
    </div>`;
  }

  // 최근 체성분
  let bodyCard = '';
  if (s.body && s.body.length) {
    const b = s.body[s.body.length - 1];
    bodyCard = `<div class="card">
      <div class="card-eyebrow">최근 체성분 · ${fmtDate(b.date)}</div>
      <div class="stat-row">
        <div class="stat"><b>${b.weightKg ?? '-'}</b><span>체중 kg</span></div>
        <div class="stat"><b>${b.skeletalMuscleKg ?? '-'}</b><span>골격근 kg</span></div>
        <div class="stat"><b>${b.bodyFatPct ?? '-'}</b><span>체지방 %</span></div>
      </div>
      <button class="ghost" data-go="body">추이 보기 →</button>
    </div>`;
  }

  // 이번 주 유산소 진행
  let cardioMini = '';
  if (r && r.cardio) {
    const wk = weekCardioEntries(r);
    const mins = wk.reduce((a, x) => a + (Number(x.minutes) || 0), 0);
    const tCnt = r.cardio.perWeek, tMin = r.cardio.perWeek * r.cardio.minutes;
    const pct = tMin ? Math.min(100, Math.round((mins / tMin) * 100)) : 0;
    cardioMini = `<div class="card">
      <div class="card-eyebrow">🏃 이번 주 유산소</div>
      <h2>${wk.length}/${tCnt}회 · ${mins}/${tMin}분</h2>
      <div class="progress"><div class="progress-bar" style="width:${pct}%"></div></div>
      <button class="ghost" data-go="log">유산소 기록 →</button>
    </div>`;
  }

  return `
  <section class="dash">
    <h1>${name}오늘도 화이팅! 🔥</h1>
    <p class="lead">${goalLabel(g.primaryGoal)} · 주 ${p.daysPerWeek}회 · 볼륨 ${optLabel('volumes', p.experience)}</p>
    ${todayCard}
    ${weekGrid}
    <div class="grid2">
      ${cardioMini}
      ${adjustCard}
      ${bodyCard}
    </div>
    <div class="card cta">
      <h2>주가 끝났나요?</h2>
      <p class="muted">이번 주 기록을 바탕으로 다음 주 목표(무게·반복)를 자동으로 조정해 드려요.</p>
      <button id="btn-nextweek" class="primary">다음 주 루틴 생성 →</button>
    </div>
  </section>`;
}

function wireDashboard() {
  qsa('[data-go]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.day) logDay = b.dataset.day;
    location.hash = '#' + b.dataset.go;
  }));
  const nw = qs('#btn-nextweek');
  if (nw) nw.addEventListener('click', () => doNextWeek(nw));
}

async function doNextWeek(btn) {
  if (!confirm('이번 주를 마감하고 다음 주 루틴을 생성할까요?\n기록을 바탕으로 목표가 조정됩니다.')) return;
  btn.disabled = true; btn.textContent = '생성 중…';
  try {
    const res = await api.nextWeek();
    pendingAdjust = { changes: res.changes, summary: res.summary, week: res.summary.nextWeek };
    toast('다음 주 루틴이 준비됐어요!', 'success');
    location.hash = '#routine';
    if (location.hash === '#routine') render();
  } catch (e) {
    toast(e.message, 'error');
    btn.disabled = false; btn.textContent = '다음 주 루틴 생성 →';
  }
}

// ==================================================
//  루틴 뷰
// ==================================================
function viewRoutine() {
  const s = store.state;
  const r = s.routine;
  if (!r) return `<section><div class="card"><p>아직 루틴이 없습니다. 설정에서 정보를 입력하세요.</p></div></section>`;

  const methodBadge = { algorithm: '내장 알고리즘', progression: '자동 조정', ai: 'AI 다듬음' }[r.method] || r.method;

  let adjustBanner = '';
  if (pendingAdjust && pendingAdjust.week === r.weekNumber) {
    adjustBanner = renderAdjustBanner(pendingAdjust);
  }

  let aiNote = '';
  if (r.method === 'ai' && r.aiNotes) {
    aiNote = `<div class="card ai-note"><div class="card-eyebrow">🤖 AI 코멘트</div><p>${esc(r.aiNotes)}</p></div>`;
  }

  const days = WEEKDAYS.map((wd) => renderDayCard(r, wd)).join('');

  return `
  <section class="routine">
    <div class="page-head">
      <div>
        <h1>${r.weekNumber}주차 루틴</h1>
        <p class="lead">${fmtDate(r.startDate)} 시작 · ${splitLabel(r.split)} · <span class="badge">${methodBadge}</span></p>
      </div>
    </div>
    <div class="toolbar">
      <button id="btn-regen" class="ghost">🔀 다시 생성</button>
      <button id="btn-ai" class="ghost">🤖 AI로 다듬기</button>
      <button id="btn-next" class="primary">다음 주 →</button>
    </div>
    ${adjustBanner}
    ${aiNote}
    ${renderCardioCard(r)}
    <div class="day-list">${days}</div>
  </section>`;
}

function renderCardioCard(r) {
  const c = r.cardio;
  if (!c) return '';
  return `<div class="card cardio-card">
    <div class="card-eyebrow">🏃 유산소 처방</div>
    <h2>주 ${c.perWeek}회 · 회당 ${c.minutes}분</h2>
    <p class="muted small"><b>강도</b> ${esc(c.intensity)}</p>
    <p class="muted small">${esc(c.note)} 기록은 <b>기록 탭</b>에서 남길 수 있어요.</p>
  </div>`;
}

function renderDayCard(r, wd) {
  const d = r.days[wd];
  const date = fmtDate(dayDate(r.startDate, wd));
  if (!d || d.type !== 'workout') {
    return `<div class="day-card rest"><div class="day-head"><span class="daybadge">${dayLabel(wd)} · ${date}</span><h3>휴식</h3></div></div>`;
  }
  const done = dayDone(r.weekNumber, wd);
  const rows = d.exercises.map((ex) => `
    <tr>
      <td class="ex-name"><span class="ex-info" data-exinfo="${esc(ex.id)}">${esc(ex.name)} <span class="ii">ⓘ</span></span><span class="ex-muscle">${esc(ex.muscleLabel || '')}</span></td>
      <td class="num">${ex.sets} × ${ex.repMin}-${ex.repMax}</td>
      <td class="num muted">${ex.restSec}s</td>
      <td class="num">${weightText(ex)}</td>
    </tr>`).join('');

  return `<div class="day-card workout ${done ? 'done' : ''}">
    <div class="day-head">
      <span class="daybadge">${dayLabel(wd)} · ${date}</span>
      <h3>${esc(d.label)}</h3>
      <span class="muted small">~${d.estMinutes || '-'}분${done ? ' · ✅ 완료' : ''}</span>
    </div>
    <div class="focus-tags">${(d.focus || []).map((f) => `<span>${esc(f)}</span>`).join('')}</div>
    <table class="ex-table">
      <thead><tr><th>운동</th><th class="num">세트×횟수</th><th class="num">휴식</th><th class="num">목표무게</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <button class="ghost sm" data-log="${wd}">✏️ 이 운동 기록하기</button>
  </div>`;
}

function renderAdjustBanner(pa) {
  const sm = pa.summary;
  const rows = pa.changes.filter((c) => c.type !== 'hold' || c.toWeight != null).slice(0, 40).map((c) => {
    const arrow = c.type === 'up' ? '▲' : c.type === 'down' ? '▼' : '→';
    return `<tr class="chg-${c.type}">
      <td>${dayLabel(c.dayKey)}</td>
      <td>${esc(c.name)}</td>
      <td class="num">${changeText(c)}</td>
      <td class="reason">${arrow} ${esc(c.reason)}</td>
    </tr>`;
  }).join('');
  return `<div class="card adjust-banner">
    <div class="card-eyebrow">${sm.prevWeek}주차 기록 반영 · 달성률 ${sm.adherence}%</div>
    <h2>이번 주 조정 내역</h2>
    <div class="stat-row">
      <div class="stat up"><b>${sm.counts.up}</b><span>증량</span></div>
      <div class="stat hold"><b>${sm.counts.hold}</b><span>유지</span></div>
      <div class="stat down"><b>${sm.counts.down}</b><span>감량</span></div>
    </div>
    ${sm.trend && sm.trend.note ? `<p class="muted small">📊 ${esc(sm.trend.note)}</p>` : ''}
    ${sm.cardio ? `<p class="muted small">🏃 유산소 ${cardioChangeText(sm.cardio)}</p>` : ''}
    <details><summary>운동별 변경 자세히 보기</summary>
      <table class="chg-table"><tbody>${rows || '<tr><td>변경 사항 없음</td></tr>'}</tbody></table>
    </details>
    <button class="ghost sm" id="dismiss-adjust">닫기</button>
  </div>`;
}

function cardioChangeText(c) {
  const arrow = c.type === 'up' ? '▲' : c.type === 'down' ? '▼' : '→';
  const changed = c.fromPerWeek !== c.toPerWeek || c.fromMin !== c.toMin;
  const body = changed
    ? `${c.fromPerWeek}회·${c.fromMin}분 → ${c.toPerWeek}회·${c.toMin}분`
    : `${c.toPerWeek}회·${c.toMin}분 유지`;
  return `${arrow} ${body} — ${esc(c.reason)}`;
}

function changeText(c) {
  const w = (v) => (v == null ? '자유' : v + 'kg');
  if (c.type === 'up' && c.fromWeight != null && c.toWeight != null && c.fromWeight !== c.toWeight)
    return `${w(c.fromWeight)} → ${w(c.toWeight)}`;
  if (c.type === 'down') return `${w(c.fromWeight)} → ${w(c.toWeight)}`;
  if (c.fromReps[1] !== c.toReps[1]) return `${c.toReps[0]}-${c.toReps[1]}회`;
  return w(c.toWeight);
}

function wireRoutine() {
  qs('#btn-regen') && qs('#btn-regen').addEventListener('click', async (e) => {
    if (!confirm('현재 주 루틴을 새로 생성할까요? (운동 구성이 바뀔 수 있어요)')) return;
    e.currentTarget.disabled = true; e.currentTarget.textContent = '생성 중…';
    try { await api.generate(true); pendingAdjust = null; render(); toast('새 루틴을 만들었어요.', 'success'); }
    catch (err) { toast(err.message, 'error'); render(); }
  });

  qs('#btn-ai') && qs('#btn-ai').addEventListener('click', async (e) => {
    if (!store.state.settings.hasApiKey) {
      toast('먼저 설정에서 Claude API 키를 입력하세요.', 'error');
      location.hash = '#settings'; return;
    }
    const btn = e.currentTarget;
    btn.disabled = true; btn.textContent = '🤖 다듬는 중… (최대 1~2분)';
    document.body.classList.add('busy');
    try {
      await api.aiRefine();
      pendingAdjust = null;
      toast('AI가 루틴을 다듬었어요!', 'success');
      render();
    } catch (err) {
      toast(err.message, 'error');
      btn.disabled = false; btn.textContent = '🤖 AI로 다듬기';
    } finally {
      document.body.classList.remove('busy');
    }
  });

  qs('#btn-next') && qs('#btn-next').addEventListener('click', (e) => doNextWeek(e.currentTarget));

  qsa('[data-log]').forEach((b) => b.addEventListener('click', () => {
    logDay = b.dataset.log; location.hash = '#log';
  }));

  const dis = qs('#dismiss-adjust');
  if (dis) dis.addEventListener('click', () => { pendingAdjust = null; render(); });
}

// ==================================================
//  기록 뷰
// ==================================================
function viewLog() {
  const s = store.state;
  const r = s.routine;
  if (!r) return `<section><div class="card"><p>먼저 루틴을 생성하세요.</p></div></section>`;

  const workoutDays = WEEKDAYS.filter((wd) => r.days[wd].type === 'workout');
  if (!workoutDays.includes(logDay)) {
    logDay = workoutDays.includes(todayKey()) ? todayKey() : workoutDays[0];
  }
  if (!logDay) return `<section><div class="card"><p>이번 주에 운동일이 없습니다.</p></div></section>`;

  const selector = `<div class="day-tabs">${workoutDays.map((wd) => {
    const done = dayDone(r.weekNumber, wd);
    return `<button class="day-tab ${wd === logDay ? 'active' : ''} ${done ? 'done' : ''}" data-day="${wd}">
      ${dayLabel(wd)}${done ? ' ✓' : ''}</button>`;
  }).join('')}</div>`;

  const d = r.days[logDay];
  const existing = s.logs[`${r.weekNumber}:${logDay}`];
  const byId = {};
  if (existing) for (const le of existing.exercises) byId[le.id] = le;

  const memW = store.state.exerciseWeights || {};
  const exBlocks = d.exercises.map((ex, exi) => {
    const prev = byId[ex.id];
    const targetW = ex.weightKg != null ? ex.weightKg : (memW[ex.id] != null ? memW[ex.id] : null);
    const rows = [];
    for (let si = 0; si < ex.sets; si++) {
      const ps = prev && prev.sets && prev.sets[si] ? prev.sets[si] : null;
      const wDefault = ps && ps.weight != null ? ps.weight : (targetW != null ? targetW : '');
      const rVal = ps && ps.reps != null ? ps.reps : '';
      rows.push(`<tr>
        <td class="setno">${si + 1}</td>
        <td class="target">${ex.repMax}회${targetW != null ? ' @' + targetW + 'kg' : ''}</td>
        <td><input class="in-reps" data-ex="${exi}" data-set="${si}" type="number" inputmode="numeric" value="${rVal}" placeholder="${ex.repMax}"></td>
        <td><input class="in-weight" data-ex="${exi}" data-set="${si}" type="number" inputmode="decimal" value="${wDefault}" placeholder="${ex.bodyweight ? '자중' : 'kg'}"></td>
      </tr>`);
    }
    return `<div class="log-ex" data-exid="${esc(ex.id)}" data-name="${esc(ex.name)}" data-kind="${ex.kind}" data-sets="${ex.sets}" data-repmin="${ex.repMin}" data-repmax="${ex.repMax}">
      <div class="log-ex-head"><b class="ex-info" data-exinfo="${esc(ex.id)}">${esc(ex.name)} <span class="ii">ⓘ</span></b> <span class="muted small">${ex.sets}세트 × ${ex.repMin}-${ex.repMax}회 · ${esc(ex.muscleLabel || '')}</span></div>
      <table class="log-table">
        <thead><tr><th>세트</th><th>목표</th><th>횟수</th><th>무게(kg)</th></tr></thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>`;
  }).join('');

  const date = fmtDate(dayDate(r.startDate, logDay));
  return `
  <section class="logview">
    <div class="page-head"><h1>운동 기록</h1><p class="lead">${r.weekNumber}주차</p></div>
    ${renderCardioLog(r)}
    ${selector}
    <div class="card">
      <div class="card-eyebrow">${dayLabel(logDay)} · ${date}</div>
      <h2>${esc(d.label)}</h2>
      <p class="muted small">각 세트의 실제 <b>횟수</b>와 <b>무게</b>를 입력하세요. 입력한 무게는 저장되어 다음 루틴 목표에 반영돼요. 빈칸은 미수행으로 처리됩니다.</p>
      ${exBlocks}
      <label class="note-field">메모<textarea id="log-note" placeholder="컨디션, 통증, 특이사항 등">${esc(existing ? existing.note : '')}</textarea></label>
      <div class="actions">
        <button id="log-fill" class="ghost">목표대로 전부 채우기</button>
        <button id="log-save" class="primary">기록 저장</button>
      </div>
    </div>
  </section>`;
}

function weekCardioEntries(r) {
  const start = r.startDate, end = addDays(start, 7); // util.addDays → ISO 문자열
  return (store.state.cardio || [])
    .filter((x) => x.date >= start && x.date < end)
    .sort((a, b) => a.date.localeCompare(b.date));
}

function renderCardioLog(r) {
  const c = r.cardio;
  const week = weekCardioEntries(r);
  const done = week.length;
  const mins = week.reduce((a, x) => a + (Number(x.minutes) || 0), 0);
  const tCnt = c ? c.perWeek : null;
  const tMin = c ? c.perWeek * c.minutes : null;
  const rows = week.map((x) => `<tr>
      <td>${fmtDate(x.date)}</td><td>${esc(x.type)}</td>
      <td class="num">${x.minutes}분</td>
      <td><button class="link-del" data-cardio-del="${esc(x.id)}">삭제</button></td>
    </tr>`).join('');
  return `<div class="card cardio-log">
    <div class="card-eyebrow">🏃 이번 주 유산소</div>
    <h2>${done}${tCnt ? '/' + tCnt : ''}회 · ${mins}분${tMin ? ` <span class="muted small">/ 목표 ${tMin}분</span>` : ''}</h2>
    ${c ? `<p class="muted small">처방: 주 ${c.perWeek}회 · 회당 ${c.minutes}분 · ${esc(c.intensity)}</p>` : ''}
    <div class="cardio-add">
      <input id="cd-date" type="date" value="${todayISO()}" max="${todayISO()}">
      ${selectHtml('cd-type', 'cardioTypes', '빠르게 걷기')}
      <input id="cd-min" type="number" inputmode="numeric" placeholder="분">
      <button id="cd-save" class="ghost sm">추가</button>
    </div>
    ${week.length ? `<div class="table-scroll"><table class="body-table"><tbody>${rows}</tbody></table></div>` : '<p class="muted small">아직 이번 주 유산소 기록이 없어요.</p>'}
  </div>`;
}

function wireLog() {
  qsa('.day-tab').forEach((b) => b.addEventListener('click', () => { logDay = b.dataset.day; render(); }));

  const cdSave = qs('#cd-save');
  if (cdSave) cdSave.addEventListener('click', async () => {
    try {
      await api.saveCardio({ date: qs('#cd-date').value, type: qs('#cd-type').value, minutes: qs('#cd-min').value });
      toast('유산소 기록을 추가했어요.', 'success');
      render();
    } catch (err) { toast(err.message, 'error'); }
  });
  qsa('[data-cardio-del]').forEach((b) => b.addEventListener('click', async () => {
    try { await api.deleteCardio(b.dataset.cardioDel); render(); } catch (err) { toast(err.message, 'error'); }
  }));

  const fill = qs('#log-fill');
  if (fill) fill.addEventListener('click', () => {
    qsa('.log-ex').forEach((block) => {
      const repMax = block.dataset.repmax;
      qsa('.in-reps', block).forEach((inp) => { if (!inp.value) inp.value = repMax; });
    });
    toast('목표대로 채웠어요. 실제와 다르면 수정하세요.');
  });

  const save = qs('#log-save');
  if (save) save.addEventListener('click', async (e) => {
    const r = store.state.routine;
    const exercises = qsa('.log-ex').map((block) => {
      const nSets = Number(block.dataset.sets);
      const sets = [];
      for (let si = 0; si < nSets; si++) {
        const reps = qs(`.in-reps[data-set="${si}"]`, block);
        const weight = qs(`.in-weight[data-set="${si}"]`, block);
        sets.push({ reps: reps.value, weight: weight.value });
      }
      return {
        id: block.dataset.exid,
        name: block.dataset.name,
        kind: block.dataset.kind,
        targetSets: nSets,
        repMin: Number(block.dataset.repmin),
        repMax: Number(block.dataset.repmax),
        sets,
      };
    });
    e.currentTarget.disabled = true; e.currentTarget.textContent = '저장 중…';
    try {
      await api.saveLog({ weekNumber: r.weekNumber, dayKey: logDay, note: qs('#log-note').value, exercises });
      const doneSets = exercises.reduce((a, ex) => a + ex.sets.filter((s) => Number(s.reps) > 0).length, 0);
      const totalSets = exercises.reduce((a, ex) => a + ex.sets.length, 0);
      toast(`저장 완료 · ${doneSets}/${totalSets} 세트 수행`, 'success');
      render();
    } catch (err) {
      toast(err.message, 'error');
      e.currentTarget.disabled = false; e.currentTarget.textContent = '기록 저장';
    }
  });
}

// ==================================================
//  체성분 뷰
// ==================================================
function viewBody() {
  const s = store.state;
  const body = s.body || [];
  const avail = BODY_METRICS.filter((d) => body.some((b) => b[d.key] != null));
  const metrics = avail.length ? avail : BODY_METRICS.slice(0, 3);
  const m = metrics.find((x) => x.key === bodyMetric) || metrics[0];
  const labels = body.map((b) => fmtDate(b.date));
  const values = body.map((b) => b[m.key]);

  const rows = body.slice().reverse().map((b) => `
    <tr>
      <td>${fmtDate(b.date)}</td>
      <td class="num">${b.weightKg ?? '-'}</td>
      <td class="num">${b.skeletalMuscleKg ?? '-'}</td>
      <td class="num">${b.bodyFatPct ?? '-'}</td>
      <td class="num">${b.fatMassKg ?? '-'}</td>
      <td class="num">${b.inbodyScore ?? '-'}</td>
      <td><button class="link-del" data-del="${esc(b.date)}">삭제</button></td>
    </tr>`).join('');

  return `
  <section class="bodyview">
    <div class="page-head"><h1>체성분 추이</h1><p class="lead">인바디 CSV를 가져오거나 값을 입력하면 여러 항목의 변화를 추적해요.</p></div>

    <div class="card">
      <h2>📄 인바디 CSV 가져오기</h2>
      <p class="muted small">인바디 앱에서 내보낸 CSV를 올리면 과거 기록과 여러 항목(체지방량·BMI·기초대사량·인바디점수·내장지방·체수분 등)을 한 번에 가져와요.</p>
      <div class="actions">
        <label class="btn primary import-label">파일 선택<input id="ib-import" type="file" accept=".csv,text/csv" hidden></label>
      </div>
    </div>

    <div class="card">
      <h2>직접 입력</h2>
      <div class="grid2">
        <label>날짜<input id="b-date" type="date" value="${todayISO()}" max="${todayISO()}"></label>
        <label>체중(kg)<input id="b-weightKg" type="number" inputmode="decimal" placeholder="kg"></label>
        <label>골격근량(kg)<input id="b-skeletalMuscleKg" type="number" inputmode="decimal" placeholder="kg"></label>
        <label>체지방률(%)<input id="b-bodyFatPct" type="number" inputmode="decimal" placeholder="%"></label>
        <label>체지방량(kg)<input id="b-fatMassKg" type="number" inputmode="decimal" placeholder="kg"></label>
        <label>BMI<input id="b-bmi" type="number" inputmode="decimal" placeholder="kg/m²"></label>
        <label>기초대사량(kcal)<input id="b-bmr" type="number" inputmode="numeric" placeholder="kcal"></label>
        <label>인바디점수<input id="b-inbodyScore" type="number" inputmode="numeric" placeholder="점"></label>
      </div>
      <label class="note-field">메모<input id="b-note" placeholder="선택"></label>
      <div class="actions"><button id="b-save" class="primary">저장</button></div>
    </div>

    <div class="card">
      <div class="metric-tabs">
        ${metrics.map((x) => `<button class="metric-tab ${x.key === m.key ? 'active' : ''}" data-metric="${x.key}">${x.label}</button>`).join('')}
      </div>
      ${lineChart(labels, values, { unit: m.unit, color: m.color })}
    </div>

    <div class="card">
      <h2>기록 (${body.length})</h2>
      <div class="table-scroll">
        <table class="body-table">
          <thead><tr><th>날짜</th><th class="num">체중</th><th class="num">골격근</th><th class="num">체지방%</th><th class="num">체지방kg</th><th class="num">점수</th><th></th></tr></thead>
          <tbody>${rows || '<tr><td colspan="7" class="muted">아직 기록이 없어요.</td></tr>'}</tbody>
        </table>
      </div>
    </div>
  </section>`;
}

const BODY_INPUT_FIELDS = ['weightKg', 'skeletalMuscleKg', 'bodyFatPct', 'fatMassKg', 'bmi', 'bmr', 'inbodyScore'];

function wireBody() {
  qsa('.metric-tab').forEach((b) => b.addEventListener('click', () => { bodyMetric = b.dataset.metric; render(); }));

  const imp = qs('#ib-import');
  if (imp) imp.addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const entries = parseInbodyCsv(await file.text());
      if (!entries.length) { toast('인식할 수 있는 인바디 데이터가 없어요. 파일을 확인해 주세요.', 'error'); e.target.value = ''; return; }
      const n = await api.importBodyEntries(entries);
      toast(`인바디 기록 ${n}개를 가져왔어요.`, 'success');
      render();
    } catch (err) {
      toast('CSV 읽기 실패: ' + err.message, 'error');
    }
    e.target.value = '';
  });

  qs('#b-save').addEventListener('click', async (e) => {
    const payload = { date: qs('#b-date').value, note: qs('#b-note').value };
    for (const f of BODY_INPUT_FIELDS) payload[f] = qs('#b-' + f).value;
    if (!payload.date) { toast('날짜를 입력하세요.', 'error'); return; }
    if (!BODY_INPUT_FIELDS.some((f) => payload[f])) { toast('값을 하나 이상 입력하세요.', 'error'); return; }
    e.currentTarget.disabled = true;
    try { await api.saveBody(payload); toast('저장했어요.', 'success'); render(); }
    catch (err) { toast(err.message, 'error'); e.currentTarget.disabled = false; }
  });

  qsa('[data-del]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('이 기록을 삭제할까요?')) return;
    try { await api.deleteBody(b.dataset.del); render(); } catch (err) { toast(err.message, 'error'); }
  }));
}

// ==================================================
//  설정 뷰
// ==================================================
function viewSettings() {
  const s = store.state;
  const p = s.profile, g = s.goals, set = s.settings;
  return `
  <section class="settings">
    <div class="page-head"><h1>설정</h1></div>

    <div class="card">
      <h2>⚡ 빠른 조정</h2>
      <p class="muted small">운동 중 마음이 바뀌면 여기서 바로 바꾸세요.</p>
      <div class="grid2">
        <label>1회 세션 시간(분)<input id="q-min" type="number" inputmode="numeric" value="${p.sessionMinutes}"></label>
        <label>주당 운동일수<select id="q-days">${[...new Set([...(store.meta.daysOptions || []), p.daysPerWeek])].sort((a, b) => a - b).map((d) => `<option value="${d}" ${p.daysPerWeek === d ? 'selected' : ''}>${d}일</option>`).join('')}</select></label>
        <label>주 목표${selectHtml('q-goal', 'goals', g.primaryGoal)}</label>
        <label>운동량(볼륨)${selectHtml('q-vol', 'volumes', p.experience)}</label>
      </div>
      ${(p.customDays && p.customDays.length) ? `<p class="muted small">📅 운동 요일 직접 지정 중: <b>${p.customDays.map((d) => dayLabel(d)).join('·')}</b> · 위에서 일수를 바꾸면 자동 배치로 전환돼요(요일 재지정은 아래 “프로필·목표 수정”).</p>` : ''}
      <div class="actions">
        <button id="q-save" class="ghost">저장만</button>
        <button id="q-regen" class="primary">저장 후 루틴 다시 생성</button>
      </div>
    </div>

    <div class="card">
      <h2>프로필 · 목표</h2>
      <div class="kv">
        <div><span>운동량</span><b>${optLabel('volumes', p.experience)}</b></div>
        <div><span>주당</span><b>${p.daysPerWeek}일${p.customDays && p.customDays.length ? ' (' + p.customDays.map((d) => dayLabel(d)).join('·') + ')' : ''} · ${p.sessionMinutes}분</b></div>
        <div><span>장비</span><b>${(Array.isArray(p.equipment) ? p.equipment : []).map((eq) => optLabel('equipments', eq)).join(', ') || '-'}</b></div>
        <div><span>목표</span><b>${goalLabel(g.primaryGoal)}</b></div>
        <div><span>분할</span><b>${splitLabel(g.split)}</b></div>
        <div><span>진행</span><b>${optLabel('progressions', g.progression)}</b></div>
        <div><span>나이</span><b>${ageFromBirth(p.birthDate) != null ? ageFromBirth(p.birthDate) + '세' : '-'}</b></div>
        <div><span>시작일</span><b>${esc(p.startDate || '-')}</b></div>
      </div>
      <div class="actions"><button class="ghost" id="edit-setup">프로필 · 목표 수정</button></div>
    </div>

    <div class="card">
      <h2>🤖 Claude AI 연동</h2>
      <p class="muted small">AI로 루틴을 다듬으려면 Anthropic API 키가 필요해요. 키는 <b>이 브라우저(localStorage)에만</b> 저장되고, 사용할 때만 Anthropic 서버로 직접 전송됩니다. 공용 PC에서는 입력을 피하세요.</p>
      <label class="check"><input type="checkbox" id="set-useai" ${set.useAI ? 'checked' : ''}> AI 다듬기 기능 사용</label>
      <label>API 키
        <input id="set-key" type="password" placeholder="${set.hasApiKey ? '●●●●●●●● (저장됨 — 바꾸려면 새로 입력)' : 'sk-ant-...'}" autocomplete="off">
      </label>
      <label>모델
        <select id="set-model">
          <option value="claude-opus-4-8" ${set.model === 'claude-opus-4-8' ? 'selected' : ''}>Claude Opus 4.8 (최고 성능)</option>
          <option value="claude-sonnet-4-6" ${set.model === 'claude-sonnet-4-6' ? 'selected' : ''}>Claude Sonnet 4.6 (빠름·저렴)</option>
          <option value="claude-haiku-4-5" ${set.model === 'claude-haiku-4-5' ? 'selected' : ''}>Claude Haiku 4.5 (가장 저렴)</option>
        </select>
      </label>
      <div class="hint">상태: ${set.hasApiKey ? '<b class="ok">키 있음 ✓</b>' : '<b class="warn">키 없음</b>'} · 키 없이도 내장 알고리즘 루틴은 그대로 사용할 수 있어요.</div>
      <div class="actions"><button id="set-save" class="primary">저장</button></div>
    </div>

    <div class="card">
      <h2>📱 앱으로 설치</h2>
      <p class="muted small">홈 화면에 추가하면 앱처럼 전체화면·오프라인으로 쓸 수 있어요.</p>
      <p class="muted small">· <b>Android/Chrome</b>: 주소창 옆 메뉴 → “앱 설치” 또는 “홈 화면에 추가”<br>
      · <b>iPhone/Safari</b>: 공유 버튼 <b>⬆︎</b> → “홈 화면에 추가”</p>
    </div>

    <div class="card danger-zone">
      <h2>데이터</h2>
      <p class="muted small">모든 데이터는 이 <b>브라우저(localStorage)</b>에 저장됩니다. 다른 기기로 옮기려면 내보내기 후 그 기기에서 가져오기 하세요.</p>
      <div class="actions">
        <button id="data-export" class="ghost">데이터 내보내기(JSON)</button>
        <label class="btn ghost import-label">데이터 가져오기<input id="data-import" type="file" accept="application/json" hidden></label>
        <button id="data-reset" class="danger">전체 초기화</button>
      </div>
    </div>
  </section>`;
}

function wireSettings() {
  qs('#edit-setup').addEventListener('click', () => { location.hash = '#setup'; });

  async function applyQuick(regen) {
    try {
      const qDays = Number(qs('#q-days').value);
      const patch = { sessionMinutes: qs('#q-min').value, daysPerWeek: qDays, experience: qs('#q-vol').value };
      // 숫자로 일수를 바꾸면 직접 지정 요일은 해제하고 자동 배치로 전환
      if (qDays !== store.state.profile.daysPerWeek) patch.customDays = [];
      await api.patchProfile(patch);
      await api.patchGoals({ primaryGoal: qs('#q-goal').value });
      if (regen) { await api.generate(true); toast('저장하고 루틴을 다시 만들었어요.', 'success'); }
      else toast('저장했어요. 루틴에 반영하려면 “다시 생성”을 누르세요.', 'success');
      render();
    } catch (err) { toast(err.message, 'error'); }
  }
  const qSave = qs('#q-save'), qRegen = qs('#q-regen');
  if (qSave) qSave.addEventListener('click', () => applyQuick(false));
  if (qRegen) qRegen.addEventListener('click', () => applyQuick(true));

  qs('#set-save').addEventListener('click', async (e) => {
    const payload = { useAI: qs('#set-useai').checked, model: qs('#set-model').value };
    const key = qs('#set-key').value;
    if (key) payload.apiKey = key;
    e.currentTarget.disabled = true;
    try { await api.saveSettings(payload); toast('설정을 저장했어요.', 'success'); render(); }
    catch (err) { toast(err.message, 'error'); e.currentTarget.disabled = false; }
  });

  qs('#data-export').addEventListener('click', () => {
    const blob = new Blob([api.exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workout-data-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('데이터를 내보냈어요.', 'success');
  });

  qs('#data-import').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!confirm('가져오면 현재 데이터를 덮어씁니다. 계속할까요?')) { e.target.value = ''; return; }
    try {
      const text = await file.text();
      await api.importData(JSON.parse(text));
      toast('데이터를 가져왔어요.', 'success');
      location.hash = '#dashboard'; render();
    } catch (err) {
      toast('가져오기 실패: ' + err.message, 'error');
    }
    e.target.value = '';
  });

  qs('#data-reset').addEventListener('click', async () => {
    if (!confirm('정말 모든 데이터를 삭제할까요? 되돌릴 수 없습니다.')) return;
    if (!confirm('마지막 확인: 프로필·루틴·기록·체성분이 모두 사라집니다.')) return;
    try { await api.reset(); toast('초기화했어요.'); location.hash = '#dashboard'; render(); }
    catch (err) { toast(err.message, 'error'); }
  });
}

// ---------- 소소한 라벨 헬퍼 ----------
function goalLabel(v) { return (store.meta.goalLabels && store.meta.goalLabels[v]) || v; }
function dayLabel(wd) { return (store.meta.weekdayLabels && store.meta.weekdayLabels[wd]) || wd; }
function splitLabel(v) { return optLabel('splits', v); }
function shortLabel(label) { return String(label).split('(')[0]; }

function dayDone(week, wd) {
  const l = store.state.logs[`${week}:${wd}`];
  if (!l || !l.exercises) return false;
  return l.exercises.some((ex) => (ex.sets || []).some((s) => Number(s.reps) > 0));
}

function weightText(ex) {
  const mem = (store.state.exerciseWeights || {})[ex.id];
  const w = ex.weightKg != null ? ex.weightKg : (mem != null ? mem : null);
  const fromMem = ex.weightKg == null && mem != null;
  if (ex.bodyweight) return w ? `자중+${w}kg` : '자중';
  if (w == null) return '<span class="muted">적정무게 탐색</span>';
  return `${w}kg${fromMem ? ' <span class="muted">(기록)</span>' : ''}`;
}
