/**
 * Devuelve la fecha de mañana como string YYYY-MM-DD.
 */
export function manana(): string{
  const fecha = new Date();
  fecha.setDate(fecha.getDate() + 1);
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`;
}
