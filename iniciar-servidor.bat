@echo off
title Top10 Cargas - Servidor Central
color 0A
echo ================================================================
echo           TOP10 CARGAS - INICIALIZANDO SERVIDOR PROPRIO
echo ================================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERRO] O Node.js nao foi encontrado no seu computador!
    echo Para rodar o servidor proprio, baixe e instale o Node.js em:
    echo https://nodejs.org/ (versao LTS recomendada)
    echo.
    pause
    exit /b
)

cd server
if not exist node_modules (
    echo Instalando dependencias do servidor pela primeira vez...
    call npm install
)

echo.
echo Iniciando o servidor central...
node server.js

pause
