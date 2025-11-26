import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { RecruitmentDashboard } from '@/components/recruitment/RecruitmentDashboard';
import { JobRequisitions } from '@/components/recruitment/JobRequisitions';
import { CandidateManagement } from '@/components/recruitment/CandidateManagement';
import { InterviewManagement } from '@/components/recruitment/InterviewManagement';
import { OfferManagement } from '@/components/recruitment/OfferManagement';
import { RecruitmentAnalytics } from '@/components/recruitment/RecruitmentAnalytics';

export function Recruitment() {
  const { isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="space-y-6">
      <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
        <h1 className="text-3xl font-bold text-gray-900">
          {isRTL ? 'إدارة التوظيف والتعيين' : 'Recruitment & Hiring Management'}
        </h1>
        <p className="text-gray-600 mt-1">
          {isRTL
            ? 'نظام شامل لتتبع المتقدمين وإدارة عمليات التوظيف مع الامتثال للوائح السعودية'
            : 'Comprehensive Applicant Tracking System (ATS) with Saudi compliance'
          }
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6 bg-white border border-gray-200">
          <TabsTrigger value="dashboard">
            {isRTL ? 'لوحة التحكم' : 'Dashboard'}
          </TabsTrigger>
          <TabsTrigger value="requisitions">
            {isRTL ? 'طلبات التوظيف' : 'Requisitions'}
          </TabsTrigger>
          <TabsTrigger value="candidates">
            {isRTL ? 'المرشحين' : 'Candidates'}
          </TabsTrigger>
          <TabsTrigger value="interviews">
            {isRTL ? 'المقابلات' : 'Interviews'}
          </TabsTrigger>
          <TabsTrigger value="offers">
            {isRTL ? 'العروض' : 'Offers'}
          </TabsTrigger>
          <TabsTrigger value="analytics">
            {isRTL ? 'التحليلات' : 'Analytics'}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <RecruitmentDashboard />
        </TabsContent>

        <TabsContent value="requisitions">
          <JobRequisitions />
        </TabsContent>

        <TabsContent value="candidates">
          <CandidateManagement />
        </TabsContent>

        <TabsContent value="interviews">
          <InterviewManagement />
        </TabsContent>

        <TabsContent value="offers">
          <OfferManagement />
        </TabsContent>

        <TabsContent value="analytics">
          <RecruitmentAnalytics />
        </TabsContent>
      </Tabs>
    </div>
  );
}
