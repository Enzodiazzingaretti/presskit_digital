# tools/ink — fotos impresas y tinta orgánica

Genera las imágenes de `assets/ink/`: la tapa en dotwork, las fotos con los bordes comidos por celdas,
las manchas tipo Rorschach, el sello de los numerales, las bandas de encaje y las texturas de papel.

```bash
pip install numpy scipy pillow onnxruntime     # onnxruntime solo para "segment"
python3 tools/ink/ink.py -h                     # todos los comandos
```

## Foto nueva para la tapa

1. Recortar a la persona (la primera vez baja el modelo MODNet, 25 MB, a `tools/ink/.cache/`):
   ```bash
   python3 tools/ink/ink.py segment foto.jpg /tmp/recorte.png
   # si en la foto hay más de una persona: --point X,Y sobre la que va
   ```
2. Imprimirla:
   ```bash
   python3 tools/ink/ink.py cover /tmp/recorte.png assets/ink/
   ```
   Deja `cover-ink.webp`, `cover-red.webp` y una vista previa `cover-preview.png` (no se sube).
3. Subir la versión de los archivos en `sw.js` y el `?v=` de `index.html` si cambian de nombre.

Funciona mejor con un retrato de tres cuartos, con la cara bien iluminada y fondo liso.

Si el retrato es cerrado (la persona llena el cuadro), `--margin N` agranda el margen lateral (px de la foto)
para alejarla: así la tapa mantiene la proporción 1456×1586 y el corte a celdas cae en los hombros. Conviene
llevar la foto antes a blanco y negro con buen contraste (la tapa espera ropa oscura: la ropa clara no se
deshace en celdas). La tapa actual (`cover-ink-mask.webp`) salió con `--margin 164`.

Como las `.webp` se cachean un año, una tapa nueva va con **otro nombre** (`cover-ink-<algo>.webp`): hay que
cambiarlo en `index.html`, `sw.js` (y subir `CACHE_NAME`) y en `content.json` → `images.hero`.

## Otras fotos

```bash
python3 tools/ink/ink.py erode foto.jpg assets/ink/bio-cells.webp --grade bio
python3 tools/ink/ink.py erode cabina.jpg assets/ink/live-cells.webp --grade live --cell 21 --depth 0.24 --seed 61
```

## Por qué los archivos pesan poco

La tinta de un solo color (negro o rojo) se guarda sin pérdida con el alfa en 6 niveles: se ve igual
que el original y pesa un tercio. `ink.py pack archivo.webp` re-empaqueta cualquier capa de tinta.
