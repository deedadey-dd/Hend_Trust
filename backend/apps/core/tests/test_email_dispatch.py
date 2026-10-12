import pytest
from unittest.mock import patch
from apps.core.tasks import dispatch_email_task, _build_default_html_email

@pytest.mark.django_db
def test_dispatch_email_task_normal():
    with patch("apps.core.tasks.send_mail") as mock_send_mail:
        result = dispatch_email_task("buyer@example.com", "Test Subject", "Test Message https://trust.hendaxis.com")
        assert result is True
        mock_send_mail.assert_called_once()
        kwargs = mock_send_mail.call_args.kwargs
        assert kwargs["subject"] == "Test Subject"
        assert kwargs["message"] == "Test Message https://trust.hendaxis.com"
        assert kwargs["recipient_list"] == ["buyer@example.com"]

@pytest.mark.django_db
def test_dispatch_email_task_swapped_args_with_list():
    """
    Ensures that if caller mistakenly passes (subject, message, [email]),
    dispatch_email_task normalizes the arguments and does not crash with TypeError.
    """
    with patch("apps.core.tasks.send_mail") as mock_send_mail:
        result = dispatch_email_task(
            "HendAxis Trust — Arbiter Instruction on Your Order",
            "The arbiter posted an instruction: https://trust.hendaxis.com/tracking",
            ["deedadey+akosuamanu@gmail.com"]
        )
        assert result is True
        mock_send_mail.assert_called_once()
        kwargs = mock_send_mail.call_args.kwargs
        assert kwargs["subject"] == "HendAxis Trust — Arbiter Instruction on Your Order"
        assert kwargs["recipient_list"] == ["deedadey+akosuamanu@gmail.com"]
        assert "The arbiter posted an instruction" in kwargs["message"]

@pytest.mark.django_db
def test_dispatch_email_task_email_as_list():
    with patch("apps.core.tasks.send_mail") as mock_send_mail:
        result = dispatch_email_task(
            ["deedadey@gmail.com"],
            "Subject Test",
            "Hello World"
        )
        assert result is True
        mock_send_mail.assert_called_once()
        kwargs = mock_send_mail.call_args.kwargs
        assert kwargs["recipient_list"] == ["deedadey@gmail.com"]

def test_build_default_html_email_non_string_safety():
    # Should not raise TypeError even if non-string passed
    html = _build_default_html_email("Subject", ["email@example.com"])
    assert "email@example.com" in html
