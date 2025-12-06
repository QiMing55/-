const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');
const os = require('os');
const zlib = require('zlib');

// 配置
const PORT = 5000;
let FILES_DIR = path.join(__dirname, 'files');

// 如果是从extraResources加载，调整路径
if (__dirname.includes('app.asar')) {
    FILES_DIR = path.join(process.resourcesPath, 'files');
}

// 确保files目录存在
if (!fs.existsSync(FILES_DIR)) {
    fs.mkdirSync(FILES_DIR, { recursive: true });
}

// 获取本地IP地址
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

// 格式化文件大小
function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 生成文件列表HTML
function generateFileListHTML(files) {
    if (files.length === 0) {
        return '<div style="padding: 20px; text-align: center; color: #666;">暂无文件</div>';
    }
    
    return files.map(file => `
        <div class="file-item">
            <div class="file-info">
                <div class="file-icon">
                    ${getFileIcon(file.name)}
                </div>
                <div class="file-details">
                    <div class="file-name" title="${file.name}">${file.name}</div>
                    <div class="file-meta">
                        <span class="file-size">${file.size}</span>
                        <span class="file-time">${file.time}</span>
                    </div>
                </div>
            </div>
            <div class="file-actions">
                <a href="/download/${encodeURIComponent(file.name)}" class="download-btn" title="下载">
                    <span class="btn-icon">⬇️</span> 下载
                </a>
                <button class="delete-btn" data-filename="${file.name}" title="删除">
                    <span class="btn-icon">🗑️</span>
                </button>
            </div>
        </div>
    `).join('');
}

// 根据文件扩展名获取图标
function getFileIcon(filename) {
    const ext = path.extname(filename).toLowerCase();
    const icons = {
        '.pdf': '📕',
        '.doc': '📘',
        '.docx': '📘',
        '.xls': '📗',
        '.xlsx': '📗',
        '.ppt': '📙',
        '.pptx': '📙',
        '.txt': '📄',
        '.jpg': '🖼️',
        '.jpeg': '🖼️',
        '.png': '🖼️',
        '.gif': '🖼️',
        '.mp4': '🎬',
        '.mp3': '🎵',
        '.zip': '🗜️',
        '.rar': '🗜️',
        '.exe': '⚙️',
        '.js': '📜',
        '.html': '🌐',
        '.css': '🎨',
        '.py': '🐍',
        '.java': '☕'
    };
    return icons[ext] || '📄';
}

// 读取HTML模板
const HTML_TEMPLATE = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📁 文件共享工具完整版</title>
    <link rel="icon" href="/favicon.ico" type="image/x-icon">
    <style>
        /* 重置样式 */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        :root {
            --primary-color: #667eea;
            --secondary-color: #764ba2;
            --success-color: #10b981;
            --danger-color: #ef4444;
            --warning-color: #f59e0b;
            --info-color: #3b82f6;
            --light-color: #f9fafb;
            --dark-color: #1f2937;
            --gray-color: #6b7280;
            --border-color: #e5e7eb;
            --shadow-color: rgba(0, 0, 0, 0.1);
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: var(--dark-color);
            background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
            min-height: 100vh;
            padding: 20px;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px var(--shadow-color);
            overflow: hidden;
        }
        
        /* 头部样式 */
        .header {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            padding: 30px 40px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E");
            opacity: 0.1;
        }
        
        .app-title {
            font-size: 2.5rem;
            font-weight: 700;
            margin-bottom: 10px;
            position: relative;
            z-index: 1;
        }
        
        .app-subtitle {
            font-size: 1.1rem;
            opacity: 0.9;
            margin-bottom: 20px;
            position: relative;
            z-index: 1;
        }
        
        /* 状态卡片 */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 40px;
        }
        
        .stat-card {
            background: var(--light-color);
            border-radius: 15px;
            padding: 25px;
            text-align: center;
            box-shadow: 0 5px 15px var(--shadow-color);
            transition: transform 0.3s, box-shadow 0.3s;
            border: 1px solid var(--border-color);
        }
        
        .stat-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px var(--shadow-color);
        }
        
        .stat-icon {
            font-size: 2.5rem;
            margin-bottom: 15px;
        }
        
        .stat-value {
            font-size: 2rem;
            font-weight: 700;
            color: var(--primary-color);
            margin-bottom: 5px;
        }
        
        .stat-label {
            font-size: 0.9rem;
            color: var(--gray-color);
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        /* 上传区域 */
        .upload-section {
            padding: 0 40px 40px;
        }
        
        .upload-area {
            border: 3px dashed var(--primary-color);
            border-radius: 20px;
            padding: 80px 30px;
            text-align: center;
            background: var(--light-color);
            cursor: pointer;
            transition: all 0.3s;
            position: relative;
            overflow: hidden;
        }
        
        .upload-area:hover {
            border-color: var(--secondary-color);
            background: linear-gradient(135deg, #f8f9ff, #f0f2ff);
            transform: translateY(-2px);
        }
        
        .upload-area.dragover {
            border-color: var(--success-color);
            background: linear-gradient(135deg, #e8f7ee, #d4edda);
            transform: scale(1.02);
        }
        
        .upload-icon {
            font-size: 4rem;
            margin-bottom: 20px;
            display: block;
        }
        
        .upload-title {
            font-size: 1.5rem;
            font-weight: 600;
            color: var(--dark-color);
            margin-bottom: 10px;
        }
        
        .upload-subtitle {
            font-size: 1rem;
            color: var(--gray-color);
            margin-bottom: 5px;
        }
        
        .file-input {
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            opacity: 0;
            cursor: pointer;
        }
        
        /* 进度条 */
        .progress-container {
            margin-top: 30px;
            display: none;
        }
        
        .progress-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
        }
        
        .progress-bar {
            height: 8px;
            background: var(--border-color);
            border-radius: 4px;
            overflow: hidden;
        }
        
        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, var(--primary-color), var(--secondary-color));
            width: 0%;
            transition: width 0.3s;
            border-radius: 4px;
        }
        
        /* 文件列表 */
        .file-section {
            padding: 0 40px 40px;
        }
        
        .section-title {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 20px;
            color: var(--dark-color);
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .file-list {
            background: var(--light-color);
            border-radius: 15px;
            border: 1px solid var(--border-color);
            overflow: hidden;
        }
        
        .file-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 25px;
            border-bottom: 1px solid var(--border-color);
            transition: background-color 0.2s;
        }
        
        .file-item:last-child {
            border-bottom: none;
        }
        
        .file-item:hover {
            background: white;
        }
        
        .file-info {
            display: flex;
            align-items: center;
            gap: 15px;
            flex: 1;
            min-width: 0;
        }
        
        .file-icon {
            font-size: 1.8rem;
            flex-shrink: 0;
        }
        
        .file-details {
            flex: 1;
            min-width: 0;
        }
        
        .file-name {
            font-weight: 500;
            margin-bottom: 5px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        
        .file-meta {
            display: flex;
            gap: 15px;
            font-size: 0.85rem;
            color: var(--gray-color);
        }
        
        .file-actions {
            display: flex;
            gap: 10px;
            flex-shrink: 0;
        }
        
        .btn {
            padding: 8px 20px;
            border: none;
            border-radius: 8px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 0.9rem;
        }
        
        .download-btn {
            background: var(--success-color);
            color: white;
        }
        
        .download-btn:hover {
            background: #0da271;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(16, 185, 129, 0.3);
        }
        
        .delete-btn {
            background: var(--danger-color);
            color: white;
            padding: 8px 12px;
        }
        
        .delete-btn:hover {
            background: #dc2626;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(239, 68, 68, 0.3);
        }
        
        .btn-icon {
            font-size: 1rem;
        }
        
        /* 响应式设计 */
        @media (max-width: 768px) {
            .container {
                margin: 10px;
                border-radius: 15px;
            }
            
            .header {
                padding: 20px;
            }
            
            .app-title {
                font-size: 2rem;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
                margin: 20px;
                gap: 15px;
            }
            
            .upload-section,
            .file-section {
                padding: 0 20px 20px;
            }
            
            .upload-area {
                padding: 50px 20px;
            }
            
            .file-item {
                padding: 15px;
                flex-direction: column;
                gap: 15px;
                align-items: stretch;
            }
            
            .file-info {
                flex-direction: column;
                text-align: center;
                gap: 10px;
            }
            
            .file-actions {
                justify-content: center;
            }
        }
        
        /* 状态消息 */
        .status-message {
            padding: 15px 25px;
            border-radius: 10px;
            margin: 20px 40px;
            display: none;
            animation: slideIn 0.3s;
        }
        
        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(-20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        .status-success {
            background: #d1fae5;
            color: #065f46;
            border: 1px solid #a7f3d0;
        }
        
        .status-error {
            background: #fee2e2;
            color: #991b1b;
            border: 1px solid #fecaca;
        }
        
        .status-info {
            background: #dbeafe;
            color: #1e40af;
            border: 1px solid #bfdbfe;
        }
        
        /* 空状态 */
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: var(--gray-color);
        }
        
        .empty-icon {
            font-size: 4rem;
            margin-bottom: 20px;
            opacity: 0.3;
        }
        
        .empty-text {
            font-size: 1.2rem;
            margin-bottom: 10px;
        }
        
        /* 二维码 */
        .qrcode-container {
            margin-top: 20px;
            text-align: center;
            padding: 20px;
            background: white;
            border-radius: 15px;
            box-shadow: 0 5px 15px var(--shadow-color);
            display: none;
        }
        
        .qrcode-title {
            font-size: 1.1rem;
            margin-bottom: 15px;
            color: var(--dark-color);
        }
        
        .qrcode-img {
            max-width: 200px;
            margin: 0 auto;
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="app-title">📁 文件共享工具完整版</h1>
            <p class="app-subtitle">局域网文件传输利器 • 支持拖拽上传 • 手机扫码访问</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">📊</div>
                <div class="stat-value" id="fileCount">0</div>
                <div class="stat-label">文件数量</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">💾</div>
                <div class="stat-value" id="totalSize">0 B</div>
                <div class="stat-label">总大小</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📱</div>
                <div class="stat-value" id="accessCount">0</div>
                <div class="stat-label">今日访问</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">⚡</div>
                <div class="stat-value" id="serverStatus">在线</div>
                <div class="stat-label">服务器状态</div>
            </div>
        </div>
        
        <div class="upload-section">
            <div class="upload-area" id="uploadArea">
                <div class="upload-icon">📤</div>
                <h2 class="upload-title">拖拽文件到此处上传</h2>
                <p class="upload-subtitle">支持所有类型文件 • 最大支持 2GB • 批量上传</p>
                <p class="upload-subtitle">或点击此处选择文件</p>
                <input type="file" id="fileInput" class="file-input" multiple>
            </div>
            
            <div class="progress-container" id="progressContainer">
                <div class="progress-info">
                    <span id="progressText">准备上传...</span>
                    <span id="progressPercent">0%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" id="progressFill"></div>
                </div>
            </div>
        </div>
        
        <div class="status-message" id="statusMessage"></div>
        
        <div class="qrcode-container" id="qrcodeContainer">
            <div class="qrcode-title">📱 手机扫码访问</div>
            <img src="" alt="二维码" class="qrcode-img" id="qrcodeImg">
        </div>
        
        <div class="file-section">
            <h2 class="section-title">
                📋 文件列表
                <button class="btn" style="background: var(--info-color); color: white;" id="refreshBtn">
                    <span class="btn-icon">🔄</span> 刷新
                </button>
                <button class="btn" style="background: var(--warning-color); color: white;" id="showQRBtn">
                    <span class="btn-icon">📱</span> 显示二维码
                </button>
            </h2>
            
            <div class="file-list" id="fileList">
                <!-- 文件列表将通过JavaScript动态生成 -->
            </div>
        </div>
    </div>

    <script>
        // 获取DOM元素
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const progressContainer = document.getElementById('progressContainer');
        const progressText = document.getElementById('progressText');
        const progressPercent = document.getElementById('progressPercent');
        const progressFill = document.getElementById('progressFill');
        const statusMessage = document.getElementById('statusMessage');
        const fileList = document.getElementById('fileList');
        const refreshBtn = document.getElementById('refreshBtn');
        const showQRBtn = document.getElementById('showQRBtn');
        const qrcodeContainer = document.getElementById('qrcodeContainer');
        const qrcodeImg = document.getElementById('qrcodeImg');
        const fileCount = document.getElementById('fileCount');
        const totalSize = document.getElementById('totalSize');
        const accessCount = document.getElementById('accessCount');
        const serverStatus = document.getElementById('serverStatus');
        
        // 获取服务器IP
        let serverIP = 'localhost';
        fetch('/api/ip').then(r => r.json()).then(data => {
            serverIP = data.ip;
        }).catch(() => {
            // 如果获取失败，使用localhost
        });
        
        // 页面加载时获取文件列表
        document.addEventListener('DOMContentLoaded', loadFileList);
        
        // 拖拽上传功能
        uploadArea.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', function(e) {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            uploadArea.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                uploadFiles(files);
            }
        });
        
        // 点击上传区域触发文件选择
        uploadArea.addEventListener('click', function(e) {
            if (e.target !== fileInput) {
                fileInput.click();
            }
        });
        
        // 文件选择事件
        fileInput.addEventListener('change', function() {
            if (this.files.length > 0) {
                uploadFiles(this.files);
                this.value = ''; // 清空选择，以便再次选择相同文件
            }
        });
        
        // 刷新按钮
        refreshBtn.addEventListener('click', loadFileList);
        
        // 显示二维码按钮
        showQRBtn.addEventListener('click', function() {
            if (qrcodeContainer.style.display === 'block') {
                qrcodeContainer.style.display = 'none';
                showQRBtn.innerHTML = '<span class="btn-icon">📱</span> 显示二维码';
            } else {
                // 生成二维码
                const qrUrl = \`http://\${serverIP}:5000\`;
                qrcodeImg.src = \`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=\${encodeURIComponent(qrUrl)}\`;
                qrcodeContainer.style.display = 'block';
                showQRBtn.innerHTML = '<span class="btn-icon">❌</span> 隐藏二维码';
            }
        });
        
        // 上传文件
        function uploadFiles(files) {
            if (files.length === 0) return;
            
            // 显示进度条
            progressContainer.style.display = 'block';
            progressText.textContent = \`准备上传 \${files.length} 个文件...\`;
            progressPercent.textContent = '0%';
            progressFill.style.width = '0%';
            
            // 显示状态消息
            showStatus('正在上传文件，请稍候...', 'info');
            
            const totalSize = Array.from(files).reduce((sum, file) => sum + file.size, 0);
            let uploadedSize = 0;
            
            // 逐个上传文件
            Array.from(files).forEach((file, index) => {
                const formData = new FormData();
                formData.append('file', file);
                
                // 更新进度文本
                progressText.textContent = \`正在上传: \${file.name} (\${index + 1}/\${files.length})\`;
                
                fetch('/upload', {
                    method: 'POST',
                    body: formData
                })
                .then(response => response.json())
                .then(data => {
                    uploadedSize += file.size;
                    const progress = Math.round((uploadedSize / totalSize) * 100);
                    
                    progressPercent.textContent = \`\${progress}%\`;
                    progressFill.style.width = \`\${progress}%\`;
                    
                    if (data.success) {
                        if (uploadedSize === totalSize) {
                            // 所有文件上传完成
                            showStatus(\`✅ 所有文件上传完成！共上传 \${files.length} 个文件\`, 'success');
                            setTimeout(() => {
                                progressContainer.style.display = 'none';
                                loadFileList(); // 刷新文件列表
                            }, 1500);
                        }
                    } else {
                        showStatus(\`❌ 上传失败: \${data.error}\`, 'error');
                    }
                })
                .catch(error => {
                    showStatus(\`❌ 上传失败: \${error.message}\`, 'error');
                });
            });
        }
        
        // 加载文件列表
        function loadFileList() {
            fetch('/api/files')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // 更新统计数据
                        fileCount.textContent = data.count;
                        totalSize.textContent = formatFileSize(data.totalSize);
                        
                        // 更新文件列表
                        if (data.files.length === 0) {
                            fileList.innerHTML = \`
                                <div class="empty-state">
                                    <div class="empty-icon">📁</div>
                                    <div class="empty-text">暂无文件</div>
                                    <p>拖拽文件到上传区域或点击选择文件</p>
                                </div>
                            \`;
                        } else {
                            const filesHTML = data.files.map(file => \`
                                <div class="file-item">
                                    <div class="file-info">
                                        <div class="file-icon">
                                            \${getFileIcon(file.name)}
                                        </div>
                                        <div class="file-details">
                                            <div class="file-name" title="\${file.name}">\${file.name}</div>
                                            <div class="file-meta">
                                                <span class="file-size">\${file.size}</span>
                                                <span class="file-time">\${file.time}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="file-actions">
                                        <a href="/download/\${encodeURIComponent(file.name)}" class="btn download-btn">
                                            <span class="btn-icon">⬇️</span> 下载
                                        </a>
                                        <button class="btn delete-btn" onclick="deleteFile('\${file.name}')">
                                            <span class="btn-icon">🗑️</span>
                                        </button>
                                    </div>
                                </div>
                            \`).join('');
                            
                            fileList.innerHTML = filesHTML;
                        }
                    }
                })
                .catch(error => {
                    console.error('加载文件列表失败:', error);
                });
        }
        
        // 删除文件
        function deleteFile(filename) {
            if (!confirm(\`确定要删除文件 "\${filename}" 吗？\`)) {
                return;
            }
            
            fetch(\`/api/delete/\${encodeURIComponent(filename)}\`, {
                method: 'DELETE'
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    showStatus(\`✅ 文件 "\${filename}" 已删除\`, 'success');
                    loadFileList(); // 刷新列表
                } else {
                    showStatus(\`❌ 删除失败: \${data.error}\`, 'error');
                }
            })
            .catch(error => {
                showStatus(\`❌ 删除失败: \${error.message}\`, 'error');
            });
        }
        
        // 显示状态消息
        function showStatus(message, type) {
            statusMessage.textContent = message;
            statusMessage.className = 'status-message';
            statusMessage.classList.add(\`status-\${type}\`);
            statusMessage.style.display = 'block';
            
            // 3秒后自动隐藏
            setTimeout(() => {
                statusMessage.style.display = 'none';
            }, 3000);
        }
        
        // 辅助函数：根据文件名获取图标
        function getFileIcon(filename) {
            const ext = filename.split('.').pop().toLowerCase();
            const icons = {
                'pdf': '📕',
                'doc': '📘', 'docx': '📘',
                'xls': '📗', 'xlsx': '📗',
                'ppt': '📙', 'pptx': '📙',
                'txt': '📄',
                'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'bmp': '🖼️', 'svg': '🖼️',
                'mp4': '🎬', 'avi': '🎬', 'mov': '🎬', 'mkv': '🎬',
                'mp3': '🎵', 'wav': '🎵', 'flac': '🎵',
                'zip': '🗜️', 'rar': '🗜️', '7z': '🗜️', 'tar': '🗜️', 'gz': '🗜️',
                'exe': '⚙️',
                'js': '📜', 'html': '🌐', 'css': '🎨', 'json': '📄',
                'py': '🐍', 'java': '☕', 'cpp': '📘', 'c': '📘',
                'md': '📝'
            };
            return icons[ext] || '📄';
        }
        
        // 辅助函数：格式化文件大小
        function formatFileSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
        
        // 每隔30秒刷新一次文件列表
        setInterval(loadFileList, 30000);
        
        // 更新访问计数（模拟）
        setInterval(() => {
            const count = parseInt(accessCount.textContent);
            accessCount.textContent = count + 1;
        }, 60000); // 每分钟增加一次
    </script>
</body>
</html>
`;

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const method = req.method;
    
    // 设置响应头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // 处理预检请求
    if (method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    // 主页
    if (method === 'GET' && parsedUrl.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(HTML_TEMPLATE);
        return;
    }
    
    // 获取IP地址
    if (method === 'GET' && parsedUrl.pathname === '/api/ip') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ip: getLocalIP() }));
        return;
    }
    
    // 获取文件列表
    if (method === 'GET' && parsedUrl.pathname === '/api/files') {
        fs.readdir(FILES_DIR, (err, files) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: '读取文件列表失败' }));
                return;
            }
            
            const fileList = [];
            let totalSize = 0;
            
            files.forEach(filename => {
                try {
                    const filepath = path.join(FILES_DIR, filename);
                    const stats = fs.statSync(filepath);
                    
                    if (stats.isFile()) {
                        totalSize += stats.size;
                        fileList.push({
                            name: filename,
                            size: formatSize(stats.size),
                            bytes: stats.size,
                            time: new Date(stats.mtime).toLocaleString('zh-CN')
                        });
                    }
                } catch (e) {
                    // 忽略无法访问的文件
                }
            });
            
            // 按修改时间排序，最新的在前面
            fileList.sort((a, b) => {
                return new Date(b.time) - new Date(a.time);
            });
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: true,
                files: fileList,
                count: fileList.length,
                totalSize: totalSize
            }));
        });
        return;
    }
    
    // 上传文件
    if (method === 'POST' && parsedUrl.pathname === '/upload') {
        const boundary = req.headers['content-type']?.split('boundary=')[1];
        if (!boundary) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: '无效的请求格式' }));
            return;
        }
        
        let body = [];
        req.on('data', chunk => body.push(chunk));
        req.on('end', () => {
            try {
                const data = Buffer.concat(body);
                const parts = data.toString().split('--' + boundary);
                
                for (const part of parts) {
                    if (part.includes('filename="')) {
                        const filenameMatch = part.match(/filename="([^"]+)"/);
                        if (filenameMatch) {
                            const filename = path.basename(filenameMatch[1]);
                            const fileStart = part.indexOf('\r\n\r\n') + 4;
                            const fileEnd = part.lastIndexOf('\r\n');
                            
                            if (fileStart < fileEnd) {
                                const fileContent = part.substring(fileStart, fileEnd);
                                
                                // 保存文件
                                const safeFilename = filename.replace(/[<>:"/\\|?*]/g, '_');
                                const filepath = path.join(FILES_DIR, safeFilename);
                                fs.writeFileSync(filepath, fileContent);
                                
                                res.writeHead(200, { 'Content-Type': 'application/json' });
                                res.end(JSON.stringify({
                                    success: true,
                                    filename: safeFilename,
                                    size: fileContent.length,
                                    message: '文件上传成功'
                                }));
                                return;
                            }
                        }
                    }
                }
                
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: '未找到文件数据' }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
        return;
    }
    
    // 下载文件
    if (method === 'GET' && parsedUrl.pathname.startsWith('/download/')) {
        const filename = decodeURIComponent(parsedUrl.pathname.substring(10));
        const filepath = path.join(FILES_DIR, path.basename(filename));
        
        if (fs.existsSync(filepath)) {
            const stat = fs.statSync(filepath);
            const fileStream = fs.createReadStream(filepath);
            
            res.writeHead(200, {
                'Content-Type': 'application/octet-stream',
                'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
                'Content-Length': stat.size,
                'Cache-Control': 'no-cache'
            });
            
            fileStream.pipe(res);
        } else {
            res.writeHead(404);
            res.end('文件不存在');
        }
        return;
    }
    
    // 删除文件
    if (method === 'DELETE' && parsedUrl.pathname.startsWith('/api/delete/')) {
        const filename = decodeURIComponent(parsedUrl.pathname.substring(12));
        const filepath = path.join(FILES_DIR, path.basename(filename));
        
        if (fs.existsSync(filepath)) {
            try {
                fs.unlinkSync(filepath);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, message: '文件删除成功' }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: false, error: error.message }));
            }
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: '文件不存在' }));
        }
        return;
    }
    
    // 获取favicon.ico
    if (method === 'GET' && parsedUrl.pathname === '/favicon.ico') {
        const faviconPath = path.join(__dirname, 'icon.ico');
        if (fs.existsSync(faviconPath)) {
            const icon = fs.readFileSync(faviconPath);
            res.writeHead(200, { 'Content-Type': 'image/x-icon' });
            res.end(icon);
        } else {
            res.writeHead(404);
            res.end();
        }
        return;
    }
    
    // 测试接口
    if (method === 'GET' && parsedUrl.pathname === '/api/test') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: '服务器正常运行', timestamp: Date.now() }));
        return;
    }
    
    // 404处理
    res.writeHead(404);
    res.end('404 Not Found');
});

// 启动服务器
function startServer(port = PORT) {
    server.listen(port, () => {
        const localIP = getLocalIP();
        console.log('='.repeat(70));
        console.log('🚀 文件共享工具完整版 - HTTP服务器启动成功！');
        console.log('='.repeat(70));
        console.log(`📁 文件目录：${FILES_DIR}`);
        console.log(`💻 电脑访问：http://localhost:${port}`);
        console.log(`📱 手机访问：http://${localIP}:${port}`);
        console.log(`📊 支持功能：文件上传、下载、删除、拖拽上传、进度显示、手机访问`);
        console.log('='.repeat(70));
    });
    
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`❌ 端口 ${port} 被占用，尝试使用端口 ${port + 1}`);
            startServer(port + 1);
        } else {
            console.error('❌ 服务器启动失败:', err);
        }
    });
}

// 导出服务器实例和启动函数
module.exports = {
    server,
    startServer,
    getLocalIP,
    FILES_DIR
};

// 如果直接运行这个文件，启动服务器
if (require.main === module) {
    startServer();
}