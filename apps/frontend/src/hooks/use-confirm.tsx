import * as React from "react"
import { useTranslation } from "react-i18next"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { notifyError } from "@/lib/toast"

export interface ConfirmOptions {
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: "default" | "destructive"
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (confirmed: boolean) => void
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = React.createContext<ConfirmContextValue | null>(null)

export function useConfirm(): ConfirmContextValue["confirm"] {
  const ctx = React.useContext(ConfirmContext)
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider")
  }
  return ctx.confirm
}

/**
 * Mounts a global `ConfirmDialog` and exposes a `confirm()` helper that
 * returns a promise resolving to `true` if the user confirms and `false`
 * otherwise. Wrap the app once with this provider (already wired into
 * `AppProviders`).
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation("common")
  const [request, setRequest] = React.useState<ConfirmRequest | null>(null)
  const open = request !== null

  const confirm = React.useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setRequest({ ...options, resolve })
      }),
    []
  )

  const handleOpenChange = (next: boolean) => {
    if (next) return
    if (!request) return
    request.resolve(false)
    setRequest(null)
  }

  const handleConfirm = async () => {
    if (!request) return
    try {
      request.resolve(true)
    } catch (err) {
      notifyError(t("labels.action_failed"))
      console.error(err)
    } finally {
      setRequest(null)
    }
  }

  const value = React.useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <ConfirmDialog
        open={open}
        onOpenChange={handleOpenChange}
        title={request?.title ?? ""}
        description={request?.description}
        confirmLabel={request?.confirmLabel ?? t("actions.confirm")}
        cancelLabel={request?.cancelLabel ?? t("actions.cancel")}
        variant={request?.variant ?? "default"}
        onConfirm={async () => {
          handleConfirm()
          return true
        }}
      />
    </ConfirmContext.Provider>
  )
}
