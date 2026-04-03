'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FileUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function DocumentUploadPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<'invoice' | 'ddt' | 'unknown'>('unknown');
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
            <select
              value={documentType}
              onChange={(event) => setDocumentType(event.target.value as 'invoice' | 'ddt' | 'unknown')}
              className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm"
            >
              <option value="unknown">Non specificato</option>
              <option value="invoice">Fattura</option>
              <option value="ddt">DDT</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">File</label>
            <Input
              type="file"
              accept=".pdf,image/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
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
