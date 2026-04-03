"use client";

import { useState, useEffect } from "react";

const SLIDES = [
  { src: "https://loremflickr.com/1920/1080/maldives,beach,turquoise?lock=101",  label: "Maldives" },
  { src: "https://loremflickr.com/1920/1080/santorini,greece,sunset?lock=102",   label: "Santorini" },
  { src: "https://loremflickr.com/1920/1080/newyork,skyline,night?lock=103",     label: "New York" },
  { src: "https://loremflickr.com/1920/1080/dolomites,mountains,italy?lock=104", label: "Dolomites" },
  { src: "https://loremflickr.com/1920/1080/bali,tropical,beach?lock=105",       label: "Bali" },
  { src: "https://loremflickr.com/1920/1080/paris,france,eiffel?lock=106",       label: "Paris" },
  { src: "https://loremflickr.com/1920/1080/amalfi,coast,cliffs?lock=107",       label: "Amalfi Coast" },
  { src: "https://loremflickr.com/1920/1080/swiss,alps,lake?lock=108",           label: "Swiss Alps" },
  { src: "https://loremflickr.com/1920/1080/dubai,skyline,city?lock=109",        label: "Dubai" },
  { src: "https://loremflickr.com/1920/1080/caribbean,beach,palm?lock=110",      label: "Caribbean" },
  { src: "https://loremflickr.com/1920/1080/tokyo,japan,night?lock=111",         label: "Tokyo" },
  { src: "https://loremflickr.com/1920/1080/patagonia,mountains,lake?lock=112",  label: "Patagonia" },
  { src: "https://loremflickr.com/1920/1080/iceland,waterfall,landscape?lock=113", label: "Iceland" },
  { src: "https://loremflickr.com/1920/1080/barcelona,sea,city?lock=114",        label: "Barcelona" },
  { src: "https://loremflickr.com/1920/1080/fjord,norway,mountains?lock=115",    label: "Norway" },
  { src: "https://loremflickr.com/1920/1080/croatia,sea,coast?lock=116",         label: "Croatia" },
];

const INTERVAL_MS = 4500;

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
