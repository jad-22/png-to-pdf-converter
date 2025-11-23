import './style.css'
import { jsPDF } from "jspdf";

// State
let selectedFiles = [];

// DOM Elements
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const browseBtn = document.getElementById('browse-btn');
const fileList = document.getElementById('file-list');
const controls = document.getElementById('controls');
const fileCount = document.getElementById('file-count');
const clearAllBtn = document.getElementById('clear-all');
const convertBtn = document.getElementById('convert-btn');
const compressCheckbox = document.getElementById('compress-checkbox');
const qualitySlider = document.getElementById('quality-slider');
const qualityValue = document.getElementById('quality-value');
const qualityControl = document.getElementById('quality-control');

// Event Listeners
browseBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', (e) => {
  handleFiles(e.target.files);
  fileInput.value = ''; // Reset to allow same file selection again
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
  dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  handleFiles(e.dataTransfer.files);
});

clearAllBtn.addEventListener('click', () => {
  selectedFiles = [];
  renderFileList();
});

convertBtn.addEventListener('click', convertToPdf);

compressCheckbox.addEventListener('change', (e) => {
  qualityControl.style.opacity = e.target.checked ? '1' : '0.5';
  qualityControl.style.pointerEvents = e.target.checked ? 'auto' : 'none';
});

qualitySlider.addEventListener('input', (e) => {
  qualityValue.textContent = e.target.value;
});

// Functions
function handleFiles(files) {
  const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  const newFiles = Array.from(files).filter(file => validTypes.includes(file.type));

  if (newFiles.length === 0 && files.length > 0) {
    alert('Please select supported image files (PNG, JPG, WEBP).');
    return;
  }

  selectedFiles = [...selectedFiles, ...newFiles];
  renderFileList();
}

function renderFileList() {
  fileList.innerHTML = '';
  fileCount.textContent = `(${selectedFiles.length})`;

  if (selectedFiles.length > 0) {
    controls.style.display = 'block';
  } else {
    controls.style.display = 'none';
  }

  selectedFiles.forEach((file, index) => {
    const li = document.createElement('li');
    li.className = 'file-item';

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.className = 'file-thumb';
      li.prepend(img);
    };
    reader.readAsDataURL(file);

    const infoDiv = document.createElement('div');
    infoDiv.className = 'file-info';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'file-name';
    nameSpan.textContent = file.name;

    const sizeSpan = document.createElement('span');
    sizeSpan.className = 'file-size';
    sizeSpan.textContent = formatFileSize(file.size);

    infoDiv.appendChild(nameSpan);
    infoDiv.appendChild(sizeSpan);

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    removeBtn.onclick = () => removeFile(index);

    li.appendChild(infoDiv);
    li.appendChild(removeBtn);
    fileList.appendChild(li);
  });
}

function removeFile(index) {
  selectedFiles.splice(index, 1);
  renderFileList();
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function convertToPdf() {
  if (selectedFiles.length === 0) return;

  const originalBtnText = convertBtn.innerHTML;
  convertBtn.innerHTML = 'Converting...';
  convertBtn.disabled = true;

  try {
    const doc = new jsPDF();

    for (let i = 0; i < selectedFiles.length; i++) {
      if (i > 0) {
        doc.addPage();
      }

      const file = selectedFiles[i];
      let imgData, format;
      let imgProps;

      if (compressCheckbox.checked) {
        const quality = parseFloat(qualitySlider.value);
        imgData = await compressImage(file, quality);
        format = 'JPEG'; // Compressed images are always JPEG
        imgProps = await getImageProperties(imgData);
      } else {
        imgData = await readFileAsDataURL(file);
        imgProps = await getImageProperties(imgData);
        // Determine format
        format = 'PNG';
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') format = 'JPEG';
        if (file.type === 'image/webp') format = 'WEBP';
      }

      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();

      // Calculate ratio to fit page
      const widthRatio = pdfWidth / imgProps.width;
      const heightRatio = pdfHeight / imgProps.height;
      const ratio = Math.min(widthRatio, heightRatio);

      const w = imgProps.width * ratio;
      const h = imgProps.height * ratio;

      // Center image
      const x = (pdfWidth - w) / 2;
      const y = (pdfHeight - h) / 2;

      doc.addImage(imgData, format, x, y, w, h);
    }

    doc.save('converted-images.pdf');
  } catch (error) {
    console.error('Error converting to PDF:', error);
    alert('An error occurred during conversion.');
  } finally {
    convertBtn.innerHTML = originalBtnText;
    convertBtn.disabled = false;
  }
}

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getImageProperties(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = url;
  });
}

function compressImage(file, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Optional: Limit max dimensions if needed, e.g., max 2000px
        // const MAX_DIMENSION = 2000;
        // if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        //   if (width > height) {
        //     height *= MAX_DIMENSION / width;
        //     width = MAX_DIMENSION;
        //   } else {
        //     width *= MAX_DIMENSION / height;
        //     height = MAX_DIMENSION;
        //   }
        // }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}
