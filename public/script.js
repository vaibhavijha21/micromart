const API_URL = "http://localhost:5000";

const handleAuthentication = () => {
    const signupForm = document.getElementById("signupForm");
    const signinForm = document.getElementById("signinForm");
    const showSigninLink = document.getElementById("showSignin");
    const showSignupLink = document.getElementById("showSignup");
    const authTitle = document.getElementById("auth-title");
    const authForms = document.getElementById("auth-forms");

    // Check for an active session. If found, redirect to the app page.
    if (localStorage.getItem('currentUser')) {
        window.location.href = '/app.html';
        return;
    }

    showSigninLink.addEventListener('click', (e) => {
        e.preventDefault();
        authForms.classList.add('switching');
        authForms.classList.remove('mode-signup');
        authForms.classList.add('mode-signin');
        authTitle.textContent = "Sign In";
        setTimeout(() => authForms.classList.remove('switching'), 220);
    });

    showSignupLink.addEventListener('click', (e) => {
        e.preventDefault();
        authForms.classList.add('switching');
        authForms.classList.remove('mode-signin');
        authForms.classList.add('mode-signup');
        authTitle.textContent = "Sign Up";
        setTimeout(() => authForms.classList.remove('switching'), 220);
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

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    // If no user is logged in, redirect to the sign-in page.
    if (!currentUser) {
        window.location.href = '/index.html';
        return;
    }

    welcomeMessage.textContent = `Welcome, ${currentUser.username}!`;

    signoutBtn.addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = '/index.html';
    });

    itemForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const title = itemForm.title.value;
        const description = itemForm.description.value;
        const imageUrl = itemForm.imageUrl.value;
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
                        // <button>Connect with seller</button>
                    `;
                    itemsContainer.appendChild(div);
                });
            } else {
                itemsContainer.innerHTML = '<p>No items available. Be the first to add one!</p>';
            }
        } catch (error) {
            console.error("Failed to load items:", error);
        }
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