from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from rest_framework import viewsets

from .models import Board, Task
from .serializers import BoardSerializer, TaskSerializer


class BoardViewSet(viewsets.ModelViewSet):
    queryset = Board.objects.select_related("project").all()
    serializer_class = BoardSerializer


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.select_related(
        "project", "board", "assigned_to").all()
    serializer_class = TaskSerializer

    def perform_update(self, serializer):
        task = serializer.save()
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"project_{task.project_id}",
            {
                "type": "task.updated",
                "task": TaskSerializer(task).data,
            },
        )
