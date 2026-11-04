import type { ComponentProps } from "react"
import { useTranslation } from "react-i18next"

/**
 * The left edge of a side panel, from `useResizablePanel`. Only on layouts
 * where the panel sits beside its neighbour; its parent must be `relative`.
 */
export function PanelResizeHandle({
  "aria-valuenow": width,
  ...props
}: ComponentProps<"div"> & { "aria-valuenow": number }) {
  const { t } = useTranslation("common")
  return (
    // biome-ignore lint/a11y/useSemanticElements: <hr> cannot be focused or dragged.
    <div
      {...props}
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={width}
      aria-label={t("actions.resize_panel")}
      title={t("actions.resize_panel")}
      tabIndex={0}
      className="absolute inset-y-0 left-0 z-10 hidden w-1.5 cursor-col-resize touch-none select-none hover:bg-border focus-visible:bg-ring focus-visible:outline-none lg:block"
    />
  )
}
