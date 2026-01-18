import React, { useState } from 'react';
import { Award, Target, TrendingUp, Users } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs';
import SkillsInventory from '../components/skills/SkillsInventory';
import SkillsGapAnalysis from '../components/skills/SkillsGapAnalysis';
import CompetencyFrameworks from '../components/skills/CompetencyFrameworks';
import EmployeeSkillsProfile from '../components/skills/EmployeeSkillsProfile';
import { useAuth } from '../contexts/AuthContext';

export default function SkillsManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('inventory');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Skills Management</h1>
        <p className="text-gray-600 mt-1">
          Manage skills inventory, identify gaps, and build competency frameworks
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-gray-200">
          <TabsTrigger value="inventory">
            <Award className="h-4 w-4 mr-2" />
            Skills Inventory
          </TabsTrigger>
          <TabsTrigger value="gap-analysis">
            <Target className="h-4 w-4 mr-2" />
            Gap Analysis
          </TabsTrigger>
          <TabsTrigger value="frameworks">
            <TrendingUp className="h-4 w-4 mr-2" />
            Competency Frameworks
          </TabsTrigger>
          <TabsTrigger value="my-skills">
            <Users className="h-4 w-4 mr-2" />
            My Skills
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory">
          <SkillsInventory />
        </TabsContent>

        <TabsContent value="gap-analysis">
          <SkillsGapAnalysis />
        </TabsContent>

        <TabsContent value="frameworks">
          <CompetencyFrameworks />
        </TabsContent>

        <TabsContent value="my-skills">
          {user && <EmployeeSkillsProfile employeeId={user.id} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}
