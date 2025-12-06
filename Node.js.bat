@echo off
chcp 65001
cls
echo ========================================
echo     安装Node.js运行环境
echo ========================================
echo.
echo 这个工具需要Node.js才能运行
echo 如果未安装，请使用此脚本安装
echo.
echo 按任意键开始安装...
pause >nul

echo.
echo 正在检查是否已安装Node.js...
node --version >nul 2>&1
if not errorlevel 1 (
    echo ✅ Node.js已安装！
    echo 版本：%node_version%
    echo.
    pause
    exit /b 0
)

echo ❌ 未检测到Node.js
echo.
echo 正在从淘宝镜像下载Node.js安装包（国内加速）...
curl -L -o nodejs-installer.msi https://registry.npmmirror.com/-/binary/node/v18.17.1/node-v18.17.1-x64.msi

if not exist nodejs-installer.msi (
    echo ❌ 下载失败，请手动下载：
    echo https://nodejs.org/dist/v18.17.1/node-v18.17.1-x64.msi
    echo.
    pause
    exit /b 1
)

echo.
echo 正在安装Node.js（静默安装）...
echo 请稍等，这需要几分钟...
msiexec /i nodejs-installer.msi /quiet /norestart ADDLOCAL=NodeRuntime,npm

echo 等待安装完成...
timeout /t 15 /nobreak >nul

del nodejs-installer.msi 2>nul

echo.
echo 验证安装...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 安装失败，请手动安装Node.js
) else (
    echo ✅ Node.js安装成功！
    echo 请重新运行"启动.bat"
)

echo.
pause