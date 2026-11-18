import { createFileRoute } from '@tanstack/react-router'

/**
 * Meeting join entry point.
 *
 * Guests and members open a meeting using the invite token from the link.
 * The full pre-join experience (device selection, camera preview, waiting
 * room) is implemented once the meeting-room design is approved.
 */
export const Route = createFileRoute('/meeting-join/$inviteToken')({
  component: MeetingJoinPage,
})

function MeetingJoinPage() {
  const { inviteToken } = Route.useParams()

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Join meeting</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          The meeting room is not available yet. The design for this screen is
          still being reviewed.
        </p>
        <p className="mt-4 break-all rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
          {inviteToken}
        </p>
      </div>
    </div>
  )
}
