import Link from 'next/link';
import { FileText, Upload, ArrowRight } from 'lucide-react';
import { listDocuments } from '@/modules/documents/application/documents-service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';

const STATUS_LABELS: Record<string, string> = {
  uploaded: 'Caricato',
  processing: 'In lavorazione',
  parsed: 'Pronto',
  needs_review: 'Da rivedere',
  approved: 'Approvato',
  imported: 'Importato',
  failed: 'Fallito',
};

export default async function DocumentsPage() {
  const { documents } = await listDocuments({ limit: 50 });

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Documenti</h1>
          <p className="text-sm text-muted-foreground">
            Caricamenti DDT e fatture con revisione prima dell&apos;import.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/dashboard/documents/upload">
            <Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Carica</span>
          </Link>
        </Button>
      </div>

      {documents.length === 0 ? (
        <Card className="flex flex-col items-center py-10 text-center">
          <FileText className="mb-3 h-12 w-12 text-muted-foreground" />
          <p className="font-medium">Nessun documento caricato</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Inizia dal caricamento per attivare il flusso di import assistito.
          </p>
        </Card>
      ) : (
        <ul className="space-y-2">
          {documents.map((document) => (
            <li key={document.id}>
              <Link
                href={`/dashboard/documents/${document.id}/review`}
                className="flex items-center justify-between rounded-lg border border-border bg-white p-3 transition hover:shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{document.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {document.document_type.toUpperCase()} ·{' '}
                    {new Date(document.created_at).toLocaleDateString('it-IT')}
                  </p>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  <Badge variant={document.status === 'failed' ? 'destructive' : 'outline'}>
                    {STATUS_LABELS[document.status] ?? document.status}
                  </Badge>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
