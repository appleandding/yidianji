/**
 * wechat-plugin.js - 意点机 WeChat 微信插件
 */
(function () {
    let activeCharId = null;
    let activeTab = 1;
    let isAiTyping = false;

    window.openWechatApp = function () {
        let modal = document.getElementById('wechat-app-modal');
        if (modal) {
            modal.classList.add('active');
            renderCharList();
        }
    };

    window.closeWechatApp = function () {
        const modal = document.getElementById('wechat-app-modal');
        if (modal) modal.classList.remove('active');
    };

    // 绑定酒馆卡与表情包输入
    document.addEventListener('DOMContentLoaded', function() {
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
                                charData = { name: file.name.replace('.png',''), description: '酒馆PNG人物卡' };
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
                            alert(`酒馆卡 "${newChar.name}" 导入成功！已自动添加关联。`);
                            renderCharList();
                        } catch(err) {
                            alert('酒馆卡解析失败！');
                        }
                    };
                    reader.readAsText(file);
                }
            });
        }

        const emojiFileInput = document.getElementById('emoji-file-input');
        if (emojiFileInput) {
            emojiFileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    const reader = new FileReader();
                    reader.onload = function(evt) {
                        alert('表情包链接文档导入成功！');
                    };
                    reader.readAsText(e.target.files[0]);
                }
            });
        }
    });

    // Switch Bottom Hearts Tab
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

    // 渲染角色列表
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
            html += `
            <div class="wechat-item ${c.isPinned ? 'pinned' : ''}" onclick="openChatView('${c.id}')">
                <div class="wechat-avatar-box" style="background-image:url(${c.avatar || ''})"></div>
                <div style="flex:1; overflow:hidden;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:12px; font-weight:bold; color:#333;">${c.remark || c.name}</span>
                        <span style="font-size:9px; color:#999;">20:19</span>
                    </div>
                    <div style="font-size:10px; color:#777; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">${lastMsg}</div>
                </div>
                <div class="wechat-slide-actions">
                    <span onclick="event.stopPropagation(); togglePinChar('${c.id}')">${c.isPinned ? '取消置顶' : '置顶'}</span>
                    <span onclick="event.stopPropagation(); deleteChar('${c.id}')" style="background:#e53e3e;">删除</span>
                </div>
            </div>`;
        }
        container.innerHTML = html;
    }

    window.togglePinChar = async function(id) {
        let chars = (await window.getStorage('wechat_chars')) || [];
        const target = chars.find(c => c.id === id);
        if (target) {
            target.isPinned = !target.isPinned;
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

    window.openCharCreateModal = function() {
        document.getElementById('char-modal-overlay').style.display = 'flex';
    };
    window.closeCharCreateModal = function() {
        document.getElementById('char-modal-overlay').style.display = 'none';
    };

    window.saveCharPersona = async function() {
        const name = document.getElementById('char-field-name').value.trim();
        if (!name) { alert('请输入角色姓名！'); return; }
        const newChar = {
            id: 'char_' + Date.now(),
            name: name,
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
        closeCharCreateModal();
        renderCharList();
    };

    window.openTavernImport = function() {
        document.getElementById('tavern-card-input').click();
    };

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

    async function renderChatMessages() {
        const container = document.getElementById('wechat-msg-container');
        if (!container || !activeCharId) return;
        const msgs = (await window.getStorage('wechat_msgs_' + activeCharId)) || [];
        let html = '';
        for (let m of msgs) {
            const isMine = m.sender === 'mine';
            html += `
            <div class="yidian-msg-bubble-row ${isMine ? 'mine' : 'others'}">
                ${!isMine ? `<div class="yidian-chat-avatar" style="background:#ccc;"></div>` : ''}
                <div class="yidian-bubble">${m.content}</div>
                ${isMine ? `<div class="yidian-chat-avatar" style="background:#999;"></div>` : ''}
            </div>`;
        }
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    }

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

    window.triggerAiReply = async function() {
        if (!activeCharId || isAiTyping) return;
        isAiTyping = true;
        const heartBtn = document.getElementById('ai-trigger-heart');
        const headerTitle = document.getElementById('chat-header-title');
        const originalTitle = headerTitle.innerText;

        heartBtn.style.background = '#888';
        heartBtn.style.color = '#fff';
        headerTitle.innerText = '对方正在输入中...';

        setTimeout(async () => {
            let msgs = (await window.getStorage('wechat_msgs_' + activeCharId)) || [];
            msgs.push({ sender: 'others', content: '与你的每一天，我也都很开心呀。', time: Date.now() });
            await window.saveStorage('wechat_msgs_' + activeCharId, msgs);

            heartBtn.style.background = 'transparent';
            heartBtn.style.color = '#333';
            headerTitle.innerText = originalTitle;
            isAiTyping = false;
            renderChatMessages();
        }, 1500);
    };

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

    window.triggerBatchEmojiImport = function() {
        const links = prompt('粘贴表情包批量链接（支持 名字:URL 或 名字 URL 格式，每行一个）：');
        if (links) alert('表情包批量导入成功！');
    };

    window.triggerBatchEmojiFile = function() {
        document.getElementById('emoji-file-input').click();
    };

    window.openCharSettingsView = function() {
        document.getElementById('wechat-char-settings-view').style.display = 'flex';
        switchSettingTab('persona');
    };

    window.closeCharSettingsView = function() {
        document.getElementById('wechat-char-settings-view').style.display = 'none';
    };

    window.switchSettingTab = function(tab, elem) {
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
            content.innerHTML = `
            <div class="sub-api-card">
                <div class="glass-input-group">
                    <label class="glass-input-label">上文读取记忆条数 (上限 2000)</label>
                    <input class="glass-input" value="100">
                </div>
                <div class="glass-input-group" style="margin-top:8px;">
                    <label class="glass-input-label">总结记忆条数层</label>
                    <input class="glass-input" value="10">
                </div>
                <div style="margin-top:12px; font-size:11px; font-weight:bold;">记忆总结记录</div>
                <div style="background:#fff; border-radius:12px; padding:10px; margin-top:6px; font-size:10px; color:#444;">
                    两者相伴共度了愉快的下午...
                    <div style="display:flex; justify-content:space-between; margin-top:6px; font-size:8.5px; color:#888;">
                        <span>182 字</span>
                        <span style="cursor:pointer;">✎ 编辑</span>
                    </div>
                </div>
            </div>`;
        }
    };
})();
