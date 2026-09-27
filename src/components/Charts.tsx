import { money } from '../utils/erp';

interface ChartPoint {
  label: string;
  value: number;
}

const chartColors = ['#14b8a6', '#0d9488', '#2dd4bf', '#0f766e', '#5eead4', '#99f6e4'];

export function LineChart({ data, area = true }: { data: ChartPoint[]; area?: boolean }) {
  const safeData = data.length > 0 ? data : [{ label: '-', value: 0 }];
  const maxValue = Math.max(...safeData.map((item) => item.value), 1);
  const points = safeData.map((item, index) => {
    const x = safeData.length === 1 ? 280 : 45 + (index * 505) / (safeData.length - 1);
    const y = 175 - (item.value / maxValue) * 135;
    return { ...item, x, y };
  });
  const path = points.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPath = `45,175 ${path} 550,175`;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxValue * ratio));

  return (
    <div className="h-[260px] w-full pt-2">
      <svg viewBox="0 0 580 220" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {yTicks.map((tick, index) => {
          const y = 175 - (tick / maxValue) * 135;
          return (
            <g key={`${tick}-${index}`}>
              <line
                x1="45"
                x2="550"
                y1={y}
                y2={y}
                className="stroke-slate-200/80 dark:stroke-slate-800"
                strokeDasharray="3 4"
              />
              <text x="5" y={y + 4} className="fill-slate-400 dark:fill-slate-500 text-[11px] font-medium">
                {tick > 999 ? `${Math.round(tick / 1000)}k` : tick}
              </text>
            </g>
          );
        })}

        <line x1="45" x2="45" y1="35" y2="175" className="stroke-slate-200 dark:stroke-slate-750" />
        <line x1="45" x2="550" y1="175" y2="175" className="stroke-slate-200 dark:stroke-slate-750" />

        {area && <polygon points={areaPath} fill="url(#lineAreaGrad)" />}
        <polyline
          points={path}
          fill="none"
          stroke="#14b8a6"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point) => (
          <g key={point.label} className="group cursor-pointer">
            <circle
              cx={point.x}
              cy={point.y}
              r="4.5"
              className="fill-teal-500 stroke-white dark:stroke-slate-900 stroke-2 transition-transform duration-150 hover:r-6"
            />
            <text
              x={point.x}
              y="196"
              textAnchor="middle"
              className="fill-slate-400 dark:fill-slate-400 text-[11px] font-medium"
            >
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-[-10px] text-center text-xs font-medium text-teal-600 dark:text-teal-400">
        Faturamento em Reais (R$)
      </div>
    </div>
  );
}

export function PieChart({ data }: { data: ChartPoint[] }) {
  const total = Math.max(
    data.reduce((sum, item) => sum + item.value, 0),
    1,
  );
  let start = 0;
  const gradient = data
    .map((item, index) => {
      const percent = (item.value / total) * 100;
      const stop = start + percent;
      const segment = `${chartColors[index % chartColors.length]} ${start}% ${stop}%`;
      start = stop;
      return segment;
    })
    .join(', ');

  return (
    <div className="flex flex-col sm:flex-row h-auto sm:h-[250px] items-center justify-center gap-6 sm:gap-8 py-4">
      <div
        className="h-36 w-36 sm:h-40 sm:w-40 shrink-0 rounded-full border-4 border-white shadow-md dark:border-slate-800 ring-1 ring-slate-200 dark:ring-slate-700/60"
        style={{ background: `conic-gradient(${gradient})` }}
      />
      <div className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
        {data.map((item, index) => (
          <div key={item.label} className="flex items-center gap-2.5">
            <span
              className="h-3 w-3 shrink-0 rounded-md shadow-xs"
              style={{ backgroundColor: chartColors[index % chartColors.length] }}
            />
            <span className="font-medium">
              {item.label}: <strong className="text-slate-900 dark:text-white">{Math.round((item.value / total) * 100)}%</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function BarChart({ data, horizontal = false }: { data: ChartPoint[]; horizontal?: boolean }) {
  const safeData = data.length > 0 ? data : [{ label: '-', value: 0 }];
  const maxValue = Math.max(...safeData.map((item) => item.value), 1);

  if (horizontal) {
    return (
      <div className="space-y-3.5 py-3">
        {safeData.map((item) => (
          <div key={item.label} className="grid grid-cols-[110px_1fr_96px] items-center gap-3 text-xs sm:text-sm">
            <span className="truncate font-medium text-slate-600 dark:text-slate-300">{item.label}</span>
            <div className="h-7 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-lg bg-gradient-to-r from-teal-600 to-teal-400 transition-all duration-300"
                style={{ width: `${Math.max(6, (item.value / maxValue) * 100)}%` }}
              />
            </div>
            <span className="text-right font-bold text-slate-800 dark:text-slate-100 tabular-nums">
              {money(item.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-[220px] items-end gap-3 sm:gap-4 px-2 sm:px-4 pb-6 pt-4">
      {safeData.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div
            className="w-full rounded-t-lg bg-gradient-to-t from-teal-600 to-teal-400 shadow-sm transition-all duration-300 hover:brightness-110"
            style={{ height: `${Math.max(14, (item.value / maxValue) * 165)}px` }}
          />
          <span className="w-full truncate text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}
