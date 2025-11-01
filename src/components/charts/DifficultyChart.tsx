import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

interface DifficultyChartProps {
  data: Array<{
    difficulty: string;
    successRate: number;
    avgTime: number;
    totalQuestions: number;
  }>;
}

export const DifficultyChart = ({ data }: DifficultyChartProps) => {
  const formattedData = data.map(item => ({
    ...item,
    difficultyAr: item.difficulty === 'easy' ? 'سهل' : item.difficulty === 'medium' ? 'متوسط' : 'صعب'
  }));

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">التحليل حسب الصعوبة</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="difficultyAr" 
            stroke="hsl(var(--muted-foreground))"
          />
          <YAxis stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || !payload.length) return null;
              const data = payload[0].payload;
              return (
                <div className="bg-card border-2 border-border rounded-lg p-3 shadow-lg">
                  <p className="font-bold mb-1">{data.difficultyAr}</p>
                  <p className="text-sm text-success">معدل النجاح: {data.successRate.toFixed(1)}%</p>
                  <p className="text-sm text-primary">متوسط الوقت: {data.avgTime.toFixed(1)} دقيقة</p>
                  <p className="text-sm text-muted-foreground">الأسئلة: {data.totalQuestions}</p>
                </div>
              );
            }}
          />
          <Legend 
            wrapperStyle={{ direction: 'rtl' }}
            formatter={(value) => value === 'successRate' ? 'معدل النجاح (%)' : 'متوسط الوقت (دقيقة)'}
          />
          <Bar dataKey="successRate" fill="hsl(var(--success))" radius={[8, 8, 0, 0]} />
          <Bar dataKey="avgTime" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};
