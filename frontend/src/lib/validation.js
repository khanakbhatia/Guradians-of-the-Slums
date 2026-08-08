const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email) {
  if (!email.trim()) return "Email is required.";
  if (!EMAIL_RE.test(email)) return "Enter a valid email address.";
  return null;
}

export function validateName(name) {
  if (!name.trim()) return "Full name is required.";
  if (name.trim().length < 2) return "Name is too short.";
  return null;
}

/** Returns the set of password rules and whether each is currently met. */
export function passwordRules(password) {
  return [
    { id: "length", label: "At least 8 characters", met: password.length >= 8 },
    { id: "upper", label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { id: "number", label: "One number", met: /\d/.test(password) },
  ];
}

export function validatePassword(password) {
  if (!password) return "Password is required.";
  const unmet = passwordRules(password).filter((r) => !r.met);
  if (unmet.length > 0) return "Password doesn't meet all requirements.";
  return null;
}

export function validateConfirmPassword(password, confirm) {
  if (!confirm) return "Please confirm your password.";
  if (password !== confirm) return "Passwords don't match.";
  return null;
}

export function validateRequired(value, label) {
  if (!value || !String(value).trim()) return `${label} is required.`;
  return null;
}
