/* =====================================================
   FASTAudit Core v0.2.0-dev
   Motor independiente para auditoría estructural e integridad de FASTA.
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
  const DEFAULT_HEADER_DELIMITER = "|";

  function normalizeSequence(value) {
    return String(value || "").replace(/\s+/g, "").toUpperCase();
  }

  function normalizeDelimiter(value) {
    if (value === null || typeof value === "undefined") return DEFAULT_HEADER_DELIMITER;
    return String(value);
  }

  function splitHeaderFields(header, delimiter = DEFAULT_HEADER_DELIMITER) {
    const text = String(header || "").trim();
    const normalizedDelimiter = normalizeDelimiter(delimiter);
    if (!normalizedDelimiter) return [text];
    return text.split(normalizedDelimiter).map((field) => field.trim());
  }

  function canonicalIdFromHeader(header, delimiter = DEFAULT_HEADER_DELIMITER) {
    const text = String(header || "").trim();
    if (!text) return "";
    const normalizedDelimiter = normalizeDelimiter(delimiter);
    if (normalizedDelimiter && text.includes(normalizedDelimiter)) {
      return text.split(normalizedDelimiter)[0].trim();
    }
    return text.split(/\s+/)[0] || "";
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

  function modeNumber(values) {
    if (!values.length) return null;
    const counts = new Map();
    values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
    return [...counts.entries()]
      .sort((a, b) => (b[1] - a[1]) || (a[0] - b[0]))[0][0];
  }

  function calculateLengthStats(records) {
    const lengths = records.map((record) => record.lengthNt).sort((a, b) => a - b);
    if (!lengths.length) {
      return { min: null, max: null, mean: null, median: null };
    }
    const total = lengths.reduce((sum, value) => sum + value, 0);
    const middle = Math.floor(lengths.length / 2);
    const median = lengths.length % 2
      ? lengths[middle]
      : (lengths[middle - 1] + lengths[middle]) / 2;
    return {
      min: lengths[0],
      max: lengths[lengths.length - 1],
      mean: total / lengths.length,
      median
    };
  }

  function analyzeRecord(record, options, context) {
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
      canonicalId: record.canonicalId,
      missingCanonicalId: !record.canonicalId,
      header: record.header,
      headerDelimiter: options.headerDelimiter,
      headerFields: record.headerFields,
      headerFieldCount: record.headerFields.length,
      expectedHeaderFieldCount: context.expectedHeaderFieldCount,
      headerFieldCountInconsistent:
        context.expectedHeaderFieldCount !== null && record.headerFields.length !== context.expectedHeaderFieldCount,
      sequence,
      lengthNt: sequence.length,
      expectedLength,
      expectedLengthMatch: expectedLength === null ? null : sequence.length === expectedLength,
      headerOccurrences: context.headerOccurrences,
      duplicateHeader: context.headerOccurrences > 1,
      canonicalIdOccurrences: context.canonicalIdOccurrences,
      duplicateCanonicalId: Boolean(record.canonicalId) && context.canonicalIdOccurrences > 1,
      canonicalIdSequenceVariants: context.canonicalIdSequenceVariants,
      idSequenceConflict: Boolean(record.canonicalId) && context.canonicalIdSequenceVariants > 1,
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

    const fieldCounts = {};
    records.forEach((record) => {
      fieldCounts[record.headerFieldCount] = (fieldCounts[record.headerFieldCount] || 0) + 1;
    });

    const duplicateCanonicalIds = new Set(
      records.filter((record) => record.duplicateCanonicalId).map((record) => record.canonicalId)
    );
    const idSequenceConflicts = new Set(
      records.filter((record) => record.idSequenceConflict).map((record) => record.canonicalId)
    );
    const lengthStats = calculateLengthStats(records);

    return {
      totalRecords: records.length,
      expectedLength: options.expectedLength || null,
      expectedLengthMatches: options.expectedLength
        ? records.filter((record) => record.expectedLengthMatch).length
        : null,
      duplicateHeaderRecords: records.filter((record) => record.duplicateHeader).length,
      duplicateHeaderGroups: new Set(records.filter((record) => record.duplicateHeader).map((record) => record.header)).size,
      duplicateCanonicalIdRecords: records.filter((record) => record.duplicateCanonicalId).length,
      duplicateCanonicalIdGroups: duplicateCanonicalIds.size,
      idSequenceConflictRecords: records.filter((record) => record.idSequenceConflict).length,
      idSequenceConflictGroups: idSequenceConflicts.size,
      missingCanonicalIdRecords: records.filter((record) => record.missingCanonicalId).length,
      expectedHeaderFieldCount: records.length ? records[0].expectedHeaderFieldCount : null,
      inconsistentHeaderFieldRecords: records.filter((record) => record.headerFieldCountInconsistent).length,
      headerFieldCountDistribution: fieldCounts,
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
      lengthMin: lengthStats.min,
      lengthMax: lengthStats.max,
      lengthMean: lengthStats.mean,
      lengthMedian: lengthStats.median,
      lengthDistribution: lengths
    };
  }

  function groupBy(records, keySelector, skipEmpty = false) {
    const groups = new Map();
    records.forEach((record) => {
      const key = keySelector(record);
      if (skipEmpty && !key) return;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    });
    return groups;
  }

  function setEquals(a, b) {
    if (a.size !== b.size) return false;
    for (const value of a) if (!b.has(value)) return false;
    return true;
  }

  function setIntersection(a, b) {
    return new Set([...a].filter((value) => b.has(value)));
  }

  function summarizeComparisonRows(rows, sequenceMapA, sequenceMapB) {
    const statusCounts = {};
    rows.forEach((row) => {
      statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
    });

    const commonSequences = new Set(
      [...sequenceMapA.keys()].filter((sequence) => sequenceMapB.has(sequence))
    );

    let relabeledSequenceCount = 0;
    commonSequences.forEach((sequence) => {
      const idsA = new Set(sequenceMapA.get(sequence).map((record) => record.canonicalId).filter(Boolean));
      const idsB = new Set(sequenceMapB.get(sequence).map((record) => record.canonicalId).filter(Boolean));
      if (idsA.size && idsB.size && setIntersection(idsA, idsB).size === 0) relabeledSequenceCount += 1;
    });

    const sequenceMultisetA = [...sequenceMapA.entries()]
      .flatMap(([sequence, records]) => Array(records.length).fill(sequence))
      .sort();
    const sequenceMultisetB = [...sequenceMapB.entries()]
      .flatMap(([sequence, records]) => Array(records.length).fill(sequence))
      .sort();

    return {
      comparedCanonicalIds: rows.length,
      preservedIds: statusCounts.PRESERVED || 0,
      headerChangedIds: statusCounts.HEADER_CHANGED || 0,
      modifiedSequenceIds: statusCounts.MODIFIED_SEQUENCE || 0,
      idSequenceSetChangedIds: statusCounts.ID_SEQUENCE_SET_CHANGED || 0,
      relabeledIdRows: statusCounts.ID_RENAMED_OR_RELABELED || 0,
      removedIds: statusCounts.REMOVED || 0,
      addedIds: statusCounts.ADDED || 0,
      exactSequenceOverlap: commonSequences.size,
      relabeledSequenceCount,
      sequenceMultisetPreserved:
        sequenceMultisetA.length === sequenceMultisetB.length &&
        sequenceMultisetA.every((value, index) => value === sequenceMultisetB[index])
    };
  }

  function compareAnalyses(analysisA, analysisB) {
    if (!analysisA || !analysisB || !analysisA.records || !analysisB.records) {
      throw new Error("Se requieren dos análisis FASTAudit válidos para comparar datasets.");
    }

    const byIdA = groupBy(analysisA.records, (record) => record.canonicalId, true);
    const byIdB = groupBy(analysisB.records, (record) => record.canonicalId, true);
    const bySequenceA = groupBy(analysisA.records, (record) => record.sequence);
    const bySequenceB = groupBy(analysisB.records, (record) => record.sequence);
    const allIds = [...new Set([...byIdA.keys(), ...byIdB.keys()])].sort((a, b) => a.localeCompare(b));

    const rows = allIds.map((canonicalId) => {
      const recordsA = byIdA.get(canonicalId) || [];
      const recordsB = byIdB.get(canonicalId) || [];
      const sequencesA = new Set(recordsA.map((record) => record.sequence));
      const sequencesB = new Set(recordsB.map((record) => record.sequence));
      const headersA = new Set(recordsA.map((record) => record.header));
      const headersB = new Set(recordsB.map((record) => record.header));
      const overlap = setIntersection(sequencesA, sequencesB);

      let status;
      let note = "";
      const counterpartIds = new Set();

      if (recordsA.length && recordsB.length) {
        if (setEquals(sequencesA, sequencesB)) {
          if (setEquals(headersA, headersB)) {
            status = "PRESERVED";
            note = "ID canónico, secuencia(s) y encabezado(s) preservados.";
          } else {
            status = "HEADER_CHANGED";
            note = "ID canónico y secuencia(s) preservados; cambió el texto del encabezado.";
          }
        } else if (overlap.size) {
          status = "ID_SEQUENCE_SET_CHANGED";
          note = "El ID existe en ambos datasets, pero cambió el conjunto de secuencias asociado.";
        } else {
          status = "MODIFIED_SEQUENCE";
          note = "El mismo ID canónico aparece con secuencia(s) diferente(s).";
        }
      } else {
        const sourceRecords = recordsA.length ? recordsA : recordsB;
        const otherSequenceMap = recordsA.length ? bySequenceB : bySequenceA;

        sourceRecords.forEach((record) => {
          const matches = otherSequenceMap.get(record.sequence) || [];
          matches.forEach((match) => {
            if (match.canonicalId && match.canonicalId !== canonicalId) counterpartIds.add(match.canonicalId);
          });
        });

        if (counterpartIds.size) {
          status = "ID_RENAMED_OR_RELABELED";
          note = "La secuencia exacta se conserva en el otro FASTA bajo otro ID canónico.";
        } else if (recordsA.length) {
          status = "REMOVED";
          note = "ID presente solo en el FASTA A y sin secuencia exacta equivalente en B.";
        } else {
          status = "ADDED";
          note = "ID presente solo en el FASTA B y sin secuencia exacta equivalente en A.";
        }
      }

      return {
        canonicalId,
        status,
        note,
        counterpartIds: [...counterpartIds].sort((a, b) => a.localeCompare(b)),
        recordsA: recordsA.length,
        recordsB: recordsB.length,
        uniqueSequencesA: sequencesA.size,
        uniqueSequencesB: sequencesB.size,
        headersA: [...headersA],
        headersB: [...headersB],
        headerChanged: recordsA.length > 0 && recordsB.length > 0 && !setEquals(headersA, headersB)
      };
    });

    return {
      rows,
      summary: summarizeComparisonRows(rows, bySequenceA, bySequenceB),
      datasetA: {
        totalRecords: analysisA.summary.totalRecords,
        uniqueSequences: analysisA.summary.uniqueSequences
      },
      datasetB: {
        totalRecords: analysisB.summary.totalRecords,
        uniqueSequences: analysisB.summary.uniqueSequences
      }
    };
  }

  async function analyzeDataset(text, inputOptions) {
    const options = {
      expectedLength: Number(inputOptions && inputOptions.expectedLength) > 0
        ? Number(inputOptions.expectedLength)
        : null,
      codingMode: Boolean(inputOptions && inputOptions.codingMode),
      headerDelimiter: normalizeDelimiter(
        inputOptions && Object.prototype.hasOwnProperty.call(inputOptions, "headerDelimiter")
          ? inputOptions.headerDelimiter
          : DEFAULT_HEADER_DELIMITER
      )
    };

    const parsed = parseFasta(text).map((record) => ({
      ...record,
      canonicalId: canonicalIdFromHeader(record.header, options.headerDelimiter),
      headerFields: splitHeaderFields(record.header, options.headerDelimiter)
    }));

    const headerCountMap = new Map();
    parsed.forEach((record) => {
      headerCountMap.set(record.header, (headerCountMap.get(record.header) || 0) + 1);
    });

    const canonicalIdCountMap = new Map();
    const canonicalIdSequenceMap = new Map();
    parsed.forEach((record) => {
      if (!record.canonicalId) return;
      canonicalIdCountMap.set(record.canonicalId, (canonicalIdCountMap.get(record.canonicalId) || 0) + 1);
      if (!canonicalIdSequenceMap.has(record.canonicalId)) canonicalIdSequenceMap.set(record.canonicalId, new Set());
      canonicalIdSequenceMap.get(record.canonicalId).add(record.sequence);
    });

    const expectedHeaderFieldCount = modeNumber(parsed.map((record) => record.headerFields.length));
    const exactGroups = assignExactSequenceGroups(parsed);

    const analyzed = await Promise.all(parsed.map(async (record) => {
      const base = analyzeRecord(record, options, {
        headerOccurrences: headerCountMap.get(record.header) || 1,
        canonicalIdOccurrences: record.canonicalId ? (canonicalIdCountMap.get(record.canonicalId) || 1) : 0,
        canonicalIdSequenceVariants: record.canonicalId
          ? (canonicalIdSequenceMap.get(record.canonicalId) || new Set()).size
          : 0,
        expectedHeaderFieldCount
      });
      const group = exactGroups.metadata.get(record.sequence);
      return {
        ...base,
        sequenceSha256: await sha256(record.sequence),
        haplotype: group.haplotype,
        haplotypeSize: group.haplotypeSize,
        sharedHaplotype: group.sharedHaplotype
      };
    }));

    const recordPairMaterial = analyzed
      .map((record) => `${record.canonicalId}\t${record.sequenceSha256}`)
      .sort()
      .join("\n");
    const sequenceMaterial = analyzed.map((record) => record.sequenceSha256).sort().join("\n");

    return {
      options,
      records: analyzed,
      summary: summarize(analyzed, options),
      fingerprints: {
        idSequencePairsSha256: await sha256(recordPairMaterial),
        sequenceMultisetSha256: await sha256(sequenceMaterial)
      }
    };
  }

  return {
    IUPAC,
    CANONICAL,
    STOPS,
    DEFAULT_HEADER_DELIMITER,
    normalizeSequence,
    splitHeaderFields,
    canonicalIdFromHeader,
    parseFasta,
    analyzeCoding,
    analyzeRecord,
    analyzeDataset,
    compareAnalyses,
    sha256,
    symbolSummary
  };
});
