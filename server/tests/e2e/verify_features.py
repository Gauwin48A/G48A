import re
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    try:
        # Step 1: Verify "View Details" functionality
        page.goto("http://localhost:5000/", timeout=60000)

        # Wait for the posts to load and find the first "View Details" button
        first_post_details_button = page.locator('button:has-text("View Details")').first
        expect(first_post_details_button).to_be_visible(timeout=30000)

        # Get the title of the post to verify on the next page
        post_card = page.locator('.card').filter(has=first_post_details_button).first
        post_title_element = post_card.locator('.font-semibold.text-blue-900').first
        post_title = post_title_element.inner_text()

        first_post_details_button.click()

        # Verify navigation and that the correct post is displayed
        expect(page).to_have_url(re.compile(r'/post/\d+'), timeout=30000)
        expect(page.locator(f'h1:has-text("{post_title}")')).to_be_visible(timeout=30000)

        # Step 2: Verify the new "Add Post" navigation flow
        # Use the '+' button in the bottom navbar
        add_post_button = page.locator('button[aria-label="Sell"]')
        expect(add_post_button).to_be_visible(timeout=30000)
        add_post_button.click()

        # On Tier Selection page, select the "Basic" tier
        expect(page).to_have_url(re.compile(r'/tier-selection'), timeout=30000)
        basic_tier_button = page.locator('button:has-text("Choose Basic")')
        expect(basic_tier_button).to_be_visible(timeout=30000)
        basic_tier_button.click()

        # On Categories page, select the "Electronics" category
        expect(page).to_have_url(re.compile(r'/categories'), timeout=30000)
        electronics_category_button = page.locator('button:has-text("Electronics")')
        expect(electronics_category_button).to_be_visible(timeout=30000)
        electronics_category_button.click()

        # On Add Post page, verify the category is pre-filled and locked
        expect(page).to_have_url(re.compile(r'/add-post'), timeout=30000)
        category_input = page.locator('select[name="category"]')

        # Check that the value is correct
        expect(category_input).to_have_value('Electronics')

        # Check that the input is disabled
        expect(category_input).to_be_disabled()

        # Take a screenshot to visually confirm the result
        page.screenshot(path="server/tests/e2e/verification.png")

    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
