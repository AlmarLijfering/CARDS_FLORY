from __future__ import annotations

from playwright.sync_api import expect, sync_playwright

from select_test_support import session_test_environment


def drag_card_to_slot(page, card_id: int, slot_index: int) -> None:
    source = page.locator(f"#catalog-card-{card_id}")
    target = page.locator(f"#selected-slot-{slot_index}")
    source_box = source.bounding_box()
    target_box = target.bounding_box()

    if not source_box or not target_box:
        raise RuntimeError("Could not resolve source or target bounds for drag/drop test.")

    page.mouse.move(
        source_box["x"] + source_box["width"] / 2,
        source_box["y"] + source_box["height"] / 2,
    )
    page.mouse.down()
    page.mouse.move(
        source_box["x"] + source_box["width"] / 2 + 12,
        source_box["y"] + source_box["height"] / 2 + 12,
        steps=8,
    )
    page.locator("#drag-overlay-card").wait_for()
    overlay_box = page.locator("#drag-overlay-card").bounding_box()
    if not overlay_box:
        raise RuntimeError("Drag overlay did not appear.")

    width_delta = abs(overlay_box["width"] - overlay_box["height"])
    if width_delta > 2:
        raise AssertionError(f"Drag overlay is not square enough: width/height delta = {width_delta}")

    page.mouse.move(
        target_box["x"] + target_box["width"] / 2,
        target_box["y"] + target_box["height"] / 2,
        steps=18,
    )
    page.mouse.up()


def run_drag_drop_regression(session_url: str) -> None:
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": 1440, "height": 980})
        try:
            page.goto(session_url, wait_until="networkidle")
            page.locator("text=Available cards").wait_for()

            drag_card_to_slot(page, card_id=3, slot_index=5)
            page.wait_for_function(
                "() => document.querySelector('#selected-slot-5')?.dataset.hasCard === 'true'"
            )
            page.wait_for_function(
                "() => document.querySelector('#selected-slot-0')?.dataset.hasCard === 'false'"
            )
            page.wait_for_function(
                "() => document.querySelector('#catalog-card-3')?.dataset.selected === 'true'"
            )
            expect(page.locator("#selected-slot-5 img")).to_be_visible()

            drag_card_to_slot(page, card_id=4, slot_index=0)
            page.wait_for_function(
                "() => document.querySelector('#selected-slot-0')?.dataset.hasCard === 'true'"
            )
            page.wait_for_function(
                "() => document.querySelector('#catalog-card-4')?.dataset.selected === 'true'"
            )
            expect(page.locator("#selected-slot-0 img")).to_be_visible()
        finally:
            browser.close()


def main() -> int:
    with session_test_environment() as session_url:
        run_drag_drop_regression(session_url)

    print("Select drag/drop regression passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
