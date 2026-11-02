# Changelog

Todos los cambios relevantes de FASTAudit se documentarán en este archivo.

## [0.1.0-dev] - 2026-11-02

### Añadido

- Primera arquitectura funcional de FASTAudit como herramienta web independiente.
- Identidad visual del Laboratorio de Sistemas Porcícolas alineada con SIPRO-Porcino, Epi 2×2 y DIMUPorcino.
- Entrada mediante archivo FASTA o texto pegado.
- Longitud esperada editable, con 603 nt como valor inicial.
- Modo opcional de secuencia codificante.
- Auditoría por registro de:
  - longitud nucleotídica;
  - coincidencia con longitud esperada;
  - encabezados duplicados;
  - validez IUPAC;
  - caracteres no-IUPAC;
  - ambigüedades IUPAC;
  - ACGT estricto;
  - múltiplo de 3;
  - inicio ATG;
  - codón de terminación;
  - stops internos;
  - SHA-256;
  - secuencias idénticas y haplotipos exactos compartidos.
- Resumen del dataset.
- Exportación de resultados a CSV.
- Generación de reporte HTML autónomo.
- Pruebas automáticas del núcleo con `node --test`.
- Documentación de validación técnica.
- `CITATION.cff` y licencia de uso restringido / todos los derechos reservados.

### Arquitectura

- Núcleo de análisis separado en `js/fastaudit-core.js`.
- Interfaz y exportaciones separadas en `js/app.js`.
- Sin dependencias de producción ni backend.
- Sin dependencia del repositorio experimental `DiseasesMapMx/prrsv2-nomenclature-lab`.

### Estado

Versión de desarrollo y validación. No constituye todavía una liberación estable.
