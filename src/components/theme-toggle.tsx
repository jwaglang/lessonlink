"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import { Button, type ButtonProps } from "@/components/ui/button"

type ThemeToggleProps = {
  className?: string
  iconClassName?: string
  variant?: ButtonProps["variant"]
}

export function ThemeToggle({
  className,
  iconClassName,
  variant = "secondary",
}: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // useEffect only runs on the client, so we can safely show the UI
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // return a placeholder to avoid hydration issues
    return (
      <Button
        variant={variant}
        size="icon"
        className={cn("h-12 w-12", className)}
        disabled
      />
    )
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  return (
    <Button
      variant={variant}
      size="icon"
      onClick={toggleTheme}
      className={cn("h-12 w-12", className)}
    >
      <Sun
        className={cn(
          "h-10 w-10 rotate-0 scale-100 text-yellow-500 transition-all dark:-rotate-90 dark:scale-0",
          iconClassName
        )}
      />
      <Moon
        className={cn(
          "absolute h-10 w-10 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100",
          iconClassName
        )}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
