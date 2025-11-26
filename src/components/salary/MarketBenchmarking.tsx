import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { TrendingUp, TrendingDown, Minus, BarChart3, Download, AlertCircle } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

interface MarketData {
  id: string;
  position: { position_title: string; grade: { grade_name: string } };
  p25_salary: number;
  p50_salary: number;
  p75_salary: number;
  p90_salary: number;
  company_avg_salary: number;
  market_ratio: number;
}

export function MarketBenchmarking() {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [marketData, setMarketData] = useState<MarketData[]>([]);
  const [stats, setStats] = useState({
    totalPositions: 0,
    belowMarket: 0,
    atMarket: 0,
    aboveMarket: 0,
    avgRatio: 100
  });

  useEffect(() => {
    if (currentCompany) {
      fetchMarketData();
    }
  }, [currentCompany]);

  const fetchMarketData = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('salary_comparison_ratios')
        .select(`
          *,
          position:job_positions(position_title, grade:job_grades(grade_name))
        `)
        .eq('company_id', currentCompany.id)
        .order('market_ratio');

      if (!error && data) {
        setMarketData(data);

        const below = data.filter(d => d.market_ratio < 90).length;
        const at = data.filter(d => d.market_ratio >= 90 && d.market_ratio <= 110).length;
        const above = data.filter(d => d.market_ratio > 110).length;
        const avgRatio = data.length > 0
          ? data.reduce((sum, d) => sum + d.market_ratio, 0) / data.length
          : 100;

        setStats({
          totalPositions: data.length,
          belowMarket: below,
          atMarket: at,
          aboveMarket: above,
          avgRatio: Math.round(avgRatio)
        });
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRatioIcon = (ratio: number) => {
    if (ratio < 90) return <TrendingDown className="h-4 w-4 text-red-600" />;
    if (ratio > 110) return <TrendingUp className="h-4 w-4 text-green-600" />;
    return <Minus className="h-4 w-4 text-blue-600" />;
  };

  const getRatioColor = (ratio: number) => {
    if (ratio < 90) return 'bg-red-50 text-red-700 border-red-200';
    if (ratio > 110) return 'bg-green-50 text-green-700 border-green-200';
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  const getRatioLabel = (ratio: number) => {
    if (ratio < 90) return 'Below Market';
    if (ratio > 110) return 'Above Market';
    return 'At Market';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Market Benchmarking</h2>
          <p className="text-gray-600 mt-1">Compare compensation with Saudi market data</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md">
          <Download className="h-5 w-5" />
          Export Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Positions</p>
              <p className="text-3xl font-bold mt-2">{stats.totalPositions}</p>
              <p className="text-blue-100 text-xs mt-1">Benchmarked</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <BarChart3 className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-500 to-red-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Below Market</p>
              <p className="text-3xl font-bold mt-2">{stats.belowMarket}</p>
              <p className="text-red-100 text-xs mt-1">&lt; 90% ratio</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <TrendingDown className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">At Market</p>
              <p className="text-3xl font-bold mt-2">{stats.atMarket}</p>
              <p className="text-green-100 text-xs mt-1">90-110% ratio</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <Minus className="h-8 w-8" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Average Ratio</p>
              <p className="text-3xl font-bold mt-2">{stats.avgRatio}%</p>
              <p className="text-orange-100 text-xs mt-1">Market position</p>
            </div>
            <div className="bg-white/20 p-3 rounded-lg">
              <TrendingUp className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      {marketData.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-200">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Market Data</h3>
          <p className="text-gray-600 mb-6">Import salary survey data to benchmark your positions</p>
          <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md mx-auto">
            <Download className="h-5 w-5" />
            Import Market Data
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Position
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Our Avg
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    P25
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    P50 (Median)
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    P75
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                    P90
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Ratio
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {marketData.map((data) => (
                  <tr key={data.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      {data.position && (
                        <div>
                          <p className="font-semibold text-gray-900">{data.position.position_title}</p>
                          {data.position.grade && (
                            <p className="text-xs text-gray-500">{data.position.grade.grade_name}</p>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="font-bold text-gray-900">{formatNumber(data.company_avg_salary, 'en')}</p>
                      <p className="text-xs text-gray-500">SAR</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-gray-700">{formatNumber(data.p25_salary, 'en')}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex flex-col items-end px-3 py-1 bg-blue-50 rounded">
                        <p className="font-bold text-blue-700">{formatNumber(data.p50_salary, 'en')}</p>
                        <p className="text-xs text-blue-600">Market</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-gray-700">{formatNumber(data.p75_salary, 'en')}</p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <p className="text-gray-700">{formatNumber(data.p90_salary, 'en')}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {getRatioIcon(data.market_ratio)}
                        <span className="font-bold text-lg">{data.market_ratio}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getRatioColor(data.market_ratio)}`}>
                        {getRatioLabel(data.market_ratio)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
        <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-blue-600" />
          Market Percentiles Explained
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-white rounded-lg">
            <p className="font-semibold text-gray-900 mb-2">P25 (25th Percentile)</p>
            <p className="text-sm text-gray-600">25% of market pays below this amount. Entry-level benchmark.</p>
          </div>
          <div className="p-4 bg-white rounded-lg">
            <p className="font-semibold text-gray-900 mb-2">P50 (50th Percentile)</p>
            <p className="text-sm text-gray-600">Median market rate. Half of market pays above/below this.</p>
          </div>
          <div className="p-4 bg-white rounded-lg">
            <p className="font-semibold text-gray-900 mb-2">P75 (75th Percentile)</p>
            <p className="text-sm text-gray-600">Competitive rate. 75% of market pays below this amount.</p>
          </div>
          <div className="p-4 bg-white rounded-lg">
            <p className="font-semibold text-gray-900 mb-2">P90 (90th Percentile)</p>
            <p className="text-sm text-gray-600">Premium rate. Only 10% of market pays above this.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
