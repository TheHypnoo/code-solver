# Code Solver

Herramienta web para ayudar a descifrar códigos numéricos de `3` a `6` dígitos usando pistas por color:

- `rojo`: el dígito no pertenece al código
- `azul`: el dígito pertenece, pero está en otra posición
- `verde`: el dígito es correcto y está en la posición correcta

La aplicación está pensada para partidas con:

- `5 jugadas` en total
- `5 intentos máximos` por cada jugada
- códigos sin dígitos repetidos

Web pública: [https://thehypnoo.github.io/code-solver/](https://thehypnoo.github.io/code-solver/)

## Cómo funciona

1. Elige la jugada activa.
2. Fija la longitud del código para esa jugada (`3`, `4`, `5` o `6`).
3. Introduce cada intento en formato compacto, por ejemplo `1r2v3r4a`.
4. La app recalcula automáticamente:
   - las combinaciones todavía posibles,
   - una recomendación para el siguiente intento,
   - los dígitos descartados, fijos o mal colocados.

También acepta separadores, por ejemplo: `1r 2v 3r 4a`.

## Desarrollo local

```bash
npm install
npm run dev
```

## Scripts

```bash
npm run dev
npm run test
npm run lint
npm run build
```

## Despliegue

El proyecto está preparado para desplegarse automáticamente en GitHub Pages mediante GitHub Actions al hacer push a `main`.
