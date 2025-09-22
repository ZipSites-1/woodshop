import React, { useEffect, useMemo, useRef, useState } from "react";

import { ArtifactPanel } from "./ArtifactPanel";

const PI = Math.PI;
const MIN_SEGMENTS = 8;
const MAX_SEGMENTS = 512;

type BoundingBox = {
  min: [number, number, number];
  max: [number, number, number];
};

type MeshStats = {
  triangleCount: number;
  vertexCount: number;
  surfaceArea: number;
  boundingBox: BoundingBox;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function computeLongitudinal(linearDeflection: number) {
  const safeLinear = Math.max(linearDeflection, 1e-4);
  let segments = Math.ceil((2 * PI) / Math.sqrt(safeLinear));
  if (segments % 2 !== 0) {
    segments += 1;
  }
  return clamp(segments, Math.max(MIN_SEGMENTS, 6), MAX_SEGMENTS);
}

function computeLatitudinal(angularDeflectionDeg: number) {
  const safeAngular = Math.max(angularDeflectionDeg, 0.1);
  const angularRad = (safeAngular * PI) / 180;
  let segments = Math.ceil(PI / angularRad);
  segments = Math.max(segments, 2);
  return clamp(segments, 2, Math.floor(MAX_SEGMENTS / 2));
}

function estimateTriangles(linearDeflection: number, angularDeflectionDeg: number) {
  const lon = computeLongitudinal(linearDeflection);
  const lat = computeLatitudinal(angularDeflectionDeg);
  const triangles = lon * 2 * (lat - 1);
  return { triangles, lon, lat };
}

type WorkerMessage =
  | {
      type: "tessellate-result";
      requestId: number;
      triangleCount: number;
      vertexCount: number;
      surfaceArea: number;
      boundingBox: BoundingBox;
    }
  | { type: "error"; requestId: number; message: string }
  | { type: "status"; phase: "initializing" | "ready" | "working" }
  | { type: "progress"; loaded: number; total: number };

export const ViewerCanvas: React.FC = () => {
  const [linearDeflection, setLinearDeflection] = useState(0.5);
  const [angularDeflection, setAngularDeflection] = useState(15);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [statusPhase, setStatusPhase] = useState<"initializing" | "ready" | "working">(
    "initializing"
  );
  const [loadProgress, setLoadProgress] = useState<{ loaded: number; total: number }>(
    {
      loaded: 0,
      total: 1,
    }
  );
  const [meshStats, setMeshStats] = useState<MeshStats | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const currentRequestId = useRef(0);
  const initialLinear = useRef(linearDeflection);
  const initialAngular = useRef(angularDeflection);

  const stats = useMemo(
    () => estimateTriangles(linearDeflection, angularDeflection),
    [linearDeflection, angularDeflection]
  );

  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/occt.worker.ts", import.meta.url),
      { type: "module" }
    );

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;
      if (!message) {
        return;
      }
      if (message.type === "progress") {
        const total = message.total > 0 ? message.total : 1;
        const loaded = Math.min(Math.max(message.loaded, 0), total);
        setLoadProgress({ loaded, total });
        return;
      }
      if (message.type === "status") {
        setStatusPhase(message.phase);
        if (message.phase === "ready") {
          setPending(false);
        }
        return;
      }
      if (message.type === "tessellate-result") {
        if (message.requestId !== currentRequestId.current) {
          return; // stale result
        }
        setMeshStats({
          triangleCount: message.triangleCount,
          vertexCount: message.vertexCount,
          surfaceArea: message.surfaceArea,
          boundingBox: message.boundingBox,
        });
        setWorkerError(null);
        setPending(false);
        setStatusPhase("ready");
      } else if (message.type === "error") {
        if (message.requestId !== currentRequestId.current) {
          return;
        }
        setWorkerError(message.message);
        setMeshStats(null);
        setPending(false);
        setStatusPhase("ready");
      }
    };

    workerRef.current = worker;

    const initialRequestId = currentRequestId.current + 1;
    currentRequestId.current = initialRequestId;
    setPending(true);
    worker.postMessage({
      type: "tessellate",
      requestId: initialRequestId,
      linearDeflection: initialLinear.current,
      angularDeflection: initialAngular.current,
    });

    return () => {
      worker.terminate();
      workerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const worker = workerRef.current;
    if (!worker) {
      return;
    }
    const requestId = currentRequestId.current + 1;
    currentRequestId.current = requestId;
    setWorkerError(null);
    setPending(true);
    setStatusPhase("working");
    worker.postMessage({
      type: "tessellate",
      requestId,
      linearDeflection,
      angularDeflection,
    });
  }, [linearDeflection, angularDeflection]);

  const boundingBoxSize = useMemo(() => {
    if (!meshStats) {
      return null;
    }
    const [minX, minY, minZ] = meshStats.boundingBox.min;
    const [maxX, maxY, maxZ] = meshStats.boundingBox.max;
    return [maxX - minX, maxY - minY, maxZ - minZ] as const;
  }, [meshStats]);

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "24px",
        alignItems: "flex-start",
      }}
    >
      <div style={{ flex: "1 1 320px", minWidth: "280px" }}>
        <h2 style={{ marginTop: 0 }}>Synthetic Viewer</h2>
        <p style={{ maxWidth: "320px" }}>
          Adjust the tessellation settings below to see how the generated mesh
          density responds. A full WebGL preview is out of scope, but the
          triangle count stays in sync with the occt-core tessellator.
        </p>
        <form style={{ display: "grid", gap: "16px", maxWidth: "320px" }}>
          <label style={{ display: "grid", gap: "8px" }}>
            <span>Linear deflection (unitless)</span>
            <input
              type="range"
              min={0.05}
              max={4}
              step={0.05}
              value={linearDeflection}
              onChange={(event) => setLinearDeflection(Number(event.target.value))}
            />
            <output>{linearDeflection.toFixed(2)}</output>
          </label>
          <label style={{ display: "grid", gap: "8px" }}>
            <span>Angular deflection (degrees)</span>
            <input
              type="range"
              min={1}
              max={45}
              step={1}
              value={angularDeflection}
              onChange={(event) => setAngularDeflection(Number(event.target.value))}
            />
            <output>{angularDeflection.toFixed(0)}&deg;</output>
          </label>
        </form>
      </div>
      <section style={{ flex: "1 1 280px", minWidth: "260px" }}>
        <h3 style={{ marginTop: 0 }}>Mesh summary</h3>
        <p
          aria-live="polite"
          style={{
            margin: "0 0 16px",
            fontSize: "0.95rem",
            color: statusPhase === "ready" ? "#2e7d32" : "#1565c0",
          }}
        >
          {statusPhase === "initializing"
            ? "Loading geometry kernel…"
            : statusPhase === "working"
            ? "Generating mesh in worker…"
            : "Geometry kernel ready"}
        </p>
        {statusPhase === "initializing" ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "16px",
            }}
          >
            <progress
              value={loadProgress.loaded}
              max={loadProgress.total}
              style={{ width: "180px", height: "12px" }}
            />
            <span style={{ fontVariantNumeric: "tabular-nums" }}>
              {Math.round((loadProgress.loaded / loadProgress.total) * 100)}%
            </span>
          </div>
        ) : null}
        <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "8px 16px" }}>
          <dt>Analytic triangles</dt>
          <dd>{stats.triangles.toLocaleString()}</dd>
          <dt>Kernel triangles</dt>
          <dd>
            {meshStats ? meshStats.triangleCount.toLocaleString() : "—"}
            {pending ? " (loading…)" : null}
          </dd>
          <dt>Kernel vertices</dt>
          <dd>{meshStats ? meshStats.vertexCount.toLocaleString() : "—"}</dd>
          <dt>Surface area</dt>
          <dd>
            {meshStats ? `${meshStats.surfaceArea.toFixed(3)} units²` : "—"}
          </dd>
          <dt>Bounding box</dt>
          <dd>
            {boundingBoxSize
              ? `${boundingBoxSize[0].toFixed(3)} × ${boundingBoxSize[1].toFixed(3)} × ${boundingBoxSize[2].toFixed(3)}`
              : "—"}
          </dd>
          <dt>Longitude segments</dt>
          <dd>{stats.lon}</dd>
          <dt>Latitude segments</dt>
          <dd>{stats.lat}</dd>
        </dl>
        {workerError ? (
          <p role="alert" style={{ color: "#b71c1c" }}>
            WASM worker error: {workerError}
          </p>
        ) : null}
      </section>
      <ArtifactPanel />
    </div>
  );
};

export default ViewerCanvas;
