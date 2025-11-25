/*
  # Add AI Document Extraction Fields

  1. Schema Changes
    - Add AI extraction fields to documents table
    - Store extracted data, metadata, and analysis results
    - Track extraction status and confidence scores
    
  2. New Fields
    - `extraction_status`: Track AI processing status
    - `extraction_confidence`: Overall confidence score
    - `extracted_data`: JSON field for all extracted information
    - `extracted_text`: Full text content from document
    - `ai_analysis`: JSON field for AI insights and recommendations
    - `document_number`: Extracted document/reference number
    - `issuer`: Extracted issuing authority/organization
    - `holder_name`: Extracted name on document
    - `holder_id`: Extracted ID/passport number
    - `amount`: Extracted monetary amounts
    - `metadata`: Additional metadata (file size, type, etc.)
    - `verified_at`: When data was manually verified
    - `verified_by`: User who verified the data
    
  3. Notes
    - All AI fields are nullable to support existing documents
    - JSON fields allow flexible schema for different document types
    - Status tracking enables batch processing and error handling
    - Confidence scores help prioritize manual review
*/

-- Add AI extraction fields to documents table
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'extraction_status'
  ) THEN
    ALTER TABLE documents ADD COLUMN extraction_status text DEFAULT 'pending' 
      CHECK (extraction_status IN ('pending', 'processing', 'completed', 'failed', 'verified'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'extraction_confidence'
  ) THEN
    ALTER TABLE documents ADD COLUMN extraction_confidence decimal(5,2) DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'extracted_data'
  ) THEN
    ALTER TABLE documents ADD COLUMN extracted_data jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'extracted_text'
  ) THEN
    ALTER TABLE documents ADD COLUMN extracted_text text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'ai_analysis'
  ) THEN
    ALTER TABLE documents ADD COLUMN ai_analysis jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'document_number'
  ) THEN
    ALTER TABLE documents ADD COLUMN document_number text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'issuer'
  ) THEN
    ALTER TABLE documents ADD COLUMN issuer text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'holder_name'
  ) THEN
    ALTER TABLE documents ADD COLUMN holder_name text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'holder_id'
  ) THEN
    ALTER TABLE documents ADD COLUMN holder_id text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'amount'
  ) THEN
    ALTER TABLE documents ADD COLUMN amount decimal(12,2);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE documents ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'verified_at'
  ) THEN
    ALTER TABLE documents ADD COLUMN verified_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'documents' AND column_name = 'verified_by'
  ) THEN
    ALTER TABLE documents ADD COLUMN verified_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create index on extraction_status for efficient filtering
CREATE INDEX IF NOT EXISTS idx_documents_extraction_status ON documents(extraction_status);

-- Create index on extraction_confidence for sorting
CREATE INDEX IF NOT EXISTS idx_documents_extraction_confidence ON documents(extraction_confidence);

-- Create GIN index on extracted_data for JSON queries
CREATE INDEX IF NOT EXISTS idx_documents_extracted_data ON documents USING gin(extracted_data);

-- Create GIN index on ai_analysis for JSON queries
CREATE INDEX IF NOT EXISTS idx_documents_ai_analysis ON documents USING gin(ai_analysis);

-- Update existing documents to have pending status
UPDATE documents 
SET extraction_status = 'pending' 
WHERE extraction_status IS NULL;
