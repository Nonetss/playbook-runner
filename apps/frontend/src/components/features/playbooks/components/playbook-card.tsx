import { BookText, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import type { Playbook } from "@/components/features/playbooks/types"
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

type PlaybookCardProps = {
  playbook: Playbook
  onEdit: (playbook: Playbook) => void
  onDelete: (id: string) => void
  isDeleting?: boolean
}

export function PlaybookCard({
  playbook,
  onEdit,
  onDelete,
  isDeleting = false,
}: PlaybookCardProps) {
  const updatedAt = playbook.updatedAt
    ? new Date(playbook.updatedAt).toLocaleDateString("es-ES", {
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
              <BookText className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">
                {playbook.name}
              </CardTitle>
              {playbook.description && (
                <CardDescription className="truncate">
                  {playbook.description}
                </CardDescription>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Acciones para ${playbook.name}`}
                disabled={isDeleting}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(playbook)}>
                <Pencil className="size-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(playbook.id)}
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
            YAML
          </Badge>
          {updatedAt && (
            <span className="text-muted-foreground text-xs">
              Actualizado el {updatedAt}
            </span>
          )}
        </div>

        <p className="text-muted-foreground line-clamp-3 font-mono text-xs whitespace-pre-wrap">
          {playbook.content}
        </p>
      </CardContent>
    </Card>
  )
}