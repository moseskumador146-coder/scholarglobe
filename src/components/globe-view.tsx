"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import * as THREE from "three";
import { Skeleton } from "@/components/ui/skeleton";
import { CONTINENT_COLORS } from "@/lib/opportunity-status";
import type { GlobeMethods } from "react-globe.gl";

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => <Skeleton className="h-[420px] w-full rounded-xl bg-muted" />,
});

const emptySubscribe = () => () => {};

export interface GlobePoint {
  lat: number;
  lng: number;
  name: string;
  country: string;
  countryCode: string;
  continent: string;
  color: string;
  size: number;
  status?: string;
}

interface GlobeViewProps {
  points: GlobePoint[];
  title: string;
  subtitle: string;
  legend: { label: string; color: string }[];
  onCountrySelect: (country: string) => void;
}

function flagOf(cc: string): string {
  if (!cc || cc.length !== 2) return "🌍";
  return cc
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(127397 + c.charCodeAt(0)))
    .join("");
}

export function GlobeView({ points, title, subtitle, legend, onCountrySelect }: GlobeViewProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [dims, setDims] = useState({ w: 320, h: 420 });
  const [visible, setVisible] = useState(false);
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  // hydration-safe "mounted" flag (no setState-in-effect)
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const dark = mounted ? resolvedTheme !== "light" : true;

  useEffect(() => {
    const update = () => {
      if (wrapRef.current) {
        setDims({ w: wrapRef.current.clientWidth, h: 420 });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { rootMargin: "260px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Realistic ocean shimmer — specular water mask applied to the globe material
  useEffect(() => {
    if (!ready || !globeRef.current) return;
    try {
      const g = globeRef.current as unknown as { globeMaterial: () => THREE.MeshPhongMaterial };
      const mat = g.globeMaterial();
      mat.specularMap = new THREE.TextureLoader().load("/globe/earth-water.png");
      mat.specular = new THREE.Color(dark ? "#2b3a55" : "#9db8e8");
      mat.shininess = 16;
      mat.needsUpdate = true;
    } catch {
      /* non-fatal */
    }
  }, [ready, dark]);

  useEffect(() => {
    if (!visible || !globeRef.current) return;
    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    const t = setTimeout(() => {
      globeRef.current?.pointOfView({ lat: 14, lng: 8, altitude: 2.05 }, 0);
    }, 60);
    return () => clearTimeout(t);
  }, [visible, points]);

  const rings = useMemo(
    () =>
      points.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        color: p.color,
        country: p.country,
      })),
    [points]
  );

  const tooltip = (d: object) => {
    const p = d as GlobePoint;
    return `<div style="background:rgba(10,12,28,.94);border:1px solid #4f46e5;padding:7px 11px;border-radius:10px;color:#eef2ff;font-size:12px;font-family:inherit;box-shadow:0 6px 18px rgba(0,0,0,.4)"><b>${p.name}</b><br/><span style="opacity:.75">click to see its opportunities</span></div>`;
  };

  return (
    <div
      ref={containerRef}
      className="lift flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
    >
      <div className="border-b border-border px-4 pb-2.5 pt-3">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>

      <div ref={wrapRef} className="relative flex-1" aria-label={title} role="img">
        {visible ? (
          <Globe
            ref={globeRef}
            width={dims.w}
            height={dims.h}
            // Realism pack: real NASA-style day/night texture, terrain relief, starfield sky
            globeImageUrl={dark ? "/globe/earth-night.jpg" : "/globe/earth-blue-marble.jpg"}
            bumpImageUrl="/globe/earth-topology.png"
            backgroundImageUrl="/globe/night-sky.png"
            showGraticules={false}
            showAtmosphere
            atmosphereColor={dark ? "#8b7cff" : "#4f8dff"}
            atmosphereAltitude={0.17}
            onGlobeReady={() => setReady(true)}
            // Layer 1 — glowing columns (the data)
            pointsData={points}
            pointLat={(d: object) => (d as GlobePoint).lat}
            pointLng={(d: object) => (d as GlobePoint).lng}
            pointColor={(d: object) => (d as GlobePoint).color}
            pointAltitude={(d: object) => Math.min(0.025 + 0.02 * (d as GlobePoint).size, 0.15)}
            pointRadius={(d: object) => Math.min(0.3 + 0.08 * (d as GlobePoint).size, 0.85)}
            pointLabel={tooltip}
            onPointClick={(d: object) => onCountrySelect((d as GlobePoint).country)}
            // Layer 2 — pulsing sonar rings for visibility
            ringsData={rings}
            ringLat={(d: object) => (d as { lat: number }).lat}
            ringLng={(d: object) => (d as { lng: number }).lng}
            ringColor={(d: object) => (t: number) => `${(d as { color: string }).color}${Math.round((1 - t) * 200).toString(16).padStart(2, "0")}`}
            ringMaxRadius={3.2}
            ringPropagationSpeed={2.4}
            ringRepeatPeriod={1900}
            // Layer 3 — always-visible country badges
            htmlElementsData={points}
            htmlLat={(d: object) => (d as GlobePoint).lat}
            htmlLng={(d: object) => (d as GlobePoint).lng}
            htmlAltitude={0.02}
            htmlElement={(d: object) => {
              const p = d as GlobePoint;
              const el = document.createElement("button");
              el.className = "sg-marker";
              el.style.setProperty("--marker-c", p.color);
              el.setAttribute("aria-label", `${p.name} — ${p.size} opportunities — click to filter`);
              el.title = `${p.name} · ${p.size} — click to filter`;
              el.innerHTML = `<span>${flagOf(p.countryCode)}</span><b>${p.size}</b>`;
              el.onclick = (ev) => {
                ev.stopPropagation();
                onCountrySelect(p.country);
              };
              return el;
            }}
          />
        ) : (
          <Skeleton className="h-[420px] w-full rounded-none bg-muted" />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-4 py-2.5">
        {legend.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color, boxShadow: `0 0 6px ${l.color}` }} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function continentLegend(points: GlobePoint[]): { label: string; color: string }[] {
  const present = new Set(points.map((p) => p.continent));
  return Array.from(present)
    .sort()
    .map((c) => ({ label: c, color: CONTINENT_COLORS[c] ?? "#8b7cff" }));
}
