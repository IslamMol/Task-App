// Переводит "каркас" интерфейса (навигация, заголовки разделов, настройки).
// Контент, который создаёт сам пользователь (названия квестов, книг,
// заметки) — не переводится, это его собственный текст на любом языке.

export const STRINGS = {
  ru: {
    navHome: 'Домой', navTasks: 'Задания', navCalendar: 'Календарь', navSettings: 'Настройки',
    subHabit: 'Привычки', subNote: 'Дела', subFinance: 'Затраты',
    subQuest: 'Квесты', subBook: 'Книги',
    settingsPersonalization: 'Персонализация',
    settingsAccount: 'Аккаунт',
    settingsLanguage: 'Язык',
    settingsGuide: 'Помощник-путеводитель',
    avatarLabel: 'Аватарка',
    saveBtn: 'Сохранить',
    logoutBtn: 'Выйти из аккаунта',
    changePassword: 'Сменить пароль',
    changeEmail: 'Сменить почту',
    deleteAccount: 'Удалить аккаунт',
    calendarTitle: 'Важные даты',
    calendarEmpty: 'Пока нет ни одной даты. Нажми + чтобы добавить',
    financeStub: 'Учёт затрат — в разработке. Появится в одном из следующих обновлений.',
  },
  en: {
    navHome: 'Home', navTasks: 'Tasks', navCalendar: 'Calendar', navSettings: 'Settings',
    subHabit: 'Habits', subNote: 'Errands', subFinance: 'Finance',
    subQuest: 'Quests', subBook: 'Books',
    settingsPersonalization: 'Personalization',
    settingsAccount: 'Account',
    settingsLanguage: 'Language',
    settingsGuide: 'Guide',
    avatarLabel: 'Avatar',
    saveBtn: 'Save',
    logoutBtn: 'Log out',
    changePassword: 'Change password',
    changeEmail: 'Change email',
    deleteAccount: 'Delete account',
    calendarTitle: 'Important dates',
    calendarEmpty: 'No dates yet. Tap + to add one',
    financeStub: 'Expense tracking is in development. Coming in a future update.',
  },
};

export function t(key, lang){
  return STRINGS[lang]?.[key] ?? STRINGS.ru[key] ?? key;
}
