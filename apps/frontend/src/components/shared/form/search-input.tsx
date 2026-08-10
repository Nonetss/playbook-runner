import { getIcon } from "@/lib/icon-registry"

const Search = getIcon("views", "search")

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function SearchInput({
  id,
  value,
  onValueChange,
  placeholder,
  className,
}: {
  id?: string
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 pl-8 text-sm"
      />
    </div>
  )
}
