#!/bin/bash

source /home/site/wwwroot/venv/bin/activate

echo "Starting Celery worker..."
celery -A greaby_project worker -l info --pool=threads
