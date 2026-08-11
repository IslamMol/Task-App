// ВАЖНО: логика ниже пока такая же, как была в index.html (использует UTC
// через toISOString()). Это тот самый баг с часовым поясом, который нужно
// исправить отдельным шагом (см. аудит, Этап 2 намеренно его не трогает,
// чтобы не менять поведение при рефакторинге).

export function todayStr(){
  return new Date().toISOString().slice(0, 10);
}

export function yesterdayStr(){
  return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}
