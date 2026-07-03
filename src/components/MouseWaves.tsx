import { useEffect, useRef } from "react";

/**
 * Abstract flowing wave lines background — parallel smooth curves across the
 * whole viewport (Alamy-style). Mouse gently distorts the flow.
 */
export function MouseWaves() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    let t = 0;
    let raf = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const onMove = (e: MouseEvent) => {
      mouse.tx = e.clientX;
      mouse.ty = e.clientY;
    };
    const onLeave = () => {
      mouse.tx = -9999;
      mouse.ty = -9999;
    };
    const onTouch = (e: TouchEvent) => {
      if (e.touches[0]) {
        mouse.tx = e.touches[0].clientX;
        mouse.ty = e.touches[0].clientY;
      }
    };

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseleave", onLeave);
    window.addEventListener("touchmove", onTouch, { passive: true });

    const LINES = 60;   // dense parallel streaks
    const STEP = 6;

    const draw = () => {
      t += 0.006;
      mouse.x += (mouse.tx - mouse.x) * 0.1;
      mouse.y += (mouse.ty - mouse.y) * 0.1;

      ctx.clearRect(0, 0, width, height);

      // extend beyond viewport so tilted lines still cover corners
      const overshoot = 200;
      const totalH = height + overshoot * 2;
      const spacing = totalH / (LINES - 1);
      const influence = 260;

      for (let i = 0; i < LINES; i++) {
        const baseY = -overshoot + i * spacing;
        // gentle diagonal tilt so lines flow across the page
        const tilt = (i / LINES - 0.5) * 40;

        ctx.beginPath();
        for (let x = -STEP; x <= width + STEP; x += STEP) {
          const nx = x * 0.0018;

          // layered smooth sine flow — parallel curves
          const flow =
            Math.sin(nx * 2.1 + t * 1.2 + i * 0.06) * 38 +
            Math.sin(nx * 1.1 - t * 0.8 + i * 0.10) * 24 +
            Math.cos(nx * 0.6 + t * 0.5 + i * 0.03) * 18;

          // linear tilt across width
          const slant = (x / width) * tilt;

          // soft mouse distortion — bends nearby lines
          const dx = x - mouse.x;
          const dy = baseY + flow - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          let push = 0;
          if (dist < influence) {
            const f = 1 - dist / influence;
            push = Math.sign(dy || 1) * f * f * 55;
          }

          const y = baseY + flow + slant + push;
          if (x === -STEP) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }

        // hue drift across lines — indigo → magenta → cyan
        const hue = 250 + Math.sin(i * 0.18 + t * 0.4) * 60;
        const alpha = 0.14 + (Math.sin(i * 0.3 + t) * 0.5 + 0.5) * 0.18;
        ctx.strokeStyle = `hsla(${hue}, 85%, 58%, ${alpha})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1]"
    />
  );
}
