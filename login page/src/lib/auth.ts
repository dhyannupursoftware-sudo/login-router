import { getScopedStorageKey } from "./workspaceStorage";

export interface AuthState {
  token: string | null;
  role: string | null;
  userId?: number | null;
  name?: string | null;
  email?: string | null;
  avatar?: string | null;
}

export interface StoredProfile {
  name?: string;
  companyName?: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  website?: string;
  location?: string;
  department?: string;
  employeeId?: string;
  bio?: string;
  avatar?: string;
  coverImage?: string;
}

const normalizeText = (value: unknown): string =>
  typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";

const normalizeEmail = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const normalizeValue = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const normalizeUserId = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;

export const hasValidToken = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const parseStoredAuth = (raw: string | null): AuthState | null => {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<AuthState>;
    const token = hasValidToken(parsed.token) ? parsed.token : null;
    const role =
      typeof parsed.role === "string" && parsed.role.trim().length > 0
        ? parsed.role
        : null;
    const userId = normalizeUserId(parsed.userId);
    const name = normalizeText(parsed.name);
    const email = normalizeEmail(parsed.email);
    const avatar = normalizeValue(parsed.avatar);

    return {
      token,
      role,
      userId,
      name: name || null,
      email: email || null,
      avatar: avatar || null,
    };
  } catch {
    return null;
  }
};

export const readSavedAuth = (): AuthState => {
  const storages = [localStorage, sessionStorage];

  for (const storage of storages) {
    const parsed = parseStoredAuth(storage.getItem("auth"));
    if (parsed && hasValidToken(parsed.token)) {
      return parsed;
    }
  }

  return {
    token: null,
    role: null,
    userId: null,
    name: null,
    email: null,
    avatar: null,
  };
};

const readStoredProfile = (): StoredProfile => {
  const raw = localStorage.getItem(getScopedStorageKey("app-profile"));
  if (!raw) return {};

  try {
    return JSON.parse(raw) as StoredProfile;
  } catch {
    return {};
  }
};

const sanitizeProfile = (profile: Partial<StoredProfile>): Partial<StoredProfile> => {
  const next: Partial<StoredProfile> = {};

  if ("name" in profile) next.name = normalizeText(profile.name);
  if ("companyName" in profile) next.companyName = normalizeText(profile.companyName);
  if ("jobTitle" in profile) next.jobTitle = normalizeText(profile.jobTitle);
  if ("email" in profile) next.email = normalizeEmail(profile.email);
  if ("phone" in profile) next.phone = normalizeValue(profile.phone);
  if ("website" in profile) next.website = normalizeValue(profile.website);
  if ("location" in profile) next.location = normalizeText(profile.location);
  if ("department" in profile) next.department = normalizeText(profile.department);
  if ("employeeId" in profile) next.employeeId = normalizeValue(profile.employeeId);
  if ("bio" in profile) next.bio = normalizeValue(profile.bio);
  if ("avatar" in profile) next.avatar = normalizeValue(profile.avatar);
  if ("coverImage" in profile) next.coverImage = normalizeValue(profile.coverImage);

  return next;
};

export const persistProfile = (profile: Partial<StoredProfile>): StoredProfile => {
  const nextProfile = {
    ...readStoredProfile(),
    ...sanitizeProfile(profile),
  };

  localStorage.setItem(getScopedStorageKey("app-profile"), JSON.stringify(nextProfile));

  try {
    window.dispatchEvent(new CustomEvent("app-profile-updated", { detail: nextProfile }));
  } catch {
    // Ignore browsers that block synthetic custom events.
  }

  return nextProfile;
};

export const persistAuth = (
  auth: AuthState,
  options?: {
    remember?: boolean;
    profile?: Partial<StoredProfile>;
  }
): void => {
  const remember = options?.remember ?? true;
  const primaryStorage = remember ? localStorage : sessionStorage;
  const secondaryStorage = remember ? sessionStorage : localStorage;

  primaryStorage.setItem("auth", JSON.stringify(auth));
  secondaryStorage.removeItem("auth");

  if (options?.profile) {
    persistProfile(options.profile);
  }

  try {
    window.dispatchEvent(new StorageEvent("storage", { key: "auth" }));
  } catch {
    // Ignore browsers that block synthetic storage events.
  }
};

export const clearPersistedAuth = (): void => {
  [localStorage, sessionStorage].forEach((storage) => {
    storage.removeItem("auth");
  });

  try {
    window.dispatchEvent(new StorageEvent("storage", { key: "auth" }));
  } catch {
    // Ignore browsers that block synthetic storage events.
  }
};
