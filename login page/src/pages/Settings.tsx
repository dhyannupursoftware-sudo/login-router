import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

type SettingsCenterTab =
  | "account"
  | "general"
  | "subscription"
  | "theme"
  | "sidebar"
  | "quickAdd"
  | "productivity"
  | "reminders"
  | "notifications"
  | "backups"
  | "integrations"
  | "calendars";

interface SettingsLocationState {
  from?: string;
  settingsTab?: string;
}

const settingsTabs = new Set<SettingsCenterTab>([
  "account",
  "general",
  "subscription",
  "theme",
  "sidebar",
  "quickAdd",
  "productivity",
  "reminders",
  "notifications",
  "backups",
  "integrations",
  "calendars",
]);

const isSettingsCenterTab = (value: unknown): value is SettingsCenterTab =>
  typeof value === "string" && settingsTabs.has(value as SettingsCenterTab);

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as SettingsLocationState | null) ?? null;
  const initialSettingsTab = isSettingsCenterTab(locationState?.settingsTab)
    ? locationState.settingsTab
    : "general";
  const backTarget =
    typeof locationState?.from === "string" && locationState.from.trim().length > 0
      ? locationState.from
      : "/todo/tasks";

  useEffect(() => {
    const popupTarget = backTarget === "/settings" ? "/todo/tasks" : backTarget;

    navigate(popupTarget, {
      replace: true,
      state: {
        openSettingsModal: true,
        settingsTab: initialSettingsTab,
      },
    });
  }, [backTarget, initialSettingsTab, navigate]);

  return null;
}
