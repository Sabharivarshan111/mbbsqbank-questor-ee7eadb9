import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Trash2 } from "lucide-react";

interface Props {
  initialDataUrl?: string | null;
  onSave: (dataUrl: string | null) => void;
  onCancel: () => void;
}

const COLORS = ["#111827", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7"];

const DrawingCanvas = ({ initialDataUrl, onSave, onCancel }: Props) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(3);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(ratio, ratio);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
    if (initialDataUrl) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = initialDataUrl;
    }
  }, [initialDataUrl]);

  const pos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastRef.current = pos(e);
  };
  const move = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !lastRef.current) return;
    const p = pos(e);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(lastRef.current.x, lastRef.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastRef.current = p;
  };
  const end = () => { drawingRef.current = false; lastRef.current = null; };

  const clear = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, rect.width, rect.height);
  };

  const save = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    onSave(canvas.toDataURL("image/png"));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`h-7 w-7 rounded-full border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
            style={{ backgroundColor: c }}
            aria-label={`color ${c}`}
          />
        ))}
        <input
          type="range" min={1} max={20} value={width}
          onChange={(e) => setWidth(parseInt(e.target.value))}
          className="ml-2 flex-1 min-w-[80px]"
        />
        <Button size="sm" variant="ghost" onClick={() => setColor("#ffffff")} title="Eraser">
          <Eraser className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" onClick={clear} title="Clear">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <canvas
        ref={canvasRef}
        className="w-full h-[320px] rounded-md border bg-white touch-none"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onPointerLeave={end}
      />
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button onClick={save}>Save drawing</Button>
      </div>
    </div>
  );
};

export default DrawingCanvas;
