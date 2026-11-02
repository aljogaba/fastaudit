const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../js/fastaudit-core.js");

test("parseFasta normaliza mayúsculas y secuencias multilínea", () => {
  const records = core.parseFasta(">seq1 descripción\natgacg\nttaa\n>seq2\nNNNN\n");
  assert.equal(records.length, 2);
  assert.equal(records[0].id, "seq1");
  assert.equal(records[0].sequence, "ATGACGTTAA");
  assert.equal(records[1].sequence, "NNNN");
});

test("analyzeDataset distingue ACGT, ambigüedad, no-IUPAC, duplicados y haplotipos exactos", async () => {
  const fasta = [
    ">dup",
    "ATGAAATAA",
    ">dup",
    "ATGAAATAA",
    ">amb",
    "ATGNNNTAA",
    ">bad",
    "ATGAA-TAA"
  ].join("\n");

  const result = await core.analyzeDataset(fasta, { expectedLength: 9, codingMode: true });

  assert.equal(result.summary.totalRecords, 4);
  assert.equal(result.summary.expectedLengthMatches, 4);
  assert.equal(result.summary.duplicateHeaderGroups, 1);
  assert.equal(result.summary.strictACGTRecords, 2);
  assert.equal(result.summary.ambiguousIupacRecords, 1);
  assert.equal(result.summary.nonIupacRecords, 1);
  assert.equal(result.summary.uniqueSequences, 3);
  assert.equal(result.summary.sharedHaplotypeGroups, 1);
  assert.equal(result.summary.sharedHaplotypeRecords, 2);

  const first = result.records[0];
  const second = result.records[1];
  const ambiguous = result.records[2];
  const invalid = result.records[3];

  assert.equal(first.duplicateHeader, true);
  assert.equal(first.haplotype, second.haplotype);
  assert.equal(first.sequenceSha256, second.sequenceSha256);
  assert.equal(first.haplotypeSize, 2);
  assert.equal(ambiguous.ambiguityCount, 3);
  assert.equal(ambiguous.ambiguitySymbols.N, 3);
  assert.equal(invalid.nonIupacCount, 1);
  assert.equal(invalid.nonIupacSymbols["-"], 1);
});

test("modo codificante detecta ATG, stop terminal e internal stops en marco 0", async () => {
  const result = await core.analyzeDataset(">cds\nATGTAAGGGTAA\n", { expectedLength: 12, codingMode: true });
  const record = result.records[0];

  assert.equal(record.frameMultiple3, true);
  assert.equal(record.startATG, true);
  assert.equal(record.terminalCodon, "TAA");
  assert.equal(record.terminalStop, true);
  assert.equal(record.internalStopCount, 1);
  assert.deepEqual(record.internalStopCodons, ["TAA"]);
  assert.deepEqual(record.internalStopAaPositions, [2]);
});

test("sin modo codificante los controles de CDS quedan como no aplicables", async () => {
  const result = await core.analyzeDataset(">region\nACGTACGT\n", { expectedLength: null, codingMode: false });
  const record = result.records[0];

  assert.equal(record.expectedLengthMatch, null);
  assert.equal(record.startATG, null);
  assert.equal(record.terminalStop, null);
  assert.equal(record.internalStopCount, null);
  assert.equal(result.summary.expectedLengthMatches, null);
});

test("parseFasta rechaza contenido antes del primer encabezado", () => {
  assert.throws(() => core.parseFasta("ACGT\n>seq\nACGT"), /antes del primer encabezado FASTA/);
});
