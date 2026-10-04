"""Gunicorn configuration for production"""
import os

# Адрес и порт (Render использует PORT env var)
bind = f"0.0.0.0:{os.environ.get('PORT', '5000')}"

# Workers (для бесплатного тира Render — 1 воркер)
workers = int(os.environ.get('WEB_CONCURRENCY', 1))
worker_class = 'sync'
worker_connections = 1000

# Timeout (Render требует больше времени)
timeout = 120
graceful_timeout = 60

# Logging
accesslog = '-'
errorlog = '-'
loglevel = 'info'

# Process naming
proc_name = 'modelmarkt'

# Server hooks
def on_starting(server):
    server.log.info("ModelMarkt starting in production mode")

def post_fork(server, worker):
    server.log.info(f"Worker spawned (pid: {worker.pid})")

def pre_exec(server):
    server.log.info("Forked child, re-executing")

def when_ready(server):
    server.log.info("Server is ready. Spawning workers")
