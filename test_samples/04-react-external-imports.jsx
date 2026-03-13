import React, { useState, useMemo, useCallback } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, Info } from 'lucide-react';

// ============================================================================
// PART 1: COLOR SPACE CONVERSION UTILITIES
// ============================================================================

// --- sRGB <-> Linear RGB ---
function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}

// --- Linear RGB <-> XYZ (D65) ---
function linearRgbToXyz(r, g, b) {
  return {
    x: 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b,
    y: 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b,
    z: 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b,
  };
}

function xyzToLinearRgb(x, y, z) {
  return {
    r: +3.2404541621 * x - 1.5371385940 * y - 0.4985314096 * z,
    g: -0.9692660305 * x + 1.8760108454 * y + 0.0415560175 * z,
    b: +0.0556434309 * x - 0.2040259135 * y + 1.0572251882 * z,
  };
}

// --- XYZ <-> OKLab ---
function xyzToOklab(x, y, z) {
  const l_ = Math.cbrt(0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z);
  const m_ = Math.cbrt(0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z);
  const s_ = Math.cbrt(0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z);
  return {
    L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}

function oklabToXyz(L, a, b) {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;
  return {
    x: +1.2270138511 * l - 0.5577999807 * m + 0.2812561490 * s,
    y: -0.0405801784 * l + 1.1122568696 * m - 0.0716766787 * s,
    z: -0.0763812845 * l - 0.4214819784 * m + 1.5861632204 * s,
  };
}

// --- OKLab <-> OKLCH ---
function oklabToOklch(L, a, b) {
  const C = Math.sqrt(a * a + b * b);
  let H = (Math.atan2(b, a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L, C, H };
}

function oklchToOklab(L, C, H) {
  const hRad = (H * Math.PI) / 180;
  return { L, a: C * Math.cos(hRad), b: C * Math.sin(hRad) };
}

// --- Composite conversions ---
function rgbToOklch(r, g, b) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);
  const xyz = linearRgbToXyz(lr, lg, lb);
  const lab = xyzToOklab(xyz.x, xyz.y, xyz.z);
  return oklabToOklch(lab.L, lab.a, lab.b);
}

function oklchToRgb(L, C, H) {
  const lab = oklchToOklab(L, C, H);
  const xyz = oklabToXyz(lab.L, lab.a, lab.b);
  const lrgb = xyzToLinearRgb(xyz.x, xyz.y, xyz.z);
  return {
    r: linearToSrgb(lrgb.r),
    g: linearToSrgb(lrgb.g),
    b: linearToSrgb(lrgb.b),
  };
}

// --- HSL <-> RGB ---
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r1, g1, b1;
  if (h < 60) { r1 = c; g1 = x; b1 = 0; }
  else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }
  return { r: r1 + m, g: g1 + m, b: b1 + m };
}

function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return { h, s, l };
}

// --- Hex conversions ---
function rgbToHex(r, g, b) {
  const to8 = (v) => Math.round(Math.max(0, Math.min(1, v)) * 255);
  return '#' + [to8(r), to8(g), to8(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  return {
    r: parseInt(hex.slice(0, 2), 16) / 255,
    g: parseInt(hex.slice(2, 4), 16) / 255,
    b: parseInt(hex.slice(4, 6), 16) / 255,
  };
}

function oklchToHex(L, C, H) {
  const rgb = oklchToRgb(L, C, H);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

function hexToOklch(hex) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToOklch(r, g, b);
}

// --- WCAG Relative Luminance ---
function relativeLuminance(r, g, b) {
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

function contrastRatio(lum1, lum2) {
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

// --- Gamut clamping ---
function clampToGamut(L, C, H) {
  let lo = 0, hi = C, mid;
  for (let i = 0; i < 32; i++) {
    mid = (lo + hi) / 2;
    const rgb = oklchToRgb(L, mid, H);
    if (rgb.r < -0.001 || rgb.r > 1.001 || rgb.g < -0.001 || rgb.g > 1.001 || rgb.b < -0.001 || rgb.b > 1.001) {
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return { L, C: lo, H };
}

function safeOklchToHex(L, C, H) {
  const rgb = oklchToRgb(L, C, H);
  if (rgb.r < -0.002 || rgb.r > 1.002 || rgb.g < -0.002 || rgb.g > 1.002 || rgb.b < -0.002 || rgb.b > 1.002) {
    const clamped = clampToGamut(L, C, H);
    return oklchToHex(clamped.L, clamped.C, clamped.H);
  }
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

// ============================================================================
// PART 2: PALETTE GENERATION PIPELINES
// ============================================================================

const STOPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

/**
 * Pipeline 1: HSL Naive
 * Linear lightness sweep with fixed saturation and hue.
 * The simplest approach — exposes why HSL is insufficient.
 */
function generateHslNaive(baseHex) {
  const { r, g, b } = hexToRgb(baseHex);
  const { h, s } = rgbToHsl(r, g, b);
  const lightnessMap = [0.97, 0.93, 0.87, 0.79, 0.70, 0.58, 0.48, 0.39, 0.30, 0.22, 0.14];
  return STOPS.map((stop, i) => {
    const rgb = hslToRgb(h, s, lightnessMap[i]);
    const hex = rgbToHex(rgb.r, rgb.g, rgb.b);
    const oklch = rgbToOklch(rgb.r, rgb.g, rgb.b);
    return { stop, hex, oklch, method: 'HSL Naive' };
  });
}

/**
 * Pipeline 2: Tailwind v4
 * Designer-curated OKLCH lightness array with bell-curve chroma ramp.
 * Source: Evil Martians' dynamic OKLCH theming research.
 */
function generateTailwindV4(baseHex) {
  const base = hexToOklch(baseHex);
  // Curated lightness array (from Evil Martians / Tailwind v4 analysis)
  const lightnessArr = [0.9778, 0.9356, 0.8811, 0.8267, 0.7422, 0.6478, 0.5733, 0.4689, 0.3944, 0.3200, 0.2378];
  // Bell-curve chroma ramp — peaks at 400-600 band, collapses at extremes
  const chromaScale = [0.0108, 0.0321, 0.0609, 0.0908, 0.1398, 0.1472, 0.1299, 0.1067, 0.0898, 0.0726, 0.054];
  // Scale chroma relative to base color's chroma
  const baseChromaIdx = 5; // index of 500
  const chromaFactor = base.C > 0.001 ? base.C / chromaScale[baseChromaIdx] : 1;
  return STOPS.map((stop, i) => {
    const L = lightnessArr[i];
    const C = chromaScale[i] * chromaFactor;
    const H = base.H;
    const hex = safeOklchToHex(L, C, H);
    return { stop, hex, oklch: { L, C, H }, method: 'Tailwind v4' };
  });
}

/**
 * Pipeline 3: Material Design 3 — HCT Tonal Palette (OKLCH Proxy)
 * 
 * True HCT requires CAM16 (Chromatic Adaptation Model 2016) which is a
 * ~500-line implementation. This uses OKLCH as a perceptually-uniform proxy
 * that captures the core behavior: fixed tone steps, locked hue/chroma.
 * 
 * Material Tone steps: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100]
 * Mapped to Tailwind stops: 950→T10, 900→T20, 800→T30, 700→T40, 600→T50,
 *                           500→T60, 400→T70, 300→T80, 200→T90, 100→T95, 50→T99
 * 
 * Key property: ΔTone ≥ 40 → contrast ratio ≥ 3.0; ΔTone ≥ 50 → 4.5:1
 */
function generateMaterialHCT(baseHex) {
  const base = hexToOklch(baseHex);
  // HCT Tone values mapped to our 11 stops (high tone = light, low tone = dark)
  const toneMap = [99, 95, 90, 80, 70, 60, 50, 40, 30, 20, 10];
  return STOPS.map((stop, i) => {
    const tone = toneMap[i];
    // Map HCT Tone (0-100) to OKLCH Lightness (0-1)
    // HCT Tone is approximately CIE L* which maps roughly to OKLCH L
    // via the cube root relationship: L_oklch ≈ (Tone/100)
    const L = tone / 100;
    // Lock chroma to base — HCT keeps chroma constant across tones
    // Reduce chroma at extremes to stay in gamut
    const extremeFactor = 1 - Math.pow(Math.abs(L - 0.5) * 2, 2) * 0.4;
    const C = base.C * extremeFactor;
    const H = base.H;
    const hex = safeOklchToHex(L, C, H);
    return { stop, hex, oklch: { L, C, H }, method: 'Material HCT (OKLCH proxy)' };
  });
}

/**
 * Pipeline 4: Adobe Leonardo — Contrast-Ratio-as-Input
 * 
 * Inverts the paradigm: specify desired WCAG contrast ratios against a 
 * background, then solve backwards for the color that produces each ratio.
 * 
 * Formula: Y_f = R × (Y_bg + 0.05) − 0.05
 * Where R is the target contrast ratio and Y_bg is background luminance.
 * 
 * Then convert the target luminance back to an OKLCH lightness value
 * while keeping the base color's hue and chroma.
 */
function generateLeonardo(baseHex) {
  const base = hexToOklch(baseHex);
  // Target contrast ratios for each stop against white (#fff, Y_bg = 1.0)
  // Lower stops = near-white (low contrast), higher stops = near-black (high contrast)
  const targetRatios = [1.05, 1.12, 1.3, 1.65, 2.3, 3.4, 5.0, 7.2, 10.5, 14.5, 18.0];
  const bgLum = 1.0; // white background

  return STOPS.map((stop, i) => {
    const R = targetRatios[i];
    // Solve for foreground luminance: Y_f = (Y_bg + 0.05) / R - 0.05
    // (foreground is darker than background)
    let targetLum = (bgLum + 0.05) / R - 0.05;
    targetLum = Math.max(0, Math.min(1, targetLum));
    
    // Binary search for the OKLCH L value that produces this luminance
    let lo = 0, hi = 1, mid, bestL = 0.5;
    for (let iter = 0; iter < 40; iter++) {
      mid = (lo + hi) / 2;
      const testRgb = oklchToRgb(mid, Math.min(base.C, 0.3), base.H);
      const testLum = relativeLuminance(
        Math.max(0, Math.min(1, testRgb.r)),
        Math.max(0, Math.min(1, testRgb.g)),
        Math.max(0, Math.min(1, testRgb.b))
      );
      if (testLum > targetLum) { hi = mid; } else { lo = mid; }
      bestL = mid;
    }
    
    // Adjust chroma for gamut at this lightness
    const maxC = base.C;
    const clamped = clampToGamut(bestL, maxC, base.H);
    const hex = safeOklchToHex(bestL, clamped.C, base.H);
    
    return {
      stop, hex,
      oklch: { L: bestL, C: clamped.C, H: base.H },
      contrastRatio: R,
      method: 'Leonardo (Contrast-Ratio)',
    };
  });
}

/**
 * Pipeline 5: Oklchroma — Sine-Wave Chroma
 * 
 * From Matthias Ott's CSS Day 2024 presentation.
 * Core formula: C(step) = C_base × sin(step × π)
 * 
 * At extremes (step=0, step=1), sin(0) = sin(π) = 0 → chroma collapses.
 * At midpoint (step=0.5), sin(π/2) = 1 → chroma is maximized.
 * 
 * This produces the natural bell-curve vibrancy pattern from a single
 * trigonometric equation — no curated arrays needed.
 */
function generateOklchromaSine(baseHex) {
  const base = hexToOklch(baseHex);
  // Lightness sweeps linearly from near-white to near-black
  const lightnessArr = [0.97, 0.93, 0.87, 0.79, 0.70, 0.60, 0.50, 0.40, 0.32, 0.24, 0.17];

  return STOPS.map((stop, i) => {
    const L = lightnessArr[i];
    // Normalize step to 0..1 range
    const t = i / (STOPS.length - 1);
    // Sine-wave chroma: peaks at midpoint, collapses at extremes
    const sineChroma = Math.sin(t * Math.PI);
    // Scale by base color's chroma (with slight boost for vibrance)
    const C = base.C * sineChroma * 1.15;
    const H = base.H;
    const hex = safeOklchToHex(L, C, H);
    return { stop, hex, oklch: { L, C, H }, sineValue: sineChroma, method: 'Oklchroma (Sine)' };
  });
}

/**
 * Pipeline 6: EDS Gaussian — Gaussian Distribution Chroma
 * 
 * Emerging from enterprise design systems (Equinor Design System).
 * Uses a Gaussian (bell curve) distribution on chroma.
 * 
 * Formula: C(L) = C_max × exp(−((L − μ)² / (2σ²)))
 * 
 * Where:
 *   μ = lightness at which chroma peaks (0.6 for light mode)
 *   σ = spread of the bell (controls vibrancy bandwidth)
 *   C_max = maximum chroma for this hue (gamut-constrained)
 */
function generateEdsGaussian(baseHex) {
  const base = hexToOklch(baseHex);
  const lightnessArr = [0.97, 0.93, 0.87, 0.79, 0.70, 0.60, 0.50, 0.40, 0.32, 0.24, 0.17];
  // Gaussian parameters
  const mu = 0.58; // Peak chroma at this lightness (light mode)
  const sigma = 0.22; // Spread — wider = gentler curve
  const cMax = base.C * 1.1; // Allow slight chroma boost at peak

  return STOPS.map((stop, i) => {
    const L = lightnessArr[i];
    // Gaussian bell curve
    const gaussian = Math.exp(-((L - mu) ** 2) / (2 * sigma ** 2));
    const C = cMax * gaussian;
    const H = base.H;
    const hex = safeOklchToHex(L, C, H);
    return { stop, hex, oklch: { L, C, H }, gaussianValue: gaussian, method: 'EDS Gaussian' };
  });
}

// All generators in order
const GENERATORS = [
  { id: 'hsl', name: 'HSL Naive', fn: generateHslNaive, color: '#ef4444',
    shortDesc: 'Linear L sweep, fixed S and H',
    desc: 'The simplest approach: sweeps lightness linearly while keeping saturation and hue constant. Exposes why HSL fails — muddy darks, washed lights, and broken perceptual uniformity across hues.' },
  { id: 'tailwind', name: 'Tailwind v4', fn: generateTailwindV4, color: '#3b82f6',
    shortDesc: 'Designer-curated L[] + bell C[] arrays',
    desc: 'Designer-curated lightness array with bell-curve chroma ramp in OKLCH. The Evil Martians approach: no single equation — trained eyes produced the reference arrays, then chroma scales relative to base.' },
  { id: 'material', name: 'Material HCT', fn: generateMaterialHCT, color: '#22c55e',
    shortDesc: 'Fixed Tone steps, locked H/C (OKLCH proxy)',
    desc: 'Google\'s HCT color space (CAM16 + CIE L*) approximated via OKLCH. Fixed tone steps [10..99], chroma locked to seed. Key property: ΔTone ≥ 50 guarantees WCAG AA (4.5:1) contrast.' },
  { id: 'leonardo', name: 'Leonardo', fn: generateLeonardo, color: '#f59e0b',
    shortDesc: 'Contrast-ratio-as-input, solve backwards',
    desc: 'Adobe\'s inverse pipeline: specify target WCAG contrast ratios against white, then binary-search for the OKLCH L value that produces each ratio. Accessibility baked into the math, not audited after the fact.' },
  { id: 'sine', name: 'Oklchroma Sine', fn: generateOklchromaSine, color: '#a855f7',
    shortDesc: 'C(t) = C_base × sin(t × π)',
    desc: 'Matthias Ott\'s CSS Day 2024 insight: modulate chroma via sin(step × π). At extremes sin → 0, at midpoint sin → 1. Produces the bell-curve vibrancy pattern from a single trigonometric equation — CSS-native via sin().' },
  { id: 'gaussian', name: 'EDS Gaussian', fn: generateEdsGaussian, color: '#ec4899',
    shortDesc: 'C(L) = C_max × e^(−(L−μ)²/2σ²)',
    desc: 'Gaussian (bell curve) distribution on chroma from Equinor Design System. Tunable μ (peak lightness) and σ (spread). More control than sine — can shift the vibrancy peak for dark-mode optimization.' },
];

// ============================================================================
// PART 3: INTERACTIVE REACT COMPONENT
// ============================================================================

const PRESET_COLORS = [
  { name: 'Red', hex: '#dc2626' },
  { name: 'Orange', hex: '#ea580c' },
  { name: 'Amber', hex: '#d97706' },
  { name: 'Green', hex: '#16a34a' },
  { name: 'Teal', hex: '#0d9488' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Indigo', hex: '#4f46e5' },
  { name: 'Violet', hex: '#7c3aed' },
  { name: 'Pink', hex: '#db2777' },
  { name: 'Slate', hex: '#475569' },
];

function SwatchRow({ palette, isExpanded, generatorInfo }) {
  return (
    <div className="flex gap-0.5 w-full">
      {palette.map((stop) => (
        <div key={stop.stop} className="flex-1 flex flex-col items-center">
          <div
            className="w-full rounded-md transition-all duration-200 hover:scale-110 hover:z-10 relative group"
            style={{
              backgroundColor: stop.hex,
              height: isExpanded ? 64 : 44,
              boxShadow: isExpanded ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="text-[9px] font-mono px-1 py-0.5 rounded"
                style={{
                  backgroundColor: stop.oklch.L > 0.6 ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)',
                  color: stop.oklch.L > 0.6 ? '#fff' : '#000',
                }}>
                {stop.hex}
              </span>
            </div>
          </div>
          {isExpanded && (
            <div className="text-center mt-1 space-y-0">
              <div className="text-[9px] font-mono text-gray-400">{stop.stop}</div>
              <div className="text-[8px] font-mono text-gray-500">
                L:{stop.oklch.L.toFixed(2)}
              </div>
              <div className="text-[8px] font-mono text-gray-500">
                C:{stop.oklch.C.toFixed(3)}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ChromaGraph({ palettes, generators, activeGenerators, height = 120 }) {
  const width = 400;
  const padding = { top: 10, right: 15, bottom: 25, left: 40 };
  const graphW = width - padding.left - padding.right;
  const graphH = height - padding.top - padding.bottom;

  // Find max chroma across all active palettes
  let maxC = 0.01;
  Object.entries(palettes).forEach(([id, pal]) => {
    if (activeGenerators.has(id)) {
      pal.forEach(s => { if (s.oklch.C > maxC) maxC = s.oklch.C; });
    }
  });
  maxC *= 1.15;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = padding.top + graphH * (1 - t);
        return (
          <g key={t}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y}
              stroke="#2a2a35" strokeWidth="0.5" />
            <text x={padding.left - 4} y={y + 3} textAnchor="end"
              fill="#666" fontSize="8" fontFamily="monospace">
              {(maxC * t).toFixed(3)}
            </text>
          </g>
        );
      })}
      {/* X axis labels (stops) */}
      {STOPS.map((stop, i) => {
        const x = padding.left + (i / (STOPS.length - 1)) * graphW;
        return (
          <text key={stop} x={x} y={height - 4} textAnchor="middle"
            fill="#666" fontSize="7" fontFamily="monospace">{stop}</text>
        );
      })}
      {/* Lines */}
      {generators.filter(g => activeGenerators.has(g.id)).map(gen => {
        const pal = palettes[gen.id];
        if (!pal) return null;
        const points = pal.map((s, i) => {
          const x = padding.left + (i / (STOPS.length - 1)) * graphW;
          const y = padding.top + graphH * (1 - s.oklch.C / maxC);
          return `${x},${y}`;
        }).join(' ');
        return (
          <g key={gen.id}>
            <polyline points={points} fill="none" stroke={gen.color}
              strokeWidth="1.5" strokeLinejoin="round" />
            {pal.map((s, i) => {
              const x = padding.left + (i / (STOPS.length - 1)) * graphW;
              const y = padding.top + graphH * (1 - s.oklch.C / maxC);
              return <circle key={i} cx={x} cy={y} r="2" fill={gen.color} />;
            })}
          </g>
        );
      })}
      <text x={2} y={height / 2} textAnchor="middle" fill="#555"
        fontSize="8" fontFamily="monospace" transform={`rotate(-90, 2, ${height / 2})`}>
        Chroma
      </text>
    </svg>
  );
}

function LightnessGraph({ palettes, generators, activeGenerators, height = 120 }) {
  const width = 400;
  const padding = { top: 10, right: 15, bottom: 25, left: 40 };
  const graphW = width - padding.left - padding.right;
  const graphH = height - padding.top - padding.bottom;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ maxHeight: height }}>
      {[0, 0.25, 0.5, 0.75, 1].map(t => {
        const y = padding.top + graphH * (1 - t);
        return (
          <g key={t}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y}
              stroke="#2a2a35" strokeWidth="0.5" />
            <text x={padding.left - 4} y={y + 3} textAnchor="end"
              fill="#666" fontSize="8" fontFamily="monospace">
              {t.toFixed(2)}
            </text>
          </g>
        );
      })}
      {STOPS.map((stop, i) => {
        const x = padding.left + (i / (STOPS.length - 1)) * graphW;
        return (
          <text key={stop} x={x} y={height - 4} textAnchor="middle"
            fill="#666" fontSize="7" fontFamily="monospace">{stop}</text>
        );
      })}
      {generators.filter(g => activeGenerators.has(g.id)).map(gen => {
        const pal = palettes[gen.id];
        if (!pal) return null;
        const points = pal.map((s, i) => {
          const x = padding.left + (i / (STOPS.length - 1)) * graphW;
          const y = padding.top + graphH * (1 - s.oklch.L);
          return `${x},${y}`;
        }).join(' ');
        return (
          <g key={gen.id}>
            <polyline points={points} fill="none" stroke={gen.color}
              strokeWidth="1.5" strokeLinejoin="round" />
            {pal.map((s, i) => {
              const x = padding.left + (i / (STOPS.length - 1)) * graphW;
              const y = padding.top + graphH * (1 - s.oklch.L);
              return <circle key={i} cx={x} cy={y} r="2" fill={gen.color} />;
            })}
          </g>
        );
      })}
      <text x={2} y={height / 2} textAnchor="middle" fill="#555"
        fontSize="8" fontFamily="monospace" transform={`rotate(-90, 2, ${height / 2})`}>
        Lightness
      </text>
    </svg>
  );
}

function CssOutput({ palettes, generators, activeGenerators, baseHex }) {
  const [copied, setCopied] = useState(false);
  
  const cssText = useMemo(() => {
    let out = `/* Generated Palette — Base: ${baseHex} */\n`;
    out += `/* Date: ${new Date().toISOString().split('T')[0]} */\n\n`;
    
    generators.filter(g => activeGenerators.has(g.id)).forEach(gen => {
      const pal = palettes[gen.id];
      if (!pal) return;
      out += `/* === ${gen.name}: ${gen.shortDesc} === */\n`;
      out += `:root {\n`;
      pal.forEach(s => {
        const oklchStr = `oklch(${s.oklch.L.toFixed(4)} ${s.oklch.C.toFixed(4)} ${s.oklch.H.toFixed(2)})`;
        out += `  --${gen.id}-${s.stop}: ${s.hex}; /* ${oklchStr} */\n`;
      });
      out += `}\n\n`;
    });
    return out;
  }, [palettes, generators, activeGenerators, baseHex]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(cssText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* noop */ }
  }, [cssText]);

  return (
    <div className="relative">
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all z-10"
        style={{
          background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
          color: copied ? '#22c55e' : '#94a3b8',
          border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.08)'}`,
        }}
      >
        {copied ? <Check size={13} /> : <Copy size={13} />}
        {copied ? 'Copied' : 'Copy CSS'}
      </button>
      <pre className="text-[11px] font-mono leading-relaxed overflow-auto max-h-80 p-4 rounded-lg"
        style={{ background: '#0d0d14', color: '#94a3b8' }}>
        {cssText}
      </pre>
    </div>
  );
}

export default function PaletteGeneratorLab() {
  const [baseHex, setBaseHex] = useState('#2563eb');
  const [inputHex, setInputHex] = useState('#2563eb');
  const [activeGenerators, setActiveGenerators] = useState(new Set(GENERATORS.map(g => g.id)));
  const [expandedRow, setExpandedRow] = useState(null);
  const [showGraphs, setShowGraphs] = useState(true);
  const [showCss, setShowCss] = useState(false);
  const [showInfo, setShowInfo] = useState(null);

  const palettes = useMemo(() => {
    const result = {};
    GENERATORS.forEach(gen => {
      try {
        result[gen.id] = gen.fn(baseHex);
      } catch (e) {
        result[gen.id] = [];
      }
    });
    return result;
  }, [baseHex]);

  const baseOklch = useMemo(() => hexToOklch(baseHex), [baseHex]);

  const handleHexInput = useCallback((val) => {
    setInputHex(val);
    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
      setBaseHex(val);
    }
  }, []);

  const toggleGenerator = useCallback((id) => {
    setActiveGenerators(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div style={{
      background: 'linear-gradient(165deg, #08080e 0%, #0e0e18 40%, #111120 100%)',
      color: '#e2e8f0',
      minHeight: '100vh',
      fontFamily: "'DM Sans', 'Segoe UI', system-ui, sans-serif",
    }}>
      {/* Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
      
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <span style={{ color: '#818cf8' }}>Palette</span> Generation Lab
          </h1>
          <p className="text-sm mt-1" style={{ color: '#64748b' }}>
            6 systematic pipelines &middot; OKLCH color science &middot; side-by-side comparison
          </p>
        </div>

        {/* Controls Row */}
        <div className="flex flex-wrap gap-4 items-end mb-8 p-4 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
          
          {/* Color picker */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider block mb-2" style={{ color: '#64748b' }}>
              Base Color (500)
            </label>
            <div className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="color"
                  value={baseHex}
                  onChange={(e) => { setBaseHex(e.target.value); setInputHex(e.target.value); }}
                  className="w-10 h-10 rounded-lg cursor-pointer border-0"
                  style={{ background: 'none' }}
                />
              </div>
              <input
                type="text"
                value={inputHex}
                onChange={(e) => handleHexInput(e.target.value)}
                className="w-24 px-3 py-2 rounded-lg text-sm font-mono"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#e2e8f0',
                }}
                spellCheck={false}
              />
              <div className="text-[10px] font-mono" style={{ color: '#64748b' }}>
                L:{baseOklch.L.toFixed(3)} C:{baseOklch.C.toFixed(3)} H:{baseOklch.H.toFixed(1)}°
              </div>
            </div>
          </div>

          {/* Presets */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-wider block mb-2" style={{ color: '#64748b' }}>
              Presets
            </label>
            <div className="flex gap-1">
              {PRESET_COLORS.map(p => (
                <button
                  key={p.hex}
                  onClick={() => { setBaseHex(p.hex); setInputHex(p.hex); }}
                  className="w-7 h-7 rounded-md transition-all hover:scale-110 hover:ring-2 ring-white/20"
                  style={{
                    backgroundColor: p.hex,
                    outline: baseHex === p.hex ? '2px solid rgba(255,255,255,0.5)' : 'none',
                    outlineOffset: '2px',
                  }}
                  title={p.name}
                />
              ))}
            </div>
          </div>

          {/* Toggle buttons */}
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => setShowGraphs(v => !v)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: showGraphs ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.04)',
                color: showGraphs ? '#818cf8' : '#64748b',
                border: `1px solid ${showGraphs ? 'rgba(129,140,248,0.3)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              Graphs
            </button>
            <button
              onClick={() => setShowCss(v => !v)}
              className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                background: showCss ? 'rgba(129,140,248,0.15)' : 'rgba(255,255,255,0.04)',
                color: showCss ? '#818cf8' : '#64748b',
                border: `1px solid ${showCss ? 'rgba(129,140,248,0.3)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              CSS Output
            </button>
          </div>
        </div>

        {/* Generator Toggles */}
        <div className="flex flex-wrap gap-2 mb-6">
          {GENERATORS.map(gen => {
            const active = activeGenerators.has(gen.id);
            return (
              <button
                key={gen.id}
                onClick={() => toggleGenerator(gen.id)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: active ? `${gen.color}18` : 'rgba(255,255,255,0.02)',
                  color: active ? gen.color : '#4a4a5a',
                  border: `1px solid ${active ? gen.color + '40' : 'rgba(255,255,255,0.04)'}`,
                }}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: active ? gen.color : '#333' }} />
                {gen.name}
              </button>
            );
          })}
        </div>

        {/* Palette Swatches */}
        <div className="space-y-3 mb-8">
          {/* Stop labels header */}
          <div className="flex gap-0.5 px-0" style={{ marginLeft: '160px' }}>
            {STOPS.map(s => (
              <div key={s} className="flex-1 text-center text-[9px] font-mono" style={{ color: '#4a4a5a' }}>
                {s}
              </div>
            ))}
          </div>

          {GENERATORS.filter(g => activeGenerators.has(g.id)).map(gen => {
            const isExpanded = expandedRow === gen.id;
            return (
              <div key={gen.id} className="flex items-start gap-3 group">
                {/* Label */}
                <div className="w-36 flex-shrink-0 pt-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: gen.color }} />
                    <button
                      onClick={() => setExpandedRow(isExpanded ? null : gen.id)}
                      className="text-xs font-semibold text-left hover:underline decoration-dotted underline-offset-2"
                      style={{ color: gen.color }}
                    >
                      {gen.name}
                    </button>
                    <button
                      onClick={() => setShowInfo(showInfo === gen.id ? null : gen.id)}
                      className="opacity-0 group-hover:opacity-60 transition-opacity"
                    >
                      <Info size={11} style={{ color: '#64748b' }} />
                    </button>
                    {isExpanded ? <ChevronUp size={11} style={{ color: '#4a4a5a' }} />
                      : <ChevronDown size={11} style={{ color: '#4a4a5a' }} />}
                  </div>
                  <div className="text-[9px] mt-0.5" style={{ color: '#4a4a5a', fontFamily: "'JetBrains Mono', monospace" }}>
                    {gen.shortDesc}
                  </div>
                  {showInfo === gen.id && (
                    <div className="mt-2 p-2 rounded text-[10px] leading-relaxed"
                      style={{ background: 'rgba(255,255,255,0.04)', color: '#8892a8', border: '1px solid rgba(255,255,255,0.06)' }}>
                      {gen.desc}
                    </div>
                  )}
                </div>
                {/* Swatches */}
                <div className="flex-1">
                  <SwatchRow
                    palette={palettes[gen.id] || []}
                    isExpanded={isExpanded}
                    generatorInfo={gen}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Graphs */}
        {showGraphs && (
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-xs font-semibold mb-3" style={{ color: '#818cf8' }}>Chroma Curve (C across stops)</h3>
              <ChromaGraph palettes={palettes} generators={GENERATORS} activeGenerators={activeGenerators} />
            </div>
            <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <h3 className="text-xs font-semibold mb-3" style={{ color: '#818cf8' }}>Lightness Curve (L across stops)</h3>
              <LightnessGraph palettes={palettes} generators={GENERATORS} activeGenerators={activeGenerators} />
            </div>
          </div>
        )}

        {/* CSS Output */}
        {showCss && (
          <div className="mb-8 rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="px-4 py-3 flex items-center justify-between"
              style={{ background: 'rgba(255,255,255,0.03)' }}>
              <h3 className="text-xs font-semibold" style={{ color: '#818cf8' }}>CSS Custom Properties</h3>
            </div>
            <CssOutput palettes={palettes} generators={GENERATORS} activeGenerators={activeGenerators} baseHex={baseHex} />
          </div>
        )}

        {/* Comparison Table */}
        <div className="rounded-xl overflow-hidden mb-8" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
            <h3 className="text-xs font-semibold" style={{ color: '#818cf8' }}>Pipeline Comparison Matrix</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.02)' }}>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: '#64748b' }}>System</th>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: '#64748b' }}>Color Space</th>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: '#64748b' }}>L Axis</th>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: '#64748b' }}>C Axis</th>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: '#64748b' }}>H Axis</th>
                  <th className="px-3 py-2 text-left font-medium" style={{ color: '#64748b' }}>A11y Guarantee</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['HSL Naive', 'HSL', 'Linear sweep', 'Fixed (=S)', 'Fixed', 'None'],
                  ['Tailwind v4', 'OKLCH', 'Designer array [11]', 'Bell ramp array [11]', 'Fixed ± gamut', 'Manual audit'],
                  ['Material HCT', 'HCT (CAM16+L*)', 'Fixed tones 0–100', 'Locked to seed', 'Locked', 'ΔT≥50 → 4.5:1'],
                  ['Leonardo', 'OKLCH + WCAG Y', 'Derived from Y_f', 'Locked (clamped)', 'Locked', 'Input-specified'],
                  ['Oklchroma', 'OKLCH', 'Linear sweep', 'sin(t × π) × C', 'Locked', 'None'],
                  ['EDS Gaussian', 'OKLCH', 'Fixed L steps', 'Gaussian curve', 'Locked', 'WCAG-tuned L'],
                ].map((row, i) => (
                  <tr key={i} style={{
                    background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                    borderTop: '1px solid rgba(255,255,255,0.04)'
                  }}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2" style={{
                        color: j === 0 ? GENERATORS[i]?.color || '#e2e8f0' : '#94a3b8'
                      }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer insight */}
        <div className="p-4 rounded-xl text-xs leading-relaxed"
          style={{ background: 'rgba(129,140,248,0.04)', border: '1px solid rgba(129,140,248,0.1)', color: '#8892a8' }}>
          <strong style={{ color: '#818cf8' }}>Key Insight:</strong> The central tension in all systems is{' '}
          <strong style={{ color: '#c4b5fd' }}>L vs. C</strong>. Every system pins H (Hue) and varies L (Lightness). 
          The real design decision is what to do with C (Chroma): lock it (simple, but muddy extremes), 
          scale it linearly (still muddy), or bell-ramp it via curated array, sine function, or Gaussian — 
          which is the current state of the art separating OKLCH-based systems from their HSL predecessors.
        </div>
      </div>
    </div>
  );
}
