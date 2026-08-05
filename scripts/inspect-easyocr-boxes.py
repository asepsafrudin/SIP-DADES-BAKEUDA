# scripts/inspect-easyocr-boxes.py
import easyocr
import sys

print("Initializing EasyOCR...")
reader = easyocr.Reader(['id', 'en'], gpu=False)

print("Running OCR on /tmp/bkk_page_5.jpg...")
results = reader.readtext('/tmp/bkk_page_5.jpg')

print(f"Detected {len(results)} text boxes:")
for idx, (bbox, text, prob) in enumerate(results[:100]):
    # bbox format: [[x0, y0], [x1, y1], [x2, y2], [x3, y3]]
    x_center = sum([p[0] for p in bbox]) / 4
    y_center = sum([p[1] for p in bbox]) / 4
    print(f"{idx:03d} | Center: ({x_center:.1f}, {y_center:.1f}) | Text: '{text}' (prob: {prob:.2f})")
