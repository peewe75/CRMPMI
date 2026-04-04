import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ProposalReviewEditor } from '@/components/proposals/proposal-review-editor';
import { Button } from '@/components/ui/button';
import { getProposal } from '@/modules/proposals/application/proposals-service';

export default async function ProposalDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proposalData = await getProposal(id).catch(() => null);

  if (!proposalData) {
    notFound();
  }

  return (
    <div className="space-y-4 p-4">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/dashboard/proposals">
            <ArrowLeft className="h-4 w-4" />
            Torna alle proposte
          </Link>
        </Button>
      </div>

      <ProposalReviewEditor proposal={proposalData.proposal} items={proposalData.items} />
    </div>
  );
}
