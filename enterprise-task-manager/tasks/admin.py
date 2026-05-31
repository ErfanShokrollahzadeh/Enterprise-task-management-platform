from django.contrib import admin

from .models import Board, Task


@admin.register(Board)
class BoardAdmin(admin.ModelAdmin):
    list_display = ("name", "project", "order", "created_at")
    list_filter = ("project",)
    search_fields = ("name", "project__name")


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ("title", "project", "board",
                    "priority", "assigned_to", "deadline")
    list_filter = ("project", "board", "priority")
    search_fields = ("title", "project__name",
                     "board__name", "assigned_to__email")
