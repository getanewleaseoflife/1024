@echo off
title AI Interview - Stop
echo Stopping services ...
taskkill /f /fi "WINDOWTITLE eq AI-Interview-*" 2>nul
taskkill /f /im node.exe 2>nul
echo Stopped.
pause
