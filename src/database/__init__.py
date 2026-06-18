import os
from .sqlite_repo import SQLiteRepository
from .sqlalchemy_repo import SQLAlchemyRepository

DATABASE_URL = os.getenv(
    "DATABASE_URL", 
    f"sqlite:///{os.path.join(os.path.dirname(__file__), 'models.db')}"
)

# Instantiate the object securely
if DATABASE_URL.startswith("sqlite"):
    db = SQLiteRepository(DATABASE_URL)
else:
    db = SQLAlchemyRepository(DATABASE_URL)