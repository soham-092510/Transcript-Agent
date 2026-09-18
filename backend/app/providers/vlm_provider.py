import cv2
import numpy as np
import base64
import httpx
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional
from backend.app.providers.base import VLMProvider
from backend.app.core.config import settings
from backend.app.models.schemas import VisualCategory

logger = logging.getLogger(__name__)

class LocalOllamaVLMProvider(VLMProvider):
    def __init__(self, base_url: str = settings.OLLAMA_BASE_URL, model: str = settings.DEFAULT_VLM_MODEL):
        self.base_url = base_url
        self.model = model
        self.client = httpx.AsyncClient(timeout=60.0)

    async def is_available(self) -> bool:
        try:
            resp = await self.client.get(f"{self.base_url}/api/tags")
            if resp.status_code == 200:
                models = [m.get("name", "") for m in resp.json().get("models", [])]
                return any("vl" in m.lower() or "vision" in m.lower() or "llava" in m.lower() for m in models)
        except Exception:
            pass
        return False

    async def analyze_image(self, image_path: str, prompt: str = "Analyze this educational slide") -> Dict[str, Any]:
        # 1. Attempt VLM via Ollama if vision model is available
        if await self.is_available():
            try:
                with open(image_path, "rb") as img_f:
                    b64_img = base64.b64encode(img_f.read()).decode("utf-8")
                
                payload = {
                    "model": self.model,
                    "prompt": (
                        "Analyze this educational slide or screen frame. "
                        "Determine: 1. Category (TITLE, SLIDE, DIAGRAM, CODE, TABLE, DEFINITION, DEMO, CONFIGURATION). "
                        "2. Educational description. 3. Key concepts visible. 4. Importance score from 0.0 to 1.0."
                    ),
                    "images": [b64_img],
                    "stream": False
                }
                resp = await self.client.post(f"{self.base_url}/api/generate", json=payload)
                if resp.status_code == 200:
                    text_resp = resp.json().get("response", "")
                    return self._parse_vlm_response(text_resp, image_path)
            except Exception as e:
                logger.warning(f"VLM call failed: {e}. Falling back to Computer Vision heuristics.")

        # 2. Heuristic Computer Vision Fallback
        return self._heuristic_cv_analysis(image_path)

    def _heuristic_cv_analysis(self, image_path: str) -> Dict[str, Any]:
        """
        Uses OpenCV edge density, contour analysis, and aspect ratios to categorize
        and score importance without needing heavy GPU models.
        """
        try:
            img = cv2.imread(image_path)
            if img is None:
                return {
                    "category": VisualCategory.SLIDE,
                    "visual_description": "Educational slide content",
                    "importance_score": 0.6,
                    "concepts": ["Concept Overview"]
                }
            
            h, w, _ = img.shape
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            
            # Edge detection to calculate visual complexity
            edges = cv2.Canny(gray, 50, 150)
            edge_density = np.sum(edges > 0) / (h * w)
            
            # Find contours to detect diagram blocks / tables
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            contour_count = len(contours)
            
            # Brightness variance
            mean_val, std_dev = cv2.meanStdDev(gray)
            
            # Heuristic classification
            category = VisualCategory.SLIDE
            description = "Educational lecture slide"
            importance = 0.7
            concepts = ["Core Topic"]
            
            if contour_count > 150 and edge_density > 0.08:
                category = VisualCategory.DIAGRAM
                description = "Architecture or flow diagram illustrating process relationships."
                importance = 0.95
                concepts = ["Architecture", "System Flow", "Relationships"]
            elif edge_density < 0.015 and std_dev[0][0] < 30:
                category = VisualCategory.TITLE
                description = "Section header or introduction slide."
                importance = 0.3
                concepts = ["Introduction"]
            elif 50 < contour_count <= 150:
                category = VisualCategory.TABLE if edge_density > 0.05 else VisualCategory.DEFINITION
                description = "Comparative table or structured definition block."
                importance = 0.85
                concepts = ["Comparison", "Definitions"]
            else:
                category = VisualCategory.SLIDE
                description = "Lecture slide outlining key concepts and bullet points."
                importance = 0.75
                concepts = ["Key Principles"]

            return {
                "category": category,
                "visual_description": description,
                "importance_score": round(float(importance), 2),
                "concepts": concepts
            }
        except Exception as e:
            logger.error(f"Heuristic CV analysis error: {e}")
            return {
                "category": VisualCategory.SLIDE,
                "visual_description": "Lecture visual",
                "importance_score": 0.5,
                "concepts": []
            }

    def _parse_vlm_response(self, text: str, image_path: str) -> Dict[str, Any]:
        lower = text.lower()
        category = VisualCategory.SLIDE
        if "diagram" in lower or "architecture" in lower or "topology" in lower:
            category = VisualCategory.DIAGRAM
        elif "code" in lower or "script" in lower or "terminal" in lower:
            category = VisualCategory.CODE
        elif "table" in lower or "comparison" in lower:
            category = VisualCategory.TABLE
        elif "title" in lower or "agenda" in lower:
            category = VisualCategory.TITLE
        elif "definition" in lower:
            category = VisualCategory.DEFINITION

        importance = 0.85 if category in [VisualCategory.DIAGRAM, VisualCategory.TABLE, VisualCategory.CODE] else 0.7
        return {
            "category": category,
            "visual_description": text[:200].strip(),
            "importance_score": importance,
            "concepts": ["Key Insight"]
        }

# Global singleton
vlm_provider = LocalOllamaVLMProvider()
