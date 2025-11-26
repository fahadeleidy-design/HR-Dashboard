import { useEffect, useState } from 'react';
import { useCompany } from '@/contexts/CompanyContext';
import { supabase } from '@/lib/supabase';
import { Plus, Edit, Layers, DollarSign, Percent, CheckCircle, XCircle } from 'lucide-react';
import { formatNumber } from '@/lib/formatters';

interface SalaryComponent {
  id: string;
  component_code: string;
  component_name: string;
  component_name_ar: string;
  component_type: string;
  calculation_method: string;
  default_value: number;
  is_taxable: boolean;
  is_mandatory: boolean;
  affects_gosi: boolean;
  display_order: number;
  is_active: boolean;
}

export function ComponentsManagement() {
  const { currentCompany } = useCompany();
  const [loading, setLoading] = useState(true);
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    if (currentCompany) {
      fetchComponents();
    }
  }, [currentCompany, filterType]);

  const fetchComponents = async () => {
    if (!currentCompany) return;

    setLoading(true);
    try {
      let query = supabase
        .from('salary_components')
        .select('*')
        .eq('company_id', currentCompany.id)
        .order('display_order');

      if (filterType !== 'all') {
        query = query.eq('component_type', filterType);
      }

      const { data, error } = await query;
      if (!error && data) {
        setComponents(data);
      }
    } catch (error) {
      console.error('Error fetching components:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      allowance: 'bg-green-100 text-green-700',
      deduction: 'bg-red-100 text-red-700',
      benefit: 'bg-blue-100 text-blue-700',
      bonus: 'bg-purple-100 text-purple-700',
      overtime: 'bg-orange-100 text-orange-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  const getCalculationIcon = (method: string) => {
    if (method === 'percentage') return <Percent className="h-4 w-4" />;
    return <DollarSign className="h-4 w-4" />;
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
          <h2 className="text-2xl font-bold text-gray-900">Salary Components Management</h2>
          <p className="text-gray-600 mt-1">Configure allowances, deductions, and benefits</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Components</option>
            <option value="allowance">Allowances</option>
            <option value="deduction">Deductions</option>
            <option value="benefit">Benefits</option>
            <option value="bonus">Bonuses</option>
            <option value="overtime">Overtime</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md">
            <Plus className="h-5 w-5" />
            Add Component
          </button>
        </div>
      </div>

      {components.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-200">
          <Layers className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Components Defined</h3>
          <p className="text-gray-600 mb-6">Create salary components to build your compensation structure</p>
          <button className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md mx-auto">
            <Plus className="h-5 w-5" />
            Create First Component
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Component Name
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Calculation
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Default Value
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Properties
                    </th>
                    <th className="px-6 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {components.map((component) => (
                    <tr key={component.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm font-semibold text-gray-900">
                          {component.component_code}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-900">{component.component_name}</p>
                          <p className="text-xs text-gray-500">{component.component_name_ar}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getTypeColor(component.component_type)}`}>
                          {component.component_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg">
                          {getCalculationIcon(component.calculation_method)}
                          <span className="text-xs font-medium capitalize">{component.calculation_method}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="space-y-1">
                          <p className="font-bold text-gray-900">
                            {component.calculation_method === 'percentage'
                              ? `${component.default_value}%`
                              : `${formatNumber(component.default_value, 'en')} SAR`
                            }
                          </p>
                          <p className="text-xs text-gray-500">Default</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          {component.is_mandatory && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium" title="Mandatory">
                              M
                            </span>
                          )}
                          {component.is_taxable && (
                            <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium" title="Taxable">
                              T
                            </span>
                          )}
                          {component.affects_gosi && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium" title="Affects GOSI">
                              G
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {component.is_active ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <CheckCircle className="h-3 w-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                            <XCircle className="h-3 w-3" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900">Allowances</h3>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                Additional payments: Housing, Transport, Food, Mobile, Education
              </p>
              <div className="text-xs text-gray-600">
                <p className="font-semibold mb-1">Common Examples:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Housing: 25-30% of basic</li>
                  <li>Transport: 500-1,000 SAR</li>
                  <li>Food: 300-500 SAR</li>
                </ul>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6 border border-red-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-500 rounded-lg">
                  <DollarSign className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900">Deductions</h3>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                Mandatory deductions: GOSI, Loans, Advances, Penalties
              </p>
              <div className="text-xs text-gray-600">
                <p className="font-semibold mb-1">Common Examples:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>GOSI: 10% of basic (employee)</li>
                  <li>Loan repayment: Fixed amount</li>
                  <li>Advance recovery: Fixed</li>
                </ul>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-blue-500 rounded-lg">
                  <Layers className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900">Benefits</h3>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                Insurance and perks: Medical, Life, Dental, Vision coverage
              </p>
              <div className="text-xs text-gray-600">
                <p className="font-semibold mb-1">Common Examples:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Medical: Company paid</li>
                  <li>Life insurance: 1-2x salary</li>
                  <li>Dental: Optional add-on</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6 border border-orange-200">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Layers className="h-5 w-5 text-orange-600" />
              Component Properties Legend
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-white rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-bold">M</span>
                  <p className="font-semibold text-gray-900">Mandatory</p>
                </div>
                <p className="text-sm text-gray-600">Component is automatically applied to all eligible employees</p>
              </div>
              <div className="p-4 bg-white rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">T</span>
                  <p className="font-semibold text-gray-900">Taxable</p>
                </div>
                <p className="text-sm text-gray-600">Component is subject to income tax calculations (if applicable)</p>
              </div>
              <div className="p-4 bg-white rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold">G</span>
                  <p className="font-semibold text-gray-900">Affects GOSI</p>
                </div>
                <p className="text-sm text-gray-600">Component is included in GOSI contribution calculation basis</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
