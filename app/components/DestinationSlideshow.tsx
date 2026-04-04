"use client";

import { useState, useEffect } from "react";

const ALL_SLIDES = [
  { src: "/slides/slide-01.jpg", label: "Tropical Beach" },
  { src: "/slides/slide-02.jpg", label: "Barcelona" },
  { src: "/slides/slide-03.jpg", label: "Paris" },
  { src: "/slides/slide-04.jpg", label: "Mountain Forest" },
  { src: "/slides/slide-05.jpg", label: "Iceland Aurora" },
  { src: "/slides/slide-06.jpg", label: "African Safari" },
  { src: "/slides/slide-07.jpg", label: "New York" },
  { src: "/slides/slide-08.jpg", label: "Bali Temple" },
  { src: "/slides/slide-09.jpg", label: "Nusa Penida" },
  { src: "/slides/slide-10.jpg", label: "Ibiza" },
];

const INTERVAL_MS = 5000;

export default function DestinationSlideshow() {
  const [current, setCurrent] = useState(0);
  // null = pending, true = loaded, false = failed/missing
  const [status, setStatus] = useState<(null | boolean)[]>(ALL_SLIDES.map(() => null));

  useEffect(() => {
    ALL_SLIDES.forEach((slide, i) => {
      const img = new Image();
      img.onload  = () => setStatus((p) => { const n = [...p]; n[i] = true;  return n; });
      img.onerror = () => setStatus((p) => { const n = [...p]; n[i] = false; return n; });
      img.src = slide.src;
    });
  }, []);

  // Only cycle through slides that successfully loaded
  const activeIndices = ALL_SLIDES.map((_, i) => i).filter((i) => status[i] === true);

  useEffect(() => {
    if (activeIndices.length < 2) return;
    const timer = setInterval(() => {
      setCurrent((c) => {
        const pos = activeIndices.indexOf(c);
        return activeIndices[(pos + 1) % activeIndices.length];
      });
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  // Re-run whenever the list of loaded slides changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndices.join(",")]);

  // Jump to first loaded slide once it comes in
  useEffect(() => {
    if (activeIndices.length > 0 && !activeIndices.includes(current)) {
      setCurrent(activeIndices[0]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndices.join(",")]);

  return (
    <div className="slideshow">
      {ALL_SLIDES.map((slide, i) => (
        status[i] === true && (
          <div
            key={slide.src}
            className={`slide${i === current ? " slide-active" : ""}`}
            aria-hidden={i !== current}
          >
            <img src={slide.src} alt={slide.label} className="slide-img" />
          </div>
        )
      ))}

      {/* Dark gradient overlay */}
      <div className="slide-overlay" />

      {/* Dots — only for loaded slides */}
      {activeIndices.length > 1 && (
        <div className="slide-dots">
          {activeIndices.map((idx, pos) => (
            <button
              key={idx}
              className={`slide-dot${idx === current ? " active" : ""}`}
              onClick={() => setCurrent(idx)}
              aria-label={`View ${ALL_SLIDES[idx].label}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
