import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react';

interface ImageLightboxModalProps {
  src?: string;
  imageUrl?: string;
  alt?: string;
  isOpen?: boolean;
  onClose: () => void;
}

export const ImageLightboxModal: React.FC<ImageLightboxModalProps> = ({ src, imageUrl, alt = "Enlarged Image View", isOpen = true, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const imageSrc = src || imageUrl;
  if (!isOpen || !imageSrc) return null;

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation(prev => (prev + 90) % 360);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
      {/* Top Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-xl p-2 backdrop-blur-sm shadow-xl">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ZoomIn className="w-5 h-5" />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ZoomOut className="w-5 h-5" />
        </button>
        <button
          onClick={handleRotate}
          title="Rotate"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <RotateCw className="w-5 h-5" />
        </button>
        <a
          href={imageSrc}
          download
          target="_blank"
          rel="noopener noreferrer"
          title="Download / Open Original"
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Download className="w-5 h-5" />
        </a>
        <div className="w-px h-5 bg-slate-800 mx-1" />
        <button
          onClick={onClose}
          title="Close Lightbox (Esc)"
          className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Image View Container */}
      <div 
        className="w-full h-full flex items-center justify-center overflow-auto cursor-grab active:cursor-grabbing p-8"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <img
          src={imageSrc}
          alt={alt}
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease-out'
          }}
          className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg shadow-2xl select-none"
        />
      </div>
    </div>
  );
};

export default ImageLightboxModal;
