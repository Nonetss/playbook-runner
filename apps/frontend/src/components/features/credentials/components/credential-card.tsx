import { KeyRound, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import type { Credential } from "@/components/features/credentials/types"
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

type CredentialCardProps = {
  credential: Credential
  onEdit: (credential: Credential) => void
  onDelete: (id: number) => void
  isDeleting?: boolean
}

export function CredentialCard({
  credential,
  onEdit,
  onDelete,
  isDeleting = false,
}: CredentialCardProps) {
  const createdAt = credential.createdAt
    ? new Date(credential.createdAt).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null

  return (
    <Card className="gap-4 py-4">
      <CardHeader className="px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
              <KeyRound className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">
                {credential.name}
              </CardTitle>
              <CardDescription className="truncate">
                {credential.username}
              </CardDescription>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Acciones para ${credential.name}`}
                disabled={isDeleting}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(credential)}>
                <Pencil className="size-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(credential.id)}
              >
                <Trash2 className="size-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">
            SSH
          </Badge>
          {createdAt && (
            <span className="text-muted-foreground text-xs">
              Creada el {createdAt}
            </span>
          )}
        </div>

        <p className="text-muted-foreground truncate font-mono text-xs">
          {credential.publicKey}
        </p>
      </CardContent>
    </Card>
  )
}
