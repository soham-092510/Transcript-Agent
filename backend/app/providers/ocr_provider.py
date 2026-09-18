import logging
from PIL import Image
import os
from backend.app.providers.base import OCRProvider

logger = logging.getLogger(__name__)

class TesseractOCRProvider(OCRProvider):
    def __init__(self):
        self._available = None

    async def is_available(self) -> bool:
        if self._available is not None:
            return self._available
        try:
            import pytesseract
            # Test quick version call
            pytesseract.get_tesseract_version()
            self._available = True
        except Exception:
            self._available = False
        return self._available

    async def extract_text(self, image_path: str) -> str:
        if await self.is_available():
            try:
                import pytesseract
                img = Image.open(image_path)
                text = pytesseract.image_to_string(img)
                return text.strip()
            except Exception as e:
                logger.warning(f"Tesseract OCR failed: {e}. Falling back to visual text inference.")
        
        return ""

ocr_provider = TesseractOCRProvider()
