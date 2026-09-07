@echo off
:: ══════════════════════════════════════════════════════
:: instalar.bat — GestiónComercial v1.0
:: Instalador automático para XAMPP en Windows
:: Ejecutar como Administrador
:: ══════════════════════════════════════════════════════
title Instalando GestionComercial...
color 0B

echo.
echo  ============================================
echo   GESTION COMERCIAL v1.0 - Instalador
echo   Pescado / Queso / Carne Serrana
echo  ============================================
echo.

:: ── Verificar XAMPP ──────────────────────────────────
set XAMPP_PATH=C:\xampp
set HTDOCS=%XAMPP_PATH%\htdocs
set MYSQL=%XAMPP_PATH%\mysql\bin\mysql.exe

if not exist "%XAMPP_PATH%" (
    echo [ERROR] No se encontro XAMPP en %XAMPP_PATH%
    echo        Instala XAMPP primero: https://www.apachefriends.org
    pause & exit /b 1
)

echo [OK] XAMPP encontrado en %XAMPP_PATH%

:: ── Copiar proyecto ───────────────────────────────────
echo.
echo [1/4] Copiando archivos del proyecto...
set DEST=%HTDOCS%\pescaderia
if exist "%DEST%" (
    echo       Carpeta existente — actualizando archivos...
    xcopy /E /Y /I "." "%DEST%" >nul 2>&1
) else (
    xcopy /E /Y /I "." "%DEST%" >nul 2>&1
)
echo [OK] Archivos copiados a %DEST%

:: ── Verificar que MySQL esté corriendo ───────────────
echo.
echo [2/4] Verificando que MySQL este activo...
"%MYSQL%" -u root -e "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo [AVISO] MySQL no responde. Inicia XAMPP y activa Apache + MySQL.
    echo         Luego importa manualmente:
    echo         %DEST%\db\schema.sql
    echo.
    echo         Puedes importar desde phpMyAdmin:
    echo         http://localhost/phpmyadmin
    echo.
    goto :abrir
)

:: ── Importar base de datos ───────────────────────────
echo.
echo [3/4] Creando base de datos...
"%MYSQL%" -u root < "%DEST%\db\schema.sql"
if errorlevel 1 (
    echo [ERROR] No se pudo importar la base de datos.
    echo         Importa manualmente desde: http://localhost/phpmyadmin
) else (
    echo [OK] Base de datos "gestion_comercial" creada exitosamente
)

:: ── Generar iconos PWA ────────────────────────────────
echo.
echo [4/4] Generando iconos para la app...
"%XAMPP_PATH%\php\php.exe" "%DEST%\generate_icons.php"

:abrir
echo.
echo  ============================================
echo   INSTALACION COMPLETADA
echo  ============================================
echo.
echo   Accede a la aplicacion en:
echo   http://localhost/pescaderia
echo.
echo   Para instalarla en el escritorio:
echo   Abre el enlace en Chrome/Edge y haz clic
echo   en el boton "Instalar app" que aparece
echo   en la barra del navegador.
echo.
echo   IMPORTANTE: XAMPP debe estar activo
echo   (Apache + MySQL) para que funcione.
echo  ============================================
echo.

:: Abrir navegador automáticamente
start "" "http://localhost/pescaderia"

pause
