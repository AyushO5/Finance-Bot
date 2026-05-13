import pytesseract
from PIL import Image
import io

def parse_image(file):
    try:
        image = Image.open(io.BytesIO(file.read()))
        # OCR the image
        text = pytesseract.image_to_string(image)
        return text.strip()
    except pytesseract.TesseractNotFoundError:
        raise Exception("Tesseract OCR is not installed on the system. Please install it (e.g., sudo apt-get install tesseract-ocr) to parse images.")
    except Exception as e:
        raise Exception(f"Failed to process image: {str(e)}")
