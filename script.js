// Import Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";

// Firebase Configuration SECTION
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
        loginPage.style.display = "none";
        dashboard.style.display = "block";
        loadProducts();
    } else {
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






// PRODUCTS SECTION
// **Menampilkan Halaman Produk**
window.showProducts = () => {
    const content = document.getElementById('content');
    content.innerHTML = `
        <h2>Products</h2>
        <button onclick="addProductForm()">Add Product</button>
        <ul id="productList"></ul>
    `;

    setTimeout(() => {
        loadProducts();
    }, 100);
};
// **Menampilkan Form Tambah Produk**
window.addProductForm = () => {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="form-container">
            <h2>Add New Product</h2>
            <form id="addProductForm">
                <label>Product Image:</label>
                <input type="file" id="productImage" accept="image/*">
                <img id="imagePreview" src="default-thumbnail.png" alt="Image Preview" style="max-width: 100px; height: auto; margin-top: 10px;">

                <label>Product Name:</label>
                <input type="text" id="productName" required>

                <label>Price (Rp):</label>
                <input type="text" id="productPrice" required oninput="formatCurrency(this)">

                <label>Purchase Price (Rp):</label>
                <input type="text" id="purchasePrice" required oninput="formatCurrency(this)">

                <label>Stock:</label>
                <input type="number" id="stock" required>

                <label>Description:</label>
                <textarea id="description"></textarea>

                <label>Category:</label>
                <div>
                    <select id="categoryDropdown" required>
                        <option value="" disabled selected>Select category</option>
                    </select>
                    <input type="text" id="newCategory" placeholder="Or create new category">
                    <button type="button" onclick="addNewCategory()">Add</button>
                </div>

                <button type="submit">Save Product</button>
            </form>
        </div>
    `;

    loadCategories();
    setupProductForm();
};
// Load Products with Image
// Fungsi untuk menampilkan daftar produk dengan ikon edit & delete
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
                li.classList.add("product-item");

                li.innerHTML = `
                    <img src="${product.imageUrl || 'default-thumbnail.png'}" class="product-image">
                    <div class="product-info">
                        <h3>${product.name}</h3>
                        <p>Price: Rp${parseInt(product.price).toLocaleString("id-ID")}</p>
                    </div>
                    <button class="edit-btn" onclick="editProduct('${doc.id}', '${product.name}', '${product.price}', '${product.stock}', '${product.description}', '${product.imageUrl || 'default-thumbnail.png'}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="delete-btn" onclick="deleteProduct('${doc.id}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                `;
                productList.appendChild(li);
            });
        }
    } catch (error) {
        console.error("Error loading products:", error);
    }
};
// Fungsi untuk mengedit produk
window.editProduct = (productId, name, price, stock, description, imageUrl) => {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="form-container">
            <h2>Edit Product</h2>
            <form id="editProductForm">
                <label>Product Image:</label>
                <input type="file" id="editProductImage" accept="image/*">
                <img id="editImagePreview" src="${imageUrl}" alt="Image Preview" class="product-image">

                <label>Product Name:</label>
                <input type="text" id="editProductName" value="${name}" required>

                <label>Price (Rp):</label>
                <input type="text" id="editProductPrice" value="${price}" required oninput="formatCurrency(this)">

                <label>Stock:</label>
                <input type="number" id="editStock" value="${stock}" required>

                <label>Description:</label>
                <textarea id="editDescription">${description}</textarea>

                <button type="submit" class="submit-btn">Save Changes</button>
                <button type="button" class="cancel-btn" onclick="showProducts()">Cancel</button>
            </form>
        </div>
    `;

    // Tambahkan event listener untuk update data saat disubmit
    const form = document.getElementById('editProductForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) {
            alert("Please login first!");
            return;
        }

        const updatedName = document.getElementById('editProductName').value;
        const updatedPrice = parseInt(document.getElementById('editProductPrice').value.replace(/\./g, ''));
        const updatedStock = parseInt(document.getElementById('editStock').value);
        const updatedDescription = document.getElementById('editDescription').value;

        try {
            await updateDoc(doc(db, `users/${user.uid}/products`, productId), {
                name: updatedName,
                price: updatedPrice,
                stock: updatedStock,
                description: updatedDescription
            });

            alert("Product updated successfully!");
            showProducts();
        } catch (error) {
            console.error("Error updating product:", error);
        }
    });
};
// Delete Product Function
window.deleteProduct = async function(productId) {
    const user = auth.currentUser;
    if (!user) {
        alert("Please login first!");
        return;
    }

    if (confirm("Are you sure you want to delete this product?")) {
        try {
            await deleteDoc(doc(db, `users/${user.uid}/products`, productId));
            alert("Product deleted successfully!");
            loadProducts(); // Refresh daftar produk setelah penghapusan
        } catch (error) {
            console.error("Error deleting product:", error);
        }
    }
};
// **Menyiapkan Form Produk**
function setupProductForm() {
    document.getElementById('productImage').addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('imagePreview').src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    const form = document.getElementById('addProductForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) {
            alert("Please log in first!");
            return;
        }

        const name = document.getElementById('productName').value;
        const price = parseInt(document.getElementById('productPrice').value.replace(/\./g, ''));
        const purchasePrice = parseInt(document.getElementById('purchasePrice').value.replace(/\./g, ''));
        const stock = parseInt(document.getElementById('stock').value);
        const description = document.getElementById('description').value;
        let category = document.getElementById('categoryDropdown').value;
        let imageUrl = document.getElementById('imagePreview').src;

        if (!name || price <= 0 || stock < 0) {
            alert("Please enter valid product details.");
            return;
        }

        try {
            await addDoc(collection(db, `users/${user.uid}/products`), {
                name,
                price,
                purchasePrice,
                stock,
                description,
                category,
                imageUrl
            });

            alert("Product added successfully!");
            showProducts();
        } catch (error) {
            console.error("Error adding product:", error);
        }
    });
}
// **Memuat Kategori dari Firestore**
async function loadCategories() {
    const user = auth.currentUser;
    if (!user) return;

    const categoryDropdown = document.getElementById("categoryDropdown");
    categoryDropdown.innerHTML = '<option value="" disabled>Select category</option>';

    const querySnapshot = await getDocs(collection(db, `users/${user.uid}/categories`));
    querySnapshot.forEach((doc) => {
        const category = doc.data().name;
        const option = document.createElement("option");
        option.value = category;
        option.textContent = category;
        categoryDropdown.appendChild(option);
    });
}
// **Menambahkan Kategori Baru**
window.addNewCategory = async function() {
    const user = auth.currentUser;
    if (!user) return;

    const newCategoryInput = document.getElementById('newCategory');
    const categoryDropdown = document.getElementById('categoryDropdown');
    const newCategory = newCategoryInput.value.trim();

    if (!newCategory) return;

    try {
        await addDoc(collection(db, `users/${user.uid}/categories`), { name: newCategory });
        const newOption = document.createElement('option');
        newOption.value = newCategory;
        newOption.textContent = newCategory;
        categoryDropdown.appendChild(newOption);
        categoryDropdown.value = newCategory;
        newCategoryInput.value = '';
    } catch (error) {
        console.error("Error adding category:", error);
    }
};
// **Format Harga ke Rupiah**
window.formatCurrency = function(input) {
    let value = input.value.replace(/\D/g, "");
    if (value) {
        input.value = parseInt(value).toLocaleString("id-ID");
    }
};
