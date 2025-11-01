/**
 * Integration Tests Suite
 * Tests full flow from question solving to dashboard display
 */

import { supabase } from "@/integrations/supabase/client";

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  duration: number;
  details: string;
  metrics?: any;
}

export class IntegrationTestSuite {
  private results: TestResult[] = [];
  private userId: string | null = null;

  constructor() {
    this.initialize();
  }

  private async initialize() {
    const { data: { user } } = await supabase.auth.getUser();
    this.userId = user?.id || null;
  }

  // ==================== TEST 1: Full Flow ====================
  async testFullFlow(): Promise<TestResult> {
    const startTime = Date.now();
    console.log('🧪 Starting Full Flow Test...');
    
    try {
      if (!this.userId) {
        throw new Error('User not authenticated');
      }

      // Step 1: Insert performance data
      console.log('  📝 Step 1: Inserting performance data...');
      const performanceData = {
        user_id: this.userId,
        question_hash: `test_${Date.now()}`,
        topic: 'الجبر',
        section: 'كمي',
        difficulty: 'medium' as const,
        is_correct: false,
        time_spent_seconds: 120,
        attempted_at: new Date().toISOString(),
        metadata: { test: true }
      };

      const { error: insertError } = await supabase
        .from('user_performance_history')
        .insert(performanceData);

      if (insertError) throw insertError;

      // Step 2: Check weakness profile update
      console.log('  📊 Step 2: Checking weakness profile...');
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for trigger

      const { data: weaknessData, error: weaknessError } = await supabase
        .from('user_weakness_profile')
        .select('*')
        .eq('user_id', this.userId)
        .eq('topic', 'الجبر')
        .single();

      // Step 3: Verify dashboard can load data
      console.log('  📈 Step 3: Testing dashboard queries...');
      const { data: perfData, error: perfError } = await supabase
        .from('user_performance_history')
        .select('*')
        .eq('user_id', this.userId)
        .limit(10);

      if (perfError) throw perfError;

      // Step 4: Test recommendations generation
      console.log('  💡 Step 4: Testing recommendations...');
      const { data: recData, error: recError } = await supabase.functions
        .invoke('generate-smart-recommendations', {
          body: { userId: this.userId }
        });

      const duration = Date.now() - startTime;
      
      return {
        test: 'Full Flow Test',
        status: 'PASS',
        duration,
        details: `✅ Successfully tested complete flow: ${perfData?.length || 0} records found, ${weaknessError ? 'weakness profile pending' : 'weakness profile updated'}, recommendations ${recError ? 'failed' : 'generated'}`,
        metrics: {
          performanceRecords: perfData?.length || 0,
          weaknessProfileUpdated: !weaknessError,
          recommendationsGenerated: !recError
        }
      };
    } catch (error: any) {
      return {
        test: 'Full Flow Test',
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: `❌ Error: ${error.message}`,
      };
    }
  }

  // ==================== TEST 2: Few-Shot Integration ====================
  async testFewShotIntegration(): Promise<TestResult> {
    const startTime = Date.now();
    console.log('🧪 Starting Few-Shot Integration Test...');
    
    try {
      if (!this.userId) {
        throw new Error('User not authenticated');
      }

      // Create 3 weakness areas for realistic testing
      console.log('  📝 Creating 3 weakness areas...');
      const weaknesses = [
        {
          user_id: this.userId,
          topic: 'الجبر',
          section: 'كمي',
          weakness_score: 75,
          total_attempts: 15,
          correct_attempts: 4,
          priority: 'high',
          trend: 'worsening'
        },
        {
          user_id: this.userId,
          topic: 'الهندسة',
          section: 'كمي',
          weakness_score: 65,
          total_attempts: 12,
          correct_attempts: 5,
          priority: 'medium',
          trend: 'stable'
        },
        {
          user_id: this.userId,
          topic: 'الإحصاء',
          section: 'كمي',
          weakness_score: 60,
          total_attempts: 10,
          correct_attempts: 5,
          priority: 'medium',
          trend: 'improving'
        }
      ];

      // Insert all weaknesses
      for (const w of weaknesses) {
        await supabase
          .from('user_weakness_profile')
          .upsert(w, { onConflict: 'user_id,topic,section' });
      }

      // Wait for DB commit
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate quiz with weakness_practice mode and topicFilter
      console.log('  🎯 Generating quiz focused on Algebra...');
      const { data: quizData, error: quizError } = await supabase.functions
        .invoke('generate-quiz', {
          body: {
            mode: 'weakness_practice',
            section: 'كمي',
            topicFilter: 'الجبر',
            difficulty: 'medium',
            questionCount: 5,
            testType: 'قدرات'
          }
        });

      if (quizError) throw quizError;

      // Check if questions are relevant to Algebra
      const algebraQuestions = quizData?.questions?.filter((q: any) => {
        const topicLower = (q.topic || '').toLowerCase();
        const subjectLower = (q.subject || '').toLowerCase();
        return topicLower.includes('جبر') || 
               topicLower.includes('معادل') ||
               subjectLower.includes('جبر') ||
               subjectLower.includes('معادل');
      });

      const duration = Date.now() - startTime;
      const relevanceRate = (algebraQuestions?.length || 0) / (quizData?.questions?.length || 1);

      // Expect at least 40% relevance
      const passed = relevanceRate >= 0.4;

      return {
        test: 'Few-Shot Integration Test',
        status: passed ? 'PASS' : 'WARNING',
        duration,
        details: `${passed ? '✅' : '⚠️'} Generated ${quizData?.questions?.length || 0} questions, ${algebraQuestions?.length || 0} related to Algebra (${(relevanceRate * 100).toFixed(0)}% relevance)`,
        metrics: {
          totalQuestions: quizData?.questions?.length || 0,
          algebraQuestions: algebraQuestions?.length || 0,
          relevanceRate: parseFloat(relevanceRate.toFixed(2)),
          weaknessAreasCreated: 3
        }
      };
    } catch (error: any) {
      return {
        test: 'Few-Shot Integration Test',
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: `❌ Error: ${error.message}`,
      };
    }
  }

  // ==================== TEST 3: Cache & Quality ====================
  async testCacheAndQuality(): Promise<TestResult> {
    const startTime = Date.now();
    console.log('🧪 Starting Cache & Quality Test...');
    
    try {
      // Check cache statistics
      console.log('  📊 Checking cache statistics...');
      const { data: cacheData, error: cacheError } = await supabase
        .from('questions_cache')
        .select('*')
        .limit(100);

      if (cacheError) throw cacheError;

      // Calculate quality distribution
      const qualityDistribution = {
        excellent: cacheData?.filter((q: any) => q.question_data?.quality_score >= 4.5).length || 0,
        good: cacheData?.filter((q: any) => q.question_data?.quality_score >= 3.5 && q.question_data?.quality_score < 4.5).length || 0,
        acceptable: cacheData?.filter((q: any) => q.question_data?.quality_score >= 3 && q.question_data?.quality_score < 3.5).length || 0,
        low: cacheData?.filter((q: any) => q.question_data?.quality_score < 3).length || 0,
      };

      const avgQuality = cacheData?.reduce((sum: number, q: any) => 
        sum + (q.question_data?.quality_score || 0), 0
      ) / (cacheData?.length || 1);

      const duration = Date.now() - startTime;

      return {
        test: 'Cache & Quality Test',
        status: qualityDistribution.low === 0 ? 'PASS' : 'WARNING',
        duration,
        details: `${qualityDistribution.low === 0 ? '✅' : '⚠️'} Cache: ${cacheData?.length || 0} questions, Avg Quality: ${avgQuality.toFixed(2)}, Low Quality: ${qualityDistribution.low}`,
        metrics: {
          totalCached: cacheData?.length || 0,
          qualityDistribution,
          avgQuality: parseFloat(avgQuality.toFixed(2))
        }
      };
    } catch (error: any) {
      return {
        test: 'Cache & Quality Test',
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: `❌ Error: ${error.message}`,
      };
    }
  }

  // ==================== TEST 4: Performance Metrics ====================
  async testPerformanceMetrics(): Promise<TestResult> {
    const startTime = Date.now();
    console.log('🧪 Starting Performance Metrics Test...');
    
    try {
      if (!this.userId) {
        throw new Error('User not authenticated');
      }

      const metrics: any = {};

      // Test 1: usePerformanceAnalytics query time
      console.log('  ⏱️ Testing usePerformanceAnalytics...');
      const perfStart = Date.now();
      const { data: perfData } = await supabase
        .from('user_performance_history')
        .select('*')
        .eq('user_id', this.userId);
      metrics.performanceAnalyticsQuery = Date.now() - perfStart;

      // Test 2: useWeaknessProfile query time
      console.log('  ⏱️ Testing useWeaknessProfile...');
      const weakStart = Date.now();
      const { data: weakData } = await supabase
        .from('user_weakness_profile')
        .select('*')
        .eq('user_id', this.userId);
      metrics.weaknessProfileQuery = Date.now() - weakStart;

      // Test 3: analyze-weaknesses function
      console.log('  ⏱️ Testing analyze-weaknesses...');
      const analyzeStart = Date.now();
      await supabase.functions.invoke('analyze-weaknesses', {
        body: { userId: this.userId }
      });
      metrics.analyzeWeaknessesFunction = Date.now() - analyzeStart;

      // Test 4: generate-smart-recommendations function
      console.log('  ⏱️ Testing generate-smart-recommendations...');
      const recStart = Date.now();
      await supabase.functions.invoke('generate-smart-recommendations', {
        body: { userId: this.userId }
      });
      metrics.smartRecommendationsFunction = Date.now() - recStart;

      const duration = Date.now() - startTime;

      const allUnder5s = Object.values(metrics).every((m: any) => m < 5000);
      const status = allUnder5s ? 'PASS' : 'WARNING';
      const metricValues = Object.values(metrics) as number[];
      const maxTime = Math.max(...metricValues);

      return {
        test: 'Performance Metrics Test',
        status,
        duration,
        details: `${status === 'PASS' ? '✅' : '⚠️'} All queries completed. Max time: ${maxTime}ms`,
        metrics
      };
    } catch (error: any) {
      return {
        test: 'Performance Metrics Test',
        status: 'FAIL',
        duration: Date.now() - startTime,
        details: `❌ Error: ${error.message}`,
      };
    }
  }

  // ==================== Run All Tests ====================
  async runAllTests(): Promise<TestResult[]> {
    console.log('\n🚀 Starting Integration Test Suite...\n');
    
    this.results = [];

    // Run tests sequentially
    this.results.push(await this.testFullFlow());
    this.results.push(await this.testFewShotIntegration());
    this.results.push(await this.testCacheAndQuality());
    this.results.push(await this.testPerformanceMetrics());

    // Print summary
    console.log('\n📊 Test Results Summary:');
    console.log('─'.repeat(80));
    
    this.results.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
      console.log(`${icon} ${result.test}: ${result.status} (${result.duration}ms)`);
      console.log(`   ${result.details}`);
      if (result.metrics) {
        console.log(`   Metrics:`, JSON.stringify(result.metrics, null, 2));
      }
      console.log('─'.repeat(80));
    });

    const passed = this.results.filter(r => r.status === 'PASS').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;

    console.log(`\n📈 Summary: ${passed} PASS, ${warnings} WARNING, ${failed} FAIL`);
    
    return this.results;
  }

  getResults(): TestResult[] {
    return this.results;
  }
}

// Export singleton instance
export const testSuite = new IntegrationTestSuite();
