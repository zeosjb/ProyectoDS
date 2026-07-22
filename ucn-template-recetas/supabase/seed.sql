insert into public.ingredients (name) values
('Tomate'), ('Albahaca'), ('Arroz'), ('Pollo'), ('Lentejas')
on conflict (name) do nothing;
