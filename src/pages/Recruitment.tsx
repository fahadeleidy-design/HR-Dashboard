import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { RecruitmentDashboard } from '@/components/recruitment/RecruitmentDashboard';
import { JobRequisitions } from '@/components/recruitment/JobRequisitions';
import { CandidateManagement } from '@/components/recruitment/CandidateManagement';
import { ScreeningManagement } from '@/components/recruitment/ScreeningManagement';
import { InterviewManagement } from '@/components/recruitment/InterviewManagement';
import { OfferManagement } from '@/components/recruitment/OfferManagement';
import { RecruitmentAnalytics } from '@/components/recruitment/RecruitmentAnalytics';

export function Recruitment() {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      <div className={`${isRTL ? 'text-right' : 'text-left'}`}>
        <h1 className="text-3xl font-bold text-gray-900">
          {t.recruitment.title}
        </h1>
        <p className="text-gray-600 mt-1">
          {t.recruitment.subtitle}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-7 bg-white border border-gray-200">
          <TabsTrigger value="dashboard">
            {t.dashboard.title}
          </TabsTrigger>
          <TabsTrigger value="requisitions">
            {t.recruitment.requisitions}
          </TabsTrigger>
          <TabsTrigger value="candidates">
            {t.recruitment.candidates}
          </TabsTrigger>
          <TabsTrigger value="screening">
            {t.recruitment.screening}
          </TabsTrigger>
          <TabsTrigger value="interviews">
            {t.recruitment.interviews}
          </TabsTrigger>
          <TabsTrigger value="offers">
            {t.recruitment.offers}
          </TabsTrigger>
          <TabsTrigger value="analytics">
            {t.recruitment.analytics}
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

        <TabsContent value="screening">
          <ScreeningManagement />
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
