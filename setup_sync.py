#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Setup & Sync to Google Apps Script (Automated Tool)
"""

import os
import sys
import json
import shutil
import subprocess
import webbrowser
import time

# Ensure UTF-8 output on Windows
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        if hasattr(sys.stderr, 'reconfigure'):
            sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

PROJECT_DIR = os.path.abspath(os.path.dirname(__file__))

def get_clasp_cmd():
    # Check npm global folder
    appdata = os.environ.get("APPDATA", "")
    clasp_npm = os.path.join(appdata, "npm", "clasp.cmd")
    if os.path.exists(clasp_npm):
        return clasp_npm
    
    clasp_path = shutil.which("clasp")
    if clasp_path:
        return clasp_path
    return "clasp"

def main():
    print("=" * 65)
    print("  🚀 រៀបចំ AUTO-SYNC ទៅកាន់ GOOGLE APPS SCRIPT (Smart Inventory)")
    print("=" * 65)
    print()

    # 1. Update PATH to include Node.js and NPM
    node_path = r"C:\Program Files\nodejs"
    appdata = os.environ.get("APPDATA", "")
    npm_path = os.path.join(appdata, "npm")
    
    paths_to_add = [node_path, npm_path]
    current_path = os.environ.get("PATH", "")
    for p in paths_to_add:
        if os.path.exists(p) and p not in current_path:
            current_path = p + os.pathsep + current_path
    os.environ["PATH"] = current_path

    # 2. Check Node.js
    node_bin = shutil.which("node")
    if not node_bin and not os.path.exists(os.path.join(node_path, "node.exe")):
        print("❌ រកមិនឃើញ Node.js ទេ។ សូមរង់ចាំ ប្រព័ន្ធកំពុងដំឡើង...")
        subprocess.run(["winget", "install", "OpenJS.NodeJS", "-e", "--accept-source-agreements", "--accept-package-agreements"])
    else:
        print("✅ Node.js: រកឃើញរួចរាល់!")

    # 3. Check Clasp
    clasp_cmd = get_clasp_cmd()
    if not os.path.exists(clasp_cmd) and not shutil.which("clasp"):
        print("⏳ កំពុងដំឡើង Google Clasp...")
        subprocess.run(["npm.cmd", "install", "-g", "@google/clasp"], shell=True)
        clasp_cmd = get_clasp_cmd()
    print("✅ Google Clasp: រួចរាល់!")
    print()

    # 4. Check .clasp.json
    clasp_json_path = os.path.join(PROJECT_DIR, ".clasp.json")
    script_id = "1_qhBe_6Q-TTpi997IBwMwMpmB8HBYuD_YAH0PkPu0OgtJyHIAggkagRX"
    if not os.path.exists(clasp_json_path):
        with open(clasp_json_path, "w", encoding="utf-8") as f:
            json.dump({"scriptId": script_id, "rootDir": "."}, f, indent=2)
        print(f"✅ បានកំណត់ Script ID: {script_id}")
    else:
        print(f"✅ Script ID ត្រូវបានកំណត់រួចជាស្រេច៖ {script_id}")
    print()

    # 5. Apps Script API reminder
    print("=" * 65)
    print("  ⚠️ សំខាន់៖ សូមប្រាកដថាបានបើក 'Google Apps Script API: ON'")
    print("=" * 65)
    print("  កំពុងបើកទំព័រ Settings ក្នុង Browser...")
    try:
        webbrowser.open("https://script.google.com/home/usersettings")
    except Exception:
        pass
    print("  👉 ប្រសិនបើឃើញពាក្យ 'Google Apps Script API' បិទ (OFF) សូមចុចបើក (ON)")
    print()
    input("  ចុច Enter នៅពេលអ្នកបានបើក ឬពិនិត្យរួចរាល់... ")
    print()

    # 6. Login via Clasp
    clasprc_path = os.path.join(os.path.expanduser("~"), ".clasprc.json")
    if not os.path.exists(clasprc_path):
        print("=" * 65)
        print("  🔑 កំពុងបើក Google Login (ផ្ទាំង Browser នឹងលោតឡើង)...")
        print("  👉 សូមជ្រើសរើស Gmail ដែលជាម្ចាស់ Google Sheet នេះ រួចចុច Allow")
        print("=" * 65)
        print()
        subprocess.run([clasp_cmd, "login"], cwd=PROJECT_DIR, shell=True)
    else:
        print("✅ បាន Login Google Account រួចហើយ!")

    print()

    # 7. Push Code
    print("=" * 65)
    print("  📤 កំពុង Push កូដ Code.js និង index.html ទៅកាន់ Apps Script...")
    print("=" * 65)
    print()
    res = subprocess.run([clasp_cmd, "push", "-f"], cwd=PROJECT_DIR, shell=True)

    print()
    if res.returncode == 0:
        print("=" * 65)
        print("  🎉 អបអរសាទរ! បានបញ្ជូនកូដទៅ Google Apps Script ជោគជ័យ ១០០%!")
        print("  👉 ឥឡូវអ្នកអាចត្រឡប់ទៅ Browser លើផ្ទាំង Apps Script")
        print("     ចុច Reload (F5) នឹងឃើញកូដទាំងអស់ចូលទៅដល់ភ្លាមៗ!")
        print("=" * 65)
    else:
        print("❌ ការ Push មិនទាន់ជោគជ័យ។")
        print("   សូមប្រាកដថាអ្នកបានចុច Turn ON ត្រង់ 'Google Apps Script API'")
        print("   និងបាន Login ជាមួយ Gmail ម្ចាស់ Sheet ត្រឹមត្រូវ។")

    print()
    input("ចុច Enter ដើម្បីបិទផ្ទាំងនេះ... ")

if __name__ == "__main__":
    main()
