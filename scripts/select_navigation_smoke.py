from __future__ import annotations

from playwright.sync_api import sync_playwright

from select_test_support import session_test_environment


def run_playwright_smoke(session_url: str) -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 980})
        try:
            page.goto(session_url, wait_until="networkidle")
            page.locator("text=Available cards").wait_for()

            page.dblclick("#catalog-card-1")
            page.locator("#selected-slot-0 img").wait_for()
            page.wait_for_function(
                "() => document.querySelector('#catalog-card-1')?.dataset.selected === 'true'"
            )
            page.wait_for_function(
                """
                () => {
                  const image = document.querySelector('#catalog-card-1 img');
                  return image && Number.parseFloat(window.getComputedStyle(image).opacity) < 0.95;
                }
                """
            )

            page.focus("#catalog-card-2")
            page.keyboard.press("Enter")
            page.locator("#selected-slot-1 img").wait_for()
            page.wait_for_function(
                "() => document.querySelector('#catalog-card-2')?.dataset.selected === 'true'"
            )

            page.keyboard.press("Tab")
            page.wait_for_function(
                "() => document.activeElement && document.activeElement.id === 'selected-slot-0'"
            )

            page.keyboard.press("ArrowRight")
            page.wait_for_function(
                "() => document.activeElement && document.activeElement.id === 'selected-slot-1'"
            )

            page.keyboard.press("Enter")
            page.wait_for_function(
                "() => document.querySelector('#selected-slot-1')?.dataset.hasCard === 'false'"
            )
            page.wait_for_function(
                "() => document.querySelector('#catalog-card-2')?.dataset.selected === 'false'"
            )
            page.wait_for_function(
                "() => document.activeElement && document.activeElement.id === 'selected-slot-1'"
            )

            page.keyboard.press("Tab")
            page.wait_for_function(
                "() => document.activeElement && document.activeElement.id === 'catalog-card-2'"
            )
            page.keyboard.press("ArrowRight")
            page.wait_for_function(
                "() => document.activeElement && document.activeElement.id === 'catalog-card-3'"
            )
            page.keyboard.press("ArrowLeft")
            page.wait_for_function(
                "() => document.activeElement && document.activeElement.id === 'catalog-card-2'"
            )
        finally:
            browser.close()


def main() -> int:
    with session_test_environment() as session_url:
        run_playwright_smoke(session_url)

    print("Select navigation smoke test passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
