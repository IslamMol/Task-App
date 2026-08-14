export function applyTheme(){
  const saved = 'light';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('themeBtn');
  if(btn) btn.textContent = saved === 'dark' ? '🌙' : '☀️';
}

export function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  localStorage.setItem('theme', next);
  applyTheme();
}
