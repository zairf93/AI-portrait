"""Export OpenAPI schema from FastAPI app."""
import json
from src.main import app

if __name__ == "__main__":
    schema = app.openapi()

    # Write to a file
    with open("openapi.json", "w") as f:
        json.dump(schema, f, indent=2)

    print("OpenAPI schema exported to openapi.json")
