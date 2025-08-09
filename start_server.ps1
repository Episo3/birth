Write-Host "正在启动本地服务器..." -ForegroundColor Green
Write-Host ""
Write-Host "如果看到错误信息，请直接双击 index.html 文件打开应用" -ForegroundColor Yellow
Write-Host ""
Write-Host "按 Ctrl+C 停止服务器" -ForegroundColor Cyan
Write-Host ""

try {
    # 尝试使用Python启动服务器
    python -m http.server 8000
} catch {
    Write-Host "Python未安装或不在PATH中" -ForegroundColor Red
    Write-Host "请直接双击 index.html 文件打开应用" -ForegroundColor Yellow
    Read-Host "按回车键退出"
}
