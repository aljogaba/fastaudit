# FASTAudit

**Auditor de calidad e integridad de secuencias FASTA**

FASTAudit es una herramienta web para inspeccionar y documentar controles básicos de calidad estructural en secuencias nucleotídicas almacenadas en formato FASTA.

Forma parte del **Laboratorio de Sistemas Porcícolas** y mantiene la identidad visual y documental de SIPRO-Porcino, Epi 2×2 y DIMUPorcino.

## Estado del proyecto

Versión actual: `v0.1.0-dev`

Estado: **en desarrollo y validación**. La versión `-dev` no debe interpretarse como una liberación estable ni como un sistema de validación molecular exhaustivo.

## Funciones iniciales

Para cada registro FASTA, FASTAudit evalúa:

1. longitud de la secuencia (`length_nt`);
2. coincidencia con una longitud esperada, con **603 nt** como valor inicial editable;
3. encabezados FASTA duplicados;
4. validez del alfabeto IUPAC de nucleótidos;
5. número de caracteres no-IUPAC;
6. número y tipo de caracteres ambiguos IUPAC;
7. distinción entre secuencias A/C/G/T estrictas y secuencias con ambigüedades;
8. inicio con `ATG` cuando se activa el modo codificante;
9. codón de terminación canónico;
10. stops internos en marco de lectura;
11. SHA-256 de la secuencia normalizada;
12. secuencias idénticas y haplotipos exactos compartidos.

La aplicación genera además un resumen del conjunto, una tabla por registro y exportación de resultados a CSV.

## Privacidad y arquitectura

FASTAudit funciona íntegramente en el navegador mediante **HTML, CSS y JavaScript**. Los archivos FASTA y las secuencias no se envían a un servidor para realizar el análisis.

La herramienta es independiente de `DiseasesMapMx/prrsv2-nomenclature-lab`. El script experimental `scripts/qc_fasta_dataset.py` de ese laboratorio no forma parte de FASTAudit y no se modifica ni se utiliza como dependencia de producción.

## Aplicación

https://aljogaba-academico.github.io/fastaudit/

## Autoría

Desarrollado por **Alberto Jorge Galindo-Barboza**.

Perfil profesional: https://aljogaba.github.io/

## Cita sugerida

Galindo-Barboza, A. J. (2026). *FASTAudit: Auditor de calidad e integridad de secuencias FASTA* (v0.1.0-dev). Laboratorio de Sistemas Porcícolas.

Consulte también `CITATION.cff`.

## Derechos

© 2026 Alberto Jorge Galindo-Barboza. Todos los derechos reservados.

El uso, distribución, modificación, reproducción o explotación de este software requiere autorización expresa del autor. Consulte `LICENSE`.
