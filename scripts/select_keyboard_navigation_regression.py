from __future__ import annotations

from playwright.sync_api import sync_playwright

from select_test_support import session_test_environment


def run_keyboard_regression(session_url: str) -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 980})
        try:
            page.goto(session_url, wait_until="networkidle")
            page.locator("text=Available cards").wait_for()

            page.focus("#catalog-card-1")
            page.keyboard.press("ArrowRight")
            page.wait_for_function(
                "() => document.activeElement && document.activeElement.id === 'catalog-card-2'"
            )

            page.keyboard.press("ArrowLeft")
            page.wait_for_function(
                "() => document.activeElement && document.activeElement.id === 'catalog-card-1'"
            )

            page.keyboard.press("ArrowUp")
            page.wait_for_function(
                "() => document.activeElement && document.activeElement.id === 'catalog-card-7'"
            )

            page.keyboard.press("ArrowDown")
            page.wait_for_function(
                "() => document.activeElement && document.activeElement.id === 'catalog-card-1'"
            )

            page.keyboard.press("Enter")
            page.wait_for_function(
                "() => document.querySelector('#selected-slot-0')?.dataset.hasCard === 'true'"
            )

            page.keyboard.press("Tab")
            page.wait_for_function(
                "() => document.activeElement && document.activeElement.id === 'selected-slot-0'"
            )

            page.keyboard.press("ArrowRight")
            page.wait_for_function(
                "() => document.activeElement && document.activeElement.id === 'selected-slot-1'"
            )

            page.keyboard.press("ArrowLeft")
            page.wait_for_function(
                "() => document.activeElement && document.activeElement.id === 'selected-slot-0'"
            )

            page.keyboard.press("Tab")
            page.wait_for_function(
                "() => document.activeElement && document.activeElement.id === 'catalog-card-2'"
            )
        finally:
            browser.close()


def main() -> int:
    with session_test_environment() as session_url:
        run_keyboard_regression(session_url)

    print("Select keyboard navigation regression passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
