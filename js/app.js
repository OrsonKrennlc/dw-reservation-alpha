/**
 * DW 预约系统 - 主逻辑
 * 依赖: js/config.js（需在本文档之前加载）
 * 后端: Supabase REST API (PostgREST)
 */

// ========== Supabase API Helper ==========
function supabaseHeaders() {
    return {
        'apikey': CONFIG.SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${CONFIG.SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };
}

function apiUrl(path = '') {
    return `${CONFIG.SUPABASE_URL}/rest/v1/${CONFIG.TABLE}${path}`;
}

// ========== State ==========
let allBookings = [];
let selectedDate = '';
let selectedTime = '';
let isAdmin = false;

// ========== Utility Functions ==========
function formatDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function getBookingForSlot(dateStr, timeKey) {
    return allBookings.find(b => b.date === dateStr && b.time === timeKey);
}

function validatePhone(phone) {
    return /^1[3-9]\d{9}$/.test(phone);
}

// ========== Toast Notifications ==========
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✓' : '✕';
    toast.innerHTML = `<span style="font-weight:600">${icon}</span> ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========== Confirm Dialog ==========
function showConfirm(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    const btn = document.getElementById('confirmAction');
    btn.onclick = () => {
        closeConfirm();
        onConfirm();
    };
    document.getElementById('confirmOverlay').classList.add('active');
}

function closeConfirm() {
    document.getElementById('confirmOverlay').classList.remove('active');
}

// ========== Calendar Rendering ==========
function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    grid.innerHTML = '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + CONFIG.DAYS_AHEAD - 1);

    document.getElementById('monthLabel').textContent =
        `${startDate.getFullYear()}年${MONTHS[startDate.getMonth()]}`;
    document.getElementById('monthRange').textContent =
        `${startDate.getMonth() + 1}月${startDate.getDate()}日 — ${endDate.getMonth() + 1}月${endDate.getDate()}日`;

    for (let i = 0; i < CONFIG.DAYS_AHEAD; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() + i);
        const dateStr = formatDate(date);
        const weekday = WEEKDAYS[date.getDay()];
        const dayNum = date.getDate();
        const isTodayDate = i === 0;

        const col = document.createElement('div');
        col.className = 'day-column';

        const header = document.createElement('div');
        header.className = `day-header${isTodayDate ? ' today' : ''}`;
        header.innerHTML = `
            <div class="day-weekday">周${weekday}</div>
            <div class="day-number">${dayNum}</div>
            <div class="day-month">${MONTHS[date.getMonth()]}</div>
        `;
        col.appendChild(header);

        TIME_SLOTS.forEach(slot => {
            const booking = getBookingForSlot(dateStr, slot.key);
            const isOccupied = !!booking;
            const el = document.createElement('div');
            el.className = `time-slot${isOccupied ? ' occupied' : ''}`;

            if (isOccupied) {
                el.innerHTML = `
                    <div class="time-slot-icon">${slot.icon}</div>
                    <div class="time-slot-label">${slot.label}</div>
                    <div class="time-slot-status">已预约</div>
                    <div class="occupied-info">${escapeHtml(booking.name)}</div>
                `;
            } else {
                el.innerHTML = `
                    <div class="time-slot-icon">${slot.icon}</div>
                    <div class="time-slot-label">${slot.label}</div>
                    <div class="time-slot-status">可预约</div>
                `;
                el.onclick = () => openBookModal(dateStr, slot);
            }

            col.appendChild(el);
        });

        grid.appendChild(col);
    }
}

// ========== Booking Modal ==========
function openBookModal(dateStr, slot) {
    selectedDate = dateStr;
    selectedTime = slot.key;

    const parts = dateStr.split('-');
    const displayDate = `${parseInt(parts[1])}月${parseInt(parts[2])}日`;

    document.getElementById('bookSlotInfo').textContent =
        `${displayDate} · ${slot.label}（${slot.time}）`;

    document.getElementById('bookName').value = '';
    document.getElementById('bookPhone').value = '';
    document.getElementById('bookName').classList.remove('error');
    document.getElementById('bookPhone').classList.remove('error');
    document.getElementById('nameError').classList.remove('visible');
    document.getElementById('phoneError').classList.remove('visible');

    document.getElementById('bookModal').classList.add('active');
    setTimeout(() => document.getElementById('bookName').focus(), 250);
}

function closeBookModal() {
    document.getElementById('bookModal').classList.remove('active');
}

async function submitBooking() {
    const nameInput = document.getElementById('bookName');
    const phoneInput = document.getElementById('bookPhone');
    const name = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    let valid = true;

    if (!name) {
        nameInput.classList.add('error');
        document.getElementById('nameError').classList.add('visible');
        valid = false;
    } else {
        nameInput.classList.remove('error');
        document.getElementById('nameError').classList.remove('visible');
    }

    if (!validatePhone(phone)) {
        phoneInput.classList.add('error');
        document.getElementById('phoneError').classList.add('visible');
        valid = false;
    } else {
        phoneInput.classList.remove('error');
        document.getElementById('phoneError').classList.remove('visible');
    }

    if (!valid) return;

    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = '提交中...';

    try {
        const res = await fetch(apiUrl(), {
            method: 'POST',
            headers: supabaseHeaders(),
            body: JSON.stringify({
                date: selectedDate,
                time: selectedTime,
                name: name,
                phone: phone
            })
        });

        if (res.ok || res.status === 201) {
            showToast('预约成功！', 'success');
            closeBookModal();
            await loadBookings();
            renderCalendar();
        } else {
            const err = await res.json();
            const msg = err.message || err.msg || '未知错误';
            if (msg.includes('duplicate') || msg.includes('unique')) {
                showToast('该时段已被预约，请选择其他时段', 'error');
            } else {
                showToast(`预约失败：${msg}`, 'error');
            }
        }
    } catch (e) {
        showToast('网络错误，请稍后重试', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = '确认预约';
    }
}

// ========== Admin Login ==========
function openAdminLogin() {
    document.getElementById('adminPwd').value = '';
    document.getElementById('adminPwd').classList.remove('error');
    document.getElementById('pwdError').classList.remove('visible');
    document.getElementById('loginModal').classList.add('active');
    setTimeout(() => document.getElementById('adminPwd').focus(), 250);
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.remove('active');
}

function verifyAdmin() {
    const pwd = document.getElementById('adminPwd').value;
    if (pwd === CONFIG.ADMIN_PWD) {
        isAdmin = true;
        closeLoginModal();
        showAdminPage();
    } else {
        document.getElementById('adminPwd').classList.add('error');
        document.getElementById('pwdError').classList.add('visible');
    }
}

// ========== Admin Page ==========
function showAdminPage() {
    document.getElementById('mainContent').style.display = 'none';
    document.getElementById('mainHeader').querySelector('.admin-trigger').style.display = 'none';
    document.getElementById('adminPage').classList.add('active');

    renderAdminStats();
    renderAdminList();
}

function backToHome() {
    isAdmin = false;
    document.getElementById('adminPage').classList.remove('active');
    document.getElementById('mainContent').style.display = 'block';
    document.getElementById('mainHeader').querySelector('.admin-trigger').style.display = 'flex';
}

function renderAdminStats() {
    const total = allBookings.length;
    const today = formatDate(new Date());
    const todayCount = allBookings.filter(b => b.date === today).length;
    const uniqueDates = new Set(allBookings.map(b => b.date)).size;

    document.getElementById('adminStats').innerHTML = `
        <div class="stat-card">
            <div class="stat-value">${total}</div>
            <div class="stat-label">总预约数</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${todayCount}</div>
            <div class="stat-label">今日预约</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${uniqueDates}</div>
            <div class="stat-label">覆盖天数</div>
        </div>
    `;
}

function renderAdminList() {
    const list = document.getElementById('adminList');

    if (allBookings.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-text">暂无预约记录</div>
            </div>
        `;
        return;
    }

    const sorted = [...allBookings].sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        const order = { lunch: 0, afternoon: 1, dinner: 2, night: 3 };
        return (order[a.time] || 0) - (order[b.time] || 0);
    });

    list.innerHTML = sorted.map(booking => {
        const slot = TIME_SLOTS.find(s => s.key === booking.time) || TIME_SLOTS[0];
        const parts = booking.date.split('-');
        const day = parseInt(parts[2]);
        const monthLabel = `${parseInt(parts[1])}月`;

        return `
            <div class="admin-item">
                <div class="admin-item-date">
                    <div class="admin-item-day">${day}</div>
                    <div class="admin-item-month">${monthLabel}</div>
                </div>
                <div class="admin-item-info">
                    <div class="admin-item-name">${escapeHtml(booking.name)}</div>
                    <div class="admin-item-detail">
                        ${slot.icon} ${slot.label}（${slot.time}）· 📞 ${escapeHtml(booking.phone)}
                    </div>
                </div>
                <div class="admin-item-actions">
                    <button class="delete-btn" onclick="requestDelete(${booking.id}, '${escapeHtml(booking.name)}', '${booking.date}', '${slot.label}')">
                        删除
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function requestDelete(id, name, date, timeLabel) {
    showConfirm(
        '确认删除',
        `确定要删除 ${name} 在 ${date} ${timeLabel} 的预约吗？`,
        () => deleteBooking(id)
    );
}

async function deleteBooking(id) {
    try {
        const res = await fetch(apiUrl(`?id=eq.${id}`), {
            method: 'DELETE',
            headers: supabaseHeaders()
        });

        if (res.ok || res.status === 204) {
            showToast('删除成功', 'success');
            await loadBookings();
            renderAdminStats();
            renderAdminList();
        } else {
            showToast('删除失败', 'error');
        }
    } catch (e) {
        showToast('网络错误，请稍后重试', 'error');
    }
}

// ========== Data Loading ==========
async function loadBookings() {
    try {
        const today = formatDate(new Date());
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + CONFIG.DAYS_AHEAD);
        const futureStr = formatDate(futureDate);

        // 只查询未来 DAYS_AHEAD 天内的预约
        const res = await fetch(
            apiUrl(`?date=gte.${today}&date=lte.${futureStr}&select=id,date,time,name,phone&order=date.asc`),
            { headers: supabaseHeaders() }
        );

        if (res.ok) {
            const data = await res.json();
            allBookings = data.map(item => ({
                id: item.id,
                date: item.date,
                time: item.time,
                name: item.name,
                phone: item.phone
            }));
        }
    } catch (e) {
        console.error('Failed to load bookings:', e);
    }
}

// ========== Keyboard Handling ==========
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeBookModal();
        closeLoginModal();
        closeConfirm();
    }
    if (e.key === 'Enter') {
        const bookModal = document.getElementById('bookModal');
        const loginModal = document.getElementById('loginModal');
        if (bookModal.classList.contains('active')) {
            submitBooking();
        } else if (loginModal.classList.contains('active')) {
            verifyAdmin();
        }
    }
});

// Close modals on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('active');
        }
    });
});

// ========== Initialization ==========
async function init() {
    renderCalendar();
    await loadBookings();
    renderCalendar();
    document.getElementById('loadingScreen').classList.add('hidden');
}

window.addEventListener('DOMContentLoaded', init);
