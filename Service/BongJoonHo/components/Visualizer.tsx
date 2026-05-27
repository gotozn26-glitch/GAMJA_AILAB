import { useEffect, useRef, type MouseEvent, type WheelEvent } from 'react';
import * as THREE from 'three';
import { CHARACTER_HAIR_COLOR, CHARACTER_SKIN_COLOR, CHARACTER_SUIT_COLOR } from '../constants';
import type { ViewState } from '../types';

interface VisualizerProps {
  viewState: ViewState;
  isAnalyzing: boolean;
  onInteractionStart: () => void;
  onInteractionEnd: (state: ViewState) => void;
  onUpdateState: (newState: ViewState) => void;
}

export default function Visualizer({
  viewState,
  isAnalyzing,
  onInteractionStart,
  onInteractionEnd,
  onUpdateState,
}: VisualizerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const charGroupRef = useRef<THREE.Group | null>(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const zoomTimeoutRef = useRef<number | null>(null);
  const analyzingRef = useRef(isAnalyzing);

  useEffect(() => {
    analyzingRef.current = isAnalyzing;
  }, [isAnalyzing]);

  const createTextTexture = (text: string, color: string) => {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return null;

    canvas.width = 256;
    canvas.height = 128;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.font = 'bold 60px Inter, Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = color;
    context.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2);

    return new THREE.CanvasTexture(canvas);
  };

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000,
    );
    camera.position.z = 10;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(5, 10, 5);
    scene.add(mainLight);

    const charGroup = new THREE.Group();

    const headGeo = new THREE.SphereGeometry(1.2, 32, 32);
    const headMat = new THREE.MeshStandardMaterial({ color: CHARACTER_SKIN_COLOR });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 2.5;
    charGroup.add(head);

    const hairGroup = new THREE.Group();
    const hairGeo = new THREE.SphereGeometry(0.5, 16, 16);
    const hairMat = new THREE.MeshStandardMaterial({ color: CHARACTER_HAIR_COLOR });
    for (let i = 0; i < 15; i += 1) {
      const hairBit = new THREE.Mesh(hairGeo, hairMat);
      const phi = Math.random() * Math.PI;
      const theta = Math.random() * Math.PI * 2;
      hairBit.position.set(
        Math.sin(phi) * Math.cos(theta) * 0.9,
        Math.sin(phi) * Math.sin(theta) * 0.8 + 0.5,
        Math.cos(phi) * 0.9,
      );
      hairBit.scale.set(Math.random() + 0.5, Math.random() + 0.5, Math.random() + 0.5);
      hairGroup.add(hairBit);
    }
    hairGroup.position.y = 2.6;
    charGroup.add(hairGroup);

    const glassGeo = new THREE.TorusGeometry(0.25, 0.04, 16, 32);
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const leftGlass = new THREE.Mesh(glassGeo, glassMat);
    leftGlass.position.set(-0.35, 2.5, 1.1);
    charGroup.add(leftGlass);

    const rightGlass = new THREE.Mesh(glassGeo, glassMat);
    rightGlass.position.set(0.35, 2.5, 1.1);
    charGroup.add(rightGlass);

    const bridgeGeo = new THREE.BoxGeometry(0.2, 0.05, 0.05);
    const bridge = new THREE.Mesh(bridgeGeo, glassMat);
    bridge.position.set(0, 2.5, 1.1);
    charGroup.add(bridge);

    const bodyGeo = new THREE.CylinderGeometry(1.2, 1.5, 3.5, 32);
    const bodyMat = new THREE.MeshStandardMaterial({ color: CHARACTER_SUIT_COLOR });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0;
    charGroup.add(body);

    const labelGeo = new THREE.PlaneGeometry(1.5, 0.75);
    const frontTexture = createTextTexture('front', '#ffffff');
    if (frontTexture) {
      const frontMat = new THREE.MeshBasicMaterial({
        map: frontTexture,
        transparent: true,
        side: THREE.DoubleSide,
      });
      const frontLabel = new THREE.Mesh(labelGeo, frontMat);
      frontLabel.position.set(0, 0, 1.45);
      charGroup.add(frontLabel);
    }

    const backTexture = createTextTexture('back', '#555555');
    if (backTexture) {
      const backMat = new THREE.MeshBasicMaterial({
        map: backTexture,
        transparent: true,
        side: THREE.DoubleSide,
      });
      const backLabel = new THREE.Mesh(labelGeo, backMat);
      backLabel.position.set(0, 0, -1.45);
      backLabel.rotation.y = Math.PI;
      charGroup.add(backLabel);
    }

    scene.add(charGroup);
    charGroupRef.current = charGroup;

    const grid = new THREE.GridHelper(30, 30, 0xcccccc, 0xeeeeee);
    grid.position.y = -1.75;
    scene.add(grid);

    let animationFrame = 0;
    const animate = () => {
      animationFrame = window.requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      if (analyzingRef.current && charGroupRef.current) {
        charGroupRef.current.position.y = Math.sin(Date.now() * 0.003) * 0.05;
      } else if (charGroupRef.current) {
        charGroupRef.current.position.y = 0;
      }
    };
    animate();

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      cameraRef.current.aspect =
        containerRef.current.clientWidth / containerRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(
        containerRef.current.clientWidth,
        containerRef.current.clientHeight,
      );
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.cancelAnimationFrame(animationFrame);
      if (zoomTimeoutRef.current) {
        window.clearTimeout(zoomTimeoutRef.current);
      }
      renderer.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    if (charGroupRef.current) {
      charGroupRef.current.rotation.x = THREE.MathUtils.degToRad(viewState.rotateX);
      charGroupRef.current.rotation.y = THREE.MathUtils.degToRad(viewState.rotateY);
    }
    if (cameraRef.current) {
      cameraRef.current.position.z = 10 / viewState.zoom;
    }
  }, [viewState]);

  const handleMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    isDragging.current = true;
    lastPos.current = { x: event.clientX, y: event.clientY };
    onInteractionStart();
  };

  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const deltaX = event.clientX - lastPos.current.x;
    const deltaY = event.clientY - lastPos.current.y;

    onUpdateState({
      ...viewState,
      rotateY: viewState.rotateY + deltaX * 0.5,
      rotateX: viewState.rotateX + deltaY * 0.5,
    });

    lastPos.current = { x: event.clientX, y: event.clientY };
  };

  const handleMouseUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    onInteractionEnd(viewState);
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const zoomDelta = event.deltaY * -0.001;
    const newZoom = Math.max(0.3, Math.min(3, viewState.zoom + zoomDelta));

    onUpdateState({ ...viewState, zoom: newZoom });

    if (zoomTimeoutRef.current) {
      window.clearTimeout(zoomTimeoutRef.current);
    }
    zoomTimeoutRef.current = window.setTimeout(() => {
      onInteractionEnd({ ...viewState, zoom: newZoom });
    }, 500);
  };

  return (
    <div
      ref={containerRef}
      className="canvas-bg relative h-full w-full cursor-move select-none overflow-hidden"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      <div className="pointer-events-none absolute left-6 top-6 space-y-2">
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/90 px-3 py-1.5 shadow-sm">
          <div className={`h-2 w-2 rounded-full ${isAnalyzing ? 'bg-secondary animate-pulse' : 'bg-primary'}`} />
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
            {isAnalyzing ? 'Analyzing Visual Data...' : 'Subject Engine Ready'}
          </span>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-6 left-6">
        <div className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white/80 px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 shadow-sm">
          <span className="material-symbols-outlined text-sm">face</span>
          인물의 시각적 구도를 분석합니다
        </div>
      </div>
    </div>
  );
}
