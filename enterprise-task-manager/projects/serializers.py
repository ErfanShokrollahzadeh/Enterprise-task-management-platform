from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Project, Workspace


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ["id", "name", "description", "owner", "created_at"]
        read_only_fields = ["id", "created_at"]


class ProjectSerializer(serializers.ModelSerializer):
    members = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=get_user_model().objects.none(),
        required=False,
    )

    class Meta:
        model = Project
        fields = ["id", "workspace", "name",
                  "description", "members", "created_at"]
        read_only_fields = ["id", "created_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["members"].queryset = get_user_model().objects.all()
