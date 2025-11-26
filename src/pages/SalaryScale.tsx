import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { SalaryScaleDashboard } from '@/components/salary/SalaryScaleDashboard';
import { JobArchitecture } from '@/components/salary/JobArchitecture';
import { SalaryBandsManagement } from '@/components/salary/SalaryBandsManagement';
import { MarketBenchmarking } from '@/components/salary/MarketBenchmarking';
import { SalaryReviewCycles } from '@/components/salary/SalaryReviewCycles';
import { SalaryCalculator } from '@/components/salary/SalaryCalculator';
import { ComponentsManagement } from '@/components/salary/ComponentsManagement';

export function SalaryScale() {
  const { isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="space-y-6">
      <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
        <h1 className="text-3xl font-bold text-gray-900">
          {isRTL ? 'إدارة سلم الرواتب' : 'Salary Scale Management'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isRTL
            ? 'نظام شامل لإدارة هياكل الرواتب والدرجات الوظيفية والمعايير السوقية'
            : 'Comprehensive salary structure, job grades, and market benchmarking system'
          }
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7 bg-white border border-gray-200">
          <TabsTrigger value="dashboard">
            {isRTL ? 'لوحة التحكم' : 'Dashboard'}
          </TabsTrigger>
          <TabsTrigger value="architecture">
            {isRTL ? 'الهيكل الوظيفي' : 'Job Architecture'}
          </TabsTrigger>
          <TabsTrigger value="bands">
            {isRTL ? 'نطاقات الرواتب' : 'Salary Bands'}
          </TabsTrigger>
          <TabsTrigger value="components">
            {isRTL ? 'مكونات الراتب' : 'Components'}
          </TabsTrigger>
          <TabsTrigger value="benchmarking">
            {isRTL ? 'المقارنة السوقية' : 'Benchmarking'}
          </TabsTrigger>
          <TabsTrigger value="reviews">
            {isRTL ? 'دورات المراجعة' : 'Review Cycles'}
          </TabsTrigger>
          <TabsTrigger value="calculator">
            {isRTL ? 'حاسبة الرواتب' : 'Calculator'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <SalaryScaleDashboard />
        </TabsContent>

        <TabsContent value="architecture">
          <JobArchitecture />
        </TabsContent>

        <TabsContent value="bands">
          <SalaryBandsManagement />
        </TabsContent>

        <TabsContent value="components">
          <ComponentsManagement />
        </TabsContent>

        <TabsContent value="benchmarking">
          <MarketBenchmarking />
        </TabsContent>

        <TabsContent value="reviews">
          <SalaryReviewCycles />
        </TabsContent>

        <TabsContent value="calculator">
          <SalaryCalculator />
        </TabsContent>
      </Tabs>
    </div>
  );
}
