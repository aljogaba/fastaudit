# Validación técnica de FASTAudit

Versión de referencia: `v0.1.0-dev`

FASTAudit está en desarrollo y validación. Este documento registra el alcance de las comprobaciones implementadas y los criterios para validar su comportamiento antes de una versión estable.

## Principios

1. FASTAudit debe operar sobre cualquier secuencia nucleotídica en formato FASTA.
2. La longitud esperada es un parámetro del usuario; 603 nt es únicamente el valor inicial de la interfaz.
3. Los controles de secuencia codificante son opcionales.
4. La herramienta no debe modificar, recortar, corregir ni imputar automáticamente la secuencia fuente.
5. El análisis debe ejecutarse localmente en el navegador.
6. El núcleo de FASTAudit es independiente de scripts experimentales utilizados en otros repositorios.

## Controles implementados

Por registro:

- longitud nucleotídica;
- coincidencia con longitud esperada;
- ocurrencias del encabezado FASTA completo;
- alfabeto IUPAC;
- símbolos y conteo no-IUPAC;
- símbolos y conteo de ambigüedades IUPAC;
- clasificación ACGT estricto / IUPAC ambiguo / no-IUPAC;
- múltiplo de 3, inicio ATG, codón terminal y stops internos cuando se activa el modo codificante;
- SHA-256 de la secuencia normalizada;
- agrupación de secuencias idénticas y tamaño de cada haplotipo exacto.

A nivel de conjunto:

- número total de registros;
- distribución de longitudes;
- registros que cumplen la longitud esperada;
- encabezados duplicados;
- registros ACGT estrictos, IUPAC ambiguos y no-IUPAC;
- número de secuencias únicas;
- grupos y registros pertenecientes a haplotipos exactos compartidos;
- resumen de controles codificantes cuando aplica.

## Normalización

Antes del análisis, FASTAudit:

- convierte la secuencia a mayúsculas;
- elimina espacios, tabulaciones y saltos de línea dentro de la secuencia;
- conserva cualquier otro carácter para que pueda ser detectado como no-IUPAC.

No se modifica el texto del encabezado salvo la eliminación de espacios externos posteriores al carácter `>`.

## Pruebas automatizadas

El núcleo se prueba con `node --test` mediante `npm test`.

Los casos iniciales cubren:

- FASTA multilínea y normalización;
- encabezados duplicados;
- secuencias idénticas y SHA-256 coincidente;
- códigos ambiguos IUPAC;
- caracteres no-IUPAC;
- controles de secuencia codificante y stops internos;
- ejecución sin criterio de longitud y sin modo codificante;
- rechazo de contenido de secuencia previo al primer encabezado FASTA.

## Validación comparativa pendiente

Antes de una versión estable se recomienda construir un conjunto de referencia congelado con casos conocidos para comprobar manualmente y de manera independiente cada salida. Puede incluir secuencias utilizadas previamente en proyectos de investigación, pero deben incorporarse como copias de prueba o fixtures independientes y nunca convertir scripts experimentales externos en dependencias de FASTAudit.

## Límites

FASTAudit no realiza control de calidad de cromatogramas o lecturas FASTQ, alineamiento múltiple, ensamblaje, inferencia filogenética, clasificación taxonómica, identificación de recombinación ni interpretación biológica. Sus resultados describen integridad estructural básica del contenido FASTA y deben interpretarse dentro del contexto del estudio.
