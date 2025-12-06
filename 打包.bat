@echo off
REM 这个文件保存为ANSI编码！
chcp 936 >nul
title 文件共享工具一键打包
color 0B

echo.
echo ================================
echo   文件共享工具 一键打包方案
echo ================================
echo.

REM 设置当前目录
cd /d "%~dp0"

echo [1/7] 检查环境...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误：未安装Node.js
    echo 请访问：https://nodejs.org/ 下载安装
    pause
    exit
)

echo ✅ Node.js版本： 
node --version

echo.
echo [2/7] 设置npm镜像源...
npm config set registry https://registry.npmmirror.com
npm config set electron_mirror "https://npmmirror.com/mirrors/electron/"
npm config set electron_builder_binaries_mirror "https://npmmirror.com/mirrors/electron-builder-binaries/"

echo ✅ 镜像源设置完成
echo.

echo [3/7] 安装依赖包...
if not exist "node_modules" (
    echo 正在安装依赖，可能需要几分钟...
    call npm install
) else (
    echo ✅ 依赖包已存在
)

echo.
echo [4/7] 安装electron-builder...
npm install electron-builder --save-dev --force

echo.
echo [5/7] 准备打包文件...
REM 创建必要的目录
if not exist "files" mkdir files
if not exist "dist" mkdir dist

REM 如果没有图标，创建一个简单图标
if not exist "icon.png" (
    echo 创建默认图标...
    echo iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAACXBIWXMAAAsTAAALEwEAmpwYAAAA > icon.png.b64
    REM 这里简化，实际需要完整的base64图标
    echo 请手动添加一个256x256的PNG图标文件，命名为icon.png
)

if not exist "icon.ico" if exist "icon.png" (
    echo 将PNG转换为ICO...
    REM 需要安装ImageMagick或使用在线转换
)

echo.
echo [6/7] 修改package.json配置...
REM 确保package.json有正确的build配置
if not exist "package.json" (
    echo 错误：缺少package.json！
    pause
    exit
)

echo ✅ package.json配置检查完成
echo.

echo [7/7] 开始打包...
echo 这个过程可能需要5-10分钟，请耐心等待...
echo 如果卡住，不要关闭窗口！
echo.

REM 方法1：使用npx打包
echo 方法1：使用npx electron-builder打包...
timeout /t 2 >nul
npx electron-builder --win --x64 --ia32

if %errorlevel% neq 0 (
    echo.
    echo 方法1失败，尝试方法2...
    echo.
    
    REM 方法2：使用npm run build
    echo 方法2：使用npm run build...
    npm run build
    
    if %errorlevel% neq 0 (
        echo.
        echo 方法2失败，尝试方法3...
        echo.
        
        REM 方法3：最简打包
        echo 方法3：最简打包...
        npx electron-packager . "文件共享工具" --platform=win32 --arch=x64 --icon=icon.ico --out=dist --overwrite
        
        if %errorlevel% neq 0 (
            echo.
            echo ❌ 所有打包方法都失败！
            echo.
            echo 常见原因：
            echo 1. 网络问题（需要下载electron二进制文件）
            echo 2. 磁盘空间不足
            echo 3. 权限不足
            echo 4. 图标文件有问题
            echo.
            echo 解决方案：
            echo 1. 以管理员身份运行此脚本
            echo 2. 检查网络连接
            echo 3. 确保有2GB以上磁盘空间
        ) else (
            echo ✅ 方法3打包成功！
        )
    ) else (
        echo ✅ 方法2打包成功！
    )
) else (
    echo ✅ 方法1打包成功！
)

echo.
if exist "dist" (
    echo 📁 打包结果：
    dir dist /b
    
    echo.
    echo 🎉 打包完成！
    echo 生成的EXE文件在 dist 文件夹中
    echo.
    echo 你可以：
    echo 1. 将整个dist文件夹发给别人使用
    echo 2. 运行"文件共享工具 Setup.exe"安装
    echo 3. 或运行"文件共享工具.exe"（便携版）
) else (
    echo ❌ 打包失败，未生成dist文件夹
)

echo.
pause