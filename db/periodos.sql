INSERT INTO periodos (periodo) VALUES
    ('Diario'),
    ('Semanal'),
    ('Mensual'),
    ('2 meses'),
    ('Anual')
ON CONFLICT (periodo) DO NOTHING;
