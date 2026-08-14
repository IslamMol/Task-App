import { sb } from './services/supabase.js';
import { state } from './state.js';
import { applyTheme } from './theme.js';
import { ensureCompass, renderCompass } from './compass.js';
import { loadEntries, renderList } from './entries.js';
import { renderSubtabs } from './personalization.js';
import { renderDashboard } from './dashboard.js';
import { switchMainTab, switchHomeSub, switchTaskSub } from './nav.js';

export async function init(){
  const { data } = await sb.auth.getSession();
  state.session = data.session;
  if(state.session){ showApp(); } else { showAuth(); }
  sb.auth.onAuthStateChange((event, s) => {
    state.session = s;
    if(s) showApp(); else showAuth();
  });
}

export function showAuth(){
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('appScreen').style.display = 'none';
  const fab=document.getElementById('fab'); if(fab) fab.style.display='none';
}

export function toggleAuthMode(){
  state.authMode = state.authMode === 'signin' ? 'signup' : 'signin';
  document.getElementById('authMainBtn').textContent = state.authMode === 'signin' ? 'Войти' : 'Зарегистрироваться';
  document.getElementById('authMainBtn').setAttribute('onclick', state.authMode === 'signin' ? 'signIn()' : 'signUp()');
  document.getElementById('authSwitchBtn').textContent = state.authMode === 'signin' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти';
  document.getElementById('authMsg').textContent = '';
}

export async function signIn(){
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const msg = document.getElementById('authMsg');
  if(!email || !password){ msg.textContent = 'Заполни почту и пароль'; return; }
  msg.textContent = 'Вхожу...';
  const { error } = await sb.auth.signInWithPassword({ email, password });
  msg.textContent = error ? 'Ошибка: ' + error.message : '';
}

export async function signUp(){
  const email = document.getElementById('emailInput').value.trim();
  const password = document.getElementById('passwordInput').value;
  const msg = document.getElementById('authMsg');
  if(!email || !password){ msg.textContent = 'Заполни почту и пароль'; return; }
  if(password.length < 6){ msg.textContent = 'Пароль минимум 6 символов'; return; }
  msg.textContent = 'Создаю аккаунт...';
  const { data, error } = await sb.auth.signUp({ email, password });
  if(error){ msg.textContent = 'Ошибка: ' + error.message; return; }
  if(data.session){ msg.textContent = ''; } else { msg.textContent = 'Проверь почту — нужно подтвердить регистрацию один раз'; }
}

export async function showApp(){
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('appScreen').style.display = 'block';
  document.getElementById('bottomNav').style.display = 'flex';
  const userEmail=document.getElementById('userEmail'); if(userEmail) userEmail.textContent=state.session.user.email;
  applyTheme();
  await ensureCompass();
  await loadEntries();
  renderCompass();
  renderSubtabs();
  switchHomeSub(state.homeSub);
  switchTaskSub(state.taskSub);
  renderList();
  renderDashboard();
  switchMainTab('home');
}
