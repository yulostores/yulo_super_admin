import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import ConfirmDialog from "./ConfirmDialog";
import { useConfirm } from "./useConfirm";

function setup(props = {}) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  const utils = render(
    <ConfirmDialog
      open
      title="Release ₹12,450.00 to Spice Garden?"
      description="The transfer starts now."
      confirmLabel="Release"
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...props}
    />,
  );
  return { onConfirm, onCancel, ...utils };
}

describe("ConfirmDialog", () => {
  it("renders nothing while closed", () => {
    render(
      <ConfirmDialog
        open={false}
        title="x"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("is an alertdialog labelled by its title and described by its description", () => {
    setup();
    const dialog = screen.getByRole("alertdialog", {
      name: "Release ₹12,450.00 to Spice Garden?",
    });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("The transfer starts now.");
  });

  it("focuses Cancel on open", () => {
    setup();
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  });

  it("confirms only from the confirm button", async () => {
    const user = userEvent.setup();
    const { onConfirm, onCancel } = setup();
    await user.click(screen.getByRole("button", { name: "Release" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("cancels from the Cancel button, Escape and a backdrop click", async () => {
    const user = userEvent.setup();
    const { onCancel, onConfirm } = setup();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.keyboard("{Escape}");
    fireEvent.mouseDown(screen.getByRole("alertdialog").parentElement);
    expect(onCancel).toHaveBeenCalledTimes(3);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("does not cancel on a click inside the panel", () => {
    const { onCancel } = setup();
    fireEvent.mouseDown(screen.getByRole("alertdialog"));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("ignores Escape, backdrop and both buttons while pending", async () => {
    const { onCancel, onConfirm } = setup({ loading: true });
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.mouseDown(screen.getByRole("alertdialog").parentElement);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Working…" })).toBeDisabled();
    expect(onCancel).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("keeps Escape from reaching a modal underneath", () => {
    const underneath = vi.fn();
    window.addEventListener("keydown", underneath);
    const { onCancel } = setup();
    fireEvent.keyDown(window, { key: "Escape" });
    window.removeEventListener("keydown", underneath);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(underneath).not.toHaveBeenCalled();
  });

  it("requires a reason when asked and passes it trimmed", async () => {
    const user = userEvent.setup();
    const { onConfirm } = setup({
      requireReason: true,
      reasonLabel: "Rejection reason",
      minReasonLength: 3,
    });
    const confirm = screen.getByRole("button", { name: "Release" });
    expect(confirm).toBeDisabled();
    expect(screen.getByLabelText("Rejection reason")).toHaveFocus();
    await user.type(screen.getByLabelText("Rejection reason"), "  no  ");
    expect(confirm).toBeDisabled();
    await user.type(screen.getByLabelText("Rejection reason"), "pe  ");
    await user.click(confirm);
    expect(onConfirm).toHaveBeenCalledWith("no  pe");
  });

  it("paints the confirm button red for tone=danger and the legacy destructive variant", () => {
    const { unmount } = setup({ tone: "danger" });
    expect(screen.getByRole("button", { name: "Release" }).className).toMatch(
      /bg-destructive/,
    );
    unmount();
    setup({ confirmVariant: "destructive" });
    expect(screen.getByRole("button", { name: "Release" }).className).toMatch(
      /bg-destructive/,
    );
  });

  it("starts with an empty reason every time it reopens", async () => {
    const user = userEvent.setup();
    const { rerender } = setup({ requireReason: true, reasonLabel: "Reason" });
    await user.type(screen.getByLabelText("Reason"), "old text");
    const props = {
      title: "t",
      requireReason: true,
      reasonLabel: "Reason",
      onConfirm: vi.fn(),
      onCancel: vi.fn(),
    };
    rerender(<ConfirmDialog open={false} {...props} />);
    rerender(<ConfirmDialog open {...props} />);
    expect(screen.getByLabelText("Reason")).toHaveValue("");
  });
});

// ── useConfirm ──────────────────────────────────────────────────────────────────────────────

function Harness({ action }) {
  const confirm = useConfirm();
  return (
    <>
      <button
        type="button"
        onClick={() =>
          confirm.ask({
            title: "Suspend Spice Garden?",
            confirmLabel: "Suspend",
            tone: "danger",
            onConfirm: action,
          })
        }
      >
        Suspend
      </button>
      {confirm.dialog}
    </>
  );
}

describe("useConfirm", () => {
  it("runs the action only on confirm, then closes", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockResolvedValue("ok");
    render(<Harness action={action} />);
    await user.click(screen.getByRole("button", { name: "Suspend" }));
    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Suspend" }).at(-1));
    expect(action).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("closes after a failed action too, without an unhandled rejection", async () => {
    const user = userEvent.setup();
    const action = vi.fn().mockRejectedValue(new Error("409"));
    render(<Harness action={action} />);
    await user.click(screen.getByRole("button", { name: "Suspend" }));
    await user.click(screen.getAllByRole("button", { name: "Suspend" }).at(-1));
    expect(action).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("does nothing on cancel", async () => {
    const user = userEvent.setup();
    const action = vi.fn();
    render(<Harness action={action} />);
    await user.click(screen.getByRole("button", { name: "Suspend" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(action).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("shows Working… and blocks cancel while the action runs", async () => {
    const user = userEvent.setup();
    let resolve;
    const action = vi.fn(() => new Promise((r) => (resolve = r)));
    render(<Harness action={action} />);
    await user.click(screen.getByRole("button", { name: "Suspend" }));
    await user.click(screen.getAllByRole("button", { name: "Suspend" }).at(-1));
    expect(screen.getByRole("button", { name: "Working…" })).toBeDisabled();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    await act(async () => resolve());
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
