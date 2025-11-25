import { createClient } from 'npm:@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ExtractionResult {
  documentNumber?: string;
  issuer?: string;
  holderName?: string;
  holderId?: string;
  startDate?: string;
  endDate?: string;
  expiryDate?: string;
  issueDate?: string;
  amount?: number;
  currency?: string;
  position?: string;
  department?: string;
  salary?: number;
  nationality?: string;
  placeOfBirth?: string;
  dateOfBirth?: string;
  gender?: string;
  bloodGroup?: string;
  address?: string;
  phoneNumber?: string;
  email?: string;
  emergencyContact?: string;
  sponsorName?: string;
  sponsorId?: string;
  profession?: string;
  qualification?: string;
  institution?: string;
  grade?: string;
  completionDate?: string;
  certificationBody?: string;
  licenseNumber?: string;
  certificateNumber?: string;
  visaType?: string;
  entryPort?: string;
  [key: string]: any;
}

interface AnalysisResult {
  extractedData: ExtractionResult;
  extractedText: string;
  aiAnalysis: {
    documentType: string;
    confidence: number;
    completeness: number;
    warnings: string[];
    recommendations: string[];
    expiryAlert?: string;
    qualityScore: number;
    dataPoints: number;
    missingFields: string[];
    keyInsights: string[];
  };
  metadata: {
    fileSize: number;
    fileType: string;
    pageCount: number;
    language: string;
    processingTime: number;
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

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
    const documentId = formData.get('documentId') as string;
    const documentType = formData.get('documentType') as string;

    if (!file) {
      throw new Error('No file provided');
    }

    if (documentId) {
      await supabase
        .from('documents')
        .update({ extraction_status: 'processing' })
        .eq('id', documentId);
    }

    const fileBuffer = await file.arrayBuffer();
    const fileBytes = new Uint8Array(fileBuffer);
    const fileSize = fileBytes.length;
    
    const base64 = btoa(String.fromCharCode(...fileBytes));
    const extractedText = await extractTextFromFile(base64, file.type);
    
    const extractedData = extractComprehensiveData(extractedText, documentType);
    const aiAnalysis = performAIAnalysis(extractedData, extractedText, documentType);
    
    const processingTime = Date.now() - startTime;
    
    const result: AnalysisResult = {
      extractedData,
      extractedText: extractedText.substring(0, 5000),
      aiAnalysis,
      metadata: {
        fileSize,
        fileType: file.type,
        pageCount: estimatePageCount(extractedText),
        language: detectLanguage(extractedText),
        processingTime
      }
    };

    if (documentId) {
      const confidence = calculateOverallConfidence(extractedData, aiAnalysis);
      
      await supabase
        .from('documents')
        .update({
          extraction_status: 'completed',
          extraction_confidence: confidence,
          extracted_data: extractedData,
          extracted_text: extractedText.substring(0, 10000),
          ai_analysis: aiAnalysis,
          document_number: extractedData.documentNumber,
          issuer: extractedData.issuer,
          holder_name: extractedData.holderName,
          holder_id: extractedData.holderId,
          amount: extractedData.amount,
          issue_date: extractedData.issueDate,
          expiry_date: extractedData.expiryDate,
          metadata: result.metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: result
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
        error: error.message || 'Failed to analyze document'
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

    const textMatches = decoded.match(/[\x20-\x7E\u0600-\u06FF\s]{3,}/g) || [];
    let extractedText = textMatches.join(' ');

    extractedText = extractedText
      .replace(/\s+/g, ' ')
      .replace(/[^\x20-\x7E\u0600-\u06FF\s]/g, '')
      .trim();

    const patterns = [
      /Employee\s+Number[:\s]+([A-Z0-9]+)/gi,
      /Name[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi,
      /Position[:\s]+([A-Za-z\s]+?)(?:\n|$)/gi,
      /Salary[:\s]+([0-9,]+(?:\.\d{2})?)/gi,
      /Start\s+Date[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/gi,
      /End\s+Date[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/gi,
      /Contract\s+Date[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/gi,
      /(?:رقم|رقم الموظف)[:\s]+([A-Z0-9\-\/]+)/gi,
      /(?:الاسم|اسم الموظف|اسم العامل)[:\s]+([\u0600-\u06FF\s]+)/gi,
      /(?:المسمى الوظيفي|الوظيفة|المنصب)[:\s]+([\u0600-\u06FF\s]+)/gi,
      /(?:الراتب|الأجر|المرتب)[:\s]+([0-9,]+(?:\.\d{2})?)/gi,
      /(?:تاريخ البدء|تاريخ البداية|من تاريخ)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/gi,
      /(?:تاريخ الانتهاء|تاريخ النهاية|إلى تاريخ)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/gi,
      /(?:تاريخ العقد|تاريخ التوقيع)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/gi,
      /(?:الجنسية)[:\s]+([\u0600-\u06FF]+)/gi,
      /(?:رقم الهوية|رقم الإقامة|رقم الجواز)[:\s]+([0-9]+)/gi,
    ];

    for (const pattern of patterns) {
      const matches = decoded.matchAll(pattern);
      for (const match of matches) {
        if (match[0] && !extractedText.includes(match[0])) {
          extractedText += ' ' + match[0];
        }
      }
    }

    return extractedText;
  } catch (error) {
    console.error('Text extraction error:', error);
    return '';
  }
}

function extractComprehensiveData(text: string, docType?: string): ExtractionResult {
  const data: ExtractionResult = {};

  data.documentNumber = extractPattern(text, [
    /(?:document|passport|iqama|contract|certificate|license|reference)\s*(?:no|number|#)[:\s]*([A-Z0-9\-\/]+)/i,
    /(?:رقم)\s*(?:الوثيقة|الجواز|الإقامة|العقد)[:\s]*([A-Z0-9\-\/]+)/i,
    /\b([A-Z]{1,3}\d{7,10})\b/
  ]);

  data.holderId = extractPattern(text, [
    /(?:id|identification|national|passport|iqama)\s*(?:no|number|#)?[:\s]*([A-Z0-9\-]+)/i,
    /(?:رقم|هوية|جواز)[:\s]*([A-Z0-9\-]+)/i,
    /\b(\d{10})\b/
  ]);

  data.holderName = extractPattern(text, [
    /(?:name|holder|employee|passenger)[:\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /(?:name|holder|employee)[:\s]*([A-Z\s]+(?:[A-Z][a-z]+)?)/i,
    /(?:الاسم|اسم)[:\s]*([\u0600-\u06FF\s]+)/i,
    /Employee[:\s]+([A-Z][A-Z\s]+[A-Z])/i
  ]);

  let employeeNumberMatch = text.match(/Employee\s+Number[:\s]+([A-Z0-9]+)/i);
  if (!employeeNumberMatch) {
    employeeNumberMatch = text.match(/(?:رقم الموظف|رقم العامل)[:\s]+([A-Z0-9]+)/i);
  }
  if (employeeNumberMatch) {
    data.documentNumber = employeeNumberMatch[1];
  }

  if (data.holderName && data.documentNumber) {
    if (data.documentNumber.match(/^EMP\d+$/)) {
      data.documentNumber = `${data.documentNumber}`;
    }
  }

  data.issuer = extractPattern(text, [
    /(?:issued by|issuing authority|issuer)[:\s]*([A-Za-z\s]+?)(?:\n|\.|,)/i,
    /(?:الجهة المصدرة)[:\s]*([\u0600-\u06FF\s]+)/i,
    /(?:ministry|government|authority|department) of ([A-Za-z\s]+)/i
  ]);

  const dates = extractAllDates(text);
  data.issueDate = dates.issue;
  data.startDate = dates.start;
  data.endDate = dates.end;
  data.expiryDate = dates.expiry;
  data.dateOfBirth = dates.birth;

  data.amount = extractAmount(text);
  data.currency = extractCurrency(text);

  data.salary = extractSalary(text);

  data.position = extractPattern(text, [
    /(?:position|job title|designation|occupation|profession)[:\s]*([A-Za-z\s]+?)(?:\n|\.|,)/i,
    /(?:المسمى الوظيفي|الوظيفة)[:\s]*([\u0600-\u06FF\s]+)/i
  ]);

  data.department = extractPattern(text, [
    /(?:department|division|section)[:\s]*([A-Za-z\s]+?)(?:\n|\.|,)/i,
    /(?:القسم|الإدارة)[:\s]*([\u0600-\u06FF\s]+)/i
  ]);

  data.nationality = extractPattern(text, [
    /(?:nationality|citizen)[:\s]*([A-Za-z]+)/i,
    /(?:الجنسية)[:\s]*([\u0600-\u06FF]+)/i
  ]);

  data.placeOfBirth = extractPattern(text, [
    /(?:place|city) of birth[:\s]*([A-Za-z\s,]+?)(?:\n|\.|Date)/i,
    /(?:مكان الميلاد)[:\s]*([\u0600-\u06FF\s]+)/i
  ]);

  data.gender = extractPattern(text, [
    /(?:gender|sex)[:\s]*(Male|Female|M|F)/i,
    /(?:الجنس)[:\s]*(ذكر|أنثى)/i
  ]);

  data.bloodGroup = extractPattern(text, [
    /blood\s*(?:group|type)[:\s]*(A\+|A\-|B\+|B\-|AB\+|AB\-|O\+|O\-)/i,
    /(?:فصيلة الدم)[:\s]*(A\+|A\-|B\+|B\-|AB\+|AB\-|O\+|O\-)/i
  ]);

  data.phoneNumber = extractPattern(text, [
    /(?:phone|mobile|tel|contact)[:\s]*(\+?\d[\d\s\-\(\)]{8,})/i,
    /(?:هاتف|جوال)[:\s]*(\+?\d[\d\s\-]+)/i
  ]);

  data.email = extractPattern(text, [
    /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/
  ]);

  data.address = extractPattern(text, [
    /(?:address|residence)[:\s]*([A-Za-z0-9\s,\.\-]+?)(?:\n\n|Phone|Email)/i
  ]);

  data.sponsorName = extractPattern(text, [
    /(?:sponsor|employer|company)[:\s]*([A-Za-z\s&]+?)(?:\n|\.|,)/i,
    /(?:الكفيل|جهة العمل)[:\s]*([\u0600-\u06FF\s]+)/i
  ]);

  data.profession = extractPattern(text, [
    /(?:profession|occupation)[:\s]*([A-Za-z\s]+?)(?:\n|\.|,)/i,
    /(?:المهنة)[:\s]*([\u0600-\u06FF\s]+)/i
  ]);

  data.qualification = extractPattern(text, [
    /(?:qualification|degree|education)[:\s]*([A-Za-z\.\s]+?)(?:\n|\.|,)/i
  ]);

  data.institution = extractPattern(text, [
    /(?:institution|university|college|school)[:\s]*([A-Za-z\s]+?)(?:\n|\.|,)/i
  ]);

  data.grade = extractPattern(text, [
    /(?:grade|gpa|score)[:\s]*([A-F]\+?|\d\.\d+)/i
  ]);

  data.visaType = extractPattern(text, [
    /(?:visa type|visa category)[:\s]*([A-Za-z0-9\s]+?)(?:\n|\.|,)/i
  ]);

  return data;
}

function extractAllDates(text: string): {
  issue?: string;
  start?: string;
  end?: string;
  expiry?: string;
  birth?: string;
} {
  const result: any = {};

  const issueMatch = text.match(/(?:issue|issued|تاريخ الإصدار|تاريخ التوقيع|تاريخ العقد)\s*(?:date)?[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|\d{1,2}\s+\w+\s+\d{4})/i);
  if (issueMatch) result.issue = normalizeDate(issueMatch[1]);

  const startMatch = text.match(/(?:start|commencement|effective|from|تاريخ البدء|تاريخ البداية|من تاريخ|يبدأ في)\s*(?:date)?[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|\d{1,2}\s+\w+\s+\d{4})/i);
  if (startMatch) result.start = normalizeDate(startMatch[1]);

  const endMatch = text.match(/(?:end|termination|to|until|تاريخ الانتهاء|تاريخ النهاية|إلى تاريخ|ينتهي في|حتى تاريخ)\s*(?:date)?[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|\d{1,2}\s+\w+\s+\d{4})/i);
  if (endMatch) result.end = normalizeDate(endMatch[1]);

  const expiryMatch = text.match(/(?:expir(?:y|es|ation)|valid until|تاريخ الصلاحية|صالح حتى|ينتهي|تاريخ الانتهاء)\s*(?:date)?[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|\d{1,2}\s+\w+\s+\d{4})/i);
  if (expiryMatch) result.expiry = normalizeDate(expiryMatch[1]);

  const birthMatch = text.match(/(?:date of birth|DOB|born|تاريخ الميلاد|تاريخ المولد|مواليد)\s*[:\s]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}|\d{1,2}\s+\w+\s+\d{4})/i);
  if (birthMatch) result.birth = normalizeDate(birthMatch[1]);

  return result;
}

function extractPattern(text: string, patterns: RegExp[]): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

function extractAmount(text: string): number | undefined {
  const patterns = [
    /(?:amount|total|payment|fee)[:\s]*(?:SAR|SR|USD|\$|€)?\s*([\d,]+(?:\.\d{2})?)/i,
    /(?:SAR|SR)\s*([\d,]+(?:\.\d{2})?)/i,
    /\$\s*([\d,]+(?:\.\d{2})?)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
  }
  return undefined;
}

function extractCurrency(text: string): string | undefined {
  const match = text.match(/\b(SAR|SR|USD|EUR|GBP|AED)\b/i);
  if (match) return match[1].toUpperCase();
  
  if (text.includes('$')) return 'USD';
  if (text.includes('€')) return 'EUR';
  if (text.includes('£')) return 'GBP';
  if (text.includes('ريال')) return 'SAR';
  
  return undefined;
}

function extractSalary(text: string): number | undefined {
  const patterns = [
    /(?:salary|wage|compensation|الراتب|الأجر|المرتب)[:\s]*(?:SAR|SR|ريال)?\s*([\d,]+(?:\.\d{2})?)/i,
    /(?:SAR|SR|ريال)\s*([\d,]+(?:\.\d{2})?)\s*(?:شهري|شهريا|monthly)?/i,
    /([\d,]+(?:\.\d{2})?)\s*(?:SAR|SR|ريال)\s*(?:شهري|شهريا|monthly)?/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
  }
  return undefined;
}

function normalizeDate(dateStr: string): string | undefined {
  try {
    const ddmmyyyy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (ddmmyyyy) {
      const day = ddmmyyyy[1].padStart(2, '0');
      const month = ddmmyyyy[2].padStart(2, '0');
      const year = ddmmyyyy[3];
      if (parseInt(year) >= 1900 && parseInt(year) <= 2100) {
        return `${year}-${month}-${day}`;
      }
    }

    const yyyymmdd = dateStr.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (yyyymmdd) {
      const year = yyyymmdd[1];
      const month = yyyymmdd[2].padStart(2, '0');
      const day = yyyymmdd[3].padStart(2, '0');
      if (parseInt(year) >= 1900 && parseInt(year) <= 2100) {
        return `${year}-${month}-${day}`;
      }
    }

    const textDate = dateStr.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
    if (textDate) {
      const day = textDate[1].padStart(2, '0');
      const monthStr = textDate[2].substring(0, 3).toLowerCase();
      const year = textDate[3];
      const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
      const monthIndex = months.indexOf(monthStr);
      if (monthIndex !== -1) {
        const month = String(monthIndex + 1).padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
  } catch (error) {
    console.error('Date normalization error:', error);
  }
  return undefined;
}

function performAIAnalysis(data: ExtractionResult, text: string, docType?: string): any {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  const keyInsights: string[] = [];
  const missingFields: string[] = [];

  const dataPoints = Object.keys(data).filter(key => data[key] !== undefined && data[key] !== null).length;

  const isContract = docType?.toLowerCase().includes('contract') ||
                     text.toLowerCase().includes('employment contract') ||
                     text.toLowerCase().includes('work contract') ||
                     text.includes('عقد عمل') ||
                     text.includes('عقد توظيف');
  const isVisa = docType?.toLowerCase().includes('visa') || text.includes('تأشيرة');
  const isIqama = docType?.toLowerCase().includes('iqama') ||
                  docType?.toLowerCase().includes('residence') ||
                  text.includes('إقامة') ||
                  text.includes('هوية مقيم');
  const isPassport = docType?.toLowerCase().includes('passport') || text.includes('جواز سفر');

  if (data.holderName) {
    keyInsights.push(`Employee: ${data.holderName}`);
  }

  if (data.documentNumber) {
    keyInsights.push(`Employee Number: ${data.documentNumber}`);
  }

  if (data.position) {
    keyInsights.push(`Position: ${data.position}`);
  }

  if (data.nationality) {
    keyInsights.push(`Nationality: ${data.nationality}`);
  }

  if (isContract) {
    keyInsights.push('Employment contract - defines rights and obligations');

    if (data.startDate) {
      keyInsights.push(`Contract Start: ${data.startDate}`);
    } else {
      missingFields.push('Start Date');
    }

    if (data.endDate) {
      keyInsights.push(`Contract End: ${data.endDate}`);
    } else {
      missingFields.push('End Date');
    }

    if (data.salary) {
      keyInsights.push(`Salary: ${data.currency || 'SAR'} ${data.salary.toLocaleString()}`);
    } else {
      missingFields.push('Salary');
    }

    if (!data.holderName) missingFields.push('Employee Name');
    if (!data.position) missingFields.push('Position');
  } else {
    if (data.expiryDate) {
      const expiryDate = new Date(data.expiryDate);
      const today = new Date();
      const daysUntilExpiry = Math.floor((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry < 0) {
        warnings.push('Document has expired');
        recommendations.push('Immediate renewal required');
      } else if (daysUntilExpiry < 30) {
        warnings.push(`Document expiring in ${daysUntilExpiry} days`);
        recommendations.push('Schedule renewal as soon as possible');
      } else if (daysUntilExpiry < 90) {
        recommendations.push(`Document expires in ${daysUntilExpiry} days - plan for renewal`);
      }

      keyInsights.push(`Document validity: ${daysUntilExpiry} days remaining`);
    } else {
      warnings.push('No expiry date found - cannot track document validity');
      missingFields.push('Expiry Date');
    }

    if (!data.documentNumber) missingFields.push('Document Number');
    if (!data.holderName) missingFields.push('Holder Name');
    if (!data.issueDate) missingFields.push('Issue Date');
  }

  if (data.amount && data.amount > 0) {
    keyInsights.push(`Document contains monetary value: ${data.currency || 'SAR'} ${data.amount.toLocaleString()}`);
  }

  if (data.salary && data.salary > 0) {
    keyInsights.push(`Salary mentioned: ${data.currency || 'SAR'} ${data.salary.toLocaleString()}`);
  }

  if (text.length < 100) {
    warnings.push('Very little text extracted - document quality may be poor');
    recommendations.push('Consider rescanning with higher resolution');
  }

  let expectedFields = 15;
  if (isContract) {
    expectedFields = 8;
  } else if (isVisa || isIqama || isPassport) {
    expectedFields = 10;
  }

  const completeness = Math.min(100, Math.round((dataPoints / expectedFields) * 100));

  let confidence = 0;
  if (isContract && data.holderName && (data.startDate || data.endDate || data.salary)) {
    confidence = Math.min(100, dataPoints * 12 + (text.length > 500 ? 30 : text.length > 200 ? 20 : 10));
  } else if (dataPoints >= 3) {
    confidence = Math.min(100, dataPoints * 10 + (text.length > 200 ? 20 : 10));
  } else {
    confidence = Math.min(100, dataPoints * 8 + (text.length > 200 ? 15 : 5));
  }

  const qualityScore = Math.round((completeness + confidence) / 2);

  if (keyInsights.length === 0) {
    keyInsights.push('Document processed - review extracted data');
  }

  if (dataPoints === 0) {
    warnings.push('No structured data could be extracted from this document');
    recommendations.push('Verify document quality and format');
  }

  return {
    documentType: docType || 'unknown',
    confidence,
    completeness,
    qualityScore,
    dataPoints,
    warnings,
    recommendations,
    keyInsights,
    missingFields
  };
}

function calculateOverallConfidence(data: ExtractionResult, analysis: any): number {
  return Math.round(analysis.confidence);
}

function estimatePageCount(text: string): number {
  return Math.max(1, Math.round(text.length / 2000));
}

function detectLanguage(text: string): string {
  const arabicChars = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const englishChars = (text.match(/[a-zA-Z]/g) || []).length;
  
  if (arabicChars > englishChars) return 'Arabic';
  if (englishChars > arabicChars) return 'English';
  return 'Mixed';
}
