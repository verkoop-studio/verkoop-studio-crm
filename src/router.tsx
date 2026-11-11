import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  /*
   * Data this app already has is treated as good for half a minute.
   *
   * With the library defaults — staleTime 0 — every query refetched the moment
   * it mounted and again every time the window regained focus. Moving from the
   * dashboard to Leads to Prospectflow re-read all 184 leads three times in a
   * few seconds, each page waiting on the network for data it had just been
   * handed. That is what made the product feel slow: not one slow request, but
   * nothing ever being allowed to count as already loaded.
   *
   * Thirty seconds is short enough that a colleague's change shows up while
   * you are still looking at the same screen, and long enough that walking
   * between screens is instant. Anything that must be fresh immediately — a
   * stage you just moved, a document you just uploaded — is invalidated
   * explicitly at the point it changes, and those still refetch at once.
   */
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // A background tab coming back into focus is not a reason to re-read
        // everything; a stale query still refetches when it is next used.
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
