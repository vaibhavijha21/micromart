const API_URL = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : "http://localhost:5000";
const authFormsWrapper = document.getElementById("auth-forms");

const handleAuthentication = () => {
    const signupForm = document.getElementById("signupForm");
    const signinForm = document.getElementById("signinForm");
    const showSigninLink = document.getElementById("showSignin");
    const showSignupLink = document.getElementById("showSignup");
    const authTitle = document.getElementById("auth-title");

    if (localStorage.getItem('currentUser')) {
        window.location.href = '/app.html';
        return;
    }

    showSigninLink.addEventListener('click', (e) => {
        e.preventDefault();
        signupForm.style.display = 'none';
        signinForm.style.display = 'block';
        authTitle.textContent = "Sign In";
    });

    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        signinForm.style.display = 'none';
        signupForm.style.display = 'block';
        authTitle.textContent = "Sign Up";
    });

    signupForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = signupForm.signupUsername.value;
        const email = signupForm.signupEmail.value;
        const password = signupForm.signupPassword.value;

        try {
            const res = await fetch(`${API_URL}/users/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password })
            });
            const data = await res.json();
            alert(data);
            if (res.ok) {
                signupForm.reset();
                showSigninLink.click();
            }
        } catch (error) {
            console.error("Sign up error:", error.message);
        }
    });

    signinForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const email = signinForm.signinEmail.value;
        const password = signinForm.signinPassword.value;

        try {
            const res = await fetch(`${API_URL}/users/signin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const user = await res.json();
            if (res.ok) {
                localStorage.setItem('currentUser', JSON.stringify(user));
                window.location.href = '/app.html';
            } else {
                alert("Sign in failed: " + user);
            }
        } catch (error) {
            console.error("Sign in error:", error.message);
        }
    });
};

const handleApplication = () => {
    const itemForm = document.getElementById("itemForm");
    const itemsContainer = document.getElementById("itemsContainer");
    const welcomeMessage = document.getElementById("welcome-message");
    const signoutBtn = document.getElementById("signoutBtn");
    const imageInput = document.getElementById("imageInput");
    const titleInput = document.getElementById("title");
    const descriptionInput = document.getElementById("description");
    const categoryInput = document.getElementById("category");
    const locationInput = document.getElementById("location");
    const loadingMessage = document.getElementById("loading-message");
    const imageUrlInput = document.getElementById("imageUrl");
    
    // New UI elements
    const postItemBtn = document.getElementById("postItemBtn");
    const requestBtn = document.getElementById("requestBtn");
    const postItemModal = document.getElementById("postItemModal");
    const closePostModal = document.getElementById("closePostModal");
    const searchInput = document.getElementById("searchInput");
    const locationFilter = document.getElementById("locationFilter");
    const categoryFilter = document.getElementById("categoryFilter");
    const navItems = document.querySelectorAll('.nav-item');
    const contentSections = document.querySelectorAll('.content-section');

    const chatContainer = document.getElementById('chat-container');
    const chatUsername = document.getElementById('chat-username');
    const closeChatBtn = document.getElementById('closeChat');
    const messagesContainer = document.getElementById('messages');
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const socket = io(API_URL);

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!currentUser) {
        window.location.href = '/index.html';
        return;
    }

    welcomeMessage.textContent = currentUser.username;

    // ---- Profile helpers ----
    function loadProfileIntoForm() {
        const form = document.getElementById('profileForm');
        if (!form) return;
        const usernameInput = document.getElementById('profileUsername');
        const emailInput = document.getElementById('profileEmail');
        const locationInputProf = document.getElementById('profileLocation');
        const stored = JSON.parse(localStorage.getItem('profile:'+currentUser.username) || 'null');
        usernameInput.value = (stored?.username) || currentUser.username || '';
        emailInput.value = (stored?.email) || currentUser.email || '';
        locationInputProf.value = (stored?.location) || '';
    }

    function setupProfileFormHandlers() {
        const form = document.getElementById('profileForm');
        if (!form) return;
        const savedMsg = document.getElementById('profileSavedMsg');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('profileUsername').value.trim();
            const email = document.getElementById('profileEmail').value.trim();
            const locationVal = document.getElementById('profileLocation').value.trim();
            const profile = { username, email, location: locationVal };
            localStorage.setItem('profile:'+currentUser.username, JSON.stringify(profile));
            if (savedMsg) { savedMsg.classList.remove('hidden'); setTimeout(()=>savedMsg.classList.add('hidden'), 1200); }
            // reflect username in welcome if changed locally
            const displayName = username || currentUser.username;
            const welcome = document.getElementById('welcome-message');
            if (welcome) welcome.textContent = displayName;
        });
    }

    // ---- Settings helpers ----
    function loadSettingsIntoControls() {
        const themeToggle = document.getElementById('themeToggle');
        const notifToggle = document.getElementById('notifToggle');
        const settings = JSON.parse(localStorage.getItem('settings:'+currentUser.username) || 'null') || {};
        if (themeToggle) themeToggle.checked = settings.darkMode === true;
        if (notifToggle) notifToggle.checked = settings.notifications === true;
        applyTheme(settings.darkMode === true);
    }

    function setupSettingsHandlers() {
        const saveBtn = document.getElementById('saveSettingsBtn');
        const savedMsg = document.getElementById('settingsSavedMsg');
        if (!saveBtn) return;
        saveBtn.addEventListener('click', () => {
            const themeToggle = document.getElementById('themeToggle');
            const notifToggle = document.getElementById('notifToggle');
            const settings = {
                darkMode: !!(themeToggle && themeToggle.checked),
                notifications: !!(notifToggle && notifToggle.checked)
            };
            localStorage.setItem('settings:'+currentUser.username, JSON.stringify(settings));
            applyTheme(settings.darkMode);
            if (savedMsg) { savedMsg.classList.remove('hidden'); setTimeout(()=>savedMsg.classList.add('hidden'), 1200); }
        });
    }

    function applyTheme(isDark) {
        document.body.classList.toggle('dark', !!isDark);
    }

    // Sidebar navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            // Allow external links (e.g., Requests page) to navigate normally
            if (item.dataset.external === 'true') {
                const href = item.getAttribute('href') || '/request.html';
                window.location.href = href;
                return;
            }
            e.preventDefault();
            const section = item.dataset.section;
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Show corresponding content section
            contentSections.forEach(contentSection => contentSection.classList.remove('active'));
            if (section) {
                const targetSection = document.getElementById(`${section}-section`);
                if (targetSection) {
                    targetSection.classList.add('active');
                    console.log(`Switched to ${section} section`);
                } else {
                    console.error(`Section ${section}-section not found`);
                }
                
                // Handle search bar visibility
                const searchContainer = document.querySelector('.search-container');
                if (section === 'home') {
                    searchContainer.classList.remove('hidden');
                } else {
                    searchContainer.classList.add('hidden');
                }
                
                // Special handling for chat section
                if (section === 'chats') {
                    console.log('Loading chat partners for inline chat');
                    loadChatPartnersInline();
                }

                // Populate profile/settings when entering their sections
                if (section === 'profile') {
                    loadProfileIntoForm();
                }
                if (section === 'settings') {
                    loadSettingsIntoControls();
                }
            }
        });
    });

    // Post Item Modal functionality
    if (postItemBtn) {
        postItemBtn.addEventListener('click', () => {
            postItemModal.classList.remove('hidden');
        });
    }

    // Navigate to Requests page
    if (requestBtn) {
        requestBtn.addEventListener('click', () => {
            window.location.href = '/request.html';
        });
    }

    if (closePostModal) {
        closePostModal.addEventListener('click', () => {
            postItemModal.classList.add('hidden');
        });
    }

    // Close modal when clicking outside
    if (postItemModal) {
        postItemModal.addEventListener('click', (e) => {
            if (e.target === postItemModal) {
                postItemModal.classList.add('hidden');
            }
        });
    }

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const items = document.querySelectorAll('.item');
            
            items.forEach(item => {
                const title = item.querySelector('h3').textContent.toLowerCase();
                const description = item.querySelector('p').textContent.toLowerCase();
                const location = item.querySelector('.item-location span')?.textContent.toLowerCase() || '';
                
                if (title.includes(searchTerm) || description.includes(searchTerm) || location.includes(searchTerm)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }

    // Filter functionality
    if (locationFilter) {
        locationFilter.addEventListener('change', () => {
            getItems();
        });
    }

    if (categoryFilter) {
        categoryFilter.addEventListener('change', () => {
            getItems();
        });
    }

    // Populate location filter with unique locations
    async function populateLocationFilter() {
        try {
            const res = await fetch(`${API_URL}/items`);
            const items = await res.json();
            const locations = [...new Set(items.map(item => item.location).filter(Boolean))];
            
            if (locationFilter) {
                // Clear existing options except "All Locations"
                locationFilter.innerHTML = '<option value="all">All Locations</option>';
                
                locations.sort().forEach(location => {
                    const option = document.createElement('option');
                    option.value = location;
                    option.textContent = location;
                    locationFilter.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Failed to populate location filter:", error);
        }
    }

    signoutBtn.addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = '/index.html';
    });
    
    // Load chat partners for inline chat
    async function loadChatPartnersInline() {
        console.log('loadChatPartnersInline called');
        const chatPartnersListInline = document.getElementById('chatPartnersListInline');
        console.log('chatPartnersListInline element:', chatPartnersListInline);
        try {
            const res = await fetch(`${API_URL}/my-chats/${currentUser.username}`);
            const chatPartners = await res.json();
            console.log('Chat partners fetched:', chatPartners);
            chatPartnersListInline.innerHTML = '';
            if (chatPartners.length > 0) {
                chatPartners.forEach(partner => {
                    const li = document.createElement('li');
                    li.textContent = partner;
                    li.addEventListener('click', () => {
                        openChatInline(partner);
                        // Update active state
                        document.querySelectorAll('#chatPartnersListInline li').forEach(item => item.classList.remove('active'));
                        li.classList.add('active');
                    });
                    chatPartnersListInline.appendChild(li);
                });
            } else {
                chatPartnersListInline.innerHTML = '<li>No active chats.</li>';
            }
        } catch (error) {
            console.error("Error fetching chat partners:", error);
        }
    }

    // Keep the old myChatsBtn functionality for popup chat (if element exists)
    const myChatsBtn = document.getElementById('myChatsBtn');
    if (myChatsBtn) {
        myChatsBtn.addEventListener('click', async () => {
            const chatsListContainer = document.getElementById('chatsListContainer');
            const chatPartnersList = document.getElementById('chatPartnersList');
            chatsListContainer.classList.toggle('hidden');

            if (!chatsListContainer.classList.contains('hidden')) {
                try {
                    const res = await fetch(`${API_URL}/my-chats/${currentUser.username}`);
                    const chatPartners = await res.json();
                    chatPartnersList.innerHTML = '';
                    if (chatPartners.length > 0) {
                        chatPartners.forEach(partner => {
                            const li = document.createElement('li');
                            li.textContent = partner;
                            li.addEventListener('click', () => {
                                openChat(partner);
                            });
                            chatPartnersList.appendChild(li);
                        });
                    } else {
                        chatPartnersList.innerHTML = '<li>No active chats.</li>';
                    }
                } catch (error) {
                    console.error("Error fetching chat partners:", error);
                }
            }
        });
    }

    imageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

    loadingMessage.classList.remove('hidden');
        const reader = new FileReader();
        reader.onloadend = async () => {
            const base64Image = reader.result.split(',')[1];
            try {
                const res = await fetch(`${API_URL}/ai-analyze-image`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ base64Image })
                });
                const data = await res.json();
                                titleInput.value = data.title;
                                categoryInput.value = data.category;
                                imageUrlInput.value = `data:image/jpeg;base64,${base64Image}`;
                                // Animate autofilled fields
                                titleInput.classList.add('highlight-animate');
                                categoryInput.classList.add('highlight-animate');
                                setTimeout(() => {
                                    titleInput.classList.remove('highlight-animate');
                                    categoryInput.classList.remove('highlight-animate');
                                }, 1200);
            } catch (error) {
                console.error("Error during AI analysis:", error);
                alert("Failed to analyze image. Please fill out the form manually.");
            } finally {
                loadingMessage.classList.add('hidden');
            }
        };
        reader.readAsDataURL(file);
    });

    itemForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = titleInput.value;
        const description = descriptionInput.value;
        const category = categoryInput.value;
        const location = locationInput ? locationInput.value : '';
        const imageUrl = imageUrlInput.value;
        const postedBy = currentUser.username;

        try {
            const res = await fetch(`${API_URL}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, description, category, location, imageUrl, postedBy })
            });
            const data = await res.json();
            alert(data);
            itemForm.reset();
            postItemModal.classList.add('hidden');
            getItems();
        } catch (error) {
            console.error("Error posting item:", error);
        }
    });

    async function getItems() {
        console.log('getItems called');
        try {
            const locationFilterValue = locationFilter ? locationFilter.value : 'all';
            const categoryFilterValue = categoryFilter ? categoryFilter.value : 'all';
            
            let url = `${API_URL}/items`;
            const params = new URLSearchParams();
            if (locationFilterValue !== 'all') params.append('location', locationFilterValue);
            if (categoryFilterValue !== 'all') params.append('category', categoryFilterValue);
            if (params.toString()) url += '?' + params.toString();
            
            const res = await fetch(url);
            const items = await res.json();
            console.log('Items fetched:', items);
            itemsContainer.innerHTML = "";
            if (items.length > 0) {
                items.forEach(item => {
                    const div = document.createElement("div");
                    div.className = "item";
                    const username = item.postedBy ? item.postedBy : 'Unknown User';
                    const category = item.category || 'plastic'; // Default fallback for existing items
                    const location = item.location || '';
                    const imgSrc = (() => {
                        let url = item.imageUrl || '';
                        if (!url || url === 'no') return '';
                        if (url.startsWith('http') || url.startsWith('data:')) return url;
                        // normalize leading slashes
                        if (url.startsWith('/uploads/')) {
                            return `${API_URL}${url}`;
                        }
                        // strip any accidental leading 'uploads/' or '/'
                        url = url.replace(/^\/*uploads\//, '').replace(/^\/+/, '');
                        return `${API_URL}/uploads/${url}`;
                    })();
                    div.innerHTML = `
                        <h3>${item.title}</h3>
                        <p>${item.description}</p>
                        <div class="item-category">
                            <span class="category-badge category-${category}">${category.charAt(0).toUpperCase() + category.slice(1)}</span>
                        </div>
                        ${location ? `<div class=\"item-location\">\n                            <i class=\"fas fa-map-marker-alt\"></i>\n                            <span>${location}</span>\n                        </div>` : ''}
                        ${imgSrc ? `<img src="${imgSrc}" alt="${item.title}" loading="lazy">` : ""}
                        <p>Posted by: ${username}</p>
                        <small>${new Date(item.createdAt).toLocaleString()}</small>
                        ${username !== currentUser.username ? `<button class="connect-btn" data-seller="${username}">Connect with Seller</button>` : ''}
                    `;
                    itemsContainer.appendChild(div);
                });
                document.querySelectorAll('.connect-btn').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const seller = e.target.dataset.seller;
                        // Check if we're in chat section, if so use inline chat
                        const chatSection = document.getElementById('chats-section');
                        if (chatSection && chatSection.classList.contains('active')) {
                            // Switch to chat section and open inline chat
                            document.querySelector('[data-section="chats"]').click();
                            setTimeout(() => {
                                openChatInline(seller);
                                // Update active state
                                document.querySelectorAll('#chatPartnersListInline li').forEach(item => {
                                    if (item.textContent === seller) {
                                        item.classList.add('active');
                                    } else {
                                        item.classList.remove('active');
                                    }
                                });
                            }, 100);
                        } else {
                            openChat(seller);
                        }
                    });
                });
            } else {
                itemsContainer.innerHTML = '<p>No items available. Be the first to add one!</p>';
            }
        } catch (error) {
            console.error("Failed to load items:", error);
        }
    }

    // Inline chat functionality
    async function openChatInline(sellerUsername) {
        const messagesInline = document.getElementById('messagesInline');
        messagesInline.innerHTML = '';
        currentChatReceiver = sellerUsername;

        const buyer = currentUser.username;
        socket.emit('joinChat', { user1: buyer, user2: sellerUsername });

        try {
            const res = await fetch(`${API_URL}/chat-history?user1=${buyer}&user2=${sellerUsername}`);
            const chatMessages = await res.json();
            chatMessages.forEach(msg => displayMessageInline(msg, messagesInline));
            messagesInline.scrollTop = messagesInline.scrollHeight;
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    }

    async function openChat(sellerUsername) {
        chatContainer.classList.remove('hidden');
        chatUsername.textContent = sellerUsername;
        chatContainer.dataset.seller = sellerUsername;
        messagesContainer.innerHTML = '';
        document.getElementById('chatsListContainer').classList.add('hidden');

        const buyer = currentUser.username;
        const roomName = [buyer, sellerUsername].sort().join('_');
        socket.emit('joinChat', { user1: buyer, user2: sellerUsername });

        try {
            const res = await fetch(`${API_URL}/chat-history?user1=${buyer}&user2=${sellerUsername}`);
            const messages = await res.json();
            messages.forEach(msg => displayMessage(msg));
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    }

    closeChatBtn.addEventListener('click', () => {
        chatContainer.classList.add('hidden');
    });

    // Inline chat form handling
    let currentChatReceiver = null;

    // Handle inline chat form
    const chatFormInline = document.getElementById('chat-form-inline');
    if (chatFormInline) {
        chatFormInline.addEventListener('submit', (e) => {
            e.preventDefault();
            const message = document.getElementById('chat-input-inline').value;
            const activeChatPartner = document.querySelector('#chatPartnersListInline li.active');
            if (message && activeChatPartner) {
                const receiver = activeChatPartner.textContent;
                socket.emit('chatMessage', {
                    sender: currentUser.username,
                    receiver: receiver,
                    message: message
                });
                document.getElementById('chat-input-inline').value = '';
            }
        });
    }

    // Handle popup chat form
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = chatInput.value;
        const receiver = chatContainer.dataset.seller;
        
        if (message && receiver) {
            socket.emit('chatMessage', {
                sender: currentUser.username,
                receiver: receiver,
                message: message
            });
            chatInput.value = '';
        }
    });

    socket.on('message', (msg) => {
        // Display in popup chat
        displayMessage(msg);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
        // Display in inline chat if active
        const activeChatPartner = document.querySelector('#chatPartnersListInline li.active');
        if (activeChatPartner && (msg.sender === activeChatPartner.textContent || msg.receiver === activeChatPartner.textContent)) {
            const messagesInline = document.getElementById('messagesInline');
            displayMessageInline(msg, messagesInline);
            messagesInline.scrollTop = messagesInline.scrollHeight;
        }
    });

    function displayMessage(msg) {
        const div = document.createElement('div');
        div.className = `message ${msg.sender === currentUser.username ? 'sent' : 'received'}`;
        div.innerHTML = `
            <p class="message-text">${msg.message}</p>
            <span class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
        `;
        messagesContainer.appendChild(div);
    }

    function displayMessageInline(msg, container) {
        const div = document.createElement('div');
        div.className = `message ${msg.sender === currentUser.username ? 'sent' : 'received'}`;
        div.innerHTML = `
            <p class="message-text">${msg.message}</p>
            <span class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
        `;
        container.appendChild(div);
    }

    
    getItems();
    populateLocationFilter();
    setupProfileFormHandlers();
    setupSettingsHandlers();
};

const handleChatPage = () => {
    const welcomeMessage = document.getElementById('welcome-message');
    const signoutBtn = document.getElementById('signoutBtn');
    const chatPartnersList = document.getElementById('chatPartnersList');
    const chatContainerFull = document.getElementById('chat-container-full');
    const chatUsernameFull = document.getElementById('chat-username-full');
    const messagesFull = document.getElementById('messages-full');
    const chatFormFull = document.getElementById('chat-form-full');
    const chatInputFull = document.getElementById('chat-input-full');
    const socket = io(API_URL);

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    if (!currentUser) {
        window.location.href = '/index.html';
        return;
    }
    welcomeMessage.textContent = `Welcome, ${currentUser.username}!`;
    signoutBtn.addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = '/index.html';
    });

    const urlParams = new URLSearchParams(window.location.search);
    const initialSeller = urlParams.get('seller');

    async function loadChatPartners() {
        try {
            const res = await fetch(`${API_URL}/my-chats/${currentUser.username}`);
            const chatPartners = await res.json();
            chatPartnersList.innerHTML = '';
            chatPartners.forEach(partner => {
                const li = document.createElement('li');
                li.className = 'chat-partner-item';
                li.textContent = partner;
                li.addEventListener('click', () => openChat(partner));
                chatPartnersList.appendChild(li);
            });
        } catch (error) {
            console.error('Error fetching chat partners:', error);
        }
    }

    async function openChat(sellerUsername) {
        chatContainerFull.classList.remove('hidden');
        chatUsernameFull.textContent = sellerUsername;
        chatContainerFull.dataset.seller = sellerUsername;
        messagesFull.innerHTML = '';

        const buyer = currentUser.username;
        socket.emit('joinChat', { user1: buyer, user2: sellerUsername });

        try {
            const res = await fetch(`${API_URL}/chat-history?user1=${buyer}&user2=${sellerUsername}`);
            const messages = await res.json();
            messages.forEach(msg => displayMessage(msg, messagesFull));
            messagesFull.scrollTop = messagesFull.scrollHeight;
        } catch (error) {
            console.error('Failed to load chat history:', error);
        }
    }

    chatFormFull.addEventListener('submit', (e) => {
        e.preventDefault();
        const message = chatInputFull.value;
        const receiver = chatContainerFull.dataset.seller;
        if (message && receiver) {
            socket.emit('chatMessage', {
                sender: currentUser.username,
                receiver: receiver,
                message: message
            });
            chatInputFull.value = '';
        }
    });

    socket.on('message', (msg) => {
        const currentSeller = chatContainerFull.dataset.seller;
        if (msg.sender === currentSeller || msg.receiver === currentSeller) {
            displayMessage(msg, messagesFull);
            messagesFull.scrollTop = messagesFull.scrollHeight;
        }
    });

    function displayMessage(msg, container) {
        const div = document.createElement('div');
        div.className = `message ${msg.sender === currentUser.username ? 'sent' : 'received'}`;
        div.innerHTML = `
            <p class="message-text">${msg.message}</p>
            <span class="message-time">${new Date(msg.timestamp).toLocaleTimeString()}</span>
        `;
        container.appendChild(div);
    }

    loadChatPartners();
    if (initialSeller) {
        openChat(initialSeller);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname;
    if (path === '/') {
        // Start site from landing page
        window.location.replace('/landing.html');
        return;
    } else if (path === '/index.html') {
        handleAuthentication();
    } else if (path === '/app.html') {
        handleApplication();
    } else if (path === '/chat.html') {
        handleChatPage();
    } else if (path === '/request.html') {
        // Minimal request page handler if missing
        if (typeof handleRequestPage === 'function') {
            handleRequestPage();
        } else {
            // lightweight inline setup to avoid missing handler
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (!currentUser) { window.location.href = '/index.html'; return; }
            const welcomeMessage = document.getElementById('welcome-message');
            if (welcomeMessage) welcomeMessage.textContent = currentUser.username;
            const signoutBtn = document.getElementById('signoutBtn');
            if (signoutBtn) signoutBtn.addEventListener('click', () => { localStorage.removeItem('currentUser'); window.location.href = '/index.html'; });
            const cancelBtn = document.getElementById('cancelRequest');
            if (cancelBtn) cancelBtn.addEventListener('click', (e) => { e.preventDefault(); window.location.href = '/app.html'; });
            const requestsList = document.getElementById('requestsList');
            const requestSearchInput = document.getElementById('requestSearchInput');
            const requestCategoryFilter = document.getElementById('requestCategoryFilter');
            const requestsCount = document.getElementById('requestsCount');
            function renderRequests(){
                const all = JSON.parse(localStorage.getItem('requests') || '[]');
                let filtered = [...all];
                const q = (requestSearchInput?.value || '').toLowerCase();
                const cat = requestCategoryFilter?.value || 'all';
                if (q) filtered = filtered.filter(r => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || (r.location||'').toLowerCase().includes(q) || (r.requestedBy||'').toLowerCase().includes(q));
                if (cat !== 'all') filtered = filtered.filter(r => (r.category||'') === cat);
                requestsList.innerHTML='';
                if (filtered.length===0){ requestsList.innerHTML='<p>No matching requests.</p>'; if(requestsCount) requestsCount.textContent='0'; return; }
                filtered.sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)).forEach(req=>{
                    const div=document.createElement('div');
                    div.className='item';
                    const category=req.category||'general';
                    const location=req.location||'Not specified';
                    div.innerHTML=`
                        <h3>${req.title}</h3>
                        <p>${req.description}</p>
                        <div class="item-category">
                            <span class="category-badge category-${category}">${category.charAt(0).toUpperCase()+category.slice(1)}</span>
                        </div>
                        <div class="item-location">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${location}</span>
                        </div>
                        <p>Requested by: ${req.requestedBy||'Unknown'}</p>
                        <small>${new Date(req.createdAt).toLocaleString()}</small>
                    `;
                    requestsList.appendChild(div);
                });
                if (requestsCount) requestsCount.textContent = String(filtered.length);
            }
            const form = document.getElementById('requestForm');
            if (form) form.addEventListener('submit',(e)=>{
                e.preventDefault();
                const title=form.requestTitle.value.trim();
                const description=form.requestDescription.value.trim();
                const category=form.requestCategory.value;
                const location=form.requestLocation.value.trim();
                if(!title||!description||!category){ alert('Please fill out title, description, and category.'); return; }
                const arr = JSON.parse(localStorage.getItem('requests')||'[]');
                arr.push({ title, description, category, location, requestedBy: currentUser.username, createdAt: new Date().toISOString() });
                localStorage.setItem('requests', JSON.stringify(arr));
                form.reset();
                renderRequests();
            });
            if (requestSearchInput) requestSearchInput.addEventListener('input', renderRequests);
            if (requestCategoryFilter) requestCategoryFilter.addEventListener('change', renderRequests);
            renderRequests();
        }
    }
});