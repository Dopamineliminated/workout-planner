// 운동 데이터베이스.
// muscle: 주동근 그룹 | kind: 'compound'(다관절) | 'isolation'(단관절)
// sub: 세부 패턴(슬롯 매칭용) | equipment: 사용 장비 | inc: 무게 증량 단위 등급('big'|'mid'|'small')
// bodyweight: 자중 운동 여부(무게는 '추가 중량'으로 해석)

export const EXERCISES = [
  // ===== 가슴 (chest) =====
  { id: 'barbell_bench', name: '바벨 벤치프레스', muscle: 'chest', kind: 'compound', sub: 'horizontal', equipment: ['barbell'], inc: 'mid' },
  { id: 'incline_barbell_bench', name: '인클라인 바벨 벤치프레스', muscle: 'chest', kind: 'compound', sub: 'incline', equipment: ['barbell'], inc: 'mid' },
  { id: 'db_bench', name: '덤벨 벤치프레스', muscle: 'chest', kind: 'compound', sub: 'horizontal', equipment: ['dumbbell'], inc: 'mid' },
  { id: 'incline_db_press', name: '인클라인 덤벨 프레스', muscle: 'chest', kind: 'compound', sub: 'incline', equipment: ['dumbbell'], inc: 'mid' },
  { id: 'chest_press_machine', name: '체스트 프레스 머신', muscle: 'chest', kind: 'compound', sub: 'horizontal', equipment: ['machine'], inc: 'mid' },
  { id: 'dips_chest', name: '딥스(가슴)', muscle: 'chest', kind: 'compound', sub: 'horizontal', equipment: ['bodyweight'], inc: 'mid', bodyweight: true },
  { id: 'pushup', name: '푸시업', muscle: 'chest', kind: 'compound', sub: 'horizontal', equipment: ['bodyweight'], inc: 'small', bodyweight: true },
  { id: 'pec_deck', name: '펙덱 플라이', muscle: 'chest', kind: 'isolation', equipment: ['machine'], inc: 'small' },
  { id: 'cable_fly', name: '케이블 플라이', muscle: 'chest', kind: 'isolation', equipment: ['cable'], inc: 'small' },
  { id: 'db_fly', name: '덤벨 플라이', muscle: 'chest', kind: 'isolation', equipment: ['dumbbell'], inc: 'small' },

  // ===== 등 (back) =====
  { id: 'deadlift', name: '데드리프트', muscle: 'back', kind: 'compound', sub: 'hinge', equipment: ['barbell'], inc: 'big' },
  { id: 'pullup', name: '턱걸이(풀업)', muscle: 'back', kind: 'compound', sub: 'vertical', equipment: ['bodyweight'], inc: 'mid', bodyweight: true },
  { id: 'lat_pulldown', name: '랫풀다운', muscle: 'back', kind: 'compound', sub: 'vertical', equipment: ['machine', 'cable'], inc: 'mid' },
  { id: 'barbell_row', name: '바벨 로우', muscle: 'back', kind: 'compound', sub: 'horizontal', equipment: ['barbell'], inc: 'mid' },
  { id: 'db_row', name: '원암 덤벨 로우', muscle: 'back', kind: 'compound', sub: 'horizontal', equipment: ['dumbbell'], inc: 'mid' },
  { id: 'seated_cable_row', name: '시티드 케이블 로우', muscle: 'back', kind: 'compound', sub: 'horizontal', equipment: ['cable', 'machine'], inc: 'mid' },
  { id: 't_bar_row', name: '티바 로우', muscle: 'back', kind: 'compound', sub: 'horizontal', equipment: ['barbell', 'machine'], inc: 'mid' },
  { id: 'inverted_row', name: '인버티드 로우', muscle: 'back', kind: 'compound', sub: 'horizontal', equipment: ['bodyweight'], inc: 'small', bodyweight: true },
  { id: 'straight_arm_pulldown', name: '스트레이트 암 풀다운', muscle: 'back', kind: 'isolation', equipment: ['cable'], inc: 'small' },

  // ===== 어깨 (shoulders) =====
  { id: 'ohp', name: '오버헤드 프레스', muscle: 'shoulders', kind: 'compound', sub: 'press', equipment: ['barbell'], inc: 'mid' },
  { id: 'db_shoulder_press', name: '덤벨 숄더프레스', muscle: 'shoulders', kind: 'compound', sub: 'press', equipment: ['dumbbell'], inc: 'mid' },
  { id: 'arnold_press', name: '아놀드 프레스', muscle: 'shoulders', kind: 'compound', sub: 'press', equipment: ['dumbbell'], inc: 'mid' },
  { id: 'machine_shoulder_press', name: '머신 숄더프레스', muscle: 'shoulders', kind: 'compound', sub: 'press', equipment: ['machine'], inc: 'mid' },
  { id: 'lateral_raise', name: '사이드 레터럴 레이즈', muscle: 'shoulders', kind: 'isolation', sub: 'lateral', equipment: ['dumbbell'], inc: 'small' },
  { id: 'cable_lateral_raise', name: '케이블 레터럴 레이즈', muscle: 'shoulders', kind: 'isolation', sub: 'lateral', equipment: ['cable'], inc: 'small' },

  // ===== 후면 삼각근 (rear_delt) =====
  { id: 'rear_delt_fly', name: '리어 델트 플라이', muscle: 'rear_delt', kind: 'isolation', equipment: ['dumbbell'], inc: 'small' },
  { id: 'face_pull', name: '페이스 풀', muscle: 'rear_delt', kind: 'isolation', equipment: ['cable'], inc: 'small' },
  { id: 'reverse_pec_deck', name: '리버스 펙덱', muscle: 'rear_delt', kind: 'isolation', equipment: ['machine'], inc: 'small' },

  // ===== 대퇴사두 (quads) =====
  { id: 'back_squat', name: '백 스쿼트', muscle: 'quads', kind: 'compound', sub: 'squat', equipment: ['barbell'], inc: 'big' },
  { id: 'front_squat', name: '프론트 스쿼트', muscle: 'quads', kind: 'compound', sub: 'squat', equipment: ['barbell'], inc: 'big' },
  { id: 'goblet_squat', name: '고블릿 스쿼트', muscle: 'quads', kind: 'compound', sub: 'squat', equipment: ['dumbbell'], inc: 'mid' },
  { id: 'leg_press', name: '레그 프레스', muscle: 'quads', kind: 'compound', sub: 'press', equipment: ['machine'], inc: 'big' },
  { id: 'hack_squat', name: '핵 스쿼트', muscle: 'quads', kind: 'compound', sub: 'press', equipment: ['machine'], inc: 'big' },
  { id: 'lunge', name: '런지', muscle: 'quads', kind: 'compound', sub: 'press', equipment: ['dumbbell', 'bodyweight'], inc: 'mid' },
  { id: 'bulgarian_split_squat', name: '불가리안 스플릿 스쿼트', muscle: 'quads', kind: 'compound', sub: 'press', equipment: ['dumbbell', 'bodyweight'], inc: 'mid' },
  { id: 'leg_extension', name: '레그 익스텐션', muscle: 'quads', kind: 'isolation', equipment: ['machine'], inc: 'small' },

  // ===== 햄스트링/둔근 (hamstrings / glutes) =====
  { id: 'romanian_deadlift', name: '루마니안 데드리프트(RDL)', muscle: 'hamstrings', kind: 'compound', sub: 'hinge', equipment: ['barbell', 'dumbbell'], inc: 'big' },
  { id: 'good_morning', name: '굿모닝', muscle: 'hamstrings', kind: 'compound', sub: 'hinge', equipment: ['barbell'], inc: 'mid' },
  { id: 'leg_curl', name: '레그 컬', muscle: 'hamstrings', kind: 'isolation', equipment: ['machine'], inc: 'small' },
  { id: 'nordic_curl', name: '노르딕 햄스트링 컬', muscle: 'hamstrings', kind: 'isolation', equipment: ['bodyweight'], inc: 'small', bodyweight: true },
  { id: 'hip_thrust', name: '힙 쓰러스트', muscle: 'glutes', kind: 'compound', sub: 'thrust', equipment: ['barbell', 'machine'], inc: 'big' },
  { id: 'glute_bridge', name: '글루트 브리지', muscle: 'glutes', kind: 'compound', sub: 'thrust', equipment: ['bodyweight', 'dumbbell'], inc: 'mid', bodyweight: true },
  { id: 'cable_kickback', name: '케이블 킥백', muscle: 'glutes', kind: 'isolation', equipment: ['cable'], inc: 'small' },

  // ===== 종아리 (calves) =====
  { id: 'standing_calf_raise', name: '스탠딩 카프 레이즈', muscle: 'calves', kind: 'isolation', equipment: ['machine', 'barbell'], inc: 'small' },
  { id: 'seated_calf_raise', name: '시티드 카프 레이즈', muscle: 'calves', kind: 'isolation', equipment: ['machine'], inc: 'small' },
  { id: 'db_calf_raise', name: '덤벨 카프 레이즈', muscle: 'calves', kind: 'isolation', equipment: ['dumbbell', 'bodyweight'], inc: 'small' },

  // ===== 이두 (biceps) =====
  { id: 'barbell_curl', name: '바벨 컬', muscle: 'biceps', kind: 'isolation', equipment: ['barbell'], inc: 'small' },
  { id: 'db_curl', name: '덤벨 컬', muscle: 'biceps', kind: 'isolation', equipment: ['dumbbell'], inc: 'small' },
  { id: 'hammer_curl', name: '해머 컬', muscle: 'biceps', kind: 'isolation', equipment: ['dumbbell'], inc: 'small' },
  { id: 'preacher_curl', name: '프리처 컬', muscle: 'biceps', kind: 'isolation', equipment: ['machine', 'barbell'], inc: 'small' },
  { id: 'cable_curl', name: '케이블 컬', muscle: 'biceps', kind: 'isolation', equipment: ['cable'], inc: 'small' },

  // ===== 삼두 (triceps) =====
  { id: 'tricep_pushdown', name: '트라이셉 푸시다운', muscle: 'triceps', kind: 'isolation', equipment: ['cable'], inc: 'small' },
  { id: 'overhead_extension', name: '오버헤드 익스텐션', muscle: 'triceps', kind: 'isolation', equipment: ['dumbbell', 'cable'], inc: 'small' },
  { id: 'skullcrusher', name: '라잉 트라이셉 익스텐션(스컬크러셔)', muscle: 'triceps', kind: 'isolation', equipment: ['barbell', 'dumbbell'], inc: 'small' },
  { id: 'close_grip_bench', name: '클로즈그립 벤치프레스', muscle: 'triceps', kind: 'compound', sub: 'press', equipment: ['barbell'], inc: 'mid' },
  { id: 'bench_dips', name: '벤치 딥스', muscle: 'triceps', kind: 'compound', sub: 'press', equipment: ['bodyweight'], inc: 'small', bodyweight: true },

  // ===== 복근 (abs) =====
  { id: 'hanging_leg_raise', name: '행잉 레그 레이즈', muscle: 'abs', kind: 'isolation', equipment: ['bodyweight'], inc: 'small', bodyweight: true },
  { id: 'cable_crunch', name: '케이블 크런치', muscle: 'abs', kind: 'isolation', equipment: ['cable'], inc: 'small' },
  { id: 'plank', name: '플랭크', muscle: 'abs', kind: 'isolation', equipment: ['bodyweight'], inc: 'small', bodyweight: true, timed: true },
  { id: 'crunch', name: '크런치', muscle: 'abs', kind: 'isolation', equipment: ['bodyweight'], inc: 'small', bodyweight: true },

  // ===== 승모 (traps) =====
  { id: 'shrug', name: '슈러그', muscle: 'traps', kind: 'isolation', equipment: ['barbell', 'dumbbell'], inc: 'mid' },
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
  // 레거시 단일 문자열(full_gym 등) 호환
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

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));
export function getExercise(id) {
  return BY_ID.get(id) || null;
}

// 슬롯 조건에 맞는 후보 운동들을 우선순위대로 반환.
// slot: { muscle, kind, sub? }  allowed: 허용 장비 배열
export function candidatesFor(slot, allowed) {
  const allowedSet = new Set(allowed);
  const usable = (e) => e.equipment.some((q) => allowedSet.has(q));

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
