import { readFile } from 'node:fs/promises';
import { MockDocumentParser } from '../src/modules/documents/infrastructure/mock-document-parser';
import {
  getVisibleDashboardQuickActions,
  getVisibleDashboardSections,
  getVisibleMobileNavItems,
  getVisibleMorePageLinks,
  getVisibleSidebarItems,
} from '../src/lib/navigation/dashboard-navigation';
import type { FeatureFlags } from '../src/types/database';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function runParserSmoke() {
  const fixturePath = new URL('./fixtures/brunella-invoice.txt', import.meta.url);
  const rawText = await readFile(fixturePath, 'utf8');
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response(rawText, {
      status: 200,
      headers: {
        'content-type': 'text/plain; charset=utf-8',
      },
    });

  try {
    const parser = new MockDocumentParser();
    const result = await parser.parse({
      fileUrl: 'https://example.test/brunella-invoice.txt',
      mimeType: 'text/plain',
      documentType: 'invoice',
    });

    assert(result.header.supplier_name === 'BRUNELLA ACCESSORI S.R.L.', 'Supplier name not extracted');
    assert(result.header.document_number === 'FT-2026-0417', 'Document number not extracted');
    assert(result.header.document_date === '2026-04-03', 'Document date not normalized');
    assert(result.line_items.length === 4, `Expected 4 parsed lines, got ${result.line_items.length}`);
    assert(result.line_items[0]?.raw_description === 'Sneaker pelle bianca', 'First line description mismatch');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function runNavigationSmoke() {
  const restrictedFlags: FeatureFlags = {
    voice_input: false,
    document_import: false,
    barcode_scan: false,
    multi_store: false,
  };

  const sidebarLabels = getVisibleSidebarItems(restrictedFlags).map((item) => item.label);
  const mobileLabels = getVisibleMobileNavItems(restrictedFlags).map((item) => item.label);
  const quickActionLabels = getVisibleDashboardQuickActions(restrictedFlags).map((item) => item.label);
  const sectionLabels = getVisibleDashboardSections(restrictedFlags).map((item) => item.label);
  const moreLabels = getVisibleMorePageLinks(restrictedFlags).map((item) => item.label);

  assert(!sidebarLabels.includes('Documenti'), 'Sidebar should hide documents when feature disabled');
  assert(!sidebarLabels.includes('Scanner'), 'Sidebar should hide scanner when feature disabled');
  assert(!sidebarLabels.includes('Input Vocale'), 'Sidebar should hide voice when feature disabled');
  assert(!mobileLabels.includes('Scan'), 'Mobile nav should hide scan when feature disabled');
  assert(!mobileLabels.includes('Documenti'), 'Mobile nav should hide documents when feature disabled');
  assert(!quickActionLabels.includes('Scansiona'), 'Quick actions should hide scan when feature disabled');
  assert(!quickActionLabels.includes('Voce'), 'Quick actions should hide voice when feature disabled');
  assert(!quickActionLabels.includes('Carica Doc'), 'Quick actions should hide documents when feature disabled');
  assert(!sectionLabels.includes('Documenti'), 'Dashboard section should hide documents when feature disabled');
  assert(!moreLabels.includes('Input vocale'), 'More page should hide voice when feature disabled');
  assert(!sidebarLabels.includes('Strumenti'), 'Sidebar should drop empty tool separators');
}

async function main() {
  await runParserSmoke();
  runNavigationSmoke();
  console.log('Smoke checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
