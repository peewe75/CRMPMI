import Link from 'next/link';
import { notFound } from 'next/navigation';
import { DocumentDeleteAction } from '@/components/documents/document-delete-action';
import { DocumentImportActions } from '@/components/documents/document-import-actions';
import { DocumentProposalActions } from '@/components/documents/document-proposal-actions';
import { DocumentReviewActions } from '@/components/documents/document-review-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getDocumentSignedUrl, getDocumentWithLines } from '@/modules/documents/application/documents-service';

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
  const previewUrl = await getDocumentSignedUrl(document.file_path).catch(() => null);
  const hasLowConfidenceLines = lines.some((line) => (line.confidence ?? 0) < 0.65 || !line.matched_variant_id);

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
          <DocumentProposalActions
            documentId={document.id}
            disabled={document.status === 'processing'}
          />
          <DocumentDeleteAction
            documentId={document.id}
            documentStatus={document.status}
            redirectTo="/dashboard/documents"
            buttonLabel="Elimina documento"
            variant="destructive"
          />
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/documents">Torna ai documenti</Link>
          </Button>
        </div>
      </div>

      <Card>
        <div className="space-y-2 text-sm">
          <p><span className="font-medium">Tipo:</span> {document.document_type}</p>
          <p><span className="font-medium">Capture type:</span> {document.capture_type ?? 'unknown'}</p>
          <p><span className="font-medium">Source channel:</span> {document.source_channel ?? 'upload'}</p>
          <p><span className="font-medium">Fornitore:</span> {document.supplier_name_raw ?? 'Non ancora estratto'}</p>
          <p><span className="font-medium">Stato:</span> {document.status}</p>
          <p><span className="font-medium">Confidenza parser:</span> {document.parser_confidence != null ? `${Math.round(document.parser_confidence * 100)}%` : 'n/d'}</p>
          <p><span className="font-medium">Review obbligatoria:</span> {document.requires_review ? 'si' : 'no'}</p>
          {hasLowConfidenceLines ? (
            <Badge variant="warning">Sono presenti righe a bassa confidence o non matchate</Badge>
          ) : null}
          {previewUrl ? (
            <div className="pt-2">
              {document.mime_type.startsWith('image/') ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewUrl} alt={document.file_name} className="max-h-72 rounded-lg border border-border object-contain" />
              ) : (
                <Button asChild variant="outline" size="sm">
                  <a href={previewUrl} target="_blank" rel="noreferrer">Apri preview</a>
                </Button>
              )}
            </div>
          ) : null}
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
              <li
                key={line.id}
                className={`rounded-lg border p-3 ${
                  (line.confidence ?? 0) < 0.65 || !line.matched_variant_id
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{line.raw_description}</p>
                  <div className="flex gap-2">
                    <Badge variant={line.matched_variant_id ? 'success' : 'warning'}>
                      {line.matched_variant_id ? 'match' : 'review'}
                    </Badge>
                    <Badge variant="outline">
                      {line.confidence != null ? `${Math.round(line.confidence * 100)}%` : 'n/d'}
                    </Badge>
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Qta {line.quantity ?? '-'} - Taglia {line.size_raw ?? '-'} - Colore {line.color_raw ?? '-'}
                </p>
                {!line.matched_variant_id ? (
                  <p className="mt-1 text-xs text-amber-700">
                    Variante non risolta: questa riga richiede conferma manuale prima dell&apos;apply.
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
