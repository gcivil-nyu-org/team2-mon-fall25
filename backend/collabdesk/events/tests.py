from django.test import TestCase

class BasicTestCase(TestCase):
    """A simple sanity check to verify test setup."""
    
    def test_addition(self):
        print("Running basic test case for Events...")
        self.assertEqual(1 + 1, 2)

