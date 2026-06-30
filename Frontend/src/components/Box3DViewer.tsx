/**
 * Box3DViewer — generic Three.js viewer for hinged-panel folding.
 *
 * Knows nothing about Reverse Tuck-In specifically. Takes a HingedPanel
 * tree + FoldStage schedule + a 0..1 progress value and renders.
 *
 * Each panel is a thin extruded box parented to its hinge group; the hinge
 * group sits on the parent panel's hinge edge and rotates around the local
 * hinge axis. This is how real cardboard folds.
 */

import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'

// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

// @ts-ignore
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer'

import { setCameraPreset, clearSceneKeeping, createDimensionAnnotations, type CameraPreset } from '../lib/three-helpers'
import type { HingedPanel, FoldStage, Dims } from '../lib/keyline3D'
import { angleAt } from '../lib/keyline3D'

interface Box3DViewerProps {
  tree: HingedPanel[]
  schedule: FoldStage[]
  dims: Dims
  /** 0 = flat, 1 = closed */
  progress: number
  /** Material thickness in mm (visual only) */
  thickness?: number
  /** Show L/W/H dimension labels. Default true. */
  showDims?: boolean
  className?: string
  onPresetReady?: (handler: (preset: CameraPreset) => void) => void
}

// Cardboard-like palette
const PANEL_COLOR = 0xc4956a
const PANEL_EDGE = 0x6e4a26

export function Box3DViewer({
  tree,
  schedule,
  dims,
  progress,
  thickness = 0.6,
  showDims = true,
  className = '',
  onPresetReady,
}: Box3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const labelRendererRef = useRef<CSS2DRenderer | null>(null)
  const controlsRef = useRef<any>(null)
  const sceneCenterRef = useRef<THREE.Vector3>(new THREE.Vector3())
  const fitDimRef = useRef<number>(100)
  const floorGroupRef = useRef<THREE.Group | null>(null)
  const dimGroupRef = useRef<THREE.Group | null>(null)

  const panelGroupsRef = useRef<Map<string, { hingeGroup: THREE.Group; panelMesh: THREE.Mesh }>>(new Map())
  const scheduleRef = useRef<FoldStage[]>(schedule)
  scheduleRef.current = schedule

  // ── Scene init (once) ─────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    const container = containerRef.current

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xffffff)
    sceneRef.current = scene

    const w = container.clientWidth || 1
    const h = container.clientHeight || 1
    const camera = new THREE.PerspectiveCamera(45, w / h, 1, 20000)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.setSize(w, h)
    container.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const labelRenderer = new CSS2DRenderer()
    labelRenderer.setSize(w, h)
    labelRenderer.domElement.style.position = 'absolute'
    labelRenderer.domElement.style.top = '0'
    labelRenderer.domElement.style.left = '0'
    labelRenderer.domElement.style.pointerEvents = 'none'
    container.appendChild(labelRenderer.domElement)
    labelRendererRef.current = labelRenderer

    scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 0.85))
    const key = new THREE.DirectionalLight(0xffffff, 0.7)
    key.position.set(-200, 400, 250)
    key.castShadow = true
    key.shadow.camera.top = 500
    key.shadow.camera.bottom = -500
    key.shadow.camera.left = -500
    key.shadow.camera.right = 500
    key.shadow.camera.near = 1
    key.shadow.camera.far = 2000
    key.shadow.mapSize.width = 2048
    key.shadow.mapSize.height = 2048
    key.shadow.bias = -0.0005
    scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.25)
    fill.position.set(200, 200, -200)
    scene.add(fill)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.autoRotate = true
    controls.autoRotateSpeed = 0.8
    controlsRef.current = controls
    controls.addEventListener('start', () => { controls.autoRotate = false })

    let frame = 0
    const animate = () => {
      frame = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
      labelRenderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      const cw = container.clientWidth || 1
      const ch = container.clientHeight || 1
      camera.aspect = cw / ch
      camera.updateProjectionMatrix()
      renderer.setSize(cw, ch)
      labelRenderer.setSize(cw, ch)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('resize', onResize)
      controls.dispose()
      renderer.dispose()
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement)
      }
      if (labelRenderer.domElement.parentNode) {
        labelRenderer.domElement.parentNode.removeChild(labelRenderer.domElement)
      }
    }
  }, [])

  // ── Build panel hierarchy whenever tree or dims change ────
  useEffect(() => {
    const scene = sceneRef.current
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!scene || !camera || !controls) return

    clearSceneKeeping(scene, 3, labelRendererRef.current?.domElement)
    panelGroupsRef.current.clear()
    floorGroupRef.current = null
    dimGroupRef.current = null

    if (tree.length === 0) return

    const minX = Math.min(...tree.map(p => p.rect.x))
    const minY = Math.min(...tree.map(p => p.rect.y))
    const maxX = Math.max(...tree.map(p => p.rect.x + p.rect.w))
    const maxY = Math.max(...tree.map(p => p.rect.y + p.rect.h))
    const cx = (minX + maxX) / 2
    const cy = (minY + maxY) / 2

    const rootGroup = new THREE.Group()
    rootGroup.name = 'box-root'
    scene.add(rootGroup)

    const groupsById = new Map<string, THREE.Group>()
    groupsById.set('__root__', rootGroup)

    const sorted = [...tree].sort((a, b) => a.depth - b.depth)
    for (const p of sorted) {
      const hingeGroup = new THREE.Group()
      hingeGroup.name = `hinge_${p.id}`

      const parentGroup = p.parentId ? groupsById.get(p.parentId)! : rootGroup

      if (p.parentId === null || !p.hinge) {
        const rootFlatX = p.rect.x + p.rect.w / 2
        const rootFlatZ = p.rect.y + p.rect.h / 2
        ;(rootGroup as any).userData.rootFlatX = rootFlatX
        ;(rootGroup as any).userData.rootFlatZ = rootFlatZ

        hingeGroup.position.set(0, 0, 0)
        rootGroup.add(hingeGroup)

        const mesh = makePanelMesh(p, thickness)
        hingeGroup.add(mesh)
        panelGroupsRef.current.set(p.id, { hingeGroup, panelMesh: mesh })
        groupsById.set(p.id, hingeGroup)
        continue
      }

      const h = p.hinge!
      const hx = (h.line.x1 + h.line.x2) / 2 - ((rootGroup as any).userData.rootFlatX ?? cx)
      const hz = (h.line.y1 + h.line.y2) / 2 - ((rootGroup as any).userData.rootFlatZ ?? cy)
      const hingeIsVertical = Math.abs(h.line.x1 - h.line.x2) < 0.5
      hingeGroup.position.set(hx, 0, hz)
      scene.add(hingeGroup)
      parentGroup.attach(hingeGroup)

      const meshCenterX = p.rect.x + p.rect.w / 2 - ((rootGroup as any).userData.rootFlatX ?? cx)
      const meshCenterZ = p.rect.y + p.rect.h / 2 - ((rootGroup as any).userData.rootFlatZ ?? cy)
      const offsetX = meshCenterX - hx
      const offsetZ = meshCenterZ - hz

      const mesh = makePanelMesh(p, thickness)
      mesh.position.set(meshCenterX, 0, meshCenterZ)
      scene.add(mesh)
      hingeGroup.attach(mesh)

      panelGroupsRef.current.set(p.id, { hingeGroup, panelMesh: mesh })
      groupsById.set(p.id, hingeGroup)

      ;(hingeGroup as any).userData.hingeAxis = hingeIsVertical ? 'z' : 'x'
      ;(hingeGroup as any).userData.offsetX = offsetX
      ;(hingeGroup as any).userData.offsetZ = offsetZ
    }

    const boxL = dims.L
    const boxW = dims.W
    const boxH = dims.H
    const boxMaxDim = Math.max(boxL, boxW, boxH)
    const boxCenter = new THREE.Vector3(0, boxH / 2, 0)

    const closedBbox = new THREE.Box3(
      new THREE.Vector3(-boxL / 2, 0,    -boxW / 2),
      new THREE.Vector3( boxL / 2, boxH,  boxW / 2),
    )
    const dimGroup = createDimensionAnnotations({
      bbox: closedBbox,
      dimensions: { L: boxL, W: boxW, H: boxH },
      offsetFactor: 0.12,
    })
    scene.add(dimGroup)
    dimGroupRef.current = dimGroup

    const flatSheetSpan = Math.max(maxX - minX, maxY - minY)
    const floorGroup = new THREE.Group()
    floorGroup.name = 'floor'
    const gridSize = Math.max(flatSheetSpan * 1.8, boxMaxDim * 4)
    const floorY = -2
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(gridSize, gridSize),
      new THREE.MeshBasicMaterial({
        color: 0xf0f0f0,
        side: THREE.FrontSide,
        transparent: true,
        opacity: 0.5,
      })
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = floorY
    floor.receiveShadow = true
    floorGroup.add(floor)
    const grid = new THREE.GridHelper(gridSize, 24, 0xcccccc, 0xe0e0e0)
    grid.position.y = floorY + 0.1
    floorGroup.add(grid)
    scene.add(floorGroup)
    floorGroupRef.current = floorGroup

    controls.maxPolarAngle = Math.PI * 0.49

    const rootFx = (rootGroup as any).userData.rootFlatX ?? cx
    const rootFz = (rootGroup as any).userData.rootFlatZ ?? cy
    const flatCenterX = cx - rootFx
    const flatCenterZ = cy - rootFz
    const orbitCenter = new THREE.Vector3(
      (boxCenter.x + flatCenterX) / 2,
      boxCenter.y / 2,
      (boxCenter.z + flatCenterZ) / 2,
    )
    const framingDim = Math.max(boxMaxDim, flatSheetSpan * 0.7)
    fitDimRef.current = framingDim
    sceneCenterRef.current.copy(orbitCenter)
    camera.position.set(
      orbitCenter.x + framingDim * 1.0,
      orbitCenter.y + framingDim * 0.75,
      orbitCenter.z + framingDim * 1.0,
    )
    controls.target.copy(orbitCenter)
    controls.update()
  }, [tree, dims, thickness])

  // ── Apply rotations whenever progress changes ──────────────
  useEffect(() => {
    for (const stage of scheduleRef.current) {
      const entry = panelGroupsRef.current.get(stage.panelId)
      if (!entry) continue
      const angleDeg = angleAt(stage, progress)
      const angleRad = (angleDeg * Math.PI) / 180
      const ud = (entry.hingeGroup as any).userData
      const axis = ud.hingeAxis as 'x' | 'z' | undefined
      const offsetX = (ud.offsetX as number) || 0
      const offsetZ = (ud.offsetZ as number) || 0
      if (axis === 'z') {
        const sign = offsetX >= 0 ? 1 : -1
        entry.hingeGroup.rotation.set(0, 0, sign * angleRad)
      } else if (axis === 'x') {
        const sign = offsetZ >= 0 ? -1 : 1
        entry.hingeGroup.rotation.set(sign * angleRad, 0, 0)
      }
    }

    const smooth = (t: number) => t * t * (3 - 2 * t)
    const dimGroup = dimGroupRef.current
    if (dimGroup) {
      const op = showDims ? smooth(Math.max(0, Math.min(1, (progress - 0.5) / 0.4))) : 0
      dimGroup.traverse((node: any) => {
        if (node.isLine && node.material) {
          node.material.transparent = true
          node.material.opacity = op
        }
        if (node.isCSS2DObject && node.element) {
          node.element.style.opacity = String(op)
        }
      })
    }
  }, [progress, showDims, tree, dims])

  // ── Camera preset handler exposed to parent ────────────────
  const handlePreset = useCallback((preset: CameraPreset) => {
    const camera = cameraRef.current
    const controls = controlsRef.current
    if (!camera || !controls) return
    controls.autoRotate = false
    setCameraPreset({
      camera,
      controls,
      center: sceneCenterRef.current,
      fitDim: fitDimRef.current,
      preset,
      defaultMultipliers: [1.0, 0.75, 1.0],
    })
  }, [])
  useEffect(() => { onPresetReady?.(handlePreset) }, [handlePreset, onPresetReady])

  return <div ref={containerRef} className={className} style={{ width: '100%', height: '100%', position: 'relative' }} />
}

// ─── Mesh factory ──────────────────────────────────────────
function makePanelMesh(panel: HingedPanel, thickness: number): THREE.Mesh {
  const cx = panel.rect.x + panel.rect.w / 2
  const cy = panel.rect.y + panel.rect.h / 2
  const localPts = panel.outline
    .map(p => new THREE.Vector2(p.x - cx, -(p.y - cy)))
    .reverse()
  const shape = new THREE.Shape(localPts)
  const geom = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false })
  geom.rotateX(-Math.PI / 2)
  geom.translate(0, thickness / 2, 0)

  const mat = new THREE.MeshStandardMaterial({
    color: PANEL_COLOR,
    roughness: 0.92,
    metalness: 0.0,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(geom, mat)
  mesh.castShadow = true
  mesh.receiveShadow = true
  const edges = new THREE.EdgesGeometry(geom)
  const lineMat = new THREE.LineBasicMaterial({ color: PANEL_EDGE, transparent: true, opacity: 0.5 })
  mesh.add(new THREE.LineSegments(edges, lineMat))
  return mesh
}
