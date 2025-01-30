// Import Firebase SDK
import {
    initializeApp
  } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
  import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
  } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
  import {
    getFirestore,
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc,
    updateDoc,
    runTransaction,
    increment
  } from "https://www.gstatic.com/firebasejs/11.2.0/firebase-firestore.js";
  
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
  
/********************************************** 
 * VARIABEL GLOBAL
 **********************************************/
let allPOSProducts = []; // Menyimpan data produk dari Firestore
let cartPOS = [];        // Menyimpan item yang ditambahkan ke keranjang
let cachedProducts = []; // array untuk menampung data produk
// PRODUCTS SECTION
// ==================================================

/**********************************************
 * Menampilkan Halaman Produk
 **********************************************/
window.showProducts = () => {
    const content = document.getElementById('content');
    content.innerHTML = `
        <!-- Kotak pencarian tetap -->
        <div class="search-container">
            <input type="text" id="searchProduct" placeholder="Search products...">
        </div>

        <h2>Products</h2>

        <!-- Toolbar Produk -->
        <div class="product-toolbar">
            <button class="add-product-btn" onclick="addProductForm()">Add Product</button>
            
            <!-- Garis pemisah, bisa dengan <hr> atau styling CSS -->
            <hr class="toolbar-separator">

            <!-- Container untuk filter -->
            <div class="filter-container">
                <button id="btnFilterAZ">
                    <i class="fas fa-sort-alpha-down"></i> A-Z
                </button>
                <button id="btnFilterZA">
                    <i class="fas fa-sort-alpha-up"></i> Z-A
                </button>

                <!-- Filter kategori -->
                <select id="filterCategory">
                    <option value="">All Categories</option>
                    <!-- Nanti diisi dynamic -->
                </select>

                <!-- Tombol Manage Categories -->
                <button id="manageCategoryBtn">
                    <i class="fas fa-cog"></i> Manage Categories
                </button>
            </div>
        </div>

        <!-- Daftar produk -->
        <ul id="productList"></ul>
    `;

    // Event: Search
    document.getElementById('searchProduct').addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const productItems = document.querySelectorAll('.product-item');

        productItems.forEach(item => {
            const productName = item.querySelector('h3').textContent.toLowerCase();
            item.style.display = productName.includes(searchTerm) ? 'flex' : 'none';
        });
    });

    // Event: Sort A-Z
    document.getElementById('btnFilterAZ').addEventListener('click', () => {
        sortProductsAZ();
    });

    // Event: Sort Z-A
    document.getElementById('btnFilterZA').addEventListener('click', () => {
        sortProductsZA();
    });

    // Event: Filter Kategori
    const filterCategorySelect = document.getElementById('filterCategory');
    filterCategorySelect.addEventListener('change', () => {
        filterByCategory(filterCategorySelect.value);
    });

    // Event: Manage Categories
    document.getElementById('manageCategoryBtn').addEventListener('click', () => {
        showCategoryManager(); // Buat fungsi terpisah untuk mengelola kategori
    });

    // Panggil loadProducts dengan sedikit delay (opsional)
    setTimeout(() => {
        loadProducts();
        loadCategoryOptions(); // Untuk isi <select> filter kategori
    }, 100);
};

async function loadCategoryOptions() {
    const user = auth.currentUser;
    if (!user) return;

    const filterSelect = document.getElementById('filterCategory');
    if (!filterSelect) return;

    // Kosongkan, lalu tambah "All Categories"
    filterSelect.innerHTML = '<option value="">All Categories</option>';

    const querySnapshot = await getDocs(collection(db, `users/${user.uid}/categories`));
    querySnapshot.forEach((doc) => {
        const catData = doc.data();
        const option = document.createElement('option');
        option.value = catData.name;
        option.textContent = catData.name;
        filterSelect.appendChild(option);
    });
}

// Fungsi menampilkan array produk ke #productList
function renderProductList(products) {
    const productList = document.getElementById('productList');
    productList.innerHTML = '';

    if (!products || products.length === 0) {
        productList.innerHTML = '<li>No products found.</li>';
        return;
    }

    products.forEach((product) => {
        const li = document.createElement('li');
        li.classList.add("product-item");
        li.innerHTML = `
            <img src="${product.imageUrl || 'default-thumbnail.png'}" class="product-image">
            <div class="product-info">
                <h3>${product.name}</h3>
                <p>Price: Rp${parseInt(product.price).toLocaleString("id-ID")}</p>
            </div>
            <button class="edit-btn" onclick="editProduct(
                '${product.docId}',
                '${product.name}',
                '${product.price}',
                '${product.stock}',
                '${product.description}',
                '${product.imageUrl || 'default-thumbnail.png'}'
            )">
                <i class="fas fa-edit"></i>
            </button>
            <button class="delete-btn" onclick="deleteProduct('${product.docId}')">
                <i class="fas fa-trash-alt"></i>
            </button>
        `;
        productList.appendChild(li);
    });
}
function sortProductsAZ() {
    // Sort ascending by product.name
    cachedProducts.sort((a, b) => {
        // misal compare case-insensitive
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        return nameA.localeCompare(nameB);
    });
    renderProductList(cachedProducts);
}
function sortProductsZA() {
    // Sort descending by product.name
    cachedProducts.sort((a, b) => {
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        return nameB.localeCompare(nameA);
    });
    renderProductList(cachedProducts);
}
function filterByCategory(category) {
    if (!category) {
        // Tampilkan semua produk
        renderProductList(cachedProducts);
        return;
    }
    // Filter
    const filtered = cachedProducts.filter(prod => prod.category === category);
    renderProductList(filtered);
}

/****************************************
 * Menampilkan halaman Manage Categories
 ****************************************/
window.showCategoryManager = function() {
    const user = auth.currentUser;
    if (!user) {
        alert("Please login first!");
        return;
    }

    const content = document.getElementById('content');
    content.innerHTML = `
        <h2>Manage Categories</h2>
        <button onclick="showProducts()">Back to Products</button>
        <div id="categoryManagerContainer" style="margin-top: 20px;">
            <!-- Nanti daftar kategori akan dimuat di sini -->
        </div>
    `;

    loadCategoryList();
};

/****************************************
 * Memuat daftar kategori dari Firestore
 * dan menampilkannya dengan rapi
 ****************************************/
async function loadCategoryList() {
    const user = auth.currentUser;
    if (!user) return;

    const container = document.getElementById('categoryManagerContainer');
    container.innerHTML = 'Loading...';

    try {
        const querySnapshot = await getDocs(collection(db, `users/${user.uid}/categories`));
        if (querySnapshot.empty) {
            container.innerHTML = '<p>No categories found.</p>';
            return;
        }

        // Bangun HTML <ul> tanpa bullet (list-style: none)
        let html = `
            <ul id="categoryList" style="list-style-type: none; padding: 0; margin: 0;">
        `;

        querySnapshot.forEach((docSnap) => {
            const catData = docSnap.data();
            const docId = docSnap.id;
            const catName = catData.name;

            // Gunakan flexbox di <li> supaya nama di kiri & tombol di kanan
            html += `
                <li 
                    style="
                        display: flex; 
                        align-items: center; 
                        justify-content: space-between; 
                        margin-bottom: 10px;
                        background: #f9f9f9;
                        padding: 8px;
                        border-radius: 5px;
                    "
                >
                    <span>${catName}</span>
                    <div class="category-actions" style="display: flex; gap: 8px;">
                        <button onclick="deleteCategory('${docId}')">Delete</button>
                        <button onclick="editCategoryPrompt('${docId}', '${catName}')">Edit</button>
                    </div>
                </li>
            `;
        });

        html += `</ul>`;

        container.innerHTML = html;
    } catch (error) {
        console.error("Error loading categories:", error);
        container.innerHTML = `<p>Error loading categories: ${error.message}</p>`;
    }
}

/****************************************
 * Menghapus kategori (harus global/di-attach ke window)
 ****************************************/
window.deleteCategory = async function(categoryId) {
    const user = auth.currentUser;
    if (!user) return;

    if (!confirm("Are you sure you want to delete this category?")) return;

    try {
        await deleteDoc(doc(db, `users/${user.uid}/categories`, categoryId));
        alert("Category deleted successfully!");
        loadCategoryList(); // Refresh daftar
    } catch (error) {
        console.error("Error deleting category:", error);
    }
};

/****************************************
 * Prompt Edit Category Name 
 ****************************************/
window.editCategoryPrompt = function(categoryId, oldName) {
    const newName = prompt("Edit Category Name:", oldName);
    if (!newName || newName.trim() === "") return;

    updateCategory(categoryId, newName.trim());
};

/****************************************
 * Update Category Name di Firestore
 ****************************************/
async function updateCategory(categoryId, newName) {
    const user = auth.currentUser;
    if (!user) return;

    try {
        await updateDoc(doc(db, `users/${user.uid}/categories`, categoryId), { name: newName });
        alert("Category updated successfully!");
        loadCategoryList();
    } catch (error) {
        console.error("Error updating category:", error);
    }
}





/**********************************************
 * Menampilkan Form Tambah Produk
 **********************************************/
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

                <!-- Tombol aksi -->
                <button type="submit" class="submit-btn">Save Product</button>
                <button type="button" class="cancel-btn" id="cancelAddBtn">Cancel</button>
            </form>
        </div>
    `;

    // Panggil fungsi memuat kategori dan setup form
    loadCategories();
    setupProductForm();

    // Tambahkan event ke tombol "Cancel" agar kembali ke showProducts()
    document.getElementById('cancelAddBtn').addEventListener('click', () => {
        showProducts();
    });
};

/**********************************************
 * Mengambil & Menampilkan Daftar Produk (beserta ikon Edit/Delete)
 **********************************************/
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
        cachedProducts = []; // kosongkan
        querySnapshot.forEach((doc) => {
            const product = doc.data();
            product.docId = doc.id;
            cachedProducts.push(product);
        });

        if (cachedProducts.length === 0) {
            productList.innerHTML = '<li>No products found.</li>';
        } else {
            // Tampilkan
            renderProductList(cachedProducts);
        }
    } catch (error) {
        console.error("Error loading products:", error);
    }
};

/**********************************************
 * Menampilkan Form Edit Produk
 **********************************************/
// Edit Product Function
window.editProduct = (
    productId, 
    name, 
    price, 
    stock, 
    description, 
    imageUrl, 
    category = "", 
    purchasePrice = ""
) => {
    const content = document.getElementById('content');
    content.innerHTML = `
        <div class="form-container">
            <h2>Edit Product</h2>
            <form id="editProductForm">
                <label>Product Image:</label>
                <input type="file" id="editProductImage" accept="image/*">
                <img id="editImagePreview" 
                     src="${imageUrl}" 
                     alt="Image Preview" 
                     style="max-width: 100px; height: auto; margin-top: 10px;">

                <label>Product Name:</label>
                <input type="text" id="editProductName" value="${name}" required>

                <label>Price (Rp):</label>
                <input type="text" id="editProductPrice" value="${price}" required oninput="formatCurrency(this)">

                <label>Purchase Price (Rp):</label>
                <input type="text" id="editPurchasePrice" value="${purchasePrice}" required oninput="formatCurrency(this)">

                <label>Stock:</label>
                <input type="number" id="editStock" value="${stock}" required>

                <label>Description:</label>
                <textarea id="editDescription">${description}</textarea>

                <label>Category:</label>
                <div>
                    <select id="editCategoryDropdown" required>
                        <option value="" disabled>Select category</option>
                    </select>
                    <input type="text" id="newCategoryEdit" placeholder="Or create new category">
                    <button type="button" id="addNewCategoryEditBtn">Add</button>
                </div>

                <!-- Tombol aksi -->
                <button type="submit" class="submit-btn">Save Changes</button>
                <button type="button" class="cancel-btn" id="cancelEditBtn">Cancel</button>
            </form>
        </div>
    `;

    // Load daftar kategori ke dropdown
    loadEditCategories(category);

    // Event: Tambah kategori baru
    document.getElementById('addNewCategoryEditBtn')
            .addEventListener('click', addNewCategoryEdit);

    // Event: Cancel => kembali ke showProducts()
    document.getElementById('cancelEditBtn').addEventListener('click', () => {
        showProducts();
    });

    // Form submit => update data Firestore
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
        const updatedPurchasePrice = parseInt(document.getElementById('editPurchasePrice').value.replace(/\./g, ''));
        const updatedStock = parseInt(document.getElementById('editStock').value);
        const updatedDescription = document.getElementById('editDescription').value;
        const updatedCategory = document.getElementById('editCategoryDropdown').value;

        try {
            await updateDoc(doc(db, `users/${user.uid}/products`, productId), {
                name: updatedName,
                price: updatedPrice,
                purchasePrice: updatedPurchasePrice,
                stock: updatedStock,
                description: updatedDescription,
                category: updatedCategory
            });

            alert("Product updated successfully!");
            showProducts();
        } catch (error) {
            console.error("Error updating product:", error);
        }
    });
};

/**
 * Memuat daftar kategori ke dropdown editCategoryDropdown,
 * lalu set value-nya sesuai kategori produk saat ini (jika ada).
 */
async function loadEditCategories(currentCategory) {
    const user = auth.currentUser;
    if (!user) return;

    const editCategoryDropdown = document.getElementById("editCategoryDropdown");
    editCategoryDropdown.innerHTML = '<option value="" disabled>Select category</option>';

    try {
        // Ambil list categories
        const querySnapshot = await getDocs(collection(db, `users/${user.uid}/categories`));
        let foundSelected = false;
        querySnapshot.forEach((docSnap) => {
            const catData = docSnap.data();
            const option = document.createElement("option");
            option.value = catData.name;
            option.textContent = catData.name;

            // Jika catData.name sama dengan kategori saat ini, tandai selected
            if (currentCategory && catData.name === currentCategory) {
                option.selected = true;
                foundSelected = true;
            }
            editCategoryDropdown.appendChild(option);
        });

        // Kalau tidak menemukan kategori lama (bisa karena dihapus),
        // atau currentCategory kosong, biarkan user pilih.
        // Atau set saja selectedIndex = 0 agar tetap "Select category"
        if (!foundSelected && currentCategory) {
            // Tambahkan satu option agar user tahu kategori lamanya terhapus
            const missingOption = document.createElement("option");
            missingOption.value = currentCategory;
            missingOption.textContent = `${currentCategory} (not found in list)`;
            missingOption.selected = true;
            editCategoryDropdown.appendChild(missingOption);
        }
    } catch (error) {
        console.error("Error loading categories:", error);
    }
}
/**
 * Menambahkan kategori baru via form Edit Product
 * (sama logikanya seperti addNewCategory, tapi ID field beda)
 */
window.addNewCategoryEdit = async function() {
    const user = auth.currentUser;
    if (!user) return;

    const newCategoryInput = document.getElementById('newCategoryEdit');
    const editCategoryDropdown = document.getElementById('editCategoryDropdown');
    const newCategory = newCategoryInput.value.trim();

    if (!newCategory) {
        alert("Please enter a valid category name.");
        return;
    }

    try {
        // Tambahkan ke Firestore
        await addDoc(collection(db, `users/${user.uid}/categories`), {
            name: newCategory
        });

        // Tambahkan option ke dropdown
        const newOption = document.createElement('option');
        newOption.value = newCategory;
        newOption.textContent = newCategory;
        editCategoryDropdown.appendChild(newOption);

        // Set dropdown ke kategori baru
        editCategoryDropdown.value = newCategory;
        newCategoryInput.value = '';

        alert("Category added successfully!");
    } catch (error) {
        console.error("Error adding category:", error);
    }
};


/**********************************************
 * Menghapus Produk
 **********************************************/
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

/**********************************************
 * Menyiapkan Form Tambah Produk (Upload Gambar, dsb.)
 **********************************************/
function setupProductForm() {
    // Preview gambar saat file diinput
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

    // Event submit form untuk menambahkan produk ke Firestore
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

/**********************************************
 * Memuat Daftar Kategori dari Firestore
 **********************************************/
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

/**********************************************
 * Menambahkan Kategori Baru
 **********************************************/
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

/**********************************************
 * Format Harga ke Rupiah
 **********************************************/
window.formatCurrency = function(input) {
    let value = input.value.replace(/\D/g, "");
    if (value) {
        input.value = parseInt(value).toLocaleString("id-ID");
    }
};


  


/********************************************** 
 * AMBIL DATA PRODUK DARI FIRESTORE
 **********************************************/
async function loadPOSProducts() {
  const user = auth.currentUser;
  if (!user) return;

  allPOSProducts = []; // Kosongkan dulu

  try {
    const qSnapshot = await getDocs(collection(db, `users/${user.uid}/products`));
    qSnapshot.forEach((docSnap) => {
      const product = docSnap.data();
      product.id = docSnap.id; // Simpan ID dokumen
      allPOSProducts.push(product);
    });
  } catch (error) {
    console.error("Error loading POS products:", error);
  }
}

/********************************************** 
 * FILTER (SEARCH) PRODUK
 **********************************************/
function filterPOSProducts(e) {
  const searchTerm = e.target.value.trim().toLowerCase();
  const posProductList = document.getElementById('pos-product-list');

  // Jika input pencarian kosong, bersihkan daftar
  if (!searchTerm) {
    posProductList.innerHTML = '';
    return;
  }

  // Filter produk berdasar nama
  const filtered = allPOSProducts.filter(item =>
    item.name && item.name.toLowerCase().includes(searchTerm)
  );

  // Tampilkan hasil
  posProductList.innerHTML = '';
  if (filtered.length === 0) {
    posProductList.innerHTML = '<p>No matching products.</p>';
    return;
  }

  // Buat layout grid (opsional, bisa atur di CSS)
  filtered.forEach(product => {
    const productDiv = document.createElement('div');
    productDiv.classList.add('pos-product-item');
    productDiv.style.border = '1px solid #ccc';
    productDiv.style.padding = '8px';
    productDiv.style.margin = '5px';
    productDiv.style.textAlign = 'center';
    productDiv.style.display = 'inline-block';
    productDiv.style.width = '120px';

    productDiv.innerHTML = `
      <img src="${product.imageUrl || 'default-thumbnail.png'}" 
           style="width:60px; height:60px; object-fit:cover; margin-bottom:5px;">
      <div class="product-info">
        <h4 style="margin:0; font-size:14px;">${product.name}</h4>
        <p style="margin:0; font-size:12px;">
          Rp${parseInt(product.price).toLocaleString('id-ID')}
        </p>
      </div>
      <button class="add-to-cart-btn" style="margin-top:5px;">Add to Cart</button>
    `;

    // Event "Add to Cart"
    productDiv.querySelector('.add-to-cart-btn').addEventListener('click', () => {
      addToCartPOS(product);
    });

    posProductList.appendChild(productDiv);
  });
}

/********************************************** 
 * TAMBAH ITEM KE CART
 **********************************************/
function addToCartPOS(product) {
  // Cek apakah sudah ada
  const existingItem = cartPOS.find(item => item.id === product.id);
  if (existingItem) {
    existingItem.qty += 1;
  } else {
    cartPOS.push({ ...product, qty: 1 });
  }
  updateCartDisplay();

  // Bersihkan search agar list produk menghilang
  const searchInput = document.getElementById('posSearchProduct');
  if (searchInput) {
    searchInput.value = '';
  }
  const posProductList = document.getElementById('pos-product-list');
  if (posProductList) {
    posProductList.innerHTML = '';
  }
}

/********************************************** 
 * UPDATE TAMPILAN CART
 **********************************************/
function updateCartDisplay() {
  const cartDiv = document.getElementById('pos-cart');
  const totalEl = document.getElementById('pos-total');
  if (!cartDiv || !totalEl) return;

  cartDiv.innerHTML = '';
  let total = 0;

  if (cartPOS.length === 0) {
    cartDiv.innerHTML = '<p>No items in cart.</p>';
    totalEl.textContent = '0';
    return;
  }

  cartPOS.forEach((item, index) => {
    const subTotal = parseInt(item.price) * item.qty;
    total += subTotal;

    const itemRow = document.createElement('div');
    itemRow.style.marginBottom = '10px';
    itemRow.innerHTML = `
      <strong>${item.name}</strong><br>
      Rp${parseInt(item.price).toLocaleString('id-ID')} x 
      <input type="number" min="1" value="${item.qty}" style="width:50px" class="qty-input">
      = Rp${subTotal.toLocaleString('id-ID')}
      <br>
      <button class="remove-btn">Remove</button>
    `;

    // Ubah qty
    const qtyInput = itemRow.querySelector('.qty-input');
    qtyInput.addEventListener('change', (e) => {
      let newQty = parseInt(e.target.value);
      if (isNaN(newQty) || newQty < 1) newQty = 1;
      cartPOS[index].qty = newQty;
      updateCartDisplay();
    });

    // Remove
    const removeBtn = itemRow.querySelector('.remove-btn');
    removeBtn.addEventListener('click', () => {
      cartPOS.splice(index, 1);
      updateCartDisplay();
    });

    cartDiv.appendChild(itemRow);
  });

  totalEl.textContent = total.toLocaleString('id-ID');
}

/********************************************** 
 * TAMPILKAN HALAMAN POS
 **********************************************/
window.showPOS = async function() {
  const user = auth.currentUser;
  if (!user) {
    alert("Please login first!");
    return;
  }

  // Siapkan layout POS di #content
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2>New Transaction</h2>
    <div class="search-container">
      <input type="text" id="posSearchProduct" placeholder="Search product...">
    </div>

    <!-- Daftar produk yang akan diisi jika user ketik search -->
    <div id="pos-product-list" style="margin-top:10px;"></div>

    <h3>Cart</h3>
    <div id="pos-cart"></div>
    <p>Total: <span id="pos-total">0</span></p>
    <button id="pos-checkout-btn">Checkout</button>

    <!-- Bagian Payment (Modal/Section) -->
    <div id="payment-section" style="display: none; margin-top: 10px; border:1px solid #ccc; padding:10px;">
      <h3>Payment Confirmation</h3>
      <p>Total: <span id="paymentTotal"></span></p>

      <label for="paymentMethod">Payment Method:</label>
      <select id="paymentMethod">
        <option value="cash">Cash</option>
        <option value="card">Card</option>
        <option value="ewallet">E-Wallet</option>
      </select>
      <br><br>

      <label for="amountPaid">Amount Paid (Rp):</label>
      <input type="text" id="amountPaid" oninput="formatCurrency(this)">
      <br><br>

      <p>Change: <span id="paymentChange">0</span></p>

      <button id="processPaymentBtn">Process</button>
      <button id="cancelPaymentBtn">Cancel</button>
    </div>
  `;

  // Ambil data produk dulu, lalu tunggu
  await loadPOSProducts();

  // Pasang event listener pada pencarian
  const searchInput = document.getElementById('posSearchProduct');
  searchInput.addEventListener('input', filterPOSProducts);

  // Tombol Checkout
  const checkoutBtn = document.getElementById('pos-checkout-btn');
  checkoutBtn.addEventListener('click', () => {
    if (cartPOS.length === 0) {
      alert("Cart is empty!");
      return;
    }
    // Munculkan section pembayaran
    document.getElementById('payment-section').style.display = 'block';
    // Isi total
    const totalText = document.getElementById('pos-total').textContent;
    document.getElementById('paymentTotal').textContent = totalText;
    // Reset Payment Input
    document.getElementById('amountPaid').value = '';
    document.getElementById('paymentChange').textContent = '0';
  });

  // Tombol "Process" Payment
  document.getElementById('processPaymentBtn').addEventListener('click', finalizeTransaction);

  // Tombol "Cancel" Payment
  document.getElementById('cancelPaymentBtn').addEventListener('click', () => {
    document.getElementById('payment-section').style.display = 'none';
  });

  // Pantau perubahan "amountPaid" untuk hitung kembalian
  const amountPaidInput = document.getElementById('amountPaid');
  amountPaidInput.addEventListener('input', calculateChange);

  // Tampilkan cart
  updateCartDisplay();
};

/********************************************** 
 * HITUNG KEMBALIAN SAAT AMOUNT PAID BERUBAH
 **********************************************/
function calculateChange() {
  const totalText = document.getElementById('paymentTotal').textContent;
  const total = parseInt(totalText.replace(/\./g, '')) || 0;

  let paidText = document.getElementById('amountPaid').value;
  paidText = paidText.replace(/\./g, '');
  const paid = parseInt(paidText) || 0;

  const change = paid - total;
  document.getElementById('paymentChange').textContent = (change < 0)
    ? "0" 
    : change.toLocaleString('id-ID');
}

/********************************************** 
 * BUAT/MUAT NOMOR INVOICE
 **********************************************/
async function generateInvoiceNo(db, uid) {
    // Lokasi penyimpanan “counter” invoice, misalnya di `meta/invoiceCounter`
    const invoiceRef = doc(db, `users/${uid}/meta`, "invoiceCounter");
  
    // Jalankan transaction agar aman dari benturan (race condition)
    const invoiceNo = await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(invoiceRef);
  
      // Dapatkan Tahun-Bulan sekarang
      const now = new Date();
      const year = now.getFullYear(); // ex: 2025
      const month = String(now.getMonth() + 1).padStart(2, "0"); // ex: "01"
  
      const currentYearMonth = `${year}-${month}`;
      let currentNumber = 1; // default jika belum ada data
  
      if (!counterSnap.exists()) {
        // Jika belum ada doc invoiceCounter, inisialisasi
        transaction.set(invoiceRef, {
          currentMonth: currentYearMonth,
          currentNumber: currentNumber
        });
      } else {
        // Jika sudah ada, ambil data
        const data = counterSnap.data();
  
        // Jika berganti bulan (atau tahun)
        if (data.currentMonth !== currentYearMonth) {
          // Reset
          transaction.update(invoiceRef, {
            currentMonth: currentYearMonth,
            currentNumber: currentNumber
          });
        } else {
          // Lanjutkan nomor terakhir +1
          currentNumber = (data.currentNumber || 0) + 1;
          transaction.update(invoiceRef, {
            currentNumber: currentNumber
          });
        }
      }
  
      // Bentuk string invoice => "Invoice-2025/01-0001"
      const invoiceStr = `Invoice-${year}/${month}-${String(currentNumber).padStart(4, "0")}`;
      return invoiceStr;
    });
  
    return invoiceNo; 
  }
  
  /********************************************** 
   * FINALIZE TRANSACTION (ganti versi lama!)
   **********************************************/
  async function finalizeTransaction() {
    // ... (bagian hitung total, paid, change dsb. tetap sama)
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");
  
      // Dapatkan invoiceNo, lalu addDoc ke sales
      const invoiceNo = await generateInvoiceNo(db, user.uid);
      await addDoc(collection(db, `users/${user.uid}/sales`), {
        invoiceNo,
        cart: cartPOS.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          qty: item.qty
        })),
        total,
        paid,
        change,
        method,
        date: new Date()
      });
  
      // (1) KURANGI STOK per item
      for (const cartItem of cartPOS) {
        const productRef = doc(db, `users/${user.uid}/products`, cartItem.id);
        // Decrement stok sesuai qty
        await updateDoc(productRef, {
          stock: increment(-cartItem.qty)
        });
      }
  
      alert("Transaction saved to history!\nInvoice: " + invoiceNo);
  
      // (2) Bersihkan cart & tutup payment section
      cartPOS = [];
      updateCartDisplay();
      document.getElementById('payment-section').style.display = 'none';
  
    } catch (error) {
      console.error("Error finalizing transaction:", error);
      alert("Error finalizing transaction: " + error.message);
    }
  }
  

/********************************************** 
 * FORMAT INPUT KE RUPIAH (OPSIONAL)
 **********************************************/
window.formatCurrency = function(input) {
  let value = input.value.replace(/\D/g, "");
  if (value) {
    input.value = parseInt(value).toLocaleString("id-ID");
  }
};


/********************************************** 
 * TAMPILKAN HALAMAN SALES HISTORY
 * + TOMBOL VOID TRANSACTION
 **********************************************/
window.showHistory = async function() {
    const user = auth.currentUser;
    if (!user) {
      alert("Please login first!");
      return;
    }
  
    const content = document.getElementById('content');
    content.innerHTML = `
      <h2>Sales History</h2>
      <div id="salesList">Loading...</div>
    `;
  
    try {
      const salesRef = collection(db, `users/${user.uid}/sales`);
      const querySnapshot = await getDocs(salesRef);
  
      const salesList = document.getElementById('salesList');
      if (querySnapshot.empty) {
        salesList.innerHTML = `<p>No sales found.</p>`;
        return;
      }
  
      let html = "";
      querySnapshot.forEach(docSnap => {
        const sale = docSnap.data();
        const docId = docSnap.id;
  
        // Format date
        let dateStr = "";
        if (sale.date) {
          const saleDate = sale.date.toDate ? sale.date.toDate() : new Date(sale.date);
          const day = String(saleDate.getDate()).padStart(2,'0');
          const month = String(saleDate.getMonth()+1).padStart(2,'0');
          const year = saleDate.getFullYear();
          const hours = String(saleDate.getHours()).padStart(2,'0');
          const minutes = String(saleDate.getMinutes()).padStart(2,'0');
          const seconds = String(saleDate.getSeconds()).padStart(2,'0');
  
          dateStr = `${day}/${month}/${year}, ${hours}.${minutes}.${seconds}`;
        }
  
        // Gunakan invoiceNo (jika ada), kalau tidak ya docId
        const invoiceDisplay = sale.invoiceNo || `Transaction ID: ${docId}`;
  
        html += `
          <div class="sale-item"
               style="
                 background: #f9f9f9;
                 border-radius: 5px;
                 margin-bottom: 10px;
                 border: 1px solid #ccc;
                 padding: 10px;
                 cursor: pointer;
               "
               onclick="toggleSaleDetail('${docId}')"
          >
            <h3 style="margin: 0; font-size: 16px;">
              ${invoiceDisplay}
            </h3>
            <p style="font-size: 14px; color: #666;">${dateStr}</p>
            <div id="detail-${docId}" style="display:none; margin-top:10px;">
              <ul style="list-style: none; padding-left: 0;">
                ${
                  (sale.cart || []).map(item => {
                    const subTotal = (item.price * item.qty).toLocaleString('id-ID');
                    return `<li>${item.name} x ${item.qty} = Rp${subTotal}</li>`;
                  }).join("")
                }
              </ul>
              <p><strong>Total:</strong> Rp${(sale.total || 0).toLocaleString('id-ID')}</p>
              <p><strong>Paid:</strong> Rp${(sale.paid || 0).toLocaleString('id-ID')}</p>
              <p><strong>Change:</strong> Rp${(sale.change || 0).toLocaleString('id-ID')}</p>
              <p><strong>Method:</strong> ${sale.method || ''}</p>
              <!-- TOMBOL VOID -->
              <button 
                onclick="voidTransaction('${docId}', event)" 
                style="background: #f44336; color: #fff; border: none; padding: 6px 12px; cursor: pointer;">
                Void Transaction
              </button>
            </div>
          </div>
        `;
      });
  
      salesList.innerHTML = html;
  
    } catch (error) {
      console.error("Error fetching sales:", error);
      const salesList = document.getElementById('salesList');
      if (salesList) {
        salesList.innerHTML = `<p>Error loading sales: ${error.message}</p>`;
      }
    }
  };
  
  /********************************************** 
   * VOID TRANSACTION (MENGHAPUS DARI FIRESTORE)
   **********************************************/
  window.voidTransaction = async function(docId, event) {
    // Agar klik tidak juga toggle detail
    event.stopPropagation();
  
    const user = auth.currentUser;
    if (!user) {
      alert("Please login first!");
      return;
    }
  
    if (!confirm("Are you sure you want to void this transaction?")) {
      return;
    }
  
    try {
      await deleteDoc(doc(db, `users/${user.uid}/sales`, docId));
      alert("Transaction voided/removed successfully!");
  
      // Reload history agar tampilan ter-update
      showHistory();
    } catch (error) {
      console.error("Error voiding transaction:", error);
      alert("Failed to void transaction: " + error.message);
    }
  };
   
// Fungsi toggle detail (show/hide) untuk tiap transaksi
window.toggleSaleDetail = function(docId) {
    const detailDiv = document.getElementById(`detail-${docId}`);
    if (!detailDiv) return;

    // Ganti display
    if (detailDiv.style.display === 'none') {
        detailDiv.style.display = 'block';
    } else {
        detailDiv.style.display = 'none';
    }
};

/**********************************************
 * TAMPILKAN HALAMAN FINANCE
 **********************************************/
window.showFinance = async function() {
    const user = auth.currentUser;
    if (!user) {
      alert("Please login first!");
      return;
    }
  
    // Ambil semua produk untuk hitung total expense (purchasePrice * stock)
    let totalExpense = 0;
    let totalProducts = 0;
  
    try {
      const productSnap = await getDocs(collection(db, `users/${user.uid}/products`));
      productSnap.forEach((docSnap) => {
        const p = docSnap.data();
        const purchasePrice = p.purchasePrice || 0;
        const stock = p.stock || 0;
        totalExpense += (purchasePrice * stock);
        totalProducts++;
      });
    } catch (error) {
      console.error("Error getting products:", error);
    }
  
    // Ambil semua penjualan untuk hitung total revenue & jumlah transaksi
    let totalRevenue = 0;
    let totalTransactions = 0;
  
    try {
      const salesSnap = await getDocs(collection(db, `users/${user.uid}/sales`));
      salesSnap.forEach((docSnap) => {
        const s = docSnap.data();
        totalRevenue += (s.total || 0);
        totalTransactions++;
      });
    } catch (error) {
      console.error("Error getting sales:", error);
    }
  
    const profit = totalRevenue - totalExpense;
  
    // Tampilkan di #content
    const content = document.getElementById('content');
    content.innerHTML = `
    <h2 style="font-size: 24px; margin-bottom: 20px;">Finance</h2>
    <div class="finance-summary">
      <div class="finance-item">
        <span class="finance-label">Total Products</span>
        <span class="finance-value">${totalProducts}</span>
      </div>
      <div class="finance-item">
        <span class="finance-label">Total Expense</span>
        <span class="finance-value">Rp${totalExpense.toLocaleString('id-ID')}</span>
      </div>
      <div class="finance-item">
        <span class="finance-label">Number of Transactions</span>
        <span class="finance-value">${totalTransactions}</span>
      </div>
      <div class="finance-item">
        <span class="finance-label">Total Revenue</span>
        <span class="finance-value">Rp${totalRevenue.toLocaleString('id-ID')}</span>
      </div>
      <div class="finance-item">
        <span class="finance-label">Profit</span>
        <span class="finance-value">Rp${profit.toLocaleString('id-ID')}</span>
      </div>
    </div>
  `;
  };