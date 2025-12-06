@echo off
:: 这个文件可以保存为ANSI编码，不会闪退
chcp 936
title 文件共享工具
color 0A

echo.
echo =================================
echo    文件共享工具主菜单
echo =================================
echo.
echo 请选择操作：
echo.
echo [1] 安装环境（首次使用）
echo [2] 启动工具
echo [3] 打包成EXE
echo [4] 退出
echo.
set /p choice=请输入数字选择（1-4）：

if "%choice%"=="1" goto INSTALL
if "%choice%"=="2" goto START
if "%choice%"=="3" goto BUILD
if "%choice%"=="4" exit

:INSTALL
echo.
echo 正在安装环境...
call npm config set registry https://registry.npmmirror.com
call npm install electron --save-dev
call npm install
echo.
echo 安装完成！
pause
exit

:START
echo.
echo 正在启动...
start node main.js
exit

:BUILD
echo.
echo 正在打包...
call npm install electron-builder --save-dev
npx electron-builder --win portable
echo.
echo 打包完成！文件在dist文件夹中
pause
exit