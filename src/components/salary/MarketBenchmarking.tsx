import { TrendingUp } from 'lucide-react';

export function MarketBenchmarking() {
  return (
    <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-200">
      <TrendingUp className="h-16 w-16 text-blue-600 mx-auto mb-4" />
      <h3 className="text-xl font-bold text-gray-900 mb-2">Market Benchmarking</h3>
      <p className="text-gray-600">
        Compare your salary structure with Saudi market data and industry benchmarks
      </p>
    </div>
  );
}
