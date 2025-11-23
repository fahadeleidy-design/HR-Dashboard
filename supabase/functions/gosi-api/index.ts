import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface GOSIConfig {
  id: string;
  establishment_number: string;
  client_id: string;
  client_secret: string;
  private_key: string;
  environment: 'sandbox' | 'production';
  access_token?: string | null;
  token_expires_at?: string | null;
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

    if (!config.client_id || !config.client_secret) {
      return new Response(JSON.stringify({ error: 'GOSI API credentials incomplete. Please configure Client ID and Client Secret.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const gosiBaseUrl = config.environment === 'production'
      ? 'https://api.gosi.gov.sa'
      : 'https://sandbox-api.gosi.gov.sa';

    const accessToken = await getAccessToken(gosiBaseUrl, config, supabaseClient);

    let response;

    switch (action) {
      case 'test_connection':
        response = await testGOSIConnection(gosiBaseUrl, accessToken, config);
        break;

      case 'sync_employees':
        response = await syncEmployeesToGOSI(gosiBaseUrl, accessToken, config, requestData.employees);
        break;

      case 'fetch_contributions':
        response = await fetchGOSIContributions(gosiBaseUrl, accessToken, config, requestData.period);
        break;

      case 'submit_wage_report':
        response = await submitWageReport(gosiBaseUrl, accessToken, config, requestData);
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

async function getAccessToken(baseUrl: string, config: GOSIConfig, supabaseClient: any): Promise<string> {
  if (config.access_token && config.token_expires_at) {
    const expiresAt = new Date(config.token_expires_at);
    const now = new Date();
    
    if (expiresAt > now) {
      return config.access_token;
    }
  }

  const tokenResponse = await fetch(`${baseUrl}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: config.client_id,
      client_secret: config.client_secret,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to get access token: ${tokenResponse.statusText} - ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token;
  const expiresIn = tokenData.expires_in || 3600;
  const expiresAt = new Date(Date.now() + (expiresIn * 1000));

  await supabaseClient
    .from('gosi_api_config')
    .update({
      access_token: accessToken,
      token_expires_at: expiresAt.toISOString(),
    })
    .eq('id', config.id);

  return accessToken;
}

async function generateJWT(privateKey: string, payload: any): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const keyData = encoder.encode(privateKey);
    
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };
    
    const encodedHeader = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    return `${encodedHeader}.${encodedPayload}.signature`;
  } catch (error) {
    console.error('JWT generation error:', error);
    throw new Error('Failed to generate JWT token');
  }
}

async function testGOSIConnection(baseUrl: string, accessToken: string, config: GOSIConfig) {
  const response = await fetch(`${baseUrl}/api/v1/establishments/${config.establishment_number}/info`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`GOSI API connection failed: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return {
    success: true,
    message: 'Successfully connected to GOSI API',
    data,
  };
}

async function syncEmployeesToGOSI(baseUrl: string, accessToken: string, config: GOSIConfig, employees: any[]) {
  const results = [];
  
  for (const employee of employees) {
    try {
      const response = await fetch(`${baseUrl}/api/v1/establishments/${config.establishment_number}/employees`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nin: employee.iqama_number,
          firstName: employee.first_name_en,
          lastName: employee.last_name_en,
          nationality: employee.nationality,
          dateOfBirth: employee.date_of_birth,
          joiningDate: employee.hire_date,
          occupation: employee.job_title_en,
          wage: employee.basic_salary,
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

async function fetchGOSIContributions(baseUrl: string, accessToken: string, config: GOSIConfig, period: string) {
  const response = await fetch(
    `${baseUrl}/api/v1/establishments/${config.establishment_number}/contributions?period=${period}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch GOSI contributions: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return {
    success: true,
    message: 'Successfully fetched GOSI contributions',
    data,
  };
}

async function submitWageReport(baseUrl: string, accessToken: string, config: GOSIConfig, reportData: any) {
  const response = await fetch(
    `${baseUrl}/api/v1/establishments/${config.establishment_number}/wage-reports`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to submit wage report: ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return {
    success: true,
    message: 'Wage report submitted successfully',
    data,
  };
}
