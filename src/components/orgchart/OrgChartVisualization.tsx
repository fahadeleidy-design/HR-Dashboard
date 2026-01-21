import { useState } from 'react';
import {
  Network,
  Grid3x3,
  List,
  GitBranch,
  Layers,
  Circle,
  Box,
  Workflow,
  Maximize2
} from 'lucide-react';

interface OrgChartVisualizationProps {
  mode: 'hierarchy' | 'matrix' | 'list' | 'network' | 'compact';
  onModeChange: (mode: 'hierarchy' | 'matrix' | 'list' | 'network' | 'compact') => void;
}

const visualizationModes = [
  {
    id: 'hierarchy' as const,
    name: 'Hierarchy View',
    description: 'Traditional top-down organizational structure',
    icon: GitBranch,
    color: 'blue'
  },
  {
    id: 'matrix' as const,
    name: 'Matrix View',
    description: 'Grid layout organized by departments',
    icon: Grid3x3,
    color: 'green'
  },
  {
    id: 'list' as const,
    name: 'List View',
    description: 'Detailed list with reporting relationships',
    icon: List,
    color: 'amber'
  },
  {
    id: 'network' as const,
    name: 'Network View',
    description: 'Interactive network diagram showing connections',
    icon: Network,
    color: 'purple'
  },
  {
    id: 'compact' as const,
    name: 'Compact View',
    description: 'Space-efficient minimal information display',
    icon: Layers,
    color: 'cyan'
  }
];

const colorClasses = {
  blue: {
    bg: 'from-blue-500 to-blue-600',
    light: 'from-blue-50 to-blue-100',
    border: 'border-blue-300',
    text: 'text-blue-700',
    hover: 'hover:border-blue-400'
  },
  green: {
    bg: 'from-green-500 to-green-600',
    light: 'from-green-50 to-green-100',
    border: 'border-green-300',
    text: 'text-green-700',
    hover: 'hover:border-green-400'
  },
  amber: {
    bg: 'from-amber-500 to-amber-600',
    light: 'from-amber-50 to-amber-100',
    border: 'border-amber-300',
    text: 'text-amber-700',
    hover: 'hover:border-amber-400'
  },
  purple: {
    bg: 'from-purple-500 to-purple-600',
    light: 'from-purple-50 to-purple-100',
    border: 'border-purple-300',
    text: 'text-purple-700',
    hover: 'hover:border-purple-400'
  },
  cyan: {
    bg: 'from-cyan-500 to-cyan-600',
    light: 'from-cyan-50 to-cyan-100',
    border: 'border-cyan-300',
    text: 'text-cyan-700',
    hover: 'hover:border-cyan-400'
  }
};

export function OrgChartVisualization({ mode, onModeChange }: OrgChartVisualizationProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg border-2 border-gray-200 p-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Maximize2 className="h-5 w-5 text-blue-600" />
          Visualization Mode
        </h3>
        <p className="text-sm text-gray-600">
          Choose how you want to view and interact with your organization structure
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {visualizationModes.map((vizMode) => {
          const colors = colorClasses[vizMode.color];
          const Icon = vizMode.icon;
          const isActive = mode === vizMode.id;

          return (
            <button
              key={vizMode.id}
              onClick={() => onModeChange(vizMode.id)}
              className={`relative group p-5 rounded-xl border-2 transition-all duration-300 hover:shadow-xl ${
                isActive
                  ? `bg-gradient-to-br ${colors.light} ${colors.border} shadow-lg scale-105`
                  : `bg-white border-gray-200 ${colors.hover} hover:scale-105`
              }`}
            >
              <div className="flex flex-col items-center text-center space-y-3">
                <div
                  className={`relative h-14 w-14 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-300 ${
                    isActive ? 'scale-110' : 'group-hover:scale-110'
                  } ${isActive ? `bg-gradient-to-br ${colors.bg}` : 'bg-gradient-to-br from-gray-400 to-gray-500'}`}
                >
                  {isActive && (
                    <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${colors.bg} blur-lg opacity-50 animate-pulse`}></div>
                  )}
                  <Icon className="h-7 w-7 text-white relative z-10" />
                </div>

                <div>
                  <h4 className={`font-bold text-sm mb-1 ${isActive ? colors.text : 'text-gray-900'}`}>
                    {vizMode.name}
                  </h4>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {vizMode.description}
                  </p>
                </div>

                {isActive && (
                  <div className={`absolute top-2 right-2 h-3 w-3 rounded-full bg-gradient-to-br ${colors.bg} animate-pulse shadow-lg`}>
                    <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${colors.bg} blur-sm`}></div>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0">
            <Workflow className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-gray-900 mb-1">Visualization Tips</h4>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>• <strong>Hierarchy View:</strong> Best for understanding reporting lines and management structure</li>
              <li>• <strong>Matrix View:</strong> Great for departmental analysis and cross-functional teams</li>
              <li>• <strong>List View:</strong> Ideal for detailed employee information and quick searches</li>
              <li>• <strong>Network View:</strong> Useful for identifying collaboration patterns and connections</li>
              <li>• <strong>Compact View:</strong> Perfect for large organizations needing a high-level overview</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
