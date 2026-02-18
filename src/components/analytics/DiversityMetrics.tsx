import { useState, useEffect, useMemo } from 'react';
import { Users, TrendingUp, Award, Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCompany } from '../../contexts/CompanyContext';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const GENDER_COLORS = ['#0ea5e9', '#ec4899'];
const NATIONALITY_COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16'];

export function DiversityMetrics() {
  const { currentCompany } = useCompany();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentCompany?.id) loadData();
  }, [currentCompany]);

  async function loadData() {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('employees')
        .select('id, gender, nationality, department, job_title, basic_salary, hire_date, employment_status, disability')
        .eq('company_id', currentCompany!.id)
        .eq('employment_status', 'active');
      setEmployees(data || []);
    } finally {
      setLoading(false);
    }
  }

  const metrics = useMemo(() => {
    const total = employees.length;
    if (total === 0) return null;

    const maleCount = employees.filter(e => e.gender === 'male').length;
    const femaleCount = employees.filter(e => e.gender === 'female').length;
    const femalePct = (femaleCount / total) * 100;

    const genderData = [
      { name: 'Male', value: maleCount },
      { name: 'Female', value: femaleCount },
    ];

    const natMap: Record<string, number> = {};
    employees.forEach(e => {
      const nat = e.nationality || 'Unspecified';
      natMap[nat] = (natMap[nat] || 0) + 1;
    });
    const nationalityData = Object.entries(natMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);

    const saudiCount = natMap['Saudi'] || 0;
    const saudizationPct = (saudiCount / total) * 100;

    const now = new Date();
    const ageGroups: Record<string, number> = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0 };
    employees.forEach(e => {
      const hireYear = new Date(e.hire_date).getFullYear();
      const estimatedAge = now.getFullYear() - hireYear + 25;
      if (estimatedAge <= 25) ageGroups['18-25']++;
      else if (estimatedAge <= 35) ageGroups['26-35']++;
      else if (estimatedAge <= 45) ageGroups['36-45']++;
      else if (estimatedAge <= 55) ageGroups['46-55']++;
      else ageGroups['56+']++;
    });
    const ageData = Object.entries(ageGroups).map(([range, count]) => ({ range, count }));

    const seniorTitles = ['director', 'vp', 'chief', 'head', 'manager', 'lead', 'senior manager'];
    const leadership = employees.filter(e => {
      const title = (e.job_title || '').toLowerCase();
      return seniorTitles.some(t => title.includes(t));
    });
    const femaleLeadership = leadership.filter(e => e.gender === 'female');
    const femaleLeadershipPct = leadership.length > 0 ? (femaleLeadership.length / leadership.length) * 100 : 0;

    const maleSalaries = employees.filter(e => e.gender === 'male' && e.basic_salary).map(e => e.basic_salary);
    const femaleSalaries = employees.filter(e => e.gender === 'female' && e.basic_salary).map(e => e.basic_salary);
    const avgMaleSalary = maleSalaries.length > 0 ? maleSalaries.reduce((a, b) => a + b, 0) / maleSalaries.length : 0;
    const avgFemaleSalary = femaleSalaries.length > 0 ? femaleSalaries.reduce((a, b) => a + b, 0) / femaleSalaries.length : 0;
    const payEquityRatio = avgMaleSalary > 0 ? avgFemaleSalary / avgMaleSalary : 1;

    const disabilityCount = employees.filter(e => e.disability === true).length;
    const disabilityPct = (disabilityCount / total) * 100;

    const deptGender: Record<string, { male: number; female: number }> = {};
    employees.forEach(e => {
      const dept = e.department || 'Unassigned';
      if (!deptGender[dept]) deptGender[dept] = { male: 0, female: 0 };
      if (e.gender === 'male') deptGender[dept].male++;
      else deptGender[dept].female++;
    });
    const deptGenderData = Object.entries(deptGender)
      .map(([dept, data]) => ({
        department: dept.length > 15 ? dept.slice(0, 15) + '...' : dept,
        male: data.male,
        female: data.female,
      }))
      .sort((a, b) => (b.male + b.female) - (a.male + a.female))
      .slice(0, 8);

    const now30 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    const recentHires = employees.filter(e => new Date(e.hire_date) >= now30);
    const recentFemale = recentHires.filter(e => e.gender === 'female');
    const hiringDiversityPct = recentHires.length > 0 ? (recentFemale.length / recentHires.length) * 100 : 0;

    return {
      total,
      femalePct,
      genderData,
      nationalityData,
      saudizationPct,
      ageData,
      femaleLeadershipPct,
      leadershipTotal: leadership.length,
      payEquityRatio,
      avgMaleSalary,
      avgFemaleSalary,
      disabilityCount,
      disabilityPct,
      deptGenderData,
      hiringDiversityPct,
    };
  }, [employees]);

  if (loading) {
    return <div className="bg-white rounded-xl border border-gray-200 h-96 animate-pulse" />;
  }

  if (!metrics) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
        <Users className="w-16 h-16 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No employee data available for diversity analysis.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Female Workforce</div>
          <div className="text-2xl font-bold text-pink-600">{metrics.femalePct.toFixed(1)}%</div>
          <p className="text-xs text-gray-400 mt-1">of {metrics.total} employees</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Female Leadership</div>
          <div className="text-2xl font-bold text-blue-600">{metrics.femaleLeadershipPct.toFixed(1)}%</div>
          <p className="text-xs text-gray-400 mt-1">{metrics.leadershipTotal} leaders total</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Saudization</div>
          <div className="text-2xl font-bold text-green-600">{metrics.saudizationPct.toFixed(1)}%</div>
          <p className="text-xs text-gray-400 mt-1">Nitaqat compliance</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Pay Equity Ratio</div>
          <div className="text-2xl font-bold text-teal-600">{metrics.payEquityRatio.toFixed(2)}</div>
          <p className="text-xs text-gray-400 mt-1">F:M ratio (1.0 = parity)</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1">Hiring Diversity</div>
          <div className="text-2xl font-bold text-amber-600">{metrics.hiringDiversityPct.toFixed(1)}%</div>
          <p className="text-xs text-gray-400 mt-1">Female hires (90 days)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Gender Distribution</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={metrics.genderData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value">
                  {metrics.genderData.map((_, i) => <Cell key={i} fill={GENDER_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Legend verticalAlign="bottom" height={36} iconType="circle" formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Nationality Distribution</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={metrics.nationalityData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
                  {metrics.nationalityData.map((_, i) => <Cell key={i} fill={NATIONALITY_COLORS[i % NATIONALITY_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1 mt-2">
            {metrics.nationalityData.slice(0, 5).map((item, i) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: NATIONALITY_COLORS[i % NATIONALITY_COLORS.length] }} />
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-semibold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Age Distribution</h4>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.ageData}>
                <XAxis dataKey="range" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Gender by Department</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.deptGenderData} layout="vertical">
                <XAxis type="number" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="department" width={120} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }} />
                <Legend iconType="circle" formatter={(v) => <span className="text-xs text-gray-600">{v}</span>} />
                <Bar dataKey="male" fill="#0ea5e9" stackId="a" barSize={16} name="Male" />
                <Bar dataKey="female" fill="#ec4899" stackId="a" barSize={16} name="Female" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h4 className="text-sm font-semibold text-gray-900 mb-4">Pay Equity Analysis</h4>
          <div className="space-y-6 mt-8">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Average Male Salary</span>
                <span className="font-semibold text-gray-900">{metrics.avgMaleSalary.toLocaleString()} SAR</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div className="bg-blue-500 h-3 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Average Female Salary</span>
                <span className="font-semibold text-gray-900">{metrics.avgFemaleSalary.toLocaleString()} SAR</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-3">
                <div className="bg-pink-500 h-3 rounded-full" style={{ width: `${metrics.payEquityRatio * 100}%` }} />
              </div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-center">
                <div className={`text-4xl font-bold mb-1 ${metrics.payEquityRatio >= 0.95 ? 'text-green-600' : metrics.payEquityRatio >= 0.85 ? 'text-amber-600' : 'text-red-600'}`}>
                  {metrics.payEquityRatio.toFixed(2)}
                </div>
                <p className="text-xs text-gray-500">
                  {metrics.payEquityRatio >= 0.95 ? 'Near parity achieved' :
                   metrics.payEquityRatio >= 0.85 ? 'Moderate gap - action recommended' :
                   'Significant gap - urgent action needed'}
                </p>
              </div>
            </div>
            {metrics.disabilityCount > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Employees with Disability</span>
                  <span className="font-semibold">{metrics.disabilityCount} ({metrics.disabilityPct.toFixed(1)}%)</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
