import { useEffect, useRef } from "react";

/**
 * Fixed full-viewport canvas that draws horizontal wave lines
 * distorted by the mouse position. Pure UI decoration.
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

    const LINES = 22;
    const STEP = 14; // px between sample points along X

    const draw = () => {
      t += 0.008;
      // ease cursor
      mouse.x += (mouse.tx - mouse.x) * 0.12;
      mouse.y += (mouse.ty - mouse.y) * 0.12;

      ctx.clearRect(0, 0, width, height);

      const spacing = height / (LINES - 1);
      const influence = 140; // radius of mouse effect

      for (let i = 0; i < LINES; i++) {
        const baseY = i * spacing;
        ctx.beginPath();
        for (let x = 0; x <= width + STEP; x += STEP) {
          // ambient wave
          const wave =
            Math.sin(x * 0.006 + t + i * 0.35) * 6 +
            Math.sin(x * 0.013 - t * 1.3 + i * 0.2) * 4;

          // mouse distortion — push line away from cursor
          const dx = x - mouse.x;
          const dy = baseY - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          let push = 0;
          if (dist < influence) {
            const f = 1 - dist / influence;
            push = Math.sign(dy || 1) * f * f * 60;
          }

          const y = baseY + wave + push;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        // subtle gradient-ish alpha per line
        const alpha = 0.18 + (i / LINES) * 0.22;
        ctx.strokeStyle = `hsla(263, 70%, 45%, ${alpha})`;
        ctx.lineWidth = 1.2;
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
