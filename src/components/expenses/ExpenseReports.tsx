import { useMemo, useState } from 'react';
import { FileText, Download, Calendar, User, Building2, ChevronDown, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExpenseClaim {
  id: string;
  claim_number: string;
  amount_in_sar: number;
  vat_amount: number;
  expense_category: string;
  subcategory: string;
  description: string;
  approval_status: string;
  expense_date: string;
  policy_compliant: boolean;
  currency: string;
  employee: {
    first_name_en: string;
    last_name_en: string;
    employee_number: string;
  };
}

interface ExpenseReportsProps {
  claims: ExpenseClaim[];
}

type GroupBy = 'employee' | 'category' | 'month' | 'status';

export function ExpenseReports({ claims }: ExpenseReportsProps) {
  const [groupBy, setGroupBy] = useState<GroupBy>('employee');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('approved');

  const filteredClaims = useMemo(() => {
    if (statusFilter === 'all') return claims;
    return claims.filter(c => c.approval_status === statusFilter);
  }, [claims, statusFilter]);

  const grouped = useMemo(() => {
    const groups: Record<string, { claims: ExpenseClaim[]; total: number; vatTotal: number }> = {};

    filteredClaims.forEach(claim => {
      let key: string;
      switch (groupBy) {
        case 'employee':
          key = `${claim.employee.employee_number} - ${claim.employee.first_name_en} ${claim.employee.last_name_en}`;
          break;
        case 'category':
          key = claim.expense_category || 'Uncategorized';
          break;
        case 'month':
          key = new Date(claim.expense_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
          break;
        case 'status':
          key = claim.approval_status.charAt(0).toUpperCase() + claim.approval_status.slice(1);
          break;
        default:
          key = 'Other';
      }

      if (!groups[key]) {
        groups[key] = { claims: [], total: 0, vatTotal: 0 };
      }
      groups[key].claims.push(claim);
      groups[key].total += claim.amount_in_sar || 0;
      groups[key].vatTotal += claim.vat_amount || 0;
    });

    return Object.entries(groups).sort((a, b) => b[1].total - a[1].total);
  }, [filteredClaims, groupBy]);

  const grandTotal = useMemo(() =>
    filteredClaims.reduce((sum, c) => sum + (c.amount_in_sar || 0), 0),
    [filteredClaims]
  );

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleExportReport = () => {
    const rows = grouped.flatMap(([groupName, data]) =>
      data.claims.map(c => ({
        Group: groupName,
        'Claim #': c.claim_number,
        Employee: `${c.employee.first_name_en} ${c.employee.last_name_en}`,
        'Employee #': c.employee.employee_number,
        Date: c.expense_date,
        Category: c.expense_category,
        Subcategory: c.subcategory || '',
        Description: c.description,
        'Amount (SAR)': c.amount_in_sar,
        VAT: c.vat_amount,
        Status: c.approval_status,
        Compliant: c.policy_compliant ? 'Yes' : 'No',
      }))
    );

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Expense Report');
    XLSX.writeFile(wb, `expense_report_by_${groupBy}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const groupIcons: Record<GroupBy, typeof User> = {
    employee: User,
    category: Building2,
    month: Calendar,
    status: FileText,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Expense Reports</h3>
          <p className="text-sm text-gray-600 mt-1">
            {filteredClaims.length} claims totaling {grandTotal.toLocaleString('en-SA', { minimumFractionDigits: 2 })} SAR
          </p>
        </div>
        <button
          onClick={handleExportReport}
          disabled={filteredClaims.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 disabled:opacity-50 transition-all"
        >
          <Download className="h-4 w-4" />
          Export Report
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Group by:</span>
        {(['employee', 'category', 'month', 'status'] as GroupBy[]).map(g => {
          const Icon = groupIcons[g];
          return (
            <button
              key={g}
              onClick={() => { setGroupBy(g); setExpandedGroups(new Set()); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                groupBy === g
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {g.charAt(0).toUpperCase() + g.slice(1)}
            </button>
          );
        })}

        <div className="ml-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Approved Only</option>
            <option value="pending">Pending Only</option>
            <option value="rejected">Rejected Only</option>
          </select>
        </div>
      </div>

      {grouped.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No expense claims match the selected filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([groupName, data]) => {
            const isExpanded = expandedGroups.has(groupName);
            return (
              <div key={groupName} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded
                      ? <ChevronDown className="h-4 w-4 text-gray-500" />
                      : <ChevronRight className="h-4 w-4 text-gray-500" />
                    }
                    <span className="font-medium text-gray-900">{groupName}</span>
                    <span className="text-sm text-gray-500">({data.claims.length} claims)</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">VAT: {data.vatTotal.toLocaleString('en-SA', { minimumFractionDigits: 2 })} SAR</span>
                    <span className="font-semibold text-gray-900">{data.total.toLocaleString('en-SA', { minimumFractionDigits: 2 })} SAR</span>
                  </div>
                </button>

                {isExpanded && (
                  <table className="w-full">
                    <thead className="bg-gray-50 border-t border-gray-200">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Claim #</th>
                        {groupBy !== 'employee' && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>}
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        {groupBy !== 'category' && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Category</th>}
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount (SAR)</th>
                        {groupBy !== 'status' && <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.claims.map(claim => (
                        <tr key={claim.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{claim.claim_number || claim.id.slice(0, 8)}</td>
                          {groupBy !== 'employee' && (
                            <td className="px-4 py-2 text-sm text-gray-700">
                              {claim.employee.first_name_en} {claim.employee.last_name_en}
                            </td>
                          )}
                          <td className="px-4 py-2 text-sm text-gray-700">{new Date(claim.expense_date).toLocaleDateString()}</td>
                          {groupBy !== 'category' && <td className="px-4 py-2 text-sm text-gray-700">{claim.expense_category}</td>}
                          <td className="px-4 py-2 text-sm text-gray-700 max-w-xs truncate">{claim.description}</td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900 text-right">
                            {(claim.amount_in_sar || 0).toLocaleString('en-SA', { minimumFractionDigits: 2 })}
                          </td>
                          {groupBy !== 'status' && (
                            <td className="px-4 py-2">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                                claim.approval_status === 'approved' ? 'bg-green-100 text-green-800' :
                                claim.approval_status === 'rejected' ? 'bg-red-100 text-red-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {claim.approval_status}
                              </span>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}

          <div className="flex items-center justify-between px-4 py-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="font-semibold text-blue-900">Grand Total</span>
            <span className="text-lg font-bold text-blue-900">
              {grandTotal.toLocaleString('en-SA', { minimumFractionDigits: 2 })} SAR
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
