# tests/unit/test_services.py
import pytest
from unittest.mock import MagicMock

from app.services.email_service import Emailer
from app.api.emailer import send_email_handler, EmailPayload
from app.services.bulk_service import BulkService
from app.integrations.whatsapp_client import whatsapp_client

# --- 1. Test the API Handler (Queuing Logic) ---
def test_email_handler_queues_job(mocker):
    """
    Test that the handler creates a DB record (EmailQueue) instead of sending immediately.
    """
    # 1. Mock the BulkService
    mock_service = mocker.MagicMock(spec=BulkService)
    mock_email_job = mocker.MagicMock()
    mock_email_job.id = 123
    mock_service.create_email_job.return_value = mock_email_job

    # 2. Mock Current User
    mock_user = mocker.MagicMock()
    mock_user.id = 1
    mock_user.tenant_id = 1

    # 3. Create Payload
    payload = EmailPayload(
        to_email="test@test.com", 
        subject="Welcome", 
        template_name="welcome.html", 
        context={"name": "Test"}
    )

    mock_task = mocker.patch("app.api.emailer.send_email_task")

    # 4. Call Handler
    result = send_email_handler(
        data=payload, 
        service=mock_service, 
        current_user=mock_user
    )

    # 5. Assertions
    assert result["status"] == "queued"
    assert result["job_id"] == 123
    
    mock_service.create_email_job.assert_called_once()
    
    # Verify task dispatch
    mock_task.delay.assert_called_once_with(123)
    
    # Verify what was passed to the service
    call_kwargs = mock_service.create_email_job.call_args
    assert call_kwargs.kwargs['to_email'] == "test@test.com"
    assert call_kwargs.kwargs['template_name'] == "welcome.html"


# --- 2. Test the Emailer Class (Worker Logic) ---
def test_emailer_sends_via_resend(mocker):
    """
    Test the Emailer class separately. 
    This mocks Resend and Jinja2 to ensure the .send_mail() method works.
    """
    
    # 1. Mock external dependencies to prevent file/network errors
    mocker.patch("app.services.email_service.FileSystemLoader") 
    mocker.patch("app.services.email_service.settings.RESEND_API_KEY", "fake_key")
    
    # 2. Mock Resend Client
    mock_resend_send = mocker.patch("app.services.email_service.resend.Emails.send", return_value={"id": "test_id"})
    
    # 3. Mock Jinja2 Environment
    # We want to mock the .get_template().render() chain
    mock_env_cls = mocker.patch("app.services.email_service.Environment")
    mock_env_instance = mock_env_cls.return_value
    
    mock_template = mocker.Mock()
    mock_template.render.return_value = "<html>Hello World</html>"
    mock_env_instance.get_template.return_value = mock_template

    # 4. Instantiate Emailer
    emailer = Emailer()
    
    # 5. Call send_mail
    emailer.send_mail(
        to_email="customer@example.com",
        subject="Hello",
        template_name="test.html"
    )

    # 6. Assertions
    # Verify template was rendered
    mock_template.render.assert_called_once()
    # Verify Resend's .send() was called
    mock_resend_send.assert_called_once()


# --- 3. WhatsApp Tests ---
def test_whatsapp_send_success(mocker):
    """
    Test the WhatsApp client wrapper.
    """
    mock_resp = mocker.Mock()
    mock_resp.json.return_value = {"messages": [{"id": "wamid.123"}]}
    mock_resp.status_code = 200
    mock_resp.raise_for_status.return_value = None
    
    mocker.patch("app.integrations.whatsapp_client.requests.post", return_value=mock_resp)    
    result = whatsapp_client.send_template_sync("9199999999", "hello_world_template")
    
    # 4. Verify response
    assert result["messages"][0]["id"] == "wamid.123"