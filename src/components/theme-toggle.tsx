"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  // useEffect only runs on the client, so we can safely show the UI
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // return a placeholder to avoid hydration issues
    return <Button variant="secondary" size="icon" className="h-24 w-24" disabled />
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  return (
    <Button variant="secondary" size="icon" onClick={toggleTheme} className="h-24 w-24">
      <Sun className="h-20 w-20 rotate-0 scale-100 text-yellow-500 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-20 w-20 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
