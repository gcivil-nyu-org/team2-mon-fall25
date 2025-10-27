import uuid
import json

from django.test import TestCase
from .models import Profile
from django.utils import timezone
from django.contrib.auth import get_user_model
from django.urls import reverse
import unittest
from django.test import override_settings


# Create your tests here.
def createProfile(user_id, full_name, avatar_url, bio, created_at):
    p_uuid = uuid.uuid4()
    profile = Profile.objects.create(
        profile_id=p_uuid,
        user_id=user_id,
        full_name=full_name,
        avatar_url=avatar_url,
        bio=bio,
        created_at=created_at,
    )
    return profile


@override_settings(SECURE_SSL_REDIRECT=False)
class ProfileModelTests(TestCase):
    def test_profile_display(self):
        """
        Test creating a user profile and verifying its __str__ output equals full_name.
        """
        User = get_user_model()
        user = User.objects.create()
        profile = createProfile(user, "Bob", "example.com", "Student", timezone.now())
        self.assertIs(str(profile), profile.full_name)

    def test_create_profile_with_future_date(self):
        """
        Verify that creating a profile with a future created_at timestamp is rejected with an error response.
        """
        # TODO:

    def test_create_profile_with_unvalid_avatar_url(self):
        """
        Verify that attempting to create a profile with an invalid avatar URL results in an error response.
        """
        # TODO:


@override_settings(SECURE_SSL_REDIRECT=False)
class ProfileGETTests(TestCase):
    def test_get_with_profile_id_uuid(self):
        User = get_user_model()
        user1 = User.objects.create()
        profile1 = createProfile(user1, "Bob", "example.com", "Student", timezone.now())

        url = reverse("profiles:profile-detail", args=(profile1.profile_id,))

        response = self.client.get(url, follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertContains(response, profile1.full_name)

    def test_get_without_profile_id(self):
        """
        Verify that a GET request without specifying profile_id returns all existing user profiles.
        """
        User = get_user_model()
        user1 = User.objects.create(username="Bob")
        profile1 = createProfile(user1, "Bob", "example.com", "Student", timezone.now())
        user2 = User.objects.create(username="Jessie")
        profile2 = createProfile(
            user2, "Jessie", "example.com", "Student", timezone.now()
        )

        url = reverse("profiles:profile-list")

        response = self.client.get(url, follow=True)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()[0]["full_name"], "Bob")
        self.assertEqual(response.json()[1]["full_name"], "Jessie")


@override_settings(SECURE_SSL_REDIRECT=False)
class ProfilePOSTTests(TestCase):
    def test_post_with_valid_parameters(self):
        """
        Verify that posting all required profile fields (excluding profile_id) successfully creates a profile
        and returns the generated profile_id in the response.
        """
        User = get_user_model()
        user1 = User.objects.create(username="Bob")

        url = reverse("profiles:profile-list")
        print(url)
        payload = json.dumps(
            {
                "user_id": user1.id,
                "full_name": "Bob",
                "avatar_url": "example.com",
                "bio": "Student",
                "created_at": timezone.now().isoformat(),
            }
        )
        with self.settings(APPEND_SLASH=False):
            response = self.client.post(
                url, data=payload, content_type="application/json", follow=True
            )

        self.assertEqual(response.status_code, 201)
        self.assertIn("profile_id", response.json())
