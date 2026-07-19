CREATE INDEX IF NOT EXISTS idx_movimientos_usuarios_id_usuario
    ON movimientos_usuarios(id_usuario);

CREATE INDEX IF NOT EXISTS idx_movimientos_usuarios_usuario_fecha
    ON movimientos_usuarios(id_usuario, fecha_movimiento);

CREATE INDEX IF NOT EXISTS idx_movimientos_usuarios_id_movimiento
    ON movimientos_usuarios(id_movimiento);

CREATE INDEX IF NOT EXISTS idx_movimientos_usuarios_id_periodo
    ON movimientos_usuarios(id_periodo);

CREATE INDEX IF NOT EXISTS idx_metas_usuario_id_usuario
    ON metas_usuario(id_usuario);

CREATE INDEX IF NOT EXISTS idx_usuarios_id_usuario_principal
    ON usuarios(id_usuario_principal);
