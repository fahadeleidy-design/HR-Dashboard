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
  x_apikey: string;
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

    if (!config.client_id || !config.client_secret || !config.private_key) {
      return new Response(JSON.stringify({ 
        error: 'GOSI API credentials incomplete. Please configure Client ID, Client Secret, and Private Key.' 
      }), {
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
        response = await testGOSIConnection(gosiBaseUrl, config, supabaseClient);
        break;

      case 'fetch_contributor':
        if (!requestData.nin) {
          throw new Error('NIN/Iqama/Border Number is required');
        }
        response = await fetchContributor(gosiBaseUrl, config, requestData.nin, supabaseClient);
        break;

      case 'fetch_all_contributors':
        response = await fetchAllContributors(gosiBaseUrl, config, requestData.employees || [], supabaseClient);
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

function generateJTI(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function base64UrlEncode(str: string): string {
  return btoa(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

async function generateDPoPToken(privateKeyPem: string, method: string, url: string): Promise<string> {
  try {
    const cleanKey = privateKeyPem
      .replace(/-----BEGIN (RSA )?PRIVATE KEY-----/g, '')
      .replace(/-----END (RSA )?PRIVATE KEY-----/g, '')
      .replace(/\s+/g, '');

    const binaryKey = Uint8Array.from(atob(cleanKey), c => c.charCodeAt(0));

    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      binaryKey,
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );

    const header = {
      typ: 'dpop+jwt',
      alg: 'RS256',
    };

    const payload = {
      jti: generateJTI(),
      htm: method,
      htu: url,
      iat: Math.floor(Date.now() / 1000),
    };

    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    const dataToSign = `${encodedHeader}.${encodedPayload}`;

    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(dataToSign);
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      dataBuffer
    );

    const encodedSignature = arrayBufferToBase64Url(signature);
    const jwt = `${dataToSign}.${encodedSignature}`;

    return jwt;
  } catch (error: any) {
    console.error('DPoP token generation error:', error);
    throw new Error(`Failed to generate DPoP token: ${error.message}`);
  }
}

async function getAccessToken(
  baseUrl: string,
  config: GOSIConfig,
  supabaseClient: any
): Promise<string> {
  if (config.access_token && config.token_expires_at) {
    const expiresAt = new Date(config.token_expires_at);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000;

    if (expiresAt.getTime() - now.getTime() > bufferTime) {
      return config.access_token;
    }
  }

  if (!config.establishment_number || !config.client_id || !config.client_secret || !config.private_key) {
    throw new Error('Missing required credentials: establishment_number, client_id, client_secret, or private_key');
  }

  if (!config.private_key.includes('BEGIN') || !config.private_key.includes('PRIVATE KEY')) {
    throw new Error('Invalid private key format. Key must include BEGIN and END markers');
  }

  const tokenUrl = `${baseUrl}/v1/establishment/${config.establishment_number}/access-token`;

  console.log('Requesting access token from:', tokenUrl);
  console.log('Using establishment:', config.establishment_number);
  console.log('Using environment:', config.environment);

  const dpopToken = await generateDPoPToken(config.private_key, 'POST', tokenUrl);

  const tokenResponse = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-apikey': config.x_apikey,
      'DPoP': dpopToken,
    },
    body: JSON.stringify({
      client_id: config.client_id,
      client_secret: config.client_secret,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    console.error('Token request failed:', {
      status: tokenResponse.status,
      statusText: tokenResponse.statusText,
      error: errorText,
    });

    let errorMessage = `Failed to get access token: ${tokenResponse.status} ${tokenResponse.statusText}`;

    try {
      const errorJson = JSON.parse(errorText);
      if (errorJson.message) {
        const englishMsg = errorJson.message.english || errorJson.message;
        errorMessage += `\n\nGOSI Error: ${englishMsg}`;
      }
      if (errorJson.code) {
        errorMessage += `\nError Code: ${errorJson.code}`;
      }
    } catch {
      errorMessage += `\nResponse: ${errorText}`;
    }

    errorMessage += '\n\nPossible causes:\n';
    errorMessage += '1. Invalid Client ID or Client Secret\n';
    errorMessage += '2. Establishment number does not match the credentials\n';
    errorMessage += '3. Credentials are for different environment (sandbox vs production)\n';
    errorMessage += '4. Private key format is incorrect\n';
    errorMessage += '5. x-apikey is invalid or expired';

    throw new Error(errorMessage);
  }

  const tokenData = await tokenResponse.json();
  const accessToken = tokenData.access_token || tokenData.accessToken;

  if (!accessToken) {
    throw new Error('No access token in response');
  }

  const expiresIn = tokenData.expires_in || tokenData.expiresIn || 3600;
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

async function testGOSIConnection(
  baseUrl: string,
  config: GOSIConfig,
  supabaseClient: any
) {
  try {
    const accessToken = await getAccessToken(baseUrl, config, supabaseClient);
    
    return {
      success: true,
      message: 'Successfully connected to GOSI API and obtained access token',
      data: {
        establishment_number: config.establishment_number,
        environment: config.environment,
        token_obtained: true,
      },
    };
  } catch (error: any) {
    throw new Error(`Connection test failed: ${error.message}`);
  }
}

async function fetchContributor(
  baseUrl: string,
  config: GOSIConfig,
  nin: string,
  supabaseClient: any
) {
  const accessToken = await getAccessToken(baseUrl, config, supabaseClient);
  
  const apiUrl = `${baseUrl}/v2/establishment/${config.establishment_number}/contributor/${nin}`;
  const dpopToken = await generateDPoPToken(config.private_key, 'GET', apiUrl);

  const response = await fetch(apiUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'x-apikey': config.x_apikey,
      'DPoP': dpopToken,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to fetch contributor: ${response.status} ${response.statusText} - ${errorText}`);
  }

  const data = await response.json();
  return {
    success: true,
    message: 'Successfully fetched contributor data from GOSI',
    data,
  };
}

async function fetchAllContributors(
  baseUrl: string,
  config: GOSIConfig,
  employees: any[],
  supabaseClient: any
) {
  const accessToken = await getAccessToken(baseUrl, config, supabaseClient);
  const results = [];
  
  for (const employee of employees) {
    try {
      const nin = employee.iqama_number || employee.nin;
      if (!nin) {
        results.push({
          employee_id: employee.id,
          status: 'failed',
          error: 'No NIN/Iqama number found',
        });
        continue;
      }

      const apiUrl = `${baseUrl}/v2/establishment/${config.establishment_number}/contributor/${nin}`;
      const dpopToken = await generateDPoPToken(config.private_key, 'GET', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'x-apikey': config.x_apikey,
          'DPoP': dpopToken,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        results.push({
          employee_id: employee.id,
          nin: nin,
          status: 'success',
          data,
        });
      } else {
        const error = await response.text();
        results.push({
          employee_id: employee.id,
          nin: nin,
          status: 'failed',
          error,
        });
      }
    } catch (error: any) {
      results.push({
        employee_id: employee.id,
        status: 'failed',
        error: error.message,
      });
    }
  }

  return {
    success: true,
    message: `Fetched ${results.filter(r => r.status === 'success').length} of ${employees.length} contributors from GOSI`,
    results,
  };
}
