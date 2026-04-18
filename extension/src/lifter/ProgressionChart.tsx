import { useEffect, useRef } from 'react';
import uPlot from 'uplot';
import type { CompetitionEntry } from './types';
import type { DisplayUnit } from '@/lib/types';
import { toLb } from '@/lib/units';

type Props = {
  entries: CompetitionEntry[];
  displayUnit: DisplayUnit;
};

const toTimestamp = (dateStr: string): number =>
  new Date(dateStr).getTime() / 1000;

const convert = (kg: number | null, unit: DisplayUnit): number | null => {
  if (kg == null) return null;
  return unit === 'kg' ? kg : Math.round(toLb(kg, 'kg'));
};

function buildOpts(width: number, unitLabel: string): uPlot.Options {
  return {
    width,
    height: 280,
    cursor: { show: true, drag: { x: false, y: false } },
    legend: { show: true },
    scales: {
      x: { time: true },
      y: { auto: true },
    },
    axes: [
      {
        stroke: '#888',
        grid: { stroke: 'rgba(255,255,255,0.06)', width: 1 },
        ticks: { stroke: 'rgba(255,255,255,0.08)', width: 1 },
        font: '11px -apple-system, sans-serif',
      },
      {
        stroke: '#888',
        grid: { stroke: 'rgba(255,255,255,0.06)', width: 1 },
        ticks: { stroke: 'rgba(255,255,255,0.08)', width: 1 },
        font: '11px -apple-system, sans-serif',
        values: (_u: uPlot, vals: number[]) =>
          vals.map((v) => `${Math.round(v)} ${unitLabel}`),
      },
    ],
    series: [
      {},
      {
        label: 'Total',
        stroke: '#9cbcf0',
        width: 2,
        points: { size: 5, fill: '#9cbcf0' },
      },
      {
        label: 'Squat',
        stroke: '#e05050',
        width: 1.5,
        points: { size: 3, fill: '#e05050' },
      },
      {
        label: 'Bench',
        stroke: '#e0c878',
        width: 1.5,
        points: { size: 3, fill: '#e0c878' },
      },
      {
        label: 'Deadlift',
        stroke: '#7bc67b',
        width: 1.5,
        points: { size: 3, fill: '#7bc67b' },
      },
    ],
  };
}

export const ProgressionChart = ({ entries, displayUnit }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<uPlot | null>(null);

  useEffect(() => {
    if (!containerRef.current || entries.length === 0) return;

    const sorted = [...entries]
      .filter((e) => e.totalKg != null)
      .sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length === 0) return;

    const data: uPlot.AlignedData = [
      sorted.map((e) => toTimestamp(e.date)),
      sorted.map((e) => convert(e.totalKg, displayUnit)) as number[],
      sorted.map((e) => convert(e.squatKg, displayUnit)) as number[],
      sorted.map((e) => convert(e.benchKg, displayUnit)) as number[],
      sorted.map((e) => convert(e.deadliftKg, displayUnit)) as number[],
    ];

    const container = containerRef.current;

    // Defer until the browser has laid out the container so clientWidth is real.
    // On OPL's page the div is injected into the DOM but layout hasn't happened
    // yet when the React effect fires — clientWidth reads 0.
    let cancelled = false;
    const tryInit = () => {
      if (cancelled) return;
      const w = container.clientWidth;
      if (w < 100) {
        requestAnimationFrame(tryInit);
        return;
      }
      if (chartRef.current) chartRef.current.destroy();
      chartRef.current = new uPlot(buildOpts(w, displayUnit), data, container);
    };
    requestAnimationFrame(tryInit);

    return () => {
      cancelled = true;
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [entries, displayUnit]);

  // Resize: re-measure container and update canvas width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const obs = new ResizeObserver((resizeEntries) => {
      const entry = resizeEntries[0];
      if (!entry || !chartRef.current) return;
      const w = entry.contentRect.width;
      if (w > 50) {
        chartRef.current.setSize({ width: w, height: 280 });
      }
    });
    obs.observe(container);
    return () => obs.disconnect();
  }, []);

  if (entries.length === 0) {
    return <div className="empty-note">No competition data available.</div>;
  }

  return <div ref={containerRef} className="progression-chart" />;
};
