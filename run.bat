@echo off
cd /d "%~dp0"
C:\Users\lcern\AppData\Local\Programs\Python\Python310\python.exe -m pip install Flask Flask-SQLAlchemy Flask-JWT-Extended Flask-CORS
C:\Users\lcern\AppData\Local\Programs\Python\Python310\python.exe app.py
pause
