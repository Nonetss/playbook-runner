import { MoreHorizontal } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** Canonical keyboard-accessible overflow menu for resource cards and rows. */
export function RowActionsMenu({
  label,
  disabled,
  children,
}: {
  label?: string
  disabled?: boolean
  children: ReactNode
}) {
  const { t } = useTranslation("common")
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label ?? t("labels.row_actions")}
          disabled={disabled}
          className="size-10 opacity-60 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 md:size-9"
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">{children}</DropdownMenuContent>
    </DropdownMenu>
  )
}
