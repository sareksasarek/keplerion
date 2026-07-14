// ============================================================
//  main.js — полная клиентская логика сайта Keplerion
// ============================================================

(function() {
    'use strict';

    // ------ Вспомогательные утилиты ------
    const Utils = {
        getData(key, defaultValue = null) {
            try {
                const raw = localStorage.getItem(key);
                return raw ? JSON.parse(raw) : defaultValue;
            } catch {
                return defaultValue;
            }
        },
        setData(key, value) {
            localStorage.setItem(key, JSON.stringify(value));
        },
        uid() {
            return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        },
        formatDate(timestamp) {
            const d = new Date(timestamp);
            return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' });
        }
    };

    // ------ Модель данных ------
    const Store = {
        getProfile() {
            return Utils.getData('keplerion_profile', {
                name: 'Ваше Имя',
                email: 'example@example.com',
                joined: Date.now(),
                avatar: null
            });
        },
        saveProfile(profile) {
            Utils.setData('keplerion_profile', profile);
        },
        getBookmarks() {
            return Utils.getData('keplerion_bookmarks', []);
        },
        saveBookmarks(bookmarks) {
            Utils.setData('keplerion_bookmarks', bookmarks);
        },
        addBookmark(title, description) {
            const list = this.getBookmarks();
            const newItem = {
                id: Utils.uid(),
                title,
                description,
                added: Date.now()
            };
            list.push(newItem);
            this.saveBookmarks(list);
            return newItem;
        },
        removeBookmark(id) {
            let list = this.getBookmarks();
            list = list.filter(item => item.id !== id);
            this.saveBookmarks(list);
            return list;
        },
        getNotifications() {
            return Utils.getData('keplerion_notifications', [
                { id: 'n1', text: 'Вышла новая статья «Квантовый лабиринт»', date: Date.now() - 2 * 60 * 60 * 1000, read: false },
                { id: 'n2', text: 'Ваша подписка продлена до 15.08.2026', date: Date.now() - 24 * 60 * 60 * 1000, read: false },
                { id: 'n3', text: 'Добавлена возможность скачивать PDF-версии', date: Date.now() - 3 * 24 * 60 * 60 * 1000, read: false },
                { id: 'n4', text: 'Добро пожаловать в Keplerion! Мы рады вам.', date: Date.now() - 30 * 24 * 60 * 60 * 1000, read: false }
            ]);
        },
        saveNotifications(notifications) {
            Utils.setData('keplerion_notifications', notifications);
        },
        markNotificationRead(id) {
            const list = this.getNotifications();
            const item = list.find(n => n.id === id);
            if (item) item.read = true;
            this.saveNotifications(list);
            return list;
        }
    };

    // ------ Рендеринг ------
    const Render = {
        bookmarks(container) {
            const items = Store.getBookmarks();
            if (!container) return;
            if (items.length === 0) {
                container.innerHTML = `<p style="opacity:0.7;">У вас пока нет закладок. Добавляйте статьи, чтобы они появились здесь.</p>`;
                return;
            }
            let html = `<div class="articles-grid">`;
            items.forEach(item => {
                html += `
                    <div class="article-card" data-id="${item.id}">
                        <h4>${item.title}</h4>
                        <p>${item.description}</p>
                        <span class="remove-link" data-action="remove-bookmark" data-id="${item.id}">Удалить из закладок</span>
                    </div>
                `;
            });
            html += `</div>`;
            container.innerHTML = html;

            container.querySelectorAll('[data-action="remove-bookmark"]').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    const id = this.dataset.id;
                    Store.removeBookmark(id);
                    Render.bookmarks(container);
                    updateStats();
                    console.log(`[Keplerion] Закладка ${id} удалена`);
                });
            });
        },
        notifications(container) {
            const list = Store.getNotifications();
            if (!container) return;
            if (list.length === 0) {
                container.innerHTML = `<p style="opacity:0.7;">Нет новых оповещений.</p>`;
                return;
            }
            let html = '';
            list.forEach(n => {
                const dateStr = Utils.formatDate(n.date);
                const unreadClass = n.read ? '' : 'unread';
                html += `
                    <div class="notification ${unreadClass}" data-id="${n.id}">
                        <p>${n.text}</p>
                        <span class="notification-date">${dateStr}</span>
                        ${!n.read ? `<span class="mark-read" data-action="mark-read" data-id="${n.id}">✓ Прочитано</span>` : ''}
                    </div>
                `;
            });
            container.innerHTML = html;

            container.querySelectorAll('[data-action="mark-read"]').forEach(btn => {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    const id = this.dataset.id;
                    Store.markNotificationRead(id);
                    Render.notifications(container);
                    console.log(`[Keplerion] Уведомление ${id} отмечено прочитанным`);
                });
            });
        },
        profile(container) {
            const profile = Store.getProfile();
            if (!container) return;
            const nameEl = container.querySelector('#profileName');
            const emailEl = container.querySelector('#profileEmail');
            const avatarEl = container.querySelector('#avatarPreview');
            const joinedEl = container.querySelector('#profileJoined');

            if (nameEl) nameEl.textContent = profile.name || 'Имя Фамилия';
            if (emailEl) emailEl.textContent = `Email: ${profile.email || 'example@example.com'}`;
            if (joinedEl) {
                const date = profile.joined ? Utils.formatDate(profile.joined) : '2026 год';
                joinedEl.textContent = `Участник с ${date}`;
            }
            if (avatarEl) {
                if (profile.avatar) {
                    avatarEl.style.backgroundImage = `url('${profile.avatar}')`;
                    avatarEl.style.backgroundSize = 'cover';
                    avatarEl.style.backgroundPosition = 'center';
                    avatarEl.style.color = 'transparent';
                    avatarEl.textContent = '';
                } else {
                    const initial = (profile.name || 'А')[0].toUpperCase();
                    avatarEl.style.backgroundImage = '';
                    avatarEl.style.color = '#C8A96E';
                    avatarEl.textContent = initial;
                }
            }

            // статистика
            const bookmarksCount = Store.getBookmarks().length;
            const badgeRead = container.querySelector('#badgeRead');
            const badgeBookmarks = container.querySelector('#badgeBookmarks');
            if (badgeRead) badgeRead.textContent = `Прочитано: ${bookmarksCount * 3} статей`;
            if (badgeBookmarks) badgeBookmarks.textContent = `В закладках: ${bookmarksCount}`;
        }
    };

    function updateStats() {
        const profileContainer = document.querySelector('.profile-card');
        if (profileContainer) Render.profile(profileContainer);
    }

    // ------ Инициализация ------
    function initPage() {
        const path = window.location.pathname;
        const isCabinet = path.includes('cabinet.html') || path.endsWith('/cabinet.html');

        if (isCabinet) {
            // Проверяем, авторизован ли пользователь
            const profile = localStorage.getItem('keplerion_profile');
            if (!profile) {
                window.location.href = 'auth.html';
                return;
            }
            initCabinet();
        } else {
            initMain();
        }
    }

    // ------ Кабинет ------
    function initCabinet() {
        // Переключение вкладок
        const tabs = document.querySelectorAll('.sidebar-nav a[data-tab]');
        const tabContents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', function(e) {
                e.preventDefault();
                const target = this.dataset.tab;
                tabs.forEach(t => t.classList.remove('active'));
                this.classList.add('active');
                tabContents.forEach(tc => tc.classList.remove('active'));
                const targetEl = document.getElementById(target);
                if (targetEl) targetEl.classList.add('active');

                if (target === 'bookmarks') {
                    const container = document.querySelector('#bookmarksContainer');
                    if (container) Render.bookmarks(container);
                }
                if (target === 'notifications') {
                    const container = document.querySelector('#notificationsContainer');
                    if (container) Render.notifications(container);
                }
                if (target === 'profile') {
                    const container = document.querySelector('.profile-card');
                    if (container) Render.profile(container);
                }
                console.log(`[Keplerion] Переключена вкладка: ${target}`);
            });
        });

        // Загрузка данных
        const profileCard = document.querySelector('.profile-card');
        if (profileCard) Render.profile(profileCard);

        const bookmarksContainer = document.querySelector('#bookmarksContainer');
        if (bookmarksContainer) Render.bookmarks(bookmarksContainer);

        const notifContainer = document.querySelector('#notificationsContainer');
        if (notifContainer) Render.notifications(notifContainer);

        // Редактирование профиля (кнопка)
        const editBtn = document.querySelector('#editProfileBtn');
        if (editBtn) {
            editBtn.addEventListener('click', function(e) {
                e.preventDefault();
                const profile = Store.getProfile();
                const newName = prompt('Введите новое имя:', profile.name);
                if (newName !== null && newName.trim() !== '') {
                    profile.name = newName.trim();
                    Store.saveProfile(profile);
                    Render.profile(profileCard);
                    console.log('[Keplerion] Имя обновлено');
                }
                const newEmail = prompt('Введите новый Email:', profile.email);
                if (newEmail !== null && newEmail.trim() !== '') {
                    profile.email = newEmail.trim();
                    Store.saveProfile(profile);
                    Render.profile(profileCard);
                    console.log('[Keplerion] Email обновлён');
                }
            });
        }

        // Смена аватарки
        const avatarWrapper = document.getElementById('avatarWrapper');
        const avatarInput = document.getElementById('avatarInput');
        if (avatarWrapper && avatarInput) {
            avatarWrapper.addEventListener('click', () => avatarInput.click());
            avatarInput.addEventListener('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const dataUrl = event.target.result;
                        const avatarPreview = document.getElementById('avatarPreview');
                        if (avatarPreview) {
                            avatarPreview.style.backgroundImage = `url('${dataUrl}')`;
                            avatarPreview.style.backgroundSize = 'cover';
                            avatarPreview.style.backgroundPosition = 'center';
                            avatarPreview.style.color = 'transparent';
                            avatarPreview.textContent = '';
                        }
                        const profile = Store.getProfile();
                        profile.avatar = dataUrl;
                        Store.saveProfile(profile);
                        console.log('[Keplerion] Аватар сохранён');
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        // Настройки
        const settingsForm = document.querySelector('.settings-form');
        if (settingsForm) {
            const nameInput = document.querySelector('#settingsName');
            const emailInput = document.querySelector('#settingsEmail');
            const passInput = document.querySelector('#settingsPassword');
            const saveBtn = document.querySelector('#saveSettingsBtn');

            const profile = Store.getProfile();
            if (nameInput) nameInput.value = profile.name || '';
            if (emailInput) emailInput.value = profile.email || '';

            if (saveBtn) {
                saveBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    const newName = nameInput ? nameInput.value.trim() : '';
                    const newEmail = emailInput ? emailInput.value.trim() : '';
                    const newPass = passInput ? passInput.value.trim() : '';

                    if (newName) profile.name = newName;
                    if (newEmail) profile.email = newEmail;
                    Store.saveProfile(profile);
                    if (newPass) console.log('[Keplerion] Пароль изменён (демо)');
                    Render.profile(profileCard);
                    alert('Настройки сохранены');
                    console.log('[Keplerion] Настройки обновлены');
                });
            }
        }

        // Выход
        const logoutLink = document.querySelector('.logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', function(e) {
                e.preventDefault();
                if (confirm('Вы уверены, что хотите выйти?')) {
                    localStorage.removeItem('keplerion_profile');
                    console.log('[Keplerion] Выход из кабинета');
                    window.location.href = 'index.html';
                }
            });
        }

        // Иконка пользователя (переход на главную)
        const userIcon = document.querySelector('.user-icon');
        if (userIcon) {
            userIcon.addEventListener('click', function(e) {
                e.preventDefault();
                window.location.href = 'index.html';
            });
        }
    }

    // ------ Главная страница ------
    function initMain() {
        // Плавная прокрутка и подсветка меню
        const sections = document.querySelectorAll('section');
        const navLinks = document.querySelectorAll('.sidebar-nav a');

        if (navLinks.length && sections.length) {
            navLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    const targetId = this.getAttribute('href').substring(1);
                    const targetElement = document.getElementById(targetId);
                    if (targetElement) {
                        targetElement.scrollIntoView({ behavior: 'smooth' });
                        console.log(`[Keplerion] Прокрутка к секции: ${targetId}`);
                    }
                });
            });

            window.addEventListener('scroll', function() {
                let current = '';
                sections.forEach(section => {
                    const sectionTop = section.offsetTop - 100;
                    if (window.pageYOffset >= sectionTop) {
                        current = section.getAttribute('id');
                    }
                });
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === '#' + current) {
                        link.classList.add('active');
                    }
                });
            });
        }

        // Ссылки "Читать →"
        document.querySelectorAll('.article-card .read-more').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const title = this.closest('.article-card').querySelector('h3')?.textContent || 'Статья';
                alert(`Открывается статья: "${title}" (демо-режим)`);
                console.log(`[Keplerion] Чтение статьи: ${title}`);
            });
        });

        // Иконка пользователя – если залогинен, ведём в кабинет, иначе на вход
        const userIcon = document.querySelector('.user-icon');
        if (userIcon) {
            userIcon.addEventListener('click', function(e) {
                e.preventDefault();
                const profile = localStorage.getItem('keplerion_profile');
                if (profile) {
                    window.location.href = 'cabinet.html';
                } else {
                    window.location.href = 'auth.html';
                }
            });
        }

        console.log('[Keplerion] Главная страница готова');
    }

    // ------ Старт ------
    document.addEventListener('DOMContentLoaded', initPage);
})();