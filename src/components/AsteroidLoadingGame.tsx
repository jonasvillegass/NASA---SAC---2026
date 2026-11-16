import React, { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

const MAX_ASTEROIDS = 5;
const MIN_SPEED_PX = 65;
const MAX_SPEED_PX = 230;
const HIT_PADDING_PX = 6;

interface AsteroidVertex {
  angle: number;
  radiusRatio: number;
}

interface AsteroidCrater {
  angle: number;
  distRatio: number;
  sizeRatio: number;
}

interface Asteroid {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  rotation: number;
  angularVelocity: number;
  vertices: AsteroidVertex[];
  craters: AsteroidCrater[];
  tint: string;
  stroke: string;
}

interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  life: number;
  maxLife: number;
  color: string;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

interface MissMarker {
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

interface AsteroidLoadingGameProps {
  obstacleRef?: React.RefObject<HTMLDivElement | null>;
}

function createAsteroid(id: number, width: number, height: number): Asteroid {
  const radius = 16 + Math.random() * 13;
  const edge = Math.floor(Math.random() * 4); // 0: left, 1: right, 2: top, 3: bottom
  const margin = radius + 12;

  let startX = 0;
  let startY = 0;
  let targetX = width * (0.2 + Math.random() * 0.6);
  let targetY = height * (0.2 + Math.random() * 0.6);

  if (edge === 0) {
    startX = -margin;
    startY = Math.random() * height;
    targetX = width + margin;
    targetY = height * (0.1 + Math.random() * 0.8);
  } else if (edge === 1) {
    startX = width + margin;
    startY = Math.random() * height;
    targetX = -margin;
    targetY = height * (0.1 + Math.random() * 0.8);
  } else if (edge === 2) {
    startX = Math.random() * width;
    startY = -margin;
    targetX = width * (0.1 + Math.random() * 0.8);
    targetY = height + margin;
  } else {
    startX = Math.random() * width;
    startY = height + margin;
    targetX = width * (0.1 + Math.random() * 0.8);
    targetY = -margin;
  }

  const dx = targetX - startX;
  const dy = targetY - startY;
  const dist = Math.hypot(dx, dy) || 1;
  const speed = MIN_SPEED_PX + Math.random() * (MAX_SPEED_PX - MIN_SPEED_PX);

  const vertexCount = 8 + Math.floor(Math.random() * 5);
  const vertices: AsteroidVertex[] = [];
  for (let i = 0; i < vertexCount; i++) {
    vertices.push({
      angle: (i / vertexCount) * Math.PI * 2,
      radiusRatio: 0.72 + Math.random() * 0.32,
    });
  }

  const craterCount = 2 + Math.floor(Math.random() * 2);
  const craters: AsteroidCrater[] = [];
  for (let i = 0; i < craterCount; i++) {
    craters.push({
      angle: Math.random() * Math.PI * 2,
      distRatio: 0.2 + Math.random() * 0.35,
      sizeRatio: 0.14 + Math.random() * 0.14,
    });
  }

  const isCyanTint = Math.random() < 0.3;

  return {
    id,
    x: startX,
    y: startY,
    vx: (dx / dist) * speed,
    vy: (dy / dist) * speed,
    radius,
    rotation: Math.random() * Math.PI * 2,
    angularVelocity: (Math.random() - 0.5) * 2.6,
    vertices,
    craters,
    tint: isCyanTint ? "#1e293b" : "#27272a",
    stroke: isCyanTint ? "#38bdf8" : "#94a3b8",
  };
}

/**
 * Minijuego efímero de asteroides en Canvas mientras se cargan las imágenes del Mapa 2.
 * Al desmontarse (cuando cargan las imágenes o falla la API), desaparece y reinicia su score.
 */
export const AsteroidLoadingGame: React.FC<AsteroidLoadingGameProps> = ({ obstacleRef }) => {
  const { t } = useLanguage();
  const [score, setScore] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const asteroidsRef = useRef<Asteroid[]>([]);
  const particlesRef = useRef<ExplosionParticle[]>([]);
  const shockwavesRef = useRef<Shockwave[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const missMarkersRef = useRef<MissMarker[]>([]);
  const nextIdRef = useRef(1);
  const sizeRef = useRef({ width: 0, height: 0 });
  const obstacleRefLatest = useRef(obstacleRef);
  obstacleRefLatest.current = obstacleRef;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      sizeRef.current = { width, height };
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);

    let lastTime = performance.now();
    let spawnAccumulatorMs = 450; // Spawn first asteroid quickly
    let nextSpawnIntervalMs = 550;
    let rafId = 0;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const { width, height } = sizeRef.current;

      // Spawn up to MAX_ASTEROIDS simultaneously
      spawnAccumulatorMs += dt * 1000;
      if (spawnAccumulatorMs >= nextSpawnIntervalMs) {
        spawnAccumulatorMs = 0;
        nextSpawnIntervalMs = 350 + Math.random() * 450;
        if (asteroidsRef.current.length < MAX_ASTEROIDS && width > 40 && height > 40) {
          asteroidsRef.current.push(createAsteroid(nextIdRef.current++, width, height));
        }
      }

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Compute obstacle rect (loading card) relative to game container
      let obsRect: { left: number; top: number; right: number; bottom: number } | null = null;
      const obsEl = obstacleRefLatest.current?.current;
      if (obsEl) {
        const cRect = container.getBoundingClientRect();
        const oRect = obsEl.getBoundingClientRect();
        if (oRect.width > 0 && oRect.height > 0) {
          obsRect = {
            left: oRect.left - cRect.left,
            top: oRect.top - cRect.top,
            right: oRect.right - cRect.left,
            bottom: oRect.bottom - cRect.top,
          };
        }
      }

      // Update & draw asteroids
      const margin = 60;
      const nextAsteroids: Asteroid[] = [];
      for (const ast of asteroidsRef.current) {
        ast.x += ast.vx * dt;
        ast.y += ast.vy * dt;
        ast.rotation += ast.angularVelocity * dt;

        // Bounce off the loading card obstacle
        if (obsRect) {
          const closestX = Math.max(obsRect.left, Math.min(ast.x, obsRect.right));
          const closestY = Math.max(obsRect.top, Math.min(ast.y, obsRect.bottom));
          const dx = ast.x - closestX;
          const dy = ast.y - closestY;
          const distSq = dx * dx + dy * dy;

          if (distSq < ast.radius * ast.radius) {
            let nx = 0;
            let ny = 0;
            if (distSq > 1e-4) {
              const dist = Math.sqrt(distSq);
              nx = dx / dist;
              ny = dy / dist;
              ast.x = closestX + nx * (ast.radius + 0.5);
              ast.y = closestY + ny * (ast.radius + 0.5);
            } else {
              // Center is inside the box: push out through the nearest edge
              const dl = Math.abs(ast.x - obsRect.left);
              const dr = Math.abs(obsRect.right - ast.x);
              const dtEdge = Math.abs(ast.y - obsRect.top);
              const db = Math.abs(obsRect.bottom - ast.y);
              const minEdge = Math.min(dl, dr, dtEdge, db);
              if (minEdge === dl) {
                nx = -1;
                ast.x = obsRect.left - ast.radius - 0.5;
              } else if (minEdge === dr) {
                nx = 1;
                ast.x = obsRect.right + ast.radius + 0.5;
              } else if (minEdge === dtEdge) {
                ny = -1;
                ast.y = obsRect.top - ast.radius - 0.5;
              } else {
                ny = 1;
                ast.y = obsRect.bottom + ast.radius + 0.5;
              }
            }

            const dot = ast.vx * nx + ast.vy * ny;
            if (dot < 0) {
              ast.vx -= 2 * dot * nx;
              ast.vy -= 2 * dot * ny;
              ast.angularVelocity = -ast.angularVelocity;
            }
          }
        }

        const outOfBounds =
          ast.x < -margin ||
          ast.x > width + margin ||
          ast.y < -margin ||
          ast.y > height + margin;
        if (outOfBounds) continue;

        nextAsteroids.push(ast);

        ctx.save();
        ctx.translate(ast.x, ast.y);
        ctx.rotate(ast.rotation);

        // Outer glow
        ctx.shadowColor = "rgba(0, 210, 255, 0.25)";
        ctx.shadowBlur = 10;

        // Rocky polygon
        ctx.beginPath();
        ast.vertices.forEach((v, idx) => {
          const px = Math.cos(v.angle) * ast.radius * v.radiusRatio;
          const py = Math.sin(v.angle) * ast.radius * v.radiusRatio;
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.closePath();
        ctx.fillStyle = ast.tint;
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = ast.stroke;
        ctx.stroke();

        // Craters
        ctx.shadowBlur = 0;
        for (const c of ast.craters) {
          const cx = Math.cos(c.angle) * ast.radius * c.distRatio;
          const cy = Math.sin(c.angle) * ast.radius * c.distRatio;
          ctx.beginPath();
          ctx.arc(cx, cy, ast.radius * c.sizeRatio, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(15, 23, 42, 0.7)";
          ctx.fill();
          ctx.strokeStyle = "rgba(148, 163, 184, 0.35)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        ctx.restore();
      }
      asteroidsRef.current = nextAsteroids;

      // Update & draw shockwaves
      const nextShockwaves: Shockwave[] = [];
      for (const sw of shockwavesRef.current) {
        sw.life += dt;
        if (sw.life >= sw.maxLife) continue;
        nextShockwaves.push(sw);

        const progress = sw.life / sw.maxLife;
        const r = sw.radius + (sw.maxRadius - sw.radius) * progress;
        const alpha = 1 - progress;

        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 210, 255, ${alpha * 0.85})`;
        ctx.lineWidth = 2.5 * (1 - progress * 0.6);
        ctx.stroke();
        ctx.restore();
      }
      shockwavesRef.current = nextShockwaves;

      // Update & draw explosion particles
      const nextParticles: ExplosionParticle[] = [];
      for (const p of particlesRef.current) {
        p.life += dt;
        if (p.life >= p.maxLife) continue;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.96;
        p.vy *= 0.96;
        nextParticles.push(p);

        const alpha = 1 - p.life / p.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      particlesRef.current = nextParticles;

      // Update & draw miss markers
      const nextMisses: MissMarker[] = [];
      for (const m of missMarkersRef.current) {
        m.life += dt;
        if (m.life >= m.maxLife) continue;
        nextMisses.push(m);

        const progress = m.life / m.maxLife;
        const alpha = 1 - progress;
        const size = 5 + progress * 6;
        ctx.save();
        ctx.globalAlpha = alpha * 0.85;
        ctx.strokeStyle = "#fb7185";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(m.x - size, m.y - size);
        ctx.lineTo(m.x + size, m.y + size);
        ctx.moveTo(m.x + size, m.y - size);
        ctx.lineTo(m.x - size, m.y + size);
        ctx.stroke();
        ctx.restore();
      }
      missMarkersRef.current = nextMisses;

      // Update & draw "+1" / "-1" floating texts
      const nextTexts: FloatingText[] = [];
      for (const ft of floatingTextsRef.current) {
        ft.life += dt;
        if (ft.life >= ft.maxLife) continue;
        ft.y -= 36 * dt;
        nextTexts.push(ft);

        const alpha = 1 - ft.life / ft.maxLife;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = "bold 14px ui-monospace, SFMono-Regular, Menlo, monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = ft.color;
        ctx.shadowColor = "rgba(0, 0, 0, 0.9)";
        ctx.shadowBlur = 4;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }
      floatingTextsRef.current = nextTexts;

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, []);

  const spawnExplosion = (x: number, y: number, baseRadius: number) => {
    shockwavesRef.current.push({
      x,
      y,
      radius: baseRadius * 0.5,
      maxRadius: baseRadius * 2.6,
      life: 0,
      maxLife: 0.36,
    });

    const colors = ["#fbbf24", "#f97316", "#00D2FF", "#fef08a"];
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const speed = 75 + Math.random() * 145;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.8 + Math.random() * 2.6,
        life: 0,
        maxLife: 0.35 + Math.random() * 0.25,
        color: colors[i % colors.length],
      });
    }

    floatingTextsRef.current.push({
      x,
      y: y - 8,
      text: "+1",
      color: "#fbbf24",
      life: 0,
      maxLife: 0.65,
    });
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    // Check top-most (last drawn) asteroid first
    const list = asteroidsRef.current;
    let hit = false;
    for (let i = list.length - 1; i >= 0; i--) {
      const ast = list[i];
      const dist = Math.hypot(px - ast.x, py - ast.y);
      if (dist <= ast.radius + HIT_PADDING_PX) {
        list.splice(i, 1);
        spawnExplosion(ast.x, ast.y, ast.radius);
        setScore((prev) => prev + 1);
        hit = true;
        break;
      }
    }

    if (!hit) {
      missMarkersRef.current.push({
        x: px,
        y: py,
        life: 0,
        maxLife: 0.35,
      });
      floatingTextsRef.current.push({
        x: px,
        y: py - 8,
        text: "-1",
        color: "#fb7185",
        life: 0,
        maxLife: 0.55,
      });
      setScore((prev) => prev - 1);
    }
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 z-10 overflow-hidden select-none"
      aria-label={t.viewer.asteroidGameAria}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        className="block w-full h-full cursor-crosshair touch-none"
      />

      {/* Ephemeral Score & Hint Pill */}
      <div className="pointer-events-none absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 px-3 text-center">
        <div className="glass-panel rounded-full px-3.5 py-1 flex items-center gap-2 border border-[#00D2FF]/45 shadow-lg">
          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-mono text-xs font-bold text-amber-300">
            {t.viewer.asteroidGameScore(score)}
          </span>
        </div>
        <span className="text-[10px] font-medium text-slate-400/90 bg-black/50 px-2.5 py-0.5 rounded-full">
          {t.viewer.asteroidGameHint}
        </span>
      </div>
    </div>
  );
};
