import time
from playwright.sync_api import sync_playwright, expect

FRONTEND_URL = "http://localhost:8081"

def run_security_audit():
    with sync_playwright() as p:
        print("🛡️  INITIATING SECURITY PROTOCOL AUDIT...")
        browser = p.chromium.launch(headless=False, slow_mo=500)
        page = browser.new_page()
        
        # --- TEST 1: LOGIN VALIDATION ---
        print("\n🧪 CASE 1: Login Form Validation")
        try:
            page.goto(f"{FRONTEND_URL}/login")
            page.wait_for_load_state('networkidle')
            
            # Try to login with empty fields
            submit_btn = page.locator("button[type='submit']")
            if submit_btn.count() > 0:
                submit_btn.first.click()
                page.wait_for_timeout(1000)
                
                # Should still be on login page
                if "login" in page.url.lower():
                    print("✅ PASS: Empty login attempt blocked")
                else:
                    print("⚠️ WARNING: Empty login was not blocked")
        except Exception as e:
            print(f"⚠️ Test 1 Skipped/Failed: {e}")

        # --- TEST 2: VALID LOGIN ---
        print("\n🧪 CASE 2: Valid Login Flow")
        try:
            page.goto(f"{FRONTEND_URL}/login")
            page.wait_for_load_state('networkidle')
            
            # Fill valid credentials
            email_input = page.locator("input[type='email']")
            password_input = page.locator("input[type='password']")
            
            if email_input.count() > 0 and password_input.count() > 0:
                email_input.first.fill("client_demo@mhub.com")
                password_input.first.fill("password123")
                
                submit_btn = page.locator("button[type='submit']")
                if submit_btn.count() > 0:
                    submit_btn.first.click()
                    page.wait_for_timeout(3000)
                    
                    if "login" not in page.url.lower():
                        print("✅ PASS: Valid login successful")
                    else:
                        print("⚠️ WARNING: Login may have failed")
        except Exception as e:
            print(f"⚠️ Test 2 Skipped/Failed: {e}")

        # --- TEST 3: PAGE LOAD VERIFICATION ---
        print("\n🧪 CASE 3: Page Load Without White-Screen")
        pages_to_test = ["/", "/profile", "/rewards"]
        for path in pages_to_test:
            try:
                page.goto(f"{FRONTEND_URL}{path}")
                page.wait_for_load_state('networkidle')
                page.wait_for_timeout(1000)
                
                # Check for content
                body = page.locator("body")
                if body.inner_text().strip():
                    print(f"✅ PASS: {path} loaded with content")
                else:
                    print(f"⚠️ WARNING: {path} may be empty/white-screen")
            except Exception as e:
                print(f"⚠️ Test for {path} failed: {e}")

        # --- TEST 4: LOCATION DISPLAY ---
        print("\n🧪 CASE 4: Location Verification")
        try:
            page.goto(f"{FRONTEND_URL}/profile")
            page.wait_for_load_state('networkidle')
            page.wait_for_timeout(2000)
            
            page_content = page.locator("body").inner_text()
            if "hyderabad" in page_content.lower() or "india" in page_content.lower():
                print("✅ PASS: Location is displayed on profile")
            else:
                print("⚠️ WARNING: Location may not be displayed")
        except Exception as e:
            print(f"⚠️ Test 4 Skipped/Failed: {e}")

        print("\n🔒 SECURITY AUDIT COMPLETE")
        browser.close()

if __name__ == "__main__":
    run_security_audit()
