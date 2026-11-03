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

test("ID canónico usa por defecto el primer campo antes de | y conserva encabezado completo", async () => {
  const result = await core.analyzeDataset(
    ">00000|cepa A|2026|Jalisco\nATGAAATAA\n>ABC-123 descripción libre\nATGCCCTAA\n",
    { expectedLength: 9, codingMode: true }
  );

  assert.equal(result.records[0].canonicalId, "00000");
  assert.deepEqual(result.records[0].headerFields, ["00000", "cepa A", "2026", "Jalisco"]);
  assert.equal(result.records[0].header, "00000|cepa A|2026|Jalisco");
  assert.equal(result.records[1].canonicalId, "ABC-123");
  assert.equal(result.records[1].headerFieldCount, 1);
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
  assert.equal(result.summary.duplicateCanonicalIdGroups, 1);
  assert.equal(result.summary.idSequenceConflictGroups, 0);
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
  assert.equal(first.duplicateCanonicalId, true);
  assert.equal(first.haplotype, second.haplotype);
  assert.equal(first.sequenceSha256, second.sequenceSha256);
  assert.equal(first.haplotypeSize, 2);
  assert.equal(ambiguous.ambiguityCount, 3);
  assert.equal(ambiguous.ambiguitySymbols.N, 3);
  assert.equal(invalid.nonIupacCount, 1);
  assert.equal(invalid.nonIupacSymbols["-"], 1);
});

test("detecta conflicto fuerte cuando un mismo ID canónico tiene secuencias distintas", async () => {
  const fasta = [
    ">A001|muestra_1",
    "ATGAAATAA",
    ">A001|muestra_2",
    "ATGCCCTAA",
    ">B001|muestra_3",
    "ATGAAATAA"
  ].join("\n");

  const result = await core.analyzeDataset(fasta, { expectedLength: 9, codingMode: true });

  assert.equal(result.summary.duplicateCanonicalIdGroups, 1);
  assert.equal(result.summary.idSequenceConflictGroups, 1);
  assert.equal(result.summary.idSequenceConflictRecords, 2);
  assert.equal(result.records[0].canonicalIdSequenceVariants, 2);
  assert.equal(result.records[0].idSequenceConflict, true);
  assert.equal(result.records[1].idSequenceConflict, true);
  assert.equal(result.records[2].idSequenceConflict, false);
});

test("audita consistencia del número de campos de encabezado y estadísticos de longitud", async () => {
  const fasta = [
    ">A|uno|dos",
    "AAAA",
    ">B|uno|dos",
    "AAAAAA",
    ">C|uno",
    "AAAAAAAA"
  ].join("\n");

  const result = await core.analyzeDataset(fasta, {
    expectedLength: null,
    codingMode: false,
    headerDelimiter: "|"
  });

  assert.equal(result.summary.expectedHeaderFieldCount, 3);
  assert.equal(result.summary.inconsistentHeaderFieldRecords, 1);
  assert.deepEqual(result.summary.headerFieldCountDistribution, { 2: 1, 3: 2 });
  assert.equal(result.summary.lengthMin, 4);
  assert.equal(result.summary.lengthMax, 8);
  assert.equal(result.summary.lengthMean, 6);
  assert.equal(result.summary.lengthMedian, 6);
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

test("comparación de dos FASTA distingue preservación, cambio de encabezado, modificación, relabel, altas y bajas", async () => {
  const fastaA = [
    ">KEEP|old",
    "AAAA",
    ">HEAD|old",
    "CCCC",
    ">MOD|old",
    "GGGG",
    ">RENAME_OLD|old",
    "TTTT",
    ">REMOVE|old",
    "ACAC"
  ].join("\n");

  const fastaB = [
    ">KEEP|old",
    "AAAA",
    ">HEAD|new",
    "CCCC",
    ">MOD|new",
    "GAGA",
    ">RENAME_NEW|new",
    "TTTT",
    ">ADD|new",
    "CACA"
  ].join("\n");

  const a = await core.analyzeDataset(fastaA, { codingMode: false, headerDelimiter: "|" });
  const b = await core.analyzeDataset(fastaB, { codingMode: false, headerDelimiter: "|" });
  const comparison = core.compareAnalyses(a, b);
  const byId = new Map(comparison.rows.map((row) => [row.canonicalId, row]));

  assert.equal(byId.get("KEEP").status, "PRESERVED");
  assert.equal(byId.get("HEAD").status, "HEADER_CHANGED");
  assert.equal(byId.get("MOD").status, "MODIFIED_SEQUENCE");
  assert.equal(byId.get("RENAME_OLD").status, "ID_RENAMED_OR_RELABELED");
  assert.deepEqual(byId.get("RENAME_OLD").counterpartIds, ["RENAME_NEW"]);
  assert.equal(byId.get("RENAME_NEW").status, "ID_RENAMED_OR_RELABELED");
  assert.equal(byId.get("REMOVE").status, "REMOVED");
  assert.equal(byId.get("ADD").status, "ADDED");
  assert.equal(comparison.summary.relabeledSequenceCount, 1);
  assert.equal(comparison.summary.sequenceMultisetPreserved, false);
});

test("fingerprints distinguen contenido de secuencia y emparejamiento ID-secuencia", async () => {
  const a = await core.analyzeDataset(">A|x\nAAAA\n>B|x\nCCCC\n", { codingMode: false });
  const b = await core.analyzeDataset(">B|x\nAAAA\n>A|x\nCCCC\n", { codingMode: false });

  assert.equal(a.fingerprints.sequenceMultisetSha256, b.fingerprints.sequenceMultisetSha256);
  assert.notEqual(a.fingerprints.idSequencePairsSha256, b.fingerprints.idSequencePairsSha256);
});

test("parseFasta rechaza contenido antes del primer encabezado", () => {
  assert.throws(() => core.parseFasta("ACGT\n>seq\nACGT"), /antes del primer encabezado FASTA/);
});
