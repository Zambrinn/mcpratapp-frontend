import { money } from '../utils/erp';

interface ChartPoint {
  label: string;
  value: number;
}

const chartColors = ['#7eaaa3', '#5d9088', '#aac8c3', '#356f67', '#d8e7e4'];

export function LineChart({ data, area = false }: { data: ChartPoint[]; area?: boolean }) {
  const safeData = data.length > 0 ? data : [{ label: '-', value: 0 }];
  const maxValue = Math.max(...safeData.map((item) => item.value), 1);
  const points = safeData.map((item, index) => {
    const x = safeData.length === 1 ? 280 : 40 + (index * 520) / (safeData.length - 1);
    const y = 180 - (item.value / maxValue) * 135;
    return { ...item, x, y };
  });
  const path = points.map((point) => `${point.x},${point.y}`).join(' ');
  const areaPath = `40,180 ${path} 560,180`;
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round(maxValue * ratio));

  return (
    <div className="h-[250px] w-full">
      <svg viewBox="0 0 600 230" className="h-full w-full overflow-visible">
        {yTicks.map((tick, index) => {
          const y = 180 - (tick / maxValue) * 135;
          return (
            <g key={`${tick}-${index}`}>
              <line x1="40" x2="560" y1={y} y2={y} stroke="#edf2f1" strokeDasharray="3 4" />
              <text x="0" y={y + 4} className="fill-slate-400 text-[12px]">
                {tick > 999 ? `${Math.round(tick / 1000)}k` : tick}
              </text>
            </g>
          );
        })}
        <line x1="40" x2="40" y1="35" y2="180" stroke="#aab7b4" />
        <line x1="40" x2="560" y1="180" y2="180" stroke="#aab7b4" />
        {area && <polygon points={areaPath} fill="#7eaaa3" opacity="0.48" />}
        <polyline points={path} fill="none" stroke="#6d9992" strokeWidth="3" strokeLinecap="round" />
        {points.map((point) => (
          <g key={point.label}>
            <circle cx={point.x} cy={point.y} r="4" fill="#6d9992" />
            <text x={point.x} y="200" textAnchor="middle" className="fill-slate-400 text-[12px]">
              {point.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-[-18px] text-center text-xs text-primary-600">Vendas (R$)</div>
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
    <div className="flex h-[250px] items-center justify-center gap-8">
      <div
        className="h-40 w-40 rounded-full border border-white shadow-inner"
        style={{ background: `conic-gradient(${gradient})` }}
      />
      <div className="space-y-3 text-sm text-slate-500">
        {data.map((item, index) => (
          <div key={item.label} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: chartColors[index % chartColors.length] }}
            />
            <span>
              {item.label}: {Math.round((item.value / total) * 100)}%
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
      <div className="space-y-4 py-4">
        {safeData.map((item) => (
          <div key={item.label} className="grid grid-cols-[110px_1fr_92px] items-center gap-3 text-sm">
            <span className="truncate text-slate-500">{item.label}</span>
            <div className="h-8 overflow-hidden rounded-r-md bg-slate-50">
              <div
                className="h-full rounded-r-md bg-primary-400"
                style={{ width: `${Math.max(8, (item.value / maxValue) * 100)}%` }}
              />
            </div>
            <span className="text-right font-semibold text-slate-700">{money(item.value)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-[220px] items-end gap-4 px-4 pb-7 pt-4">
      {safeData.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-1 flex-col items-center gap-2">
          <div
            className="w-full rounded-t-md bg-primary-400"
            style={{ height: `${Math.max(12, (item.value / maxValue) * 170)}px` }}
          />
          <span className="w-full truncate text-center text-xs text-slate-400">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
