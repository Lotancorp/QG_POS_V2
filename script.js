// Pastikan SweetAlert2 sudah disertakan di HTML, misalnya:
// <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>

// Import Firebase SDK
import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/11.2.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,          // Tambahkan ini
  deleteDoc,
  setDoc,
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

// if (loginPage && dashboard) {
// loginPage.style.display = "none";
// dashboard.style.display = "block";
// }

// Login with Google
loginBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    await signInWithPopup(auth, provider);
    await Swal.fire({ icon: 'success', title: 'Login Successful!' });
  } catch (error) {
    console.error("Error during login:", error);
    await Swal.fire({ icon: 'error', title: 'Login Error', text: error.message });
  }
});

// Pastikan elemen ditemukan di DOM

onAuthStateChanged(auth, (user) => {
  if (loginPage && dashboard) {
    if (user) {
      loginPage.style.display = "none";
      dashboard.style.display = "none"; // Jangan langsung tampilkan dashboard
      // Jika memang ingin memanggil halaman awal tertentu, bisa load konten lain atau biarkan kosong
    } else {
      loginPage.style.display = "flex";
      dashboard.style.display = "none";
    }
  } else {
    console.warn('Elemen "login-page" atau "dashboard" tidak ditemukan.');
  }
});

// Fungsi untuk menampilkan dashboard dan mengupdate data di dalamnya
window.showDashboard = () => {
  const content = document.getElementById('content');
  // Bersihkan konten lama
  content.innerHTML = "";
  
  // Buat ulang elemen dashboard
  const dashboard = document.createElement('div');
  dashboard.id = "dashboard";
  dashboard.className = "dashboard";
  dashboard.innerHTML = `
    <div class="dashboard-header">
      <h2>Dashboard Overview</h2>
      <div id="currentDate" class="dashboard-date"></div>
    </div>
    <div class="dashboard-stats">
      <div class="stat-card revenue">
        <h3>Total Revenue</h3>
        <p id="totalRevenue">Rp0</p>
      </div>
      <div class="stat-card expense">
        <h3>Total Expense</h3>
        <p id="totalExpense">Rp0</p>
      </div>
      <div class="stat-card inventory">
        <h3>Inventory Items</h3>
        <p id="inventoryCount">0</p>
      </div>
    </div>
    <div class="dashboard-chart">
      <h3>Revenue vs Expense</h3>
      <canvas id="salesChart"></canvas>
    </div>
  `;
  content.appendChild(dashboard);
  
  // Tampilkan dashboard
  dashboard.style.display = "block";
  
  // Perbarui data dashboard
  refreshDashboardData();
};


/**
 * refreshDashboardData()
 * Fungsi ini meng-update elemen dashboard:
 * - Mengisi elemen #currentDate dengan tanggal saat ini
 * - Menghitung dan meng-update statistik keuangan:
 *    totalRevenue, totalExpense, dan inventoryCount (jumlah produk)
 * - Menginisialisasi atau meng-update grafik Revenue vs Expense menggunakan Chart.js
 */
async function refreshDashboardData() {
  const user = auth.currentUser;
  if (!user) return;

  // Update Tanggal
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateElement = document.getElementById('currentDate');
  if (dateElement) dateElement.textContent = now.toLocaleDateString('id-ID', options);

  let totalExpense = 0, totalProducts = 0, totalRevenue = 0;

  try {
    const productSnap = await getDocs(collection(db, `users/${user.uid}/products`));
    productSnap.forEach((doc) => {
      const p = doc.data();
      totalExpense += (p.purchasePrice || 0) * (p.stock || 0);
      totalProducts++;
    });
  } catch (error) {
    console.error("Error getting products:", error);
  }

  try {
    const salesSnap = await getDocs(collection(db, `users/${user.uid}/sales`));
    salesSnap.forEach((doc) => {
      totalRevenue += doc.data().total || 0;
    });
  } catch (error) {
    console.error("Error getting sales:", error);
  }

  // Update DOM dengan validasi
  const revenueElement = document.getElementById('totalRevenue');
  const expenseElement = document.getElementById('totalExpense');
  const inventoryElement = document.getElementById('inventoryCount');

  if (revenueElement) revenueElement.textContent = "Rp" + totalRevenue.toLocaleString('id-ID');
  if (expenseElement) expenseElement.textContent = "Rp" + totalExpense.toLocaleString('id-ID');
  if (inventoryElement) inventoryElement.textContent = totalProducts;

  // Tampilkan Chart
  const ctx = document.getElementById('salesChart')?.getContext('2d');
  if (ctx) {
    if (window.dashboardChart) {
      window.dashboardChart.data.datasets[0].data = [totalRevenue, totalExpense];
      window.dashboardChart.update();
    } else {
      window.dashboardChart = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Revenue', 'Expense'],
          datasets: [{
            label: 'Amount (Rp)',
            data: [totalRevenue, totalExpense],
            backgroundColor: ['#007bff', '#dc3545'],
            borderColor: ['#0056b3', '#c82333'],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (value) => 'Rp' + value.toLocaleString('id-ID')
              }
            }
          }
        }
      });
    }
  }
}


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
        <li onclick="logout()" class="logout-btn">Logout <span>&#x21aa;</span></li>
      </ul>
    </div>
  `;
};

// Fungsi Logout
window.logout = async () => {
  try {
    await signOut(auth);
    await Swal.fire({
      icon: 'success',
      title: 'Logged Out',
      text: 'You have successfully logged out.',
      timer: 1500,
      showConfirmButton: false
    });
    // Redirect ke halaman login setelah logout
    document.getElementById("login-page").style.display = "flex";
    document.getElementById("content").innerHTML = "";
  } catch (error) {
    console.error("Logout Error:", error);
    await Swal.fire({
      icon: 'error',
      title: 'Logout Failed',
      text: error.message
    });
  }
};

// Fungsi Edit Profile
window.editProfile = () => {
  const user = auth.currentUser;
  const content = document.getElementById('content');

  content.innerHTML = `
    <h2>Edit Profile</h2>
    <form id="editProfileForm">
      <label for="displayName">Name:</label>
      <input type="text" id="displayName" value="${user.displayName || ''}" required>

      <label for="email">Email (cannot be changed):</label>
      <input type="email" id="email" value="${user.email}" disabled>

      <label for="customText">Custom Text for Invoice:</label>
      <textarea id="customText" placeholder="Enter custom text for invoices..."></textarea>

      <button type="submit" class="action-btn">Save Changes</button>
      <button type="button" class="cancel-btn" onclick="showAccount()">Cancel</button>
    </form>
  `;

  // Ambil custom text jika sudah ada di Firestore
  const userRef = doc(db, "users", user.uid);
  getDoc(userRef).then((docSnap) => {
    if (docSnap.exists()) {
      const userData = docSnap.data();
      document.getElementById('customText').value = userData.customText || '';
    }
  });

  // Event untuk menyimpan perubahan
  document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newName = document.getElementById('displayName').value;
    const customText = document.getElementById('customText').value;

    try {
      // Update Firebase Auth (untuk nama)
      await updateProfile(auth.currentUser, { displayName: newName });

      // Simpan Custom Text ke Firestore
      await setDoc(userRef, { customText: customText }, { merge: true });

      await Swal.fire({ icon: 'success', title: 'Profile updated successfully!' });
      showAccount(); // Kembali ke halaman Account
    } catch (error) {
      console.error("Error updating profile:", error);
      await Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    }
  });
};

window.changePassword = () => {
  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="form-container">
      <h2>Change Password</h2>
      
      <label for="currentPassword">Current Password:</label>
      <input type="password" id="currentPassword" placeholder="Enter current password">

      <label for="newPassword">New Password:</label>
      <input type="password" id="newPassword" placeholder="Enter new password">

      <label for="confirmPassword">Confirm New Password:</label>
      <input type="password" id="confirmPassword" placeholder="Confirm new password">

      <button class="action-btn" onclick="submitPasswordChange()">Change Password</button>
      <button class="cancel-btn" onclick="showAccount()">Cancel</button>
    </div>
  `;
};

window.submitPasswordChange = () => {
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (!currentPassword || !newPassword || !confirmPassword) {
    alert("Please fill in all fields.");
    return;
  }

  if (newPassword !== confirmPassword) {
    alert("New passwords do not match!");
    return;
  }

  // Simulasi proses perubahan password
  setTimeout(() => {
    alert("Password changed successfully!");
    showAccount(); // Kembali ke halaman akun setelah berhasil
  }, 1000);
};

/********************************************** 
 * VARIABEL GLOBAL
 **********************************************/
let allPOSProducts = []; // Menyimpan data produk dari Firestore
let cartPOS = [];        // Menyimpan item yang ditambahkan ke keranjang
let cachedProducts = []; // array untuk menampung data produk

// PRODUCTS SECTION
// ==================================================
window.toggleMenu = function () {
  const menu = document.getElementById('hamburgerMenu');
  const toggleButton = document.querySelector('.hamburger');

  if (menu && toggleButton) { // Cek apakah kedua elemen ada
      const isVisible = menu.style.display === 'block';
      menu.style.display = isVisible ? 'none' : 'block';

      if (!isVisible) {
          setTimeout(() => { // Memberikan sedikit jeda agar klik pertama tidak langsung menutup menu
              document.addEventListener('click', closeMenuOnClickOutside);
          }, 10);
      } else {
          document.removeEventListener('click', closeMenuOnClickOutside);
      }
  } else {
      console.warn('Element "hamburgerMenu" atau ".hamburger-icon" tidak ditemukan.');
  }
};

function closeMenuOnClickOutside(event) {
  const menu = document.getElementById('hamburgerMenu');
  const toggleButton = document.querySelector('.hamburger');

  if (menu && toggleButton) {
      if (!menu.contains(event.target) && !toggleButton.contains(event.target)) {
          menu.style.display = 'none';
          document.removeEventListener('click', closeMenuOnClickOutside);
      }
  }
}


/**********************************************
 * Menampilkan Halaman Produk
 **********************************************/
window.showProducts = () => {
  // Periksa apakah elemen #dashboard ada sebelum mencoba menyembunyikannya
  const dashboard = document.getElementById('dashboard');
  if (dashboard) {
    dashboard.style.display = "none";
  }

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
        
        <hr class="toolbar-separator">

        <div class="filter-container">
            <button id="btnFilterAZ">
                <i class="fas fa-sort-alpha-down"></i> A-Z
            </button>
            <button id="btnFilterZA">
                <i class="fas fa-sort-alpha-up"></i> Z-A
            </button>

            <select id="filterCategory">
                <option value="">All Categories</option>
            </select>

            <button id="manageCategoryBtn">
                <i class="fas fa-cog"></i> Manage Categories
            </button>
        </div>
    </div>

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
  document.getElementById('btnFilterAZ').addEventListener('click', sortProductsAZ);

  // Event: Sort Z-A
  document.getElementById('btnFilterZA').addEventListener('click', sortProductsZA);

  // Event: Filter Kategori
  const filterCategorySelect = document.getElementById('filterCategory');
  filterCategorySelect.addEventListener('change', () => {
    filterByCategory(filterCategorySelect.value);
  });

  // Event: Manage Categories
  document.getElementById('manageCategoryBtn').addEventListener('click', showCategoryManager);

  // Panggil loadProducts dengan sedikit delay
  setTimeout(() => {
    loadProducts();
    loadCategoryOptions();
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
    Swal.fire({ icon: 'warning', title: 'Not Logged In', text: "Please login first!" });
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

  const result = await Swal.fire({
    title: "Are you sure?",
    text: "Are you sure you want to delete this category?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete it!",
    cancelButtonText: "Cancel"
  });
  if (!result.isConfirmed) return;

  try {
    await deleteDoc(doc(db, `users/${user.uid}/categories`, categoryId));
    await Swal.fire({ icon: 'success', title: 'Category deleted successfully!' });
    loadCategoryList(); // Refresh daftar
  } catch (error) {
    console.error("Error deleting category:", error);
    await Swal.fire({ icon: 'error', title: 'Error', text: error.message });
  }
};

/****************************************
 * Prompt Edit Category Name 
 ****************************************/
window.editCategoryPrompt = async function(categoryId, oldName) {
  const { value: newName } = await Swal.fire({
    title: "Edit Category Name",
    input: 'text',
    inputLabel: 'Category Name',
    inputValue: oldName,
    showCancelButton: true,
    confirmButtonText: "Save",
    cancelButtonText: "Cancel",
    inputValidator: (value) => {
      if (!value || value.trim() === "") {
        return 'Please enter a valid category name!';
      }
    }
  });
  if (newName) {
    updateCategory(categoryId, newName.trim());
  }
};

/****************************************
 * Update Category Name di Firestore
 ****************************************/
async function updateCategory(categoryId, newName) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    await updateDoc(doc(db, `users/${user.uid}/categories`, categoryId), { name: newName });
    await Swal.fire({ icon: 'success', title: 'Category updated successfully!' });
    loadCategoryList();
  } catch (error) {
    console.error("Error updating category:", error);
    await Swal.fire({ icon: 'error', title: 'Error', text: error.message });
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
          <div class="category-container">
              <select id="categoryDropdown" required>
                  <option value="" disabled selected>Select category</option>
              </select>
              <input type="text" id="newCategory" placeholder="Or create new category">
              <button type="button" class="add-category-btn" onclick="addNewCategory()">Add</button>
          </div>

          <!-- Tombol aksi dibungkus dalam container -->
          <div class="form-actions">
              <button type="submit" class="submit-btn">Save Product</button>
              <button type="button" class="cancel-btn" id="cancelAddBtn">Cancel</button>
          </div>
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
    await Swal.fire({ icon: 'warning', title: 'Not Logged In', text: "Please login first!" });
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
      await Swal.fire({ icon: 'warning', title: 'Not Logged In', text: "Please login first!" });
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

      await Swal.fire({ icon: 'success', title: 'Product updated successfully!' });
      showProducts();
    } catch (error) {
      console.error("Error updating product:", error);
      await Swal.fire({ icon: 'error', title: 'Error', text: error.message });
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
    await Swal.fire({ icon: 'warning', title: 'Invalid Category', text: "Please enter a valid category name." });
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

    await Swal.fire({ icon: 'success', title: 'Category added successfully!' });
  } catch (error) {
    console.error("Error adding category:", error);
    await Swal.fire({ icon: 'error', title: 'Error', text: error.message });
  }
};

/**********************************************
 * Menghapus Produk
 **********************************************/
window.deleteProduct = async function(productId) {
  const user = auth.currentUser;
  if (!user) {
    await Swal.fire({ icon: 'warning', title: 'Not Logged In', text: "Please login first!" });
    return;
  }

  const result = await Swal.fire({
    title: "Are you sure?",
    text: "Are you sure you want to delete this product?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, delete it!",
    cancelButtonText: "Cancel"
  });
  if (!result.isConfirmed) return;

  try {
    await deleteDoc(doc(db, `users/${user.uid}/products`, productId));
    await Swal.fire({ icon: 'success', title: 'Product deleted successfully!' });
    loadProducts(); // Refresh daftar produk setelah penghapusan
  } catch (error) {
    console.error("Error deleting product:", error);
    await Swal.fire({ icon: 'error', title: 'Error', text: error.message });
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
      await Swal.fire({ icon: 'warning', title: 'Not Logged In', text: "Please log in first!" });
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
      await Swal.fire({ icon: 'warning', title: 'Invalid Product Details', text: "Please enter valid product details." });
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

      await Swal.fire({ icon: 'success', title: 'Product added successfully!' });
      showProducts();
    } catch (error) {
      console.error("Error adding product:", error);
      await Swal.fire({ icon: 'error', title: 'Error', text: error.message });
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
    itemRow.classList.add('cart-item'); // Tambahkan class untuk styling
    itemRow.innerHTML = `
      <div class="cart-item-header">
        <strong>${item.name}</strong>
        <button class="remove-btn" title="Remove" onclick="removeFromCart(${index})">
          <i class="fas fa-trash-alt"></i>
        </button>
      </div>
      <div class="cart-item-details">
        Rp${parseInt(item.price).toLocaleString('id-ID')} x 
        <input type="number" min="1" value="${item.qty}" class="qty-input">
        = Rp${subTotal.toLocaleString('id-ID')}
      </div>
    `;

    // Ubah qty
    const qtyInput = itemRow.querySelector('.qty-input');
    qtyInput.addEventListener('change', (e) => {
      let newQty = parseInt(e.target.value);
      if (isNaN(newQty) || newQty < 1) newQty = 1;
      cartPOS[index].qty = newQty;
      updateCartDisplay();
    });

    cartDiv.appendChild(itemRow);
  });

  totalEl.textContent = total.toLocaleString('id-ID');
}

// Fungsi untuk menghapus item dari cart
window.removeFromCart = function(index) {
  cartPOS.splice(index, 1); // Hapus item dari cart berdasarkan index
  updateCartDisplay();      // Perbarui tampilan cart setelah item dihapus
};


/********************************************** 
 * TAMPILKAN HALAMAN POS
 **********************************************/
window.showPOS = async function() {
  // Sembunyikan dashboard jika sedang tampil
  const dashboard = document.getElementById('dashboard');
  if (dashboard) {
    dashboard.style.display = "none";
  }

  const user = auth.currentUser;
  if (!user) {
    await Swal.fire({ icon: 'warning', title: 'Not Logged In', text: "Please login first!" });
    return;
  }

  const content = document.getElementById('content');
  content.innerHTML = `
    <div class="checkout-container">
      <h2>New Transaction</h2>
  
      <!-- Search Product Section -->
      <div class="search-container">
        <input type="text" id="posSearchProduct" placeholder="Search product...">
      </div>
  
      <!-- Product List -->
      <div id="pos-product-list" style="margin-top:10px;"></div>
  
      <!-- Cart Section -->
      <h3>Cart</h3>
      <div id="pos-cart" class="cart-container"></div>
  
      <!-- Total Section -->
      <div class="total-section">
        <span>Total:</span>
        <span id="pos-total">Rp0</span>
      </div>
  
      <!-- Checkout Button -->
      <button id="pos-checkout-btn" class="checkout-btn">Checkout</button>
  
      <!-- Payment Section (Hidden by Default) -->
      <div id="payment-section" class="payment-section" style="display: none;">
        <h3>Payment Confirmation</h3>
  
        <div class="payment-info">
          <label for="paymentTotal">Total:</label>
          <p id="paymentTotal" class="payment-amount">Rp0</p>
        </div>
  
        <div class="form-group">
          <label for="paymentMethod">Payment Method:</label>
          <select id="paymentMethod">
            <option value="cash">Cash</option>
            <option value="card">Credit Card</option>
            <option value="ewallet">E-Wallet</option>
          </select>
        </div>
  
        <div class="form-group">
          <label for="amountPaid">Amount Paid (Rp):</label>
          <input type="text" id="amountPaid" oninput="formatCurrency(this)" placeholder="Enter payment amount">
        </div>
  
        <div class="form-group">
          <label>Change:</label>
          <p id="paymentChange" class="change-amount">Rp0</p>
        </div>
  
        <!-- Action Buttons -->
        <div class="button-group">
          <button id="processPaymentBtn" class="process-btn">Process Payment</button>
          <button id="cancelPaymentBtn" class="cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
  `;

  // Ambil data produk dulu, lalu tunggu
  await loadPOSProducts();

  // Pasang event listener pada pencarian
  const searchInput = document.getElementById('posSearchProduct');
  if (searchInput) {
    searchInput.addEventListener('input', filterPOSProducts);
  } else {
    console.error("Element with ID 'posSearchProduct' tidak ditemukan.");
  }

  // Tombol Checkout
  const checkoutBtn = document.getElementById('pos-checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cartPOS.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Empty Cart', text: "Cart is empty!" });
        return;
      }
      // Munculkan section pembayaran
      const paymentSection = document.getElementById('payment-section');
      if (paymentSection) {
        paymentSection.style.display = 'block';
      } else {
        console.error("Element with ID 'payment-section' tidak ditemukan.");
      }
      // Isi total
      const posTotalElement = document.getElementById('pos-total');
      const paymentTotalElement = document.getElementById('paymentTotal');
      if (posTotalElement && paymentTotalElement) {
        paymentTotalElement.textContent = posTotalElement.textContent;
      }
      // Reset Payment Input
      const amountPaidElement = document.getElementById('amountPaid');
      if (amountPaidElement) {
        amountPaidElement.value = '';
      }
      const paymentChangeElement = document.getElementById('paymentChange');
      if (paymentChangeElement) {
        paymentChangeElement.textContent = '0';
      }
    });
  } else {
    console.error("Element with ID 'pos-checkout-btn' tidak ditemukan.");
  }

  // Tombol "Process" Payment
  const processPaymentBtn = document.getElementById('processPaymentBtn');
  if (processPaymentBtn) {
    processPaymentBtn.addEventListener('click', finalizeTransaction);
  } else {
    console.error("Element with ID 'processPaymentBtn' tidak ditemukan.");
  }

  // Tombol "Cancel" Payment
  const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
  if (cancelPaymentBtn) {
    cancelPaymentBtn.addEventListener('click', () => {
      const paymentSection = document.getElementById('payment-section');
      if (paymentSection) {
        paymentSection.style.display = 'none';
      }
    });
  } else {
    console.error("Element with ID 'cancelPaymentBtn' tidak ditemukan.");
  }

  // Pantau perubahan "amountPaid" untuk hitung kembalian
  const amountPaidInput = document.getElementById('amountPaid');
  if (amountPaidInput) {
    amountPaidInput.addEventListener('input', calculateChange);
  } else {
    console.error("Element with ID 'amountPaid' tidak ditemukan.");
  }

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
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");

    // Dapatkan invoiceNo, lalu addDoc ke sales
    const invoiceNo = await generateInvoiceNo(db, user.uid);
    // Ambil nilai total, paid, change, dan method dari tampilan POS
    const totalText = document.getElementById('pos-total').textContent;
    const total = parseInt(totalText.replace(/\./g, '')) || 0;
    let paidText = document.getElementById('amountPaid').value.replace(/\./g, '');
    const paid = parseInt(paidText) || 0;
    const changeText = document.getElementById('paymentChange').textContent;
    const change = parseInt(changeText.replace(/\./g, '')) || 0;
    const method = document.getElementById('paymentMethod').value;

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

    await Swal.fire({ icon: 'success', title: 'Transaction Saved', text: "Invoice: " + invoiceNo });

    // (2) Bersihkan cart & tutup payment section
    cartPOS = [];
    updateCartDisplay();
    document.getElementById('payment-section').style.display = 'none';

  } catch (error) {
    console.error("Error finalizing transaction:", error);
    await Swal.fire({ icon: 'error', title: 'Transaction Error', text: "Error finalizing transaction: " + error.message });
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
// Fungsi Filter Sales
window.filterSales = async function () {
  const startDate = new Date(document.getElementById('startDate').value);
  const endDate = new Date(document.getElementById('endDate').value);

  const salesList = document.getElementById('salesList');
  salesList.innerHTML = "Loading...";

  const user = auth.currentUser;
  if (!user) {
      Swal.fire({ icon: 'warning', title: 'Not Logged In', text: "Please login first!" });
      return;
  }

  try {
      const salesRef = collection(db, `users/${user.uid}/sales`);
      const querySnapshot = await getDocs(salesRef);

      let filteredHTML = '';

      querySnapshot.forEach(docSnap => {
          const sale = docSnap.data();
          const saleDate = sale.date.toDate ? sale.date.toDate() : new Date(sale.date);

          if ((!isNaN(startDate) && saleDate < startDate) || (!isNaN(endDate) && saleDate > endDate)) {
              return;  // Lewati transaksi di luar rentang tanggal
          }

          filteredHTML += `
              <div class="sale-item" style="background: #f9f9f9; border: 1px solid #ccc; padding: 10px; margin: 10px; border-radius: 8px;">
                  <h3>${sale.invoiceNo}</h3>
                  <p>${saleDate.toLocaleDateString()}</p>
                  <strong>Total:</strong> Rp${sale.total.toLocaleString('id-ID')}
              </div>
          `;
      });

      salesList.innerHTML = filteredHTML || `<p>No sales found in this date range.</p>`;

  } catch (error) {
      console.error("Error fetching sales:", error);
      salesList.innerHTML = `<p>Error loading sales: ${error.message}</p>`;
  }
};

// Fungsi Reset Filter
window.resetFilter = function () {
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  window.showHistory();  // Tampilkan ulang semua data tanpa filter
};



window.showHistory = async function() {
  // Cek apakah elemen dashboard ada sebelum menyembunyikannya
  const dashboard = document.getElementById('dashboard');
  if (dashboard) {
    dashboard.style.display = "none";  
  }
  
  const user = auth.currentUser;
  if (!user) {
    await Swal.fire({ icon: 'warning', title: 'Not Logged In', text: "Please login first!" });
    return;
  }

  const content = document.getElementById('content');
  content.innerHTML = `
    <h2>Sales History</h2>
    
    <!-- Filter Tanggal -->
    <div id="filterContainer">
      <div class="date-group">
        <label for="startDate">Start Date:</label>
        <input type="date" id="startDate">
      </div>

      <div class="date-group">
        <label for="endDate">End Date:</label>
        <input type="date" id="endDate">
      </div>

      <button class="apply-btn" onclick="filterSales()">Apply Filter</button>
      <button class="reset-btn" onclick="resetFilter()">Reset Filter</button>
    </div>

    <div id="salesContainer">
      <div id="salesList">Loading...</div>
    </div>
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

      let dateStr = "";
      if (sale.date) {
        const saleDate = sale.date.toDate ? sale.date.toDate() : new Date(sale.date);
        const day = String(saleDate.getDate()).padStart(2, '0');
        const month = String(saleDate.getMonth() + 1).padStart(2, '0');
        const year = saleDate.getFullYear();
        const hours = String(saleDate.getHours()).padStart(2, '0');
        const minutes = String(saleDate.getMinutes()).padStart(2, '0');
        const seconds = String(saleDate.getSeconds()).padStart(2, '0');

        dateStr = `${day}/${month}/${year}, ${hours}.${minutes}.${seconds}`;
      }

      const invoiceDisplay = sale.invoiceNo || `Transaction ID: ${docId}`;

      html += `
        <div class="sale-item" style="background: #f9f9f9; border: 1px solid #ccc; padding: 10px; margin: 10px; border-radius: 8px;">
          <h3 onclick="toggleDetails('${docId}')" style="cursor: pointer; color: #007bff;">
            ${invoiceDisplay} ▼
          </h3>
          <div id="details-${docId}" style="display: none; margin-top: 5px;">
            <p>${dateStr}</p>
            <ul>
              ${(sale.cart || []).map(item =>
                `<li>${item.name} x ${item.qty} = Rp${(item.price * item.qty).toLocaleString('id-ID')}</li>`
              ).join("")}
            </ul>
            <p><strong>Total:</strong> Rp${(sale.total || 0).toLocaleString('id-ID')}</p>
            <p><strong>Paid:</strong> Rp${(sale.paid || 0).toLocaleString('id-ID')}</p>
            <p><strong>Change:</strong> Rp${(sale.change || 0).toLocaleString('id-ID')}</p>
            <p><strong>Method:</strong> ${sale.method || ''}</p>
            
            <button onclick="printReceipt('${docId}')" style="background: #007bff; color: white; padding: 5px 10px; margin: 5px;">Print Receipt</button>
            <button onclick="voidTransaction('${docId}', event)" style="background: #dc3545; color: white; padding: 5px 10px;">Void Transaction</button>
          </div>
        </div>
      `;
    });

    salesList.innerHTML = html;

  } catch (error) {
    console.error("Error fetching sales:", error);
    document.getElementById('salesList').innerHTML = `<p>Error loading sales: ${error.message}</p>`;
  }
};

window.printReceipt = async function (transactionId) {
  try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");

      const transactionRef = doc(db, `users/${user.uid}/sales`, transactionId);
      const transactionSnap = await getDoc(transactionRef);
      if (!transactionSnap.exists()) throw new Error("Transaction not found");

      const transaction = transactionSnap.data();

      // Ambil Custom Text dari Firestore
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      const customText = userSnap.exists() ? (userSnap.data().customText || '') : '';

      // Inisialisasi jsPDF
      const { jsPDF } = window.jspdf;
      const docPDF = new jsPDF();

      // Isi Struk
      docPDF.setFontSize(14);
      docPDF.text("********** INVOICE **********", 20, 20);
      docPDF.text(`Invoice No: ${transaction.invoiceNo}`, 20, 30);
      docPDF.text(`Date: ${new Date(transaction.date.toDate()).toLocaleString()}`, 20, 40);

      let yOffset = 50;
      transaction.cart.forEach(item => {
          docPDF.text(`${item.name} x ${item.qty} = Rp${(item.price * item.qty).toLocaleString('id-ID')}`, 20, yOffset);
          yOffset += 10;
      });

      yOffset += 10;
      docPDF.text(`Total: Rp${transaction.total.toLocaleString('id-ID')}`, 20, yOffset);
      yOffset += 10;
      docPDF.text(`Paid: Rp${transaction.paid.toLocaleString('id-ID')}`, 20, yOffset);
      yOffset += 10;
      docPDF.text(`Change: Rp${transaction.change.toLocaleString('id-ID')}`, 20, yOffset);
      yOffset += 10;
      docPDF.text(`Payment Method: ${transaction.method}`, 20, yOffset);

      // Garis pemisah
      yOffset += 10;
      docPDF.text("----------------------------", 20, yOffset);
      yOffset += 10;

      // Custom Text
      docPDF.setFontSize(12);
      docPDF.text(customText, 20, yOffset);

      yOffset += 20;
      docPDF.text("****************************", 20, yOffset);

      // Simpan sebagai PDF
      docPDF.save(`${transaction.invoiceNo}_Receipt.pdf`);

  } catch (error) {
      console.error("Error printing receipt:", error);
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
  }
};
window.toggleDetails = function (docId) {
  const details = document.getElementById(`details-${docId}`);
  
  if (!details) {
    console.error(`Element with ID details-${docId} not found.`);
    return;
  }

  details.style.display = (details.style.display === "none" || !details.style.display) ? "block" : "none";
}


/********************************************** 
 * VOID TRANSACTION (MENGHAPUS DARI FIRESTORE)
 **********************************************/
window.voidTransaction = async function(docId, event) {
  // Agar klik tidak juga toggle detail
  event.stopPropagation();

  const user = auth.currentUser;
  if (!user) {
    await Swal.fire({ icon: 'warning', title: 'Not Logged In', text: "Please login first!" });
    return;
  }

  const result = await Swal.fire({
    title: "Are you sure?",
    text: "Are you sure you want to void this transaction?",
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Yes, void it!",
    cancelButtonText: "Cancel"
  });
  if (!result.isConfirmed) return;

  try {
    await deleteDoc(doc(db, `users/${user.uid}/sales`, docId));
    await Swal.fire({ icon: 'success', title: 'Transaction Voided', text: "Transaction voided/removed successfully!" });

    // Reload history agar tampilan ter-update
    showHistory();
  } catch (error) {
    console.error("Error voiding transaction:", error);
    await Swal.fire({ icon: 'error', title: 'Error', text: "Failed to void transaction: " + error.message });
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
  // Sembunyikan dashboard jika sedang tampil
  const dashboard = document.getElementById('dashboard');
  if (dashboard) {
    dashboard.style.display = "none";
  }
  
  const user = auth.currentUser;
  if (!user) {
    await Swal.fire({ icon: 'warning', title: 'Not Logged In', text: "Please login first!" });
    return;
  }

  // Ambil kontainer utama
  const content = document.getElementById('content');

  // Hitung Total Expense dan Total Produk
  let totalExpense = 0;
  let totalProducts = 0;
  try {
    const productSnap = await getDocs(collection(db, `users/${user.uid}/products`));
    productSnap.forEach((docSnap) => {
      const p = docSnap.data();
      // Pastikan purchasePrice dan stock di-convert ke angka
      const purchasePrice = Number(p.purchasePrice) || 0;
      const stock = Number(p.stock) || 0;
      totalExpense += (purchasePrice * stock);
      totalProducts++;
    });
  } catch (error) {
    console.error("Error getting products:", error);
  }

  // Hitung Total Revenue dan Jumlah Transaksi
  let totalRevenue = 0;
  let totalTransactions = 0;
  try {
    const salesSnap = await getDocs(collection(db, `users/${user.uid}/sales`));
    salesSnap.forEach((docSnap) => {
      const s = docSnap.data();
      totalRevenue += Number(s.total) || 0;
      totalTransactions++;
    });
  } catch (error) {
    console.error("Error getting sales:", error);
  }

  const profit = totalRevenue - totalExpense;

  // Hitung metrik tambahan
  const avgExpensePerProduct = totalProducts > 0 ? totalExpense / totalProducts : 0;
  const avgRevenuePerTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  // Tampilkan informasi finance secara lengkap
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
      <div class="finance-item">
        <span class="finance-label">Avg Expense per Product</span>
        <span class="finance-value">${totalProducts > 0 ? "Rp" + avgExpensePerProduct.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : "-"}</span>
      </div>
      <div class="finance-item">
        <span class="finance-label">Avg Revenue per Transaction</span>
        <span class="finance-value">${totalTransactions > 0 ? "Rp" + avgRevenuePerTransaction.toLocaleString('id-ID', { maximumFractionDigits: 2 }) : "-"}</span>
      </div>
      <div class="finance-item">
        <span class="finance-label">Profit Margin</span>
        <span class="finance-value">${totalRevenue > 0 ? profitMargin.toFixed(2) + "%" : "-"}</span>
      </div>
    </div>
  `;
};


// Fungsi untuk Inventory
window.showInventory = async function() {
  // Sembunyikan dashboard jika sedang tampil
  const dashboard = document.getElementById('dashboard');
  if (dashboard) {
    dashboard.style.display = "none";
  }
  const user = auth.currentUser;
  if (!user) {
    await Swal.fire({ icon: 'warning', title: 'Not Logged In', text: "Please login first!" });
    return;
  }

  const content = document.getElementById('content');
  content.innerHTML = `
    <h2>Inventory Management</h2>
    <div id="inventoryList">Loading...</div>
  `;

  loadInventoryItems(); // Panggil fungsi untuk memuat data inventaris
};
// Fungsi untuk memuat data inventaris dari Firestore
async function loadInventoryItems() {
  const user = auth.currentUser;
  if (!user) return;

  const inventoryList = document.getElementById('inventoryList');
  inventoryList.innerHTML = 'Loading...';

  try {
    const querySnapshot = await getDocs(collection(db, `users/${user.uid}/products`));
    if (querySnapshot.empty) {
      inventoryList.innerHTML = '<p>No inventory items found.</p>';
      return;
    }

    let html = '<table class="inventory-table">';
    html += `
      <tr>
        <th>Product Name</th>
        <th>Stock</th>
        <th>Purchase Price (Rp)</th>
        <th>Sales History</th>
      </tr>
    `;

    querySnapshot.forEach((docSnap) => {
      const item = docSnap.data();
      html += `
        <tr>
          <td>${item.name}</td>
          <td>${item.stock}</td>
          <td>Rp${(item.purchasePrice || 0).toLocaleString('id-ID')}</td>
          <td><button onclick="viewInventoryHistory('${docSnap.id}', '${item.name}')">View History</button></td>
        </tr>
      `;
    });

    html += '</table>';
    inventoryList.innerHTML = html;

  } catch (error) {
    console.error("Error loading inventory:", error);
    inventoryList.innerHTML = `<p>Error loading inventory: ${error.message}</p>`;
  }
}
// Fungsi untuk melihat riwayat transaksi per produk
window.viewInventoryHistory = async function(productId, productName) {
  const user = auth.currentUser;
  if (!user) return;

  const content = document.getElementById('content');
  content.innerHTML = `
    <h2>Inventory History for ${productName}</h2>
    <button onclick="showInventory()">Back to Inventory</button>
    <div id="historyList">Loading...</div>
  `;

  const historyList = document.getElementById('historyList');

  try {
    const salesSnapshot = await getDocs(collection(db, `users/${user.uid}/sales`));
    let historyHtml = '<ul>';

    salesSnapshot.forEach((docSnap) => {
      const sale = docSnap.data();
      const productSold = sale.cart.find(item => item.id === productId);

      if (productSold) {
        historyHtml += `
          <li>
            <strong>Invoice:</strong> ${sale.invoiceNo || 'N/A'} - 
            <strong>Quantity Sold:</strong> ${productSold.qty} - 
            <strong>Date:</strong> ${new Date(sale.date.seconds * 1000).toLocaleDateString()}
          </li>
        `;
      }
    });

    historyHtml += '</ul>';
    historyList.innerHTML = historyHtml || '<p>No sales history for this product.</p>';

  } catch (error) {
    console.error("Error loading history:", error);
    historyList.innerHTML = `<p>Error loading history: ${error.message}</p>`;
  }
};

