// One ConfirmDialog per screen, asked for imperatively from the button that needs it:
//
//   const confirm = useConfirm();
//   <Button onClick={() => confirm.ask({
//     title: "Suspend Spice Garden?",
//     description: "…what happens, whether it can be undone…",
//     confirmLabel: "Suspend store",
//     tone: "danger",
//     onConfirm: () => suspend.mutateAsync(undefined, { onSuccess, onError }),
//   })} />
//   {confirm.dialog}
//
// The action runs only from the dialog's confirm button. The dialog shows "Working…" while
// the returned promise is pending and closes when it settles — on success and on error
// alike. A rejection is swallowed here: the caller's onError (a toast, an inline message)
// is what reports it.
//
// Also takes requireReason / reasonLabel / reasonPlaceholder / minReasonLength (the reason
// is passed to onConfirm) and `body` (extra content under the description).

import { useCallback, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";

export function useConfirm() {
  const [request, setRequest] = useState(null);
  const [pending, setPending] = useState(false);

  const ask = useCallback((options) => setRequest(options), []);

  const cancel = useCallback(() => {
    if (!pending) setRequest(null);
  }, [pending]);

  const confirm = async (reason) => {
    const run = request?.onConfirm;
    if (!run || pending) return;
    setPending(true);
    try {
      await run(reason);
    } catch {
      // Reported by the caller's own error handling.
    } finally {
      setPending(false);
      setRequest(null);
    }
  };

  const { onConfirm: _run, body, ...dialogProps } = request ?? {};

  const dialog = (
    <ConfirmDialog
      {...dialogProps}
      open={Boolean(request)}
      loading={pending}
      onCancel={cancel}
      onConfirm={confirm}
    >
      {body}
    </ConfirmDialog>
  );

  return { ask, dialog, pending, isOpen: Boolean(request) };
}

export default useConfirm;
