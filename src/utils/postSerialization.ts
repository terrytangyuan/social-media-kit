// Utility functions for serializing and deserializing posts with images

/**
 * Convert File object to serializable format (dataUrl)
 */
const serializeImageForStorage = (img: { file: File; dataUrl: string; name: string }) => ({
  dataUrl: img.dataUrl,
  name: img.name,
});

/**
 * Convert dataUrl back to File object
 */
const deserializeImageFromStorage = (img: { dataUrl: string; name: string }) => {
  const dataUrl = img.dataUrl;
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  const file = new File([u8arr], img.name, { type: mime });
  return {
    file,
    dataUrl: img.dataUrl,
    name: img.name
  };
};

/**
 * Serialize posts for storage (convert File objects to dataUrls)
 */
export const serializePostsForStorage = (posts: any[]) => {
  return posts.map(post => ({
    ...post,
    images: post.images?.map(serializeImageForStorage)
  }));
};

/**
 * Deserialize posts from storage (convert dataUrls back to File objects)
 */
export const deserializePostsFromStorage = (posts: any[]) => {
  return posts.map(post => ({
    ...post,
    images: post.images?.map(deserializeImageFromStorage)
  }));
};
