# Arquitectura técnica de FASTAudit

**Versión documentada:** `v0.2.0-dev`  
**Autor:** Alberto Jorge Galindo-Barboza  
**Año:** 2026

## 1. Objetivo arquitectónico

FASTAudit está diseñado como una aplicación web estática, autocontenida y ejecutada íntegramente en el navegador. Su objetivo es auditar estructura e integridad de datasets FASTA sin requerir backend, base de datos ni servicios remotos de procesamiento.

La arquitectura prioriza:

- privacidad del material molecular;
- simplicidad operativa;
- reproducibilidad;
- independencia de infraestructura de servidor;
- trazabilidad de resultados;
- separación entre lógica de análisis e interfaz;
- ausencia de dependencias de producción.

## 2. Componentes principales

### 2.1 `index.html`

Define la interfaz de usuario y los controles de entrada, criterios, resultados, comparación y exportación.

### 2.2 `js/fastaudit-core.js`

Contiene el núcleo de análisis. Sus responsabilidades incluyen:

- lectura y parseo del FASTA;
- normalización de secuencias;
- derivación de ID canónico;
- separación de encabezados por delimitador;
- conteos de duplicados;
- detección de conflicto ID/secuencia;
- controles de alfabeto IUPAC;
- controles de secuencia codificante;
- SHA-256;
- agrupación de secuencias idénticas;
- estadísticas del dataset;
- huellas globales del dataset;
- comparación exacta entre dos datasets FASTA.

El núcleo está separado de la interfaz para facilitar pruebas automatizadas y reutilización controlada.

### 2.3 `js/app.js`

Gestiona la interacción con el usuario:

- lectura local de archivos;
- configuración de opciones;
- invocación del núcleo;
- presentación de resultados;
- generación de CSV;
- generación de reporte HTML;
- comparación opcional de dos archivos.

### 2.4 `assets/`

Contiene estilos y recursos visuales de la aplicación.

### 2.5 `tests/`

Contiene pruebas automatizadas del núcleo ejecutables mediante Node.js.

### 2.6 `docs/`

Contiene documentación funcional, técnica, validación y trazabilidad del desarrollo.

## 3. Flujo de datos

El flujo principal es:

```text
Archivo FASTA local
        ↓
File API del navegador
        ↓
Texto en memoria
        ↓
parseFasta()
        ↓
Normalización y extracción de metadatos
        ↓
Controles por registro
        ↓
Controles de integridad del dataset
        ↓
Resumen + tabla + huellas SHA-256
        ↓
Renderizado en navegador
        ↓
Exportación local CSV / HTML
```

El archivo no se envía a un servicio de procesamiento remoto.

## 4. Modelo lógico de registro

Cada registro FASTA se representa conceptualmente con atributos como:

```text
record_index
header
canonical_id
header_fields[]
sequence
length_nt
sequence_sha256
```

A partir de ellos se agregan resultados derivados de QC e integridad, por ejemplo:

```text
duplicate_header
duplicate_canonical_id
id_sequence_conflict
iupac_valid
ambiguity_count
non_iupac_count
expected_length_match
haplotype
```

El encabezado fuente y la secuencia normalizada se mantienen diferenciados de los atributos derivados.

## 5. Normalización de secuencia

FASTAudit normaliza el contenido nucleotídico antes de ciertos cálculos:

- convierte a mayúsculas;
- elimina espacios, tabulaciones y saltos de línea dentro de la secuencia;
- conserva otros caracteres para que puedan ser detectados como no-IUPAC.

No recorta extremos, no elimina gaps de forma automática y no imputa bases.

## 6. Identidad y encabezados

### 6.1 Encabezado original

El texto posterior a `>` se conserva como `header`, salvo espacios exteriores eliminados durante el parseo.

### 6.2 ID canónico

El `canonical_id` es un atributo derivado y configurable mediante delimitador.

El comportamiento predeterminado usa `|`. El primer campo se interpreta como ID canónico.

Si el delimitador no aparece, se utiliza el primer token separado por espacios.

El guion `-` no se utiliza como delimitador implícito.

### 6.3 Conflicto ID/secuencia

El sistema construye agrupaciones por ID canónico. Si un mismo ID presenta más de una secuencia exacta distinta se marca `id_sequence_conflict`.

Esta marca describe una inconsistencia de integridad documental o de identificación que requiere revisión humana; no emite una conclusión biológica.

## 7. Identidad exacta de secuencia

La identidad exacta se determina sobre la secuencia normalizada.

FASTAudit utiliza:

- comparación exacta de cadenas;
- SHA-256 como huella reproducible;
- agrupación interna de secuencias idénticas.

No utiliza alineamiento ni tolerancias de distancia.

## 8. Huellas globales

Se generan huellas independientes del orden para dos propósitos:

### 8.1 Multiconjunto de secuencias

Resume el conjunto exacto de secuencias y sus multiplicidades. Permite distinguir una simple reordenación de una alteración real de contenido.

### 8.2 Pares ID–secuencia

Resume las asociaciones entre ID canónico y secuencia. Permite detectar cambios de emparejamiento aunque el conjunto global de secuencias permanezca intacto.

Estas huellas se calculan localmente y son atributos derivados del dataset analizado.

## 9. Comparación A↔B

La comparación entre dos FASTA se basa en:

- IDs canónicos;
- conjuntos exactos de secuencias asociados a cada ID;
- encabezados;
- presencia de secuencias exactas bajo otros IDs.

Los estados describen cambios de integridad exacta. No se calcula distancia genética ni similitud parcial.

## 10. Seguridad y privacidad

El diseño evita deliberadamente:

- subida de archivos a un backend;
- almacenamiento de secuencias en base de datos;
- autenticación de usuarios;
- persistencia remota de datasets;
- telemetría molecular.

El navegador mantiene temporalmente los datos en memoria durante la sesión. Las exportaciones se generan como archivos locales mediante APIs del navegador.

## 11. Dependencias

FASTAudit no utiliza dependencias JavaScript de producción externas para el análisis.

Node.js se utiliza únicamente para ejecutar la batería de pruebas durante desarrollo y validación.

## 12. Despliegue

La aplicación puede servirse como sitio estático. La instancia pública se publica mediante GitHub Pages.

El despliegue estático no cambia el principio de privacidad: el servidor entrega HTML/CSS/JavaScript, mientras que el FASTA se procesa en el navegador.

## 13. Reproducibilidad del software

La unidad canónica de trazabilidad técnica es el commit Git del repositorio.

Para una versión reproducible deben conservarse al menos:

- etiqueta o número de versión;
- commit exacto;
- código fuente;
- documentación correspondiente;
- resultados de pruebas;
- `CHANGELOG.md`;
- `CITATION.cff`;
- licencia aplicable.

## 14. Límites deliberados de arquitectura

FASTAudit no incorpora actualmente:

- backend;
- base de datos;
- procesamiento asíncrono remoto;
- cuentas de usuario;
- almacenamiento histórico de datasets;
- alineamiento;
- filogenia;
- clasificación molecular;
- integración automática con repositorios de secuencias.

Estas exclusiones son decisiones de alcance, no carencias accidentales. Una función futura que requiera backend debe evaluarse explícitamente contra el principio arquitectónico de procesamiento local antes de incorporarse.

## 15. Control del documento

- `2026-11-03`: creación de la documentación formal de arquitectura para `v0.2.0-dev`.

---

**Autor:** Alberto Jorge Galindo-Barboza  
**Copyright:** © 2026 Alberto Jorge Galindo-Barboza. Todos los derechos reservados.
