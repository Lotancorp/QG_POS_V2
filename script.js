// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyCS2k7FjEGW8ozISjE5C-TS1nVBRZwwdwU",
    authDomain: "pos--online.firebaseapp.com",
    projectId: "pos--online",
    storageBucket: "pos--online.firebasestorage.app",
    messagingSenderId: "223939358454",
    appId: "1:223939358454:web:406b0aebc07d22723a86d7",
    measurementId: "G-JKMHHHMTEK"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Elements
const loginPage = document.getElementById("login-page");
const dashboard = document.getElementById("dashboard");
const loginBtn = document.getElementById("loginBtn");

// Login with Google
loginBtn.addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
        alert("Login Successful!");
    } catch (error) {
        console.error("Error during login:", error);
    }
});

// Handle Authentication State
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("User logged in:", user);
        loginPage.style.display = "none";
        dashboard.style.display = "block";
    } else {
        console.log("No user logged in");
        loginPage.style.display = "flex";
        dashboard.style.display = "none";
    }
});

// Account Section
window.showAccount = () => {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="account-header">
            <h2>${auth.currentUser.displayName || "User Name"}</h2>
            <p>${auth.currentUser.email || "user@example.com"}</p>
        </div>
        <div class="account-section">
            <h3>Account Management</h3>
            <ul class="account-list">
                <li onclick="editProfile()">Edit Profile <span>&rsaquo;</span></li>
                <li onclick="changePassword()">Change Password <span>&rsaquo;</span></li>
            </ul>
        </div>
        <div class="account-section">
            <h3>Transaction History</h3>
            <ul class="account-list">
                <li onclick="viewTransactionHistory()">View Transactions <span>&rsaquo;</span></li>
            </ul>
        </div>
    `;
};

// Edit Profile
const editProfile = () => {
    const content = document.getElementById('content');
    content.innerHTML = `
        <h2>Edit Profile</h2>
        <form id="editProfileForm">
            <label for="editName">Name:</label>
            <input type="text" id="editName" value="${auth.currentUser.displayName}" required>
            <button type="submit" class="action-btn">Save Changes</button>
        </form>
    `;

    const form = document.getElementById('editProfileForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newName = document.getElementById('editName').value;
        try {
            await auth.currentUser.updateProfile({ displayName: newName });
            alert("Profile updated successfully!");
            showAccount();
        } catch (error) {
            console.error("Error updating profile:", error);
        }
    });
};

// Products Section
window.showProducts = () => {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="product-header">
            <h2>Products</h2>
            <button class="add-product-btn" onclick="addProductForm()">Add Product</button>
        </div>
        <ul id="productList" class="product-list">
            <li>Loading products...</li>
        </ul>
    `;
    loadProducts();
};

// Add Product
const addProductForm = () => {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="form-container">
            <h2>Add New Product</h2>
            <form id="addProductForm">
                <label for="productName">Product Name:</label>
                <input type="text" id="productName" required>
                <label for="productPrice">Price:</label>
                <input type="number" id="productPrice" required>
                <button type="submit" class="submit-btn">Save Product</button>
                <button type="button" class="cancel-btn" onclick="showProducts()">Cancel</button>
            </form>
        </div>
    `;

    const form = document.getElementById('addProductForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('productName').value;
        const price = parseFloat(document.getElementById('productPrice').value);

        if (!name || price <= 0) {
            alert("Please enter a valid product name and price.");
            return;
        }

        try {
            await addDoc(collection(db, `users/${auth.currentUser.uid}/products`), { name, price });
            alert("Product added successfully!");
            showProducts();
        } catch (error) {
            console.error("Error adding product:", error);
        }
    });
};

// Load Products
const loadProducts = async () => {
    const user = auth.currentUser;
    if (!user) {
        alert("Please login first!");
        return;
    }
    const productList = document.getElementById('productList');
    productList.innerHTML = '';

    try {
        const querySnapshot = await getDocs(collection(db, `users/${user.uid}/products`));
        if (querySnapshot.empty) {
            productList.innerHTML = '<li>No products found.</li>';
        } else {
            querySnapshot.forEach((doc) => {
                const product = doc.data();
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="product-item">
                        <div class="product-info">
                            <h3>${product.name}</h3>
                            <p>Price: $${product.price}</p>
                        </div>
                        <button class="delete-btn" onclick="deleteProduct('${doc.id}')">Delete</button>
                    </div>
                `;
                productList.appendChild(li);
            });
        }
    } catch (error) {
        console.error("Error loading products:", error);
    }
};

// Delete Product
const deleteProduct = async (productId) => {
    if (confirm("Are you sure you want to delete this product?")) {
        try {
            await deleteDoc(doc(db, `users/${auth.currentUser.uid}/products`, productId));
            alert("Product deleted successfully!");
            loadProducts();
        } catch (error) {
            console.error("Error deleting product:", error);
        }
    }
};

// Logout
window.logout = async () => {
    try {
        await signOut(auth);
        alert("Logged out successfully!");
    } catch (error) {
        console.error("Error during logout:", error);
    }
};
