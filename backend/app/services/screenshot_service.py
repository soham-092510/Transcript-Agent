import cv2
import numpy as np
from PIL import Image
import io
import base64
import os
import time
from pathlib import Path
from typing import Optional, Tuple, Dict, Any

from backend.app.core.config import settings
from backend.app.models.schemas import FrameCapture, VisualCategory
from backend.app.db.database import DatabaseManager, get_session_dir
from backend.app.providers.vlm_provider import vlm_provider
from backend.app.providers.ocr_provider import ocr_provider

class ScreenshotIntelligenceService:
    """
    Intelligent Frame Extraction and Deduplication Engine.
    Prevents taking thousands of redundant frames.
    Uses perceptual difference hashing (dHash), scene change thresholds,
    OCR text extraction, and VLM classification.
    """

    @staticmethod
    def calculate_dhash(image: Image.Image, hash_size: int = 8) -> str:
        """Calculate difference hash (dHash) of an image."""
        # Resize to hash_size + 1 by hash_size
        resized = image.convert('L').resize((hash_size + 1, hash_size), Image.Resampling.BILINEAR)
        pixels = list(resized.getdata())
        
        # Compare adjacent pixels
        diff = []
        for row in range(hash_size):
            for col in range(hash_size):
                pixel_left = pixels[row * (hash_size + 1) + col]
                pixel_right = pixels[row * (hash_size + 1) + col + 1]
                diff.append(pixel_left > pixel_right)
                
        # Convert bools to hex string
        decimal_val = 0
        hex_str = []
        for i, val in enumerate(diff):
            if val:
                decimal_val += 2 ** (i % 4)
            if i % 4 == 3:
                hex_str.append(hex(decimal_val)[2:])
                decimal_val = 0
        return "".join(hex_str)

    @staticmethod
    def hamming_distance(hash1: str, hash2: str) -> int:
        """Calculate Hamming distance between two hex hash strings."""
        if not hash1 or not hash2 or len(hash1) != len(hash2):
            return 999
        return sum(c1 != c2 for c1, c2 in zip(hash1, hash2))

    @classmethod
    async def process_frame_data(
        cls,
        session_id: str,
        image_bytes: bytes,
        timestamp_sec: float
    ) -> Optional[FrameCapture]:
        """
        Evaluate frame:
        1. Compute dHash.
        2. Check similarity against recent frames.
        3. If significant change detected, run OCR & VLM classification.
        4. Save image and thumbnail.
        5. Persist to DB.
        """
        try:
            pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            cur_hash = cls.calculate_dhash(pil_image)
            
            # Check against existing frames in this session
            existing_frames = DatabaseManager.get_frames(session_id)
            if existing_frames:
                last_frame = existing_frames[-1]
                if last_frame.p_hash:
                    dist = cls.hamming_distance(cur_hash, last_frame.p_hash)
                    # If distance is too small, it's a duplicate or stationary slide
                    if dist < settings.PERCEPTUAL_HASH_DIFF_THRESHOLD:
                        return None

            # Generate file paths
            session_dir = get_session_dir(session_id)
            screenshots_dir = session_dir / "screenshots"
            
            formatted_time = cls.format_timestamp(timestamp_sec)
            safe_ts = formatted_time.replace(":", "-")
            filename = f"frame_{safe_ts}_{int(time.time() * 1000) % 10000}.jpg"
            thumb_name = f"thumb_{safe_ts}_{int(time.time() * 1000) % 10000}.jpg"
            
            img_path = screenshots_dir / filename
            thumb_path = screenshots_dir / thumb_name
            
            # Save original image (optimized JPEG)
            pil_image.save(img_path, "JPEG", quality=85)
            
            # Save thumbnail
            thumb_img = pil_image.copy()
            thumb_img.thumbnail((320, 180), Image.Resampling.LANCZOS)
            thumb_img.save(thumb_path, "JPEG", quality=80)
            
            # Extract OCR text
            ocr_text = await ocr_provider.extract_text(str(img_path))
            
            # Run visual analysis via VLM or CV heuristics
            vlm_res = await vlm_provider.analyze_image(str(img_path))
            
            category = vlm_res.get("category", VisualCategory.SLIDE)
            description = vlm_res.get("visual_description", "Lecture visual")
            importance = vlm_res.get("importance_score", 0.7)
            concepts = vlm_res.get("concepts", [])
            
            # If OCR found substantial text, boost importance
            if len(ocr_text) > settings.MIN_OCR_CHARS_SIGNIFICANT:
                importance = min(1.0, importance + 0.15)
                
            frame_capture = FrameCapture(
                session_id=session_id,
                timestamp_sec=timestamp_sec,
                timestamp_formatted=formatted_time,
                image_path=str(img_path),
                thumbnail_path=str(thumb_path),
                p_hash=cur_hash,
                ocr_text=ocr_text,
                visual_description=description,
                category=category,
                importance_score=importance,
                concepts=concepts
            )
            
            DatabaseManager.add_frame(frame_capture)
            return frame_capture
            
        except Exception as e:
            print(f"Error processing frame: {e}")
            return None

    @staticmethod
    def format_timestamp(sec: float) -> str:
        mins = int(sec // 60)
        secs = int(sec % 60)
        hrs = int(mins // 60)
        if hrs > 0:
            return f"{hrs:02d}:{mins % 60:02d}:{secs:02d}"
        return f"{mins:02d}:{secs:02d}"

screenshot_service = ScreenshotIntelligenceService()
