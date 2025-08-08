import requests
import os
import zipfile
import io

BASE_URL = 'http://127.0.0.1:5000'
TEST_IMAGE_PATH = 'uploads/test_table.png'
SLICES_DIR = 'static/slices'

def run_tests():
    print("--- Running Endpoint Tests ---")

    # --- Test /slice endpoint ---
    print("\nTesting /slice endpoint...")
    slice_lines = [150, 300, 450]
    response = requests.post(
        f'{BASE_URL}/slice',
        json={'filepath': TEST_IMAGE_PATH, 'lines': slice_lines}
    )

    if response.status_code != 200:
        print(f"ERROR: /slice endpoint returned status {response.status_code}")
        print(f"Response: {response.text}")
        return False

    slice_data = response.json()
    if 'slices' not in slice_data or not slice_data['slices']:
        print("ERROR: /slice response did not contain 'slices' key or was empty.")
        return False

    slice_urls = slice_data['slices']
    print(f"SUCCESS: /slice endpoint returned {len(slice_urls)} slices.")

    # Verify that slice files were created
    for url in slice_urls:
        filepath = url.strip('/')
        if not os.path.exists(filepath):
            print(f"ERROR: Slice file not found at {filepath}")
            return False
    print("SUCCESS: All slice files were created on the server.")

    # --- Test /download endpoint ---
    print("\nTesting /download endpoint...")
    response = requests.post(
        f'{BASE_URL}/download',
        json={'urls': slice_urls}
    )

    if response.status_code != 200:
        print(f"ERROR: /download endpoint returned status {response.status_code}")
        return False

    if 'application/zip' not in response.headers.get('Content-Type', ''):
        print(f"ERROR: /download response has incorrect Content-Type: {response.headers.get('Content-Type')}")
        return False

    # Check if the zip file is valid
    try:
        with zipfile.ZipFile(io.BytesIO(response.content)) as z:
            num_files_in_zip = len(z.namelist())
            if num_files_in_zip != len(slice_urls):
                print(f"ERROR: Zip file contains {num_files_in_zip} files, expected {len(slice_urls)}.")
                return False
            print(f"SUCCESS: /download returned a valid zip file with {num_files_in_zip} files.")
    except zipfile.BadZipFile:
        print("ERROR: /download response was not a valid zip file.")
        return False

    print("\n--- All Tests Passed! ---")
    return True

if __name__ == '__main__':
    run_tests()
