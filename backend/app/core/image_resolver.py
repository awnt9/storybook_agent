from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from app.schemas.story_elements import Image


APP_DIR = Path(__file__).resolve().parents[1]
IMAGES_DIR = APP_DIR / "images"


def photo_to_image(photo_bytes: bytes, extension: str = "png") -> Image:
    IMAGES_DIR.mkdir(parents=True, exist_ok=True)

    image_id = f"img_{uuid4().hex}"
    filename = f"{image_id}.{extension.lstrip('.')}"
    path = IMAGES_DIR / filename

    path.write_bytes(photo_bytes)

    return Image(
        image_id=image_id,
        path=str(path),
        url=None,
        prompt=None,
        description=None,
    )


def image_to_photo(image: Image) -> bytes:
    if image.path is not None:
        path = Path(image.path)

        if not path.exists():
            raise FileNotFoundError(f"Image path does not exist: {image.path}")

        return path.read_bytes()

    if image.image_id is not None:
        matches = list(IMAGES_DIR.glob(f"{image.image_id}.*"))

        if not matches:
            raise FileNotFoundError(f"Image id not found in {IMAGES_DIR}: {image.image_id}")

        return matches[0].read_bytes()

    raise ValueError("Image must have either path or image_id.")
