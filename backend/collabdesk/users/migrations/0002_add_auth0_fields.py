# Generated migration for Auth0 user synchronization
import uuid
from django.db import migrations, models


def generate_unique_user_ids(apps, schema_editor):
    """Generate unique UUIDs for existing users"""
    User = apps.get_model('users', 'User')
    for user in User.objects.all():
        user.user_id = uuid.uuid4()
        user.save(update_fields=['user_id'])


def fix_empty_emails(apps, schema_editor):
    """Fix users with empty emails to make them unique"""
    User = apps.get_model('users', 'User')
    counter = 0
    for user in User.objects.filter(email=''):
        user.email = f'user_{user.id}@placeholder.com'
        user.save(update_fields=['email'])
        counter += 1
    if counter > 0:
        print(f"Fixed {counter} users with empty emails")


class Migration(migrations.Migration):

    dependencies = [
        ("users", "0001_initial"),
    ]

    operations = [
        # Add user_id field without unique constraint first
        migrations.AddField(
            model_name="user",
            name="user_id",
            field=models.UUIDField(default=uuid.uuid4, editable=False, null=True),
        ),
        # Populate unique UUIDs for existing users
        migrations.RunPython(generate_unique_user_ids, migrations.RunPython.noop),
        # Now make it non-nullable and unique
        migrations.AlterField(
            model_name="user",
            name="user_id",
            field=models.UUIDField(default=uuid.uuid4, editable=False, unique=True),
        ),
        # Add Auth0 fields
        migrations.AddField(
            model_name="user",
            name="auth0_sub",
            field=models.CharField(
                blank=True, db_index=True, max_length=255, null=True, unique=True
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="full_name",
            field=models.CharField(blank=True, max_length=255),
        ),
        migrations.AddField(
            model_name="user",
            name="profile_picture",
            field=models.URLField(blank=True, null=True),
        ),
        # Fix empty emails before adding unique constraint
        migrations.RunPython(fix_empty_emails, migrations.RunPython.noop),
        # Make email unique
        migrations.AlterField(
            model_name="user",
            name="email",
            field=models.EmailField(max_length=254, unique=True),
        ),
        # Add indexes
        migrations.AddIndex(
            model_name="user",
            index=models.Index(
                fields=["auth0_sub"], name="users_user_auth0_s_1f80ad_idx"
            ),
        ),
        migrations.AddIndex(
            model_name="user",
            index=models.Index(fields=["email"], name="users_user_email_6f2530_idx"),
        ),
        # Update Meta options
        migrations.AlterModelOptions(
            name="user",
            options={},
        ),
    ]

