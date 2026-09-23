#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
=============================================================================
ប្រព័ន្ធគ្រប់គ្រងស្តុកទំនិញ (Smart Inventory Management System)
Python Sync & Automation Script (Google Apps Script API & GSpread Integration)
=============================================================================
"""

import sys
import os
import json
import datetime
import requests

# Ensure UTF-8 stdout/stderr on Windows regardless of system code page (GBK/CP936, etc.)
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, 'reconfigure'):
            sys.stdout.reconfigure(encoding='utf-8', errors='replace')
        if hasattr(sys.stderr, 'reconfigure'):
            sys.stderr.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass


# Default Web App Deployment URL (Paste your deployed Google Apps Script Web App URL here)
WEB_APP_URL = "https://script.google.com/macros/s/AKfycbxqw7NPsE8pWqeYPAwTqxFakzFD5lTzGR1N5mlL-n2oZMp4FeDpGENFnEAjf6gSddk/exec"

# ANSI Colors for Terminal UI
class Colors:
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

class InventoryClient:
    def __init__(self, api_url=WEB_APP_URL):
        self.api_url = api_url

    def post(self, action, payload=None):
        """ផ្ញើ Request ទៅកាន់ Google Apps Script Web App API"""
        if payload is None:
            payload = {}
        payload["action"] = action
        try:
            response = requests.post(self.api_url, json=payload, timeout=30)
            if response.status_code == 200:
                return response.json()
            else:
                return {"success": False, "message": f"HTTP Error {response.status_code}: {response.text}"}
        except Exception as e:
            return {"success": False, "message": f"Connection Error: {str(e)}"}

    def get_dashboard(self):
        return self.post("getDashboardData")

    def get_items(self):
        return self.post("getItems")

    def stock_in(self, sku, qty, unit_price=0.0, supplier="", to_location="ឃ្លាំងកណ្តាល A", notes=""):
        payload = {
            "data": {
                "sku": sku,
                "quantity": float(qty),
                "unitPrice": float(unit_price),
                "supplier": supplier,
                "toLocation": to_location,
                "notes": notes
            },
            "user": {"username": "Python_CLI", "role": "Stock Keeper"}
        }
        return self.post("stockIn", payload)

    def stock_out(self, sku, qty, unit_price=0.0, customer="", notes=""):
        payload = {
            "data": {
                "sku": sku,
                "quantity": float(qty),
                "unitPrice": float(unit_price),
                "customer": customer,
                "notes": notes
            },
            "user": {"username": "Python_CLI", "role": "Cashier"}
        }
        return self.post("stockOut", payload)

    def save_item(self, item_dict):
        payload = {
            "item": item_dict,
            "user": "Python_CLI"
        }
        return self.post("saveItem", payload)

    def get_transactions(self, limit=50):
        return self.post("getTransactions", {"filters": {"limit": limit}})


def print_banner():
    print(f"{Colors.CYAN}{Colors.BOLD}")
    print("=" * 65)
    print("     📦 SMART INVENTORY MANAGEMENT SYSTEM (PYTHON CLIENT) 📦")
    print("         ប្រព័ន្ធគ្រប់គ្រងស្តុកទំនិញ លើ Google Sheets")
    print("=" * 65)
    print(f"{Colors.ENDC}")

def show_dashboard(client):
    print(f"\n{Colors.HEADER}--- ផ្ទាំងទិន្នន័យទូទៅ (Live Dashboard Summary) ---{Colors.ENDC}")
    res = client.get_dashboard()
    if not res.get("success"):
        print(f"{Colors.FAIL}❌ មិនអាចទាញយកទិន្នន័យបានទេ: {res.get('message')}{Colors.ENDC}")
        return

    stats = res.get("stats", {})
    print(f"📦 ចំនួនមុខទំនិញសរុប: {Colors.BOLD}{stats.get('totalProducts', 0)}{Colors.ENDC} មុខ")
    print(f"🔢 ស្តុកសរុបក្នុងដៃ: {Colors.BOLD}{stats.get('totalStockQuantity', 0)}{Colors.ENDC} ដុំ")
    print(f"💰 តម្លៃស្តុកសរុប (ដើម): {Colors.GREEN}${stats.get('totalInventoryCostValue', 0):,.2f}{Colors.ENDC}")
    print(f"💵 តម្លៃស្តុកសរុប (លក់): ${stats.get('totalInventoryRetailValue', 0):,.2f}")
    print(f"⚠️  ទំនិញជិតអស់ពីស្តុក (Low Stock): {Colors.WARNING}{stats.get('lowStockCount', 0)}{Colors.ENDC} មុខ")
    print(f"🚫 ទំនិញអស់ពីស្តុក (Out of Stock): {Colors.FAIL}{stats.get('outOfStockCount', 0)}{Colors.ENDC} មុខ")

    low_items = res.get("lowStockItems", [])
    if low_items:
        print(f"\n{Colors.WARNING}⚠️  បញ្ជីទំនិញដែលត្រូវបញ្ជាទិញបន្ថែមបន្ទាន់:{Colors.ENDC}")
        for item in low_items:
            print(f"  • [{item.get('sku')}] {item.get('name')}: សល់ {Colors.BOLD}{item.get('currentStock')}{Colors.ENDC} {item.get('unit')} (Min: {item.get('minStock')})")

def list_items(client):
    print(f"\n{Colors.HEADER}--- បញ្ជីទំនិញទាំងអស់ (Inventory Products) ---{Colors.ENDC}")
    res = client.get_items()
    if not res.get("success"):
        print(f"{Colors.FAIL}❌ បរាជ័យ: {res.get('message')}{Colors.ENDC}")
        return

    items = res.get("items", [])
    print(f"{'SKU':<12} | {'ឈ្មោះទំនិញ':<25} | {'ប្រភេទ':<12} | {'ស្តុក':<8} | {'តម្លៃដើម':<10} | {'តម្លៃលក់':<10}")
    print("-" * 85)
    for i in items:
        stock_str = f"{i.get('currentStock')} {i.get('unit')}"
        cost_str = f"${float(i.get('costPrice', 0)):.2f}"
        sell_str = f"${float(i.get('sellingPrice', 0)):.2f}"
        print(f"{i.get('sku'):<12} | {i.get('name')[:23]:<25} | {i.get('category', ''):<12} | {stock_str:<8} | {cost_str:<10} | {sell_str:<10}")

def do_stock_in(client):
    print(f"\n{Colors.GREEN}{Colors.BOLD}--- កត់ត្រាទំនិញចូលស្តុក (Stock In) ---{Colors.ENDC}")
    sku = input("👉 បញ្ចូលកូដ SKU ឬ Barcode: ").strip()
    qty = input("👉 ចំនួននាំចូល: ").strip()
    unit_price = input("👉 តម្លៃទិញចូលក្នុង 1 ខ្នាត ($) [ទុកទទេបើមិនប្តូរ]: ").strip() or "0"
    supplier = input("👉 ឈ្មោះអ្នកផ្គត់ផ្គង់/Supplier [Enter ដើម្បីរំលង]: ").strip()
    notes = input("👉 កំណត់សម្គាល់: ").strip()

    res = client.stock_in(sku, qty, unit_price, supplier, notes=notes)
    if res.get("success"):
        print(f"{Colors.GREEN}✅ {res.get('message')}{Colors.ENDC}")
    else:
        print(f"{Colors.FAIL}❌ បរាជ័យ: {res.get('message')}{Colors.ENDC}")

def do_stock_out(client):
    print(f"\n{Colors.WARNING}{Colors.BOLD}--- កត់ត្រាទំនិញចេញពីស្តុក (Stock Out) ---{Colors.ENDC}")
    sku = input("👉 បញ្ចូលកូដ SKU ឬ Barcode: ").strip()
    qty = input("👉 ចំនួនដកចេញ: ").strip()
    unit_price = input("👉 តម្លៃលក់ក្នុង 1 ខ្នាត ($) [ទុកទទេបើតាមតម្លៃធម្មតា]: ").strip() or "0"
    customer = input("👉 អតិថិជន / ផ្នែកស្នើសុំ: ").strip()
    notes = input("👉 មូលហេតុ / កំណត់សម្គាល់: ").strip()

    res = client.stock_out(sku, qty, unit_price, customer, notes=notes)
    if res.get("success"):
        print(f"{Colors.GREEN}✅ {res.get('message')}{Colors.ENDC}")
    else:
        print(f"{Colors.FAIL}❌ បរាជ័យ: {res.get('message')}{Colors.ENDC}")

def batch_import_csv(client):
    print(f"\n{Colors.CYAN}--- នាំចូលទិន្នន័យទំនិញជាក្រុមពី CSV (Batch Import) ---{Colors.ENDC}")
    csv_file = input("👉 បញ្ចូលផ្លូវ file CSV (ឧ. products.csv): ").strip()
    if not os.path.exists(csv_file):
        print(f"{Colors.FAIL}❌ រកមិនឃើញ file {csv_file} ទេ!{Colors.ENDC}")
        return

    import csv
    with open(csv_file, mode='r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        count = 0
        for row in reader:
            item = {
                "sku": row.get("SKU") or row.get("sku"),
                "barcode": row.get("Barcode") or row.get("barcode", ""),
                "name": row.get("ItemName") or row.get("name"),
                "category": row.get("Category") or row.get("category", "ទូទៅ"),
                "unit": row.get("Unit") or row.get("unit", "ដុំ"),
                "costPrice": float(row.get("CostPrice") or row.get("costPrice", 0)),
                "sellingPrice": float(row.get("SellingPrice") or row.get("sellingPrice", 0)),
                "minStock": float(row.get("MinStock") or row.get("minStock", 10)),
                "location": row.get("Location") or row.get("location", "ឃ្លាំងកណ្តាល A"),
                "currentStock": float(row.get("CurrentStock") or row.get("currentStock", 0))
            }
            res = client.save_item(item)
            if res.get("success"):
                print(f"  ✅ Added: {item['name']} ({item['sku']})")
                count += 1
            else:
                print(f"  ❌ Error on {item['sku']}: {res.get('message')}")

        print(f"{Colors.GREEN}🎉 ដំណើរការចប់សព្វគ្រប់! បាននាំចូលសរុប: {count} មុខទំនិញ{Colors.ENDC}")

def export_backup(client):
    print(f"\n{Colors.BLUE}--- Export ទិន្នន័យស្តុកសម្រាប់ Backup (JSON/CSV) ---{Colors.ENDC}")
    res = client.get_items()
    if not res.get("success"):
        print(f"{Colors.FAIL}❌ មិនអាចទាញយកទិន្នន័យបានទេ{Colors.ENDC}")
        return

    items = res.get("items", [])
    now_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"inventory_backup_{now_str}.json"

    with open(filename, "w", encoding="utf-8") as f:
        json.dump(items, f, ensure_ascii=False, indent=2)

    print(f"{Colors.GREEN}✅ បានរក្សាទុកទិន្នន័យ Backup ទៅក្នុង file: {filename}{Colors.ENDC}")

def main_menu():
    client = InventoryClient()

    while True:
        print_banner()
        print(" [1] 📊 មើលផ្ទាំងសង្ខេប Dashboard & ស្តុកជិតអស់ (Live Dashboard)")
        print(" [2] 📦 មើលបញ្ជីទំនិញទាំងអស់ (List All Items)")
        print(" [3] 📥 កត់ត្រាទំនិញចូលស្តុក (Stock In)")
        print(" [4] 📤 កត់ត្រាទំនិញចេញពីស្តុក (Stock Out)")
        print(" [5] 📁 នាំចូលទំនិញជាក្រុមពី CSV (Batch Import from CSV)")
        print(" [6] 💾 ទាញយក Backup ទិន្នន័យ (Export JSON Backup)")
        print(" [7] ⚙️  កំណត់ Web App API URL")
        print(" [0] 🚪 ចាកចេញ (Exit)")
        print("-" * 65)

        choice = input(f"{Colors.BOLD}👉 សូមជ្រើសរើសជម្រើស (0-7): {Colors.ENDC}").strip()

        if choice == "1":
            show_dashboard(client)
        elif choice == "2":
            list_items(client)
        elif choice == "3":
            do_stock_in(client)
        elif choice == "4":
            do_stock_out(client)
        elif choice == "5":
            batch_import_csv(client)
        elif choice == "6":
            export_backup(client)
        elif choice == "7":
            new_url = input("👉 បញ្ចូល Google Apps Script Web App URL ថ្មី: ").strip()
            if new_url.startswith("http"):
                client.api_url = new_url
                print(f"{Colors.GREEN}✅ បានកែប្រែ URL ជោគជ័យ!{Colors.ENDC}")
            else:
                print(f"{Colors.FAIL}❌ URL មិនត្រឹមត្រូវទេ{Colors.ENDC}")
        elif choice == "0":
            print(f"\n{Colors.CYAN}អរគុណដែលបានប្រើប្រាស់ប្រព័ន្ធគ្រប់គ្រងស្តុកទំនិញ! សូមជម្រាបលា។{Colors.ENDC}\n")
            sys.exit(0)
        else:
            print(f"{Colors.FAIL}ជម្រើសមិនត្រឹមត្រូវទេ!{Colors.ENDC}")

        input(f"\n{Colors.BOLD}ចុច Enter ដើម្បីបន្ត...{Colors.ENDC}")

if __name__ == "__main__":
    main_menu()
