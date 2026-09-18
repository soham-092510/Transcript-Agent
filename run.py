#!/usr/bin/env python3
"""
LearnLens AI - One-Command Master Launcher
"Show your AI what you are learning."

Launches local FastAPI backend (port 8000) and Vite React frontend (port 5173),
initializes database, and automatically launches the web browser.
"""

import os
import sys
import subprocess
import time
import webbrowser
import signal

def main():
    print("=" * 65)
    print("🎓  LEARNLENS AI  -  LOCAL-FIRST PERSONAL AI TEACHER")
    print("    'Show your AI what you are learning.'")
    print("=" * 65)
    print("\n[1/4] Checking Python environment and database...")

    base_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(base_dir, "frontend")

    # Initialize DB
    from backend.app.db.database import init_db
    from backend.app.services.demo_service import demo_service
    init_db()
    demo_id = demo_service.seed_demo_session()
    print(f"      ✓ Database online. Verified demo session: {demo_id}")

    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    node_modules = os.path.join(frontend_dir, "node_modules")
    if not os.path.exists(node_modules):
        print("\n[INFO] Installing frontend dependencies (first launch)...")
        subprocess.run([npm_cmd, "install"], cwd=frontend_dir, check=True)

    dist_dir = os.path.join(frontend_dir, "dist")
    if not os.path.exists(dist_dir):
        print("\n[INFO] Building production frontend...")
        subprocess.run([npm_cmd, "run", "build"], cwd=frontend_dir, check=True)

    # Start Backend
    print("\n[2/4] Starting FastAPI backend on http://127.0.0.1:8000 ...")
    backend_cmd = [sys.executable, "-m", "uvicorn", "backend.app.main:app", "--host", "127.0.0.1", "--port", "8000"]
    backend_proc = subprocess.Popen(backend_cmd, cwd=base_dir)

    # Start Frontend
    print("\n[3/4] Starting Vite frontend on http://localhost:5173 ...")
    frontend_proc = subprocess.Popen([npm_cmd, "run", "dev"], cwd=frontend_dir)

    time.sleep(3)
    print("\n[4/4] Opening LearnLens AI Studio in your default browser...")
    webbrowser.open("http://localhost:5173")

    print("\n" + "=" * 65)
    print("🚀  LearnLens AI is LIVE!")
    print("    • Frontend UI: http://localhost:5173")
    print("    • Backend API: http://127.0.0.1:8000/docs")
    print("    • Press Ctrl+C anytime to stop all local services.")
    print("=" * 65 + "\n")

    def handle_exit(signum, frame):
        print("\nShutting down LearnLens AI processes...")
        backend_proc.terminate()
        frontend_proc.terminate()
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_exit)
    signal.signal(signal.SIGTERM, handle_exit)

    try:
        backend_proc.wait()
    except KeyboardInterrupt:
        handle_exit(None, None)

if __name__ == "__main__":
    main()
