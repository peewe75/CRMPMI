import assert from 'node:assert/strict';
import { parseVoiceTranscript } from '../src/modules/voice/application/voice-intent-parser';

const cases = [
  { input: 'vendute 2 nike js numero 44', expectedIntent: 'inventory_outbound', expectedItems: 1, expectedSize: '44' },
  { input: 'vendute due nike js numero 44', expectedIntent: 'inventory_outbound', expectedItems: 1, expectedSize: '44', expectedQuantity: 2, expectedBrand: 'Nike' },
  { input: 'ho venduto due nike js numero 44', expectedIntent: 'inventory_outbound', expectedItems: 1, expectedSize: '44', expectedQuantity: 2, expectedBrand: 'Nike' },
  { input: 'vendute 2 nike js 1 numero 43 e 1 numero 44', expectedIntent: 'inventory_outbound', expectedItems: 2 },
  { input: 'caricate 3 adidas samba 42 nere', expectedIntent: 'inventory_inbound', expectedItems: 1, expectedColor: 'Nero' },
  { input: 'rettifica nike js 44 meno 1', expectedIntent: 'inventory_adjustment', expectedItems: 1, expectedDelta: -1 },
  { input: 'quante nike js 44 ho?', expectedIntent: 'stock_lookup', expectedItems: 1 },
  { input: 'c e disponibilita delle adidas samba 42 nere', expectedIntent: 'stock_lookup', expectedItems: 1 },
  { input: 'quante jordan 1 rosse 43 sono rimaste?', expectedIntent: 'stock_lookup', expectedItems: 1, expectedColor: 'Rosso' },
];

for (const testCase of cases) {
  const parsed = parseVoiceTranscript(testCase.input);
  assert.equal(parsed.intent, testCase.expectedIntent);
  assert.equal(parsed.command.items.length, testCase.expectedItems);

  if ('expectedSize' in testCase && testCase.expectedSize) {
    assert.equal(parsed.command.items[0]?.size, testCase.expectedSize);
  }

  if ('expectedColor' in testCase && testCase.expectedColor) {
    assert.equal(parsed.command.items[0]?.color, testCase.expectedColor);
  }

  if ('expectedDelta' in testCase && testCase.expectedDelta != null) {
    assert.equal(parsed.command.items[0]?.quantity_delta, testCase.expectedDelta);
  }

  if ('expectedQuantity' in testCase && testCase.expectedQuantity != null) {
    assert.equal(parsed.command.items[0]?.quantity, testCase.expectedQuantity);
  }

  if ('expectedBrand' in testCase && testCase.expectedBrand) {
    assert.equal(parsed.command.items[0]?.brand, testCase.expectedBrand);
  }
}

console.log(`Voice parser tests passed: ${cases.length}`);
