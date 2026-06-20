"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/* ── icons ─────────────────────────────────────────────────────────── */
const Icon = {
  Heart: ({ filled, size = 26 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
      <path d="M12 21s-7.5-4.7-9.5-9C1 8.5 3 5 6.5 5c2 0 3.5 1 4.5 2.5C12 6 13.5 5 15.5 5 19 5 21 8.5 20.5 12c-2 4.3-8.5 9-8.5 9z" strokeLinejoin="round" />
    </svg>
  ),
  Comment: () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4c-1.5-.1-2.4-.4-3.4-.9L3 21l1.9-5.2c-.6-1.1-.9-2.3-.9-4.3A8.5 8.5 0 0 1 21 11.5z" strokeLinejoin="round" />
    </svg>
  ),
  Send: () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  ),
  Save: () => (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M19 21l-7-5-7 5V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17z" strokeLinejoin="round" />
    </svg>
  ),
  Down: ({ size = 18, w = 2.6 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M6 11l6 6 6-6M4 21h16" />
    </svg>
  ),
  Chev: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M9 5l7 7-7 7" />
    </svg>
  ),
  Muted: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3z" />
      <path d="M16 8l5 8M21 8l-5 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  Sound: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 9v6h4l5 5V4L7 9H3z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
  ),
  Share: () => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff">
      <path d="M13 5.5 21 12l-8 6.5v-4C8 14.5 5 16 3 19c.6-5 3.4-8.6 10-9.5v-4z" />
    </svg>
  ),
  Bubble: () => (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff">
      <path d="M12 3C6.5 3 2 6.8 2 11.5c0 2.6 1.4 4.9 3.6 6.4-.2 1-.7 2.4-1.6 3.1 1.8 0 3.6-.9 4.7-1.7 1 .3 2.1.4 3.3.4 5.5 0 10-3.8 10-8.5S17.5 3 12 3z" />
    </svg>
  ),
};

function fmtBytes(n) {
  if (!n) return "";
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1)} GB`;
  if (n >= 1024 ** 2) return `${Math.round(n / 1024 ** 2)} MB`;
  return `${Math.round(n / 1024)} KB`;
}

/* ── video: short clips play directly from their Blob URL ── */
function HlsVideo({ src, muted, videoRef, ...rest }) {
  const innerRef = useRef(null);
  const ref = videoRef || innerRef;
  return <video ref={ref} src={src || undefined} muted={muted} loop playsInline {...rest} />;
}

/* ── main portal ───────────────────────────────────────────────────── */
export default function Portal({ artist, assets, reviewCount = 0, onGoToReview }) {
  const [entered, setEntered] = useState(false);
  const [mode, setMode] = useState("tt"); // fullscreen default: most assets are vertical
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState({});
  const [hearts, setHearts] = useState({});
  const [sheetAsset, setSheetAsset] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const lastTap = useRef({});

  useEffect(() => {
    document.body.classList.add("has-portal");
    return () => document.body.classList.remove("has-portal");
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      document.querySelectorAll(".portal video").forEach((v) => {
        v.muted = next;
        v.play().catch(() => {});
      });
      return next;
    });
  }, []);

  const doubleTap = (id) => {
    const now = Date.now();
    if (now - (lastTap.current[id] || 0) < 320) {
      setLiked((l) => ({ ...l, [id]: true }));
      setHearts((h) => ({ ...h, [id]: (h[id] || 0) + 1 }));
    }
    lastTap.current[id] = now;
  };

  async function download(asset, tier) {
    setSheetAsset(null);
    showToast(tier === "phone" ? "Preparing phone-ready file…" : `Downloading original (${fmtBytes(asset.sizeBytes)})`);
    try {
      const res = await fetch(`/api/download/${asset.id}?tier=${tier}`);
      const json = await res.json();
      if (!json.url) throw new Error(json.error || "No URL");
      window.location.href = json.url; // browser handles the save
    } catch (e) {
      showToast("Download not ready yet, try again in a minute");
    }
  }

  const playAll = () => {
    document.querySelectorAll(".portal video").forEach((v) => v.play().catch(() => {}));
  };

  return (
    <div className="portal">
      {/* gate */}
      <div className={`gate grainy ${entered ? "gone" : ""}`}>
        <div className="gate-logo">
          {/* drop your logo at public/sungate-icon.jpg */}
          <img src="/sungate-mark.png" alt="Sungate Records" onError={(e) => (e.currentTarget.style.display = "none")} />
        </div>
        <div className="label">Sungate Records · Artist Portal</div>
        <h1>
          Welcome back,
          <br />
          {artist.name.split(" ")[0]}.
        </h1>
        <p>
          {assets.length
            ? `${assets.length} asset${assets.length > 1 ? "s are" : " is"} waiting in your feed. Tap through, preview, post, download.`
            : "Your feed is ready. New drops from Sungate will land here."}
        </p>
        <button
          className="enter"
          onClick={() => {
            setEntered(true);
            playAll();
          }}
        >
          Open my drops
        </button>
        <div className="foot">NY · Est. for artists</div>
      </div>

      {/* ── fullscreen (TikTok-style) — default ── */}
      <div className={`view tt ${mode === "tt" ? "active" : ""}`}>
        <div className="tt-tabs">
          <span>New drops</span>
          <span className="on">Your assets</span>
        </div>
        <div className="tt-feed">
          {assets.length === 0 && (
            <div className="tt-empty">
              <strong>No drops yet.</strong>
              <span>When Sungate uploads your next asset, it appears here first.</span>
            </div>
          )}
          {assets.map((a) => (
            <div className="tt-post" key={a.id} onPointerDown={() => doubleTap(a.id)}>
              {a.kind === "image" && a.img ? (
                <>
                  <img src={a.img} alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(28px) brightness(.45)", transform: "scale(1.15)" }} />
                  <img src={a.img} alt={a.file} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain" }} />
                </>
              ) : a.ready ? (
                <HlsVideo src={a.url} muted={muted} autoPlay poster={a.thumb || undefined} />
              ) : (
                <div className="tt-empty">
                  <strong>Processing…</strong>
                  <span>{a.file} is being optimized. Check back shortly.</span>
                </div>
              )}
              <div className="fade" />
              <div className={`big-heart ${hearts[a.id] ? "pop" : ""}`} key={`h${hearts[a.id] || 0}`}>
                <svg viewBox="0 0 24 24" fill="#fff" style={{ width: "100%", height: "100%", filter: "drop-shadow(0 4px 14px rgba(0,0,0,.35))" }}>
                  <path d="M12 21s-7.5-4.7-9.5-9C1 8.5 3 5 6.5 5c2 0 3.5 1 4.5 2.5C12 6 13.5 5 15.5 5 19 5 21 8.5 20.5 12c-2 4.3-8.5 9-8.5 9z" />
                </svg>
              </div>
              {a.ready && a.kind !== "image" && (
                <button className="mutebadge" style={{ bottom: "auto", top: 96 }} onClick={toggleMute}>
                  {muted ? <Icon.Muted /> : <Icon.Sound />}
                </button>
              )}
              <div className="tt-rail">
                <button className="r-item"><span className="avatar">{artist.initials}</span></button>
                <button
                  className="r-item"
                  onClick={() => setLiked((l) => ({ ...l, [a.id]: !l[a.id] }))}
                  style={{ color: liked[a.id] ? "#ff3040" : "#fff" }}
                >
                  <Icon.Heart filled size={32} />
                  <span className="count" style={{ color: "#fff" }}>Like</span>
                </button>
                <button className="r-item"><Icon.Bubble /><span className="count">Note</span></button>
                <button className="r-item"><Icon.Share /><span className="count">Share</span></button>
                <button className="r-item" onClick={() => setSheetAsset(a)}>
                  <span className="dl-bubble"><Icon.Down size={22} /></span>
                  <span className="count">Save</span>
                </button>
              </div>
              <div className="tt-meta">
                <div className="handle">@{artist.handle}</div>
                <div className="cap">
                  {a.caption} <span className="hash">{a.tags}</span>
                </div>
                <div className="sound">
                  ♫ <span className="mq">{a.sound} &nbsp;·&nbsp; {a.sound} &nbsp;·&nbsp;</span>
                </div>
                <div className="file-chip"><Icon.Down size={14} /> {a.file}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── feed (Instagram-style) ── */}
      <div className={`view ig ${mode === "ig" ? "active" : ""}`}>
        <div className="ig-header">
          <div className="ig-logo">
            <img src="/sungate-mark.png" alt="" onError={(e) => (e.currentTarget.style.display = "none")} />
          </div>
        </div>
        <div className="ig-feed">
          {assets.map((a) => (
            <div className="ig-post" key={a.id}>
              <div className="ig-post-head">
                <span className="avatar">{artist.initials}</span>
                <div className="who">
                  <div className="name">{artist.handle}</div>
                  <div className="meta">
                    {a.createdAt ? new Date(a.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""} · Uploaded by Sungate
                  </div>
                </div>
              </div>
              <div className="media" onPointerDown={() => doubleTap(a.id)}>
                {a.kind === "image" && a.img ? (
                  <img src={a.img} alt={a.file} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                ) : a.ready ? (
                  <HlsVideo src={a.url} muted={muted} autoPlay poster={a.thumb || undefined} />
                ) : (
                  <span style={{ color: "#888", fontSize: 13 }}>Processing…</span>
                )}
                <div className={`big-heart ${hearts[a.id] ? "pop" : ""}`} key={`hg${hearts[a.id] || 0}`}>
                  <svg viewBox="0 0 24 24" fill="#fff" style={{ width: "100%", height: "100%", filter: "drop-shadow(0 4px 14px rgba(0,0,0,.35))" }}>
                    <path d="M12 21s-7.5-4.7-9.5-9C1 8.5 3 5 6.5 5c2 0 3.5 1 4.5 2.5C12 6 13.5 5 15.5 5 19 5 21 8.5 20.5 12c-2 4.3-8.5 9-8.5 9z" />
                  </svg>
                </div>
                <span className="tag">{a.type}</span>
                {a.ready && a.kind !== "image" && (
                  <button className="mutebadge" onClick={(e) => { e.stopPropagation(); toggleMute(); }}>
                    {muted ? <Icon.Muted /> : <Icon.Sound />}
                  </button>
                )}
              </div>
              <div className="ig-actions">
                <button
                  className={`icon-btn ${liked[a.id] ? "liked" : ""}`}
                  onClick={() => setLiked((l) => ({ ...l, [a.id]: !l[a.id] }))}
                >
                  <Icon.Heart filled={liked[a.id]} />
                </button>
                <button className="icon-btn"><Icon.Comment /></button>
                <button className="icon-btn"><Icon.Send /></button>
                <span className="spacer" />
                <button className="icon-btn"><Icon.Save /></button>
              </div>
              <div className="ig-caption">
                <b>{artist.handle}</b>
                {a.caption} <span className="hash">{a.tags}</span>
              </div>
              <button className="dl-row grainy" onClick={() => setSheetAsset(a)}>
                <span className="dl-ic"><Icon.Down /></span>
                <span className="dl-txt">
                  <span className="t" style={{ display: "block" }}>Download</span>
                  <span className="s">{a.file}</span>
                </span>
                <span className="chev"><Icon.Chev /></span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* switcher */}
      <div className="switcher grainy">
        {reviewCount > 0 && (
          <button className="brand" style={{ color: "var(--sg-orange)", border: "none", background: "none", cursor: "pointer", fontFamily: "inherit" }} onClick={onGoToReview}>
            {reviewCount} to review →
          </button>
        )}
        <span className="brand">Sungate</span>
        <button className={mode === "tt" ? "on" : ""} onClick={() => setMode("tt")}>Fullscreen</button>
        <button className={mode === "ig" ? "on" : ""} onClick={() => setMode("ig")}>Feed</button>
      </div>

      {/* download sheet */}
      <div className={`sheet-veil ${sheetAsset ? "show" : ""}`} onClick={() => setSheetAsset(null)} />
      <div className={`sheet grainy ${sheetAsset ? "show" : ""}`}>
        <div className="grab" />
        <div className="sh-file">{sheetAsset?.file}</div>
        {sheetAsset?.kind !== "image" && (
        <button className="opt primary" onClick={() => sheetAsset && download(sheetAsset, "phone")}>
          <span className="o-ic"><Icon.Down size={20} /></span>
          <span className="o-txt">
            <span className="t" style={{ display: "block" }}>Phone-ready · 1080p</span>
            <span className="s">Optimized for posting. Fast on cellular.</span>
          </span>
          <span className="o-size">MP4</span>
        </button>
        )}
        <button className="opt secondary" onClick={() => sheetAsset && download(sheetAsset, "original")}>
          <span className="o-ic"><Icon.Down size={20} w={2.2} /></span>
          <span className="o-txt">
            <span className="t" style={{ display: "block" }}>Original master</span>
            <span className="s">Full quality. Wi-Fi recommended.</span>
          </span>
          <span className="o-size">{fmtBytes(sheetAsset?.sizeBytes)}</span>
        </button>
        <button className="cancel" onClick={() => setSheetAsset(null)}>Cancel</button>
      </div>

      {/* toast */}
      <div className={`toast ${toast ? "show" : ""}`}>{toast}</div>
    </div>
  );
}
