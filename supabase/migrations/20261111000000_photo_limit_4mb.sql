-- Vercel Functions reject request bodies over 4.5 MB, and photos reach storage
-- through the API, so the bucket limit drops from 5 MB to 4 MB to match the API cap.
update storage.buckets
set file_size_limit = 4194304
where id = 'request-photos';
