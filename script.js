// 日记应用主类
class DiaryApp {
    constructor() {
        this.diaries = JSON.parse(localStorage.getItem('diaries')) || [];
        this.currentEditId = null;
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderDiaryList();
        this.showWelcomeMessage();
    }

    bindEvents() {
        // 新建日记按钮
        document.getElementById('newDiaryBtn').addEventListener('click', () => {
            this.openModal();
        });

        // 模态框关闭按钮
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        document.querySelector('.close-view').addEventListener('click', () => {
            this.closeViewModal();
        });

        // 取消按钮
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeModal();
        });

        // 表单提交
        document.getElementById('diaryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveDiary();
        });

        // 搜索功能
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filterDiaries();
        });

        // 分类筛选
        document.getElementById('categoryFilter').addEventListener('change', () => {
            this.filterDiaries();
        });

        // 点击模态框外部关闭
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                if (e.target.id === 'diaryModal') {
                    this.closeModal();
                } else if (e.target.id === 'viewModal') {
                    this.closeViewModal();
                }
            }
        });

        // 查看模态框按钮
        document.getElementById('editBtn').addEventListener('click', () => {
            this.editCurrentDiary();
        });

        document.getElementById('deleteBtn').addEventListener('click', () => {
            this.deleteCurrentDiary();
        });

        document.getElementById('closeViewBtn').addEventListener('click', () => {
            this.closeViewModal();
        });

        // 导入功能
        this.setupImportFeature();
    }

    setupImportFeature() {
        // 创建导入按钮
        const header = document.querySelector('.header');
        const importBtn = document.createElement('button');
        importBtn.className = 'btn btn-secondary';
        importBtn.innerHTML = '<i class="fas fa-upload"></i> 导入日记';
        importBtn.style.marginRight = '15px';
        importBtn.addEventListener('click', () => {
            this.importDiaries();
        });
        
        // 将导入按钮插入到新建日记按钮之前
        header.insertBefore(importBtn, document.getElementById('newDiaryBtn'));
    }

    async importDiaries() {
        try {
            // 创建文件输入元素
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.txt';
            fileInput.style.display = 'none';
            
            // 监听文件选择
            fileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (file) {
                    try {
                        const text = await this.readFileAsText(file);
                        const importedDiaries = this.parseDiariesFromText(text);
                        
                        if (importedDiaries.length > 0) {
                            // 合并现有数据和导入的数据
                            const existingIds = new Set(this.diaries.map(d => d.id));
                            const newDiaries = importedDiaries.filter(d => !existingIds.has(d.id));
                            
                            if (newDiaries.length > 0) {
                                this.diaries = [...this.diaries, ...newDiaries];
                                this.saveToLocalStorage();
                                this.renderDiaryList();
                                this.showSuccessMessage(`成功导入 ${newDiaries.length} 篇日记`);
                            } else {
                                this.showSuccessMessage('所有日记都已存在，无需重复导入');
                            }
                        } else {
                            this.showSuccessMessage('未找到可导入的日记数据');
                        }
                    } catch (error) {
                        console.error('解析文件失败:', error);
                        this.showSuccessMessage('文件解析失败，请检查文件格式');
                    }
                }
                
                // 清理文件输入
                document.body.removeChild(fileInput);
            });

            document.body.appendChild(fileInput);
            fileInput.click();
            
        } catch (error) {
            console.error('导入失败:', error);
            this.showSuccessMessage('导入失败，请检查文件格式。');
        }
    }

    readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsText(file, 'utf-8');
        });
    }

    parseDiariesFromText(text) {
        const diaries = [];
        const lines = text.split('\n');
        let currentDiary = null;
        let currentContent = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            
            // 检查是否是日期行（格式：2025年6月14日星期六）
            const dateMatch = line.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日/);
            
            if (dateMatch) {
                // 保存之前的日记
                if (currentDiary && currentContent.length > 0) {
                    currentDiary.content = currentContent.join('\n').trim();
                    if (currentDiary.content) {
                        // 根据内容确定标签和心情
                        currentDiary.tags = this.determineTags(currentDiary.content);
                        currentDiary.category = currentDiary.tags[0] || '生活'; // 保持向后兼容性
                        currentDiary.mood = this.determineMood(currentDiary.content);
                        diaries.push(currentDiary);
                    }
                }

                // 开始新日记
                const year = parseInt(dateMatch[1]);
                const month = parseInt(dateMatch[2]);
                const day = parseInt(dateMatch[3]);
                
                // 提取标题（日期 + 星期）
                const titleMatch = line.match(/^(\d{4}年\d{1,2}月\d{1,2}日[^，。]*)/);
                const title = titleMatch ? titleMatch[1] : `${year}年${month}月${day}日`;

                currentDiary = {
                    id: Date.now() + i, // 使用时间戳 + 索引确保唯一性
                    title: title,
                    tags: [], // 默认标签，稍后会根据内容更新
                    category: '生活', // 默认分类，稍后会根据内容更新
                    content: '',
                    mood: '😊', // 默认心情，稍后会根据内容更新
                    date: new Date(year, month - 1, day).toLocaleString('zh-CN')
                };
                
                currentContent = [];
            } else if (currentDiary && line) {
                // 添加内容到当前日记
                currentContent.push(line);
            }
        }

        // 保存最后一篇日记
        if (currentDiary && currentContent.length > 0) {
            currentDiary.content = currentContent.join('\n').trim();
            if (currentDiary.content) {
                // 根据内容确定标签和心情
                currentDiary.tags = this.determineTags(currentDiary.content);
                currentDiary.category = currentDiary.tags[0] || '生活'; // 保持向后兼容性
                currentDiary.mood = this.determineMood(currentDiary.content);
                diaries.push(currentDiary);
            }
        }

        return diaries;
    }

    determineTags(content) {
        const lowerContent = content.toLowerCase();
        const tags = [];
        
        // 根据内容关键词确定标签
        if (lowerContent.includes('实习') || lowerContent.includes('杭州') || lowerContent.includes('工作')) {
            tags.push('杭州实习');
        }
        if (lowerContent.includes('西藏') || lowerContent.includes('旅行') || lowerContent.includes('旅游')) {
            tags.push('西藏之旅');
        }
        if (lowerContent.includes('怀化') || lowerContent.includes('老家') || lowerContent.includes('奶奶') || lowerContent.includes('外公') || lowerContent.includes('外婆')) {
            tags.push('怀化');
        }
        if (lowerContent.includes('出去玩') || lowerContent.includes('出去') || lowerContent.includes('逛街') || lowerContent.includes('散步') || lowerContent.includes('约会')) {
            tags.push('出去玩');
        }
        if (lowerContent.includes('心情') || lowerContent.includes('感觉') || lowerContent.includes('想') || lowerContent.includes('玉玉')) {
            tags.push('心情');
        }
        if (lowerContent.includes('奇怪') || lowerContent.includes('莫名其妙') || lowerContent.includes('无语')) {
            tags.push('奇怪的话');
        }
        
        // 如果没有匹配到特定标签，默认为简单日常
        if (tags.length === 0) {
            tags.push('简单日常');
        }
        
        return tags;
    }

    determineCategory(content) {
        // 保持向后兼容性，返回第一个标签
        const tags = this.determineTags(content);
        return tags[0] || '生活';
    }

    determineMood(content) {
        const lowerContent = content.toLowerCase();
        
        if (lowerContent.includes('开心') || lowerContent.includes('高兴') || lowerContent.includes('😊') || lowerContent.includes('豪7')) {
            return '😊';
        } else if (lowerContent.includes('难过') || lowerContent.includes('伤心') || lowerContent.includes('😢') || lowerContent.includes('玉玉')) {
            return '😢';
        } else if (lowerContent.includes('生气') || lowerContent.includes('愤怒') || lowerContent.includes('😠')) {
            return '😠';
        } else if (lowerContent.includes('兴奋') || lowerContent.includes('激动') || lowerContent.includes('🤩')) {
            return '🤩';
        } else if (lowerContent.includes('平静') || lowerContent.includes('放松') || lowerContent.includes('😌')) {
            return '😌';
        } else {
            return '😊'; // 默认心情
        }
    }

    openModal(diary = null) {
        const modal = document.getElementById('diaryModal');
        const modalTitle = document.getElementById('modalTitle');
        const form = document.getElementById('diaryForm');

        if (diary) {
            // 编辑模式
            modalTitle.textContent = '编辑日记';
            this.currentEditId = diary.id;
            document.getElementById('diaryTitle').value = diary.title;
            document.getElementById('diaryContent').value = diary.content;
            
            // 设置标签
            this.setTags(diary.tags || [diary.category].filter(Boolean));
            
            // 设置心情
            const moodInput = document.querySelector(`input[name="mood"][value="${diary.mood}"]`);
            if (moodInput) moodInput.checked = true;
        } else {
            // 新建模式
            modalTitle.textContent = '写新日记';
            this.currentEditId = null;
            form.reset();
            this.clearTags();
        }

        modal.style.display = 'block';
        // 禁止背景滚动
        document.body.style.overflow = 'hidden';
        document.getElementById('diaryTitle').focus();
    }

    setTags(tags) {
        // 清除所有标签选择
        this.clearTags();
        
        // 设置选中的标签
        tags.forEach(tag => {
            const checkbox = document.querySelector(`input[name="tags"][value="${tag}"]`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }

    clearTags() {
        const checkboxes = document.querySelectorAll('input[name="tags"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
    }

    getSelectedTags() {
        const checkboxes = document.querySelectorAll('input[name="tags"]:checked');
        return Array.from(checkboxes).map(checkbox => checkbox.value);
    }

    closeModal() {
        document.getElementById('diaryModal').style.display = 'none';
        document.getElementById('diaryForm').reset();
        this.clearTags();
        this.currentEditId = null;
        // 恢复背景滚动
        document.body.style.overflow = 'auto';
    }

    saveDiary() {
        const title = document.getElementById('diaryTitle').value.trim();
        const tags = this.getSelectedTags();
        const content = document.getElementById('diaryContent').value.trim();
        const mood = document.querySelector('input[name="mood"]:checked')?.value || '😊';

        if (!title || tags.length === 0 || !content) {
            alert('请填写完整信息！至少选择一个标签！');
            return;
        }

        const diary = {
            id: this.currentEditId || Date.now(),
            title,
            tags,
            category: tags[0], // 保持向后兼容性
            content,
            mood,
            date: new Date().toLocaleString('zh-CN')
        };

        if (this.currentEditId) {
            // 编辑现有日记
            const index = this.diaries.findIndex(d => d.id === this.currentEditId);
            if (index !== -1) {
                this.diaries[index] = diary;
            }
        } else {
            // 添加新日记
            this.diaries.push(diary);
        }

        // 按日期标题排序整个日记数组
        this.diaries = this.sortDiariesByDate(this.diaries);

        this.saveToLocalStorage();
        this.renderDiaryList();
        this.closeModal();
        this.showSuccessMessage(this.currentEditId ? '日记更新成功！' : '日记保存成功！');
    }

    deleteDiary(id) {
        if (confirm('确定要删除这篇日记吗？')) {
            this.diaries = this.diaries.filter(diary => diary.id !== id);
            this.saveToLocalStorage();
            this.renderDiaryList();
            this.closeViewModal();
            this.showSuccessMessage('日记删除成功！');
        }
    }

    viewDiary(id) {
        const diary = this.diaries.find(d => d.id === id);
        if (!diary) return;

        const modal = document.getElementById('viewModal');
        document.getElementById('viewTitle').textContent = diary.title;
        document.getElementById('viewDate').textContent = diary.date;
        document.getElementById('viewMood').textContent = diary.mood;
        document.getElementById('viewContent').textContent = diary.content;

        // 显示标签
        this.displayTags(diary.tags || [diary.category].filter(Boolean));

        // 存储当前查看的日记ID
        modal.dataset.currentId = id;
        modal.style.display = 'block';
        // 禁止背景滚动
        document.body.style.overflow = 'hidden';
    }

    displayTags(tags) {
        const tagsContainer = document.getElementById('viewTags');
        if (tags && tags.length > 0) {
            tagsContainer.innerHTML = tags.map(tag => 
                `<span class="category-tag" data-tag="${this.escapeHtml(tag)}">${this.escapeHtml(tag)}</span>`
            ).join('');
        } else {
            tagsContainer.innerHTML = '';
        }
    }

    closeViewModal() {
        document.getElementById('viewModal').style.display = 'none';
        // 恢复背景滚动
        document.body.style.overflow = 'auto';
    }

    editCurrentDiary() {
        const currentId = parseInt(document.getElementById('viewModal').dataset.currentId);
        const diary = this.diaries.find(d => d.id === currentId);
        if (diary) {
            this.closeViewModal();
            this.openModal(diary);
        }
    }

    deleteCurrentDiary() {
        const currentId = parseInt(document.getElementById('viewModal').dataset.currentId);
        this.deleteDiary(currentId);
    }

    renderDiaryList() {
        const diaryList = document.getElementById('diaryList');
        const filteredDiaries = this.getFilteredDiaries();

        if (filteredDiaries.length === 0) {
            diaryList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book-open"></i>
                    <h3>还没有日记</h3>
                    <p>点击"写新日记"开始记录你的生活吧！</p>
                </div>
            `;
            return;
        }

        diaryList.innerHTML = filteredDiaries.map(diary => {
            const tags = diary.tags || [diary.category].filter(Boolean);
            const tagsHtml = tags.map(tag => 
                `<span class="category-tag" data-tag="${this.escapeHtml(tag)}">${this.escapeHtml(tag)}</span>`
            ).join('');
            
            return `
                <div class="diary-card" data-diary-id="${diary.id}">
                    <h3>${this.escapeHtml(diary.title)}</h3>
                    <div class="diary-meta">
                        <div class="tags-container">
                            ${tagsHtml}
                        </div>
                        <span class="date">${diary.date}</span>
                        <span class="mood">${diary.mood}</span>
                    </div>
                    <div class="diary-preview">${this.escapeHtml(diary.content.substring(0, 100))}${diary.content.length > 100 ? '...' : ''}</div>
                </div>
            `;
        }).join('');

        // 为所有日记卡片添加点击事件
        document.querySelectorAll('.diary-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const diaryId = parseInt(card.dataset.diaryId);
                this.viewDiary(diaryId);
            });
        });
    }

    getFilteredDiaries() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase();
        const categoryFilter = document.getElementById('categoryFilter').value;

        let filteredDiaries = this.diaries.filter(diary => {
            const matchesSearch = !searchTerm || 
                diary.title.toLowerCase().includes(searchTerm) ||
                diary.content.toLowerCase().includes(searchTerm);
            
            const tags = diary.tags || [diary.category].filter(Boolean);
            const matchesCategory = !categoryFilter || tags.includes(categoryFilter);

            return matchesSearch && matchesCategory;
        });

        // 按日期标题排序（降序，最新的在前）
        return this.sortDiariesByDate(filteredDiaries);
    }

    filterDiaries() {
        this.renderDiaryList();
    }

    saveToLocalStorage() {
        localStorage.setItem('diaries', JSON.stringify(this.diaries));
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showWelcomeMessage() {
        if (this.diaries.length === 0) {
            // 添加一些示例日记
            const today = new Date();
            const year = today.getFullYear();
            const month = today.getMonth() + 1;
            const day = today.getDate();
            const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            const weekday = weekdays[today.getDay()];
            
            const sampleDiaries = [
                {
                    id: Date.now() - 2,
                    title: `${year}年${month}月${day}日${weekday}`,
                    category: '心情',
                    content: '今天开始使用这个新的日记本，希望能记录下生活中的美好时刻。\n\n这是一个功能完整的日记应用，支持：\n• 创建、编辑、删除日记\n• 按分类和关键词搜索\n• 记录心情状态\n• 美观的界面设计\n• 按日期标题自动排序\n\n开始写下你的第一篇日记吧！',
                    mood: '😊',
                    date: today.toLocaleString('zh-CN')
                }
            ];
            this.diaries = sampleDiaries;
            this.saveToLocalStorage();
            this.renderDiaryList();
        } else {
            // 显示数据恢复信息
            console.log(`成功加载了 ${this.diaries.length} 篇日记`);
        }
    }

    showSuccessMessage(message) {
        // 创建临时提示消息
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #48bb78;
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 10000;
            font-weight: 500;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        // 显示动画
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // 自动隐藏
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }

    // 解析日期标题为Date对象
    parseDateFromTitle(title) {
        // 匹配格式：2025年6月14日星期六 或 2025年6月14日 或 2025年06月14日
        const dateMatch = title.match(/^(\d{4})年(\d{1,2})月(\d{1,2})日/);
        if (dateMatch) {
            const year = parseInt(dateMatch[1]);
            const month = parseInt(dateMatch[2]) - 1; // 月份从0开始
            const day = parseInt(dateMatch[3]);
            
            // 验证日期是否有效
            const date = new Date(year, month, day);
            if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
                return date;
            }
        }
        // 如果无法解析日期或日期无效，返回一个很早的日期
        return new Date(1900, 0, 1);
    }

    // 按日期标题排序日记（降序，最新的在前）
    sortDiariesByDate(diaries) {
        return diaries.sort((a, b) => {
            const dateA = this.parseDateFromTitle(a.title);
            const dateB = this.parseDateFromTitle(b.title);
            return dateB - dateA; // 降序排列
        });
    }
}

// 键盘快捷键支持
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + N 新建日记
    if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        diaryApp.openModal();
    }
    
    // ESC 关闭模态框
    if (e.key === 'Escape') {
        diaryApp.closeModal();
        diaryApp.closeViewModal();
    }
});

// 初始化应用
const diaryApp = new DiaryApp(); 