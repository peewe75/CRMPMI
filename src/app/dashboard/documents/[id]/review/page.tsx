import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getDocumentWithLines } from '@/modules/documents/application/documents-service';
import { DocumentImportActions } from '@/components/documents/document-import-actions';
import { DocumentReviewActions } from '@/components/documents/document-review-actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default async function DocumentReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reviewData = await getDocumentWithLines(id).catch(() => null);

  if (!reviewData) {
    notFound();
  }

  const { document, lines } = reviewData;

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold">Revisione documento</h1>
          <p className="text-sm text-muted-foreground">{document.file_name}</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <div className="flex gap-2">
            <Badge variant="outline">{document.status}</Badge>
          </div>
          <DocumentReviewActions
            documentId={document.id}
            status={document.status}
          />
          <DocumentImportActions
            documentId={document.id}
            status={document.status}
            lineCount={lines.length}
          />
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/documents">Torna ai documenti</Link>
          </Button>
        </div>
      </div>

      <Card>
        <div className="space-y-2 text-sm">
          <p><span className="font-medium">Tipo:</span> {document.document_type}</p>
          <p><span className="font-medium">Fornitore:</span> {document.supplier_name_raw ?? 'Non ancora estratto'}</p>
          <p><span className="font-medium">Stato:</span> {document.status}</p>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Righe rilevate</h2>
          <Badge variant="outline">{lines.length}</Badge>
        </div>

        {lines.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Nessuna riga presente. Avvia il parsing per estrarre le righe del documento.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {lines.map((line) => (
              <li key={line.id} className="rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{line.raw_description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Qta {line.quantity ?? '-'} - Taglia {line.size_raw ?? '-'} - Colore {line.color_raw ?? '-'}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
