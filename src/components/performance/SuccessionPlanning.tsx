import { Users, TrendingUp, Star, Target, Award, CheckCircle } from 'lucide-react';

export function SuccessionPlanning() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Succession Planning & Talent Development</h2>
        <p className="text-gray-600 mt-1">Identify and develop talent for critical roles and leadership positions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Critical Positions</p>
              <p className="text-3xl font-bold mt-2">12</p>
              <p className="text-blue-100 text-xs mt-1">Identified roles</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Target className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">High Potential</p>
              <p className="text-3xl font-bold mt-2">24</p>
              <p className="text-green-100 text-xs mt-1">Identified talent</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Star className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Ready Now</p>
              <p className="text-3xl font-bold mt-2">8</p>
              <p className="text-purple-100 text-xs mt-1">Succession ready</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <CheckCircle className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">In Development</p>
              <p className="text-3xl font-bold mt-2">16</p>
              <p className="text-orange-100 text-xs mt-1">Active plans</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <TrendingUp className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-200">
        <Users className="h-16 w-16 text-blue-600 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Succession Planning Dashboard</h3>
        <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
          Comprehensive succession planning module for identifying critical positions, assessing talent readiness,
          and developing high-potential employees for leadership roles
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto text-left">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Critical Role Identification</h4>
            <p className="text-sm text-gray-600">Identify and prioritize key positions critical to business success</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Talent Assessment</h4>
            <p className="text-sm text-gray-600">Evaluate employee potential, performance, and readiness levels</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Development Planning</h4>
            <p className="text-sm text-gray-600">Create targeted development plans for succession candidates</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            9-Box Grid Assessment
          </h3>
          <p className="text-sm text-gray-700 mb-4">
            Evaluate employees on two dimensions: Performance and Potential
          </p>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span>High Potential / High Performance - Ready for promotion</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span>Medium Potential / High Performance - Core contributors</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <span>High Potential / Medium Performance - Develop potential</span>
            </li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Readiness Levels
          </h3>
          <p className="text-sm text-gray-700 mb-4">
            Track succession candidate readiness for target roles
          </p>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span>Ready Now - Can assume role immediately</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span>Ready 1-2 Years - Needs targeted development</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span>Ready 3+ Years - Long-term development required</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Award className="h-5 w-5 text-orange-600" />
          Succession Planning Best Practices
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <Award className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Identify critical positions with significant business impact</span>
            </li>
            <li className="flex items-start gap-2">
              <Award className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Maintain multiple successors for each critical role</span>
            </li>
            <li className="flex items-start gap-2">
              <Award className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Assess both performance and potential objectively</span>
            </li>
            <li className="flex items-start gap-2">
              <Award className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Create individual development plans for successors</span>
            </li>
          </ul>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <Award className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Provide stretch assignments and mentoring opportunities</span>
            </li>
            <li className="flex items-start gap-2">
              <Award className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Review and update succession plans regularly</span>
            </li>
            <li className="flex items-start gap-2">
              <Award className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Consider internal and external succession options</span>
            </li>
            <li className="flex items-start gap-2">
              <Award className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <span>Link succession planning to business strategy</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
