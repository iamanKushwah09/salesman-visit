@echo off
title Field Salesman - Mobile Phone HTTPS Tunnel
echo ==============================================================
echo Starting Secure HTTPS Tunnel for Mobile Phone (4G / 5G / Wi-Fi)
echo ==============================================================
echo.
echo [1] Mobile Phone URL: https://sales-field-pulse.loca.lt
echo [2] First-Time Password: 157.49.183.39
echo.
:loop
echo [%date% %time%] Connecting tunnel on port 5173...
npx localtunnel --port 5173 --subdomain sales-field-pulse
echo [%date% %time%] Tunnel disconnected. Reconnecting in 2 seconds...
timeout /t 2 /nobreak >nul
goto loop
