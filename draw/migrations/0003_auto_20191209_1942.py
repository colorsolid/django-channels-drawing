# Generated by Django 2.2.6 on 2019-12-10 03:42

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('draw', '0002_auto_20191208_1122'),
    ]

    operations = [
        migrations.AddField(
            model_name='drawing',
            name='end_id',
            field=models.IntegerField(default=0),
        ),
        migrations.AddField(
            model_name='drawing',
            name='start_id',
            field=models.IntegerField(default=0),
        ),
    ]
