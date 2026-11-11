import { createFileRoute, redirect } from "@tanstack/react-router";

/** Connecting an assistant is one group in Settings now — keep the old link working. */
export const Route = createFileRoute("/_authenticated/connect")({
  beforeLoad: () => {
    throw redirect({ to: "/settings" });
  },
});
