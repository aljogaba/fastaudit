# Validación técnica de FASTAudit

Versión de referencia: `v0.2.0-dev`

FASTAudit está en desarrollo y validación. Este documento registra el alcance de las comprobaciones implementadas y los criterios para validar su comportamiento antes de una versión estable.

## Estado de pruebas

Durante la implementación de `v0.2.0-dev` el 3 de noviembre de 2026 se ejecutó la batería automatizada del núcleo:

- 10 pruebas ejecutadas;
- 10 aprobadas;
- 0 fallos;
- 0 omitidas.

Estas pruebas verifican el comportamiento programado del núcleo en casos controlados; no sustituyen la validación comparativa con datasets de referencia que debe realizarse antes de una versión estable.

## Principios

1. FASTAudit debe operar sobre cualquier secuencia nucleotídica en formato FASTA.
2. La longitud esperada es un parámetro del usuario; 603 nt es únicamente el valor inicial de la interfaz.
3. Los controles de secuencia codificante son opcionales.
4. La herramienta no debe modificar, recortar, corregir, renombrar ni imputar automáticamente la secuencia o el encabezado fuente.
5. El encabezado completo debe conservarse y cualquier ID canónico debe almacenarse como atributo derivado.
6. El análisis y la comparación entre archivos deben ejecutarse localmente en el navegador.
7. El núcleo de FASTAudit es independiente de scripts experimentales utilizados en otros repositorios.
8. La comparación entre datasets debe describir identidad exacta e integridad, no inferir relación filogenética.

## Controles implementados

Por registro:

- longitud nucleotídica;
- coincidencia con longitud esperada;
- encabezado FASTA completo conservado;
- ID canónico derivado;
- ocurrencias del encabezado FASTA completo;
- ocurrencias del ID canónico;
- detección de ID canónico duplicado;
- número de secuencias distintas asociadas al mismo ID;
- bandera de conflicto ID/secuencia;
- separación del encabezado por delimitador;
- número de campos del encabezado;
- bandera de número de campos inconsistente respecto al patrón modal;
- alfabeto IUPAC;
- símbolos y conteo no-IUPAC;
- símbolos y conteo de ambigüedades IUPAC;
- clasificación ACGT estricto / IUPAC ambiguo / no-IUPAC;
- múltiplo de 3, inicio ATG, codón terminal y stops internos cuando se activa el modo codificante;
- SHA-256 de la secuencia normalizada;
- agrupación de secuencias idénticas y tamaño de cada haplotipo exacto.

A nivel de conjunto:

- número total de registros;
- mínimo, máximo, media y mediana de longitud;
- distribución de longitudes;
- registros que cumplen la longitud esperada;
- encabezados duplicados;
- IDs canónicos duplicados;
- conflictos ID/secuencia;
- IDs canónicos ausentes;
- distribución del número de campos del encabezado;
- registros con número de campos irregular;
- registros ACGT estrictos, IUPAC ambiguos y no-IUPAC;
- número de secuencias únicas;
- grupos y registros pertenecientes a haplotipos exactos compartidos;
- resumen de controles codificantes cuando aplica;
- SHA-256 del multiconjunto de secuencias;
- SHA-256 de los pares ID canónico–secuencia.

## Derivación del ID canónico

Con el delimitador por defecto `|`:

```text
>00000|cepa|2026|origen
```

se interpreta como:

```text
header       = 00000|cepa|2026|origen
canonical_id = 00000
field_1      = 00000
field_2      = cepa
field_3      = 2026
field_4      = origen
```

Reglas:

- el encabezado original se conserva;
- el delimitador es configurable;
- si el delimitador no aparece, el ID canónico se obtiene del primer token separado por espacios;
- si el delimitador se deja vacío, el encabezado no se divide en campos;
- no se utiliza `-` como separador automático.

## Conflicto ID/secuencia

Se considera conflicto fuerte cuando el mismo `canonical_id` aparece asociado a más de una secuencia nucleotídica normalizada distinta.

Ejemplo conceptual:

```text
>A001|muestra_1
ATGAAA...

>A001|muestra_2
ATGCCC...
```

Esto no se corrige automáticamente. FASTAudit lo reporta para revisión del usuario.

Un ID duplicado con la **misma** secuencia no se clasifica como conflicto ID/secuencia; se reporta por separado como duplicación de ID y, cuando corresponde, como haplotipo exacto compartido.

## Comparación A↔B

La comparación usa el ID canónico y la secuencia normalizada exacta.

Estados implementados:

- `PRESERVED`: mismo ID, mismo conjunto de secuencias y mismos encabezados;
- `HEADER_CHANGED`: mismo ID y mismo conjunto de secuencias, pero cambió el texto del encabezado;
- `MODIFIED_SEQUENCE`: mismo ID presente en ambos datasets, sin secuencia exacta compartida;
- `ID_SEQUENCE_SET_CHANGED`: el ID existe en ambos y conserva alguna secuencia, pero cambió el conjunto asociado;
- `ID_RENAMED_OR_RELABELED`: un ID aparece solo en uno de los datasets, pero su secuencia exacta existe en el otro bajo otro ID;
- `REMOVED`: ID solo en A, sin secuencia exacta equivalente en B;
- `ADDED`: ID solo en B, sin secuencia exacta equivalente en A.

La categoría `ID_RENAMED_OR_RELABELED` no intenta inferir la causa del cambio; únicamente demuestra que la secuencia exacta se conserva bajo otro ID canónico.

## Huellas globales

Se calculan dos SHA-256 independientes del orden de los registros:

1. `sequenceMultisetSha256`: representa el multiconjunto de secuencias, conservando multiplicidades pero ignorando ID y orden.
2. `idSequencePairsSha256`: representa el multiconjunto de pares `canonical_id + sequenceSha256`, conservando multiplicidades pero ignorando el orden.

Esto permite distinguir, por ejemplo, un dataset con las mismas secuencias pero con IDs intercambiados.

## Normalización

Antes del análisis, FASTAudit:

- convierte la secuencia a mayúsculas;
- elimina espacios, tabulaciones y saltos de línea dentro de la secuencia;
- conserva cualquier otro carácter para que pueda ser detectado como no-IUPAC.

No se modifica el texto del encabezado salvo la eliminación de espacios externos posteriores al carácter `>`.

## Pruebas automatizadas

El núcleo se prueba con `node --test` mediante `npm test`.

Los casos de `v0.2.0-dev` cubren:

- FASTA multilínea y normalización;
- extracción del ID canónico con `|`;
- conservación del encabezado completo;
- IDs que contienen guiones;
- encabezados e IDs duplicados;
- conflicto ID/secuencia;
- secuencias idénticas y SHA-256 coincidente;
- códigos ambiguos IUPAC;
- caracteres no-IUPAC;
- estadísticas min/máx/media/mediana;
- inconsistencia del número de campos;
- controles de secuencia codificante y stops internos;
- ejecución sin criterio de longitud y sin modo codificante;
- comparación entre dos FASTA con preservación, cambio de encabezado, modificación, re-etiquetado, altas y bajas;
- huellas de dataset capaces de distinguir contenido de secuencias de emparejamientos ID–secuencia;
- rechazo de contenido de secuencia previo al primer encabezado FASTA.

## Validación comparativa pendiente

Antes de una versión estable se recomienda construir un conjunto de referencia congelado con casos conocidos para comprobar manualmente y de manera independiente cada salida. Puede incluir secuencias utilizadas previamente en proyectos de investigación, pero deben incorporarse como copias de prueba o fixtures independientes y nunca convertir scripts experimentales externos en dependencias de FASTAudit.

También se recomienda validar explícitamente la comparación A↔B con datasets reales que incluyan:

- reordenamiento sin cambios;
- cambio exclusivo de encabezados;
- duplicados de ID;
- duplicados de secuencia;
- intercambio accidental de ID entre secuencias;
- adición y eliminación de registros;
- secuencias con caracteres ambiguos y no-IUPAC.

## Límites

FASTAudit no realiza control de calidad de cromatogramas o lecturas FASTQ, alineamiento múltiple, ensamblaje, inferencia filogenética, clasificación taxonómica o molecular, identificación de recombinación ni interpretación biológica. Sus resultados describen integridad estructural y consistencia de datasets FASTA y deben interpretarse dentro del contexto del estudio.
