// Traduce mensajes de error de Supabase Auth al español
const AUTH_ERROR_MAP: Record<string, string> = {
  'invalid login credentials':   'Correo o contraseña incorrectos.',
  'invalid_credentials':         'Correo o contraseña incorrectos.',
  'email not confirmed':          'Confirma tu correo electrónico antes de iniciar sesión.',
  'user already registered':     'Ya existe una cuenta con ese correo.',
  'email already registered':    'Ya existe una cuenta con ese correo.',
  'password should be at least 6 characters': 'La contraseña debe tener al menos 6 caracteres.',
  'signup requires a valid password':         'Ingresa una contraseña válida.',
  'network request failed':      'Sin conexión. Verifica tu internet e intenta de nuevo.',
  'fetch error':                  'Sin conexión. Verifica tu internet e intenta de nuevo.',
  // Google / módulos nativos no disponibles en este build
  'google_unavailable':          'Inicio con Google no disponible aún. Usa correo y contraseña.',
  'expowebbrowser':              'Inicio con Google no disponible aún. Usa correo y contraseña.',
  'native module':               'Inicio con Google no disponible aún. Usa correo y contraseña.',
  'not a function':              'Inicio con Google no disponible aún. Usa correo y contraseña.',
  // Límites de envío de correos
  'email rate limit exceeded':   'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
  'rate limit':                  'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
  'too many requests':           'Demasiados intentos. Espera unos minutos e intenta de nuevo.',
  // Sesión y tokens
  'token has expired':           'El enlace ha expirado. Solicita uno nuevo.',
  'invalid token':               'Enlace inválido. Solicita uno nuevo.',
  'session not found':           'Sesión no encontrada. Inicia sesión de nuevo.',
  'user not found':              'No existe una cuenta con ese correo.',
  // Contraseña
  'new password should be different': 'La nueva contraseña debe ser diferente a la actual.',
  'same password':               'La nueva contraseña debe ser diferente a la actual.',
};

export function translateError(error: unknown): string {
  if (!error) return 'Ocurrió un error inesperado.';

  const msg = error instanceof Error
    ? error.message
    : typeof error === 'string' ? error : 'Ocurrió un error inesperado.';

  const lower = msg.toLowerCase();
  for (const [key, translation] of Object.entries(AUTH_ERROR_MAP)) {
    if (lower.includes(key)) return translation;
  }

  return msg;
}
