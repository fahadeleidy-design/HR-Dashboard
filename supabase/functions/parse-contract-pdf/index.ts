import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ContractData {
  contractNumber?: string;
  employeeName?: string;
  nationalId?: string;
  position?: string;
  department?: string;
  salary?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  contractType?: string;
  workHours?: number;
  probationPeriod?: number;
  noticePeriod?: number;
  benefits?: {
    housing?: number;
    transport?: number;
    other?: string[];
  };
  signedDate?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const contractId = formData.get('contractId') as string;
    const companyId = formData.get('companyId') as string;

    if (!file || !contractId) {
      throw new Error('Missing file or contractId');
    }

    // Update status to processing
    await supabase
      .from('employee_contracts')
      .update({ extraction_status: 'processing' })
      .eq('id', contractId);

    // Read PDF content
    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);
    
    // Convert to base64 for text extraction
    const base64 = btoa(String.fromCharCode(...fileBytes));
    
    // Extract text from PDF (simplified - in production use a proper PDF parser)
    const extractedText = await extractTextFromPDF(base64);
    
    // Parse contract data using AI/pattern matching
    const contractData = parseContractText(extractedText);
    
    // Calculate confidence score
    const confidence = calculateConfidence(contractData);

    // Update contract with extracted data
    const { error: updateError } = await supabase
      .from('employee_contracts')
      .update({
        extracted_data: contractData,
        extraction_status: 'completed',
        extraction_confidence: confidence,
        updated_at: new Date().toISOString()
      })
      .eq('id', contractId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: contractData,
        confidence,
        message: 'Contract parsed successfully'
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error parsing contract:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to parse contract'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

// Extract text from PDF
async function extractTextFromPDF(base64: string): Promise<string> {
  try {
    // Decode base64
    const decoded = atob(base64);
    
    // Simple text extraction (looking for readable text patterns)
    // In production, use pdf-parse or similar library
    const textMatches = decoded.match(/[\x20-\x7E]{4,}/g) || [];
    const extractedText = textMatches.join(' ');
    
    return extractedText;
  } catch (error) {
    console.error('PDF extraction error:', error);
    return '';
  }
}

// Parse contract text using pattern matching
function parseContractText(text: string): ContractData {
  const data: ContractData = {};

  // Contract Number patterns
  const contractNumMatch = text.match(/(?:contract|agreement)\s*(?:no|number|#)[:\s]*([A-Z0-9-]+)/i);
  if (contractNumMatch) data.contractNumber = contractNumMatch[1].trim();

  // Salary patterns (SAR, SR, Riyals)
  const salaryMatch = text.match(/(?:salary|compensation)[:\s]*(?:SAR|SR)?\s*([\d,]+(?:\.\d{2})?)/i);
  if (salaryMatch) {
    data.salary = parseFloat(salaryMatch[1].replace(/,/g, ''));
    data.currency = 'SAR';
  }

  // Date patterns (DD/MM/YYYY or DD-MM-YYYY or similar)
  const startDateMatch = text.match(/(?:start|commencement)\s*date[:\s]*([\d]{1,2}[-\/][\d]{1,2}[-\/][\d]{4})/i);
  if (startDateMatch) data.startDate = normalizeDate(startDateMatch[1]);

  const endDateMatch = text.match(/(?:end|expiry)\s*date[:\s]*([\d]{1,2}[-\/][\d]{1,2}[-\/][\d]{4})/i);
  if (endDateMatch) data.endDate = normalizeDate(endDateMatch[1]);

  // Position/Job Title
  const positionMatch = text.match(/(?:position|job\s*title|designation)[:\s]*([\w\s]+?)(?:\n|\.|,)/i);
  if (positionMatch) data.position = positionMatch[1].trim();

  // Department
  const deptMatch = text.match(/(?:department|division)[:\s]*([\w\s]+?)(?:\n|\.|,)/i);
  if (deptMatch) data.department = deptMatch[1].trim();

  // Contract Type
  if (text.match(/permanent|indefinite/i)) data.contractType = 'permanent';
  else if (text.match(/fixed[\s-]term|temporary/i)) data.contractType = 'fixed_term';
  else if (text.match(/part[\s-]time/i)) data.contractType = 'part_time';

  // Work Hours
  const hoursMatch = text.match(/([\d]+)\s*hours?\s*(?:per|a)?\s*week/i);
  if (hoursMatch) data.workHours = parseInt(hoursMatch[1]);

  // Probation Period
  const probationMatch = text.match(/probation(?:ary)?\s*period[:\s]*([\d]+)\s*months?/i);
  if (probationMatch) data.probationPeriod = parseInt(probationMatch[1]);

  // Notice Period
  const noticeMatch = text.match(/notice\s*period[:\s]*([\d]+)\s*days?/i);
  if (noticeMatch) data.noticePeriod = parseInt(noticeMatch[1]);

  // Benefits
  data.benefits = {};
  const housingMatch = text.match(/housing\s*(?:allowance)?[:\s]*(?:SAR|SR)?\s*([\d,]+)/i);
  if (housingMatch) data.benefits.housing = parseFloat(housingMatch[1].replace(/,/g, ''));

  const transportMatch = text.match(/transport(?:ation)?\s*(?:allowance)?[:\s]*(?:SAR|SR)?\s*([\d,]+)/i);
  if (transportMatch) data.benefits.transport = parseFloat(transportMatch[1].replace(/,/g, ''));

  return data;
}

// Normalize date to ISO format
function normalizeDate(dateStr: string): string {
  try {
    const parts = dateStr.split(/[-\/]/);
    if (parts.length === 3) {
      // Assume DD/MM/YYYY or DD-MM-YYYY
      const day = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year = parts[2];
      return `${year}-${month}-${day}`;
    }
  } catch (error) {
    console.error('Date normalization error:', error);
  }
  return dateStr;
}

// Calculate confidence score based on extracted fields
function calculateConfidence(data: ContractData): number {
  const fields = [
    'contractNumber', 'salary', 'startDate', 'position', 
    'contractType', 'workHours', 'probationPeriod', 'noticePeriod'
  ];
  
  const filledFields = fields.filter(field => {
    const value = data[field as keyof ContractData];
    return value !== undefined && value !== null && value !== '';
  });

  const confidence = (filledFields.length / fields.length) * 100;
  return Math.round(confidence * 100) / 100;
}
