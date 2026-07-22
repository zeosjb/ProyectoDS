insert into public.venues (name, address, sport) values
('Cancha Norte UCN', 'Campus norte', 'Futbol'),
('Gimnasio Central', 'Edificio deportivo', 'Basquetbol')
on conflict do nothing;
