from abc import ABC, abstractmethod
from pathlib import Path

from projectpilot.core.config import get_settings


class StorageProvider(ABC):
    @abstractmethod
    async def store(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        """Store raw binary data under key. Returns key/URI."""

    @abstractmethod
    async def get(self, key: str) -> tuple[bytes, str]:
        """Retrieve binary data and content-type under key. Raises FileNotFoundError if missing."""

    @abstractmethod
    async def delete(self, key: str) -> bool:
        """Delete object under key. Returns True if deleted, False if not found."""

    @abstractmethod
    async def exists(self, key: str) -> bool:
        """Check if object exists under key."""


class LocalStorageProvider(StorageProvider):
    def __init__(self, base_dir: Path | str | None = None):
        settings = get_settings()
        self.base_dir = Path(base_dir or settings.STORAGE_LOCAL_PATH).resolve()
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_path(self, key: str) -> Path:
        normalized_key = key.lstrip("/\\")
        target_path = (self.base_dir / normalized_key).resolve()
        try:
            target_path.relative_to(self.base_dir)
        except ValueError:
            raise ValueError(f"Storage path traversal detected for key '{key}'")
        return target_path

    async def store(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        target_path = self._resolve_path(key)
        target_path.parent.mkdir(parents=True, exist_ok=True)

        target_path.write_bytes(data)

        # Store content type in a companion metadata file
        meta_path = target_path.with_suffix(target_path.suffix + ".meta")
        meta_path.write_text(content_type, encoding="utf-8")
        return key

    async def get(self, key: str) -> tuple[bytes, str]:
        target_path = self._resolve_path(key)
        if not target_path.is_file():
            raise FileNotFoundError(f"Storage object '{key}' not found.")

        data = target_path.read_bytes()
        meta_path = target_path.with_suffix(target_path.suffix + ".meta")
        content_type = meta_path.read_text(encoding="utf-8") if meta_path.is_file() else "application/octet-stream"
        return data, content_type

    async def delete(self, key: str) -> bool:
        target_path = self._resolve_path(key)
        deleted = False
        if target_path.is_file():
            target_path.unlink()
            deleted = True
        meta_path = target_path.with_suffix(target_path.suffix + ".meta")
        if meta_path.is_file():
            meta_path.unlink()
        return deleted

    async def exists(self, key: str) -> bool:
        target_path = self._resolve_path(key)
        return target_path.is_file()


class InMemoryStorageProvider(StorageProvider):
    def __init__(self):
        self._storage: dict[str, tuple[bytes, str]] = {}
        self.simulate_failure: bool = False

    async def store(self, key: str, data: bytes, content_type: str = "application/octet-stream") -> str:
        if self.simulate_failure:
            raise OSError("Simulated storage backend failure during store operation.")
        self._storage[key] = (data, content_type)
        return key

    async def get(self, key: str) -> tuple[bytes, str]:
        if key not in self._storage:
            raise FileNotFoundError(f"Storage object '{key}' not found.")
        return self._storage[key]

    async def delete(self, key: str) -> bool:
        if key in self._storage:
            del self._storage[key]
            return True
        return False

    async def exists(self, key: str) -> bool:
        return key in self._storage


_storage_singleton: StorageProvider | None = None


def get_storage_provider() -> StorageProvider:
    global _storage_singleton
    if _storage_singleton is None:
        settings = get_settings()
        if settings.STORAGE_PROVIDER == "memory":
            _storage_singleton = InMemoryStorageProvider()
        else:
            _storage_singleton = LocalStorageProvider()
    return _storage_singleton


def set_storage_provider(provider: StorageProvider | None) -> None:
    """Helper to set or override the storage provider instance (e.g. during testing)."""
    global _storage_singleton
    _storage_singleton = provider
