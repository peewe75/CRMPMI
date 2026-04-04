import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ProposalCardActions } from '@/components/proposals/proposal-card-actions';
import { listProposals } from '@/modules/proposals/application/proposals-service';

export default async function ProposalsPage() {
  const { proposals } = await listProposals({ limit: 50 });

  return (
    <div className="space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold">Proposte</h1>
        <p className="text-sm text-muted-foreground">
          Inbox unificata per input vocali, documentali e multimodali da confermare prima dei movimenti.
        </p>
      </div>

      {proposals.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">
          Nessuna proposta presente.
        </Card>
      ) : (
        <ul className="space-y-2">
          {proposals.map((proposal) => (
            <li key={proposal.id}>
              <Card className="space-y-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">
                      <Link href={`/dashboard/proposals/${proposal.id}`} className="underline underline-offset-2">
                        {proposal.proposal_type} da {proposal.source_type}
                      </Link>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(proposal.created_at).toLocaleString('it-IT')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{proposal.status}</Badge>
                    <Badge variant="outline">{proposal.confidence != null ? `${Math.round(proposal.confidence * 100)}%` : 'n/d'}</Badge>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground">
                  {proposal.raw_input ?? 'Nessun input raw disponibile'}
                </p>

                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <Link href={`/dashboard/proposals/${proposal.id}`} className="text-accent underline underline-offset-2">
                    Apri review proposta
                  </Link>
                  {proposal.source_uploaded_document_id ? (
                    <Link
                      href={`/dashboard/documents/${proposal.source_uploaded_document_id}/review`}
                      className="text-accent underline underline-offset-2"
                    >
                      Apri documento sorgente
                    </Link>
                  ) : null}
                </div>

                <ProposalCardActions
                  proposalId={proposal.id}
                  status={proposal.status}
                />
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
