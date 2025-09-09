const API_URL = "http://localhost:5000";

const handleAuthentication = () => {
    const signupForm = document.getElementById("signupForm");
    const signinForm = document.getElementById("signinForm");
    const showSigninLink = document.getElementById("showSignin");
    const showSignupLink = document.getElementById("showSignup");
    const authTitle = document.getElementById("auth-title");

    // Check for an active session. If found, redirect to the app page.
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
    const myChatsBtn = document.getElementById("myChatsBtn");
    const imageInput = document.getElementById("imageInput");
    const titleInput = document.getElementById("title");
    const descriptionInput = document.getElementById("description");
    const loadingMessage = document.getElementById("loading-message");
    const imageUrlInput = document.getElementById("imageUrl");

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

    welcomeMessage.textContent = `Welcome, ${currentUser.username}!`;

    signoutBtn.addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = '/index.html';
    });
    
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
            getItems();
        } catch (error) {
            console.error("Error posting item:", error);
        }
    });

    async function getItems() {
        try {
            const res = await fetch(`${API_URL}/items`);
            const items = await res.json();
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
                        openChat(seller);
                    });
                });
            } else {
                itemsContainer.innerHTML = '<p>No items available. Be the first to add one!</p>';
            }
        } catch (error) {
            console.error("Failed to load items:", error);
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
        displayMessage(msg);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
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
    
    getItems();
};

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('signupForm') && document.getElementById('signinForm')) {
        handleAuthentication();
    } else if (document.getElementById('itemForm')) {
        handleApplication();
    }
});