// Desbloqueo biométrico (huella / rostro) como complemento del PIN. Usa
// WebAuthn con el autenticador de PLATAFORMA del dispositivo, que funciona
// tanto en la web (https) como en el WebView del APK. No sustituye al PIN: el
// PIN sigue siendo el respaldo si la biometría falla o no está disponible.
//
// Para un bloqueo LOCAL no verificamos la firma en un servidor: basta con que
// el dispositivo realice la verificación de usuario (biometría) y devuelva una
// aserción; es el mismo nivel de confianza que el PIN (todo en el dispositivo).

export const BIO_KEY = "giro_bio_cred"; // id de credencial (base64url)

function bufToB64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBuf(s: string): ArrayBuffer {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  s += "=".repeat(pad);
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

function randomBytes(n: number): ArrayBuffer {
  const buf = new ArrayBuffer(n);
  crypto.getRandomValues(new Uint8Array(buf));
  return buf;
}

// ¿El dispositivo puede ofrecer desbloqueo con huella/rostro?
//
// Nota importante: en el WebView de Android (el APK) el método
// isUserVerifyingPlatformAuthenticatorAvailable() a veces devuelve false aunque
// el teléfono SÍ tenga huella/rostro, porque el WebView no expone bien esa
// consulta. Por eso, si WebAuthn existe y estamos en un móvil, damos la opción
// por disponible y dejamos que sea el propio dispositivo quien confirme al
// intentar registrar la biometría (si de verdad no la tiene, fallará ahí).
export async function biometricSupported(): Promise<boolean> {
  try {
    if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
    const uvpaa = await window.PublicKeyCredential
      .isUserVerifyingPlatformAuthenticatorAvailable()
      .catch(() => false);
    if (uvpaa) return true;
    // El navegador dice que no; en móviles no nos fiamos (ver nota) y dejamos
    // intentarlo. En escritorio sin autenticador, sí lo ocultamos.
    const ua = navigator.userAgent || "";
    const isMobile =
      /Android|iPhone|iPad|iPod/i.test(ua) ||
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: coarse)").matches);
    return isMobile;
  } catch {
    return false;
  }
}

export function biometricEnabled(): boolean {
  try {
    return !!localStorage.getItem(BIO_KEY);
  } catch {
    return false;
  }
}

// Registra una credencial de plataforma y guarda su id en el dispositivo.
export async function registerBiometric(): Promise<boolean> {
  try {
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge: randomBytes(32),
        rp: { name: "Giro" }, // rp.id = dominio actual por defecto
        user: {
          id: randomBytes(16),
          name: "giro",
          displayName: "Giro",
        },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 }, // ES256
          { type: "public-key", alg: -257 }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      },
    })) as PublicKeyCredential | null;
    if (!cred) return false;
    localStorage.setItem(BIO_KEY, bufToB64url(cred.rawId));
    return true;
  } catch {
    return false;
  }
}

// Pide la biometría para desbloquear. Devuelve true si el dispositivo verificó
// al usuario y entregó una aserción con la credencial guardada.
export async function verifyBiometric(): Promise<boolean> {
  try {
    const id = localStorage.getItem(BIO_KEY);
    if (!id) return false;
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: randomBytes(32),
        allowCredentials: [{ type: "public-key", id: b64urlToBuf(id) }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    return !!assertion;
  } catch {
    return false;
  }
}

export function disableBiometric(): void {
  try {
    localStorage.removeItem(BIO_KEY);
  } catch {
    /* nada */
  }
}
