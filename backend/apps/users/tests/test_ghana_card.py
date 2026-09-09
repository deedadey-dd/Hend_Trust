import pytest
from apps.users.ghana_card import (
    validate_ghana_card_format,
    normalize_ghana_card_number,
    verify_ghana_card
)

def test_ghana_card_format_validation():
    assert validate_ghana_card_format("GHA-123456789-0") is True
    assert validate_ghana_card_format("gha-987654321-5") is True
    assert validate_ghana_card_format("GHA1234567890") is True
    
    assert validate_ghana_card_format("INVALID-123") is False
    assert validate_ghana_card_format("123456789") is False

def test_ghana_card_normalization():
    assert normalize_ghana_card_number("gha-123456789-0") == "GHA-123456789-0"
    assert normalize_ghana_card_number("1234567890") == "GHA-123456789-0"

def test_ghana_card_mock_verification(settings):
    settings.ENABLE_GHANA_CARD_AUTO_VERIFY = True
    settings.GHANA_CARD_VERIFY_PROVIDER = 'MOCK'
    
    is_valid, msg, _data = verify_ghana_card("GHA-123456789-0")
    assert is_valid is True
    assert "verified" in msg.lower()

    is_valid_fail, _msg_fail, _data_fail = verify_ghana_card("GHA-999999999-9")
    assert is_valid_fail is False
