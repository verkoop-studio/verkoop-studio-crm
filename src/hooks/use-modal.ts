import { useEffect, type RefObject } from "react";

/**
 * Everything a modal owes the person using it, in one place.
 *
 * Both dialogs in this product had grown their own half of this: the lead
 * sheet closed on Escape, took focus and put it back; the New lead dialog
 * closed on Escape and took focus, and did neither of the others. Neither
 * contained the keyboard, which is the part that actually broke.
 *
 * `aria-modal="true"` is a promise to a screen reader that nothing behind the
 * dialog exists. The Tab key does not read that attribute, so it walked
 * straight out of the sheet and on through all ninety-nine controls behind it
 * — the sidebar, the filters, every row of the table — while the overlay
 * covered them. You could not see what you were focusing. Worse than either
 * failure on its own: the announced model and the keyboard model disagreed.
 *
 * `inert` fixes both halves at once, because it removes a subtree from the tab
 * order and from the accessibility tree together. Rather than guess at the
 * document's shape, this walks up from the dialog and marks every sibling
 * along that path, which leaves exactly the dialog reachable however deeply it
 * happens to be rendered.
 */
export function useModal(
  dialog: RefObject<HTMLElement | null>,
  onClose: () => void,
  { lockScroll = true }: { lockScroll?: boolean } = {},
) {
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", escape);

    // Where the keyboard was, so it can be put back. Without this, closing
    // leaves focus on <body> and the next Tab starts again from the top of the
    // document — the whole sidebar and table before you reach the next row.
    const opener = document.activeElement as HTMLElement | null;

    // Everything that is not the dialog, made unreachable for as long as it is
    // open. We remember what we touched so nothing already inert is revived.
    const madeInert: HTMLElement[] = [];
    const node = dialog.current;
    if (node) {
      for (let element = node; element.parentElement; element = element.parentElement) {
        for (const sibling of element.parentElement.children) {
          if (sibling === element || !(sibling instanceof HTMLElement)) continue;
          if (sibling.inert) continue;
          sibling.inert = true;
          madeInert.push(sibling);
        }
      }
    }

    // The scrolling box is <html>, not <body>: hiding the overflow on the body
    // alone does nothing, and the page keeps moving under the dialog — most
    // obviously on a phone, where it covers the whole screen.
    const root = document.documentElement;
    const previousOverflow = root.style.overflow;
    if (lockScroll) root.style.overflow = "hidden";

    // Opening should move the keyboard into the dialog, not leave it behind on
    // the control that opened it.
    node?.focus();

    return () => {
      document.removeEventListener("keydown", escape);
      for (const element of madeInert) element.inert = false;
      if (lockScroll) root.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus();
    };
  }, [dialog, onClose, lockScroll]);
}
