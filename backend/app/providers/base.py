from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class LLMProvider(ABC):
    @abstractmethod
    async def generate_response(self, prompt: str, system_prompt: Optional[str] = None, **kwargs) -> str:
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        pass

class VLMProvider(ABC):
    @abstractmethod
    async def analyze_image(self, image_path: str, prompt: str) -> Dict[str, Any]:
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        pass

class TranscriptionProvider(ABC):
    @abstractmethod
    async def transcribe_audio_file(self, audio_path: str) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        pass

class OCRProvider(ABC):
    @abstractmethod
    async def extract_text(self, image_path: str) -> str:
        pass

    @abstractmethod
    async def is_available(self) -> bool:
        pass

class EmbeddingProvider(ABC):
    @abstractmethod
    async def get_embedding(self, text: str) -> List[float]:
        pass

    @abstractmethod
    async def get_embeddings(self, texts: List[str]) -> List[List[float]]:
        pass
