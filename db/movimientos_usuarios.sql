CREATE OR REPLACE FUNCTION calcular_saldo_movimiento()
RETURNS TRIGGER AS $$
    DECLARE
        saldo_anterior NUMERIC(12, 2);
        es_gasto       VARCHAR(1);
    BEGIN
        SELECT saldo INTO saldo_anterior
        FROM movimientos_usuarios
        WHERE id_usuario = NEW.id_usuario
        ORDER BY id_movimiento_usuario DESC
        LIMIT 1;

        IF saldo_anterior IS NULL THEN
            saldo_anterior := 0;
        END IF;

        SELECT gasto INTO es_gasto
        FROM movimientos
        WHERE id_movimiento = NEW.id_movimiento;

        IF es_gasto = 'S' THEN
            NEW.saldo := saldo_anterior - NEW.cantidad;
        ELSE
            NEW.saldo := saldo_anterior + NEW.cantidad;
        END IF;

        RETURN NEW;
    END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calcular_saldo ON movimientos_usuarios;
CREATE TRIGGER trg_calcular_saldo
    BEFORE INSERT ON movimientos_usuarios
    FOR EACH ROW
    EXECUTE FUNCTION calcular_saldo_movimiento();