# Trazabilidad documental y preparación de versiones de FASTAudit

**Software:** FASTAudit — Auditor de calidad e integridad de secuencias FASTA  
**Autor:** Alberto Jorge Galindo-Barboza  
**Año de inicio documentado:** 2026

## 1. Propósito

Este documento funciona como expediente interno de trazabilidad del desarrollo de FASTAudit. Su objetivo es facilitar la reconstrucción de cada versión, preservar evidencia de autoría y mantener ordenados los materiales técnicos y documentales que puedan requerirse para depósito, registro, auditoría, transferencia o conservación institucional.

No constituye una lista oficial de requisitos de INDAUTOR ni asesoría jurídica. Los requisitos administrativos vigentes deben verificarse directamente ante la autoridad correspondiente cuando se prepare el trámite.

## 2. Identificación de la obra de software

**Nombre:** FASTAudit  
**Denominación descriptiva:** Auditor de calidad e integridad de secuencias FASTA  
**Tipo de desarrollo:** aplicación web / software de bioinformática  
**Autor:** Alberto Jorge Galindo-Barboza  
**Repositorio canónico:** `aljogaba/fastaudit`  
**Aplicación pública:** `https://aljogaba.github.io/fastaudit/`

## 3. Principio de fuente de verdad

El repositorio Git es la fuente canónica para reconstruir la evolución del software.

Cada versión debe poder asociarse con:

- número de versión;
- commit exacto;
- fecha;
- código fuente;
- documentación vigente;
- pruebas ejecutadas;
- cambios acumulados;
- autoría y derechos declarados.

No debe utilizarse únicamente una copia descargada de la página web como evidencia de una versión, porque no documenta por sí misma la historia ni el código fuente completo.

## 4. Hitos documentados

### `v0.1.0-dev`

Estado inicial funcional con auditoría estructural de FASTA, IUPAC, controles de secuencia codificante, SHA-256, haplotipos exactos, CSV, reporte HTML y pruebas automatizadas iniciales.

Commit de referencia previo a la ampliación `v0.2.0-dev`:

```text
1cf9e722479894e347787579d5e60b6c7ad53208
```

### `v0.2.0-dev`

Amplía el producto hacia auditoría de integridad de datasets mediante:

- ID canónico;
- encabezados delimitados;
- duplicados por ID;
- conflicto ID/secuencia;
- estadísticas de longitud;
- huellas globales del dataset;
- comparación exacta entre dos FASTA;
- exportación ampliada;
- batería automatizada de 10 pruebas.

Commit funcional de integración de esta ampliación:

```text
77861e58ea66cd42a3976aa2c4e34db16f910dee
```

La documentación formal asociada a `v0.2.0-dev` fue ampliada posteriormente dentro de la misma línea de desarrollo. Al congelar una versión candidata a registro debe anotarse el commit final que incluya tanto código como documentación.

## 5. Documentos que deben acompañar una versión congelada

Como expediente interno de FASTAudit se recomienda conservar:

1. `README.md`;
2. `CHANGELOG.md`;
3. `CITATION.cff`;
4. `LICENSE`;
5. `docs/manual-usuario.md`;
6. `docs/arquitectura.md`;
7. `docs/validation.md`;
8. `docs/trazabilidad-registro.md`;
9. código fuente completo de la versión;
10. pruebas automatizadas correspondientes;
11. evidencia del resultado de pruebas;
12. identificador del commit o tag congelado.

## 6. Material complementario recomendable al congelar una versión

Además del repositorio, es conveniente preparar y conservar fuera del flujo cotidiano de edición:

- copia ZIP íntegra del repositorio en el commit congelado;
- PDF del manual de usuario de esa versión;
- PDF de la descripción/arquitectura técnica;
- capturas de las pantallas principales de la aplicación;
- copia del reporte de pruebas;
- copia del `CHANGELOG.md`;
- archivo con la URL del repositorio y del despliegue;
- suma criptográfica del paquete ZIP congelado;
- fecha de preparación del expediente.

Estos elementos sirven como evidencia documental y de preservación; no se presentan aquí como requisitos legales obligatorios.

## 7. Regla de congelamiento

Una versión destinada a registro, depósito formal o distribución estable no debe identificarse únicamente con `main`.

Debe utilizarse un identificador inmutable, preferentemente:

```text
tag de versión + commit SHA
```

Ejemplo conceptual:

```text
v1.0.0
commit: <SHA exacto>
```

Una vez congelada, la documentación de esa versión no debe reescribirse retroactivamente. Las correcciones posteriores deben originar una nueva versión.

## 8. Control de cambios

Toda modificación funcional relevante debe reflejarse en:

- versión del software cuando corresponda;
- `CHANGELOG.md`;
- manual de usuario si cambia el uso o interpretación;
- arquitectura si cambia la implementación o flujo de datos;
- validación si introduce una nueva regla analítica;
- pruebas automatizadas.

## 9. Evidencia de autoría y evolución

El historial Git conserva evidencia técnica de:

- fechas de commits;
- contenido de cambios;
- identidad de la cuenta que realiza los commits;
- evolución incremental de la obra;
- integración de funciones y documentación.

Esta evidencia debe preservarse y no sustituirse por un repositorio recreado sin historia cuando se prepare una versión formal.

## 10. Checklist interno para una versión candidata a registro

Antes de declarar una versión candidata:

- [ ] Definir número de versión sin sufijo `-dev` cuando proceda.
- [ ] Congelar funcionalidad.
- [ ] Verificar que la versión visible coincida en interfaz, `package.json`, `CITATION.cff` y documentación.
- [ ] Ejecutar todas las pruebas automatizadas.
- [ ] Realizar prueba manual en navegador con datasets de referencia.
- [ ] Revisar el manual de usuario completo.
- [ ] Revisar arquitectura y límites declarados.
- [ ] Actualizar `CHANGELOG.md`.
- [ ] Confirmar autoría y aviso de copyright.
- [ ] Crear tag Git de la versión.
- [ ] Registrar el commit SHA exacto.
- [ ] Generar paquete ZIP inmutable de la versión.
- [ ] Generar PDF del manual y de la descripción técnica.
- [ ] Generar capturas de pantalla de la versión.
- [ ] Calcular una suma SHA-256 del paquete preservado.
- [ ] Verificar requisitos oficiales vigentes de la autoridad ante la que se realizará el trámite.

## 11. Registro de versiones congeladas

Esta tabla debe completarse solo cuando exista una versión formalmente congelada.

| Versión | Fecha de congelamiento | Commit SHA | Tag | Pruebas | Paquete preservado | Observaciones |
|---|---|---|---|---|---|---|
| Pendiente | — | — | — | — | — | FASTAudit continúa en fase `-dev`. |

## 12. Control del documento

- `2026-11-03`: creación del expediente interno de trazabilidad y preparación de versiones.

---

**Autor:** Alberto Jorge Galindo-Barboza  
**Copyright:** © 2026 Alberto Jorge Galindo-Barboza. Todos los derechos reservados.
