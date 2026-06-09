// Desbloqueo con huella/rostro (biometría del dispositivo) usando WebAuthn.
// OJO: igual que el PIN, es un candado LOCAL de conveniencia, no seguridad del
// servidor. Sirve para que, ya con sesión iniciada, se pida la huella al abrir.
// Guardamos el id de la credencial en localStorage y, al desbloquear, pedimos
// una verificación biométrica (navigator.credentials.get). Si el dispositivo la
// aprueba, abrimos. No se hace verificación criptográfica en el servidor.

import { PIN_OK_KEY } from "@/lib/pin";

export const BIO_CRED_KEY = "mt-bio-cred";

function b64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
function deB64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

export function tieneBio(): boolean {
  try {
    return !!localStorage.getItem(BIO_CRED_KEY);
  } catch {
    return false;
  }
}

// ¿El dispositivo tiene autenticador biométrico (huella/rostro) disponible?
export async function bioDisponible(): Promise<boolean> {
  try {
    if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
    return await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

// Registra la huella de este dispositivo. Devuelve true si quedó activada.
export async function registrarBio(): Promise<boolean> {
  if (!(await bioDisponible())) return false;
  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userId = crypto.getRandomValues(new Uint8Array(16));
  const cred = (await navigator.credentials.create({
    publicKey: {
      challenge,
      rp: { name: "Mis Transferencias", id: window.location.hostname },
      user: { id: userId, name: "dueño", displayName: "Dueño" },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 }, // ES256
        { type: "public-key", alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred",
      },
      timeout: 60_000,
    },
  })) as PublicKeyCredential | null;
  if (!cred) return false;
  localStorage.setItem(BIO_CRED_KEY, b64(cred.rawId));
  return true;
}

// Pide la verificación biométrica para desbloquear. Devuelve true si se aprobó.
export async function desbloquearBio(): Promise<boolean> {
  const idB64 = (() => {
    try {
      return localStorage.getItem(BIO_CRED_KEY);
    } catch {
      return null;
    }
  })();
  if (!idB64) return false;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          { type: "public-key", id: deB64(idB64) as BufferSource },
        ],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    if (assertion) {
      sessionStorage.setItem(PIN_OK_KEY, "1");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function quitarBio() {
  try {
    localStorage.removeItem(BIO_CRED_KEY);
  } catch {
    /* sin storage */
  }
}
