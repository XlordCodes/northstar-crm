# tests/integration/test_security.py
"""
Module: Security Boundary Integration Tests
Context: Cross-cutting - Security Controls.

Tests the security controls introduced in recent remediation batches:
- Login rate limiting (429 after 5 failed attempts)
- Password complexity enforcement (422 for weak passwords)
- AI prompt length cap (422 for prompt > 2000 chars)
- Contact cross-tenant BOLA prevention
- Contact tenant_id isolation in service layer

All tests use the shared conftest.py fixtures (client, auth_headers, test_user, db_session).
"""

import pytest
import uuid
from httpx import AsyncClient
from app.authentication.hashing import hash_password
from app.authentication.router import create_access_token
from datetime import timedelta

# Mark all tests in this module as asyncio
pytestmark = pytest.mark.asyncio


# =============================================================================
# TEST 1: Login Rate Limiting (429 after 5 failed attempts)
# =============================================================================

async def test_login_rate_limiting(client: AsyncClient):
    """
    Verify that the login endpoint enforces rate limiting.

    After 5 consecutive failed login attempts, the 6th attempt
    should return 429 Too Many Requests.

    The rate limiter tracks attempts per username and resets on success.
    """
    email = f"ratelimit_{uuid.uuid4().hex[:6]}@test.com"

    # First, register a user so the rate limiter is triggered by wrong password
    # (not by non-existent user, which also counts as a failed attempt)
    reg_payload = {
        "email": email,
        "password": "SecurePass123!",
        "name": "Rate Limit Test User"
    }
    reg_res = await client.post("/v1/api/auth/register", json=reg_payload)
    assert reg_res.status_code in [200, 201], f"Registration failed: {reg_res.text}"

    # Make 5 failed login attempts
    for i in range(5):
        login_data = {
            "username": email,
            "password": "WrongPassword1!"
        }
        res = await client.post("/v1/api/auth/token", data=login_data)
        assert res.status_code == 401, (
            f"Attempt {i + 1}: Expected 401, got {res.status_code}"
        )

    # The 6th attempt should be rate limited (429)
    res = await client.post(
        "/v1/api/auth/token",
        data={"username": email, "password": "WrongPassword1!"}
    )
    assert res.status_code == 429, (
        f"Expected 429 Too Many Requests after 5 failures, got {res.status_code}. "
        f"Response: {res.text}"
    )

    # Verify error message
    error_detail = res.json().get("detail", "")
    assert "too many" in error_detail.lower(), (
        f"Error should mention rate limiting. Got: {error_detail}"
    )


# =============================================================================
# TEST 2: Login Rate Limiting Reset on Success
# =============================================================================

async def test_login_rate_limit_resets_on_success(client: AsyncClient):
    """
    Verify that a successful login clears the rate limit counter.

    Steps:
    1. Make 3 failed attempts (under the limit)
    2. Login successfully
    3. Make 3 more failed attempts (counter should be reset)
    4. Verify we don't get 429 until 5 more failures
    """
    email = f"ratelimit_reset_{uuid.uuid4().hex[:6]}@test.com"
    password = "SecurePass123!"

    # Register
    reg_res = await client.post("/v1/api/auth/register", json={
        "email": email,
        "password": password,
        "name": "Reset Test User"
    })
    assert reg_res.status_code in [200, 201]

    # 3 failed attempts
    for _ in range(3):
        res = await client.post(
            "/v1/api/auth/token",
            data={"username": email, "password": "Wrong1!"}
        )
        assert res.status_code == 401

    # Successful login (should reset counter)
    res = await client.post(
        "/v1/api/auth/token",
        data={"username": email, "password": password}
    )
    assert res.status_code == 200, f"Login should succeed: {res.text}"

    # After success, counter is reset. We can make 5 more failures without lockout.
    for i in range(5):
        res = await client.post(
            "/v1/api/auth/token",
            data={"username": email, "password": "Wrong1!"}
        )
        assert res.status_code == 401, (
            f"Attempt {i + 1} after reset: Expected 401, got {res.status_code}"
        )

    # 6th failure should trigger rate limit
    res = await client.post(
        "/v1/api/auth/token",
        data={"username": email, "password": "Wrong1!"}
    )
    assert res.status_code == 429, (
        f"Expected 429 on 6th failure after reset, got {res.status_code}"
    )


# =============================================================================
# TEST 3: Password Complexity Enforcement
# =============================================================================

async def test_password_complexity_rejection(client: AsyncClient):
    """
    Verify that weak passwords are rejected during registration.

    The password validator requires:
    - At least 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    - At least one special character
    """
    base_payload = {
        "email": f"weakpw_{uuid.uuid4().hex[:6]}@test.com",
        "name": "Weak Password User"
    }

    # Test 1: Too short
    res = await client.post("/v1/api/auth/register", json={
        **base_payload,
        "password": "Ab1!"
    })
    assert res.status_code == 422, (
        f"Short password should be rejected. Got {res.status_code}"
    )

    # Test 2: No uppercase
    res = await client.post("/v1/api/auth/register", json={
        **base_payload,
        "email": f"noupper_{uuid.uuid4().hex[:6]}@test.com",
        "password": "securepass123!"
    })
    assert res.status_code == 422, (
        f"Password without uppercase should be rejected. Got {res.status_code}"
    )

    # Test 3: No lowercase
    res = await client.post("/v1/api/auth/register", json={
        **base_payload,
        "email": f"nolower_{uuid.uuid4().hex[:6]}@test.com",
        "password": "SECUREPASS123!"
    })
    assert res.status_code == 422, (
        f"Password without lowercase should be rejected. Got {res.status_code}"
    )

    # Test 4: No digit
    res = await client.post("/v1/api/auth/register", json={
        **base_payload,
        "email": f"nodigit_{uuid.uuid4().hex[:6]}@test.com",
        "password": "SecurePass!"
    })
    assert res.status_code == 422, (
        f"Password without digit should be rejected. Got {res.status_code}"
    )

    # Test 5: No special character
    res = await client.post("/v1/api/auth/register", json={
        **base_payload,
        "email": f"nospecial_{uuid.uuid4().hex[:6]}@test.com",
        "password": "SecurePass123"
    })
    assert res.status_code == 422, (
        f"Password without special char should be rejected. Got {res.status_code}"
    )

    # Test 6: Valid password succeeds
    res = await client.post("/v1/api/auth/register", json={
        **base_payload,
        "email": f"validpw_{uuid.uuid4().hex[:6]}@test.com",
        "password": "SecurePass123!"
    })
    assert res.status_code in [200, 201], (
        f"Valid password should be accepted. Got {res.status_code}"
    )


# =============================================================================
# TEST 4: AI Prompt Length Cap (422 for prompt > 2000 chars)
# =============================================================================

async def test_ai_prompt_length_rejection(client: AsyncClient, auth_headers):
    """
    Verify that prompts exceeding 2000 characters are rejected.

    The PromptRequest schema has max_length=2000 on the prompt field.
    FastAPI/Pydantic should return 422 for oversized payloads.
    """
    # Generate a prompt that exceeds 2000 characters
    oversized_prompt = "A" * 2001

    res = await client.post(
        "/v1/api/generate",
        json={"prompt": oversized_prompt, "max_tokens": 150},
        headers=auth_headers
    )

    assert res.status_code == 422, (
        f"Expected 422 for oversized prompt, got {res.status_code}. "
        f"Response: {res.text}"
    )

    # Verify the error mentions the length constraint
    response_data = res.json()
    errors = response_data.get("detail", [])
    if isinstance(errors, list):
        error_messages = str(errors)
    else:
        error_messages = str(errors)
    assert "max_length" in error_messages or "at most 2000" in error_messages or "String should have" in error_messages, (
        f"Error should mention max_length constraint. Got: {error_messages}"
    )


async def test_ai_prompt_empty_rejection(client: AsyncClient, auth_headers):
    """
    Verify that empty prompts are rejected.

    The PromptRequest schema has min_length=1 on the prompt field.
    """
    res = await client.post(
        "/v1/api/generate",
        json={"prompt": "", "max_tokens": 150},
        headers=auth_headers
    )

    assert res.status_code == 422, (
        f"Expected 422 for empty prompt, got {res.status_code}"
    )


async def test_ai_prompt_requires_authentication(client: AsyncClient):
    """
    Verify that the AI generate endpoint requires authentication.
    """
    res = await client.post(
        "/v1/api/generate",
        json={"prompt": "Hello", "max_tokens": 150}
    )

    assert res.status_code in [401, 403], (
        f"Expected 401/403 for unauthenticated AI request, got {res.status_code}"
    )


# =============================================================================
# TEST 5: Contact Cross-Tenant BOLA Prevention
# =============================================================================

async def test_contact_cross_tenant_bola_prevention(client: AsyncClient, auth_headers, test_user, db_session):
    """
    Verify that User A (Tenant 1) cannot read/update/delete User B's (Tenant 2) contacts.

    Steps:
    1. User A creates a contact
    2. Create User B in Tenant 2
    3. User B tries to GET User A's contact -> 404
    4. User B tries to UPDATE User A's contact -> 404
    5. User B tries to DELETE User A's contact -> 404
    """
    from app.models.auth import User

    # 1. User A creates a contact
    contact_payload = {
        "name": f"Tenant 1 Contact {uuid.uuid4().hex[:6]}",
        "email": f"t1_contact_{uuid.uuid4().hex[:6]}@test.com",
        "phone": f"+91{uuid.uuid4().int}"[:13]
    }
    create_res = await client.post(
        "/v1/api/contacts",
        json=contact_payload,
        headers=auth_headers
    )
    assert create_res.status_code == 201, f"Contact creation failed: {create_res.text}"
    contact_id = create_res.json()["id"]

    # 2. Create User B in Tenant 2
    user_b = User(
        email=f"bola_user_b_{uuid.uuid4().hex[:6]}@test.com",
        hashed_password=hash_password("SecurePass123!"),
        name="BOLA User B",
        tenant_id=2
    )
    db_session.add(user_b)
    db_session.commit()
    db_session.refresh(user_b)

    token_b = create_access_token(
        data={"sub": user_b.email},
        expires_delta=timedelta(minutes=30)
    )
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. User B tries to GET User A's contact
    get_res = await client.get(
        f"/v1/api/contacts/{contact_id}",
        headers=headers_b
    )
    assert get_res.status_code == 404, (
        f"SECURITY VIOLATION: User B read User A's contact. "
        f"Status: {get_res.status_code}"
    )

    # 4. User B tries to UPDATE User A's contact
    update_res = await client.put(
        f"/v1/api/contacts/{contact_id}",
        json={"name": "Hacked Name"},
        headers=headers_b
    )
    assert update_res.status_code == 404, (
        f"SECURITY VIOLATION: User B updated User A's contact. "
        f"Status: {update_res.status_code}"
    )

    # 5. User B tries to DELETE User A's contact
    delete_res = await client.delete(
        f"/v1/api/contacts/{contact_id}",
        headers=headers_b
    )
    assert delete_res.status_code == 404, (
        f"SECURITY VIOLATION: User B deleted User A's contact. "
        f"Status: {delete_res.status_code}"
    )

    # 6. User A can still access their own contact
    get_own = await client.get(
        f"/v1/api/contacts/{contact_id}",
        headers=auth_headers
    )
    assert get_own.status_code == 200, "User A should access their own contact"
    assert get_own.json()["name"] == contact_payload["name"]


# =============================================================================
# TEST 6: Contact List Tenant Isolation
# =============================================================================

async def test_contact_list_tenant_isolation(client: AsyncClient, auth_headers, test_user, db_session):
    """
    Verify that GET /contacts only returns contacts for the authenticated user's owner_id.

    User A's contacts must not appear in User B's contact list.
    """
    from app.models.auth import User
    from app.models.crm import Contact

    # 1. User A creates contacts via API
    for i in range(2):
        await client.post(
            "/v1/api/contacts",
            json={
                "name": f"User A Contact {i}",
                "email": f"ua_{i}_{uuid.uuid4().hex[:6]}@test.com"
            },
            headers=auth_headers
        )

    # 2. Create User B in Tenant 1 (same tenant, different owner)
    user_b = User(
        email=f"isol_user_b_{uuid.uuid4().hex[:6]}@test.com",
        hashed_password=hash_password("SecurePass123!"),
        name="Isolation User B",
        tenant_id=test_user.tenant_id  # Same tenant
    )
    db_session.add(user_b)
    db_session.commit()
    db_session.refresh(user_b)

    # Create a contact directly owned by User B
    contact_b = Contact(
        tenant_id=test_user.tenant_id,
        name="User B Contact",
        email=f"ub_{uuid.uuid4().hex[:6]}@test.com",
        owner_id=user_b.id
    )
    db_session.add(contact_b)
    db_session.commit()

    token_b = create_access_token(
        data={"sub": user_b.email},
        expires_delta=timedelta(minutes=30)
    )
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # 3. User A lists contacts
    res_a = await client.get("/v1/api/contacts", headers=auth_headers)
    assert res_a.status_code == 200
    contacts_a = res_a.json()

    # User A should only see contacts they own
    for contact in contacts_a:
        assert contact["owner_id"] == test_user.id, (
            f"User A sees contact not owned by them: owner_id={contact['owner_id']}"
        )

    # 4. User B lists contacts
    res_b = await client.get("/v1/api/contacts", headers=headers_b)
    assert res_b.status_code == 200
    contacts_b = res_b.json()

    # User B should only see contacts they own
    for contact in contacts_b:
        assert contact["owner_id"] == user_b.id, (
            f"User B sees contact not owned by them: owner_id={contact['owner_id']}"
        )


# =============================================================================
# TEST 7: Unauthenticated Access Protection
# =============================================================================

async def test_contacts_require_authentication(client: AsyncClient):
    """
    Verify that all contact endpoints require authentication.
    """
    # GET /contacts without auth
    res = await client.get("/v1/api/contacts")
    assert res.status_code in [401, 403], (
        f"Expected 401/403 for unauthenticated GET, got {res.status_code}"
    )

    # POST /contacts without auth
    res = await client.post(
        "/v1/api/contacts",
        json={"name": "Test", "email": "test@test.com"}
    )
    assert res.status_code in [401, 403], (
        f"Expected 401/403 for unauthenticated POST, got {res.status_code}"
    )

    # PUT /contacts/1 without auth
    res = await client.put(
        "/v1/api/contacts/1",
        json={"name": "Test"}
    )
    assert res.status_code in [401, 403], (
        f"Expected 401/403 for unauthenticated PUT, got {res.status_code}"
    )

    # DELETE /contacts/1 without auth
    res = await client.delete("/v1/api/contacts/1")
    assert res.status_code in [401, 403], (
        f"Expected 401/403 for unauthenticated DELETE, got {res.status_code}"
    )


# =============================================================================
# TEST 8: Deal List Tenant Isolation
# =============================================================================

async def test_deal_list_tenant_isolation(client: AsyncClient, auth_headers, test_user, db_session):
    """
    Verify that GET /deals/ only returns deals for the authenticated user's tenant.
    """
    from app.models.auth import User
    from app.models.crm import Lead, Deal

    # 1. Create a lead and convert to deal for User A
    lead_payload = {
        "name": f"Isolation Lead {uuid.uuid4().hex[:6]}",
        "email": f"iso_lead_{uuid.uuid4().hex[:6]}@test.com"
    }
    lead_res = await client.post(
        "/v1/api/leads/",
        json=lead_payload,
        headers=auth_headers
    )
    assert lead_res.status_code == 201
    lead_id = lead_res.json()["id"]

    convert_res = await client.post(
        f"/v1/api/leads/{lead_id}/convert",
        params={"value_cents": 15000},
        headers=auth_headers
    )
    assert convert_res.status_code == 200

    # 2. Create User B in Tenant 2 with a deal directly in the DB
    user_b = User(
        email=f"deal_iso_b_{uuid.uuid4().hex[:6]}@test.com",
        hashed_password=hash_password("SecurePass123!"),
        name="Deal Isolation User B",
        tenant_id=2
    )
    db_session.add(user_b)
    db_session.flush()

    lead_b = Lead(
        tenant_id=2,
        name="Tenant 2 Lead",
        email=f"t2_{uuid.uuid4().hex[:6]}@test.com",
        owner_id=user_b.id
    )
    db_session.add(lead_b)
    db_session.flush()

    deal_b = Deal(
        tenant_id=2,
        lead_id=lead_b.id,
        value_cents=30000,
        seller_id=user_b.id
    )
    db_session.add(deal_b)
    db_session.commit()

    # 3. User A lists deals - should only see Tenant 1 deals
    res_a = await client.get("/v1/api/deals/", headers=auth_headers)
    assert res_a.status_code == 200
    deals_a = res_a.json()

    for deal in deals_a:
        assert deal["tenant_id"] == test_user.tenant_id, (
            f"User A sees deal from wrong tenant: {deal['tenant_id']}"
        )

    # 4. User B lists deals - should only see Tenant 2 deals
    token_b = create_access_token(
        data={"sub": user_b.email},
        expires_delta=timedelta(minutes=30)
    )
    headers_b = {"Authorization": f"Bearer {token_b}"}

    res_b = await client.get("/v1/api/deals/", headers=headers_b)
    assert res_b.status_code == 200
    deals_b = res_b.json()

    for deal in deals_b:
        assert deal["tenant_id"] == 2, (
            f"User B sees deal from wrong tenant: {deal['tenant_id']}"
        )

    # 5. Verify no cross-contamination
    deal_ids_a = {d["id"] for d in deals_a}
    deal_ids_b = {d["id"] for d in deals_b}
    assert deal_ids_a.isdisjoint(deal_ids_b), (
        "Deal lists should not overlap between tenants"
    )
