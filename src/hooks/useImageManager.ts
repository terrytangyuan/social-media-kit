import { useState, useCallback } from 'react';
import { IMAGE_LIMITS } from '../constants';

type ImageFile = {
  file: File;
  dataUrl: string;
  name: string;
};

type Platform = keyof typeof IMAGE_LIMITS;

interface PlatformImageSelections {
  [key: string]: number[]; // Array of indices of selected images for each platform
}

export const useImageManager = () => {
  const [attachedImages, setAttachedImages] = useState<ImageFile[]>([]);
  const [platformImageSelections, setPlatformImageSelections] = useState<PlatformImageSelections>({});
  const [hasExplicitSelection, setHasExplicitSelection] = useState<{ [key: string]: boolean }>({});
  const [showImageSelector, setShowImageSelector] = useState(false);
  const [pendingPlatform, setPendingPlatform] = useState<Platform | null>(null);

  const isValidImageFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      return false;
    }
    return true;
  }, []);

  const handleImageUpload = useCallback((files: File[]) => {
    const validImageFiles = files.filter(isValidImageFile);
    const imagePromises = validImageFiles.map(file => {
      return new Promise<ImageFile>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          resolve({
            file,
            dataUrl: e.target?.result as string,
            name: file.name
          });
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then(newImages => {
      const updatedImages = [...attachedImages, ...newImages];
      setAttachedImages(updatedImages);
    });
  }, [attachedImages, isValidImageFile]);

  const removeAttachedImage = useCallback((index: number) => {
    const updatedImages = attachedImages.filter((_, i) => i !== index);
    setAttachedImages(updatedImages);

    // Update platform selections to remove the deleted image and adjust indices
    const updatedSelections = Object.fromEntries(
      Object.entries(platformImageSelections).map(([platform, indices]) => [
        platform,
        indices.filter(i => i !== index).map(i => i > index ? i - 1 : i)
      ])
    );
    setPlatformImageSelections(updatedSelections);
  }, [attachedImages, platformImageSelections]);

  const updatePlatformSelection = useCallback((platform: Platform, selectedIndices: number[]) => {
    const platformLimit = IMAGE_LIMITS[platform].maxImages;

    // Ensure we don't exceed platform image limit
    const validSelectedIndices = selectedIndices.slice(0, platformLimit);

    setPlatformImageSelections(prev => ({
      ...prev,
      [platform]: validSelectedIndices
    }));
    setHasExplicitSelection(prev => ({ ...prev, [platform]: true }));
    setShowImageSelector(false);
  }, []);

  const selectImagesForPlatform = useCallback((platform: Platform) => {
    setPendingPlatform(platform);
    setShowImageSelector(true);
  }, []);

  const getSelectedImagesForPlatform = useCallback((platform: Platform) => {
    const platformLimit = IMAGE_LIMITS[platform].maxImages;

    // If no explicit selection exists, use first N images up to platform limit
    if (!hasExplicitSelection[platform] && attachedImages.length > 0) {
      const defaultSelectedIndices = Array.from(
        { length: Math.min(attachedImages.length, platformLimit) },
        (_, i) => i
      );
      return defaultSelectedIndices.map(index => attachedImages[index]);
    }

    // Use explicitly selected images
    const selectedIndices = platformImageSelections[platform] || [];
    return selectedIndices.map(index => attachedImages[index]);
  }, [attachedImages, platformImageSelections, hasExplicitSelection]);

  const reorderImages = useCallback((fromIndex: number, toIndex: number) => {
    const reorderedImages = [...attachedImages];
    const [removed] = reorderedImages.splice(fromIndex, 1);
    reorderedImages.splice(toIndex, 0, removed);
    setAttachedImages(reorderedImages);

    // Update platform selections with new indices
    const updatedSelections = Object.fromEntries(
      Object.entries(platformImageSelections).map(([platform, indices]) => [
        platform,
        indices.map(i => {
          if (i === fromIndex) return toIndex;
          else if (fromIndex < toIndex && i > fromIndex && i <= toIndex) return i - 1;
          else if (fromIndex > toIndex && i < fromIndex && i >= toIndex) return i + 1;
          return i;
        })
      ])
    );
    setPlatformImageSelections(updatedSelections);
  }, [attachedImages, platformImageSelections]);

  const clearAllImages = useCallback(() => {
    setAttachedImages([]);
    setPlatformImageSelections({});
    setHasExplicitSelection({});
  }, []);

  return {
    // State
    attachedImages,
    platformImageSelections,
    hasExplicitSelection,
    showImageSelector,
    pendingPlatform,

    // Methods
    handleImageUpload,
    removeAttachedImage,
    updatePlatformSelection,
    selectImagesForPlatform,
    getSelectedImagesForPlatform,
    reorderImages,
    clearAllImages,

    // Setter methods (exposed for advanced use cases)
    setAttachedImages,
    setPlatformImageSelections,
  };
};