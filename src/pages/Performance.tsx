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
    <div className="space-y-6">
      <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
        <h1 className="text-3xl font-bold text-gray-900">
          {isRTL ? 'إدارة الأداء' : 'Performance Management'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isRTL ? 'نظام شامل لإدارة الأداء والأهداف والتطوير' : 'Comprehensive performance, goals, and development management system'}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7 bg-white border border-gray-200">
          <TabsTrigger value="dashboard">
            {isRTL ? 'لوحة التحكم' : 'Dashboard'}
          </TabsTrigger>
          <TabsTrigger value="goals">
            {isRTL ? 'الأهداف' : 'Goals'}
          </TabsTrigger>
          <TabsTrigger value="reviews">
            {isRTL ? 'التقييمات' : 'Reviews'}
          </TabsTrigger>
          <TabsTrigger value="cycles">
            {isRTL ? 'دورات التقييم' : 'Cycles'}
          </TabsTrigger>
          <TabsTrigger value="feedback">
            {isRTL ? 'التغذية الراجعة' : 'Feedback'}
          </TabsTrigger>
          <TabsTrigger value="succession">
            {isRTL ? 'التخطيط للخلافة' : 'Succession'}
          </TabsTrigger>
          <TabsTrigger value="recognition">
            {isRTL ? 'التقدير' : 'Recognition'}
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
