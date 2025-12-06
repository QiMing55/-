@echo off
chcp 936
title 安装环境
color 0E

echo.
echo 文件共享工具 - 环境安装
echo ================================
echo.

echo 检查Node.js是否已安装...
where node >nul 2>nul
if %errorlevel% neq 0 goto NO_NODEJS

echo 检测到Node.js：
node --version
echo.

echo 检测到npm：
npm --version
echo.

echo 正在安装依赖包...
echo 这可能需要几分钟，请耐心等待...
echo.

echo 设置npm镜像源（加速下载）...
npm config set registry https://registry.npmmirror.com
npm config set electron_mirror https://npmmirror.com/mirrors/electron/

echo.
echo 安装Electron...
npm install electron --save-dev

echo.
echo 安装其他依赖包...
npm install

if %errorlevel% equ 0 (
    echo.
    echo 安装成功！
    echo.
    echo 现在可以运行"启动.bat"启动工具了
) else (
    echo.
    echo 安装失败！
    echo 请检查网络连接或尝试以下命令：
    echo npm cache clean --force
    echo npm install
)

echo.
pause
exit /b 0

:NO_NODEJS
echo 错误：未安装Node.js！
echo.
echo 请先安装Node.js：
echo 1. 访问 https://nodejs.org/
echo 2. 下载 "LTS" 版本
echo 3. 运行安装程序
echo 4. 重新运行此脚本
echo.
pause
exit /b 1