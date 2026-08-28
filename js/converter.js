(function () {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  const formatSelect = document.getElementById("format-select");
  const qualityGroup = document.getElementById("quality-group");
  const qualityRange = document.getElementById("quality-range");
  const qualityValue = document.getElementById("quality-value");
  const results = document.getElementById("results");
  const resultsList = document.getElementById("results-list");
  const downloadAllBtn = document.getElementById("download-all");
  const selectedFilesBox = document.getElementById("selected-files");
  const selectedCount = document.getElementById("selected-count");
  const convertBtn = document.getElementById("convert-btn");
  const canvas = document.getElementById("hidden-canvas");
  const ctx = canvas.getContext("2d");

  const EXTENSIONS = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/bmp": "bmp",
    "application/pdf": "pdf",
  };

  const NO_QUALITY_FORMATS = new Set(["image/png", "image/bmp", "application/pdf"]);

  let pendingFiles = [];
  let convertedFiles = [];

  function updateQualityVisibility() {
    qualityGroup.style.display = NO_QUALITY_FORMATS.has(formatSelect.value) ? "none" : "flex";
  }

  formatSelect.addEventListener("change", updateQualityVisibility);
  updateQualityVisibility();

  qualityRange.addEventListener("input", () => {
    qualityValue.textContent = qualityRange.value;
  });

  ["dragenter", "dragover"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    });
  });

  dropzone.addEventListener("drop", (e) => {
    const files = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    if (files.length) selectFiles(files);
  });

  fileInput.addEventListener("change", () => {
    const files = Array.from(fileInput.files);
    if (files.length) selectFiles(files);
    fileInput.value = "";
  });

  function selectFiles(files) {
    pendingFiles = files;
    selectedFilesBox.hidden = false;
    selectedCount.textContent = files.length === 1
      ? `1 imagen lista para convertir: ${files[0].name}`
      : `${files.length} imágenes listas para convertir`;

    results.hidden = true;
    resultsList.innerHTML = "";
    convertedFiles = [];
  }

  convertBtn.addEventListener("click", () => {
    if (!pendingFiles.length) return;

    convertedFiles = [];
    resultsList.innerHTML = "";
    results.hidden = false;
    downloadAllBtn.hidden = pendingFiles.length < 2;

    const mimeType = formatSelect.value;
    const quality = Number(qualityRange.value) / 100;

    pendingFiles.forEach((file) => convertFile(file, mimeType, quality));
  });

  function convertFile(file, mimeType, quality) {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      if (mimeType === "image/bmp") {
        URL.revokeObjectURL(objectUrl);
        addResult(file.name, canvasToBMP(canvas), mimeType);
        return;
      }

      if (mimeType === "application/pdf") {
        URL.revokeObjectURL(objectUrl);
        canvasToPDF(canvas, quality).then((blob) => addResult(file.name, blob, mimeType));
        return;
      }

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) {
            addError(file.name, "tu navegador no soporta convertir a este formato");
            return;
          }
          addResult(file.name, blob, mimeType);
        },
        mimeType,
        mimeType === "image/png" ? undefined : quality
      );
    };

    img.onerror = () => URL.revokeObjectURL(objectUrl);
    img.src = objectUrl;
  }

  function canvasToBMP(sourceCanvas) {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    const sourceCtx = sourceCanvas.getContext("2d");
    const pixels = sourceCtx.getImageData(0, 0, w, h).data;

    const rowSize = Math.floor((24 * w + 31) / 32) * 4;
    const pixelArraySize = rowSize * h;
    const fileSize = 54 + pixelArraySize;

    const buffer = new ArrayBuffer(fileSize);
    const view = new DataView(buffer);

    view.setUint8(0, 0x42);
    view.setUint8(1, 0x4d);
    view.setUint32(2, fileSize, true);
    view.setUint32(10, 54, true);

    view.setUint32(14, 40, true);
    view.setInt32(18, w, true);
    view.setInt32(22, h, true);
    view.setUint16(26, 1, true);
    view.setUint16(28, 24, true);
    view.setUint32(34, pixelArraySize, true);
    view.setInt32(38, 2835, true);
    view.setInt32(42, 2835, true);

    let offset = 54;
    for (let y = h - 1; y >= 0; y--) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        view.setUint8(offset++, pixels[i + 2]);
        view.setUint8(offset++, pixels[i + 1]);
        view.setUint8(offset++, pixels[i]);
      }
      offset += rowSize - w * 3;
    }

    return new Blob([buffer], { type: "image/bmp" });
  }

  function canvasToPDF(sourceCanvas, quality) {
    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    const doc = new window.jspdf.jsPDF({
      orientation: w > h ? "landscape" : "portrait",
      unit: "px",
      format: [w, h],
    });
    const dataUrl = sourceCanvas.toDataURL("image/jpeg", quality || 0.92);
    doc.addImage(dataUrl, "JPEG", 0, 0, w, h);
    return Promise.resolve(doc.output("blob"));
  }

  function baseName(name) {
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.slice(0, dot) : name;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  function addResult(originalName, blob, mimeType) {
    const ext = EXTENSIONS[mimeType];
    const fileName = `${baseName(originalName)}.${ext}`;
    const url = URL.createObjectURL(blob);

    convertedFiles.push({ name: fileName, blob });

    const preview = mimeType === "application/pdf"
      ? `<div class="result-preview-placeholder">PDF</div>`
      : `<img src="${url}" alt="${fileName}">`;

    const item = document.createElement("div");
    item.className = "result-item";
    item.innerHTML = `
      ${preview}
      <div class="meta">${fileName} · ${formatBytes(blob.size)}</div>
      <a class="btn btn-primary" href="${url}" download="${fileName}">Descargar</a>
    `;
    resultsList.appendChild(item);
  }

  function addError(originalName, message) {
    const item = document.createElement("div");
    item.className = "result-item";
    item.innerHTML = `
      <div class="result-preview-placeholder">⚠️</div>
      <div class="meta">${originalName}: ${message}</div>
    `;
    resultsList.appendChild(item);
  }

  downloadAllBtn.addEventListener("click", async () => {
    if (!convertedFiles.length || typeof JSZip === "undefined") return;
    const zip = new JSZip();
    convertedFiles.forEach((f) => zip.file(f.name, f.blob));
    const zipBlob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "imagenes-convertidas.zip";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });
})();
