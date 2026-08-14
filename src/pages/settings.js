import { state } from '../state.js';
import { sb } from '../services/supabase.js';
import { t } from '../i18n.js';
import { getHomeOrder, getTaskOrder, moveHomeItem, moveTaskItem, SUB_LABELS } from '../personalization.js';

// ПРИМЕЧАНИЯ ЧЕСТНО (см. пояснение в чате после этого шага):
// 1. Аватарка — здесь это ссылка на картинку (как у обложек Мечты/Цели),
//    а не выбор файла из галереи. Полноценный выбор + загрузка своей
//    фотографии потребует Supabase Storage (отдельная настройка) — можно
//    сделать следующим шагом.
// 2. "Удалить аккаунт" — с публичным (anon/publishable) ключом фронтенд
//    физически не может удалить саму запись пользователя из Supabase Auth,
//    это ограничение самого Supabase (нужны права администратора). Что
//    реально можно сделать отсюда — стереть все данные пользователя и
//    выйти из аккаунта. Сама учётная запись (вход по почте) при этом
//    останется — её удаление делается через панель Supabase вручную.

export function renderSettings(){
  const view = document.getElementById('settingsView');
  const lang = state.lang;
  const avatarUrl = state.session?.user?.user_metadata?.avatar_url || '';
  const email = state.session?.user?.email || '';
  const displayName = email.split('@')[0] || 'Пользователь';
  const initial = displayName.charAt(0).toUpperCase();

  view.innerHTML = `
    <div class="settings-hero">
      <div class="settings-avatar-lg" style="${avatarUrl ? `background-image:url('${avatarUrl}')` : ''}">
        ${avatarUrl ? '' : `<span style="font-size:22px;font-weight:800;color:var(--ds-accent)">${initial}</span>`}
      </div>
      <div style="min-width:0;">
        <div class="settings-hero-title">${displayName}</div>
        <div class="settings-hero-sub">${email}</div>
      </div>
    </div>

    <div class="settings-section">
      <h3>${t('avatarLabel', lang)}</h3>
      <input id="avatarUrlInput" placeholder="Ссылка на фото" value="${avatarUrl}">
      <button class="primary" onclick="saveAvatar()">${t('saveBtn', lang)}</button>
    </div>

    <div class="settings-section">
      <h3>${t('settingsPersonalization', lang)}</h3>
      <div class="reorder-block">
        <div class="reorder-label">Домой</div>
        ${getHomeOrder().map((s, i, arr) => `
          <div class="reorder-row">
            <span>${SUB_LABELS[s]}</span>
            <span>
              <button class="ghost" onclick="moveHomeItem('${s}',-1)" ${i===0?'disabled':''}>↑</button>
              <button class="ghost" onclick="moveHomeItem('${s}',1)" ${i===arr.length-1?'disabled':''}>↓</button>
            </span>
          </div>`).join('')}
        <div class="reorder-label" style="margin-top:14px;">Задания</div>
        ${getTaskOrder().map((s, i, arr) => `
          <div class="reorder-row">
            <span>${SUB_LABELS[s]}</span>
            <span>
              <button class="ghost" onclick="moveTaskItem('${s}',-1)" ${i===0?'disabled':''}>↑</button>
              <button class="ghost" onclick="moveTaskItem('${s}',1)" ${i===arr.length-1?'disabled':''}>↓</button>
            </span>
          </div>`).join('')}
      </div>
    </div>

    <div class="settings-section">
      <h3>${t('settingsLanguage', lang)}</h3>
      <div class="lang-row">
        <button class="ghost ${lang==='ru'?'lang-active':''}" style="width:auto;padding:9px 16px;" onclick="setAppLang('ru')">Русский</button>
        <button class="ghost ${lang==='en'?'lang-active':''}" style="width:auto;padding:9px 16px;" onclick="setAppLang('en')">English</button>
      </div>
    </div>

    <div class="settings-section settings-preferences-v6">
      <h3>Быстрые настройки</h3>
      <div class="settings-option-v6"><div><strong>Тема интерфейса</strong><span>Светлая / тёмная</span></div><button class="settings-action-v6" onclick="toggleTheme()">Переключить</button></div>
      <div class="settings-option-v6"><div><strong>Синхронизация</strong><span>Данные сохраняются локально и в Supabase</span></div><span class="settings-status-v6">Готово</span></div>
      <div class="settings-option-v6"><div><strong>Язык</strong><span>${lang==='ru'?'Русский':'English'}</span></div><div class="settings-inline-v6"><button onclick="setAppLang('ru')" class="${lang==='ru'?'active':''}">RU</button><button onclick="setAppLang('en')" class="${lang==='en'?'active':''}">EN</button></div></div>
    </div>

    <div class="settings-section">
      <h3>${t('settingsAccount', lang)}</h3>
      <input id="newEmailInput" placeholder="Новая почта">
      <button class="primary" onclick="changeEmail()">${t('changeEmail', lang)}</button>
      <input id="newPasswordInput" type="password" placeholder="Новый пароль" style="margin-top:10px;">
      <button class="primary" onclick="changePassword()">${t('changePassword', lang)}</button>
      <p id="accountMsg" class="sub" style="margin:10px 0 0;"></p>
      <button class="ghost" onclick="logout()" style="margin-top:8px;">${t('logoutBtn', lang)}</button>
      <button class="ghost settings-danger" style="margin-top:4px;" onclick="confirmDeleteAccount()">${t('deleteAccount', lang)}</button>
    </div>

    <div class="settings-section">
      <h3>${t('settingsGuide', lang)}</h3>
      <div class="guide-text">
        <p><b>Квесты</b> — разовые задачи с галочкой «выполнено».</p>
        <p><b>Привычки</b> — отмечаются каждый день и считают серию дней подряд.</p>
        <p><b>Книги</b> — прогресс по страницам, можно привязать к Цели.</p>
        <p><b>Дела</b> — заметки с категориями.</p>
        <p><b>Мечта / Цель / Путь</b> — долгосрочные ориентиры на главной.</p>
        <p><b>Календарь</b> — важные даты с экспортом в .ics.</p>
      </div>
    </div>
  `;
}

export async function saveAvatar(){
  const url = document.getElementById('avatarUrlInput').value.trim();
  const { data, error } = await sb.auth.updateUser({ data: { avatar_url: url } });
  if(!error && data.user){ state.session.user = data.user; }
  renderSettings();
}

export function setAppLang(lang){
  state.lang = lang;
  localStorage.setItem('lang', lang);
  renderSettings();
  // Обновляем и статичные подписи вне экрана настроек (навигация и т.п.)
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n, lang);
  });
}

export async function changeEmail(){
  const email = document.getElementById('newEmailInput').value.trim();
  const msg = document.getElementById('accountMsg');
  if(!email){ return; }
  msg.textContent = 'Обновляю...';
  const { error } = await sb.auth.updateUser({ email });
  msg.textContent = error ? 'Ошибка: ' + error.message : 'Проверь новую почту — придёт письмо для подтверждения.';
}

export async function changePassword(){
  const password = document.getElementById('newPasswordInput').value;
  const msg = document.getElementById('accountMsg');
  if(!password || password.length < 6){ msg.textContent = 'Пароль минимум 6 символов'; return; }
  msg.textContent = 'Обновляю...';
  const { error } = await sb.auth.updateUser({ password });
  msg.textContent = error ? 'Ошибка: ' + error.message : 'Пароль обновлён.';
}

export async function logout(){
  await sb.auth.signOut();
}

export function confirmDeleteAccount(){
  const ok = confirm(
    'Это удалит ВСЕ твои квесты, привычки, книги, дела, Мечту/Цель/Путь и даты без возможности восстановить. ' +
    'Сама учётная запись (вход по почте) при этом останется — её нужно будет отдельно удалить через администратора. Продолжить?'
  );
  if(ok) eraseMyData();
}

export async function eraseMyData(){
  const uid = state.session?.user?.id;
  if(!uid) return;
  await sb.from('compass_entries').delete().eq('user_id', uid);
  await sb.from('entries').delete().eq('user_id', uid);
  await sb.from('compass').delete().eq('user_id', uid);
  await sb.auth.signOut();
}
