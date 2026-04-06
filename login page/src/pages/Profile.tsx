import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import "./Todo.css";
import { clearPersistedAuth, type AuthState } from "../lib/auth";
import { readScopedStorageItem, writeScopedStorageItem } from "../lib/workspaceStorage";

interface ProfilePageProps {
  setAuth: React.Dispatch<React.SetStateAction<AuthState>>;
}

interface UserProfile {
  name: string;
  companyName: string;
  jobTitle: string;
  email: string;
  phone: string;
  website: string;
  location: string;
  department: string;
  employeeId: string;
  bio: string;
  avatar: string;
  coverImage: string;
}

const defaultCoverImage =
  "https://images.unsplash.com/photo-1507209696998-3c532be9b2b5?auto=format&fit=crop&w=1800&q=80";

const defaultProfile: UserProfile = {
  name: "User",
  companyName: "Yono Technologies",
  jobTitle: "Productivity Specialist",
  email: "",
  phone: "",
  website: "",
  location: "",
  department: "",
  employeeId: "",
  bio: "Focused on building productive daily routines with clear priorities and strong execution.",
  avatar: "",
  coverImage: defaultCoverImage,
};

type ProfileKey = keyof UserProfile;

type WorkFieldKey = "jobTitle" | "department" | "employeeId";

type ContactFieldKey = "email" | "phone" | "website" | "location";

const normalizeText = (value: string) => value.trim().replace(/\s+/g, " ");

const toSafeString = (value: unknown): string => (typeof value === "string" ? value : "");

const sanitizeProfile = (input: Partial<UserProfile>): UserProfile => {
  const next = { ...defaultProfile, ...input };

  return {
    name: normalizeText(toSafeString(next.name)) || defaultProfile.name,
    companyName: normalizeText(toSafeString(next.companyName)) || defaultProfile.companyName,
    jobTitle: normalizeText(toSafeString(next.jobTitle)),
    email: toSafeString(next.email).trim().toLowerCase(),
    phone: toSafeString(next.phone).trim(),
    website: toSafeString(next.website).trim(),
    location: normalizeText(toSafeString(next.location)),
    department: normalizeText(toSafeString(next.department)),
    employeeId: toSafeString(next.employeeId).trim(),
    bio: toSafeString(next.bio).trim() || defaultProfile.bio,
    avatar: toSafeString(next.avatar),
    coverImage: toSafeString(next.coverImage) || defaultCoverImage,
  };
};

const readProfile = (): UserProfile => {
  const raw = readScopedStorageItem("app-profile");
  if (!raw) return defaultProfile;

  try {
    return sanitizeProfile(JSON.parse(raw) as Partial<UserProfile>);
  } catch {
    return defaultProfile;
  }
};

const displayValue = (value: string, fallback = "Not provided") => value.trim() || fallback;

const websiteToHref = (website: string) => {
  const value = website.trim();
  if (!value) return "";
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
};

const workFields: Array<{ key: WorkFieldKey; label: string; placeholder: string }> = [
  { key: "jobTitle", label: "Job Title", placeholder: "Enter job title" },
  { key: "department", label: "Department", placeholder: "Enter department" },
  { key: "employeeId", label: "Employee ID", placeholder: "Enter employee ID" },
];

const contactFields: Array<{
  key: ContactFieldKey;
  label: string;
  icon: string;
  placeholder: string;
  type?: "text" | "email" | "tel" | "url";
}> = [
  {
    key: "email",
    label: "Email",
    icon: "bi bi-envelope",
    placeholder: "Enter email",
    type: "email",
  },
  {
    key: "phone",
    label: "Phone",
    icon: "bi bi-telephone",
    placeholder: "Enter phone number",
    type: "tel",
  },
  {
    key: "website",
    label: "Website",
    icon: "bi bi-globe",
    placeholder: "Enter website",
    type: "url",
  },
  {
    key: "location",
    label: "Location",
    icon: "bi bi-geo-alt",
    placeholder: "Enter location",
  },
];

export default function ProfilePage({ setAuth }: ProfilePageProps) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile>(() => readProfile());
  const [draft, setDraft] = useState<UserProfile>(() => readProfile());
  const [isEditing, setIsEditing] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);

  const avatarMenuRef = useRef<HTMLDivElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (avatarMenuRef.current && !avatarMenuRef.current.contains(target)) {
        setAvatarMenuOpen(false);
      }
    };

    window.addEventListener("click", closeOnOutside);
    return () => window.removeEventListener("click", closeOnOutside);
  }, []);

  const persistProfile = (nextProfile: UserProfile) => {
    const normalized = sanitizeProfile(nextProfile);
    writeScopedStorageItem("app-profile", JSON.stringify(normalized));
    setProfile(normalized);
    setDraft(normalized);
    window.dispatchEvent(new CustomEvent("app-profile-updated", { detail: normalized }));
  };

  const updateDraftField = (key: ProfileKey, value: string) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const startEdit = () => {
    setDraft(profile);
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft(profile);
    setIsEditing(false);
    setAvatarMenuOpen(false);
  };

  const saveProfileChanges = () => {
    persistProfile(draft);
    setIsEditing(false);
  };

  const resetProfile = () => {
    persistProfile(defaultProfile);
    setIsEditing(false);
    setAvatarMenuOpen(false);
  };

  const applyAvatar = (value: string) => {
    if (isEditing) {
      setDraft((prev) => ({ ...prev, avatar: value }));
      return;
    }
    persistProfile({ ...profile, avatar: value });
  };

  const applyCoverImage = (value: string) => {
    if (isEditing) {
      setDraft((prev) => ({ ...prev, coverImage: value }));
      return;
    }
    persistProfile({ ...profile, coverImage: value });
  };

  const onAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = (reader.result as string) || "";
      if (result) applyAvatar(result);
    };
    reader.readAsDataURL(file);

    event.target.value = "";
    setAvatarMenuOpen(false);
  };

  const onCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const result = (reader.result as string) || "";
      if (result) applyCoverImage(result);
    };
    reader.readAsDataURL(file);

    event.target.value = "";
  };

  const removeAvatar = () => {
    applyAvatar("");
    setAvatarMenuOpen(false);
  };

  const handleLogout = () => {
    clearPersistedAuth();
    setAuth({ token: null, role: null });
    navigate("/", { replace: true });
  };

  const activeProfile = isEditing ? draft : profile;
  const hasChanges = JSON.stringify(sanitizeProfile(profile)) !== JSON.stringify(sanitizeProfile(draft));

  return (
    <div className="todo-page profile-page--premium">
      <div className="profile-page-wrap container py-4">
        <section className="profile-hero-card">
          <div className="profile-cover-banner">
            <img src={activeProfile.coverImage || defaultCoverImage} alt="Profile cover" />
            <div className="profile-cover-overlay" />

            <button
              type="button"
              className="profile-cover-edit"
              onClick={() => coverInputRef.current?.click()}
            >
              <i className="bi bi-image" />
              Change Cover
            </button>

            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={onCoverChange}
            />
          </div>

          <div className="profile-identity-wrap">
            <div className="profile-avatar-shell profile-avatar-shell--hero" ref={avatarMenuRef}>
              <span className="profile-avatar profile-avatar-xl profile-avatar-preview">
                {activeProfile.avatar ? (
                  <img src={activeProfile.avatar} alt="Profile avatar" className="profile-avatar-image" />
                ) : (
                  activeProfile.name.trim().charAt(0).toUpperCase() || "U"
                )}
              </span>

              <button
                type="button"
                className="profile-avatar-camera"
                aria-label="Upload avatar"
                onClick={() => setAvatarMenuOpen((prev) => !prev)}
              >
                <i className="bi bi-camera-fill" />
              </button>

              {avatarMenuOpen && (
                <div className="profile-avatar-menu">
                  <button type="button" onClick={() => cameraInputRef.current?.click()}>
                    Take Photo
                  </button>
                  <button type="button" onClick={() => galleryInputRef.current?.click()}>
                    Choose from Gallery
                  </button>
                  {activeProfile.avatar && (
                    <button type="button" className="danger" onClick={removeAvatar}>
                      Remove Photo
                    </button>
                  )}
                </div>
              )}

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                hidden
                onChange={onAvatarChange}
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={onAvatarChange}
              />
            </div>

            <div className="profile-identity-main">
              {!isEditing ? (
                <>
                  <h1>{displayValue(activeProfile.name, "Your Name")}</h1>
                  <p className="profile-identity-role">{displayValue(activeProfile.jobTitle, "Add job role")}</p>
                  <p className="profile-identity-company">
                    {displayValue(activeProfile.companyName, "Add company name")}
                  </p>
                </>
              ) : (
                <>
                  <div className="profile-identity-edit-grid">
                    <div>
                      <label htmlFor="profile-name" className="form-label">
                        Full Name
                      </label>
                      <input
                        id="profile-name"
                        className="form-control"
                        value={draft.name}
                        onChange={(e) => updateDraftField("name", e.target.value)}
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <label htmlFor="profile-company-name" className="form-label">
                        Company Name
                      </label>
                      <input
                        id="profile-company-name"
                        className="form-control"
                        value={draft.companyName}
                        onChange={(e) => updateDraftField("companyName", e.target.value)}
                        placeholder="Enter company name"
                      />
                    </div>
                  </div>

                  <div className="profile-identity-preview">
                    <h1>{displayValue(activeProfile.name, "Your Name")}</h1>
                    <p className="profile-identity-role">
                      {displayValue(activeProfile.jobTitle, "Add job role in Work Info")}
                    </p>
                    <p className="profile-identity-company">
                      {displayValue(activeProfile.companyName, "Add company name")}
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="profile-hero-actions">
              {isEditing ? (
                <button
                  type="button"
                  className="btn profile-btn-primary"
                  onClick={saveProfileChanges}
                  disabled={!hasChanges}
                >
                  Save Profile
                </button>
              ) : (
                <button type="button" className="btn profile-btn-primary" onClick={startEdit}>
                  Edit Profile
                </button>
              )}

              <button type="button" className="btn profile-btn-secondary" onClick={resetProfile}>
                Reset Profile
              </button>

              {isEditing && (
                <button type="button" className="btn profile-btn-ghost" onClick={cancelEdit}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="profile-content-layout">
          <article className="profile-card-surface profile-card-full">
            <div className="profile-card-title-row">
              <h3>About</h3>
              <p>Short profile bio with clear and professional tone.</p>
            </div>

            {isEditing ? (
              <textarea
                className="form-control profile-about-input"
                rows={4}
                value={draft.bio}
                onChange={(e) => updateDraftField("bio", e.target.value)}
                placeholder="Write short profile bio"
              />
            ) : (
              <p className="profile-about-text">{displayValue(activeProfile.bio)}</p>
            )}
          </article>

          <article className="profile-card-surface">
            <div className="profile-card-title-row">
              <h3>Work Info</h3>
              <p>Role, department, and organization details.</p>
            </div>

            <div className="profile-work-grid">
              {workFields.map((field) => (
                <div className="profile-field-item" key={field.key}>
                  <label className="profile-field-label" htmlFor={`work-${field.key}`}>
                    {field.label}
                  </label>

                  {isEditing ? (
                    <input
                      id={`work-${field.key}`}
                      className="form-control"
                      value={draft[field.key]}
                      onChange={(e) => updateDraftField(field.key, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  ) : (
                    <p className="profile-field-value">{displayValue(activeProfile[field.key])}</p>
                  )}
                </div>
              ))}
            </div>
          </article>

          <article className="profile-card-surface">
            <div className="profile-card-title-row">
              <h3>Contact Info</h3>
              <p>Email, phone, website, and location.</p>
            </div>

            <div className="profile-contact-grid">
              {contactFields.map((field) => (
                <article className="profile-contact-item" key={field.key}>
                  <span className="profile-contact-icon" aria-hidden="true">
                    <i className={field.icon} />
                  </span>

                  <div className="profile-contact-content">
                    <label className="profile-field-label" htmlFor={`contact-${field.key}`}>
                      {field.label}
                    </label>

                    {isEditing ? (
                      <input
                        id={`contact-${field.key}`}
                        className="form-control"
                        type={field.type || "text"}
                        value={draft[field.key]}
                        onChange={(e) => updateDraftField(field.key, e.target.value)}
                        placeholder={field.placeholder}
                      />
                    ) : field.key === "website" && activeProfile.website.trim() ? (
                      <a
                        className="profile-field-link"
                        href={websiteToHref(activeProfile.website)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {activeProfile.website}
                      </a>
                    ) : (
                      <p className="profile-field-value">{displayValue(activeProfile[field.key])}</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </article>

          {isEditing && (
            <article className="profile-card-surface profile-card-full profile-live-preview">
              <div className="profile-card-title-row">
                <h3>Live Profile Preview</h3>
                <p>Instant preview while editing profile details.</p>
              </div>

              <div className="profile-preview-line">
                <strong>{displayValue(draft.name, "Your Name")}</strong>
                <span>{displayValue(draft.jobTitle, "Job Role")}</span>
                <span>{displayValue(draft.companyName, "Company Name")}</span>
              </div>
            </article>
          )}
        </section>

        <section className="profile-action-hub">
          <div className="profile-action-copy">
            <h3>Account Actions</h3>
            <p>Manage workspace access, profile settings, and your session from one place.</p>
          </div>
          <div className="profile-action-grid">
            <button
              type="button"
              className="btn profile-link-btn neutral"
              onClick={() => navigate("/todo/tasks")}
            >
              <i className="bi bi-kanban" aria-hidden="true" />
              Go Workspace
            </button>
            <button
              type="button"
              className="btn profile-link-btn"
              onClick={() =>
                navigate("/todo/tasks", {
                  state: {
                    openSettingsModal: true,
                    settingsTab: "account",
                  },
                })
              }
            >
              <i className="bi bi-sliders" aria-hidden="true" />
              Open Settings
            </button>
            <button type="button" className="btn profile-link-btn danger" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right" aria-hidden="true" />
              Logout
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
