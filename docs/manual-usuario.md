# Manual de usuario de FASTAudit

**Software:** FASTAudit — Auditor de calidad e integridad de secuencias FASTA  
**Versión documentada:** `v0.2.0-dev`  
**Autor:** Alberto Jorge Galindo-Barboza  
**Año:** 2026  
**Aplicación:** https://aljogaba.github.io/fastaudit/  
**Repositorio:** https://github.com/aljogaba/fastaudit

---

## 1. Propósito

FASTAudit es una herramienta web para obtener una primera evaluación estructural y de integridad de archivos FASTA de secuencias nucleotídicas antes de incorporarlos a análisis posteriores.

La aplicación permite revisar, entre otros aspectos:

- número de registros;
- longitud de las secuencias;
- alfabeto nucleotídico IUPAC;
- caracteres ambiguos y no-IUPAC;
- encabezados duplicados;
- IDs canónicos duplicados;
- conflictos entre un mismo ID y secuencias distintas;
- estructura de encabezados delimitados;
- controles opcionales de secuencia codificante;
- secuencias idénticas;
- huellas SHA-256;
- comparación exacta entre dos archivos FASTA.

FASTAudit **no corrige ni modifica automáticamente los archivos fuente**.

## 2. Arquitectura y privacidad

FASTAudit funciona íntegramente en el navegador mediante HTML, CSS y JavaScript.

- No requiere backend.
- No requiere base de datos.
- No requiere una cuenta de usuario.
- No envía el archivo FASTA a un servidor para analizarlo.
- El procesamiento se realiza localmente en el navegador del usuario.

El sitio publicado mediante GitHub Pages sirve los archivos de la aplicación, pero el contenido del FASTA utilizado para el análisis permanece en el navegador durante la sesión.

## 3. Requisitos de uso

Se recomienda utilizar un navegador web moderno con JavaScript habilitado.

Los archivos de entrada deben ser archivos de texto en formato FASTA. La interfaz acepta extensiones habituales como `.fasta`, `.fa`, `.fas`, `.fna` y `.txt`.

Cada registro debe comenzar con una línea de encabezado cuyo primer carácter sea `>`.

Ejemplo mínimo:

```text
>secuencia_1
ATGACGTACGTAA
>secuencia_2
ATGACGTACGTAA
```

## 4. Flujo general de trabajo

El flujo recomendado es:

1. cargar o pegar el FASTA;
2. definir los criterios de auditoría;
3. ejecutar el análisis;
4. revisar el resumen del dataset;
5. revisar registros individuales con alertas;
6. exportar CSV y/o reporte HTML;
7. cuando corresponda, comparar el archivo con una segunda versión del FASTA.

## 5. Entrada del archivo FASTA

### 5.1 Cargar archivo

En la sección **Entrada** puede arrastrar un archivo FASTA al área de carga o seleccionarlo desde su equipo.

### 5.2 Pegar contenido

También puede pegar directamente contenido FASTA en el cuadro de texto.

Si existe simultáneamente un archivo seleccionado y texto pegado, FASTAudit utiliza el archivo seleccionado.

## 6. Criterios de auditoría

### 6.1 Longitud esperada

El campo **Longitud esperada (nt)** permite definir la longitud objetivo de las secuencias.

El valor inicial es `603` nt, pero no constituye una regla fija de FASTAudit. Puede sustituirse por cualquier entero positivo o dejarse vacío si no desea evaluar una longitud objetivo.

La salida distingue entre registros que coinciden y registros que no coinciden con ese criterio.

### 6.2 Delimitador de encabezados

FASTAudit puede separar el encabezado FASTA en campos usando un delimitador configurable.

El delimitador predeterminado es:

```text
|
```

Por ejemplo:

```text
>00000|cepaA|2026|Jalisco
```

se interpreta como:

```text
canonical_id = 00000
header_field_1 = 00000
header_field_2 = cepaA
header_field_3 = 2026
header_field_4 = Jalisco
```

El encabezado original completo se conserva como `header`.

### 6.3 ID canónico

El **ID canónico** es un atributo derivado que FASTAudit utiliza para identificar registros de manera más consistente.

Con el delimitador `|`, el ID canónico corresponde al primer campo del encabezado.

Ejemplo:

```text
>00000|hbjhbsadjhsjdh
```

produce:

```text
canonical_id = 00000
```

Si el delimitador elegido no aparece en el encabezado, FASTAudit utiliza el primer token separado por espacios.

El ID canónico no reemplaza ni modifica el encabezado original.

FASTAudit no utiliza el guion `-` como separador automático porque puede formar parte legítima de un accession o identificador.

### 6.4 Modo de secuencia codificante

Cuando se activa **Evaluar CDS en marco 0**, FASTAudit añade controles orientados a una secuencia codificante:

- longitud múltiplo de 3;
- inicio `ATG`;
- codón terminal;
- stop terminal canónico `TAA`, `TAG` o `TGA`;
- stops internos en marco 0.

Debe desactivarse cuando estos criterios no sean pertinentes para la región analizada.

## 7. Resultados del dataset

Después de ejecutar el análisis, FASTAudit presenta un resumen general.

Entre las métricas disponibles se encuentran:

- total de registros;
- registros que cumplen la longitud esperada;
- secuencias ACGT estrictas;
- secuencias IUPAC válidas con ambigüedad;
- secuencias con caracteres no-IUPAC;
- secuencias únicas;
- haplotipos exactos compartidos;
- encabezados duplicados;
- IDs canónicos duplicados;
- conflictos ID/secuencia;
- mínimo, máximo, media y mediana de longitud;
- distribución de longitudes;
- distribución del número de campos del encabezado.

## 8. Interpretación por registro

### 8.1 Encabezado duplicado

Indica que el texto completo del encabezado aparece más de una vez.

No implica necesariamente que las secuencias sean distintas.

### 8.2 ID canónico duplicado

Indica que el mismo `canonical_id` aparece en más de un registro, aunque los encabezados completos puedan ser diferentes.

Este hallazgo debe revisarse porque puede representar:

- registros repetidos válidos;
- distintas versiones de una misma secuencia;
- anotaciones alternativas;
- errores de identificación.

FASTAudit informa el hallazgo, pero no decide cuál registro debe conservarse.

### 8.3 Conflicto ID/secuencia

Es una alerta de integridad de mayor prioridad.

Se produce cuando un mismo ID canónico está asociado a más de una secuencia nucleotídica distinta dentro del dataset.

Este estado no demuestra por sí mismo que exista un error biológico o documental, pero indica que el emparejamiento entre identificador y secuencia debe verificarse antes de continuar con análisis posteriores.

### 8.4 Alfabeto IUPAC

FASTAudit reconoce como símbolos nucleotídicos IUPAC:

```text
A C G T R Y S W K M B D H V N
```

Las secuencias se clasifican como:

- `ACGT_ESTRICTO`: solo A, C, G y T;
- `IUPAC_AMBIGUO`: contiene símbolos ambiguos válidos;
- `NO_IUPAC`: contiene uno o más caracteres fuera del alfabeto reconocido.

### 8.5 Caracteres ambiguos

Los símbolos ambiguos IUPAC se cuentan y se reportan por tipo.

Ejemplo:

```text
N:3 · R:1
```

significa tres `N` y un `R`.

### 8.6 SHA-256 de secuencia

Cada secuencia normalizada recibe una huella SHA-256.

Dos secuencias exactamente iguales después de la normalización producen la misma huella.

La huella sirve como evidencia de identidad exacta del contenido nucleotídico; no representa similitud genética ni distancia evolutiva.

### 8.7 Haplotipos exactos

FASTAudit agrupa secuencias idénticas y asigna identificadores internos como `H001`, `H002`, etc.

Estos grupos representan identidad exacta de secuencia y no deben interpretarse como clados, linajes ni grupos filogenéticos.

## 9. Huellas globales del dataset

FASTAudit genera dos huellas SHA-256 globales independientes del orden de los registros.

### 9.1 Huella del multiconjunto de secuencias

Resume el contenido exacto de secuencias del dataset considerando sus multiplicidades.

Puede utilizarse para comprobar si dos estados del archivo contienen el mismo conjunto de secuencias aunque los registros hayan sido reordenados.

### 9.2 Huella de pares ID–secuencia

Resume los emparejamientos entre ID canónico y secuencia.

Es más estricta que la huella del multiconjunto de secuencias: puede detectar que las mismas secuencias continúan presentes pero quedaron asociadas a identificadores distintos.

## 10. Exportación a CSV

El botón **Descargar CSV** genera una tabla que incluye los resultados de auditoría por registro.

Entre sus columnas pueden encontrarse:

- `record_index`;
- `canonical_id`;
- `header`;
- `header_field_1`, `header_field_2`, etc.;
- `length_nt`;
- `expected_length_match`;
- indicadores de duplicación;
- indicadores de conflicto ID/secuencia;
- métricas IUPAC;
- controles codificantes;
- `sequence_sha256`;
- grupo de secuencia exacta.

La cantidad de columnas `header_field_n` depende del número máximo de campos encontrado en los encabezados analizados.

## 11. Reporte HTML

El botón **Descargar reporte HTML** genera un documento autónomo con:

- metadatos del análisis;
- parámetros utilizados;
- resumen del dataset;
- hallazgos principales;
- resultados por registro;
- huellas de integridad del dataset.

El reporte puede conservarse junto al archivo fuente para documentar una revisión específica.

## 12. Comparación entre dos FASTA

FASTAudit permite seleccionar un segundo archivo FASTA y comparar A contra B mediante identidad exacta.

La comparación utiliza principalmente el ID canónico y las secuencias exactas.

Puede distinguir estados como:

- registro preservado;
- mismo ID y secuencia con cambio de encabezado;
- mismo ID con secuencia modificada;
- cambio parcial cuando un ID está asociado a múltiples secuencias;
- secuencia exacta conservada bajo otro ID;
- ID añadido;
- ID eliminado.

La comparación también genera un CSV específico cuando la interfaz correspondiente está activa.

### 12.1 Qué significa “modificada”

En FASTAudit, una secuencia se considera modificada cuando el conjunto exacto de secuencias asociado al mismo ID canónico difiere entre A y B.

FASTAudit no utiliza alineamiento, porcentaje de identidad ni distancia genética para este estado.

## 13. Casos de uso recomendados

FASTAudit es útil para:

- revisar un FASTA recibido de un laboratorio o colaborador;
- revisar un dataset antes de alinearlo;
- detectar encabezados o IDs duplicados;
- identificar secuencias con caracteres inesperados;
- revisar homogeneidad de longitudes;
- comprobar que una reordenación no alteró secuencias;
- verificar que una edición de encabezados no cambió el emparejamiento ID–secuencia;
- documentar una versión de trabajo mediante CSV y reporte HTML;
- comparar un FASTA original con una versión curada.

## 14. Qué no hace FASTAudit

FASTAudit no realiza:

- control de calidad de cromatogramas;
- análisis de archivos FASTQ;
- ensamblaje;
- alineamiento múltiple;
- cálculo de distancia genética;
- filogenia;
- clasificación taxonómica;
- clasificación molecular;
- detección de recombinación;
- interpretación biológica de variantes;
- corrección automática de secuencias;
- imputación de bases ambiguas.

## 15. Reproducibilidad y conservación de evidencia

Para documentar una auditoría importante se recomienda conservar conjuntamente:

1. el FASTA analizado;
2. el CSV generado;
3. el reporte HTML generado;
4. la versión de FASTAudit utilizada;
5. la fecha del análisis;
6. los criterios configurados, especialmente longitud esperada, delimitador y modo codificante.

Para una versión de software congelada debe conservarse además el commit exacto del repositorio.

## 16. Errores frecuentes

### “No se encontraron registros FASTA”

Compruebe que cada registro comience con `>`.

### “Se encontró contenido de secuencia antes del primer encabezado FASTA”

Existe texto nucleotídico antes del primer encabezado.

### Longitudes inesperadas

Verifique que el criterio de longitud corresponda a la región analizada y que el archivo no incluya secuencias parciales.

### Muchos IDs duplicados

Revise si el delimitador elegido representa realmente la estructura del encabezado. Un delimitador inadecuado puede generar IDs demasiado generales.

### Muchos conflictos ID/secuencia

Revise primero la estructura de identificación y el delimitador. Si son correctos, inspeccione los registros señalados antes de continuar con análisis posteriores.

## 17. Glosario breve

**Encabezado FASTA:** texto posterior al símbolo `>` que identifica o describe un registro.

**ID canónico:** identificador derivado por FASTAudit a partir del encabezado para facilitar controles de integridad.

**IUPAC:** nomenclatura de símbolos utilizada para representar nucleótidos definidos o ambiguos.

**SHA-256:** función criptográfica utilizada para generar una huella reproducible del contenido exacto.

**Haplotipo exacto:** etiqueta interna utilizada por FASTAudit para agrupar secuencias idénticas; no implica inferencia filogenética.

**Dataset:** conjunto de registros FASTA analizados como una unidad.

## 18. Control del documento

Este manual corresponde a `FASTAudit v0.2.0-dev` y debe actualizarse cuando una modificación funcional cambie la interfaz, las reglas de análisis o las salidas del programa.

Historial documental:

- `2026-11-03`: creación del manual formal para `v0.2.0-dev`.

---

**Autor:** Alberto Jorge Galindo-Barboza  
**Copyright:** © 2026 Alberto Jorge Galindo-Barboza. Todos los derechos reservados.
