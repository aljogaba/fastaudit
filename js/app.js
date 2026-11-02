/* =====================================================
   FASTAudit UI v0.1.0-dev
   Interfaz, exportación CSV y reporte HTML autónomo.
   ===================================================== */

(() => {
  "use strict";

  const core = window.FASTAuditCore;
  if (!core) throw new Error("FASTAuditCore no está disponible.");

  const $ = (selector) => document.querySelector(selector);
  const els = {
    file: $("#fasta-file"),
    text: $("#fasta-text"),
    expectedLength: $("#expected-length"),
    codingMode: $("#coding-mode"),
    analyze: $("#analyze-button"),
    reset: $("#reset-button"),
    message: $("#form-message"),
    dropZone: $("#drop-zone"),
    resultsPanel: $("#results-panel"),
    summaryGrid: $("#summary-grid"),
    datasetMeta: $("#dataset-meta"),
    resultsBody: $("#results-body"),
    reportPanel: $("#report-panel"),
    reportPreview: $("#report-preview"),
    downloadCsv: $("#download-csv"),
    downloadReport: $("#download-report")
  };

  const state = {
    analysis: null,
    sourceName: null,
    analyzedAt: null
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

  function alphabetChip(record) {
    if (!record.iupacValid) return '<span class="status-chip bad">No-IUPAC</span>';
    if (record.strictACGT) return '<span class="status-chip ok">ACGT estricto</span>';
    return '<span class="status-chip warn">IUPAC ambiguo</span>';
  }

  function summaryCard(label, value, detail) {
    return `<article class="summary-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(detail)}</small></article>`;
  }

  function renderSummary() {
    const { summary, options } = state.analysis;
    const expected = options.expectedLength
      ? `${summary.expectedLengthMatches}/${summary.totalRecords}`
      : "—";

    els.summaryGrid.innerHTML = [
      summaryCard("Registros", summary.totalRecords, "Secuencias FASTA analizadas"),
      summaryCard("Longitud esperada", expected, options.expectedLength ? `${options.expectedLength} nt` : "Sin criterio activo"),
      summaryCard("ACGT estricto", summary.strictACGTRecords, "Sin códigos ambiguos ni caracteres inválidos"),
      summaryCard("IUPAC ambiguo", summary.ambiguousIupacRecords, "Válidas con códigos de ambigüedad"),
      summaryCard("No-IUPAC", summary.nonIupacRecords, "Registros con símbolos fuera del alfabeto"),
      summaryCard("Haplotipos compartidos", summary.sharedHaplotypeGroups, `${summary.sharedHaplotypeRecords} registros en grupos idénticos`)
    ].join("");

    const chips = [
      `Fuente: ${state.sourceName}`,
      `Analizado: ${state.analyzedAt.toLocaleString("es-MX")}`,
      options.expectedLength ? `Longitud objetivo: ${options.expectedLength} nt` : "Sin longitud objetivo",
      options.codingMode ? "Modo codificante activo" : "Modo codificante inactivo",
      `Secuencias únicas: ${summary.uniqueSequences}`,
      `Encabezados duplicados: ${summary.duplicateHeaderGroups} grupos`
    ];
    els.datasetMeta.innerHTML = chips.map((item) => `<span class="meta-chip">${escapeHtml(item)}</span>`).join("");
  }

  function renderTable() {
    els.resultsBody.innerHTML = state.analysis.records.map((record) => {
      const stopPositions = record.internalStopAaPositions.length ? record.internalStopAaPositions.join(", ") : "—";
      return `
        <tr>
          <td>${record.recordIndex}</td>
          <td class="mono">${escapeHtml(record.id)}</td>
          <td class="header-cell">${escapeHtml(record.header || "(sin texto)")}</td>
          <td><strong>${record.lengthNt}</strong></td>
          <td>${statusChip(record.expectedLengthMatch, { yes: "Coincide", no: "No coincide", na: "Sin criterio" })}</td>
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

  function renderReportPreview() {
    const { summary, options } = state.analysis;
    const findings = [];
    if (summary.nonIupacRecords) findings.push(`${summary.nonIupacRecords} registro(s) contienen caracteres no-IUPAC.`);
    if (summary.ambiguousIupacRecords) findings.push(`${summary.ambiguousIupacRecords} registro(s) son IUPAC válidos pero contienen ambigüedades.`);
    if (summary.duplicateHeaderGroups) findings.push(`${summary.duplicateHeaderGroups} encabezado(s) aparecen más de una vez.`);
    if (summary.sharedHaplotypeGroups) findings.push(`${summary.sharedHaplotypeGroups} grupo(s) contienen secuencias idénticas.`);
    if (options.expectedLength && summary.expectedLengthMatches !== summary.totalRecords) {
      findings.push(`${summary.totalRecords - summary.expectedLengthMatches} registro(s) no coinciden con la longitud esperada de ${options.expectedLength} nt.`);
    }
    if (options.codingMode && summary.internalStopRecords) findings.push(`${summary.internalStopRecords} registro(s) presentan uno o más stops internos en marco 0.`);
    if (!findings.length) findings.push("No se identificaron alertas con los criterios activos en este análisis.");

    els.reportPreview.innerHTML = `
      <h3>Resumen para reporte</h3>
      <p>FASTAudit analizó <strong>${summary.totalRecords}</strong> registros de <strong>${escapeHtml(state.sourceName)}</strong>. El análisis se ejecutó localmente en el navegador.</p>
      <ul>${findings.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  }

  function renderResults() {
    renderSummary();
    renderTable();
    renderReportPreview();
    els.resultsPanel.hidden = false;
    els.reportPanel.hidden = false;
    els.resultsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function readInput() {
    const selectedFile = els.file.files && els.file.files[0];
    if (selectedFile) {
      return { text: await selectedFile.text(), sourceName: selectedFile.name };
    }
    const pasted = els.text.value.trim();
    if (pasted) return { text: pasted, sourceName: "FASTA pegado en la interfaz" };
    throw new Error("Seleccione un archivo FASTA o pegue contenido FASTA antes de analizar.");
  }

  async function analyze() {
    clearMessage();
    els.analyze.disabled = true;
    const previousLabel = els.analyze.textContent;
    els.analyze.textContent = "Analizando…";

    try {
      const input = await readInput();
      const expectedRaw = els.expectedLength.value.trim();
      const expectedLength = expectedRaw === "" ? null : Number(expectedRaw);
      if (expectedRaw !== "" && (!Number.isInteger(expectedLength) || expectedLength <= 0)) {
        throw new Error("La longitud esperada debe ser un entero positivo o dejarse vacía.");
      }

      state.analysis = await core.analyzeDataset(input.text, {
        expectedLength,
        codingMode: els.codingMode.checked
      });
      state.sourceName = input.sourceName;
      state.analyzedAt = new Date();
      renderResults();
    } catch (error) {
      state.analysis = null;
      els.resultsPanel.hidden = true;
      els.reportPanel.hidden = true;
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
    const headers = [
      "record_index", "id", "header", "length_nt", "expected_length", "expected_length_match",
      "header_occurrences", "duplicate_header", "iupac_valid", "non_iupac_count", "non_iupac_symbols",
      "ambiguity_count", "ambiguity_symbols", "strict_acgt", "alphabet_class", "frame_multiple_3",
      "start_ATG", "terminal_codon", "terminal_stop", "internal_stop_count", "internal_stop_codons",
      "internal_stop_aa_positions", "sequence_sha256", "haplotype", "haplotype_size", "shared_haplotype"
    ];

    const rows = state.analysis.records.map((record) => [
      record.recordIndex, record.id, record.header, record.lengthNt, record.expectedLength ?? "",
      record.expectedLengthMatch ?? "", record.headerOccurrences, record.duplicateHeader, record.iupacValid,
      record.nonIupacCount, record.nonIupacSummary === "—" ? "" : record.nonIupacSummary,
      record.ambiguityCount, record.ambiguitySummary === "—" ? "" : record.ambiguitySummary,
      record.strictACGT, record.alphabetClass, record.frameMultiple3 ?? "", record.startATG ?? "",
      record.terminalCodon ?? "", record.terminalStop ?? "", record.internalStopCount ?? "",
      record.internalStopCodons, record.internalStopAaPositions, record.sequenceSha256, record.haplotype,
      record.haplotypeSize, record.sharedHaplotype
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
    const { summary, options, records } = state.analysis;
    const tableRows = records.map((record) => `
      <tr>
        <td>${record.recordIndex}</td><td>${escapeHtml(record.id)}</td><td>${escapeHtml(record.header)}</td>
        <td>${record.lengthNt}</td><td>${record.expectedLengthMatch === null ? "N/A" : record.expectedLengthMatch ? "Sí" : "No"}</td>
        <td>${record.headerOccurrences}</td><td>${escapeHtml(record.alphabetClass)}</td><td>${record.nonIupacCount}</td>
        <td>${escapeHtml(record.nonIupacSummary)}</td><td>${record.ambiguityCount}</td><td>${escapeHtml(record.ambiguitySummary)}</td>
        <td>${record.startATG === null ? "N/A" : record.startATG ? "Sí" : "No"}</td>
        <td>${escapeHtml(record.terminalCodon || "N/A")}</td><td>${record.terminalStop === null ? "N/A" : record.terminalStop ? "Sí" : "No"}</td>
        <td>${record.internalStopCount === null ? "N/A" : record.internalStopCount}</td>
        <td>${escapeHtml(record.internalStopAaPositions.join(", ") || "—")}</td>
        <td class="mono">${escapeHtml(record.sequenceSha256)}</td><td>${escapeHtml(record.haplotype)}</td><td>${record.haplotypeSize}</td>
      </tr>`).join("");

    return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reporte FASTAudit · ${escapeHtml(state.sourceName)}</title>
<style>
body{font-family:Arial,sans-serif;color:#18302b;margin:0;background:#edf3f0}.wrap{max-width:1500px;margin:0 auto;padding:32px}.head{background:#174c42;color:#fff;padding:24px;border-radius:16px}.head h1{margin:0 0 6px}.head p{margin:4px 0;color:#dcece6}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:18px 0}.card{background:#fff;border:1px solid #d8e2de;border-radius:12px;padding:14px}.card small{display:block;color:#61706c}.card strong{font-size:24px;color:#174c42}.section{background:#fff;border:1px solid #d8e2de;border-radius:14px;padding:18px;margin:16px 0}.table{overflow:auto}.table table{border-collapse:collapse;width:100%;min-width:1500px}.table th,.table td{padding:8px;border-bottom:1px solid #d8e2de;text-align:left;vertical-align:top;font-size:12px}.table th{background:#f3f7f5}.mono{font-family:monospace;word-break:break-all}.foot{color:#61706c;font-size:12px;margin-top:18px}@media(max-width:800px){.grid{grid-template-columns:1fr 1fr}.wrap{padding:16px}}
</style></head><body><div class="wrap">
<div class="head"><h1>FASTAudit</h1><p>Auditor de calidad e integridad de secuencias FASTA · v0.1.0-dev</p><p>Autor: Alberto Jorge Galindo-Barboza · Laboratorio de Sistemas Porcícolas</p></div>
<div class="section"><h2>Metadatos del análisis</h2><p><strong>Fuente:</strong> ${escapeHtml(state.sourceName)}</p><p><strong>Fecha y hora:</strong> ${escapeHtml(state.analyzedAt.toLocaleString("es-MX"))}</p><p><strong>Longitud esperada:</strong> ${options.expectedLength ? `${options.expectedLength} nt` : "Sin criterio"}</p><p><strong>Modo codificante:</strong> ${options.codingMode ? "Sí" : "No"}</p><p>El análisis se ejecutó localmente en el navegador; FASTAudit no envía las secuencias a un servidor.</p></div>
<div class="grid">
<div class="card"><small>Registros</small><strong>${summary.totalRecords}</strong></div>
<div class="card"><small>ACGT estricto</small><strong>${summary.strictACGTRecords}</strong></div>
<div class="card"><small>IUPAC ambiguo</small><strong>${summary.ambiguousIupacRecords}</strong></div>
<div class="card"><small>No-IUPAC</small><strong>${summary.nonIupacRecords}</strong></div>
<div class="card"><small>Secuencias únicas</small><strong>${summary.uniqueSequences}</strong></div>
<div class="card"><small>Haplotipos compartidos</small><strong>${summary.sharedHaplotypeGroups}</strong></div>
<div class="card"><small>Encabezados duplicados</small><strong>${summary.duplicateHeaderGroups}</strong></div>
<div class="card"><small>Longitud esperada</small><strong>${options.expectedLength ? `${summary.expectedLengthMatches}/${summary.totalRecords}` : "N/A"}</strong></div>
</div>
<div class="section table"><h2>Resultados por registro</h2><table><thead><tr><th>#</th><th>ID</th><th>Encabezado</th><th>Longitud</th><th>Longitud esperada</th><th>Encab. ocurrencias</th><th>Alfabeto</th><th>No-IUPAC</th><th>Símbolos no-IUPAC</th><th>Ambigüedades</th><th>Símbolos ambiguos</th><th>ATG</th><th>Codón terminal</th><th>Stop terminal</th><th>Stops internos</th><th>Posiciones AA</th><th>SHA-256</th><th>Haplotipo</th><th>Tamaño grupo</th></tr></thead><tbody>${tableRows}</tbody></table></div>
<p class="foot">Cita sugerida: Galindo-Barboza, A. J. (2026). <em>FASTAudit: Auditor de calidad e integridad de secuencias FASTA</em> (v0.1.0-dev). Laboratorio de Sistemas Porcícolas. © 2026 Alberto Jorge Galindo-Barboza. Todos los derechos reservados.</p>
</div></body></html>`;
  }

  function reset() {
    els.file.value = "";
    els.text.value = "";
    els.expectedLength.value = "603";
    els.codingMode.checked = true;
    clearMessage();
    state.analysis = null;
    state.sourceName = null;
    state.analyzedAt = null;
    els.resultsPanel.hidden = true;
    els.reportPanel.hidden = true;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  els.analyze.addEventListener("click", analyze);
  els.reset.addEventListener("click", reset);
  els.downloadCsv.addEventListener("click", () => {
    if (!state.analysis) return;
    const stem = safeFileStem(state.sourceName);
    downloadBlob("\uFEFF" + resultsToCsv(), `${stem}_fastaudit_qc.csv`, "text/csv;charset=utf-8");
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
