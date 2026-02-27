import { useState, useCallback, useRef, useEffect } from 'react';

interface PanState {
  x: number;
  y: number;
}

interface UseMapInteractionsOptions {
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  zoomStep?: number;
}

interface UseMapInteractionsReturn {
  zoom: number;
  pan: PanState;
  setPan: React.Dispatch<React.SetStateAction<PanState>>;
  isDragging: boolean;
  containerRef: React.RefObject<HTMLDivElement>;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleZoomReset: () => void;
  handleZoomTo: (zoom: number) => void;
  handlePanStart: (e: React.MouseEvent | React.TouchEvent) => void;
  handlePanMove: (e: React.MouseEvent | React.TouchEvent) => void;
  handlePanEnd: () => void;
  handleWheel: (e: React.WheelEvent) => void;
  centerOnPoint: (x: number, y: number, containerWidth: number, containerHeight: number) => void;
  centerOnNode: (nodeX: number, nodeY: number, nodeWidth: number, nodeHeight: number, containerWidth: number, containerHeight: number) => void;
}

export function useMapInteractions(options: UseMapInteractionsOptions = {}): UseMapInteractionsReturn {
  const {
    initialZoom = 1,
    minZoom = 0.3,
    maxZoom = 3,
    zoomStep = 0.1,
  } = options;

  const [zoom, setZoom] = useState(initialZoom);
  const [pan, setPan] = useState<PanState>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  
  const dragStart = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDistance = useRef<number | null>(null);

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + zoomStep, maxZoom));
  }, [zoomStep, maxZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - zoomStep, minZoom));
  }, [zoomStep, minZoom]);

  const handleZoomReset = useCallback(() => {
    setZoom(initialZoom);
    setPan({ x: 0, y: 0 });
  }, [initialZoom]);

  const handleZoomTo = useCallback((newZoom: number) => {
    setZoom(Math.max(minZoom, Math.min(newZoom, maxZoom)));
  }, [minZoom, maxZoom]);

  const handlePanStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(true);
    
    if ('touches' in e) {
      if (e.touches.length === 1) {
        dragStart.current = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          panX: pan.x,
          panY: pan.y,
        };
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDistance.current = Math.sqrt(dx * dx + dy * dy);
      }
    } else {
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y,
      };
    }
  }, [pan]);

  const handlePanMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    
    if ('touches' in e) {
      if (e.touches.length === 1 && dragStart.current) {
        const dx = e.touches[0].clientX - dragStart.current.x;
        const dy = e.touches[0].clientY - dragStart.current.y;
        setPan({
          x: dragStart.current.panX + dx,
          y: dragStart.current.panY + dy,
        });
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (lastTouchDistance.current !== null) {
          const scale = distance / lastTouchDistance.current;
          setZoom(prev => Math.max(minZoom, Math.min(prev * scale, maxZoom)));
        }
        
        lastTouchDistance.current = distance;
      }
    } else if (dragStart.current) {
      const dx = (e as React.MouseEvent).clientX - dragStart.current.x;
      const dy = (e as React.MouseEvent).clientY - dragStart.current.y;
      setPan({
        x: dragStart.current.panX + dx,
        y: dragStart.current.panY + dy,
      });
    }
  }, [isDragging, minZoom, maxZoom]);

  const handlePanEnd = useCallback(() => {
    setIsDragging(false);
    dragStart.current = null;
    lastTouchDistance.current = null;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
    const newZoom = Math.max(minZoom, Math.min(zoom + delta, maxZoom));
    
    // Zoom towards mouse position
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      const zoomRatio = newZoom / zoom;
      const newPanX = mouseX - (mouseX - pan.x) * zoomRatio;
      const newPanY = mouseY - (mouseY - pan.y) * zoomRatio;
      
      setZoom(newZoom);
      setPan({ x: newPanX, y: newPanY });
    } else {
      setZoom(newZoom);
    }
  }, [zoom, pan, zoomStep, minZoom, maxZoom]);

  const centerOnPoint = useCallback((x: number, y: number, containerWidth: number, containerHeight: number) => {
    setPan({
      x: containerWidth / 2 - x * zoom,
      y: containerHeight / 2 - y * zoom,
    });
  }, [zoom]);

  const centerOnNode = useCallback((
    nodeX: number,
    nodeY: number,
    nodeWidth: number,
    nodeHeight: number,
    containerWidth: number,
    containerHeight: number
  ) => {
    const centerX = nodeX + nodeWidth / 2;
    const centerY = nodeY + nodeHeight / 2;
    
    setPan({
      x: containerWidth / 2 - centerX * zoom,
      y: containerHeight / 2 - centerY * zoom,
    });
  }, [zoom]);

  // Handle mouse leave to stop dragging
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) {
        handlePanEnd();
      }
    };
    
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchend', handleMouseUp);
    
    return () => {
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, handlePanEnd]);

  return {
    zoom,
    pan,
    setPan,
    isDragging,
    containerRef,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    handleZoomTo,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    handleWheel,
    centerOnPoint,
    centerOnNode,
  };
}
