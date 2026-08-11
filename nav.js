import { state } from './state.js';
import { TAB_ORDER } from './constants.js';
import { renderStats } from './stats.js';

export function switchTab(type){
  state.currentTab = type;
  document.querySelectorAll('.nav-item').forEach(t => t.classList.toggle('active', t.dataset.type === type));
  document.getElementById('statsBtn').classList.toggle('active', type === 'stats');
  document.getElementById('fab').style.display = type === 'stats' ? 'none' : 'flex';

  if(type === 'stats'){
    document.getElementById('pager').style.display = 'none';
    document.getElementById('statsView').style.display = 'block';
    renderStats(document.getElementById('statsView'));
    return;
  }
  document.getElementById('pager').style.display = 'flex';
  document.getElementById('statsView').style.display = 'none';
  const idx = TAB_ORDER.indexOf(type);
  const pager = document.getElementById('pager');
  pager.scrollTo({ left: idx * pager.clientWidth, behavior: 'smooth' });
}

export function initPagerSync(){
  const pager = document.getElementById('pager');
  let ticking = false;
  pager.addEventListener('scroll', () => {
    if(ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const idx = Math.round(pager.scrollLeft / pager.clientWidth);
      const type = TAB_ORDER[idx];
      if(type && type !== state.currentTab){
        state.currentTab = type;
        document.querySelectorAll('.nav-item').forEach(t => t.classList.toggle('active', t.dataset.type === type));
      }
      ticking = false;
    });
  });
}
