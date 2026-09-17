"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  Move,
} from "lucide-react";

interface ImageZoomModalProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export function ImageZoomModal({ src, alt = "Clue Inspection", onClose }: ImageZoomModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const positionRef = useRef({ x: 0, y: 0 });

  // Sync ref
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Reset zoom & pan when image changes or opens
  useEffect(() => {
    if (src) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  }, [src]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.5, 4));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // Mouse drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || scale <= 1) return;
    setPosition({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch drag handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale <= 1 || e.touches.length !== 1) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.touches[0].clientX - position.x,
      y: e.touches[0].clientY - position.y,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || scale <= 1 || e.touches.length !== 1) return;
    setPosition({
      x: e.touches[0].clientX - dragStartRef.current.x,
      y: e.touches[0].clientY - dragStartRef.current.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Double click or tap to toggle zoom
  const handleDoubleClick = () => {
    if (scale > 1) {
      handleReset();
    } else {
      setScale(2.5);
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-between p-3 sm:p-6 animate-in fade-in duration-200 select-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Top Header & Toolbar */}
      <div className="w-full max-w-4xl flex items-center justify-between gap-2 z-10 bg-slate-900/80 border border-slate-800 backdrop-blur-sm rounded-2xl px-4 py-2.5 shadow-2xl">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>INSPECT CLUE IMAGE</span>
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-full">
            {Math.round(scale * 100)}%
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={scale <= 1}
            title="Zoom Out (-)"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:hover:bg-slate-800 transition cursor-pointer"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={scale >= 4}
            title="Zoom In (+)"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-40 disabled:hover:bg-slate-800 transition cursor-pointer"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {scale > 1 && (
            <button
              type="button"
              onClick={handleReset}
              title="Reset Zoom (100%)"
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 transition cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {/* Quick presets */}
          <div className="hidden sm:flex items-center gap-1 border-l border-slate-750 pl-2">
            {[1, 2, 3].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => {
                  setScale(level);
                  if (level === 1) setPosition({ x: 0, y: 0 });
                }}
                className={`px-2 py-1 rounded-lg text-[11px] font-mono transition cursor-pointer ${
                  Math.round(scale) === level
                    ? "bg-amber-500 text-slate-950 font-bold"
                    : "bg-slate-800 text-slate-400 hover:text-white"
                }`}
              >
                {level}x
              </button>
            ))}
          </div>

          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            title="Open in new tab"
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <ExternalLink className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={onClose}
            title="Close viewer (Esc)"
            className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 transition cursor-pointer ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Image Viewport Canvas */}
      <div
        className="relative flex-1 w-full flex items-center justify-center overflow-hidden my-2 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onDoubleClick={handleDoubleClick}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? "none" : "transform 0.15s ease-out",
            maxHeight: "85vh",
            maxWidth: "90vw",
          }}
          className="object-contain rounded-2xl shadow-2xl pointer-events-auto"
        />
      </div>

      {/* Bottom Floating Instructions Bar */}
      <div className="z-10 bg-slate-900/80 border border-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-full text-center">
        <p className="text-[11px] font-mono text-slate-400 flex items-center justify-center gap-2">
          <Move className="w-3 h-3 text-amber-400" />
          <span>
            {scale > 1
              ? "Drag to pan around • Double-click or tap to reset"
              : "Double-click or tap to zoom in • Scroll or use buttons to adjust"}
          </span>
        </p>
      </div>
    </div>
  );
}
