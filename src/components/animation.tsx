"use client";
import { useEffect, useState } from "react";

export default function Anim() {
  const items = Array.from({ length: 8 });
  const radius = 400;
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    const stepAngle = 360 / items.length;
    let angleRef = 0;

    const step = () => {
      angleRef = (angleRef + stepAngle) % 360;
      setAngle(angleRef);
      setTimeout(step, 1500); // 0.5s transition + 1s pause
    };

    const timeoutId = setTimeout(step, 1500);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden" style={{ perspective: "1000px" }}>
      <div
        className="absolute left-1/2 top-1/2"
        style={{
          width: `${radius * 2}px`,
          height: `${radius * 2}px`,
          transform: `translate(-50%, -50%) rotate(${angle}deg)`,
          transition: "transform 0.5s ease-in-out",
        }}
      >
        {items.map((_, i) => {
          const baseAngle = (360 / items.length) * i;
          const currentRotation = (angle + baseAngle) % 360;

          // Normalize angle to closest to 0 (top)
          const relativeToTop = Math.min(
            Math.abs(currentRotation),
            Math.abs(currentRotation - 360)
          );

          // Interpolate scale and opacity for perspective/depth
          const scale = 1 - Math.min(relativeToTop / 180, 0.5);
          const opacity = 1 - Math.min(relativeToTop / 180, 0.6);
          // Optional: Z-axis translation for extra depth
          const z = 200 * scale;

          return (
            <div
              key={i}
              className="absolute w-[472px] h-[920px] bg-white text-black font-bold flex items-center justify-center"
              style={{
                transform: `
                  rotate(${baseAngle}deg)
                  translate(${radius}px)
                  rotate(${-angle - baseAngle}deg)
                  scale(${scale})
                  translateZ(${z}px)
                `,
                opacity,
                transition: "transform 0.5s ease-in-out, opacity 0.5s ease-in-out"
              }}
            >
              {i + 1}
            </div>
          );
        })}
      </div>
    </div>
  );
}
