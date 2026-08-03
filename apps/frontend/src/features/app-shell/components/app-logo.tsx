import { cn } from "@/lib/utils"

interface AppLogoProps {
  alt: string
  className?: string
  size?: number
  src?: string
}

export function AppLogo({
  alt,
  className,
  size = 32,
  src = "/logo.webp",
}: AppLogoProps) {
  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={cn("shrink-0", className)}
    />
  )
}
