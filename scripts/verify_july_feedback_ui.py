"""Recette navigateur MonPetitPro.

Sans secret, vérifie l'écran public de connexion. Avec MPP_TEST_EMAIL et
MPP_TEST_PASSWORD, parcourt aussi les écrans autorisés du compte de recette.
"""
import os
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE_URL = os.getenv("MPP_BASE_URL", "http://127.0.0.1:4173")
EMAIL = os.getenv("MPP_TEST_EMAIL")
PASSWORD = os.getenv("MPP_TEST_PASSWORD")
ARTIFACTS = Path(os.getenv("MPP_UI_ARTIFACTS", str(Path.cwd() / "test-results" / "july-feedback")))
ARTIFACTS.mkdir(parents=True, exist_ok=True)


def assert_light_palette(page):
    forbidden = page.locator('[class*="bg-black"], [class*="bg-slate-950"][class*="min-h-screen"], [class*="bg-sky-"]')
    assert forbidden.count() == 0, "Un fond sombre ou un accent bleu vif est encore visible"


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    console_errors = []
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
    page.goto(BASE_URL, wait_until="networkidle")
    expect(page.get_by_role("heading", name="MonPetitPro")).to_be_visible()
    expect(page.get_by_label("Adresse e-mail")).to_be_visible()
    expect(page.get_by_label("Mot de passe")).to_be_visible()
    expect(page.get_by_text("Les comptes sont créés par un administrateur avec un mot de passe temporaire.")).to_be_visible()
    assert_light_palette(page)
    page.screenshot(path=str(ARTIFACTS / "login-desktop.png"), full_page=True)

    mobile = browser.new_page(viewport={"width": 390, "height": 844})
    mobile.goto(BASE_URL, wait_until="networkidle")
    expect(mobile.get_by_role("button", name="Se connecter")).to_be_visible()
    mobile.screenshot(path=str(ARTIFACTS / "login-mobile.png"), full_page=True)
    mobile.close()

    if EMAIL and PASSWORD:
        page.get_by_label("Adresse e-mail").fill(EMAIL)
        page.get_by_label("Mot de passe").fill(PASSWORD)
        page.get_by_role("button", name="Se connecter").click()
        page.wait_for_load_state("networkidle")
        if page.url.endswith("/change-password"):
            raise AssertionError("Le compte de recette doit d'abord changer son mot de passe temporaire")
        expect(page.get_by_role("heading", name="Opérations")).to_be_visible()
        routes = [
            ("/observations", "Observations"),
            ("/calendar", "Calendrier"),
            ("/statistics", "Statistiques"),
            ("/objectives", "Objectifs DMO"),
        ]
        for route, heading in routes:
            page.goto(f"{BASE_URL}{route}", wait_until="networkidle")
            expect(page.get_by_role("heading", name=heading)).to_be_visible()
            assert_light_palette(page)
        page.screenshot(path=str(ARTIFACTS / "authenticated-overview.png"), full_page=True)

    relevant_errors = [error for error in console_errors if "favicon" not in error.lower()]
    assert not relevant_errors, f"Erreurs console détectées: {relevant_errors}"
    browser.close()

print("Recette navigateur terminée avec succès.")
