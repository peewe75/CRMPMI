'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, ImagePlus, Star, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getVariantCommercialLabel, getVariantSizeLabel } from '@/modules/products/domain/variant-display';

interface ProductImageView {
  id: string;
  product_id: string | null;
  variant_id: string | null;
  file_name: string;
  mime_type: string;
  is_primary: boolean;
  sort_order: number;
  signed_url: string | null;
}

export function ProductImageManager({
  productId,
  variants,
  initialImages,
  scopeVariantId,
  title = 'Immagini prodotto',
  description = 'Carica foto da smartphone o desktop e scegli se legarle al prodotto o a una variante.',
}: {
  productId: string;
  variants: Array<{ id: string; size: string | null; color: string; material?: string | null }>;
  initialImages: ProductImageView[];
  scopeVariantId?: string;
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [images, setImages] = useState(initialImages);
  const [variantId, setVariantId] = useState<string>(scopeVariantId ?? '');
  const [isPrimary, setIsPrimary] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [busyImageId, setBusyImageId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const scoped = Boolean(scopeVariantId);

  async function refreshImages() {
    const query = scopeVariantId ? `?variant_id=${encodeURIComponent(scopeVariantId)}` : '';
    const response = await fetch(`/api/products/${productId}/images${query}`);
    const payload = await response.json();

    if (!response.ok) {
      throw new Error(payload.error ?? 'Aggiornamento gallery non riuscito');
    }

    setImages(payload.images as ProductImageView[]);
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList?.length) return;

    setError(null);
    setMessage(null);
    setIsUploading(true);

    try {
      for (const file of Array.from(fileList)) {
        const preparedFile = await maybeCompressImage(file);
        const formData = new FormData();
        formData.set('file', preparedFile);
        if (variantId) formData.set('variant_id', variantId);
        formData.set('is_primary', isPrimary ? 'true' : 'false');

        const response = await fetch(`/api/products/${productId}/images`, {
          method: 'POST',
          body: formData,
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error ?? 'Upload immagine non riuscito');
        }
      }

      await refreshImages();
      setMessage('Immagine caricata correttamente.');
      startTransition(() => {
        router.refresh();
      });
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload non riuscito');
    } finally {
      setIsUploading(false);
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  }

  async function handleSetPrimary(imageId: string) {
    setError(null);
    setMessage(null);

    try {
      setBusyImageId(imageId);
      const response = await fetch(`/api/product-images/${imageId}/primary`, {
        method: 'POST',
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Impostazione immagine principale non riuscita');
      }

      await refreshImages();
      setMessage('Immagine principale aggiornata.');
      startTransition(() => {
        router.refresh();
      });
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Operazione non riuscita');
    } finally {
      setBusyImageId(null);
    }
  }

  async function handleDelete(imageId: string) {
    setError(null);
    setMessage(null);

    try {
      setBusyImageId(imageId);
      const response = await fetch(`/api/product-images/${imageId}`, {
        method: 'DELETE',
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? 'Rimozione immagine non riuscita');
      }

      await refreshImages();
      setMessage('Immagine rimossa.');
      startTransition(() => {
        router.refresh();
      });
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Operazione non riuscita');
    } finally {
      setBusyImageId(null);
    }
  }

  const productLevelImages = scoped ? [] : images.filter((image) => !image.variant_id);
  const variantLevelImages = scoped ? images : images.filter((image) => image.variant_id);

  return (
    <div className="space-y-4">
      <Card className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          {!scoped ? (
            <label className="space-y-1 text-sm">
              <span className="text-muted-foreground">Associazione</span>
              <select
                className="flex h-10 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm"
                value={variantId}
                onChange={(event) => setVariantId(event.target.value)}
              >
                <option value="">Prodotto principale</option>
                {variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                    {getVariantCommercialLabel(variant)} - {getVariantSizeLabel(variant)}
                </option>
              ))}
            </select>
          </label>
          ) : (
            <div className="flex items-center rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground">
              Variante dedicata: {variants[0] ? `${getVariantCommercialLabel(variants[0])} - ${getVariantSizeLabel(variants[0])}` : '-'}
            </div>
          )}

          <label className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={isPrimary}
              onChange={(event) => setIsPrimary(event.target.checked)}
            />
            Imposta come principale
          </label>

          <Button size="sm" variant="outline" disabled={isPending || isUploading} onClick={() => galleryInputRef.current?.click()}>
            <ImagePlus className="h-4 w-4" />
            {isUploading ? 'Upload...' : 'Galleria'}
          </Button>

          <Button size="sm" disabled={isPending || isUploading} onClick={() => cameraInputRef.current?.click()}>
            <Camera className="h-4 w-4" />
            Camera
          </Button>
        </div>

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(event) => void handleFiles(event.target.files)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(event) => void handleFiles(event.target.files)}
        />

        {message ? <p className="text-xs text-green-700">{message}</p> : null}
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </Card>

      {!scoped ? (
        <ImageSection
          title="Galleria prodotto"
          emptyText="Ancora nessuna immagine principale o secondaria a livello prodotto."
          images={productLevelImages}
          variants={variants}
          busyImageId={busyImageId}
          onDelete={handleDelete}
          onSetPrimary={handleSetPrimary}
        />
      ) : null}

      <ImageSection
        title={scoped ? 'Galleria variante' : 'Galleria varianti'}
        emptyText={scoped ? 'Nessuna immagine collegata a questa variante.' : 'Nessuna immagine collegata alle varianti.'}
        images={variantLevelImages}
        variants={variants}
        busyImageId={busyImageId}
        onDelete={handleDelete}
        onSetPrimary={handleSetPrimary}
      />
    </div>
  );
}

function ImageSection({
  title,
  emptyText,
  images,
  variants,
  busyImageId,
  onDelete,
  onSetPrimary,
}: {
  title: string;
  emptyText: string;
  images: ProductImageView[];
  variants: Array<{ id: string; size: string | null; color: string; material?: string | null }>;
  busyImageId: string | null;
  onDelete: (imageId: string) => Promise<void>;
  onSetPrimary: (imageId: string) => Promise<void>;
}) {
  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">{title}</h3>
        <Badge variant="outline">{images.length}</Badge>
      </div>

      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image) => {
            const variant = variants.find((candidate) => candidate.id === image.variant_id);

            return (
              <li key={image.id} className="space-y-2 rounded-xl border border-border bg-white p-2">
                <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
                  {image.signed_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image.signed_url} alt={image.file_name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      Preview non disponibile
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap gap-1">
                    {image.is_primary ? <Badge variant="success">Principale</Badge> : null}
                    {variant ? (
                      <Badge variant="outline">
                        {getVariantCommercialLabel(variant)} - {getVariantSizeLabel(variant)}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Prodotto</Badge>
                    )}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{image.file_name}</p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => void onSetPrimary(image.id)}>
                    <Star className="h-4 w-4" />
                    {busyImageId === image.id ? '...' : 'Primaria'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => void onDelete(image.id)} disabled={busyImageId === image.id}>
                    <Trash2 className="h-4 w-4" />
                    Rimuovi
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

async function maybeCompressImage(file: File) {
  if (!file.type.startsWith('image/') || typeof window === 'undefined') {
    return file;
  }

  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));

    if (scale === 1 && file.size < 1_500_000) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));

    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      return file;
    }

    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.82);
    });

    bitmap.close();

    if (!blob) {
      return file;
    }

    return new File([blob], file.name.replace(/\.(png|jpg|jpeg|webp)$/i, '.jpg'), {
      type: blob.type,
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}
