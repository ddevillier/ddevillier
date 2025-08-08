document.addEventListener('DOMContentLoaded', () => {
    const imageLoader = document.getElementById('image-loader');
    const canvas = document.getElementById('image-canvas');
    const ctx = canvas.getContext('2d');

    let image = new Image();
    let imageFilepath = '';
    let lines = [];
    let draggingLineIndex = null;
    let isDragging = false;

    const redrawCanvas = () => {
        if (!image.src) return;

        const container = document.getElementById('canvas-container');
        const containerWidth = container.offsetWidth;
        const scale = containerWidth / image.naturalWidth;

        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;

        canvas.style.width = `${image.naturalWidth * scale}px`;
        canvas.style.height = `${image.naturalHeight * scale}px`;

        ctx.drawImage(image, 0, 0);

        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        lines.forEach(lineX => {
            ctx.beginPath();
            ctx.moveTo(lineX, 0);
            ctx.lineTo(lineX, canvas.height);
            ctx.stroke();
        });
    };

    let imageFilepaths = [];
    let currentImageIndex = 0;

    imageLoader.addEventListener('change', (e) => {
        const files = e.target.files;
        if (!files.length) return;

        const formData = new FormData();
        for (const file of files) {
            formData.append('files[]', file);
        }

        fetch('/upload', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.filepaths && data.filepaths.length > 0) {
                imageFilepaths = data.filepaths;
                currentImageIndex = 0;
                loadImage(currentImageIndex);
                document.getElementById('image-navigation').style.display = 'block';
            }
        })
        .catch(error => console.error('Error uploading images:', error));
    });

    const loadImage = (index) => {
        if (index < 0 || index >= imageFilepaths.length) return;
        imageFilepath = imageFilepaths[index];
        image.src = imageFilepath + '?' + new Date().getTime(); // Avoid browser caching
        image.onload = () => {
            lines = [];
            redrawCanvas();
            updateImageCounter();
        };
    };

    const updateImageCounter = () => {
        const counter = document.getElementById('image-counter');
        counter.textContent = `${currentImageIndex + 1} / ${imageFilepaths.length}`;
    };

    document.getElementById('prev-image').addEventListener('click', () => {
        if (currentImageIndex > 0) {
            currentImageIndex--;
            loadImage(currentImageIndex);
        }
    });

    document.getElementById('next-image').addEventListener('click', () => {
        if (currentImageIndex < imageFilepaths.length - 1) {
            currentImageIndex++;
            loadImage(currentImageIndex);
        }
    });

    const fullscreenButton = document.getElementById('fullscreen-button');
    const canvasContainer = document.getElementById('canvas-container');

    fullscreenButton.addEventListener('click', () => {
        canvasContainer.classList.toggle('fullscreen');
        redrawCanvas(); // Redraw canvas to adjust to new size
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && canvasContainer.classList.contains('fullscreen')) {
            canvasContainer.classList.remove('fullscreen');
            redrawCanvas(); // Redraw canvas to adjust to original size
        }
    });

    const getMousePos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        return {
            x: (e.clientX - rect.left) * scaleX,
        };
    };

    const getNearestLine = (x, threshold = 10) => {
        for (let i = 0; i < lines.length; i++) {
            if (Math.abs(lines[i] - x) < threshold) {
                return i;
            }
        }
        return null;
    };

    canvas.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // Only left-click
        const pos = getMousePos(e);
        const nearestLineIndex = getNearestLine(pos.x);

        if (nearestLineIndex !== null) {
            isDragging = true;
            draggingLineIndex = nearestLineIndex;
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const pos = getMousePos(e);
        lines[draggingLineIndex] = pos.x;
        redrawCanvas();
    });

    canvas.addEventListener('mouseup', (e) => {
        if (e.button !== 0) return;
        if (!isDragging) { // This was a click, not a drag
            const pos = getMousePos(e);
            if (getNearestLine(pos.x) === null) {
                lines.push(pos.x);
                lines.sort((a, b) => a - b);
                redrawCanvas();
            }
        }
        isDragging = false;
        draggingLineIndex = null;
    });

    canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        const pos = getMousePos(e);
        const nearestLineIndex = getNearestLine(pos.x);
        if (nearestLineIndex !== null) {
            lines.splice(nearestLineIndex, 1);
            redrawCanvas();
        }
    });

    const sliceButton = document.getElementById('slice-button');
    sliceButton.addEventListener('click', () => {
        if (!imageFilepath || lines.length === 0) {
            alert('Please upload an image and add at least one slice line.');
            return;
        }

        fetch('/slice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                filepath: imageFilepath,
                lines: lines
            })
        })
        .then(response => response.json())
        .then(data => {
            const slicesContainer = document.getElementById('slices-container');
            slicesContainer.innerHTML = ''; // Clear previous slices

            if (data.slices && data.slices.length > 0) {
                data.slices.forEach((sliceUrl, index) => {
                    const sliceDiv = document.createElement('div');
                    sliceDiv.className = 'slice';

                    const img = document.createElement('img');
                    img.src = sliceUrl + '?' + new Date().getTime(); // Avoid caching

                    const checkbox = document.createElement('input');
                    checkbox.type = 'checkbox';
                    checkbox.checked = true;
                    checkbox.className = 'slice-checkbox';
                    checkbox.dataset.url = sliceUrl;

                    const label = document.createElement('label');
                    label.textContent = `Slice ${index + 1}`;

                    sliceDiv.appendChild(img);
                    sliceDiv.appendChild(checkbox);
                    sliceDiv.appendChild(label);
                    slicesContainer.appendChild(sliceDiv);
                });
            }
        })
        .catch(error => {
            console.error('Error slicing image:', error);
        });
    });

    const downloadButton = document.getElementById('download-button');
    downloadButton.addEventListener('click', () => {
        const selectedUrls = [];
        const checkboxes = document.querySelectorAll('.slice-checkbox:checked');

        checkboxes.forEach(checkbox => {
            selectedUrls.push(checkbox.dataset.url);
        });

        if (selectedUrls.length === 0) {
            alert('Please select at least one slice to download.');
            return;
        }

        fetch('/download', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ urls: selectedUrls })
        })
        .then(response => response.blob())
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'slices.zip';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        })
        .catch(error => console.error('Error downloading slices:', error));
    });
});
