"use client";

import { Suspense, useRef, type RefObject } from "react";
import * as THREE from "three";
import { ContactShadows, Environment, SoftShadows } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CameraRig, type Viewpoint } from "@/components/three/CameraRig";
import { PostFX } from "@/components/three/visual/PostFX";
import { ROOMS, type RoomId } from "@/lib/departamentos/cataluna-103";
import { DepartamentoModel, toScene } from "./DepartamentoModel";

const BACKGROUND = "#ebe8e2";

/** Middle of a room's floor, in scene coordinates. */
export function roomCenter(id: RoomId): [number, number] {
  const room = ROOMS.find((r) => r.id === id)!;
  const xs = room.piso.map((p) => p[0]);
  const zs = room.piso.map((p) => p[1]);
  return toScene(
    (Math.min(...xs) + Math.max(...xs)) / 2,
    (Math.min(...zs) + Math.max(...zs)) / 2,
  );
}

const anchor = new THREE.Vector3();

/** Keeps each room's DOM label over the middle of its floor. */
function RoomLabels({ labels }: { labels: RefObject<Partial<Record<RoomId, HTMLElement | null>>> }) {
  useFrame(({ camera, size }) => {
    for (const room of ROOMS) {
      const el = labels.current?.[room.id];
      if (!el) continue;
      const [x, z] = roomCenter(room.id);
      anchor.set(x, 0.2, z).project(camera);
      moveLabel(el, anchor, size.width, size.height);
    }
  });
  return null;
}

function moveLabel(el: HTMLElement, ndc: THREE.Vector3, width: number, height: number) {
  if (ndc.z > 1) {
    el.style.visibility = "hidden";
    return;
  }
  const x = ((ndc.x + 1) / 2) * width;
  const y = ((1 - ndc.y) / 2) * height;
  el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
  el.style.visibility = "visible";
}

/** Fires `onReady` once the scene has drawn a couple of frames. */
function ReadySignal({ onReady }: { onReady: () => void }) {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 3) onReady();
  });
  return null;
}

export function DepartamentoScene({
  isMobile,
  cameraTarget,
  cameraTargetKey,
  autoRotate,
  hoveredRoom,
  selectedRoom,
  onSelectRoom,
  onHoverRoom,
  labels,
  onReady,
}: {
  isMobile: boolean;
  cameraTarget: Viewpoint;
  cameraTargetKey: string;
  autoRotate: boolean;
  hoveredRoom: RoomId | null;
  selectedRoom: RoomId | null;
  onSelectRoom: (id: RoomId) => void;
  onHoverRoom: (id: RoomId | null) => void;
  labels: RefObject<Partial<Record<RoomId, HTMLElement | null>>>;
  onReady: () => void;
}) {
  return (
    <>
      <color attach="background" args={[BACKGROUND]} />
      <ambientLight intensity={0.25} />
      <hemisphereLight args={["#f5f1ea", "#b9a993", 0.6]} />
      <directionalLight
        position={[6, 11, 8]}
        intensity={isMobile ? 2.0 : 2.6}
        color="#fff3e0"
        castShadow
        shadow-mapSize={isMobile ? [1024, 1024] : [2048, 2048]}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      {!isMobile ? <SoftShadows size={14} samples={10} focus={0.6} /> : null}
      <Suspense fallback={null}>
        <Environment preset="city" environmentIntensity={0.45} />
        <ReadySignal onReady={onReady} />
      </Suspense>

      <DepartamentoModel
        hoveredRoom={hoveredRoom}
        selectedRoom={selectedRoom}
        onSelectRoom={onSelectRoom}
        onHoverRoom={onHoverRoom}
      />

      {/* Ground under the slab, so the unit sits on something. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.13, 0]} receiveShadow>
        <circleGeometry args={[30, 48]} />
        <meshStandardMaterial color={BACKGROUND} roughness={1} />
      </mesh>
      <ContactShadows position={[0, -0.12, 0]} opacity={0.3} scale={16} blur={2.6} far={3} />

      <RoomLabels labels={labels} />

      {/* Desktop only: mobile keeps the plain renderer. */}
      {!isMobile ? <PostFX aoRadius={0.5} /> : null}

      <CameraRig
        target={cameraTarget}
        targetKey={cameraTargetKey}
        autoRotateEnabled={autoRotate}
        autoRotateSpeed={0.3}
        minDistance={4}
        maxDistance={22}
      />
    </>
  );
}
