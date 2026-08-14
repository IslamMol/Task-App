export function applyTheme(){
  const saved=localStorage.getItem('theme')||'light';
  document.documentElement.setAttribute('data-theme',saved);
  const btn=document.getElementById('themeToggle');
  if(btn) updateThemeButton(btn,saved);
}
function updateThemeButton(btn,theme){
  btn.setAttribute('aria-pressed',theme==='dark'?'true':'false');
  btn.querySelectorAll('[data-theme-choice]').forEach(el=>el.classList.toggle('active',el.dataset.themeChoice===theme));
}
export function setTheme(theme){
  const next=theme==='dark'?'dark':'light';
  document.documentElement.setAttribute('data-theme',next);
  localStorage.setItem('theme',next);
  const btn=document.getElementById('themeToggle'); if(btn) updateThemeButton(btn,next);
}
export function toggleTheme(){
  const current=document.documentElement.getAttribute('data-theme')||'light';
  setTheme(current==='dark'?'light':'dark');
}
