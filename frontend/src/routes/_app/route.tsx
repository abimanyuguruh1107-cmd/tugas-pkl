import { Outlet, createFileRoute } from '@tanstack/react-router'

/**
 * Layout for authenticated screens (dashboard, meetings, action items, settings).
 *
 * The app shell — sidebar, header, breadcrumbs, organization switcher — is
 * added here once the design is approved. Until then this route group only
 * provides the container so nested routes render correctly.
 */
export const Route = createFileRoute('/_app')({
  component: AppLayout,
})

function AppLayout() {
  return (
    <div className="min-h-svh bg-muted/40">
      <Outlet />
    </div>
  )
}
