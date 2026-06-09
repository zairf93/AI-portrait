from abc import ABC, abstractmethod
from typing import List, Optional, Dict, Any

class BaseRepository(ABC):
    @abstractmethod
    def init_db(self) -> None: pass

    @abstractmethod
    def create_model_entry(self, model_id: str, image_paths: List[str]) -> None: pass

    @abstractmethod
    def get_model_entry(self, model_id: str) -> List[str]: pass

    @abstractmethod
    def create_job(self, job_id: str, model_id: Optional[str], style: str) -> None: pass

    @abstractmethod
    def update_job_status(self, job_id: str, status: str, output_path: Optional[str] = None, error: Optional[str] = None) -> None: pass

    @abstractmethod
    def get_job(self, job_id: str) -> Optional[Dict[str, Any]]: pass
