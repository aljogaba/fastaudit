/* =====================================================
   FASTAudit Core v0.1.0-dev
   Motor independiente para auditoría estructural de FASTA.
   No depende de prrsv2-nomenclature-lab.
   ===================================================== */

(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.FASTAuditCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const IUPAC = new Set("ACGTRYSWKMBDHVN".split(""));
  const CANONICAL = new Set("ACGT".split(""));
  const STOPS = new Set(["TAA", "TAG", "TGA"]);

  function normalizeSequence(value) {
    return String(value || "").replace(/\s+/g, "").toUpperCase();
  }

  function parseFasta(text) {
    const source = String(text || "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
    const lines = source.split("\n");
    const records = [];
    let current = null;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const raw = lines[lineIndex];
      const trimmed = raw.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith(">")) {
        if (current) records.push(current);
        const header = trimmed.slice(1).trim();
        current = {
          recordIndex: records.length + 1,
          header,
          id: header.split(/\s+/)[0] || `record_${records.length + 1}`,
          rawSequenceParts: []
        };
        continue;
      }

      if (!current) {
        throw new Error(`Se encontró contenido de secuencia antes del primer encabezado FASTA (línea ${lineIndex + 1}).`);
      }
      current.rawSequenceParts.push(trimmed);
    }

    if (current) records.push(current);
    if (!records.length) throw new Error("No se encontraron registros FASTA. Cada registro debe iniciar con >.");

    return records.map((record, index) => ({
      recordIndex: index + 1,
      header: record.header,
      id: record.id,
      sequence: normalizeSequence(record.rawSequenceParts.join(""))
    }));
  }

  function symbolCounts(sequence, predicate) {
    const counts = new Map();
    for (const symbol of sequence) {
      if (!predicate(symbol)) continue;
      counts.set(symbol, (counts.get(symbol) || 0) + 1);
    }
    return counts;
  }

  function mapToObject(map) {
    return Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b)));
  }

  function symbolSummary(object) {
    const entries = Object.entries(object || {});
    if (!entries.length) return "—";
    return entries.map(([symbol, count]) => `${symbol}:${count}`).join(" · ");
  }

  function analyzeCoding(sequence) {
    const frameMultiple3 = sequence.length > 0 && sequence.length % 3 === 0;
    const startATG = sequence.length >= 3 && sequence.slice(0, 3) === "ATG";
    const terminalCodon = sequence.length >= 3 ? sequence.slice(-3) : "";
    const terminalStop = frameMultiple3 && STOPS.has(terminalCodon);
    const internalStops = [];

    for (let i = 0; i + 2 < sequence.length; i += 3) {
      const codon = sequence.slice(i, i + 3);
      const isTrueTerminal = frameMultiple3 && i === sequence.length - 3;
      if (!isTrueTerminal && STOPS.has(codon)) {
        internalStops.push({ codon, ntPosition: i + 1, aaPosition: Math.floor(i / 3) + 1 });
      }
    }

    return {
      frameMultiple3,
      startATG,
      terminalCodon,
      terminalStop,
      internalStopCount: internalStops.length,
      internalStopCodons: internalStops.map((item) => item.codon),
      internalStopAaPositions: internalStops.map((item) => item.aaPosition),
      internalStopNtPositions: internalStops.map((item) => item.ntPosition)
    };
  }

  function analyzeRecord(record, options, headerOccurrences) {
    const sequence = record.sequence;
    const expectedLength = Number.isFinite(options.expectedLength) && options.expectedLength > 0
      ? options.expectedLength
      : null;

    const nonIupac = mapToObject(symbolCounts(sequence, (symbol) => !IUPAC.has(symbol)));
    const ambiguous = mapToObject(symbolCounts(sequence, (symbol) => IUPAC.has(symbol) && !CANONICAL.has(symbol)));
    const nonIupacCount = Object.values(nonIupac).reduce((sum, value) => sum + value, 0);
    const ambiguityCount = Object.values(ambiguous).reduce((sum, value) => sum + value, 0);
    const iupacValid = sequence.length > 0 && nonIupacCount === 0;
    const strictACGT = sequence.length > 0 && nonIupacCount === 0 && ambiguityCount === 0;

    const coding = options.codingMode
      ? analyzeCoding(sequence)
      : {
          frameMultiple3: null,
          startATG: null,
          terminalCodon: null,
          terminalStop: null,
          internalStopCount: null,
          internalStopCodons: [],
          internalStopAaPositions: [],
          internalStopNtPositions: []
        };

    return {
      recordIndex: record.recordIndex,
      id: record.id,
      header: record.header,
      sequence,
      lengthNt: sequence.length,
      expectedLength,
      expectedLengthMatch: expectedLength === null ? null : sequence.length === expectedLength,
      headerOccurrences,
      duplicateHeader: headerOccurrences > 1,
      iupacValid,
      nonIupacCount,
      nonIupacSymbols: nonIupac,
      nonIupacSummary: symbolSummary(nonIupac),
      ambiguityCount,
      ambiguitySymbols: ambiguous,
      ambiguitySummary: symbolSummary(ambiguous),
      strictACGT,
      alphabetClass: !iupacValid ? "NO_IUPAC" : strictACGT ? "ACGT_ESTRICTO" : "IUPAC_AMBIGUO",
      ...coding
    };
  }

  async function sha256(text) {
    const value = String(text || "");
    if (typeof globalThis !== "undefined" && globalThis.crypto && globalThis.crypto.subtle) {
      const bytes = new TextEncoder().encode(value);
      const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
      return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
    }

    if (typeof require === "function") {
      const crypto = require("node:crypto");
      return crypto.createHash("sha256").update(value, "utf8").digest("hex");
    }

    throw new Error("El entorno actual no ofrece una implementación SHA-256 compatible.");
  }

  function assignExactSequenceGroups(records) {
    const groups = new Map();
    records.forEach((record) => {
      const key = record.sequence;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record.recordIndex);
    });

    const metadata = new Map();
    let counter = 1;
    for (const [sequence, indices] of groups.entries()) {
      const haplotype = `H${String(counter).padStart(3, "0")}`;
      metadata.set(sequence, {
        haplotype,
        haplotypeSize: indices.length,
        sharedHaplotype: indices.length > 1,
        recordIndices: indices
      });
      counter += 1;
    }
    return { groups, metadata };
  }

  function summarize(records, options) {
    const sharedGroups = new Map();
    records.forEach((record) => {
      if (record.sharedHaplotype && !sharedGroups.has(record.haplotype)) {
        sharedGroups.set(record.haplotype, record.haplotypeSize);
      }
    });

    const lengths = {};
    records.forEach((record) => {
      lengths[record.lengthNt] = (lengths[record.lengthNt] || 0) + 1;
    });

    return {
      totalRecords: records.length,
      expectedLength: options.expectedLength || null,
      expectedLengthMatches: options.expectedLength
        ? records.filter((record) => record.expectedLengthMatch).length
        : null,
      duplicateHeaderRecords: records.filter((record) => record.duplicateHeader).length,
      duplicateHeaderGroups: new Set(records.filter((record) => record.duplicateHeader).map((record) => record.header)).size,
      iupacValidRecords: records.filter((record) => record.iupacValid).length,
      strictACGTRecords: records.filter((record) => record.strictACGT).length,
      ambiguousIupacRecords: records.filter((record) => record.iupacValid && !record.strictACGT).length,
      nonIupacRecords: records.filter((record) => !record.iupacValid).length,
      emptySequenceRecords: records.filter((record) => record.lengthNt === 0).length,
      uniqueSequences: new Set(records.map((record) => record.sequence)).size,
      sharedHaplotypeGroups: sharedGroups.size,
      sharedHaplotypeRecords: records.filter((record) => record.sharedHaplotype).length,
      codingMode: Boolean(options.codingMode),
      frameMultiple3Records: options.codingMode ? records.filter((record) => record.frameMultiple3).length : null,
      startATGRecords: options.codingMode ? records.filter((record) => record.startATG).length : null,
      terminalStopRecords: options.codingMode ? records.filter((record) => record.terminalStop).length : null,
      internalStopRecords: options.codingMode ? records.filter((record) => record.internalStopCount > 0).length : null,
      lengthDistribution: lengths
    };
  }

  async function analyzeDataset(text, inputOptions) {
    const options = {
      expectedLength: Number(inputOptions && inputOptions.expectedLength) > 0
        ? Number(inputOptions.expectedLength)
        : null,
      codingMode: Boolean(inputOptions && inputOptions.codingMode)
    };

    const parsed = parseFasta(text);
    const headerCountMap = new Map();
    parsed.forEach((record) => {
      headerCountMap.set(record.header, (headerCountMap.get(record.header) || 0) + 1);
    });

    const exactGroups = assignExactSequenceGroups(parsed);
    const analyzed = await Promise.all(parsed.map(async (record) => {
      const base = analyzeRecord(record, options, headerCountMap.get(record.header) || 1);
      const group = exactGroups.metadata.get(record.sequence);
      return {
        ...base,
        sequenceSha256: await sha256(record.sequence),
        haplotype: group.haplotype,
        haplotypeSize: group.haplotypeSize,
        sharedHaplotype: group.sharedHaplotype
      };
    }));

    return {
      options,
      records: analyzed,
      summary: summarize(analyzed, options)
    };
  }

  return {
    IUPAC,
    CANONICAL,
    STOPS,
    normalizeSequence,
    parseFasta,
    analyzeCoding,
    analyzeRecord,
    analyzeDataset,
    sha256,
    symbolSummary
  };
});
