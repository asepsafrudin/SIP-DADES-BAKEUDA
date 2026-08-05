# scripts/test-row-grouping.py
import easyocr
import re
import sys

print("Initializing EasyOCR...")
reader = easyocr.Reader(['id', 'en'], gpu=False)

print("Running OCR on /tmp/bkk_page_5.jpg...")
results = reader.readtext('/tmp/bkk_page_5.jpg')
print(f"Detected {len(results)} text boxes.")

# Group boxes by Y-coordinate
rows = []
tolerance = 15.0 # pixels tolerance for Y-coordinate grouping

# Sort boxes by Y coordinate of center
boxes = []
for bbox, text, prob in results:
    x_center = sum([p[0] for p in bbox]) / 4
    y_center = sum([p[1] for p in bbox]) / 4
    boxes.append({
        'x': x_center,
        'y': y_center,
        'text': text,
        'prob': prob
    })

# Sort by Y
boxes.sort(key=lambda b: b['y'])

for box in boxes:
    # Find if there is an existing row within Y tolerance
    placed = False
    for r in rows:
        # Calculate average Y of the row
        avg_y = sum([b['y'] for b in r]) / len(r)
        if abs(box['y'] - avg_y) <= tolerance:
            r.append(box)
            placed = True
            break
    if not placed:
        rows.append([box])

# Sort each row by X coordinate (left to right)
reconstructed_lines = []
for r in rows:
    r.sort(key=lambda b: b['x'])
    line_text = " | ".join([b['text'] for b in r])
    reconstructed_lines.append(line_text)

# Sort reconstructed lines by their average Y coordinate to maintain top-to-bottom order
rows_with_y = []
for r in rows:
    avg_y = sum([b['y'] for b in r]) / len(r)
    r.sort(key=lambda b: b['x'])
    line_text = " | ".join([b['text'] for b in r])
    rows_with_y.append((avg_y, line_text))

rows_with_y.sort(key=lambda x: x[0])
reconstructed_lines = [r[1] for r in rows_with_y]

print("\n=== Reconstructed Lines ===")
for idx, line in enumerate(reconstructed_lines[:40]):
    print(f"{idx:02d} | {line}")

print("\n=== Parsing Extraction Test ===")
extracted_data = []
for line in reconstructed_lines:
    # Pattern to extract village/sub-district: e.g. "Desa Pangempon Kec. Kejobong" or "Pangempon | Kejobong"
    # Let's search for village and sub-district names
    desa_match = re.search(r'Desa\s+([A-Za-z\s]+?)\s+Kec\.?\s+([A-Za-z\s]+?)(?=\s*\||\s*$)', line, re.IGNORECASE)
    
    # Extract nominal (e.g. "150.000.000")
    clean_line = re.sub(r'[,.]', '', line)
    numbers = re.findall(r'\b\d{7,10}\b', clean_line)
    nominal = int(numbers[-1]) if numbers else 0
    
    if desa_match and nominal > 0:
        nama_desa = f"{desa_match.group(1).strip()} Kec. {desa_match.group(2).strip()}"
        extracted_data.append({
            "nama_desa": nama_desa,
            "nominal": nominal,
            "line": line
        })

print(f"Successfully extracted {len(extracted_data)} entries:")
for idx, item in enumerate(extracted_data[:20]):
    print(f"{idx:02d} | Desa: {item['nama_desa']:<35} | Nominal: {item['nominal']:<12} | Line: {item['line'][:80]}")
