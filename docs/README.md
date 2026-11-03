# Documentación de FASTAudit

Este directorio reúne la documentación funcional, técnica y de trazabilidad de FASTAudit. La documentación se mantiene versionada junto con el código fuente para que cada estado del programa pueda reconstruirse y auditarse a partir del historial del repositorio.

## Documentos principales

- [`manual-usuario.md`](manual-usuario.md): manual de uso de la aplicación, interpretación de resultados, exportaciones y comparación entre FASTA.
- [`arquitectura.md`](arquitectura.md): arquitectura técnica, componentes, flujo de datos, decisiones de diseño y límites funcionales.
- [`validation.md`](validation.md): estrategia de pruebas, casos cubiertos, criterios de validación y límites de la evidencia disponible.
- [`trazabilidad-registro.md`](trazabilidad-registro.md): expediente interno de autoría, versiones y elementos que deben conservarse al preparar una versión para registro o depósito documental.

## Principios documentales

1. El código fuente, la documentación y la versión visible de la aplicación deben permanecer sincronizados.
2. Toda función nueva debe reflejarse, cuando corresponda, en el manual, la arquitectura, la validación y el `CHANGELOG.md`.
3. Las versiones de desarrollo (`-dev`) no se consideran versiones estables ni congeladas para distribución final.
4. Antes de congelar una versión candidata a registro se debe identificar el commit exacto, ejecutar la batería de pruebas y conservar una copia íntegra del código y de la documentación correspondiente.
5. Los documentos de este directorio describen FASTAudit y su evolución técnica. No sustituyen requisitos, formatos ni criterios oficiales de ninguna autoridad administrativa.

## Autoría

FASTAudit fue desarrollado por **Alberto Jorge Galindo-Barboza**.

© 2026 Alberto Jorge Galindo-Barboza. Todos los derechos reservados.
