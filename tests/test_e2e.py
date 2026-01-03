import pytest
from fastapi.testclient import TestClient
from PIL import Image
import io
import os
import time
from src.main import app


@pytest.fixture
def client(tmp_path):
    if not os.environ.get("GOOGLE_API_KEY"):
        pytest.fail(
            "GOOGLE_API_KEY environment variable is not set. Real API tests require this."
        )

    # Use a temp DB file
    db_path = tmp_path / "test_models.db"
    import src.db as db

    with pytest.MonkeyPatch().context() as mp:
        mp.setattr(db, "DB_PATH", str(db_path))
        # Use context manager to trigger lifespan (db init)
        with TestClient(app) as c:
            yield c


def get_test_images():
    """Get multiple test images for model creation."""
    images = []

    # Try to load real test images
    for i in [1, 2]:
        img_path = f"test_images/test_image_{i}.png"
        if os.path.exists(img_path):
            with open(img_path, "rb") as f:
                images.append((f"test_image_{i}.png", f.read(), "image/png"))
        else:
            # Fallback to generated
            img = Image.new("RGB", (512, 512), color="blue" if i == 1 else "red")
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format="PNG")
            img_byte_arr.seek(0)
            images.append((f"test_{i}.png", img_byte_arr.read(), "image/png"))

    return images


def test_async_generate_photo(client):
    """Test async photo generation with job polling using multiple reference images."""
    # 1. Prepare multiple images
    test_images = get_test_images()
    print(f"\n[test_async_generate_photo] Using {len(test_images)} reference images")

    # 2. Upload to create model
    files = [("files", img) for img in test_images]
    response = client.post("/create_model", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "model_id" in data
    assert data["image_count"] == len(test_images)
    model_id = data["model_id"]
    print(f"Created model: {model_id} with {data['image_count']} images")

    # 3. Start async generation
    print(f"Starting async generation with style 'corporate'...")
    response = client.post(
        "/generate_photo", data={"model_id": model_id, "style": "corporate"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "job_id" in data
    assert data["status"] == "pending"
    job_id = data["job_id"]
    print(f"Job created: {job_id}")

    # 4. Poll for completion (max 30 seconds)
    max_wait = 30
    poll_interval = 2
    elapsed = 0
    job_status = None

    print(f"Polling for job completion (max {max_wait}s)...")
    while elapsed < max_wait:
        response = client.get(f"/jobs/{job_id}")
        assert response.status_code == 200
        job_status = response.json()

        print(f"  [{elapsed}s] Status: {job_status['status']}")

        if job_status["status"] == "completed":
            break
        elif job_status["status"] == "failed":
            pytest.fail(f"Job failed: {job_status.get('error', 'Unknown error')}")

        time.sleep(poll_interval)
        elapsed += poll_interval

    # 5. Verify completion
    assert job_status is not None
    assert job_status["status"] == "completed", f"Job did not complete within {max_wait}s"
    assert "image_url" in job_status
    assert job_status["image_url"] == f"/jobs/{job_id}/image"

    # 6. Retrieve the generated image
    print(f"Retrieving generated image...")
    response = client.get(f"/jobs/{job_id}/image")
    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"

    # Verify it's a valid image
    image_data = response.content
    img = Image.open(io.BytesIO(image_data))
    assert img.format == "PNG"
    print(f"Image generated successfully: {img.size}")

    # Find the saved file
    output_dir = os.path.abspath("src/output")
    output_files = [
        os.path.join(output_dir, f)
        for f in os.listdir(output_dir)
        if f.startswith(job_id) and f.endswith(".png")
    ]
    if output_files:
        output_file = output_files[0]
        print(f"\n--> GENERATED IMAGE SAVED AT: file://{output_file}\n")
