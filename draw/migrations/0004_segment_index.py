# Generated by Django 2.2.6 on 2019-12-10 07:54

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('draw', '0003_auto_20191209_1942'),
    ]

    operations = [
        migrations.AddField(
            model_name='segment',
            name='index',
            field=models.IntegerField(default=0),
        ),
    ]
