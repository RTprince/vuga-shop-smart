create policy "business files read" on storage.objects for select to authenticated
  using (bucket_id in ('product-images','invoices') and (storage.foldername(name))[1] = public.current_business_id()::text);
create policy "business files insert" on storage.objects for insert to authenticated
  with check (bucket_id in ('product-images','invoices') and (storage.foldername(name))[1] = public.current_business_id()::text);
create policy "business files update" on storage.objects for update to authenticated
  using (bucket_id in ('product-images','invoices') and (storage.foldername(name))[1] = public.current_business_id()::text);
create policy "business files delete" on storage.objects for delete to authenticated
  using (bucket_id in ('product-images','invoices') and (storage.foldername(name))[1] = public.current_business_id()::text);
