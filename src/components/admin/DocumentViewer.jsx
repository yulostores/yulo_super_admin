// Full-screen preview for a store document, rendered inside the portal.
//
// The file is fetched through the API as a Blob and shown from an object URL — it is never
// pointed at its storage URL. That is not a preference:
//
//   * Cloudinary refuses to deliver PDFs unless the account opts in ("Allow delivery of
//     PDF and ZIP files", off by default), answering 401 for the file's own URL. Signing
//     the URL does not lift it.
//   * Raw-uploaded files it will deliver, but as `application/octet-stream`, which a
//     browser downloads instead of rendering — so an <iframe> stays blank either way.
//   * A storage URL is readable by anyone who has it, and these are the owner's FSSAI
//     licence, PAN card and bank statement.
//
// The server (services/restaurantDocument.service.js) streams the bytes back with their
// real content type, having authorised the admin's session first.
//
// The verify / reject controls live in here too, so the decision is made against the
// document actually on screen instead of against a filename in a list.

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Download, Loader2, RefreshCw, X, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fileNameOf } from "@/lib/format";

// The stored `mimeType` is authoritative; documents uploaded before that field existed fall
// back to the URL's extension. Cloudinary serves PDFs from an /image/upload path, so the
// path segment says nothing — only the extension does.
export function isPdfDocument(doc) {
  if (!doc) return false;
  if (doc.mimeType) return doc.mimeType === "application/pdf";
  return /\.pdf($|\?)/i.test(doc.url ?? "");
}

// The owner's own filename when we captured one, else whatever the URL ends in.
export function documentFileName(doc) {
  return doc?.name ?? fileNameOf(doc?.url);
}

const STATUS_COPY = {
  verified: { label: "Verified", className: "bg-status-ok-bg text-status-ok" },
  rejected: { label: "Rejected", className: "bg-status-danger-bg text-status-danger" },
  pending: { label: "Awaiting review", className: "bg-status-warn-bg text-status-warn" },
};

// What the reviewer is shown when the preview fails.
//
// Never the raw error. A failure here surfaces as anything from "Request failed with
// status code 504" to a JSON parse error on a gateway's HTML error page — none of which
// is actionable, and all of which read as the portal being broken rather than as one file
// being temporarily unreachable. The technical detail goes to the console instead, and the
// server logs its own half under the same request id.
//
// The server's message is only trusted when the error carries an API `code`, which is what
// says it came from our own error envelope rather than from axios or a proxy.
const GENERIC_PREVIEW_ERROR =
  "Sorry, this document could not be previewed right now. Please try again in a moment.";

const PREVIEW_ERRORS = {
  DOCUMENT_MISSING: "This document is no longer in storage — ask the owner to upload it again.",
  NOT_FOUND: "This document is no longer in storage — ask the owner to upload it again.",
  UNAUTHORIZED: "Your session has expired. Please sign in again.",
  TOKEN_EXPIRED: "Your session has expired. Please sign in again.",
};

function previewErrorMessage(err) {
  if (PREVIEW_ERRORS[err?.code]) return PREVIEW_ERRORS[err.code];
  if (err?.code && err?.message) return err.message;
  return GENERIC_PREVIEW_ERROR;
}

/**
 * Loads the document's bytes and hands back an object URL for them.
 *
 * @param {(() => Promise<Blob>) | null} fetchFile fetcher for the open document, or null
 *                                                when the viewer is closed
 * @param {number} attempt bumped to retry the same document
 */
function useDocumentObjectUrl(fetchFile, attempt) {
  const [state, setState] = useState({ url: null, loading: false, error: null });

  useEffect(() => {
    if (!fetchFile) {
      setState({ url: null, loading: false, error: null });
      return;
    }
    let objectUrl = null;
    let cancelled = false;
    setState({ url: null, loading: true, error: null });

    fetchFile()
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setState({ url: objectUrl, loading: false, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        // Kept out of the UI but not thrown away: this is what makes a support report
        // ("it says try again") traceable back to a status code.
        console.error("[DocumentViewer] preview failed", {
          status: err?.status,
          code: err?.code,
          message: err?.message,
        });
        setState({ url: null, loading: false, error: previewErrorMessage(err) });
      });

    // Revoked on close and on every swap — a reviewer clicking through six documents
    // would otherwise leak a blob per open, each holding the whole file in memory.
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fetchFile, attempt]);

  return state;
}

export default function DocumentViewer({
  open,
  title,
  doc,
  fetchFile,
  uploadedAtLabel,
  onVerify,
  onReject,
  actionsDisabled = false,
  onClose,
}) {
  // Escape closes it — this covers the whole screen, and a viewer with no keyboard exit
  // traps anyone not reaching for the mouse.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // A failed preview is usually transient (a slow storage fetch, a dropped connection), so
  // the reviewer gets a retry in place rather than having to close and reopen the viewer.
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  useEffect(() => setAttempt(0), [doc?._id]);

  const active = open && !!doc?.url;
  const { url, loading, error } = useDocumentObjectUrl(active ? fetchFile : null, attempt);

  if (!active) return null;

  const isPdf = isPdfDocument(doc);
  const fileName = documentFileName(doc);
  const status = STATUS_COPY[doc.status] ?? STATUS_COPY.pending;
  const canDecide = !!(onVerify || onReject);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/70 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={title ?? "Document preview"}
      // Backdrop click dismisses, but not a click that started inside the panel.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="mx-auto flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-brand-cream/60 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold">{title ?? "Document"}</p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${status.className}`}
              >
                {status.label}
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {fileName}
              {uploadedAtLabel ? ` · uploaded ${uploadedAtLabel}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {/* Downloads the already-fetched copy — there is no shareable storage link
                to offer, by design. */}
            {url ? (
              <a
                href={url}
                download={fileName ?? "document"}
                title="Download"
                className="grid h-8 w-8 place-items-center rounded-lg border border-brand-cream text-brand-ink2 hover:bg-brand-cream/30"
              >
                <Download className="h-4 w-4" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              title="Close"
              className="grid h-8 w-8 place-items-center rounded-lg border border-brand-cream text-brand-ink2 hover:bg-brand-cream/30"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-brand-cream/20 p-3">
          {loading ? (
            <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-sm">Loading document…</p>
            </div>
          ) : error ? (
            <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 px-6">
              <p className="max-w-sm text-center text-sm text-brand-maroon">{error}</p>
              <Button type="button" size="sm" variant="outline" onClick={retry} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Try again
              </Button>
            </div>
          ) : isPdf ? (
            <iframe
              src={url}
              title={title ?? "Document"}
              className="h-full min-h-[60vh] w-full rounded-lg border border-brand-cream/60 bg-white"
            />
          ) : (
            <div className="flex h-full min-h-[60vh] items-center justify-center">
              <img
                src={url}
                alt={title ?? "Document"}
                className="max-h-full max-w-full rounded-lg object-contain"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-brand-cream/60 px-4 py-2.5">
          <p className="text-[11px] text-muted-foreground">
            Served through the API — this file has no public link.
          </p>
          {/* Only offered while the document is still undecided — a settled verdict is
              changed from the list, deliberately, not by a stray click in a preview. */}
          {canDecide && doc.status === "pending" ? (
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={actionsDisabled}
                onClick={onReject}
                className="gap-1.5 text-brand-maroon"
              >
                <XCircle className="h-4 w-4" /> Reject
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={actionsDisabled}
                onClick={onVerify}
                className="gap-1.5 bg-brand-green text-white hover:brightness-105"
              >
                <CheckCircle2 className="h-4 w-4" /> Verify
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
