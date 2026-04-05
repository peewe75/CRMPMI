'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

export default function DocumentUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<'invoice' | 'ddt' | 'unknown'>('unknown');
  const [captureType, setCaptureType] = useState<'pdf_document' | 'printed_document_photo' | 'handwritten_note' | 'mixed_document' | 'unknown'>('unknown');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError('Seleziona un file prima di continuare.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set('file', file);
    formData.set('document_type', documentType);
    formData.set('capture_type', file.type.startsWith('image/') && captureType === 'unknown' ? 'printed_document_photo' : captureType);
    formData.set('source_channel', 'upload');

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Upload non riuscito');
      }

      router.push(`/dashboard/documents/${payload.document.id}/review`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Upload non riuscito');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold">Carica documento</h1>
        <p className="text-sm text-muted-foreground">
          Il file viene salvato in area privata e poi revisionato prima dell&apos;import.
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Tipo documento</label>
            <Select
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value as 'invoice' | 'ddt' | 'unknown')}
              options={[
                { value: 'unknown', label: 'Non specificato' },
                { value: 'invoice', label: 'Fattura' },
                { value: 'ddt', label: 'DDT' },
              ]}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">File</label>
            <Input
              type="file"
              accept=".pdf,image/*"
              capture={captureType === 'pdf_document' ? undefined : 'environment'}
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Tipo acquisizione</label>
            <Select
              value={captureType}
              onChange={(event) => setCaptureType(event.target.value as 'pdf_document' | 'printed_document_photo' | 'handwritten_note' | 'mixed_document' | 'unknown')}
              options={[
                { value: 'unknown', label: 'Non specificato' },
                { value: 'pdf_document', label: 'PDF / documento digitale' },
                { value: 'printed_document_photo', label: 'Foto documento stampato' },
                { value: 'handwritten_note', label: 'Foto foglio scritto a mano' },
                { value: 'mixed_document', label: 'Foto documento misto' },
              ]}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Le foto documento e i fogli scritti a mano entrano sempre in review prima di qualsiasi proposta di magazzino.
            </p>
          </div>

          {error ? (
            <div className="space-y-2">
              <p className="text-sm text-destructive">{error}</p>
              {error.toLowerCase().includes('limite documenti') ? (
                <Link
                  href="/dashboard/settings"
                  className="inline-flex text-sm font-medium text-accent underline underline-offset-2"
                >
                  Vai in Impostazioni e aumenta il limite nel billing placeholder
                </Link>
              ) : null}
            </div>
          ) : null}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            <FileUp className="h-4 w-4" />
            {isSubmitting ? 'Caricamento...' : 'Carica documento'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
