import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';


function ChartCard({ title, description, children }) {
  return (
    <section className="surface-muted flex h-full flex-col gap-3 p-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      <div className="h-72">{children}</div>
    </section>
  );
}


export function InsightCharts({ themeCoverage, selectionOrder }) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartCard
        title="Theme coverage"
        description="How the current selection maps to your configured therapy themes."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={themeCoverage} margin={{ top: 12, right: 8, left: -18, bottom: 22 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#dbe4ec" />
            <XAxis
              dataKey="label"
              stroke="#64748b"
              angle={themeCoverage.length > 4 ? -15 : 0}
              textAnchor={themeCoverage.length > 4 ? 'end' : 'middle'}
              interval={0}
              height={themeCoverage.length > 4 ? 60 : 36}
            />
            <YAxis allowDecimals={false} stroke="#64748b" />
            <Tooltip />
            <Bar dataKey="value" fill="#2a7f77" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard
        title="Selection order"
        description="A quick visual check of which card sits in each slot before printing."
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={selectionOrder} margin={{ top: 12, right: 8, left: -18, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ecd9c1" />
            <XAxis dataKey="label" stroke="#7c5d39" />
            <YAxis allowDecimals={false} stroke="#7c5d39" />
            <Tooltip />
            <Bar dataKey="value" fill="#c98135" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
