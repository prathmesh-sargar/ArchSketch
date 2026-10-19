import React, { useState, useEffect, useRef, useCallback } from 'react';
import './Footer.css';
import { ArrowUp, Terminal } from 'lucide-react';

export interface FooterProps {
  brandName?: string;
  tagline?: string;
  onBrandClick?: () => void;
  className?: string;
}

export const Footer: React.FC<FooterProps> = ({
  brandName = 'ArchSketch',
  tagline = 'The architectural CAD system for distributed databases, relational schemas, and microservice topologies.',
  onBrandClick,
  className = '',
}) => {
  const stageRef = useRef<HTMLDivElement | null>(null);

  // Elastic Spring-Pendulum Physics State
  // Coordinates for cord stretch & angular oscillation
  const STAGE_WIDTH = 1000;
  const PIVOT_X = STAGE_WIDTH / 2; // 500
  const PIVOT_Y = 16;
  const REST_LENGTH = 195; // hangs directly down into the upper half of the text
  const MIN_LENGTH = 90;
  const MAX_LENGTH = 330; // can stretch all the way over and down the text!

  const rRef = useRef<number>(REST_LENGTH);
  const thetaRef = useRef<number>(0.28);
  const vrRef = useRef<number>(0);
  const vThetaRef = useRef<number>(0);

  const isDraggingRef = useRef<boolean>(false);
  const prevDragPosRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });

  const [bulbState, setBulbState] = useState({
    x: 550,
    y: 205,
    r: 195,
    theta: 0.28,
    shadowX: -14,
    shadowY: 26,
    shadowBlur: 22,
    lightIntensity: 0.45,
  });

  const [isPointerActive, setIsPointerActive] = useState(false);

  // 60FPS coupled spring-pendulum physics loop
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const updatePhysics = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.04);
      lastTime = now;

      if (!isDraggingRef.current) {
        const g = 420; // natural gravity
        const k = 135; // spring tension
        const radialDamping = 0.94; // bounce damping
        const angularDamping = 0.993; // swing air resistance

        const r = rRef.current;
        const theta = thetaRef.current;
        const vr = vrRef.current;
        const vTheta = vThetaRef.current;

        // Radial spring acceleration: r'' = r * (theta')^2 + g * cos(theta) - k * (r - REST_LENGTH)
        const ar = r * vTheta * vTheta + g * Math.cos(theta) - k * (r - REST_LENGTH);
        vrRef.current = (vr + ar * dt) * radialDamping;
        rRef.current = Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, r + vrRef.current * dt));

        // Tangential pendulum acceleration: theta'' = (-g * sin(theta) - 2 * r' * theta') / r
        const aTheta = (-g * Math.sin(theta) - 2 * vrRef.current * vTheta) / Math.max(r, 50);
        vThetaRef.current = (vTheta + aTheta * dt) * angularDamping;
        thetaRef.current += vThetaRef.current * dt;

        // Subtle ambient natural breathing oscillation so it never feels dead
        if (Math.abs(thetaRef.current) < 0.015 && Math.abs(vThetaRef.current) < 0.02) {
          vThetaRef.current = 0.45 * (thetaRef.current >= 0 ? 1 : -1);
        }
      }

      // Convert to Cartesian coordinates
      const currentR = rRef.current;
      const currentTheta = thetaRef.current;
      const currentX = PIVOT_X + currentR * Math.sin(currentTheta);
      const currentY = PIVOT_Y + currentR * Math.cos(currentTheta);

      // Real 3D ray-traced shadow on the heavy text:
      // The text center is at (PIVOT_X, 330)
      const textCenterX = PIVOT_X;
      const textCenterY = 320;
      const dx = currentX - textCenterX;
      const dy = currentY - textCenterY;

      // When the light is to the left (currentX < textCenterX), shadows fall to the right (+shadowX)
      const shadowX = Math.round(-dx * 0.32);
      // As light gets lower, shadow casts downward away from the light source
      const shadowY = Math.max(12, Math.round(Math.abs(dy) * 0.28 + 14));
      const shadowBlur = Math.min(48, Math.max(14, Math.round(20 + Math.abs(dx) * 0.06)));
      const lightIntensity = Math.min(0.85, 0.3 + (currentY / MAX_LENGTH) * 0.5);

      setBulbState({
        x: currentX,
        y: currentY,
        r: currentR,
        theta: currentTheta,
        shadowX,
        shadowY,
        shadowBlur,
        lightIntensity,
      });

      animId = requestAnimationFrame(updatePhysics);
    };

    animId = requestAnimationFrame(updatePhysics);

    return () => cancelAnimationFrame(animId);
  }, []);

  // Pointer dragging: allows swinging AND stretching the bulb directly over the text
  const handlePointerDown = useCallback((e: React.PointerEvent<SVGGElement>) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    isDraggingRef.current = true;
    setIsPointerActive(true);

    vrRef.current = 0;
    vThetaRef.current = 0;
    prevDragPosRef.current = { x: e.clientX, y: e.clientY, time: performance.now() };
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (!isDraggingRef.current || !stageRef.current) return;

    const rect = stageRef.current.getBoundingClientRect();
    const scaleX = STAGE_WIDTH / rect.width;
    const scaleY = 440 / rect.height;
    const pointerX = (e.clientX - rect.left) * scaleX;
    const pointerY = (e.clientY - rect.top) * scaleY;

    const dx = pointerX - PIVOT_X;
    const dy = Math.max(pointerY - PIVOT_Y, 25);

    const newTheta = Math.max(-1.38, Math.min(1.38, Math.atan2(dx, dy)));
    const newR = Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, Math.hypot(dx, dy)));

    const now = performance.now();
    const dt = (now - prevDragPosRef.current.time) / 1000;
    if (dt > 0.005) {
      const dTheta = newTheta - thetaRef.current;
      const dR = newR - rRef.current;
      vThetaRef.current = dTheta / dt;
      vrRef.current = dR / dt;
      prevDragPosRef.current = { x: e.clientX, y: e.clientY, time: now };
    }

    thetaRef.current = newTheta;
    rRef.current = newR;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsPointerActive(false);
      // Cap release impulse for natural rebound
      vThetaRef.current = Math.max(-7, Math.min(7, vThetaRef.current));
      vrRef.current = Math.max(-450, Math.min(450, vrRef.current));
      try {
        (e.target as Element).releasePointerCapture?.(e.pointerId);
      } catch {
        // ignore
      }
    }
  }, []);

  return (
    <footer
      className={`arch-cinematic-footer ${className}`}
      aria-label="ArchSketch Footer"
    >
      <div className="arch-footer-inner">
        {/* Ceiling Mount Fixture */}
        <div className="bulb-ceiling-fixture" />
        <div className="bulb-ceiling-pivot" />

        {/* Combined Interactive Stage: Bulb Hangs and Moves Directly Over the Heavy Text */}
        <div
          ref={stageRef}
          className={`bulb-interactive-stage ${isPointerActive ? 'bulb-is-dragging' : ''}`}
        >
          {/* Dynamic Projected Radial Spotlight that tracks the bulb position */}
          <div
            className="bulb-projected-ambient-light"
            style={{
              left: `${(bulbState.x / STAGE_WIDTH) * 100}%`,
              top: `${(bulbState.y / 440) * 100}%`,
              width: `${Math.max(220, bulbState.r * 2.2)}px`,
              height: `${Math.max(140, bulbState.r * 1.4)}px`,
              background: `radial-gradient(ellipse at 50% 35%, rgba(245, 158, 11, ${bulbState.lightIntensity * 0.32}) 0%, rgba(180, 83, 9, ${bulbState.lightIntensity * 0.14}) 42%, transparent 75%)`,
            }}
            aria-hidden="true"
          />
          {/* Heavy 3D Typography Behind the Hanging Bulb */}
          <div className="arch-heavy-typography-stage">
            <span
              className="arch-heavy-text"
              style={{
                filter: `
                  drop-shadow(${bulbState.shadowX}px ${bulbState.shadowY}px 4px rgba(0, 0, 0, 0.98))
                  drop-shadow(${bulbState.shadowX * 1.5}px ${bulbState.shadowY * 1.4}px ${bulbState.shadowBlur}px rgba(0, 0, 0, 0.92))
                  drop-shadow(${bulbState.shadowX * 2.2}px ${bulbState.shadowY * 1.8}px ${bulbState.shadowBlur * 1.5}px rgba(0, 0, 0, 0.7))
                  drop-shadow(0 0 ${Math.max(8, 22 - Math.abs(bulbState.shadowX))}px rgba(245, 158, 11, ${bulbState.lightIntensity * 0.16}))
                `,
              }}
            >
              {brandName}
            </span>
          </div>

          {/* Ground Plane Shadow */}
          <div className="arch-text-ground-shadow" aria-hidden="true" />

          {/* SVG Overlay: Cord, Brass Socket, Glass Edison Bulb, Glowing Filament & Light Cone */}
          <svg
            className="bulb-svg-overlay"
            viewBox={`0 0 ${STAGE_WIDTH} 440`}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <defs>
              {/* Elastic Cord Texture Gradient */}
              <linearGradient id="heavyCordGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#27272a" />
                <stop offset="30%" stopColor="#52525b" />
                <stop offset="70%" stopColor="#71717a" />
                <stop offset="100%" stopColor="#3f3f46" />
              </linearGradient>

              {/* Brass Socket Gradient */}
              <linearGradient id="brassSocketGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#78350f" />
                <stop offset="25%" stopColor="#d97706" />
                <stop offset="50%" stopColor="#fef3c7" />
                <stop offset="75%" stopColor="#d97706" />
                <stop offset="100%" stopColor="#451a03" />
              </linearGradient>

              {/* Volumetric Lamp Light Cone */}
              <linearGradient id="volumetricLightCone" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.25" />
                <stop offset="30%" stopColor="#f59e0b" stopOpacity="0.10" />
                <stop offset="70%" stopColor="#78350f" stopOpacity="0.04" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </linearGradient>

              {/* Glass Reflection Gradient */}
              <linearGradient id="glassSheenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
                <stop offset="40%" stopColor="#ffffff" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </linearGradient>

              {/* Filament Incandescent Core Glow */}
              <filter id="filamentGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur1" />
                <feGaussianBlur in="SourceGraphic" stdDeviation="12" result="blur2" />
                <feMerge>
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Volumetric Light Beam spreading from Bulb onto the Typography */}
            <polygon
              points={`
                ${bulbState.x},${bulbState.y + 10} 
                ${bulbState.x - bulbState.r * 1.5},440 
                ${bulbState.x + bulbState.r * 1.5},440
              `}
              fill="url(#volumetricLightCone)"
              pointerEvents="none"
              opacity="0.85"
            />

            {/* Heavy Twisted Textile Cord */}
            <line
              x1={PIVOT_X}
              y1={PIVOT_Y}
              x2={bulbState.x}
              y2={bulbState.y - 24}
              stroke="url(#heavyCordGrad)"
              strokeWidth={Math.max(2.2, 4.0 - (bulbState.r / MAX_LENGTH) * 1.8)}
              strokeLinecap="round"
            />

            {/* Cord Texture Spirals */}
            <line
              x1={PIVOT_X}
              y1={PIVOT_Y}
              x2={bulbState.x}
              y2={bulbState.y - 24}
              stroke="#fbbf24"
              strokeWidth="0.8"
              strokeDasharray="3 5"
              opacity="0.45"
            />

            {/* Draggable Realistic Hanging Edison Bulb Group */}
            <g
              transform={`translate(${bulbState.x}, ${bulbState.y}) rotate(${bulbState.theta * 20})`}
              className="bulb-grab-target"
              onPointerDown={handlePointerDown}
              role="slider"
              aria-label="Realistic Edison light bulb"
              tabIndex={0}
            >
              {/* Outer Golden Ambient Aura */}
              <circle
                r="46"
                fill="none"
                stroke="rgba(245, 158, 11, 0.25)"
                strokeWidth="1"
                strokeDasharray="4 6"
              />

              {/* Luminous Warm Corona */}
              <circle
                cy="14"
                r="36"
                fill="rgba(245, 158, 11, 0.22)"
                filter="url(#filamentGlow)"
              />

              {/* Brass Screw Cap / Collar */}
              <rect
                x="-10"
                y="-24"
                width="20"
                height="12"
                rx="2"
                fill="url(#brassSocketGrad)"
                stroke="#451a03"
                strokeWidth="0.8"
              />
              {/* Thread ridges on brass cap */}
              <line x1="-9" y1="-20" x2="9" y2="-20" stroke="#fef3c7" strokeWidth="0.6" />
              <line x1="-9" y1="-16" x2="9" y2="-16" stroke="#451a03" strokeWidth="0.6" />

              {/* Brass Hood / Bulb Neck Collar */}
              <path
                d="M -12 -12 L 12 -12 L 15 -2 L -15 -2 Z"
                fill="url(#brassSocketGrad)"
                stroke="#78350f"
                strokeWidth="0.8"
              />

              {/* Teardrop Glass Envelope Body */}
              <path
                d="M -14 -2 
                   C -14 6, -24 16, -24 30 
                   C -24 44, -13 54, 0 54 
                   C 13 54, 24 44, 24 30 
                   C 24 16, 14 6, 14 -2 Z"
                fill="rgba(254, 243, 199, 0.15)"
                stroke="rgba(254, 243, 199, 0.55)"
                strokeWidth="1.4"
                filter="drop-shadow(0 0 16px rgba(245, 158, 11, 0.7))"
              />

              {/* Internal Filament Support Leads */}
              <line x1="-6" y1="-2" x2="-4" y2="16" stroke="#92400e" strokeWidth="0.9" />
              <line x1="6" y1="-2" x2="4" y2="16" stroke="#92400e" strokeWidth="0.9" />

              {/* Incandescent Coiled Tungsten Hairpin Filament */}
              <path
                d="M -4 16 
                   C -2 22, -8 26, -4 34 
                   C 0 38, 0 38, 0 40 
                   C 0 38, 0 38, 4 34 
                   C 8 26, 2 22, 4 16"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1.6"
                filter="url(#filamentGlow)"
              />

              {/* Filament Hotspots */}
              <circle cx="0" cy="40" r="2.5" fill="#ffffff" filter="drop-shadow(0 0 8px #f59e0b)" />
              <circle cx="-4" cy="24" r="2" fill="#ffffff" />
              <circle cx="4" cy="24" r="2" fill="#ffffff" />

              {/* Glass Specular Curved Highlights */}
              <path
                d="M -18 16 C -20 24, -18 36, -10 46"
                fill="none"
                stroke="url(#glassSheenGrad)"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
              <path
                d="M 16 16 C 18 22, 18 32, 12 40"
                fill="none"
                stroke="#ffffff"
                strokeWidth="1"
                opacity="0.4"
                strokeLinecap="round"
              />
            </g>
          </svg>
        </div>

        {/* Narrative Tagline */}
        <p className="arch-footer-narrative">
          {tagline}
        </p>

        {/* Minimal Clean Bottom Legal Bar */}
        <div className="arch-footer-bottom-bar">
          <div className="flex items-center space-x-2 text-zinc-500">
            <Terminal className="w-3.5 h-3.5 text-amber-500" />
            <span>© 2026 {brandName} · System Architecture & ERD Engineering</span>
          </div>

          <div className="flex items-center space-x-5 text-xs text-zinc-400">
            <a href="#privacy" className="hover:text-zinc-200 transition-colors">Privacy</a>
            <span className="text-zinc-700">·</span>
            <a href="#terms" className="hover:text-zinc-200 transition-colors">Terms</a>
            <span className="text-zinc-700">·</span>
            <a href="#security" className="hover:text-zinc-200 transition-colors">Security</a>
            <span className="text-zinc-700">·</span>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center space-x-1 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <span>Back to Top</span>
              <ArrowUp className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
