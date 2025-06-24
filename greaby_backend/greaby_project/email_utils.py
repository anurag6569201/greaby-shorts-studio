from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings

def send_template_email(subject, template_name, context, recipient_list):
    """
    Sends an email using an HTML template.
    Fails silently in the background if there's an issue.
    """
    try:
        html_message = render_to_string(template_name, context)
        send_mail(
            subject=subject,
            message='',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=recipient_list,
            html_message=html_message,
            fail_silently=False,
        )
        print(f"Successfully sent email '{subject}' to {recipient_list}")
    except Exception as e:
        # In production, you would want to log this error more robustly
        print(f"ERROR: Failed to send email '{subject}' to {recipient_list}. Reason: {e}")