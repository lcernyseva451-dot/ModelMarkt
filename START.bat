@echo off
echo ========================================
echo Starting ModelMarkt 3D Model Viewer
echo ========================================
echo.

cd /d "D:\xamp\moscow map"

echo Checking Python...
C:\Users\lcern\AppData\Local\Programs\Python\Python310\python.exe --version
echo.

echo Installing dependencies...
C:\Users\lcern\AppData\Local\Programs\Python\Python310\python.exe -m pip install Flask Flask-SQLAlchemy Flask-JWT-Extended Flask-CORS -q
echo.

echo Starting server on http://localhost:5000
echo.
echo Press Ctrl+C to stop
echo.

C:\Users\lcern\AppData\Local\Programs\Python\Python310\python.exe app.py

pause
