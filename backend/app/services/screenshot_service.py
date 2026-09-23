import cv2
import numpy as np
from PIL import Image
import io
import base64
import os
import time
import asyncio
import logging
from pathlib import Path
from typing import Optional, Tuple, Dict, Any

from backend.app.core.config import settings
from backend.app.models.schemas import FrameCapture, VisualCategory
from backend.app.db.database import DatabaseManager, get_session_dir
from backend.app.providers.vlm_provider import vlm_provider
from backend.app.providers.ocr_provider import ocr_provider

logger = logging.getLogger(__name__)

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

    _last_seen: Dict[str, Dict[str, Any]] = {}

    @classmethod
    async def process_frame_data(
        cls,
        session_id: str,
        image_bytes: bytes,
        timestamp_sec: float,
        force_capture: bool = False
    ) -> Optional[FrameCapture]:
        """
        Evaluate frame:
        1. Compute dHash.
        2. Check similarity against the latest frame in this session.
        3. If significant change detected (or force_capture is True), run OCR & VLM classification.
        4. Save image and thumbnail.
        5. Persist to DB and update session state.
        """
        try:
            pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
            cur_hash = cls.calculate_dhash(pil_image)
            
            # Check against latest frame for this session
            last_saved = cls._last_seen.get(session_id)
            if not last_saved:
                last_db_frame = DatabaseManager.get_latest_frame(session_id)
                if last_db_frame and last_db_frame.p_hash:
                    last_saved = {
                        "p_hash": last_db_frame.p_hash,
                        "timestamp_sec": last_db_frame.timestamp_sec,
                        "saved_at": time.time() - 10,
                        "ocr_text": last_db_frame.ocr_text or ""
                    }
                    cls._last_seen[session_id] = last_saved

            if not force_capture and last_saved and last_saved.get("p_hash"):
                last_hash = last_saved["p_hash"]
                dist = cls.hamming_distance(cur_hash, last_hash)
                
                # Check cooldown: minimum 1.5 seconds between slides unless force_capture
                time_since_last = time.time() - last_saved.get("saved_at", 0)
                if time_since_last < 1.5:
                    return None
                
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
            
            # Use ultra-fast Computer Vision heuristics (<5ms) for immediate classification
            cv_res = vlm_provider._heuristic_cv_analysis(str(img_path))
            category = cv_res.get("category", VisualCategory.SLIDE)
            description = cv_res.get("visual_description", "Lecture visual")
            importance = cv_res.get("importance_score", 0.7)
            concepts = cv_res.get("concepts", [])
                
            frame_capture = FrameCapture(
                session_id=session_id,
                timestamp_sec=timestamp_sec,
                timestamp_formatted=formatted_time,
                image_path=str(img_path),
                thumbnail_path=str(thumb_path),
                p_hash=cur_hash,
                ocr_text="",
                visual_description=description,
                category=category,
                importance_score=importance,
                concepts=concepts
            )
            
            # Persist to DB immediately so UI and slide reel update with zero lag
            DatabaseManager.add_frame(frame_capture)

            # Update in-memory tracker
            cls._last_seen[session_id] = {
                "p_hash": cur_hash,
                "timestamp_sec": timestamp_sec,
                "saved_at": time.time(),
                "ocr_text": ""
            }

            # Asynchronously run OCR & knowledge extraction in background so meet never freezes
            asyncio.create_task(cls._enrich_frame_async(
                session_id=session_id,
                frame_id=frame_capture.id,
                img_path=str(img_path),
                formatted_time=formatted_time
            ))

            return frame_capture
            
        except Exception as e:
            logger.error(f"Error processing frame: {e}", exc_info=True)
            return None

    _is_enriching: bool = False

    @classmethod
    async def _enrich_frame_async(cls, session_id: str, frame_id: str, img_path: str, formatted_time: str):
        """Non-blocking background worker that enriches frame with OCR text and deep concepts."""
        if cls._is_enriching:
            return
        cls._is_enriching = True
        try:
            from backend.app.services.knowledge_service import knowledge_service
            ocr_text = await ocr_provider.extract_text(img_path)
            updates: Dict[str, Any] = {}
            if ocr_text:
                updates["ocr_text"] = ocr_text
                if len(ocr_text) > settings.MIN_OCR_CHARS_SIGNIFICANT:
                    updates["importance_score"] = 0.85

            if settings.ENABLE_LIVE_VLM:
                try:
                    vlm_res = await vlm_provider.analyze_image(img_path)
                    if vlm_res:
                        updates["category"] = vlm_res.get("category", VisualCategory.SLIDE).value
                        updates["visual_description"] = vlm_res.get("visual_description", "")
                except Exception as vlm_err:
                    logger.debug(f"Live VLM background error: {vlm_err}")

            if updates:
                DatabaseManager.update_frame_metadata(frame_id, updates)

            # Extract concepts if significant OCR text is discovered
            if ocr_text and len(ocr_text.strip()) > 15:
                await knowledge_service.extract_knowledge_from_chunk(
                    session_id=session_id,
                    transcript_text=f"Slide Title/Notes: {ocr_text}",
                    timestamp_formatted=formatted_time
                )
        except Exception as e:
            logger.debug(f"Background frame enrichment note: {e}")
        finally:
            cls._is_enriching = False

    @staticmethod
    def format_timestamp(sec: float) -> str:
        mins = int(sec // 60)
        secs = int(sec % 60)
        hrs = int(mins // 60)
        if hrs > 0:
            return f"{hrs:02d}:{mins % 60:02d}:{secs:02d}"
        return f"{mins:02d}:{secs:02d}"

screenshot_service = ScreenshotIntelligenceService()
