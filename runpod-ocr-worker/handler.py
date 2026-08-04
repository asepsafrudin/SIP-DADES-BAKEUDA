import runpod
import base64
import json
import os
# Simulasi atau implementasi OCR model (contoh: Doctr)
# import cv2
# from doctr.io import DocumentFile
# from doctr.models import ocr_predictor

def process_document(image_base64):
    """
    Fungsi ini harusnya memanggil model OCR.
    Untuk saat ini kita return mock data untuk memastikan integrasi berjalan.
    """
    # TODO: Decode image_base64 and pass to Doctr or VLM
    # decoded_image = base64.b64decode(image_base64)
    # ... proses OCR ...
    
    return {
        "status": "success",
        "data": {
            "nomor_kuitansi": "B-001/BAK/2026",
            "tanggal": "2026-07-28",
            "nominal": 15000000,
            "terbilang": "Lima Belas Juta Rupiah",
            "penerima": "Desa Karanganyar"
        }
    }

def handler(job):
    """
    Handler utama yang dipanggil oleh RunPod Serverless saat ada request masuk.
    """
    job_input = job.get('input', {})
    image_base64 = job_input.get('image', None)
    
    if not image_base64:
        return {"error": "Tidak ada gambar yang dikirim di parameter 'image'"}
        
    try:
        # Eksekusi OCR
        result = process_document(image_base64)
        return result
    except Exception as e:
        return {"error": str(e)}

# Memulai RunPod Serverless
runpod.serverless.start({"handler": handler})
