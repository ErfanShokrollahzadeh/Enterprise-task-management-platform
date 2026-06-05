from django.conf import settings
from django.db import models


class Workspace(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_workspaces",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Team(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="teams",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="teams",
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Project(models.Model):
    workspace = models.ForeignKey(
        Workspace,
        on_delete=models.CASCADE,
        related_name="projects",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="projects",
        blank=True,
    )
    team = models.ForeignKey(
        Team,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="projects",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
