// Общее состояние приложения. Экспортируется как объект (не отдельные let),
// чтобы все модули видели одни и те же актуальные значения после мутации.
export const state = {
  // 'currentTab' переименовано в 'activeEntryType' по смыслу: раньше это
  // была и вкладка, и тип записи одновременно — теперь это разделено:
  mainTab: 'home',            // home | tasks | calendar | settings
  homeSub: 'habit',           // habit | note | finance
  taskSub: 'quest',           // quest | book
  activeEntryType: 'habit',   // какой тип создаёт кнопка "+" прямо сейчас

  session: null,
  entries: [],
  compassItems: [],
  transactions: [],
  authMode: 'signin',

  lang: localStorage.getItem('lang') || 'ru',
};
