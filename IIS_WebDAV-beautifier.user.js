// ==UserScript==
// @name         IIS 目录美化
// @namespace    http://tampermonkey.net/
// @version      44.0
// @description  现代网盘风格+传输计算（交换耗时/完成列，耗时恢复中文）
// @author       misaka_10807
// @match        *://192.168.123.4:8090/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ============================================================
    // ⚙️ 可配置区（修改这里即可自定义你的界面）
    // ============================================================
    const CONFIG = {
        // ---------- 布局 ----------
        containerMaxWidth: '1500px',
        containerPadding: '20px',
        tableFontSize: '14px',

        // ---------- 列宽（百分比） ----------
        // ⭐ 列顺序：文件名 | 修改时间 | 大小 | 开始时间 | 完成时间 | 预计耗时 | 缓冲
        columnWidths: {
            name:      '30%',
            mtime:     '13%',
            bytes:     '8%',
            startTime: '13%',
            endTime:   '20%',
            duration:  '13%',
            buffer:    '3%'
        },

        // ---------- 列最小宽度 ----------
        columnMinWidths: {
            name:      200,
            mtime:     160,
            bytes:     110,
            startTime: 150,
            endTime:   110,
            duration:  110
        },

        // ---------- 传输计算 ----------
        defaultSpeed: 100,
        defaultUnit: 'KB',

        // ---------- 颜色 ----------
        colors: {
            link: '#007bff',
            mtime: '#6c757d',
            mtimeDark: '#9aa0a6',
            duration: '#e67e22',
            durationDark: '#f5a623',
            endTime: '#27ae60',
            endTimeDark: '#2ecc71',
            folderTag: '#adb5bd'
        },

        // ---------- 修改时间列格式 ----------
        mtimeFontFamily: 'inherit',
        mtimeFontSize: '14px'
    };
    // ============================================================
    // 可配置区结束，以下为脚本逻辑
    // ============================================================

    if (localStorage.getItem('iis_view_original') === 'true') {
        window.addEventListener('load', () => {
            let btn = document.createElement('button');
            btn.textContent = '✨ 切换到美化视图';
            btn.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 99999; padding: 10px 16px; background: #007bff; color: #fff; border: none; border-radius: 8px; cursor: pointer; font-family: sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.2);';
            btn.onclick = () => { localStorage.removeItem('iis_view_original'); location.reload(); };
            document.body.appendChild(btn);
        });
        return;
    }

    let hideStyle = document.createElement('style');
    hideStyle.id = 'iis-hide-native';
    hideStyle.textContent = 'h1, hr, pre { display: none !important; }';
    document.documentElement.appendChild(hideStyle);

    // ============ ⭐ Win11 风格 SVG 图标库 ============
    const DOC_PATH = "M6 2h7l7 7v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z";
    const DOC_FOLD = "M13 2v7h7z";

    const ICON_MAP = {
        folder: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><defs><linearGradient id='folderG' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%23FFD766'/><stop offset='1' stop-color='%23FFB900'/></linearGradient></defs><path fill='url(%23folderG)' d='M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z'/><path fill='%23FFFFFF' opacity='0.25' d='M3 8h18v2H3z'/></svg>`,

        archive: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><defs><linearGradient id='z360' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%23FFC107'/><stop offset='1' stop-color='%23F57C00'/></linearGradient></defs><rect x='4' y='3' width='16' height='18' rx='3' fill='url(%23z360)'/><rect x='11' y='3' width='2' height='18' fill='%23FFF' opacity='0.85'/><circle cx='12' cy='6' r='0.9' fill='%23F57C00'/><circle cx='12' cy='9' r='0.9' fill='%23F57C00'/><circle cx='12' cy='12' r='0.9' fill='%23F57C00'/><circle cx='12' cy='15' r='0.9' fill='%23F57C00'/><circle cx='12' cy='18' r='0.9' fill='%23F57C00'/><rect x='10' y='2' width='4' height='2' rx='1' fill='%23E65100'/></svg>`,

        image: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><defs><linearGradient id='imgG' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%2366BB6A'/><stop offset='1' stop-color='%232E7D32'/></linearGradient></defs><rect x='3' y='4' width='18' height='16' rx='2' fill='url(%23imgG)'/><circle cx='8.5' cy='9' r='1.8' fill='%23FFF' opacity='0.95'/><path fill='%23FFF' opacity='0.85' d='M4 17l4.5-5 3 3 4-4.5L20 17z'/></svg>`,

        video: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><defs><linearGradient id='vidG' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%23BA68C8'/><stop offset='1' stop-color='%236A1B9A'/></linearGradient></defs><rect x='2' y='5' width='20' height='14' rx='2' fill='url(%23vidG)'/><path fill='%23FFF' d='M10 9l6 3.5-6 3.5z'/></svg>`,

        audio: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><defs><linearGradient id='audG' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%23F06292'/><stop offset='1' stop-color='%23AD1457'/></linearGradient></defs><rect x='3' y='4' width='18' height='16' rx='2' fill='url(%23audG)'/><path fill='%23FFF' d='M15 6v8.5a2 2 0 1 1-1-1.73V8l-4 1v6.5a2 2 0 1 1-1-1.73V9l6-1.5z'/></svg>`,

        pdf: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><defs><linearGradient id='pdfG' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%23EF5350'/><stop offset='1' stop-color='%23B71C1C'/></linearGradient></defs><path fill='url(%23pdfG)' d='${DOC_PATH}'/><path fill='%23FFF' opacity='0.35' d='${DOC_FOLD}'/><text x='12' y='17.5' font-family='Arial,sans-serif' font-size='5.5' font-weight='bold' fill='%23FFF' text-anchor='middle'>PDF</text></svg>`,

        word: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><defs><linearGradient id='wdG' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%2342A5F5'/><stop offset='1' stop-color='%230D47A1'/></linearGradient></defs><path fill='url(%23wdG)' d='${DOC_PATH}'/><path fill='%23FFF' opacity='0.35' d='${DOC_FOLD}'/><text x='12' y='17.5' font-family='Arial,sans-serif' font-size='7' font-weight='bold' fill='%23FFF' text-anchor='middle'>W</text></svg>`,

        excel: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><defs><linearGradient id='xlG' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%2366BB6A'/><stop offset='1' stop-color='%231B5E20'/></linearGradient></defs><path fill='url(%23xlG)' d='${DOC_PATH}'/><path fill='%23FFF' opacity='0.35' d='${DOC_FOLD}'/><text x='12' y='17.5' font-family='Arial,sans-serif' font-size='7' font-weight='bold' fill='%23FFF' text-anchor='middle'>X</text></svg>`,

        ppt: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><defs><linearGradient id='pptG' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%23FF8A65'/><stop offset='1' stop-color='%23BF360C'/></linearGradient></defs><path fill='url(%23pptG)' d='${DOC_PATH}'/><path fill='%23FFF' opacity='0.35' d='${DOC_FOLD}'/><text x='12' y='17.5' font-family='Arial,sans-serif' font-size='7' font-weight='bold' fill='%23FFF' text-anchor='middle'>P</text></svg>`,

        text: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><defs><linearGradient id='txtG' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%2378909C'/><stop offset='1' stop-color='%2337474F'/></linearGradient></defs><path fill='url(%23txtG)' d='${DOC_PATH}'/><path fill='%23FFF' opacity='0.35' d='${DOC_FOLD}'/><path stroke='%23FFF' stroke-width='1.2' stroke-linecap='round' d='M8 12h8M8 15h8M8 18h5' fill='none'/></svg>`,

        code: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><defs><linearGradient id='codeG' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%23BA68C8'/><stop offset='1' stop-color='%234A148C'/></linearGradient></defs><path fill='url(%23codeG)' d='${DOC_PATH}'/><path fill='%23FFF' opacity='0.35' d='${DOC_FOLD}'/><path fill='none' stroke='%23FFF' stroke-width='1.4' stroke-linecap='round' stroke-linejoin='round' d='M10 12l-2.5 3L10 18M14 12l2.5 3L14 18'/></svg>`,

        font: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><defs><linearGradient id='fntG' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%23A1887F'/><stop offset='1' stop-color='%233E2723'/></linearGradient></defs><path fill='url(%23fntG)' d='${DOC_PATH}'/><path fill='%23FFF' opacity='0.35' d='${DOC_FOLD}'/><text x='12' y='17.5' font-family='Georgia,serif' font-size='8' font-weight='bold' fill='%23FFF' text-anchor='middle'>A</text></svg>`,

        database: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><defs><linearGradient id='dbG' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%234DD0E1'/><stop offset='1' stop-color='%23006064'/></linearGradient></defs><ellipse cx='12' cy='6' rx='8' ry='3' fill='url(%23dbG)'/><path fill='url(%23dbG)' d='M4 6v12c0 1.66 3.58 3 8 3s8-1.34 8-3V6'/><ellipse cx='12' cy='10' rx='8' ry='3' fill='%23FFF' opacity='0.15'/><ellipse cx='12' cy='14' rx='8' ry='3' fill='%23FFF' opacity='0.1'/></svg>`,

        file: `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><defs><linearGradient id='fileG' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='%23BDBDBD'/><stop offset='1' stop-color='%23424242'/></linearGradient></defs><path fill='url(%23fileG)' d='${DOC_PATH}'/><path fill='%23FFF' opacity='0.35' d='${DOC_FOLD}'/></svg>`,
    };

    function getFileIconType(filename, isDir) {
        if (isDir) return 'folder';
        let ext = filename.split('.').pop().toLowerCase();
        if (ext === filename.toLowerCase()) return 'file';
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'ico', 'tiff'].includes(ext)) return 'image';
        if (['zip', 'rar', '7z', 'tar', 'gz', 'xz', 'bz2', 'apk', 'exe', 'msi', 'dmg'].includes(ext)) return 'archive';
        if (['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v'].includes(ext)) return 'video';
        if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'].includes(ext)) return 'audio';
        if (['pdf'].includes(ext)) return 'pdf';
        if (['doc', 'docx'].includes(ext)) return 'word';
        if (['xls', 'xlsx', 'csv'].includes(ext)) return 'excel';
        if (['ppt', 'pptx'].includes(ext)) return 'ppt';
        if (['txt', 'md', 'log', 'json', 'xml', 'yaml', 'yml'].includes(ext)) return 'text';
        if (['js', 'ts', 'java', 'py', 'c', 'cpp', 'cs', 'go', 'rs', 'php', 'html', 'css', 'sh', 'bat'].includes(ext)) return 'code';
        if (['ttf', 'otf', 'woff', 'woff2'].includes(ext)) return 'font';
        if (['db', 'sqlite', 'sql', 'mdb'].includes(ext)) return 'database';
        return 'file';
    }

    let globalStyle = document.createElement('style');
    globalStyle.id = 'iis-global-style';
    globalStyle.textContent = `
        /* ============ 浅色模式 ============ */
        html { color-scheme: light; }
        .iis-table-wrapper { border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); background: #fff; overflow: hidden; }
        .iis-file-table { table-layout: fixed; width: 100%; border-collapse: collapse; font-size: ${CONFIG.tableFontSize}; }
        .iis-file-table th { padding: 12px 16px; background-color: #f8f9fa; border-bottom: 2px solid #dee2e6; color: #495057; font-weight: 600; text-align: left !important; position: relative; white-space: nowrap; cursor: pointer; user-select: none; }
        .iis-file-table th:hover { background-color: #e9ecef; }
        .iis-file-table th:nth-child(2), .iis-file-table th:nth-child(3), .iis-file-table th:nth-child(4), .iis-file-table th:nth-child(5), .iis-file-table th:nth-child(6) { padding-right: 24px; }
        .iis-file-table th:last-child, .iis-file-table td:last-child { padding: 0 4px; cursor: default; }
        .iis-file-table td { padding: 12px 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; border-bottom: 1px solid #eee; }
        .iis-file-table tr:hover td { background-color: #f1f3f5 !important; }
        .iis-resizer { position: absolute; top: 0; right: -6px; width: 12px; height: 100%; cursor: col-resize; z-index: 10; display: flex; align-items: center; justify-content: center; }
        .iis-resizer::after { content: ''; width: 2px; height: 30%; background-color: #dee2e6; border-radius: 2px; transition: all 0.15s; }
        .iis-resizer:hover::after, .iis-resizer.active::after { height: 60%; background-color: #007bff; }

        .iis-file-icon {
            display: inline-block;
            width: 18px; height: 18px;
            background-size: contain;
            background-repeat: no-repeat;
            background-position: center;
            flex-shrink: 0;
        }

        /* ⭐ 修改时间列 */
        .iis-file-table .iis-mtime-text {
            color: ${CONFIG.colors.mtime};
            font-size: ${CONFIG.mtimeFontSize};
            font-family: ${CONFIG.mtimeFontFamily};
        }

        .iis-file-table input[type="time"] {
            width: 108px; height: 30px; font-size: 13px;
            font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
            padding: 4px 4px 4px 8px; border: 1px solid #dee2e6; border-radius: 6px;
            background: #fff; color: #333; text-align: center; outline: none;
            box-sizing: border-box;
            transition: border-color 0.15s, box-shadow 0.15s;
            font-variant-numeric: tabular-nums; font-weight: 500;
        }
        .iis-file-table input[type="time"]:hover { border-color: #adb5bd; }
        .iis-file-table input[type="time"]:focus { border-color: #007bff; box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.15); }

        .iis-file-table input[type="time"]::-webkit-calendar-picker-indicator {
            -webkit-appearance: none;
            appearance: none;
            width: 16px; height: 16px;
            padding: 0; margin: 0;
            cursor: pointer;
            opacity: 0.55;
            background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23555'><path d='M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z'/></svg>") no-repeat center !important;
            background-size: 16px 16px !important;
            transition: opacity 0.15s;
        }
        .iis-file-table input[type="time"]::-webkit-calendar-picker-indicator:hover { opacity: 1; }

        .iis-file-table .iis-duration-text { color: ${CONFIG.colors.duration}; font-weight: bold; }
        .iis-file-table .iis-end-time-text { color: ${CONFIG.colors.endTime}; font-weight: bold; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-variant-numeric: tabular-nums; }

        /* ============ 深色模式 ============ */
        html.dark-mode { color-scheme: dark !important; }
        html.dark-mode, html.dark-mode body { background-color: #1a1a1a !important; color: #e0e0e0 !important; }
        html.dark-mode .iis-table-wrapper { background: #1e1e1e !important; box-shadow: 0 4px 12px rgba(0,0,0,0.4) !important; }
        html.dark-mode .iis-file-table th { background-color: #2d2d2d !important; border-bottom-color: #404040 !important; color: #e0e0e0 !important; }
        html.dark-mode .iis-file-table th:hover { background-color: #3a3a3a !important; }
        html.dark-mode .iis-file-table td { border-bottom-color: #333 !important; color: #ccc !important; }
        html.dark-mode .iis-file-table tr:hover td { background-color: #2a2a2a !important; }
        html.dark-mode .iis-file-table a { color: #4da3ff !important; }
        html.dark-mode .iis-resizer::after { background-color: #555 !important; }
        html.dark-mode #iis-toolbar { background: #2d2d2d !important; border-color: #404040 !important; }
        html.dark-mode #iis-toolbar button { background: #3a3a3a !important; color: #e0e0e0 !important; }
        html.dark-mode #iis-toolbar strong { color: #e0e0e0 !important; }
        html.dark-mode #iis-toolbar a { background: #3a3a3a !important; color: #e0e0e0 !important; }
        html.dark-mode #iis-global-speed, html.dark-mode #iis-global-unit { background: #333 !important; color: #e0e0e0 !important; border-color: #555 !important; }
        html.dark-mode .iis-breadcrumb { color: #e0e0e0 !important; }
        html.dark-mode .iis-breadcrumb a { color: #4da3ff !important; }
        html.dark-mode .iis-breadcrumb .bc-current { color: #4da3ff !important; }
        html.dark-mode .iis-breadcrumb .bc-sep { color: #555 !important; }
        html.dark-mode .iis-folder-tag { color: #aaa !important; }
        html.dark-mode .iis-empty-row { color: #666 !important; }

        html.dark-mode .iis-file-table .iis-mtime-text { color: ${CONFIG.colors.mtimeDark}; }

        html.dark-mode .iis-file-table .iis-duration-text { color: ${CONFIG.colors.durationDark} !important; font-weight: bold; }
        html.dark-mode .iis-file-table .iis-end-time-text { color: ${CONFIG.colors.endTimeDark} !important; font-weight: bold; }

        html.dark-mode .iis-file-table input[type="time"] {
            background: #2a2a2a !important;
            color: #e8e8e8 !important;
            border-color: #555 !important;
        }
        html.dark-mode .iis-file-table input[type="time"]:hover { border-color: #777 !important; }
        html.dark-mode .iis-file-table input[type="time"]:focus {
            border-color: #4da3ff !important;
            box-shadow: 0 0 0 3px rgba(77, 163, 255, 0.25) !important;
        }

        html.dark-mode .iis-file-table input[type="time"]::-webkit-calendar-picker-indicator {
            -webkit-appearance: none;
            appearance: none;
            width: 16px; height: 16px;
            padding: 0; margin: 0;
            cursor: pointer;
            opacity: 0.85;
            background: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23e8e8e8'><path d='M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z'/></svg>") no-repeat center !important;
            background-size: 16px 16px !important;
            filter: none !important;
        }
        html.dark-mode .iis-file-table input[type="time"]::-webkit-calendar-picker-indicator:hover {
            opacity: 1;
        }

        html.dark-mode #iis-toolbar a svg path { stroke: #e0e0e0 !important; }
        html.dark-mode #iis-toolbar button svg path { stroke: #e0e0e0 !important; }
        html.dark-mode .iis-btn-parent svg path { stroke: #FFC107 !important; }
        html.dark-mode .iis-btn-parent svg path[fill="#F2A900"] { fill: #FFC107 !important; }
    `;
    document.documentElement.appendChild(globalStyle);

    if (localStorage.getItem('iis_dark_mode') === 'true') {
        document.documentElement.classList.add('dark-mode');
    }

    let fileEntries = [];
    let defaultTime = "";
    let currentFiles = [];
    let sortState = { key: 'name', asc: true };
    let isResizing = false;

    function formatSize(bytes) {
        if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return bytes + ' B';
    }

    // ⭐ 预计耗时：中文的"X时X分X秒"格式
    function formatDuration(totalSeconds) {
        if (!totalSeconds || totalSeconds === Infinity) return '--';
        let h = Math.floor(totalSeconds / 3600);
        let m = Math.floor((totalSeconds % 3600) / 60);
        let s = Math.floor(totalSeconds % 60);
        let str = '';
        if (h > 0) str += `${h}时`;
        if (m > 0) str += `${m}分`;
        str += `${s}秒`;
        return str;
    }

    function getCurrentTimeString() {
        let d = new Date();
        return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':');
    }

    function parseTimeToSeconds(timeStr) {
        if (!timeStr) return 0;
        let parts = timeStr.split(':');
        if (parts.length < 2) return 0;
        return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + (parts[2] ? parseInt(parts[2], 10) : 0);
    }

    function calculateEndTime(startTimeStr, totalSeconds) {
        if (!startTimeStr || !totalSeconds || totalSeconds === Infinity) return '--';
        let startSec = parseTimeToSeconds(startTimeStr);
        let endSec = startSec + totalSeconds;
        let h = Math.floor(endSec / 3600) % 24;
        let m = Math.floor((endSec % 3600) / 60);
        let s = Math.floor(endSec % 60);
        let dayStr = endSec >= 86400 ? ' (+1天)' : '';
        return [h, m, s].map(n => String(n).padStart(2, '0')).join(':') + dayStr;
    }

    function updateAllTimes() {
        let speedInput = document.getElementById('iis-global-speed');
        let unitSelect = document.getElementById('iis-global-unit');
        if (!speedInput || !unitSelect) return;

        let speed = parseFloat(speedInput.value);
        let unit = unitSelect.value;

        if (isNaN(speed) || speed <= 0) {
            fileEntries.forEach(entry => {
                entry.durationCell.textContent = '--';
                entry.endTimeCell.textContent = '--';
            });
            return;
        }

        let bytesPerSecond = unit === 'MB' ? speed * 1024 * 1024 : speed * 1024;
        fileEntries.forEach(entry => {
            let totalSeconds = entry.bytes / bytesPerSecond;
            entry.durationCell.textContent = formatDuration(totalSeconds);
            entry.endTimeCell.textContent = calculateEndTime(entry.timeInput.value, totalSeconds);
        });
    }

    function getMinWidth(th) {
        let key = th.getAttribute('data-key');
        return CONFIG.columnMinWidths[key] || 10;
    }

    function makeResizable(table) {
        let cols = table.querySelectorAll('col');
        let ths = table.querySelectorAll('th');
        let storageKey = 'iis-table-widths-' + window.location.pathname;
        let savedWidths = JSON.parse(localStorage.getItem(storageKey) || '{}');

        cols.forEach((col, index) => {
            if (savedWidths[index] && ths[index]) {
                let minPct = (getMinWidth(ths[index]) / table.offsetWidth * 100);
                let savedPct = parseFloat(savedWidths[index]);
                if (savedPct < minPct) {
                    col.style.width = minPct.toFixed(2) + '%';
                } else {
                    col.style.width = savedWidths[index];
                }
            }
        });

        ths.forEach((th, index) => {
            if (index === ths.length - 1) return;
            if (th.querySelector('.iis-resizer')) return;

            let resizer = document.createElement('div');
            resizer.className = 'iis-resizer';
            th.appendChild(resizer);

            let startX = 0;
            let startWidths = [];
            let minWidths = [];

            resizer.addEventListener('mousedown', (e) => {
                e.preventDefault();
                e.stopPropagation();
                isResizing = true;
                resizer.classList.add('active');
                startX = e.pageX;
                startWidths = []; minWidths = [];
                ths.forEach((h) => {
                    startWidths.push(h.offsetWidth);
                    minWidths.push(getMinWidth(h));
                });

                document.body.style.cursor = 'col-resize';
                document.body.style.userSelect = 'none';

                function onMouseMove(moveEvent) {
                    let delta = moveEvent.pageX - startX;
                    let currentStartWidth = startWidths[index];
                    let rightIndices = [];
                    for (let i = index + 1; i < ths.length; i++) rightIndices.push(i);

                    let totalRightShrink = 0;
                    let rightShrinkArray = [];
                    for (let i of rightIndices) {
                        let avail = Math.max(0, startWidths[i] - minWidths[i]);
                        rightShrinkArray.push(avail);
                        totalRightShrink += avail;
                    }

                    if (delta > 0 && delta > totalRightShrink) delta = totalRightShrink;
                    if (currentStartWidth + delta < minWidths[index]) delta = minWidths[index] - currentStartWidth;

                    let newWidths = [...startWidths];
                    newWidths[index] = currentStartWidth + delta;

                    if (delta > 0) {
                        for (let k = 0; k < rightIndices.length; k++) {
                            let i = rightIndices[k];
                            if (totalRightShrink > 0) {
                                newWidths[i] = startWidths[i] - (delta * (rightShrinkArray[k] / totalRightShrink));
                            }
                        }
                    } else if (delta < 0) {
                        let needToGrow = -delta;
                        let totalRightWidth = 0;
                        for (let i of rightIndices) totalRightWidth += startWidths[i];
                        for (let i of rightIndices) {
                            if (totalRightWidth > 0) {
                                newWidths[i] = startWidths[i] + (needToGrow * (startWidths[i] / totalRightWidth));
                            }
                        }
                    }

                    for (let i = 0; i < cols.length; i++) cols[i].style.width = newWidths[i] + 'px';
                }

                function onMouseUp() {
                    resizer.classList.remove('active');
                    document.body.style.cursor = '';
                    document.body.style.userSelect = '';
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);

                    let currentWidths = {};
                    let totalWidth = table.offsetWidth;
                    ths.forEach((h, i) => { currentWidths[i] = (h.offsetWidth / totalWidth * 100).toFixed(4) + '%'; });
                    localStorage.setItem(storageKey, JSON.stringify(currentWidths));
                    cols.forEach((c, i) => c.style.width = currentWidths[i]);

                    setTimeout(() => { isResizing = false; }, 50);
                }

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
            });
        });
    }

    function renderRows(tbody, files, table, defaultTime) {
        tbody.innerHTML = '';
        fileEntries = [];

        files.forEach((file) => {
            let sizeDisplay = file.isDir ? '📁 文件夹' : formatSize(file.bytes);

            let iconType = getFileIconType(file.name, file.isDir);
            let iconUrl = ICON_MAP[iconType];

            let timeInputHtml = file.isDir ? `<span class="iis-folder-tag" style="color:${CONFIG.colors.folderTag};">--</span>`
                : `<input type="time" step="1" class="iis-start-time" value="${defaultTime}">`;

            let endTimeHtml = file.isDir ? '--' : '<span class="iis-end-time-text">--</span>';
            let durationHtml = file.isDir ? '--' : '<span class="iis-duration-text">--</span>';

            let mtimeHtml = file.dateTimeStr ? `<span class="iis-mtime-text">${file.dateTimeStr}</span>` : '<span class="iis-mtime-text">--</span>';

            // ⭐ 列顺序：文件名 | 修改时间 | 大小 | 开始时间 | 完成时间 | 预计耗时
            let tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-align: left;">
                    <a href="${file.url}" style="color: ${CONFIG.colors.link}; text-decoration: none; font-weight: 500; display: flex; align-items: center; gap: 8px;">
                        <span class="iis-file-icon" style="background-image: url(&quot;${iconUrl}&quot;);"></span>
                        <span style="overflow: hidden; text-overflow: ellipsis;">${file.name}</span>
                    </a>
                </td>
                <td style="text-align: left;">${mtimeHtml}</td>
                <td style="text-align: right; color: #555;">${sizeDisplay}</td>
                <td style="text-align: center;">${timeInputHtml}</td>
                <td style="text-align: center;">${endTimeHtml}</td>
                <td style="text-align: center;">${durationHtml}</td>
                <td></td>
            `;
            tbody.appendChild(tr);

            if (!file.isDir) {
                let timeInput = tr.querySelector('.iis-start-time');
                let durationCell = tr.querySelector('.iis-duration-text');
                let endTimeCell = tr.querySelector('.iis-end-time-text');
                timeInput.addEventListener('change', updateAllTimes);
                fileEntries.push({ bytes: file.bytes, timeInput, durationCell, endTimeCell });
            }
        });

        makeResizable(table);
        updateAllTimes();
    }

    function buildUI() {
        let pre = document.querySelector('pre');
        let h1 = document.querySelector('h1');

        if (!pre || !h1) return;

        defaultTime = getCurrentTimeString();

        let currentUrl = new URL(window.location.href);
        let host = currentUrl.hostname + (currentUrl.port ? ':' + currentUrl.port : '');
        let pathParts = currentUrl.pathname.split('/').filter(Boolean);
        let homeUrl = currentUrl.origin + '/';
        let parentUrl = pathParts.length > 1 ? currentUrl.origin + '/' + pathParts.slice(0, -1).join('/') + '/' : homeUrl;

        let breadcrumbHtml = `<a href="${homeUrl}" style="color: ${CONFIG.colors.link}; text-decoration: none; font-size: 20px;" title="返回主页">🏠</a>`;
        let tempPath = currentUrl.origin;
        if (pathParts.length === 0) {
            breadcrumbHtml += ` <span class="bc-sep" style="color:#adb5bd;">/</span> <span class="bc-current" style="color:${CONFIG.colors.link}; font-size: 20px; font-weight: bold;">根目录</span>`;
        } else {
            pathParts.forEach((part, index) => {
                tempPath += '/' + part;
                let isLast = index === pathParts.length - 1;
                let displayName = decodeURIComponent(part);
                if (isLast) {
                    breadcrumbHtml += ` <span class="bc-sep" style="color:#adb5bd;">/</span> <span class="bc-current" style="color:${CONFIG.colors.link}; font-size: 20px; font-weight: bold;">📁 ${displayName}</span>`;
                } else {
                    breadcrumbHtml += ` <span class="bc-sep" style="color:#adb5bd;">/</span> <a href="${tempPath}/" style="color: #6c757d; text-decoration: none; font-size: 16px;">${displayName}</a>`;
                }
            });
        }

        let lines = pre.innerHTML.split(/<br\s*\/?>/i);
        currentFiles = [];
        lines.forEach(line => {
            let aMatch = line.match(/<a\s+href="([^"]+)">([^<]+)<\/a>/i);
            if (!aMatch) return;
            let url = aMatch[1], name = aMatch[2];
            if (name.includes('父目录')) return;
            let isDir = url.endsWith('/');

            let dateMatch = line.match(/(\d{4})\/(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})/);
            let dateTimeStr = '';
            if (dateMatch) {
                let y = dateMatch[1];
                let mo = dateMatch[2].padStart(2, '0');
                let d = dateMatch[3].padStart(2, '0');
                let h = dateMatch[4].padStart(2, '0');
                let mi = dateMatch[5].padStart(2, '0');
                dateTimeStr = `${y}/${mo}/${d} ${h}:${mi}`;
            }

            let bytes = 0;
            if (!isDir) {
                let prefix = line.split(/<a\s+href/i)[0];
                let sizeMatch = prefix.match(/(\d+)\s*$/);
                if (sizeMatch) bytes = parseInt(sizeMatch[1], 10);
            }
            currentFiles.push({ name, url, dateTimeStr, bytes, isDir });
        });

        function sortFiles(key) {
            if (sortState.key === key) sortState.asc = !sortState.asc;
            else { sortState.key = key; sortState.asc = true; }

            let speedInput = document.getElementById('iis-global-speed');
            let unitSelect = document.getElementById('iis-global-unit');
            let speed = parseFloat(speedInput?.value || CONFIG.defaultSpeed);
            let unit = unitSelect?.value || CONFIG.defaultUnit;
            let bytesPerSecond = unit === 'MB' ? speed * 1024 * 1024 : speed * 1024;

            currentFiles.sort((a, b) => {
                let valA, valB;
                if (key === 'name') { valA = a.name; valB = b.name; }
                else if (key === 'mtime') { valA = a.dateTimeStr; valB = b.dateTimeStr; }
                else if (key === 'bytes') { valA = a.bytes; valB = b.bytes; }
                else if (key === 'startTime') { valA = a.dateTimeStr; valB = b.dateTimeStr; }
                else if (key === 'duration') { valA = a.bytes / bytesPerSecond; valB = b.bytes / bytesPerSecond; }
                else if (key === 'endTime') {
                    let durA = a.bytes / bytesPerSecond;
                    let durB = b.bytes / bytesPerSecond;
                    valA = parseTimeToSeconds(defaultTime) + durA;
                    valB = parseTimeToSeconds(defaultTime) + durB;
                }
                if (typeof valA === 'string') return sortState.asc ? valA.localeCompare(valB) : valB.localeCompare(valA);
                return sortState.asc ? valA - valB : valB - valA;
            });

            // ⭐ 排序指示器 keys 顺序：name, mtime, bytes, startTime, endTime, duration
            document.querySelectorAll('.iis-file-table th').forEach((th, i) => {
                let indicator = th.querySelector('.sort-indicator');
                if (indicator) indicator.remove();
                let keys = ['name', 'mtime', 'bytes', 'startTime', 'endTime', 'duration'];
                if (keys[i] === sortState.key) {
                    let span = document.createElement('span');
                    span.className = 'sort-indicator';
                    span.textContent = sortState.asc ? ' ▲' : ' ▼';
                    span.style.cssText = `color: ${CONFIG.colors.link}; margin-left: 4px; font-size: 10px;`;
                    th.appendChild(span);
                }
            });

            let tbody = document.querySelector('.iis-file-table tbody');
            let table = document.querySelector('.iis-file-table');
            renderRows(tbody, currentFiles, table, defaultTime);
        }

        let navBtns = `
            <a href="${homeUrl}" class="iis-nav-btn" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px 6px 10px; background: #e9ecef; color: #495057; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500; transition: background 0.2s;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M3 11.5L12 4l9 7.5" stroke="#495057" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M5.5 10v9a1 1 0 0 0 1 1h3.5v-5h4v5h3.5a1 1 0 0 0 1-1v-9" stroke="#495057" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                主页
            </a>
            <a href="${parentUrl}" class="iis-nav-btn iis-btn-parent" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px 6px 10px; background: #e9ecef; color: #495057; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 500; transition: background 0.2s;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z" stroke="#F2A900" stroke-width="1.8" stroke-linejoin="round"/>
                    <path d="M12 9.5l3.5 3.5h-2.2v3.5h-2.6v-3.5H8.5z" fill="#F2A900"/>
                </svg>
                上一级
            </a>
        `;

        let isDark = localStorage.getItem('iis_dark_mode') === 'true';

        let toolbarHTML = `
            <div id="iis-toolbar" style="background: #f8f9fa; padding: 12px 20px; border-radius: 8px; border: 1px solid #dee2e6; display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; box-shadow: 0 2px 6px rgba(0,0,0,0.04); flex-wrap: wrap; gap: 10px;">
                <div style="display: flex; gap: 8px; align-items: center;">${navBtns}</div>
                <div style="display: flex; align-items: center; gap: 10px;">
                    <button id="iis-toggle-theme" style="padding: 6px 12px; background: #e9ecef; color: #495057; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500;">${isDark ? '☀️ 浅色模式' : '🌙 深色模式'}</button>
                    <button id="iis-toggle-original" style="padding: 6px 12px; background: #e9ecef; color: #495057; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; display: inline-flex; align-items: center; gap: 6px;">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M8.5 8L4 12l4.5 4M15.5 8L20 12l-4.5 4M13.5 5l-3 14" stroke="#495057" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        切换原版
                    </button>
                    <strong style="color: #2c3e50; margin-left: 10px;">⚡ 速度：</strong>
                    <input type="number" id="iis-global-speed" value="${CONFIG.defaultSpeed}" style="width:70px; padding:6px 8px; border:1px solid #ced4da; border-radius:4px; outline:none; text-align:center; font-weight: bold; color: #e74c3c;">
                    <select id="iis-global-unit" style="padding:6px; border:1px solid #ced4da; border-radius:4px; outline:none; font-weight: bold;">
                        <option value="KB"${CONFIG.defaultUnit === 'KB' ? ' selected' : ''}>KB/s</option><option value="MB"${CONFIG.defaultUnit === 'MB' ? ' selected' : ''}>MB/s</option>
                    </select>
                </div>
            </div>
        `;

        // ⭐ 列顺序：文件名 | 修改时间 | 大小 | 开始时间 | 完成时间 | 预计耗时
        let tableHTML = `
            <div class="iis-table-wrapper">
                <table class="iis-file-table">
                    <colgroup>
                        <col style="width: ${CONFIG.columnWidths.name};">
                        <col style="width: ${CONFIG.columnWidths.mtime};">
                        <col style="width: ${CONFIG.columnWidths.bytes};">
                        <col style="width: ${CONFIG.columnWidths.startTime};">
                        <col style="width: ${CONFIG.columnWidths.endTime};">
                        <col style="width: ${CONFIG.columnWidths.duration};">
                        <col style="width: ${CONFIG.columnWidths.buffer};">
                    </colgroup>
                    <thead>
                        <tr>
                            <th data-key="name">文件名</th>
                            <th data-key="mtime">修改时间</th>
                            <th data-key="bytes">大小</th>
                            <th data-key="startTime">开始时间</th>
                            <th data-key="endTime">完成时间</th>
                            <th data-key="duration">预计耗时</th>
                            <th style="cursor: default;"></th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
        `;

        let wrapper = document.createElement('div');
        wrapper.id = 'iis-wrapper';
        wrapper.style.cssText = `max-width: ${CONFIG.containerMaxWidth}; margin: 0 auto; padding: ${CONFIG.containerPadding}; font-family: "Microsoft YaHei", system-ui, -apple-system, sans-serif; font-size: ${CONFIG.tableFontSize}; color: #333; box-sizing: border-box;`;
        wrapper.innerHTML = `
            <div class="iis-breadcrumb" style="display: flex; align-items: center; gap: 8px; margin-bottom: 15px; flex-wrap: wrap;">
                ${breadcrumbHtml}
            </div>
            ${toolbarHTML}
            ${tableHTML}
        `;

        document.body.insertBefore(wrapper, document.body.firstChild);

        let tbody = wrapper.querySelector('.iis-file-table tbody');
        let table = wrapper.querySelector('.iis-file-table');
        renderRows(tbody, currentFiles, table, defaultTime);

        wrapper.querySelectorAll('.iis-file-table th[data-key]').forEach(th => {
            th.addEventListener('click', () => {
                if (isResizing) return;
                sortFiles(th.getAttribute('data-key'));
            });
        });

        wrapper.querySelector('#iis-global-speed').addEventListener('input', updateAllTimes);
        wrapper.querySelector('#iis-global-unit').addEventListener('change', updateAllTimes);

        wrapper.querySelector('#iis-toggle-theme').addEventListener('click', function() {
            document.documentElement.classList.toggle('dark-mode');
            let nowDark = document.documentElement.classList.contains('dark-mode');
            this.textContent = nowDark ? '☀️ 浅色模式' : '🌙 深色模式';
            localStorage.setItem('iis_dark_mode', nowDark);
        });

        wrapper.querySelector('#iis-toggle-original').addEventListener('click', () => {
            localStorage.setItem('iis_view_original', 'true');
            location.reload();
        });

        wrapper.querySelectorAll('.iis-nav-btn').forEach(btn => {
            btn.addEventListener('mouseenter', () => btn.style.background = '#dee2e6');
            btn.addEventListener('mouseleave', () => btn.style.background = '#e9ecef');
        });
    }

    function init() {
        try {
            buildUI();
            ['h1', 'hr', 'pre'].forEach(tag => {
                let els = document.querySelectorAll(tag);
                els.forEach(el => el.remove());
            });
        } finally {
            let hide = document.getElementById('iis-hide-native');
            if (hide) hide.remove();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
