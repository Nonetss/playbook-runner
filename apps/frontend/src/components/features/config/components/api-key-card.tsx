import { KeyRound, MoreHorizontal, Trash2 } from "lucide-react"
import type { ApiKeyListItem } from "@/components/features/config/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type ApiKeyCardProps = {
  apiKey: ApiKeyListItem
  onDelete: (id: string) => void
  isDeleting?: boolean
}

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
  year: "numeric",
  month: "short",
  day: "numeric",
})

export function ApiKeyCard({
  apiKey,
  onDelete,
  isDeleting = false,
}: ApiKeyCardProps) {
  const label = apiKey.name?.trim() || "API key sin nombre"
  const createdAt = dateFormatter.format(new Date(apiKey.createdAt))
  const expiresAt = apiKey.expiresAt
    ? dateFormatter.format(new Date(apiKey.expiresAt))
    : null

  const identifier =
    apiKey.start ?? apiKey.prefix ?? `${apiKey.id.slice(0, 8)}…`

  return (
    <Card className="h-full min-w-0 gap-4 overflow-hidden py-4">
      <CardHeader className="px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
              <KeyRound className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">{label}</CardTitle>
              <CardDescription className="truncate font-mono text-xs">
                {identifier}
              </CardDescription>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Acciones para ${label}`}
                disabled={isDeleting}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(apiKey.id)}
              >
                <Trash2 className="size-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="min-w-0 space-y-3 overflow-hidden px-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">
            API key
          </Badge>
          {apiKey.enabled ? (
            <Badge variant="outline" className="text-xs">
              Activa
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs">
              Desactivada
            </Badge>
          )}
        </div>

        <div className="text-muted-foreground space-y-0.5 text-xs">
          <p>Creada el {createdAt}</p>
          {expiresAt ? <p>Expira el {expiresAt}</p> : <p>Sin caducidad</p>}
        </div>
      </CardContent>
    </Card>
  )
}
