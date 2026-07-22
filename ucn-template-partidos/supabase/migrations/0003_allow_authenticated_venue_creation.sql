drop policy if exists venues_insert on public.venues;

create policy venues_insert on public.venues
for insert
with check (auth.uid() is not null);
