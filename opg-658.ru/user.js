document.addEventListener('DOMContentLoaded', function() {
    initializeUserPanel();
});
function initializeUserPanel() {
    initializeNavigation();
    loadInitialData();
    initializeMusic();
    startAutoRefresh();
}
function initializeNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            navItems.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));
            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            loadTabData(targetTab);
        });
    });
}
async function loadInitialData() {
    try {
        await loadUserData();
        await loadWeeklyActivity();
        await loadRecentOperations();
        await loadNotifications();
        await loadAchievements();
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}
function loadTabData(tabName) {
        switch(tabName) {
        case 'dashboard':
    loadWeeklyActivity();
            loadRecentOperations();
            break;
        case 'history':
            loadHistory();
            break;
        case 'notifications':
            loadNotifications();
            break;
        case 'achievements':
            console.log('Переключаемся на вкладку достижений');
            loadAchievements();
            break;
    }
}
async function loadUserData() {
    try {
        const response = await fetch('api.php?action=get_user_data');
        const data = await response.json();
        if (data.success) {
            const user = data.data;
            const oldBalance = parseInt(document.getElementById('current-balance')?.textContent.replace(/[+-]/g, '') || '0');
            const newBalance = user.total_points;
            document.getElementById('user-name').textContent = user.username;
            const avatarElement = document.getElementById('user-avatar');
            if (user.avatar && user.avatar.startsWith('uploads/')) {
                avatarElement.innerHTML = '👤';
            } else {
                avatarElement.textContent = user.avatar || '👤';
            }
            document.getElementById('current-balance').textContent =
                (newBalance >= 0 ? '+' : '') + newBalance;
            const balanceElement = document.getElementById('current-balance');
            balanceElement.className = `stat-value ${newBalance >= 0 ? 'positive' : 'negative'}`;
            if (oldBalance !== 0 && newBalance !== oldBalance) {
                if (newBalance > oldBalance) {
                    playMusic('add');
                } else if (newBalance < oldBalance) {
                    playMusic('remove');
                }
            }
        } else if (data.need_create) {
            await createFirstUser();
        } else {
            console.error('Ошибка загрузки данных пользователя:', data.message);
        }
    } catch (error) {
        console.error('Ошибка загрузки данных пользователя:', error);
    }
}
async function createFirstUser() {
    try {
        const response = await fetch('api.php?action=create_first_user');
        const data = await response.json();
        if (data.success) {
            await loadUserData();
        } else {
            console.error('Ошибка создания пользователя:', data.message);
        }
    } catch (error) {
        console.error('Ошибка создания пользователя:', error);
    }
}
async function loadWeeklyActivity() {
    try {
        const response = await fetch('api.php?action=get_weekly_activity');
        const data = await response.json();
        if (data.success) {
            renderWeeklyActivity(data.data);
            updateWeeklyChange(data.data);
        } else {
            console.error('Ошибка загрузки активности:', data.message);
        }
    } catch (error) {
        console.error('Ошибка загрузки активности:', error);
    }
}
function renderWeeklyActivity(activityData) {
    if (!activityData || activityData.length === 0) {
        document.querySelector('.chart-container').innerHTML = '<p class="no-data">Нет данных для отображения</p>';
        return;
    }
    const chartSvg = document.querySelector('.chart-svg');
    chartSvg.innerHTML = '';
    const width = 700;
    const height = 300;
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const allPoints = activityData.map(day => day.daily_change);
    const maxPoints = Math.max(...allPoints, 0);
    const minPoints = Math.min(...allPoints, 0);
    const yRange = maxPoints - minPoints;
    if (yRange === 0) {
        document.querySelector('.chart-container').innerHTML = '<p class="no-data">Нет изменений за неделю</p>';
        return;
    }
    const yLabels = [];
    for (let i = 0; i <= 4; i++) {
        const value = Math.round(minPoints + (yRange * i / 4));
        yLabels.push(value);
    }
    updateYLabels(yLabels);
    const lineGradient = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const gradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    gradient.setAttribute('id', 'lineGradient');
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', '#007bff');
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', '#6610f2');
    gradient.appendChild(stop1);
    gradient.appendChild(stop2);
    lineGradient.appendChild(gradient);
    chartSvg.appendChild(lineGradient);
    const gridGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    gridGroup.setAttribute('class', 'chart-grid');
    const days = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    days.forEach((day, index) => {
        const x = margin.left + (index * (width - margin.left - margin.right) / 6);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', x);
        line.setAttribute('y1', margin.top);
        line.setAttribute('x2', x);
        line.setAttribute('y2', height - margin.bottom);
        line.setAttribute('stroke', '#e9ecef');
        line.setAttribute('stroke-width', '1');
        gridGroup.appendChild(line);
    });
    yLabels.forEach((label, index) => {
        const y = margin.top + ((maxPoints - label) * (height - margin.top - margin.bottom) / yRange);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', margin.left);
        line.setAttribute('y1', y);
        line.setAttribute('x2', width - margin.right);
        line.setAttribute('y2', y);
        line.setAttribute('stroke', '#e9ecef');
        line.setAttribute('stroke-width', '1');
        gridGroup.appendChild(line);
    });
    chartSvg.appendChild(gridGroup);
    const pathData = [];
    const points = [];
    activityData.forEach((day, index) => {
        const x = margin.left + (index * (width - margin.left - margin.right) / (activityData.length - 1));
        const y = margin.top + ((maxPoints - day.daily_change) * (height - margin.top - margin.bottom) / yRange);
        points.push({ x, y, day: day.day, change: day.daily_change });
        pathData.push(`${index === 0 ? 'M' : 'L'} ${x} ${y}`);
    });
    if (pathData.length > 0) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        line.setAttribute('d', pathData.join(' '));
        line.setAttribute('stroke', 'url(#lineGradient)');
        line.setAttribute('stroke-width', '3');
        line.setAttribute('fill', 'none');
        line.setAttribute('class', 'chart-line');
        chartSvg.appendChild(line);
    }
    points.forEach(day => {
        const point = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        point.setAttribute('cx', day.x);
        point.setAttribute('cy', day.y);
        point.setAttribute('r', '5');
        point.setAttribute('fill', day.change >= 0 ? '#28a745' : '#dc3545');
        point.setAttribute('class', `chart-point ${day.change >= 0 ? 'positive' : 'negative'}`);
        point.setAttribute('data-day', day.day);
        point.setAttribute('data-value', day.change);
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = `${day.day}: ${day.change >= 0 ? '+' : ''}${day.change} очков`;
        point.appendChild(title);
        chartSvg.appendChild(point);
    });
    const daysGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    daysGroup.setAttribute('class', 'chart-days');
    days.forEach((day, index) => {
        const x = margin.left + (index * (width - margin.left - margin.right) / 6);
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', height - margin.bottom + 20);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('class', 'chart-day-label');
        text.textContent = day;
        daysGroup.appendChild(text);
    });
    chartSvg.appendChild(daysGroup);
    const legendGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    legendGroup.setAttribute('class', 'chart-legend');
    const legendText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    legendText.setAttribute('x', margin.left);
    legendText.setAttribute('y', margin.top - 10);
    legendText.setAttribute('class', 'chart-legend-text');
    legendText.textContent = 'Динамика изменения баланса';
    legendGroup.appendChild(legendText);
    chartSvg.appendChild(legendGroup);
}
function updateYLabels(yLabels) {
    if (!yLabels || yLabels.length === 0) return;
    const chartSvg = document.querySelector('.chart-svg');
    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const height = 300;
    const oldLabels = chartSvg.querySelectorAll('.y-label');
    oldLabels.forEach(label => label.remove());
    yLabels.forEach((label, index) => {
        const y = margin.top + (index * (height - margin.top - margin.bottom) / (yLabels.length - 1));
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', 10);
        text.setAttribute('y', y + 5);
        text.setAttribute('fill', '#6c757d');
        text.setAttribute('font-size', '12');
        text.setAttribute('font-family', 'Inter');
        text.setAttribute('class', 'y-label');
        text.textContent = label >= 0 ? `+${label}` : `${label}`;
        chartSvg.appendChild(text);
    });
}
function updateWeeklyChange(activityData) {
    const totalChange = activityData.reduce((sum, day) => sum + day.daily_change, 0);
    const weeklyChangeElement = document.getElementById('weekly-change');
    weeklyChangeElement.textContent = `${totalChange >= 0 ? '+' : ''}${totalChange} за неделю`;
    weeklyChangeElement.className = `stat-change ${totalChange >= 0 ? 'positive' : 'negative'}`;
}
async function loadRecentOperations() {
    try {
        const response = await fetch('api.php?action=get_user_history');
        const data = await response.json();
        if (data.success) {
            renderRecentOperations(data.data.slice(0, 3));
        } else {
            console.error('Ошибка загрузки операций:', data.message);
        }
    } catch (error) {
        console.error('Ошибка загрузки операций:', error);
    }
}
function renderRecentOperations(operations) {
    const recentList = document.getElementById('recent-list');
    if (!recentList) return;
    if (operations.length === 0) {
        recentList.innerHTML = '<div class="loading-placeholder">Нет операций</div>';
        return;
    }
    recentList.innerHTML = operations.map(operation => `
        <div class="recent-item ${operation.operation_type === 'add' ? 'positive' : 'negative'}">
            <div class="recent-icon">${operation.operation_type === 'add' ? '➕' : '➖'}</div>
            <div class="recent-content">
                <h4>${operation.operation_type === 'add' ? '+' : '-'}${Math.abs(operation.points)} очков</h4>
                <p>${operation.reason}</p>
                <span class="recent-date">${formatDate(operation.created_at)}</span>
        </div>
        </div>
    `).join('');
}
async function loadHistory() {
    try {
        const response = await fetch('api.php?action=get_user_history');
        const data = await response.json();
        if (data.success) {
            window.allOperations = data.data;
            renderHistory(data.data);
            setupHistoryFilter();
        } else {
            console.error('Ошибка загрузки истории:', data.message);
        }
    } catch (error) {
        console.error('Ошибка загрузки истории:', error);
    }
}
function setupHistoryFilter() {
    const filterSelect = document.querySelector('.filter-select');
    if (filterSelect) {
        filterSelect.addEventListener('change', function() {
            const filterValue = this.value;
            let filteredOperations = window.allOperations;
            if (filterValue === 'positive') {
                filteredOperations = window.allOperations.filter(op => op.operation_type === 'add');
            } else if (filterValue === 'negative') {
                filteredOperations = window.allOperations.filter(op => op.operation_type === 'remove');
            }
            renderHistory(filteredOperations);
        });
    }
}
function renderHistory(operations) {
    const historyList = document.getElementById('history-list');
    if (!historyList) return;
    if (operations.length === 0) {
        historyList.innerHTML = '<div class="loading-placeholder">История операций пуста</div>';
        return;
    }
    let currentBalance = 0;
    const operationsWithBalance = operations.map(operation => {
        if (operation.operation_type === 'add') {
            currentBalance += operation.points;
        } else {
            currentBalance -= Math.abs(operation.points);
        }
        return { ...operation, balance: currentBalance };
    }).reverse();
    historyList.innerHTML = operationsWithBalance.map(operation => `
        <div class="history-item ${operation.operation_type === 'add' ? 'positive' : 'negative'}">
            <div class="history-icon">${operation.operation_type === 'add' ? '➕' : '➖'}</div>
            <div class="history-content">
                <h4>${operation.operation_type === 'add' ? '+' : '-'}${Math.abs(operation.points)} очков</h4>
                <p>${operation.reason}</p>
                <span class="history-date">${formatDate(operation.created_at)}</span>
            </div>
            <div class="history-balance">Баланс: ${operation.balance >= 0 ? '+' : ''}${operation.balance}</div>
        </div>
    `).join('');
}
async function loadNotifications() {
    try {
        const response = await fetch('api.php?action=get_user_notifications');
        const data = await response.json();
        if (data.success) {
            console.log('Уведомления загружены:', data.data);
            console.log('Прочитанных:', data.data.filter(n => n.is_read).length);
            console.log('Непрочитанных:', data.data.filter(n => !n.is_read).length);
            renderNotifications(data.data);
        } else {
            console.error('Ошибка загрузки уведомлений:', data.message);
        }
    } catch (error) {
        console.error('Ошибка загрузки уведомлений:', error);
    }
}
function renderNotifications(notifications) {
    const notificationsList = document.getElementById('notifications-list');
    if (!notificationsList) return;
    if (notifications.length === 0) {
        notificationsList.innerHTML = '<div class="loading-placeholder">Уведомлений нет</div>';
        updateNotificationCount(0);
        return;
    }
    const unreadCount = notifications.filter(notification => !notification.is_read).length;
    notificationsList.innerHTML = notifications.map(notification => `
        <div class="notification-item ${notification.is_read ? 'read' : 'unread'}"
             data-operation-id="${notification.operation_id || 'unknown'}">
            <div class="notification-icon ${notification.operation_type === 'add' ? 'positive' : 'negative'}">
                ${notification.operation_type === 'add' ? '➕' : '➖'}
            </div>
            <div class="notification-content">
                <h4>${notification.title}</h4>
                <p>${notification.message}</p>
                <span class="notification-time">${formatDate(notification.created_at)}</span>
            </div>
            <button class="notification-close" onclick="closeNotification(this)">×</button>
        </div>
    `).join('');
    updateNotificationCount(unreadCount);
}
function updateNotificationCount(count) {
    const notificationCount = document.getElementById('notification-count');
    if (notificationCount) {
        if (count === undefined) {
            count = document.querySelectorAll('.notification-item.unread').length;
        }
        notificationCount.textContent = count;
        notificationCount.style.display = count > 0 ? 'inline' : 'none';
    }
}
async function closeNotification(button) {
    const notificationItem = button.closest('.notification-item');
    if (notificationItem) {
        const operationId = notificationItem.dataset.operationId;
        if (operationId && operationId !== 'unknown') {
            try {
                const response = await fetch('api.php?action=mark_notification_read', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ operation_id: operationId })
                });
                const data = await response.json();
                if (data.success) {
                    notificationItem.classList.remove('unread');
                    notificationItem.classList.add('read');
                    updateNotificationCount();
                } else {
                    console.error('Ошибка отметки уведомления:', data.message);
                }
            } catch (error) {
                console.error('Ошибка отправки запроса:', error);
            }
        }
        notificationItem.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            notificationItem.remove();
            updateNotificationCount();
        }, 300);
    }
}
async function loadAchievements() {
    try {
        console.log('Загружаем достижения...');
        const response = await fetch('api.php?action=get_user_achievements');
        const data = await response.json();
        console.log('Ответ API достижений:', data);
        if (data.success) {
            console.log('Достижения загружены:', data.data);
            renderAchievements(data.data);
        } else {
            console.error('Ошибка загрузки достижений:', data.message);
        }
    } catch (error) {
        console.error('Ошибка загрузки достижений:', error);
    }
}
function renderAchievements(achievements) {
    console.log('Рендерим достижения:', achievements);
    const achievementsGrid = document.getElementById('achievements-grid');
    if (!achievementsGrid) {
        console.error('Элемент achievements-grid не найден');
        return;
    }
    if (achievements.length === 0) {
        console.log('Достижений нет, показываем placeholder');
        achievementsGrid.innerHTML = '<div class="loading-placeholder">Достижений нет</div>';
        return;
    }
    achievementsGrid.innerHTML = achievements.map(achievement => {
        const isUnlocked = achievement.unlocked;
        const currentPoints = parseInt(document.getElementById('current-balance')?.textContent.replace(/[+-]/g, '') || '0');
        let progressPercent = 0;
        let progressText = '0/0';
        if (achievement.points_required > 0) {
            progressPercent = Math.min(100, Math.round((currentPoints / achievement.points_required) * 100));
            progressText = `${currentPoints}/${achievement.points_required}`;
        } else if (achievement.points_required < 0) {
            if (currentPoints <= achievement.points_required) {
                progressPercent = 100;
                progressText = 'Получено';
            } else {
                progressPercent = Math.min(100, Math.round(((currentPoints - achievement.points_required) / Math.abs(achievement.points_required)) * 100));
                progressText = `${currentPoints}/${achievement.points_required}`;
            }
        } else {
            progressPercent = isUnlocked ? 100 : 0;
            progressText = isUnlocked ? 'Получено' : 'Не получено';
        }
        return `
            <div class="achievement-card ${isUnlocked ? 'unlocked' : 'locked'}">
                <div class="achievement-icon">${achievement.icon}</div>
                <h3>${achievement.name}</h3>
                <p>${achievement.description}</p>
                <div class="achievement-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                    <span class="progress-text">${progressText}</span>
                </div>
                <span class="achievement-date">
                    ${isUnlocked ?
                        `Получено ${formatDate(achievement.unlocked_date)}` :
                        'Не получено'}
                </span>
            </div>
        `;
    }).join('');
}
function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
        return 'Сегодня, ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 2) {
        return 'Вчера, ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays <= 7) {
        return `${diffDays - 1} дня назад, ` + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString('ru-RU') + ', ' + date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }
}
function showTab(tabName) {
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');
    navItems.forEach(nav => nav.classList.remove('active'));
    tabContents.forEach(tab => tab.classList.remove('active'));
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(tabName).classList.add('active');
    loadTabData(tabName);
}
async function markAllAsRead() {
    try {
        const response = await fetch('api.php?action=mark_all_notifications_read', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        const data = await response.json();
        if (data.success) {
            const unreadNotifications = document.querySelectorAll('.notification-item.unread');
            unreadNotifications.forEach(notification => {
                notification.classList.remove('unread');
                notification.classList.add('read');
            });
            updateNotificationCount(0);
            showNotification('Все уведомления отмечены как прочитанные', 'success');
        } else {
            console.error('Ошибка отметки уведомлений:', data.message);
            showNotification('Ошибка при отметке уведомлений', 'error');
        }
    } catch (error) {
        console.error('Ошибка отправки запроса:', error);
        showNotification('Ошибка при отметке уведомлений', 'error');
    }
}
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification-toast ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    document.body.appendChild(notification);
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}
let selectedAvatarFile = null;
function openAvatarModal() {
    document.getElementById('avatarModal').classList.add('active');
    setupAvatarUpload();
}
function closeAvatarModal() {
    document.getElementById('avatarModal').classList.remove('active');
    selectedAvatarFile = null;
}
function setupAvatarUpload() {
    const uploadArea = document.getElementById('avatarUploadArea');
    const fileInput = document.getElementById('avatarFileInput');
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectedAvatarFile = e.target.files[0];
            previewAvatar(selectedAvatarFile);
        }
    });
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            selectedAvatarFile = e.dataTransfer.files[0];
            previewAvatar(selectedAvatarFile);
        }
    });
}
function previewAvatar(file) {
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const uploadArea = document.getElementById('avatarUploadArea');
            uploadArea.innerHTML = `
                <img src="${e.target.result}" alt="Предпросмотр" style="max-width: 200px; max-height: 200px; border-radius: 8px;">
                <div class="avatar-upload-text" style="margin-top: 15px;">
                    Выбран файл: ${file.name}
                </div>
            `;
        };
        reader.readAsDataURL(file);
    }
}
async function uploadAvatar() {
    if (!selectedAvatarFile) {
        console.log('Файл не выбран');
        return;
    }
    try {
        const formData = new FormData();
        formData.append('avatar', selectedAvatarFile);
        const response = await fetch('api.php?action=upload_avatar', {
            method: 'POST',
            body: formData
        });
        const data = await response.json();
        if (data.success) {
            const avatarElement = document.getElementById('user-avatar');
            if (data.data.avatar_type === 'image') {
                avatarElement.innerHTML = `<img src="${data.data.avatar_url}" alt="Аватар" class="avatar-preview">`;
            } else {
                avatarElement.innerHTML = data.data.avatar;
            }
            closeAvatarModal();
            showNotification('Аватар успешно обновлен!', 'success');
        } else {
            console.error('Ошибка загрузки аватара:', data.message);
        }
    } catch (error) {
        console.error('Ошибка загрузки аватара:', error);
        showNotification('Ошибка загрузки аватара', 'error');
    }
}
function resetToEmoji() {
    try {
        fetch('api.php?action=reset_avatar', {
            method: 'POST'
        }).then(response => response.json())
        .then(data => {
            if (data.success) {
                const avatarElement = document.getElementById('user-avatar');
                avatarElement.innerHTML = data.data.avatar;
                closeAvatarModal();
                closeAvatarModal();
                showNotification('Аватар сброшен на эмодзи!', 'success');
                    } else {
            console.error('Ошибка сброса аватара:', data.message);
        }
        });
    } catch (error) {
        console.error('Ошибка сброса аватара:', error);
        showNotification('Ошибка сброса аватара', 'error');
    }
}
let positiveAudio, negativeAudio;
let musicEnabled = true;
async function initializeMusic() {
    try {
        const response = await fetch('api.php?action=get_music_settings');
        const data = await response.json();
        if (data.success) {
            musicEnabled = data.data.music_enabled === '1';
        }
        if (musicEnabled) {
            positiveAudio = new Audio('tiomnaia-noch.mp3');
            negativeAudio = new Audio('crying-goblin.mp3');
            positiveAudio.load();
            negativeAudio.load();
        }
    } catch (error) {
        console.error('Ошибка инициализации музыки:', error);
        musicEnabled = false;
    }
}
function playMusic(operationType) {
    if (!musicEnabled || !positiveAudio || !negativeAudio) return;
    try {
        if (operationType === 'add') {
            positiveAudio.currentTime = 0;
            positiveAudio.play().catch(e => console.log('Ошибка воспроизведения музыки:', e));
        } else if (operationType === 'remove') {
            negativeAudio.currentTime = 0;
            negativeAudio.play().catch(e => console.log('Ошибка воспроизведения музыки:', e));
        }
    } catch (error) {
        console.error('Ошибка воспроизведения музыки:', error);
    }
}
function startAutoRefresh() {
    setInterval(async () => {
        try {
            await loadUserData();
            await loadWeeklyActivity();
            await loadRecentOperations();
        } catch (error) {
            console.error('Ошибка автоматического обновления:', error);
        }
    }, 30000);
    setInterval(async () => {
        try {
            await loadNotifications();
        } catch (error) {
            console.error('Ошибка обновления уведомлений:', error);
        }
    }, 10000);
    setInterval(() => {
        const lastUpdate = localStorage.getItem('user_data_updated');
        if (lastUpdate) {
            const updateTime = parseInt(lastUpdate);
            const currentTime = Date.now();
            if (currentTime - updateTime < 10000) {
                console.log('Обнаружено обновление от админки, обновляем данные...');
    loadUserData();
    loadWeeklyActivity();
                loadRecentOperations();
                loadNotifications();
                loadAchievements();
                localStorage.removeItem('user_data_updated');
            }
        }
    }, 5000);
}