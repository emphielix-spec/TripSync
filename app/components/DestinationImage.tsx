"use client";

import { useState } from "react";

interface DestinationImageProps {
  name: string;
  country: string;
}

export default function DestinationImage({ name, country }: DestinationImageProps) {
  const [failed, setFailed] = useState(false);

  // loremflickr.com: keyword-based, free, no API key, actively maintained
  const query = encodeURIComponent(`${name},${country},travel`);
  const src = `https://loremflickr.com/800/400/${query}`;

  if (failed) {
    return (
      <div className="dest-img-placeholder">
        <span>🌍</span>
      </div>
    );
  }

  return (
    <div className="dest-img-wrap">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`${name}, ${country}`}
        className="dest-img"
        onError={() => setFailed(true)}
        loading="lazy"
      />
      <div className="dest-img-gradient" />
    </div>
  );
}
