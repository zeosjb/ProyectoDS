insert into public.categories (name) values
('Sensores'), ('Computadores'), ('Herramientas')
on conflict (name) do nothing;
