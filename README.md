# FASTAudit

**Auditor de calidad e integridad de secuencias FASTA**

FASTAudit es una herramienta web para inspeccionar, documentar y exportar controles de calidad estructural e integridad de datasets en secuencias nucleotídicas almacenadas en formato FASTA.

Forma parte del **Laboratorio de Sistemas Porcícolas** y mantiene la identidad visual y documental de SIPRO-Porcino, Epi 2×2 y DIMUPorcino.

## Estado del proyecto

Versión actual: `v0.2.0-dev`

Estado: **en desarrollo y validación**. La versión `-dev` no debe interpretarse como una liberación estable ni como un sistema de validación molecular exhaustivo.

## Funciones

Para cada registro FASTA, FASTAudit evalúa:

1. longitud de la secuencia (`length_nt`);
2. coincidencia con una **longitud esperada editable**, con 603 nt como valor inicial;
3. encabezados FASTA duplicados;
4. **ID canónico derivado del encabezado**, usando por defecto el primer campo antes de `|`;
5. IDs canónicos duplicados;
6. conflicto crítico **ID/secuencia** cuando un mismo ID canónico está asociado a más de una secuencia distinta;
7. separación de encabezados en campos mediante un delimitador editable;
8. consistencia del número de campos del encabezado;
9. validez del alfabeto IUPAC de nucleótidos;
10. número de caracteres no-IUPAC;
11. número y tipo de caracteres ambiguos IUPAC;
12. distinción entre secuencias A/C/G/T estrictas y secuencias con ambigüedades;
13. inicio `ATG` cuando se activa el modo de secuencia codificante;
14. codón de terminación canónico;
15. stops internos en marco de lectura;
16. SHA-256 de la secuencia normalizada;
17. secuencias idénticas y haplotipos exactos compartidos.

La aplicación genera además:

- resumen del conjunto analizado;
- mínimo, máximo, media y mediana de longitud;
- distribución de longitudes;
- distribución del número de campos del encabezado;
- huella SHA-256 del multiconjunto de secuencias;
- huella SHA-256 de los pares `ID canónico–secuencia`;
- tabla por registro;
- exportación de resultados a CSV, incluyendo cada campo del encabezado en una columna separada;
- reporte técnico autónomo en HTML con parámetros, resumen y resultados completos;
- comparación opcional entre dos FASTA.

## ID canónico y encabezado original

FASTAudit **no reemplaza ni modifica el encabezado fuente**. El texto posterior a `>` se conserva íntegramente como `header`.

El `canonical_id` es un atributo derivado:

- con el delimitador por defecto `|`, `>00000|cepa|2026` produce `canonical_id = 00000`;
- si el delimitador no aparece, se usa el primer token separado por espacios;
- el delimitador es editable y puede dejarse vacío para no dividir campos;
- el guion `-` no se utiliza como separador automático porque puede formar parte legítima de un accession o identificador.

Esta separación permite detectar IDs duplicados aunque los encabezados completos difieran.

## Comparación de dos FASTA

La comparación A↔B se basa en **identidad exacta de secuencia** e ID canónico. FASTAudit distingue:

- ID, secuencia y encabezado preservados;
- mismo ID y misma secuencia con encabezado cambiado;
- mismo ID con secuencia modificada;
- cambios parciales del conjunto de secuencias asociado a un ID;
- secuencia exacta conservada bajo otro ID canónico;
- IDs añadidos;
- IDs eliminados.

La comparación no realiza alineamiento ni calcula distancia genética. Un estado de “secuencia modificada” significa únicamente que las secuencias exactas asociadas al mismo ID no coinciden entre ambos datasets.

## Alcance

FASTAudit está diseñado para **cualquier secuencia nucleotídica en formato FASTA**. La longitud de 603 nt es únicamente un valor inicial útil para algunos flujos de trabajo y puede cambiarse o dejarse sin criterio de longitud esperada.

Los controles de `ATG`, stop terminal y stops internos son opcionales y se aplican únicamente cuando el usuario activa el modo de **secuencia codificante**.

FASTAudit es una herramienta de auditoría estructural e integridad. No realiza alineamiento múltiple, inferencia filogenética, clasificación taxonómica o molecular, ensamblaje, recombinación ni interpretación biológica.

## Privacidad y arquitectura

FASTAudit funciona íntegramente en el navegador mediante **HTML, CSS y JavaScript**. Los archivos FASTA y las secuencias no se envían a un servidor para realizar el análisis.

No requiere backend, base de datos ni dependencias de producción.

La herramienta es independiente de `DiseasesMapMx/prrsv2-nomenclature-lab`. El script experimental `scripts/qc_fasta_dataset.py` de ese laboratorio no forma parte de FASTAudit y no se modifica ni se utiliza como dependencia de producción.

## Aplicación

https://aljogaba.github.io/fastaudit/

## Repositorio

https://github.com/aljogaba/fastaudit

## Pruebas y validación

El núcleo no requiere dependencias externas. Para ejecutar la batería automatizada:

```bash
npm test
```

Estado de `v0.2.0-dev`: **10/10 pruebas aprobadas** durante la implementación del 3 de noviembre de 2026.

Las pruebas cubren, entre otros casos:

- extracción de ID canónico;
- parsing de campos por delimitador;
- encabezados e IDs duplicados;
- conflicto ID/secuencia;
- estadísticas de longitud;
- campos de encabezado inconsistentes;
- IUPAC y controles codificantes;
- haplotipos exactos y SHA-256;
- comparación A↔B;
- huellas globales del dataset.

La estrategia y los límites de validación se documentan en [`docs/validation.md`](docs/validation.md).

## Autoría

Desarrollado por **Alberto Jorge Galindo-Barboza**.

Perfil profesional: https://aljogaba.github.io/

## Cita sugerida

Galindo-Barboza, A. J. (2026). *FASTAudit: Auditor de calidad e integridad de secuencias FASTA* (v0.2.0-dev). Laboratorio de Sistemas Porcícolas.

Consulte también `CITATION.cff`.

## Derechos

© 2026 Alberto Jorge Galindo-Barboza. Todos los derechos reservados.

El uso, distribución, modificación, reproducción o explotación de este software requiere autorización expresa del autor. Consulte `LICENSE`.
