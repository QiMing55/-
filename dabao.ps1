# 文件共享工具 - PowerShell打包脚本
Write-Host "文件共享工具 - 打包程序" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Gray

# 检查环境
Write-Host "检查环境..." -ForegroundColor Yellow
if (!(Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "错误：未安装Node.js！" -ForegroundColor Red
    Write-Host "请先运行安装环境脚本" -ForegroundColor Yellow
    Read-Host "按回车键退出"
    exit
}

Write-Host "Node.js版本: $(node --version)" -ForegroundColor Green

# 检查必要文件
if (!(Test-Path "package.json")) {
    Write-Host "错误：未找到package.json！" -ForegroundColor Red
    Read-Host "按回车键退出"
    exit
}

# 检查依赖
if (!(Test-Path "node_modules")) {
    Write-Host "警告：依赖包未安装，正在安装..." -ForegroundColor Yellow
    npm install
}

# 安装打包工具
Write-Host "`n安装打包工具..." -ForegroundColor Cyan
npm install electron-builder --save-dev

# 创建必要文件夹
if (!(Test-Path "files")) {
    New-Item -ItemType Directory -Path "files" | Out-Null
    Write-Host "创建files文件夹" -ForegroundColor Green
}

# 清理旧的打包文件
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist" -ErrorAction SilentlyContinue
    Write-Host "清理旧的打包文件" -ForegroundColor Green
}

# 打包
Write-Host "`n开始打包..." -ForegroundColor Cyan
Write-Host "这可能需要几分钟，请耐心等待..." -ForegroundColor Gray

npx electron-builder --win portable

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n打包成功！" -ForegroundColor Green
    if (Test-Path "dist") {
        Write-Host "生成的EXE文件：" -ForegroundColor Yellow
        Get-ChildItem "dist" -File | ForEach-Object {
            Write-Host "  $($_.Name) ($([math]::Round($_.Length/1MB, 2)) MB)" -ForegroundColor White
        }
    }
} else {
    Write-Host "`n打包失败！尝试备用方式..." -ForegroundColor Yellow
    npm run build
}

Read-Host "`n按回车键退出"