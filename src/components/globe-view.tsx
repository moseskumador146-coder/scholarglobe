"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { CONTINENT_COLORS } from "@/lib/opportunity-status";
import type { GlobeMethods } from "react-globe.gl";

const Globe = dynamic(() => import("react-globe.gl"), {
  ssr: false,
  loading: () => <Skeleton className="h-[380px] w-full rounded-xl bg-slate-800/60" />,
});

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

export function GlobeView({ points, title, subtitle, legend, onCountrySelect }: GlobeViewProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [dims, setDims] = useState({ w: 320, h: 360 });
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      if (wrapRef.current) {
        setDims({ w: wrapRef.current.clientWidth, h: 360 });
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
      { rootMargin: "200px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible || !globeRef.current) return;
    const controls = globeRef.current.controls();
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.55;
    const t = setTimeout(() => {
      globeRef.current?.pointOfView({ lat: 10, lng: 10, altitude: 2.1 }, 0);
    }, 60);
    return () => clearTimeout(t);
  }, [visible, points]);

  return (
    <div ref={containerRef} className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50">
      <div className="border-b border-slate-800 px-4 pb-2.5 pt-3">
        <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>

      <div ref={wrapRef} className="relative flex-1" aria-label={title} role="img">
        {visible ? (
          <Globe
            ref={globeRef}
            width={dims.w}
            height={dims.h}
            globeImageUrl="/globe/earth-dark.jpg"
            backgroundColor="rgba(0,0,0,0)"
            showAtmosphere
            atmosphereColor="#10b981"
            atmosphereAltitude={0.14}
            pointsData={points}
            pointLat={(d: object) => (d as GlobePoint).lat}
            pointLng={(d: object) => (d as GlobePoint).lng}
            pointColor={(d: object) => (d as GlobePoint).color}
            pointAltitude={(d: object) => Math.min(0.02 + 0.018 * (d as GlobePoint).size, 0.14)}
            pointRadius={(d: object) => Math.min(0.24 + 0.07 * (d as GlobePoint).size, 0.72)}
            pointLabel={(d: object) => `<div style="background:rgba(2,6,23,.92);border:1px solid #334155;padding:6px 10px;border-radius:8px;color:#e2e8f0;font-size:12px">${(d as GlobePoint).name} — click to filter</div>`}
            onPointClick={(d: object) => onCountrySelect((d as GlobePoint).country)}
          />
        ) : (
          <Skeleton className="h-[360px] w-full rounded-none bg-slate-800/40" />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-800 px-4 py-2.5">
        {legend.map((l) => (
          <span key={l.label} className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
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
    .map((c) => ({ label: c, color: CONTINENT_COLORS[c] ?? "#fff" }));
}
