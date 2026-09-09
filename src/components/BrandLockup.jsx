import React from 'react';

/**
 * The Scaleezy Inventory lockup.
 *
 * public/logo.png is the real artwork -- wordmark, "inventory", and the rules either side --
 * so this is a single image rather than the wordmark with the second line rebuilt in CSS.
 * Reconstructing a lockup is a way to get it subtly wrong; when the artwork exists, it wins.
 *
 * The file carries a lot of transparent margin (the drawing occupies about 94% of its width
 * and only half its height), so the box is cropped to the artwork here. Without that the logo
 * looks small and floats oddly in a nav bar, and every caller has to guess a size that
 * compensates. The percentages below are measured from the file; if it is ever replaced with
 * artwork trimmed differently, they are the four numbers to re-measure.
 *
 * Everywhere that shows the brand comes through this component, so a new file is one change
 * in one place.
 */

// The drawing's bounds inside logo.png, as fractions of the file.
const ART = { left: 0.030, right: 0.967, top: 0.232, bottom: 0.735 };
const ART_W = ART.right - ART.left;   // 0.937
const ART_H = ART.bottom - ART.top;   // 0.503
const FILE_RATIO = 2027 / 776;        // the file's own aspect

export default function BrandLockup({ size = 'md', width, style, className }) {
  const W = width ?? ({ sm: 104, md: 140, lg: 220 }[size] ?? 140);

  // The artwork's own aspect ratio, which is the file's ratio scaled by how much of the file
  // the drawing actually occupies on each axis.
  const artAspect = FILE_RATIO * (ART_W / ART_H);
  const height = W / artAspect;

  return (
    <span
      className={className}
      style={{
        display: 'block', width: W, height, overflow: 'hidden', position: 'relative', ...style
      }}
    >
      <img
        src="/logo.png"
        alt="Scaleezy Inventory"
        style={{
          position: 'absolute',
          width: `${100 / ART_W}%`,
          left: `${(-ART.left / ART_W) * 100}%`,
          top: `${(-ART.top / ART_H) * 100}%`,
          height: 'auto',
          maxWidth: 'none',
          display: 'block'
        }}
      />
    </span>
  );
}
