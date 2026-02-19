"""
Global pytest configuration and fixtures
"""

import os
import sys
from pathlib import Path

# Set test environment variables before importing app modules
os.environ["APP_ENV"] = "testing"
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["DEBUG"] = "false"

# Ensure app module is importable
app_path = Path(__file__).parent
if str(app_path) not in sys.path:
    sys.path.insert(0, str(app_path))
