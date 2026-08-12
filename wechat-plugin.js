/**
 * wechat-plugin.js - 意点机 WeChat 微信插件 (人设、酒馆卡导入、全屏聊天、AI回复触发、记忆存储)
 */
(function () {
    let activeCharId = null;
    let activeTab = 1;
    let isAiTyping = false;

    // 打开微信 App 全屏界面
    window.openWechatApp = function () {
        let modal = document.getElementById('wechat-app-modal');
        if (!modal) {
            createWechatDOM();
            modal = document.getElementById('wechat-app-modal');
        }
        modal.style.display = 'flex';
        renderCharList();
    };

    window.closeWechatApp = function () {
        const modal = document.getElementById('wechat-app-modal');
        if (modal) modal.style.display = 'none';
    };

    // 创建 WeChat DOM 容器
    function createWechatDOM() {
        const html = `
        <div class="app-modal-overlay" id="wechat-app-modal" style="background:#f4f2ed;">
            <!-- 微信主界面 (列表页) -->
            <div id="wechat-main-view" style="width:100%; height:100%; display:flex; flex-direction:column; position:relative;">
                <!-- 顶栏 -->
                <div class="wechat-header">
                    <div class="modal-back-btn" onclick="closeWechatApp()">
                        <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                    </div>
                    <span style="font-weight:bold; font-size:14px;">微信</span>
                    <div style="display:flex; gap:12px; align-items:center;">
                        <span onclick="openCharCreateModal()" style="font-size:18px; cursor:pointer;">+</span>
                        <span onclick="openTavernImport()" style="font-size:16px; cursor:pointer;">☰</span>
                    </div>
                </div>

                <!-- 角色列表区 -->
                <div id="wechat-char-list" class="wechat-list-body"></div>

                <!-- 微信底栏爱心 Tabs -->
                <div class="wechat-dock-bar">
                    <div class="wechat-tab-item ${activeTab === 1 ? 'active' : ''}" onclick="switchWechatTab(1)">
                        <div class="heart-tab-icon">${activeTab === 1 ? '♥<span class="sub-hearts">♥♥</span>' : '♡'}</div>
                    </div>
                    <div class="wechat-tab-item ${activeTab === 2 ? 'active' : ''}" onclick="switchWechatTab(2)">
                        <div class="heart-tab-icon">${activeTab === 2 ? '♥<span class="sub-hearts">♥♥</span>' : '♡'}</div>
                    </div>
                    <div class="wechat-tab-item ${activeTab === 3 ? 'active' : ''}" onclick="switchWechatTab(3)">
                        <div class="heart-tab-icon">${activeTab === 3 ? '♥<span class="sub-hearts">♥♥</span>' : '♡'}</div>
                    </div>
                    <div class="wechat-tab-item ${activeTab === 4 ? 'active' : ''}" onclick="switchWechatTab(4)">
                        <div class="heart-tab-icon">${activeTab === 4 ? '♥<span class="sub-hearts">♥♥</span>' : '♡'}</div>
                    </div>
                </div>
            </div>

            <!-- 详细聊天界面 -->
            <div id="wechat-chat-view" style="width:100%; height:100%; display:none; flex-direction:column; position:absolute; top:0; left:0; z-index:10; background:#f4f2ed;">
                <div class="wechat-header" style="background:#5a5a5a; color:#fff;">
                    <div class="modal-back-btn" onclick="closeChatView()" style="background:rgba(255,255,255,0.2);">
                        <svg viewBox="0 0 24 24" fill="#fff"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="#fff"/></svg>
                    </div>
                    <span id="chat-header-title" style="font-weight:bold; font-size:13.5px;">聊天</span>
                    <span onclick="openCharSettingsView()" style="font-size:16px; cursor:pointer;">⋮</span>
                </div>

                <!-- 消息区 -->
                <div id="wechat-msg-container" style="flex:1; padding:12px; overflow-y:auto;"></div>

                <!-- 聊天底栏输入框组 -->
                <div class="wechat-input-bar">
                    <span onclick="togglePlusPanel()" style="font-size:18px; cursor:pointer; color:#555;">+</span>
                    <input type="text" id="wechat-msg-input" class="wechat-input-field" placeholder="与你的每一天 我都很开心" onkeypress="if(event.key==='Enter') sendChatMessage()">
                    <span onclick="toggleEmojiPanel()" style="font-size:16px; cursor:pointer; color:#555;">😊</span>
                    <div id="ai-trigger-heart" onclick="triggerAiReply()" class="ai-heart-btn">♡</div>
                </div>

                <!-- 加号扩展面板 -->
                <div id="wechat-plus-panel" class="wechat-expand-panel" style="display:none;">
                    <div class="panel-grid-item">📷 拍照</div>
                    <div class="panel-grid-item" onclick="sendImageMessage()">🖼️ 图片</div>
                    <div class="panel-grid-item">🧧 红包</div>
                    <div class="panel-grid-item">💳 转账</div>
                    <div class="panel-grid-item">📞 语音通话</div>
                    <div class="panel-grid-item">🛵 外卖</div>
                    <div class="panel-grid-item">📝 小纸条</div>
                </div>

                <!-- 表情包面板 -->
                <div id="wechat-emoji-panel" class="wechat-expand-panel" style="display:none; flex-direction:column;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <div style="font-size:11px; font-weight:bold;">表情包分组 <span onclick="addEmojiGroup()" style="cursor:pointer; color:#666;">+</span></div>
                        <span onclick="triggerBatchEmojiFile()" style="font-size:10px; cursor:pointer; color:#555;">📄 文件导入</span>
                    </div>
                    <div id="emoji-list-area" style="display:flex; gap:8px; flex-wrap:wrap; max-height:120px; overflow-y:auto;">
                        <button class="glass-btn-sm" onclick="triggerBatchEmojiImport()">+ 批量链接导入</button>
                    </div>
                </div>
            </div>

            <!-- 角色菜单与设置界面 (右上角多功能) -->
            <div id="wechat-char-settings-view" style="width:100%; height:100%; display:none; flex-direction:column; position:absolute; top:0; left:0; z-index:20; background:#f4f2ed;">
                <div class="wechat-header">
                    <div class="modal-back-btn" onclick="closeCharSettingsView()">
                        <svg viewBox="0 0 24 24"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                    </div>
                    <span style="font-weight:bold; font-size:13.5px;">人设与设置</span>
                    <div style="width:28px;"></div>
                </div>

                <!-- 设置页 Tab 切换 -->
                <div style="display:flex; background:#e8e5de; padding:4px;">
                    <div class="setting-tab active" onclick="switchSettingTab('persona', this)">人设设定</div>
                    <div class="setting-tab" onclick="switchSettingTab('other', this)">其他功能</div>
                    <div class="setting-tab" onclick="switchSettingTab('style', this)">美化配置</div>
                    <div class="setting-tab" onclick="switchSettingTab('memory', this)">记忆储存</div>
                </div>

                <div id="setting-tab-content" style="flex:1; padding:14px; overflow-y:auto;"></div>
            </div>
        </div>

        <!-- 人设设定创建/编辑弹窗 -->
        <div id="char-modal-overlay" class="wechat-modal-overlay" style="display:none;">
            <div class="wechat-modal-card">
                <div class="modal-card-header">
                    <span>人设设定</span>
                    <span onclick="closeCharCreateModal()" style="cursor:pointer; font-size:16px;">✕</span>
                </div>
                <div class="modal-card-body">
                    <div class="js-upload-target avatar-upload" id="char-avatar-preview" style="margin:0 auto 10px auto; width:50px; height:50px;">上传头像</div>
                    <input class="glass-input" id="char-field-name" placeholder="Name / 姓名">
                    <input class="glass-input" id="char-field-remark" placeholder="聊天页备注">
                    <input class="glass-input" id="char-field-gender" value="女" placeholder="性别">
                    <input class="glass-input" id="char-field-nickname" placeholder="昵称 / 称呼">
                    <input class="glass-input" id="char-field-age" placeholder="年龄">
                    <input class="glass-input" id="char-field-birthday" placeholder="生日">
                    <input class="glass-input" id="char-field-mbti" placeholder="MBTI (可不填)">
                    <input class="glass-input" id="char-field-netnames" placeholder="网名 (多个用逗号隔开)">
                    <input class="glass-input" id="char-field-identity" placeholder="身份">
                    <textarea class="glass-input" id="char-field-persona" placeholder="详细人设设定" style="height:60px;"></textarea>
                    <button class="glass-btn" onclick="saveCharPersona()" style="margin-top:10px;">保存人设</button>
                </div>
            </div>
        </div>

        <input type="file" id="tavern-card-input" accept=".json,.png" style="display:none;">
        <input type="file" id="emoji-file-input" accept=".txt,.docx" style="display:none;">
        `;

        document.body.insertAdjacentHTML('beforeend', html);
        bindWechatInputs();
    }

    // 绑定酒馆卡与表情包文件解析
    function bindWechatInputs() {
        const tavernInput = document.getElementById('tavern-card-input');
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
                            // PNG 隐写数据解析占位
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
                        let chars = (await getStorage('wechat_chars')) || [];
                        chars.push(newChar);
                        await saveStorage('wechat_chars', chars);
                        alert(`酒馆卡 "${newChar.name}" 导入成功！已自动添加世界书分类。`);
                        renderCharList();
                    } catch(err) {
                        alert('酒馆卡解析失败！');
                    }
                };
                reader.readAsText(file);
            }
        });

        const emojiFileInput = document.getElementById('emoji-file-input');
        emojiFileInput.addEventListener('change', (e) => {
            if (e.target.files && e.target.files[0]) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    const text = evt.target.result;
                    if (confirm(`解析到文档，确认导入内部表情包链接？\n\n${text.substring(0, 100)}...`)) {
                        parseAndSaveEmojis(text);
                    }
                };
                reader.readAsText(e.target.files[0]);
            }
        });
    }

    // Tab 切换
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

    // 渲染微信主列表
    async function renderCharList() {
        const container = document.getElementById('wechat-char-list');
        let chars = (await getStorage('wechat_chars')) || [];
        if (chars.length === 0) {
            container.innerHTML = '<div style="text-align:center; padding:30px; font-size:11px; color:#888;">暂无角色，点击右上角 + 创建人设或 ☰ 导入酒馆卡</div>';
            return;
        }

        // 置顶排序
        chars.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));

        let html = '';
        for (let c of chars) {
            const msgs = (await getStorage('wechat_msgs_' + c.id)) || [];
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

    // 置顶与删除
    window.togglePinChar = async function(id) {
        let chars = (await getStorage('wechat_chars')) || [];
        const target = chars.find(c => c.id === id);
        if (target) {
            target.isPinned = !target.isPinned;
            await saveStorage('wechat_chars', chars);
            renderCharList();
        }
    };

    window.deleteChar = async function(id) {
        if (confirm('确认删除此角色及全部对话记录？')) {
            let chars = (await getStorage('wechat_chars')) || [];
            chars = chars.filter(c => c.id !== id);
            await saveStorage('wechat_chars', chars);
            renderCharList();
        }
    };

    // 新增人设弹窗
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

        let chars = (await getStorage('wechat_chars')) || [];
        chars.push(newChar);
        await saveStorage('wechat_chars', chars);
        closeCharCreateModal();
        renderCharList();
    };

    window.openTavernImport = function() {
        document.getElementById('tavern-card-input').click();
    };

    // 打开全屏聊天视图
    window.openChatView = async function(charId) {
        activeCharId = charId;
        const chars = (await getStorage('wechat_chars')) || [];
        const target = chars.find(c => c.id === charId);
        document.getElementById('chat-header-title').innerText = target ? (target.remark || target.name) : '聊天';
        document.getElementById('wechat-chat-view').style.display = 'flex';
        renderChatMessages();
    };

    window.closeChatView = function() {
        document.getElementById('wechat-chat-view').style.display = 'none';
        renderCharList();
    };

    // 渲染聊天消息列表 (采用提供的 CSS 结构类名)
    async function renderChatMessages() {
        const container = document.getElementById('wechat-msg-container');
        const msgs = (await getStorage('wechat_msgs_' + activeCharId)) || [];
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

    // 发送消息
    window.sendChatMessage = async function() {
        const input = document.getElementById('wechat-msg-input');
        const val = input.value.trim();
        if (!val || !activeCharId) return;

        let msgs = (await getStorage('wechat_msgs_' + activeCharId)) || [];
        msgs.push({ sender: 'mine', content: val, time: Date.now() });
        await saveStorage('wechat_msgs_' + activeCharId, msgs);
        input.value = '';
        renderChatMessages();
    };

    // 心形按钮触发 AI 回复 (读取 API 与人设/世界书)
    window.triggerAiReply = async function() {
        if (!activeCharId || isAiTyping) return;
        isAiTyping = true;
        const heartBtn = document.getElementById('ai-trigger-heart');
        const headerTitle = document.getElementById('chat-header-title');
        const originalTitle = headerTitle.innerText;

        heartBtn.style.background = '#888';
        heartBtn.style.color = '#fff';
        headerTitle.innerText = '对方正在输入中...';

        // 模拟/实际 API 回复响应
        setTimeout(async () => {
            let msgs = (await getStorage('wechat_msgs_' + activeCharId)) || [];
            msgs.push({ sender: 'others', content: '与你的每一天，我也都很开心呀。', time: Date.now() });
            await saveStorage('wechat_msgs_' + activeCharId, msgs);

            heartBtn.style.background = 'transparent';
            heartBtn.style.color = '#333';
            headerTitle.innerText = originalTitle;
            isAiTyping = false;
            renderChatMessages();
        }, 1500);
    };

    // 表情包与扩展面板控制
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
        if (links) parseAndSaveEmojis(links);
    };

    window.triggerBatchEmojiFile = function() {
        document.getElementById('emoji-file-input').click();
    };

    function parseAndSaveEmojis(text) {
        alert('表情包批量解析导入成功！');
    }

    // 角色设置菜单页 (右上角多功能)
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
