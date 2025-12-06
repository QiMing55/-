@echo off
chcp 65001 >nul
title 🔧 文件共享工具完整版 - 环境安装
color 0E

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                 文件共享工具完整版 环境安装                  ║
echo ║          自动安装Node.js和所需依赖包的一键脚本              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

echo 📋 环境检查：
echo.

REM 检查Node.js是否已安装
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ 检测到已安装Node.js
    node --version
    echo.
    
    REM 检查npm
    where npm >nul 2>nul
    if %errorlevel% equ 0 (
        echo ✅ 检测到已安装npm
        npm --version
        echo.
        
        choice /M "Node.js环境已安装，是否继续安装依赖包？"
        if errorlevel 2 goto END
        
        goto INSTALL_DEPS
    ) else (
        echo ❌ 警告：Node.js已安装但未找到npm
        echo.
    )
) else (
    echo ❌ 未检测到Node.js
    echo.
    
    echo ═══════════════════════════════════════════════════════════════
    echo 需要安装Node.js才能运行此工具
    echo.
    echo Node.js下载选项：
    echo 1. 自动下载Node.js安装包（推荐）
    echo 2. 手动下载Node.js
    echo 3. 跳过Node.js安装（如果已安装但未检测到）
    echo ═══════════════════════════════════════════════════════════════
    echo.
    
    choice /C 123 /N /M "请选择安装方式 (1/2/3): "
    
    if errorlevel 3 (
        echo.
        echo ⚠️ 请手动添加Node.js到系统PATH环境变量
        echo 然后重新运行此脚本
        goto END
    )
    
    if errorlevel 2 (
        echo.
        echo 🌐 请手动下载Node.js：
        echo 下载地址：https://nodejs.org/zh-cn/download/
        echo 或国内镜像：https://npmmirror.com/mirrors/node/
        echo.
        echo 安装完成后请重新运行此脚本
        goto END
    )
    
    REM 选项1：自动下载Node.js
    echo.
    echo 📥 正在自动下载Node.js安装包...
    
    REM 检测系统架构
    if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
        set ARCH=x64
    ) else (
        set ARCH=x86
    )
    
    REM 下载Node.js（Windows安装包）
    powershell -Command "& {(New-Object System.Net.WebClient).DownloadFile('https://npmmirror.com/mirrors/node/v18.17.0/node-v18.17.0-x64.msi', 'node-installer.msi')}"
    
    if exist "node-installer.msi" (
        echo ✅ Node.js安装包下载完成
        echo.
        echo ⚙️ 正在安装Node.js...
        echo 请按照安装向导完成安装
        echo.
        start /wait msiexec /i "node-installer.msi"
        
        echo.
        echo ✅ Node.js安装完成
        del "node-installer.msi"
        
        echo.
        echo 🔄 请重新启动此脚本以完成依赖包安装
        pause
        exit /b 0
    ) else (
        echo ❌ Node.js下载失败
        echo 请手动下载安装Node.js
        echo 下载地址：https://nodejs.org/zh-cn/download/
        pause
        exit /b 1
    )
)

:INSTALL_DEPS
echo 📦 正在安装项目依赖包...
echo 这个过程可能需要几分钟，请耐心等待...
echo.

REM 设置npm镜像源（加速下载）
echo ⚡ 设置npm镜像源（加速下载）...
call npm config set registry https://registry.npmmirror.com
call npm config set electron_mirror https://npmmirror.com/mirrors/electron/

echo.
echo 📥 安装Electron...
call npm install electron --save-dev

echo.
echo 📥 安装其他依赖包...
call npm install

if %errorlevel% neq 0 (
    echo.
    echo ❌ 依赖包安装失败！
    echo 尝试清除缓存后重试...
    
    call npm cache clean --force
    echo.
    echo 🔄 重新安装依赖包...
    call npm install
    
    if %errorlevel% neq 0 (
        echo.
        echo ❌ 依赖包安装仍然失败！
        echo 请手动检查网络连接或尝试：
        echo 1. 以管理员身份运行此脚本
        echo 2. 手动运行：npm install
        pause
        exit /b 1
    )
)

echo.
echo ✅ 所有依赖包安装完成！
echo.
echo 🎉 环境配置成功！
echo.
echo 您现在可以：
echo 1. 运行"启动.bat"启动文件共享工具
echo 2. 运行"打包成EXE.bat"将工具打包成EXE文件
echo.
echo ⚠️  注意：首次启动可能需要等待较长时间
echo     因为需要下载Chromium内核（约200MB）

:END
echo.
echo 按任意键退出...
pause >nul