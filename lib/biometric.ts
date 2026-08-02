// Desbloqueo biométrico (huella / rostro) como complemento del PIN.
//
// Dos caminos, según dónde corra la app:
//   • APK (Capacitor nativo): usa el plugin nativo BiometricAuth, que abre el
//     diálogo REAL del sistema (androidx.biometric) y verifica contra las
//     huellas/rostros del teléfono. Es lo que funciona de verdad en el móvil.
//   • Web (navegador https): usa WebAuthn con el autenticador de plataforma.
//
// En ambos casos es verificación LOCAL: confirma que quien abre la app es el
// dueño del dispositivo, igual que el PIN, que sigue siendo el respaldo.

import { Capacitor, registerPlugin } from "@capacitor/core";

export const BIO_KEY = "giro_bio_cred"; // marca/credencial guardada localmente

interface BiometricAuthPlugin {
  isAvailable(): Promise<{ available: boolean; code?: number; reason?: string }>;
  verify(options: {
    title?: string;
    subtitle?: string;
    cancelTitle?: string;
  }): Promise<{ verified: boolean }>;
}

const Native = registerPlugin<BiometricAuthPlugin>("BiometricAuth");

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

// ───────────────────────── helpers WebAuthn (web) ─────────────────────────

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

// ───────────────────────────── API pública ────────────────────────────────

// ¿El dispositivo puede ofrecer desbloqueo con huella/rostro?
export async function biometricSupported(): Promise<boolean> {
  // En el APK preguntamos al sistema directamente (respuesta fiable).
  if (isNative()) {
    try {
      const res = await Native.isAvailable();
      return !!res.available;
    } catch {
      return false;
    }
  }
  // En la web, WebAuthn con autenticador de plataforma.
  try {
    if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
    const uvpaa = await window.PublicKeyCredential
      .isUserVerifyingPlatformAuthenticatorAvailable()
      .catch(() => false);
    if (uvpaa) return true;
    // Algunos WebView móviles reportan false aunque el teléfono sí tenga
    // biometría; en móvil dejamos intentarlo. En escritorio, se oculta.
    const ua = navigator.userAgent || "";
    return (
      /Android|iPhone|iPad|iPod/i.test(ua) ||
      (typeof window.matchMedia === "function" &&
        window.matchMedia("(pointer: coarse)").matches)
    );
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

// Activa el desbloqueo biométrico. En el APK basta con una verificación de
// prueba (el usuario confirma con su huella/rostro) y guardamos la marca. En la
// web se registra una credencial de plataforma con WebAuthn.
export async function registerBiometric(): Promise<boolean> {
  if (isNative()) {
    try {
      const res = await Native.verify({
        title: "Activar desbloqueo",
        subtitle: "Confirma con tu huella o rostro",
        cancelTitle: "Cancelar",
      });
      if (res?.verified) {
        localStorage.setItem(BIO_KEY, "native");
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

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
// al usuario.
export async function verifyBiometric(): Promise<boolean> {
  try {
    const id = localStorage.getItem(BIO_KEY);
    if (!id) return false;

    if (isNative()) {
      const res = await Native.verify({
        title: "Desbloquear Giro",
        subtitle: "Usa tu huella o rostro",
        cancelTitle: "Usar PIN",
      });
      return !!res?.verified;
    }

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
