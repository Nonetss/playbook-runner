import { type ClassValue, clsx } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

// The typography roles (`text-meta`, `text-label`, …) are font sizes from
// global.css. Unregistered, tailwind-merge reads them as text colours: a
// tone such as `text-muted-foreground` would drop the role, and a default
// `text-sm` would survive next to it.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        "display",
        "headline",
        "body",
        "meta",
        "meta-sm",
        "label",
        "stat",
        "console",
        "console-meta",
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
