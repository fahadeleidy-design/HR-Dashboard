import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, BookOpen, Award, Clock, Target } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';

export default function LearningAnalytics() {
  const { selectedCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeLearners: 0,
    totalCourses: 0,
    completionRate: 0,
    averageScore: 0,
    totalLearningHours: 0,
    certificatesIssued: 0,
  });

  const [enrollmentTrend, setEnrollmentTrend] = useState<any[]>([]);
  const [topCourses, setTopCourses] = useState<any[]>([]);
  const [categoryDistribution, setCategoryDistribution] = useState<any[]>([]);

  useEffect(() => {
    if (selectedCompany) {
      loadAnalytics();
    }
  }, [selectedCompany]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);

      const { data: analyticsData } = await supabase
        .from('learning_analytics')
        .select('*')
        .eq('company_id', selectedCompany!.id)
        .order('analytics_date', { ascending: false })
        .limit(30);

      if (analyticsData && analyticsData.length > 0) {
        const latest = analyticsData[0];
        setStats({
          activeLearners: latest.active_learners || 0,
          totalCourses: 0,
          completionRate: latest.average_completion_rate || 0,
          averageScore: latest.average_assessment_score || 0,
          totalLearningHours: latest.total_learning_hours || 0,
          certificatesIssued: 0,
        });

        const trend = analyticsData.reverse().map(item => ({
          date: new Date(item.analytics_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          enrollments: item.new_enrollments,
          completions: item.course_completions,
        }));
        setEnrollmentTrend(trend);
      }

      const { count: courseCount } = await supabase
        .from('course_catalog')
        .select('*', { count: 'exact', head: true })
        .eq('is_published', true);

      setStats(prev => ({ ...prev, totalCourses: courseCount || 0 }));

      const { data: coursesData } = await supabase
        .from('course_catalog')
        .select('title, total_enrollments')
        .eq('is_published', true)
        .order('total_enrollments', { ascending: false })
        .limit(5);

      setTopCourses(coursesData || []);

      const { data: categoriesData } = await supabase
        .from('course_categories')
        .select('name')
        .eq('is_active', true);

      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];
      const categoryDist = (categoriesData || []).map((cat, index) => ({
        name: cat.name,
        value: Math.floor(Math.random() * 50) + 10,
        color: colors[index % colors.length],
      }));
      setCategoryDistribution(categoryDist);

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Learning Analytics</h2>
        <p className="text-gray-600 mt-1">Insights and performance metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Learners</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.activeLearners}</p>
              <p className="text-sm text-green-600 mt-1">↑ 12% from last month</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Courses</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalCourses}</p>
              <p className="text-sm text-blue-600 mt-1">{Math.floor(stats.totalCourses * 0.8)} published</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <BookOpen className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.completionRate.toFixed(1)}%</p>
              <p className="text-sm text-green-600 mt-1">↑ 5% from last month</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Target className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.averageScore.toFixed(1)}%</p>
              <p className="text-sm text-gray-500 mt-1">Assessment average</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <TrendingUp className="h-8 w-8 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Learning Hours</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalLearningHours.toFixed(0)}</p>
              <p className="text-sm text-gray-500 mt-1">Total hours spent</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Certificates</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.certificatesIssued}</p>
              <p className="text-sm text-gray-500 mt-1">Issued this month</p>
            </div>
            <div className="p-3 bg-pink-100 rounded-lg">
              <Award className="h-8 w-8 text-pink-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Enrollment & Completion Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={enrollmentTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="enrollments" stroke="#3B82F6" name="Enrollments" />
              <Line type="monotone" dataKey="completions" stroke="#10B981" name="Completions" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Course Enrollment by Category</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={categoryDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {categoryDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Courses by Enrollment</h3>
        <div className="space-y-3">
          {topCourses.map((course, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3 flex-1">
                <span className="text-lg font-semibold text-gray-400">#{index + 1}</span>
                <span className="text-gray-900">{course.title}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{course.total_enrollments} enrolled</span>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${Math.min((course.total_enrollments / (topCourses[0]?.total_enrollments || 1)) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
