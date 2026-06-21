"use client";

import { useState } from "react";

/* Delivery room. Same visual language as the PREVIEW EDIT review wall
   (cream stage, orange mark, thin tracked caps) so the two surfaces read as
   one product. Difference is the job: these assets are already approved, so
   the actions are Post and Download, not Approve/Request. */

function Frame({ a }) {
  const aspect = a.aspect || (a.kind === "image" ? "square" : "vertical");
  if (a.kind === "video") {
    const cls = aspect === "landscape" ? "landscape" : aspect === "square" ? "square" : "vertical";
    return (
      <div className={`pe-frame ${cls}`}>
        <video src={a.url || undefined} muted loop playsInline autoPlay />
        {aspect === "landscape" && <div className="ytbadge">{a.file}</div>}
      </div>
    );
  }
  const cls = aspect === "portrait" ? "portrait" : aspect === "document" ? "document" : "square";
  return (
    <div className={`pe-frame ${cls}`}>
      <img src={a.img || a.url} alt="" />
    </div>
  );
}

export default function Portal({ artist, assets, reviewCount = 0, onGoToReview }) {
  const [entered, setEntered] = useState(false);
  const [toast, setToast] = useState(null);
  const show = (m) => { setToast(m); setTimeout(() => setToast(null), 2400); };

  async function download(a) {
    show("Preparing download…");
    try {
      const res = await fetch(`/api/download/${a.id}`);
      const json = await res.json();
      if (!json.url) throw new Error(json.error || "No URL");
      window.location.href = json.url;
    } catch {
      show("Download not ready, try again in a moment.");
    }
  }

  function post(a) {
    show("Saved to post. Open your social app to share.");
  }

  const first = artist.name.split(" ")[0];

  if (!entered) {
    return (
      <div className="pe-gate">
        <img className="pe-gate-mark" src="/sungate-mark.png" alt="Sungate Records"
          onError={(e) => (e.currentTarget.style.display = "none")} />
        <div className="pe-gate-eyebrow">Sungate Records · Artist Portal</div>
        <h1 className="pe-gate-title">Welcome back, {first}.</h1>
        <p className="pe-gate-sub">
          {assets.length
            ? `${assets.length} approved asset${assets.length > 1 ? "s are" : " is"} ready. Preview, post, download.`
            : "Your feed is ready. New drops from Sungate will land here."}
        </p>
        <button className="pe-gate-cta" onClick={() => setEntered(true)}>Open my feed</button>
        <div className="pe-gate-foot">NY · Est. for artists</div>
      </div>
    );
  }

  return (
    <div className="pe-wrap">
      <div className="pe-mast">
        <img className="pe-mark" src="/sungate-mark.png" alt="Sungate Records"
          onError={(e) => (e.currentTarget.style.display = "none")} />
        <h1>Your Feed</h1>
        <div className="sub">Sungate Records</div>
      </div>

      <div className="pe-batchbar">
        <div className="meta">
          <b>{artist.name}</b> &nbsp;·&nbsp; {assets.length} approved
        </div>
        {reviewCount > 0 && (
          <button className="pe-link" onClick={onGoToReview}>
            {reviewCount} to review &rarr;
          </button>
        )}
      </div>

      {assets.length === 0 ? (
        <div className="pe-empty"><p>No approved assets yet. Once you approve edits, they land here.</p></div>
      ) : (
        <div className="pe-edits">
          {assets.map((a) => (
            <div className="pe-edit" key={a.id}>
              <div className="tag">{a.assetType || a.type}</div>
              <div className="title">{a.caption ? a.caption.slice(0, 60) : a.file}</div>
              <Frame a={a} />
              {a.caption && <p className="pe-deliver-caption">{a.caption}</p>}
              <div className="pe-actions">
                <button className="pe-btn approve" onClick={() => post(a)}>
                  <span className="dot" />Post this
                </button>
                <button className="pe-btn ghost" onClick={() => download(a)}>Download</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="pe-foot">Sungate Records · NY · Artist Portal</div>
      <div className={`pe-toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  );
}
