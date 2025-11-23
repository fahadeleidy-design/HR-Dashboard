import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface GOSIConfig {
  establishment_number: string;
  username: string;
  api_key: string;
  environment: 'sandbox' | 'production';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { action, company_id, data: requestData } = await req.json();

    const { data: config, error: configError } = await supabaseClient
      .from('gosi_api_config')
      .select('*')
      .eq('company_id', company_id)
      .single();

    if (configError || !config) {
      return new Response(JSON.stringify({ error: 'GOSI API not configured' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const gosiBaseUrl = config.environment === 'production'
      ? 'https://api.gosi.gov.sa'
      : 'https://sandbox-api.gosi.gov.sa';

    let response;

    switch (action) {
      case 'test_connection':
        response = await testGOSIConnection(gosiBaseUrl, config);
        break;

      case 'sync_employees':
        response = await syncEmployeesToGOSI(gosiBaseUrl, config, requestData.employees);
        break;

      case 'fetch_contributions':
        response = await fetchGOSIContributions(gosiBaseUrl, config, requestData.period);
        break;

      case 'submit_wage_report':
        response = await submitWageReport(gosiBaseUrl, config, requestData);
        break;

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    await supabaseClient
      .from('gosi_api_config')
      .update({ last_sync_date: new Date().toISOString() })
      .eq('company_id', company_id);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('GOSI API Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function testGOSIConnection(baseUrl: string, config: GOSIConfig) {
  const response = await fetch(`${baseUrl}/api/v1/health`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.api_key}`,
      'X-Establishment-Number': config.establishment_number,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`GOSI API connection failed: ${response.statusText}`);
  }

  return {
    success: true,
    message: 'Successfully connected to GOSI API',
    data: await response.json(),
  };
}

async function syncEmployeesToGOSI(baseUrl: string, config: GOSIConfig, employees: any[]) {
  const results = [];
  
  for (const employee of employees) {
    try {
      const response = await fetch(`${baseUrl}/api/v1/employees`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'X-Establishment-Number': config.establishment_number,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          iqama_number: employee.iqama_number,
          first_name: employee.first_name_en,
          last_name: employee.last_name_en,
          nationality: employee.nationality,
          date_of_birth: employee.date_of_birth,
          hire_date: employee.hire_date,
          job_title: employee.job_title_en,
          monthly_wage: employee.basic_salary,
        }),
      });

      if (response.ok) {
        results.push({ employee_id: employee.id, status: 'success' });
      } else {
        const error = await response.text();
        results.push({ employee_id: employee.id, status: 'failed', error });
      }
    } catch (error: any) {
      results.push({ employee_id: employee.id, status: 'failed', error: error.message });
    }
  }

  return {
    success: true,
    message: `Synced ${results.filter(r => r.status === 'success').length} of ${employees.length} employees`,
    results,
  };
}

async function fetchGOSIContributions(baseUrl: string, config: GOSIConfig, period: string) {
  const response = await fetch(`${baseUrl}/api/v1/contributions?period=${period}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${config.api_key}`,
      'X-Establishment-Number': config.establishment_number,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch GOSI contributions: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    success: true,
    message: 'Successfully fetched GOSI contributions',
    data,
  };
}

async function submitWageReport(baseUrl: string, config: GOSIConfig, reportData: any) {
  const response = await fetch(`${baseUrl}/api/v1/wage-reports`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.api_key}`,
      'X-Establishment-Number': config.establishment_number,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(reportData),
  });

  if (!response.ok) {
    throw new Error(`Failed to submit wage report: ${response.statusText}`);
  }

  const data = await response.json();
  return {
    success: true,
    message: 'Wage report submitted successfully',
    data,
  };
}
