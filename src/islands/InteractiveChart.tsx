import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface DataPoint {
  label: string;
  value: number;
}

interface Props {
  title?: string;
  data?: DataPoint[];
}

const placeholderData: DataPoint[] = [
  { label: "第1週", value: 32 },
  { label: "第2週", value: 41 },
  { label: "第3週", value: 38 },
  { label: "第4週", value: 55 },
  { label: "第5週", value: 61 },
];

export default function InteractiveChart({ title = "範例圖表（佔位資料）", data = placeholderData }: Props) {
  return (
    <div className="w-full rounded-lg border border-primary-100 bg-white p-6">
      <p className="mb-4 text-sm font-semibold text-ink-700">{title}</p>
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f2f0" />
          <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#3a3a3a" }} />
          <YAxis tick={{ fontSize: 12, fill: "#3a3a3a" }} />
          <Tooltip
            contentStyle={{ borderRadius: 8, borderColor: "#c56b74", fontSize: 12 }}
            cursor={{ fill: "#fbeced" }}
          />
          <Bar dataKey="value" fill="#8b2332" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
