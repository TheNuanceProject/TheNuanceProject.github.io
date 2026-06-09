// SPDX-License-Identifier: MIT
import { useEffect, useRef } from 'react';

/**
 * AmbientField — the centralised ambient motion layer
 * (see SITE_DYNAMISM_REQUIREMENTS.md). Mounted once inside <main>, so the
 * grid is content-scoped and the Header and Footer stay clean. It owns:
 *
 *   D-1  the static dot grid (renders on the server; SSR-safe)
 *   D-2  cursor flow — warm light following the pointer (desktop only)
 *   D-3  the unified wave — click/tap anywhere, theme toggle, logo slash
 *   D-4  the idle heartbeat — a double pulse from the logo slash once the
 *        page has sat idle, on a slow ~2.5 min cadence
 *   D-5  the scroll-reactive band — faint brightening at reading position
 *
 * Everything is driven by CSS custom properties and a single
 * requestAnimationFrame; there is no per-frame React state. The
 * interactive wiring is client-only (useEffect), so prerendered HTML and
 * no-JS visitors still get the static grid. Honours prefers-reduced-motion
 * (static grid only) and coarse pointers (cursor flow and band off; wave
 * and heartbeat remain, so a deliberate touch tap still ripples while a
 * scroll does not).
 */
export function AmbientField() {
  const fieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return; // static grid only
    }

    const fine = window.matchMedia('(pointer: fine)').matches;

    let frame = 0;
    let mx = 0;
    let my = 0;
    let idleTimer = 0;
    let beatTimer = 0;

    // Tap vs scroll/drag tracking: a pointer gesture only ripples if it ends
    // close to where it started. A touch-scroll or a mouse-drag moves beyond
    // the slop and is suppressed. Pointer-type agnostic, so it is correct on
    // mouse, touch, and pen at every screen size.
    let tapX = 0;
    let tapY = 0;
    let tapTracking = false;
    let tapMoved = false;
    const TAP_SLOP = 10; // px of movement allowed before it counts as a scroll/drag

    // D-3 — emit one slow warm wave from a viewport point.
    const emitWave = (
      clientX: number,
      clientY: number,
      band = 120,
      op = 1,
      dur = 3000,
    ) => {
      const r = field.getBoundingClientRect();
      const ox = clientX - r.left;
      const oy = clientY - r.top;
      // Travel distance is the viewport diagonal — constant per screen and
      // independent of page length, so the wave SPEED is identical on every
      // page, short or long. Recomputed each emit, so it stays responsive.
      const maxR = Math.hypot(window.innerWidth, window.innerHeight);
      const el = document.createElement('div');
      el.className = 'af-wave';
      el.style.setProperty('--ox', `${ox}px`);
      el.style.setProperty('--oy', `${oy}px`);
      el.style.setProperty('--band', `${band}px`);
      el.style.setProperty('--r', '0px');
      el.style.opacity = `${op}`;
      field.appendChild(el);
      const start = performance.now();
      const step = (now: number) => {
        let t = (now - start) / dur;
        if (t > 1) t = 1;
        const eased = Math.sin((t * Math.PI) / 2); // easeOutSine — slow, calm
        el.style.setProperty('--r', `${eased * maxR}px`);
        el.style.opacity = `${op * (1 - t)}`;
        if (t < 1) window.requestAnimationFrame(step);
        else el.remove();
      };
      window.requestAnimationFrame(step);
    };

    // D-4 — gentle double pulse from the logo slash.
    const heartbeat = () => {
      const r = field.getBoundingClientRect();
      let cx = r.left + r.width / 2;
      let cy = r.top + 80;
      const slash = document.querySelector('[data-logo-slash]');
      if (slash) {
        const s = slash.getBoundingClientRect();
        cx = s.left + s.width / 2;
        cy = s.top + s.height / 2;
      }
      emitWave(cx, cy, 110, 0.6, 3200);
      window.setTimeout(() => emitWave(cx, cy, 84, 0.42, 2800), 300);
    };

    const startBeating = () => {
      if (beatTimer !== 0) return;
      // Slow ~2.5 min cadence. The first pulse waits one interval, so going
      // idle does not trigger an immediate beat.
      beatTimer = window.setInterval(heartbeat, 150000);
    };
    const stopBeating = () => {
      if (beatTimer !== 0) {
        window.clearInterval(beatTimer);
        beatTimer = 0;
      }
    };
    const resetIdle = () => {
      stopBeating();
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(startBeating, 15000);
    };

    // D-2 — cursor flow.
    const applyCursor = () => {
      frame = 0;
      const r = field.getBoundingClientRect();
      field.style.setProperty('--mx', `${mx - r.left}px`);
      field.style.setProperty('--my', `${my - r.top}px`);
    };

    const onMove = (e: PointerEvent) => {
      if (
        tapTracking &&
        Math.hypot(e.clientX - tapX, e.clientY - tapY) > TAP_SLOP
      ) {
        tapMoved = true; // moved too far — this is a scroll or drag, not a tap
      }
      if (fine && e.pointerType !== 'touch') {
        mx = e.clientX;
        my = e.clientY;
        if (frame === 0) frame = window.requestAnimationFrame(applyCursor);
      }
      resetIdle();
    };
    // D-3 — a gesture begins; we ripple only if it ends as a tap (below).
    const onDown = (e: PointerEvent) => {
      tapTracking = true;
      tapMoved = false;
      tapX = e.clientX;
      tapY = e.clientY;
      resetIdle();
    };
    // Ripple only on a deliberate tap/click, never on a scroll or drag.
    const onUp = (e: PointerEvent) => {
      if (tapTracking && !tapMoved) {
        emitWave(e.clientX, e.clientY);
      }
      tapTracking = false;
    };
    const onCancel = () => {
      tapTracking = false;
    };
    // D-5 — scroll band tracks the reading position.
    const onScroll = () => {
      if (fine) {
        const r = field.getBoundingClientRect();
        field.style.setProperty('--by', `${window.innerHeight / 2 - r.top}px`);
      }
      resetIdle();
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    window.addEventListener('pointercancel', onCancel, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('keydown', resetIdle);
    onScroll();
    resetIdle();

    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('keydown', resetIdle);
      window.clearTimeout(idleTimer);
      stopBeating();
      if (frame !== 0) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div
      ref={fieldRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      <div className="af-base" />
      <div className="af-wash" />
      <div className="af-glow" />
      <div className="af-band" />
    </div>
  );
}
