import React from 'react';

interface FluentPencilProps {
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'hero' | number;
  alt?: string;
  isGodMode?: boolean;
  isHellMode?: boolean;
  style?: React.CSSProperties;
}

const getAssetUrl = (relativePath: string) => {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const cleanRelative = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath;
  return `${cleanBase}${cleanRelative}`;
};

export const FluentPencil: React.FC<FluentPencilProps> = ({
  className = '',
  size = 'md',
  alt = 'Graphite Pencil',
  isGodMode = false,
  isHellMode = false,
  style = {}
}) => {
  const sizeMap: Record<string, string> = {
    xs: 'w-4 h-4',
    sm: 'w-5 h-5 sm:w-6 sm:h-6',
    md: 'w-7 h-7 sm:w-8 sm:h-8',
    lg: 'w-10 h-10 sm:w-12 sm:h-12',
    xl: 'w-14 h-14 sm:w-16 sm:h-16',
    '2xl': 'w-20 h-20 sm:w-24 sm:h-24',
    hero: 'w-24 h-24 sm:w-32 sm:h-32'
  };

  const dimensionClass = typeof size === 'number' ? '' : (sizeMap[size] || sizeMap.md);
  const inlineSizeStyle = typeof size === 'number' ? { width: `${size}px`, height: `${size}px` } : {};

  // Custom filters for God Mode / Hell Mode
  let auraFilter = '';
  if (isGodMode) {
    auraFilter = 'drop-shadow-[0_0_25px_rgba(56,189,248,0.9)] drop-shadow-[0_0_10px_rgba(250,204,21,0.8)] brightness-110';
  } else if (isHellMode) {
    auraFilter = 'drop-shadow-[0_0_20px_rgba(239,68,68,0.85)] saturate-150 contrast-125';
  } else {
    auraFilter = 'drop-shadow-[0_8px_16px_rgba(0,0,0,0.15)] dark:drop-shadow-[0_8px_20px_rgba(251,191,36,0.2)]';
  }

  return (
    <img
      src={getAssetUrl('assets/pencil_3d.png')}
      alt={alt}
      loading="eager"
      decoding="async"
      className={`inline-block object-contain select-none pointer-events-none transition-all duration-300 ${dimensionClass} ${auraFilter} ${className}`}
      style={{
        imageRendering: 'auto',
        ...inlineSizeStyle,
        ...style
      }}
      onError={(e) => {
        // Fallback to Microsoft CDN if needed
        const target = e.currentTarget;
        if (!target.dataset.triedFallback) {
          target.dataset.triedFallback = 'true';
          target.src = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Pencil/3D/pencil_3d.png';
        }
      }}
    />
  );
};

export default FluentPencil;
