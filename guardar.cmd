@echo off
cd /d "%~dp0"
node node_modules\firebase-tools\lib\bin\firebase.js emulators:export data/snapshot --force --project demo-byepass --config firebase.json
pause
