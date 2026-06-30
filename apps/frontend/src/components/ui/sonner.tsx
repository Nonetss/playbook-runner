"use client"

import { Toaster as Sonner, type ToasterProps } from "sonner"
import { useTheme } from "@/components/features/global/use-theme"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return (
    <Sonner
      theme={theme === "dark" ? "dark" : "light"}
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
