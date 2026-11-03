/* =====================================================
   FASTAudit UI v0.2.0-dev
   Interfaz, exportación CSV, comparación y reporte HTML autónomo.
   ===================================================== */

(() => {
  "use strict";

  const core = window.FASTAuditCore;
  if (!core) throw new Error("FASTAuditCore no está disponible.");

  const $ = (selector) => document.querySelector(selector);
  const els = {
    file: $("#fasta-file"),
    text: $("#fasta-text"),
    compareFile: $("#compare-file"),
    expectedLength: $("#expected-length"),
    headerDelimiter: $("#header-delimiter"),
    codingMode: $("#coding-mode"),
    analyze: $("#analyze-button"),
    reset: $("#reset-button"),
    message: $("#form-message"),
    dropZone: $("#drop-zone"),
    resultsPanel: $("#results-panel"),
    summaryGrid: $("#summary-grid"),
    datasetMeta: $("#dataset-meta"),
    resultsBody: $("#results-body"),
    comparisonPanel: $("#comparison-panel"),
    comparisonMeta: $("#comparison-meta"),
    comparisonSummary: $("#comparison-summary"),
    comparisonBody: $("#comparison-body"),
    reportPanel: $("#report-panel"),
    reportPreview: $("#report-preview"),
    downloadCsv: $("#download-csv"),
    downloadComparisonCsv: $("#download-comparison-csv"),
    downloadReport: $("#download-report")
  };

  const state = {
    analysis: null,
    sourceName: null,
    comparison: null,
    comparisonAnalysis: null,
    comparisonSourceName: null,
    analyzedAt: null
  };

  const comparisonLabels = {
    PRESERVED: "Preservado",
    HEADER_CHANGED: "Encabezado cambiado",
    MODIFIED_SEQUENCE: "Secuencia modificada",
    ID_SEQUENCE_SET_CHANGED: "Conjunto ID/secuencia cambió",
    ID_RENAMED_OR_RELABELED: "ID renombrado/re-etiquetado",
    REMOVED: "Eliminado",
    ADDED: "Añadido"
  };

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function showMessage(message) {
    els.message.textContent = message;
    els.message.hidden = false;
  }

  function clearMessage() {
    els.message.textContent = "";
    els.message.hidden = true;
  }

  function statusChip(value, labels = { yes: "Sí", no: "No", na: "N/A" }, inverse = false) {
    if (value === null || typeof value === "undefined") return `<span class="status-chip neutral">${labels.na}</span>`;
    const ok = inverse ? !value : Boolean(value);
    return `<span class="status-chip ${ok ? "ok" : "bad"}">${value ? labels.yes : labels.no}</span>`;
  }

  function comparisonChip(status) {
    const label = comparisonLabels[status] || status;
    const className = status === "PRESERVED"
      ? "ok"
      : ["MODIFIED_SEQUENCE", "ID_SEQUENCE_SET_CHANGED"].includes(status)
        ? "bad"
        : "warn";
    return `<span class="status-chip ${className}">${escapeHtml(label)}</span>`;
  }

  function alphabetChip(record) {
    if (!record.iupacValid) return '<span class="status-chip bad">No-IUPAC</span>';
    if (record.strictACGT) return '<span class="status-chip ok">ACGT estricto</span>';
    return '<span class="status-chip warn">IUPAC ambiguo</span>';
  }

  function summaryCard(label, value, detail) {
    return `<article class="summary-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(detail)}</small></article>`;
  }

  function formatNumber(value, digits = 1) {
    if (value === null || typeof value === "undefined" || Number.isNaN(value)) return "—";
    return Number.isInteger(value) ? String(value) : Number(value).toFixed(digits);
  }

  function shortHash(value) {
    return value ? `${value.slice(0, 12)}…` : "—";
  }

  function renderSummary() {
    const { summary, options, fingerprints } = state.analysis;
    const expected = options.expectedLength
      ? `${summary.expectedLengthMatches}/${summary.totalRecords}`
      : "—";

    els.summaryGrid.innerHTML = [
      summaryCard("Registros", summary.totalRecords, "Secuencias FASTA analizadas"),
      summaryCard("Longitud esperada", expected, options.expectedLength ? `${options.expectedLength} nt` : "Sin criterio activo"),
      summaryCard("Longitud", `${summary.lengthMin}–${summary.lengthMax}`, `Media ${formatNumber(summary.lengthMean)} · mediana ${formatNumber(summary.lengthMedian)} nt`),
      summaryCard("IDs duplicados", summary.duplicateCanonicalIdGroups, `${summary.duplicateCanonicalIdRecords} registros implicados`),
      summaryCard("Conflictos ID/secuencia", summary.idSequenceConflictGroups, "Mismo ID canónico con secuencias distintas"),
      summaryCard("Campos irregulares", summary.inconsistentHeaderFieldRecords, `Patrón modal: ${summary.expectedHeaderFieldCount ?? "—"} campo(s)`),
      summaryCard("ACGT estricto", summary.strictACGTRecords, "Sin códigos ambiguos ni caracteres inválidos"),
      summaryCard("Haplotipos compartidos", summary.sharedHaplotypeGroups, `${summary.sharedHaplotypeRecords} registros en grupos idénticos`)
    ].join("");

    const chips = [
      `Fuente: ${state.sourceName}`,
      `Analizado: ${state.analyzedAt.toLocaleString("es-MX")}`,
      options.expectedLength ? `Longitud objetivo: ${options.expectedLength} nt` : "Sin longitud objetivo",
      `Delimitador: ${options.headerDelimiter || "(sin división)"}`,
      options.codingMode ? "Modo codificante activo" : "Modo codificante inactivo",
      `Secuencias únicas: ${summary.uniqueSequences}`,
      `Encabezados duplicados: ${summary.duplicateHeaderGroups} grupos`,
      `Huella secuencias: ${shortHash(fingerprints.sequenceMultisetSha256)}`,
      `Huella ID–secuencia: ${shortHash(fingerprints.idSequencePairsSha256)}`
    ];
    els.datasetMeta.innerHTML = chips.map((item) => `<span class="meta-chip">${escapeHtml(item)}</span>`).join("");
  }

  function renderTable() {
    els.resultsBody.innerHTML = state.analysis.records.map((record) => {
      const stopPositions = record.internalStopAaPositions.length ? record.internalStopAaPositions.join(", ") : "—";
      const fields = record.headerFields.map((field, index) => `${index + 1}:${field}`).join(" · ");
      const idOccurrence = record.missingCanonicalId
        ? '<span class="status-chip bad">ID ausente</span>'
        : `${record.canonicalIdOccurrences}${record.duplicateCanonicalId ? ' <span class="status-chip warn">Duplicado</span>' : ""}`;
      return `
        <tr>
          <td>${record.recordIndex}</td>
          <td class="mono">${escapeHtml(record.canonicalId || "(sin ID)")}</td>
          <td class="header-cell">${escapeHtml(record.header || "(sin texto)")}</td>
          <td>${record.headerFieldCount}${record.headerFieldCountInconsistent ? ' <span class="status-chip warn">Irregular</span>' : ""}<div class="symbol-list">${escapeHtml(fields)}</div></td>
          <td><strong>${record.lengthNt}</strong></td>
          <td>${statusChip(record.expectedLengthMatch, { yes: "Coincide", no: "No coincide", na: "Sin criterio" })}</td>
          <td>${idOccurrence}</td>
          <td>${record.idSequenceConflict
            ? `<span class="status-chip bad">Conflicto</span><div class="symbol-list">${record.canonicalIdSequenceVariants} secuencias</div>`
            : '<span class="status-chip ok">Sin conflicto</span>'}</td>
          <td>${record.headerOccurrences}${record.duplicateHeader ? ' <span class="status-chip warn">Duplicado</span>' : ""}</td>
          <td>${alphabetChip(record)}</td>
          <td>${record.nonIupacCount}<div class="symbol-list mono">${escapeHtml(record.nonIupacSummary)}</div></td>
          <td>${record.ambiguityCount}<div class="symbol-list mono">${escapeHtml(record.ambiguitySummary)}</div></td>
          <td>${statusChip(record.startATG, { yes: "ATG", no: "No ATG", na: "N/A" })}</td>
          <td>${record.terminalCodon ? `<span class="mono">${escapeHtml(record.terminalCodon)}</span><br>` : ""}${statusChip(record.terminalStop, { yes: "Stop", no: "Sin stop", na: "N/A" })}</td>
          <td>${record.internalStopCount === null ? "—" : record.internalStopCount}<div class="symbol-list">AA: ${escapeHtml(stopPositions)}</div></td>
          <td class="hash-cell mono">${escapeHtml(record.sequenceSha256)}</td>
          <td><span class="mono">${escapeHtml(record.haplotype)}</span><br><small>${record.haplotypeSize} registro(s)</small></td>
          <td>${statusChip(record.sharedHaplotype, { yes: "Compartido", no: "Único", na: "N/A" })}</td>
        </tr>`;
    }).join("");
  }

  function renderComparison() {
    if (!state.comparison) {
      els.comparisonPanel.hidden = true;
      els.downloadComparisonCsv.hidden = true;
      return;
    }

    const summary = state.comparison.summary;
    els.comparisonMeta.innerHTML = [
      `FASTA A: ${state.sourceName}`,
      `FASTA B: ${state.comparisonSourceName}`,
      `Registros A: ${state.comparison.datasetA.totalRecords}`,
      `Registros B: ${state.comparison.datasetB.totalRecords}`,
      summary.sequenceMultisetPreserved ? "Multiconjunto de secuencias preservado" : "Cambió el multiconjunto de secuencias"
    ].map((item) => `<span class="meta-chip">${escapeHtml(item)}</span>`).join("");

    els.comparisonSummary.innerHTML = [
      summaryCard("IDs preservados", summary.preservedIds, "Mismo ID, secuencia y encabezado"),
      summaryCard("Encabezados cambiados", summary.headerChangedIds, "Mismo ID y secuencia; cambió texto del encabezado"),
      summaryCard("Secuencia modificada", summary.modifiedSequenceIds + summary.idSequenceSetChangedIds, "Mismo ID con contenido nucleotídico diferente"),
      summaryCard("Secuencias re-etiquetadas", summary.relabeledSequenceCount, "Misma secuencia exacta bajo otro ID"),
      summaryCard("IDs eliminados", summary.removedIds, "Solo en FASTA A"),
      summaryCard("IDs añadidos", summary.addedIds, "Solo en FASTA B"),
      summaryCard("Secuencias comunes", summary.exactSequenceOverlap, "Secuencias únicas exactas presentes en ambos"),
      summaryCard("Contenido global", summary.sequenceMultisetPreserved ? "Preservado" : "Cambió", "Compara el multiconjunto completo de secuencias")
    ].join("");

    els.comparisonBody.innerHTML = state.comparison.rows.map((row) => `
      <tr>
        <td class="mono">${escapeHtml(row.canonicalId)}</td>
        <td>${comparisonChip(row.status)}</td>
        <td>${row.recordsA}</td>
        <td>${row.recordsB}</td>
        <td>${row.uniqueSequencesA}</td>
        <td>${row.uniqueSequencesB}</td>
        <td class="mono">${escapeHtml(row.counterpartIds.join(", ") || "—")}</td>
        <td>${escapeHtml(row.note)}</td>
      </tr>
    `).join("");

    els.comparisonPanel.hidden = false;
    els.downloadComparisonCsv.hidden = false;
  }

  function renderReportPreview() {
    const { summary, options } = state.analysis;
    const findings = [];
    if (summary.idSequenceConflictGroups) findings.push(`${summary.idSequenceConflictGroups} ID(s) canónico(s) están asociados a más de una secuencia distinta.`);
    if (summary.duplicateCanonicalIdGroups) findings.push(`${summary.duplicateCanonicalIdGroups} ID(s) canónico(s) aparecen más de una vez.`);
    if (summary.inconsistentHeaderFieldRecords) findings.push(`${summary.inconsistentHeaderFieldRecords} registro(s) tienen un número de campos distinto del patrón modal (${summary.expectedHeaderFieldCount}).`);
    if (summary.nonIupacRecords) findings.push(`${summary.nonIupacRecords} registro(s) contienen caracteres no-IUPAC.`);
    if (summary.ambiguousIupacRecords) findings.push(`${summary.ambiguousIupacRecords} registro(s) son IUPAC válidos pero contienen ambigüedades.`);
    if (summary.duplicateHeaderGroups) findings.push(`${summary.duplicateHeaderGroups} encabezado(s) completos aparecen más de una vez.`);
    if (summary.sharedHaplotypeGroups) findings.push(`${summary.sharedHaplotypeGroups} grupo(s) contienen secuencias idénticas.`);
    if (options.expectedLength && summary.expectedLengthMatches !== summary.totalRecords) {
      findings.push(`${summary.totalRecords - summary.expectedLengthMatches} registro(s) no coinciden con la longitud esperada de ${options.expectedLength} nt.`);
    }
    if (options.codingMode && summary.internalStopRecords) findings.push(`${summary.internalStopRecords} registro(s) presentan uno o más stops internos en marco 0.`);
    if (!findings.length) findings.push("No se identificaron alertas con los criterios activos en este análisis.");

    const comparisonText = state.comparison
      ? `<p>Se comparó además con <strong>${escapeHtml(state.comparisonSourceName)}</strong>: ${state.comparison.summary.preservedIds} ID(s) preservados, ${state.comparison.summary.modifiedSequenceIds + state.comparison.summary.idSequenceSetChangedIds} con cambios de secuencia y ${state.comparison.summary.relabeledSequenceCount} secuencia(s) exacta(s) re-etiquetada(s).</p>`
      : "";

    els.reportPreview.innerHTML = `
      <h3>Resumen para reporte</h3>
      <p>FASTAudit analizó <strong>${summary.totalRecords}</strong> registros de <strong>${escapeHtml(state.sourceName)}</strong>. El análisis se ejecutó localmente en el navegador.</p>
      ${comparisonText}
      <ul>${findings.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  }

  function renderResults() {
    renderSummary();
    renderTable();
    renderComparison();
    renderReportPreview();
    els.resultsPanel.hidden = false;
    els.reportPanel.hidden = false;
    els.resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function readPrimaryInput() {
    const selectedFile = els.file.files && els.file.files[0];
    if (selectedFile) {
      return { text: await selectedFile.text(), sourceName: selectedFile.name };
    }
    const pasted = els.text.value.trim();
    if (pasted) return { text: pasted, sourceName: "FASTA pegado en la interfaz" };
    throw new Error("Seleccione un archivo FASTA o pegue contenido FASTA antes de analizar.");
  }

  async function readComparisonInput() {
    const selectedFile = els.compareFile.files && els.compareFile.files[0];
    if (!selectedFile) return null;
    return { text: await selectedFile.text(), sourceName: selectedFile.name };
  }

  async function analyze() {
    clearMessage();
    els.analyze.disabled = true;
    const previousLabel = els.analyze.textContent;
    els.analyze.textContent = "Analizando…";

    try {
      const input = await readPrimaryInput();
      const compareInput = await readComparisonInput();
      const expectedRaw = els.expectedLength.value.trim();
      const expectedLength = expectedRaw === "" ? null : Number(expectedRaw);
      if (expectedRaw !== "" && (!Number.isInteger(expectedLength) || expectedLength <= 0)) {
        throw new Error("La longitud esperada debe ser un entero positivo o dejarse vacía.");
      }

      const options = {
        expectedLength,
        codingMode: els.codingMode.checked,
        headerDelimiter: els.headerDelimiter.value
      };

      state.analysis = await core.analyzeDataset(input.text, options);
      state.sourceName = input.sourceName;
      state.analyzedAt = new Date();

      if (compareInput) {
        state.comparisonAnalysis = await core.analyzeDataset(compareInput.text, options);
        state.comparison = core.compareAnalyses(state.analysis, state.comparisonAnalysis);
        state.comparisonSourceName = compareInput.sourceName;
      } else {
        state.comparison = null;
        state.comparisonAnalysis = null;
        state.comparisonSourceName = null;
      }

      renderResults();
    } catch (error) {
      state.analysis = null;
      state.comparison = null;
      state.comparisonAnalysis = null;
      els.resultsPanel.hidden = true;
      els.reportPanel.hidden = true;
      els.comparisonPanel.hidden = true;
      showMessage(error && error.message ? error.message : "No fue posible analizar el FASTA.");
    } finally {
      els.analyze.disabled = false;
      els.analyze.textContent = previousLabel;
    }
  }

  function csvEscape(value) {
    const stringValue = Array.isArray(value) ? value.join(";") : String(value ?? "");
    if (/[",\n]/.test(stringValue)) return `"${stringValue.replace(/"/g, '""')}"`;
    return stringValue;
  }

  function resultsToCsv() {
    const maxFields = Math.max(...state.analysis.records.map((record) => record.headerFields.length), 1);
    const fieldHeaders = Array.from({ length: maxFields }, (_, index) => `header_field_${index + 1}`);
    const headers = [
      "record_index", "id", "canonical_id", "missing_canonical_id", "header", "header_delimiter",
      "header_field_count", "expected_header_field_count", "header_field_count_inconsistent", ...fieldHeaders,
      "length_nt", "expected_length", "expected_length_match",
      "canonical_id_occurrences", "duplicate_canonical_id", "canonical_id_sequence_variants", "id_sequence_conflict",
      "header_occurrences", "duplicate_header", "iupac_valid", "non_iupac_count", "non_iupac_symbols",
      "ambiguity_count", "ambiguity_symbols", "strict_acgt", "alphabet_class", "frame_multiple_3",
      "start_ATG", "terminal_codon", "terminal_stop", "internal_stop_count", "internal_stop_codons",
      "internal_stop_aa_positions", "sequence_sha256", "haplotype", "haplotype_size", "shared_haplotype"
    ];

    const rows = state.analysis.records.map((record) => {
      const fields = Array.from({ length: maxFields }, (_, index) => record.headerFields[index] ?? "");
      return [
        record.recordIndex, record.id, record.canonicalId, record.missingCanonicalId, record.header, record.headerDelimiter,
        record.headerFieldCount, record.expectedHeaderFieldCount ?? "", record.headerFieldCountInconsistent, ...fields,
        record.lengthNt, record.expectedLength ?? "", record.expectedLengthMatch ?? "",
        record.canonicalIdOccurrences, record.duplicateCanonicalId, record.canonicalIdSequenceVariants, record.idSequenceConflict,
        record.headerOccurrences, record.duplicateHeader, record.iupacValid,
        record.nonIupacCount, record.nonIupacSummary === "—" ? "" : record.nonIupacSummary,
        record.ambiguityCount, record.ambiguitySummary === "—" ? "" : record.ambiguitySummary,
        record.strictACGT, record.alphabetClass, record.frameMultiple3 ?? "", record.startATG ?? "",
        record.terminalCodon ?? "", record.terminalStop ?? "", record.internalStopCount ?? "",
        record.internalStopCodons, record.internalStopAaPositions, record.sequenceSha256, record.haplotype,
        record.haplotypeSize, record.sharedHaplotype
      ];
    });

    return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  }

  function comparisonToCsv() {
    if (!state.comparison) return "";
    const headers = [
      "canonical_id", "status", "records_A", "records_B", "unique_sequences_A", "unique_sequences_B",
      "counterpart_ids", "header_changed", "headers_A", "headers_B", "note"
    ];
    const rows = state.comparison.rows.map((row) => [
      row.canonicalId, row.status, row.recordsA, row.recordsB, row.uniqueSequencesA, row.uniqueSequencesB,
      row.counterpartIds, row.headerChanged, row.headersA, row.headersB, row.note
    ]);
    return [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
  }

  function downloadBlob(content, fileName, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function safeFileStem(value) {
    return String(value || "fasta")
      .replace(/\.[^.]+$/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "_")
      .replace(/^_+|_+$/g, "") || "fasta";
  }

  function reportHtml() {
    const { summary, options, records, fingerprints } = state.analysis;
    const tableRows = records.map((record) => `
      <tr>
        <td>${record.recordIndex}</td><td>${escapeHtml(record.canonicalId || "(sin ID)")}</td><td>${escapeHtml(record.header)}</td>
        <td>${record.headerFieldCount}</td><td>${record.lengthNt}</td>
        <td>${record.expectedLengthMatch === null ? "N/A" : record.expectedLengthMatch ? "Sí" : "No"}</td>
        <td>${record.canonicalIdOccurrences}</td><td>${record.idSequenceConflict ? "CONFLICTO" : "No"}</td>
        <td>${record.headerOccurrences}</td><td>${escapeHtml(record.alphabetClass)}</td><td>${record.nonIupacCount}</td>
        <td>${escapeHtml(record.nonIupacSummary)}</td><td>${record.ambiguityCount}</td><td>${escapeHtml(record.ambiguitySummary)}</td>
        <td>${record.startATG === null ? "N/A" : record.startATG ? "Sí" : "No"}</td>
        <td>${escapeHtml(record.terminalCodon || "N/A")}</td><td>${record.terminalStop === null ? "N/A" : record.terminalStop ? "Sí" : "No"}</td>
        <td>${record.internalStopCount === null ? "N/A" : record.internalStopCount}</td>
        <td>${escapeHtml(record.internalStopAaPositions.join(", ") || "—")}</td>
        <td class="mono">${escapeHtml(record.sequenceSha256)}</td><td>${escapeHtml(record.haplotype)}</td><td>${record.haplotypeSize}</td>
      </tr>`).join("");

    const comparisonSection = state.comparison ? `
<div class="section"><h2>Comparación de datasets</h2>
<p><strong>FASTA A:</strong> ${escapeHtml(state.sourceName)} · <strong>FASTA B:</strong> ${escapeHtml(state.comparisonSourceName)}</p>
<p><strong>Secuencias exactas comunes:</strong> ${state.comparison.summary.exactSequenceOverlap} ·
<strong>Secuencias re-etiquetadas:</strong> ${state.comparison.summary.relabeledSequenceCount} ·
<strong>Multiconjunto preservado:</strong> ${state.comparison.summary.sequenceMultisetPreserved ? "Sí" : "No"}</p>
<div class="table"><table><thead><tr><th>ID canónico</th><th>Estado</th><th>Registros A</th><th>Registros B</th><th>Sec. A</th><th>Sec. B</th><th>ID equivalente</th><th>Observación</th></tr></thead>
<tbody>${state.comparison.rows.map((row) => `<tr><td>${escapeHtml(row.canonicalId)}</td><td>${escapeHtml(comparisonLabels[row.status] || row.status)}</td><td>${row.recordsA}</td><td>${row.recordsB}</td><td>${row.uniqueSequencesA}</td><td>${row.uniqueSequencesB}</td><td>${escapeHtml(row.counterpartIds.join(", ") || "—")}</td><td>${escapeHtml(row.note)}</td></tr>`).join("")}</tbody></table></div></div>` : "";

    return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reporte FASTAudit · ${escapeHtml(state.sourceName)}</title>
<style>
body{font-family:Arial,sans-serif;color:#18302b;margin:0;background:#edf3f0}.wrap{max-width:1600px;margin:0 auto;padding:32px}.head{background:#174c42;color:#fff;padding:24px;border-radius:16px}.head h1{margin:0 0 6px}.head p{margin:4px 0;color:#dcece6}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:18px 0}.card{background:#fff;border:1px solid #d8e2de;border-radius:12px;padding:14px}.card small{display:block;color:#61706c}.card strong{font-size:24px;color:#174c42}.section{background:#fff;border:1px solid #d8e2de;border-radius:14px;padding:18px;margin:16px 0}.table{overflow:auto}.table table{border-collapse:collapse;width:100%;min-width:1600px}.table th,.table td{padding:8px;border-bottom:1px solid #d8e2de;text-align:left;vertical-align:top;font-size:12px}.table th{background:#f3f7f5}.mono{font-family:monospace;word-break:break-all}.foot{color:#61706c;font-size:12px;margin-top:18px}@media(max-width:800px){.grid{grid-template-columns:1fr 1fr}.wrap{padding:16px}}
</style></head><body><div class="wrap">
<div class="head"><h1>FASTAudit</h1><p>Auditor de calidad e integridad de secuencias FASTA · v0.2.0-dev</p><p>Autor: Alberto Jorge Galindo-Barboza · Laboratorio de Sistemas Porcícolas</p></div>
<div class="section"><h2>Metadatos del análisis</h2><p><strong>Fuente:</strong> ${escapeHtml(state.sourceName)}</p><p><strong>Fecha y hora:</strong> ${escapeHtml(state.analyzedAt.toLocaleString("es-MX"))}</p><p><strong>Longitud esperada:</strong> ${options.expectedLength ? `${options.expectedLength} nt` : "Sin criterio"}</p><p><strong>Delimitador de encabezado:</strong> ${escapeHtml(options.headerDelimiter || "(sin división)")}</p><p><strong>Modo codificante:</strong> ${options.codingMode ? "Sí" : "No"}</p><p><strong>SHA-256 multiconjunto de secuencias:</strong> <span class="mono">${escapeHtml(fingerprints.sequenceMultisetSha256)}</span></p><p><strong>SHA-256 pares ID–secuencia:</strong> <span class="mono">${escapeHtml(fingerprints.idSequencePairsSha256)}</span></p><p>El análisis se ejecutó localmente en el navegador; FASTAudit no envía las secuencias a un servidor.</p></div>
<div class="grid">
<div class="card"><small>Registros</small><strong>${summary.totalRecords}</strong></div>
<div class="card"><small>IDs duplicados</small><strong>${summary.duplicateCanonicalIdGroups}</strong></div>
<div class="card"><small>Conflictos ID/secuencia</small><strong>${summary.idSequenceConflictGroups}</strong></div>
<div class="card"><small>Campos irregulares</small><strong>${summary.inconsistentHeaderFieldRecords}</strong></div>
<div class="card"><small>Secuencias únicas</small><strong>${summary.uniqueSequences}</strong></div>
<div class="card"><small>Haplotipos compartidos</small><strong>${summary.sharedHaplotypeGroups}</strong></div>
<div class="card"><small>Longitud min–max</small><strong>${summary.lengthMin}–${summary.lengthMax}</strong></div>
<div class="card"><small>Longitud esperada</small><strong>${options.expectedLength ? `${summary.expectedLengthMatches}/${summary.totalRecords}` : "N/A"}</strong></div>
</div>
<div class="section table"><h2>Resultados por registro</h2><table><thead><tr><th>#</th><th>ID canónico</th><th>Encabezado</th><th>Campos</th><th>Longitud</th><th>Longitud esperada</th><th>ID ocurrencias</th><th>Conflicto ID/sec.</th><th>Encab. ocurrencias</th><th>Alfabeto</th><th>No-IUPAC</th><th>Símbolos no-IUPAC</th><th>Ambigüedades</th><th>Símbolos ambiguos</th><th>ATG</th><th>Codón terminal</th><th>Stop terminal</th><th>Stops internos</th><th>Posiciones AA</th><th>SHA-256</th><th>Haplotipo</th><th>Tamaño grupo</th></tr></thead><tbody>${tableRows}</tbody></table></div>
${comparisonSection}
<p class="foot">Cita sugerida: Galindo-Barboza, A. J. (2026). <em>FASTAudit: Auditor de calidad e integridad de secuencias FASTA</em> (v0.2.0-dev). Laboratorio de Sistemas Porcícolas. © 2026 Alberto Jorge Galindo-Barboza. Todos los derechos reservados.</p>
</div></body></html>`;
  }

  function reset() {
    els.file.value = "";
    els.text.value = "";
    els.compareFile.value = "";
    els.expectedLength.value = "603";
    els.headerDelimiter.value = "|";
    els.codingMode.checked = true;
    clearMessage();
    state.analysis = null;
    state.sourceName = null;
    state.comparison = null;
    state.comparisonAnalysis = null;
    state.comparisonSourceName = null;
    state.analyzedAt = null;
    els.resultsPanel.hidden = true;
    els.reportPanel.hidden = true;
    els.comparisonPanel.hidden = true;
    els.downloadComparisonCsv.hidden = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  els.analyze.addEventListener("click", analyze);
  els.reset.addEventListener("click", reset);

  els.downloadCsv.addEventListener("click", () => {
    if (!state.analysis) return;
    const stem = safeFileStem(state.sourceName);
    downloadBlob("\uFEFF" + resultsToCsv(), `${stem}_fastaudit_qc.csv`, "text/csv;charset=utf-8");
  });

  els.downloadComparisonCsv.addEventListener("click", () => {
    if (!state.comparison) return;
    const stemA = safeFileStem(state.sourceName);
    const stemB = safeFileStem(state.comparisonSourceName);
    downloadBlob("\uFEFF" + comparisonToCsv(), `${stemA}_vs_${stemB}_fastaudit_comparison.csv`, "text/csv;charset=utf-8");
  });

  els.downloadReport.addEventListener("click", () => {
    if (!state.analysis) return;
    const stem = safeFileStem(state.sourceName);
    downloadBlob(reportHtml(), `${stem}_fastaudit_report.html`, "text/html;charset=utf-8");
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.remove("dragover");
    });
  });

  els.dropZone.addEventListener("drop", (event) => {
    const files = event.dataTransfer && event.dataTransfer.files;
    if (!files || !files.length) return;
    const transfer = new DataTransfer();
    transfer.items.add(files[0]);
    els.file.files = transfer.files;
  });
})();
