import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TestTube, Play, CheckCircle2, AlertTriangle, XCircle, Clock, Activity } from "lucide-react";
import { testSuite } from "@/tests/integrationTests";
import Navbar from "@/components/Navbar";

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  duration: number;
  details: string;
  metrics?: any;
}

const TestDashboard = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const runTests = async () => {
    setIsRunning(true);
    setProgress(0);
    setResults([]);

    const interval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90));
    }, 500);

    try {
      const testResults = await testSuite.runAllTests();
      setResults(testResults);
      setProgress(100);
    } catch (error) {
      console.error('Test suite error:', error);
    } finally {
      clearInterval(interval);
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PASS': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'WARNING': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'FAIL': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASS': return 'bg-green-500';
      case 'WARNING': return 'bg-yellow-500';
      case 'FAIL': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const passed = results.filter(r => r.status === 'PASS').length;
  const warnings = results.filter(r => r.status === 'WARNING').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <TestTube className="h-10 w-10 text-primary" />
              لوحة الاختبارات الشاملة
            </h1>
            <p className="text-muted-foreground">
              Integration Tests & Performance Monitoring
            </p>
          </div>
          <Button
            size="lg"
            onClick={runTests}
            disabled={isRunning}
            className="gap-2"
          >
            {isRunning ? (
              <>
                <Activity className="h-5 w-5 animate-spin" />
                جاري التشغيل...
              </>
            ) : (
              <>
                <Play className="h-5 w-5" />
                تشغيل جميع الاختبارات
              </>
            )}
          </Button>
        </div>

        {/* Progress Bar */}
        {isRunning && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>تقدم الاختبارات</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary Cards */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  اختبارات ناجحة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                  <span className="text-3xl font-bold">{passed}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  تحذيرات
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                  <span className="text-3xl font-bold">{warnings}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  اختبارات فاشلة
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <XCircle className="h-8 w-8 text-red-500" />
                  <span className="text-3xl font-bold">{failed}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  إجمالي الوقت
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="h-8 w-8 text-primary" />
                  <span className="text-3xl font-bold">{(totalDuration / 1000).toFixed(1)}s</span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Test Results */}
        {results.length > 0 && (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
              <TabsTrigger value="details">التفاصيل</TabsTrigger>
              <TabsTrigger value="metrics">المقاييس</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              {results.map((result, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result.status)}
                        <div>
                          <CardTitle>{result.test}</CardTitle>
                          <CardDescription className="mt-1">
                            {result.details}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge className={getStatusColor(result.status)}>
                          {result.status}
                        </Badge>
                        <Badge variant="outline">
                          {result.duration}ms
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              <ScrollArea className="h-[600px]">
                {results.map((result, index) => (
                  <Card key={index} className="mb-4">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          {getStatusIcon(result.status)}
                          {result.test}
                        </CardTitle>
                        <Badge className={getStatusColor(result.status)}>
                          {result.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div>
                          <span className="font-semibold">النتيجة:</span>
                          <p className="text-muted-foreground mt-1">{result.details}</p>
                        </div>
                        <div>
                          <span className="font-semibold">المدة:</span>
                          <p className="text-muted-foreground">{result.duration}ms</p>
                        </div>
                        {result.metrics && (
                          <div>
                            <span className="font-semibold">المقاييس:</span>
                            <pre className="bg-muted p-3 rounded-lg mt-2 text-sm overflow-auto">
                              {JSON.stringify(result.metrics, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>مقاييس الأداء</CardTitle>
                  <CardDescription>
                    تفاصيل الأداء لكل اختبار
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {results.map((result, index) => (
                      result.metrics && (
                        <div key={index} className="border-b pb-4 last:border-0">
                          <h3 className="font-semibold mb-2">{result.test}</h3>
                          <div className="grid grid-cols-2 gap-4">
                            {Object.entries(result.metrics).map(([key, value]) => (
                              <div key={key} className="bg-muted p-3 rounded">
                                <p className="text-sm text-muted-foreground">{key}</p>
                                <p className="text-lg font-bold">
                                  {typeof value === 'object' 
                                    ? JSON.stringify(value)
                                    : String(value)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {results.length === 0 && !isRunning && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TestTube className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-xl font-semibold mb-2">لم يتم تشغيل أي اختبارات بعد</p>
              <p className="text-muted-foreground mb-6">
                اضغط على "تشغيل جميع الاختبارات" للبدء
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default TestDashboard;
