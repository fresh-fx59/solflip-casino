"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimationControls } from "framer-motion";
import type { Side } from "@/lib/format";

type Phase = "idle" | "placing" | "pending" | "settling" | "won" | "lost";

function Face({ label, glyph }: { label: string; glyph: string }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center rounded-full"
      style={{
        backfaceVisibility: "hidden",
        background:
          "radial-gradient(60% 60% at 38% 30%, #fbe9a8 0%, #e8c75c 22%, #c9a227 48%, #9c7c1c 74%, #6f560f 100%)",
        boxShadow:
          "inset 0 6px 14px rgba(255,250,220,0.7), inset 0 -10px 22px rgba(70,52,8,0.85), inset 0 0 0 8px rgba(120,92,18,0.35)",
      }}
    >
      {/* engraved rim ticks */}
      <div
        className="absolute inset-[6%] rounded-full"
        style={{
          background:
            "repeating-conic-gradient(from 0deg, rgba(80,60,10,0.0) 0deg 4deg, rgba(80,60,10,0.28) 4deg 5deg)",
          maskImage:
            "radial-gradient(circle, transparent 78%, #000 80%, #000 92%, transparent 94%)",
          WebkitMaskImage:
            "radial-gradient(circle, transparent 78%, #000 80%, #000 92%, transparent 94%)",
        }}
      />
      <span
        className="font-display"
        style={{
          fontSize: "3.1rem",
          lineHeight: 1,
          color: "#5a430c",
          textShadow:
            "0 1px 0 rgba(255,247,214,0.6), 0 -1px 1px rgba(60,44,6,0.7)",
        }}
      >
        {glyph}
      </span>
      <span
        className="font-mono mt-2"
        style={{
          fontSize: "0.62rem",
          letterSpacing: "0.34em",
          textTransform: "uppercase",
          color: "#6b510e",
          textShadow: "0 1px 0 rgba(255,247,214,0.5)",
        }}
      >
        {label}
      </span>
    </div>
  );
}

export function Coin({
  phase,
  chosenSide,
  landedSide,
  size = 220,
}: {
  phase: Phase;
  chosenSide: Side;
  landedSide: Side | null;
  size?: number;
}) {
  const controls = useAnimationControls();
  const rot = useRef(0);
  const spinning = phase === "placing" || phase === "pending" || phase === "settling";

  useEffect(() => {
    let active = true;
    (async () => {
      if (spinning) {
        while (active) {
          rot.current += 540;
          await controls.start({
            rotateX: rot.current,
            transition: { duration: 0.75, ease: "linear" },
          });
        }
      } else if (phase === "won" || phase === "lost") {
        const face = landedSide === 1 ? 180 : 0;
        const base = Math.ceil((rot.current + 1) / 360) * 360;
        rot.current = base + 360 * 3 + face;
        await controls.start({
          rotateX: rot.current,
          transition: { duration: 1.5, ease: [0.12, 0.8, 0.2, 1] },
        });
      } else {
        const face = chosenSide === 1 ? 180 : 0;
        const base = Math.ceil(rot.current / 360) * 360;
        rot.current = base + face;
        await controls.start({
          rotateX: rot.current,
          transition: { duration: 0.6, ease: "easeOut" },
        });
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, landedSide, chosenSide]);

  const glow =
    phase === "won"
      ? "0 0 60px 8px rgba(240,207,103,0.55)"
      : phase === "lost"
      ? "0 0 40px 4px rgba(0,0,0,0.6)"
      : spinning
      ? "0 0 50px 6px rgba(201,162,39,0.35)"
      : "0 0 30px 2px rgba(201,162,39,0.18)";

  return (
    <div
      style={{ perspective: 1000, width: size, height: size }}
      className="relative"
    >
      {/* cast shadow on the felt */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 rounded-[50%]"
        style={{
          width: size * 0.7,
          height: size * 0.12,
          bottom: -size * 0.12,
          x: "-50%",
          background:
            "radial-gradient(closest-side, rgba(0,0,0,0.55), transparent)",
          filter: "blur(2px)",
        }}
        animate={{ scaleX: spinning ? [1, 0.82, 1] : 1, opacity: spinning ? [0.7, 0.4, 0.7] : 0.7 }}
        transition={{ duration: 0.75, repeat: spinning ? Infinity : 0, ease: "easeInOut" }}
      />
      <motion.div
        className="relative h-full w-full rounded-full"
        style={{ transformStyle: "preserve-3d", boxShadow: glow }}
        animate={controls}
        whileHover={!spinning ? { scale: 1.03 } : undefined}
      >
        <Face label="Heads" glyph="◎" />
        <div style={{ transform: "rotateX(180deg)", position: "absolute", inset: 0 }}>
          <Face label="Tails" glyph="✦" />
        </div>
      </motion.div>
    </div>
  );
}
