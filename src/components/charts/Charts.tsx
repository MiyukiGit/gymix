import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { WeightUnit } from '../../types'
import { formatCompact } from '../../lib/utils'

interface TooltipProps {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string; dataKey?: string; payload?: Record<string, unknown> }[]
  label?: string
}

const tooltipStyle = {
  contentStyle: { borderRadius: 14, border: '1px solid #30352e', background: '#191b19', fontSize: 12 },
  labelStyle: { color: '#f3f4ef', fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: '#92978f' },
}

const ChartTooltip = ({ active, payload, label, formatter }: TooltipProps & { formatter?: (value: number) => string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-2xl border border-border bg-surface px-3 py-2 shadow-xl">
      {label && <p className="mb-1 text-xs font-semibold text-text">{label}</p>}
      {payload.map((entry, index) => (
        <p key={index} className="text-[11px] text-muted">
          <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full" style={{ background: entry.color ?? '#c6f36a' }} />
          {entry.name ?? entry.dataKey}: <span className="font-semibold text-text">{formatter ? formatter(entry.value ?? 0) : entry.value}</span>
        </p>
      ))}
    </div>
  )
}

const axisProps = { stroke: '#30352e', tickLine: false, axisLine: false }

export const VolumeAreaChart = ({ data, unit = 'kg' }: { data: { label: string; volume: number; workouts: number }[]; unit?: WeightUnit }) => (
  <div className="h-56 w-full sm:h-64">
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="volumeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c6f36a" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#c6f36a" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#30352e" strokeDasharray="3 6" opacity={0.55} />
        <XAxis dataKey="label" {...axisProps} tickMargin={10} />
        <YAxis {...axisProps} tickFormatter={(value) => formatCompact(Number(value))} width={48} />
        <Tooltip content={<ChartTooltip formatter={(value) => `${formatCompact(value)} ${unit}`} />} {...tooltipStyle} />
        <Area type="monotone" dataKey="volume" name="Volume" stroke="#c6f36a" strokeWidth={2.5} fill="url(#volumeFill)" activeDot={{ r: 5, fill: '#c6f36a', stroke: '#101110', strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  </div>
)

export const WeeklyBars = ({ data }: { data: { label: string; workouts: number; volume: number; active: boolean }[] }) => (
  <div className="h-40 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 4, left: -28, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke="#30352e" strokeDasharray="3 6" opacity={0.4} />
        <XAxis dataKey="label" {...axisProps} tickMargin={8} />
        <YAxis {...axisProps} allowDecimals={false} width={32} />
        <Tooltip content={<ChartTooltip formatter={(value) => `${value} workouts`} />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="workouts" name="Workouts" radius={[8, 8, 4, 4]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.active ? '#c6f36a' : '#30352e'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
)

export const MuscleRadar = ({ data }: { data: { name: string; volume: number }[] }) => {
  const trimmed = data.slice(0, 8)
  if (!trimmed.length) return null
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={trimmed} outerRadius="72%">
          <PolarGrid stroke="#30352e" />
          <PolarAngleAxis dataKey="name" tick={{ fill: '#92978f', fontSize: 10 }} />
          <Tooltip content={<ChartTooltip formatter={(value) => formatCompact(value)} />} />
          <Radar name="Volume" dataKey="volume" stroke="#c6f36a" strokeWidth={2} fill="#c6f36a" fillOpacity={0.28} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}

export const MuscleDonut = ({ data }: { data: { name: string; volume: number }[] }) => {
  const colors = ['#c6f36a', '#8edb78', '#f4b860', '#6fa8dc', '#a9d94f', '#92978f', '#d9a5f3', '#7fc9b5']
  if (!data.length) return null
  return (
    <div className="relative h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data.slice(0, 8)} dataKey="volume" nameKey="name" innerRadius="58%" outerRadius="88%" paddingAngle={3} stroke="none">
            {data.slice(0, 8).map((entry, index) => (
              <Cell key={entry.name} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip formatter={(value) => formatCompact(value)} />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[10px] uppercase tracking-widest text-muted">Top muscles</span>
        <span className="text-display text-xl font-semibold text-text">{data.length}</span>
      </div>
    </div>
  )
}

export const ProgressionChart = ({
  data,
  unit,
  metric,
}: {
  data: { date: string; weight: number; e1rm: number; volume: number }[]
  unit: WeightUnit
  metric: 'weight' | 'e1rm' | 'volume'
}) => {
  const formatted = data.map((point) => ({
    ...point,
    label: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }))
  const color = metric === 'volume' ? '#f4b860' : '#c6f36a'
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ top: 10, right: 6, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id={`progressFill-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#30352e" strokeDasharray="3 6" opacity={0.5} />
          <XAxis dataKey="label" {...axisProps} tickMargin={10} minTickGap={24} />
          <YAxis {...axisProps} width={50} tickFormatter={(value) => formatCompact(Number(value))} />
          <Tooltip content={<ChartTooltip formatter={(value) => metric === 'volume' ? `${formatCompact(value)} ${unit}` : `${value} ${unit}`} />} />
          <Area
            type="monotone"
            dataKey={metric}
            name={metric === 'e1rm' ? 'Est. 1RM' : metric === 'weight' ? 'Top set' : 'Volume'}
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#progressFill-${metric})`}
            activeDot={{ r: 5, fill: color, stroke: '#101110', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
