import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface TimeAnalysisChartProps {
  data: Array<{
    topic: string;
    avgTime: number;
    totalQuestions: number;
  }>;
}

export const TimeAnalysisChart = ({ data }: TimeAnalysisChartProps) => {
  const overallAverage = data.length > 0 
    ? data.reduce((sum, item) => sum + item.avgTime, 0) / data.length 
    : 0;

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">تحليل الوقت حسب الموضوع</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
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
                  <p className="text-sm">متوسط الوقت: {data.avgTime.toFixed(1)} دقيقة</p>
                  <p className="text-sm">عدد الأسئلة: {data.totalQuestions}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.avgTime > overallAverage ? '⬆️ أطول من المتوسط' : '⬇️ أقصر من المتوسط'}
                  </p>
                </div>
              );
            }}
          />
          <ReferenceLine 
            x={overallAverage} 
            stroke="hsl(var(--primary))" 
            strokeDasharray="3 3"
            label={{ value: 'المتوسط العام', position: 'top' }}
          />
          <Bar dataKey="avgTime" fill="hsl(var(--primary))" radius={[0, 8, 8, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
