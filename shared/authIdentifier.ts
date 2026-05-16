/** Identificador de login: e-mail válido ou nome de usuário (guardado na coluna users.email). */

export const LOGIN_IDENTIFIER_MAX = 320;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CTRL_OR_ANGLE = /[\p{Cc}<>]/u;

/** Sem @ no texto: tratamos como nome de usuário (mín. 3 caracteres, unicode, sem espaços). */
export function normalizeLoginIdentifier(raw: string): string {
  return raw.normalize('NFKC').trim().toLocaleLowerCase('pt-BR');
}

export type ValidateLoginIdentifierResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

export function validateLoginIdentifierNormalized(normalized: string): ValidateLoginIdentifierResult {
  if (!normalized) {
    return { ok: false, message: 'Informe um e-mail ou nome de usuário.' };
  }
  if (normalized.length > LOGIN_IDENTIFIER_MAX) {
    return { ok: false, message: `Máximo de ${LOGIN_IDENTIFIER_MAX} caracteres.` };
  }

  if (normalized.includes('@')) {
    return EMAIL_REGEX.test(normalized)
      ? { ok: true, value: normalized }
      : { ok: false, message: 'E-mail inválido.' };
  }

  if (normalized.length < 3) {
    return { ok: false, message: 'O nome de usuário deve ter pelo menos 3 caracteres.' };
  }

  if (/\s/.test(normalized) || CTRL_OR_ANGLE.test(normalized)) {
    return {
      ok: false,
      message: 'O nome de usuário não pode ter espaços nem caracteres inválidos.',
    };
  }

  return { ok: true, value: normalized };
}
