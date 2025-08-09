@echo off
echo 正在启动本地服务器...
echo.
echo 如果看到错误信息，请直接双击 index.html 文件打开应用
echo.
echo 按 Ctrl+C 停止服务器
echo.
python -m http.server 8000
pause
