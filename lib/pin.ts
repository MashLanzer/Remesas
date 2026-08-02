// Bloqueo con PIN del lado del cliente (privacidad del dispositivo). No es
// cifrado de datos: es una barrera para que alguien con el teléfono no abra la
// app sin el PIN. El hash se guarda en el dispositivo; el desbloqueo dura la
// sesión (sessionStorage) para no pedirlo en cada pantalla.

export const PIN_KEY = "giro_pin_hash";
export const PIN_SESSION = "giro_pin_unlocked";

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode("giro:" + pin);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function pinEnabled(): boolean {
  try {
    return !!localStorage.getItem(PIN_KEY);
  } catch {
    return false;
  }
}
