import os
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
import cv2
import numpy as np
import zipfile
import io

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['SLICES_FOLDER'] = 'static/slices'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_files():
    files = request.files.getlist('files[]')
    if not files or all(f.filename == '' for f in files):
        return jsonify({'error': 'No selected files'}), 400

    filepaths = []
    for file in files:
        if file:
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            filepaths.append(filepath)

    return jsonify({'filepaths': filepaths})

@app.route('/slice', methods=['POST'])
def slice_image():
    data = request.get_json()
    filepath = data['filepath']
    lines = sorted([int(x) for x in data['lines']])

    img = cv2.imread(filepath)
    if img is None:
        return jsonify({'error': 'Image not found or could not be read'}), 404

    height, width, _ = img.shape

    # Clean up old slices
    slices_folder = app.config['SLICES_FOLDER']
    for filename in os.listdir(slices_folder):
        file_path = os.path.join(slices_folder, filename)
        if os.path.isfile(file_path):
            os.unlink(file_path)

    slice_points = [0] + lines + [width]
    slice_urls = []

    for i in range(len(slice_points) - 1):
        start_x = slice_points[i]
        end_x = slice_points[i+1]

        if start_x >= end_x:
            continue

        sliced_img = img[:, start_x:end_x]

        slice_filename = f'slice_{i}.png'
        slice_filepath = os.path.join(slices_folder, slice_filename)
        cv2.imwrite(slice_filepath, sliced_img)
        slice_urls.append(f'/{slice_filepath}')

    return jsonify({'slices': slice_urls})

@app.route('/download', methods=['POST'])
def download_slices():
    data = request.get_json()
    slice_urls = data.get('urls', [])

    if not slice_urls:
        return jsonify({'error': 'No slices selected for download'}), 400

    memory_file = io.BytesIO()
    with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
        for url in slice_urls:
            # The URL is like '/static/slices/slice_0.png'. We need to make it a local path.
            filepath = url.strip('/')
            if os.path.exists(filepath):
                zf.write(filepath, os.path.basename(filepath))

    memory_file.seek(0)
    return send_file(memory_file, download_name='slices.zip', as_attachment=True, mimetype='application/zip')


if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(app.config['SLICES_FOLDER'], exist_ok=True)
    app.run(debug=True)
