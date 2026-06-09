import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import {
  STUDY_BORDER,
  STUDY_BORDER_STRONG,
  STUDY_BG,
  STUDY_CARD,
  STUDY_MUTED,
  STUDY_TEXT,
} from '../../lib/researchTheme.js'

const MODEL_URL = `${import.meta.env.BASE_URL}models/bodybuilder-muscles.glb`

// Clean clay-white base; the brand emerald is the selection/hover hue so a
// tapped group reads as "lit up" against the neutral body.
const BASE_COLOR = new THREE.Color('#d9dcd6')
const HOVER_COLOR = new THREE.Color('#7fd6a6')
const SELECT_COLOR = new THREE.Color('#34BE73')
const HOVER_EMISSIVE = new THREE.Color('#1d6b46')
const SELECT_EMISSIVE = new THREE.Color('#0b7a43')

function toSet(selected) {
  if (!selected) return new Set()
  if (selected instanceof Set) return selected
  if (Array.isArray(selected)) return new Set(selected)
  return new Set([selected])
}

function groupOf(object) {
  let node = object
  while (node) {
    const g = node.userData?.muscle_group
    if (g) return g
    node = node.parent
  }
  return null
}

function Model({ selected, onHoverChange, onSelect, onReady }) {
  const { scene } = useGLTF(MODEL_URL)
  const [hovered, setHovered] = useState(null)

  // One isolated white material instance per mesh so we can recolor a single
  // group without mutating shared materials. Build the group→meshes index once.
  const { groups } = useMemo(() => {
    const groups = new Map()
    scene.traverse(obj => {
      if (!obj.isMesh) return
      const group = groupOf(obj)
      obj.material = new THREE.MeshStandardMaterial({
        color: BASE_COLOR.clone(),
        roughness: 0.62,
        metalness: 0.0,
        flatShading: false,
      })
      obj.castShadow = false
      obj.receiveShadow = false
      if (!group) return
      if (!groups.has(group)) groups.set(group, [])
      groups.get(group).push(obj)
    })

    // Recenter + normalize height at origin so the fixed camera frames the
    // whole figure regardless of the GLB's own pivot/scale.
    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    const s = size.y > 0 ? 2.2 / size.y : 1
    scene.scale.setScalar(s)
    scene.position.set(-center.x * s, -center.y * s, -center.z * s)

    return { groups }
  }, [scene])

  useEffect(() => {
    onReady?.()
  }, [onReady])

  const selectedSet = useMemo(() => toSet(selected), [selected])

  // Recolor whenever hover/selection changes.
  useEffect(() => {
    groups.forEach((meshes, group) => {
      const isSelected = selectedSet.has(group)
      const isHovered = group === hovered
      const color = isSelected ? SELECT_COLOR : isHovered ? HOVER_COLOR : BASE_COLOR
      const emissive = isSelected ? SELECT_EMISSIVE : isHovered ? HOVER_EMISSIVE : null
      meshes.forEach(mesh => {
        mesh.material.color.copy(color)
        if (emissive) {
          mesh.material.emissive.copy(emissive)
          mesh.material.emissiveIntensity = isSelected ? 0.55 : 0.35
        } else {
          mesh.material.emissive.setRGB(0, 0, 0)
          mesh.material.emissiveIntensity = 0
        }
      })
    })
  }, [groups, hovered, selectedSet])

  function handleMove(e) {
    e.stopPropagation()
    const group = groupOf(e.object)
    if (group !== hovered) {
      setHovered(group)
      onHoverChange?.(group)
    }
  }

  function handleOut(e) {
    e.stopPropagation()
    setHovered(null)
    onHoverChange?.(null)
  }

  function handleClick(e) {
    e.stopPropagation()
    const group = groupOf(e.object)
    if (group) onSelect?.(group)
  }

  return (
    <primitive
      object={scene}
      onPointerMove={handleMove}
      onPointerOut={handleOut}
      onClick={handleClick}
    />
  )
}

function Loader() {
  return (
    <div className="absolute inset-0 grid place-items-center">
      <div className="flex flex-col items-center gap-2">
        <div
          className="h-6 w-6 animate-spin rounded-full border-2 border-transparent"
          style={{ borderTopColor: STUDY_TEXT, borderRightColor: STUDY_BORDER_STRONG }}
        />
        <span className="font-mono text-[11px] uppercase tracking-wide" style={{ color: STUDY_MUTED }}>
          Loading model
        </span>
      </div>
    </div>
  )
}

export default function MuscleModel({ selected, onSelect, height = 360 }) {
  const [hoverLabel, setHoverLabel] = useState(null)
  const [ready, setReady] = useState(false)
  const wrapRef = useRef(null)

  const selectedList = useMemo(() => [...toSet(selected)], [selected])
  const hasSelection = selectedList.length > 0
  const statusLabel = hoverLabel
    || (selectedList.length === 1 ? selectedList[0] : null)
    || (selectedList.length > 1 ? `${selectedList.length} groups open` : null)
    || 'Drag to spin · tap a muscle'

  return (
    <div
      ref={wrapRef}
      className="relative overflow-hidden rounded-2xl"
      style={{ height, background: `radial-gradient(120% 90% at 50% 0%, ${STUDY_CARD} 0%, ${STUDY_BG} 75%)`, border: `1px solid ${STUDY_BORDER}` }}
    >
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 0, 4.3], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
        style={{ touchAction: 'none' }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[3, 5, 4]} intensity={1.6} />
        <directionalLight position={[-4, 2, -3]} intensity={0.5} />
        <Suspense fallback={null}>
          <Model
            selected={selected}
            onHoverChange={setHoverLabel}
            onSelect={onSelect}
            onReady={() => setReady(true)}
          />
        </Suspense>
        <OrbitControls
          makeDefault
          enablePan={false}
          enableZoom
          minDistance={2}
          maxDistance={6}
          minPolarAngle={Math.PI * 0.12}
          maxPolarAngle={Math.PI * 0.88}
          autoRotate={!hasSelection && !hoverLabel}
          autoRotateSpeed={0.6}
          target={[0, 0, 0]}
        />
      </Canvas>

      {!ready && <Loader />}

      {/* Hover / selection readout */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-3 py-2">
        <span
          className="rounded-lg px-2 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide"
          style={{
            background: 'rgba(8, 9, 10, 0.6)',
            color: hoverLabel || hasSelection ? STUDY_TEXT : STUDY_MUTED,
            border: `1px solid ${STUDY_BORDER}`,
            backdropFilter: 'blur(4px)',
          }}
        >
          {statusLabel}
        </span>
      </div>
    </div>
  )
}

useGLTF.preload(MODEL_URL)
