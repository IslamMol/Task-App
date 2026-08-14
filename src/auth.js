import { sb } from './services/supabase.js';
import { state } from './state.js';
import { applyTheme } from './theme.js';
import { ensureCompass, renderCompass } from './compass.js';
import { loadEntries, renderList } from './entries.js';
import { renderSubtabs } from './personalization.js';
import { switchMainTab, switchHomeSub, switchTaskSub } from './nav.js';
import { renderDashboard } from './dashboard.js';

export async function init(){
  const { data } = await sb.auth.getSession();
  state.session = data.session;
  if(state.session){ showApp(); } else { showAuth(); }
  sb.auth.onAuthStateChange((event, s) => {
    state.session = s;
    if(s) showApp(); else showAuth();
  });
}

let authKeyBound = false;

export function showAuth(){
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appScreen').style.display = 'none';
  document.getElementById('fab').style.display = 'none';
  if(!authKeyBound){
    authKeyBound = true;
    document.getElementById('passwordInput')?.addEventListener('keydown', (e)=>{
      if(e.key !== 'Enter') return;
      e.preventDefault();
      state.authMode === 'signin' ? signIn() : signUp();
    });
  }
}

function setAuthBusy(busy){
  const main = document.getElementById('authMainBtn');
  const switchBtn = document.getElementById('authSwitchBtn');
  if(main){ main.disabled = busy; main.setAttribute('aria-busy', busy ? 'true' : 'false'); }
  if(switchBtn) switchBtn.disabled = busy;
}

function normalizeAuthError(message=''){
  const m = message.toLowerCase();
  if(m.includes('invalid login credentials')) return 'Неверная почта или пароль.';
  if(m.includes('email not confirmed')) return 'Сначала подтверди почту, затем войди снова.';
  if(m.includes('user already registered')) return 'Этот адрес уже зарегистрирован. Попробуй войти.';
  return message || 'Не удалось выполнить действие. Попробуй ещё раз.';
}

export function toggleAuthMode(){
  state.authMode = state.authMode === 'signin' ? 'signup' : 'signin';
  document.getElementById('authMainBtn').textContent = state.authMode === 'signin' ? 'Войти' : 'Зарегистрироваться';
  document.getElementById('authMainBtn').setAttribute('onclick', state.authMode === 'signin' ? 'signIn()' : 'signUp()');
  const signingIn = state.authMode === 'signin';
  document.getElementById('authSwitchBtn').textContent = signingIn ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти';
  const pill = document.getElementById('authModePill');
  if(pill) pill.textContent = signingIn ? 'Вход' : 'Регистрация';
  const subtitle = document.getElementById('authSubtitle');
  if(subtitle) subtitle.textContent = signingIn ? 'Планируй день. Строй привычки. Двигайся дальше.' : 'Создай аккаунт и собери своё пространство привычек.';
  const password = document.getElementById('passwordInput');
  if(password) password.setAttribute('autocomplete', signingIn ? 'current-password' : 'new-password');
  document.getElementById('authMsg').textContent = '';
}

export async function signIn(){
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const msg = document.getElementById('authMsg');
  if(!email || !password){ msg.textContent = 'Заполни почту и пароль'; return; }
  msg.textContent = 'Вхожу...';
  setAuthBusy(true);
  const { error } = await sb.auth.signInWithPassword({ email, password });
  setAuthBusy(false);
  msg.textContent = error ? normalizeAuthError(error.message) : '';
}

export async function signUp(){
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const msg = document.getElementById('authMsg');
  if(!email || !password){ msg.textContent = 'Заполни почту и пароль'; return; }
  if(password.length < 6){ msg.textContent = 'Пароль минимум 6 символов'; return; }
  msg.textContent = 'Создаю аккаунт...';
  setAuthBusy(true);
  const { data, error } = await sb.auth.signUp({ email, password });
  setAuthBusy(false);
  if(error){ msg.textContent = normalizeAuthError(error.message); return; }
  if(data.session){ msg.textContent = ''; } else { msg.textContent = 'Проверь почту — нужно подтвердить регистрацию один раз'; }
}

export async function showApp(){
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appScreen').style.display = 'block';
  document.getElementById('bottomNav').style.display = 'flex';
  document.getElementById('userEmail').textContent = state.session.user.email;
  applyTheme();
  await ensureCompass();
  await loadEntries();
  renderCompass();
  renderSubtabs();
  renderDashboard();
  switchHomeSub(state.homeSub);
  switchTaskSub(state.taskSub);
  switchMainTab('home');
  renderList();
}
