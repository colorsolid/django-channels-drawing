import os
import django
from channels.routing import get_default_application
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'foli.settings')
django.setup()
application = get_default_application()
