import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { PerformanceDashboard } from '@/components/performance/PerformanceDashboard';
import { GoalsManagement } from '@/components/performance/GoalsManagement';
import { ReviewCycles } from '@/components/performance/ReviewCycles';
import { FeedbackCenter } from '@/components/performance/FeedbackCenter';
import { PerformanceReviews } from '@/components/performance/PerformanceReviews';
import { SuccessionPlanning } from '@/components/performance/SuccessionPlanning';
import { RecognitionCenter } from '@/components/performance/RecognitionCenter';

export function Performance() {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
        <h1 className="text-3xl font-bold text-gray-900">
          {t.performance.title}
        </h1>
        <p className="text-gray-600 mt-1">
          {t.performance.subtitle}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7 bg-white border border-gray-200">
          <TabsTrigger value="dashboard">
            {t.performance.performanceDashboard}
          </TabsTrigger>
          <TabsTrigger value="goals">
            {t.performance.goals}
          </TabsTrigger>
          <TabsTrigger value="reviews">
            {t.performance.reviews}
          </TabsTrigger>
          <TabsTrigger value="cycles">
            {t.performance.reviewCycles}
          </TabsTrigger>
          <TabsTrigger value="feedback">
            {t.performance.feedback}
          </TabsTrigger>
          <TabsTrigger value="succession">
            {t.performance.successionPlanning}
          </TabsTrigger>
          <TabsTrigger value="recognition">
            {t.performance.recognitionCenter}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <PerformanceDashboard />
        </TabsContent>

        <TabsContent value="goals">
          <GoalsManagement />
        </TabsContent>

        <TabsContent value="reviews">
          <PerformanceReviews />
        </TabsContent>

        <TabsContent value="cycles">
          <ReviewCycles />
        </TabsContent>

        <TabsContent value="feedback">
          <FeedbackCenter />
        </TabsContent>

        <TabsContent value="succession">
          <SuccessionPlanning />
        </TabsContent>

        <TabsContent value="recognition">
          <RecognitionCenter />
        </TabsContent>
      </Tabs>
    </div>
  );
}
