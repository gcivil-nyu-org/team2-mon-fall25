# events/utils/email.py
# (No changes needed, but included for completeness)

import boto3
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags
import logging
# from django.core.exceptions import ImproperlyConfigured # Removed unnecessary import

logger = logging.getLogger(__name__)

# --- CONFIGURATION (UPDATE THESE) ---
# Replace with your SES region
AWS_REGION = getattr(settings, "AWS_SES_REGION_NAME", "us-east-1")
# Replace with a verified sender email address in your SES account
SENDER_EMAIL = getattr(settings, "SES_SENDER_EMAIL", "aa12037@nyu.edu")


def send_event_invitation_email(event, recipient_emails):
    """
    Sends an invitation email for a single event to a list of email addresses via AWS SES.

    Args:
        event (Event Model Instance): The Django Event model instance.
        recipient_emails (list): A list of email address strings (attendees).
    """
    if not recipient_emails:
        logger.warning(f"No recipient emails provided for event {event.title}")
        return

    try:
        # Initialize the SES client
        client = boto3.client("ses", region_name=AWS_REGION)
    except Exception as e:
        logger.error(f"Failed to initialize AWS SES client: {e}")
        return

    # 1. Prepare Email Content
    subject = f"You're Invited: {event.title}"
    
    # This context still contains all necessary fields for the simple template:
    context = {
        "event": event,
        "creator_name": event.created_by.full_name 
                        or event.created_by.username,
        "start_time": event.start_time.strftime("%A, %B %d, %Y at %I:%M %p %Z"),
        "end_time": event.end_time.strftime("%A, %B %d, %Y at %I:%M %p %Z"),
    }

    try:
        # Load the HTML template. (Ensure you check the path: "email_templates/invite.html")
        html_message = render_to_string(
            "email_templates/invite.html", context
        )
        plain_message = strip_tags(html_message)
    except Exception as e:
        logger.error(f"Error rendering email template for event {event.title}: {e}")
        return


    # 2. Send Email using SES
    try:
        response = client.send_email(
            Source=SENDER_EMAIL,
            Destination={"ToAddresses": recipient_emails}, 
            Message={
                "Subject": {"Data": subject},
                "Body": {"Text": {"Data": plain_message}, "Html": {"Data": html_message}},
            },
        )
        logger.info(
            f"Successfully sent invitation emails for event '{event.title}' to {len(recipient_emails)} recipients. SES MessageId: {response['MessageId']}"
        )
    except Exception as e:
        logger.error(
            f"Failed to send SES invitation email for event '{event.title}': {e}"
        )