import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

/** Zone de signature tactile ; expose toBlob() et clear(). */
const SignaturePad = forwardRef(function SignaturePad({ height = 220 }, ref) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const strokes = useRef(0);
  const [empty, setEmpty] = useState(true);

  useEffect(() => {
    const c = canvasRef.current;
    const ratio = Math.max(1, window.devicePixelRatio || 1);
    const rect = c.getBoundingClientRect();
    c.width = Math.round(rect.width * ratio);
    c.height = Math.round(height * ratio);
    const ctx = c.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, rect.width, height);
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111';
  }, [height]);

  const pos = (e) => {
    const r = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = (e) => {
    e.preventDefault();
    canvasRef.current.setPointerCapture?.(e.pointerId);
    drawing.current = true;
    last.current = pos(e);
    strokes.current += 1;
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.arc(last.current.x, last.current.y, 1.2, 0, Math.PI * 2);
    ctx.fill();
    setEmpty(false);
  };

  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const p = pos(e);
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
  };

  const up = () => {
    drawing.current = false;
  };

  const clear = () => {
    const c = canvasRef.current;
    const ctx = c.getContext('2d');
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.restore();
    strokes.current = 0;
    setEmpty(true);
  };

  useImperativeHandle(ref, () => ({
    clear,
    isEmpty: () => empty,
    strokes: () => strokes.current,
    toBlob: () =>
      new Promise((resolve) => {
        const c = canvasRef.current;
        // Réduit à 700 px de large max pour rester léger (e-mail + stockage).
        const w = Math.min(700, c.width);
        const h = Math.round((c.height * w) / c.width);
        const out = document.createElement('canvas');
        out.width = w;
        out.height = h;
        out.getContext('2d').drawImage(c, 0, 0, w, h);
        out.toBlob((b) => resolve(b), 'image/png');
      }),
  }));

  return (
    <div className="lv-sig">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height, touchAction: 'none' }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onPointerLeave={up}
        aria-label="Zone de signature du client"
      />
      <button type="button" className="lv-link" onClick={clear}>
        Effacer
      </button>
    </div>
  );
});

export default SignaturePad;
