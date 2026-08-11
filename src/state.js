// Общее состояние приложения. Экспортируется как объект (не отдельные let),
// чтобы все модули видели одни и те же актуальные значения после мутации.
export const state = {
  currentTab: 'quest',
  session: null,
  entries: [],
  compassItems: [],
  authMode: 'signin',
};
