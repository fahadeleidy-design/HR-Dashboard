import { useState } from 'react';
import {
  Brain, MessageSquare, Lightbulb, Activity, FileText, Workflow
} from 'lucide-react';
import { AIQueryAssistant } from '../components/ai/AIQueryAssistant';
import { AIWorkflowAgents } from '../components/ai/AIWorkflowAgents';
import { AIRecommendations } from '../components/ai/AIRecommendations';
import { AIPredictions } from '../components/ai/AIPredictions';
import { AINLPFeatures } from '../components/ai/AINLPFeatures';

type AITab = 'assistant' | 'agents' | 'recommendations' | 'predictions' | 'nlp';

const TABS: { id: AITab; label: string; icon: any; description: string }[] = [
  { id: 'assistant', label: 'AI Assistant', icon: MessageSquare, description: 'Natural language HR queries' },
  { id: 'agents', label: 'Workflow Agents', icon: Workflow, description: 'Automated multi-step workflows' },
  { id: 'recommendations', label: 'Recommendations', icon: Lightbulb, description: 'Intelligent workforce suggestions' },
  { id: 'predictions', label: 'Predictions', icon: Activity, description: 'Flight risk & forecasting' },
  { id: 'nlp', label: 'NLP Tools', icon: FileText, description: 'Resume parsing & JD generation' },
];

export default function AIFeatures() {
  const [activeTab, setActiveTab] = useState<AITab>('assistant');

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 rounded-xl p-6 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-8 w-32 h-32 bg-cyan-400 rounded-full blur-3xl" />
          <div className="absolute bottom-2 left-16 w-24 h-24 bg-blue-400 rounded-full blur-3xl" />
        </div>
        <div className="relative flex items-center gap-3 mb-1">
          <Brain className="w-7 h-7 text-cyan-400" />
          <h1 className="text-2xl font-bold">AI-Powered Intelligence</h1>
        </div>
        <p className="relative text-slate-300 text-sm">
          Natural language queries, predictive analytics, automated workflows, and intelligent recommendations
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="border-b border-gray-200 overflow-x-auto">
          <nav className="flex -mb-px min-w-max">
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-slate-700 text-slate-700'
                      : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'assistant' && <AIQueryAssistant />}
          {activeTab === 'agents' && <AIWorkflowAgents />}
          {activeTab === 'recommendations' && <AIRecommendations />}
          {activeTab === 'predictions' && <AIPredictions />}
          {activeTab === 'nlp' && <AINLPFeatures />}
        </div>
      </div>
    </div>
  );
}
