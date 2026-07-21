from pathlib import Path
from playwright.sync_api import sync_playwright


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page.goto("http://127.0.0.1:4173/login")
    page.wait_for_load_state("networkidle")

    assert page.get_by_role("heading", name="MonPetitPro").is_visible()
    assert page.get_by_label("Adresse e-mail").input_value() == ""
    assert page.get_by_label("Mot de passe").input_value() == ""
    assert page.get_by_role("button", name="Se connecter").is_visible()
    assert page.get_by_text("Les comptes sont créés ou invités par un administrateur.").is_visible()
    assert page.get_by_text("Créer ce compte la première fois").count() == 0

    output = Path("artifacts")
    output.mkdir(exist_ok=True)
    page.screenshot(path=str(output / "login-access-control.png"), full_page=True)
    browser.close()
