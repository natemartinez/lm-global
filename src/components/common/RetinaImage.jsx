/**
 * RetinaImage — renders an <img> with automatic srcSet for HiDPI (Retina) displays.
 *
 * Usage:
 *   import searchIcon from '@assets/search_FILL0_wght300_GRAD0_opsz24/search_FILL0_wght300_GRAD0_opsz24.png';
 *   <RetinaImage src={searchIcon} alt="Search" width={24} height={24} />
 *
 * The component automatically derives the @2x path from the 1x import path.
 * Works with Vite's static asset handling — the 1x and @2x files must be
 * siblings in the same directory (e.g., icon.png and icon@2x.png).
 */
function RetinaImage({ src, alt, className, width, height, ...rest }) {
  if (!src) return null;

  // Only apply @2x srcSet logic to local assets imported via Vite.
  // External URLs (e.g., profile pictures from an API) don't have @2x variants.
  const isExternalUrl = /^https?:\/\//.test(src);
  const srcSet = isExternalUrl || src.includes('@2x')
    ? undefined
    : `${src} 1x, ${insert2xSuffix(src)} 2x`;

  return (
    <img
      src={src}
      srcSet={srcSet}
      alt={alt}
      className={className}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      {...rest}
    />
  );
}

/**
 * Given a Vite-resolved asset URL like `/assets/icon.abc123.png`,
 * return `/assets/icon@2x.abc123.png`.
 *
 * Handles both hashed (Vite build) and unhashed (dev) paths.
 */
function insert2xSuffix(url) {
  // Find the last dot before the extension, accounting for hash fingerprints.
  // Pattern: /path/name.hash.ext or /path/name.ext
  const dotIndex = url.lastIndexOf('.');
  if (dotIndex === -1) return url;

  // Check if there's a hash segment between name and extension.
  // Vite dev:  /assets/icon.png
  // Vite build: /assets/icon.abc123.png
  const secondLastDot = url.lastIndexOf('.', dotIndex - 1);
  if (secondLastDot === -1) {
    // Simple case: /assets/icon.png → /assets/icon@2x.png
    return url.slice(0, dotIndex) + '@2x' + url.slice(dotIndex);
  }

  // Hashed case: /assets/icon.abc123.png
  // Insert @2x after the name, before the hash.
  // /assets/icon.abc123.png → /assets/icon@2x.abc123.png
  return url.slice(0, secondLastDot) + '@2x' + url.slice(secondLastDot);
}

export default RetinaImage;
