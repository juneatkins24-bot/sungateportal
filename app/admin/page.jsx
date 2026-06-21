"use client";

import { upload as blobUpload } from "@vercel/blob/client";

import { useEffect, useRef, useState } from "react";


export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [pw, setPw] = useState("");
  const [data, setData] = useState({ artists: [], assets: [] });
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(null); // assetId being deleted
  const [replacing, setReplacing] = useState(null); // assetId being replaced

  // upload form state
  const [artistId, setArtistId] = useState("");
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [type, setType] = useState("Visualizer");
  const [sound, setSound] = useState("");
  const [batch, setBatch] = useState("");
  const [aspect, setAspect] = useState("phone");
  const [file, setFile] = useState(null);
  const [pageFiles, setPageFiles] = useState([]); // for multi-page documents
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInput = useRef(null);

  // new artist form
  const [naName, setNaName] = useState("");
  const [naHandle, setNaHandle] = useState("");

  async function load() {
    const res = await fetch("/api/assets");
    if (res.status === 401) { setAuthed(false); return; }
    const json = await res.json();
    setData(json);
    setAuthed(true);
    if (!artistId && json.artists[0]) setArtistId(json.artists[0].id);
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  async function login(e) {
    e.preventDefault();
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    if (res.ok) { setPw(""); load(); }
    else setStatus("Wrong password.");
  }

  async function deleteAsset(id, name) {
    if (!confirm(`Delete "${name}"? This removes it from the artist's feed and cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch("/api/assets/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: id }),
      });
      const out = await res.json();
      if (!res.ok || out.error) throw new Error(out.error || `Server ${res.status}`);
      setStatus("Deleted.");
      await load();
    } catch (e) {
      setStatus(`Delete failed: ${e.message}`);
    } finally {
      setDeleting(null);
    }
  }

  async function replaceAsset(id, fileObj) {
    if (!fileObj) return;
    setReplacing(id);
    setStatus("Uploading replacement…");
    try {
      const blob = await blobUpload(fileObj.name, fileObj, {
        access: "public",
        handleUploadUrl: "/api/upload/token",
      });
      const res = await fetch("/api/assets/replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: id, url: blob.url, file: fileObj.name,
          sizeBytes: fileObj.size, contentType: fileObj.type,
        }),
      });
      const out = await res.json();
      if (!res.ok || out.error) throw new Error(out.error || `Server ${res.status}`);
      setStatus("File replaced. Caption and type kept.");
      await load();
    } catch (e) {
      setStatus(`Replace failed: ${e.message}`);
    } finally {
      setReplacing(null);
    }
  }

  const [addingArtist, setAddingArtist] = useState(false);
  async function addArtist(e) {
    e.preventDefault();
    if (!naName.trim() || !naHandle.trim()) { setStatus("Enter a name and a handle."); return; }
    setAddingArtist(true);
    setStatus("Adding artist…");
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "addArtist", name: naName, handle: naHandle }),
      });
      const out = await res.json();
      if (!res.ok || out.error) throw new Error(out.error || `Server ${res.status}`);
      setStatus(`Added ${naName}. Their magic link is below.`);
      setNaName(""); setNaHandle("");
      await load();
    } catch (err) {
      setStatus(`Could not add artist: ${err.message}`);
    } finally {
      setAddingArtist(false);
    }
  }

  async function upload() {
    const isDoc = aspect === "document";
    if (!artistId) { setStatus("Pick an artist first."); return; }
    if (isDoc && pageFiles.length === 0) { setStatus("Add the deck pages (you can select several)."); return; }
    if (!isDoc && !file) { setStatus("Pick a file first."); return; }
    setBusy(true); setProgress(0);
    try {
      setStatus("Uploading…");
      // Multi-page documents (decks, press kits): upload every page image.
      // Everything else: single file. No multipart, no transcoding.
      let coverUrl, pageUrls = null, primary = file;
      if (aspect === "document" && pageFiles.length > 0) {
        const urls = [];
        for (let n = 0; n < pageFiles.length; n++) {
          const pf = pageFiles[n];
          const b = await blobUpload(pf.name, pf, {
            access: "public",
            handleUploadUrl: "/api/upload/token",
            onUploadProgress: ({ percentage }) =>
              setProgress(Math.round(((n + percentage / 100) / pageFiles.length) * 90)),
          });
          urls.push(b.url);
        }
        pageUrls = urls;
        coverUrl = urls[0];
        primary = pageFiles[0];
      } else {
        const blob = await blobUpload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/upload/token",
          onUploadProgress: ({ percentage }) => setProgress(Math.round(percentage * 0.9)),
        });
        coverUrl = blob.url;
      }

      setStatus("Recording…");
      const recRes = await fetch("/api/upload/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: coverUrl,
          pages: pageUrls,
          meta: {
            artistId, caption, tags, type, sound,
            file: primary.name, sizeBytes: primary.size, contentType: primary.type,
            batch: batch || null, aspect,
          },
        }),
      });
      const out = await recRes.json();
      if (out.error) throw new Error(out.error);
      setProgress(100);
      setStatus("Done. It is now in the artist's review wall.");
      setFile(null); setPageFiles([]); setCaption(""); setTags(""); setSound("");
      await load();
    } catch (e) {
      setStatus(`Failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  if (!authed) {
    return (
      <main className="admin">
        <h1>Sungate · Admin</h1>
        <div className="sub">Uploads, artists, magic links.</div>
        <form onSubmit={login}>
          <label>Password</label>
          <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus />
          <button className="pill" type="submit">Enter</button>
        </form>
        <div className="status">{status}</div>
      </main>
    );
  }

  return (
    <main className="admin">
      <h1>Sungate · Admin</h1>
      <div className="sub">Upload once. The portal handles streaming copies and downloads.</div>

      <section>
        <label>Artist</label>
        <select value={artistId} onChange={(e) => setArtistId(e.target.value)}>
          {data.artists.map((a) => (
            <option key={a.id} value={a.id}>{a.name} (@{a.handle})</option>
          ))}
        </select>

        <label>Asset file (video or image)</label>
        <div
          className={`drop ${dragOver ? "over" : ""}`}
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); setFile(e.dataTransfer.files[0] || null); }}
        >
          {file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(0)} MB` : "Drop a video or image here or tap to browse"}
        </div>
        <input ref={fileInput} type="file" accept="video/*,image/*" hidden onChange={(e) => setFile(e.target.files[0] || null)} />

        {aspect === "document" && (
          <div style={{ marginTop: 10 }}>
            <label>Deck / press-kit pages (select several, in order)</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPageFiles(Array.from(e.target.files || []))}
              style={{ width: "100%", color: "var(--cream)", fontSize: 13 }}
            />
            {pageFiles.length > 0 && (
              <div className="status">{pageFiles.length} page{pageFiles.length > 1 ? "s" : ""} selected · they preview as a flippable deck</div>
            )}
          </div>
        )}

        <label>Caption (what the artist sees)</label>
        <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Final visualizer approved for Friday's drop." />

        <label>Tags</label>
        <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="#NewDrop #OutFriday" />

        <label>Asset type</label>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          {["Visualizer", "Tour recap", "Press selects", "Performance", "BTS", "Teaser", "Merch concept", "Flyer", "Vinyl design", "Other"].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>

        <label>Sound line (optional)</label>
        <input type="text" value={sound} onChange={(e) => setSound(e.target.value)} placeholder="Track name · Artist" />

        <label>Review batch (optional)</label>
        <input type="text" value={batch} onChange={(e) => setBatch(e.target.value)} placeholder="Batch 014" />

        <label>Preview frame</label>
        <select value={aspect} onChange={(e) => setAspect(e.target.value)}>
          <option value="phone">Vertical phone (Reels, TikTok, visualizer)</option>
          <option value="landscape">Landscape 16:9 (YouTube)</option>
          <option value="square">Square 1:1 (album cover, vinyl, merch)</option>
          <option value="portrait">Portrait 4:5 (IG post, flyer)</option>
          <option value="document">Document (deck, press kit)</option>
        </select>

        <button className="pill" onClick={upload} disabled={busy || !file}>
          {busy ? "Working…" : "Upload to portal"}
        </button>
        {(busy || progress > 0) && (
          <div className="bar"><i style={{ width: `${progress}%` }} /></div>
        )}
        <div className="status">{status}</div>
      </section>

      <section style={{ marginTop: 44 }}>
        <h1 style={{ fontSize: 19 }}>Artists & magic links</h1>
        <div className="sub">Text the link. That IS their login.</div>
        {data.artists.map((a) => (
          <div key={a.id}>
            <div className="asset-li"><strong>{a.name}</strong> @{a.handle}</div>
            <div className="linkbox">{typeof window !== "undefined" ? window.location.origin : ""}/a/{a.token}</div>
          </div>
        ))}
        <form onSubmit={addArtist}>
          <label>New artist name</label>
          <input type="text" value={naName} onChange={(e) => setNaName(e.target.value)} placeholder="MARIAMI" />
          <label>Handle</label>
          <input type="text" value={naHandle} onChange={(e) => setNaHandle(e.target.value)} placeholder="mariami" />
          <button className="pill ghost" type="submit" disabled={addingArtist}>{addingArtist ? "Adding…" : "Add artist"}</button>
        </form>
      </section>

      <section style={{ marginTop: 44 }}>
        <h1 style={{ fontSize: 19 }}>Recent assets</h1>
        {data.assets.slice(0, 20).map((x) => (
          <div className="asset-li" key={x.id}>
            <span>{x.file}</span>
            <span className={`st ${x.status === "approved" ? "ready" : "processing"}`}>{x.status || "in-review"}</span>
            <label className="del" style={{ cursor: replacing === x.id ? "default" : "pointer" }}>
              {replacing === x.id ? "Replacing…" : "Replace"}
              <input type="file" accept="video/*,image/*" hidden disabled={replacing === x.id}
                onChange={(e) => replaceAsset(x.id, e.target.files?.[0])} />
            </label>
            <button className="del" onClick={() => deleteAsset(x.id, x.file)} disabled={deleting === x.id} aria-label="Delete">{deleting === x.id ? "Deleting…" : "Delete"}</button>
          </div>
        ))}
      </section>
    </main>
  );
}
