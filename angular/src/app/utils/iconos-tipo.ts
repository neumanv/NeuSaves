/**
 * Mapa de iconos Bootstrap para cada tipo de movimiento (por nombre de tipo de la BD).
 */
export const ICONOS_TIPO: Record<string, string> = {
  "Nómina": "bi-briefcase-fill",
  "Beneficios de inversiones": "bi-graph-up-arrow",
  "Regalos": "bi-gift-fill",
  "Otros": "bi-cash-coin",
  "Fijos": "bi-calendar3",
  "Variables": "bi-list",
  "Gastos de ocio": "bi-cup-straw",
  "Comida y casa": "bi-house-fill",
  "Hijos": "bi-backpack-fill",
  "Transporte/vehículo": "bi-car-front-fill",
  "Inversiones": "bi-bank",
  "Imprevistos": "bi-patch-exclamation-fill",
  "Otros gastos": "bi-cash-coin"
};

/**
 * Devuelve el icono Bootstrap correspondiente a un tipo de movimiento.
 */
export function iconoTipo(tipo: string): string{
  return ICONOS_TIPO[tipo] ?? "bi-cash-coin";
}
