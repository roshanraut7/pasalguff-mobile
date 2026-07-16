let pendingPassword: string | null = null;

export function setPendingPassword(password: string) {
  pendingPassword = password;
}

export function consumePendingPassword(): string | null {
  const value = pendingPassword;
  pendingPassword = null;
  return value;
}