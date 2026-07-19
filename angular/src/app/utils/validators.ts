/**
 * Normaliza un texto eliminando diacríticos y pasando a minúsculas.
 * Útil para comparaciones de búsqueda sin importar acentos.
 */
export function normaliza(texto: string): string{
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Valida el formato de un email.
 */
export function emailValido(valor: string): boolean{
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

/**
 * Valida un DNI o NIE español (formato + letra de control).
 */
export function dniNieValido(valor: string): boolean{
  const v = valor.toUpperCase().trim();
  const letras = "TRWAGMYFPDXBNJZSQVHLCKE";
  let numero: number;
  if (/^[0-9]{8}[A-Z]$/.test(v)){
    numero = parseInt(v.substring(0, 8), 10);
  } else if (/^[XYZ][0-9]{7}[A-Z]$/.test(v)){
    const prefijoNie ={ X: "0", Y: "1", Z: "2" }[v[0]]!;
    numero = parseInt(prefijoNie + v.substring(1, 8), 10);
  } else{
    return false;
  }
  return letras[numero % 23] === v[v.length - 1];
}
