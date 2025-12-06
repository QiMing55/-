@echo off
chcp 936 >nul
title 修复批处理文件编码
color 0A

echo.
echo 正在修复批处理文件编码...
echo.

REM 备份原文件
if exist "安装环境.bak" (
    del "安装环境.bak" >nul 2>nul
)
if exist "打包成EXE.bak" (
    del "打包成EXE.bak" >nul 2>nul
)

copy "安装环境.bat" "安装环境.bak" >nul 2>nul
copy "打包成EXE.bat" "打包成EXE.bak" >nul 2>nul

echo ✅ 已备份原文件
echo.

echo 📝 重新创建批处理文件...

REM ============= 创建简化版安装环境.bat =============
echo 创建简化版安装环境.bat...
(
echo @echo off
echo chcp 936 ^>nul
echo title 安装环境
echo.
echo echo 正在安装所需环境...
echo echo.
echo 
echo REM 检查Node.js
echo where node ^>nul 2^>nul
echo if %%errorlevel%% neq 0 (
echo     echo 错误：未找到Node.js！
echo     echo.
echo     echo 请下载安装Node.js：https://nodejs.org/
echo     echo 或使用国内镜像：https://npmmirror.com/mirrors/node/
echo     echo.
echo     echo 安装完成后重新运行此脚本
echo     pause
echo     exit /b 1
echo )
echo 
echo echo Node.js版本：
echo node --version
echo.
echo 
echo REM 检查npm
echo where npm ^>nul 2^>nul
echo if %%errorlevel%% neq 0 (
echo     echo 错误：未找到npm！
echo     echo 请重新安装Node.js
echo     pause
echo     exit /b 1
echo )
echo 
echo echo npm版本：
echo npm --version
echo.
echo 
echo echo 正在安装依赖包...
echo echo 这可能需要几分钟，请耐心等待...
echo.
echo 
echo REM 设置npm镜像源（加速）
echo npm config set registry https://registry.npmmirror.com
echo npm config set electron_mirror https://npmmirror.com/mirrors/electron/
echo.
echo 
echo echo 安装Electron...
echo npm install electron --save-dev
echo.
echo 
echo echo 安装其他依赖...
echo npm install
echo.
echo 
echo if %%errorlevel%% equ 0 (
echo     echo ✅ 安装成功！
echo     echo.
echo     echo 现在可以运行"启动.bat"了
echo ) else (
echo     echo ❌ 安装失败！
echo     echo 请检查网络连接
echo )
echo.
echo pause
) > "安装环境.bat"

REM ============= 创建简化版打包成EXE.bat =============
echo 创建简化版打包成EXE.bat...
(
echo @echo off
echo chcp 936 ^>nul
echo title 打包工具
echo.
echo echo 正在打包成EXE文件...
echo echo.
echo 
echo REM 检查Node.js
echo where node ^>nul 2^>nul
echo if %%errorlevel%% neq 0 (
echo     echo 错误：未找到Node.js！
echo     echo 请先运行"安装环境.bat"
echo     pause
echo     exit /b 1
echo )
echo.
echo 
echo echo 检查依赖包...
echo if not exist "node_modules" (
echo     echo 错误：未安装依赖包！
echo     echo 请先运行"安装环境.bat"
echo     pause
echo     exit /b 1
echo )
echo.
echo 
echo echo 安装打包工具（如未安装）...
echo npm install electron-builder --save-dev
echo.
echo 
echo echo 开始打包...
echo echo 这可能需要几分钟，请耐心等待...
echo.
echo 
echo REM 创建必要的目录
echo if not exist "files" mkdir files
echo.
echo 
echo echo 清理旧的打包文件...
echo if exist "dist" rmdir /s /q dist ^>nul 2^>nul
echo.
echo 
echo echo 打包便携版（单个EXE文件）...
echo npx electron-builder --win portable
echo.
echo 
echo if %%errorlevel%% equ 0 (
echo     echo ✅ 打包成功！
echo     echo.
echo     if exist "dist" (
echo         echo 打包文件在 dist 文件夹中
echo         dir dist
echo     )
echo ) else (
echo     echo ❌ 打包失败！
echo     echo 尝试使用：npm run dist
echo     pause
echo )
echo.
echo pause
) > "打包成EXE.bat"

echo ✅ 已创建修复版批处理文件
echo.
echo 📌 新文件特点：
echo 1. 使用ANSI/GB2312编码
echo 2. 简化了命令
echo 3. 去除了可能出错的特殊字符
echo.
echo 现在可以尝试运行新的批处理文件了！
pause