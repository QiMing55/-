@echo off
chcp 65001 >nul
title 🔍 打包环境检查
color 0A

echo.
echo ========== 打包环境诊断 ==========
echo.

echo 1. 系统信息：
echo   系统：%OS%
echo   处理器：%PROCESSOR_ARCHITECTURE%
echo   用户：%USERNAME%
echo   目录：%CD%
echo.

echo 2. Node.js 检查：
where node >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ Node.js 已安装
    node --version
    where node
) else (
    echo ❌ Node.js 未安装
)
echo.

echo 3. npm 检查：
where npm >nul 2>nul
if %errorlevel% equ 0 (
    echo ✅ npm 已安装
    npm --version
) else (
    echo ❌ npm 未找到
)
echo.

echo 4. 项目文件检查：
dir /b *.js
echo.

echo 5. 依赖包检查：
if exist "node_modules" (
    echo ✅ node_modules 目录存在
    echo   大小：...
) else (
    echo ❌ node_modules 目录不存在
)
echo.

echo 6. 图标文件检查：
if exist "icon.ico" (
    echo ✅ icon.ico 存在
) else (
    echo ❌ icon.ico 不存在
)
if exist "icon.png" (
    echo ✅ icon.png 存在
) else (
    echo ❌ icon.png 不存在
)
echo.

echo 7. 磁盘空间检查：
wmic logicaldisk get size,freespace,caption
echo.

echo 8. 网络连接检查（测试镜像源）：
echo 测试npm镜像...
npm config get registry
echo.

echo 按任意键运行打包测试...
pause >nul

echo.
echo 🧪 运行打包测试...
npx electron-builder --help
echo.

echo 如果看到帮助信息，说明electron-builder可用
echo 如果报错，说明环境有问题
echo.
pause