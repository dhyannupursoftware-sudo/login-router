const normalizeScopeValue = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const parseStoredAuth = (
  raw: string | null
): { token: string | null; userId: number | null; email: string | null } | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      token?: unknown;
      userId?: unknown;
      email?: unknown;
    };

    const token = typeof parsed.token === "string" && parsed.token.trim().length > 0 ? parsed.token.trim() : null;
    const userId =
      typeof parsed.userId === "number" && Number.isFinite(parsed.userId) && parsed.userId > 0
        ? parsed.userId
        : null;
    const email = typeof parsed.email === "string" && parsed.email.trim().length > 0 ? parsed.email.trim().toLowerCase() : null;

    if (!token && !userId && !email) {
      return null;
    }

    return { token, userId, email };
  } catch {
    return null;
  }
};

const readStoredAuthScope = (): { token: string | null; userId: number | null; email: string | null } => {
  if (typeof window === "undefined") {
    return { token: null, userId: null, email: null };
  }

  for (const storage of [localStorage, sessionStorage]) {
    const parsed = parseStoredAuth(storage.getItem("auth"));
    if (parsed) {
      return parsed;
    }
  }

  return { token: null, userId: null, email: null };
};

export const getWorkspaceStorageScope = (): string => {
  const auth = readStoredAuthScope();

  if (auth.userId !== null) {
    return `user-${auth.userId}`;
  }

  if (auth.email) {
    const normalizedEmail = normalizeScopeValue(auth.email);
    if (normalizedEmail) {
      return `email-${normalizedEmail}`;
    }
  }

  if (auth.token) {
    const normalizedToken = normalizeScopeValue(auth.token).slice(0, 48);
    if (normalizedToken) {
      return `session-${normalizedToken}`;
    }
  }

  return "guest";
};

export const getScopedStorageKey = (baseKey: string, scope = getWorkspaceStorageScope()): string =>
  `${baseKey}:${scope}`;

export const matchesScopedStorageKey = (
  baseKey: string,
  eventKey: string | null | undefined,
  scope = getWorkspaceStorageScope()
): boolean => {
  if (eventKey == null) return true;

  return eventKey === "auth" || eventKey === baseKey || eventKey === getScopedStorageKey(baseKey, scope);
};

export const readScopedStorageItem = (baseKey: string, scope = getWorkspaceStorageScope()): string | null =>
  localStorage.getItem(getScopedStorageKey(baseKey, scope));

export const writeScopedStorageItem = (baseKey: string, value: string, scope = getWorkspaceStorageScope()): void => {
  localStorage.setItem(getScopedStorageKey(baseKey, scope), value);
};

export const removeScopedStorageItem = (baseKey: string, scope = getWorkspaceStorageScope()): void => {
  localStorage.removeItem(getScopedStorageKey(baseKey, scope));
};
