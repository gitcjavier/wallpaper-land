import React, { useState, useEffect } from 'react';

interface Wallpaper {
  id: string;
  title: string;
  description: string;
  image_url: string;
  thumbnail_url: string;
  category: {
    name: string;
    color: string;
  } | null;
  download_count: number;
  width: number;
  height: number;
  file_size?: number;
  tags?: string[];
  created_at?: string;
}

export default function WallpaperModal() {
  const [wallpaper, setWallpaper] = useState<Wallpaper | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [downloadCount, setDownloadCount] = useState(0);

  useEffect(() => {
    // Set up global modal component reference
    if (typeof window !== 'undefined') {
      (window as any).setModalComponent({
        forceUpdate: () => {
          const state = (window as any).getModalState();
          setWallpaper(state.wallpaper);
          setIsOpen(state.isOpen);
          if (state.wallpaper) {
            setDownloadCount(state.wallpaper.download_count);
            setImageLoaded(false);
          }
        }
      });
    }
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleClose = () => {
    if (typeof window !== 'undefined') {
      (window as any).closeWallpaperModal();
    }
  };

  const handleDownload = async () => {
    if (!wallpaper || downloading) return;

    setDownloading(true);

    try {
      // Update download count
      const response = await fetch('/api/wallpapers/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: wallpaper.id })
      });

      if (response.ok) {
        setDownloadCount(prev => prev + 1);
      }

      // Trigger download
      const link = document.createElement('a');
      link.href = wallpaper.image_url;
      link.download = `${wallpaper.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.jpg`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (error) {
      console.error('Error downloading wallpaper:', error);
    } finally {
      setDownloading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!isOpen || !wallpaper) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Background overlay */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Modal content */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative w-full max-w-6xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors duration-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>

          <div className="grid lg:grid-cols-2 gap-0">
            {/* Image section */}
            <div className="relative bg-gray-100 flex items-center justify-center min-h-[400px] lg:min-h-[600px]">
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
              )}
              <img
                src={wallpaper.image_url}
                alt={wallpaper.title}
                className={`max-w-full max-h-full object-contain transition-opacity duration-500 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
              />
            </div>

            {/* Info section */}
            <div className="p-8 flex flex-col">
              {/* Header */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">
                  {wallpaper.title}
                </h1>
                {wallpaper.description && (
                  <p className="text-gray-600 text-lg leading-relaxed">
                    {wallpaper.description}
                  </p>
                )}
              </div>

              {/* Category */}
              {wallpaper.category && (
                <div className="mb-6">
                  <span 
                    className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold text-white"
                    style={{ backgroundColor: wallpaper.category.color }}
                  >
                    {wallpaper.category.name}
                  </span>
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Resolución</div>
                  <div className="text-xl font-semibold text-gray-900">
                    {wallpaper.width} × {wallpaper.height}
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Descargas</div>
                  <div className="text-xl font-semibold text-gray-900 flex items-center">
                    <svg className="w-5 h-5 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3"/>
                    </svg>
                    {downloadCount.toLocaleString()}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Tamaño</div>
                  <div className="text-xl font-semibold text-gray-900">
                    {formatFileSize(wallpaper.file_size)}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500 mb-1">Fecha</div>
                  <div className="text-xl font-semibold text-gray-900">
                    {formatDate(wallpaper.created_at)}
                  </div>
                </div>
              </div>

              {/* Tags */}
              {wallpaper.tags && wallpaper.tags.length > 0 && (
                <div className="mb-8">
                  <div className="text-sm text-gray-500 mb-3">Tags</div>
                  <div className="flex flex-wrap gap-2">
                    {wallpaper.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Download button */}
              <div className="mt-auto">
                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-3 shadow-lg"
                >
                  {downloading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Descargando...
                    </>
                  ) : (
                    <>
                      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                      </svg>
                      Descargar Wallpaper
                      <span className="text-sm opacity-90">
                        ({wallpaper.width}×{wallpaper.height})
                      </span>
                    </>
                  )}
                </button>

                <p className="text-center text-sm text-gray-500 mt-3">
                  Descarga gratuita • Alta resolución • Sin marca de agua
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.95) translateY(20px);
          }
          to { 
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
        
        .animate-scale-in {
          animation: scaleIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}