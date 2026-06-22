"use client";

import { useState } from "react";
import Portal from "@/components/Portal";
import ReviewWall from "@/components/ReviewWall";

export default function ArtistApp({ artist, token, review, delivery }) {
  // Single front door for the whole portal. Tap once, land in content, no
  // second gate when moving between review and feed.
  const [entered, setEntered] = useState(false);
  // After entering, prefer whichever view has something: review if edits wait,
  // otherwise the feed of approved work.
  const [room, setRoom] = useState(review.length > 0 ? "review" : "feed");

  const [localReview, setLocalReview] = useState(review);
  const [localDelivery, setLocalDelivery] = useState(delivery);

  function onApproved(asset) {
    setLocalReview((r) => r.filter((a) => a.id !== asset.id));
    setLocalDelivery((d) => [{ ...asset, status: "approved" }, ...d]);
  }
  function onNoted(assetId) {
    setLocalReview((r) =>
      r.map((a) => (a.id === assetId ? { ...a, status: "changes-requested" } : a))
    );
  }
  // Archive: hide an approved asset from the active feed without deleting it.
  function onArchived(assetId) {
    setLocalDelivery((d) => d.filter((a) => a.id !== assetId));
  }

  const first = artist.name.split(" ")[0];
  const totalWaiting = localReview.length;
  const totalApproved = localDelivery.length;

  if (!entered) {
    return (
      <div className="pe-gate">
        <img className="pe-gate-mark" src="/sungate-mark.png" alt="Sungate Records"
          onError={(e) => (e.currentTarget.style.display = "none")} />
        <div className="pe-gate-eyebrow">Sungate Records · Artist Portal</div>
        <h1 className="pe-gate-title">Welcome back, {first}.</h1>
        <p className="pe-gate-sub">
          {totalWaiting > 0
            ? `${totalWaiting} edit${totalWaiting > 1 ? "s" : ""} to review · ${totalApproved} approved and ready.`
            : totalApproved > 0
            ? `${totalApproved} approved asset${totalApproved > 1 ? "s" : ""} ready to post or download.`
            : "Your feed is ready. New drops from Sungate land here."}
        </p>
        <button className="pe-gate-cta" onClick={() => {
          setRoom(totalWaiting > 0 ? "review" : "feed");
          setEntered(true);
        }}>
          {totalWaiting > 0 ? "Review my edits" : "Open my feed"}
        </button>
        <div className="pe-gate-foot">NY · Est. for artists</div>
      </div>
    );
  }

  return room === "review" ? (
    <ReviewWall
      artist={artist}
      token={token}
      edits={localReview}
      onApproved={onApproved}
      onNoted={onNoted}
      onGoToFeed={() => setRoom("feed")}
      deliveredCount={localDelivery.length}
    />
  ) : (
    <Portal
      artist={artist}
      token={token}
      assets={localDelivery}
      reviewCount={localReview.length}
      onGoToReview={() => setRoom("review")}
      onArchived={onArchived}
    />
  );
}
