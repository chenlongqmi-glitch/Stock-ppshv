#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Smart Inventory - Automatic File Watcher, Git Auto-Push & Auto-Deploy
Monitors project file changes and automatically commits, pushes, and triggers GitHub Pages deployment.
"""

import os
import sys
import time
import subprocess
import threading
from datetime import datetime

# Enforce UTF-8 on Windows
os.environ['PYTHONIOENCODING'] = 'utf-8'
os.environ['PYTHONUTF8'] = '1'

if sys.platform == 'win32' and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PROJECT_DIR = os.path.dirname(os.path.abspath(__file__))
REMOTE_REPO_URL = "https://github.com/chenlongqmi-glitch/Stock-ppshv.git"
PAGES_URL = "https://chenlongqmi-glitch.github.io/Stock-ppshv/"
DEBOUNCE_SECONDS = 5.0  # Wait 5 seconds after the last edit before pushing

WATCHED_EXTENSIONS = (
    '.html', '.js', '.mjs', '.css', '.json',
    '.py', '.md', '.txt', '.bat', '.cmd',
    '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.yml', '.yaml'
)

IGNORED_DIRS = {'.git', '__pycache__', '.vscode', '.idea', 'scratch', '.pytest_cache'}
IGNORED_FILES = {'server.log', 'server_err.log', 'auto_sync.log'}


def find_git_cmd():
    """Find a functional git executable."""
    candidates = [
        "git",
        r"C:\Program Files\Git\cmd\git.exe",
        r"C:\Program Files (x86)\Git\cmd\git.exe",
        os.path.expandvars(r"%LocalAppData%\Programs\Git\cmd\git.exe"),
        r"C:\Program Files\Git\bin\git.exe",
    ]
    for cmd in candidates:
        try:
            res = subprocess.run([cmd, "--version"], capture_output=True, text=True, cwd=PROJECT_DIR)
            if res.returncode == 0:
                return cmd
        except Exception:
            continue
    return None


GIT_CMD = find_git_cmd()


def run_git(args, check=False):
    """Run a git command in the project directory."""
    if not GIT_CMD:
        return False, "Git executable not found."
    try:
        res = subprocess.run(
            [GIT_CMD] + args,
            cwd=PROJECT_DIR,
            capture_output=True,
            text=True,
            encoding='utf-8',
            errors='replace'
        )
        return (res.returncode == 0), (res.stdout.strip() or res.stderr.strip())
    except Exception as e:
        return False, str(e)


def ensure_git_setup():
    """Verify repo, branch, user config, and remote."""
    if not GIT_CMD:
        print("[!] រកមិនឃើញកម្មវិធី Git ក្នុងកុំព្យូទ័រទេ។ Please install Git for Windows.")
        return False

    # Check git repo
    if not os.path.exists(os.path.join(PROJECT_DIR, ".git")):
        print("[*] កំពុង Initialize Git repository...")
        run_git(["init", "-b", "main"])

    # Ensure main branch
    run_git(["branch", "-M", "main"])

    # Ensure user name & email configured
    ok_name, _ = run_git(["config", "user.name"])
    if not ok_name:
        run_git(["config", "user.name", "chenlongqmi-glitch"])
    ok_email, _ = run_git(["config", "user.email"])
    if not ok_email:
        run_git(["config", "user.email", "chenlongqmi@users.noreply.github.com"])

    # Ensure remote
    ok_rem, rem_url = run_git(["remote", "get-url", "origin"])
    if not ok_rem:
        run_git(["remote", "add", "origin", REMOTE_REPO_URL])
    elif rem_url != REMOTE_REPO_URL:
        run_git(["remote", "set-url", "origin", REMOTE_REPO_URL])

    return True


def get_project_file_snapshots():
    """Scan project files and return a dict of {relative_path: mtime}."""
    snapshots = {}
    for root, dirs, files in os.walk(PROJECT_DIR):
        # Skip ignored directories
        dirs[:] = [d for d in dirs if d not in IGNORED_DIRS and not d.startswith('.')]

        rel_dir = os.path.relpath(root, PROJECT_DIR)
        for f in files:
            if f in IGNORED_FILES or f.startswith('.'):
                continue
            ext = os.path.splitext(f)[1].lower()
            if ext in WATCHED_EXTENSIONS or f in ('README_KH.md', 'Index.html', 'Code.js'):
                full_path = os.path.join(root, f)
                rel_path = os.path.normpath(os.path.join(rel_dir, f))
                try:
                    snapshots[rel_path] = os.path.getmtime(full_path)
                except OSError:
                    pass
    return snapshots


def do_push(changed_files_desc=""):
    """Execute git add, commit, rebase, and push."""
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"\n===============================================================")
    print(f"  🚀 [{now_str}] ចាប់ផ្ដើមដំណើរការ Auto-Push & Deploy...")
    print(f"===============================================================")

    # 1. Stage changes
    print("  [*] កំពុង Add files (git add -A)...")
    ok, out = run_git(["add", "-A"])
    if not ok:
        print(f"  [!] Add failed: {out}")
        return False

    # 2. Check if anything is staged
    ok, out = run_git(["diff", "--cached", "--quiet"])
    if ok:
        print("  [i] គ្មានអ្វីត្រូវ Commit ទេ។ (No staged changes)")
        return True

    # 3. Commit
    commit_msg = f"Auto-update: {now_str}"
    if changed_files_desc:
        commit_msg += f" [{changed_files_desc}]"
    print(f"  [*] កំពុង Commit: '{commit_msg}'...")
    ok, out = run_git(["commit", "-m", commit_msg])
    if not ok:
        print(f"  [!] Commit failed: {out}")
        return False

    # 4. Pull rebase to keep in sync
    print("  [*] កំពុង Sync ទាញយកកូដថ្មីពី GitHub (git pull --rebase)...")
    run_git(["pull", "--rebase", "origin", "main"])

    # 5. Push to GitHub
    print("  [*] កំពុង Push ទៅកាន់ GitHub main branch...")
    ok, out = run_git(["push", "-u", "origin", "main"])
    if ok:
        print("\n  ✅ ជោគជ័យ! (Push Completed Successfully)")
        print(f"  📦 Repo URL:   {REMOTE_REPO_URL}")
        print(f"  🌐 Web Deploy: {PAGES_URL}")
        print(f"  ⚡ GitHub Pages នឹង Auto-Deploy ក្នុងរយៈពេលប្រមាណ ១-២ នាទី។")
        print("===============================================================\n")
        return True
    else:
        print("\n  [!] ការ Push ទៅកាន់ GitHub បរាជ័យ (Push Failed):")
        print(f"      {out}")
        print("  💡 គន្លឹះ៖ ប្រសិនបើទាមទារសិទ្ធិ សូមចុច 'Sign in with your browser' ឬពិនិត្យ Internet។")
        print("===============================================================\n")
        return False


def watch_loop():
    """Continuous watch loop with debounced auto-push."""
    print("\n===============================================================")
    print("  👁️  SMART INVENTORY - AUTO SYNC & DEPLOY WATCHER")
    print("===============================================================")
    print(f"  [*] Watching Folder: {PROJECT_DIR}")
    print(f"  [*] Target Branch:   main")
    print(f"  [*] Auto-Deploy:     GitHub Pages")
    print(f"  [*] Debounce Time:   {DEBOUNCE_SECONDS}s")
    print("  [*] ជំនួយ៖ រាល់ពេលលោកអ្នកកែប្រែ ឬ Save file ប្រព័ន្ធនឹង Auto-Push ភ្លាម!")
    print("  [*] ជំនួយពិសេស៖ ចុច [Enter] លើ Keyboard ដើម្បី Push ភ្លាមៗដោយដៃ។")
    print("  [*] ចុច [Ctrl + C] ដើម្បីបញ្ឈប់ដំណើរការ។")
    print("===============================================================\n")

    current_snapshots = get_project_file_snapshots()
    print(f"  [✓] កំពុងត្រួតពិនិត្យឯកសារចំនួន {len(current_snapshots)} files... (Ready & Watching)\n")

    pending_changes = set()
    last_change_time = None

    while True:
        try:
            time.sleep(1.0)
            new_snapshots = get_project_file_snapshots()

            # Find changed or new files
            modified = []
            for f, mtime in new_snapshots.items():
                if f not in current_snapshots or mtime > current_snapshots[f]:
                    modified.append(f)

            # Find deleted files
            deleted = [f for f in current_snapshots if f not in new_snapshots]

            changes_in_tick = modified + deleted
            if changes_in_tick:
                for c in changes_in_tick:
                    pending_changes.add(c)
                last_change_time = time.time()
                current_snapshots = new_snapshots
                now_str = datetime.now().strftime("%H:%M:%S")
                short_list = ", ".join(list(changes_in_tick)[:3])
                if len(changes_in_tick) > 3:
                    short_list += f" (+{len(changes_in_tick)-3} others)"
                print(f"  [{now_str}] 📝 រកឃើញការផ្លាស់ប្ដូរ: {short_list}")
                print(f"             រង់ចាំ {int(DEBOUNCE_SECONDS)} វិនាទីមុនពេល Push...")

            # If debounce window has passed and we have pending changes, trigger push!
            if pending_changes and last_change_time:
                elapsed = time.time() - last_change_time
                if elapsed >= DEBOUNCE_SECONDS:
                    changed_list = list(pending_changes)
                    pending_changes.clear()
                    last_change_time = None

                    summary = f"{len(changed_list)} files: " + ", ".join(os.path.basename(p) for p in changed_list[:3])
                    if len(changed_list) > 3:
                        summary += f" +{len(changed_list)-3}"

                    do_push(summary)
                    current_snapshots = get_project_file_snapshots()
                    print(f"  [✓] បន្តការត្រួតពិនិត្យ (Watching for next changes)...")

        except KeyboardInterrupt:
            print("\n\n[*] បានបញ្ឈប់ Auto Sync Watcher។ Goodbye!\n")
            sys.exit(0)
        except Exception as e:
            print(f"[!] Error in watch loop: {e}")
            time.sleep(2.0)


def keyboard_listener():
    """Allow pressing Enter in console to immediately push changes."""
    while True:
        try:
            line = sys.stdin.readline()
            if line is not None:
                print("\n[*] ទទួលបានការចុច Enter ➔ កំពុងដំណើរការ Push ដោយដៃភ្លាមៗ...")
                do_push("Manual Enter Trigger")
        except Exception:
            break


def main():
    if not ensure_git_setup():
        sys.exit(1)

    # Start Enter key listener thread
    t = threading.Thread(target=keyboard_listener, daemon=True)
    t.start()

    watch_loop()


if __name__ == '__main__':
    main()
