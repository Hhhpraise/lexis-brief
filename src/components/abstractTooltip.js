/**
 * src/components/abstractTooltip.js
 *
 * Floating abstract tooltip for paper cards — desktop/mouse only.
 * Uses (hover: hover) and (pointer: fine) media query.
 * No-op on touch devices.
 */

const CAN_HOVER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

let tooltip   = null;
let hideTimer = null;

function buildTooltip() {
  const el = document.createElement('div');
  el.id = 'abstract-tooltip';
  el.setAttribute('role', 'tooltip');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = `<p class="tooltip-label">Abstract</p><p class="tooltip-body"></p>`;
  document.body.appendChild(el);
  return el;
}

function show(card, abstract) {
  if (!tooltip) tooltip = buildTooltip();
  clearTimeout(hideTimer);
  tooltip.querySelector('.tooltip-body').textContent = abstract;
  tooltip.setAttribute('aria-hidden', 'false');
  tooltip.classList.add('visible');
  position(card);
}

function position(card) {
  if (!tooltip) return;
  const rect   = card.getBoundingClientRect();
  const tipH   = tooltip.offsetHeight;
  const tipW   = Math.min(360, window.innerWidth - 32);
  const margin = 10;
  const above  = rect.top >= tipH + margin;
  const top    = above
    ? rect.top  + window.scrollY - tipH - margin
    : rect.bottom + window.scrollY + margin;
  let left = rect.left + window.scrollX;
  left = Math.max(16, Math.min(left, window.innerWidth - tipW - 16));
  tooltip.style.top   = `${top}px`;
  tooltip.style.left  = `${left}px`;
  tooltip.style.width = `${tipW}px`;
  tooltip.classList.toggle('above',  above);
  tooltip.classList.toggle('below', !above);
}

function hide() {
  hideTimer = setTimeout(() => {
    if (!tooltip) return;
    tooltip.classList.remove('visible', 'above', 'below');
    tooltip.setAttribute('aria-hidden', 'true');
  }, 120);
}

export function initAbstractTooltip() {
  if (!CAN_HOVER) return;

  document.addEventListener('mouseover', e => {
    const card = e.target.closest('[data-abstract]');
    if (!card) return;
    show(card, card.dataset.abstract);
  });

  document.addEventListener('mouseout', e => {
    const card = e.target.closest('[data-abstract]');
    if (!card) return;
    if (tooltip?.contains(e.relatedTarget)) return;
    hide();
  });

  document.addEventListener('mouseover', e => {
    if (tooltip?.contains(e.target)) clearTimeout(hideTimer);
  });
  document.addEventListener('mouseout', e => {
    if (e.target === tooltip) hide();
  });

  window.addEventListener('scroll', () => {
    if (!tooltip?.classList.contains('visible')) return;
    const hovered = document.querySelector('[data-abstract]:hover');
    if (hovered) position(hovered); else hide();
  }, { passive: true });
}
