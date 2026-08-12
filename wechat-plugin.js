/**
 * wechat-plugin.js - 意点机 WeChat 插件 (真实 API 对接、真实 AI 记忆总结、触控划出置顶)
 */
(function () {
    let activeCharId = null;
    let activeTab = 1;
    let isAiTyping = false;

    // 打开/关闭微信
    window.openWechatApp = function () {
        const modal = document.getElementById('wechat-app-modal');
        if (modal) {
            modal.style.display = 'flex';
            renderCharList();
        }
    };

    window.closeWechatApp = function () {
        const modal = document.getElementById('wechat-app-modal');
        if (modal) modal.style.display = 'none';
    };

    // 初始化事件监听
    document.addEventListener('DOMContentLoaded', function () {
        const tavernInput = document.getElementById('tavern-card-input');
        if (tavernInput) {
            tavernInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    const reader = new FileReader();
                    reader.onload = async function(evt) {
                        try {
                            let charData = {};
                            if (file.name.endsWith('.json')) {
                                charData = JSON.parse(evt.target.result);
                            } else {
                                charData = { name: file.name.replace('.png',''), description: '酒馆PNG人物卡人设' };
                            }
                            const newChar = {
                                id: 'char_' + Date.now(),
                                name: charData.name || charData.ch_name || '酒馆角色',
                                remark: charData.name || '酒馆角色',
                                gender: '女',
                                persona: charData.description || charData.personality || '',
                                isPinned: false,
                                isMuted: false
                            };
                            let chars = (await window.getStorage('wechat_chars')) || [];
                            chars.push(newChar);
                            await window.saveStorage('wechat_chars', chars);
                            alert(`酒馆卡 "${newChar.name}" 导入成功！已加入列表。`);
                            renderCharList();
                        } catch(err) {
                            alert('酒馆卡解析失败！');
                        }
                    };
                    reader.readAsText(file);
                }
            });
        }
    });

    // 切换底栏 Tab
    window.switchWechatTab = function(idx) {
        activeTab = idx;
        document.querySelectorAll('.wechat-tab-item').forEach((item, i) => {
            if (i + 1 === idx) {
                item.classList.add('active');
                item.querySelector('.heart-tab-icon').innerHTML = '♥<span class="sub-hearts">♥♥</span>';
            } else {
                item.classList.remove('active');
                item.querySelector('.heart-tab-icon').innerHTML = '♡';
            }
        });
    };

    // 渲染联系人列表 (含向左滑动置顶/免打扰/删除)
    async function renderCharList() {
        const container = document.getElementById('wechat-char-list');
        if (!container) return;

        let chars = (await window.getStorage('wechat_chars')) || [];
        if (chars.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:30px; font-size:11px; color:#888;">暂无角色，点击右上角 + 创建人设或 ☰ 导入酒馆卡</div>';
            return;
        }

        chars.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

        let html = '';
        for (let c of chars) {
            const msgs = (await window.getStorage('wechat_msgs_' + c.id)) || [];
            const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1].content : '尚无消息';
            const avatarBg = c.avatar ? `background-image:url(${c.avatar})` : 'background:#ccc';

            html += `
            <div class="wechat-item-wrapper" id="char-wrap-${c.id}">
                <div class="wechat-item ${c.isPinned ? 'pinned' : ''}" onclick="openChatView('${c.id}')" ontouchstart="handleTouchStart(event, '${c.id}')" ontouchmove="handleTouchMove(event, '${c.id}')">
                    <div class="wechat-avatar-box" style="${avatarBg}"></div>
                    <div style="flex:1; overflow:hidden;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <span style="font-size:12px; font-weight:bold; color:#333;">${c.remark || c.name} ${c.isMuted ? '🔕' : ''}</span>
                            <span style="font-size:9px; color:#999;">20:19</span>
                        </div>
                        <div style="font-size:10px; color:#777; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">${lastMsg}</div>
                    </div>
                </div>
                <div class="wechat-slide-actions" id="actions-${c.id}">
                    <span class="action-pin" onclick="togglePinChar('${c.id}')">${c.isPinned ? '取消置顶' : '置顶'}</span>
                    <span class="action-mute" onclick="toggleMuteChar('${c.id}')">${c.isMuted ? '取消静音' : '免打扰'}</span>
                    <span class="action-del" onclick="deleteChar('${c.id}')">删除</span>
                </div>
            </div>`;
        }
        container.innerHTML = html;
    }

    // 触控划出动作处理
    let startX = 0;
    window.handleTouchStart = function(e, id) { startX = e.touches[0].clientX; };
    window.handleTouchMove = function(e, id) {
        const moveX = e.touches[0].clientX;
        const diff = startX - moveX;
        const actions = document.getElementById('actions-' + id);
        if (actions) {
            if (diff > 40) {
                actions.style.display = 'flex';
            } else if (diff < -40) {
                actions.style.display = 'none';
            }
        }
    };

    window.togglePinChar = async function(id) {
        let chars = (await window.getStorage('wechat_chars')) || [];
        const target = chars.find(c => c.id === id);
        if (target) {
            target.isPinned = !target.isPinned;
            await window.saveStorage('wechat_chars', chars);
            renderCharList();
        }
    };

    window.toggleMuteChar = async function(id) {
        let chars = (await window.getStorage('wechat_chars')) || [];
        const target = chars.find(c => c.id === id);
        if (target) {
            target.isMuted = !target.isMuted;
            await window.saveStorage('wechat_chars', chars);
            renderCharList();
        }
    };

    window.deleteChar = async function(id) {
        if (confirm('确认删除此角色及全部对话记录？')) {
            let chars = (await window.getStorage('wechat_chars')) || [];
            chars = chars.filter(c => c.id !== id);
            await window.saveStorage('wechat_chars', chars);
            renderCharList();
        }
    };

    // 新增人设
    window.openCharCreateModal = function() {
        document.getElementById('char-modal-overlay').style.display = 'flex';
    };
    window.closeCharCreateModal = function() {
        document.getElementById('char-modal-overlay').style.display = 'none';
    };

    let tempUploadedCharAvatar = '';
    window.uploadCharAvatar = function() {
        const input = document.getElementById('global-file-input');
        input.onchange = function(e) {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    tempUploadedCharAvatar = evt.target.result;
                    const preview = document.getElementById('char-avatar-preview');
                    preview.style.backgroundImage = `url(${tempUploadedCharAvatar})`;
                    preview.innerText = '';
                };
                reader.readAsDataURL(e.target.files[0]);
            }
        };
        input.click();
    };

    window.saveCharPersona = async function() {
        const name = document.getElementById('char-field-name').value.trim();
        if (!name) { alert('请输入角色姓名！'); return; }
        const newChar = {
            id: 'char_' + Date.now(),
            name: name,
            avatar: tempUploadedCharAvatar,
            remark: document.getElementById('char-field-remark').value.trim() || name,
            gender: document.getElementById('char-field-gender').value.trim() || '女',
            nickname: document.getElementById('char-field-nickname').value.trim(),
            age: document.getElementById('char-field-age').value.trim(),
            birthday: document.getElementById('char-field-birthday').value.trim(),
            mbti: document.getElementById('char-field-mbti').value.trim(),
            netnames: document.getElementById('char-field-netnames').value.trim(),
            identity: document.getElementById('char-field-identity').value.trim(),
            persona: document.getElementById('char-field-persona').value.trim(),
            isPinned: false
        };

        let chars = (await window.getStorage('wechat_chars')) || [];
        chars.push(newChar);
        await window.saveStorage('wechat_chars', chars);
        tempUploadedCharAvatar = '';
        closeCharCreateModal();
        renderCharList();
    };

    window.openTavernImport = function() {
        document.getElementById('tavern-card-input').click();
    };

    // 打开全屏聊天视图
    window.openChatView = async function(charId) {
        activeCharId = charId;
        const chars = (await window.getStorage('wechat_chars')) || [];
        const target = chars.find(c => c.id === charId);
        document.getElementById('chat-header-title').innerText = target ? (target.remark || target.name) : '聊天';
        document.getElementById('wechat-chat-view').style.display = 'flex';
        renderChatMessages();
    };

    window.closeChatView = function() {
        document.getElementById('wechat-chat-view').style.display = 'none';
        renderCharList();
    };

    // 渲染消息列表（真正的角色头像与个人头像）
    async function renderChatMessages() {
        const container = document.getElementById('wechat-msg-container');
        if (!container) return;

        const chars = (await window.getStorage('wechat_chars')) || [];
        const char = chars.find(c => c.id === activeCharId) || {};
        const charAvatarStyle = char.avatar ? `background-image:url(${char.avatar}); background-size:cover;` : 'background:#ccc;';
        
        // 我的头像 (优先读取上传的用户头像)
        const myAvatar = (await window.getStorage('img_img_angel_avatar')) || (await window.getStorage('img_img_couple_him')) || '';
        const myAvatarStyle = myAvatar ? `background-image:url(${myAvatar}); background-size:cover;` : 'background:#888;';

        const msgs = (await window.getStorage('wechat_msgs_' + activeCharId)) || [];
        let html = '';
        for (let m of msgs) {
            const isMine = m.sender === 'mine';
            html += `
            <div class="yidian-msg-bubble-row ${isMine ? 'mine' : 'others'}">
                ${!isMine ? `<div class="yidian-chat-avatar" style="${charAvatarStyle}"></div>` : ''}
                <div class="yidian-bubble">${m.content}</div>
                ${isMine ? `<div class="yidian-chat-avatar" style="${myAvatarStyle}"></div>` : ''}
            </div>`;
        }
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    }

    // 发送用户文字消息
    window.sendChatMessage = async function() {
        const input = document.getElementById('wechat-msg-input');
        const val = input.value.trim();
        if (!val || !activeCharId) return;

        let msgs = (await window.getStorage('wechat_msgs_' + activeCharId)) || [];
        msgs.push({ sender: 'mine', content: val, time: Date.now() });
        await window.saveStorage('wechat_msgs_' + activeCharId, msgs);
        input.value = '';
        renderChatMessages();
    };

    // 核心重构：调用真正的第三方 API 进行 AI 对话回复
    window.triggerAiReply = async function() {
        if (!activeCharId || isAiTyping) return;

        const chars = (await window.getStorage('wechat_chars')) || [];
        const char = chars.find(c => c.id === activeCharId);
        if (!char) return;

        // 获取用户配置的 API
        const apiConfig = (await window.getStorage('current_api_config')) || {};
        let config = (apiConfig.sub_chat && apiConfig.sub_chat.enabled) ? apiConfig.sub_chat : (apiConfig.main || {});

        if (!config.url || !config.key) {
            alert('请先在「API 设置」应用中配置 API Base URL 与 Key！');
            return;
        }

        isAiTyping = true;
        const heartBtn = document.getElementById('ai-trigger-heart');
        const headerTitle = document.getElementById('chat-header-title');
        const originalTitle = headerTitle.innerText;

        heartBtn.style.background = '#888';
        heartBtn.style.color = '#fff';
        headerTitle.innerText = '对方正在输入中...';

        try {
            // 打包系统 Prompt (人设 + 记忆总结)
            let systemPrompt = `你现在扮演角色：${char.name}。\n`;
            if (char.remark) systemPrompt += `用户对你的备注：${char.remark}\n`;
            if (char.gender) systemPrompt += `性别：${char.gender}\n`;
            if (char.identity) systemPrompt += `身份：${char.identity}\n`;
            if (char.persona) systemPrompt += `人设详细设定：${char.persona}\n`;

            const memories = (await window.getStorage('wechat_memories_' + activeCharId)) || [];
            if (memories.length > 0) {
                systemPrompt += `\n【历史记忆总结】:\n` + memories.map(m => m.text).join('\n');
            }

            // 读取上下文消息条数
            const msgs = (await window.getStorage('wechat_msgs_' + activeCharId)) || [];
            const limit = parseInt((await window.getStorage('wechat_mem_limit_' + activeCharId)) || 100);
            const recentMsgs = msgs.slice(-limit);

            const payloadMessages = [{ role: 'system', content: systemPrompt }];
            recentMsgs.forEach(m => {
                payloadMessages.push({
                    role: m.sender === 'mine' ? 'user' : 'assistant',
                    content: m.content
                });
            });

            // 真正的 API 发送请求
            const endpoint = `${config.url.replace(/\/+$/, '')}/chat/completions`;
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${config.key}`
                },
                body: JSON.stringify({
                    model: config.model || 'gpt-3.5-turbo',
                    messages: payloadMessages,
                    temperature: config.temperature !== undefined ? config.temperature : 0.7
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`[${res.status}]: ${errText}`);
            }

            const data = await res.json();
            if (data.choices && data.choices[0] && data.choices[0].message) {
                const aiReplyText = data.choices[0].message.content;
                msgs.push({ sender: 'others', content: aiReplyText, time: Date.now() });
                await window.saveStorage('wechat_msgs_' + activeCharId, msgs);
            } else {
                throw new Error('返回无有效 choices 内容');
            }
        } catch (err) {
            alert('真实 API 请求失败: ' + err.message);
        } finally {
            heartBtn.style.background = 'transparent';
            heartBtn.style.color = '#333';
            headerTitle.innerText = originalTitle;
            isAiTyping = false;
            renderChatMessages();
        }
    };

    // 扩展与表情包面板控制
    window.togglePlusPanel = function() {
        const p = document.getElementById('wechat-plus-panel');
        p.style.display = p.style.display === 'none' ? 'grid' : 'none';
        document.getElementById('wechat-emoji-panel').style.display = 'none';
    };

    window.toggleEmojiPanel = function() {
        const p = document.getElementById('wechat-emoji-panel');
        p.style.display = p.style.display === 'none' ? 'flex' : 'none';
        document.getElementById('wechat-plus-panel').style.display = 'none';
    };

    // 设置菜单 (右上角多功能)
    window.openCharSettingsView = function() {
        document.getElementById('wechat-char-settings-view').style.display = 'flex';
        switchSettingTab('persona');
    };
    window.closeCharSettingsView = function() {
        document.getElementById('wechat-char-settings-view').style.display = 'none';
    };

    window.switchSettingTab = async function(tab, elem) {
        if (elem) {
            document.querySelectorAll('.setting-tab').forEach(t => t.classList.remove('active'));
            elem.classList.add('active');
        }
        const content = document.getElementById('setting-tab-content');
        if (tab === 'other' || tab === 'style') {
            content.innerHTML = '<div style="text-align:center; margin-top:40px; font-size:11px; color:#888;">暂时未开发</div>';
        } else if (tab === 'persona') {
            content.innerHTML = `
            <div class="sub-api-card">
                <div style="font-size:12px; font-weight:bold; margin-bottom:8px;">绑定的世界书分类条目</div>
                <div style="font-size:11px; color:#555;">关联世界书：通用世界书 (已开启)</div>
            </div>`;
        } else if (tab === 'memory') {
            const memories = (await window.getStorage('wechat_memories_' + activeCharId)) || [];
            let memoriesHtml = memories.map((m, idx) => `
                <div style="background:#fff; border-radius:12px; padding:10px; margin-top:8px; font-size:10px; color:#444; box-shadow:0 2px 6px rgba(0,0,0,0.02);">
                    ${m.text}
                    <div style="display:flex; justify-content:space-between; margin-top:6px; font-size:8.5px; color:#888;">
                        <span>${m.text.length} 字</span>
                        <span style="cursor:pointer;" onclick="editMemorySummary(${idx})">✎ 编辑</span>
                    </div>
                </div>
            `).join('');

            content.innerHTML = `
            <div class="sub-api-card">
                <div class="glass-input-group">
                    <label class="glass-input-label">上文读取记忆条数 (上限 2000)</label>
                    <input class="glass-input" id="mem-limit-input" value="100">
                </div>
                <div class="glass-input-group" style="margin-top:8px;">
                    <label class="glass-input-label">总结记忆条数层</label>
                    <input class="glass-input" id="mem-layer-input" value="10">
                </div>
                <button class="glass-btn" style="margin-top:10px;" onclick="generateRealMemorySummary()">生成/总结当前记忆</button>
                <div style="margin-top:14px; font-size:11px; font-weight:bold;">历史记忆总结记录</div>
                <div id="memory-cards-container">${memoriesHtml || '<div style="font-size:10px; color:#888; margin-top:6px;">暂无记忆总结</div>'}</div>
            </div>`;
        }
    };

    // 真正用 API 总结记忆
    window.generateRealMemorySummary = async function() {
        if (!activeCharId) return;
        const apiConfig = (await window.getStorage('current_api_config')) || {};
        let config = (apiConfig.sub_memory && apiConfig.sub_memory.enabled) ? apiConfig.sub_memory : (apiConfig.main || {});

        if (!config.url || !config.key) {
            alert('请先在「API 设置」中配置记忆总结 API！');
            return;
        }

        const msgs = (await window.getStorage('wechat_msgs_' + activeCharId)) || [];
        if (msgs.length === 0) { alert('当前尚无对话消息，无法总结'); return; }

        alert('正在调用 API 进行记忆总结，请稍候...');
        try {
            const promptText = msgs.map(m => (m.sender === 'mine' ? '用户:' : '角色:') + m.content).join('\n');
            const endpoint = `${config.url.replace(/\/+$/, '')}/chat/completions`;
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${config.key}` },
                body: JSON.stringify({
                    model: config.model || 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: '请将以下聊天对话精炼总结为 200~800 字的关键核心记忆：' },
                        { role: 'user', content: promptText }
                    ]
                })
            });

            const data = await res.json();
            if (data.choices && data.choices[0] && data.choices[0].message) {
                const summary = data.choices[0].message.content;
                let memories = (await window.getStorage('wechat_memories_' + activeCharId)) || [];
                memories.push({ text: summary, time: Date.now() });
                await window.saveStorage('wechat_memories_' + activeCharId, memories);
                alert('真实记忆总结生成成功！');
                switchSettingTab('memory');
            }
        } catch (e) {
            alert('记忆总结生成失败: ' + e.message);
        }
    };
})();
