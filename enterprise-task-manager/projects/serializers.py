from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Project, Workspace, Team


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = ["id", "name", "description", "owner", "created_at"]
        read_only_fields = ["id", "created_at"]


class TeamSerializer(serializers.ModelSerializer):
    members = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=get_user_model().objects.none(),
        required=False,
    )

    class Meta:
        model = Team
        fields = ["id", "workspace", "name", "description", "members", "created_at"]
        read_only_fields = ["id", "created_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["members"].queryset = get_user_model().objects.all()


class ProjectSerializer(serializers.ModelSerializer):
    members = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=get_user_model().objects.none(),
        required=False,
    )
    team = serializers.PrimaryKeyRelatedField(
        queryset=Team.objects.none(),
        required=False,
        allow_null=True,
    )
    team_name = serializers.CharField(source="team.name", read_only=True)

    class Meta:
        model = Project
        fields = [
            "id",
            "workspace",
            "name",
            "description",
            "members",
            "team",
            "team_name",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["members"].queryset = get_user_model().objects.all()
        self.fields["team"].queryset = Team.objects.all()
