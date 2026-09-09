"""Basic test suite for AgenticMeet."""
import sys
from pathlib import Path

def test_imports():
    """Verify backend and python_code can be imported."""
    root_dir = Path(__file__).resolve().parent.parent
    sys.path.insert(0, str(root_dir / "backend"))
    sys.path.insert(0, str(root_dir / "python_code"))

    import _text_cleaner
    cleaned = _text_cleaner.clean_transcript("Hello, yeah, yeah world")
    assert "Hello" in cleaned
