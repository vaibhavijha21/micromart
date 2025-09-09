const API_URL = "http://localhost:5000";

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
    const loadingMessage = document.getElementById("loading-message");
    const imageUrlInput = document.getElementById("imageUrl");
    
    // New UI elements
    const postItemBtn = document.getElementById("postItemBtn");
    const postItemModal = document.getElementById("postItemModal");
    const closePostModal = document.getElementById("closePostModal");
    const searchInput = document.getElementById("searchInput");
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

    // Sidebar navigation
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
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
            }
        });
    });

    // Post Item Modal functionality
    if (postItemBtn) {
        postItemBtn.addEventListener('click', () => {
            postItemModal.classList.remove('hidden');
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
                
                if (title.includes(searchTerm) || description.includes(searchTerm)) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
        });
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

        loadingMessage.style.display = 'block';
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
                descriptionInput.value = data.description;
                imageUrlInput.value = `data:image/jpeg;base64,${base64Image}`;
            } catch (error) {
                console.error("Error during AI analysis:", error);
                alert("Failed to analyze image. Please fill out the form manually.");
            } finally {
                loadingMessage.style.display = 'none';
            }
        };
        reader.readAsDataURL(file);
    });

    itemForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = titleInput.value;
        const description = descriptionInput.value;
        const imageUrl = imageUrlInput.value;
        const postedBy = currentUser.username;

        try {
            const res = await fetch(`${API_URL}/items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title, description, imageUrl, postedBy })
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
            const res = await fetch(`${API_URL}/items`);
            const items = await res.json();
            console.log('Items fetched:', items);
            itemsContainer.innerHTML = "";
            if (items.length > 0) {
                items.forEach(item => {
                    const div = document.createElement("div");
                    div.className = "item";
                    const username = item.postedBy ? item.postedBy : 'Unknown User';
                    div.innerHTML = `
                        <h3>${item.title}</h3>
                        <p>${item.description}</p>
                        ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.title}">` : ""}
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
    if (path === '/' || path === '/index.html') {
        handleAuthentication();
    } else if (path === '/app.html') {
        handleApplication();
    } else if (path === '/chat.html') {
        handleChatPage();
    }
});