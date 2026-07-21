import os
from pathlib import Path
from playwright.sync_api import sync_playwright


email = os.environ["MONPETITPRO_TEST_EMAIL"]
password = os.environ["MONPETITPRO_TEST_PASSWORD"]

with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    page.goto("http://127.0.0.1:5173/login")
    page.wait_for_load_state("networkidle")
    page.get_by_label("Adresse e-mail").fill(email)
    page.get_by_label("Mot de passe").fill(password)
    page.get_by_role("button", name="Se connecter").click()
    page.wait_for_url("http://127.0.0.1:5173/")
    page.goto("http://127.0.0.1:5173/admin/users")
    page.wait_for_load_state("networkidle")

    assert page.get_by_role("heading", name="Équipe et droits d’accès").is_visible()
    assert page.get_by_text("Création directe, sans envoi d’e-mail").is_visible()
    assert page.get_by_placeholder("Mot de passe temporaire (12 caractères minimum)").is_visible()
    assert page.get_by_text("Sécuriser la démo").count() == 0
    assert page.get_by_text("Envoyer l’invitation").count() == 0

    heavy_elements = page.locator("body *").evaluate_all(
        "elements => elements.filter(element => Number(getComputedStyle(element).fontWeight) > 600).length"
    )
    assert heavy_elements == 0

    output = Path("artifacts")
    output.mkdir(exist_ok=True)
    page.screenshot(path=str(output / "admin-calm-typography.png"), full_page=True)
    browser.close()
