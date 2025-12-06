# 文件共享工具 - PowerShell安装脚本
Write-Host "文件共享工具 - 环境安装" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Gray

# 检查Node.js
Write-Host "检查Node.js..." -ForegroundColor Yellow
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "错误：未安装Node.js！" -ForegroundColor Red
    Write-Host "请访问 https://nodejs.org/ 下载安装" -ForegroundColor Yellow
    Read-Host "按回车键退出"
    exit
}

Write-Host "Node.js版本: $(node --version)" -ForegroundColor Green

# 检查npm
if (!(Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "警告：未找到npm，Node.js安装可能不完整" -ForegroundColor Yellow
    Write-Host "请重新安装Node.js" -ForegroundColor Yellow
    Read-Host "按回车键退出"
    exit
}

Write-Host "npm版本: $(npm --version)" -ForegroundColor Green

# 安装依赖
Write-Host "`n正在安装依赖包..." -ForegroundColor Yellow
Write-Host "这可能需要几分钟，请耐心等待..." -ForegroundColor Gray

# 设置镜像源
npm config set registry https://registry.npmmirror.com
npm config set electron_mirror https://npmmirror.com/mirrors/electron/

# 安装Electron
Write-Host "安装Electron..." -ForegroundColor Cyan
npm install electron --save-dev

if ($LASTEXITCODE -ne 0) {
    Write-Host "Electron安装失败！" -ForegroundColor Red
    Write-Host "尝试清理缓存..." -ForegroundColor Yellow
    npm cache clean --force
    npm install electron --save-dev
}

# 安装其他依赖
Write-Host "安装其他依赖包..." -ForegroundColor Cyan
npm install

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n安装成功！" -ForegroundColor Green
    Write-Host "现在可以运行 '启动.bat' 启动工具了" -ForegroundColor Yellow
} else {
    Write-Host "`n安装失败！" -ForegroundColor Red
    Write-Host "请检查网络连接或手动运行以下命令：" -ForegroundColor Yellow
    Write-Host "npm cache clean --force" -ForegroundColor White
    Write-Host "npm install" -ForegroundColor White
}

Read-Host "`n按回车键退出"