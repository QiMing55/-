@echo off
chcp 936
title 打包工具
color 0B

echo.
echo 文件共享工具 - 打包程序
echo ================================
echo.

echo 检查环境...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误：未找到Node.js！
    echo 请先运行"安装环境.bat"
    pause
    exit /b 1
)

echo Node.js版本： 
node --version
echo.

if not exist "package.json" (
    echo 错误：未找到package.json！
    pause
    exit /b 1
)

echo 检查依赖包...
if not exist "node_modules" (
    echo 警告：依赖包未安装！
    echo 正在安装...
    call npm install
)

echo.
echo 安装打包工具...
npm install electron-builder --save-dev
echo.

echo 创建必要的文件夹...
if not exist "files" mkdir files
if not exist "icon.png" (
    echo 注意：未找到icon.png图标文件
    echo 请手动添加图标文件
)

echo.
echo 清理旧的打包文件...
if exist "dist" rmdir /s /q dist >nul 2>nul

echo.
echo 开始打包...
echo 这可能需要几分钟，请耐心等待...
echo.

npx electron-builder --win portable

if %errorlevel% equ 0 (
    echo.
    echo 打包成功！
    echo.
    if exist "dist" (
        echo 生成的EXE文件在dist文件夹中：
        dir dist /b
    )
) else (
    echo.
    echo 打包失败！
    echo 尝试使用备用打包方式...
    echo.
    npm run build
)

echo.
pause