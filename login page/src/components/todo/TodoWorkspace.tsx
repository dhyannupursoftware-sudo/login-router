// @ts-nocheck
import { startTransition, useDeferredValue, useEffect, useMemo, useReducer, useRef, useState, type ChangeEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import "bootstrap/dist/css/bootstrap.min.css";
import "../../pages/Todo.css";
import { API_BASE_URL, apiClient, apiRoutes } from "../../lib/api";
import { clearPersistedAuth, readSavedAuth } from "../../lib/auth";
import {
  getScopedStorageKey,
  getWorkspaceStorageScope,
  matchesScopedStorageKey,
  readScopedStorageItem,
  removeScopedStorageItem,
  writeScopedStorageItem,
} from "../../lib/workspaceStorage";
import taskManagementImg from "../../assets/task_management.png";
import FormField from "../ui/FormField";
import PremiumBoardView from "./PremiumBoardView";
import SectionCard from "../ui/SectionCard";

type Priority = "Low" | "Medium" | "High";
type WorkspacePage = "add" | "tasks";
type TaskFilter = "all" | "pending" | "completed";
type CalendarQuickFilter = "all" | "completed" | "pending" | "high";
type TimelineRangeFilter = "today" | "last7" | "custom";
type TimelineActivityFilter = "all" | "created" | "completed" | "updated" | "deleted";
type TimelineActivityType = "created" | "completed" | "updated" | "deleted" | "overdue";
type WorkspaceMode =
  | "completed"
  | "list"
  | "board"
  | "timeline"
  | "calendar"
  | "dashboard"
  | "workflow"
  | "addTask";
type WorkspaceModal = "addTask" | "profile" | "settings";
const boardLanes = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
const LIVE_TODO_REFRESH_INTERVAL_MS = 30000;
type BoardLane = (typeof boardLanes)[number];

interface TodoComment {
  id: string;
  authorName: string;
  authorEmail?: string;
  authorAvatar?: string;
  text: string;
  createdAt: number;
}

interface TodoAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size?: number;
  isImage: boolean;
}

interface Todo {
  id: number;
  title: string;
  description: string;
  category: string;
  assignee?: string;
  project?: string;
  department?: string;
  clientName?: string;
  estimatedHours?: string;
  location?: string;
  statusNote?: string;
  lane?: string;
  priority: Priority;
  done: boolean;
  createdAt: number;
  updatedAt?: number;
  completedAt?: number;
  dueAt?: string;
  checkpoints: string[];
  tags: string[];
  comments: TodoComment[];
  attachments?: TodoAttachment[];
  images?: string[];
  image?: string;
}

interface SidebarProfile {
  name: string;
  avatar: string;
}

interface TodoActivityLogItem {
  id: string;
  taskId: number | null;
  type: Exclude<TimelineActivityType, "overdue">;
  title: string;
  description: string;
  category: string;
  priority?: Priority;
  assignee?: string;
  actorName: string;
  timestamp: number;
}

interface TimelineEventItem {
  id: string;
  taskId: number | null;
  type: TimelineActivityType;
  title: string;
  description: string;
  category: string;
  priority?: Priority;
  assignee: string;
  actorName: string;
  timestamp: number;
}

interface WorkspaceProfileData {
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
}

type ThemeMode = "light" | "dark";

const defaultWorkspaceProfile: WorkspaceProfileData = {
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
};

const defaultWorkspaceSettings = {
  theme: "dark" as ThemeMode,
  systemThemeSync: false,
  compactMode: false,
  reducedMotion: false,
  highContrast: false,
  denseInputs: false,
  focusMode: false,
  language: "en",
  timezone: "Asia/Kolkata",
  dateFormat: "DD-MM-YYYY",
  defaultView: "list",
  startPage: "/todo/tasks",
  taskSortOrder: "due-date",
  defaultPriority: "Medium",
  showCompletedByDefault: false,
  reminderPush: true,
  desktopReminders: false,
  emailReminders: false,
  reminderDefaultTime: "30 min",
  emailNotifications: true,
  dailyProductivityDigest: true,
  whatsNewUpdates: true,
  tipsAndTricks: true,
  experimentalist: false,
  dailyDigestTime: "20:00",
  weeklySummaryDay: "sunday",
  twoFactorAuth: false,
  loginAlert: true,
  publicProfile: false,
  shareAnalytics: false,
  showInboxSidebar: true,
  showUpcomingSidebar: true,
  showFiltersSidebar: true,
  showCompletedSidebar: true,
  showTaskCountSidebar: true,
  quickAddShowDate: true,
  quickAddShowAssignee: true,
  quickAddShowAttachment: true,
  quickAddShowPriority: true,
  quickAddShowReminders: true,
  quickAddShowMoreActions: true,
  quickAddShowLabels: true,
  quickAddShowDeadline: true,
  quickAddShowLocation: true,
  quickAddShowActionLabels: true,
  quickAddOrder: "date,assignee,attachment,priority,reminders,moreActions,labels,deadline,location",
  karmaEnabled: true,
  celebrateProgress: true,
  goalMon: true,
  goalTue: true,
  goalWed: true,
  goalThu: true,
  goalFri: true,
  goalSat: false,
  goalSun: false,
  vacationMode: false,
  automaticBackups: false,
  googleCalendarConnected: false,
  outlookCalendarConnected: false,
  calendarShowEvents: true,
  calendarSyncTasks: false,
};

type WorkspaceSettingsState = typeof defaultWorkspaceSettings;
type WorkspaceProfileFieldType = "text" | "email" | "tel" | "url";
type WorkspaceSettingFieldType = "checkbox" | "text" | "select" | "time";

interface WorkspaceSettingOption {
  label: string;
  value: string;
}

interface WorkspaceSettingField {
  key: keyof WorkspaceSettingsState;
  label: string;
  type: WorkspaceSettingFieldType;
  help?: string;
  options?: WorkspaceSettingOption[];
  fullWidth?: boolean;
}

interface WorkspaceSettingSection {
  title: string;
  description: string;
  fields: WorkspaceSettingField[];
}

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

interface SettingsCenterItem {
  key: SettingsCenterTab;
  label: string;
  icon: string;
}

const workspaceProfileFields: Array<{
  key: Exclude<keyof WorkspaceProfileData, "bio" | "avatar">;
  label: string;
  placeholder: string;
  type?: WorkspaceProfileFieldType;
}> = [
  { key: "name", label: "Name", placeholder: "Enter your name" },
  { key: "companyName", label: "Company", placeholder: "Enter company name" },
  { key: "jobTitle", label: "Job Title", placeholder: "Enter job title" },
  { key: "department", label: "Department", placeholder: "Enter department" },
  { key: "employeeId", label: "Employee ID", placeholder: "Enter employee ID" },
  { key: "email", label: "Email", placeholder: "Enter email", type: "email" },
  { key: "phone", label: "Phone", placeholder: "Enter phone number", type: "tel" },
  { key: "website", label: "Website", placeholder: "Enter website", type: "url" },
  { key: "location", label: "Location", placeholder: "Enter location" },
];

const workspaceSettingSections: WorkspaceSettingSection[] = [
  {
    title: "Appearance",
    description: "Theme and display preferences for your workspace.",
    fields: [
      {
        key: "theme",
        label: "Theme",
        type: "select",
        options: [
          { label: "Light", value: "light" },
          { label: "Dark", value: "dark" },
        ],
      },
      { key: "systemThemeSync", label: "Sync Theme Automatically", type: "checkbox" },
      { key: "compactMode", label: "Compact Layout", type: "checkbox" },
      { key: "reducedMotion", label: "Reduced Motion", type: "checkbox" },
      { key: "highContrast", label: "High Contrast", type: "checkbox" },
      { key: "denseInputs", label: "Dense Inputs", type: "checkbox" },
      { key: "focusMode", label: "Focus Mode", type: "checkbox" },
      {
        key: "language",
        label: "Language",
        type: "select",
        options: [
          { label: "English", value: "en" },
          { label: "Hindi", value: "hi" },
          { label: "Gujarati", value: "gu" },
          { label: "Marathi", value: "mr" },
        ],
      },
      {
        key: "timezone",
        label: "Timezone",
        type: "select",
        options: [
          { label: "Asia/Kolkata", value: "Asia/Kolkata" },
          { label: "Asia/Dubai", value: "Asia/Dubai" },
          { label: "Europe/London", value: "Europe/London" },
          { label: "America/New_York", value: "America/New_York" },
        ],
      },
      {
        key: "dateFormat",
        label: "Date Format",
        type: "select",
        options: [
          { label: "DD-MM-YYYY", value: "DD-MM-YYYY" },
          { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
          { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
        ],
      },
    ],
  },
  {
    title: "Task Preferences",
    description: "Default task behavior when you open Todo.",
    fields: [
      {
        key: "defaultView",
        label: "Default View",
        type: "select",
        options: [
          { label: "List", value: "list" },
          { label: "Board", value: "board" },
          { label: "Calendar", value: "calendar" },
        ],
      },
      {
        key: "startPage",
        label: "Start Page",
        type: "select",
        options: [
          { label: "Task Center", value: "/todo/tasks" },
          { label: "Add Task", value: "/todo/add" },
          { label: "Profile", value: "/profile" },
        ],
      },
      {
        key: "taskSortOrder",
        label: "Task Sort",
        type: "select",
        options: [
          { label: "Due Date", value: "due-date" },
          { label: "Priority", value: "priority" },
          { label: "Newest First", value: "created-desc" },
          { label: "Oldest First", value: "created-asc" },
        ],
      },
      {
        key: "defaultPriority",
        label: "Default Priority",
        type: "select",
        options: [
          { label: "Low", value: "Low" },
          { label: "Medium", value: "Medium" },
          { label: "High", value: "High" },
        ],
      },
      { key: "showCompletedByDefault", label: "Show Completed Tasks", type: "checkbox" },
    ],
  },
  {
    title: "Notifications",
    description: "Only the core alerts used in daily task flow.",
    fields: [
      { key: "reminderPush", label: "Push Reminders", type: "checkbox" },
      { key: "desktopReminders", label: "Desktop Reminders", type: "checkbox" },
      { key: "emailReminders", label: "Email Reminders", type: "checkbox" },
      { key: "emailNotifications", label: "Email Notifications", type: "checkbox" },
      {
        key: "reminderDefaultTime",
        label: "Default Reminder",
        type: "select",
        options: [
          { label: "At time of task", value: "At time of task" },
          { label: "30 min", value: "30 min" },
          { label: "1 hour", value: "1 hour" },
        ],
      },
      { key: "dailyDigestTime", label: "Daily Digest Time", type: "time" },
      {
        key: "weeklySummaryDay",
        label: "Weekly Summary Day",
        type: "select",
        options: [
          { label: "Sunday", value: "sunday" },
          { label: "Monday", value: "monday" },
          { label: "Friday", value: "friday" },
        ],
      },
      { key: "dailyProductivityDigest", label: "Daily Productivity Digest", type: "checkbox" },
      { key: "whatsNewUpdates", label: "What's New Updates", type: "checkbox" },
      { key: "tipsAndTricks", label: "Tips & Tricks", type: "checkbox" },
      { key: "experimentalist", label: "Experimentalist", type: "checkbox" },
    ],
  },
  {
    title: "Privacy & Security",
    description: "Simple security controls, without extra clutter.",
    fields: [
      { key: "twoFactorAuth", label: "2FA Authentication", type: "checkbox" },
      { key: "loginAlert", label: "Login Alert", type: "checkbox" },
      { key: "publicProfile", label: "Public Profile", type: "checkbox" },
      { key: "shareAnalytics", label: "Share Usage Analytics", type: "checkbox" },
    ],
  },
  {
    title: "Sidebar & Navigation",
    description: "Choose which lists and counters appear in your sidebar.",
    fields: [
      { key: "showInboxSidebar", label: "Show Inbox", type: "checkbox" },
      { key: "showUpcomingSidebar", label: "Show Upcoming", type: "checkbox" },
      { key: "showFiltersSidebar", label: "Show Filters & Labels", type: "checkbox" },
      { key: "showCompletedSidebar", label: "Show Completed", type: "checkbox" },
      { key: "showTaskCountSidebar", label: "Show Task Count", type: "checkbox" },
    ],
  },
  {
    title: "Calendar",
    description: "Sync tasks and calendar events into one place.",
    fields: [
      { key: "calendarShowEvents", label: "Show Events In Todo", type: "checkbox" },
      { key: "calendarSyncTasks", label: "Sync Tasks To Calendar", type: "checkbox" },
      {
        key: "timezone",
        label: "Calendar Timezone",
        type: "select",
        options: [
          { label: "Asia/Kolkata", value: "Asia/Kolkata" },
          { label: "Asia/Dubai", value: "Asia/Dubai" },
          { label: "Europe/London", value: "Europe/London" },
          { label: "America/New_York", value: "America/New_York" },
        ],
      },
    ],
  },
];

const settingsCenterItems: SettingsCenterItem[] = [
  { key: "account", label: "Account", icon: "bi-person" },
  { key: "general", label: "General", icon: "bi-gear" },
  { key: "subscription", label: "Plan", icon: "bi-card-list" },
  { key: "theme", label: "Theme", icon: "bi-circle-half" },
  { key: "sidebar", label: "Sidebar", icon: "bi-layout-sidebar" },
  { key: "quickAdd", label: "Quick Add", icon: "bi-lightning-charge" },
  { key: "productivity", label: "Productivity", icon: "bi-check2-circle" },
  { key: "reminders", label: "Reminders", icon: "bi-alarm" },
  { key: "notifications", label: "Notifications", icon: "bi-bell" },
  { key: "backups", label: "Backups", icon: "bi-cloud-arrow-down" },
  { key: "integrations", label: "Integrations", icon: "bi-box-arrow-in-right" },
  { key: "calendars", label: "Calendars", icon: "bi-calendar3" },
];

const settingsCenterTabInfo: Record<SettingsCenterTab, { title: string; description: string }> = {
  account: { title: "Account", description: "Manage your account identity, login settings, and connected services." },
  general: { title: "General", description: "Language, timezone, and default workspace behavior." },
  subscription: { title: "Plan", description: "Review your workspace plan and billing status." },
  theme: { title: "Theme", description: "Tune visual appearance, motion, and contrast." },
  sidebar: { title: "Sidebar", description: "Control sidebar behavior and task entry defaults." },
  quickAdd: { title: "Quick Add", description: "Choose how quick task capture behaves by default." },
  productivity: { title: "Productivity", description: "Set focus and task completion behavior." },
  reminders: { title: "Reminders", description: "Schedule reminder timing and weekly summaries." },
  notifications: { title: "Notifications", description: "Manage alert delivery and login notifications." },
  backups: { title: "Backups", description: "Review export and recovery status for your workspace data." },
  integrations: { title: "Integrations", description: "Connected apps and data-sharing controls." },
  calendars: { title: "Calendars", description: "Date, timezone, and calendar presentation preferences." },
};

const settingsCenterTabs = new Set<SettingsCenterTab>(settingsCenterItems.map((item) => item.key));

const isSettingsCenterTab = (value: unknown): value is SettingsCenterTab =>
  typeof value === "string" && settingsCenterTabs.has(value as SettingsCenterTab);

const workspaceSettingFieldLookup = Object.fromEntries(
  workspaceSettingSections.flatMap((section) => section.fields.map((field) => [field.key, field]))
) as Record<keyof WorkspaceSettingsState, WorkspaceSettingField>;

const settingsCenterFieldGroups: Partial<Record<SettingsCenterTab, Array<keyof WorkspaceSettingsState>>> = {
  general: ["language", "timezone", "dateFormat", "startPage"],
  theme: ["theme", "compactMode", "reducedMotion", "highContrast", "denseInputs", "focusMode"],
  sidebar: ["defaultView", "showCompletedByDefault", "denseInputs"],
  quickAdd: ["defaultPriority", "taskSortOrder"],
  productivity: ["focusMode", "showCompletedByDefault", "taskSortOrder"],
  reminders: ["reminderPush", "dailyDigestTime", "weeklySummaryDay"],
  notifications: ["emailNotifications", "loginAlert"],
  integrations: ["shareAnalytics", "publicProfile"],
  calendars: ["timezone", "dateFormat", "weeklySummaryDay"],
};

type QuickAddActionId =
  | "date"
  | "assignee"
  | "attachment"
  | "priority"
  | "reminders"
  | "moreActions"
  | "labels"
  | "deadline"
  | "location";

type SettingsIntegrationView = "installed" | "browse" | "developer";

interface WorkspaceRouteLocationState {
  openSettingsModal?: boolean;
  settingsTab?: string;
}

interface QuickAddActionItem {
  id: QuickAddActionId;
  label: string;
  description: string;
  icon: string;
  settingKey: keyof WorkspaceSettingsState;
}

const quickAddActionItems: QuickAddActionItem[] = [
  {
    id: "date",
    label: "Date",
    description: "Show due date controls in quick add.",
    icon: "bi-calendar3",
    settingKey: "quickAddShowDate",
  },
  {
    id: "assignee",
    label: "Assignee",
    description: "Let you assign tasks while capturing them.",
    icon: "bi-person",
    settingKey: "quickAddShowAssignee",
  },
  {
    id: "attachment",
    label: "Attachment",
    description: "Attach files or screenshots from quick add.",
    icon: "bi-paperclip",
    settingKey: "quickAddShowAttachment",
  },
  {
    id: "priority",
    label: "Priority",
    description: "Pick a task priority without opening full edit.",
    icon: "bi-flag",
    settingKey: "quickAddShowPriority",
  },
  {
    id: "reminders",
    label: "Reminders",
    description: "Add reminders directly from the composer.",
    icon: "bi-alarm",
    settingKey: "quickAddShowReminders",
  },
  {
    id: "moreActions",
    label: "More actions",
    description: "Keep the extra actions menu available.",
    icon: "bi-three-dots",
    settingKey: "quickAddShowMoreActions",
  },
  {
    id: "labels",
    label: "Labels",
    description: "Show labels in the quick add action bar.",
    icon: "bi-bookmarks",
    settingKey: "quickAddShowLabels",
  },
  {
    id: "deadline",
    label: "Deadline",
    description: "Expose deadline selection as an action.",
    icon: "bi-hourglass-split",
    settingKey: "quickAddShowDeadline",
  },
  {
    id: "location",
    label: "Location",
    description: "Keep the location field in quick add.",
    icon: "bi-geo-alt",
    settingKey: "quickAddShowLocation",
  },
];

const quickAddActionIds = quickAddActionItems.map((item) => item.id);

const normalizeQuickAddOrder = (raw: string): QuickAddActionId[] => {
  const parsed = raw
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is QuickAddActionId => quickAddActionIds.includes(item as QuickAddActionId));

  const uniqueParsed = parsed.filter((item, index) => parsed.indexOf(item) === index);
  const missing = quickAddActionIds.filter((item) => !uniqueParsed.includes(item));
  return [...uniqueParsed, ...missing];
};

const productivityGoalItems: Array<{ key: keyof WorkspaceSettingsState; label: string }> = [
  { key: "goalMon", label: "Mon" },
  { key: "goalTue", label: "Tue" },
  { key: "goalWed", label: "Wed" },
  { key: "goalThu", label: "Thu" },
  { key: "goalFri", label: "Fri" },
  { key: "goalSat", label: "Sat" },
  { key: "goalSun", label: "Sun" },
];

const settingsIntegrationViews: Array<{ key: SettingsIntegrationView; label: string }> = [
  { key: "installed", label: "Installed" },
  { key: "browse", label: "Browse" },
  { key: "developer", label: "Developer" },
];

const workflowOverviewMetrics = [
  { value: "3 Views", label: "List, board, and calendar stay connected for one clean workflow." },
  { value: "1 Place", label: "Priority, assignee, due date, and notes remain inside every task." },
  { value: "Daily", label: "Review pending work and completed progress without losing context." },
];

const workflowOverviewPoints = [
  {
    icon: "bi bi-card-checklist",
    title: "Detailed Todo Cards",
    text: "Each task can hold title, description, category, tags, checkpoints, and image support in one place.",
  },
  {
    icon: "bi bi-stars",
    title: "Friendly Cartoon Visual",
    text: "The workflow uses a soft illustrated todo image so the section feels lively without changing your dark background.",
  },
  {
    icon: "bi bi-clipboard-data",
    title: "Clear Review Habit",
    text: "Use the completed view and dashboard stats to measure what finished today and what needs follow-up next.",
  },
];

const workflowSteps = [
  {
    step: "1",
    icon: "bi bi-journal-plus",
    title: "Capture",
    description: "Add every task with enough detail so it is ready to act on immediately.",
    chips: ["Title + note", "Due date", "Image or file"],
  },
  {
    step: "2",
    icon: "bi bi-funnel",
    title: "Prioritize",
    description: "Set High, Medium, or Low priority and group work by project, client, or focus area.",
    chips: ["Priority level", "Owner focus", "Project tags"],
  },
  {
    step: "3",
    icon: "bi bi-lightning-charge",
    title: "Execute",
    description: "Work from the pending queue, follow checkpoints, and finish tasks in a clear daily order.",
    chips: ["Pending queue", "Checkpoints", "Status notes"],
  },
  {
    step: "4",
    icon: "bi bi-bar-chart-line",
    title: "Review",
    description: "Track completed tasks, review quality, and prepare the next action list for tomorrow.",
    chips: ["Completed log", "Progress view", "Next actions"],
  },
];

type Action =
  | { type: "ADD"; payload: Todo }
  | { type: "DELETE"; payload: number }
  | { type: "TOGGLE"; payload: number }
  | { type: "UPDATE"; payload: Todo }
  | { type: "REORDER"; payload: Todo[] }
  | { type: "CLEAR_COMPLETED" };

interface FormErrors {
  title?: string;
  category?: string;
}

interface TodoWorkspaceProps {
  view: WorkspacePage;
  initialFilter?: TaskFilter;
  standaloneSettings?: boolean;
  initialSettingsTab?: SettingsCenterTab;
  onStandaloneSettingsClose?: () => void | Promise<void>;
}

const TODO_KEY = "todo-user-created-v2";
const LEGACY_TODO_KEYS = ["todo-big-project"];
const DELETED_TODO_IDS_KEY = "todo-user-deleted-ids-v1";
const TODO_ACTIVITY_LOG_KEY = "todo-activity-log-v1";
const SIDEBAR_COLLAPSED_KEY = "todo-sidebar-collapsed-v1";
const TODO_ATTACHMENT_DB_NAME = "todo-workspace-attachments";
const TODO_ATTACHMENT_DB_VERSION = 2;
const TODO_ATTACHMENT_STORE_NAME = "task-attachments-v2";
const TIMELINE_LOG_LIMIT = 400;
const MS_PER_DAY = 86400000;
let inMemoryWorkspaceScope = "";
let inMemoryTodosCache: Todo[] = [];
let inMemoryDeletedTodoIdsCache = new Set<number>();
let inMemoryTodoActivityLogCache: TodoActivityLogItem[] = [];

const resetScopedWorkspaceCaches = () => {
  inMemoryTodosCache = [];
  inMemoryDeletedTodoIdsCache = new Set<number>();
  inMemoryTodoActivityLogCache = [];
};

const ensureScopedWorkspaceCaches = (): string => {
  const nextScope = getWorkspaceStorageScope();

  if (inMemoryWorkspaceScope !== nextScope) {
    inMemoryWorkspaceScope = nextScope;
    resetScopedWorkspaceCaches();
  }

  return nextScope;
};

const timelineRangeOptions: Array<{ id: TimelineRangeFilter; label: string }> = [
  { id: "today", label: "Today" },
  { id: "last7", label: "Last 7 days" },
  { id: "custom", label: "Custom" },
];

const timelineActivityFilterOptions: Array<{ id: TimelineActivityFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "created", label: "Created" },
  { id: "completed", label: "Completed" },
  { id: "updated", label: "Updated" },
  { id: "deleted", label: "Deleted" },
];

const timelineActivityMeta: Record<
  TimelineActivityType,
  { label: string; icon: string; toneClass: string; helper: string }
> = {
  created: {
    label: "Task Created",
    icon: "bi bi-plus-lg",
    toneClass: "is-created",
    helper: "New task entered the workflow",
  },
  completed: {
    label: "Task Completed",
    icon: "bi bi-check2",
    toneClass: "is-completed",
    helper: "Closed out and marked done",
  },
  updated: {
    label: "Task Updated",
    icon: "bi bi-pencil-square",
    toneClass: "is-updated",
    helper: "Task details or notes changed",
  },
  deleted: {
    label: "Task Deleted",
    icon: "bi bi-trash3",
    toneClass: "is-deleted",
    helper: "Removed from the active workspace",
  },
  overdue: {
    label: "Task Overdue",
    icon: "bi bi-exclamation-lg",
    toneClass: "is-deleted",
    helper: "Due date passed without completion",
  },
};

const timelineLegendItems = [
  { type: "created" as const, label: "Created", copy: "Blue marks tasks entering the flow." },
  { type: "completed" as const, label: "Completed", copy: "Green marks finished work." },
  { type: "updated" as const, label: "Updated", copy: "Yellow marks edits, comments, and changes." },
  { type: "deleted" as const, label: "Deleted / overdue", copy: "Red marks removed or overdue work." },
];

const isBoardLane = (value: string): value is BoardLane =>
  boardLanes.includes(value as BoardLane);

const normalizeLane = (value: unknown, fallback: BoardLane = "Monday"): BoardLane => {
  if (typeof value !== "string") return fallback;
  const direct = value.trim();
  if (isBoardLane(direct)) return direct;

  const clean = direct.toLowerCase();
  if (!clean) return fallback;

  const laneAliasMap: Record<string, BoardLane> = {
    mon: "Monday",
    monday: "Monday",
    tue: "Tuesday",
    tues: "Tuesday",
    tuesday: "Tuesday",
    wed: "Wednesday",
    wednesday: "Wednesday",
    thu: "Thursday",
    thur: "Thursday",
    thurs: "Thursday",
    thursday: "Thursday",
    fri: "Friday",
    friday: "Friday",
    sat: "Saturday",
    saturday: "Saturday",
    sun: "Sunday",
    sunday: "Sunday",
  };

  const mapped = laneAliasMap[clean];
  return mapped ?? fallback;
};

const parseDateForLane = (value: number | string): Date | null => {
  if (typeof value === "number") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const clean = value.trim();
  if (!clean) return null;

  const datePrefixMatch = clean.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (datePrefixMatch) {
    const year = Number(datePrefixMatch[1]);
    const month = Number(datePrefixMatch[2]);
    const day = Number(datePrefixMatch[3]);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  const parsed = new Date(clean);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getLaneFromDate = (value: number | string): BoardLane => {
  const parsed = parseDateForLane(value);
  if (!parsed) return "Monday";
  return normalizeLane(parsed.toLocaleDateString("en-US", { weekday: "long" }), "Monday");
};

const resolveTodoLane = (todo: Todo): BoardLane => {
  if (typeof todo.dueAt === "string" && todo.dueAt.trim().length > 0) {
    return getLaneFromDate(todo.dueAt);
  }
  return normalizeLane(todo.lane, getLaneFromDate(todo.createdAt));
};

const reducer = (state: Todo[], action: Action): Todo[] => {
  switch (action.type) {
    case "ADD":
      return [action.payload, ...state];
    case "DELETE":
      return state.filter((t) => t.id !== action.payload);
    case "TOGGLE":
      return state.map((t) => {
        if (t.id !== action.payload) return t;
        const nextDone = !t.done;
        return { ...t, done: nextDone, completedAt: nextDone ? Date.now() : undefined };
      });
    case "UPDATE":
      return state.map((t) => (t.id === action.payload.id ? action.payload : t));
    case "REORDER":
      return action.payload;
    case "CLEAR_COMPLETED":
      return state.filter((t) => !t.done);
    default:
      return state;
  }
};

const getPriorityClass = (value: Priority): string => {
  if (value === "High") return "priority-high";
  if (value === "Medium") return "priority-medium";
  return "priority-low";
};

const normalizeTodo = (raw: Partial<Todo> & { id?: number }): Todo => {
  const normalizedAttachments = dedupeTodoAttachments([
    ...readTodoAttachments(raw.attachments, "attachment"),
    ...readTodoAttachments(raw.images, "image"),
    ...readTodoAttachments(raw.image, "image"),
  ]);
  const normalizedImages = normalizedAttachments.filter((attachment) => attachment.isImage).map((attachment) => attachment.url);

  return {
    id: raw.id ?? Date.now() + Math.random(),
    title: raw.title ?? "Untitled Task",
    description: raw.description ?? "",
    category: raw.category ?? "General",
    assignee: raw.assignee ?? "",
    project: raw.project ?? "",
    department: raw.department ?? "",
    clientName: raw.clientName ?? "",
    estimatedHours: raw.estimatedHours ?? "",
    location: raw.location ?? "",
    statusNote: raw.statusNote ?? "",
    lane:
      typeof raw.dueAt === "string" && raw.dueAt.trim().length > 0
        ? getLaneFromDate(raw.dueAt)
        : normalizeLane(raw.lane, getLaneFromDate(raw.createdAt ?? Date.now())),
    priority: raw.priority ?? "Medium",
    done: Boolean(raw.done),
    createdAt: raw.createdAt ?? Date.now(),
    updatedAt: raw.updatedAt ?? raw.completedAt ?? raw.createdAt ?? Date.now(),
    completedAt: raw.completedAt,
    dueAt: raw.dueAt,
    checkpoints: Array.isArray(raw.checkpoints) ? raw.checkpoints.filter(Boolean) : [],
    tags: Array.isArray(raw.tags) ? raw.tags.filter(Boolean) : [],
    comments: Array.isArray(raw.comments)
      ? raw.comments
          .map((comment) => normalizeTodoComment(comment, raw.assignee ?? "Workspace"))
          .filter((comment) => comment.text.length > 0)
      : [],
    attachments: normalizedAttachments,
    images: normalizedImages,
    image: normalizedImages[0] ?? undefined,
  };
};

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;

const normalizeWorkspaceText = (value: string): string => value.trim().replace(/\s+/g, " ");

const toSafeString = (value: unknown): string => (typeof value === "string" ? value : "");

const sanitizeWorkspaceProfile = (input: Partial<WorkspaceProfileData>): WorkspaceProfileData => {
  const next = { ...defaultWorkspaceProfile, ...input };

  return {
    name: normalizeWorkspaceText(toSafeString(next.name)) || defaultWorkspaceProfile.name,
    companyName: normalizeWorkspaceText(toSafeString(next.companyName)) || defaultWorkspaceProfile.companyName,
    jobTitle: normalizeWorkspaceText(toSafeString(next.jobTitle)),
    email: toSafeString(next.email).trim().toLowerCase(),
    phone: toSafeString(next.phone).trim(),
    website: toSafeString(next.website).trim(),
    location: normalizeWorkspaceText(toSafeString(next.location)),
    department: normalizeWorkspaceText(toSafeString(next.department)),
    employeeId: toSafeString(next.employeeId).trim(),
    bio: toSafeString(next.bio).trim() || defaultWorkspaceProfile.bio,
    avatar: toSafeString(next.avatar),
  };
};

const sanitizeWorkspaceSettings = (input: Partial<WorkspaceSettingsState>): WorkspaceSettingsState =>
  ({
    ...defaultWorkspaceSettings,
    ...input,
  }) as WorkspaceSettingsState;

const readWorkspaceProfile = (): WorkspaceProfileData => {
  const raw = readScopedStorageItem("app-profile");
  if (!raw) return defaultWorkspaceProfile;

  try {
    return sanitizeWorkspaceProfile(JSON.parse(raw) as Partial<WorkspaceProfileData>);
  } catch {
    return defaultWorkspaceProfile;
  }
};

const readWorkspaceSettings = (): WorkspaceSettingsState => {
  const raw = readScopedStorageItem("app-settings");
  if (!raw) return defaultWorkspaceSettings;

  try {
    return sanitizeWorkspaceSettings(JSON.parse(raw) as Partial<WorkspaceSettingsState>);
  } catch {
    return defaultWorkspaceSettings;
  }
};

const readSidebarCollapsed = (): boolean => {
  try {
    return readScopedStorageItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
};

const applyWorkspaceVisualSettings = (settings: WorkspaceSettingsState): void => {
  const prefersDark =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolvedTheme = settings.systemThemeSync ? (prefersDark ? "dark" : "light") : settings.theme;

  document.documentElement.setAttribute("data-theme", resolvedTheme === "dark" ? "dark" : "light");

  const classes: Array<[string, boolean]> = [
    ["compact-mode", settings.compactMode],
    ["reduced-motion", settings.reducedMotion],
    ["high-contrast", settings.highContrast],
    ["dense-inputs", settings.denseInputs],
    ["focus-mode", settings.focusMode],
  ];

  classes.forEach(([className, enabled]) => {
    if (enabled) document.body.classList.add(className);
    else document.body.classList.remove(className);
  });
};

const readSidebarProfile = (): SidebarProfile => {
  const profile = readWorkspaceProfile();
  return {
    name: profile.name,
    avatar: profile.avatar,
  };
};

const getProfileInitial = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return "U";
  return trimmed.charAt(0).toUpperCase();
};

const getAvatarInitials = (name: string): string => {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
};

const readAuthToken = (): string | null => {
  const savedAuthToken = readSavedAuth().token;
  if (savedAuthToken) return savedAuthToken;

  const authCandidates = [localStorage.getItem("token"), localStorage.getItem("access_token"), localStorage.getItem("accessToken")];

  for (const raw of authCandidates) {
    if (typeof raw === "string" && raw.trim().length > 0) {
      return raw.trim();
    }
  }

  return null;
};

const readAuthConfig = () => {
  const authToken = readAuthToken();
  return authToken
    ? {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    : undefined;
};

const parseTimestamp = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
};

const normalizeTextValue = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const getFirstTextValue = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    const normalized = normalizeTextValue(value);
    if (normalized) return normalized;
  }
  return undefined;
};

const parseMaybeJson = (value: string): unknown => {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const dedupeStrings = (values: string[]): string[] =>
  Array.from(new Set(values.map((value) => value.trim()).filter((value) => value.length > 0)));

const dedupeTextList = (values: string[]): string[] => dedupeStrings(values);

const splitInputList = (value: string): string[] => dedupeStrings(value.split(/[\n,]+/));

const rewriteLaravelStoragePath = (value: string): string => {
  let normalized = value.trim().replace(/\\/g, "/");
  if (!normalized) return "";

  normalized = normalized.replace(/\/storage\/app\/public\//i, "/storage/");
  normalized = normalized.replace(/^storage\/app\/public\//i, "storage/");
  normalized = normalized.replace(/^app\/public\//i, "storage/");
  normalized = normalized.replace(/^public\/storage\//i, "storage/");

  return normalized;
};

const normalizeImageSource = (value: string): string => {
  const trimmed = rewriteLaravelStoragePath(value);
  if (!trimmed) return "";

  const normalized = trimmed.toLowerCase();
  if (normalized.startsWith("data:image/") || normalized.startsWith("blob:")) return trimmed;
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("//")) {
    return `${typeof window !== "undefined" ? window.location.protocol : "https:"}${trimmed}`;
  }
  if (!trimmed.includes("/") && /\.[a-z0-9]{2,8}(\?|#|$)/i.test(trimmed)) {
    try {
      return new URL(`storage/${trimmed.replace(/^\/+/, "")}`, `${API_BASE_URL}/`).toString();
    } catch {
      return trimmed;
    }
  }

  try {
    return new URL(trimmed, `${API_BASE_URL}/`).toString();
  } catch {
    return trimmed;
  }
};

const looksLikeImageSource = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (/\.(pdf|docx?|xlsx?|csv|txt|zip)(\?|#|$)/i.test(normalized)) return false;
  if (normalized.startsWith("data:image/") || normalized.startsWith("blob:")) return true;
  if (/\.(avif|bmp|gif|heic|jpe?g|png|svg|webp)(\?|#|$)/i.test(normalized)) return true;
  if (
    normalized.includes("/uploads/")
    || normalized.includes("/storage/")
    || normalized.includes("/images/")
    || normalized.includes("/files/")
    || normalized.startsWith("uploads/")
    || normalized.startsWith("storage/")
    || normalized.startsWith("images/")
    || normalized.startsWith("files/")
  ) {
    return true;
  }
  return (
    normalized.startsWith("http://")
    || normalized.startsWith("https://")
    || normalized.startsWith("/")
    || normalized.startsWith("./")
    || normalized.startsWith("../")
  );
};

const readImageSources = (value: unknown, visited = new Set<unknown>()): string[] => {
  if (value == null) return [];
  if (visited.has(value)) return [];
  visited.add(value);

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    const parsed = parseMaybeJson(trimmed);
    if (parsed !== value) {
      return readImageSources(parsed, visited);
    }

    return looksLikeImageSource(trimmed) ? [normalizeImageSource(trimmed)] : [];
  }

  if (Array.isArray(value)) {
    return dedupeStrings(value.flatMap((entry) => readImageSources(entry, visited)));
  }

  const record = asRecord(value);
  if (!record) return [];

  return dedupeStrings([
    ...readImageSources(record.url, visited),
    ...readImageSources(record.src, visited),
    ...readImageSources(record.path, visited),
    ...readImageSources(record.dataUrl, visited),
    ...readImageSources(record.data_url, visited),
    ...readImageSources(record.image, visited),
    ...readImageSources(record.image_url, visited),
    ...readImageSources(record.imageUrl, visited),
    ...readImageSources(record.image_path, visited),
    ...readImageSources(record.imagePath, visited),
    ...readImageSources(record.attachment, visited),
    ...readImageSources(record.attachment_url, visited),
    ...readImageSources(record.attachmentUrl, visited),
    ...readImageSources(record.attachment_path, visited),
    ...readImageSources(record.attachmentPath, visited),
    ...readImageSources(record.file, visited),
    ...readImageSources(record.file_url, visited),
    ...readImageSources(record.fileUrl, visited),
    ...readImageSources(record.file_path, visited),
    ...readImageSources(record.filePath, visited),
    ...readImageSources(record.preview, visited),
    ...readImageSources(record.preview_url, visited),
    ...readImageSources(record.previewUrl, visited),
    ...readImageSources(record.photo_url, visited),
    ...readImageSources(record.photoUrl, visited),
    ...readImageSources(record.storage_path, visited),
    ...readImageSources(record.storagePath, visited),
    ...readImageSources(record.thumbnail, visited),
    ...readImageSources(record.thumbnail_url, visited),
    ...readImageSources(record.thumbnailUrl, visited),
    ...readImageSources(record.thumbnail_path, visited),
    ...readImageSources(record.thumbnailPath, visited),
  ]);
};

const readTextList = (value: unknown, visited = new Set<unknown>()): string[] => {
  if (value == null) return [];
  if (visited.has(value)) return [];
  visited.add(value);

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    const parsed = parseMaybeJson(trimmed);
    if (parsed !== value) {
      return readTextList(parsed, visited);
    }

    if (trimmed.includes(",")) {
      return dedupeStrings(trimmed.split(","));
    }

    return [trimmed];
  }

  if (Array.isArray(value)) {
    return dedupeStrings(value.flatMap((entry) => readTextList(entry, visited)));
  }

  const record = asRecord(value);
  if (!record) return [];

  return dedupeStrings([
    ...readTextList(record.label, visited),
    ...readTextList(record.name, visited),
    ...readTextList(record.title, visited),
    ...readTextList(record.value, visited),
  ]);
};

const normalizeTodoComment = (
  raw: Partial<TodoComment> & { id?: string },
  fallbackAuthor = "Workspace"
): TodoComment => {
  const createdAt = parseTimestamp(raw.createdAt, Date.now());
  const authorEmail = toSafeString(raw.authorEmail).trim().toLowerCase();
  const authorAvatar = normalizeImageSource(toSafeString(raw.authorAvatar));
  return {
    id:
      typeof raw.id === "string" && raw.id.trim().length > 0
        ? raw.id.trim()
        : `${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    authorName: normalizeWorkspaceText(toSafeString(raw.authorName)) || fallbackAuthor,
    authorEmail: authorEmail || undefined,
    authorAvatar: authorAvatar || undefined,
    text: toSafeString(raw.text).trim(),
    createdAt,
  };
};

const readTodoComments = (value: unknown, fallbackAuthor = "Workspace", visited = new Set<unknown>()): TodoComment[] => {
  if (value == null) return [];
  if (visited.has(value)) return [];
  visited.add(value);

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];

    const parsed = parseMaybeJson(trimmed);
    if (parsed !== value) {
      return readTodoComments(parsed, fallbackAuthor, visited);
    }

    return [normalizeTodoComment({ text: trimmed, authorName: fallbackAuthor }, fallbackAuthor)];
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => readTodoComments(entry, fallbackAuthor, visited))
      .filter((comment) => comment.text.length > 0);
  }

  const record = asRecord(value);
  if (!record) return [];
  const userRecord = asRecord(record.user) ?? asRecord(record.author_data) ?? asRecord(record.authorData);

  const text = getFirstTextValue(
    record.text,
    record.comment,
    record.body,
    record.message,
    record.note,
    record.content,
    record.value,
    record.label,
    record.title
  );
  if (!text) return [];

  return [
    normalizeTodoComment(
      {
        id: getFirstTextValue(record.id, record.comment_id, record.commentId),
        authorName:
          getFirstTextValue(
            record.authorName,
            record.author_name,
            record.author,
            record.user_name,
            record.userName,
            record.created_by,
            record.createdBy
          ) ?? fallbackAuthor,
        authorEmail:
          getFirstTextValue(
            record.author_email,
            record.authorEmail,
            record.email,
            record.user_email,
            record.userEmail,
            userRecord?.email
          ) ?? undefined,
        authorAvatar:
          getFirstTextValue(
            record.author_avatar,
            record.authorAvatar,
            record.avatar,
            record.avatar_url,
            record.avatarUrl,
            record.photo,
            record.photo_url,
            record.photoUrl,
            userRecord?.avatar,
            userRecord?.avatar_url,
            userRecord?.avatarUrl,
            userRecord?.photo,
            userRecord?.photo_url,
            userRecord?.photoUrl
          ) ?? undefined,
        text,
        createdAt: parseTimestamp(
          record.created_at ?? record.createdAt ?? record.timestamp ?? record.date,
          Date.now()
        ),
      },
      fallbackAuthor
    ),
  ];
};

const looksLikeAttachmentSource = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith("data:") || normalized.startsWith("blob:")) return true;
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) return true;
  if (normalized.startsWith("/") || normalized.startsWith("./") || normalized.startsWith("../")) return true;
  if (/^[^/\\]+\.[a-z0-9]{2,8}(\?|#|$)/i.test(normalized)) return true;
  return /[\\/].+\.[a-z0-9]{2,8}(\?|#|$)/i.test(normalized);
};

const isImageAttachmentSource = (url: string, mimeType = ""): boolean => {
  if (mimeType.toLowerCase().startsWith("image/")) return true;
  return looksLikeImageSource(url);
};

const getAttachmentNameFromSource = (url: string, fallbackName: string): string => {
  if (url.startsWith("data:")) {
    const mimeSegment = url.slice(5, url.indexOf(";") > -1 ? url.indexOf(";") : undefined);
    const extension = mimeSegment.split("/")[1] || "file";
    return `${fallbackName}.${extension}`;
  }

  try {
    const parsed = new URL(url, "https://workspace.local");
    const candidate = decodeURIComponent(parsed.pathname.split("/").filter(Boolean).pop() || "");
    if (candidate) return candidate;
  } catch {
    // Fall back to the provided name when the source is not a valid URL.
  }

  return fallbackName;
};

const getAttachmentMimeType = (url: string, explicitType = ""): string => {
  const normalizedType = explicitType.trim().toLowerCase();
  if (normalizedType) return normalizedType;

  if (url.startsWith("data:")) {
    const match = url.match(/^data:([^;,]+)/i);
    if (match?.[1]) return match[1].toLowerCase();
  }

  if (looksLikeImageSource(url)) return "image/*";
  if (/\.pdf(\?|#|$)/i.test(url)) return "application/pdf";
  if (/\.(docx?|rtf)(\?|#|$)/i.test(url)) return "application/msword";
  if (/\.(xlsx?|csv)(\?|#|$)/i.test(url)) return "application/vnd.ms-excel";
  if (/\.(pptx?)(\?|#|$)/i.test(url)) return "application/vnd.ms-powerpoint";
  if (/\.(zip|rar|7z)(\?|#|$)/i.test(url)) return "application/zip";
  if (/\.(txt|md)(\?|#|$)/i.test(url)) return "text/plain";
  return "application/octet-stream";
};

const normalizeAttachmentSize = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  if (typeof value === "string") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  }
  return undefined;
};

const normalizeTodoAttachment = (
  raw: unknown,
  fallbackName = "attachment",
  fallbackIndex = 0,
  visited = new Set<unknown>()
): TodoAttachment | null => {
  if (raw == null) return null;
  if (visited.has(raw)) return null;
  visited.add(raw);

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    const parsed = parseMaybeJson(trimmed);
    if (parsed !== raw) {
      return normalizeTodoAttachment(parsed, fallbackName, fallbackIndex, visited);
    }

    if (!looksLikeAttachmentSource(trimmed) && !looksLikeImageSource(trimmed)) return null;
    const type = getAttachmentMimeType(trimmed);
    const name = getAttachmentNameFromSource(trimmed, `${fallbackName}-${fallbackIndex + 1}`);
    return {
      id: `${name}-${fallbackIndex}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      url: normalizeImageSource(trimmed),
      type,
      isImage: isImageAttachmentSource(trimmed, type),
    };
  }

  if (Array.isArray(raw)) {
    return null;
  }

  const record = asRecord(raw);
  if (!record) return null;

  const source =
    getFirstTextValue(
      record.url,
      record.src,
      record.path,
      record.dataUrl,
      record.data_url,
      record.file,
      record.file_url,
      record.fileUrl,
      record.file_path,
      record.filePath,
      record.image,
      record.image_url,
      record.imageUrl,
      record.preview,
      record.preview_url,
      record.previewUrl,
      record.thumbnail,
      record.thumbnail_url,
      record.thumbnailUrl,
      record.attachment,
      record.attachment_url,
      record.attachmentUrl,
      record.storage_path,
      record.storagePath
    ) ?? "";

  if (!source || (!looksLikeAttachmentSource(source) && !looksLikeImageSource(source))) {
    return null;
  }

  const explicitType =
    getFirstTextValue(
      record.type,
      record.mime_type,
      record.mimeType,
      record.content_type,
      record.contentType
    ) ?? "";
  const type = getAttachmentMimeType(source, explicitType);
  const name =
    getFirstTextValue(
      record.name,
      record.file_name,
      record.fileName,
      record.title,
      record.label
    ) ?? getAttachmentNameFromSource(source, `${fallbackName}-${fallbackIndex + 1}`);

  return {
    id:
      getFirstTextValue(record.id, record.attachment_id, record.attachmentId, record.file_id, record.fileId)
      ?? `${name}-${fallbackIndex}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    url: normalizeImageSource(source),
    type,
    size: normalizeAttachmentSize(record.size ?? record.file_size ?? record.fileSize ?? record.bytes),
    isImage: isImageAttachmentSource(source, type),
  };
};

const isTemporaryAttachmentUrl = (url: string): boolean => {
  const normalized = url.trim().toLowerCase();
  return normalized.startsWith("data:") || normalized.startsWith("blob:");
};

const getTodoAttachmentSignature = (attachment: TodoAttachment): string => {
  const normalizedName = attachment.name.trim().toLowerCase();
  const normalizedType = attachment.type.trim().toLowerCase();
  const normalizedSize = Number.isFinite(attachment.size) ? String(attachment.size) : "";

  if (!normalizedName && !normalizedType && !normalizedSize) return "";

  return [
    normalizedName,
    normalizedType,
    normalizedSize,
    attachment.isImage ? "image" : "file",
  ].join("::");
};

const choosePreferredAttachment = (current: TodoAttachment, candidate: TodoAttachment): TodoAttachment => {
  const currentUrl = normalizeImageSource(current.url).trim();
  const candidateUrl = normalizeImageSource(candidate.url).trim();
  const currentIsTemporary = isTemporaryAttachmentUrl(currentUrl);
  const candidateIsTemporary = isTemporaryAttachmentUrl(candidateUrl);

  if (currentIsTemporary !== candidateIsTemporary) {
    return candidateIsTemporary ? current : candidate;
  }

  const currentLooksStored = /\/(storage|uploads|files)\//i.test(currentUrl);
  const candidateLooksStored = /\/(storage|uploads|files)\//i.test(candidateUrl);
  if (currentLooksStored !== candidateLooksStored) {
    return candidateLooksStored ? candidate : current;
  }

  const currentHasUsefulMeta = Number.isFinite(current.size) || current.name.trim().length > 0;
  const candidateHasUsefulMeta = Number.isFinite(candidate.size) || candidate.name.trim().length > 0;
  if (currentHasUsefulMeta !== candidateHasUsefulMeta) {
    return candidateHasUsefulMeta ? candidate : current;
  }

  return candidateUrl.length > currentUrl.length ? candidate : current;
};

const dedupeTodoAttachments = (items: TodoAttachment[]): TodoAttachment[] => {
  const attachmentMap = new Map<string, TodoAttachment>();
  const signatureMap = new Map<string, string>();

  for (const item of items) {
    if (!item?.url) continue;

    const normalizedItem = {
      ...item,
      url: normalizeImageSource(item.url).trim(),
    };

    if (!normalizedItem.url) continue;

    const urlKey = normalizedItem.url.toLowerCase();
    const signatureKey = getTodoAttachmentSignature(normalizedItem);
    const existingByUrl = attachmentMap.get(urlKey);

    if (existingByUrl) {
      attachmentMap.set(urlKey, choosePreferredAttachment(existingByUrl, normalizedItem));
      if (signatureKey) {
        signatureMap.set(signatureKey, urlKey);
      }
      continue;
    }

    const existingSignatureUrlKey = signatureKey ? signatureMap.get(signatureKey) : undefined;
    const existingBySignature = existingSignatureUrlKey ? attachmentMap.get(existingSignatureUrlKey) : undefined;

    if (existingBySignature && existingSignatureUrlKey) {
      const preferredAttachment = choosePreferredAttachment(existingBySignature, normalizedItem);
      const preferredUrlKey = normalizeImageSource(preferredAttachment.url).trim().toLowerCase();

      attachmentMap.delete(existingSignatureUrlKey);
      attachmentMap.set(preferredUrlKey, preferredAttachment);
      signatureMap.set(signatureKey, preferredUrlKey);
      continue;
    }

    attachmentMap.set(urlKey, normalizedItem);
    if (signatureKey) {
      signatureMap.set(signatureKey, urlKey);
    }
  }

  return Array.from(attachmentMap.values());
};

const getTodoAttachmentKey = (attachment: Pick<TodoAttachment, "url">): string =>
  normalizeImageSource(attachment.url).trim().toLowerCase();

const readTodoAttachments = (
  value: unknown,
  fallbackName = "attachment",
  visited = new Set<unknown>()
): TodoAttachment[] => {
  if (value == null) return [];
  if (visited.has(value)) return [];
  visited.add(value);

  if (typeof value === "string") {
    const single = normalizeTodoAttachment(value, fallbackName, 0, visited);
    return single ? [single] : [];
  }

  if (Array.isArray(value)) {
    return dedupeTodoAttachments(
      value
        .map((entry, index) => normalizeTodoAttachment(entry, fallbackName, index, visited))
        .filter((entry): entry is TodoAttachment => Boolean(entry))
    );
  }

  const single = normalizeTodoAttachment(value, fallbackName, 0, visited);
  return single ? [single] : [];
};

const readTodoAttachmentList = (todo: Todo): TodoAttachment[] =>
  dedupeTodoAttachments([
    ...readTodoAttachments(todo.attachments, "attachment"),
    ...readTodoAttachments(todo.images, "image"),
    ...readTodoAttachments(todo.image, "image"),
  ]);

const readPersistableTodoAttachments = (todo: Todo): TodoAttachment[] =>
  readTodoAttachmentList(todo).filter((attachment) => !isTemporaryAttachmentUrl(attachment.url));

const readPersistableTodoImages = (todo: Todo): string[] =>
  readPersistableTodoAttachments(todo)
    .filter((attachment) => attachment.isImage)
    .map((attachment) => attachment.url);

const dedupeTodoComments = (items: TodoComment[]): TodoComment[] => {
  const commentMap = new Map<string, TodoComment>();

  for (const item of items) {
    if (!item?.text?.trim()) continue;
    const dedupeKey = item.id?.trim()
      ? `id:${item.id.trim()}`
      : `fallback:${item.authorName.trim().toLowerCase()}::${item.text.trim().toLowerCase()}::${item.createdAt}`;
    const existing = commentMap.get(dedupeKey);
    if (!existing) {
      commentMap.set(dedupeKey, item);
      continue;
    }

    const existingScore = Number(Boolean(existing.authorAvatar)) + Number(Boolean(existing.authorEmail));
    const nextScore = Number(Boolean(item.authorAvatar)) + Number(Boolean(item.authorEmail));
    if (nextScore > existingScore) {
      commentMap.set(dedupeKey, item);
    }
  }

  return Array.from(commentMap.values()).sort((a, b) => b.createdAt - a.createdAt);
};

const mergeTodoComments = (remoteComments: TodoComment[], localComments: TodoComment[], preferLocal = false): TodoComment[] =>
  dedupeTodoComments(preferLocal ? [...localComments, ...remoteComments] : [...remoteComments, ...localComments]);

const readTodoImages = (todo: Todo): string[] =>
  dedupeStrings(
    readTodoAttachmentList(todo)
      .filter((attachment) => attachment.isImage)
      .map((attachment) => attachment.url)
  );

const splitAssigneeNames = (value: string | undefined): string[] => {
  const normalized = normalizeWorkspaceText(toSafeString(value));
  if (!normalized) return [];

  return normalized
    .split(/\s*(?:,|&|\/|\band\b)\s*/i)
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const parsePriority = (value: unknown, fallback: Priority): Priority => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "low" || normalized === "1") return "Low";
    if (normalized === "medium" || normalized === "med" || normalized === "2") return "Medium";
    if (normalized === "high" || normalized === "3") return "High";
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (value >= 3) return "High";
    if (value >= 2) return "Medium";
    if (value >= 1) return "Low";
  }

  return fallback;
};

const parseDoneState = (doneValue: unknown, statusValue: unknown, fallback: boolean): boolean => {
  if (typeof doneValue === "boolean") return doneValue;
  if (typeof doneValue === "number") return doneValue === 1;
  if (typeof doneValue === "string") {
    const normalized = doneValue.trim().toLowerCase();
    return normalized === "1" || normalized === "true" || normalized === "completed" || normalized === "done";
  }
  if (typeof statusValue === "string") {
    const normalized = statusValue.trim().toLowerCase();
    if (normalized === "completed" || normalized === "done") return true;
    if (normalized === "pending") return false;
  }
  return fallback;
};

const parseTaskFromResponse = (payload: unknown, fallback: Todo): Todo => {
  const root = asRecord(payload);
  if (!root) return fallback;

  const taskRecord =
    asRecord(root.data)
    ?? asRecord(root.task)
    ?? asRecord(root.item)
    ?? asRecord(root.result)
    ?? root;

  const idValue = taskRecord.id;
  let parsedId = fallback.id;
  if (typeof idValue === "number" && Number.isFinite(idValue)) parsedId = idValue;
  if (typeof idValue === "string" && idValue.trim().length > 0) {
    const numericId = Number(idValue);
    if (Number.isFinite(numericId)) parsedId = numericId;
  }

  const titleValue = getFirstTextValue(taskRecord.title, taskRecord.name, taskRecord.task_name, taskRecord.taskTitle);
  const descriptionValue = getFirstTextValue(
    taskRecord.description,
    taskRecord.details,
    taskRecord.task_description,
    taskRecord.taskDescription,
    taskRecord.content
  );
  const categoryValue = getFirstTextValue(taskRecord.category, taskRecord.type, taskRecord.group);
  const assigneeValue = getFirstTextValue(
    taskRecord.assignee,
    taskRecord.assigned_to,
    taskRecord.assignedTo,
    taskRecord.owner,
    taskRecord.user_name
  );
  const laneValue = getFirstTextValue(taskRecord.lane, taskRecord.day, taskRecord.column);

  const createdAt = parseTimestamp(
    taskRecord.created_at ?? taskRecord.createdAt ?? taskRecord.created ?? taskRecord.date_created,
    fallback.createdAt
  );
  const updatedAt = parseTimestamp(
    taskRecord.updated_at
    ?? taskRecord.updatedAt
    ?? taskRecord.modified_at
    ?? taskRecord.modifiedAt
    ?? taskRecord.last_updated
    ?? taskRecord.lastUpdated,
    fallback.updatedAt ?? fallback.completedAt ?? createdAt
  );
  const done = parseDoneState(
    taskRecord.done
    ?? taskRecord.completed
    ?? taskRecord.is_done
    ?? taskRecord.isDone
    ?? taskRecord.is_completed
    ?? taskRecord.isCompleted,
    taskRecord.status,
    fallback.done
  );
  const completedAt = done
    ? parseTimestamp(
        taskRecord.completed_at ?? taskRecord.completedAt ?? taskRecord.finished_at ?? taskRecord.finishedAt,
        fallback.completedAt ?? updatedAt ?? createdAt
      )
    : undefined;

  const dueAtValue = taskRecord.due_at ?? taskRecord.dueAt ?? taskRecord.due_date ?? taskRecord.deadline;
  const dueAt =
    typeof dueAtValue === "string" && dueAtValue.trim().length > 0 ? dueAtValue : fallback.dueAt;
  const laneFromDate = getLaneFromDate(dueAt ?? createdAt);

  const estimatedValue =
    taskRecord.estimated_duration
    ?? taskRecord.estimatedDuration
    ?? taskRecord.estimated_hours
    ?? taskRecord.estimatedHours
    ?? taskRecord.duration;
  const estimatedHours =
    typeof estimatedValue === "string" && estimatedValue.trim().length > 0
      ? estimatedValue
      : typeof estimatedValue === "number" && Number.isFinite(estimatedValue)
        ? `${estimatedValue}`
        : fallback.estimatedHours;

  const parsedAttachments = dedupeTodoAttachments([
    ...readTodoAttachments(taskRecord.attachments, "attachment"),
    ...readTodoAttachments(taskRecord.attachment, "attachment"),
    ...readTodoAttachments(taskRecord.files, "file"),
    ...readTodoAttachments(taskRecord.file, "file"),
    ...readTodoAttachments(taskRecord.media, "media"),
    ...readTodoAttachments(taskRecord.documents, "document"),
    ...readTodoAttachments(taskRecord.images, "image"),
    ...readTodoAttachments(taskRecord.image, "image"),
    ...readTodoAttachments(taskRecord.image_url, "image"),
    ...readTodoAttachments(taskRecord.imageUrl, "image"),
    ...readTodoAttachments(taskRecord.image_path, "image"),
    ...readTodoAttachments(taskRecord.imagePath, "image"),
    ...readTodoAttachments(taskRecord.attachment_url, "attachment"),
    ...readTodoAttachments(taskRecord.attachmentUrl, "attachment"),
    ...readTodoAttachments(taskRecord.attachment_path, "attachment"),
    ...readTodoAttachments(taskRecord.attachmentPath, "attachment"),
    ...readTodoAttachments(taskRecord.file_url, "file"),
    ...readTodoAttachments(taskRecord.fileUrl, "file"),
    ...readTodoAttachments(taskRecord.file_path, "file"),
    ...readTodoAttachments(taskRecord.filePath, "file"),
    ...readTodoAttachments(taskRecord.photo, "photo"),
    ...readTodoAttachments(taskRecord.photo_url, "photo"),
    ...readTodoAttachments(taskRecord.photoUrl, "photo"),
    ...readTodoAttachments(taskRecord.storage_path, "attachment"),
    ...readTodoAttachments(taskRecord.storagePath, "attachment"),
    ...readTodoAttachments(taskRecord.thumbnail, "image"),
    ...readTodoAttachments(taskRecord.thumbnail_path, "image"),
    ...readTodoAttachments(taskRecord.thumbnailPath, "image"),
    ...readTodoAttachments(fallback.attachments, "attachment"),
    ...readTodoAttachments(fallback.images, "image"),
    ...readTodoAttachments(fallback.image, "image"),
  ]);
  const parsedImages = parsedAttachments.filter((attachment) => attachment.isImage).map((attachment) => attachment.url);
  const parsedImage = parsedImages[0];

  return {
    ...fallback,
    id: parsedId,
    title: titleValue ?? fallback.title,
    description: descriptionValue ?? fallback.description,
    category: categoryValue ?? fallback.category,
    assignee: assigneeValue ?? fallback.assignee,
    project: getFirstTextValue(taskRecord.project, taskRecord.project_name, taskRecord.projectName) ?? fallback.project,
    department: getFirstTextValue(taskRecord.department, taskRecord.team, taskRecord.division) ?? fallback.department,
    clientName: getFirstTextValue(taskRecord.client_name, taskRecord.clientName, taskRecord.client) ?? fallback.clientName,
    location: getFirstTextValue(taskRecord.location, taskRecord.place) ?? fallback.location,
    statusNote: getFirstTextValue(taskRecord.status_note, taskRecord.statusNote, taskRecord.note, taskRecord.notes) ?? fallback.statusNote,
    lane:
      typeof dueAt === "string" && dueAt.trim().length > 0
        ? laneFromDate
        : normalizeLane(laneValue, normalizeLane(fallback.lane, laneFromDate)),
    priority: parsePriority(taskRecord.priority, fallback.priority),
    done,
    createdAt,
    updatedAt,
    completedAt,
    dueAt,
    estimatedHours,
    checkpoints:
      readTextList(taskRecord.checkpoints).length > 0
        ? readTextList(taskRecord.checkpoints)
        : fallback.checkpoints,
    tags: readTextList(taskRecord.tags).length > 0 ? readTextList(taskRecord.tags) : fallback.tags,
    comments:
      readTodoComments(
        taskRecord.comments ?? taskRecord.comment_thread ?? taskRecord.commentThread ?? taskRecord.comment_history,
        assigneeValue ?? fallback.assignee ?? "Workspace"
      ).length > 0
        ? readTodoComments(
            taskRecord.comments ?? taskRecord.comment_thread ?? taskRecord.commentThread ?? taskRecord.comment_history,
            assigneeValue ?? fallback.assignee ?? "Workspace"
          )
        : fallback.comments,
    attachments: parsedAttachments,
    images: parsedImages,
    image: parsedImage,
  };
};

const parseTaskListFromResponse = (payload: unknown): Todo[] | null => {
  if (Array.isArray(payload)) {
    return payload
      .map((entry, index) => {
        const fallback = normalizeTodo({
          id: Date.now() + index,
          lane: "Monday",
        });
        return parseTaskFromResponse(entry, fallback);
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  const candidateKeys = ["data", "tasks", "items", "results", "rows", "records"] as const;
  const pending: unknown[] = [payload];
  const visited = new Set<unknown>();
  const discoveredArrays: unknown[][] = [];

  while (pending.length > 0) {
    const current = pending.shift();
    if (current == null || typeof current !== "object") continue;
    if (visited.has(current)) continue;
    visited.add(current);

    if (Array.isArray(current)) {
      discoveredArrays.push(current);
      continue;
    }

    const record = asRecord(current);
    if (!record) continue;

    for (const key of candidateKeys) {
      const candidate = record[key];
      if (Array.isArray(candidate)) {
        discoveredArrays.unshift(candidate);
      } else if (candidate && typeof candidate === "object") {
        pending.push(candidate);
      }
    }

    Object.values(record).forEach((value) => {
      if (value && typeof value === "object") {
        pending.push(value);
      }
    });
  }

  const looksLikeTaskEntry = (value: unknown): boolean => {
    const record = asRecord(value);
    if (!record) return false;

    return [
      record.id,
      record.title,
      record.name,
      record.task_name,
      record.description,
      record.category,
      record.priority,
      record.task,
    ].some((entry) => entry != null);
  };

  const taskRows =
    discoveredArrays.find((entries) => entries.length === 0 || entries.some((entry) => looksLikeTaskEntry(entry)))
    ?? null;

  if (!taskRows) return null;

  return taskRows
    .map((entry, index) => {
      const fallback = normalizeTodo({
        id: Date.now() + index,
        createdAt: 0,
        updatedAt: 0,
        lane: "Monday",
      });
      return parseTaskFromResponse(entry, fallback);
    })
    .sort((a, b) => b.createdAt - a.createdAt);
};

const getTaskThumbnailAlt = (title: string, index = 0): string =>
  `${title} attachment${index > 0 ? ` ${index + 1}` : ""}`;

const renderTaskImageGallery = (todo: Todo, variant: "list" | "board" | "calendar" = "list") => {
  const images = readTodoImages(todo);
  if (images.length === 0) return null;

  const extraCount = images.length > 4 ? images.length - 4 : 0;

  return (
    <div className={`todo-task-media todo-task-media--${variant}`}>
      <img
        className="todo-task-media-main"
        src={images[0]}
        alt={getTaskThumbnailAlt(todo.title)}
        loading="lazy"
        decoding="async"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
      {images.length > 1 && (
        <div className="todo-task-media-strip" aria-label={`${images.length} attachments`}>
          {images.slice(1, 4).map((src, index) => (
            <img
              key={`${todo.id}-attachment-${index + 1}`}
              className="todo-task-media-thumb"
              src={src}
              alt={getTaskThumbnailAlt(todo.title, index + 1)}
              loading="lazy"
              decoding="async"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ))}
          {extraCount > 0 && <span className="todo-task-media-more">+{extraCount}</span>}
        </div>
      )}
    </div>
  );
};

const hasTaskImages = (todo: Todo): boolean => readTodoImages(todo).length > 0;

const parseEstimatedDurationParts = (
  value: string | undefined
): { estimatedHours: number | null; estimatedMinutes: number | null } => {
  const clean = (value ?? "").trim();
  if (!clean) {
    return { estimatedHours: null, estimatedMinutes: null };
  }

  const hourMatch = clean.match(/(\d+)\s*h/i);
  const minuteMatch = clean.match(/(\d+)\s*m/i);
  const numericValue = Number.parseInt(clean, 10);

  const estimatedHours = hourMatch
    ? Number.parseInt(hourMatch[1], 10)
    : Number.isFinite(numericValue) && !minuteMatch
      ? numericValue
      : null;
  const estimatedMinutes = minuteMatch ? Number.parseInt(minuteMatch[1], 10) : null;

  return {
    estimatedHours: Number.isFinite(estimatedHours ?? Number.NaN) ? Math.max(0, estimatedHours ?? 0) : null,
    estimatedMinutes: Number.isFinite(estimatedMinutes ?? Number.NaN) ? Math.max(0, Math.min(59, estimatedMinutes ?? 0)) : null,
  };
};

const composeEstimatedDurationValue = (
  estimatedHours: number | null | undefined,
  estimatedMinutes: number | null | undefined
): string | undefined => {
  const safeHours =
    typeof estimatedHours === "number" && Number.isFinite(estimatedHours) ? Math.max(0, Math.trunc(estimatedHours)) : 0;
  const safeMinutes =
    typeof estimatedMinutes === "number" && Number.isFinite(estimatedMinutes)
      ? Math.max(0, Math.min(59, Math.trunc(estimatedMinutes)))
      : 0;

  if (safeHours === 0 && safeMinutes === 0) return undefined;

  const parts = [safeHours > 0 ? `${safeHours}h` : "", safeMinutes > 0 ? `${safeMinutes}m` : ""].filter(Boolean);
  return parts.join(" ");
};

const getEstimatedDurationMs = (value: string | undefined): number | null => {
  const { estimatedHours, estimatedMinutes } = parseEstimatedDurationParts(value);
  const totalMinutes = (estimatedHours ?? 0) * 60 + (estimatedMinutes ?? 0);
  return totalMinutes > 0 ? totalMinutes * 60000 : null;
};

const formatCountdownClock = (remainingMs: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
};

const getTodoCountdown = (
  todo: Todo,
  referenceTime: number
): { label: string; tone: "running" | "expired" | "done"; icon: string } | null => {
  const estimatedDurationMs = getEstimatedDurationMs(todo.estimatedHours);
  if (estimatedDurationMs === null) return null;

  if (todo.done) {
    return {
      label: "Completed",
      tone: "done",
      icon: "bi-check2-circle",
    };
  }

  const remainingMs = Math.max(0, todo.createdAt + estimatedDurationMs - referenceTime);
  if (remainingMs === 0) {
    return {
      label: "00:00:00",
      tone: "expired",
      icon: "bi-alarm",
    };
  }

  return {
    label: formatCountdownClock(remainingMs),
    tone: "running",
    icon: "bi-stopwatch",
  };
};

const toApiCommentPayload = (comment: TodoComment) => {
  const isoCreatedAt = new Date(comment.createdAt).toISOString();
  return {
    id: comment.id,
    text: comment.text,
    author_name: comment.authorName,
    authorName: comment.authorName,
    author_email: comment.authorEmail ?? null,
    authorEmail: comment.authorEmail ?? null,
    author_avatar: comment.authorAvatar ?? null,
    authorAvatar: comment.authorAvatar ?? null,
    created_at: isoCreatedAt,
    createdAt: isoCreatedAt,
    timestamp: comment.createdAt,
  };
};

const buildTaskMultipartPayload = (
  todo: Todo,
  files: File[],
  fileFieldName: string,
  includeMethodOverride = false
) => {
  const normalizedTodo = normalizeTodo(todo);
  const formData = new FormData();
  const estimatedParts = parseEstimatedDurationParts(normalizedTodo.estimatedHours);

  formData.append("id", String(normalizedTodo.id));
  formData.append("task_id", String(normalizedTodo.id));
  formData.append("title", normalizedTodo.title);
  formData.append("description", normalizedTodo.description);
  formData.append("category", normalizedTodo.category);
  formData.append("priority", normalizedTodo.priority);
  formData.append("status", normalizedTodo.done ? "completed" : "pending");

  if (includeMethodOverride) {
    formData.append("_method", "PATCH");
  }

  if (normalizedTodo.assignee?.trim()) {
    formData.append("assignee", normalizedTodo.assignee.trim());
  }

  if (normalizedTodo.dueAt?.trim()) {
    formData.append("due_at", normalizedTodo.dueAt.trim());
    formData.append("due_date", getDayDateInput(normalizedTodo.dueAt));
  }

  if (normalizedTodo.estimatedHours?.trim()) {
    formData.append("estimated_duration", normalizedTodo.estimatedHours.trim());
  }

  if ((estimatedParts.estimatedHours ?? 0) > 0) {
    formData.append("estimated_hours", String(estimatedParts.estimatedHours));
  }

  if ((estimatedParts.estimatedMinutes ?? 0) > 0) {
    formData.append("estimated_minutes", String(estimatedParts.estimatedMinutes));
  }

  if (normalizedTodo.tags.length > 0) {
    normalizedTodo.tags.forEach((tag) => formData.append("tags[]", tag));
  }

  if (normalizedTodo.checkpoints.length > 0) {
    normalizedTodo.checkpoints.forEach((checkpoint) => formData.append("checkpoints[]", checkpoint));
  }

  files.forEach((file) => {
    formData.append(fileFieldName, file);
  });

  return formData;
};

const buildTaskMutationPayload = (todo: Todo) => {
  const normalizedTodo = normalizeTodo(todo);
  const normalizedAttachments = readPersistableTodoAttachments(normalizedTodo);
  const normalizedImages = readPersistableTodoImages(normalizedTodo);
  const estimatedParts = parseEstimatedDurationParts(normalizedTodo.estimatedHours);
  const completedAtIso = normalizedTodo.completedAt ? new Date(normalizedTodo.completedAt).toISOString() : null;
  const createdAtIso = new Date(normalizedTodo.createdAt).toISOString();
  const updatedAtIso = new Date(normalizedTodo.updatedAt ?? normalizedTodo.completedAt ?? normalizedTodo.createdAt).toISOString();

  return {
    id: normalizedTodo.id,
    task_id: normalizedTodo.id,
    title: normalizedTodo.title,
    description: normalizedTodo.description,
    category: normalizedTodo.category,
    assignee: normalizedTodo.assignee || null,
    project: normalizedTodo.project || null,
    department: normalizedTodo.department || null,
    client_name: normalizedTodo.clientName || null,
    clientName: normalizedTodo.clientName || null,
    location: normalizedTodo.location || null,
    status_note: normalizedTodo.statusNote || null,
    statusNote: normalizedTodo.statusNote || null,
    lane: resolveTodoLane(normalizedTodo),
    priority: normalizedTodo.priority,
    done: normalizedTodo.done,
    completed: normalizedTodo.done,
    completed_at: completedAtIso,
    completedAt: completedAtIso,
    created_at: createdAtIso,
    createdAt: createdAtIso,
    updated_at: updatedAtIso,
    updatedAt: updatedAtIso,
    due_at: normalizedTodo.dueAt ?? null,
    dueAt: normalizedTodo.dueAt ?? null,
    estimated_duration: normalizedTodo.estimatedHours || null,
    estimated_hours: estimatedParts.estimatedHours,
    estimated_minutes: estimatedParts.estimatedMinutes,
    checkpoints: normalizedTodo.checkpoints,
    tags: normalizedTodo.tags,
    comments: normalizedTodo.comments.map(toApiCommentPayload),
    attachments: normalizedAttachments.map((attachment) => ({
      id: attachment.id,
      name: attachment.name,
      url: attachment.url,
      type: attachment.type,
      size: attachment.size ?? null,
    })),
    images: normalizedImages,
    image: normalizedImages[0] ?? null,
  };
};

const getTodoStatusUpdatedAt = (todo: Todo): number =>
  todo.updatedAt ?? todo.completedAt ?? todo.createdAt;

const mergeTodoRecord = (remoteTodo: Todo, localTodo?: Todo): Todo => {
  if (!localTodo) return remoteTodo;

  const remoteAttachments = readTodoAttachmentList(remoteTodo);
  const localAttachments = readTodoAttachmentList(localTodo);
  const mergeableLocalAttachments =
    remoteAttachments.some((attachment) => !isTemporaryAttachmentUrl(attachment.url))
      ? localAttachments.filter((attachment) => !isTemporaryAttachmentUrl(attachment.url))
      : localAttachments;
  const remoteImages = readTodoImages(remoteTodo);
  const localImages = dedupeStrings(
    mergeableLocalAttachments.filter((attachment) => attachment.isImage).map((attachment) => attachment.url)
  );
  const remoteUpdatedAt = getTodoStatusUpdatedAt(remoteTodo);
  const localUpdatedAt = getTodoStatusUpdatedAt(localTodo);
  const localStatusIsNewer = localUpdatedAt > remoteUpdatedAt;
  const preferLocal = localStatusIsNewer || (
    localUpdatedAt === remoteUpdatedAt
    && (localTodo.comments.length > remoteTodo.comments.length || localAttachments.length > remoteAttachments.length)
  );

  return normalizeTodo({
    ...localTodo,
    ...remoteTodo,
    done: localStatusIsNewer ? localTodo.done : remoteTodo.done,
    completedAt: localStatusIsNewer ? localTodo.completedAt : remoteTodo.completedAt,
    updatedAt: Math.max(localUpdatedAt, remoteUpdatedAt),
    checkpoints: preferLocal
      ? dedupeTextList([...localTodo.checkpoints, ...remoteTodo.checkpoints])
      : dedupeTextList([...remoteTodo.checkpoints, ...localTodo.checkpoints]),
    tags: preferLocal
      ? dedupeTextList([...localTodo.tags, ...remoteTodo.tags])
      : dedupeTextList([...remoteTodo.tags, ...localTodo.tags]),
    comments: mergeTodoComments(remoteTodo.comments, localTodo.comments, preferLocal),
    attachments: preferLocal
      ? dedupeTodoAttachments([...mergeableLocalAttachments, ...remoteAttachments])
      : dedupeTodoAttachments([...remoteAttachments, ...mergeableLocalAttachments]),
    images: preferLocal
      ? dedupeStrings([...localImages, ...remoteImages])
      : dedupeStrings([...remoteImages, ...localImages]),
    image: remoteImages[0] ?? localImages[0] ?? remoteTodo.image ?? localTodo.image,
  });
};

const reconcileRemoteTodoMutation = (payload: unknown, fallback: Todo): Todo => {
  const parsedTodo = parseTaskFromResponse(payload, fallback);

  // Some comment endpoints return the comment record instead of the updated task.
  // In that case we keep the local task so recent comments remain visible in the UI.
  if (parsedTodo.id !== fallback.id) {
    return fallback;
  }

  return mergeTodoRecord(parsedTodo, fallback);
};

const mergeTodos = (remoteTodos: Todo[], localTodos: Todo[]): Todo[] => {
  if (remoteTodos.length === 0) return localTodos;
  if (localTodos.length === 0) return remoteTodos;

  const mergedMap = new Map<number, Todo>();

  for (const todo of localTodos) {
    mergedMap.set(todo.id, todo);
  }

  for (const todo of remoteTodos) {
    mergedMap.set(todo.id, mergeTodoRecord(todo, mergedMap.get(todo.id)));
  }

  return Array.from(mergedMap.values()).sort((a, b) => b.createdAt - a.createdAt);
};

const normalizeTodoId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

const openTodoAttachmentDatabase = (): Promise<IDBDatabase | null> =>
  new Promise((resolve) => {
    if (typeof window === "undefined" || !("indexedDB" in window)) {
      resolve(null);
      return;
    }

    try {
      const request = window.indexedDB.open(TODO_ATTACHMENT_DB_NAME, TODO_ATTACHMENT_DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(TODO_ATTACHMENT_STORE_NAME)) {
          db.createObjectStore(TODO_ATTACHMENT_STORE_NAME, { keyPath: "id" });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

const readTodoAttachmentCache = async (): Promise<Map<number, TodoAttachment[]>> => {
  const scope = ensureScopedWorkspaceCaches();
  const db = await openTodoAttachmentDatabase();
  if (!db) return new Map<number, TodoAttachment[]>();

  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(TODO_ATTACHMENT_STORE_NAME, "readonly");
      const store = transaction.objectStore(TODO_ATTACHMENT_STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const cache = new Map<number, TodoAttachment[]>();
        const rows = Array.isArray(request.result) ? request.result : [];

        rows.forEach((row) => {
          const record = asRecord(row);
          if (!record) return;
          if (toSafeString(record.scope) !== scope) return;
          const taskId = normalizeTodoId(record.taskId);
          if (taskId === null) return;
          cache.set(taskId, readTodoAttachments(record.attachments, "attachment"));
        });

        resolve(cache);
        db.close();
      };

      request.onerror = () => {
        resolve(new Map<number, TodoAttachment[]>());
        db.close();
      };
    } catch {
      resolve(new Map<number, TodoAttachment[]>());
      db.close();
    }
  });
};

const writeTodoAttachmentCacheSnapshot = async (items: Todo[]): Promise<void> => {
  const scope = ensureScopedWorkspaceCaches();
  const db = await openTodoAttachmentDatabase();
  if (!db) return;

  await new Promise<void>((resolve) => {
    try {
      const transaction = db.transaction(TODO_ATTACHMENT_STORE_NAME, "readwrite");
      const store = transaction.objectStore(TODO_ATTACHMENT_STORE_NAME);
      const activeTaskIds = new Set(items.map((todo) => todo.id));
      const getAllRequest = store.getAll();

      getAllRequest.onsuccess = () => {
        const rows = Array.isArray(getAllRequest.result) ? getAllRequest.result : [];
        rows.forEach((row) => {
          const record = asRecord(row);
          if (!record || toSafeString(record.scope) !== scope) return;

          const normalizedKey = normalizeTodoId(record.taskId);
          const scopedId = toSafeString(record.id);
          if (normalizedKey !== null && !activeTaskIds.has(normalizedKey) && scopedId) {
            store.delete(scopedId);
          }
        });

        items.forEach((todo) => {
          const attachments = readPersistableTodoAttachments(todo);
          const scopedId = `${scope}:${todo.id}`;
          if (attachments.length > 0) {
            store.put({
              id: scopedId,
              scope,
              taskId: todo.id,
              attachments,
              updatedAt: Date.now(),
            });
          } else {
            store.delete(scopedId);
          }
        });
      };

      transaction.oncomplete = () => {
        resolve();
        db.close();
      };

      transaction.onerror = () => {
        resolve();
        db.close();
      };
    } catch {
      resolve();
      db.close();
    }
  });
};

const hydrateTodosWithAttachmentCache = async (items: Todo[]): Promise<Todo[]> => {
  const cache = await readTodoAttachmentCache();
  if (cache.size === 0) return items.map(normalizeTodo);

  return items.map((todo) => {
    const cachedAttachments = cache.get(todo.id) ?? [];
    if (cachedAttachments.length === 0) return normalizeTodo(todo);

    return normalizeTodo({
      ...todo,
      attachments: [...readTodoAttachmentList(todo), ...cachedAttachments],
    });
  });
};

const persistTodos = (items: Todo[]) => {
  ensureScopedWorkspaceCaches();
  const normalized = items.map(normalizeTodo);
  const lightweightTodos = normalized.map((todo) => {
    const { attachments, images, image, ...rest } = todo;
    return rest;
  });
  inMemoryTodosCache = normalized;

  try {
    writeScopedStorageItem(TODO_KEY, JSON.stringify(lightweightTodos));
  } catch {
    // Ignore storage write failures (e.g., private mode/quota).
  }
};

const persistDeletedTodoIds = (ids: Set<number>) => {
  ensureScopedWorkspaceCaches();
  const cleaned = new Set<number>();
  for (const id of ids) {
    const normalizedId = normalizeTodoId(id);
    if (normalizedId !== null) cleaned.add(normalizedId);
  }

  inMemoryDeletedTodoIdsCache = cleaned;

  try {
    writeScopedStorageItem(DELETED_TODO_IDS_KEY, JSON.stringify(Array.from(cleaned)));
  } catch {
    // Ignore storage write failures (e.g., private mode/quota).
  }
};

const readDeletedTodoIds = (): Set<number> => {
  ensureScopedWorkspaceCaches();
  if (inMemoryDeletedTodoIdsCache.size > 0) {
    return new Set(inMemoryDeletedTodoIdsCache);
  }

  const raw = readScopedStorageItem(DELETED_TODO_IDS_KEY);
  if (!raw) return new Set<number>();

  try {
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return new Set<number>();

    const normalized = new Set<number>();
    for (const value of parsed) {
      const normalizedId = normalizeTodoId(value);
      if (normalizedId !== null) normalized.add(normalizedId);
    }

    inMemoryDeletedTodoIdsCache = normalized;
    return new Set(normalized);
  } catch {
    removeScopedStorageItem(DELETED_TODO_IDS_KEY);
    return new Set<number>();
  }
};

const markTodoAsDeleted = (todoId: number) => {
  const next = readDeletedTodoIds();
  next.add(todoId);
  persistDeletedTodoIds(next);
};

const clearTodoDeletionMarker = (todoId: number) => {
  const next = readDeletedTodoIds();
  if (!next.delete(todoId)) return;
  persistDeletedTodoIds(next);
};

const readTodosFromStorage = (): Todo[] => {
  ensureScopedWorkspaceCaches();
  if (inMemoryTodosCache.length > 0) {
    return inMemoryTodosCache.map(normalizeTodo);
  }

  const saved = readScopedStorageItem(TODO_KEY);
  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved) as Array<Partial<Todo>>;
    if (!Array.isArray(parsed)) return [];
    const normalized = parsed.map(normalizeTodo);
    inMemoryTodosCache = normalized;
    return normalized;
  } catch {
    removeScopedStorageItem(TODO_KEY);
    return [];
  }
};

const normalizeTodoActivityLogItem = (raw: Partial<TodoActivityLogItem>): TodoActivityLogItem => {
  const taskId = normalizeTodoId(raw.taskId);
  const type =
    raw.type === "created" || raw.type === "completed" || raw.type === "updated" || raw.type === "deleted"
      ? raw.type
      : "updated";
  const assignee = normalizeWorkspaceText(toSafeString(raw.assignee));
  const actorName = normalizeWorkspaceText(toSafeString(raw.actorName)) || assignee || "Workspace";
  const title = normalizeWorkspaceText(toSafeString(raw.title)) || "Untitled Task";
  const description = toSafeString(raw.description).trim() || "Task activity captured.";
  const category = normalizeWorkspaceText(toSafeString(raw.category)) || "General";
  const priority =
    raw.priority === "Low" || raw.priority === "Medium" || raw.priority === "High" ? raw.priority : undefined;
  const timestamp = parseTimestamp(raw.timestamp, Date.now());
  const id =
    typeof raw.id === "string" && raw.id.trim().length > 0
      ? raw.id.trim()
      : `${type}-${taskId ?? "none"}-${timestamp}`;

  return {
    id,
    taskId,
    type,
    title,
    description,
    category,
    priority,
    assignee,
    actorName,
    timestamp,
  };
};

const persistTodoActivityLog = (items: TodoActivityLogItem[]) => {
  ensureScopedWorkspaceCaches();
  const normalized = items
    .map(normalizeTodoActivityLogItem)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, TIMELINE_LOG_LIMIT);

  inMemoryTodoActivityLogCache = normalized;

  try {
    writeScopedStorageItem(TODO_ACTIVITY_LOG_KEY, JSON.stringify(normalized));
  } catch {
    // Ignore storage write failures (e.g., private mode/quota).
  }
};

const readTodoActivityLog = (): TodoActivityLogItem[] => {
  ensureScopedWorkspaceCaches();
  if (inMemoryTodoActivityLogCache.length > 0) {
    return inMemoryTodoActivityLogCache.map(normalizeTodoActivityLogItem);
  }

  const raw = readScopedStorageItem(TODO_ACTIVITY_LOG_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Array<Partial<TodoActivityLogItem>>;
    if (!Array.isArray(parsed)) return [];
    const normalized = parsed.map(normalizeTodoActivityLogItem).sort((a, b) => b.timestamp - a.timestamp);
    inMemoryTodoActivityLogCache = normalized;
    return normalized;
  } catch {
    removeScopedStorageItem(TODO_ACTIVITY_LOG_KEY);
    return [];
  }
};

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result;
      if (typeof result === "string" && result.length > 0) resolve(result);
      else reject(new Error("Invalid file content"));
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });

const fileToLocalPreviewUrl = async (file: File): Promise<string> => {
  if (typeof window !== "undefined" && typeof window.URL?.createObjectURL === "function") {
    return window.URL.createObjectURL(file);
  }

  return fileToDataUrl(file);
};

const revokeTemporaryAttachmentUrl = (value: string | null | undefined) => {
  if (!value || !isTemporaryAttachmentUrl(value) || !value.startsWith("blob:")) return;

  try {
    window.URL.revokeObjectURL(value);
  } catch {
    // Ignore browser revoke failures.
  }
};

const buildTodoAttachmentFromFile = async (file: File, fallbackName = "attachment"): Promise<TodoAttachment> => {
  const encoded = await fileToLocalPreviewUrl(file);
  return {
    id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name || fallbackName,
    url: encoded,
    type: file.type || getAttachmentMimeType(file.name),
    size: Number.isFinite(file.size) ? file.size : undefined,
    isImage: file.type.startsWith("image/"),
  };
};

const formatFileSize = (value?: number): string => {
  if (!value || value <= 0) return "Unknown size";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const getAttachmentIconClass = (attachment: TodoAttachment): string => {
  if (attachment.isImage) return "bi-image";
  if (attachment.type.includes("pdf")) return "bi-filetype-pdf";
  if (attachment.type.includes("excel") || attachment.type.includes("sheet") || attachment.name.match(/\.(csv|xlsx?)$/i)) {
    return "bi-file-earmark-spreadsheet";
  }
  if (attachment.type.includes("word") || attachment.name.match(/\.(docx?|rtf)$/i)) {
    return "bi-file-earmark-word";
  }
  if (attachment.type.includes("zip") || attachment.name.match(/\.(zip|rar|7z)$/i)) {
    return "bi-file-earmark-zip";
  }
  return "bi-file-earmark-text";
};

const formatDateTime = (value: number | string): string =>
  new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

const formatDayLabel = (value: number | string): string =>
  new Date(value).toLocaleDateString([], { weekday: "long" });

const formatLongDate = (value: number | string): string =>
  new Date(value).toLocaleDateString([], { day: "2-digit", month: "long", year: "numeric" });

const formatCardDate = (value: number | string): string => {
  const normalized =
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00` : value;
  return new Date(normalized).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
};

const formatRelativeSyncTime = (value: number | null): string => {
  if (!value) return "Not synced yet";

  const diffMinutes = Math.max(0, Math.floor((Date.now() - value) / 60000));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes === 1) return "1 minute ago";
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;

  const diffDays = Math.floor(diffHours / 24);
  return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
};

const getPlannedTaskTime = (todo: Todo): string | null => {
  if (typeof todo.estimatedHours === "string" && todo.estimatedHours.trim().length > 0) {
    return todo.estimatedHours.trim();
  }

  if (typeof todo.dueAt === "string" && todo.dueAt.trim().length > 0) {
    const dueDate = new Date(todo.dueAt);
    if (!Number.isNaN(dueDate.getTime())) {
      return dueDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
  }

  return null;
};

const getTaskBoardDate = (todo: Todo): string => {
  if (typeof todo.dueAt === "string" && todo.dueAt.trim().length > 0) {
    return getDayDateInput(todo.dueAt);
  }
  return getDayDateInput(todo.createdAt);
};

const getBoardTaskSortValue = (todo: Todo): number => {
  if (typeof todo.dueAt === "string" && todo.dueAt.trim().length > 0) {
    const dueTime = new Date(todo.dueAt).getTime();
    if (!Number.isNaN(dueTime)) return dueTime;
  }
  return todo.createdAt;
};

const getBoardTaskTimeLabel = (todo: Todo): string => {
  const planned = getPlannedTaskTime(todo);
  if (planned) return planned;
  return new Date(todo.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const getBoardTaskCommentCount = (todo: Todo): number => {
  const checkpointCount = Array.isArray(todo.checkpoints) ? todo.checkpoints.filter(Boolean).length : 0;
  const tagCount = Array.isArray(todo.tags) ? todo.tags.filter(Boolean).length : 0;
  const commentCount = Array.isArray(todo.comments) ? todo.comments.filter((comment) => comment.text.trim().length > 0).length : 0;
  return checkpointCount + tagCount + commentCount + (todo.statusNote?.trim() ? 1 : 0);
};

const getBoardPriorityLabel = (priority: Priority): string => {
  if (priority === "High") return "High-Red";
  if (priority === "Medium") return "Medium-Amber";
  return "Low Green";
};

const clampPercentage = (value: number): number => Math.max(0, Math.min(100, Math.round(value)));

const getDashboardTaskBucket = (todo: Todo): "Work" | "Learning" | "Personal" => {
  const haystack = [
    todo.category,
    todo.project,
    todo.department,
    todo.title,
    todo.description,
    ...(todo.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const learningKeywords = ["learn", "study", "course", "training", "skill", "research", "read", "practice", "cert"];
  if (learningKeywords.some((keyword) => haystack.includes(keyword))) return "Learning";

  const personalKeywords = ["personal", "health", "home", "family", "habit", "finance", "travel", "self", "wellness", "errand"];
  if (personalKeywords.some((keyword) => haystack.includes(keyword))) return "Personal";

  return "Work";
};

const calculateDashboardStreaks = (dateKeys: string[]) => {
  const uniqueKeys = [...new Set(dateKeys)].sort();
  if (uniqueKeys.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let running = 1;

  for (let index = 1; index < uniqueKeys.length; index += 1) {
    const previous = new Date(`${uniqueKeys[index - 1]}T00:00`).getTime();
    const current = new Date(`${uniqueKeys[index]}T00:00`).getTime();

    if (current - previous === MS_PER_DAY) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 1;
    }
  }

  let current = 1;
  for (let index = uniqueKeys.length - 1; index > 0; index -= 1) {
    const currentDate = new Date(`${uniqueKeys[index]}T00:00`).getTime();
    const previousDate = new Date(`${uniqueKeys[index - 1]}T00:00`).getTime();

    if (currentDate - previousDate === MS_PER_DAY) {
      current += 1;
      continue;
    }

    break;
  }

  return { current, longest };
};

const getDashboardHeatLevel = (value: number, maxValue: number): number => {
  if (value <= 0 || maxValue <= 0) return 0;

  const ratio = value / maxValue;
  if (ratio >= 0.8) return 4;
  if (ratio >= 0.55) return 3;
  if (ratio >= 0.3) return 2;
  return 1;
};

const buildDashboardTrendPaths = (values: number[], width = 360, height = 180) => {
  const safeValues = values.length > 0 ? values : [0];
  const maxValue = Math.max(...safeValues, 1);
  const minX = 18;
  const maxX = width - 18;
  const minY = 18;
  const maxY = height - 18;
  const stepX = safeValues.length > 1 ? (maxX - minX) / (safeValues.length - 1) : 0;

  const points = safeValues.map((value, index) => {
    const x = minX + stepX * index;
    const y = maxY - (value / maxValue) * (maxY - minY);
    return { x, y };
  });

  const linePath = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${maxY} L ${points[0].x} ${maxY} Z`;

  return { linePath, areaPath, maxValue };
};

const getBoardRelativeAge = (value: number): string => {
  const diffHours = Math.max(1, Math.floor((Date.now() - value) / 3600000));
  if (diffHours >= 24) {
    return `${Math.floor(diffHours / 24)}d ago`;
  }
  return `${diffHours}h ago`;
};

const formatCompletionDuration = (createdAt: number, completedAt: number): string => {
  const diffMs = Math.max(0, completedAt - createdAt);
  const totalMinutes = Math.floor(diffMs / 60000);
  return formatMinutesDuration(totalMinutes);
};

const formatMinutesDuration = (totalMinutes: number): string => {
  if (totalMinutes < 1) return "<1m";

  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.join(" ");
};

const getDayDateInput = (value: number | string | Date): string => {
  const d = new Date(value);
  const month = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
};

const getCurrentWeekDates = (anchorDate: number | string | Date = Date.now()): Record<BoardLane, string> => {
  const now = new Date(anchorDate);
  now.setHours(0, 0, 0, 0);

  const dayIndex = now.getDay();
  const mondayOffset = dayIndex === 0 ? -6 : 1 - dayIndex;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);

  const weekDates = {} as Record<BoardLane, string>;
  boardLanes.forEach((lane, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    weekDates[lane] = getDayDateInput(date);
  });

  return weekDates;
};

const formatShortDayDate = (value: string): string =>
  new Date(`${value}T00:00`).toLocaleDateString([], { day: "2-digit", month: "short" });

const formatLongDayDate = (value: string): string =>
  new Date(`${value}T00:00`).toLocaleDateString([], {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const formatBoardWeekRange = (start: string, end: string): string =>
  `${formatShortDayDate(start)} - ${new Date(`${end}T00:00`).toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })}`;

const calendarWeekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

const calendarQuickFilterOptions: Array<{ id: CalendarQuickFilter; label: string; icon: string }> = [
  { id: "all", label: "All", icon: "bi bi-grid-1x2" },
  { id: "completed", label: "Completed", icon: "bi bi-check2-circle" },
  { id: "pending", label: "Pending", icon: "bi bi-hourglass-split" },
  { id: "high", label: "High Priority", icon: "bi bi-flag-fill" },
];

const formatMonthYearLabel = (value: string): string =>
  new Date(`${value}T00:00`).toLocaleDateString([], { month: "long", year: "numeric" });

const formatTimeLabel = (value: number | string): string =>
  new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const getTimelineDateHeaderLabel = (value: number | string): string => {
  const dateKey = getDayDateInput(value);
  const todayKey = getDayDateInput(Date.now());

  if (dateKey === todayKey) return "Today";

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey === getDayDateInput(yesterday)) return "Yesterday";

  return formatCardDate(dateKey);
};

const formatTimelineRangeLabel = (start: number, end: number): string => {
  const startKey = getDayDateInput(start);
  const endKey = getDayDateInput(end);
  if (startKey === endKey) return formatLongDayDate(startKey);
  return `${formatCardDate(startKey)} - ${formatCardDate(endKey)}`;
};

const getDueAtEndTimestamp = (value: string): number => {
  const dueDate = new Date(value);
  if (Number.isNaN(dueDate.getTime())) return Date.now();
  dueDate.setHours(23, 59, 59, 999);
  return dueDate.getTime();
};

const shiftCalendarMonth = (value: string, offset: number): string => {
  const next = new Date(`${value}T00:00`);
  next.setDate(1);
  next.setMonth(next.getMonth() + offset);
  return getDayDateInput(next);
};

const buildCalendarMonthDays = (anchorDate: string) => {
  const monthStart = new Date(`${anchorDate}T00:00`);
  monthStart.setDate(1);

  const startOffset = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - startOffset);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const dateKey = getDayDateInput(date);

    return {
      dateKey,
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === monthStart.getMonth(),
      isToday: dateKey === getDayDateInput(Date.now()),
    };
  });
};

const isTodoOverdue = (todo: Todo, referenceTime = Date.now()): boolean => {
  if (todo.done || !todo.dueAt) return false;

  const dueDate = new Date(todo.dueAt);
  if (Number.isNaN(dueDate.getTime())) return false;

  dueDate.setHours(23, 59, 59, 999);
  return dueDate.getTime() < referenceTime;
};

const getTodoCalendarDateKeys = (todo: Todo): string[] => {
  const keys = new Set<string>([getDayDateInput(todo.createdAt)]);
  if (todo.completedAt) keys.add(getDayDateInput(todo.completedAt));
  if (todo.dueAt) keys.add(getDayDateInput(todo.dueAt));
  return Array.from(keys);
};

const getCalendarTaskMatchState = (todo: Todo, dateKey: string) => ({
  created: getDayDateInput(todo.createdAt) === dateKey,
  completed: Boolean(todo.completedAt) && getDayDateInput(todo.completedAt as number) === dateKey,
  due: Boolean(todo.dueAt) && getDayDateInput(todo.dueAt as string) === dateKey,
});

const getTodoSearchContent = (todo: Todo) =>
  `${todo.title} ${todo.description} ${todo.category} ${todo.assignee ?? ""} ${todo.project ?? ""} ${todo.department ?? ""} ${todo.clientName ?? ""} ${todo.location ?? ""} ${todo.statusNote ?? ""} ${todo.checkpoints.join(" ")} ${todo.tags.join(" ")} ${todo.comments.map((comment) => comment.text).join(" ")}`.toLowerCase();

const taskNav: Array<{ id: WorkspaceMode; label: string; icon: string }> = [
  { id: "list", label: "Task", icon: "bi bi-list-check" },
  { id: "board", label: "Board", icon: "bi bi-kanban" },
  { id: "calendar", label: "Calendar", icon: "bi bi-calendar3" },
  { id: "dashboard", label: "Dashboard", icon: "bi bi-grid-1x2" },
  { id: "timeline", label: "Timeline", icon: "bi bi-clock-history" },
  { id: "workflow", label: "Workflow", icon: "bi bi-diagram-3" },
  { id: "completed", label: "Completed", icon: "bi bi-check2-circle" },
];

const isTaskFilter = (value: string | null): value is TaskFilter =>
  value === "all" || value === "pending" || value === "completed";

const isWorkspaceRouteMode = (value: string | null): value is Exclude<WorkspaceMode, "addTask"> =>
  value === "list" ||
  value === "board" ||
  value === "timeline" ||
  value === "calendar" ||
  value === "dashboard" ||
  value === "workflow" ||
  value === "completed";

const resolveWorkspaceRouteState = ({
  view,
  initialFilter,
  pathname,
  search,
}: {
  view: WorkspacePage;
  initialFilter: TaskFilter;
  pathname: string;
  search: string;
}): { mode: WorkspaceMode; filter: TaskFilter } => {
  if (view === "add" || pathname === "/todo/add") {
    return { mode: "addTask", filter: "all" };
  }

  if (pathname === "/todo/completed" || initialFilter === "completed") {
    return { mode: "completed", filter: "completed" };
  }

  const searchParams = new URLSearchParams(search);
  const modeParam = searchParams.get("mode");
  const filterParam = searchParams.get("filter");

  return {
    mode: isWorkspaceRouteMode(modeParam) ? modeParam : "list",
    filter: isTaskFilter(filterParam) ? filterParam : initialFilter,
  };
};

const buildWorkspaceRoute = ({
  mode,
  filter,
}: {
  mode: WorkspaceMode;
  filter: TaskFilter;
}): { pathname: string; search: string } => {
  if (mode === "addTask") {
    return { pathname: "/todo/add", search: "" };
  }

  if (mode === "completed") {
    return { pathname: "/todo/completed", search: "" };
  }

  if (mode === "list" && filter === "pending") {
    return { pathname: "/todo/pending", search: "" };
  }

  const searchParams = new URLSearchParams();

  if (mode !== "list") {
    searchParams.set("mode", mode);
  }

  if (filter !== "all") {
    searchParams.set("filter", filter);
  }

  const search = searchParams.toString();
  return {
    pathname: "/todo/tasks",
    search: search ? `?${search}` : "",
  };
};

type WorkspaceModePanelProps = {
  isActive: boolean;
  children: React.ReactNode;
};

const WorkspaceModePanel = ({ isActive, children }: WorkspaceModePanelProps) => (
  <div className={`todo-mode-panel ${isActive ? "is-active" : "is-hidden"}`} hidden={!isActive} aria-hidden={!isActive}>
    {children}
  </div>
);

export default function TodoWorkspace({
  view,
  initialFilter = "all",
  standaloneSettings = false,
  initialSettingsTab = "general",
  onStandaloneSettingsClose,
}: TodoWorkspaceProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const routeLocationState = (location.state as WorkspaceRouteLocationState | null) ?? null;
  const shouldOpenSettingsModalFromRoute = Boolean(routeLocationState?.openSettingsModal);
  const requestedSettingsTabFromRoute = isSettingsCenterTab(routeLocationState?.settingsTab)
    ? routeLocationState.settingsTab
    : "general";
  const routeWorkspaceState = useMemo(
    () =>
      resolveWorkspaceRouteState({
        view,
        initialFilter,
        pathname: location.pathname,
        search: location.search,
      }),
    [initialFilter, location.pathname, location.search, view]
  );
  const [todos, dispatch] = useReducer(reducer, []);
  const [sidebarProfile, setSidebarProfile] = useState<SidebarProfile>(() => readSidebarProfile());
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => readSidebarCollapsed());
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.innerWidth <= 820 : false
  );
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("General");
  const [assignee, setAssignee] = useState("");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [dueDate, setDueDate] = useState("");
  const [estimateHours, setEstimateHours] = useState("");
  const [estimateMinutes, setEstimateMinutes] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreview, setAttachmentPreview] = useState("");
  const [attachmentDataUrl, setAttachmentDataUrl] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [todoActivityLog, setTodoActivityLog] = useState<TodoActivityLogItem[]>(() => readTodoActivityLog());
  const [activeFilter, setActiveFilter] = useState<TaskFilter>(() => routeWorkspaceState.filter);
  const [activeMode, setActiveMode] = useState<WorkspaceMode>(() => routeWorkspaceState.mode);
  const [openTaskMenuId, setOpenTaskMenuId] = useState<number | null>(null);
  const [expandedTaskIds, setExpandedTaskIds] = useState<Set<number>>(new Set());
  const [selectedBoardLane, setSelectedBoardLane] = useState<BoardLane>(() =>
    getLaneFromDate(Date.now())
  );
  const [selectedBoardDate, setSelectedBoardDate] = useState<string>(() => getDayDateInput(Date.now()));
  const [selectedBoardTaskId, setSelectedBoardTaskId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => getDayDateInput(Date.now()));
  const [calendarQuickFilter, setCalendarQuickFilter] = useState<CalendarQuickFilter>("all");
  const [timelineRangeFilter, setTimelineRangeFilter] = useState<TimelineRangeFilter>("last7");
  const [timelineActivityFilter, setTimelineActivityFilter] = useState<TimelineActivityFilter>("all");
  const [timelineFilterMenuOpen, setTimelineFilterMenuOpen] = useState(false);
  const [timelineSearchInput, setTimelineSearchInput] = useState("");
  const [timelineCustomStartDate, setTimelineCustomStartDate] = useState<string>(() =>
    getDayDateInput(Date.now() - 6 * MS_PER_DAY)
  );
  const [timelineCustomEndDate, setTimelineCustomEndDate] = useState<string>(() => getDayDateInput(Date.now()));
  const [activeTimelineItemId, setActiveTimelineItemId] = useState<string | null>(null);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Todo | null>(null);
  const [commentTarget, setCommentTarget] = useState<Todo | null>(null);
  const [taskAttachmentTargetId, setTaskAttachmentTargetId] = useState<number | null>(null);
  const [taskAttachmentUploadingId, setTaskAttachmentUploadingId] = useState<number | null>(null);
  const [taskAttachmentRemovingKey, setTaskAttachmentRemovingKey] = useState<string | null>(null);
  const [attachmentPreviewTarget, setAttachmentPreviewTarget] = useState<TodoAttachment | null>(null);
  const [commentText, setCommentText] = useState("");
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [menuSyncing, setMenuSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const [countdownNow, setCountdownNow] = useState(() => Date.now());
  const deferredSearchInput = useDeferredValue(searchInput);
  const deferredTimelineSearchInput = useDeferredValue(timelineSearchInput);
  const [workspaceModal, setWorkspaceModal] = useState<WorkspaceModal | null>(null);
  const [profileDraft, setProfileDraft] = useState<WorkspaceProfileData>(() => readWorkspaceProfile());
  const [settingsDraft, setSettingsDraft] = useState<WorkspaceSettingsState>(() => readWorkspaceSettings());
  const [settingsSavedAt, setSettingsSavedAt] = useState("");
  const [settingsCenterTab, setSettingsCenterTab] = useState<SettingsCenterTab>(initialSettingsTab);
  const [settingsSearchQuery, setSettingsSearchQuery] = useState("");
  const [settingsIntegrationsView, setSettingsIntegrationsView] =
    useState<SettingsIntegrationView>("installed");
  const [settingsMobileContentView, setSettingsMobileContentView] = useState(false);
  const [todoPersistenceReady, setTodoPersistenceReady] = useState(false);
  const lastObservedRouteRef = useRef(`${location.pathname}${location.search}`);
  const todosRef = useRef<Todo[]>([]);
  const temporaryAttachmentUrlsRef = useRef<Set<string>>(new Set());
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const timelineFilterMenuRef = useRef<HTMLDivElement | null>(null);
  const profileAvatarInputRef = useRef<HTMLInputElement | null>(null);
  const taskAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const settingsAutoSaveTimeoutRef = useRef<number | null>(null);
  const settingsMobileAutoSaveSkipRef = useRef(true);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth <= 820);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const hasActiveCountdownTasks = useMemo(
    () => todos.some((todo) => !todo.done && getEstimatedDurationMs(todo.estimatedHours) !== null),
    [todos]
  );

  const shouldRefreshTaskCountdowns =
    view === "tasks" && hasActiveCountdownTasks && (activeMode === "list" || activeMode === "dashboard" || activeMode === "completed");

  useEffect(() => {
    if (!shouldRefreshTaskCountdowns) {
      return;
    }

    setCountdownNow(Date.now());
    const intervalId = window.setInterval(() => {
      startTransition(() => {
        setCountdownNow(Date.now());
      });
    }, LIVE_TODO_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [shouldRefreshTaskCountdowns]);

  const appendTimelineActivity = (entry: Partial<TodoActivityLogItem>) => {
    const normalized = normalizeTodoActivityLogItem(entry);

    setTodoActivityLog((prev) => {
      const next = [normalized, ...prev.filter((item) => item.id !== normalized.id)]
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, TIMELINE_LOG_LIMIT);
      persistTodoActivityLog(next);
      return next;
    });
  };

  const resolveTimelineActor = (todo: Partial<Todo>, fallbackActor?: string) => {
    const assigneeName = normalizeWorkspaceText(toSafeString(todo.assignee));
    const backupActor =
      normalizeWorkspaceText(fallbackActor ?? "")
      || sidebarProfile.name.trim()
      || profileDraft.name.trim()
      || "You";

    return assigneeName || backupActor;
  };

  const createTimelineActivityRecord = (
    type: Exclude<TimelineActivityType, "overdue">,
    todo: Partial<Todo>,
    options: { timestamp?: number; description?: string; actorName?: string } = {}
  ): TodoActivityLogItem => {
    const recordedAt = options.timestamp ?? Date.now();
    const actorName = resolveTimelineActor(todo, options.actorName);
    const categoryLabel = normalizeWorkspaceText(toSafeString(todo.category)) || "General";
    const titleLabel = normalizeWorkspaceText(toSafeString(todo.title)) || "Untitled Task";
    const descriptionText =
      options.description?.trim()
      || (type === "created"
        ? toSafeString(todo.description).trim()
          || toSafeString(todo.statusNote).trim()
          || `Added to ${categoryLabel} with ${todo.priority ?? "Medium"} priority.`
        : type === "completed"
          ? toSafeString(todo.statusNote).trim()
            || toSafeString(todo.description).trim()
            || "Task marked as completed."
          : type === "deleted"
            ? "Removed from the active workspace."
            : toSafeString(todo.statusNote).trim()
              || "Task details or notes were updated.");

    return normalizeTodoActivityLogItem({
      id: `${type}-${normalizeTodoId(todo.id) ?? "none"}-${recordedAt}`,
      taskId: normalizeTodoId(todo.id),
      type,
      title: titleLabel,
      description: descriptionText,
      category: categoryLabel,
      priority: todo.priority,
      assignee: normalizeWorkspaceText(toSafeString(todo.assignee)),
      actorName,
      timestamp: recordedAt,
    });
  };

  const syncTodosFromApi = async (baseTodos: Todo[] = readTodosFromStorage()): Promise<Todo[] | null> => {
    try {
      const authToken = readAuthToken();
      const response = await apiClient.get(
        apiRoutes.tasks,
        authToken
          ? {
              headers: {
                Authorization: `Bearer ${authToken}`,
              },
            }
          : undefined
      );

      const remoteTodos = parseTaskListFromResponse(response.data);
      if (remoteTodos === null) return null;

      const activeDeletedTodoIds = readDeletedTodoIds();
      const visibleRemoteTodos = remoteTodos.filter((todo) => !activeDeletedTodoIds.has(todo.id));
      const nextTodos = await hydrateTodosWithAttachmentCache(visibleRemoteTodos.map(normalizeTodo));
      persistTodos(nextTodos);
      setLastSyncedAt(Date.now());
      return nextTodos;
    } catch {
      return null;
    }
  };

  const deleteTodoRemotely = async (todoId: number): Promise<boolean> => {
    const authConfig = readAuthConfig();

    const endpoints = [`${apiRoutes.tasks}/${todoId}`, apiRoutes.tasks];
    for (const endpoint of endpoints) {
      try {
        if (endpoint === apiRoutes.tasks) {
          await apiClient.delete(endpoint, {
            ...(authConfig ?? {}),
            data: { id: todoId, task_id: todoId },
          });
        } else {
          await apiClient.delete(endpoint, authConfig);
        }
        return true;
      } catch {
        // Try the next endpoint shape.
      }
    }

    return false;
  };

  const saveTodoRemotely = async (
    todo: Todo,
    options?: { newComment?: TodoComment; attachmentFiles?: File[] }
  ): Promise<Todo | null> => {
    const authConfig = readAuthConfig();
    const normalizedTodo = normalizeTodo(todo);
    const taskPayload = buildTaskMutationPayload(normalizedTodo);

    if (options?.newComment) {
      const commentAuthor =
        options.newComment.authorName.trim()
        || sidebarProfile.name.trim()
        || profileDraft.name.trim()
        || normalizedTodo.assignee
        || "Workspace";
      const profileEmail = profileDraft.email.trim().toLowerCase();
      const genericCommentPayload = {
        name: commentAuthor,
        email: profileEmail || undefined,
        comment: [
          `Task: ${normalizedTodo.title}`,
          `Task ID: ${normalizedTodo.id}`,
          `Author: ${commentAuthor}`,
          "",
          options.newComment.text.trim(),
        ].join("\n"),
      };
      const commentPayload = {
        id: options.newComment.id,
        task_id: normalizedTodo.id,
        taskId: normalizedTodo.id,
        todo_id: normalizedTodo.id,
        todoId: normalizedTodo.id,
        comment: toApiCommentPayload(options.newComment),
        comments: normalizedTodo.comments.map(toApiCommentPayload),
      };
      const commentAttempts: Array<{
        endpoint: string;
        payload: typeof commentPayload | typeof genericCommentPayload;
        returnsTodo: boolean;
      }> = [
        {
          endpoint: apiRoutes.comments,
          payload: genericCommentPayload,
          returnsTodo: false,
        },
        {
          endpoint: `${apiRoutes.tasks}/${normalizedTodo.id}/comments`,
          payload: commentPayload,
          returnsTodo: true,
        },
        {
          endpoint: `${apiRoutes.tasks}/${normalizedTodo.id}/comment`,
          payload: commentPayload,
          returnsTodo: true,
        },
        {
          endpoint: `${apiRoutes.tasks}/comments`,
          payload: commentPayload,
          returnsTodo: true,
        },
        {
          endpoint: `${apiRoutes.tasks}/comment`,
          payload: commentPayload,
          returnsTodo: true,
        },
      ];

      for (const attempt of commentAttempts) {
        try {
          const response = await apiClient.post(attempt.endpoint, attempt.payload, authConfig);
          return attempt.returnsTodo ? reconcileRemoteTodoMutation(response.data, normalizedTodo) : normalizedTodo;
        } catch {
          // Try the next endpoint shape.
        }
      }
    }

    if (options?.attachmentFiles && options.attachmentFiles.length > 0) {
      const authToken = readAuthToken();
      const uploadAttempts: Array<{
        endpoint: string;
        method: "post" | "patch" | "put";
        fileFieldName: string;
        includeMethodOverride?: boolean;
      }> = [
        { endpoint: `${apiRoutes.tasks}/${normalizedTodo.id}/attachment`, method: "post", fileFieldName: "attachment" },
        { endpoint: `${apiRoutes.tasks}/${normalizedTodo.id}/attachments`, method: "post", fileFieldName: "attachments[]" },
        { endpoint: `${apiRoutes.tasks}/${normalizedTodo.id}`, method: "post", fileFieldName: "attachment", includeMethodOverride: true },
        { endpoint: `${apiRoutes.tasks}/${normalizedTodo.id}`, method: "patch", fileFieldName: "attachment" },
        { endpoint: `${apiRoutes.tasks}/${normalizedTodo.id}`, method: "put", fileFieldName: "attachment" },
        { endpoint: apiRoutes.tasks, method: "post", fileFieldName: "attachment", includeMethodOverride: true },
      ];

      for (const attempt of uploadAttempts) {
        try {
          const formData = buildTaskMultipartPayload(
            normalizedTodo,
            options.attachmentFiles,
            attempt.fileFieldName,
            Boolean(attempt.includeMethodOverride)
          );

          const response = await axios.request({
            baseURL: API_BASE_URL,
            url: attempt.endpoint,
            method: attempt.method,
            data: formData,
            timeout: 10000,
            headers: {
              Accept: "application/json",
              ...(authToken
                ? {
                    Authorization: `Bearer ${authToken}`,
                  }
                : {}),
            },
          });

          const syncedTodos = await syncTodosFromApi(todosRef.current);
          if (syncedTodos) {
            const syncedTodo = syncedTodos.find((item) => item.id === normalizedTodo.id);
            if (syncedTodo) {
              return syncedTodo;
            }
          }

          return reconcileRemoteTodoMutation(response.data, normalizedTodo);
        } catch {
          // Try the next multipart endpoint shape.
        }
      }

      return null;
    }

    const mutationAttempts: Array<{ method: "patch" | "put"; endpoint: string }> = [
      { method: "patch", endpoint: `${apiRoutes.tasks}/${normalizedTodo.id}` },
      { method: "put", endpoint: `${apiRoutes.tasks}/${normalizedTodo.id}` },
      { method: "patch", endpoint: apiRoutes.tasks },
      { method: "put", endpoint: apiRoutes.tasks },
    ];

    for (const attempt of mutationAttempts) {
      try {
        const response = await apiClient.request({
          url: attempt.endpoint,
          method: attempt.method,
          data: taskPayload,
          ...(authConfig ?? {}),
        });
        return reconcileRemoteTodoMutation(response.data, normalizedTodo);
      } catch {
        // Try the next endpoint shape.
      }
    }

    return null;
  };

  useEffect(() => {
    let active = true;
    const initializeTodos = async () => {
      ensureScopedWorkspaceCaches();

      for (const legacyKey of LEGACY_TODO_KEYS) {
        if (legacyKey !== TODO_KEY) {
          try {
            localStorage.removeItem(legacyKey);
          } catch {
            // Ignore storage cleanup failures.
          }
        }
      }

      const deletedTodoIds = readDeletedTodoIds();
      const localTodos = await hydrateTodosWithAttachmentCache(
        readTodosFromStorage().filter((todo) => !deletedTodoIds.has(todo.id))
      );

      if (!active) return;

      todosRef.current = localTodos;
      setTodoPersistenceReady(true);
      dispatch({ type: "REORDER", payload: localTodos });

      const nextTodos = await syncTodosFromApi(localTodos);
      if (!active || nextTodos === null) return;
      dispatch({ type: "REORDER", payload: nextTodos });
    };

    void initializeTodos();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    void loadWorkspacePreferencesFromApi();
  }, []);

  useEffect(() => {
    // Removed global todo-scroll-lock to allow mobile scrolling
    return () => {
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("todo-page-active");
    document.body.classList.add("todo-page-active");

    return () => {
      document.documentElement.classList.remove("todo-page-active");
      document.body.classList.remove("todo-page-active");
    };
  }, []);

  useEffect(() => {
    if (!todoPersistenceReady) return;

    todosRef.current = todos;
    persistTodos(todos);
    void writeTodoAttachmentCacheSnapshot(todos);
  }, [todoPersistenceReady, todos]);

  useEffect(() => {
    const nextTemporaryUrls = new Set<string>();

    todos.forEach((todo) => {
      readTodoAttachmentList(todo).forEach((attachment) => {
        if (isTemporaryAttachmentUrl(attachment.url)) {
          nextTemporaryUrls.add(attachment.url);
        }
      });
    });

    temporaryAttachmentUrlsRef.current.forEach((url) => {
      if (!nextTemporaryUrls.has(url)) {
        revokeTemporaryAttachmentUrl(url);
      }
    });

    temporaryAttachmentUrlsRef.current = nextTemporaryUrls;
  }, [todos]);

  useEffect(() => {
    try {
      writeScopedStorageItem(SIDEBAR_COLLAPSED_KEY, sidebarCollapsed ? "1" : "0");
    } catch {
      // Ignore local storage failures for sidebar layout preferences.
    }
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (activeMode !== routeWorkspaceState.mode) {
      setActiveMode(routeWorkspaceState.mode);
    }

    if (activeFilter !== routeWorkspaceState.filter) {
      setActiveFilter(routeWorkspaceState.filter);
    }
  }, [activeFilter, activeMode, routeWorkspaceState.filter, routeWorkspaceState.mode]);

  useEffect(() => {
    if (standaloneSettings) {
      return;
    }

    const currentRouteKey = `${location.pathname}${location.search}`;
    const locationJustChanged = lastObservedRouteRef.current !== currentRouteKey;
    lastObservedRouteRef.current = currentRouteKey;

    if (locationJustChanged && (activeMode !== routeWorkspaceState.mode || activeFilter !== routeWorkspaceState.filter)) {
      return;
    }

    const targetRoute = buildWorkspaceRoute({
      mode: activeMode,
      filter: activeFilter,
    });

    if (location.pathname === targetRoute.pathname && location.search === targetRoute.search) {
      return;
    }

    navigate(`${targetRoute.pathname}${targetRoute.search}`, { replace: true });
  }, [
    activeFilter,
    activeMode,
    location.pathname,
    location.search,
    navigate,
    routeWorkspaceState.filter,
    routeWorkspaceState.mode,
    standaloneSettings,
  ]);

  useEffect(() => {
    setSelectedBoardLane(getLaneFromDate(selectedBoardDate));
  }, [selectedBoardDate]);

  useEffect(() => {
    const syncSidebarProfile = () => {
      setSidebarProfile(readSidebarProfile());
      setProfileDraft(readWorkspaceProfile());
    };

    const onProfileUpdated = () => {
      syncSidebarProfile();
    };

    const onStorage = (event: StorageEvent) => {
      if (!matchesScopedStorageKey("app-profile", event.key)) return;
      syncSidebarProfile();
    };

    window.addEventListener("app-profile-updated", onProfileUpdated as EventListener);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("app-profile-updated", onProfileUpdated as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    const syncSettings = () => {
      const nextSettings = readWorkspaceSettings();
      setSettingsDraft(nextSettings);
      applyWorkspaceVisualSettings(nextSettings);
    };

    syncSettings();
    const onStorage = (event: StorageEvent) => {
      if (!matchesScopedStorageKey("app-settings", event.key)) return;
      syncSettings();
    };
    window.addEventListener("app-settings-updated", syncSettings as EventListener);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("app-settings-updated", syncSettings as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mediaQuery = window.matchMedia("(max-width: 820px)");
    const syncViewport = (matches: boolean) => {
      setIsMobileViewport(matches);
      if (!matches) {
        setMobileSidebarOpen(false);
      } else {
        setProfileMenuOpen(false);
      }
    };

    syncViewport(mediaQuery.matches);

    const onChange = (event: MediaQueryListEvent) => {
      syncViewport(event.matches);
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", onChange);
      return () => mediaQuery.removeEventListener("change", onChange);
    }

    mediaQuery.addListener(onChange);
    return () => mediaQuery.removeListener(onChange);
  }, []);

  useEffect(() => {
    const closeOnOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }
    };

    window.addEventListener("click", closeOnOutside);
    return () => window.removeEventListener("click", closeOnOutside);
  }, []);

  useEffect(() => {
    const closeTimelineFilterOnOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (timelineFilterMenuRef.current && !timelineFilterMenuRef.current.contains(target)) {
        setTimelineFilterMenuOpen(false);
      }
    };

    window.addEventListener("click", closeTimelineFilterOnOutside);
    return () => window.removeEventListener("click", closeTimelineFilterOnOutside);
  }, []);

  useEffect(() => {
    const closeTaskMenuOnOutside = (event: MouseEvent) => {
      if (!(event.target instanceof Element)) {
        setOpenTaskMenuId(null);
        return;
      }

      if (!event.target.closest(".todo-task-menu-shell")) {
        setOpenTaskMenuId(null);
      }
    };

    window.addEventListener("click", closeTaskMenuOnOutside);
    return () => window.removeEventListener("click", closeTaskMenuOnOutside);
  }, []);

  useEffect(() => {
    if (!mobileSidebarOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileSidebarOpen(false);
        setProfileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileSidebarOpen]);

  useEffect(() => {
    if (!workspaceModal) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setWorkspaceModal(null);
      }
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [workspaceModal]);

  useEffect(() => {
    if (!timelineFilterMenuOpen) return;

    const closeTimelineFilterOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setTimelineFilterMenuOpen(false);
      }
    };

    window.addEventListener("keydown", closeTimelineFilterOnEscape);
    return () => window.removeEventListener("keydown", closeTimelineFilterOnEscape);
  }, [timelineFilterMenuOpen]);

  useEffect(() => {
    if (openTaskMenuId === null) return;

    const closeTaskMenuOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenTaskMenuId(null);
      }
    };

    window.addEventListener("keydown", closeTaskMenuOnEscape);
    return () => window.removeEventListener("keydown", closeTaskMenuOnEscape);
  }, [openTaskMenuId]);

  useEffect(() => {
    if (!attachmentPreviewTarget) return;

    const closeAttachmentPreviewOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAttachmentPreviewTarget(null);
      }
    };

    window.addEventListener("keydown", closeAttachmentPreviewOnEscape);
    return () => window.removeEventListener("keydown", closeAttachmentPreviewOnEscape);
  }, [attachmentPreviewTarget]);

  useEffect(() => () => {
    revokeTemporaryAttachmentUrl(attachmentDataUrl);
  }, [attachmentDataUrl]);

  useEffect(() => () => {
    temporaryAttachmentUrlsRef.current.forEach((url) => revokeTemporaryAttachmentUrl(url));
  }, []);

  const handleAttachmentUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const encoded = await fileToLocalPreviewUrl(file);
      const preview = file.type.startsWith("image/") ? encoded : "";
      revokeTemporaryAttachmentUrl(attachmentDataUrl);
      setAttachmentFile(file);
      setAttachmentDataUrl(encoded);
      setAttachmentPreview(preview);
    } catch {
      toast.error("Attachment read failed. Please try again.");
    } finally {
      e.target.value = "";
    }
  };

  const clearAttachment = () => {
    revokeTemporaryAttachmentUrl(attachmentDataUrl);
    setAttachmentFile(null);
    setAttachmentDataUrl("");
    setAttachmentPreview("");
  };

  const validateForm = (): boolean => {
    const nextErrors: FormErrors = {};
    if (!title.trim()) nextErrors.title = "Task title is required.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const composeDueAt = (): string | undefined => {
    const cleanDate = dueDate.trim();
    if (!cleanDate) return undefined;
    return `${cleanDate}T23:59`;
  };

  const composeEstimatedDuration = (): string | undefined => {
    const parsedHours = Number.parseInt(estimateHours || "0", 10);
    const parsedMinutes = Number.parseInt(estimateMinutes || "0", 10);

    const hours = Number.isFinite(parsedHours) ? Math.max(0, parsedHours) : 0;
    const minutesRaw = Number.isFinite(parsedMinutes) ? Math.max(0, parsedMinutes) : 0;
    const minutes = Math.min(59, minutesRaw);

    if (hours === 0 && minutes === 0) return undefined;
    const parts = [hours > 0 ? `${hours}h` : "", minutes > 0 ? `${minutes}m` : ""].filter(Boolean);
    return parts.join(" ");
  };

  const resetTaskForm = () => {
    setTitle("");
    setDescription("");
    setCategory("General");
    setAssignee("");
    setPriority("Medium");
    setDueDate("");
    setEstimateHours("");
    setEstimateMinutes("");
    clearAttachment();
    setErrors({});
  };

  const addTodo = async () => {
    if (!validateForm()) return;
    setSubmitting(true);

    const dueAt = composeDueAt();
    const estimatedDuration = composeEstimatedDuration();
    const normalizedCategory = category.trim() || "General";
    const normalizedAssignee = assignee.trim();
    const hoursInput = Number.parseInt(estimateHours || "0", 10);
    const minutesInput = Number.parseInt(estimateMinutes || "0", 10);
    const estimatedHoursNumber = Number.isFinite(hoursInput) ? Math.max(0, hoursInput) : 0;
    const estimatedMinutesNumber = Number.isFinite(minutesInput) ? Math.min(59, Math.max(0, minutesInput)) : 0;
    const localAttachmentPreview = attachmentPreview || undefined;
    const localAttachmentDataUrl = attachmentDataUrl || undefined;
    const localTaskAttachments =
      attachmentFile && localAttachmentDataUrl
        ? [
            {
              id: `${attachmentFile.name}-${Date.now()}`,
              name: attachmentFile.name,
              url: localAttachmentDataUrl,
              type: attachmentFile.type || getAttachmentMimeType(attachmentFile.name),
              size: Number.isFinite(attachmentFile.size) ? attachmentFile.size : undefined,
              isImage: attachmentFile.type.startsWith("image/"),
            },
          ]
        : undefined;

    const localTask: Todo = {
      id: Date.now(),
      title: title.trim(),
      description: description.trim(),
      category: normalizedCategory,
      assignee: normalizedAssignee || undefined,
      lane: getLaneFromDate(dueAt ?? Date.now()),
      priority,
      done: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      dueAt,
      estimatedHours: estimatedDuration,
      checkpoints: [],
      tags: [],
      comments: [],
      attachments: localTaskAttachments,
      images: localAttachmentPreview ? [localAttachmentPreview] : undefined,
      image: localAttachmentPreview,
    };

    const payload = new FormData();
    payload.append("title", localTask.title);
    payload.append("description", localTask.description);
    payload.append("category", localTask.category);
    payload.append("priority", localTask.priority);
    payload.append("status", "pending");

    if (normalizedAssignee) {
      payload.append("assignee", normalizedAssignee);
    }

    if (dueDate.trim()) {
      payload.append("due_date", dueDate.trim());
    }

    if (estimatedDuration) {
      payload.append("estimated_duration", estimatedDuration);
    }

    if (estimatedHoursNumber > 0) {
      payload.append("estimated_hours", String(estimatedHoursNumber));
    }

    if (estimatedMinutesNumber > 0) {
      payload.append("estimated_minutes", String(estimatedMinutesNumber));
    }

    if (attachmentFile) {
      payload.append("attachment", attachmentFile);
    }

    try {
      const authToken = readAuthToken();
      const response = await axios.post(`${API_BASE_URL}${apiRoutes.tasks}`, payload, {
        timeout: 10000,
        headers: {
          Accept: "application/json",
          ...(authToken
            ? {
                Authorization: `Bearer ${authToken}`,
              }
            : {}),
        },
      });

      const createdTask = parseTaskFromResponse(response.data, localTask);
      clearTodoDeletionMarker(createdTask.id);

      const optimisticTodos = [createdTask, ...todosRef.current.filter((item) => item.id !== createdTask.id)];
      todosRef.current = optimisticTodos;

      const syncedTodos = await syncTodosFromApi(optimisticTodos);
      const nextTodos = syncedTodos ?? optimisticTodos;
      const visibleCreatedTask = nextTodos.find((item) => item.id === createdTask.id) ?? createdTask;

      appendTimelineActivity(
        createTimelineActivityRecord("created", visibleCreatedTask, {
          timestamp: visibleCreatedTask.createdAt,
        })
      );
      persistTodos(nextTodos);
      dispatch({ type: "REORDER", payload: nextTodos });

      resetTaskForm();
      if (view === "tasks") {
        setActiveMode("list");
        setActiveFilter("all");
        setWorkspaceModal(null);
      } else {
        navigate("/todo/tasks");
      }
      toast.success("Task added successfully");
    } catch (error: unknown) {
      let message = "Task add failed. Please try again.";
      if (axios.isAxiosError(error)) {
        const errorData = asRecord(error.response?.data);
        if (typeof errorData?.message === "string" && errorData.message.trim().length > 0) {
          message = errorData.message;
        }
      }
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteTodo = async (todoId: number) => {
    dispatch({ type: "DELETE", payload: todoId });
    markTodoAsDeleted(todoId);

    const removedRemotely = await deleteTodoRemotely(todoId);
    if (!removedRemotely) {
      toast("Task deleted locally. Server sync will retry on next refresh.");
    }
  };

  const searchQuery = deferredSearchInput.trim().toLowerCase();

  const filteredByFilter = useMemo(() => {
    let items = todos;
    if (activeFilter === "pending") items = items.filter((t) => !t.done);
    if (activeFilter === "completed") items = items.filter((t) => t.done);
    if (!searchQuery) return items;
    return items.filter((t) => getTodoSearchContent(t).includes(searchQuery));
  }, [todos, activeFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter((t) => t.done).length;
    const pending = total - completed;
    const overdue = todos.filter((t) => !t.done && t.dueAt && new Date(t.dueAt).getTime() < countdownNow).length;
    const high = todos.filter((t) => t.priority === "High").length;
    const medium = todos.filter((t) => t.priority === "Medium").length;
    const low = todos.filter((t) => t.priority === "Low").length;
    const completionPct = total === 0 ? 0 : Math.round((completed / total) * 100);
    return { total, completed, pending, overdue, high, medium, low, completionPct };
  }, [countdownNow, todos]);

  const calendarMonthLabel = useMemo(() => formatMonthYearLabel(selectedDate), [selectedDate]);

  const calendarMonthDays = useMemo(() => buildCalendarMonthDays(selectedDate), [selectedDate]);

  const calendarDateMap = useMemo(() => {
    const map = new Map<
      string,
      { tasks: Todo[]; completed: number; pending: number; overdue: number; high: number }
    >();

    todos.forEach((todo) => {
      getTodoCalendarDateKeys(todo).forEach((dateKey) => {
        const entry = map.get(dateKey) ?? {
          tasks: [],
          completed: 0,
          pending: 0,
          overdue: 0,
          high: 0,
        };

        entry.tasks.push(todo);
        if (todo.priority === "High") entry.high += 1;
        if (isTodoOverdue(todo)) entry.overdue += 1;
        else if (todo.done) entry.completed += 1;
        else entry.pending += 1;

        map.set(dateKey, entry);
      });
    });

    return map;
  }, [todos]);

  const tasksOnSelectedDate = useMemo(() => {
    const items = [...(calendarDateMap.get(selectedDate)?.tasks ?? [])];
    const getRelevantTimestamp = (todo: Todo) => {
      const match = getCalendarTaskMatchState(todo, selectedDate);
      const timestamps = [
        match.created ? todo.createdAt : 0,
        match.completed && todo.completedAt ? todo.completedAt : 0,
        match.due && todo.dueAt ? new Date(todo.dueAt).getTime() : 0,
        todo.completedAt ?? 0,
        todo.createdAt,
      ].filter((value) => Number.isFinite(value) && value > 0);

      return timestamps.length > 0 ? Math.max(...timestamps) : todo.createdAt;
    };

    return items.sort((a, b) => getRelevantTimestamp(b) - getRelevantTimestamp(a));
  }, [calendarDateMap, selectedDate]);

  const calendarFilteredTasks = useMemo(() => {
    return tasksOnSelectedDate.filter((todo) => {
      if (calendarQuickFilter === "completed") return todo.done;
      if (calendarQuickFilter === "pending") return !todo.done;
      if (calendarQuickFilter === "high") return todo.priority === "High";
      return true;
    });
  }, [calendarQuickFilter, tasksOnSelectedDate]);

  const calendarSelectedDateSummary = useMemo(() => {
    const total = tasksOnSelectedDate.length;
    const completed = tasksOnSelectedDate.filter((todo) => todo.done).length;
    const pending = total - completed;
    const overdue = tasksOnSelectedDate.filter((todo) => isTodoOverdue(todo)).length;
    const high = tasksOnSelectedDate.filter((todo) => todo.priority === "High").length;
    const highCompleted = tasksOnSelectedDate.filter((todo) => todo.priority === "High" && todo.done).length;
    const completionRate = total === 0 ? 0 : clampPercentage((completed / total) * 100);

    return { total, completed, pending, overdue, high, highCompleted, completionRate };
  }, [tasksOnSelectedDate]);

  const calendarSelectedDateLabel = useMemo(() => formatLongDayDate(selectedDate), [selectedDate]);

  const calendarHistoryItems = useMemo(() => {
    const items: Array<{ id: string; type: "created" | "completed" | "updated"; timestamp: number; task: Todo }> = [];

    calendarFilteredTasks.forEach((todo) => {
      const match = getCalendarTaskMatchState(todo, selectedDate);

      if (match.created) {
        items.push({
          id: `${todo.id}-created-${selectedDate}`,
          type: "created",
          timestamp: todo.createdAt,
          task: todo,
        });
      }

      if (match.completed && todo.completedAt) {
        items.push({
          id: `${todo.id}-completed-${selectedDate}`,
          type: "completed",
          timestamp: todo.completedAt,
          task: todo,
        });
      }

      if (match.due && !match.created && !match.completed) {
        const dueTimestamp = todo.dueAt ? new Date(todo.dueAt).getTime() : new Date(`${selectedDate}T12:00`).getTime();
        items.push({
          id: `${todo.id}-updated-${selectedDate}`,
          type: "updated",
          timestamp: Number.isNaN(dueTimestamp) ? new Date(`${selectedDate}T12:00`).getTime() : dueTimestamp,
          task: todo,
        });
      }
    });

    return items.sort((a, b) => b.timestamp - a.timestamp);
  }, [calendarFilteredTasks, selectedDate]);

  const calendarProductivityScore = useMemo(() => {
    if (calendarSelectedDateSummary.total === 0) return stats.completionPct;

    const baseScore = (calendarSelectedDateSummary.completed / calendarSelectedDateSummary.total) * 82;
    const priorityBonus =
      calendarSelectedDateSummary.high === 0
        ? 8
        : (calendarSelectedDateSummary.highCompleted / calendarSelectedDateSummary.high) * 12;
    const overduePenalty = calendarSelectedDateSummary.overdue * 9;

    return clampPercentage(baseScore + priorityBonus - overduePenalty);
  }, [calendarSelectedDateSummary, stats.completionPct]);

  const calendarActiveStreak = useMemo(() => {
    let streak = 0;
    const cursor = new Date(`${selectedDate}T00:00`);

    while (streak < 365) {
      const dateKey = getDayDateInput(cursor);
      const entry = calendarDateMap.get(dateKey);
      if (!entry || entry.tasks.length === 0) break;

      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    return streak;
  }, [calendarDateMap, selectedDate]);

  const timelineDerivedEvents = useMemo(() => {
    const fallbackActor = sidebarProfile.name.trim() || profileDraft.name.trim() || "You";

    return todos
      .flatMap((todo) => {
        const categoryLabel = todo.category?.trim() || "General";
        const actorName = todo.assignee?.trim() || fallbackActor;
        const baseDescription =
          todo.description?.trim()
          || todo.statusNote?.trim()
          || `Tracked in ${categoryLabel} with ${todo.priority} priority.`;
        const nextItems: TimelineEventItem[] = [
          {
            id: `timeline-created-${todo.id}-${todo.createdAt}`,
            taskId: todo.id,
            type: "created",
            title: todo.title,
            description: baseDescription,
            category: categoryLabel,
            priority: todo.priority,
            assignee: actorName,
            actorName,
            timestamp: todo.createdAt,
          },
        ];

        if (todo.completedAt) {
          nextItems.push({
            id: `timeline-completed-${todo.id}-${todo.completedAt}`,
            taskId: todo.id,
            type: "completed",
            title: todo.title,
            description:
              todo.statusNote?.trim()
              || todo.description?.trim()
              || "Task was completed and archived from active work.",
            category: categoryLabel,
            priority: todo.priority,
            assignee: actorName,
            actorName,
            timestamp: todo.completedAt,
          });
        }

        if (Array.isArray(todo.comments)) {
          todo.comments
            .filter((comment) => comment.text.trim().length > 0)
            .forEach((comment) => {
              nextItems.push({
                id: `timeline-updated-${todo.id}-${comment.id}`,
                taskId: todo.id,
                type: "updated",
                title: todo.title,
                description: comment.text.trim(),
                category: categoryLabel,
                priority: todo.priority,
                assignee: actorName,
                actorName: comment.authorName?.trim() || actorName,
                timestamp: comment.createdAt,
              });
            });
        }

        if (isTodoOverdue(todo) && typeof todo.dueAt === "string" && todo.dueAt.trim().length > 0) {
          nextItems.push({
            id: `timeline-overdue-${todo.id}-${getDayDateInput(todo.dueAt)}`,
            taskId: todo.id,
            type: "overdue",
            title: todo.title,
            description: `Due ${formatLongDate(todo.dueAt)} and still pending.`,
            category: categoryLabel,
            priority: todo.priority,
            assignee: actorName,
            actorName,
            timestamp: getDueAtEndTimestamp(todo.dueAt),
          });
        }

        return nextItems;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [profileDraft.name, sidebarProfile.name, todos]);

  const timelineEvents = useMemo(() => {
    const mergedEvents: TimelineEventItem[] = [
      ...todoActivityLog.map((item) => ({
        id: item.id,
        taskId: item.taskId,
        type: item.type,
        title: item.title,
        description: item.description,
        category: item.category,
        priority: item.priority,
        assignee: item.assignee?.trim() || item.actorName,
        actorName: item.actorName,
        timestamp: item.timestamp,
      })),
      ...timelineDerivedEvents,
    ];

    const seenKeys = new Set<string>();

    return mergedEvents
      .sort((a, b) => b.timestamp - a.timestamp)
      .filter((event) => {
        const dedupeKey =
          event.type === "updated"
            ? [
                event.type,
                event.taskId ?? "none",
                event.timestamp,
                event.title.trim().toLowerCase(),
                event.description.trim().toLowerCase(),
              ].join("::")
            : [
                event.type,
                event.taskId ?? "none",
                event.timestamp,
                event.title.trim().toLowerCase(),
              ].join("::");

        if (seenKeys.has(dedupeKey)) return false;
        seenKeys.add(dedupeKey);
        return true;
      });
  }, [timelineDerivedEvents, todoActivityLog]);

  const timelineSearchQuery = deferredTimelineSearchInput.trim().toLowerCase();

  const timelineRangeBounds = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    if (timelineRangeFilter === "today") {
      return { start: startOfToday.getTime(), end: endOfToday.getTime() };
    }

    if (timelineRangeFilter === "custom") {
      const rawStartKey = timelineCustomStartDate || getDayDateInput(Date.now());
      const rawEndKey = timelineCustomEndDate || rawStartKey;
      const rawStart = new Date(`${rawStartKey}T00:00`);
      const rawEnd = new Date(`${rawEndKey}T23:59:59.999`);
      const start = Number.isNaN(rawStart.getTime()) ? startOfToday.getTime() : rawStart.getTime();
      const end = Number.isNaN(rawEnd.getTime()) ? endOfToday.getTime() : rawEnd.getTime();

      return {
        start: Math.min(start, end),
        end: Math.max(start, end),
      };
    }

    const last7Start = new Date(startOfToday);
    last7Start.setDate(last7Start.getDate() - 6);

    return { start: last7Start.getTime(), end: endOfToday.getTime() };
  }, [timelineCustomEndDate, timelineCustomStartDate, timelineRangeFilter]);

  const timelinePeriodLabel = useMemo(
    () => formatTimelineRangeLabel(timelineRangeBounds.start, timelineRangeBounds.end),
    [timelineRangeBounds.end, timelineRangeBounds.start]
  );

  const timelineVisibleEvents = useMemo(() => {
    return timelineEvents.filter((event) => {
      const inRange = event.timestamp >= timelineRangeBounds.start && event.timestamp <= timelineRangeBounds.end;
      if (!inRange) return false;

      const matchesFilter =
        timelineActivityFilter === "all"
          ? true
          : timelineActivityFilter === "deleted"
            ? event.type === "deleted" || event.type === "overdue"
            : event.type === timelineActivityFilter;
      if (!matchesFilter) return false;

      if (!timelineSearchQuery) return true;

      const haystack = [
        event.title,
        event.description,
        event.category,
        event.assignee,
        event.actorName,
        timelineActivityMeta[event.type].label,
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(timelineSearchQuery);
    });
  }, [timelineActivityFilter, timelineEvents, timelineRangeBounds.end, timelineRangeBounds.start, timelineSearchQuery]);

  const timelineGroups = useMemo(() => {
    const groups = new Map<string, { key: string; dateValue: number; label: string; items: TimelineEventItem[] }>();

    timelineVisibleEvents.forEach((event) => {
      const dateKey = getDayDateInput(event.timestamp);
      const dateValue = new Date(`${dateKey}T00:00`).getTime();
      const nextGroup =
        groups.get(dateKey)
        ?? {
          key: dateKey,
          dateValue,
          label: getTimelineDateHeaderLabel(event.timestamp),
          items: [],
        };

      nextGroup.items.push(event);
      groups.set(dateKey, nextGroup);
    });

    return Array.from(groups.values()).sort((a, b) => b.dateValue - a.dateValue);
  }, [timelineVisibleEvents]);

  const timelineTodayKey = useMemo(() => getDayDateInput(Date.now()), []);

  const timelineSummary = useMemo(() => {
    const todayItems = timelineEvents.filter((event) => getDayDateInput(event.timestamp) === timelineTodayKey);
    const completedInView = timelineVisibleEvents.filter((event) => event.type === "completed").length;
    const createdInView = timelineVisibleEvents.filter((event) => event.type === "created").length;
    const changedInView = timelineVisibleEvents.filter((event) => event.type === "updated").length;
    const riskInView = timelineVisibleEvents.filter((event) => event.type === "deleted" || event.type === "overdue").length;

    return {
      actionsToday: todayItems.length,
      completedInView,
      createdInView,
      changedInView,
      riskInView,
    };
  }, [timelineEvents, timelineTodayKey, timelineVisibleEvents]);

  const boardWeekDates = useMemo(() => getCurrentWeekDates(selectedBoardDate), [selectedBoardDate]);
  const boardWeekRangeLabel = useMemo(
    () => formatBoardWeekRange(boardWeekDates.Monday, boardWeekDates.Sunday),
    [boardWeekDates]
  );

  const selectedBoardTasks = useMemo(
    () =>
      selectedBoardDate
        ? filteredByFilter.filter((task) => getTaskBoardDate(task) === selectedBoardDate)
        : filteredByFilter.filter((task) => resolveTodoLane(task) === selectedBoardLane),
    [filteredByFilter, selectedBoardDate, selectedBoardLane]
  );

  const selectedBoardDateLabel = selectedBoardDate ? formatLongDayDate(selectedBoardDate) : "No date selected";
  const todayBoardDate = useMemo(() => getDayDateInput(Date.now()), []);
  const boardTodayLabel = useMemo(() => formatLongDayDate(todayBoardDate), [todayBoardDate]);
  const boardVisibleTasks = useMemo(
    () => [...selectedBoardTasks].sort((a, b) => getBoardTaskSortValue(a) - getBoardTaskSortValue(b)),
    [selectedBoardTasks]
  );

  const boardWeekTaskBuckets = useMemo(
    () =>
      boardLanes.reduce(
        (acc, lane) => {
          acc[lane] = filteredByFilter
            .filter((task) => getTaskBoardDate(task) === boardWeekDates[lane])
            .sort((a, b) => getBoardTaskSortValue(a) - getBoardTaskSortValue(b));
          return acc;
        },
        {} as Record<BoardLane, Todo[]>
      ),
    [boardWeekDates, filteredByFilter]
  );

  const boardPlannerItems = useMemo(
    () =>
      boardLanes.map((lane) => {
        const tasks = boardWeekTaskBuckets[lane];
        return {
          lane,
          date: boardWeekDates[lane],
          tasks,
          high: tasks.filter((task) => task.priority === "High").length,
          medium: tasks.filter((task) => task.priority === "Medium").length,
          low: tasks.filter((task) => task.priority === "Low").length,
        };
      }),
    [boardWeekDates, boardWeekTaskBuckets]
  );

  const boardWeekTasks = useMemo(
    () => boardPlannerItems.flatMap((item) => item.tasks),
    [boardPlannerItems]
  );

  const boardAvailableDates = useMemo(
    () => [...new Set(filteredByFilter.map((task) => getTaskBoardDate(task)))].sort(),
    [filteredByFilter]
  );

  useEffect(() => {
    if (activeMode !== "board") return;
    if (boardVisibleTasks.length > 0 || boardAvailableDates.length === 0) return;
    if (selectedBoardDate !== todayBoardDate) return;

    const nextDate = boardWeekTasks[0] ? getTaskBoardDate(boardWeekTasks[0]) : boardAvailableDates[0];
    if (nextDate && nextDate !== selectedBoardDate) {
      setSelectedBoardDate(nextDate);
    }
  }, [activeMode, boardAvailableDates, boardVisibleTasks.length, boardWeekTasks, selectedBoardDate, todayBoardDate]);

  useEffect(() => {
    if (boardVisibleTasks.length === 0) {
      setSelectedBoardTaskId(null);
      return;
    }

    if (!boardVisibleTasks.some((task) => task.id === selectedBoardTaskId)) {
      setSelectedBoardTaskId(boardVisibleTasks[0].id);
    }
  }, [boardVisibleTasks, boardWeekTasks, selectedBoardTaskId]);

  const boardFocusTask = useMemo(() => {
    if (boardVisibleTasks.length === 0) return null;
    return boardVisibleTasks.find((task) => task.id === selectedBoardTaskId) ?? boardVisibleTasks[0];
  }, [boardVisibleTasks, selectedBoardTaskId]);

  const boardInsightSource = boardWeekTasks.length > 0 ? boardWeekTasks : boardVisibleTasks;

  const boardPriorityStats = useMemo(
    () =>
      boardInsightSource.reduce(
        (acc, task) => {
          if (task.priority === "High") acc.high += 1;
          else if (task.priority === "Medium") acc.medium += 1;
          else acc.low += 1;

          if (task.done) acc.done += 1;
          acc.comments += getBoardTaskCommentCount(task);
          acc.projects.add(task.project?.trim() || task.category.trim() || "General");
          return acc;
        },
        { high: 0, medium: 0, low: 0, done: 0, comments: 0, projects: new Set<string>() }
      ),
    [boardInsightSource]
  );

  const boardPriorityTotal =
    boardPriorityStats.high + boardPriorityStats.medium + boardPriorityStats.low;

  const boardCompletionPct = boardPriorityTotal
    ? clampPercentage((boardPriorityStats.done / boardPriorityTotal) * 100)
    : 0;

  const boardPriorityRingStyle = useMemo(() => {
    if (!boardPriorityTotal) {
      return { background: "conic-gradient(rgba(95, 111, 133, 0.24) 0deg 360deg)" };
    }

    const highDeg = (boardPriorityStats.high / boardPriorityTotal) * 360;
    const mediumDeg = (boardPriorityStats.medium / boardPriorityTotal) * 360;

    return {
      background: `conic-gradient(
        rgba(229, 99, 86, 0.98) 0deg ${highDeg}deg,
        rgba(237, 176, 81, 0.98) ${Math.max(0, highDeg - 0.5)}deg ${highDeg + mediumDeg}deg,
        rgba(82, 199, 132, 0.98) ${Math.max(0, highDeg + mediumDeg - 0.5)}deg 360deg
      )`,
    };
  }, [boardPriorityStats.high, boardPriorityStats.medium, boardPriorityTotal]);

  const boardFocusProgress = useMemo(() => {
    if (!boardFocusTask) return [];

    const checkpoints = boardFocusTask.checkpoints.filter(Boolean).slice(0, 3);
    if (checkpoints.length > 0) {
      return checkpoints.map((checkpoint, index) => ({
        id: `${boardFocusTask.id}-checkpoint-${index}`,
        label: checkpoint,
        tone: index === 0 ? "high" : index === 1 ? "medium" : "low",
        value: boardFocusTask.done
          ? 100
          : clampPercentage(74 - index * 22 + (boardFocusTask.priority === "High" ? 14 : 0)),
      }));
    }

    return [
      {
        id: `${boardFocusTask.id}-detail`,
        label: "High Completion",
        tone: "high",
        value: clampPercentage((boardFocusTask.done ? 62 : 24) + boardFocusTask.description.trim().length),
      },
      {
        id: `${boardFocusTask.id}-comment`,
        label: "Medium Status",
        tone: "medium",
        value: clampPercentage(18 + getBoardTaskCommentCount(boardFocusTask) * 18),
      },
      {
        id: `${boardFocusTask.id}-time`,
        label: "Low Completion",
        tone: "low",
        value: clampPercentage(
          (boardFocusTask.estimatedHours ? 28 : 10) + (boardFocusTask.dueAt ? 22 : 0) + (boardFocusTask.done ? 34 : 0)
        ),
      },
    ];
  }, [boardFocusTask]);

  const boardFocusComments = useMemo(() => {
    if (!boardFocusTask) return [];

    const fallbackAuthor =
      (typeof boardFocusTask.assignee === "string" && boardFocusTask.assignee.trim()) ||
      sidebarProfile.name.trim() ||
      "Workspace";
    const manualComments = boardFocusTask.comments
      .filter((comment) => comment.text.trim().length > 0)
      .map((comment) => ({
        id: comment.id,
        authorName: comment.authorName || fallbackAuthor,
        handle: `@${(comment.authorName || fallbackAuthor).toLowerCase().replace(/\s+/g, "")}`,
        text: comment.text,
        age: getBoardRelativeAge(comment.createdAt),
      }));
    const notePool = [
      boardFocusTask.statusNote?.trim(),
      boardFocusTask.description?.trim(),
      boardFocusTask.checkpoints.filter(Boolean)[0]
        ? `Checkpoint update: ${boardFocusTask.checkpoints.filter(Boolean)[0]}`
        : null,
    ].filter((entry): entry is string => Boolean(entry));
    const fallbackComments = notePool.map((entry, index) => ({
      id: `${boardFocusTask.id}-comment-${index}`,
      authorName: fallbackAuthor,
      handle: `@${fallbackAuthor.toLowerCase().replace(/\s+/g, "")}`,
      text: entry,
      age: getBoardRelativeAge(boardFocusTask.createdAt + index * 3600000),
    }));

    return [...manualComments, ...fallbackComments].slice(0, 4);
  }, [boardFocusTask, sidebarProfile.name]);

  const boardFocusHistory = useMemo(() => {
    if (!boardFocusTask) return [];

    return [
      `Task created ${formatDateTime(boardFocusTask.createdAt)}`,
      typeof boardFocusTask.dueAt === "string" && boardFocusTask.dueAt.trim().length > 0
        ? `Due ${formatLongDate(boardFocusTask.dueAt)}`
        : null,
      boardFocusTask.comments.length > 0 ? `${boardFocusTask.comments.length} comment updates captured.` : null,
      boardFocusTask.done && typeof boardFocusTask.completedAt === "number"
        ? `Completed ${formatDateTime(boardFocusTask.completedAt)}`
        : "Execution is still pending.",
    ].filter((entry): entry is string => Boolean(entry));
  }, [boardFocusTask]);

  const boardFocusActivityFeed = useMemo(() => {
    if (!boardFocusTask) return [];

    const commentEntries = boardFocusComments.map((comment) => ({
      id: comment.id,
      label: comment.authorName,
      meta: comment.age,
      text: comment.text,
      tone: "comment" as const,
    }));

    const historyEntries = boardFocusHistory.map((entry, index) => ({
      id: `${boardFocusTask.id}-history-${index}`,
      label: "History",
      meta: `Step ${String(index + 1).padStart(2, "0")}`,
      text: entry,
      tone: "history" as const,
    }));

    return [...commentEntries, ...historyEntries].slice(0, 6);
  }, [boardFocusComments, boardFocusHistory, boardFocusTask]);

  const activeFilterLabel =
    activeFilter === "all" ? "All Tasks" : activeFilter === "pending" ? "Pending" : "Completed";

  const taskListAssignedCount = useMemo(() => {
    const owner = sidebarProfile.name.trim().toLowerCase();
    if (!owner) return 0;
    return filteredByFilter.filter((task) => (typeof task.assignee === "string" ? task.assignee.trim().toLowerCase() : "") === owner).length;
  }, [filteredByFilter, sidebarProfile.name]);

  const taskListProjectCount = useMemo(
    () =>
      new Set(
        filteredByFilter
          .map((task) => task.project?.trim() || task.category.trim() || "")
          .filter(Boolean)
      ).size || 1,
    [filteredByFilter]
  );

  const taskListLatestActionAt = useMemo(
    () =>
      filteredByFilter.reduce((latest, task) => {
        const taskMoment = Math.max(task.createdAt, task.completedAt ?? 0);
        return taskMoment > latest ? taskMoment : latest;
      }, 0),
    [filteredByFilter]
  );

  const taskListSummaryCards = useMemo(() => {
    const totalShare = stats.total === 0 ? 0 : clampPercentage((filteredByFilter.length / stats.total) * 100);
    const assignedShare = stats.total === 0 ? 0 : clampPercentage((taskListAssignedCount / stats.total) * 100);
    const projectShare = clampPercentage(taskListProjectCount * 24);
    const recentActionLabel = taskListLatestActionAt ? formatRelativeSyncTime(taskListLatestActionAt) : "No activity";

    return [
      {
        label: activeFilterLabel,
        value: `${filteredByFilter.length}`.padStart(2, "0"),
        caption: `${filteredByFilter.length} task${filteredByFilter.length === 1 ? "" : "s"} in view`,
        progress: totalShare || (filteredByFilter.length > 0 ? 22 : 0),
        emphasis: "wide" as const,
      },
      {
        label: "Assign to me",
        value: `${taskListAssignedCount}`.padStart(2, "0"),
        caption: sidebarProfile.name.trim() || "Workspace owner",
        progress: assignedShare || (taskListAssignedCount > 0 ? 18 : 8),
      },
      {
        label: "Completion",
        value: `${stats.completionPct}%`,
        caption: `${stats.completed} done / ${stats.pending} pending`,
        progress: stats.completionPct,
      },
      {
        label: "Projects",
        value: `${taskListProjectCount}`.padStart(2, "0"),
        caption: `${stats.high + stats.medium + stats.low} priority items`,
        progress: projectShare,
      },
      {
        label: "Most recent action",
        value: recentActionLabel,
        caption: searchQuery ? `Search: "${searchInput.trim()}"` : formatRelativeSyncTime(lastSyncedAt),
        progress: taskListLatestActionAt ? 100 : 0,
        emphasis: "large" as const,
      }
    ];
  }, [
    activeFilterLabel,
    filteredByFilter,
    lastSyncedAt,
    searchInput,
    searchQuery,
    sidebarProfile.name,
    stats,
    taskListAssignedCount,
    taskListLatestActionAt,
    taskListProjectCount,
  ]);

  const groupedListTasks = useMemo(() => {
    const groups = new Map<string, { key: string; date: number; tasks: Todo[] }>();
    const sorted = [...filteredByFilter].sort((a, b) => b.createdAt - a.createdAt);

    sorted.forEach((todo) => {
      const groupDate = new Date(todo.createdAt);
      groupDate.setHours(0, 0, 0, 0);
      const timestamp = groupDate.getTime();
      const key = String(timestamp);
      const existing = groups.get(key);
      if (existing) {
        existing.tasks.push(todo);
        return;
      }

      groups.set(key, { key, date: timestamp, tasks: [todo] });
    });

    return Array.from(groups.values()).sort((a, b) => b.date - a.date);
  }, [filteredByFilter]);

  const completedArchiveTasks = useMemo(() => {
    const items = todos.filter((task) => task.done);
    const searched = !searchQuery ? items : items.filter((task) => getTodoSearchContent(task).includes(searchQuery));
    return [...searched].sort(
      (a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt) || b.createdAt - a.createdAt
    );
  }, [searchQuery, todos]);

  const completedArchiveGroups = useMemo(() => {
    const groups = new Map<string, { key: string; date: number; tasks: Todo[] }>();

    completedArchiveTasks.forEach((task) => {
      const completedStamp = task.completedAt ?? task.createdAt;
      const groupDate = new Date(completedStamp);
      groupDate.setHours(0, 0, 0, 0);
      const timestamp = groupDate.getTime();
      const key = String(timestamp);
      const current = groups.get(key);

      if (current) {
        current.tasks.push(task);
        return;
      }

      groups.set(key, { key, date: timestamp, tasks: [task] });
    });

    return Array.from(groups.values()).sort((a, b) => b.date - a.date);
  }, [completedArchiveTasks]);

  const completedArchiveSummary = useMemo(() => {
    const total = completedArchiveTasks.length;
    const weekThreshold = Date.now() - 7 * MS_PER_DAY;
    const thisWeek = completedArchiveTasks.filter((task) => (task.completedAt ?? task.createdAt) >= weekThreshold).length;
    const highPriority = completedArchiveTasks.filter((task) => task.priority === "High").length;
    const projectCount = new Set(
      completedArchiveTasks.map((task) => task.project?.trim() || task.category?.trim() || "").filter(Boolean)
    ).size;
    const commentCount = completedArchiveTasks.reduce(
      (sum, task) => sum + task.comments.filter((comment) => comment.text.trim().length > 0).length,
      0
    );
    const checkpointCount = completedArchiveTasks.reduce(
      (sum, task) => sum + task.checkpoints.filter(Boolean).length,
      0
    );
    const totalDurationMinutes = completedArchiveTasks.reduce((sum, task) => {
      if (typeof task.completedAt !== "number") return sum;
      return sum + Math.max(0, Math.floor((task.completedAt - task.createdAt) / 60000));
    }, 0);
    const avgDurationMinutes = total ? Math.round(totalDurationMinutes / total) : 0;
    const lastCompletedAt = completedArchiveTasks[0]?.completedAt ?? null;

    return {
      total,
      thisWeek,
      highPriority,
      projectCount,
      commentCount,
      checkpointCount,
      avgDurationMinutes,
      avgDurationLabel: total ? formatMinutesDuration(avgDurationMinutes) : "N/A",
      lastCompletedAt,
    };
  }, [completedArchiveTasks]);

  const completedArchiveSummaryCards = useMemo(() => {
    const completedShare = stats.total === 0 ? 0 : clampPercentage((completedArchiveSummary.total / stats.total) * 100);
    const weeklyShare =
      completedArchiveSummary.total === 0
        ? 0
        : clampPercentage((completedArchiveSummary.thisWeek / completedArchiveSummary.total) * 100);
    const priorityShare =
      completedArchiveSummary.total === 0
        ? 0
        : clampPercentage((completedArchiveSummary.highPriority / completedArchiveSummary.total) * 100);
    const averageSpeedProgress = completedArchiveSummary.total
      ? clampPercentage(Math.max(14, 100 - Math.round(completedArchiveSummary.avgDurationMinutes / 18)))
      : 0;

    return [
      {
        label: "Completed Todos",
        value: String(completedArchiveSummary.total).padStart(2, "0"),
        subtext: `${completedArchiveSummary.total} archived task${completedArchiveSummary.total === 1 ? "" : "s"}`,
        progress: completedShare || (completedArchiveSummary.total > 0 ? 26 : 0),
        accent: "accent-teal",
      },
      {
        label: "Closed This Week",
        value: String(completedArchiveSummary.thisWeek).padStart(2, "0"),
        subtext: `${completedArchiveSummary.projectCount || 0} project${completedArchiveSummary.projectCount === 1 ? "" : "s"} touched`,
        progress: weeklyShare || (completedArchiveSummary.thisWeek > 0 ? 22 : 0),
        accent: "accent-cyan",
      },
      {
        label: "Average Turnaround",
        value: completedArchiveSummary.avgDurationLabel,
        subtext: `${completedArchiveSummary.checkpointCount} checkpoints closed`,
        progress: averageSpeedProgress,
        accent: "accent-purple",
      },
      {
        label: "High Priority Wins",
        value: String(completedArchiveSummary.highPriority).padStart(2, "0"),
        subtext: `${completedArchiveSummary.commentCount} comments saved`,
        progress: priorityShare || (completedArchiveSummary.highPriority > 0 ? 20 : 0),
        accent: "accent-blue",
      },
      {
        label: "Last Completed",
        value: completedArchiveSummary.lastCompletedAt ? formatRelativeSyncTime(completedArchiveSummary.lastCompletedAt) : "Not yet",
        subtext: completedArchiveSummary.lastCompletedAt ? formatDateTime(completedArchiveSummary.lastCompletedAt) : "Finish a task to build the archive.",
        progress: completedArchiveSummary.lastCompletedAt ? 100 : 0,
        accent: "accent-teal",
      },
    ];
  }, [completedArchiveSummary, stats.total]);

  const dashboardOverview = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayKey = getDayDateInput(startOfToday);

    const buildDateWindow = (startOffset: number, count: number) =>
      Array.from({ length: count }, (_, index) => {
        const nextDate = new Date(startOfToday);
        nextDate.setDate(startOfToday.getDate() + startOffset + index);
        return getDayDateInput(nextDate);
      });

    const last30Keys = buildDateWindow(-29, 30);
    const previous30Keys = buildDateWindow(-59, 30);
    const last28Keys = buildDateWindow(-27, 28);
    const completionCountMap = new Map<string, number>();
    const activityCountMap = new Map<string, number>();
    const incrementMapCount = (map: Map<string, number>, key: string) => {
      map.set(key, (map.get(key) ?? 0) + 1);
    };

    todos.forEach((todo) => {
      incrementMapCount(activityCountMap, getDayDateInput(todo.createdAt));

      if (typeof todo.completedAt === "number") {
        const completedKey = getDayDateInput(todo.completedAt);
        incrementMapCount(completionCountMap, completedKey);
        incrementMapCount(activityCountMap, completedKey);
      }
    });

    timelineEvents.forEach((event) => {
      if (event.type === "deleted" || event.type === "overdue") return;
      incrementMapCount(activityCountMap, getDayDateInput(event.timestamp));
    });

    const activeDateKeys = Array.from(activityCountMap.entries())
      .filter(([, count]) => count > 0)
      .map(([dateKey]) => dateKey)
      .sort();

    const streaks = calculateDashboardStreaks(activeDateKeys);
    const projectCount = new Set(
      todos
        .map((todo) => todo.project?.trim() || todo.category?.trim() || "")
        .filter(Boolean)
    ).size;

    const buildWindowSummary = (dateKeys: string[]) => {
      const dateSet = new Set(dateKeys);
      const completed = todos.filter(
        (todo) => typeof todo.completedAt === "number" && dateSet.has(getDayDateInput(todo.completedAt))
      ).length;
      const activeTasks = todos.filter((todo) => {
        const createdKey = getDayDateInput(todo.createdAt);
        const completedKey = typeof todo.completedAt === "number" ? getDayDateInput(todo.completedAt) : null;
        const dueKey =
          typeof todo.dueAt === "string" && todo.dueAt.trim().length > 0 ? getDayDateInput(todo.dueAt) : null;

        return dateSet.has(createdKey) || (completedKey ? dateSet.has(completedKey) : false) || (dueKey ? dateSet.has(dueKey) : false);
      }).length;
      const activeDays = dateKeys.filter((dateKey) => (activityCountMap.get(dateKey) ?? 0) > 0).length;
      const highPriorityWins = todos.filter(
        (todo) =>
          todo.priority === "High" &&
          typeof todo.completedAt === "number" &&
          dateSet.has(getDayDateInput(todo.completedAt))
      ).length;
      const completionPct = activeTasks === 0 ? 0 : clampPercentage((completed / activeTasks) * 100);
      const productivityScore = clampPercentage(
        completionPct * 0.55 +
          (activeDays / Math.max(dateKeys.length, 1)) * 100 * 0.25 +
          Math.min(highPriorityWins * 12, 100) * 0.2
      );

      return {
        completed,
        activeTasks,
        activeDays,
        highPriorityWins,
        completionPct,
        productivityScore,
      };
    };

    const monthlySummary = buildWindowSummary(last30Keys);
    const previousMonthlySummary = buildWindowSummary(previous30Keys);
    const productivityDelta =
      previousMonthlySummary.productivityScore === 0
        ? monthlySummary.productivityScore - previousMonthlySummary.productivityScore
        : Math.round(
            ((monthlySummary.productivityScore - previousMonthlySummary.productivityScore)
              / previousMonthlySummary.productivityScore)
              * 100
          );

    const monthlyComparison =
      productivityDelta > 0
        ? `↑ ${Math.abs(productivityDelta)}% better than last month`
        : productivityDelta < 0
          ? `↓ ${Math.abs(productivityDelta)}% lower than last month`
          : "Flat versus last month";

    const dailySeries = last30Keys.map((dateKey) => ({
      dateKey,
      label: new Date(`${dateKey}T00:00`).toLocaleDateString([], { month: "short", day: "numeric" }),
      shortLabel: new Date(`${dateKey}T00:00`).toLocaleDateString([], { day: "numeric" }),
      value: completionCountMap.get(dateKey) ?? 0,
    }));

    const chartPaths = buildDashboardTrendPaths(
      dailySeries.map((item) => item.value),
      420,
      180
    );
    const peakDay = dailySeries.reduce(
      (best, item) => (item.value > best.value ? item : best),
      dailySeries[0] ?? { label: "No data", shortLabel: "", value: 0 }
    );
    const chartGuideValues = Array.from(
      new Set(
        [chartPaths.maxValue, Math.ceil(chartPaths.maxValue * 0.66), Math.ceil(chartPaths.maxValue * 0.33)].filter(
          (value) => value > 0
        )
      )
    ).sort((a, b) => b - a);

    const completedHighPriorityAllTime = todos.filter((todo) => todo.done && todo.priority === "High").length;
    const careerXp = stats.completed * 45 + projectCount * 30 + activeDateKeys.length * 8 + streaks.longest * 14;
    const levelCap = 10;
    const xpPerLevel = 250;
    const level = Math.min(levelCap, Math.max(1, Math.floor(careerXp / xpPerLevel) + 1));
    const levelFloor = (level - 1) * xpPerLevel;
    const levelProgressPct =
      level >= levelCap ? 100 : clampPercentage(((careerXp - levelFloor) / xpPerLevel) * 100);
    const xpToNextLevel = level >= levelCap ? 0 : level * xpPerLevel - careerXp;

    const badges = [
      {
        label: "5 Day Streak",
        icon: "bi-fire",
        achieved: streaks.longest >= 5,
        helper:
          streaks.longest >= 5
            ? `${streaks.longest}-day streak achieved`
            : `${Math.max(0, 5 - streaks.current)} more day${Math.max(0, 5 - streaks.current) === 1 ? "" : "s"} to unlock`,
      },
      {
        label: "First 100 Tasks Completed",
        icon: "bi-trophy",
        achieved: stats.completed >= 100,
        helper: stats.completed >= 100 ? "Century milestone unlocked" : `${stats.completed}/100 completed`,
      },
      {
        label: "High Impact Closer",
        icon: "bi-stars",
        achieved: completedHighPriorityAllTime >= 20,
        helper:
          completedHighPriorityAllTime >= 20
            ? `${completedHighPriorityAllTime} high priority wins logged`
            : `${completedHighPriorityAllTime}/20 high priority wins`,
      },
    ];

    const distributionBase = [
      { label: "Work", color: "#2dd4bf" },
      { label: "Learning", color: "#f59e0b" },
      { label: "Personal", color: "#60a5fa" },
    ] as const;
    const distributionCounts = {
      Work: 0,
      Learning: 0,
      Personal: 0,
    };

    todos.forEach((todo) => {
      distributionCounts[getDashboardTaskBucket(todo)] += 1;
    });

    const distributionTotal = Object.values(distributionCounts).reduce((sum, value) => sum + value, 0);
    let distributionCursor = 0;
    const distribution = distributionBase.map((item, index) => {
      const count = distributionCounts[item.label];
      const rawShare = distributionTotal === 0 ? 0 : (count / distributionTotal) * 100;
      const start = distributionCursor;
      distributionCursor += rawShare;

      return {
        ...item,
        count,
        share: clampPercentage(rawShare),
        start,
        end: index === distributionBase.length - 1 ? 100 : distributionCursor,
      };
    });

    const distributionStyle = distributionTotal
      ? {
          background: `conic-gradient(${distribution
            .map((item) => `${item.color} ${item.start}% ${item.end}%`)
            .join(", ")})`,
        }
      : {
          background: "conic-gradient(rgba(76, 95, 122, 0.45) 0deg 360deg)",
        };

    const getTaskDueDistance = (todo: Todo) => {
      if (!todo.dueAt) return Number.POSITIVE_INFINITY;
      const dueDate = new Date(todo.dueAt);
      dueDate.setHours(0, 0, 0, 0);
      return Math.round((dueDate.getTime() - startOfToday.getTime()) / MS_PER_DAY);
    };

    const getPriorityWeight = (priority: Priority) => {
      if (priority === "High") return 100;
      if (priority === "Medium") return 60;
      return 30;
    };

    const pendingTasks = todos.filter((todo) => !todo.done);
    const focusTasks = [...pendingTasks]
      .sort((a, b) => {
        const aDistance = getTaskDueDistance(a);
        const bDistance = getTaskDueDistance(b);
        const aScore =
          getPriorityWeight(a.priority)
          + (isTodoOverdue(a) ? 60 : 0)
          + (aDistance <= 1 ? 35 : aDistance <= 3 ? 18 : 0);
        const bScore =
          getPriorityWeight(b.priority)
          + (isTodoOverdue(b) ? 60 : 0)
          + (bDistance <= 1 ? 35 : bDistance <= 3 ? 18 : 0);

        return bScore - aScore || aDistance - bDistance || b.createdAt - a.createdAt;
      })
      .slice(0, 3);

    const upcomingTasks = [...pendingTasks]
      .filter((todo) => typeof todo.dueAt === "string" && todo.dueAt.trim().length > 0)
      .sort((a, b) => {
        const aDue = new Date(a.dueAt as string).getTime();
        const bDue = new Date(b.dueAt as string).getTime();
        return aDue - bDue || getPriorityWeight(b.priority) - getPriorityWeight(a.priority);
      })
      .slice(0, 5);

    const recentActivity = timelineEvents
      .filter((event) => event.type !== "deleted" && event.type !== "overdue")
      .slice(0, 6)
      .map((event) => ({
        ...event,
        meta: timelineActivityMeta[event.type],
        relativeTime: formatRelativeSyncTime(event.timestamp),
      }));

    const heatmapMax = Math.max(...last28Keys.map((dateKey) => completionCountMap.get(dateKey) ?? 0), 0);
    const heatmapCells = last28Keys.map((dateKey) => {
      const value = completionCountMap.get(dateKey) ?? 0;
      return {
        dateKey,
        value,
        level: getDashboardHeatLevel(value, heatmapMax),
        label: new Date(`${dateKey}T00:00`).toLocaleDateString([], {
          month: "short",
          day: "numeric",
          weekday: "short",
        }),
      };
    });

    const dashboardCalendarDays = buildCalendarMonthDays(todayKey).map((day) => ({
      ...day,
      activityCount: activityCountMap.get(day.dateKey) ?? 0,
    }));

    const assignedTodayIds = new Set<number>();
    const pendingTodayIds = new Set<number>();

    todos.forEach((todo) => {
      const createdToday = getDayDateInput(todo.createdAt) === todayKey;
      const dueToday = typeof todo.dueAt === "string" && getDayDateInput(todo.dueAt) === todayKey;
      const completedToday = typeof todo.completedAt === "number" && getDayDateInput(todo.completedAt) === todayKey;

      if (createdToday || dueToday || completedToday) {
        assignedTodayIds.add(todo.id);
      }

      if ((createdToday || dueToday) && !todo.done) {
        pendingTodayIds.add(todo.id);
      }
    });

    const completedToday = todos.filter(
      (todo) => typeof todo.completedAt === "number" && getDayDateInput(todo.completedAt) === todayKey
    ).length;
    const assignedToday = assignedTodayIds.size;
    const pendingToday = pendingTodayIds.size;
    const efficiency = assignedToday ? clampPercentage((completedToday / assignedToday) * 100) : 0;

    const latestActivityAt = timelineEvents[0]?.timestamp ?? null;
    const currentStreak = streaks.current;
    const longestStreak = streaks.longest;
    const consistencyPct = longestStreak === 0 ? 0 : clampPercentage((currentStreak / longestStreak) * 100);

    return {
      heroStats: [
        {
          label: "Monthly wins",
          value: String(monthlySummary.completed).padStart(2, "0"),
          helper: `${monthlySummary.activeDays} active days in the last 30 days`,
        },
        {
          label: "Career XP",
          value: `${careerXp}`,
          helper: level >= levelCap ? "Max level reached" : `${xpToNextLevel} XP to level ${level + 1}`,
        },
        {
          label: "Live streak",
          value: `${currentStreak} days`,
          helper: latestActivityAt ? `Last action ${formatRelativeSyncTime(latestActivityAt)}` : "Start logging activity",
        },
        {
          label: "Projects tracked",
          value: String(projectCount).padStart(2, "0"),
          helper: `${stats.completed} completed across your career board`,
        },
      ],
      monthly: {
        ...monthlySummary,
        comparison: monthlyComparison,
        comparisonDirection: productivityDelta > 0 ? "up" : productivityDelta < 0 ? "down" : "flat",
        dailySeries,
        peakDayLabel:
          peakDay.value > 0 ? `${peakDay.label} · ${peakDay.value} completed` : "No completed tasks in this window",
        chartPaths,
        chartGuideValues,
      },
      lifetime: {
        totalCompleted: stats.completed,
        totalProjects: projectCount,
        totalActiveDays: activeDateKeys.length,
        currentStreak,
        longestStreak,
        level,
        levelCap,
        careerXp,
        levelProgressPct,
        xpToNextLevel,
        badges,
      },
      heatmap: {
        cells: heatmapCells,
        maxValue: heatmapMax,
        rangeLabel: `${formatCardDate(last28Keys[0])} - ${formatCardDate(last28Keys[last28Keys.length - 1])}`,
      },
      consistency: {
        currentStreak,
        longestStreak,
        consistencyPct,
      },
      distribution: {
        items: distribution,
        style: distributionStyle,
      },
      recentActivity,
      upcomingTasks,
      focusTasks,
      miniCalendar: {
        label: formatMonthYearLabel(todayKey),
        days: dashboardCalendarDays,
      },
      performance: {
        completedToday,
        pendingToday,
        assignedToday,
        efficiency,
      },
    };
  }, [stats, timelineEvents, todos]);

  const profileInitial = useMemo(() => getProfileInitial(sidebarProfile.name), [sidebarProfile.name]);
  const isSidebarCollapsed = sidebarCollapsed && !isMobileViewport;
  const isSidebarDrawerOpen = mobileSidebarOpen && isMobileViewport;
  const isSidebarVisible = isMobileViewport ? isSidebarDrawerOpen : !isSidebarCollapsed;

  const projectRows = useMemo(() => {
    const projectCountMap = new Map<string, number>();
    todos.forEach((todo) => {
      const projectName = todo.project && todo.project.trim().length > 0 ? todo.project.trim() : "Getting Started";
      projectCountMap.set(projectName, (projectCountMap.get(projectName) ?? 0) + 1);
    });

    const rows = Array.from(projectCountMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
      .slice(0, 6);

    if (rows.length === 0) {
      return [{ name: "Getting Started", count: 0 }];
    }

    return rows;
  }, [todos]);

  const closeWorkspaceModal = () => {
    if (workspaceModal === "settings" && isMobileViewport) {
      flushMobileSettingsAutosave();
    }

    if (standaloneSettings && onStandaloneSettingsClose) {
      void onStandaloneSettingsClose();
      return;
    }
    setWorkspaceModal(null);
  };

  const closeSidebarChrome = () => {
    setProfileMenuOpen(false);
    setMobileSidebarOpen(false);
  };

  const openAddTaskModal = () => {
    setErrors({});
    setMobileSidebarOpen(false);
    setWorkspaceModal("addTask");
  };

  const openNotifications = () => {
    setMobileSidebarOpen(false);
    toast("Notifications panel coming soon.");
  };

  const openSettingsModal = (tab: SettingsCenterTab = "general") => {
    closeSidebarChrome();
    setProfileDraft(readWorkspaceProfile());
    setSettingsDraft(readWorkspaceSettings());
    setSettingsSavedAt("");
    setSettingsSearchQuery("");
    setSettingsIntegrationsView("installed");
    setSettingsMobileContentView(isMobileViewport);
    setSettingsCenterTab(tab);
    settingsMobileAutoSaveSkipRef.current = true;
    if (settingsAutoSaveTimeoutRef.current !== null) {
      window.clearTimeout(settingsAutoSaveTimeoutRef.current);
      settingsAutoSaveTimeoutRef.current = null;
    }
    setWorkspaceModal("settings");
  };

  const openSettingsPage = (tab: SettingsCenterTab = "general") => {
    openSettingsModal(tab);
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: {
        openSettingsModal: true,
        settingsTab: tab,
      } satisfies WorkspaceRouteLocationState,
    });
  };

  useEffect(() => {
    if (!standaloneSettings) return;

    openSettingsModal(initialSettingsTab);
  }, [initialSettingsTab, standaloneSettings]);

  useEffect(() => {
    if (standaloneSettings || !shouldOpenSettingsModalFromRoute) return;

    openSettingsModal(requestedSettingsTabFromRoute);
    navigate(`${location.pathname}${location.search}`, { replace: true });
  }, [
    location.pathname,
    location.search,
    navigate,
    requestedSettingsTabFromRoute,
    shouldOpenSettingsModalFromRoute,
    standaloneSettings,
  ]);

  const openActivityLog = () => {
    closeSidebarChrome();
    setActiveMode("timeline");
  };

  const openAddTeam = () => {
    closeSidebarChrome();
    toast("Team setup panel is coming soon.");
  };

  const openWhatsNew = () => {
    closeSidebarChrome();
    toast("Latest update: premium task cards and board calendar are now live.");
  };

  const openTryProOffer = () => {
    closeSidebarChrome();
    toast("Pro workspace upgrade panel is coming soon.");
  };

  const printWorkspace = () => {
    closeSidebarChrome();
    window.print();
  };

  const syncWorkspace = async () => {
    setMenuSyncing(true);
    const nextTodos = await syncTodosFromApi(todos);
    if (nextTodos) {
      dispatch({ type: "REORDER", payload: nextTodos });
      toast.success("Workspace synced.");
    } else {
      toast.error("Sync failed. Please try again.");
    }
    setMenuSyncing(false);
    closeSidebarChrome();
  };

  const logoutWorkspace = () => {
    clearPersistedAuth();

    ["token", "access_token", "accessToken"].forEach((key) => {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    });

    try {
      window.dispatchEvent(new StorageEvent("storage", { key: "auth" }));
    } catch {
      // Ignore if browser blocks manual storage event construction.
    }

    closeSidebarChrome();
    window.location.assign("/");
  };

  const handleSidebarToggle = () => {
    if (isMobileViewport) {
      closeSidebarChrome();
      return;
    }

    setProfileMenuOpen(false);
    setSidebarCollapsed((prev) => !prev);
  };

  const handleSidebarDrawerToggle = () => {
    setProfileMenuOpen(false);
    if (isMobileViewport) {
      setMobileSidebarOpen((prev) => !prev);
      return;
    }

    setSidebarCollapsed((prev) => !prev);
  };

  const handleSidebarModeSelect = (mode: WorkspaceMode) => {
    setActiveMode(mode);
    if (mode === "list") {
      setActiveFilter("all");
    }
    if (mode === "completed") {
      setActiveFilter("completed");
    }
    closeSidebarChrome();
  };

  const handleSidebarProjectSelect = (projectName: string) => {
    setActiveMode("list");
    setActiveFilter("all");
    setSearchInput(projectName);
    closeSidebarChrome();
  };

  const updateProfileDraft = (key: keyof WorkspaceProfileData, value: string) => {
    setProfileDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleProfileAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const encoded = await fileToDataUrl(file);
      setProfileDraft((prev) => ({ ...prev, avatar: encoded }));
    } catch {
      toast.error("Avatar upload failed. Please try again.");
    } finally {
      event.target.value = "";
    }
  };

  const formatSettingsSavedTime = () =>
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

  const resolveWorkspacePreferenceSnapshot = (
    payload: Record<string, unknown>,
    fallbackProfile: WorkspaceProfileData,
    fallbackSettings: WorkspaceSettingsState
  ) => {
    const profilePayload = asRecord(payload.profile) ?? {};
    const settingsPayload = asRecord(payload.settings) ?? {};
    const userPayload = asRecord(payload.user);

    const profile = sanitizeWorkspaceProfile({
      ...fallbackProfile,
      ...(profilePayload as Partial<WorkspaceProfileData>),
      name:
        getFirstTextValue(profilePayload.name, userPayload?.name, fallbackProfile.name) ?? fallbackProfile.name,
      email: getFirstTextValue(profilePayload.email, userPayload?.email, fallbackProfile.email) ?? fallbackProfile.email,
      avatar:
        getFirstTextValue(profilePayload.avatar, userPayload?.avatar, fallbackProfile.avatar) ?? fallbackProfile.avatar,
    });
    const settings = sanitizeWorkspaceSettings({
      ...fallbackSettings,
      ...(settingsPayload as Partial<WorkspaceSettingsState>),
    });

    return { profile, settings };
  };

  const persistWorkspaceProfile = (
    nextProfile: WorkspaceProfileData,
    options: { syncDraft?: boolean; notify?: boolean } = {}
  ) => {
    const { syncDraft = true, notify = true } = options;
    const normalized = sanitizeWorkspaceProfile(nextProfile);
    writeScopedStorageItem("app-profile", JSON.stringify(normalized));
    setSidebarProfile({ name: normalized.name, avatar: normalized.avatar });
    if (syncDraft) {
      setProfileDraft(normalized);
    }
    if (notify) {
      window.dispatchEvent(new CustomEvent("app-profile-updated", { detail: normalized }));
    }
    return normalized;
  };

  const persistWorkspaceSettings = (
    nextSettings: WorkspaceSettingsState,
    options: { notify?: boolean } = {}
  ) => {
    const { notify = true } = options;
    const normalizedSettings = sanitizeWorkspaceSettings(nextSettings);
    writeScopedStorageItem("app-settings", JSON.stringify(normalizedSettings));
    applyWorkspaceVisualSettings(normalizedSettings);
    setSettingsSavedAt(formatSettingsSavedTime());
    if (notify) {
      window.dispatchEvent(new CustomEvent("app-settings-updated", { detail: normalizedSettings }));
    }
  };

  const loadWorkspacePreferencesFromApi = async () => {
    try {
      const response = await apiClient.get(apiRoutes.workspacePreferences);
      const payload = asRecord(response.data?.data) ?? asRecord(response.data);
      if (!payload) return;

      const nextSnapshot = resolveWorkspacePreferenceSnapshot(
        payload,
        readWorkspaceProfile(),
        readWorkspaceSettings()
      );

      persistWorkspaceProfile(nextSnapshot.profile, { syncDraft: false, notify: false });
      persistWorkspaceSettings(nextSnapshot.settings, { notify: false });
      setProfileDraft(nextSnapshot.profile);
      setSettingsDraft(nextSnapshot.settings);
    } catch {
      // Keep using the scoped local cache if the preference endpoint is temporarily unavailable.
    }
  };

  const syncWorkspacePreferencesToApi = async (
    nextProfile: WorkspaceProfileData,
    nextSettings: WorkspaceSettingsState,
    options: { includeProfile?: boolean; includeSettings?: boolean; silent?: boolean } = {}
  ): Promise<boolean> => {
    const { includeProfile = true, includeSettings = true, silent = false } = options;

    try {
      const payload: Record<string, unknown> = {};
      if (includeProfile) {
        payload.profile = sanitizeWorkspaceProfile(nextProfile);
      }
      if (includeSettings) {
        payload.settings = sanitizeWorkspaceSettings(nextSettings);
      }

      if (Object.keys(payload).length === 0) {
        return true;
      }

      const response = await apiClient.put(apiRoutes.workspacePreferences, payload);
      const responsePayload = asRecord(response.data?.data) ?? asRecord(response.data);
      const nextSnapshot = responsePayload
        ? resolveWorkspacePreferenceSnapshot(responsePayload, nextProfile, nextSettings)
        : {
            profile: sanitizeWorkspaceProfile(nextProfile),
            settings: sanitizeWorkspaceSettings(nextSettings),
          };

      persistWorkspaceProfile(nextSnapshot.profile, { syncDraft: false, notify: false });
      persistWorkspaceSettings(nextSnapshot.settings, { notify: false });
      setProfileDraft(nextSnapshot.profile);
      setSettingsDraft(nextSnapshot.settings);

      if (includeProfile) {
        window.dispatchEvent(new CustomEvent("app-profile-updated", { detail: nextSnapshot.profile }));
      }
      if (includeSettings) {
        window.dispatchEvent(new CustomEvent("app-settings-updated", { detail: nextSnapshot.settings }));
      }

      return true;
    } catch {
      if (!silent) {
        toast.error("Settings sync failed. Please try again.");
      }
      return false;
    }
  };

  const flushMobileSettingsAutosave = () => {
    if (settingsAutoSaveTimeoutRef.current !== null) {
      window.clearTimeout(settingsAutoSaveTimeoutRef.current);
      settingsAutoSaveTimeoutRef.current = null;
    }

    if (workspaceModal !== "settings" || !isMobileViewport) {
      return;
    }

    persistWorkspaceProfile(profileDraft, { syncDraft: false, notify: false });
    persistWorkspaceSettings(settingsDraft, { notify: false });
    void syncWorkspacePreferencesToApi(profileDraft, settingsDraft, {
      includeProfile: true,
      includeSettings: true,
      silent: true,
    });
  };

  const saveProfileModal = async () => {
    const saved = await syncWorkspacePreferencesToApi(profileDraft, settingsDraft, {
      includeProfile: true,
      includeSettings: false,
    });
    if (!saved) return;

    toast.success("Profile updated.");
    closeWorkspaceModal();
  };

  const resetProfileModal = () => {
    setProfileDraft(defaultWorkspaceProfile);
  };

  const updateSettingsDraft = (key: keyof WorkspaceSettingsState, value: string | boolean) => {
    setSettingsDraft((prev) => ({ ...prev, [key]: value } as WorkspaceSettingsState));
  };

  const saveSettingsModal = async () => {
    const saved = await syncWorkspacePreferencesToApi(profileDraft, settingsDraft, {
      includeProfile: true,
      includeSettings: true,
    });
    if (!saved) return;

    toast.success("Settings updated.");
    closeWorkspaceModal();
  };

  const resetSettingsModal = () => {
    setSettingsDraft({ ...defaultWorkspaceSettings });
  };

  useEffect(() => {
    if (workspaceModal !== "settings" || !isMobileViewport) {
      settingsMobileAutoSaveSkipRef.current = true;
      if (settingsAutoSaveTimeoutRef.current !== null) {
        window.clearTimeout(settingsAutoSaveTimeoutRef.current);
        if (workspaceModal === "settings") {
          persistWorkspaceProfile(profileDraft, { syncDraft: false, notify: false });
          persistWorkspaceSettings(settingsDraft, { notify: false });
        }
        settingsAutoSaveTimeoutRef.current = null;
      }
      return;
    }

    if (settingsMobileAutoSaveSkipRef.current) {
      settingsMobileAutoSaveSkipRef.current = false;
      return;
    }

    if (settingsAutoSaveTimeoutRef.current !== null) {
      window.clearTimeout(settingsAutoSaveTimeoutRef.current);
    }

    settingsAutoSaveTimeoutRef.current = window.setTimeout(() => {
      persistWorkspaceProfile(profileDraft, { syncDraft: false, notify: false });
      persistWorkspaceSettings(settingsDraft, { notify: false });
      settingsAutoSaveTimeoutRef.current = null;
    }, 220);

    return () => {
      if (settingsAutoSaveTimeoutRef.current !== null) {
        window.clearTimeout(settingsAutoSaveTimeoutRef.current);
        settingsAutoSaveTimeoutRef.current = null;
      }
    };
  }, [isMobileViewport, profileDraft, settingsDraft, workspaceModal]);

  const startEdit = (todo: Todo) => {
    setEditingTodo({
      ...todo,
      checkpoints: [...todo.checkpoints],
      tags: [...todo.tags],
    });
  };

  const saveEdit = async () => {
    if (!editingTodo) return;
    if (!editingTodo.title.trim() || !editingTodo.category.trim()) {
      toast.error("Title and category are required.");
      return;
    }

    const nextTodo = normalizeTodo({
      ...editingTodo,
      title: editingTodo.title.trim(),
      description: editingTodo.description.trim(),
      category: editingTodo.category.trim(),
      assignee: (editingTodo.assignee ?? "").trim(),
      project: (editingTodo.project ?? "").trim(),
      department: (editingTodo.department ?? "").trim(),
      clientName: (editingTodo.clientName ?? "").trim(),
      estimatedHours: (editingTodo.estimatedHours ?? "").trim(),
      location: (editingTodo.location ?? "").trim(),
      statusNote: (editingTodo.statusNote ?? "").trim(),
      updatedAt: Date.now(),
      checkpoints: editingTodo.checkpoints.map((c) => c.trim()).filter(Boolean),
      tags: editingTodo.tags.map((t) => t.trim()).filter(Boolean),
    });

    appendTimelineActivity(
      createTimelineActivityRecord("updated", nextTodo, {
        description:
          nextTodo.statusNote?.trim()
          || nextTodo.description?.trim()
          || "Task details, metadata, or planning notes were updated.",
      })
    );
    todosRef.current = todosRef.current.map((todo) => (todo.id === nextTodo.id ? nextTodo : todo));
    dispatch({ type: "UPDATE", payload: nextTodo });
    setEditingTodo(null);

    const savedTodo = await saveTodoRemotely(nextTodo);
    if (savedTodo) {
      dispatch({ type: "UPDATE", payload: savedTodo });
      toast.success("Task updated.");
      return;
    }

    toast("Task updated locally. Server sync is not available right now.");
  };

  const updateEditingTodoEstimatedDuration = (part: "hours" | "minutes", value: string) => {
    setEditingTodo((current) => {
      if (!current) return current;

      const parsed = parseEstimatedDurationParts(current.estimatedHours);
      const nextHours =
        part === "hours"
          ? Number.parseInt(value || "0", 10)
          : parsed.estimatedHours ?? 0;
      const nextMinutes =
        part === "minutes"
          ? Number.parseInt(value || "0", 10)
          : parsed.estimatedMinutes ?? 0;

      return {
        ...current,
        estimatedHours: composeEstimatedDurationValue(
          Number.isFinite(nextHours) ? nextHours : 0,
          Number.isFinite(nextMinutes) ? nextMinutes : 0
        ) ?? "",
      };
    });
  };

  const openTaskAttachmentPicker = (todoId: number) => {
    setTaskAttachmentTargetId(todoId);
    taskAttachmentInputRef.current?.click();
  };

  const handleTaskDetailAttachmentUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const targetId = taskAttachmentTargetId;
    event.target.value = "";

    if (files.length === 0 || targetId === null) return;

    const sourceTodo = todos.find((todo) => todo.id === targetId);
    if (!sourceTodo) {
      setTaskAttachmentTargetId(null);
      return;
    }

    setTaskAttachmentUploadingId(targetId);

    try {
      const optimisticAttachments = await Promise.all(
        files.map((file, index) => buildTodoAttachmentFromFile(file, `${sourceTodo.title || "task"}-attachment-${index + 1}`))
      );

      if (optimisticAttachments.length === 0) {
        toast.error("No valid attachments were selected.");
        return;
      }

      const nextTodo = normalizeTodo({
        ...sourceTodo,
        updatedAt: Date.now(),
        attachments: [...readTodoAttachmentList(sourceTodo), ...optimisticAttachments],
      });

      appendTimelineActivity(
        createTimelineActivityRecord("updated", nextTodo, {
          description: `${optimisticAttachments.length} attachment${optimisticAttachments.length === 1 ? "" : "s"} added to the task.`,
        })
      );
      todosRef.current = todosRef.current.map((todo) => (todo.id === nextTodo.id ? nextTodo : todo));
      dispatch({ type: "UPDATE", payload: nextTodo });

      const savedTodo = await saveTodoRemotely(nextTodo, { attachmentFiles: files });
      if (savedTodo) {
        dispatch({ type: "UPDATE", payload: savedTodo });
        toast.success(`Added ${optimisticAttachments.length} attachment${optimisticAttachments.length === 1 ? "" : "s"}.`);
        return;
      }

      toast("Attachments were added locally. Server sync is not available right now.");
    } catch {
      toast.error("Attachment upload failed. Please try again.");
    } finally {
      setTaskAttachmentTargetId(null);
      setTaskAttachmentUploadingId(null);
    }
  };

  const handleTaskAttachmentRemove = async (todoId: number, attachment: TodoAttachment) => {
    const sourceTodo = todos.find((todo) => todo.id === todoId);
    if (!sourceTodo) return;

    const targetKey = getTodoAttachmentKey(attachment);
    setTaskAttachmentRemovingKey(targetKey);

    try {
      const nextTodo = normalizeTodo({
        ...sourceTodo,
        updatedAt: Date.now(),
        attachments: readTodoAttachmentList(sourceTodo).filter((item) => getTodoAttachmentKey(item) !== targetKey),
      });

      if (attachmentPreviewTarget && getTodoAttachmentKey(attachmentPreviewTarget) === targetKey) {
        setAttachmentPreviewTarget(null);
      }

      revokeTemporaryAttachmentUrl(attachment.url);

      appendTimelineActivity(
        createTimelineActivityRecord("updated", nextTodo, {
          description: `${attachment.name} was removed from the task attachments.`,
        })
      );
      todosRef.current = todosRef.current.map((todo) => (todo.id === nextTodo.id ? nextTodo : todo));
      dispatch({ type: "UPDATE", payload: nextTodo });

      const savedTodo = await saveTodoRemotely(nextTodo);
      if (savedTodo) {
        dispatch({ type: "UPDATE", payload: savedTodo });
        toast.success("Attachment removed.");
        return;
      }

      toast("Attachment removed locally. Server sync is not available right now.");
    } finally {
      setTaskAttachmentRemovingKey(null);
    }
  };

  const showAddLayout = view === "add" || (view === "tasks" && activeMode === "addTask");

  const handleTaskToggle = async (todoId: number) => {
    const sourceTodo = todos.find((todo) => todo.id === todoId);
    if (!sourceTodo) return;

    const nextDone = !sourceTodo.done;
    const nextTodo = normalizeTodo({
      ...sourceTodo,
      done: nextDone,
      updatedAt: Date.now(),
      completedAt: nextDone ? Date.now() : undefined,
    });

    appendTimelineActivity(
      createTimelineActivityRecord(nextDone ? "completed" : "updated", nextTodo, {
        timestamp: nextDone ? nextTodo.completedAt : Date.now(),
        description: nextDone ? "Task marked complete and removed from the active queue." : "Task moved back into active work.",
      })
    );
    todosRef.current = todosRef.current.map((todo) => (todo.id === nextTodo.id ? nextTodo : todo));
    dispatch({ type: "UPDATE", payload: nextTodo });

    const savedTodo = await saveTodoRemotely(nextTodo);
    if (savedTodo) {
      dispatch({
        type: "UPDATE",
        payload: normalizeTodo({
          ...savedTodo,
          done: nextDone,
          updatedAt: nextTodo.updatedAt,
          completedAt: nextDone ? savedTodo.completedAt ?? nextTodo.completedAt : undefined,
        }),
      });
      return;
    }

    toast("Task status updated locally. Server sync is not available right now.");
  };

  const handleTaskEdit = (todo: Todo) => {
    if (todo.done) return;
    startEdit(todo);
  };

  const openCommentComposer = (todo: Todo) => {
    setCommentTarget(todo);
    setCommentText("");
    setCommentSubmitting(false);
  };

  const submitTaskComment = async () => {
    if (!commentTarget) return;

    const nextText = commentText.trim();
    if (!nextText) {
      toast.error("Comment cannot be empty.");
      return;
    }

    setCommentSubmitting(true);
    const profileEmail = profileDraft.email.trim().toLowerCase();
    const profileAvatar = sidebarProfile.avatar.trim() || profileDraft.avatar.trim();
    const comment = normalizeTodoComment({
      authorName: sidebarProfile.name.trim() || commentTarget.assignee || "Workspace",
      authorEmail: profileEmail || undefined,
      authorAvatar: profileAvatar || undefined,
      text: nextText,
      createdAt: Date.now(),
    });
    const sourceTodo = todos.find((todo) => todo.id === commentTarget.id) ?? commentTarget;
    const nextTodo = normalizeTodo({
      ...sourceTodo,
      updatedAt: Date.now(),
      comments: [comment, ...sourceTodo.comments],
    });

    appendTimelineActivity(
      createTimelineActivityRecord("updated", nextTodo, {
        actorName: comment.authorName,
        timestamp: comment.createdAt,
        description: comment.text,
      })
    );
    todosRef.current = todosRef.current.map((todo) => (todo.id === nextTodo.id ? nextTodo : todo));
    dispatch({ type: "UPDATE", payload: nextTodo });
    setCommentTarget(null);
    setCommentText("");

    const savedTodo = await saveTodoRemotely(nextTodo, { newComment: comment });
    if (savedTodo) {
      dispatch({ type: "UPDATE", payload: savedTodo });
      toast.success("Comment saved.");
      setCommentSubmitting(false);
      return;
    }

    toast("Comment added locally. Server sync is not available right now.");
    setCommentSubmitting(false);
  };

  const handleTaskDelete = (todo: Todo) => {
    setDeleteTarget(todo);
  };

  const confirmTaskDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    appendTimelineActivity(
      createTimelineActivityRecord("deleted", target, {
        description: target.description?.trim() || "Task removed from the active workspace.",
      })
    );
    setDeleteTarget(null);
    setOpenTaskMenuId(null);
    if (selectedBoardTaskId === target.id) {
      setSelectedBoardTaskId(null);
    }
    await deleteTodo(target.id);
  };

  const clearTaskSearch = () => {
    setSearchInput("");
  };

  const renderPremiumTaskCard = (
    todo: Todo,
    options: {
      imageVariant: "list" | "board";
      showCompletion?: boolean;
      stackClassName?: string;
      cardClassName?: string;
      showDateStrip?: boolean;
    }
  ) => {
    const assigneeName = typeof todo.assignee === "string" ? todo.assignee.trim() : "";
    const matchedSidebarAvatar =
      assigneeName &&
      sidebarProfile.avatar &&
      assigneeName.toLowerCase() === sidebarProfile.name.trim().toLowerCase()
        ? sidebarProfile.avatar
        : "";
    const assigneeLabel = assigneeName || "Unassigned";
    const assigneeInitials = getAvatarInitials(assigneeName);
    const taskCategory = todo.category?.trim() ? todo.category.trim() : "General";
    const showTaskImages = hasTaskImages(todo);
    const showCompletion = Boolean(options.showCompletion && todo.done);
    const plannedTaskTime = getPlannedTaskTime(todo);
    const taskHoursLabel =
      (typeof todo.estimatedHours === "string" && todo.estimatedHours.trim()) || plannedTaskTime || "Not set";
    const taskCountdown = getTodoCountdown(todo, countdownNow);
    const completionDuration =
      showCompletion && typeof todo.completedAt === "number"
        ? formatCompletionDuration(todo.createdAt, todo.completedAt)
        : null;
    const taskDueLabel =
      typeof todo.dueAt === "string" && todo.dueAt.trim().length > 0
        ? formatLongDayDate(todo.dueAt)
        : "No due date";
    const taskCommentCount = todo.comments.filter((comment) => comment.text.trim().length > 0).length;
    const taskCheckpointPreview = todo.checkpoints.filter(Boolean).slice(0, 3);
    const taskTagPreview = todo.tags.filter(Boolean).slice(0, 4);
    const taskFieldCards = [
      { label: "Project", value: todo.project?.trim() || "Workspace Queue" },
      { label: "Department", value: todo.department?.trim() || taskCategory },
      { label: "Client", value: todo.clientName?.trim() || "Internal" },
      { label: "Location", value: todo.location?.trim() || "Remote" },
    ];
    const showDateStrip = options.showDateStrip ?? true;
    const isTaskMenuOpen = openTaskMenuId === todo.id;

    if (options.cardClassName === "todoist-task--dashboard") {
      const compactCreatedLabel = formatCardDate(todo.createdAt);
      const compactDueLabel =
        typeof todo.dueAt === "string" && todo.dueAt.trim().length > 0 ? formatCardDate(todo.dueAt) : "Not scheduled";
      const dashboardSignals =
        taskTagPreview.length > 0
          ? taskTagPreview.slice(0, 2)
          : [todo.project?.trim() || "Website", todo.department?.trim() || "Design"].filter(Boolean).slice(0, 2);
      const taskAttachments = readTodoAttachmentList(todo);
      const imageAttachments = taskAttachments.filter((attachment) => attachment.isImage);
      const fileAttachments = taskAttachments.filter((attachment) => !attachment.isImage);
      const assigneeNames = splitAssigneeNames(todo.assignee);
      const visibleAssignees = (assigneeNames.length > 0 ? assigneeNames : [assigneeLabel]).slice(0, 2);
      const remainingAssigneeCount = Math.max(0, (assigneeNames.length > 0 ? assigneeNames : [assigneeLabel]).length - 2);
      const assignedEmployeeRole = todo.department?.trim() || todo.project?.trim() || taskCategory;
      const dashboardStatusLabel = todo.done ? "Done" : "OK";
      const isExpanded = expandedTaskIds.has(todo.id);
      const isAttachmentUploading = taskAttachmentUploadingId === todo.id;
      const toggleTaskDetails = () => {
        setExpandedTaskIds((prev) => {
          const next = new Set(prev);
          if (next.has(todo.id)) next.delete(todo.id);
          else next.add(todo.id);
          return next;
        });
      };

      return (
        <div key={`${options.imageVariant}-${todo.id}`} className={`todo-task-stack ${options.stackClassName ?? ""}`}>
          <article
            className={`todoist-task task-enter ${options.cardClassName} ${getPriorityClass(todo.priority)} ${todo.done ? "done" : ""}`}
          >
            <div className="premium-task-card">
              <header className="premium-task-card__header" onClick={toggleTaskDetails} style={{ cursor: "pointer" }}>
                <div className="premium-task-card__title-row">
                  <div className="premium-task-card__title-left">
                    <button
                      className={`premium-task-toggle ${todo.done ? "is-done" : ""}`}
                      onClick={(e) => { e.stopPropagation(); handleTaskToggle(todo.id); }}
                      type="button"
                    >
                      <i className={`bi ${todo.done ? "bi-check-circle-fill" : "bi-circle"}`} />
                    </button>
                    <h3 className="premium-task-title">{todo.title}</h3>
                  </div>
                  <div className="premium-task-card__title-right">
                    <button className="premium-icon-btn" onClick={(e) => { e.stopPropagation(); handleTaskEdit(todo); }} aria-label="Edit Task">
                      <i className="bi bi-pencil" />
                    </button>
                    <button
                      type="button"
                      className="premium-icon-btn premium-task-expand-toggle"
                      aria-label="Toggle Details"
                      aria-expanded={isExpanded}
                      onClick={(e) => { e.stopPropagation(); toggleTaskDetails(); }}
                      style={{
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                        transition: "transform 0.3s ease",
                      }}
                    >
                      <i className="bi bi-chevron-down" />
                    </button>
                    <div className="todo-task-menu-shell">
                      <button
                        type="button"
                        className="premium-icon-btn"
                        aria-expanded={isTaskMenuOpen}
                        aria-label="More task actions"
                        onClick={(e) => { e.stopPropagation(); setOpenTaskMenuId((current) => (current === todo.id ? null : todo.id)); }}
                      >
                        <i className="bi bi-three-dots" />
                      </button>
                      {isTaskMenuOpen && (
                        <div className="todo-task-menu-dropdown" role="menu">
                          <button type="button" className="todo-task-menu-item" onClick={(e) => { e.stopPropagation(); handleTaskEdit(todo); setOpenTaskMenuId(null); }} disabled={todo.done}>
                            <i className="bi bi-pencil-square" /> <span>Edit Task</span>
                          </button>
                          <button type="button" className="todo-task-menu-item" onClick={(e) => { e.stopPropagation(); openCommentComposer(todo); setOpenTaskMenuId(null); }}>
                            <i className="bi bi-chat-left-text" /> <span>Add Comment</span>
                          </button>
                          <button type="button" className="todo-task-menu-item" onClick={(e) => { e.stopPropagation(); handleTaskToggle(todo.id); setOpenTaskMenuId(null); }}>
                            <i className={`bi ${todo.done ? "bi-arrow-counterclockwise" : "bi-check2-circle"}`} /> <span>{todo.done ? "Mark as Pending" : "Mark as Done"}</span>
                          </button>
                          <button type="button" className="todo-task-menu-item todo-task-menu-item--danger" onClick={(e) => { e.stopPropagation(); handleTaskDelete(todo); setOpenTaskMenuId(null); }}>
                            <i className="bi bi-trash3" /> <span>Delete Task</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="premium-task-card__meta-bar">
                  <span className={`premium-meta-badge status-${todo.done ? "done" : "pending"}`}>
                    {dashboardStatusLabel}
                  </span>
                  <span className="premium-meta-item">
                    <i className="bi bi-folder" /> {todo.project?.trim() || "General"}
                  </span>
                  <span className="premium-meta-item">
                    <i className="bi bi-calendar3" /> Created: {compactCreatedLabel}
                  </span>
                  {taskCountdown && (
                    <span className={`premium-meta-item premium-meta-item--countdown is-${taskCountdown.tone}`}>
                      <i className={`bi ${taskCountdown.icon}`} /> {taskCountdown.label}
                    </span>
                  )}
                </div>

                {!isExpanded && (
                  <div className="premium-task-summary-row">
                    <div className="premium-task-summary-card premium-task-summary-card--employee">
                      <div className="premium-task-summary-card__avatars">
                        {visibleAssignees.map((label, index) => (
                          <div key={`${todo.id}-summary-avatar-${index}`} className="premium-avatar" style={{ zIndex: 10 - index }}>
                            {index === 0 && matchedSidebarAvatar && label.toLowerCase() === assigneeLabel.toLowerCase()
                              ? <img src={matchedSidebarAvatar} alt={label} />
                              : <span>{getAvatarInitials(label)}</span>}
                          </div>
                        ))}
                        {remainingAssigneeCount > 0 && (
                          <div className="premium-avatar premium-avatar--count">
                            <span>+{remainingAssigneeCount}</span>
                          </div>
                        )}
                      </div>
                      <div className="premium-task-summary-card__copy">
                        <span>Assigned</span>
                        <strong>{assigneeNames[0] || assigneeLabel}</strong>
                        <small>{assignedEmployeeRole}</small>
                      </div>
                    </div>

                    <div className={`premium-task-summary-card premium-task-summary-card--stat premium-task-summary-card--priority priority-${todo.priority.toLowerCase()}`}>
                      <span>Priority</span>
                      <strong>{todo.priority}</strong>
                    </div>

                    <div className="premium-task-summary-card premium-task-summary-card--stat">
                      <span>Due Date</span>
                      <strong>{compactDueLabel}</strong>
                    </div>
                  </div>
                )}
              </header>

              <div className={`premium-task-card__collapsible ${isExpanded ? "is-expanded" : ""}`}>
                <div className="premium-task-card__collapsible-inner">
                  <div className="premium-task-divider" />

                  <div className="premium-task-card__body">
                    <div className="premium-task-card__left">
                      <div className="premium-task-description premium-task-section-card">
                        <label>Description</label>
                        <p>{todo.description || todo.statusNote || "No description provided."}</p>
                      </div>

                      {dashboardSignals.length > 0 && (
                        <div className="premium-task-suggestions premium-task-section-card">
                          <label>Suggestions / Tags</label>
                          <div className="premium-task-tags">
                            {dashboardSignals.map((signal, index) => (
                              <span key={`${todo.id}-sig-${index}`} className="premium-pill">{signal}</span>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="premium-task-attachments premium-task-section-card">
                        <div className="premium-task-section-head">
                          <label>Attachments</label>
                          <button
                            type="button"
                            className="premium-inline-action"
                            onClick={(e) => {
                              e.stopPropagation();
                              openTaskAttachmentPicker(todo.id);
                            }}
                            disabled={isAttachmentUploading}
                          >
                            <i className="bi bi-paperclip" />
                            <span>{isAttachmentUploading ? "Attaching..." : "Attach"}</span>
                          </button>
                        </div>

                        {taskAttachments.length > 0 ? (
                          <div className="premium-task-attachments__content">
                            {imageAttachments.length > 0 && (
                              <div className="premium-attachment-grid">
                                {imageAttachments.map((attachment, index) => (
                                  <div key={`${todo.id}-image-attachment-${getTodoAttachmentKey(attachment) || index}`} className="premium-attachment-tile">
                                    <button
                                      type="button"
                                      className="premium-attachment-tile__button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setAttachmentPreviewTarget(attachment);
                                      }}
                                    >
                                      <img
                                        src={attachment.url}
                                        alt={`${attachment.name} preview`}
                                        loading="lazy"
                                        decoding="async"
                                        onError={(event) => {
                                          const tile = event.currentTarget.closest(".premium-attachment-tile");
                                          if (tile instanceof HTMLElement) {
                                            tile.style.display = "none";
                                          }
                                        }}
                                      />
                                    </button>
                                    <div className="premium-attachment-tile__overlay">
                                      <span className="premium-attachment-tile__hint">
                                        <i className="bi bi-arrows-fullscreen" />
                                        <span>Preview</span>
                                      </span>
                                      <a
                                        href={attachment.url}
                                        download={attachment.name}
                                        className="premium-attachment-tile__download"
                                        aria-label={`Download ${attachment.name}`}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <i className="bi bi-download" />
                                      </a>
                                      <button
                                        type="button"
                                        className="premium-attachment-tile__remove"
                                        aria-label={`Remove ${attachment.name}`}
                                        disabled={taskAttachmentRemovingKey === getTodoAttachmentKey(attachment)}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void handleTaskAttachmentRemove(todo.id, attachment);
                                        }}
                                      >
                                        <i className="bi bi-trash3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {fileAttachments.length > 0 && (
                              <div className="premium-file-list">
                                {fileAttachments.map((attachment, index) => (
                                  <div
                                    key={`${todo.id}-file-attachment-${getTodoAttachmentKey(attachment) || index}`}
                                    className="premium-file-item"
                                  >
                                    <span className="premium-file-item__icon">
                                      <i className={`bi ${getAttachmentIconClass(attachment)}`} />
                                    </span>
                                    <span className="premium-file-item__copy">
                                      <strong>{attachment.name}</strong>
                                      <small>{formatFileSize(attachment.size)}</small>
                                    </span>
                                    <div className="premium-file-item__actions">
                                      <a
                                        href={attachment.url}
                                        download={attachment.name}
                                        className="premium-file-item__download"
                                      >
                                        <i className="bi bi-download" />
                                      </a>
                                      <button
                                        type="button"
                                        className="premium-file-item__remove"
                                        aria-label={`Remove ${attachment.name}`}
                                        disabled={taskAttachmentRemovingKey === getTodoAttachmentKey(attachment)}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          void handleTaskAttachmentRemove(todo.id, attachment);
                                        }}
                                      >
                                        <i className="bi bi-trash3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="premium-attachment-empty">
                            <div className="premium-attachment-empty__icon">
                              <i className="bi bi-paperclip" />
                            </div>
                            <div className="premium-attachment-empty__copy">
                              <strong>No attachments yet</strong>
                              <span>Drop in screenshots, references, or files to keep task context in one place.</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="premium-task-card__right">
                      <div className={`premium-info-card premium-info-card--priority priority-${todo.priority.toLowerCase()}`}>
                        <div className="premium-info-card-header">
                          <i className="bi bi-flag" /> Priority
                        </div>
                        <strong>{todo.priority}</strong>
                        <span className="premium-info-card-meta">
                          {todo.done ? "Task completed" : "Focus level for this task"}
                        </span>
                      </div>

                      <div className="premium-info-card">
                        <div className="premium-info-card-header">
                          <i className="bi bi-calendar-event" /> Due Date
                        </div>
                        <strong>{compactDueLabel}</strong>
                        <span className="premium-info-card-meta">
                          {taskCountdown ? taskCountdown.label : "No active countdown"}
                        </span>
                      </div>

                      <div className="premium-info-card premium-info-card--assignee">
                        <div className="premium-info-card-header">
                          <i className="bi bi-people" /> Assigned Employee
                        </div>
                        <div className="premium-assignee-card">
                          <div className="premium-task-avatars premium-task-avatars--stacked">
                            {visibleAssignees.map((label, index) => (
                              <div key={`${todo.id}-assignee-card-${index}`} className="premium-avatar" style={{ zIndex: 10 - index }}>
                                {index === 0 && matchedSidebarAvatar && label.toLowerCase() === assigneeLabel.toLowerCase()
                                  ? <img src={matchedSidebarAvatar} alt={label} />
                                  : <span>{getAvatarInitials(label)}</span>}
                              </div>
                            ))}
                            {remainingAssigneeCount > 0 && (
                              <div className="premium-avatar premium-avatar--count">
                                <span>+{remainingAssigneeCount}</span>
                              </div>
                            )}
                          </div>
                          <div className="premium-assignee-card__copy">
                            <strong>{assigneeNames[0] || assigneeLabel}</strong>
                            <span>{assignedEmployeeRole}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <footer className="premium-task-card__footer">
                    <div className="premium-task-footer-summary">
                      <span className="premium-task-footer-summary__item">
                        <i className="bi bi-paperclip" />
                        <span>{taskAttachments.length} attachment{taskAttachments.length === 1 ? "" : "s"}</span>
                      </span>
                      <span className="premium-task-footer-summary__item">
                        <i className="bi bi-chat-left-text" />
                        <span>{taskCommentCount} comment{taskCommentCount === 1 ? "" : "s"}</span>
                      </span>
                    </div>

                    <div className="premium-task-actions">
                      <button type="button" className="premium-action-btn" onClick={(e) => { e.stopPropagation(); openCommentComposer(todo); }}>
                        <i className="bi bi-chat-left-text" /> <span>Comment</span>
                      </button>
                      <button type="button" className="premium-action-btn" onClick={(e) => { e.stopPropagation(); handleTaskEdit(todo); }}>
                        <i className="bi bi-pencil" /> <span>Edit Details</span>
                      </button>
                    </div>
                  </footer>
                </div>
              </div>
            </div>
          </article>
        </div>
      );
    }

    return (
      <div key={`${options.imageVariant}-${todo.id}`} className={`todo-task-stack ${options.stackClassName ?? ""}`}>
        {showDateStrip && (
          <div className="todo-task-created-strip" aria-label="Task created date">
            <p className="todo-task-created-day">{formatDayLabel(todo.createdAt)}</p>
            <p className="todo-task-created-date">{formatLongDate(todo.createdAt)}</p>
          </div>
        )}

        <article
          className={`todoist-task task-enter ${options.cardClassName ?? ""} ${getPriorityClass(todo.priority)} ${todo.done ? "done" : ""}`}
        >
          <div className={`todoist-task-content ${showTaskImages ? "has-media" : ""}`}>
            {renderTaskImageGallery(todo, options.imageVariant)}
            <div className="todoist-task-body">
              <div className="todoist-task-head">
                <div className="todo-task-head-main">
                  <button
                    className={`todo-task-check-btn ${todo.done ? "is-done" : ""}`}
                    onClick={() => handleTaskToggle(todo.id)}
                    type="button"
                    aria-label={todo.done ? "Mark task as pending" : "Mark task as complete"}
                  >
                    <i className={`bi ${todo.done ? "bi-check2-square" : "bi-square"}`} aria-hidden="true" />
                  </button>
                  <div className="todo-task-head-copy">
                    <div className="todo-task-head-copy-top">
                      <span className="todo-task-kicker">{taskCategory}</span>
                      <span className="todo-task-separator" aria-hidden="true" />
                      <span className="todo-task-headline-meta">{taskDueLabel}</span>
                    </div>
                    <h5>{todo.title}</h5>
                    <div className="todo-task-head-subline">
                      <span>
                        <i className="bi bi-person" aria-hidden="true" />
                        {assigneeLabel}
                      </span>
                      <span className={`todo-task-head-timer ${taskCountdown ? `is-${taskCountdown.tone}` : ""}`}>
                        <i className={`bi ${taskCountdown ? taskCountdown.icon : "bi-clock-history"}`} aria-hidden="true" />
                        {taskCountdown ? taskCountdown.label : taskHoursLabel}
                      </span>
                      <span>
                        <i className="bi bi-chat-left-text" aria-hidden="true" />
                        {taskCommentCount} comment{taskCommentCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="todo-task-head-actions">
                  <span className={`priority-pill ${getPriorityClass(todo.priority)} ${todo.done ? "is-muted" : ""}`}>
                    {todo.priority}
                  </span>

                  <div className="todo-task-menu-shell">
                    <button
                      type="button"
                      className="todo-task-menu-trigger"
                      aria-haspopup="menu"
                      aria-expanded={isTaskMenuOpen}
                      aria-label="Task actions"
                      onClick={() => setOpenTaskMenuId((current) => (current === todo.id ? null : todo.id))}
                    >
                      <i className="bi bi-three-dots" aria-hidden="true" />
                    </button>

                    {isTaskMenuOpen && (
                      <div className="todo-task-menu-dropdown" role="menu" aria-label="Task actions menu">
                        <button
                          type="button"
                          className="todo-task-menu-item"
                          role="menuitem"
                          onClick={() => {
                            handleTaskEdit(todo);
                            setOpenTaskMenuId(null);
                          }}
                          disabled={todo.done}
                        >
                          <i className="bi bi-pencil-square" aria-hidden="true" />
                          <span>Edit Task</span>
                        </button>
                        <button
                          type="button"
                          className="todo-task-menu-item"
                          role="menuitem"
                          onClick={() => {
                            openCommentComposer(todo);
                            setOpenTaskMenuId(null);
                          }}
                        >
                          <i className="bi bi-chat-left-text" aria-hidden="true" />
                          <span>Add Comment</span>
                        </button>
                        <button
                          type="button"
                          className="todo-task-menu-item"
                          role="menuitem"
                          onClick={() => {
                            handleTaskToggle(todo.id);
                            setOpenTaskMenuId(null);
                          }}
                        >
                          <i className={`bi ${todo.done ? "bi-arrow-counterclockwise" : "bi-check2-circle"}`} aria-hidden="true" />
                          <span>{todo.done ? "Mark as Pending" : "Mark as Done"}</span>
                        </button>
                        <button
                          type="button"
                          className="todo-task-menu-item todo-task-menu-item--danger"
                          role="menuitem"
                          onClick={() => {
                            handleTaskDelete(todo);
                            setOpenTaskMenuId(null);
                          }}
                        >
                          <i className="bi bi-trash3" aria-hidden="true" />
                          <span>Delete Task</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="todo-task-primary-facts">
                <span className="todo-task-fact todo-task-fact--assignee">
                  <i className="bi bi-person" aria-hidden="true" />
                  <span>Assignee:</span>
                  <span className="todo-task-assignee-chip">
                    <span className="todo-task-assignee-avatar" aria-hidden="true">
                      {matchedSidebarAvatar ? <img src={matchedSidebarAvatar} alt="" /> : assigneeInitials || "UA"}
                    </span>
                    <span>{assigneeLabel}</span>
                  </span>
                </span>
                <span className="todo-task-fact">
                  <i className="bi bi-calendar3" aria-hidden="true" />
                  <span>Due: {taskDueLabel}</span>
                </span>
                <span className="todo-task-fact">
                  <i className="bi bi-grid-3x3-gap" aria-hidden="true" />
                  <span>Priority: {todo.priority}</span>
                </span>
                <span className="todo-task-fact">
                  <i className="bi bi-clock-history" aria-hidden="true" />
                  <span>Created: {formatDateTime(todo.createdAt)}</span>
                </span>
              </div>

              <p className="todo-task-description">{todo.description || "No description added."}</p>

              <div className="todo-task-field-grid">
                {taskFieldCards.map((field) => (
                  <article key={`${todo.id}-${field.label}`} className="todo-task-field-card">
                    <span>{field.label}</span>
                    <strong>{field.value}</strong>
                  </article>
                ))}
              </div>

              {(taskCheckpointPreview.length > 0 || taskTagPreview.length > 0 || taskCommentCount > 0) && (
                <div className="todo-task-insight-grid">
                  {taskCheckpointPreview.length > 0 && (
                    <div className="todo-task-insight-block">
                      <span className="todo-task-insight-label">Checkpoints</span>
                      <div className="todo-task-pill-row">
                        {taskCheckpointPreview.map((checkpoint, index) => (
                          <span key={`${todo.id}-checkpoint-${index}`} className="todo-task-pill todo-task-pill--checkpoint">
                            {checkpoint}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {taskTagPreview.length > 0 && (
                    <div className="todo-task-insight-block">
                      <span className="todo-task-insight-label">Tags</span>
                      <div className="todo-task-pill-row">
                        {taskTagPreview.map((tag, index) => (
                          <span key={`${todo.id}-tag-${index}`} className="todo-task-pill todo-task-pill--tag">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {taskCommentCount > 0 && (
                    <div className="todo-task-insight-block">
                      <span className="todo-task-insight-label">Conversation</span>
                      <div className="todo-task-pill-row">
                        <span className="todo-task-pill todo-task-pill--neutral">{taskCommentCount} saved comments</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {showCompletion && (
                <div className="todo-meta-row todo-meta-row--completed todo-task-secondary-meta">
                  <span className="meta-badge">Task Time: {plannedTaskTime ?? "Not set"}</span>
                  {completionDuration && <span className="meta-badge">Completed In: {completionDuration}</span>}
                  {typeof todo.completedAt === "number" && (
                    <span className="meta-badge">Completed At: {formatDateTime(todo.completedAt)}</span>
                  )}
                </div>
              )}

              {todo.statusNote && <p className="todo-task-note">{todo.statusNote}</p>}
            </div>
          </div>
        </article>
      </div>
    );
  };

  const renderBoardTableRow = (todo: Todo) => {
    const assigneeName = typeof todo.assignee === "string" ? todo.assignee.trim() : "";
    const taskCategory = todo.category?.trim() || "General";
    const primaryAssigneeLabel = assigneeName || "Unassigned";
    const teammateName = todo.project?.trim() || todo.department?.trim() || "Task owner";
    const isFocused = boardFocusTask?.id === todo.id;
    const commentCount = getBoardTaskCommentCount(todo);
    const taskMetaLabel = `${taskCategory} - ${commentCount} note${commentCount === 1 ? "" : "s"}`;

    return (
      <article
        key={`board-row-${todo.id}`}
        className={`todo-board-table-row ${getPriorityClass(todo.priority)} ${todo.done ? "is-done" : ""} ${isFocused ? "is-active" : ""}`}
        role="button"
        tabIndex={0}
        onClick={() => setSelectedBoardTaskId(todo.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setSelectedBoardTaskId(todo.id);
          }
        }}
      >
        <button
          type="button"
          className={`todo-board-row-toggle ${todo.done ? "is-done" : ""}`}
          aria-label={todo.done ? "Mark task as pending" : "Mark task as complete"}
          onClick={(event) => {
            event.stopPropagation();
            handleTaskToggle(todo.id);
          }}
        >
          <i className={`bi ${todo.done ? "bi-check2-square" : "bi-square"}`} />
        </button>
        <span className={`todo-board-priority-badge ${getPriorityClass(todo.priority)}`}>
          {getBoardPriorityLabel(todo.priority)}
        </span>
        <span className="todo-board-table-row__task">
          <strong>{todo.title}</strong>
          <small>{taskMetaLabel}</small>
        </span>
        <span className="todo-board-table-row__time">
          <i className="bi bi-clock-history" aria-hidden="true" />
          <span>{getBoardTaskTimeLabel(todo)}</span>
        </span>
        <span className="todo-board-table-row__assignee">
          <strong>{primaryAssigneeLabel}</strong>
          <small>{teammateName}</small>
        </span>
        <span className={`todo-board-table-row__status ${todo.done ? "is-complete" : "is-pending"}`}>
          <i className={`bi ${todo.done ? "bi-check2-square" : "bi-square"}`} aria-hidden="true" />
          <span>{todo.done ? "Completed" : "In Progress"}</span>
        </span>
      </article>
    );
  };

  const renderAddTaskCard = (variant: "page" | "modal" = "page") => {
    return (
      <section className={`todo-add-premium-card ${variant === "modal" ? "todo-add-premium-card--popup" : ""}`}>
      <header className="todo-add-premium-head">
        <p className="todo-add-premium-kicker">Task Creation</p>
        <h2>Create New Task</h2>
        <p>Capture clear execution details in a simple and focused workflow.</p>
      </header>

      <div className="todo-add-premium-body">
        <FormField label="Task Title" htmlFor="task-title" error={errors.title}>
          <input
            id="task-title"
            className="form-control todo-add-title-input"
            placeholder="Enter task title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </FormField>

        <FormField label="Description" htmlFor="task-description">
          <textarea
            id="task-description"
            className="form-control todo-add-description-input"
            placeholder="Write a clear task description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>

        <div className="todo-add-metadata-grid">
          <FormField label="Category" htmlFor="task-category" helperText="Defaults to General">
            <input
              id="task-category"
              className="form-control"
              placeholder="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </FormField>

          <FormField label="Priority" htmlFor="task-priority">
            <select
              id="task-priority"
              className="form-select priority-select"
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </FormField>

          <FormField label="Assignee" htmlFor="task-assignee">
            <input
              id="task-assignee"
              className="form-control"
              placeholder="Assignee name"
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
            />
          </FormField>

          <FormField label="Due Date" htmlFor="task-due-date">
            <input
              id="task-due-date"
              className="form-control"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </FormField>

          <FormField
            label="Estimated Time"
            htmlFor="task-estimate-hours"
            helperText="Set hours and minutes"
          >
            <div className="todo-add-estimate-inputs">
              <input
                id="task-estimate-hours"
                className="form-control"
                type="number"
                min={0}
                max={999}
                placeholder="Hours"
                value={estimateHours}
                onChange={(e) => setEstimateHours(e.target.value)}
              />
              <input
                id="task-estimate-minutes"
                className="form-control"
                type="number"
                min={0}
                max={59}
                placeholder="Minutes"
                value={estimateMinutes}
                onChange={(e) => setEstimateMinutes(e.target.value)}
              />
            </div>
          </FormField>
        </div>

        <FormField label="Attachment" htmlFor="task-attachment">
          <label
            className={`todoist-upload enhanced todo-add-upload ${attachmentFile ? "has-image" : ""}`}
            htmlFor="task-attachment"
          >
            <span className="todo-upload-icon" aria-hidden="true">
              +
            </span>
            <div className="todo-upload-copy">
              <strong>
                {attachmentFile ? attachmentFile.name : "Upload attachment"}
              </strong>
              <small>
                {attachmentFile
                  ? attachmentPreview
                    ? "Image selected. Tap to replace it."
                    : "Attachment selected. Tap to replace it."
                  : "JPG, PNG, or PDF (optional)"}
              </small>
            </div>
            <input
              id="task-attachment"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,image/png,image/jpeg,application/pdf"
              onChange={handleAttachmentUpload}
            />
          </label>

          {attachmentFile && (
            <div className="todo-upload-preview-grid">
              {attachmentPreview ? (
                <div className="todo-upload-preview">
                  <img
                    src={attachmentPreview}
                    alt={`Task attachment preview for ${attachmentFile.name}`}
                    decoding="async"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                  <button
                    type="button"
                    className="todo-upload-remove"
                    onClick={clearAttachment}
                  >
                    Remove attachment
                  </button>
                </div>
              ) : (
                <div className="todo-upload-preview todo-upload-preview--file">
                  <div className="todo-upload-file-copy">
                    <strong>{attachmentFile.name}</strong>
                    <small>{attachmentFile.type === "application/pdf" ? "PDF attachment selected" : "Attachment selected"}</small>
                  </div>
                  <button
                    type="button"
                    className="todo-upload-remove"
                    onClick={clearAttachment}
                  >
                    Remove attachment
                  </button>
                </div>
              )}
            </div>
          )}
        </FormField>
      </div>

      <footer className="todo-add-premium-footer">
        <button
          className="btn todoist-add-btn todo-add-submit-btn"
          onClick={addTodo}
          type="button"
          disabled={submitting}
        >
          {submitting ? "Adding..." : "Create Task"}
        </button>
      </footer>
    </section>
    );
  };

  const selectedTimelineActivityOption =
    timelineActivityFilterOptions.find((option) => option.id === timelineActivityFilter) ?? timelineActivityFilterOptions[0];

  const renderSettingsField = (field: WorkspaceSettingField) => {
    const value = settingsDraft[field.key];
    const spanClass = field.fullWidth ? "full-span" : "";

    if (field.type === "checkbox") {
      return (
        <div className={`setting-switch-row ${spanClass}`} key={field.key}>
          <div>
            <p className="setting-label">{field.label}</p>
            {field.help && <p className="setting-sub">{field.help}</p>}
          </div>
          <div className="form-check form-switch m-0">
            <input
              className="form-check-input fancy-switch"
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => updateSettingsDraft(field.key, e.target.checked)}
            />
          </div>
        </div>
      );
    }

    if (field.type === "select") {
      return (
        <div className={`settings-input-card ${spanClass}`} key={field.key}>
          <label className="form-label">{field.label}</label>
          <select
            className="form-select"
            value={String(value)}
            onChange={(e) => updateSettingsDraft(field.key, e.target.value)}
          >
            {(field.options || []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {field.help && <small>{field.help}</small>}
        </div>
      );
    }

    if (field.type === "time") {
      return (
        <div className={`settings-input-card ${spanClass}`} key={field.key}>
          <label className="form-label">{field.label}</label>
          <input
            className="form-control"
            type="time"
            value={String(value)}
            onChange={(e) => updateSettingsDraft(field.key, e.target.value)}
          />
          {field.help && <small>{field.help}</small>}
        </div>
      );
    }

    return (
      <div className={`settings-input-card ${spanClass}`} key={field.key}>
        <label className="form-label">{field.label}</label>
        <input
          className="form-control"
          type="text"
          value={String(value)}
          onChange={(e) => updateSettingsDraft(field.key, e.target.value)}
        />
        {field.help && <small>{field.help}</small>}
      </div>
    );
  };

  const renderSettingsFieldsByKeys = (keys: Array<keyof WorkspaceSettingsState>) => (
    <div className="settings-fields-grid todo-settings-center-grid">
      {keys.map((key) => renderSettingsField(workspaceSettingFieldLookup[key]))}
    </div>
  );

  const renderSettingsToggleOption = (
    key: keyof WorkspaceSettingsState,
    label: string,
    description?: string,
    tone: "default" | "danger" = "default"
  ) => (
    <div
      className={`todo-settings-option-row ${tone === "danger" ? "todo-settings-option-row--danger" : ""}`}
      key={String(key)}
    >
      <div className="todo-settings-option-row__copy">
        <h6>{label}</h6>
        {description && <p>{description}</p>}
      </div>
      <div className="form-check form-switch m-0">
        <input
          className="form-check-input fancy-switch"
          type="checkbox"
          checked={Boolean(settingsDraft[key])}
          onChange={(event) => updateSettingsDraft(key, event.target.checked)}
        />
      </div>
    </div>
  );

  const renderSettingsSelectCard = (
    key: keyof WorkspaceSettingsState,
    label?: string,
    description?: string
  ) => {
    const field = workspaceSettingFieldLookup[key];
    if (!field || field.type !== "select") return null;

    return (
      <label className="todo-settings-control-card" key={String(key)}>
        <span className="todo-settings-control-card__label">{label || field.label}</span>
        {description && <small>{description}</small>}
        <select
          className="form-select"
          value={String(settingsDraft[key])}
          onChange={(event) => updateSettingsDraft(key, event.target.value)}
        >
          {(field.options || []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    );
  };

  const renderSettingsTimeCard = (
    key: keyof WorkspaceSettingsState,
    label?: string,
    description?: string
  ) => {
    const field = workspaceSettingFieldLookup[key];
    if (!field || field.type !== "time") return null;

    return (
      <label className="todo-settings-control-card" key={String(key)}>
        <span className="todo-settings-control-card__label">{label || field.label}</span>
        {description && <small>{description}</small>}
        <input
          className="form-control"
          type="time"
          value={String(settingsDraft[key])}
          onChange={(event) => updateSettingsDraft(key, event.target.value)}
        />
      </label>
    );
  };

  const moveQuickAddAction = (actionId: QuickAddActionId, direction: -1 | 1) => {
    setSettingsDraft((prev) => {
      const ordered = normalizeQuickAddOrder(prev.quickAddOrder);
      const index = ordered.indexOf(actionId);
      const targetIndex = index + direction;

      if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return prev;

      const nextOrder = [...ordered];
      [nextOrder[index], nextOrder[targetIndex]] = [nextOrder[targetIndex], nextOrder[index]];

      return {
        ...prev,
        quickAddOrder: nextOrder.join(","),
      };
    });
  };

  const renderSettingsCenterContent = () => {
    const searchValue = settingsSearchQuery.trim().toLowerCase();
    const visibleSettingsItems = settingsCenterItems.filter((item) => item.label.toLowerCase().includes(searchValue));
    const activeTabInfo = settingsCenterTabInfo[settingsCenterTab];
    const settingsSaveBusy = false;
    const isSettingsMobileLayout = isMobileViewport;
    const useMobileSettingsFooter = false;
    const useSettingsMobileSplitView = isSettingsMobileLayout;
    const isSettingsMobileSidebarOpen = useSettingsMobileSplitView && !settingsMobileContentView;
    const showSettingsNav = !useSettingsMobileSplitView || isSettingsMobileSidebarOpen;
    const showSettingsContent = true;
    const accountName = profileDraft.name.trim() || defaultWorkspaceProfile.name;
    const accountEmail = profileDraft.email.trim() || "dhyan.nupursoftware@gmail.com";
    const nameCount = profileDraft.name.length;
    const orderedQuickAddActions = normalizeQuickAddOrder(settingsDraft.quickAddOrder)
      .map((actionId) => quickAddActionItems.find((item) => item.id === actionId))
      .filter((item): item is QuickAddActionItem => Boolean(item));
    const enabledProductivityDays = productivityGoalItems.filter((item) => Boolean(settingsDraft[item.key])).length;
    const connectedCalendarCount = Number(Boolean(settingsDraft.googleCalendarConnected)) + Number(Boolean(settingsDraft.outlookCalendarConnected));

    let panelBody: React.ReactNode = null;

    if (settingsCenterTab === "account") {
      panelBody = (
        <div className="todo-settings-sheet todo-settings-sheet--account">
          <section className="todo-settings-card todo-settings-card--account">
            <div className="todo-settings-card__head">
              <div>
                <span className="todo-settings-card__eyebrow">Account</span>
                <h5>Identity and security</h5>
                <p>Keep sign-in details, recovery methods, and provider access organized in one place.</p>
              </div>
              <span className="todo-settings-status-pill">{settingsDraft.twoFactorAuth ? "Protected" : "Needs review"}</span>
            </div>

            <div className="todo-settings-provider-list">
              <div className="todo-settings-provider-row">
                <div>
                  <strong>Email</strong>
                  <p>{accountEmail}</p>
                </div>
                <button type="button" className="todo-settings-ghost-btn" onClick={() => toast("Email change flow is coming soon.")}>
                  Change email
                </button>
              </div>

              <div className="todo-settings-provider-row">
                <div>
                  <strong>Password</strong>
                  <p>Add a password to unlock account recovery and provider controls.</p>
                </div>
                <button type="button" className="todo-settings-ghost-btn" onClick={() => toast("Password setup flow is coming soon.")}>
                  Add password
                </button>
              </div>

              <div className="todo-settings-provider-row">
                <div>
                  <strong>Connected accounts</strong>
                  <p>Google is active for {accountEmail}. Add another provider if you want a backup sign-in method.</p>
                </div>
                <div className="todo-settings-provider-stack">
                  <button type="button" className="todo-settings-provider-btn" onClick={() => toast("Facebook connection flow is coming soon.")}>
                    <i className="bi bi-facebook" aria-hidden="true" />
                    <span>Facebook</span>
                  </button>
                  <button type="button" className="todo-settings-provider-btn" onClick={() => toast("Apple connection flow is coming soon.")}>
                    <i className="bi bi-apple" aria-hidden="true" />
                    <span>Apple</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="todo-settings-card todo-settings-card--plan">
            <div className="todo-settings-card__head">
              <div>
                <span className="todo-settings-card__eyebrow">Plan</span>
                <h5>Current plan</h5>
                <p>Core task lists, boards, and workspace settings are active on your current plan.</p>
              </div>
              <span className="todo-settings-plan-badge">Beginner</span>
            </div>
            <button type="button" className="todo-settings-secondary-btn todo-settings-btn-block" onClick={() => toast("Plan manager is coming soon.")}>
              Manage plan
            </button>
          </section>

          <section className="todo-settings-card todo-settings-card--profile">
            <div className="todo-settings-card__head">
              <div>
                <span className="todo-settings-card__eyebrow">Profile</span>
                <h5>Photo and name</h5>
                <p>Make the public-facing profile easier to recognize across teammates and shared work.</p>
              </div>
            </div>

            <div className="todo-settings-profile-stack">
              <div className="todo-settings-profile-photo todo-settings-subsection-panel">
                <span className="todo-settings-subsection-title">Photo</span>
                <span className="todo-settings-account-avatar todo-settings-account-avatar--large" aria-hidden="true">
                  {profileDraft.avatar ? <img src={profileDraft.avatar} alt="" /> : getProfileInitial(accountName).toLowerCase()}
                </span>
                <p>Pick a photo up to 4MB. Your avatar photo will be public.</p>
                <div className="todo-settings-inline-actions todo-settings-inline-actions--equal">
                  <button type="button" className="todo-settings-secondary-btn todo-settings-btn-block" onClick={() => profileAvatarInputRef.current?.click()}>
                    Change photo
                  </button>
                  <button
                    type="button"
                    className="todo-settings-danger-btn todo-settings-btn-block"
                    onClick={() => updateProfileDraft("avatar", "")}
                    disabled={!profileDraft.avatar}
                  >
                    Remove photo
                  </button>
                </div>
                <input
                  ref={profileAvatarInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleProfileAvatarChange}
                />
              </div>

              <label className="todo-settings-field todo-settings-subsection-panel" htmlFor="todo-settings-account-name">
                <div className="todo-settings-field__head">
                  <span className="todo-settings-subsection-title">Name</span>
                  <small>{nameCount}/255</small>
                </div>
                <input
                  id="todo-settings-account-name"
                  className="form-control todo-settings-text-input"
                  type="text"
                  maxLength={255}
                  value={profileDraft.name}
                  placeholder="Enter your display name"
                  onChange={(event) => updateProfileDraft("name", event.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="todo-settings-card todo-settings-card--preferences">
            <div className="todo-settings-card__head">
              <div>
                <span className="todo-settings-card__eyebrow">Preferences</span>
                <h5>Security preferences</h5>
                <p>Choose which protections and visibility rules stay enabled by default.</p>
              </div>
            </div>

            <div className="todo-settings-option-list">
              {renderSettingsToggleOption(
                "twoFactorAuth",
                "Two-factor authentication",
                "Require a second verification step whenever you sign in."
              )}
              {renderSettingsToggleOption(
                "loginAlert",
                "New login alerts",
                "Get notified whenever a new device signs into your account."
              )}
              {renderSettingsToggleOption(
                "publicProfile",
                "Public profile",
                "Allow your avatar and name to appear across shared workspace views."
              )}
            </div>
          </section>

          <section className="todo-settings-card todo-settings-card--danger">
            <div className="todo-settings-card__head">
              <div>
                <span className="todo-settings-card__eyebrow">Danger zone</span>
                <h5>Delete account</h5>
                <p>Deleting your account is permanent and removes access to your workspace data immediately.</p>
              </div>
            </div>
            <button type="button" className="todo-settings-danger-btn todo-settings-btn-block" onClick={() => toast.error("Account delete flow is disabled in demo mode.")}>
              Delete account
            </button>
          </section>
        </div>
      );
    } else if (settingsCenterTab === "general") {
      panelBody = (
        <div className="todo-settings-sheet">
          <section className="todo-settings-section">
            <div className="todo-settings-section__head">
              <div>
                <h5>Regional settings</h5>
                <p>Match the language, timezone, and date format you want across the workspace.</p>
              </div>
            </div>
            <div className="todo-settings-control-grid">
              {renderSettingsSelectCard("language", "Language")}
              {renderSettingsSelectCard("timezone", "Timezone")}
              {renderSettingsSelectCard("dateFormat", "Date format")}
            </div>
          </section>

          <section className="todo-settings-section">
            <div className="todo-settings-section__head">
              <div>
                <h5>Task defaults</h5>
                <p>Choose where the app starts and how tasks should behave by default.</p>
              </div>
            </div>
            <div className="todo-settings-control-grid">
              {renderSettingsSelectCard("defaultView", "Default view")}
              {renderSettingsSelectCard("startPage", "Start page")}
              {renderSettingsSelectCard("taskSortOrder", "Task sort")}
              {renderSettingsSelectCard("defaultPriority", "Default priority")}
            </div>
            <div className="todo-settings-option-list">
              {renderSettingsToggleOption(
                "showCompletedByDefault",
                "Show completed tasks",
                "Keep completed tasks visible when you open task lists."
              )}
            </div>
          </section>
        </div>
      );
    } else if (settingsCenterTab === "subscription") {
      panelBody = (
        <div className="todo-settings-sheet">
          <section className="todo-settings-card todo-settings-card--plan">
            <div className="todo-settings-card__head">
              <div>
                <span className="todo-settings-card__eyebrow">Plan</span>
                <h5>Current plan</h5>
                <p>Your workspace is on the beginner plan with core task and board features enabled.</p>
              </div>
              <span className="todo-settings-plan-badge">Beginner</span>
            </div>
            <button type="button" className="todo-settings-secondary-btn todo-settings-btn-block" onClick={() => toast("Billing manager is coming soon.")}>
              Manage plan
            </button>
          </section>
          <section className="todo-settings-section">
            <div className="todo-settings-section__head">
              <div>
                <h5>Included right now</h5>
                <p>Task lists, boards, reminders, and account controls are already available on this plan.</p>
              </div>
            </div>
          </section>
        </div>
      );
    } else if (settingsCenterTab === "theme") {
      panelBody = (
        <div className="todo-settings-sheet">
          <section className="todo-settings-section">
            <div className="todo-settings-section__head">
              <div>
                <h5>Theme</h5>
                <p>Use the same layout as Todoist, while keeping it aligned with your dark workspace styling.</p>
              </div>
            </div>

            <div className="todo-settings-theme-choice-grid">
              <button
                type="button"
                className={`todo-settings-theme-card ${settingsDraft.theme === "light" ? "is-active" : ""}`}
                onClick={() => updateSettingsDraft("theme", "light")}
              >
                <span className="todo-settings-theme-card__preview todo-settings-theme-card__preview--light" aria-hidden="true" />
                <span className="todo-settings-theme-card__copy">
                  <strong>Light</strong>
                  <small>Bright interface with softer contrast.</small>
                </span>
              </button>
              <button
                type="button"
                className={`todo-settings-theme-card ${settingsDraft.theme === "dark" ? "is-active" : ""}`}
                onClick={() => updateSettingsDraft("theme", "dark")}
              >
                <span className="todo-settings-theme-card__preview todo-settings-theme-card__preview--dark" aria-hidden="true" />
                <span className="todo-settings-theme-card__copy">
                  <strong>Dark</strong>
                  <small>Matches the rest of your workspace.</small>
                </span>
              </button>
            </div>

            <div className="todo-settings-option-list">
              {renderSettingsToggleOption(
                "systemThemeSync",
                "Sync with system theme",
                "Automatically use your system light or dark appearance."
              )}
            </div>

            <div className="todo-settings-feature-grid">
              {[
                {
                  key: "compactMode" as const,
                  title: "Compact Layout",
                  description: "Reduce vertical spacing for denser task views.",
                },
                {
                  key: "reducedMotion" as const,
                  title: "Reduced Motion",
                  description: "Lower motion in panel and sidebar transitions.",
                },
                {
                  key: "highContrast" as const,
                  title: "High Contrast",
                  description: "Increase contrast between text and surfaces.",
                },
                {
                  key: "denseInputs" as const,
                  title: "Dense Inputs",
                  description: "Use tighter form controls in settings and modals.",
                },
                {
                  key: "focusMode" as const,
                  title: "Focus Mode",
                  description: "Reduce visual noise inside the workspace panels.",
                },
              ].map((item) => (
                <div className="todo-settings-feature-card" key={item.key}>
                  <div>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </div>
                  <div className="form-check form-switch m-0">
                    <input
                      className="form-check-input fancy-switch"
                      type="checkbox"
                      checked={Boolean(settingsDraft[item.key])}
                      onChange={(event) => updateSettingsDraft(item.key, event.target.checked)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      );
    } else if (settingsCenterTab === "sidebar") {
      panelBody = (
        <div className="todo-settings-sheet">
          <section className="todo-settings-section">
            <div className="todo-settings-section__head">
              <div>
                <h5>Sidebar</h5>
                <p>Choose which shortcut groups and counters appear in the workspace sidebar.</p>
              </div>
            </div>
            <div className="todo-settings-option-list">
              {renderSettingsToggleOption("showInboxSidebar", "Inbox", "Keep the inbox shortcut visible in the sidebar.")}
              {renderSettingsToggleOption("showUpcomingSidebar", "Upcoming", "Show the upcoming planning shortcut.")}
              {renderSettingsToggleOption("showFiltersSidebar", "Filters & Labels", "Display saved filters and labels access.")}
              {renderSettingsToggleOption("showCompletedSidebar", "Completed", "Allow quick access to completed work.")}
              {renderSettingsToggleOption("showTaskCountSidebar", "Show task count", "Display project and list counters in the sidebar.")}
            </div>
          </section>

          <section className="todo-settings-section">
            <div className="todo-settings-section__head">
              <div>
                <h5>Navigation defaults</h5>
                <p>Set where task work starts when the app opens.</p>
              </div>
            </div>
            <div className="todo-settings-control-grid">
              {renderSettingsSelectCard("defaultView", "Default view")}
              {renderSettingsSelectCard("startPage", "Start page")}
            </div>
          </section>
        </div>
      );
    } else if (settingsCenterTab === "quickAdd") {
      panelBody = (
        <div className="todo-settings-sheet">
          <section className="todo-settings-section">
            <div className="todo-settings-section__head">
              <div>
                <h5>Quick Add</h5>
                <p>Reorder the action bar and decide which actions are available while capturing tasks.</p>
              </div>
            </div>

            <div className="todo-settings-option-list">
              {renderSettingsToggleOption(
                "quickAddShowActionLabels",
                "Show action labels",
                "Display action names under each quick add icon."
              )}
            </div>

            <div className="todo-settings-order-list">
              {orderedQuickAddActions.map((action, index) => (
                <div className="todo-settings-order-row" key={action.id}>
                  <div className="todo-settings-order-main">
                    <span className="todo-settings-order-icon" aria-hidden="true">
                      <i className={`bi ${action.icon}`} />
                    </span>
                    <div className="todo-settings-option-row__copy">
                      <h6>{action.label}</h6>
                      <p>{action.description}</p>
                    </div>
                  </div>

                  <div className="todo-settings-order-actions">
                    <div className="form-check form-switch m-0">
                      <input
                        className="form-check-input fancy-switch"
                        type="checkbox"
                        checked={Boolean(settingsDraft[action.settingKey])}
                        onChange={(event) => updateSettingsDraft(action.settingKey, event.target.checked)}
                      />
                    </div>
                    <button
                      type="button"
                      className="todo-settings-mini-btn"
                      aria-label={`Move ${action.label} up`}
                      onClick={() => moveQuickAddAction(action.id, -1)}
                      disabled={index === 0}
                    >
                      <i className="bi bi-chevron-up" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="todo-settings-mini-btn"
                      aria-label={`Move ${action.label} down`}
                      onClick={() => moveQuickAddAction(action.id, 1)}
                      disabled={index === orderedQuickAddActions.length - 1}
                    >
                      <i className="bi bi-chevron-down" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="todo-settings-section">
            <div className="todo-settings-section__head">
              <div>
                <h5>Composer defaults</h5>
                <p>Pick the defaults that quick capture should use when a task is created.</p>
              </div>
            </div>
            <div className="todo-settings-control-grid">
              {renderSettingsSelectCard("defaultPriority", "Default priority")}
              {renderSettingsSelectCard("taskSortOrder", "Default sort")}
            </div>
          </section>
        </div>
      );
    } else if (settingsCenterTab === "productivity") {
      panelBody = (
        <div className="todo-settings-sheet">
          <section className="todo-settings-section">
            <div className="todo-settings-section__head">
              <div>
                <h5>Productivity</h5>
                <p>Match the Todoist productivity setup with karma, celebrations, and working days.</p>
              </div>
            </div>
            <div className="todo-settings-option-list">
              {renderSettingsToggleOption("karmaEnabled", "Todoist Karma", "Track progress with daily and weekly productivity scoring.")}
              {renderSettingsToggleOption("celebrateProgress", "Daily goal celebrations", "Show celebration moments when you hit your goal.")}
              {renderSettingsToggleOption("vacationMode", "Vacation mode", "Pause goals without losing your progress streak.")}
            </div>
          </section>

          <section className="todo-settings-section">
            <div className="todo-settings-section__head">
              <div>
                <h5>Goal days</h5>
                <p>Pick which days count toward your productivity streak.</p>
              </div>
              <span className="todo-settings-inline-note">{enabledProductivityDays} active days</span>
            </div>
            <div className="todo-settings-day-grid">
              {productivityGoalItems.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`todo-settings-day-pill ${settingsDraft[item.key] ? "is-active" : ""}`}
                  onClick={() => updateSettingsDraft(item.key, !settingsDraft[item.key])}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </section>
        </div>
      );
    } else if (settingsCenterTab === "reminders") {
      panelBody = (
        <div className="todo-settings-sheet">
          <section className="todo-settings-section">
            <div className="todo-settings-section__head">
              <div>
                <h5>Reminders</h5>
                <p>Choose how reminder delivery works across push, desktop, and email channels.</p>
              </div>
            </div>
            <div className="todo-settings-control-grid">
              {renderSettingsSelectCard("reminderDefaultTime", "Default reminder")}
              {renderSettingsTimeCard("dailyDigestTime", "Daily digest time")}
              {renderSettingsSelectCard("weeklySummaryDay", "Weekly summary day")}
            </div>
            <div className="todo-settings-option-list">
              {renderSettingsToggleOption("reminderPush", "Push reminders", "Send reminder notifications to the app.")}
              {renderSettingsToggleOption("desktopReminders", "Desktop reminders", "Show reminder popups on desktop devices.")}
              {renderSettingsToggleOption("emailReminders", "Email reminders", "Deliver reminders by email as well.")}
            </div>
          </section>
        </div>
      );
    } else if (settingsCenterTab === "notifications") {
      panelBody = (
        <div className="todo-settings-sheet">
          <section className="todo-settings-section">
            <div className="todo-settings-section__head">
              <div>
                <h5>Notifications</h5>
                <p>Control emails, feature updates, login alerts, and experiment access.</p>
              </div>
            </div>
            <div className="todo-settings-option-list">
              {renderSettingsToggleOption("emailNotifications", "Account & update emails", "Receive important account and product emails.")}
              {renderSettingsToggleOption("dailyProductivityDigest", "Daily productivity digest", "Get a summary of your daily progress by email.")}
              {renderSettingsToggleOption("whatsNewUpdates", "What's new", "Receive updates when new features are released.")}
              {renderSettingsToggleOption("tipsAndTricks", "Tips & tricks", "Get product tips and workflow suggestions.")}
              {renderSettingsToggleOption("loginAlert", "New login alerts", "Send an alert whenever a new login is detected.")}
              {renderSettingsToggleOption("experimentalist", "Experimentalist", "Enable early access experiments in the workspace.")}
            </div>
          </section>
        </div>
      );
    } else if (settingsCenterTab === "backups") {
      panelBody = (
        <div className="todo-settings-sheet">
          <section className="todo-settings-section">
            <div className="todo-settings-section__head">
              <div>
                <h5>Backups</h5>
                <p>Keep local backup behavior aligned with the backup screen shown in the recording.</p>
              </div>
            </div>
            <div className="todo-settings-option-list">
              {renderSettingsToggleOption(
                "automaticBackups",
                "Automatic backups",
                "Create regular local snapshots of your settings and profile data."
              )}
            </div>
            <div className="todo-settings-inline-actions">
              <button type="button" className="todo-settings-ghost-btn" onClick={() => toast.success("Backup export prepared.")}>
                Export backup
              </button>
              <button type="button" className="todo-settings-ghost-btn" onClick={() => toast("Restore flow is coming soon.")}>
                Restore latest
              </button>
            </div>
            <p className="todo-settings-inline-note">Workspace settings already save locally in this browser.</p>
          </section>
        </div>
      );
    } else if (settingsCenterTab === "integrations") {
      panelBody = (
        <div className="todo-settings-sheet">
          <section className="todo-settings-section">
            <div className="todo-settings-section__head">
              <div>
                <h5>Integrations</h5>
                <p>Switch between installed apps, available integrations, and developer tools.</p>
              </div>
            </div>

            <div className="todo-settings-tab-pills" role="tablist" aria-label="Integration sections">
              {settingsIntegrationViews.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`todo-settings-tab-pill ${settingsIntegrationsView === item.key ? "is-active" : ""}`}
                  onClick={() => setSettingsIntegrationsView(item.key)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {settingsIntegrationsView === "installed" && (
              <div className="todo-settings-provider-list">
                <div className="todo-settings-provider-row">
                  <div>
                    <strong>Google</strong>
                    <p>{settingsDraft.googleCalendarConnected ? "Connected calendar account." : "Not connected yet."}</p>
                  </div>
                  <button
                    type="button"
                    className="todo-settings-ghost-btn"
                    onClick={() => updateSettingsDraft("googleCalendarConnected", !settingsDraft.googleCalendarConnected)}
                  >
                    {settingsDraft.googleCalendarConnected ? "Disconnect" : "Connect"}
                  </button>
                </div>
                <div className="todo-settings-provider-row">
                  <div>
                    <strong>Outlook</strong>
                    <p>{settingsDraft.outlookCalendarConnected ? "Connected calendar account." : "Not connected yet."}</p>
                  </div>
                  <button
                    type="button"
                    className="todo-settings-ghost-btn"
                    onClick={() => updateSettingsDraft("outlookCalendarConnected", !settingsDraft.outlookCalendarConnected)}
                  >
                    {settingsDraft.outlookCalendarConnected ? "Disconnect" : "Connect"}
                  </button>
                </div>
                {renderSettingsFieldsByKeys(settingsCenterFieldGroups.integrations || [])}
              </div>
            )}

            {settingsIntegrationsView === "browse" && (
              <div className="todo-settings-browse-grid">
                {[
                  {
                    title: "Slack",
                    description: "Send task activity and reminders into Slack.",
                  },
                  {
                    title: "Google Calendar",
                    description: "Sync due dates with your calendar schedule.",
                  },
                  {
                    title: "Zapier",
                    description: "Automate actions between Todo and your other tools.",
                  },
                ].map((item) => (
                  <div className="todo-settings-browse-card" key={item.title}>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                    <button type="button" className="todo-settings-ghost-btn" onClick={() => toast(`${item.title} setup is coming soon.`)}>
                      Install
                    </button>
                  </div>
                ))}
              </div>
            )}

            {settingsIntegrationsView === "developer" && (
              <div className="todo-settings-developer-panel">
                <div className="todo-settings-provider-row">
                  <div>
                    <strong>Developer console</strong>
                    <p>Use API keys, webhooks, and automation helpers from one place.</p>
                  </div>
                  <button type="button" className="todo-settings-ghost-btn" onClick={() => toast("Developer console is coming soon.")}>
                    Open console
                  </button>
                </div>
                {renderSettingsToggleOption("experimentalist", "Enable developer experiments", "Show preview features intended for testing.")}
              </div>
            )}
          </section>
        </div>
      );
    } else if (settingsCenterTab === "calendars") {
      panelBody = (
        <div className="todo-settings-sheet">
          <section className="todo-settings-section">
            <div className="todo-settings-section__head">
              <div>
                <h5>Calendars</h5>
                <p>Connect calendars and choose whether Todo should show events and sync tasks back out.</p>
              </div>
              <span className="todo-settings-inline-note">{connectedCalendarCount} connected</span>
            </div>

            <div className="todo-settings-provider-list">
              <div className="todo-settings-provider-row">
                <div>
                  <strong>Connect Google Calendar</strong>
                  <p>Bring your Google events into the Todo calendar view.</p>
                </div>
                <button
                  type="button"
                  className="todo-settings-ghost-btn"
                  onClick={() => {
                    const nextValue = !settingsDraft.googleCalendarConnected;
                    updateSettingsDraft("googleCalendarConnected", nextValue);
                    toast.success(nextValue ? "Google Calendar connected." : "Google Calendar disconnected.");
                  }}
                >
                  {settingsDraft.googleCalendarConnected ? "Disconnect" : "Connect"}
                </button>
              </div>

              <div className="todo-settings-provider-row">
                <div>
                  <strong>Connect Outlook Calendar</strong>
                  <p>Keep Outlook events next to your planned work.</p>
                </div>
                <button
                  type="button"
                  className="todo-settings-ghost-btn"
                  onClick={() => {
                    const nextValue = !settingsDraft.outlookCalendarConnected;
                    updateSettingsDraft("outlookCalendarConnected", nextValue);
                    toast.success(nextValue ? "Outlook Calendar connected." : "Outlook Calendar disconnected.");
                  }}
                >
                  {settingsDraft.outlookCalendarConnected ? "Disconnect" : "Connect"}
                </button>
              </div>
            </div>

            <div className="todo-settings-option-list">
              {renderSettingsToggleOption("calendarShowEvents", "Show events in Todo", "Display calendar events alongside your tasks.")}
              {renderSettingsToggleOption("calendarSyncTasks", "Sync tasks to calendar", "Push Todo tasks back into connected calendars.")}
            </div>

            <div className="todo-settings-control-grid">
              {renderSettingsSelectCard("timezone", "Calendar timezone")}
            </div>
          </section>
        </div>
      );
    } else {
      panelBody = (
        <div className="todo-settings-sheet">
          <section className="todo-settings-sheet__section-head">
            <div>
              <h5>{activeTabInfo.title}</h5>
              <p>{activeTabInfo.description}</p>
            </div>
          </section>
          {renderSettingsFieldsByKeys(settingsCenterFieldGroups[settingsCenterTab] || [])}
        </div>
      );
    }

    const handleSettingsTabSelect = (tab: SettingsCenterTab) => {
      setSettingsCenterTab(tab);
      if (useSettingsMobileSplitView) {
        setSettingsMobileContentView(true);
      }
    };

    return (
      <div
        className={`todo-settings-center ${standaloneSettings ? "is-standalone-settings" : ""} ${
          isSettingsMobileLayout ? "is-mobile-layout" : ""
        } ${useSettingsMobileSplitView && isSettingsMobileSidebarOpen ? "is-mobile-nav-view" : ""} ${
          useSettingsMobileSplitView && !isSettingsMobileSidebarOpen ? "is-mobile-content-view" : ""
        }`.trim()}
      >
        {isSettingsMobileLayout && (
          <>
            <button
              type="button"
              className={`todo-settings-center__mobile-scrim ${isSettingsMobileSidebarOpen ? "is-visible" : ""}`.trim()}
              onClick={() => setSettingsMobileContentView(true)}
              aria-label="Close settings navigation"
            />

            <div className="todo-settings-center__mobile-toolbar">
              <button
                type="button"
                className="todo-settings-center__mobile-open"
                onClick={() => setSettingsMobileContentView((prev) => !prev)}
                aria-label={isSettingsMobileSidebarOpen ? "Close settings navigation" : "Open settings navigation"}
                aria-controls="todo-settings-mobile-sidebar"
                aria-expanded={isSettingsMobileSidebarOpen}
              >
                <i className={`bi ${isSettingsMobileSidebarOpen ? "bi-chevron-left" : "bi-chevron-right"}`} aria-hidden="true" />
              </button>

              <span className="todo-settings-center__mobile-current">Settings</span>

              <button
                type="button"
                className="todo-settings-center__mobile-close"
                onClick={closeWorkspaceModal}
                aria-label={standaloneSettings ? "Go back" : "Close settings"}
              >
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </div>
          </>
        )}

        {showSettingsNav && (
          <aside
            id="todo-settings-mobile-sidebar"
            className="todo-settings-center__sidebar"
            aria-label="Settings sections"
          >
            <div className="todo-settings-center__sidebar-head">
              {!isSettingsMobileLayout && <h4>Settings</h4>}
            </div>

            <label className="todo-settings-search" htmlFor="todo-settings-search">
              <i className="bi bi-search" aria-hidden="true" />
              <input
                id="todo-settings-search"
                type="search"
                placeholder="Search settings"
                value={settingsSearchQuery}
                onChange={(event) => setSettingsSearchQuery(event.target.value)}
              />
            </label>

            <div className="todo-settings-center__nav" role="tablist" aria-label="Settings sections">
              {visibleSettingsItems.length ? (
                visibleSettingsItems.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`todo-settings-center__nav-item ${settingsCenterTab === item.key ? "is-active" : ""}`}
                    onClick={() => handleSettingsTabSelect(item.key)}
                  >
                    <i className={`bi ${item.icon}`} aria-hidden="true" />
                    <span>{item.label}</span>
                  </button>
                ))
              ) : (
                <p className="todo-settings-center__empty">No settings found.</p>
              )}
            </div>

            {!isMobileViewport && (
              <button type="button" className="todo-settings-center__foot-link" onClick={openAddTeam}>
                <i className="bi bi-plus-lg" aria-hidden="true" />
                <span>Add team</span>
              </button>
            )}
          </aside>
        )}

        {showSettingsContent && (
          <section className="todo-settings-center__content">
            <div className={`todo-settings-center__topbar ${useMobileSettingsFooter ? "has-mobile-footer" : ""}`.trim()}>
              <div className="todo-settings-center__topbar-copy">
                {useSettingsMobileSplitView && (
                  <button
                    type="button"
                    className="todo-settings-center__mobile-back"
                    onClick={() => setSettingsMobileContentView(false)}
                  >
                    <i className="bi bi-chevron-left" aria-hidden="true" />
                    <span>Sections</span>
                  </button>
                )}
                <div>
                  <h4>{activeTabInfo.title}</h4>
                  <p>{activeTabInfo.description}</p>
                </div>
              </div>

              {!useMobileSettingsFooter && (
                <div className="todo-settings-center__topbar-actions">
                  {settingsSavedAt && (
                    <span className="todo-settings-center__saved">Saved at {settingsSavedAt}</span>
                  )}

                  <div className="todo-settings-center__action-buttons">
                    <button
                      type="button"
                      className="settings-btn-back todo-settings-secondary-btn"
                      onClick={resetSettingsModal}
                    >
                      Reset
                    </button>
                    <button
                      type="button"
                      className="todo-settings-primary-btn"
                      onClick={() => void saveSettingsModal()}
                      disabled={settingsSaveBusy}
                    >
                      {settingsSaveBusy ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </div>
              )}

              {!(standaloneSettings && isSettingsMobileLayout) && (
                <button
                  type="button"
                  className="todo-settings-center__close"
                  onClick={closeWorkspaceModal}
                  aria-label="Close settings"
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              )}
            </div>

            <div className="todo-settings-center__panel">{panelBody}</div>
            {useMobileSettingsFooter && (
              <div className="todo-settings-center__mobile-actions">
                {settingsSavedAt && (
                  <span className="todo-settings-center__saved">Saved at {settingsSavedAt}</span>
                )}

                <div className="todo-settings-center__action-buttons">
                  <button
                    type="button"
                    className="settings-btn-back todo-settings-secondary-btn"
                    onClick={resetSettingsModal}
                  >
                    Reset
                  </button>
                  <button
                    type="button"
                    className="todo-settings-primary-btn"
                    onClick={() => void saveSettingsModal()}
                    disabled={settingsSaveBusy}
                  >
                    {settingsSaveBusy ? "Saving..." : "Save changes"}
                  </button>
                </div>
              </div>
            )}

          </section>
        )}
      </div>
    );
  };

  const renderWorkspaceModal = () => {
    if (!workspaceModal) return null;

    let title = "";
    let subtitle = "";
    let sizeClass = "";
    let content: React.ReactNode = null;

    if (workspaceModal === "addTask") {
      title = "Add Todo";
      subtitle = "Create a new task in a focused popup without leaving the current page.";
      sizeClass = "todo-workspace-modal--large todo-workspace-modal--add-form";
      content = renderAddTaskCard("modal");
    }

    if (workspaceModal === "profile") {
      title = "Profile";
      subtitle = "Update workspace identity details and sidebar profile information.";
      content = (
        <div className="todo-workspace-panel">
          <div className="todo-workspace-profile-hero">
            <span className="todo-workspace-profile-avatar" aria-hidden="true">
              {profileDraft.avatar ? <img src={profileDraft.avatar} alt="" /> : getProfileInitial(profileDraft.name)}
            </span>
            <div className="todo-workspace-profile-copy">
              <h4>{profileDraft.name || defaultWorkspaceProfile.name}</h4>
              <p>{profileDraft.jobTitle || "Add job title"}{profileDraft.companyName ? ` at ${profileDraft.companyName}` : ""}</p>
            </div>
            <div className="todo-workspace-profile-actions">
              <button type="button" className="btn profile-btn-secondary" onClick={() => profileAvatarInputRef.current?.click()}>
                Upload Avatar
              </button>
              <button
                type="button"
                className="btn profile-btn-ghost"
                onClick={() => updateProfileDraft("avatar", "")}
                disabled={!profileDraft.avatar}
              >
                Remove
              </button>
            </div>
            <input
              ref={profileAvatarInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleProfileAvatarChange}
            />
          </div>

          <div className="settings-fields-grid">
            {workspaceProfileFields.map((field) => (
              <div className="settings-input-card" key={field.key}>
                <label className="form-label" htmlFor={`profile-modal-${field.key}`}>{field.label}</label>
                <input
                  id={`profile-modal-${field.key}`}
                  className="form-control"
                  type={field.type ?? "text"}
                  placeholder={field.placeholder}
                  value={profileDraft[field.key]}
                  onChange={(e) => updateProfileDraft(field.key, e.target.value)}
                />
              </div>
            ))}
            <div className="settings-input-card full-span">
              <label className="form-label" htmlFor="profile-modal-bio">Bio</label>
              <textarea
                id="profile-modal-bio"
                className="form-control todo-workspace-profile-bio"
                placeholder="Write short profile bio"
                value={profileDraft.bio}
                onChange={(e) => updateProfileDraft("bio", e.target.value)}
              />
            </div>
          </div>

          <div className="todo-workspace-modal-footer">
            <button type="button" className="btn profile-btn-ghost" onClick={resetProfileModal}>
              Reset
            </button>
            <button type="button" className="btn profile-btn-primary" onClick={saveProfileModal}>
              Save Profile
            </button>
          </div>
        </div>
      );
    }

    if (workspaceModal === "settings") {
      title = "Settings";
      subtitle = "Manage account and workspace preferences from one place.";
      sizeClass = "todo-workspace-modal--settings-center";
      content = renderSettingsCenterContent();
    }

    const hideModalHead = workspaceModal === "settings";

    return (
      <div className="todo-workspace-modal-overlay" onClick={closeWorkspaceModal}>
        <div className={`todo-workspace-modal ${sizeClass}`.trim()} onClick={(event) => event.stopPropagation()}>
          {hideModalHead ? (
            content
          ) : (
            <>
              <div className="todo-workspace-modal__head">
                <div>
                  <p className="todo-workspace-modal__eyebrow">Workspace Popup</p>
                  <h3>{title}</h3>
                  <p>{subtitle}</p>
                </div>
                <button
                  type="button"
                  className="todo-workspace-modal__close"
                  onClick={closeWorkspaceModal}
                  aria-label="Close popup"
                >
                  <i className="bi bi-x-lg" aria-hidden="true" />
                </button>
              </div>
              <div className="todo-workspace-modal__body">{content}</div>
            </>
          )}
        </div>
      </div>
    );
  };

  const sidebarPane =
    view !== "add" ? (
      <aside
        id="workspace-sidebar"
        className="todoist-sidebar todoist-sidebar-lite"
        aria-label="Workspace sidebar"
      >
          <div className="todo-side-head">
            <div className="todo-side-profile-wrap" ref={profileMenuRef}>
              <button
                type="button"
                className={`todo-side-profile-btn ${profileMenuOpen ? "is-open" : ""}`}
                onClick={(event) => {
                  event.stopPropagation();
                  setProfileMenuOpen((prev) => !prev);
                }}
                aria-expanded={profileMenuOpen}
                aria-haspopup="menu"
                title={isSidebarCollapsed ? sidebarProfile.name : undefined}
              >
                <span className="todoist-profile-avatar" aria-hidden="true">
                  {sidebarProfile.avatar ? <img src={sidebarProfile.avatar} alt="" /> : profileInitial.toLowerCase()}
                </span>
                <span className="todo-side-profile-copy">
                  <strong>{sidebarProfile.name}</strong>
                </span>
                <i className="bi bi-chevron-down" aria-hidden="true" />
              </button>

              {profileMenuOpen && (
                <div className="todo-profile-menu is-open" role="menu" aria-label="Workspace profile menu">
                  <div className="todo-profile-menu__summary" role="presentation">
                    <span className="todo-profile-menu__summary-icon" aria-hidden="true">
                      <i className="bi bi-check2-circle" aria-hidden="true" />
                    </span>
                    <span className="todo-profile-menu__summary-copy">
                      <strong>{sidebarProfile.name}</strong>
                      <small>{`${stats.completed}/${stats.total} tasks`}</small>
                    </span>
                    <span className="todo-profile-menu__hint">O then P</span>
                  </div>

                  <div className="todo-profile-menu__group">
                    <button
                      type="button"
                      className="todo-profile-menu__item"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        openSettingsPage("account");
                      }}
                    >
                      <span className="todo-profile-menu__item-left">
                        <i className="bi bi-gear" aria-hidden="true" />
                        <span>Settings</span>
                      </span>
                      <span className="todo-profile-menu__hint">O then S</span>
                    </button>
                    <button type="button" className="todo-profile-menu__item" onClick={openAddTeam}>
                      <span className="todo-profile-menu__item-left">
                        <i className="bi bi-plus-lg" aria-hidden="true" />
                        <span>Add a team</span>
                      </span>
                    </button>
                  </div>

                  <div className="todo-profile-menu__group">
                    <button type="button" className="todo-profile-menu__item" onClick={openActivityLog}>
                      <span className="todo-profile-menu__item-left">
                        <i className="bi bi-activity" aria-hidden="true" />
                        <span>Activity log</span>
                      </span>
                      <span className="todo-profile-menu__hint">G then A</span>
                    </button>
                    <button type="button" className="todo-profile-menu__item" onClick={printWorkspace}>
                      <span className="todo-profile-menu__item-left">
                        <i className="bi bi-printer" aria-hidden="true" />
                        <span>Print</span>
                      </span>
                      <span className="todo-profile-menu__hint">Ctrl P</span>
                    </button>
                    <button type="button" className="todo-profile-menu__item" onClick={openWhatsNew}>
                      <span className="todo-profile-menu__item-left">
                        <i className="bi bi-gift" aria-hidden="true" />
                        <span>What&apos;s new</span>
                      </span>
                    </button>
                  </div>

                  <div className="todo-profile-menu__group">
                    <button type="button" className="todo-profile-menu__item todo-profile-menu__item--highlight" onClick={openTryProOffer}>
                      <span className="todo-profile-menu__item-left">
                        <i className="bi bi-stars" aria-hidden="true" />
                        <span>Try Pro for free</span>
                      </span>
                    </button>
                  </div>

                  <div className="todo-profile-menu__group">
                    <button type="button" className="todo-profile-menu__item" onClick={() => void syncWorkspace()} disabled={menuSyncing}>
                      <span className="todo-profile-menu__item-left">
                        <i className={`bi ${menuSyncing ? "bi-arrow-repeat todo-spin" : "bi-arrow-repeat"}`} aria-hidden="true" />
                        <span>{menuSyncing ? "Syncing..." : "Sync"}</span>
                      </span>
                      <span className="todo-profile-menu__hint">{formatRelativeSyncTime(lastSyncedAt)}</span>
                    </button>
                  </div>

                  <div className="todo-profile-menu__group">
                    <button type="button" className="todo-profile-menu__item todo-profile-menu__item--danger" onClick={logoutWorkspace}>
                      <span className="todo-profile-menu__item-left">
                        <i className="bi bi-box-arrow-right" aria-hidden="true" />
                        <span>Log out</span>
                      </span>
                    </button>
                  </div>

                  <div className="todo-profile-menu__footer">
                    <span>v10004</span>
                    <span aria-hidden="true">.</span>
                    <button type="button" onClick={openWhatsNew}>Changelog</button>
                  </div>
                </div>
              )}
            </div>

            <button type="button" className="todo-side-icon-btn todo-side-bell-btn" onClick={openNotifications} aria-label="Notifications">
              <i className="bi bi-bell" aria-hidden="true" />
            </button>
            <button
              type="button"
              className="todo-side-icon-btn todo-side-collapse-btn"
              onClick={handleSidebarToggle}
              aria-label={
                isMobileViewport
                  ? "Close sidebar"
                  : isSidebarCollapsed
                    ? "Expand sidebar"
                    : "Collapse sidebar"
              }
              title={
                isMobileViewport
                  ? "Close sidebar"
                  : isSidebarCollapsed
                    ? "Expand sidebar"
                    : "Collapse sidebar"
              }
            >
              <i
                className={`bi ${
                  isMobileViewport
                    ? "bi-x-lg"
                    : isSidebarCollapsed
                      ? "bi-chevron-right"
                      : "bi-chevron-left"
                }`}
                aria-hidden="true"
              />
            </button>
          </div>

          <nav className="todo-side-list" aria-label="Workspace Navigation">
            {taskNav.map((item) => (
              <button
                key={`side-${item.id}`}
                type="button"
                className={`todo-side-link-row mode ${item.id === "addTask" ? "add" : ""} ${activeMode === item.id ? "active" : ""}`}
                data-nav-id={item.id}
                onClick={() => handleSidebarModeSelect(item.id)}
                title={isSidebarCollapsed ? item.label : undefined}
              >
                <i className={item.icon} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <section className="todo-side-projects" aria-label="My Projects">
            <p className="todo-side-project-title">My Projects</p>
            {projectRows.map((project) => (
              <button
                key={`project-${project.name}`}
                type="button"
                className="todo-side-project-row"
                data-side-tone="project"
                onClick={() => handleSidebarProjectSelect(project.name)}
                title={isSidebarCollapsed ? `${project.name} (${project.count})` : undefined}
              >
                <i className="bi bi-hash" aria-hidden="true" />
                <span>{project.name}</span>
                {settingsDraft.showTaskCountSidebar && <small>{project.count}</small>}
              </button>
            ))}
          </section>

          <div className="todo-side-footer-links">
            <button
              type="button"
              className="todo-side-footer-link"
              data-side-tone="team"
              onClick={openAddTeam}
              title={isSidebarCollapsed ? "Add a team" : undefined}
            >
              <i className="bi bi-plus-lg" aria-hidden="true" />
              <span>Add a team</span>
            </button>
            <button
              type="button"
              className="todo-side-footer-link"
              data-side-tone="help"
              onClick={() => {
                closeSidebarChrome();
                navigate("/contact");
              }}
              title={isSidebarCollapsed ? "Help & resources" : undefined}
            >
              <i className="bi bi-question-circle" aria-hidden="true" />
              <span>Help & resources</span>
            </button>
          </div>
      </aside>
    ) : null;

  return (
    <div className={`todo-page todoist-page todo-page-structured ${showAddLayout ? "todo-page--add-premium" : ""}`}>
      <Toaster position="bottom-right" />

      <div
        className={`todoist-shell todoist-shell--edge container-fluid px-0 ${view === "add" ? "todoist-shell-add" : ""} ${isSidebarCollapsed ? "todoist-shell--sidebar-collapsed" : ""} ${isSidebarDrawerOpen ? "todoist-shell--sidebar-open" : ""}`}
      >
        {sidebarPane}
        {view !== "add" && (
          <button
            type="button"
            className={`todo-sidebar-scrim ${isSidebarDrawerOpen ? "is-visible" : ""}`}
            onClick={closeSidebarChrome}
            aria-label="Close sidebar"
            tabIndex={isSidebarDrawerOpen ? 0 : -1}
          />
        )}
        <main className={`todoist-main ${view === "add" ? "todoist-main-add" : ""}`}>
          {view === "tasks" && isMobileViewport && (
            <div className="todo-main-toolbar" aria-label="Open workspace navigation">
              <button
                type="button"
                className={`todo-main-menu-btn todo-main-menu-btn--hamburger ${isSidebarDrawerOpen ? "is-open" : ""}`}
                onClick={handleSidebarDrawerToggle}
                aria-expanded={isSidebarDrawerOpen}
                aria-controls="workspace-sidebar"
                aria-label={isSidebarDrawerOpen ? "Close sidebar" : "Open sidebar"}
                title={isSidebarDrawerOpen ? "Close sidebar" : "Open sidebar"}
              >
                <span className="todo-main-menu-btn__bars" aria-hidden="true">
                  <span className="todo-main-menu-btn__bar" />
                  <span className="todo-main-menu-btn__bar" />
                  <span className="todo-main-menu-btn__bar" />
                </span>
                <span className="todo-main-menu-btn__label visually-hidden">
                  {isSidebarDrawerOpen ? "Close sidebar" : "Open sidebar"}
                </span>
              </button>

              <div className="todo-main-toolbar__brand" aria-label="Yono Todolist">
                <span className="todo-main-toolbar__brand-mark" aria-hidden="true">
                  <img src="/yono-favicon.svg" alt="" />
                </span>
                <span className="todo-main-toolbar__brand-copy">
                  <strong>Yono Todolist</strong>
                </span>
              </div>
            </div>
          )}
          {showAddLayout && (
            <>
              <section className="todo-add-outside-shell">
                <article className="todo-add-outside-copy">
                  <p className="todo-add-outside-kicker">Quick Notes</p>
                  <h3>Plan better before creating your next task</h3>
                  <p>
                    Add clear title, priority, due date, and estimated hours to keep execution fast
                    and trackable.
                  </p>
                </article>
              </section>

              {renderAddTaskCard()}
            </>
          )}

          {view === "tasks" && activeMode !== "addTask" && (
            <>
              {activeMode === "completed" && (
                <SectionCard
                  title="Completed Todo"
                  subtitle="Review finished work with detailed task fields, completion dates, and archived notes."
                  className="todo-completed-view"
                >
                  <div className="todo-completed-shell">
                    <section className="todo-completed-hero">
                      <div className="todo-completed-hero__copy">
                        <p className="todo-completed-kicker">Delivery Archive</p>
                        <h3>
                          {completedArchiveSummary.total === 0
                            ? "No completed todo yet"
                            : `${completedArchiveSummary.total} completed task${completedArchiveSummary.total === 1 ? "" : "s"} in your archive`}
                        </h3>
                        <p>
                          {searchQuery
                            ? `Showing completed todos matching "${searchInput.trim()}". Review them directly from the archive cards below.`
                            : "Review finished work directly from the archive cards with created/completed timestamps and saved task details."}
                        </p>
                      </div>

                      <div className="todo-completed-hero__actions">
                        <button
                          type="button"
                          className="todo-completed-action"
                          onClick={() => {
                            setActiveMode("list");
                            setActiveFilter("all");
                          }}
                        >
                          <i className="bi bi-list-check" aria-hidden="true" />
                          <span>All Tasks</span>
                        </button>
                        <button
                          type="button"
                          className="todo-completed-action"
                          onClick={() => {
                            setActiveMode("list");
                            setActiveFilter("pending");
                          }}
                        >
                          <i className="bi bi-hourglass-split" aria-hidden="true" />
                          <span>Pending Queue</span>
                        </button>
                        <button
                          type="button"
                          className="todo-completed-action is-primary"
                          onClick={openAddTaskModal}
                        >
                          <i className="bi bi-plus-lg" aria-hidden="true" />
                          <span>Add Task</span>
                        </button>
                      </div>
                    </section>

                    <div className="premium-dashboard-row">
                      {completedArchiveSummaryCards.map((field) => (
                        <article key={`completed-${field.label}`} className="premium-metric-card">
                          <header className="premium-metric-card__head">
                            <span className="premium-metric-label">{field.label}</span>
                            <strong className="premium-metric-value">{field.value}</strong>
                          </header>
                          <div className="premium-metric-card__sub">
                            <span className="premium-metric-subtext">{field.subtext}</span>
                          </div>
                          <div className="premium-metric-bar-container">
                            <div
                              className={`premium-metric-bar-fill ${field.accent}`}
                              style={{ width: `${Math.min(100, field.progress)}%` }}
                            />
                          </div>
                        </article>
                      ))}
                    </div>

                    <div className="todo-completed-layout">
                      <div className="todo-completed-main">
                        {completedArchiveGroups.length === 0 ? (
                          <div className="todo-completed-empty-state" role="status" aria-live="polite">
                            <div className="todo-completed-empty-state__art" aria-hidden="true">
                              <span />
                              <i className="bi bi-check2-circle" />
                            </div>
                            <h4>{searchQuery ? "No completed todo matched your search" : "Complete a task to build your archive"}</h4>
                            <p>
                              {searchQuery
                                ? "Try another keyword or clear the current search to review finished work."
                                : "As soon as a task is marked done, it will appear here with full completion details and archive fields."}
                            </p>
                          </div>
                        ) : (
                          <section className="todo-completed-archive" aria-label="Completed archive timeline">
                            <div className="todo-completed-archive__head">
                              <div>
                                <p className="todo-completed-kicker">Archive Feed</p>
                                <h3>Review every finished task with a cleaner completion timeline</h3>
                              </div>
                              <span>{completedArchiveTasks.length} archived task{completedArchiveTasks.length === 1 ? "" : "s"}</span>
                            </div>

                            <div className="todo-task-date-groups todo-task-date-groups--dashboard todo-task-date-groups--showcase todo-task-date-groups--completed">
                              {completedArchiveGroups.map((group) => (
                                <section key={group.key} className="todo-task-date-group">
                                  <header className="todo-task-date-group-head todo-task-date-group-head--completed">
                                    <div>
                                      <p>Completed On</p>
                                      <h2>{formatLongDayDate(getDayDateInput(group.date))}</h2>
                                    </div>
                                    <span>{group.tasks.length} task{group.tasks.length === 1 ? "" : "s"}</span>
                                  </header>

                                  <div className="todo-completed-archive-grid">
                                    {group.tasks.map((task) => {
                                      const taskAssignee = splitAssigneeNames(task.assignee)[0] || task.assignee?.trim() || "Unassigned";
                                      const taskProject = task.project?.trim() || task.category?.trim() || "General";
                                      const taskDepartment = task.department?.trim() || task.category?.trim() || "General";
                                      const taskSummary =
                                        task.statusNote?.trim()
                                        || task.description?.trim()
                                        || "Completed task archived without a final note.";
                                      const commentCount = task.comments.filter((comment) => comment.text.trim().length > 0).length;
                                      const checkpointCount = task.checkpoints.filter(Boolean).length;
                                      const createdLabel = formatDateTime(task.createdAt);
                                      const completedLabel =
                                        typeof task.completedAt === "number" ? formatDateTime(task.completedAt) : "Recorded";
                                      const completionTimeLabel =
                                        typeof task.completedAt === "number"
                                          ? formatCompletionDuration(task.createdAt, task.completedAt)
                                          : "Captured";
                                      const dueLabel = (() => {
                                        if (typeof task.dueAt !== "string" || task.dueAt.trim().length === 0) return "No due date";
                                        const dueDate = new Date(task.dueAt);
                                        return Number.isNaN(dueDate.getTime()) ? "No due date" : formatDateTime(dueDate.getTime());
                                      })();

                                      return (
                                        <article
                                          key={task.id}
                                          className="todo-completed-archive-card"
                                        >
                                          <div className="todo-completed-archive-card__top">
                                            <div className="todo-completed-archive-card__title">
                                              <span>{taskProject}</span>
                                              <h4>{task.title}</h4>
                                              <p>{taskSummary}</p>
                                            </div>

                                            <div className="todo-completed-archive-card__status">
                                              <span className={`todo-completed-priority-badge ${getPriorityClass(task.priority)}`}>
                                                {task.priority}
                                              </span>
                                              <span className="todo-completed-archive-card__focus-pill">
                                                Archived
                                              </span>
                                            </div>
                                          </div>

                                          <div className="todo-completed-archive-card__meta">
                                            <span>
                                              <i className="bi bi-person" aria-hidden="true" />
                                              {taskAssignee}
                                            </span>
                                            <span>
                                              <i className="bi bi-diagram-3" aria-hidden="true" />
                                              {taskDepartment}
                                            </span>
                                            <span>
                                              <i className="bi bi-chat-left-text" aria-hidden="true" />
                                              {commentCount} comment{commentCount === 1 ? "" : "s"}
                                            </span>
                                            <span>
                                              <i className="bi bi-list-check" aria-hidden="true" />
                                              {checkpointCount} checkpoint{checkpointCount === 1 ? "" : "s"}
                                            </span>
                                          </div>

                                          <div className="todo-completed-archive-card__timeline">
                                            <article>
                                              <span>Created</span>
                                              <strong>{createdLabel}</strong>
                                            </article>
                                            <article>
                                              <span>Completed</span>
                                              <strong>{completedLabel}</strong>
                                            </article>
                                            <article>
                                              <span>Time Taken</span>
                                              <strong>{completionTimeLabel}</strong>
                                            </article>
                                            <article>
                                              <span>Due Window</span>
                                              <strong>{dueLabel}</strong>
                                            </article>
                                          </div>
                                        </article>
                                      );
                                    })}
                                  </div>
                                </section>
                              ))}
                            </div>
                          </section>
                        )}
                      </div>
                    </div>
                  </div>
                </SectionCard>
              )}

              {activeMode === "list" && (
                <SectionCard>
                  <div className="todo-dashboard-shell todo-dashboard-shell--showcase">
                    <section className="todo-dashboard-task-panel todo-dashboard-task-panel--showcase" aria-label="Task dashboard list">
                      <div className="todo-dashboard-showcase-topbar" aria-label="Task workspace controls">
                        <div className="todo-dashboard-showcase-tabs">
                          <button
                            type="button"
                            className={`todo-dashboard-showcase-tab ${activeFilter === "all" ? "active" : ""}`}
                            onClick={() => setActiveFilter("all")}
                          >
                            <i className="bi bi-circle" aria-hidden="true" />
                            <span>{activeFilter === "all" ? "All Tasks" : activeFilterLabel}</span>
                          </button>
                          <button
                            type="button"
                            className="todo-dashboard-showcase-tab"
                            onClick={() => setActiveMode("board")}
                          >
                            <i className="bi bi-columns-gap" aria-hidden="true" />
                            <span>Kanban Board</span>
                          </button>
                          <button
                            type="button"
                            className="todo-dashboard-showcase-tab"
                            onClick={() => setActiveMode("dashboard")}
                          >
                            <i className="bi bi-folder2-open" aria-hidden="true" />
                            <span>Reports/Insights</span>
                          </button>
                        </div>

                        <div className="todo-dashboard-showcase-actions">
                          <button
                            type="button"
                            className="btn todoist-add-btn todo-dashboard-showcase-create"
                            onClick={openAddTaskModal}
                          >
                            <i className="bi bi-plus-lg" aria-hidden="true" />
                            <span>Create Task</span>
                          </button>

                          <div className="todo-dashboard-showcase-filters" aria-label="Task filters">
                            <button
                              type="button"
                              className={`todo-dashboard-showcase-filter ${activeFilter === "all" ? "active" : ""}`}
                              onClick={() => setActiveFilter("all")}
                              aria-label="Show all tasks"
                            >
                              <i className="bi bi-grid-1x2" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={`todo-dashboard-showcase-filter ${activeFilter === "pending" ? "active" : ""}`}
                              onClick={() => setActiveFilter("pending")}
                              aria-label="Show pending tasks"
                            >
                              <i className="bi bi-hourglass-split" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              className={`todo-dashboard-showcase-filter ${activeFilter === "completed" ? "active" : ""}`}
                              onClick={() => setActiveFilter("completed")}
                              aria-label="Show completed tasks"
                            >
                              <i className="bi bi-list-check" aria-hidden="true" />
                            </button>
                          </div>

                        </div>
                      </div>

                      <div className="todo-dashboard-showcase-summary">
                        {taskListSummaryCards.map((item) => (
                          <article
                            key={item.label}
                            className={`todo-dashboard-showcase-card ${item.emphasis ? `is-${item.emphasis}` : ""}`}
                          >
                            <div className="todo-dashboard-showcase-card__head">
                              <span>{item.label}</span>
                              <strong>{item.value}</strong>
                            </div>
                            <small>{item.caption}</small>
                            <div className="todo-dashboard-showcase-card__bar" aria-hidden="true">
                              <span style={{ width: `${item.progress}%` }} />
                            </div>
                          </article>
                        ))}
                      </div>

                      <div className={`todo-dashboard-task-body todo-dashboard-task-body--showcase ${groupedListTasks.length === 0 ? "is-empty" : ""}`}>
                        {groupedListTasks.length === 0 ? (
                          <div className="todo-empty-state" role="status" aria-live="polite">
                            <div className="todo-empty-state-art" aria-hidden="true">
                              <span className="todo-empty-state-sheet todo-empty-state-sheet--back" />
                              <span className="todo-empty-state-sheet todo-empty-state-sheet--front" />
                              <span className="todo-empty-state-orb" />
                            </div>
                            <h3>{searchQuery ? "No task matched your search" : "Your task space is empty"}</h3>
                            <p>
                              {searchQuery
                                ? "Try a different keyword, clear the current search, or create a new task from this workspace."
                                : "Create your first task with category, priority, due date, estimate, and attachment details."}
                            </p>
                            <div className="todo-empty-state-actions">
                              <button type="button" className="btn todoist-add-btn todo-dashboard-add-link" onClick={openAddTaskModal}>
                                <i className="bi bi-plus-lg" aria-hidden="true" />
                                <span>Create Task</span>
                              </button>
                              {searchQuery && (
                                <button type="button" className="btn btn-outline-secondary todo-empty-state-clear" onClick={clearTaskSearch}>
                                  Clear Search
                                </button>
                              )}
                            </div>
                            <div className="todo-empty-state-notes">
                              <span>Priority and due date</span>
                              <span>Attachment ready</span>
                              <span>Simple task details</span>
                            </div>
                          </div>
                        ) : (
                          <section className="todo-task-date-groups todo-task-date-groups--dashboard todo-task-date-groups--showcase">
                            {groupedListTasks.map((group) => (
                              <section key={group.key} className="todo-task-date-group">
                                <header className="todo-task-date-group-head">
                                  <h2>{formatLongDayDate(getDayDateInput(group.date))}</h2>
                                </header>

                                <div className="todo-task-date-group-list">
                                  {group.tasks.map((t) => {
                                    const isCompletedView = activeFilter === "completed" && t.done;
                                    return renderPremiumTaskCard(t, {
                                      imageVariant: "list",
                                      showCompletion: isCompletedView,
                                      stackClassName: "todo-task-stack--grouped",
                                      cardClassName: "todoist-task--dashboard",
                                      showDateStrip: false,
                                    });
                                  })}
                                </div>
                              </section>
                            ))}
                          </section>
                        )}
                      </div>

                      {groupedListTasks.length > 0 && (
                        <footer className="todo-dashboard-showcase-footer">
                          <p>{`Total Assigned Tasks: ${String(taskListAssignedCount).padStart(2, "0")}`}</p>
                        </footer>
                      )}
                    </section>
                  </div>
                </SectionCard>
              )}
              {activeMode === "board" && (
                <PremiumBoardView 
                  tasks={boardVisibleTasks} 
                  boardPlannerItems={boardPlannerItems}
                  selectedBoardLane={selectedBoardLane}
                  selectedBoardDate={selectedBoardDate}
                  currentUserName={sidebarProfile.name.trim() || profileDraft.name.trim()}
                  currentUserEmail={profileDraft.email.trim().toLowerCase()}
                  currentUserAvatar={sidebarProfile.avatar || profileDraft.avatar}
                  onDateChange={(date) => setSelectedBoardDate(date)}
                  onLaneSelect={(lane, date) => {
                    setSelectedBoardLane(lane);
                    setSelectedBoardDate(date);
                  }}
                  onToggleDone={(taskId) => {
                    void handleTaskToggle(taskId);
                  }}
                  onDelete={(taskId) => { const task = todos.find(t => t.id === taskId); if (task) setDeleteTarget(task); }} 
                  onEdit={(task) => startEdit(task)}
                  onOpenComment={(task) => openCommentComposer(task)}
                  onOpenAddModal={openAddTaskModal} 
                />
              )}

              {activeMode === "timeline" && (
                <SectionCard>
                  <div className="todo-timeline-shell">
                    <div className="todo-timeline-topbar">
                      <div className="todo-timeline-topbar__copy">
                        <p className="todo-timeline-kicker">
                          <i className="bi bi-bezier2" aria-hidden="true" />
                          Activity Flow
                        </p>
                        <div>
                          <h2>Timeline</h2>
                          <p>Track task activity with date and time</p>
                        </div>
                      </div>

                      <div className="todo-timeline-controls">
                        <div className="todo-timeline-range-switch" role="tablist" aria-label="Timeline date range">
                          {timelineRangeOptions.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              className={`todo-timeline-range-chip ${timelineRangeFilter === option.id ? "is-active" : ""}`}
                              onClick={() => setTimelineRangeFilter(option.id)}
                              aria-pressed={timelineRangeFilter === option.id}
                            >
                              {option.label}
                            </button>
                          ))}
                        </div>

                        <div
                          className={`todo-timeline-select ${timelineFilterMenuOpen ? "is-open" : ""}`}
                          ref={timelineFilterMenuRef}
                        >
                          <button
                            type="button"
                            className="todo-timeline-select__field todo-timeline-select__trigger"
                            onClick={() => setTimelineFilterMenuOpen((prev) => !prev)}
                            aria-haspopup="listbox"
                            aria-expanded={timelineFilterMenuOpen}
                            aria-label="Filter timeline activity"
                          >
                            <i className="bi bi-funnel todo-timeline-select__icon" aria-hidden="true" />
                            <span className="todo-timeline-select__value">
                              {selectedTimelineActivityOption.label}
                            </span>
                            <i className="bi bi-chevron-down todo-timeline-select__caret" aria-hidden="true" />
                          </button>
                          {timelineFilterMenuOpen && (
                            <div className="todo-timeline-select__menu" role="listbox" aria-label="Timeline activity filters">
                              {timelineActivityFilterOptions.map((option) => (
                                <button
                                  key={option.id}
                                  type="button"
                                  role="option"
                                  aria-selected={timelineActivityFilter === option.id}
                                  className={`todo-timeline-select__option ${timelineActivityFilter === option.id ? "is-active" : ""}`}
                                  onClick={() => {
                                    setTimelineActivityFilter(option.id);
                                    setTimelineFilterMenuOpen(false);
                                  }}
                                >
                                  <span>{option.label}</span>
                                  <i className="bi bi-check2" aria-hidden="true" />
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <label className="todo-timeline-search" htmlFor="timeline-search-input">
                          <i className="bi bi-search todo-timeline-search__icon" aria-hidden="true" />
                          <input
                            id="timeline-search-input"
                            type="search"
                            value={timelineSearchInput}
                            onChange={(e) => setTimelineSearchInput(e.target.value)}
                            placeholder="Search tasks"
                            aria-label="Search timeline tasks"
                          />
                        </label>
                      </div>
                    </div>

                    {timelineRangeFilter === "custom" && (
                      <div className="todo-timeline-custom-range">
                        <label>
                          <span>From</span>
                          <input
                            type="date"
                            className="form-control"
                            value={timelineCustomStartDate}
                            onChange={(e) => setTimelineCustomStartDate(e.target.value)}
                          />
                        </label>
                        <label>
                          <span>To</span>
                          <input
                            type="date"
                            className="form-control"
                            value={timelineCustomEndDate}
                            onChange={(e) => setTimelineCustomEndDate(e.target.value)}
                          />
                        </label>
                      </div>
                    )}

                    <div className="todo-timeline-layout">
                      <div className="todo-timeline-primary">
                        <section className="todo-timeline-panel">
                          <div className="todo-timeline-panel-head">
                            <div>
                              <p className="todo-timeline-kicker">Visible Stream</p>
                              <h3>{timelineVisibleEvents.length} actions in view</h3>
                              <span>{timelinePeriodLabel}</span>
                            </div>
                            <span className="todo-timeline-panel-badge">
                              {timelineActivityFilter === "all" ? "All activity" : timelineActivityFilterOptions.find((item) => item.id === timelineActivityFilter)?.label}
                            </span>
                          </div>

                          <div className="todo-timeline-scroll">
                            {timelineGroups.length === 0 ? (
                              <div className="todo-timeline-empty-state">
                                <div className="todo-timeline-empty-state__art" aria-hidden="true">
                                  <span />
                                  <span />
                                  <i className="bi bi-stars" />
                                </div>
                                <div>
                                  <h4>No activity found for this period</h4>
                                  <p>Change the range, clear filters, or create a new task to start building your activity trail.</p>
                                </div>
                                <button type="button" className="todo-timeline-action-btn is-primary" onClick={openAddTaskModal}>
                                  <i className="bi bi-plus-circle" aria-hidden="true" />
                                  <span>Create your first task</span>
                                </button>
                              </div>
                            ) : (
                              timelineGroups.map((group) => (
                                <section key={group.key} className="todo-timeline-group">
                                  <header className="todo-timeline-group__header">
                                    <span>{group.label}</span>
                                    <small>{group.items.length} event{group.items.length === 1 ? "" : "s"}</small>
                                  </header>

                                  <div className="todo-timeline-group__items">
                                    {group.items.map((item, itemIndex) => {
                                      const activityMeta = timelineActivityMeta[item.type];
                                      const displayName = item.actorName?.trim() || item.assignee?.trim() || "Workspace";
                                      const avatarMatch =
                                        sidebarProfile.avatar
                                        && sidebarProfile.name.trim()
                                        && displayName.toLowerCase() === sidebarProfile.name.trim().toLowerCase();

                                      return (
                                        <article
                                          key={item.id}
                                          className={`todo-timeline-entry ${activityMeta.toneClass} ${activeTimelineItemId === item.id ? "is-active" : ""}`}
                                          onMouseEnter={() => setActiveTimelineItemId(item.id)}
                                          onMouseLeave={() => setActiveTimelineItemId((current) => (current === item.id ? null : current))}
                                          onFocus={() => setActiveTimelineItemId(item.id)}
                                          onBlur={() => setActiveTimelineItemId((current) => (current === item.id ? null : current))}
                                          style={{ animationDelay: `${Math.min(itemIndex * 70, 420)}ms` }}
                                          tabIndex={0}
                                        >
                                          <div className="todo-timeline-entry__time">
                                            <strong>{formatTimeLabel(item.timestamp)}</strong>
                                            <span>{activityMeta.helper}</span>
                                          </div>

                                          <div className="todo-timeline-entry__spine" aria-hidden="true">
                                            <span className={`todo-timeline-entry__dot ${activityMeta.toneClass}`}>
                                              <i className={activityMeta.icon} />
                                            </span>
                                          </div>

                                          <div className="todo-timeline-entry__card">
                                            <div className="todo-timeline-entry__head">
                                              <div>
                                                <p className={`todo-timeline-entry__badge ${activityMeta.toneClass}`}>{activityMeta.label}</p>
                                                <h4>{item.title}</h4>
                                              </div>

                                              <div className="todo-timeline-entry__avatar">
                                                {avatarMatch ? (
                                                  <img src={sidebarProfile.avatar} alt={displayName} />
                                                ) : (
                                                  <span>{getAvatarInitials(displayName)}</span>
                                                )}
                                              </div>
                                            </div>

                                            <p className="todo-timeline-entry__description">{item.description || "No description provided."}</p>

                                            <div className="todo-timeline-entry__meta">
                                              <span>
                                                <i className="bi bi-clock-history" aria-hidden="true" />
                                                {formatDateTime(item.timestamp)}
                                              </span>
                                              <span>
                                                <i className="bi bi-folder2-open" aria-hidden="true" />
                                                {item.category}
                                              </span>
                                              <span>
                                                <i className="bi bi-person" aria-hidden="true" />
                                                {displayName}
                                              </span>
                                              {item.priority ? (
                                                <span className={`todo-timeline-entry__priority is-${item.priority.toLowerCase()}`}>
                                                  {item.priority} priority
                                                </span>
                                              ) : null}
                                            </div>
                                          </div>
                                        </article>
                                      );
                                    })}
                                  </div>
                                </section>
                              ))
                            )}
                          </div>
                        </section>
                      </div>

                      <aside className="todo-timeline-sidebar">
                        <section className="todo-timeline-panel">
                          <div className="todo-timeline-panel-head">
                            <div>
                              <p className="todo-timeline-kicker">Activity Summary</p>
                              <h3>Live snapshot</h3>
                              <span>Quick counts based on the timeline you are viewing right now.</span>
                            </div>
                          </div>

                          <div className="todo-timeline-metrics">
                            <article>
                              <span>Actions today</span>
                              <strong>{timelineSummary.actionsToday}</strong>
                              <small>All logged activity for today.</small>
                            </article>
                            <article className="is-success">
                              <span>Completed tasks</span>
                              <strong>{timelineSummary.completedInView}</strong>
                              <small>Finished work inside the selected period.</small>
                            </article>
                            <article className="is-info">
                              <span>Created tasks</span>
                              <strong>{timelineSummary.createdInView}</strong>
                              <small>New work added in the visible stream.</small>
                            </article>
                            <article className="is-warning">
                              <span>Updated / risk</span>
                              <strong>{timelineSummary.changedInView + timelineSummary.riskInView}</strong>
                              <small>{timelineSummary.changedInView} updates and {timelineSummary.riskInView} red-flag events.</small>
                            </article>
                          </div>
                        </section>

                        <section className="todo-timeline-panel">
                          <div className="todo-timeline-panel-head">
                            <div>
                              <p className="todo-timeline-kicker">Legend</p>
                              <h3>Color guide</h3>
                              <span>Read the timeline at a glance.</span>
                            </div>
                          </div>

                          <div className="todo-timeline-legend">
                            {timelineLegendItems.map((item) => (
                              <article key={item.label}>
                                <div className={`todo-timeline-legend__dot ${timelineActivityMeta[item.type].toneClass}`} />
                                <div>
                                  <strong>{item.label}</strong>
                                  <p>{item.copy}</p>
                                </div>
                              </article>
                            ))}
                          </div>
                        </section>

                        <section className="todo-timeline-panel">
                          <div className="todo-timeline-panel-head">
                            <div>
                              <p className="todo-timeline-kicker">Quick Actions</p>
                              <h3>Move faster</h3>
                              <span>Jump into the next screen without leaving the activity view.</span>
                            </div>
                          </div>

                          <div className="todo-timeline-actions">
                            <button type="button" className="todo-timeline-action-btn is-primary" onClick={openAddTaskModal}>
                              <i className="bi bi-plus-circle" aria-hidden="true" />
                              <span>Add Task</span>
                            </button>
                            <button type="button" className="todo-timeline-action-btn" onClick={() => setActiveMode("calendar")}>
                              <i className="bi bi-calendar3" aria-hidden="true" />
                              <span>Go to Calendar</span>
                            </button>
                            <button type="button" className="todo-timeline-action-btn" onClick={() => setActiveMode("list")}>
                              <i className="bi bi-list-check" aria-hidden="true" />
                              <span>View All Tasks</span>
                            </button>
                          </div>
                        </section>
                      </aside>
                    </div>
                  </div>
                </SectionCard>
              )}

              {activeMode === "calendar" && (
                <SectionCard title="Calendar" subtitle="Track tasks by date and activity">
                  <div className="todo-calendar-dashboard-shell">
                    <div className="todo-calendar-topbar">
                      <div className="todo-calendar-topbar__content">
                        <div className="todo-calendar-topbar__eyebrow">
                          <i className="bi bi-stars" aria-hidden="true" />
                          <span>{calendarSelectedDateLabel}</span>
                        </div>
                        <div className="todo-calendar-quick-filters" role="tablist" aria-label="Calendar filters">
                          {calendarQuickFilterOptions.map((filter) => (
                            <button
                              key={filter.id}
                              type="button"
                              className={`todo-calendar-filter-chip ${calendarQuickFilter === filter.id ? "is-active" : ""}`}
                              onClick={() => setCalendarQuickFilter(filter.id)}
                            >
                              <i className={filter.icon} aria-hidden="true" />
                              <span>{filter.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="todo-calendar-date-control">
                        <label htmlFor="task-date">Select date</label>
                        <div className="todo-calendar-date-input-wrap">
                          <i className="bi bi-calendar-event" aria-hidden="true" />
                          <input
                            id="task-date"
                            type="date"
                            className="form-control"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="todo-calendar-summary-bar">
                      <article className="todo-calendar-summary-card">
                        <span>Total tasks</span>
                        <strong>{calendarSelectedDateSummary.total}</strong>
                        <small>All activity items for the selected date</small>
                      </article>
                      <article className="todo-calendar-summary-card is-success">
                        <span>Completed</span>
                        <strong>{calendarSelectedDateSummary.completed}</strong>
                        <small>Closed and delivered on this date</small>
                      </article>
                      <article className="todo-calendar-summary-card is-warning">
                        <span>Pending</span>
                        <strong>{calendarSelectedDateSummary.pending}</strong>
                        <small>Still active or waiting for action</small>
                      </article>
                    </div>

                    <div className="todo-calendar-dashboard">
                      <div className="todo-calendar-primary">
                        <section className="todo-calendar-panel-card">
                          <div className="todo-calendar-panel-head">
                            <div>
                              <p className="todo-calendar-kicker">Monthly planner</p>
                              <h3>{calendarMonthLabel}</h3>
                              <span>Every date shows task history, pending work, and overdue pressure.</span>
                            </div>

                            <div className="todo-calendar-month-actions">
                              <button type="button" className="todo-calendar-icon-btn" onClick={() => setSelectedDate((prev) => shiftCalendarMonth(prev, -1))}>
                                <i className="bi bi-chevron-left" aria-hidden="true" />
                              </button>
                              <button type="button" className="todo-calendar-month-chip" onClick={() => setSelectedDate(getDayDateInput(Date.now()))}>
                                Today
                              </button>
                              <button type="button" className="todo-calendar-icon-btn" onClick={() => setSelectedDate((prev) => shiftCalendarMonth(prev, 1))}>
                                <i className="bi bi-chevron-right" aria-hidden="true" />
                              </button>
                            </div>
                          </div>

                          <div className="todo-calendar-grid-weekdays">
                            {calendarWeekdayLabels.map((label) => (
                              <span key={label}>{label}</span>
                            ))}
                          </div>

                          <div className="todo-calendar-grid">
                            {calendarMonthDays.map((day) => {
                              const dayStats = calendarDateMap.get(day.dateKey);
                              const indicatorCount =
                                Number(Boolean(dayStats?.completed)) + Number(Boolean(dayStats?.pending)) + Number(Boolean(dayStats?.overdue));

                              return (
                                <button
                                  key={day.dateKey}
                                  type="button"
                                  className={`todo-calendar-day ${day.dateKey === selectedDate ? "is-active" : ""} ${day.isToday ? "is-today" : ""} ${day.isCurrentMonth ? "" : "is-outside"}`}
                                  onClick={() => setSelectedDate(day.dateKey)}
                                >
                                  <div className="todo-calendar-day__head">
                                    <span>{day.dayNumber}</span>
                                    {dayStats?.tasks.length ? <small>{dayStats.tasks.length}</small> : null}
                                  </div>

                                  <div className="todo-calendar-day__body">
                                    <div className="todo-calendar-day__dots">
                                      {dayStats?.completed ? <span className="is-success" title={`${dayStats.completed} completed`} /> : null}
                                      {dayStats?.pending ? <span className="is-warning" title={`${dayStats.pending} pending`} /> : null}
                                      {dayStats?.overdue ? <span className="is-danger" title={`${dayStats.overdue} overdue`} /> : null}
                                      {!indicatorCount ? <span className="is-muted" /> : null}
                                    </div>
                                      <p>
                                        {dayStats?.tasks.length
                                        ? `${dayStats.completed} done / ${dayStats.pending} open`
                                        : "No tasks"}
                                      </p>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </section>

                        <section className="todo-calendar-panel-card">
                          <div className="todo-calendar-panel-head">
                            <div>
                              <p className="todo-calendar-kicker">Timeline / Activity Feed</p>
                              <h3>{calendarSelectedDateLabel}</h3>
                              <span>All selected-date task activity appears here in a clean history view.</span>
                            </div>
                            <span className="todo-calendar-panel-badge">{calendarHistoryItems.length} events</span>
                          </div>

                          <div className="todo-calendar-feed">
                            {calendarHistoryItems.length === 0 ? (
                              <div className="todo-calendar-empty-state">
                                <div className="todo-calendar-empty-state__icon">
                                  <i className="bi bi-clock-history" aria-hidden="true" />
                                </div>
                                <div>
                                  <h4>No activity logged</h4>
                                  <p>Select another date or switch filters to explore task history.</p>
                                </div>
                              </div>
                            ) : (
                              calendarHistoryItems.map((item) => {
                                const actorName = item.task.assignee || sidebarProfile.name.trim() || "You";
                                const actionText =
                                  item.type === "completed"
                                    ? `You completed ${item.task.title}`
                                    : item.type === "created"
                                      ? `You created ${item.task.title}`
                                      : `You updated ${item.task.title} for the daily plan`;

                                return (
                                  <article key={item.id} className={`todo-calendar-feed-item is-${item.type}`}>
                                    <div className="todo-calendar-feed-avatar">{getAvatarInitials(actorName)}</div>
                                    <div className="todo-calendar-feed-content">
                                      <div className="todo-calendar-feed-head">
                                        <strong>{actorName}</strong>
                                        <span>{formatTimeLabel(item.timestamp)}</span>
                                      </div>
                                      <p>{actionText}</p>
                                      <div className="todo-calendar-feed-meta">
                                        <span>{item.task.category}</span>
                                        <span>{item.task.priority} priority</span>
                                        <span>{item.task.done ? "Completed" : isTodoOverdue(item.task) ? "Overdue" : "Pending"}</span>
                                      </div>
                                    </div>
                                  </article>
                                );
                              })
                            )}
                          </div>
                        </section>
                      </div>

                      <aside className="todo-calendar-sidebar">
                        <section className="todo-calendar-panel-card">
                          <div className="todo-calendar-panel-head">
                            <div>
                              <p className="todo-calendar-kicker">Task List</p>
                              <h3>{calendarFilteredTasks.length} tasks on this date</h3>
                              <span>Every related item for the selected date appears here like a structured history.</span>
                            </div>
                          </div>

                          <div className="todo-calendar-task-list">
                            {calendarFilteredTasks.length === 0 ? (
                              <div className="todo-calendar-empty-state is-compact">
                                <div className="todo-calendar-empty-state__icon">
                                  <i className="bi bi-calendar2-x" aria-hidden="true" />
                                </div>
                                <div>
                                  <h4>No tasks found</h4>
                                  <p>This date has no tasks for the current filter.</p>
                                </div>
                              </div>
                            ) : (
                              calendarFilteredTasks.map((task) => {
                                const match = getCalendarTaskMatchState(task, selectedDate);
                                const statusLabel = task.done ? "Completed" : isTodoOverdue(task) ? "Overdue" : "Pending";

                                return (
                                  <article key={`calendar-task-${task.id}`} className="todo-calendar-task-item">
                                    <div className={`todo-calendar-task-item__check ${task.done ? "is-complete" : ""}`}>
                                      <i className={`bi ${task.done ? "bi-check2" : "bi-circle"}`} aria-hidden="true" />
                                    </div>

                                    <div className="todo-calendar-task-item__body">
                                      <div className="todo-calendar-task-item__head">
                                        <h4>{task.title}</h4>
                                        <span className={`todo-calendar-status-badge ${statusLabel.toLowerCase()}`}>{statusLabel}</span>
                                      </div>

                                      <div className="todo-calendar-task-item__meta">
                                        <span className={`todo-calendar-priority-badge ${task.priority.toLowerCase()}`}>{task.priority}</span>
                                        {match.created ? <span>Created</span> : null}
                                        {match.completed ? <span>Completed</span> : null}
                                        {match.due ? <span>Scheduled</span> : null}
                                      </div>

                                      <small>
                                        {task.completedAt && match.completed
                                          ? `Closed at ${formatTimeLabel(task.completedAt)}`
                                          : `Tracked at ${formatTimeLabel(task.createdAt)}`}
                                      </small>
                                    </div>
                                  </article>
                                );
                              })
                            )}
                          </div>
                        </section>

                        <section className="todo-calendar-panel-card">
                          <div className="todo-calendar-panel-head">
                            <div>
                              <p className="todo-calendar-kicker">Insights</p>
                              <h3>Performance snapshot</h3>
                              <span>Daily health metrics based on the selected date and its visible tasks.</span>
                            </div>
                          </div>

                          <div className="todo-calendar-insights">
                            <article>
                              <div>
                                <span>Productivity score</span>
                                <strong>{calendarProductivityScore}%</strong>
                              </div>
                              <div className="todo-calendar-progress">
                                <span style={{ width: `${calendarProductivityScore}%` }} />
                              </div>
                            </article>

                            <article>
                              <div>
                                <span>Completion rate</span>
                                <strong>{calendarSelectedDateSummary.completionRate}%</strong>
                              </div>
                              <div className="todo-calendar-progress is-success">
                                <span style={{ width: `${calendarSelectedDateSummary.completionRate}%` }} />
                              </div>
                            </article>

                            <article>
                              <div>
                                <span>Active streak</span>
                                <strong>{calendarActiveStreak} days</strong>
                              </div>
                              <div className="todo-calendar-insights__foot">
                                {calendarSelectedDateSummary.overdue} overdue / {calendarSelectedDateSummary.high} high priority
                              </div>
                            </article>
                          </div>
                        </section>

                        <section className="todo-calendar-panel-card">
                          <div className="todo-calendar-panel-head">
                            <div>
                              <p className="todo-calendar-kicker">Quick Actions</p>
                              <h3>Move fast</h3>
                              <span>Jump into the most common next steps without leaving the calendar.</span>
                            </div>
                          </div>

                          <div className="todo-calendar-actions">
                            <button type="button" className="todo-calendar-action-btn is-primary" onClick={openAddTaskModal}>
                              <i className="bi bi-plus-circle" aria-hidden="true" />
                              <span>Add Task</span>
                            </button>
                            <button type="button" className="todo-calendar-action-btn" onClick={() => setActiveMode("list")}>
                              <i className="bi bi-list-check" aria-hidden="true" />
                              <span>View All Tasks</span>
                            </button>
                            <button
                              type="button"
                              className="todo-calendar-action-btn"
                              onClick={() => setCalendarQuickFilter((prev) => (prev === "pending" ? "all" : "pending"))}
                            >
                              <i className="bi bi-funnel" aria-hidden="true" />
                              <span>Filter Tasks</span>
                            </button>
                          </div>
                        </section>
                      </aside>
                    </div>
                  </div>
                </SectionCard>
              )}

              {activeMode === "dashboard" && (
                <SectionCard
                  title="Dashboard"
                  subtitle="Career progress, analytics, and focus tracking across your task system."
                >
                  <div className="todo-career-dashboard">
                    <section className="todo-career-hero">
                      <div className="todo-career-hero__copy">
                        <p className="todo-career-eyebrow">Career Progress</p>
                        <h2>Track monthly execution and lifetime growth from the same workspace.</h2>
                        <span>
                          A premium control center for short-term output, long-term momentum, and career-level consistency.
                        </span>
                      </div>

                      <div className="todo-career-hero__stats">
                        {dashboardOverview.heroStats.map((item) => (
                          <article key={item.label} className="todo-career-hero-stat">
                            <span>{item.label}</span>
                            <strong>{item.value}</strong>
                            <small>{item.helper}</small>
                          </article>
                        ))}
                      </div>
                    </section>

                    <div className="todo-career-progress-grid">
                      <article className="todo-career-panel">
                        <div className="todo-career-panel__head">
                          <div>
                            <p className="todo-career-panel__eyebrow">Monthly Progress</p>
                            <h3>Last 30 days</h3>
                          </div>
                          <span className={`todo-career-trend is-${dashboardOverview.monthly.comparisonDirection}`}>
                            {dashboardOverview.monthly.comparison}
                          </span>
                        </div>

                        <div className="todo-career-stat-grid">
                          <article>
                            <span>Total completed</span>
                            <strong>{dashboardOverview.monthly.completed}</strong>
                            <small>{dashboardOverview.monthly.activeDays} active days</small>
                          </article>
                          <article>
                            <span>Completion %</span>
                            <strong>{dashboardOverview.monthly.completionPct}%</strong>
                            <small>{dashboardOverview.monthly.activeTasks} tasks in cycle</small>
                          </article>
                          <article>
                            <span>Productivity score</span>
                            <strong>{dashboardOverview.monthly.productivityScore}</strong>
                            <small>{dashboardOverview.monthly.highPriorityWins} high priority wins</small>
                          </article>
                        </div>

                        <div className="todo-career-chart">
                          <div className="todo-career-chart__head">
                            <span>Daily activity</span>
                            <strong>{dashboardOverview.monthly.peakDayLabel}</strong>
                          </div>

                          <svg
                            className="todo-career-chart__svg"
                            viewBox="0 0 420 180"
                            role="img"
                            aria-label="Line chart of daily completed tasks in the last 30 days"
                          >
                            <defs>
                              <linearGradient id="careerDashboardLineGlow" x1="0" x2="0" y1="0" y2="1">
                                <stop offset="0%" stopColor="rgba(45, 212, 191, 0.46)" />
                                <stop offset="100%" stopColor="rgba(45, 212, 191, 0)" />
                              </linearGradient>
                            </defs>

                            {dashboardOverview.monthly.chartGuideValues.map((value) => (
                              <g key={`guide-${value}`}>
                                <line
                                  x1="18"
                                  x2="402"
                                  y1={162 - (value / Math.max(dashboardOverview.monthly.chartPaths.maxValue, 1)) * 144}
                                  y2={162 - (value / Math.max(dashboardOverview.monthly.chartPaths.maxValue, 1)) * 144}
                                />
                                <text
                                  x="8"
                                  y={166 - (value / Math.max(dashboardOverview.monthly.chartPaths.maxValue, 1)) * 144}
                                >
                                  {value}
                                </text>
                              </g>
                            ))}

                            <path
                              className="todo-career-chart__area"
                              d={dashboardOverview.monthly.chartPaths.areaPath}
                              fill="url(#careerDashboardLineGlow)"
                            />
                            <path
                              className="todo-career-chart__line"
                              d={dashboardOverview.monthly.chartPaths.linePath}
                              fill="none"
                              stroke="#2dd4bf"
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              pathLength={100}
                            />
                          </svg>

                          <div className="todo-career-chart__labels">
                            <span>{dashboardOverview.monthly.dailySeries[0]?.label ?? "Start"}</span>
                            <span>{dashboardOverview.monthly.dailySeries[dashboardOverview.monthly.dailySeries.length - 1]?.label ?? "Today"}</span>
                          </div>
                        </div>
                      </article>

                      <article className="todo-career-panel">
                        <div className="todo-career-panel__head">
                          <div>
                            <p className="todo-career-panel__eyebrow">Lifetime Progress</p>
                            <h3>Career momentum</h3>
                          </div>
                          <span className="todo-career-panel__chip">
                            {dashboardOverview.lifetime.careerXp} XP
                          </span>
                        </div>

                        <div className="todo-career-stat-grid">
                          <article>
                            <span>Total completed</span>
                            <strong>{dashboardOverview.lifetime.totalCompleted}</strong>
                            <small>All-time closed tasks</small>
                          </article>
                          <article>
                            <span>Total projects</span>
                            <strong>{dashboardOverview.lifetime.totalProjects}</strong>
                            <small>Across tracked workstreams</small>
                          </article>
                          <article>
                            <span>Active days</span>
                            <strong>{dashboardOverview.lifetime.totalActiveDays}</strong>
                            <small>{dashboardOverview.lifetime.longestStreak} day best streak</small>
                          </article>
                        </div>

                        <div className="todo-career-level">
                          <div className="todo-career-level__head">
                            <span>Career Growth Level</span>
                            <strong>
                              Level {dashboardOverview.lifetime.level} / {dashboardOverview.lifetime.levelCap}
                            </strong>
                          </div>
                          <div className="todo-career-level__bar">
                            <span style={{ width: `${dashboardOverview.lifetime.levelProgressPct}%` }} />
                          </div>
                          <div className="todo-career-level__meta">
                            <span>{dashboardOverview.lifetime.currentStreak} day current streak</span>
                            <span>
                              {dashboardOverview.lifetime.xpToNextLevel > 0
                                ? `${dashboardOverview.lifetime.xpToNextLevel} XP to next level`
                                : "Max level reached"}
                            </span>
                          </div>
                        </div>

                        <div className="todo-career-badges">
                          {dashboardOverview.lifetime.badges.map((badge) => (
                            <article
                              key={badge.label}
                              className={`todo-career-badge ${badge.achieved ? "is-achieved" : "is-locked"}`}
                            >
                              <div className="todo-career-badge__icon">
                                <i className={`bi ${badge.icon}`} aria-hidden="true" />
                              </div>
                              <div>
                                <strong>{badge.label}</strong>
                                <small>{badge.helper}</small>
                              </div>
                            </article>
                          ))}
                        </div>
                      </article>
                    </div>

                    <div className="todo-career-analytics-grid">
                      <article className="todo-career-panel">
                        <div className="todo-career-panel__head">
                          <div>
                            <p className="todo-career-panel__eyebrow">Weekly Activity Heatmap</p>
                            <h3>Completion intensity</h3>
                          </div>
                          <span className="todo-career-panel__chip">{dashboardOverview.heatmap.rangeLabel}</span>
                        </div>

                        <div className="todo-career-heatmap">
                          <div className="todo-career-heatmap__grid">
                            {dashboardOverview.heatmap.cells.map((cell) => (
                              <div
                                key={cell.dateKey}
                                className={`todo-career-heatmap__cell level-${cell.level}`}
                                title={`${cell.label}: ${cell.value} task${cell.value === 1 ? "" : "s"} completed`}
                              />
                            ))}
                          </div>
                          <div className="todo-career-heatmap__legend">
                            <span>Less</span>
                            <div>
                              {[0, 1, 2, 3, 4].map((level) => (
                                <i key={`heat-${level}`} className={`todo-career-heatmap__cell level-${level}`} aria-hidden="true" />
                              ))}
                            </div>
                            <span>More</span>
                          </div>
                        </div>
                      </article>

                      <article className="todo-career-panel">
                        <div className="todo-career-panel__head">
                          <div>
                            <p className="todo-career-panel__eyebrow">Task Consistency</p>
                            <h3>Streak tracking</h3>
                          </div>
                          <div className="todo-career-streak-chip">
                            <i className="bi bi-fire" aria-hidden="true" />
                            <span>{dashboardOverview.consistency.currentStreak} day streak</span>
                          </div>
                        </div>

                        <div className="todo-career-consistency">
                          <div className="todo-career-consistency__glow">
                            <i className="bi bi-fire" aria-hidden="true" />
                          </div>
                          <div className="todo-career-consistency__stats">
                            <article>
                              <span>Current streak</span>
                              <strong>{dashboardOverview.consistency.currentStreak} days</strong>
                            </article>
                            <article>
                              <span>Longest streak</span>
                              <strong>{dashboardOverview.consistency.longestStreak} days</strong>
                            </article>
                          </div>
                          <div className="todo-career-level__bar is-amber">
                            <span style={{ width: `${dashboardOverview.consistency.consistencyPct}%` }} />
                          </div>
                          <small>Consistency meter based on how close your live streak is to your best run.</small>
                        </div>
                      </article>

                      <article className="todo-career-panel">
                        <div className="todo-career-panel__head">
                          <div>
                            <p className="todo-career-panel__eyebrow">Time Distribution</p>
                            <h3>Work vs learning vs personal</h3>
                          </div>
                        </div>

                        <div className="todo-career-distribution">
                          <div className="todo-career-distribution__chart" style={dashboardOverview.distribution.style}>
                            <span>Focus mix</span>
                          </div>

                          <div className="todo-career-distribution__legend">
                            {dashboardOverview.distribution.items.map((item) => (
                              <article key={item.label}>
                                <div className="todo-career-distribution__legend-head">
                                  <i style={{ background: item.color }} aria-hidden="true" />
                                  <span>{item.label}</span>
                                </div>
                                <strong>{item.share}%</strong>
                                <small>{item.count} tasks</small>
                              </article>
                            ))}
                          </div>
                        </div>
                      </article>
                    </div>

                    <div className="todo-career-layout">
                      <div className="todo-career-main">
                        <article className="todo-career-panel">
                          <div className="todo-career-panel__head">
                            <div>
                              <p className="todo-career-panel__eyebrow">Recent Activity Feed</p>
                              <h3>Latest actions</h3>
                            </div>
                          </div>

                          <div className="todo-career-activity-feed">
                            {dashboardOverview.recentActivity.length === 0 ? (
                              <div className="todo-career-empty">
                                <i className="bi bi-activity" aria-hidden="true" />
                                <div>
                                  <strong>No activity yet</strong>
                                  <span>New task actions will appear here as your workspace starts moving.</span>
                                </div>
                              </div>
                            ) : (
                              dashboardOverview.recentActivity.map((item) => (
                                <article key={item.id} className="todo-career-feed-item">
                                  <div className={`todo-career-feed-item__icon ${item.meta.toneClass}`}>
                                    <i className={item.meta.icon} aria-hidden="true" />
                                  </div>
                                  <div className="todo-career-feed-item__body">
                                    <div className="todo-career-feed-item__head">
                                      <strong>{item.title}</strong>
                                      <span>{item.relativeTime}</span>
                                    </div>
                                    <p>{item.meta.label}</p>
                                    <div className="todo-career-feed-item__meta">
                                      <span>{item.category}</span>
                                      <span>{item.priority ?? "Normal"} priority</span>
                                      <span>{formatTimeLabel(item.timestamp)}</span>
                                    </div>
                                  </div>
                                </article>
                              ))
                            )}
                          </div>
                        </article>

                        <article className="todo-career-panel">
                          <div className="todo-career-panel__head">
                            <div>
                              <p className="todo-career-panel__eyebrow">Upcoming Tasks</p>
                              <h3>What needs attention next</h3>
                            </div>
                          </div>

                          <div className="todo-career-upcoming">
                            {dashboardOverview.upcomingTasks.length === 0 ? (
                              <div className="todo-career-empty">
                                <i className="bi bi-calendar2-check" aria-hidden="true" />
                                <div>
                                  <strong>No upcoming deadlines</strong>
                                  <span>Scheduled tasks with due dates will be listed here.</span>
                                </div>
                              </div>
                            ) : (
                              dashboardOverview.upcomingTasks.map((task) => {
                                const taskStatus = isTodoOverdue(task)
                                  ? { label: "Overdue", tone: "is-overdue" }
                                  : task.dueAt && getDayDateInput(task.dueAt) === getDayDateInput(Date.now())
                                    ? { label: "Today", tone: "is-today" }
                                    : { label: "Scheduled", tone: "is-scheduled" };

                                return (
                                  <article key={`upcoming-${task.id}`} className="todo-career-task-row">
                                    <div className="todo-career-task-row__body">
                                      <strong>{task.title}</strong>
                                      <div className="todo-career-task-row__meta">
                                        <span>{task.dueAt ? formatCardDate(task.dueAt) : "No deadline"}</span>
                                        <span>{task.priority} priority</span>
                                        <span>{task.project?.trim() || task.category || "General"}</span>
                                      </div>
                                    </div>
                                    <span className={`todo-career-status ${taskStatus.tone}`}>{taskStatus.label}</span>
                                  </article>
                                );
                              })
                            )}
                          </div>
                        </article>
                      </div>

                      <aside className="todo-career-sidebar">
                        <article className="todo-career-panel">
                          <div className="todo-career-panel__head">
                            <div>
                              <p className="todo-career-panel__eyebrow">Focus Panel</p>
                              <h3>Today's Focus</h3>
                            </div>
                          </div>

                          <div className="todo-career-focus">
                            {dashboardOverview.focusTasks.length === 0 ? (
                              <div className="todo-career-empty is-compact">
                                <i className="bi bi-bullseye" aria-hidden="true" />
                                <div>
                                  <strong>No focus tasks</strong>
                                  <span>Add a few pending items to build your daily focus stack.</span>
                                </div>
                              </div>
                            ) : (
                              dashboardOverview.focusTasks.map((task, index) => (
                                <article key={`focus-${task.id}`} className="todo-career-focus-item">
                                  <div className="todo-career-focus-item__rank">0{index + 1}</div>
                                  <div className="todo-career-focus-item__body">
                                    <strong>{task.title}</strong>
                                    <div className="todo-career-task-row__meta">
                                      <span>{task.priority} priority</span>
                                      <span>{task.dueAt ? formatCardDate(task.dueAt) : "No deadline"}</span>
                                    </div>
                                  </div>
                                </article>
                              ))
                            )}
                          </div>
                        </article>

                        <article className="todo-career-panel">
                          <div className="todo-career-panel__head">
                            <div>
                              <p className="todo-career-panel__eyebrow">Mini Calendar</p>
                              <h3>{dashboardOverview.miniCalendar.label}</h3>
                            </div>
                          </div>

                          <div className="todo-career-mini-calendar">
                            <div className="todo-career-mini-calendar__weekdays">
                              {calendarWeekdayLabels.map((day) => (
                                <span key={`mini-${day}`}>{day}</span>
                              ))}
                            </div>
                            <div className="todo-career-mini-calendar__grid">
                              {dashboardOverview.miniCalendar.days.map((day) => (
                                <div
                                  key={day.dateKey}
                                  className={[
                                    "todo-career-mini-calendar__day",
                                    day.isCurrentMonth ? "" : "is-muted",
                                    day.isToday ? "is-today" : "",
                                    day.activityCount > 0 ? "is-active" : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                  title={`${formatCardDate(day.dateKey)} · ${day.activityCount} activity events`}
                                >
                                  <span>{day.dayNumber}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </article>

                        <article className="todo-career-panel">
                          <div className="todo-career-panel__head">
                            <div>
                              <p className="todo-career-panel__eyebrow">Performance Summary</p>
                              <h3>Today</h3>
                            </div>
                          </div>

                          <div className="todo-career-performance">
                            <div className="todo-career-performance__stats">
                              <article>
                                <span>Completed today</span>
                                <strong>{dashboardOverview.performance.completedToday}</strong>
                              </article>
                              <article>
                                <span>Tasks pending</span>
                                <strong>{dashboardOverview.performance.pendingToday}</strong>
                              </article>
                              <article>
                                <span>Efficiency</span>
                                <strong>{dashboardOverview.performance.efficiency}%</strong>
                              </article>
                            </div>
                            <div className="todo-career-level__bar">
                              <span style={{ width: `${dashboardOverview.performance.efficiency}%` }} />
                            </div>
                            <small>
                              {dashboardOverview.performance.assignedToday} assigned actions in today&apos;s workload.
                            </small>
                          </div>
                        </article>
                      </aside>
                    </div>
                  </div>
                </SectionCard>
              )}

              {activeMode === "workflow" && (
                <SectionCard title="Workflow" subtitle="Practical process for company task execution." className="todo-workflow-section">
                  <div className="todo-workflow-showcase">
                    <div className="todo-workflow-visual">
                      <div className="todo-workflow-visual__frame">
                        <img src={taskManagementImg} alt="Cartoon style todo list workflow illustration" />
                      </div>

                      <div className="todo-workflow-visual__note">
                        <span className="todo-workflow-visual__eyebrow">Todo Topic Preview</span>
                        <strong>Simple planning, friendly image, better clarity</strong>
                        <p>
                          This section explains how your todo list moves from quick capture to smart review while keeping the
                          same background style intact.
                        </p>
                      </div>
                    </div>

                    <div className="todo-workflow-overview">
                      <span className="todo-workflow-overview__eyebrow">Todo List System</span>
                      <h3>Organize tasks with clear details, visual guidance, and a clean daily flow.</h3>
                      <p>
                        Keep each todo item meaningful with title, description, due date, priority, checkpoints, and progress
                        notes. The workflow stays easy to understand for both personal planning and team execution.
                      </p>

                      <div className="todo-workflow-metrics">
                        {workflowOverviewMetrics.map((metric) => (
                          <article key={metric.value} className="todo-workflow-metric">
                            <strong>{metric.value}</strong>
                            <span>{metric.label}</span>
                          </article>
                        ))}
                      </div>

                      <div className="todo-workflow-points">
                        {workflowOverviewPoints.map((point) => (
                          <article key={point.title} className="todo-workflow-point">
                            <div className="todo-workflow-point__icon">
                              <i className={point.icon} aria-hidden="true" />
                            </div>
                            <div>
                              <h6>{point.title}</h6>
                              <p>{point.text}</p>
                            </div>
                          </article>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="todo-workflow-grid">
                    {workflowSteps.map((step) => (
                      <article key={step.step} className="todo-workflow-card">
                        <div className="todo-workflow-card__top">
                          <span className="todo-workflow-card__step">{step.step}</span>
                          <div className="todo-workflow-card__icon">
                            <i className={step.icon} aria-hidden="true" />
                          </div>
                        </div>
                        <h6>{step.title}</h6>
                        <p>{step.description}</p>
                        <div className="todo-workflow-card__chips">
                          {step.chips.map((chip) => (
                            <span key={chip}>{chip}</span>
                          ))}
                        </div>
                      </article>
                    ))}
                  </div>
                </SectionCard>
              )}
            </>
          )}
        </main>
      </div>

      <input
        ref={taskAttachmentInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
        multiple
        hidden
        onChange={handleTaskDetailAttachmentUpload}
      />

      {attachmentPreviewTarget && (
        <div className="todo-edit-overlay premium-attachment-modal-overlay" onClick={() => setAttachmentPreviewTarget(null)}>
          <div className="premium-attachment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="premium-attachment-modal__header">
              <div>
                <p className="todo-action-modal__eyebrow">Attachment Preview</p>
                <h4>{attachmentPreviewTarget.name}</h4>
              </div>
              <div className="premium-attachment-modal__actions">
                <a
                  href={attachmentPreviewTarget.url}
                  download={attachmentPreviewTarget.name}
                  className="premium-action-btn"
                >
                  <i className="bi bi-download" />
                  <span>Download</span>
                </a>
                <button
                  type="button"
                  className="premium-icon-btn"
                  onClick={() => setAttachmentPreviewTarget(null)}
                  aria-label="Close preview"
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>
            </div>
            <div className="premium-attachment-modal__viewport">
              <img
                src={attachmentPreviewTarget.url}
                alt={attachmentPreviewTarget.name}
                decoding="async"
                onError={() => setAttachmentPreviewTarget(null)}
              />
            </div>
          </div>
        </div>
      )}

      {renderWorkspaceModal()}

      {deleteTarget && (
        <div className="todo-edit-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="todo-action-modal" onClick={(e) => e.stopPropagation()}>
            <p className="todo-action-modal__eyebrow">Delete Task</p>
            <h4>Are you sure you want to delete this task?</h4>
            <p>
              This will remove <strong>{deleteTarget.title}</strong> from your task workspace.
            </p>
            <div className="todo-edit-actions">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button type="button" className="btn btn-danger" onClick={() => void confirmTaskDelete()}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {commentTarget && (
        <div className="todo-edit-overlay" onClick={() => setCommentTarget(null)}>
          <div className="todo-action-modal todo-action-modal--comment" onClick={(e) => e.stopPropagation()}>
            <p className="todo-action-modal__eyebrow">Task Comment</p>
            <h4>Add comment to {commentTarget.title}</h4>
            <p>Write a short update, note, or instruction for this task.</p>
            <textarea
              className="form-control todo-action-modal__textarea"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Type your comment in English"
            />
            <div className="todo-edit-actions">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setCommentTarget(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={() => void submitTaskComment()} disabled={commentSubmitting}>
                {commentSubmitting ? "Saving..." : "Save Comment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingTodo && (
        <div className="todo-edit-overlay" onClick={() => setEditingTodo(null)}>
          <div className="todo-edit-modal" onClick={(e) => e.stopPropagation()}>
            <h4>Edit Task</h4>
            <p>Update task details and save changes.</p>

            <div className="todo-edit-grid">
              <input
                className="form-control"
                value={editingTodo.title}
                onChange={(e) => setEditingTodo({ ...editingTodo, title: e.target.value })}
                placeholder="Task title"
              />
              <input
                className="form-control"
                value={editingTodo.category}
                onChange={(e) => setEditingTodo({ ...editingTodo, category: e.target.value })}
                placeholder="Category"
              />
            </div>

            <div className="todo-edit-grid">
              <input
                className="form-control"
                value={editingTodo.assignee ?? ""}
                onChange={(e) => setEditingTodo({ ...editingTodo, assignee: e.target.value })}
                placeholder="Assignee"
              />
              <input
                className="form-control"
                type="date"
                value={editingTodo.dueAt ? getDayDateInput(editingTodo.dueAt) : ""}
                onChange={(e) =>
                  setEditingTodo({
                    ...editingTodo,
                    dueAt: e.target.value ? `${e.target.value}T23:59` : undefined,
                  })
                }
              />
            </div>

            <textarea
              className="form-control"
              value={editingTodo.description}
              onChange={(e) => setEditingTodo({ ...editingTodo, description: e.target.value })}
              placeholder="Description"
            />

            <div className="todo-edit-grid">
              <select
                className="form-select"
                value={editingTodo.priority}
                onChange={(e) => setEditingTodo({ ...editingTodo, priority: e.target.value as Priority })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
              <div className="todo-add-estimate-inputs">
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  max={999}
                  placeholder="Hours"
                  value={parseEstimatedDurationParts(editingTodo.estimatedHours).estimatedHours ?? ""}
                  onChange={(e) => updateEditingTodoEstimatedDuration("hours", e.target.value)}
                />
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  max={59}
                  placeholder="Minutes"
                  value={parseEstimatedDurationParts(editingTodo.estimatedHours).estimatedMinutes ?? ""}
                  onChange={(e) => updateEditingTodoEstimatedDuration("minutes", e.target.value)}
                />
              </div>
            </div>

            <div className="todo-edit-actions">
              <button type="button" className="btn btn-outline-secondary" onClick={() => setEditingTodo(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={() => void saveEdit()}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
