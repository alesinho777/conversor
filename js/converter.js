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
  };

  let pendingFiles = [];
  let convertedFiles = [];

  function updateQualityVisibility() {
    qualityGroup.style.display = formatSelect.value === "image/png" ? "none" : "flex";
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

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) return;
          addResult(file.name, blob, mimeType);
        },
        mimeType,
        mimeType === "image/png" ? undefined : quality
      );
    };

    img.onerror = () => URL.revokeObjectURL(objectUrl);
    img.src = objectUrl;
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

    const item = document.createElement("div");
    item.className = "result-item";
    item.innerHTML = `
      <img src="${url}" alt="${fileName}">
      <div class="meta">${fileName} · ${formatBytes(blob.size)}</div>
      <a class="btn btn-primary" href="${url}" download="${fileName}">Descargar</a>
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
