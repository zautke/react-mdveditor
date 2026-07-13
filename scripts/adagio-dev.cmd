@echo off
setlocal
cd /d "%~dp0.."
for /f "tokens=1,* delims==" %%A in (.env) do if "%%A"=="MDE_PNPM_COMMAND" set "MDE_PNPM_COMMAND=%%B"
if not defined MDE_PNPM_COMMAND exit /b 1
call "%MDE_PNPM_COMMAND%" dev
