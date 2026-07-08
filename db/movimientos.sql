INSERT INTO movimientos (tipo, gasto) VALUES
    ('Fijos', 'S'),
    ('Variables', 'S'),
    ('Gastos de ocio', 'S'),
    ('Comida y casa', 'S'),
    ('Hijos', 'S'),
    ('Transporte/vehículo', 'S'),
    ('Inversiones', 'S'),
    ('Imprevistos', 'S'),
    ('Otros gastos', 'S'),
    ('Nómina', 'N'),
    ('Beneficios de inversiones', 'N'),
    ('Regalos', 'N'),
    ('Otros', 'N')
ON CONFLICT (tipo) DO NOTHING;
