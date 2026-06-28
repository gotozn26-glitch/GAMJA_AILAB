
import React, { useState, useRef, useEffect } from 'react';
import { StoryboardLayer, ReferenceSlot, ProjectInfo, StylePreset } from './types';
import { generateDirectorImage, analyzeStoryboard } from './services/geminiService';
import { 
  Info, 
  Sparkles, 
  Layers, 
  FileUp, 
  Brush, 
  PaintBucket, 
  Eraser, 
  Wand2,
  Trash2, 
  ImagePlus, 
  X, 
  Undo, 
  Palette, 
  Check, 
  Search, 
  Bell, 
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  LockOpen,
  RefreshCw,
  Plus
} from 'lucide-react';

const INITIAL_SLOTS: ReferenceSlot[] = [
  { id: 'A', color: '#ef4444', name: 'Slot A (Red)', type: 'Object description' },
  { id: 'B', color: '#3b82f6', name: 'Slot B (Blue)', type: 'Object description' },
  { id: 'C', color: '#eab308', name: 'Slot C (Yellow)', type: 'Object description' },
];

const STYLE_PRESETS: StylePreset[] = [
  { id: 'cinematic', name: 'Cinematic', description: 'Cinematic depth and grandeur', preview: 'https://picsum.photos/200/200?random=20', promptHint: 'Cinematic film style. High dynamic range, shallow depth of field, professional color grading, epic lighting.' },
  { id: 'neo-noir', name: 'Neo-Noir', description: 'Strong contrast, cool tones', preview: 'https://picsum.photos/200/200?random=15', promptHint: 'Neo-Noir Oil Painting style. Rich textures, dramatic lighting, and deep shadows.' },
  { id: 'toy-3d', name: 'Toy 3D', description: 'Cute 3D characters, soft textures', preview: 'https://picsum.photos/200/200?random=21', promptHint: '3D toy style, Pixar-like animation aesthetic. Soft plastic textures, vibrant colors, studio lighting, cute and rounded forms.' },
  { id: 'cyberpunk', name: 'Cyberpunk', description: 'Neon lighting, high-tech', preview: 'https://picsum.photos/200/200?random=17', promptHint: 'Cyberpunk cinematic style. Neon lights, rainy atmosphere, high-tech details, futuristic grit.' },
  { id: 'watercolor', name: 'Watercolor', description: 'Clear and bleeding feel', preview: 'https://picsum.photos/200/200?random=18', promptHint: 'Fluid watercolor painting. Bleeding edges, paper texture, soft pastels, artistic and organic.' },
];

const COLOR_PALETTE = [
  '#a855f7', // Purple
  '#22c55e', // Green
  '#f97316', // Orange
  '#ec4899', // Pink
  '#14b8a6', // Teal
  '#6366f1', // Indigo
];

const INITIAL_LAYERS: StoryboardLayer[] = [
  { id: 'l1', name: 'Color Mask Layer', type: 'mask', visible: true, locked: false, active: true },
  { id: 'l2', name: 'Base Storyboard', type: 'base', visible: true, locked: true },
];

type DrawingTool = 'brush' | 'eraser' | 'bucket';

const App: React.FC = () => {
  const [projectInfo, setProjectInfo] = useState<ProjectInfo>({
    title: '',
    date: new Date().toLocaleDateString('en-US'),
    resolution: '1920 x 1080',
    description: '',
  });
  const [description, setDescription] = useState('');
  const [layers] = useState<StoryboardLayer[]>(INITIAL_LAYERS);
  const [slots, setSlots] = useState<ReferenceSlot[]>(INITIAL_SLOTS);
  const [activeColor, setActiveColor] = useState(INITIAL_SLOTS[0].color);
  const [currentTool, setCurrentTool] = useState<DrawingTool>('brush');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [baseImage, setBaseImage] = useState<string>('');
  
  const [selectedStyleId, setSelectedStyleId] = useState<string>(STYLE_PRESETS[0].id);
  const [customStyleImage, setCustomStyleImage] = useState<string | null>(null);

  const [isDraggingBase, setIsDraggingBase] = useState(false);
  const [isDraggingStyle, setIsDraggingStyle] = useState(false);
  const [dragOverSlotId, setDragOverSlotId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImageRef = useRef<HTMLImageElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Setup canvas defaults
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 20;
  }, []);

  // Helper for flood fill
  const floodFill = (ctx: CanvasRenderingContext2D, startX: number, startY: number, fillColor: string) => {
    const canvasWidth = ctx.canvas.width;
    const canvasHeight = ctx.canvas.height;
    const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
    const pixels = imageData.data;

    const getPixelPos = (x: number, y: number) => (y * canvasWidth + x) * 4;

    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : { r: 0, g: 0, b: 0 };
    };

    const targetColor = hexToRgb(fillColor);
    const startPos = getPixelPos(Math.floor(startX), Math.floor(startY));
    const startR = pixels[startPos];
    const startG = pixels[startPos + 1];
    const startB = pixels[startPos + 2];
    const startA = pixels[startPos + 3];

    // Don't fill if the color is already the same
    if (startR === targetColor.r && startG === targetColor.g && startB === targetColor.b && startA === 255) return;

    const stack: [number, number][] = [[Math.floor(startX), Math.floor(startY)]];

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const pos = getPixelPos(x, y);

      if (pixels[pos] === startR && pixels[pos + 1] === startG && pixels[pos + 2] === startB && pixels[pos + 3] === startA) {
        pixels[pos] = targetColor.r;
        pixels[pos + 1] = targetColor.g;
        pixels[pos + 2] = targetColor.b;
        pixels[pos + 3] = 255;

        if (x > 0) stack.push([x - 1, y]);
        if (x < canvasWidth - 1) stack.push([x + 1, y]);
        if (y > 0) stack.push([x, y - 1]);
        if (y < canvasHeight - 1) stack.push([x, y + 1]);
      }
    }
    ctx.putImageData(imageData, 0, 0);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (currentTool === 'bucket') {
      floodFill(ctx, x, y, activeColor);
      return;
    }

    ctx.beginPath();
    ctx.moveTo(x, y);
    
    if (currentTool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 30;
    } else {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = activeColor;
      ctx.lineWidth = 20;
    }
    
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const endDrawing = () => {
    setIsDrawing(false);
  };

  const handleAutoMask = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    try {
      const results = await analyzeStoryboard(baseImage, description, slots);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!ctx || !canvas) return;

      results.forEach(res => {
        const slot = slots.find(s => s.id === res.slotId);
        if (slot) {
          const [ymin, xmin, ymax, xmax] = res.box;
          const w = xmax - xmin;
          const h = ymax - ymin;
          
          ctx.globalCompositeOperation = 'source-over';
          ctx.fillStyle = slot.color;
          ctx.beginPath();
          ctx.arc(xmin + w/2, ymin + h/2, Math.max(w, h)/2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    } catch (err: any) {
      alert("An error occurred during auto masking.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const maskData = canvas.toDataURL('image/png');
      const activeRefs = slots
        .filter(s => s.image)
        .map(s => ({ color: s.color, type: s.type, image: s.image! }));

      const currentStyle = STYLE_PRESETS.find(s => s.id === selectedStyleId);
      const stylePrompt = selectedStyleId === 'custom' && customStyleImage 
        ? "Follow the style of the custom style reference image provided." 
        : (currentStyle?.promptHint || "");

      const finalDescription = `${description}\n\nStyle Guide: ${stylePrompt}`;

      const results = await generateDirectorImage(baseImage, maskData, finalDescription, activeRefs);
      setGeneratedImages(results);
    } catch (err: any) {
      alert("Failed to generate image. Please check your API key or network status.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSlotUpload = (id: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (re) => {
          const base64 = re.target?.result as string;
          setSlots(prev => prev.map(s => s.id === id ? { ...s, image: base64, confidence: 100 } : s));
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDragOverSlotId(null);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (re) => {
        const base64 = re.target?.result as string;
        setSlots(prev => prev.map(s => s.id === id ? { ...s, image: base64, confidence: 100 } : s));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBaseDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingBase(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (re) => {
        const base64 = re.target?.result as string;
        setBaseImage(base64);
        setGeneratedImages([]); 
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomStyleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingStyle(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (re) => {
        const base64 = re.target?.result as string;
        setCustomStyleImage(base64);
        setSelectedStyleId('custom');
      };
      reader.readAsDataURL(file);
    }
  };

  const clearSlotImage = (id: string) => {
    setSlots(prev => prev.map(s => s.id === id ? { ...s, image: undefined, confidence: undefined } : s));
  };

  const handleCustomStyleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (re) => {
          const base64 = re.target?.result as string;
          setCustomStyleImage(base64);
          setSelectedStyleId('custom');
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleBaseUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (re) => {
          const base64 = re.target?.result as string;
          setBaseImage(base64);
          setGeneratedImages([]); 
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleResetAll = () => {
    if (window.confirm("Are you sure you want to reset the project? All input will be deleted.")) {
      setDescription('');
      setGeneratedImages([]);
      setSlots(INITIAL_SLOTS);
      setActiveColor(INITIAL_SLOTS[0].color);
      setBaseImage('https://picsum.photos/1920/1080?random=' + Math.floor(Math.random() * 1000));
      setCustomStyleImage(null);
      setSelectedStyleId(STYLE_PRESETS[0].id);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  };

  const handleAddSlot = () => {
    const nextIndex = slots.length;
    const color = COLOR_PALETTE[nextIndex % COLOR_PALETTE.length];
    const newSlot: ReferenceSlot = {
      id: `S${nextIndex + 1}`,
      color: color,
      name: `Slot ${String.fromCharCode(65 + nextIndex)}`,
      type: 'Object description'
    };
    setSlots([...slots, newSlot]);
    setActiveColor(color);
  };

  const removeSlot = (id: string) => {
    if (slots.length <= 1) return;
    setSlots(slots.filter(s => s.id !== id));
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden relative font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 glass-panel border-b-0 m-4 rounded-2xl z-50">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 flex items-center justify-center glass-button rounded-xl">
            <Sparkles className="w-6 h-6 text-white" strokeWidth={1.5} />
          </div>
          <div className="flex flex-col">
            <h2 className="text-white text-lg font-bold leading-tight tracking-tight">Scene Creator</h2>
            <span className="text-white/40 text-[10px] uppercase tracking-[0.2em] font-medium">Professional Remastering Studio</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 glass-card px-3 py-1.5 rounded-full">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Engine 3.1 Active</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden px-4 pb-4 gap-4">
        {/* Left Sidebar: Project Info */}
        <aside className="w-80 glass-panel rounded-2xl flex flex-col overflow-y-auto no-scrollbar">
          <div className="p-6 space-y-8">
            {/* Project Details */}
            <section>
              <div className="space-y-4">
                <div className="space-y-2">
                  <input 
                    className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white font-medium"
                    value={projectInfo.title}
                    onChange={(e) => setProjectInfo({...projectInfo, title: e.target.value})}
                    placeholder="Project Title"
                  />
                </div>
                <div className="glass-card rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-white/40 font-medium">Created</span>
                    <span className="text-white/80 font-bold">{projectInfo.date}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-white/40 font-medium">Resolution</span>
                    <span className="text-white/80 font-bold">{projectInfo.resolution}</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Directing Prompt */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg glass-button flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white/60" strokeWidth={1.5} />
                </div>
                <h3 className="text-white/90 text-xs font-bold uppercase tracking-[0.15em]">Directing Prompt</h3>
              </div>
              <textarea 
                className="w-full glass-input rounded-xl px-4 py-3 text-sm text-white font-medium h-32 resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the overall mood, lighting, and camera direction..."
              />
            </section>

            {/* Layers / Objects */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg glass-button flex items-center justify-center">
                    <Layers className="w-4 h-4 text-white/60" strokeWidth={1.5} />
                  </div>
                  <h3 className="text-white/90 text-xs font-bold uppercase tracking-[0.15em]">Layers</h3>
                </div>
                <button className="w-8 h-8 rounded-lg glass-button flex items-center justify-center text-white/40 hover:text-white" onClick={handleBaseUpload} title="Upload Base Storyboard">
                  <FileUp className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
              <div className="space-y-2">
                {layers.map((layer) => (
                  <div 
                    key={layer.id} 
                    onDragOver={layer.type === 'base' ? (e) => { e.preventDefault(); setIsDraggingBase(true); } : undefined}
                    onDragLeave={layer.type === 'base' ? () => setIsDraggingBase(false) : undefined}
                    onDrop={layer.type === 'base' ? handleBaseDrop : undefined}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${layer.active ? 'glass-card border-white/20 bg-white/5' : 'bg-white/5 border-transparent opacity-60'} ${layer.type === 'base' && isDraggingBase ? 'border-white bg-white/10 ring-2 ring-white/10' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      {layer.type === 'base' ? (
                        <button 
                          onClick={handleBaseUpload}
                          className="w-8 h-8 rounded-lg overflow-hidden border border-white/20 shrink-0 bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors group/base"
                          title="Upload Storyboard"
                        >
                          {baseImage ? (
                            <img src={baseImage} className="w-full h-full object-cover" alt="Base" />
                          ) : (
                            <FileUp className="w-3.5 h-3.5 text-white/40 group-hover/base:text-white" strokeWidth={1.5} />
                          )}
                        </button>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                          <Brush className="w-3.5 h-3.5 text-white/40" strokeWidth={1.5} />
                        </div>
                      )}
                      <div className="flex flex-col">
                        <span className="text-[11px] font-bold text-white/80 leading-tight">{layer.name}</span>
                        {layer.type === 'base' && baseImage && <span className="text-[9px] text-emerald-500 font-medium">Image Loaded</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="text-white/30 hover:text-white transition-colors">
                        {layer.visible ? <Eye className="w-3.5 h-3.5" strokeWidth={1.5} /> : <EyeOff className="w-3.5 h-3.5" strokeWidth={1.5} />}
                      </button>
                      <button className="text-white/30 hover:text-white transition-colors">
                        {layer.locked ? <Lock className="w-3.5 h-3.5" strokeWidth={1.5} /> : <LockOpen className="w-3.5 h-3.5" strokeWidth={1.5} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </aside>

        {/* Main Workspace: Storyboard View */}
        <main className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="flex-1 glass-panel rounded-2xl relative overflow-hidden group">
            <div className="absolute inset-0 canvas-bg opacity-30"></div>
            
            {/* Canvas Toolbar - Floating */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 glass-panel rounded-2xl p-2 flex items-center gap-2 z-50 shadow-2xl border-white/20">
              <div className="flex items-center gap-1 px-2 border-r border-white/10 mr-1">
                <button 
                  onClick={() => setCurrentTool('brush')}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentTool === 'brush' ? 'bg-white/20 text-white shadow-lg shadow-white/10' : 'text-white/40 hover:bg-white/10 hover:text-white'}`}
                  title="Brush"
                >
                  <Brush className="w-5 h-5" strokeWidth={1.5} />
                </button>
                <button 
                  onClick={() => setCurrentTool('bucket')}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentTool === 'bucket' ? 'bg-white/20 text-white shadow-lg shadow-white/10' : 'text-white/40 hover:bg-white/10 hover:text-white'}`}
                  title="Fill"
                >
                  <PaintBucket className="w-5 h-5" strokeWidth={1.5} />
                </button>
                <button 
                  onClick={() => setCurrentTool('eraser')}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentTool === 'eraser' ? 'bg-white/20 text-white shadow-lg shadow-white/10' : 'text-white/40 hover:bg-white/10 hover:text-white'}`}
                  title="Eraser"
                >
                  <Eraser className="w-5 h-5" strokeWidth={1.5} />
                </button>
                <button 
                  onClick={() => {
                    const canvas = canvasRef.current;
                    const ctx = canvas?.getContext('2d');
                    if (ctx && canvas) {
                      ctx.clearRect(0, 0, canvas.width, canvas.height);
                    }
                  }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:bg-red-500/20 hover:text-red-400 transition-all"
                  title="Clear All"
                >
                  <Trash2 className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>

              <div className="flex items-center gap-1.5 px-2">
                {slots.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => {
                      setActiveColor(slot.color);
                      if (currentTool === 'eraser') setCurrentTool('brush');
                    }}
                    className={`w-8 h-8 rounded-lg border-2 transition-all flex items-center justify-center ${activeColor === slot.color ? 'border-white scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                    style={{ backgroundColor: slot.color }}
                    title={`${slot.name} (${slot.type})`}
                  >
                    {activeColor === slot.color && <Check className="w-4 h-4 text-white drop-shadow-md" strokeWidth={3} />}
                  </button>
                ))}
                <button
                  onClick={handleAddSlot}
                  className="w-8 h-8 rounded-lg glass-button flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
                  title="Add New Slot"
                >
                  <Plus className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>

              <div className="w-px h-6 bg-white/10 mx-1"></div>
              
              <button 
                onClick={handleAutoMask}
                disabled={isAnalyzing}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isAnalyzing ? 'text-white animate-pulse' : 'text-white/40 hover:bg-white/10 hover:text-white'}`}
                title="Auto Mask"
              >
                <Sparkles className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            <div className="w-full h-full flex items-center justify-center p-8">
              <div 
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingBase(true);
                }}
                onDragLeave={() => setIsDraggingBase(false)}
                onDrop={handleBaseDrop}
                className={`relative aspect-video w-full max-w-5xl shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-lg overflow-hidden border transition-all duration-300 bg-black/20 ${isDraggingBase ? 'border-white bg-white/5 ring-4 ring-white/10 scale-[1.01]' : 'border-white/10'}`}
              >
                {isDraggingBase && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4 z-50 pointer-events-none border-4 border-dashed border-white/30 m-2 rounded-lg">
                    <ImagePlus className="w-16 h-16 text-white/60 animate-bounce" strokeWidth={1} />
                    <p className="text-white font-bold tracking-widest text-sm uppercase">Drop here to upload storyboard</p>
                  </div>
                )}
                {baseImage ? (
                  <img 
                    ref={bgImageRef}
                    src={baseImage} 
                    className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-700 ${generatedImages.length > 0 ? 'opacity-20' : 'opacity-40'}`} 
                    alt="Base Storyboard" 
                  />
                ) : (
                  <button 
                    onClick={handleBaseUpload}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-white/5 transition-colors group/upload w-full h-full border-none bg-transparent outline-none z-10"
                  >
                    <ImagePlus className="w-12 h-12 text-white/10 group-hover/upload:text-white/20 transition-colors" strokeWidth={1} />
                    <div className="glass-button px-6 py-3 rounded-xl text-sm font-bold text-white/80 group-hover/upload:bg-white/10 transition-all">Upload Storyboard</div>
                  </button>
                )}
                
                <canvas
                  ref={canvasRef}
                  width={1920}
                  height={1080}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={endDrawing}
                  onMouseLeave={endDrawing}
                  className={`absolute inset-0 w-full h-full object-contain cursor-crosshair touch-none ${(generatedImages.length > 0 || !baseImage) ? 'hidden' : ''}`}
                />
                
                {/* Generation Overlay */}
                {isGenerating && (
                  <div className="absolute inset-0 glass-panel flex flex-col items-center justify-center z-30">
                    <div className="w-20 h-20 relative mb-6">
                      <div className="absolute inset-0 border-4 border-white/5 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-t-white rounded-full animate-spin"></div>
                    </div>
                    <p className="text-white font-bold tracking-[0.2em] uppercase text-sm animate-pulse">Rendering Masterpiece...</p>
                  </div>
                )}

                {/* Result Preview */}
                {generatedImages.length > 0 && (
                  <div className="absolute inset-0 z-40 bg-black/90 flex items-center justify-center p-4 animate-in fade-in duration-700">
                    <img src={generatedImages[0]} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" alt="Generated" />
                    <button 
                      onClick={() => setGeneratedImages([])}
                      className="absolute top-6 right-6 w-12 h-12 glass-button rounded-full flex items-center justify-center text-white hover:bg-red-500/40"
                    >
                      <X className="w-6 h-6" strokeWidth={1.5} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar: Reference Mapping */}
        <aside className="w-80 glass-panel rounded-2xl flex flex-col overflow-y-auto no-scrollbar">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg glass-button flex items-center justify-center">
                  <Search className="w-4 h-4 text-white/60" strokeWidth={1.5} />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-white/90 text-xs font-bold uppercase tracking-[0.15em]">Ref Mapping</h3>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {slots.map((slot) => (
                <div 
                  key={slot.id} 
                  onClick={() => setActiveColor(slot.color)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverSlotId(slot.id);
                  }}
                  onDragLeave={() => setDragOverSlotId(null)}
                  onDrop={(e) => handleDrop(e, slot.id)}
                  className={`relative p-4 glass-card rounded-2xl transition-all duration-500 group/slot cursor-pointer border ${dragOverSlotId === slot.id ? 'border-dashed border-white bg-white/10 ring-4 ring-white/10 scale-[1.02]' : activeColor === slot.color ? 'border-white/20 ring-2 ring-white/40 bg-white/5' : 'border-transparent hover:bg-white/5'}`} 
                >
                  <div className="flex gap-4 items-start">
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSlotUpload(slot.id);
                      }}
                      className="w-16 h-16 shrink-0 bg-black/40 border border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-white/20 transition-all group overflow-hidden relative"
                    >
                      {slot.image ? (
                        <>
                          <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src={slot.image} alt={slot.type} />
                          <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <RefreshCw className="w-5 h-5 text-white" strokeWidth={1.5} />
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col items-center">
                          <ImagePlus className="w-6 h-6 text-white/10 group-hover:text-white/40 transition-colors" strokeWidth={1.5} />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex justify-between items-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <div className="relative shrink-0 w-6 h-6 rounded-full border border-white/20 overflow-hidden shadow-lg">
                            <input 
                              type="color" 
                              value={slot.color}
                              onChange={(e) => {
                                const newColor = e.target.value;
                                setSlots(slots.map(s => s.id === slot.id ? {...s, color: newColor} : s));
                                if (activeColor === slot.color) setActiveColor(newColor);
                              }}
                              className="absolute inset-[-50%] w-[200%] h-[200%] bg-transparent border-none cursor-pointer p-0"
                            />
                          </div>
                          <div className="flex flex-col flex-1 min-w-0">
                            <input 
                              className="bg-transparent text-[11px] font-bold uppercase focus:outline-none w-full tracking-wider text-white/90"
                              value={slot.name}
                              onChange={(e) => {
                                const newName = e.target.value;
                                setSlots(slots.map(s => s.id === slot.id ? {...s, name: newName} : s));
                              }}
                            />
                          </div>
                        </div>
                        <button 
                          onClick={() => removeSlot(slot.id)} 
                          className="w-6 h-6 rounded-lg glass-button flex items-center justify-center text-white/20 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" strokeWidth={1.5} />
                        </button>
                      </div>

                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <input 
                          className="w-full glass-input rounded-lg px-3 py-1.5 text-[10px] text-white/80 font-medium placeholder:text-white/10"
                          value={slot.type}
                          placeholder="Object description"
                          onChange={(e) => {
                            const newType = e.target.value;
                            setSlots(slots.map(s => s.id === slot.id ? {...s, type: newType} : s));
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  {activeColor === slot.color && (
                    <div className="absolute -right-1 -top-1 w-3 h-3 bg-white/80 rounded-full border-2 border-black shadow-[0_0_15px_rgba(255,255,255,0.4)]"></div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Footer: Style Selection & Generation */}
      <footer className="h-28 glass-panel border-t-0 m-4 mt-0 rounded-2xl flex items-center px-8 shrink-0 z-50">
        <div className="flex items-center gap-12 w-full">
          {/* Style Selection */}
          <div className="flex items-center gap-6 flex-1 min-w-0">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-10 h-10 rounded-xl glass-button flex items-center justify-center">
                <Palette className="w-5 h-5 text-white/60" strokeWidth={1.5} />
              </div>
              <div className="flex flex-col">
                <span className="text-white/90 text-[11px] font-bold uppercase tracking-[0.2em]">Style Guide</span>
              </div>
            </div>
            <div className="flex gap-3 overflow-x-auto no-scrollbar py-2 flex-1">
              {STYLE_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedStyleId(preset.id)}
                  className={`relative w-32 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 group ${selectedStyleId === preset.id ? 'border-white/60 ring-4 ring-white/10' : 'border-white/5 hover:border-white/20'}`}
                >
                  <img src={preset.preview} className="w-full h-full object-cover opacity-30 group-hover:opacity-60 transition-opacity" alt={preset.name} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center p-2">
                    <p className="text-[10px] font-bold text-white tracking-wider uppercase">{preset.name}</p>
                  </div>
                  {selectedStyleId === preset.id && (
                    <div className="absolute top-2 right-2 bg-white/80 rounded-full w-5 h-5 flex items-center justify-center shadow-xl">
                      <Check className="w-3 h-3 text-black" strokeWidth={3} />
                    </div>
                  )}
                </button>
              ))}
              
              <button
                onClick={handleCustomStyleUpload}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingStyle(true);
                }}
                onDragLeave={() => setIsDraggingStyle(false)}
                onDrop={handleCustomStyleDrop}
                className={`relative w-32 h-16 rounded-xl overflow-hidden border-2 border-dashed transition-all shrink-0 flex flex-col items-center justify-center group ${isDraggingStyle ? 'border-white bg-white/20 scale-[1.05]' : selectedStyleId === 'custom' ? 'border-white/60 bg-white/5' : 'border-white/10 bg-white/5 hover:border-white/30'}`}
              >
                {customStyleImage ? (
                  <>
                    <img src={customStyleImage} className="w-full h-full object-cover opacity-30 group-hover:opacity-60" alt="Custom style" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-center justify-center p-2">
                      <p className="text-[10px] font-bold text-white tracking-wider uppercase">Custom</p>
                    </div>
                  </>
                ) : (
                  <>
                    <ImagePlus className="w-5 h-5 text-white/20 group-hover:text-white/60 mb-1" strokeWidth={1.5} />
                    <span className="text-[9px] font-bold text-white/20 group-hover:text-white/60 uppercase tracking-widest">Custom</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 shrink-0">
            {generatedImages.length > 0 && (
              <button 
                onClick={() => setGeneratedImages([])}
                className="glass-button text-white/60 text-xs font-bold px-8 py-4 rounded-xl flex items-center gap-3 hover:text-white transition-all"
              >
                <Undo className="w-4 h-4" strokeWidth={1.5} />
                Edit
              </button>
            )}
            <button 
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`bg-white/10 border border-white/10 text-white text-xs font-bold px-12 py-4 rounded-xl flex items-center gap-3 transition-all shadow-2xl ${isGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/20 hover:scale-105 active:scale-95'}`}
            >
              {isGenerating ? 'Processing...' : generatedImages.length > 0 ? 'Regenerate' : 'Generate Masterpiece'} 
              <Sparkles className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );

};

export default App;
