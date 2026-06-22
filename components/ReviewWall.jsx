"use client";

import { useState } from "react";

const FRAME = {
  phone: "phone",
  square: "square",
  landscape: "landscape",
  portrait: "portrait",
  document: "document",
};

function Mark() {
  // real orange NY icon lives at /sungate-mark.png in public/
  return (
    <img
      className="pe-mark"
      src="/sungate-mark.png"
      alt="Sungate Records"
      onError={(e) => (e.currentTarget.style.display = "none")}
    />
  );
}

function DocViewer({ edit }) {
  // pages: array of image URLs. Falls back to the single cover image if a deck
  // was uploaded as one file.
  const pages = (edit.pages && edit.pages.length ? edit.pages : [edit.img]).filter(Boolean);
  const [i, setI] = useState(0);
  const multi = pages.length > 1;
  const go = (d) => setI((n) => Math.max(0, Math.min(pages.length - 1, n + d)));

  return (
    <div className="pe-frame document">
      <img src={pages[i]} alt={`Page ${i + 1}`} />
      {multi && (
        <>
          <button className="doc-nav prev" onClick={() => go(-1)} disabled={i === 0} aria-label="Previous page">‹</button>
          <button className="doc-nav next" onClick={() => go(1)} disabled={i === pages.length - 1} aria-label="Next page">›</button>
          <div className="doc-pages">
            {pages.map((_, n) => (
              <span key={n} className={`dot ${n === i ? "on" : ""}`} onClick={() => setI(n)} />
            ))}
          </div>
          <div className="doc-count">{i + 1} / {pages.length}</div>
        </>
      )}
    </div>
  );
}

function Media({ edit }) {
  const a = edit.aspect || (edit.kind === "image" ? "square" : "vertical");

  if (edit.kind === "video" && edit.ready) {
    const inner = (
      <video src={edit.url || undefined} muted loop playsInline autoPlay />
    );
    const cls = a === "landscape" ? "landscape" : a === "square" ? "square" : "vertical";
    return (
      <div className={`pe-frame ${cls}`}>
        {inner}
        {a === "landscape" && <div className="ytbadge">{edit.title || edit.file}</div>}
      </div>
    );
  }

  if (edit.kind === "image" && edit.img) {
    // Brand decks / press kits: real multi-page preview if pages exist
    if (a === "document") {
      return <DocViewer edit={edit} />;
    }
    return (
      <div className={`pe-frame ${a === "portrait" ? "portrait" : "square"}`}>
        <img src={edit.img} alt="" />
      </div>
    );
  }

  return (
    <div className="pe-frame square pe-processing">
      <span>Processing…</span>
    </div>
  );
}

export default function ReviewWall({ artist, token, edits, onApproved, onNoted, onGoToFeed, deliveredCount }) {
  const [busy, setBusy] = useState(null);
  const [noteOpen, setNoteOpen] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [toast, setToast] = useState(null);

  const show = (m) => { setToast(m); setTimeout(() => setToast(null), 2400); };

  async function call(assetId, action, note) {
    setBusy(assetId + action);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, assetId, action, note }),
      });
      if (!res.ok) throw new Error();
      return true;
    } catch {
      show("Could not save. Try again.");
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function download(edit) {
    show("Preparing download…");
    try {
      const res = await fetch(`/api/download/${edit.id}`);
      const json = await res.json();
      if (!json.url) throw new Error(json.error || "No URL");
      window.location.href = json.url;
    } catch {
      show("Download not ready, try again in a moment.");
    }
  }

  async function approve(edit) {
    if (await call(edit.id, "approve")) {
      show("Approved. Sungate notified.");
      onApproved?.(edit);
    }
  }
  async function sendNote(edit) {
    if (!noteText.trim()) return;
    if (await call(edit.id, "request-change", noteText)) {
      show("Note sent to Sungate.");
      onNoted?.(edit.id);
      setNoteOpen(null);
      setNoteText("");
    }
  }

  return (
    <div className="pe-wrap">
      <div className="pe-mast">
        <Mark />
        <h1>Preview Edit</h1>
        <div className="sub">Sungate Records</div>
      </div>

      <div className="pe-batchbar">
        <div className="meta">
          <b>{artist.name}</b> &nbsp;·&nbsp;{" "}
          {edits.length === 0 ? "all caught up" : `${edits.length} edit${edits.length > 1 ? "s" : ""} to review`}
        </div>
        {deliveredCount > 0 && (
          <button className="pe-link" onClick={onGoToFeed}>
            View approved feed →
          </button>
        )}
      </div>

      {edits.length === 0 ? (
        <div className="pe-empty">
          <p>Nothing waiting on you right now.</p>
          {deliveredCount > 0 && (
            <button className="pe-approveall" onClick={onGoToFeed}>Open your feed</button>
          )}
        </div>
      ) : (
        <div className="pe-edits">
          {edits.map((edit, i) => (
            <div className="pe-edit" key={edit.id}>
              <div className="tag">
                {edit.assetType || edit.type} · {i + 1} of {edits.length}
                {edit.status === "changes-requested" && <span className="flag"> · change requested</span>}
              </div>
              <div className="title">{edit.caption ? edit.caption.slice(0, 70) : (edit.title || edit.file)}</div>
              <Media edit={edit} />
              {edit.caption && <p className="pe-review-note">{edit.caption}</p>}
              <div className="pe-actions">
                <button className="pe-btn approve" disabled={busy === edit.id + "approve"} onClick={() => approve(edit)}>
                  <span className="dot" />
                  {busy === edit.id + "approve" ? "Saving…" : "Approve"}
                </button>
                <button className="pe-btn ghost" onClick={() => { setNoteOpen(noteOpen === edit.id ? null : edit.id); setNoteText(edit.note || ""); }}>
                  Request a change
                </button>
                <button className="pe-btn ghost" onClick={() => download(edit)}>
                  Download
                </button>
              </div>
              {noteOpen === edit.id && (
                <div className="pe-note open">
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="What would you change? Sungate sees this with the edit."
                    autoFocus
                  />
                  <button className="send" disabled={busy === edit.id + "request-change"} onClick={() => sendNote(edit)}>
                    {busy === edit.id + "request-change" ? "Sending…" : "Send note"}
                  </button>
                  <div style={{ clear: "both" }} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="pe-foot">Sungate Records · NY · Preview Edit</div>
      <div className={`pe-toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  );
}
