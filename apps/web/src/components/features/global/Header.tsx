import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"

const links = [
  { to: "/", label: "Home" },
  { to: "/dashboard", label: "Dashboard" },
]

export function Header() {
  const [user, setUser] = useState<{ name?: string; email?: string } | null>(
    null
  )

  useEffect(() => {
    authClient.getSession().then(({ data: session }) => {
      if (session?.user) setUser(session.user)
    })
  }, [])

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/"
        },
      },
    })
  }

  return (
    <div>
      <div className="flex flex-row items-center justify-between px-4 py-2 md:px-6">
        <nav className="flex gap-4 text-lg">
          {links.map((link) => (
            <a
              key={link.to}
              href={link.to}
              className="text-foreground hover:text-muted-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.name || user.email?.split("@")[0] || "User"}
              </span>
              <Button variant="destructive" size="sm" onClick={handleSignOut}>
                Sign Out
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => (window.location.href = "/login")}>
              Sign In
            </Button>
          )}
        </div>
      </div>
      <hr className="border-border" />
    </div>
  )
}
