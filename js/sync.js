// 클라우드 동기화 (Firebase Auth + Firestore). Firebase SDK는 CDN에서 동적 로드.
// 전략: 로그인 → users/{uid} 문서에 상태(JSON 문자열) 저장. 최신 우선(updatedAt) 병합 + 실시간 반영.
// Anthropic API 키 등 비밀값은 동기화하지 않음(state에 없음, 기기 로컬에만).
import { store, onStateChange, applyRemoteState } from './store.js';

const FB = 'https://www.gstatic.com/firebasejs/10.12.2';
const LS_CFG = 'workout-planner:fbconfig:v1';
const LS_ENABLED = 'workout-planner:sync:v1';

let fb = null;            // { app, auth, db, authMod, fsMod, provider }
let currentUser = null;
let unsub = null;
let applyingRemote = false;
let pushTimer = null;
let statusCb = () => {};

function emit(s) { try { statusCb(s || {}); } catch {} }

async function ensureFirebase() {
  if (fb) return fb;
  const cfg = sync.getConfig();
  if (!cfg) throw new Error('Firebase 설정(firebaseConfig)이 없습니다.');
  const [appMod, authMod, fsMod] = await Promise.all([
    import(`${FB}/firebase-app.js`),
    import(`${FB}/firebase-auth.js`),
    import(`${FB}/firebase-firestore.js`),
  ]);
  const app = appMod.initializeApp(cfg);
  const auth = authMod.getAuth(app);
  const db = fsMod.getFirestore(app);
  fb = { app, auth, db, authMod, fsMod, provider: new authMod.GoogleAuthProvider() };
  authMod.onAuthStateChanged(auth, (u) => {
    currentUser = u || null;
    if (u) { initialSync().catch((e) => emit({ error: e.message })); }
    else if (unsub) { unsub(); unsub = null; }
    emit({ auth: true });
  });
  return fb;
}

function userRef() { return fb.fsMod.doc(fb.db, 'users', currentUser.uid); }

async function initialSync() {
  const snap = await fb.fsMod.getDoc(userRef());
  const d = snap.exists() ? snap.data() : null;
  const remoteTs = (d && d.updatedAt) || 0;
  const localTs = (store.state && store.state.updatedAt) || 0;
  if (d && d.stateJson && remoteTs > localTs) applyRemote(JSON.parse(d.stateJson));
  else await pushRemote();
  subscribe();
}

function subscribe() {
  if (unsub) unsub();
  unsub = fb.fsMod.onSnapshot(userRef(), (snap) => {
    const d = snap.data();
    if (!d || !d.stateJson || applyingRemote) return;
    const remoteTs = d.updatedAt || 0;
    const localTs = (store.state && store.state.updatedAt) || 0;
    if (remoteTs > localTs) applyRemote(JSON.parse(d.stateJson));
  });
}

function applyRemote(remoteState) {
  applyingRemote = true;
  try {
    applyRemoteState(remoteState);
    window.dispatchEvent(new CustomEvent('wp-synced'));
  } finally { applyingRemote = false; }
  emit({ pulledAt: Date.now() });
}

async function pushRemote() {
  if (!fb || !currentUser) return;
  await fb.fsMod.setDoc(userRef(), {
    stateJson: JSON.stringify(store.state),
    updatedAt: store.state.updatedAt || Date.now(),
    email: currentUser.email || '',
    at: new Date().toISOString(),
  });
  emit({ pushedAt: Date.now() });
}

// 로컬 변경 → 원격으로 debounce push (로그인 상태 & 원격 적용 중이 아닐 때)
onStateChange(() => {
  if (!currentUser || applyingRemote) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushRemote().catch(() => {}), 1500);
});

export const sync = {
  getConfig() { try { return JSON.parse(localStorage.getItem(LS_CFG) || 'null'); } catch { return null; } },
  hasConfig() { return !!this.getConfig(); },
  saveConfig(obj) { localStorage.setItem(LS_CFG, JSON.stringify(obj)); localStorage.setItem(LS_ENABLED, '1'); },
  clearConfig() { localStorage.removeItem(LS_CFG); localStorage.removeItem(LS_ENABLED); },
  isEnabled() { return localStorage.getItem(LS_ENABLED) === '1'; },
  user() { return currentUser; },
  onStatus(cb) { statusCb = cb || (() => {}); },

  async init(cb) {
    if (cb) statusCb = cb;
    if (this.hasConfig() && this.isEnabled()) {
      try { await ensureFirebase(); } catch (e) { emit({ error: e.message }); }
    }
  },
  async signIn() {
    await ensureFirebase();
    localStorage.setItem(LS_ENABLED, '1');
    await fb.authMod.signInWithPopup(fb.auth, fb.provider);
  },
  async signOut() {
    if (unsub) { unsub(); unsub = null; }
    if (fb) await fb.authMod.signOut(fb.auth);
    currentUser = null;
    emit({ auth: true });
  },
  async pushNow() {
    if (!currentUser) throw new Error('로그인이 필요합니다.');
    await pushRemote();
  },
  async pullNow() {
    if (!currentUser) throw new Error('로그인이 필요합니다.');
    const snap = await fb.fsMod.getDoc(userRef());
    const d = snap.exists() ? snap.data() : null;
    if (d && d.stateJson) applyRemote(JSON.parse(d.stateJson));
    else throw new Error('클라우드에 저장된 데이터가 없어요.');
  },
};
