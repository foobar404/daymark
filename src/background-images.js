const unsplashImage = (photoId, width, quality) =>
  `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=${width}&q=${quality}`;

export const BACKGROUND_IMAGES = [
  { id: 'morning-light', name: 'Morning light', url: unsplashImage('photo-1470252649378-9c29740c9fa8', 1920, 85), thumbnail: unsplashImage('photo-1470252649378-9c29740c9fa8', 480, 75) },
  { id: 'alpine-lake', name: 'Alpine lake', url: unsplashImage('photo-1501785888041-af3ef285b470', 1920, 85), thumbnail: unsplashImage('photo-1501785888041-af3ef285b470', 480, 75) },
  { id: 'ocean-blue', name: 'Ocean blue', url: unsplashImage('photo-1518837695005-2083093ee35b', 1920, 85), thumbnail: unsplashImage('photo-1518837695005-2083093ee35b', 480, 75) },
  { id: 'forest-path', name: 'Forest path', url: unsplashImage('photo-1441974231531-c6227db76b6e', 1920, 85), thumbnail: unsplashImage('photo-1441974231531-c6227db76b6e', 480, 75) },
  { id: 'golden-hills', name: 'Golden hills', url: unsplashImage('photo-1470071459604-3b5ec3a7fe05', 1920, 85), thumbnail: unsplashImage('photo-1470071459604-3b5ec3a7fe05', 480, 75) },
  { id: 'mountain-dawn', name: 'Mountain dawn', url: unsplashImage('photo-1470770841072-f978cf4d019e', 1920, 85), thumbnail: unsplashImage('photo-1470770841072-f978cf4d019e', 480, 75) },
  { id: 'evergreen', name: 'Evergreen', url: unsplashImage('photo-1511497584788-876760111969', 1920, 85), thumbnail: unsplashImage('photo-1511497584788-876760111969', 480, 75) },
  { id: 'northern-lights', name: 'Northern lights', url: unsplashImage('photo-1531366936337-7c912a4589a7', 1920, 85), thumbnail: unsplashImage('photo-1531366936337-7c912a4589a7', 480, 75) },
];

export const BACKGROUND_IMAGE_IDS = BACKGROUND_IMAGES.map(({ id }) => id);

export function isCommonsBackgroundUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && url.hostname === 'upload.wikimedia.org'
      && url.pathname.startsWith('/wikipedia/commons/');
  } catch {
    return false;
  }
}