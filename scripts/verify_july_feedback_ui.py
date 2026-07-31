"""Recette navigateur MonPetitPro.

Sans secret, vérifie l'écran public de connexion. Avec MPP_TEST_EMAIL et
MPP_TEST_PASSWORD, parcourt aussi les écrans autorisés du compte de recette.
"""
import os
import base64
import json
import re
import time
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE_URL = os.getenv("MPP_BASE_URL", "http://127.0.0.1:4173")
EMAIL = os.getenv("MPP_TEST_EMAIL")
PASSWORD = os.getenv("MPP_TEST_PASSWORD")
MOCK_AUTH = os.getenv("MPP_MOCK_AUTH") == "1"
ARTIFACTS = Path(os.getenv("MPP_UI_ARTIFACTS", str(Path.cwd() / "test-results" / "july-feedback")))
ARTIFACTS.mkdir(parents=True, exist_ok=True)
USER_ID = "11111111-1111-4111-8111-111111111111"
OPERATION_ID = "22222222-2222-4222-8222-222222222222"
ROLE_ID = "33333333-3333-4333-8333-333333333333"


def assert_mineral_palette(page, primary_button=None):
    body_background = page.locator("body").evaluate(
        "element => getComputedStyle(element).backgroundColor"
    )
    color_scheme = page.locator("html").evaluate(
        "element => getComputedStyle(element).colorScheme"
    )
    assert body_background == "rgb(246, 244, 239)", (
        f"Fond attendu ivoire minéral, reçu {body_background}"
    )
    assert color_scheme == "light", f"Le thème doit rester clair, reçu {color_scheme}"
    expect(
        page.get_by_role("button", name=re.compile("thème|mode sombre", re.IGNORECASE))
    ).to_have_count(0)
    if primary_button is not None:
        primary_background = primary_button.evaluate(
            "element => getComputedStyle(element).backgroundColor"
        )
        assert primary_background == "rgb(143, 73, 56)", (
            f"Action principale attendue terre cuite, reçue {primary_background}"
        )


def assert_ics_download(page, button, expected_events=None):
    with page.expect_download() as download_info:
        button.click()
    download = download_info.value
    assert download.suggested_filename.endswith(".ics"), download.suggested_filename
    content = Path(download.path()).read_text(encoding="utf-8")
    assert "BEGIN:VCALENDAR" in content
    assert "END:VCALENDAR" in content
    assert "TRIGGER:-P30D" in content
    assert "TRIGGER:-P15D" in content
    if expected_events is not None:
        assert content.count("BEGIN:VEVENT") == expected_events, content
    return content


def encode_part(value):
    return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip("=")


def mock_session():
    user = {
        "id": USER_ID,
        "aud": "authenticated",
        "role": "authenticated",
        "email": "recette@monpetitpro.local",
        "app_metadata": {"provider": "email", "providers": ["email"]},
        "user_metadata": {},
        "created_at": "2026-01-01T00:00:00Z",
    }
    token = ".".join([
        encode_part({"alg": "none", "typ": "JWT"}),
        encode_part({"sub": USER_ID, "role": "authenticated", "exp": int(time.time()) + 86400}),
        "mock",
    ])
    return {
        "access_token": token,
        "refresh_token": "mock-refresh-token",
        "expires_at": int(time.time()) + 86400,
        "expires_in": 86400,
        "token_type": "bearer",
        "user": user,
    }


def mock_fixtures(must_change_password=False):
    profile = {
        "id": USER_ID,
        "email": "recette@monpetitpro.local",
        "display_name": "Compte recette",
        "initials": "CR",
        "role": "admin",
        "custom_role_id": ROLE_ID,
        "status": "active",
        "is_owner": True,
        "must_change_password": must_change_password,
        "custom_role": {
            "id": ROLE_ID, "name": "Administrateur recette", "description": None,
            "color_key": "teal", "is_active": True, "is_system": False,
        },
    }
    operation = {
        "id": OPERATION_ID, "name": "Clairoix — opération recette", "stage": "1",
        "of_number": "OF-2026-01", "gesprojet_number": "GP-01",
        "department": "60", "commune": "Clairoix", "address": "1 rue de la Recette",
        "operation_type": "MOD", "program_nature": "Neuf",
        "project_manager": "CTX Recette", "operations_manager": "COP Recette",
        "promoter_name": "Promoteur Recette", "certification": "CERQUAL",
        "thermal_regulation": "RE2020", "total_housing_units": 32,
        "collective_housing_units": 20, "individual_housing_units": 11,
        "commercial_units": 1, "plus_units": 20, "lli_units": 11,
        "permit_expected_date": "2026-08-15", "permit_order_date": "2026-08-20",
        "works_order_expected_date": "2026-09-01", "works_order_actual_date": None,
        "expected_delivery_date": "2027-10-01", "actual_delivery_date": None,
        "management_expected_date": "2027-10-15", "management_actual_date": None,
        "initial_budget": 4800000, "final_budget": None,
        "operation_budget_lines": [{
            "id": "44444444-4444-4444-8444-444444444444",
            "operation_id": OPERATION_ID, "family": "LLS", "realization_mode": "MOD",
            "forecast_ht": 4800000, "forecast_ttc": 5760000, "forecast_equity": 350000,
            "final_ht": None, "final_ttc": None, "final_equity": None, "sort_order": 0,
        }],
        "observations": [{"responsible_person": "Compte recette"}],
    }
    observation = {
        "id": "55555555-5555-4555-8555-555555555555",
        "operation_id": OPERATION_ID, "user_id": USER_ID, "assignee_user_id": USER_ID,
        "information_date": "2026-07-20", "description": "Lever le point de contrôle",
        "deadline_date": "2026-08-10", "proposed_resolution_date": "2026-08-05",
        "completion_date": None, "status": "En cours", "is_dg": False,
        "responsible_person": "Compte recette", "author_initials": "CR",
        "operations": {
            "id": OPERATION_ID, "name": operation["name"],
            "project_manager": operation["project_manager"],
            "operations_manager": operation["operations_manager"],
            "promoter_name": operation["promoter_name"],
            "operation_type": operation["operation_type"], "stage": operation["stage"],
        },
    }
    permissions = [
        "operations.view", "operations.create", "operations.edit_identity",
        "operations.edit_team", "operations.edit_program", "operations.edit_planning",
        "operations.edit_budget", "operations.edit_conditions", "operations.edit_objectives",
        "operations.edit_synthesis", "operations.export",
        "observations.view", "observations.view_all", "observations.view_dg",
        "observations.create", "observations.edit_all", "observations.assign",
        "observations.reassign", "observations.set_completion", "observations.set_status",
        "observations.set_dg", "observations.export",
        "calendar.view", "calendar.manage", "calendar.export",
        "statistics.view", "statistics.export", "objectives.view", "objectives.manage",
        "objectives.export", "references.view", "references.manage",
        "admin.users.view", "admin.users.manage", "admin.users.invite",
        "admin.users.suspend", "admin.roles.view", "admin.roles.manage", "admin.audit.view",
        "documents.view", "documents.upload", "documents.review", "documents.delete",
    ]
    return {
        "profile": profile,
        "permissions": [{"permission_key": key} for key in permissions],
        "profiles": [profile],
        "operations": [operation],
        "observations": [observation],
        "custom_roles": [{
            "id": ROLE_ID, "name": "Administrateur recette", "description": "Tous les droits",
            "color_key": "teal", "is_active": True, "is_system": False,
        }],
        "custom_role_permissions": [{"role_id": ROLE_ID, "permission_key": key} for key in permissions],
        "reference_values": [
            {"id": "ref-1", "kind": "program_nature", "label": "Neuf", "is_active": True, "sort_order": 0},
            {"id": "ref-2", "kind": "promoter", "label": "Promoteur Recette", "is_active": True, "sort_order": 0},
            {"id": "ref-3", "kind": "certification", "label": "CERQUAL", "is_active": True, "sort_order": 0},
            {"id": "ref-4", "kind": "thermal_regulation", "label": "RE2020", "is_active": True, "sort_order": 0},
        ],
        "communes": [{
            "id": "commune-1", "name": "Clairoix", "insee_code": "60156",
            "postal_code": "60280", "department_code": "60", "department_name": "Oise",
            "region_name": "Hauts-de-France", "housing_zone": "B1", "is_active": True,
        }],
        "operation_program_sections": [
            {"id": "section-1", "operation_id": OPERATION_ID, "kind": "collective", "label": "Collectifs", "enabled": True, "sort_order": 0},
        ],
        "operation_program_lines": [
            {"id": "line-1", "operation_id": OPERATION_ID, "section_id": "section-1", "label": "T3", "product": "PLUS", "units": 20, "average_surface": 65, "sort_order": 0},
        ],
        "operation_budget_lines": operation["operation_budget_lines"],
        "operation_subsidies": [],
        "operation_objectives": [{
            "id": "objective-1", "operation_id": OPERATION_ID, "kind": "management",
            "objective_year": 2027, "category": "initial",
            "snapshot_date": "2027-10-15", "snapshot_housing_units": 32,
        }],
        "operation_significant_works": [],
        "suspensive_conditions": [],
        "events": [],
        "operation_typologies": [],
        "audit_log": [{
            "id": 1, "table_name": "operations", "record_id": OPERATION_ID,
            "action": "UPDATE", "changed_by": USER_ID,
            "old_values": {"name": "Clairoix"}, "new_values": {"name": operation["name"]},
            "changed_at": "2026-07-30T12:00:00Z",
        }],
    }


def install_mock_backend(context, must_change_password=False):
    fixtures = mock_fixtures(must_change_password)
    session = mock_session()
    context.add_init_script(
        f"localStorage.setItem('sb-vtzpkupnpinqtptrgbus-auth-token', {json.dumps(json.dumps(session))});"
    )

    def handler(route):
        request = route.request
        url = request.url
        if request.method == "OPTIONS":
            route.fulfill(status=200, headers={"Access-Control-Allow-Origin": "*"})
            return
        if "/auth/v1/user" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps(session["user"]))
            return
        if "/auth/v1/" in url:
            route.fulfill(status=200, content_type="application/json", body=json.dumps(session))
            return
        if "/rest/v1/rpc/my_permissions" in url:
            data = fixtures["permissions"]
        elif "/rest/v1/rpc/" in url:
            data = {}
        elif "/rest/v1/" in url:
            table = url.split("/rest/v1/", 1)[1].split("?", 1)[0]
            data = fixtures.get(table, [])
            if table == "profiles" and "id=eq." in url:
                data = fixtures["profile"]
            elif "application/vnd.pgrst.object+json" in request.headers.get("accept", ""):
                data = data[0] if isinstance(data, list) and data else {}
        else:
            route.continue_()
            return
        route.fulfill(
            status=200,
            content_type="application/json",
            headers={"Access-Control-Allow-Origin": "*", "Content-Range": "0-0/1"},
            body=json.dumps(data),
        )

    context.route("https://vtzpkupnpinqtptrgbus.supabase.co/**", handler)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(headless=True)
    public_context = browser.new_context(viewport={"width": 1440, "height": 1000})
    page = public_context.new_page()
    console_errors = []
    page.on("console", lambda message: console_errors.append(message.text) if message.type == "error" else None)
    page.goto(BASE_URL, wait_until="networkidle")
    expect(page.get_by_role("heading", name="MonPetitPro")).to_be_visible()
    expect(page.get_by_label("Adresse e-mail")).to_be_visible()
    expect(page.get_by_label("Mot de passe")).to_be_visible()
    expect(page.get_by_text("Les comptes sont créés par un administrateur avec un mot de passe temporaire.")).to_be_visible()
    assert_mineral_palette(page, page.get_by_role("button", name="Se connecter"))
    page.screenshot(path=str(ARTIFACTS / "login-desktop.png"), full_page=True)

    mobile_context = browser.new_context(viewport={"width": 390, "height": 844})
    mobile = mobile_context.new_page()
    mobile.goto(BASE_URL, wait_until="networkidle")
    expect(mobile.get_by_role("button", name="Se connecter")).to_be_visible()
    mobile.screenshot(path=str(ARTIFACTS / "login-mobile.png"), full_page=True)
    mobile_context.close()

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
        assert_mineral_palette(page)
        page.screenshot(path=str(ARTIFACTS / "authenticated-overview.png"), full_page=True)

    relevant_errors = [error for error in console_errors if "favicon" not in error.lower()]
    assert not relevant_errors, f"Erreurs console détectées: {relevant_errors}"
    public_context.close()

    if MOCK_AUTH:
        auth_context = browser.new_context(viewport={"width": 1440, "height": 1000})
        install_mock_backend(auth_context)
        authenticated = auth_context.new_page()
        authenticated.goto(f"{BASE_URL}/", wait_until="networkidle")
        expect(authenticated.get_by_role("heading", name="Opérations")).to_be_visible()
        expect(authenticated.get_by_text("Clairoix — opération recette").first).to_be_visible()
        assert_mineral_palette(authenticated)
        expect(authenticated.get_by_role("heading", name="Échéances à surveiller")).to_be_visible()
        assert_ics_download(
            authenticated,
            authenticated.get_by_role("button", name="Exporter toutes vers Outlook"),
            expected_events=1,
        )
        assert_ics_download(
            authenticated,
            authenticated.get_by_role("button", name=re.compile("Ajouter .* à Outlook")).first,
            expected_events=1,
        )
        authenticated.screenshot(path=str(ARTIFACTS / "dashboard-desktop.png"), full_page=True)

        authenticated.goto(f"{BASE_URL}/operations/new", wait_until="networkidle")
        expect(authenticated.get_by_role("heading", name="Créer une opération complète")).to_be_visible()
        authenticated.locator('[role="tab"]').filter(has_text="Programme").click()
        expect(authenticated.get_by_role("button", name="Ajouter une ligne").first).to_be_visible()
        authenticated.get_by_role("button", name="Ajouter une ligne").first.click()
        expect(authenticated.get_by_role("button", name="Monter la ligne")).to_be_visible()
        for tab, expected_text in [
            ("Planning", "Comités et passations"),
            ("Budget", "Ajouter une ligne"),
            ("Objectifs", "Objectif initial"),
            ("Synthèse", "Travaux significatifs"),
        ]:
            authenticated.locator('[role="tab"]').filter(has_text=tab).click()
            expect(authenticated.get_by_text(expected_text).first).to_be_visible()

        for route, heading in [
            ("/observations", "Observations"),
            ("/calendar", "Calendriers"),
            ("/statistics", "Statistiques"),
            ("/objectives", "Objectifs DMO"),
            ("/admin/users", "Équipe et droits d’accès"),
            ("/admin/references", "Référentiels de MonPetitPro"),
            ("/admin/history", "Historique des modifications"),
        ]:
            authenticated.goto(f"{BASE_URL}{route}", wait_until="networkidle")
            expect(authenticated.get_by_role("heading", name=heading)).to_be_visible()
            assert_mineral_palette(authenticated)
        authenticated.goto(f"{BASE_URL}/observations", wait_until="networkidle")
        expect(authenticated.get_by_label("Filtre DG")).to_be_visible()
        expect(authenticated.get_by_label("Filtre DG").locator("option[value='only']")).to_have_text("DG uniquement")
        expect(authenticated.get_by_role("button", name=re.compile("Exporter"))).to_be_visible()
        authenticated.goto(f"{BASE_URL}/calendar", wait_until="networkidle")
        calendar_export = authenticated.get_by_role(
            "button", name="Exporter les échéances vers Outlook (.ics)"
        )
        expect(calendar_export).to_be_visible()
        expect(authenticated.get_by_text("Rappels J-30 et J-15 inclus")).to_be_visible()
        assert_ics_download(authenticated, calendar_export)
        authenticated.get_by_role("button", name="Programme et autorisations").click()
        authenticated.get_by_role("button", name="Mois suivant").click()
        per_event_export = authenticated.get_by_role(
            "button", name=re.compile("Ajouter .* à Outlook")
        ).first
        expect(per_event_export).to_be_visible()
        assert_ics_download(authenticated, per_event_export, expected_events=1)
        authenticated.screenshot(path=str(ARTIFACTS / "calendar-desktop.png"), full_page=True)
        authenticated.goto(f"{BASE_URL}/statistics", wait_until="networkidle")
        expect(authenticated.get_by_text(re.compile("détail", re.IGNORECASE)).first).to_be_visible()
        authenticated.goto(f"{BASE_URL}/objectives", wait_until="networkidle")
        expect(authenticated.get_by_text("Objectif initial").first).to_be_visible()
        authenticated.goto(f"{BASE_URL}/admin/users", wait_until="networkidle")
        expect(authenticated.get_by_role("heading", name="Ajouter une personne")).to_be_visible()
        authenticated.screenshot(path=str(ARTIFACTS / "mock-authenticated-overview.png"), full_page=True)
        auth_context.close()

        auth_mobile_context = browser.new_context(viewport={"width": 390, "height": 844})
        install_mock_backend(auth_mobile_context)
        auth_mobile = auth_mobile_context.new_page()
        auth_mobile.goto(f"{BASE_URL}/", wait_until="networkidle")
        expect(auth_mobile.get_by_role("heading", name="Opérations")).to_be_visible()
        expect(auth_mobile.get_by_role("button", name="Exporter toutes vers Outlook")).to_be_visible()
        assert_mineral_palette(auth_mobile)
        auth_mobile.screenshot(path=str(ARTIFACTS / "dashboard-mobile.png"), full_page=True)
        auth_mobile.goto(f"{BASE_URL}/calendar", wait_until="networkidle")
        expect(auth_mobile.get_by_role("button", name="Exporter les échéances vers Outlook (.ics)")).to_be_visible()
        auth_mobile.screenshot(path=str(ARTIFACTS / "calendar-mobile.png"), full_page=True)
        auth_mobile_context.close()

        first_login_context = browser.new_context(viewport={"width": 1280, "height": 900})
        install_mock_backend(first_login_context, must_change_password=True)
        first_login = first_login_context.new_page()
        first_login.goto(f"{BASE_URL}/", wait_until="networkidle")
        expect(first_login.get_by_role("heading", name="Choisissez votre mot de passe")).to_be_visible()
        expect(first_login.get_by_text("Première connexion")).to_be_visible()
        first_login.screenshot(path=str(ARTIFACTS / "mock-first-login.png"), full_page=True)
        first_login_context.close()

    browser.close()

print("Recette navigateur terminée avec succès.")
