import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface TopicsBarChartProps {
  data: Array<{
    topic: string;
    successRate: number;
    attempts: number;
    avgTime: number;
  }>;
}

export const TopicsBarChart = ({ data }: TopicsBarChartProps) => {
  const getColor = (rate: number) => {
    if (rate >= 75) return "hsl(var(--success))";
    if (rate >= 50) return "hsl(var(--warning))";
    return "hsl(var(--destructive))";
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">الأداء حسب الموضوع</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" domain={[0, 100]} stroke="hsl(var(--muted-foreground))" />
          <YAxis 
            type="category" 
            dataKey="topic" 
            width={100}
            stroke="hsl(var(--muted-foreground))"
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const data = payload[0].payload;
              return (
                <div className="bg-card border-2 border-border rounded-lg p-3 shadow-lg">
                  <p className="font-bold mb-1">{data.topic}</p>
                  <p className="text-sm">معدل النجاح: {data.successRate.toFixed(1)}%</p>
                  <p className="text-sm">عدد المحاولات: {data.attempts}</p>
                  <p className="text-sm">متوسط الوقت: {data.avgTime.toFixed(1)} دقيقة</p>
                </div>
              );
            }}
          />
          <Bar dataKey="successRate" radius={[0, 8, 8, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getColor(entry.successRate)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
