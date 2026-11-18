import { Outlet, createFileRoute } from '@tanstack/react-router'

/**
 * Layout for unauthenticated screens (login, register, password reset).
 *
 * The visual treatment (branding, background, card styling) is applied once
 * the design is approved — this shell only guarantees the route group works.
 */
export const Route = createFileRoute('/_auth')({
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="min-h-svh bg-muted/40">
      <Outlet />
    </div>
  )
}
