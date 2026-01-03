# AI Photo Booth Tutorial

A complete Python FastAPI application that generates professional AI portraits using Google's Gemini 2.5 Flash Image model. This tutorial demonstrates building an async REST API with job tracking, database persistence, and a modern Next.js frontend interface.

## What This Tutorial Covers

**Backend (Python/FastAPI):**

- Async REST API with background task processing
- File upload handling and storage
- Job queue system with status tracking
- SQLite database with simple ORM pattern
- Pydantic response models for type safety
- OpenAPI schema generation for type-safe client libraries
- CORS configuration for frontend integration
- Google Gemini API integration for AI image generation

**Frontend (Next.js - Example):**

- TypeScript-based React application
- Auto-generated type-safe API client from OpenAPI spec
- Real-time job status polling with 30-second timeout
- File upload with preview
- Responsive UI with Tailwind CSS

## Project Structure

```
.
├── src/                      # Python backend
│   ├── main.py              # FastAPI application & endpoints
│   ├── db.py                # Database layer (SQLite)
│   ├── invoke_ai.py         # Gemini API integration
│   ├── images/              # Uploaded reference images (gitignored)
│   └── output/              # Generated photos (gitignored)
├── site/                     # Next.js frontend (example)
│   ├── app/                 # Next.js pages
│   ├── components/          # React components
│   └── lib/api/             # Auto-generated API client
├── tests/                    # End-to-end tests
├── scripts/                  # Utility scripts
└── pyproject.toml           # Python dependencies (uv)
```

## Prerequisites

- Python 3.10+
- Node.js 18+ (for frontend)
- Google Cloud API key with Gemini API access
- `uv` package manager

## Backend Setup

### 1. Install Dependencies

```bash
uv sync
```

If you don't have `uv` yet, install it first:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

### 2. Set Environment Variables

```bash
export GOOGLE_API_KEY="your_google_api_key_here"
```

Get your API key from: https://aistudio.google.com/apikey

### 3. Run the Backend

```bash
uv run uvicorn src.main:app --reload
```

The API will be available at `http://localhost:8000`

- **API Documentation**: `http://localhost:8000/docs` (interactive Swagger UI)
- **OpenAPI Schema**: `http://localhost:8000/openapi.json` (for client generation)

## Frontend Setup (Optional)

The frontend is an example Next.js application demonstrating API integration.

### 1. Install Dependencies

```bash
cd site
npm install
```

### 2. Configure Environment

Create `site/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 3. Run the Frontend

**Development:**

```bash
npm run dev
```

Open `http://localhost:3000` in your browser.

**Production build:**

```bash
npm run build
npm start
```

## API Usage

### Health Check

```bash
curl http://localhost:8000/
```

### 1. Upload Reference Images

```bash
curl -X POST "http://localhost:8000/create_model" \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg" \
  -F "files=@photo3.jpg"
```

Response:

```json
{ "model_id": "abc-123-def", "image_count": 3 }
```

### 2. Start Async Photo Generation

Available styles: `corporate`, `bw_headshot`, `casual`

```bash
curl -X POST "http://localhost:8000/generate_photo" \
  -F "model_id=abc-123-def" \
  -F "style=corporate"
```

Response:

```json
{ "job_id": "xyz-789-ghi", "status": "pending" }
```

### 3. Poll Job Status

```bash
curl "http://localhost:8000/jobs/xyz-789-ghi"
```

Response (processing):

```json
{
  "job_id": "xyz-789-ghi",
  "status": "processing",
  "style": "corporate",
  "created_at": "2025-01-03T10:00:00",
  "updated_at": "2025-01-03T10:00:15"
}
```

Response (completed):

```json
{
  "job_id": "xyz-789-ghi",
  "status": "completed",
  "style": "corporate",
  "image_url": "/jobs/xyz-789-ghi/image",
  "created_at": "2025-01-03T10:00:00",
  "updated_at": "2025-01-03T10:00:30"
}
```

### 4. Download Generated Image

```bash
curl "http://localhost:8000/jobs/xyz-789-ghi/image" --output result.png
```

## Testing

Run end-to-end tests (requires `GOOGLE_API_KEY`):

```bash
uv run pytest tests/test_e2e.py -v -s
```

The tests will:

- Upload 2 test images (test_image_1.png, test_image_2.png)
- Create a model with multiple reference images
- Start async generation
- Poll for completion (30 second timeout)
- Verify the generated image

## Key Files to Study

### Backend

- **src/main.py**: FastAPI app, endpoints, background tasks, CORS
- **src/db.py**: SQLite database layer with job tracking
- **src/invoke_ai.py**: Gemini API integration and prompt engineering

### Frontend (Example)

- **site/lib/api/client.ts**: Type-safe API client with polling logic
- **site/app/page.tsx**: Main upload/generation UI
- **site/app/result/page.tsx**: Job status polling and result display
- **site/components/ServerStatusBadge.tsx**: Real-time backend health check

## Frontend API Client Generation

The frontend uses auto-generated TypeScript types from the OpenAPI schema. This ensures type safety between backend and frontend.

### How It Works

The backend defines Pydantic response models (see `src/main.py` lines 45-69) that FastAPI uses to generate an OpenAPI schema. This schema is then converted to TypeScript types.

### Regenerating the Client

Run this script whenever you modify backend endpoints or response models:

```bash
./scripts/regenerate_client.sh
```

**What it does:**
1. Exports OpenAPI schema from FastAPI to `openapi.json`
2. Generates TypeScript types in `site/lib/api/schema.ts` using `openapi-typescript`
3. These types are used by the API client in `site/lib/api/client.ts`

**Manual regeneration (alternative):**

```bash
# Export OpenAPI schema
uv run python scripts/export_openapi.py

# Generate TypeScript types
cd site && npm run generate:api
```

**When to regenerate:**
- After adding/modifying API endpoints
- After changing request/response models
- After updating Pydantic schemas
- If you see TypeScript errors related to API calls

## Customization

### Add New Photo Styles

Edit `src/invoke_ai.py`:

```python
STYLES = {
    "corporate": "A professional corporate portrait...",
    "your_style": "Your custom prompt here...",
}
```

### Adjust Generation Timeout

Frontend polling timeout (default 30s):

- Edit `site/app/result/page.tsx` line 52: `maxWaitMs: 30000`

### Change Database

The tutorial uses SQLite for simplicity. For production:

1. Replace `src/db.py` with PostgreSQL/MySQL adapter
2. Update connection string in environment variables
3. Modify schema for concurrent access

## Resources

- [Google Gemini API Docs](https://ai.google.dev/gemini-api/docs)
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)

## License

MIT - Feel free to use this tutorial for learning and commercial projects.

## Credits

Built as a tutorial by [Pixegami](https://pixegami.io)
