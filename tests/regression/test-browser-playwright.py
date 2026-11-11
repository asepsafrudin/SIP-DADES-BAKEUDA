import os
import time
from playwright.sync_api import sync_playwright

def run_browser_test():
    print("====================================================")
    print("🧪 RUNNING PLAYWRIGHT BROWSER VERIFICATION SIMULATION")
    print("====================================================\n")

    # Paths
    pdf_path = "/home/aseps/MCP/workspace/SIP-DADES-BAKEUDA/storage/ADD_2026_8-1.pdf"
    screenshot_path = "/home/aseps/MCP/workspace/SIP-DADES-BAKEUDA/storage/screenshot_verification.png"

    if not os.path.exists(pdf_path):
        print(f"❌ Test file not found: {pdf_path}")
        return

    with sync_playwright() as p:
        print("🚀 Launching headless Chromium browser...")
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        # Handle browser alert/dialog dialogs automatically
        def handle_dialog(dialog):
            print(f"💬 Dialog encountered: [{dialog.message}] - Accepting.")
            dialog.accept()

        page.on("dialog", handle_dialog)

        # 1. Open dashboard page
        url = "http://localhost:3000/dashboard/add"
        print(f"🌐 Navigating to {url}...")
        page.goto(url)

        # Wait for the table rows to load
        print("⏳ Waiting for transaction data list to populate...")
        page.wait_for_timeout(3000)

        # Print page title
        print(f"📋 Loaded Page Title: '{page.title()}'")

        # 2. Click the first row to expand it
        first_row_selector = "tbody tr.cursor-pointer"
        if page.locator(first_row_selector).count() > 0:
            print("👇 Clicking first transaction row to expand PrintScanWorkflow drawer...")
            
            # Print original status badge text
            original_status = page.locator("tbody tr.cursor-pointer td").nth(1).inner_text().strip()
            print(f"   -> Original Status: {original_status}")
            
            # Click
            page.locator(first_row_selector).first.click()
            page.wait_for_timeout(1000)

            # If print button is visible (status = DRAFT), click it
            print_button_selector = "button:has-text('Cetak Fisik')"
            if page.locator(print_button_selector).count() > 0:
                print("🖨️ Clicking 'Cetak Fisik SPM (PDF)' to transition to MENUNGGU_TTE...")
                page.locator(print_button_selector).first.click()
                page.wait_for_timeout(2000)

            # 3. Find file input field and upload document
            file_input_locator = page.locator("input[type='file']").last
            if file_input_locator.count() > 0:
                print(f"📤 Uploading document scan: {os.path.basename(pdf_path)}...")
                file_input_locator.set_input_files(pdf_path)
                
                # Wait for request to process and alert dialog to trigger
                print("⏳ Waiting for backend validation and upload processing...")
                page.wait_for_timeout(6000)

                # Re-check status badge text
                updated_status = page.locator("tbody tr.cursor-pointer td").nth(1).inner_text().strip()
                print(f"   -> Updated Status in UI: {updated_status}")

                if updated_status == "CAIR":
                  print("\n🎉 SUCCESS: Transaction status successfully updated to CAIR in the browser UI!")
                else:
                  print("\n⚠️ WARNING: Status text did not transition to CAIR. Current value:", updated_status)

                # 4. Save validation screenshot
                print(f"📸 Saving verification screenshot to: {screenshot_path}...")
                page.screenshot(path=screenshot_path)
                print("✅ Screenshot saved successfully.")
            else:
                print("❌ File input element not found in expanded details row.")
        else:
            print("❌ No transaction rows found in the table. Seed data first.")

        browser.close()
        print("\n====================================================")
        print("🎉 BROWSER SIMULATION COMPLETE")
        print("====================================================")

if __name__ == "__main__":
    run_browser_test()
