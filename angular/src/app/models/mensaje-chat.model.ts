export interface MensajeChat{
  rol: "user" | "model";
  texto: string;
}

export interface ChatResponse{
  respuesta: string;
}
