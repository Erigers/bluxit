import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

type Slice = { name: string; color: string; amount: number }

export function DonutChart({ data }: { data: Slice[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No spending in this month yet.</p>
  }
  return (
    <div className="grid gap-4 sm:grid-cols-[200px_1fr] sm:items-center">
      <div className="mx-auto h-52 w-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="amount"
              nameKey="name"
              innerRadius={42}
              outerRadius={80}
              paddingAngle={2}
              stroke="var(--surface)"
              strokeWidth={2}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) =>
                typeof value === 'number' ? value.toFixed(2) : String(value)
              }
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="grid gap-2 text-sm">
        {data.map((d) => (
          <li key={d.name} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.color }} />
              {d.name}
            </span>
            <span className="num text-muted">{d.amount.toFixed(2)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function AccountBars({
  data,
}: {
  data: Array<{ name: string; color: string; balance: number }>
}) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">Create an account to see balances.</p>
  }
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 8, right: 12 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--line)" />
          <XAxis type="number" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="name"
            width={78}
            tick={{ fill: 'var(--ink)', fontSize: 12 }}
          />
          <Tooltip />
          <Bar dataKey="balance" radius={[0, 8, 8, 0]}>
            {data.map((d) => (
              <Cell key={d.name} fill={d.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function CashflowArea({
  data,
}: {
  data: Array<{ label: string; inflow: number; spent: number }>
}) {
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ left: 0, right: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 12 }} />
          <YAxis tick={{ fill: 'var(--muted)', fontSize: 12 }} width={48} />
          <defs>
            <linearGradient id="inflowFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.38} />
              <stop offset="100%" stopColor="var(--brand-2)" stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id="spentFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ink)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--ink)" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <Tooltip />
          <Area
            type="monotone"
            dataKey="inflow"
            stroke="var(--brand)"
            fill="url(#inflowFill)"
            name="Inflow"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="spent"
            stroke="var(--ink)"
            fill="url(#spentFill)"
            name="Spending"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
