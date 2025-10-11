from django.db import models

# Create your models here.
class Event(models.Model):
    event_title = models.CharField(max_length=100)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()

    def __str__(self):
        return self.event_title

class Unavailability(models.Model):
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
