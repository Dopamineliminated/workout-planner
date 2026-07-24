// 클라우드 계정/동기화 (Firebase Auth + Firestore). config는 firebase-config.js에 내장.
// 로그인 필수 구조: users/{uid} 문서에 상태(JSON)를 저장, 최신 우선 병합 + 실시간 반영.
// emit 타입: 'auth'(로그인 상태 변화) | 'offline'(firebase 로드 실패) | 'pulled' | 'pushed'.
import { store, onStateChange, applyRemoteState, clearLocal } from './store.js';
import { FIREBASE_CONFIG } from './firebase-config.js';

const FB = 'https://www.gstatic.com/firebasejs/10.12.2';
let fb = null;
let currentUser = null;
let unsub = null;
let applyingRemote = false;
let pushTimer = null;
let statusCb = () => {};

function emit(s) { try { statusCb(s || {}); } catch {} }

async function ensureFirebase() {
  if (fb) return fb;
  const [appMod, authMod, fsMod] = await Promise.all([
    import(`${FB}/firebase-app.js`),
    import(`${FB}/firebase-auth.js`),
    import(`${FB}/firebase-firestore.js`),
  ]);
  const app = appMod.initializeApp(FIREBASE_CONFIG);
  const auth = authMod.getAuth(app);
  const db = fsMod.getFirestore(app);
  fb = { app, auth, db, authMod, fsMod, provider: new authMod.GoogleAuthProvider() };
  authMod.onAuthStateChanged(auth, async (u) => {
    currentUser = u || null;
    if (u) {
      localStorage.setItem('wp:authed', '1');
      try { await initialSync(); } catch {}
    } else {
      localStorage.removeItem('wp:authed');
      if (unsub) { unsub(); unsub = null; }
    }
    emit({ type: 'auth' });
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
  else if (store.state && (store.state.profile || store.state.routine)) await pushRemote();
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
  }, () => {});
}

function applyRemote(remoteState) {
  applyingRemote = true;
  try { applyRemoteState(remoteState); window.dispatchEvent(new CustomEvent('wp-synced')); }
  finally { applyingRemote = false; }
  emit({ type: 'pulled' });
}

async function pushRemote() {
  if (!fb || !currentUser) return;
  await fb.fsMod.setDoc(userRef(), {
    stateJson: JSON.stringify(store.state),
    updatedAt: store.state.updatedAt || Date.now(),
    email: currentUser.email || '',
    at: new Date().toISOString(),
  });
  emit({ type: 'pushed' });
}

// 로컬 변경 → 원격으로 debounce push
onStateChange(() => {
  if (!currentUser || applyingRemote) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => pushRemote().catch(() => {}), 1500);
});

export const sync = {
  user() { return currentUser; },
  isAuthed() { return localStorage.getItem('wp:authed') === '1'; },
  onStatus(cb) { statusCb = cb || (() => {}); },
  async init(cb) { if (cb) statusCb = cb; try { await ensureFirebase(); } catch (e) { emit({ type: 'offline', error: e.message }); } },
  async signInGoogle() { await ensureFirebase(); await fb.authMod.signInWithPopup(fb.auth, fb.provider); },
  async signInEmail(email, pw) { await ensureFirebase(); await fb.authMod.signInWithEmailAndPassword(fb.auth, email, pw); },
  async signUpEmail(email, pw) { await ensureFirebase(); await fb.authMod.createUserWithEmailAndPassword(fb.auth, email, pw); },
  async signOut() {
    if (unsub) { unsub(); unsub = null; }
    clearLocal();
    try { if (fb) await fb.authMod.signOut(fb.auth); } catch {}
    currentUser = null;
    localStorage.removeItem('wp:authed');
    emit({ type: 'auth' });
  },
  async pushNow() { if (!currentUser) throw new Error('로그인이 필요합니다.'); await pushRemote(); },
  async pullNow() {
    if (!currentUser) throw new Error('로그인이 필요합니다.');
    const snap = await fb.fsMod.getDoc(userRef());
    const d = snap.exists() ? snap.data() : null;
    if (d && d.stateJson) applyRemote(JSON.parse(d.stateJson));
    else throw new Error('클라우드에 저장된 데이터가 없어요.');
  },
};
