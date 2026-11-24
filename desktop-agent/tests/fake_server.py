"""Start the dashboard server with a fake screen/mouse (for browser tests)."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import conftest  # noqa: F401  installs fake pyautogui/pyperclip
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
import server
import os; os.environ.setdefault("AGENT_TOKEN", "test-token")
sys.argv = ["server.py", "--no-clap", "--no-browser", "--port", sys.argv[1] if len(sys.argv) > 1 else "8799"]
server.main()
