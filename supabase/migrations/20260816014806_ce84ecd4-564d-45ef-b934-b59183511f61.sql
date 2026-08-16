CREATE POLICY "Authenticated users can read diagram files"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'diagrams');

CREATE POLICY "Service role can manage diagram files"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'diagrams')
WITH CHECK (bucket_id = 'diagrams');