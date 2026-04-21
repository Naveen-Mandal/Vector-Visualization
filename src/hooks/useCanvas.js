import { useEffect } from "react";

export function useCanvas(canvasRef, draw, deps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    draw(ctx, canvas);
  }, deps);
}
