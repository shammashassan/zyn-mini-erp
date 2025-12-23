"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeftIcon,
  CircleUserRoundIcon,
  XIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from "lucide-react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { Button } from "@/components/ui/button";
import {
  Cropper,
  CropperCropArea,
  CropperDescription,
  CropperImage,
} from "@/components/ui/cropper";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

// Define type for pixel crop area
type Area = { x: number; y: number; width: number; height: number };

/**
 * Interface for the props of the ImageUploader component.
 */
interface ImageUploaderProps {
  initialImageUrl?: string | null;
  onImageCropped: (blob: Blob | null) => void;
}

// Helper function to create an image element from a URL
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous"); // Needed for canvas security
    image.src = url;
  });

// Helper function to get a cropped image blob
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
): Promise<Blob | null> {
  try {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return null;
    }

    // Set canvas size to the cropped area size
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    // Draw the cropped image onto the canvas
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );

    // Convert canvas to blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        resolve(blob);
      }, "image/jpeg");
    });
  } catch (error) {
    console.error("Error in getCroppedImg:", error);
    return null;
  }
}

/**
 * A component for uploading, previewing, and cropping an employee's avatar.
 * @param {ImageUploaderProps} props - The props for the component.
 * @returns {JSX.Element} The rendered component.
 */
export function ImageUploader({ initialImageUrl, onImageCropped }: ImageUploaderProps) {
  const [
    { files, isDragging },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      getInputProps,
    },
  ] = useFileUpload({ accept: "image/*" });

  const previewUrl = files[0]?.preview || null;
  const fileId = files[0]?.id;

  const [finalImageUrl, setFinalImageUrl] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const previousFileIdRef = useRef<string | undefined | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [zoom, setZoom] = useState(1);

  // Set initial image from props and validate it
  useEffect(() => {
    const validateAndSetImage = async () => {
      if (!initialImageUrl) {
        setFinalImageUrl(null);
        return;
      }

      // Check if it's a blob URL that might be invalid
      if (initialImageUrl.startsWith('blob:')) {
        try {
          const response = await fetch(initialImageUrl);
          if (!response.ok) {
            setFinalImageUrl(null);
            return;
          }
        } catch (error) {
          console.warn('Invalid blob URL detected, clearing image');
          setFinalImageUrl(null);
          return;
        }
      }

      setFinalImageUrl(initialImageUrl);
    };

    validateAndSetImage();
  }, [initialImageUrl]);

  const handleCropChange = useCallback((pixels: Area | null) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleApply = async () => {
    if (!previewUrl || !fileId || !croppedAreaPixels) {
      if (fileId) removeFile(fileId);
      return;
    }

    try {
      const croppedBlob = await getCroppedImg(previewUrl, croppedAreaPixels);
      if (!croppedBlob) throw new Error("Failed to generate cropped image blob.");
      
      // Clean up previous blob URL
      if (finalImageUrl && finalImageUrl.startsWith("blob:")) {
        URL.revokeObjectURL(finalImageUrl);
      }

      const newFinalUrl = URL.createObjectURL(croppedBlob);
      setFinalImageUrl(newFinalUrl);
      onImageCropped(croppedBlob);
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Error during apply:", error);
      setIsDialogOpen(false);
    }
  };

  const handleRemoveFinalImage = () => {
    // Clean up blob URL if it exists
    if (finalImageUrl && finalImageUrl.startsWith("blob:")) {
      URL.revokeObjectURL(finalImageUrl);
    }
    setFinalImageUrl(null);
    onImageCropped(null);
  };

  const handleCancel = () => {
    if (fileId) {
      removeFile(fileId);
    }
    setIsDialogOpen(false);
    setCroppedAreaPixels(null);
    setZoom(1);
  };

  useEffect(() => {
    if (fileId && fileId !== previousFileIdRef.current) {
      setIsDialogOpen(true);
      setCroppedAreaPixels(null);
      setZoom(1);
    }
    previousFileIdRef.current = fileId;
  }, [fileId]);

  useEffect(() => {
    const currentFinalUrl = finalImageUrl;
    return () => {
      if (currentFinalUrl && currentFinalUrl.startsWith("blob:")) {
        URL.revokeObjectURL(currentFinalUrl);
      }
    };
  }, [finalImageUrl]);

  const handleOpenDialog = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    openFileDialog();
  };

  // Check if we have a valid image to display
  const hasValidImage = finalImageUrl && (
    !finalImageUrl.startsWith('blob:') || 
    finalImageUrl.startsWith('blob:') // For new uploads, we trust they're valid
  );

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative inline-flex">
        <button
          type="button"
          className="border-input hover:bg-accent/50 data-[dragging=true]:bg-accent/50 focus-visible:border-ring focus-visible:ring-ring/50 relative flex size-32 items-center justify-center overflow-hidden rounded-full border border-dashed transition-colors outline-none focus-visible:ring-[3px] has-disabled:pointer-events-none has-disabled:opacity-50 has-[img]:border-none"
          onClick={handleOpenDialog}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          data-dragging={isDragging || undefined}
          aria-label={hasValidImage ? "Change image" : "Upload image"}
        >
          {hasValidImage ? (
            <img
              className="size-full object-cover"
              src={finalImageUrl}
              alt="User avatar"
              width={128}
              height={128}
              onError={() => {
                console.warn('Image failed to load, clearing finalImageUrl');
                setFinalImageUrl(null);
              }}
            />
          ) : (
            <div aria-hidden="true">
              <CircleUserRoundIcon className="size-12 opacity-60" />
            </div>
          )}
        </button>
        {hasValidImage && (
          <Button
            type="button"
            onClick={handleRemoveFinalImage}
            size="icon"
            variant="destructive"
            className="border-background focus-visible:border-background absolute top-0 right-0 size-7 rounded-full border-2 shadow-md"
            aria-label="Remove image"
          >
            <XIcon className="size-4" />
          </Button>
        )}
        <input {...getInputProps()} className="sr-only" aria-label="Upload image file" tabIndex={-1} />
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleCancel}>
        <DialogContent className="gap-0 p-0 sm:max-w-[600px] *:[button]:hidden">
          <DialogDescription className="sr-only">Crop image dialog</DialogDescription>
          <DialogHeader className="contents space-y-0 text-left">
            <DialogTitle className="flex items-center justify-between border-b p-4 text-base">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="-my-1 opacity-60"
                  onClick={handleCancel}
                  aria-label="Cancel"
                >
                  <ArrowLeftIcon aria-hidden="true" />
                </Button>
                <span>Crop image</span>
              </div>
              <Button type="button" className="-my-1" onClick={handleApply} disabled={!previewUrl} autoFocus>
                Apply
              </Button>
            </DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <Cropper
              className="h-96 sm:h-[450px]"
              image={previewUrl}
              zoom={zoom}
              onCropChange={handleCropChange}
              onZoomChange={setZoom}
            >
              <CropperDescription />
              <CropperImage />
              <CropperCropArea />
            </Cropper>
          )}
          <DialogFooter className="border-t px-4 py-6">
            <div className="mx-auto flex w-full max-w-xs items-center gap-4">
              <ZoomOutIcon className="shrink-0 opacity-60" size={16} aria-hidden="true" />
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.1}
                onValueChange={(value) => setZoom(value[0])}
                aria-label="Zoom slider"
              />
              <ZoomInIcon className="shrink-0 opacity-60" size={16} aria-hidden="true" />
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}