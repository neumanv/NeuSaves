//Ofusca el id del usuario en la URL para que no se vea el número real.
//No es seguridad real (se ejecuta en el navegador): solo evita exponer el id a simple vista.
const SECRETO = "NeuSaves";

export function cifrarId(id: number): string{
  const texto = String(id);
  let mezclado = "";
  for (let i = 0; i < texto.length; i++){
    mezclado += String.fromCharCode(texto.charCodeAt(i) ^ SECRETO.charCodeAt(i % SECRETO.length));
  }
  //base64 apto para URL (sin +, / ni =)
  return btoa(mezclado).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function descifrarId(token: string): number | null{
  try{
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const mezclado = atob(b64);
    let texto = "";
    for (let i = 0; i < mezclado.length; i++){
      texto += String.fromCharCode(mezclado.charCodeAt(i) ^ SECRETO.charCodeAt(i % SECRETO.length));
    }
    const id = Number(texto);
    return Number.isInteger(id) && id > 0 ? id : null;
  }catch{
    return null;
  }
}
