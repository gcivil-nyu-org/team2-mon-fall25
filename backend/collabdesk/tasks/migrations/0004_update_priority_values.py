# Generated migration file
# Place this in your tasks/migrations/ directory
# Name it something like: 0003_update_priority_values.py

from django.db import migrations


def swap_priority_values(apps, schema_editor):
    """
    Swap priority values to match frontend expectations:
    OLD: 1=Low, 2=Medium, 3=High
    NEW: 1=High, 2=Medium, 3=Low
    """
    Task = apps.get_model("tasks", "Task")

    # Use a temporary value (99) to avoid conflicts during swap
    # Step 1: High (3) -> Temp (99)
    Task.objects.filter(priority=3).update(priority=99)

    # Step 2: Low (1) -> High (3)
    Task.objects.filter(priority=1).update(priority=3)

    # Step 3: Temp (99) -> Low (1)
    Task.objects.filter(priority=99).update(priority=1)

    # Medium (2) stays as Medium (2)


def reverse_swap_priority_values(apps, schema_editor):
    """
    Reverse the swap if needed
    """
    Task = apps.get_model("tasks", "Task")

    # Reverse: swap back
    Task.objects.filter(priority=1).update(priority=99)
    Task.objects.filter(priority=3).update(priority=1)
    Task.objects.filter(priority=99).update(priority=3)


class Migration(migrations.Migration):

    dependencies = [
        ("tasks", "0003_task_dependencies"),  # Update this to your last migration
    ]

    operations = [
        migrations.RunPython(swap_priority_values, reverse_swap_priority_values),
    ]
