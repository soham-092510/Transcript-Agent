import logging
import asyncio
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
            def _check():
                pytesseract.get_tesseract_version()
                return True
            self._available = await asyncio.to_thread(_check)
        except Exception:
            self._available = False
        return self._available

    async def extract_text(self, image_path: str) -> str:
        if await self.is_available():
            try:
                import pytesseract
                def _do_ocr():
                    img = Image.open(image_path)
                    return pytesseract.image_to_string(img).strip()
                return await asyncio.to_thread(_do_ocr)
            except Exception as e:
                logger.debug(f"Tesseract OCR skipped: {e}")
        
        return ""

ocr_provider = TesseractOCRProvider()
