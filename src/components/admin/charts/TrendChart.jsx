import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AXIS_TEXT, GRID, SERIES } from "./palette";

const label = (bucket, interval) => {
  if (interval === "month") {
    const [y, m] = bucket.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    });
  }
  return new Date(`${bucket}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
};

/**
 * Coupons issued vs redeemed over time: two lines on one axis (2px, legend + tooltip, solid
 * hairline grid), with the same numbers in a visually hidden table for screen readers.
 */
export function TrendChart({ series, interval = "day", height = 260 }) {
  const rows = series.map((s) => ({ ...s, label: label(s.bucket, interval) }));
  const empty = rows.every((r) => r.issued === 0 && r.redeemed === 0);
  return (
    <figure className="m-0">
      {empty ? (
        <p
          className="flex items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground"
          style={{ height }}
        >
          No coupons in this period.
        </p>
      ) : (
        <div style={{ height }} aria-hidden="true">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={rows}
              margin={{ top: 8, right: 12, bottom: 0, left: -12 }}
            >
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: AXIS_TEXT, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: GRID }}
                minTickGap={16}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: AXIS_TEXT, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                cursor={{ stroke: AXIS_TEXT, strokeWidth: 1 }}
                contentStyle={{ borderRadius: 12, fontSize: 12 }}
              />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
              <Line
                type="monotone"
                dataKey="issued"
                name="Issued"
                stroke={SERIES.issued}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
              />
              <Line
                type="monotone"
                dataKey="redeemed"
                name="Redeemed"
                stroke={SERIES.redeemed}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <table className="sr-only">
        <caption>Coupons issued and redeemed</caption>
        <thead>
          <tr>
            <th>Period</th>
            <th>Issued</th>
            <th>Redeemed</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.bucket}>
              <td>{r.label}</td>
              <td>{r.issued}</td>
              <td>{r.redeemed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
