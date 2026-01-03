@echo off
echo ========================================
echo   Fluid Calendar - Development Server
echo   Using Bun Runtime
echo ========================================
echo.

REM Load all environment files from keys/ directory
bun --env-file=keys/.env --env-file=keys/database.env --env-file=keys/google-oauth.env --env-file=keys/fitbit-oauth.env --env-file=keys/.env.local run dev
