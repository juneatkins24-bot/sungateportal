"use client";

import { useState } from "react";
import Portal from "@/components/Portal";
import ReviewWall from "@/components/ReviewWall";

export default function ArtistApp({ artist, token, review, delivery }) {
  // Front door: if edits await review, open on the wall. Otherwise the feed.
  const [room, setRoom] = useState(review.length > 0 ? "review" : "feed");

  // Optimistic local move: approving on the wall pushes an asset toward the feed
  // without a full reload. The server write already happened in ReviewWall.
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

  return (
    <>
      {room === "review" ? (
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
          assets={localDelivery}
          reviewCount={localReview.length}
          onGoToReview={() => setRoom("review")}
        />
      )}
    </>
  );
}
