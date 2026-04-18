import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LifterProfileView } from '@/lifter/LifterProfileView';
import type { DisplayUnit } from '@/lib/types';
import { STORAGE_KEYS } from '@/lib/constants';
import uplotCss from 'uplot/dist/uPlot.min.css?inline';

const CONTAINER_ID = 'opl-coach-lifter-panel';

const injectStyles = () => {
  if (document.getElementById('opl-coach-lifter-styles')) return;
  const style = document.createElement('style');
  style.id = 'opl-coach-lifter-styles';
  style.textContent = `
    #${CONTAINER_ID} {
      margin: 24px 0;
      padding: 0 10px;
      max-width: 100%;
      overflow: hidden;
    }
    #${CONTAINER_ID} .opl-coach-header {
      color: #e05050;
      font-size: 1.5em;
      font-weight: bold;
      margin-bottom: 16px;
      font-family: inherit;
    }
    #${CONTAINER_ID} .lifter-profile {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    #${CONTAINER_ID} .lifter-header {
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    #${CONTAINER_ID} .lifter-name {
      font-size: 18px;
      color: #fff;
    }
    #${CONTAINER_ID} .lifter-meta {
      font-size: 13px;
      color: #aaa;
    }
    #${CONTAINER_ID} .lifter-bests {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    #${CONTAINER_ID} .best-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      background: rgba(255,255,255,0.03);
      border-radius: 4px;
      padding: 6px 10px;
    }
    #${CONTAINER_ID} .best-label {
      color: #aaa;
      font-size: 13px;
    }
    #${CONTAINER_ID} .best-value {
      color: #fff;
      font-size: 15px;
      font-family: monospace;
    }
    #${CONTAINER_ID} .best-value.squat { color: #e05050; }
    #${CONTAINER_ID} .best-value.bench { color: #FFD700; }
    #${CONTAINER_ID} .best-value.deadlift { color: #7bc67b; }
    #${CONTAINER_ID} .lifter-section {
      border-top: 1px solid rgba(255,255,255,0.08);
      padding-top: 14px;
    }
    #${CONTAINER_ID} .section-mini {
      color: #aaa;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
    }
    #${CONTAINER_ID} .progression-chart {
      width: 100%;
    }
    #${CONTAINER_ID} .comp-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    #${CONTAINER_ID} .comp-row {
      display: grid;
      grid-template-columns: 80px 1fr auto;
      gap: 8px;
      align-items: baseline;
      font-size: 13px;
      padding: 4px 0;
    }
    #${CONTAINER_ID} .comp-date {
      color: #888;
      font-family: monospace;
      font-size: 12px;
    }
    #${CONTAINER_ID} .comp-meet { color: #ddd; }
    #${CONTAINER_ID} .comp-total {
      color: #fff;
      font-family: monospace;
    }
    #${CONTAINER_ID} .comp-more {
      color: #888;
      font-size: 12px;
      padding: 6px 0;
    }
    #${CONTAINER_ID} .lifter-loading,
    #${CONTAINER_ID} .lifter-error {
      color: #aaa;
      font-size: 14px;
      padding: 20px 0;
    }
    #${CONTAINER_ID} .opl-coach-attr {
      text-align: right;
      font-size: 11px;
      color: #555;
      margin-top: 12px;
    }
    #${CONTAINER_ID} .u-legend {
      font-size: 12px !important;
      color: #aaa;
      padding: 8px 0 0;
    }
  `;
  document.head.appendChild(style);
};

const injectUplotCss = () => {
  if (document.getElementById('opl-coach-uplot-css')) return;
  const style = document.createElement('style');
  style.id = 'opl-coach-uplot-css';
  style.textContent = uplotCss;
  document.head.appendChild(style);
};

const findInjectionPoint = (): { target: Element; width: number } | null => {
  const tables = document.querySelectorAll('table');
  if (tables.length === 0) return null;
  const lastTable = tables[tables.length - 1];
  return { target: lastTable, width: lastTable.clientWidth };
};

const mount = async () => {
  const match = location.pathname.match(/^\/u\/([a-z0-9._-]+)/i);
  if (!match) return;
  const username = match[1];

  if (document.getElementById(CONTAINER_ID)) return;

  // Wait for tables to hydrate
  let injection: { target: Element; width: number } | null = null;
  for (let i = 0; i < 50; i++) {
    injection = findInjectionPoint();
    if (injection) break;
    await new Promise((r) => setTimeout(r, 100));
  }
  if (!injection) return;
  const { target, width: tableWidth } = injection;

  injectStyles();
  injectUplotCss();

  // Read display unit from stored profile
  const res = await chrome.storage.local.get(STORAGE_KEYS.profile);
  const displayUnit: DisplayUnit =
    (res[STORAGE_KEYS.profile]?.extras?.display_unit as DisplayUnit) ?? 'kg';

  const container = document.createElement('div');
  container.id = CONTAINER_ID;
  if (tableWidth > 0) container.style.maxWidth = `${tableWidth}px`;
  target.insertAdjacentElement('afterend', container);

  const header = document.createElement('h2');
  header.className = 'opl-coach-header';
  header.textContent = 'OPL Assistant — Progression';
  container.appendChild(header);

  const reactRoot = document.createElement('div');
  container.appendChild(reactRoot);

  const attr = document.createElement('div');
  attr.className = 'opl-coach-attr';
  attr.textContent = 'Powered by OPL Assistant';
  container.appendChild(attr);

  createRoot(reactRoot).render(
    <StrictMode>
      <LifterProfileView username={username} displayUnit={displayUnit} />
    </StrictMode>,
  );
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => mount(), { once: true });
} else {
  mount();
}
