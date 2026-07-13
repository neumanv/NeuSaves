--Actualización para los movimientos periódicos: día de cobro configurable.
--En una base de datos nueva se ejecuta solo (va después de init.sql por orden alfabético) y no hace nada.
--En una base de datos ya creada hay que ejecutarlo a mano una vez, junto con movimientos_usuarios.sql (trigger nuevo):
--  docker exec -i contenedor-postgres psql -U usuario_gastos -d gastos_db < db/zz_actualizacion_dia_cobro.sql
--  docker exec -i contenedor-postgres psql -U usuario_gastos -d gastos_db < db/movimientos_usuarios.sql

ALTER TABLE movimientos_usuarios ADD COLUMN IF NOT EXISTS dia_cobro INT;     --1-7 (semanal, 1=lunes) o 1-31 (mensual/2 meses/anual)
ALTER TABLE movimientos_usuarios ADD COLUMN IF NOT EXISTS mes_cobro INT;     --1-12, solo para los anuales
ALTER TABLE movimientos_usuarios ADD COLUMN IF NOT EXISTS ultimo_cobro DATE; --fecha del último cobro generado, para no duplicar cobros

--Los periódicos ya existentes reciben el día de cobro por defecto (lunes / día 1 / 1 de enero)
UPDATE movimientos_usuarios mu
SET dia_cobro = 1
FROM periodos p
WHERE mu.id_periodo = p.id_periodo
  AND mu.dia_cobro IS NULL
  AND p.periodo <> 'Diario';

UPDATE movimientos_usuarios mu
SET mes_cobro = 1
FROM periodos p
WHERE mu.id_periodo = p.id_periodo
  AND mu.mes_cobro IS NULL
  AND p.periodo = 'Anual';

--Los periódicos antiguos ya movieron dinero al crearse (comportamiento anterior):
--se marca el último cobro a hoy para que no generen cobros retroactivos.
UPDATE movimientos_usuarios SET ultimo_cobro = CURRENT_DATE WHERE id_periodo IS NOT NULL AND ultimo_cobro IS NULL;