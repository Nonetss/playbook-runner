import type { ImageMetadata } from "astro"
import type { TourStopId } from "@/i18n/ui"
// The screenshots are the ones the README uses (repo root `img/`), so both
// stay in sync. Astro resizes them to WebP at build time.
import cron from "../../../../img/cron.png"
import git from "../../../../img/git.png"
import home from "../../../../img/home.png"
import inventory from "../../../../img/inventario.png"
import run from "../../../../img/playbooks.png"
import scalar from "../../../../img/scalar.png"

export interface Screen {
  id: "dashboard" | TourStopId
  route: string
  image: ImageMetadata
}

export const dashboard: Screen = { id: "dashboard", route: "/", image: home }

export const tourScreens: (Screen & { id: TourStopId })[] = [
  { id: "inventory", route: "/inventory", image: inventory },
  { id: "run", route: "/playbooks/:id/run", image: run },
  { id: "git", route: "/playbooks", image: git },
  { id: "history", route: "/jobs/:id", image: cron },
  { id: "api", route: "/scalar", image: scalar },
]

// The widest step serves the full-screen viewer on large and dense displays.
export const screenWidths = [720, 1200, 1800, 2560]
