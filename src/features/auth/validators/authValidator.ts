import type { RegisterInput } from '../services/authService';

export type RegisterValidationErrors = Partial<
  Record<'firstName' | 'lastName' | 'email' | 'password' | 'confirmPassword', string>
>;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegister(
  input: RegisterInput & { confirmPassword: string }
): RegisterValidationErrors {
  const errors: RegisterValidationErrors = {};

  if (input.firstName.trim().length < 2) {
    errors.firstName = 'Inserisci un nome valido.';
  }
  if (input.lastName.trim().length < 2) {
    errors.lastName = 'Inserisci un cognome valido.';
  }
  if (!EMAIL_REGEX.test(input.email.trim())) {
    errors.email = 'Inserisci un indirizzo email valido.';
  }
  if (input.password.length < 8) {
    errors.password = 'Usa almeno 8 caratteri.';
  }
  if (input.confirmPassword !== input.password) {
    errors.confirmPassword = 'Le password non coincidono.';
  }

  return errors;
}
