import pytest
from apps.users.bank_verification import (
    get_supported_banks,
    resolve_bank_account,
    match_account_name
)

def test_get_supported_banks():
    banks = get_supported_banks("MOCK")
    assert isinstance(banks, list)
    assert len(banks) > 0
    # GCB Bank should be present in standard directory
    gcb = next((b for b in banks if "040100" in b["code"]), None)
    assert gcb is not None
    assert "GCB" in gcb["name"]

def test_resolve_mock_bank_account():
    success, name, _data = resolve_bank_account("040100", "1441000123456", "MOCK")
    assert success is True
    assert "KWAME" in name

    success_fail, msg_fail, _data_fail = resolve_bank_account("040100", "1441000000000", "MOCK")
    assert success_fail is False

class DummyUser:
    def __init__(self, first_name, last_name, shop_name, username):
        self.first_name = first_name
        self.last_name = last_name
        self.shop_name = shop_name
        self.username = username

def test_match_account_name():
    user = DummyUser("Kwame", "Nkrumah", "Accra Tech Hub", "kwame123")
    
    # Exact match
    matched, score = match_account_name("KWAME NKRUMAH", user)
    assert matched is True
    assert score > 0.5

    # Shop name match
    matched_shop, score_shop = match_account_name("ACCRA TECH HUB ENTERPRISES", user)
    assert matched_shop is True

    # Unrelated name match
    matched_unrelated, _ = match_account_name("JOHN DOE STORES", user)
    assert matched_unrelated is False
