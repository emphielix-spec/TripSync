"use client";

import { useState, useEffect } from "react";

const SLIDES = [
  {
    src: "https://loremflickr.com/1920/1080/beach,tropical,ocean?lock=11",
    label: "Beach",
  },
  {
    src: "https://loremflickr.com/1920/1080/city,europe,architecture?lock=22",
    label: "City",
  },
  {
    src: "https://loremflickr.com/1920/1080/mountains,alps,snow?lock=33",
    label: "Mountains",
  },
  {
    src: "https://loremflickr.com/1920/1080/mediterranean,coast,sea?lock=44",
    label: "Coast",
  },
  {
    src: "https://loremflickr.com/1920/1080/tuscany,countryside,landscape?lock=55",
    label: "Countryside",
  },
];

const INTERVAL_MS = 5000;

export default function DestinationSlideshow() {
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState<boolean[]>(SLIDES.map(() => false));

  // Preload all images on mount
  useEffect(() => {
    SLIDES.forEach((slide, i) => {
      const img = new Image();
      img.onload = () =>
        setLoaded((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      img.src = slide.src;
    });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((c) => (c + 1) % SLIDES.length);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="slideshow">
      {SLIDES.map((slide, i) => (
        <div
          key={slide.src}
          className={`slide${i === current ? " slide-active" : ""}`}
          aria-hidden={i !== current}
        >
          {loaded[i] && (
            <img
              src={slide.src}
              alt={slide.label}
              className="slide-img"
            />
          )}
        </div>
      ))}

      {/* Dark gradient overlay for text readability */}
      <div className="slide-overlay" />

      {/* Slide indicators */}
      <div className="slide-dots">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            className={`slide-dot${i === current ? " active" : ""}`}
            onClick={() => setCurrent(i)}
            aria-label={`View ${SLIDES[i].label}`}
          />
        ))}
      </div>
    </div>
  );
}
