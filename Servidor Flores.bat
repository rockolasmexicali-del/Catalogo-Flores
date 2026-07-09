@echo off
setlocal
:: Ruta del proyecto
set PROJECT_DIR=C:\Users\Brincolinas\Documents\Futuros proyectos APPS\Catalogo Flores
:: Titulo de la ventana para poder identificarla y cerrarla
set WINDOW_TITLE=Servidor Catalogo Flores

:menu
cls
echo ==================================================
echo         CONTROL DE APP: CATALOGO FLORES
echo ==================================================
echo.
echo  1. Activar Servidor   (Iniciar App)
echo  2. Desactivar Servidor (Detener App)
echo  3. Salir
echo.
echo ==================================================
set /p choice="Seleccione una opcion (1-3): "

if "%choice%"=="1" goto start_app
if "%choice%"=="2" goto stop_app
if "%choice%"=="3" exit
goto menu

:start_app
echo.
echo Buscando procesos anteriores...
taskkill /FI "WINDOWTITLE eq %WINDOW_TITLE%*" /F /T >nul 2>&1

echo Iniciando el servidor en una nueva ventana...
cd /d "%PROJECT_DIR%"
:: Iniciamos en una nueva ventana con un titulo especifico
start "%WINDOW_TITLE%" cmd /c "npm run dev"

echo.
echo Esperando a que el servidor este listo...
timeout /t 5 /nobreak >nul
echo Abriendo la aplicacion en su navegador...
start http://localhost:5173

echo.
echo ¡App activada con exito!
pause
goto menu

:stop_app
echo.
echo Deteniendo el servidor y cerrando procesos...
:: Buscamos la ventana por su titulo y cerramos el arbol de procesos (/T)
taskkill /FI "WINDOWTITLE eq %WINDOW_TITLE%*" /F /T >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo El servidor ha sido desactivado correctamente.
) else (
    echo.
    echo No se encontro ningun servidor activo para detener.
)
echo.
pause
goto menu
