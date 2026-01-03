"use client";

import { useEffect, useState } from "react";

interface ConfettiProps {
    active: boolean;
    duration?: number;
}

export function Confetti({ active, duration = 3000 }: ConfettiProps) {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (active) {
            setShow(true);
            const timer = setTimeout(() => {
                setShow(false);
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [active, duration]);

    if (!show) return null;

    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    const confettiPieces = Array.from({ length: 50 }, (_, i) => i);

    return (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {confettiPieces.map((i) => {
                const color = colors[Math.floor(Math.random() * colors.length)];
                const left = Math.random() * 100;
                const delay = Math.random() * 0.5;
                const animDuration = 2 + Math.random() * 2;
                const rotation = Math.random() * 360;

                return (
                    <div
                        key={i}
                        className="absolute w-2 h-2 rounded-sm"
                        style={{
                            left: `${left}%`,
                            backgroundColor: color,
                            animation: `confetti-fall ${animDuration}s ease-out ${delay}s forwards`,
                            transform: `rotate(${rotation}deg)`,
                        }}
                    />
                );
            })}
        </div>
    );
}

