import numpy as np
import cv2
import os

def generate_image():
    # Create a blank image
    width, height = 600, 200
    image = np.zeros((height, width, 3), dtype=np.uint8)

    # Define colors for columns
    colors = [
        (255, 200, 200),  # Light Red
        (200, 255, 200),  # Light Green
        (200, 200, 255),  # Light Blue
        (255, 255, 200)   # Light Yellow
    ]

    # Define column boundaries
    boundaries = [0, 150, 300, 450, width]

    # Draw colored rectangles for each column
    for i in range(len(boundaries) - 1):
        start_x = boundaries[i]
        end_x = boundaries[i+1]
        color = colors[i]
        cv2.rectangle(image, (start_x, 0), (end_x, height), color, -1)

    # Add some text to each column
    for i in range(len(boundaries) - 1):
        text = f"Column {i+1}"
        text_pos_x = boundaries[i] + 20
        text_pos_y = height // 2
        cv2.putText(image, text, (text_pos_x, text_pos_y), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)

    # Ensure the upload directory exists
    upload_dir = 'uploads'
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir)

    # Save the image
    save_path = os.path.join(upload_dir, 'test_table.png')
    cv2.imwrite(save_path, image)
    print(f"Test image saved to {save_path}")

if __name__ == '__main__':
    generate_image()
