from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from contextlib import asynccontextmanager
from pydantic import BaseModel
import uuid
import shutil
import os
from typing import List, Optional

from src import db
from src import invoke_ai

IMAGES_DIR = "src/images"
OUTPUT_DIR = "src/output"


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    os.makedirs(IMAGES_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    db.init_db()
    yield
    # Shutdown


app = FastAPI(lifespan=lifespan)


from fastapi.middleware.cors import CORSMiddleware


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Response Models
class HealthCheckResponse(BaseModel):
    status: str
    service: str
    version: str


class CreateModelResponse(BaseModel):
    model_id: str
    image_count: int


class GeneratePhotoResponse(BaseModel):
    job_id: str
    status: str


class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    style: str
    created_at: str
    updated_at: str
    image_url: Optional[str] = None
    error: Optional[str] = None


@app.get("/", response_model=HealthCheckResponse)
async def health_check():
    """Health check endpoint to verify server is running."""
    return {"status": "online", "service": "AI Photo Booth API", "version": "1.0.0"}


@app.post("/create_model", response_model=CreateModelResponse)
async def create_model(files: List[UploadFile] = File(...)):
    if len(files) > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 images allowed.")

    model_id = str(uuid.uuid4())
    model_dir = os.path.join(IMAGES_DIR, model_id)
    os.makedirs(model_dir, exist_ok=True)

    saved_paths = []
    for file in files:
        # Sanitize filename or just use UUIDs to be safe?
        # Using original filename is friendlier for now, assuming safe environment.
        file_path = os.path.join(model_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        saved_paths.append(file_path)

    db.create_model_entry(model_id, saved_paths)
    return {"model_id": model_id, "image_count": len(saved_paths)}


@app.post("/generate_photo_from_model")
async def generate_photo_from_model(model_id: str = Form(...), style: str = Form(...)):
    image_paths = db.get_model_entry(model_id)
    if not image_paths:
        raise HTTPException(status_code=404, detail="Model not found")

    try:
        generated_image = invoke_ai.generate_image_from_model(image_paths, style)
        output_filename = f"{model_id}_{style}_{uuid.uuid4().hex[:8]}.png"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        generated_image.save(output_path)
        return FileResponse(output_path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Generation failed: {e}")
        raise HTTPException(
            status_code=500, detail="Internal Server Error during generation."
        )


@app.post("/generate_photo_from_images")
async def generate_photo_from_images(
    style: str = Form(...), files: List[UploadFile] = File(...)
):
    if len(files) > 3:
        raise HTTPException(status_code=400, detail="Maximum 3 images allowed.")

    # Temp save images
    temp_id = str(uuid.uuid4())
    temp_dir = os.path.join(IMAGES_DIR, "temp", temp_id)
    os.makedirs(temp_dir, exist_ok=True)

    saved_paths = []
    for file in files:
        file_path = os.path.join(temp_dir, file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        saved_paths.append(file_path)

    try:
        generated_image = invoke_ai.generate_image_from_model(saved_paths, style)
        output_filename = f"temp_{temp_id}_{style}.png"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        generated_image.save(output_path)

        return FileResponse(output_path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"Generation failed: {e}")
        raise HTTPException(
            status_code=500, detail="Internal Server Error during generation."
        )


def process_image_generation(job_id: str, image_paths: List[str], style: str):
    """Background task to generate image asynchronously."""
    try:
        db.update_job_status(job_id, "processing")

        generated_image = invoke_ai.generate_image_from_model(image_paths, style)
        output_filename = f"{job_id}.png"
        output_path = os.path.join(OUTPUT_DIR, output_filename)
        generated_image.save(output_path)

        db.update_job_status(job_id, "completed", output_path=output_path)
    except Exception as e:
        print(f"Generation failed for job {job_id}: {e}")
        db.update_job_status(job_id, "failed", error=str(e))


@app.post("/generate_photo", response_model=GeneratePhotoResponse)
async def generate_photo(
    background_tasks: BackgroundTasks, model_id: str = Form(...), style: str = Form(...)
):
    """Start async image generation, returns job ID immediately."""
    image_paths = db.get_model_entry(model_id)
    if not image_paths:
        raise HTTPException(status_code=404, detail="Model not found")

    job_id = str(uuid.uuid4())
    db.create_job(job_id, model_id, style)

    background_tasks.add_task(process_image_generation, job_id, image_paths, style)

    return {"job_id": job_id, "status": "pending"}


@app.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Get status and details of a generation job."""
    job = db.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    response = {
        "job_id": job["id"],
        "status": job["status"],
        "style": job["style"],
        "created_at": job["created_at"],
        "updated_at": job["updated_at"],
    }

    if job["status"] == "completed":
        response["image_url"] = f"/jobs/{job_id}/image"
    elif job["status"] == "failed":
        response["error"] = job["error"]

    return response


@app.get("/jobs/{job_id}/image")
async def get_job_image(job_id: str):
    """Retrieve the generated image for a completed job."""
    job = db.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["status"] != "completed":
        raise HTTPException(
            status_code=400, detail=f"Image not ready. Job status: {job['status']}"
        )

    if not job["output_path"] or not os.path.exists(job["output_path"]):
        raise HTTPException(status_code=404, detail="Generated image not found")

    return FileResponse(job["output_path"])
