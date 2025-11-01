import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";

interface WeaknessHeatmapProps {
  data: Array<{
    topic: string;
    successRate: number;
    section: string;
  }>;
}

export const WeaknessHeatmap = ({ data }: WeaknessHeatmapProps) => {
  const navigate = useNavigate();

  const getColor = (rate: number) => {
    if (rate >= 75) return "bg-success/20 border-success hover:bg-success/30";
    if (rate >= 50) return "bg-warning/20 border-warning hover:bg-warning/30";
    return "bg-destructive/20 border-destructive hover:bg-destructive/30";
  };

  const getTextColor = (rate: number) => {
    if (rate >= 75) return "text-success";
    if (rate >= 50) return "text-warning";
    return "text-destructive";
  };

  return (
    <Card className="p-6">
      <h3 className="text-xl font-bold mb-4">خريطة نقاط الضعف والقوة</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {data.map((item, index) => (
          <button
            key={index}
            onClick={() => navigate("/weakness-analysis")}
            className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${getColor(item.successRate)}`}
          >
            <div className="text-sm font-semibold mb-1 line-clamp-2">
              {item.topic}
            </div>
            <div className={`text-2xl font-bold ${getTextColor(item.successRate)}`}>
              {item.successRate.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {item.section}
            </div>
          </button>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-success/20 border-2 border-success"></div>
          <span>قوي (75%+)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-warning/20 border-2 border-warning"></div>
          <span>متوسط (50-74%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-destructive/20 border-2 border-destructive"></div>
          <span>ضعيف (&lt;50%)</span>
        </div>
      </div>
    </Card>
  );
};
