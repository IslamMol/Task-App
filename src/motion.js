let currentSheet = null;
let sheetStartY = 0;
let sheetCurrentY = 0;
let sheetDragging = false;

export function initMotion(){
  installSheetGuards();
  installCardGestures();
  installPressEffects();
}

function installSheetGuards(){
  document.addEventListener('keydown', (e)=>{
    const modal = document.querySelector('.modal-bg');
    if(!modal) return;
    if(e.key === 'Escape'){
      e.preventDefault();
      closeModal(modal);
      return;
    }
    if(e.key === 'Tab'){
      const focusables = [...modal.querySelectorAll('button,input,select,textarea,[href], [tabindex]:not([tabindex="-1"])')]
        .filter(el => !el.disabled && el.offsetParent !== null);
      if(!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    }
  });

  document.addEventListener('click', (e)=>{
    const close = e.target.closest('[data-sheet-close]');
    if(close){
      const modal = close.closest('.modal-bg');
      if(modal) closeModal(modal);
    }
  });

  const observer = new MutationObserver(()=>{
    const modal = document.querySelector('.modal-bg');
    if(modal && modal !== currentSheet){
      currentSheet = modal;
      document.body.classList.add('gc-modal-open');
      bindSheetDrag(modal);
    }
    if(!modal) currentSheet = null;
  });
  observer.observe(document.body, {childList:true, subtree:true});
}

function bindSheetDrag(modal){
  const sheet = modal.querySelector('.add-sheet');
  if(!sheet || sheet.dataset.motionBound) return;
  sheet.dataset.motionBound = '1';
  const handle = sheet.querySelector('.sheet-handle');
  const target = handle || sheet;
  const start = (e)=>{
    const p = e.touches ? e.touches[0] : e;
    sheetStartY = p.clientY; sheetCurrentY = 0; sheetDragging = true;
    sheet.classList.add('is-dragging');
  };
  const move = (e)=>{
    if(!sheetDragging) return;
    const p = e.touches ? e.touches[0] : e;
    const dy = Math.max(0, p.clientY - sheetStartY);
    sheetCurrentY = dy;
    sheet.style.transform = `translateY(${dy}px)`;
    modal.style.backgroundColor = `rgba(35,37,42,${Math.max(.08,.32 - dy/900)})`;
  };
  const end = ()=>{
    if(!sheetDragging) return;
    sheetDragging = false;
    sheet.classList.remove('is-dragging');
    if(sheetCurrentY > Math.min(180, window.innerHeight * .22)) closeModal(modal);
    else { sheet.style.transform=''; modal.style.backgroundColor=''; }
  };
  target.addEventListener('pointerdown', start);
  target.addEventListener('pointermove', move);
  target.addEventListener('pointerup', end);
  target.addEventListener('pointercancel', end);
}

function closeModal(modal){
  modal.classList.add('is-closing');
  setTimeout(()=>{ modal.remove(); document.body.classList.remove('gc-modal-open'); }, 180);
}

function installCardGestures(){
  document.addEventListener('pointerdown', (e)=>{
    const card = e.target.closest('.entry-card');
    if(!card || e.target.closest('button,input,select,textarea,a')) return;
    card.dataset.gestureStartX = e.clientX;
    card.dataset.gestureStartY = e.clientY;
    card.dataset.gestureActive = '1';
    card.classList.add('gesture-ready');
    card.setPointerCapture?.(e.pointerId);
  });
  document.addEventListener('pointermove', (e)=>{
    const card = e.target.closest('.entry-card');
    if(!card || card.dataset.gestureActive !== '1') return;
    const dx = e.clientX - Number(card.dataset.gestureStartX || e.clientX);
    const dy = e.clientY - Number(card.dataset.gestureStartY || e.clientY);
    if(Math.abs(dx) < Math.abs(dy) || Math.abs(dx) < 8) return;
    const clamped = Math.max(-84, Math.min(84, dx));
    card.style.setProperty('--swipe-x', `${clamped}px`);
    card.classList.toggle('swiping-left', clamped < -8);
    card.classList.toggle('swiping-right', clamped > 8);
  });
  document.addEventListener('pointerup', (e)=>finishGesture(e));
  document.addEventListener('pointercancel', (e)=>finishGesture(e));

  document.addEventListener('click', (e)=>{
    const card = e.target.closest('.entry-card');
    if(!card || !card.classList.contains('swiped-open')) return;
    if(e.target.closest('button,.swipe-action')) return;
    closeSwipe(card);
  });
}

function finishGesture(e){
  const card = e.target.closest('.entry-card');
  if(!card || card.dataset.gestureActive !== '1') return;
  const x = parseFloat(getComputedStyle(card).getPropertyValue('--swipe-x')) || 0;
  card.dataset.gestureActive = '0';
  card.classList.remove('gesture-ready');
  if(Math.abs(x) >= 55){
    card.classList.toggle('swiped-open', true);
    card.classList.toggle('swiped-left', x < 0);
    card.style.setProperty('--swipe-x', `${x < 0 ? -76 : 76}px`);
  } else {
    closeSwipe(card);
  }
}

function closeSwipe(card){
  card.classList.remove('swiped-open','swiped-left','swiped-right');
  card.style.setProperty('--swipe-x','0px');
}

function installPressEffects(){
  document.addEventListener('pointerdown', (e)=>{
    const el = e.target.closest('button,.card,.settings-section,.stats-card,.dashboard-card,.dashboard-task-row,.dashboard-hero');
    if(!el || el.matches('button.nav-item')) return;
    el.classList.add('pressing');
  });
  const clear = (e)=>{ e.target.closest?.('.pressing')?.classList.remove('pressing'); };
  document.addEventListener('pointerup', clear);
  document.addEventListener('pointercancel', clear);
}
