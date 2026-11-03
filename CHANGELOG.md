# Changelog

Todos los cambios relevantes de FASTAudit se documentarán en este archivo.

## [0.2.0-dev] - 2026-11-03

### Añadido

- ID canónico derivado del encabezado.
  - Por defecto se usa el primer campo antes de `|`.
  - Si `|` no aparece, se conserva el comportamiento de primer token separado por espacios.
  - El delimitador es editable.
  - El encabezado completo original se conserva.
- Auditoría de IDs canónicos duplicados.
- Detección de conflicto fuerte cuando un mismo ID canónico está asociado a secuencias distintas.
- Parser de encabezados por delimitador y exportación de campos separados al CSV.
- Auditoría de consistencia del número de campos del encabezado.
- Estadísticos de longitud: mínimo, máximo, media y mediana.
- Dos huellas SHA-256 globales e independientes del orden:
  - multiconjunto de secuencias;
  - pares ID canónico–secuencia.
- Comparación opcional entre dos FASTA completamente en cliente.
- Estados de comparación para preservación, cambio de encabezado, modificación de secuencia, cambios parciales del conjunto ID/secuencia, re-etiquetado de ID, altas y bajas.
- Exportación independiente de la comparación A↔B a CSV.
- Inclusión de la comparación y las huellas globales en el reporte HTML.
- Batería automatizada ampliada a 10 pruebas.

### Documentación

- Índice documental en `docs/README.md`.
- Manual formal de usuario en `docs/manual-usuario.md`.
- Descripción de arquitectura técnica en `docs/arquitectura.md`.
- Expediente interno de trazabilidad, congelamiento de versiones y preparación documental en `docs/trazabilidad-registro.md`.
- Enlaces a la documentación formal incorporados al `README.md`.
- Se establece como regla documental que las versiones candidatas a registro o distribución estable deben identificarse mediante commit exacto y, preferentemente, tag inmutable.

### Decisiones de diseño

- FASTAudit continúa sin backend ni dependencias de producción.
- No se usa `-` como separador automático de ID porque puede formar parte legítima de accessions o identificadores.
- El ID canónico es un atributo derivado y nunca sustituye el encabezado fuente.
- La comparación A↔B se basa en identidad exacta; no realiza alineamiento ni inferencia genética.
- FASTAudit sigue siendo independiente de `DiseasesMapMx/prrsv2-nomenclature-lab`.

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
