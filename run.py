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

if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

def main():
    print("=" * 65)
    print("  LEARNLENS AI  -  LOCAL-FIRST PERSONAL AI TEACHER")
    print("  'Show your AI what you are learning.'")
    print("=" * 65)
    print("\n[1/4] Checking Python environment and database...")

    base_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_dir = os.path.join(base_dir, "frontend")

    # Initialize DB
    from backend.app.db.database import init_db
    from backend.app.services.demo_service import demo_service
    init_db()
    demo_id = demo_service.seed_demo_session()
    print(f"      [OK] Database online. Verified demo session: {demo_id}")

    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"
    node_modules = os.path.join(frontend_dir, "node_modules")
    if not os.path.exists(node_modules):
        print("\n[INFO] Installing frontend dependencies (first launch)...")
        subprocess.run([npm_cmd, "install"], cwd=frontend_dir, check=True)

    dist_dir = os.path.join(frontend_dir, "dist")
    if not os.path.exists(dist_dir):
        print("\n[INFO] Building production frontend...")
        subprocess.run([npm_cmd, "run", "build"], cwd=frontend_dir, check=True)

    import socket
    import urllib.request
    import urllib.error

    def free_port(port):
        """Ensure port is available by clearing any stale process."""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                if s.connect_ex(('127.0.0.1', port)) != 0:
                    return
            if sys.platform == "win32":
                out = subprocess.check_output(f"netstat -ano | findstr :{port}", shell=True).decode()
                for line in out.strip().splitlines():
                    parts = line.strip().split()
                    if len(parts) >= 5 and "LISTENING" in parts:
                        pid = parts[-1]
                        if pid != str(os.getpid()):
                            subprocess.run(f"taskkill /F /PID {pid}", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                time.sleep(0.5)
        except Exception:
            pass

    free_port(8000)
    free_port(5173)

    def wait_for_service(url, name, timeout=25):
        start = time.time()
        while time.time() - start < timeout:
            try:
                req = urllib.request.Request(url, headers={'User-Agent': 'LearnLensLauncher/1.0'})
                with urllib.request.urlopen(req, timeout=1.5) as resp:
                    if resp.status in (200, 304):
                        return True
            except Exception:
                pass
            time.sleep(0.5)
        return False

    # Start Backend
    print("\n[2/4] Starting FastAPI backend on http://127.0.0.1:8000 ...")
    backend_cmd = [sys.executable, "-m", "uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
    backend_proc = subprocess.Popen(backend_cmd, cwd=base_dir)

    # Start Frontend
    print("\n[3/4] Starting Vite frontend on http://127.0.0.1:5173 ...")
    frontend_proc = subprocess.Popen([npm_cmd, "run", "dev"], cwd=frontend_dir)

    print("\n[4/4] Verifying services and opening LearnLens AI Studio...")
    backend_ready = wait_for_service("http://127.0.0.1:8000/api/system/status", "FastAPI Backend", timeout=20)
    if backend_ready:
        print("      [OK] FastAPI Backend is ready (HTTP 200).")
    else:
        print("      [!] Backend warming up...")

    frontend_ready = wait_for_service("http://127.0.0.1:5173", "Vite Frontend", timeout=20)
    if frontend_ready:
        print("      [OK] Vite Frontend is ready (HTTP 200).")
    else:
        print("      [!] Frontend warming up...")

    webbrowser.open("http://127.0.0.1:5173")

    print("\n" + "=" * 65)
    print(">>> LearnLens AI is LIVE! <<<")
    print("    * Frontend UI: http://127.0.0.1:5173  (or http://localhost:5173)")
    print("    * Backend API: http://127.0.0.1:8000/docs")
    print("    * Press Ctrl+C anytime to stop all local services.")
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
