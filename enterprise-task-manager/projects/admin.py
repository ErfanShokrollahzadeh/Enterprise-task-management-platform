from django.contrib import admin

from .models import Project, Workspace, Team


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ("name", "owner", "created_at")
    search_fields = ("name", "owner__email")


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ("name", "workspace", "created_at")
    search_fields = ("name", "workspace__name")


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ("name", "workspace", "team", "created_at")
    search_fields = ("name", "workspace__name", "team__name")
