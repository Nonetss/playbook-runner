/**
 * Centralised icon registry for the frontend.
 *
 * Components resolve icons through `getIcon(group, key)`. Keeping the Lucide
 * choices here means feature code depends on semantic names instead of on a
 * particular icon library or visual decision.
 *
 * Example:
 *   const DeleteIcon = getIcon("actions", "delete")
 */

import * as Lucide from "lucide-react"

const navigationIcons = {
  back: Lucide.ArrowLeft,
  forward: Lucide.ArrowRight,
  next: Lucide.ChevronRight,
  previous: Lucide.ChevronLeft,
} as const

const actionsIcons = {
  add: Lucide.Plus,
  copy: Lucide.Copy,
  delete: Lucide.Trash2,
  edit: Lucide.Pencil,
  external: Lucide.ExternalLink,
  play: Lucide.Play,
  refresh: Lucide.RotateCw,
  settings: Lucide.Settings,
  settings2: Lucide.Settings2,
  logout: Lucide.LogOut,
} as const

const authIcons = {
  login: Lucide.LogIn,
} as const

const controlsIcons = {
  check: Lucide.Check,
  checkIcon: Lucide.Check,
  close: Lucide.X,
  down: Lucide.ChevronDown,
  downIcon: Lucide.ChevronDown,
  expand: Lucide.ChevronDown,
  left: Lucide.ChevronLeft,
  leftIcon: Lucide.ChevronLeft,
  menu: Lucide.Menu,
  more: Lucide.MoreHorizontal,
  right: Lucide.ChevronRight,
  rightIcon: Lucide.ChevronRight,
  circle: Lucide.Circle,
  sidebar: Lucide.PanelLeft,
  up: Lucide.ChevronUp,
  upIcon: Lucide.ChevronUp,
  x: Lucide.X,
} as const

const identityIcons = {
  email: Lucide.Mail,
  hash: Lucide.Hash,
  user: Lucide.User,
  userCircle: Lucide.UserCircle2,
} as const

const resourceIcons = {
  apiKey: Lucide.KeyRound,
  briefcase: Lucide.BriefcaseBusiness,
  book: Lucide.BookText,
  clipboard: Lucide.ClipboardList,
  file: Lucide.FileCode,
  fileCode: Lucide.FileCode2,
  folder: Lucide.Folder,
  folderAdd: Lucide.FolderPlus,
  folderInput: Lucide.FolderInput,
  folderOpen: Lucide.FolderOpen,
  history: Lucide.History,
  link: Lucide.Link2,
  radio: Lucide.Radio,
  server: Lucide.Server,
  terminal: Lucide.Terminal,
  terminalSquare: Lucide.TerminalSquare,
  users: Lucide.Users,
} as const

const statusIcons = {
  alert: Lucide.AlertTriangle,
  error: Lucide.XCircle,
  loading: Lucide.Loader2,
  minus: Lucide.MinusCircle,
  success: Lucide.CheckCircle2,
  verified: Lucide.ShieldCheck,
  warning: Lucide.ShieldAlert,
} as const

const viewsIcons = {
  activity: Lucide.Activity,
  scrollDown: Lucide.ArrowDown,
  clearFilters: Lucide.FilterX,
  filters: Lucide.SlidersHorizontal,
  search: Lucide.Search,
} as const

const schedulingIcons = {
  calendar: Lucide.Calendar,
  schedule: Lucide.CalendarClock,
  time: Lucide.Clock,
  timer: Lucide.Timer,
} as const

const communicationIcons = {
  language: Lucide.Languages,
} as const

const themeIcons = {
  dark: Lucide.Moon,
  light: Lucide.Sun,
} as const

export const iconRegistry = {
  actions: actionsIcons,
  auth: authIcons,
  communication: communicationIcons,
  controls: controlsIcons,
  identity: identityIcons,
  navigation: navigationIcons,
  resources: resourceIcons,
  scheduling: schedulingIcons,
  status: statusIcons,
  theme: themeIcons,
  views: viewsIcons,
} as const

export type IconGroup = keyof typeof iconRegistry
export type IconKey<G extends IconGroup> = keyof (typeof iconRegistry)[G]
export type { LucideIcon } from "lucide-react"

export function getIcon<G extends IconGroup, K extends IconKey<G>>(
  group: G,
  key: K
): (typeof iconRegistry)[G][K] {
  return iconRegistry[group][key] as (typeof iconRegistry)[G][K]
}
