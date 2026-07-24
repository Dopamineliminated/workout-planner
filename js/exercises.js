// 운동 데이터베이스.
// muscle: 주동근 그룹 | kind: 'compound'(다관절) | 'isolation'(단관절)
// sub: 세부 패턴(슬롯 매칭용) | equipment: 사용 장비 | inc: 무게 증량 단위 등급('big'|'mid'|'small')
// bodyweight: 자중 운동 여부 | desc: 동작 설명(한 줄)

export const EXERCISES = [
  // ===== 가슴 (chest) =====
  { id: 'barbell_bench', name: '바벨 벤치프레스', muscle: 'chest', kind: 'compound', sub: 'horizontal', equipment: ['barbell'], inc: 'mid', desc: '벤치에 누워 바벨을 가슴 중앙으로 내렸다가 밀어 올립니다. 견갑을 뒤로 모아 고정하고 팔꿈치는 45도 정도로.' },
  { id: 'incline_barbell_bench', name: '인클라인 바벨 벤치프레스', muscle: 'chest', kind: 'compound', sub: 'incline', equipment: ['barbell'], inc: 'mid', desc: '30~45도 인클라인 벤치에서 바벨을 윗가슴으로 밀어 올립니다. 윗가슴을 강조하는 종목.' },
  { id: 'db_bench', name: '덤벨 벤치프레스', muscle: 'chest', kind: 'compound', sub: 'horizontal', equipment: ['dumbbell'], inc: 'mid', desc: '덤벨로 하는 벤치프레스. 가동범위가 넓어 가슴 자극이 크고 좌우 균형에 좋습니다.' },
  { id: 'incline_db_press', name: '인클라인 덤벨 프레스', muscle: 'chest', kind: 'compound', sub: 'incline', equipment: ['dumbbell'], inc: 'mid', desc: '인클라인 벤치에서 덤벨을 윗가슴 위로 밀어 올립니다. 윗가슴 집중.' },
  { id: 'chest_press_machine', name: '체스트 프레스 머신', muscle: 'chest', kind: 'compound', sub: 'horizontal', equipment: ['machine'], inc: 'mid', desc: '머신에 앉아 손잡이를 앞으로 밀어냅니다. 궤적이 고정돼 초보자도 안전하게 가슴 자극.' },
  { id: 'dips_chest', name: '딥스(가슴)', muscle: 'chest', kind: 'compound', sub: 'horizontal', equipment: ['bodyweight'], inc: 'mid', bodyweight: true, desc: '평행봉에서 상체를 앞으로 기울여 내렸다 올라옵니다. 아랫가슴과 삼두를 함께 자극.' },
  { id: 'pushup', name: '푸시업', muscle: 'chest', kind: 'compound', sub: 'horizontal', equipment: ['bodyweight'], inc: 'small', bodyweight: true, desc: '맨몸 푸시업. 몸을 머리부터 발끝까지 일직선으로 유지하며 가슴을 바닥 가까이 내립니다.' },
  { id: 'pec_deck', name: '펙덱 플라이', muscle: 'chest', kind: 'isolation', equipment: ['machine'], inc: 'small', desc: '머신에 앉아 팔을 앞으로 모아 가슴을 조입니다. 가슴 고립·모양 만들기.' },
  { id: 'cable_fly', name: '케이블 플라이', muscle: 'chest', kind: 'isolation', equipment: ['cable'], inc: 'small', desc: '양쪽 케이블을 가슴 앞으로 모으는 플라이. 끝까지 조여 가슴 안쪽을 자극.' },
  { id: 'db_fly', name: '덤벨 플라이', muscle: 'chest', kind: 'isolation', equipment: ['dumbbell'], inc: 'small', desc: '누워서 덤벨을 옆으로 벌렸다 모읍니다. 가슴을 크게 늘렸다 조이는 스트레치 종목.' },

  // ===== 등 (back) =====
  { id: 'deadlift', name: '데드리프트', muscle: 'back', kind: 'compound', sub: 'hinge', equipment: ['barbell'], inc: 'big', desc: '바닥의 바벨을 엉덩이·다리 힘으로 세워 듭니다. 등·둔근·햄스트링 전신. 허리는 중립을 끝까지 유지.' },
  { id: 'pullup', name: '턱걸이(풀업)', muscle: 'back', kind: 'compound', sub: 'vertical', equipment: ['bodyweight'], inc: 'mid', bodyweight: true, desc: '철봉에 매달려 가슴을 바 쪽으로 끌어올립니다. 광배와 등 상부.' },
  { id: 'lat_pulldown', name: '랫풀다운', muscle: 'back', kind: 'compound', sub: 'vertical', equipment: ['machine', 'cable'], inc: 'mid', desc: '머신 바를 가슴 위쪽으로 당깁니다. 광배 발달, 턱걸이 대체로 좋음.' },
  { id: 'barbell_row', name: '바벨 로우', muscle: 'back', kind: 'compound', sub: 'horizontal', equipment: ['barbell'], inc: 'mid', desc: '상체를 숙여 바벨을 배꼽 쪽으로 당깁니다. 등 두께를 만드는 대표 종목.' },
  { id: 'db_row', name: '원암 덤벨 로우', muscle: 'back', kind: 'compound', sub: 'horizontal', equipment: ['dumbbell'], inc: 'mid', desc: '벤치에 한 손·한 무릎을 짚고 덤벨을 옆구리로 당깁니다. 광배를 한쪽씩 집중.' },
  { id: 'seated_cable_row', name: '시티드 케이블 로우', muscle: 'back', kind: 'compound', sub: 'horizontal', equipment: ['cable', 'machine'], inc: 'mid', desc: '앉아서 케이블을 배 쪽으로 당깁니다. 등 중앙을 조여줍니다.' },
  { id: 't_bar_row', name: '티바 로우', muscle: 'back', kind: 'compound', sub: 'horizontal', equipment: ['barbell', 'machine'], inc: 'mid', desc: '티바를 가슴 쪽으로 당깁니다. 무거운 무게로 등 두께 발달.' },
  { id: 'inverted_row', name: '인버티드 로우', muscle: 'back', kind: 'compound', sub: 'horizontal', equipment: ['bodyweight'], inc: 'small', bodyweight: true, desc: '낮게 고정된 바 아래 누워 몸을 당겨 올립니다. 맨몸으로 하는 로우.' },
  { id: 'straight_arm_pulldown', name: '스트레이트 암 풀다운', muscle: 'back', kind: 'isolation', equipment: ['cable'], inc: 'small', desc: '팔을 편 채로 케이블을 아래로 눌러 내립니다. 광배만 고립해서 자극.' },

  // ===== 어깨 (shoulders) =====
  { id: 'ohp', name: '오버헤드 프레스', muscle: 'shoulders', kind: 'compound', sub: 'press', equipment: ['barbell'], inc: 'mid', desc: '선 채로 바벨을 머리 위로 밀어 올립니다. 어깨 전체와 삼두. 코어로 허리 보호.' },
  { id: 'db_shoulder_press', name: '덤벨 숄더프레스', muscle: 'shoulders', kind: 'compound', sub: 'press', equipment: ['dumbbell'], inc: 'mid', desc: '덤벨을 어깨 높이에서 머리 위로 밀어 올립니다. 어깨 전면·측면.' },
  { id: 'arnold_press', name: '아놀드 프레스', muscle: 'shoulders', kind: 'compound', sub: 'press', equipment: ['dumbbell'], inc: 'mid', desc: '손목을 안에서 밖으로 돌리며 프레스합니다. 어깨 앞·옆을 폭넓게 자극.' },
  { id: 'machine_shoulder_press', name: '머신 숄더프레스', muscle: 'shoulders', kind: 'compound', sub: 'press', equipment: ['machine'], inc: 'mid', desc: '머신에 앉아 손잡이를 위로 밀어 올립니다. 궤적이 안정적이라 초보자에게 좋음.' },
  { id: 'lateral_raise', name: '사이드 레터럴 레이즈', muscle: 'shoulders', kind: 'isolation', sub: 'lateral', equipment: ['dumbbell'], inc: 'small', desc: '덤벨을 양옆으로 어깨 높이까지 들어 올립니다. 어깨 측면 → 넓은 어깨.' },
  { id: 'cable_lateral_raise', name: '케이블 레터럴 레이즈', muscle: 'shoulders', kind: 'isolation', sub: 'lateral', equipment: ['cable'], inc: 'small', desc: '케이블로 옆으로 들어 올려 측면 삼각근을 끝까지 지속 자극.' },

  // ===== 후면 삼각근 (rear_delt) =====
  { id: 'rear_delt_fly', name: '리어 델트 플라이', muscle: 'rear_delt', kind: 'isolation', equipment: ['dumbbell'], inc: 'small', desc: '상체를 숙여 덤벨을 뒤로 벌립니다. 후면 삼각근과 자세 개선.' },
  { id: 'face_pull', name: '페이스 풀', muscle: 'rear_delt', kind: 'isolation', equipment: ['cable'], inc: 'small', desc: '케이블을 얼굴 쪽으로 당기며 팔꿈치를 벌립니다. 후면 어깨·라운드숄더 교정에 좋음.' },
  { id: 'reverse_pec_deck', name: '리버스 펙덱', muscle: 'rear_delt', kind: 'isolation', equipment: ['machine'], inc: 'small', desc: '펙덱 머신을 반대로 앉아 팔을 뒤로 벌립니다. 후면 삼각근 고립.' },

  // ===== 대퇴사두 (quads) =====
  { id: 'back_squat', name: '백 스쿼트', muscle: 'quads', kind: 'compound', sub: 'squat', equipment: ['barbell'], inc: 'big', desc: '바벨을 등에 얹고 앉았다 일어섭니다. 하체 전체의 왕. 무릎과 발끝 방향을 일치시키세요.' },
  { id: 'front_squat', name: '프론트 스쿼트', muscle: 'quads', kind: 'compound', sub: 'squat', equipment: ['barbell'], inc: 'big', desc: '바벨을 앞어깨에 얹고 스쿼트. 상체를 세워 대퇴사두를 강조.' },
  { id: 'goblet_squat', name: '고블릿 스쿼트', muscle: 'quads', kind: 'compound', sub: 'squat', equipment: ['dumbbell'], inc: 'mid', desc: '덤벨 하나를 가슴에 안고 스쿼트. 자세 익히기 좋은 초보 하체 종목.' },
  { id: 'leg_press', name: '레그 프레스', muscle: 'quads', kind: 'compound', sub: 'press', equipment: ['machine'], inc: 'big', desc: '머신에 앉아 발판을 밀어냅니다. 대퇴사두·둔근을 허리 부담 적게 강하게 자극.' },
  { id: 'hack_squat', name: '핵 스쿼트', muscle: 'quads', kind: 'compound', sub: 'press', equipment: ['machine'], inc: 'big', desc: '핵스쿼트 머신에서 등을 기대고 앉았다 일어섭니다. 대퇴사두 집중.' },
  { id: 'lunge', name: '런지', muscle: 'quads', kind: 'compound', sub: 'press', equipment: ['dumbbell', 'bodyweight'], inc: 'mid', desc: '한 발을 앞으로 내딛어 앉았다 일어섭니다. 하체와 균형 감각.' },
  { id: 'bulgarian_split_squat', name: '불가리안 스플릿 스쿼트', muscle: 'quads', kind: 'compound', sub: 'press', equipment: ['dumbbell', 'bodyweight'], inc: 'mid', desc: '뒷발을 벤치에 올리고 앞다리로 스쿼트. 하체를 한쪽씩 강하게 자극.' },
  { id: 'leg_extension', name: '레그 익스텐션', muscle: 'quads', kind: 'isolation', equipment: ['machine'], inc: 'small', desc: '앉아서 무릎을 펴 올립니다. 대퇴사두만 고립.' },

  // ===== 햄스트링/둔근 (hamstrings / glutes) =====
  { id: 'romanian_deadlift', name: '루마니안 데드리프트(RDL)', muscle: 'hamstrings', kind: 'compound', sub: 'hinge', equipment: ['barbell', 'dumbbell'], inc: 'big', desc: '무릎을 살짝 굽힌 채 엉덩이를 뒤로 빼며 바를 내립니다. 햄스트링·둔근 스트레치.' },
  { id: 'good_morning', name: '굿모닝', muscle: 'hamstrings', kind: 'compound', sub: 'hinge', equipment: ['barbell'], inc: 'mid', desc: '바벨을 등에 얹고 상체를 앞으로 숙였다 세웁니다. 햄스트링과 허리.' },
  { id: 'leg_curl', name: '레그 컬', muscle: 'hamstrings', kind: 'isolation', equipment: ['machine'], inc: 'small', desc: '누워/앉아 무릎을 굽혀 발뒤꿈치를 엉덩이로 당깁니다. 햄스트링 고립.' },
  { id: 'nordic_curl', name: '노르딕 햄스트링 컬', muscle: 'hamstrings', kind: 'isolation', equipment: ['bodyweight'], inc: 'small', bodyweight: true, desc: '무릎을 꿇고 발목을 고정한 뒤 상체를 천천히 앞으로 버팁니다. 고난도 햄스트링 강화.' },
  { id: 'hip_thrust', name: '힙 쓰러스트', muscle: 'glutes', kind: 'compound', sub: 'thrust', equipment: ['barbell', 'machine'], inc: 'big', desc: '등 위쪽을 벤치에 대고 바벨을 엉덩이로 밀어 올립니다. 둔근 발달의 핵심.' },
  { id: 'glute_bridge', name: '글루트 브리지', muscle: 'glutes', kind: 'compound', sub: 'thrust', equipment: ['bodyweight', 'dumbbell'], inc: 'mid', bodyweight: true, desc: '누워서 엉덩이를 위로 들어 올려 조입니다. 둔근 활성화.' },
  { id: 'cable_kickback', name: '케이블 킥백', muscle: 'glutes', kind: 'isolation', equipment: ['cable'], inc: 'small', desc: '발목에 케이블을 걸고 다리를 뒤로 차올립니다. 둔근 고립.' },

  // ===== 종아리 (calves) =====
  { id: 'standing_calf_raise', name: '스탠딩 카프 레이즈', muscle: 'calves', kind: 'isolation', equipment: ['machine', 'barbell'], inc: 'small', desc: '서서 발뒤꿈치를 최대한 들어 올렸다 내립니다. 종아리(비복근).' },
  { id: 'seated_calf_raise', name: '시티드 카프 레이즈', muscle: 'calves', kind: 'isolation', equipment: ['machine'], inc: 'small', desc: '앉아서 무릎을 굽힌 채 발뒤꿈치를 듭니다. 종아리 안쪽(가자미근).' },
  { id: 'db_calf_raise', name: '덤벨 카프 레이즈', muscle: 'calves', kind: 'isolation', equipment: ['dumbbell', 'bodyweight'], inc: 'small', desc: '덤벨을 들고 발뒤꿈치를 들어 올립니다. 맨몸으로도 가능.' },

  // ===== 이두 (biceps) =====
  { id: 'barbell_curl', name: '바벨 컬', muscle: 'biceps', kind: 'isolation', equipment: ['barbell'], inc: 'small', desc: '바벨을 팔꿈치 고정한 채 감아 올립니다. 이두 전체.' },
  { id: 'db_curl', name: '덤벨 컬', muscle: 'biceps', kind: 'isolation', equipment: ['dumbbell'], inc: 'small', desc: '덤벨을 번갈아 또는 동시에 감아 올립니다. 이두.' },
  { id: 'hammer_curl', name: '해머 컬', muscle: 'biceps', kind: 'isolation', equipment: ['dumbbell'], inc: 'small', desc: '덤벨을 세로로 잡고 컬. 이두와 전완(팔뚝 굵기).' },
  { id: 'preacher_curl', name: '프리처 컬', muscle: 'biceps', kind: 'isolation', equipment: ['machine', 'barbell'], inc: 'small', desc: '프리처 벤치에 팔을 대고 컬. 반동 없이 이두를 고립.' },
  { id: 'cable_curl', name: '케이블 컬', muscle: 'biceps', kind: 'isolation', equipment: ['cable'], inc: 'small', desc: '케이블로 컬. 처음부터 끝까지 이두에 지속적인 긴장.' },

  // ===== 삼두 (triceps) =====
  { id: 'tricep_pushdown', name: '트라이셉 푸시다운', muscle: 'triceps', kind: 'isolation', equipment: ['cable'], inc: 'small', desc: '케이블 바를 아래로 눌러 폅니다. 팔꿈치를 고정해 삼두를 자극.' },
  { id: 'overhead_extension', name: '오버헤드 익스텐션', muscle: 'triceps', kind: 'isolation', equipment: ['dumbbell', 'cable'], inc: 'small', desc: '팔을 머리 위로 올려 굽혔다 폅니다. 삼두의 긴 갈래(장두)를 늘려 자극.' },
  { id: 'skullcrusher', name: '라잉 트라이셉 익스텐션(스컬크러셔)', muscle: 'triceps', kind: 'isolation', equipment: ['barbell', 'dumbbell'], inc: 'small', desc: '누워서 팔꿈치를 고정하고 이마 쪽으로 내렸다 폅니다. 삼두 집중.' },
  { id: 'close_grip_bench', name: '클로즈그립 벤치프레스', muscle: 'triceps', kind: 'compound', sub: 'press', equipment: ['barbell'], inc: 'mid', desc: '손을 좁게 잡은 벤치프레스. 삼두와 안쪽 가슴.' },
  { id: 'bench_dips', name: '벤치 딥스', muscle: 'triceps', kind: 'compound', sub: 'press', equipment: ['bodyweight'], inc: 'small', bodyweight: true, desc: '벤치에 손을 짚고 몸을 내렸다 밀어 올립니다. 맨몸 삼두 운동.' },

  // ===== 복근 (abs) =====
  { id: 'hanging_leg_raise', name: '행잉 레그 레이즈', muscle: 'abs', kind: 'isolation', equipment: ['bodyweight'], inc: 'small', bodyweight: true, desc: '철봉에 매달려 다리를 들어 올립니다. 하복부 집중.' },
  { id: 'cable_crunch', name: '케이블 크런치', muscle: 'abs', kind: 'isolation', equipment: ['cable'], inc: 'small', desc: '무릎 꿇고 케이블을 잡은 채 상체를 말아 내립니다. 복근에 무게를 실을 수 있음.' },
  { id: 'plank', name: '플랭크', muscle: 'abs', kind: 'isolation', equipment: ['bodyweight'], inc: 'small', bodyweight: true, timed: true, desc: '팔꿈치로 버티며 몸을 일직선으로 유지. 코어 전체(시간으로 측정).' },
  { id: 'crunch', name: '크런치', muscle: 'abs', kind: 'isolation', equipment: ['bodyweight'], inc: 'small', bodyweight: true, desc: '누워서 상체를 말아 올립니다. 기본 복근 운동.' },

  // ===== 승모 (traps) =====
  { id: 'shrug', name: '슈러그', muscle: 'traps', kind: 'isolation', equipment: ['barbell', 'dumbbell'], inc: 'mid', desc: '무게를 들고 어깨를 으쓱 위로 올립니다. 승모근 상부.' },
];

// 장비 옵션 → 사용 가능한 장비 목록 (레거시 단일 선택 값)
export const EQUIPMENT_SETS = {
  full_gym: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'],
  dumbbell_only: ['dumbbell', 'bodyweight'],
  home_minimal: ['bodyweight', 'dumbbell'],
};

// 다중 선택 장비 역량(capability) → 실제 장비 태그. outdoor_cardio는 근력 장비 없음(유산소 장소).
export const EQUIPMENT_CAPS = {
  gym: ['barbell', 'dumbbell', 'machine', 'cable', 'bodyweight'],
  barbell: ['barbell', 'bodyweight'],
  dumbbell: ['dumbbell', 'bodyweight'],
  machine_cable: ['machine', 'cable', 'bodyweight'],
  bodyweight: ['bodyweight'],
  outdoor_cardio: [],
};

// 선택된 장비(배열 또는 레거시 문자열) → 사용 가능한 장비 태그 배열
export function allowedEquipment(equipment) {
  const arr = Array.isArray(equipment) ? equipment : (equipment ? [equipment] : []);
  const set = new Set();
  for (const cap of arr) (EQUIPMENT_CAPS[cap] || []).forEach((t) => set.add(t));
  if (typeof equipment === 'string' && EQUIPMENT_SETS[equipment]) {
    EQUIPMENT_SETS[equipment].forEach((t) => set.add(t));
  }
  if (set.size === 0) set.add('bodyweight');
  return [...set];
}

// 무게 증량 등급 → kg
export const INCREMENT_KG = { big: 5, mid: 2.5, small: 1.25 };

// 근육 그룹 한글 라벨
export const MUSCLE_LABELS = {
  chest: '가슴', back: '등', shoulders: '어깨', rear_delt: '후면 어깨',
  quads: '대퇴사두', hamstrings: '햄스트링', glutes: '둔근', calves: '종아리',
  biceps: '이두', triceps: '삼두', abs: '복근', traps: '승모',
};

// 부위 표시 순서(설정의 운동 선택 목록 등)
export const MUSCLE_ORDER = ['chest', 'back', 'shoulders', 'rear_delt', 'quads', 'hamstrings', 'glutes', 'calves', 'biceps', 'triceps', 'abs', 'traps'];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));
export function getExercise(id) {
  return BY_ID.get(id) || null;
}

// 슬롯 조건에 맞는 후보 운동들을 우선순위대로 반환.
// slot: { muscle, kind, sub? }  allowed: 허용 장비 배열  excluded: 제외 운동 id(Set|배열)
export function candidatesFor(slot, allowed, excluded) {
  const allowedSet = new Set(allowed);
  const ex = excluded instanceof Set ? excluded : new Set(excluded || []);
  const usable = (e) => e.equipment.some((q) => allowedSet.has(q)) && !ex.has(e.id);

  // 1순위: muscle + kind + sub 정확 매칭
  let list = EXERCISES.filter(
    (e) => e.muscle === slot.muscle && e.kind === slot.kind &&
      (slot.sub ? e.sub === slot.sub : true) && usable(e)
  );
  // 2순위(sub 무시): muscle + kind
  if (list.length === 0) {
    list = EXERCISES.filter((e) => e.muscle === slot.muscle && e.kind === slot.kind && usable(e));
  }
  // 3순위(kind 무시): muscle 만
  if (list.length === 0) {
    list = EXERCISES.filter((e) => e.muscle === slot.muscle && usable(e));
  }
  return list;
}
