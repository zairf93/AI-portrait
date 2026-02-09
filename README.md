# AI Photo Booth

FastAPI backend with Next.js frontend for generating AI portraits using Google Gemini 2.5 Flash Image.

## Stack

**Backend:** Python 3.10+, FastAPI, SQLite, Google GenAI
**Frontend:** Next.js 16, TypeScript, Tailwind CSS
**Package Manager:** uv

## Backend Setup

### Install Dependencies

```bash
# Install uv if needed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Python dependencies
uv sync
```

### Configure

```bash
export GOOGLE_API_KEY="your_api_key"
```

Get API key: https://aistudio.google.com/apikey

### Run

```bash
uv run uvicorn src.main:app --reload
```

API: http://localhost:8000
Docs: http://localhost:8000/docs

## Frontend Setup

```bash
cd site
npm install

# Create site/.env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run dev server
npm run dev
```

Frontend: http://localhost:3000

## Testing

```bash
# Run E2E tests (requires GOOGLE_API_KEY)
uv run pytest tests/test_e2e.py -vs
```

### Test Images

Test images are located in `test_images/`:

- `test_image_1.png` - Used by E2E tests
- `test_image_2.png` - Used by E2E tests
- `test_image_3.png` - Available for manual testing

**To update test images:**
Replace the PNG files in `test_images/` with your own reference photos (any resolution, will be processed by Gemini).

**Fallback behavior:**
If test images are missing, the test suite generates synthetic colored images (512x512) automatically.

## API Endpoints

### GET /

Health check

### POST /create_model

Upload reference images (max 3)

```bash
curl -X POST http://localhost:8000/create_model \
  -F "files=@photo1.jpg" \
  -F "files=@photo2.jpg"
```

Returns: `{"model_id": "...", "image_count": 2}`

### POST /generate_photo

Start async generation

Styles: `corporate`, `bw_headshot`, `casual`

```bash
curl -X POST http://localhost:8000/generate_photo \
  -F "model_id=abc-123" \
  -F "style=corporate"
```

Returns: `{"job_id": "...", "status": "pending"}`

### GET /jobs/{job_id}

Poll job status

```bash
curl http://localhost:8000/jobs/xyz-789
```

Returns: Job details with status (`pending`, `processing`, `completed`, `failed`)

### GET /jobs/{job_id}/image

Download generated image

```bash
curl http://localhost:8000/jobs/xyz-789/image --output result.png
```

## Project Structure

```
src/
├── main.py       # FastAPI app & endpoints
├── db.py         # SQLite database layer
└── invoke_ai.py  # Gemini API integration

site/
├── app/          # Next.js pages
├── components/   # React components
└── lib/api/      # Type-safe API client

tests/
└── test_e2e.py   # End-to-end tests
```

## Regenerate API Client

After modifying backend endpoints:

```bash
./scripts/regenerate_client.sh
```

Or manually:

```bash
uv run python scripts/export_openapi.py
cd site && npm run generate:api
```

## License

MIT
