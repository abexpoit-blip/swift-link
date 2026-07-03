import { useEffect, useRef } from "react";

/**
 * Sea-wave background — layered ocean waves at the bottom of the viewport.
 * Mouse movement creates ripples on the water surface.
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

    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999, vx: 0, vy: 0 };
    const ripples: { x: number; y: number; r: number; life: number }[] = [];
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
      // spawn ripple sparingly based on movement
      if (Math.random() < 0.25) {
        ripples.push({ x: e.clientX, y: e.clientY, r: 0, life: 1 });
        if (ripples.length > 30) ripples.shift();
      }
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

    // Ocean wave layers — back to front (far → near)
    const layers = [
      { amp: 22, len: 0.006, speed: 0.6, yFrac: 0.62, color: "hsla(220, 80%, 62%, 0.14)" },
      { amp: 26, len: 0.008, speed: 0.9, yFrac: 0.72, color: "hsla(232, 78%, 58%, 0.18)" },
      { amp: 30, len: 0.010, speed: 1.2, yFrac: 0.82, color: "hsla(258, 78%, 55%, 0.24)" },
      { amp: 34, len: 0.013, speed: 1.6, yFrac: 0.92, color: "hsla(280, 78%, 52%, 0.32)" },
    ];

    const STEP = 8;

    const draw = () => {
      t += 0.012;
      mouse.x += (mouse.tx - mouse.x) * 0.15;
      mouse.y += (mouse.ty - mouse.y) * 0.15;

      ctx.clearRect(0, 0, width, height);

      // draw each wave layer as filled shape
      for (let l = 0; l < layers.length; l++) {
        const layer = layers[l];
        const baseY = height * layer.yFrac;
        const influence = 180 + l * 20;

        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let x = 0; x <= width + STEP; x += STEP) {
          const wave =
            Math.sin(x * layer.len + t * layer.speed) * layer.amp +
            Math.sin(x * layer.len * 2.1 - t * layer.speed * 1.3) * (layer.amp * 0.35) +
            Math.cos(x * layer.len * 0.6 + t * layer.speed * 0.7) * (layer.amp * 0.2);

          // mouse distortion — lift the water toward cursor
          const dx = x - mouse.x;
          const dy = baseY - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          let push = 0;
          if (dist < influence) {
            const f = 1 - dist / influence;
            push = -f * f * 40 * (1 + l * 0.15);
          }

          // ripple contributions
          let rippleY = 0;
          for (const r of ripples) {
            const rd = Math.abs(x - r.x);
            const falloff = Math.exp(-rd / 90);
            rippleY += Math.sin(rd * 0.08 - r.r * 0.12) * 10 * falloff * r.life;
          }

          const y = baseY + wave + push + rippleY;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = layer.color;
        ctx.fill();

        // crest highlight line
        ctx.beginPath();
        for (let x = 0; x <= width + STEP; x += STEP) {
          const wave =
            Math.sin(x * layer.len + t * layer.speed) * layer.amp +
            Math.sin(x * layer.len * 2.1 - t * layer.speed * 1.3) * (layer.amp * 0.35);
          const dx = x - mouse.x;
          const dy = baseY - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          let push = 0;
          if (dist < influence) {
            const f = 1 - dist / influence;
            push = -f * f * 40 * (1 + l * 0.15);
          }
          const y = baseY + wave + push;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `hsla(${220 + l * 20}, 85%, ${70 - l * 6}%, ${0.28 + l * 0.06})`;
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }

      // age ripples
      for (const r of ripples) {
        r.r += 1;
        r.life *= 0.97;
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        if (ripples[i].life < 0.05) ripples.splice(i, 1);
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
