import { Moon, Sun } from "lucide-react"
import { flushSync } from "react-dom"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"

export interface ThemeToggleProps {
  className?: string
}

export const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { t } = useTranslation("common")
  const toggle = (e: React.MouseEvent) => {
    const isDark = document.documentElement.classList.contains("dark")
    const next = !isDark

    const apply = () => {
      document.documentElement.classList.toggle("dark", next)
      localStorage.setItem("theme", next ? "dark" : "light")
    }

    if (!document.startViewTransition) {
      flushSync(apply)
      return
    }

    const x = e.clientX
    const y = e.clientY
    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    )

    const transition = document.startViewTransition(() => flushSync(apply))

    transition.ready.then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 450,
          easing: "ease-in-out",
          pseudoElement: "::view-transition-new(root)",
        }
      )
    })
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={t("labels.change_theme")}
      className={cn(
        "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex size-9 items-center justify-center rounded-md border shadow-xs transition-colors",
        className
      )}
    >
      <Sun className="size-4 shrink-0 hidden dark:block" aria-hidden />
      <Moon className="size-4 shrink-0 block dark:hidden" aria-hidden />
    </button>
  )
}
