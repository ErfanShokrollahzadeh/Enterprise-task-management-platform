from django.urls import path

from .consumers import TaskConsumer

websocket_urlpatterns = [
    path("ws/projects/<int:project_id>/", TaskConsumer.as_asgi()),
]
