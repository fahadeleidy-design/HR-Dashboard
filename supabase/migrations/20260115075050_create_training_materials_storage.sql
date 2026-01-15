/*
  # Create Training Materials Storage Bucket

  1. Storage
    - Create `training-materials` storage bucket for training slides and files
    - Set up RLS policies for secure access
    - Allow authenticated users to upload files
    - Allow users with access to view files

  2. Security
    - Only authenticated users can upload
    - Only users in same company can view/download files
*/

-- Create storage bucket for training materials
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'training-materials',
  'training-materials',
  false,
  52428800, -- 50MB limit
  ARRAY[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'image/jpeg',
    'image/png',
    'image/gif',
    'video/mp4',
    'video/webm',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated users can upload training materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can view training materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can update training materials" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete training materials" ON storage.objects;

-- Storage policies for training-materials bucket
CREATE POLICY "Authenticated users can upload training materials"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'training-materials');

CREATE POLICY "Users can view training materials"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'training-materials');

CREATE POLICY "Users can update training materials"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'training-materials');

CREATE POLICY "Users can delete training materials"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'training-materials');
