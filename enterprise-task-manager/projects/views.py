from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticatedOrReadOnly

from .models import Project, Workspace
from .serializers import ProjectSerializer, WorkspaceSerializer


class WorkspaceViewSet(viewsets.ModelViewSet):
    queryset = Workspace.objects.select_related("owner").all()
    serializer_class = WorkspaceSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]


class ProjectViewSet(viewsets.ModelViewSet):
    queryset = Project.objects.select_related(
        "workspace").prefetch_related("members")
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
