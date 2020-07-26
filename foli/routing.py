from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
import draw.routing
import labs.routing

application = ProtocolTypeRouter({
    # (http->django views is added by default)
    'websocket': AuthMiddlewareStack(
        URLRouter(
            draw.routing.websocket_urlpatterns +
            labs.routing.websocket_urlpatterns
        )
    ),
})
