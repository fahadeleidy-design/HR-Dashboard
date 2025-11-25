import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface DateExtractionResult {
  startDate: string | null;
  endDate: string | null;
  expiryDate: string | null;
  issueDate: string | null;
  confidence: number;
  extractedText: string;
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

    if (!file) {
      throw new Error('No file provided');
    }

    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);
    
    const base64 = btoa(String.fromCharCode(...fileBytes));
    const extractedText = await extractTextFromFile(base64, file.type);
    const dates = extractDates(extractedText);
    const confidence = calculateConfidence(dates);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...dates,
          confidence,
          extractedText: extractedText.substring(0, 500)
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error analyzing document:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to analyze document',
        data: {
          startDate: null,
          endDate: null,
          expiryDate: null,
          issueDate: null,
          confidence: 0,
          extractedText: ''
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function extractTextFromFile(base64: string, fileType: string): Promise<string> {
  try {
    const decoded = atob(base64);
    const textMatches = decoded.match(/[\x20-\x7E\u0600-\u06FF]{4,}/g) || [];
    const extractedText = textMatches.join(' ');
    return extractedText;
  } catch (error) {
    console.error('Text extraction error:', error);
    return '';
  }
}

function extractDates(text: string): Omit<DateExtractionResult, 'confidence' | 'extractedText'> {
  const result: Omit<DateExtractionResult, 'confidence' | 'extractedText'> = {
    startDate: null,
    endDate: null,
    expiryDate: null,
    issueDate: null
  };

  const datePatterns = [
    /\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/g,
    /\b(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})\b/g,
    /\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})\b/gi,
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\b/gi
  ];

  const allDates: Date[] = [];
  
  for (const pattern of datePatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const dateStr = match[0];
      const parsedDate = parseDate(dateStr);
      if (parsedDate) {
        allDates.push(parsedDate);
      }
    }
  }

  if (allDates.length === 0) {
    return result;
  }

  allDates.sort((a, b) => a.getTime() - b.getTime());

  const startMatch = text.match(/(?:start|commencement|effective|from)\s*(?:date)?[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4}|\d{4}[\/-]\d{1,2}[\/-]\d{1,2}|\d{1,2}\s+\w+\s+\d{4})/i);
  if (startMatch) {
    const date = parseDate(startMatch[1]);
    if (date) result.startDate = formatDate(date);
  }

  const endMatch = text.match(/(?:end|expiry|expiration|valid\s*until|to)\s*(?:date)?[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4}|\d{4}[\/-]\d{1,2}[\/-]\d{1,2}|\d{1,2}\s+\w+\s+\d{4})/i);
  if (endMatch) {
    const date = parseDate(endMatch[1]);
    if (date) result.endDate = formatDate(date);
  }

  const expiryMatch = text.match(/(?:expir(?:y|es|ation)|valid\s*until)\s*(?:date)?[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4}|\d{4}[\/-]\d{1,2}[\/-]\d{1,2}|\d{1,2}\s+\w+\s+\d{4})/i);
  if (expiryMatch) {
    const date = parseDate(expiryMatch[1]);
    if (date) result.expiryDate = formatDate(date);
  }

  const issueMatch = text.match(/(?:issue|issued)\s*(?:date)?[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{4}|\d{4}[\/-]\d{1,2}[\/-]\d{1,2}|\d{1,2}\s+\w+\s+\d{4})/i);
  if (issueMatch) {
    const date = parseDate(issueMatch[1]);
    if (date) result.issueDate = formatDate(date);
  }

  if (!result.startDate && allDates.length > 0) {
    result.startDate = formatDate(allDates[0]);
  }

  if (!result.endDate && allDates.length > 1) {
    result.endDate = formatDate(allDates[allDates.length - 1]);
  }

  return result;
}

function parseDate(dateStr: string): Date | null {
  try {
    const ddmmyyyy = dateStr.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
    if (ddmmyyyy) {
      const day = parseInt(ddmmyyyy[1]);
      const month = parseInt(ddmmyyyy[2]) - 1;
      const year = parseInt(ddmmyyyy[3]);
      return new Date(year, month, day);
    }

    const yyyymmdd = dateStr.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
    if (yyyymmdd) {
      const year = parseInt(yyyymmdd[1]);
      const month = parseInt(yyyymmdd[2]) - 1;
      const day = parseInt(yyyymmdd[3]);
      return new Date(year, month, day);
    }

    const textDate = dateStr.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
    if (textDate) {
      const day = parseInt(textDate[1]);
      const monthStr = textDate[2].substring(0, 3).toLowerCase();
      const year = parseInt(textDate[3]);
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const month = months.indexOf(monthStr);
      if (month !== -1) {
        return new Date(year, month, day);
      }
    }

    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
  } catch (error) {
    console.error('Date parsing error:', error);
  }
  return null;
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateConfidence(dates: Omit<DateExtractionResult, 'confidence' | 'extractedText'>): number {
  const fields = ['startDate', 'endDate', 'expiryDate', 'issueDate'];
  const filledFields = fields.filter(field => dates[field as keyof typeof dates] !== null);
  return Math.round((filledFields.length / fields.length) * 100);
}
