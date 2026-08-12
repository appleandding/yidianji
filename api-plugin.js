/**
 * api-plugin.js - 意点机 API 与数据管理插件
 */
(function () {
    // 1. 全局导航控制
    window.openApiAppModal = function () {
        const modal = document.getElementById('api-app-modal');
        if (modal) {
            modal.style.display = 'flex';
            window.backToApiMenu();
        }
    };

    window.closeApiAppModal = function () {
        const modal = document.getElementById('api-app-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    };

    window.openApiSubPanel = function (panelId, titleText) {
        document.getElementById('api-menu-list').style.display = 'none';
        document.querySelectorAll('.api-sub-panel').forEach(p => p.style.display = 'none');
        const targetPanel = document.getElementById(panelId);
        if (targetPanel) {
            targetPanel.style.display = 'flex';
        }
        document.getElementById('api-modal-title').innerText = titleText || '配置';
        // 更改左上角返回按钮功能：返回二级菜单
        document.getElementById('api-nav-back').setAttribute('onclick', 'backToApiMenu()');
    };

    window.backToApiMenu = function () {
        document.getElementById('api-menu-list').style.display = 'flex';
        document.querySelectorAll('.api-sub-panel').forEach(p => p.style.display = 'none');
        document.getElementById('api-modal-title').innerText = 'API 设置';
        // 更改左上角返回按钮功能：关闭窗口返回主屏幕
        document.getElementById('api-nav-back').setAttribute('onclick', 'closeApiAppModal()');
    };

    // 2. DOM 交互与 API 请求绑定
    document.addEventListener('DOMContentLoaded', function () {
        // 拉取模型
        const fetchBtn = document.getElementById('fetch-models-btn');
        if (fetchBtn) {
            fetchBtn.addEventListener('click', async () => {
                const url = (document.getElementById('api-url-input').value || 'https://api.openai.com/v1').trim();
                const key = (document.getElementById('api-key-input').value || '').trim();
                const select = document.getElementById('api-model-select');

                if (!key) {
                    alert('请先输入 API Key');
                    return;
                }

                select.innerHTML = '<option value="">正在拉取模型...</option>';
                try {
                    const res = await fetch(`${url.replace(/\/+$/, '')}/models`, {
                        headers: { 'Authorization': `Bearer ${key}` }
                    });
                    const data = await res.json();
                    if (data && data.data && Array.isArray(data.data)) {
                        select.innerHTML = '';
                        data.data.forEach(m => {
                            const opt = document.createElement('option');
                            opt.value = m.id;
                            opt.innerText = m.id;
                            select.appendChild(opt);
                        });
                        alert('模型拉取成功！');
                    } else {
                        select.innerHTML = '<option value="">未找到有效模型数据</option>';
                    }
                } catch (e) {
                    select.innerHTML = '<option value="">拉取失败</option>';
                    alert('拉取失败，请检查网络或 URL / Key 是否正确');
                }
            });
        }

        // 保存 API 配置
        const saveApiBtn = document.getElementById('save-api-btn');
        if (saveApiBtn) {
            saveApiBtn.addEventListener('click', () => {
                saveStorage('api_url', document.getElementById('api-url-input').value.trim());
                saveStorage('api_key', document.getElementById('api-key-input').value.trim());
                saveStorage('api_model', document.getElementById('api-model-select').value);
                alert('API 配置已成功保存！');
            });
        }

        // 保存 MiniMax 配置
        const saveMmBtn = document.getElementById('save-minimax-btn');
        if (saveMmBtn) {
            saveMmBtn.addEventListener('click', () => {
                saveStorage('minimax_key', document.getElementById('minimax-key-input').value.trim());
                saveStorage('minimax_group', document.getElementById('minimax-group-input').value.trim());
                saveStorage('minimax_voice', document.getElementById('minimax-voice-select').value);
                saveStorage('minimax_custom_voice', document.getElementById('minimax-custom-voice').value.trim());
                alert('MiniMax 配置已成功保存！');
            });
        }

        // 导出数据 JSON
        const exportBtn = document.getElementById('export-json-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', async () => {
                const allData = await getAllStorage();
                const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `yidianji_backup_${Date.now()}.json`;
                a.click();
            });
        }

        // 导入数据 JSON
        const triggerImportBtn = document.getElementById('trigger-import-json-btn');
        const importInput = document.getElementById('import-json-input');
        if (triggerImportBtn && importInput) {
            triggerImportBtn.addEventListener('click', () => importInput.click());
            importInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = async function (evt) {
                        try {
                            const importedObj = JSON.parse(evt.target.result);
                            for (const [k, v] of Object.entries(importedObj)) {
                                saveStorage(k, v);
                            }
                            alert('数据恢复成功，即将自动刷新！');
                            location.reload();
                        } catch (err) {
                            alert('备份文件格式不正确！');
                        }
                    };
                    reader.readAsText(e.target.files[0]);
                }
            });
        }
    });
})();
