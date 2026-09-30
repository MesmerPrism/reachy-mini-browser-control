import { useEffect, useRef, useState } from 'react';
import { prepareWithSegments, measureLineStats, measureNaturalWidth, setLocale } from '@chenglou/pretext';
const cache = new Map();
// A label owns only its text box; button padding and other controls are outside it.
export default function FitText({ as: Tag = 'span', children, className = '', ...props }) {
  const ref = useRef(null), [fit, setFit] = useState({ state: 'loading' });
  useEffect(() => {
    let cancelled = false, frame;
    const node = ref.current;
    const measure = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(async () => {
        const css = getComputedStyle(node);
        const font = `${css.fontStyle} ${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
        try {
          await document.fonts.load(font, String(children));
          if (cancelled) return;
          const locale = document.documentElement.lang || 'en'; setLocale(locale);
          const spacing = parseFloat(css.letterSpacing) || 0, height = parseFloat(css.lineHeight);
          const width = node.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight);
          if (!width || !Number.isFinite(height)) return;
          const key = JSON.stringify([String(children), font, spacing, locale]);
          let prepared = cache.get(key);
          if (!prepared) {
            prepared = prepareWithSegments(String(children), font, { letterSpacing: spacing, whiteSpace: 'normal', wordBreak: 'normal' });
            if (cache.size >= 256) cache.delete(cache.keys().next().value);
            cache.set(key, prepared);
          }
          const stats = measureLineStats(prepared, Math.max(1, width - 2));
          const natural = measureNaturalWidth(prepared);
          // Preserve enlarged text: grow the label, never shrink its font.
          setFit({ state: parseFloat(css.wordSpacing) ? 'browser-verified-spacing' : natural <= width - 2 && stats.lineCount <= 1 ? 'single' : stats.maxLineWidth <= width ? 'wrap' : 'no-fit', height: Math.max(height, stats.lineCount * height), lines: stats.lineCount });
        } catch { if (!cancelled) setFit({ state: 'unavailable' }); }
      });
    };
    const observer = new ResizeObserver(measure); observer.observe(node);
    document.fonts.addEventListener('loadingdone', measure); measure();
    return () => { cancelled = true; cancelAnimationFrame(frame); observer.disconnect(); document.fonts.removeEventListener('loadingdone', measure); };
  }, [children]);
  return <Tag {...props} ref={ref} className={`fit-text ${className}`} data-fit={fit.state} data-lines={fit.lines} style={{ minHeight: fit.height }}>{children}</Tag>;
}
