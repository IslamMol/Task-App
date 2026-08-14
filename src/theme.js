export function applyTheme(){
  const saved = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('themeToggle');
  if(btn){
    btn.setAttribute('aria-pressed', saved === 'dark' ? 'true' : 'false');
    const label = btn.querySelector('.theme-label');
    if(label) label.textContent = saved === 'dark' ? 'Тёмная' : 'Светлая';
  }
}

export function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme') || 'light';
  const next = cur === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', next);
  applyTheme();
}
