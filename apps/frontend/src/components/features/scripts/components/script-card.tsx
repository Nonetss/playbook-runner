import { FileCode, MoreHorizontal, Pencil, Play, Trash2 } from "lucide-react"
import type { Script } from "@/components/features/scripts/types"
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

type ScriptCardProps = {
  script: Script
  onEdit: (script: Script) => void
  onDelete: (id: string) => void
  onRun: (script: Script) => void
  isDeleting?: boolean
}

export function ScriptCard({
  script,
  onEdit,
  onDelete,
  onRun,
  isDeleting = false,
}: ScriptCardProps) {
  const updatedAt = script.updatedAt
    ? new Date(script.updatedAt).toLocaleDateString("es-ES", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null

  return (
    <Card className="h-full gap-4 py-4">
      <CardHeader className="px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <div className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-md">
              <FileCode className="size-4" />
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-base">
                {script.name}
              </CardTitle>
              {script.description && (
                <CardDescription className="truncate">
                  {script.description}
                </CardDescription>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Acciones para ${script.name}`}
                disabled={isDeleting}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onRun(script)}>
                <Play className="size-4" />
                Ejecutar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(script)}>
                <Pencil className="size-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(script.id)}
              >
                <Trash2 className="size-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 px-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-mono text-xs">
            bash
          </Badge>
          {updatedAt && (
            <span className="text-muted-foreground text-xs">
              Actualizado el {updatedAt}
            </span>
          )}
        </div>

        <p className="text-muted-foreground line-clamp-3 font-mono text-xs whitespace-pre-wrap">
          {script.content}
        </p>

        <Button
          variant="outline"
          size="sm"
          className="mt-auto w-full"
          onClick={() => onRun(script)}
          disabled={isDeleting}
        >
          <Play className="size-4" />
          Ejecutar
        </Button>
      </CardContent>
    </Card>
  )
}
