import { format } from 'date-fns';

interface Employee {
  id: string;
  employee_number: string;
  first_name_en: string;
  last_name_en: string;
  job_title_en: string;
  email: string | null;
  phone: string | null;
  department_name: string | null;
  manager_name: string | null;
  direct_reports_count: number;
  total_reports_count: number;
  level: number;
  hire_date: string;
}

export function exportToCSV(employees: Employee[], filename?: string): void {
  const headers = [
    'Employee Number',
    'First Name',
    'Last Name',
    'Job Title',
    'Department',
    'Email',
    'Phone',
    'Manager',
    'Direct Reports',
    'Total Team',
    'Level',
    'Hire Date'
  ];

  const csvContent = [
    headers.join(','),
    ...employees.map(emp => [
      emp.employee_number,
      emp.first_name_en,
      emp.last_name_en,
      `"${emp.job_title_en}"`,
      `"${emp.department_name || 'N/A'}"`,
      emp.email || 'N/A',
      emp.phone || 'N/A',
      `"${emp.manager_name || 'No Manager'}"`,
      emp.direct_reports_count,
      emp.total_reports_count,
      emp.level,
      format(new Date(emp.hire_date), 'yyyy-MM-dd')
    ].join(','))
  ].join('\n');

  downloadFile(csvContent, filename || `org-chart-${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
}

export function exportToJSON(employees: Employee[], filename?: string): void {
  const jsonContent = JSON.stringify(employees, null, 2);
  downloadFile(jsonContent, filename || `org-chart-${format(new Date(), 'yyyy-MM-dd')}.json`, 'application/json');
}

export function exportToHierarchicalJSON(employees: Employee[], filename?: string): void {
  const buildHierarchy = (parentId: string | null = null): any[] => {
    return employees
      .filter(emp => emp.manager_id === parentId)
      .map(emp => ({
        id: emp.id,
        employeeNumber: emp.employee_number,
        name: `${emp.first_name_en} ${emp.last_name_en}`,
        jobTitle: emp.job_title_en,
        department: emp.department_name,
        email: emp.email,
        phone: emp.phone,
        level: emp.level,
        directReports: emp.direct_reports_count,
        totalTeam: emp.total_reports_count,
        hireDate: emp.hire_date,
        children: buildHierarchy(emp.id)
      }));
  };

  const hierarchy = buildHierarchy();
  const jsonContent = JSON.stringify(hierarchy, null, 2);
  downloadFile(jsonContent, filename || `org-chart-hierarchical-${format(new Date(), 'yyyy-MM-dd')}.json`, 'application/json');
}

export function exportToMarkdown(employees: Employee[], filename?: string): void {
  const buildMarkdownHierarchy = (parentId: string | null = null, indent: number = 0): string => {
    return employees
      .filter(emp => emp.manager_id === parentId)
      .map(emp => {
        const prefix = '  '.repeat(indent) + (indent > 0 ? '- ' : '# ');
        const name = `${emp.first_name_en} ${emp.last_name_en}`;
        const title = emp.job_title_en;
        const dept = emp.department_name ? ` (${emp.department_name})` : '';
        const team = emp.direct_reports_count > 0 ? ` - Team: ${emp.direct_reports_count}` : '';

        return `${prefix}**${name}** - ${title}${dept}${team}\n${buildMarkdownHierarchy(emp.id, indent + 1)}`;
      })
      .join('');
  };

  const markdownContent = `# Organization Chart\n\nGenerated: ${format(new Date(), 'MMMM dd, yyyy')}\n\n${buildMarkdownHierarchy()}`;
  downloadFile(markdownContent, filename || `org-chart-${format(new Date(), 'yyyy-MM-dd')}.md`, 'text/markdown');
}

export function exportToHTML(employees: Employee[], companyName: string, filename?: string): void {
  const buildHTMLHierarchy = (parentId: string | null = null): string => {
    const children = employees.filter(emp => emp.manager_id === parentId);
    if (children.length === 0) return '';

    return `
      <ul style="list-style: none; padding-left: 20px;">
        ${children.map(emp => `
          <li style="margin: 10px 0;">
            <div style="background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; padding: 15px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <div style="font-size: 18px; font-weight: bold;">${emp.first_name_en} ${emp.last_name_en}</div>
              <div style="font-size: 14px; opacity: 0.9; margin-top: 5px;">${emp.job_title_en}</div>
              ${emp.department_name ? `<div style="font-size: 12px; opacity: 0.8; margin-top: 3px;">${emp.department_name}</div>` : ''}
              ${emp.email ? `<div style="font-size: 12px; opacity: 0.8; margin-top: 3px;">${emp.email}</div>` : ''}
              ${emp.direct_reports_count > 0 ? `<div style="font-size: 12px; margin-top: 5px; background: rgba(255,255,255,0.2); padding: 5px 10px; border-radius: 5px; display: inline-block;">Team: ${emp.direct_reports_count} direct • ${emp.total_reports_count} total</div>` : ''}
            </div>
            ${buildHTMLHierarchy(emp.id)}
          </li>
        `).join('')}
      </ul>
    `;
  };

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Organization Chart - ${companyName}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        .container {
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 {
            color: #1f2937;
            margin-bottom: 10px;
            font-size: 32px;
        }
        .meta {
            color: #6b7280;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: linear-gradient(135deg, #f3f4f6, #e5e7eb);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        .stat-value {
            font-size: 32px;
            font-weight: bold;
            color: #1f2937;
        }
        .stat-label {
            font-size: 14px;
            color: #6b7280;
            margin-top: 5px;
        }
        ul {
            list-style: none;
        }
        @media print {
            body {
                background: white;
            }
            .container {
                box-shadow: none;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 Organization Chart</h1>
        <div class="meta">
            <strong>${companyName}</strong> • Generated on ${format(new Date(), 'MMMM dd, yyyy HH:mm')}
        </div>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">${employees.length}</div>
                <div class="stat-label">Total Employees</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${employees.filter(e => e.direct_reports_count > 0).length}</div>
                <div class="stat-label">Managers</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${Math.max(...employees.map(e => e.level)) + 1}</div>
                <div class="stat-label">Hierarchy Levels</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${new Set(employees.map(e => e.department_name)).size}</div>
                <div class="stat-label">Departments</div>
            </div>
        </div>

        <h2 style="color: #1f2937; margin-bottom: 20px;">Organization Structure</h2>
        ${buildHTMLHierarchy()}
    </div>
</body>
</html>
  `;

  downloadFile(htmlContent, filename || `org-chart-${format(new Date(), 'yyyy-MM-dd')}.html`, 'text/html');
}

function downloadFile(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function printOrgChart(): void {
  window.print();
}
