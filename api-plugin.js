/**
 * api-plugin.js - 意点机 API 与数据管理插件 (含预设管理与副 API 侧滑折叠)
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
        document.getElementById('api-nav-back').setAttribute('onclick', 'backToApiMenu()');
    };

    window.backToApiMenu = function () {
        document.getElementById('api-menu-list').style.display = 'flex';
        document.querySelectorAll('.api-sub-panel').forEach(p => p.style.display = 'none');
        document.getElementById('api-modal-title').innerText = 'API 设置';
        document.getElementById('api-nav-back').setAttribute('onclick', 'closeApiAppModal()');
    };

    // 2. 通用 API 模型拉取逻辑
    async function fetchModelsForInput(urlInputId, keyInputId, selectId) {
        const url = (document.getElementById(urlInputId).value || 'https://api.openai.com/v1').trim();
        const key = (document.getElementById(keyInputId).value || '').trim();
        const select = document.getElementById(selectId);

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
            alert('拉取失败，请检查 URL 与 Key');
        }
    }

    // 3. 收集与填充当前表单配置数据
    function getApiFormConfig() {
        return {
            main: {
                url: document.getElementById('api-url-input').value.trim(),
                key: document.getElementById('api-key-input').value.trim(),
                model: document.getElementById('api-model-select').value
            },
            sub_memory: {
                enabled: document.getElementById('toggle-memory').checked,
                url: document.getElementById('memory-url-input').value.trim(),
                key: document.getElementById('memory-key-input').value.trim(),
                model: document.getElementById('memory-model-select').value
            },
            sub_vision: {
                enabled: document.getElementById('toggle-vision').checked,
                url: document.getElementById('vision-url-input').value.trim(),
                key: document.getElementById('vision-key-input').value.trim(),
                model: document.getElementById('vision-model-select').value
            },
            sub_image: {
                enabled: document.getElementById('toggle-image').checked,
                url: document.getElementById('image-url-input').value.trim(),
                key: document.getElementById('image-key-input').value.trim(),
                model: document.getElementById('image-model-input').value.trim()
            },
            sub_general: {
                enabled: document.getElementById('toggle-general').checked,
                url: document.getElementById('general-url-input').value.trim(),
                key: document.getElementById('general-key-input').value.trim(),
                model: document.getElementById('general-model-select').value
            }
        };
    }

    function setApiFormConfig(config) {
        if (!config) return;

        // 主 API
        if (config.main) {
            document.getElementById('api-url-input').value = config.main.url || '';
            document.getElementById('api-key-input').value = config.main.key || '';
            if (config.main.model) {
                document.getElementById('api-model-select').innerHTML = `<option value="${config.main.model}">${config.main.model}</option>`;
            }
        }

        // 副 API 辅助更新函数
        const setSub = (type, data) => {
            if (!data) return;
            const toggle = document.getElementById(`toggle-${type}`);
            const body = document.getElementById(`body-${type}`);
            toggle.checked = !!data.enabled;
            if (toggle.checked) {
                body.classList.add('expanded');
            } else {
                body.classList.remove('expanded');
            }

            if (document.getElementById(`${type}-url-input`)) document.getElementById(`${type}-url-input`).value = data.url || '';
            if (document.getElementById(`${type}-key-input`)) document.getElementById(`${type}-key-input`).value = data.key || '';
            
            if (type === 'image') {
                if (document.getElementById('image-model-input')) document.getElementById('image-model-input').value = data.model || '';
            } else {
                if (data.model && document.getElementById(`${type}-model-select`)) {
                    document.getElementById(`${type}-model-select`).innerHTML = `<option value="${data.model}">${data.model}</option>`;
                }
            }
        };

        setSub('memory', config.sub_memory);
        setSub('vision', config.sub_vision);
        setSub('image', config.sub_image);
        setSub('general', config.sub_general);
    }

    // 4. 预设管理与下拉同步
    async function refreshPresetDropdown() {
        const presets = (await getStorage('api_presets')) || [];
        const select = document.getElementById('api-preset-select');
        select.innerHTML = '<option value="">-- 选择或切换保存的预设 --</option>';
        presets.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.innerText = p.name;
            select.appendChild(opt);
        });
    }

    // DOM 加载完成后绑定交互
    document.addEventListener('DOMContentLoaded', function () {
        // 绑定副 API 折叠开关滑动事件
        ['memory', 'vision', 'image', 'general'].forEach(type => {
            const toggle = document.getElementById(`toggle-${type}`);
            const body = document.getElementById(`body-${type}`);
            if (toggle && body) {
                toggle.addEventListener('change', () => {
                    if (toggle.checked) {
                        body.classList.add('expanded');
                    } else {
                        body.classList.remove('expanded');
                    }
                });
            }
        });

        // 绑定各个 API 的“拉取模型”按钮
        const bindFetch = (btnId, urlId, keyId, selectId) => {
            const btn = document.getElementById(btnId);
            if (btn) btn.addEventListener('click', () => fetchModelsForInput(urlId, keyId, selectId));
        };
        bindFetch('fetch-models-main', 'api-url-input', 'api-key-input', 'api-model-select');
        bindFetch('fetch-models-memory', 'memory-url-input', 'memory-key-input', 'memory-model-select');
        bindFetch('fetch-models-vision', 'vision-url-input', 'vision-key-input', 'vision-model-select');
        bindFetch('fetch-models-general', 'general-url-input', 'general-key-input', 'general-model-select');

        // 保存当前 API 完整配置到全局缓存
        const saveAllBtn = document.getElementById('save-all-api-btn');
        if (saveAllBtn) {
            saveAllBtn.addEventListener('click', () => {
                const config = getApiFormConfig();
                saveStorage('current_api_config', config);
                alert('完整 API 配置已永久保存！');
            });
        }

        // 保存为预设
        const savePresetBtn = document.getElementById('save-preset-btn');
        if (savePresetBtn) {
            savePresetBtn.addEventListener('click', async () => {
                const nameInput = document.getElementById('api-preset-name-input');
                const name = nameInput.value.trim() || ('预设 ' + new Date().toLocaleDateString());
                const config = getApiFormConfig();

                let presets = (await getStorage('api_presets')) || [];
                const existIdx = presets.findIndex(p => p.name === name);
                if (existIdx >= 0) {
                    presets[existIdx].config = config;
                } else {
                    presets.push({ id: 'preset_' + Date.now(), name, config });
                }

                await saveStorage('api_presets', presets);
                await refreshPresetDropdown();
                alert(`预设 "${name}" 保存成功！`);
            });
        }

        // 下拉框切换预设
        const presetSelect = document.getElementById('api-preset-select');
        if (presetSelect) {
            presetSelect.addEventListener('change', async (e) => {
                const presetId = e.target.value;
                if (!presetId) return;
                let presets = (await getStorage('api_presets')) || [];
                const target = presets.find(p => p.id === presetId);
                if (target) {
                    setApiFormConfig(target.config);
                    document.getElementById('api-preset-name-input').value = target.name;
                }
            });
        }

        // 随机切换预设
        const randomPresetBtn = document.getElementById('random-preset-btn');
        if (randomPresetBtn) {
            randomPresetBtn.addEventListener('click', async () => {
                let presets = (await getStorage('api_presets')) || [];
                if (presets.length === 0) {
                    alert('暂无保存的预设，请先输入名称并点击保存预设！');
                    return;
                }
                const randomItem = presets[Math.floor(Math.random() * presets.length)];
                setApiFormConfig(randomItem.config);
                document.getElementById('api-preset-name-input').value = randomItem.name;
                document.getElementById('api-preset-select').value = randomItem.id;
                alert(`已随机切换至预设："${randomItem.name}"`);
            });
        }

        // 初始化加载预设列表及恢复当前配置
        setTimeout(async () => {
            await refreshPresetDropdown();
            const currentConfig = await getStorage('current_api_config');
            if (currentConfig) setApiFormConfig(currentConfig);
        }, 300);

        // MiniMax & 备份导出绑定
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
