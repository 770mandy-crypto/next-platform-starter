@echo off
cd /d "%~dp0"
if not exist .venv (
  python -m venv .venv
  .venv\Scripts\pip install -r requirements.txt
)
.venv\Scripts\pip install -q pytest
.venv\Scripts\python -m pytest -v tests
pause
