// Pastikan SweetAlert2 sudah disertakan di HTML
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
  getDoc,
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

// Pantau Auth State
onAuthStateChanged(auth, (user) => {
  if (loginPage && dashboard) {
    if (user) {
      loginPage.style.display = "none";
      dashboard.style.display = "none"; 
    } else {
      loginPage.style.display = "flex";
      dashboard.style.display = "none";
    }
  } else {
    console.warn('Elemen "login-page" atau "dashboard" tidak ditemukan.');
  }
});

/*************************************************
 * DASHBOARD
 ************************************************/
window.showDashboard = () => {
  const content = document.getElementById('content');
  if (!content) return;

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
  
  dashboard.style.display = "block";
  
  refreshDashboardData();
};

async function refreshDashboardData() {
  const user = auth.currentUser;
  if (!user) return;

  // Update Tanggal
  const now = new Date();
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateElement = document.getElementById('currentDate');
  if (dateElement) {
    dateElement.textContent = now.toLocaleDateString('id-ID', options);
  }

  let totalExpense = 0, totalProducts = 0, totalRevenue = 0;

  // Hitung total expense dan jumlah produk
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

  // Hitung total revenue
  try {
    const salesSnap = await getDocs(collection(db, `users/${user.uid}/sales`));
    salesSnap.forEach((doc) => {
      totalRevenue += doc.data().total || 0;
    });
  } catch (error) {
    console.error("Error getting sales:", error);
  }

  // Update DOM
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

/*************************************************
 * ACCOUNT SECTION
 ************************************************/
window.showAccount = () => {
  const content = document.getElementById('content');
  if (!content) return;

  const user = auth.currentUser;
  const displayName = user?.displayName || "User Name";
  const email = user?.email || "user@example.com";

  content.innerHTML = `
    <div class="account-header">
      <h2>${displayName}</h2>
      <p>${email}</p>
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

window.editProfile = () => {
  const user = auth.currentUser;
  if (!user) return;

  const content = document.getElementById('content');
  if (!content) return;

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

  // Ambil custom text jika ada
  const userRef = doc(db, "users", user.uid);
  getDoc(userRef).then((docSnap) => {
    if (docSnap.exists()) {
      const userData = docSnap.data();
      document.getElementById('customText').value = userData.customText || '';
    }
  });

  // Event submit
  document.getElementById('editProfileForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const newName = document.getElementById('displayName').value;
    const customText = document.getElementById('customText').value;

    try {
      await updateProfile(auth.currentUser, { displayName: newName });
      await setDoc(userRef, { customText: customText }, { merge: true });

      await Swal.fire({ icon: 'success', title: 'Profile updated successfully!' });
      showAccount();
    } catch (error) {
      console.error("Error updating profile:", error);
      await Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    }
  });
};

window.changePassword = () => {
  const content = document.getElementById('content');
  if (!content) return;

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
  // Simulasi
  setTimeout(() => {
    alert("Password changed successfully!");
    showAccount();
  }, 1000);
};

/*************************************************
 *  HAMBURGER MENU
 ************************************************/
window.toggleMenu = function () {
  const menu = document.getElementById('hamburgerMenu');
  const toggleButton = document.querySelector('.hamburger');

  if (menu && toggleButton) {
      const isVisible = menu.style.display === 'block';
      menu.style.display = isVisible ? 'none' : 'block';

      if (!isVisible) {
          setTimeout(() => {
              document.addEventListener('click', closeMenuOnClickOutside);
          }, 10);
      } else {
          document.removeEventListener('click', closeMenuOnClickOutside);
      }
  } else {
      console.warn('Element "hamburgerMenu" atau ".hamburger" tidak ditemukan.');
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

/*************************************************
 *  PRODUCTS SECTION
 ************************************************/
let cachedProducts = [];

window.showProducts = () => {
  const dashboard = document.getElementById('dashboard');
  if (dashboard) dashboard.style.display = "none";

  const content = document.getElementById('content');
  if (!content) return;
  content.innerHTML = `
    <div class="search-container">
      <input type="text" id="searchProduct" placeholder="Search products...">
    </div>
    <h2>Products</h2>
    <div class="product-toolbar">
      <button class="action-btn" onclick="addProductForm()">Add Product</button>
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

  // Event search
  const sp = document.getElementById('searchProduct');
  if (sp) {
    sp.addEventListener('input', function(e) {
      const searchTerm = e.target.value.toLowerCase();
      const productItems = document.querySelectorAll('.product-item');
      productItems.forEach(item => {
        const productName = item.querySelector('h3').textContent.toLowerCase();
        item.style.display = productName.includes(searchTerm) ? 'flex' : 'none';
      });
    });
  }

  // Event: Sort A-Z
  const btnFilterAZ = document.getElementById('btnFilterAZ');
  if (btnFilterAZ) btnFilterAZ.addEventListener('click', sortProductsAZ);

  // Event: Sort Z-A
  const btnFilterZA = document.getElementById('btnFilterZA');
  if (btnFilterZA) btnFilterZA.addEventListener('click', sortProductsZA);

  // Filter Kategori
  const filterCategorySelect = document.getElementById('filterCategory');
  if (filterCategorySelect) {
    filterCategorySelect.addEventListener('change', () => {
      filterByCategory(filterCategorySelect.value);
    });
  }

  // Manage Categories
  const manageCategoryBtn = document.getElementById('manageCategoryBtn');
  if (manageCategoryBtn) {
    manageCategoryBtn.addEventListener('click', showCategoryManager);
  }

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

  filterSelect.innerHTML = '<option value="">All Categories</option>';

  const querySnapshot = await getDocs(collection(db, `users/${user.uid}/categories`));
  querySnapshot.forEach((docSnap) => {
    const catData = docSnap.data();
    const option = document.createElement('option');
    option.value = catData.name;
    option.textContent = catData.name;
    filterSelect.appendChild(option);
  });
}

function renderProductList(products) {
  const productList = document.getElementById('productList');
  if (!productList) return;

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
  cachedProducts.sort((a, b) => {
    return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
  });
  renderProductList(cachedProducts);
}
function sortProductsZA() {
  cachedProducts.sort((a, b) => {
    return b.name.toLowerCase().localeCompare(a.name.toLowerCase());
  });
  renderProductList(cachedProducts);
}
function filterByCategory(category) {
  if (!category) {
    renderProductList(cachedProducts);
    return;
  }
  const filtered = cachedProducts.filter(prod => prod.category === category);
  renderProductList(filtered);
}

window.showCategoryManager = function() {
  const user = auth.currentUser;
  if (!user) {
    Swal.fire({ icon: 'warning', title: 'Not Logged In', text: "Please login first!" });
    return;
  }
  const content = document.getElementById('content');
  if (!content) return;

  content.innerHTML = `
    <h2>Manage Categories</h2>
    <button onclick="showProducts()">Back to Products</button>
    <div id="categoryManagerContainer" style="margin-top: 20px;">Loading...</div>
  `;
  loadCategoryList();
};

async function loadCategoryList() {
  const user = auth.currentUser;
  if (!user) return;

  const container = document.getElementById('categoryManagerContainer');
  if (!container) return;

  container.innerHTML = 'Loading...';

  try {
    const querySnapshot = await getDocs(collection(db, `users/${user.uid}/categories`));
    if (querySnapshot.empty) {
      container.innerHTML = '<p>No categories found.</p>';
      return;
    }

    let html = `<ul id="categoryList" style="list-style-type: none; padding: 0; margin: 0;">`;
    querySnapshot.forEach((docSnap) => {
      const catData = docSnap.data();
      const docId = docSnap.id;
      const catName = catData.name;
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
    loadCategoryList();
  } catch (error) {
    console.error("Error deleting category:", error);
    await Swal.fire({ icon: 'error', title: 'Error', text: error.message });
  }
};

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

window.addProductForm = () => {
  const content = document.getElementById('content');
  if (!content) return;

  content.innerHTML = `
    <div class="form-container">
      <h2>Add New Product</h2>
      <form id="addProductForm">
        <label>Product Image:</label>
        <input type="file" id="productImage" accept="image/*">
        <img id="imagePreview" src="default-thumbnail.png" alt="Image Preview" style="max-width: 100px; height: auto; margin-top: 10px;">
        <div class="form-actions">
          <!-- Tombol Scan Barcode -->
          <button 
            type="button" 
            class="scan-barcode-btn" 
            onclick="openBarcodeScanner()"
          >
            <i class="fas fa-barcode"></i> Scan Barcode
          </button>

          <button type="submit" class="submit-btn">Save Product</button>
          <button type="button" class="cancel-btn" id="cancelAddBtn">Cancel</button>
        </div>
            <!-- Overlay untuk scanning -->
                <div id="barcodeScannerModal" style="display: none;">
                  <div class="scanner-container">
                    <video id="barcodeVideo" style="width: 100%;"></video>
                    <button onclick="closeBarcodeScanner()">Close</button>
                  </div>
                </div>

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

        <div class="form-actions">
          <button type="submit" class="submit-btn">Save Product</button>
          <button type="button" class="cancel-btn" id="cancelAddBtn">Cancel</button>
        </div>
      </form>
    </div>
  `;

  loadCategories();
  setupProductForm();

  const cancelBtn = document.getElementById('cancelAddBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      showProducts();
    });
  }
};

const loadProducts = async () => {
  const user = auth.currentUser;
  if (!user) {
    await Swal.fire({ icon: 'warning', title: 'Not Logged In', text: "Please login first!" });
    return;
  }
  const productList = document.getElementById('productList');
  if (productList) {
    productList.innerHTML = '';
  }
  try {
    const querySnapshot = await getDocs(collection(db, `users/${user.uid}/products`));
    cachedProducts = [];
    querySnapshot.forEach((doc) => {
      const product = doc.data();
      product.docId = doc.id;
      cachedProducts.push(product);
    });
    if (cachedProducts.length === 0) {
      if (productList) productList.innerHTML = '<li>No products found.</li>';
    } else {
      renderProductList(cachedProducts);
    }
  } catch (error) {
    console.error("Error loading products:", error);
  }
};

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
  if (!content) return;

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
        <div class="category-container">
          <select id="categoryDropdown" required>
            <option value="" disabled selected>Select category</option>
          </select>
          <input type="text" id="newCategory" placeholder="Or create new category">
          <button type="button" class="add-category-btn" onclick="addNewCategory()">Add</button>
        </div>

        <button type="submit" class="savechange-btn">Save Changes</button>
        <button type="button" class="cancel-btn" id="cancelEditBtn">Cancel</button>
      </form>
    </div>
  `;

  loadEditCategories(category);

  const addCatBtn = document.getElementById('addNewCategoryEditBtn');
  if (addCatBtn) {
    addCatBtn.addEventListener('click', addNewCategoryEdit);
  }
  const cancelEditBtn = document.getElementById('cancelEditBtn');
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
      showProducts();
    });
  }

  const form = document.getElementById('editProductForm');
  if (form) {
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
  }
};

async function loadEditCategories(currentCategory) {
  const user = auth.currentUser;
  if (!user) return;

  const editCategoryDropdown = document.getElementById("editCategoryDropdown");
  if (!editCategoryDropdown) return;

  editCategoryDropdown.innerHTML = '<option value="" disabled>Select category</option>';
  try {
    const querySnapshot = await getDocs(collection(db, `users/${user.uid}/categories`));
    let foundSelected = false;
    querySnapshot.forEach((docSnap) => {
      const catData = docSnap.data();
      const option = document.createElement("option");
      option.value = catData.name;
      option.textContent = catData.name;
      if (currentCategory && catData.name === currentCategory) {
        option.selected = true;
        foundSelected = true;
      }
      editCategoryDropdown.appendChild(option);
    });
    if (!foundSelected && currentCategory) {
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

window.addNewCategoryEdit = async function() {
  const user = auth.currentUser;
  if (!user) return;

  const newCategoryInput = document.getElementById('newCategoryEdit');
  const editCategoryDropdown = document.getElementById('editCategoryDropdown');
  if (!newCategoryInput || !editCategoryDropdown) return;

  const newCategory = newCategoryInput.value.trim();
  if (!newCategory) {
    await Swal.fire({ icon: 'warning', title: 'Invalid Category', text: "Please enter a valid category name." });
    return;
  }

  try {
    await addDoc(collection(db, `users/${user.uid}/categories`), {
      name: newCategory
    });
    const newOption = document.createElement('option');
    newOption.value = newCategory;
    newOption.textContent = newCategory;
    editCategoryDropdown.appendChild(newOption);
    editCategoryDropdown.value = newCategory;
    newCategoryInput.value = '';
    await Swal.fire({ icon: 'success', title: 'Category added successfully!' });
  } catch (error) {
    console.error("Error adding category:", error);
    await Swal.fire({ icon: 'error', title: 'Error', text: error.message });
  }
};

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
    loadProducts();
  } catch (error) {
    console.error("Error deleting product:", error);
    await Swal.fire({ icon: 'error', title: 'Error', text: error.message });
  }
};

function setupProductForm() {
  const fileInput = document.getElementById('productImage');
  if (fileInput) {
    fileInput.addEventListener('change', function(event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const preview = document.getElementById('imagePreview');
          if (preview) {
            preview.src = e.target.result;
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }
  const form = document.getElementById('addProductForm');
  if (form) {
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
      const category = document.getElementById('categoryDropdown').value;
      const imageUrl = document.getElementById('imagePreview').src;

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
}

async function loadCategories() {
  const user = auth.currentUser;
  if (!user) return;

  const categoryDropdown = document.getElementById("categoryDropdown");
  if (!categoryDropdown) return;

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

window.addNewCategory = async function() {
  const user = auth.currentUser;
  if (!user) return;

  const newCategoryInput = document.getElementById('newCategory');
  const categoryDropdown = document.getElementById('categoryDropdown');
  if (!newCategoryInput || !categoryDropdown) return;

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
 * ( HAPUS SALAH SATU ) => Format Currency
 **********************************************/
window.formatCurrency = function(input) {
  let value = input.value.replace(/\D/g, "");
  if (value) {
    input.value = parseInt(value).toLocaleString("id-ID");
  }
};

/*************************************************
 *  POS SECTION
 ************************************************/
let allPOSProducts = [];
let cartPOS = [];

async function loadPOSProducts() {
  const user = auth.currentUser;
  if (!user) return;

  allPOSProducts = [];
  try {
    const qSnapshot = await getDocs(collection(db, `users/${user.uid}/products`));
    qSnapshot.forEach((docSnap) => {
      const product = docSnap.data();
      product.id = docSnap.id;
      allPOSProducts.push(product);
    });
  } catch (error) {
    console.error("Error loading POS products:", error);
  }
}

function filterPOSProducts(e) {
  const searchTerm = e.target.value.trim().toLowerCase();
  const posProductList = document.getElementById('pos-product-list');
  if (!posProductList) return;

  if (!searchTerm) {
    posProductList.innerHTML = '';
    return;
  }
  const filtered = allPOSProducts.filter(item =>
    item.name && item.name.toLowerCase().includes(searchTerm)
  );
  posProductList.innerHTML = '';
  if (filtered.length === 0) {
    posProductList.innerHTML = '<p>No matching products.</p>';
    return;
  }
  filtered.forEach(product => {
    const productDiv = document.createElement('div');
    productDiv.classList.add('pos-product-item');
    productDiv.innerHTML = `
      <img src="${product.imageUrl || 'default-thumbnail.png'}" style="width:60px; height:60px; object-fit:cover; margin-bottom:5px;">
      <div class="product-info">
        <h4 style="margin:0; font-size:14px;">${product.name}</h4>
        <p style="margin:0; font-size:12px;">Rp${parseInt(product.price).toLocaleString('id-ID')}</p>
      </div>
      <button class="add-to-cart-btn" style="margin-top:5px;">Add to Cart</button>
    `;
    productDiv.querySelector('.add-to-cart-btn').addEventListener('click', () => {
      addToCartPOS(product);
    });
    posProductList.appendChild(productDiv);
  });
}

function addToCartPOS(product) {
  const existingItem = cartPOS.find(item => item.id === product.id);
  if (existingItem) {
    existingItem.qty += 1;
  } else {
    cartPOS.push({ ...product, qty: 1 });
  }
  updateCartDisplay();
  const searchInput = document.getElementById('posSearchProduct');
  if (searchInput) searchInput.value = '';
  const posProductList = document.getElementById('pos-product-list');
  if (posProductList) posProductList.innerHTML = '';
}

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
    itemRow.classList.add('cart-item');
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

window.removeFromCart = function(index) {
  cartPOS.splice(index, 1);
  updateCartDisplay();
};

window.showPOS = async function() {
  const dashboard = document.getElementById('dashboard');
  if (dashboard) dashboard.style.display = "none";

  const user = auth.currentUser;
  if (!user) {
    await Swal.fire({ icon: 'warning', title: 'Not Logged In', text: "Please login first!" });
    return;
  }
  const content = document.getElementById('content');
  if (!content) return;

  content.innerHTML = `
    <div class="checkout-container">
      <h2>New Transaction</h2>
      <div class="search-container">
        <input type="text" id="posSearchProduct" placeholder="Search product...">
      </div>
      <div id="pos-product-list" style="margin-top:10px;"></div>
      <h3>Cart</h3>
      <div id="pos-cart" class="cart-container"></div>
      <div class="total-section">
        <span>Total:</span>
        <span id="pos-total">Rp0</span>
      </div>
      <button id="pos-checkout-btn" class="checkout-btn">Checkout</button>
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
        <div class="button-group">
          <button id="processPaymentBtn" class="process-btn">Process Payment</button>
          <button id="cancelPaymentBtn" class="cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
  `;

  await loadPOSProducts();

  const searchInput = document.getElementById('posSearchProduct');
  if (searchInput) {
    searchInput.addEventListener('input', filterPOSProducts);
  }
  const checkoutBtn = document.getElementById('pos-checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (cartPOS.length === 0) {
        Swal.fire({ icon: 'warning', title: 'Empty Cart', text: "Cart is empty!" });
        return;
      }
      const paymentSection = document.getElementById('payment-section');
      if (paymentSection) paymentSection.style.display = 'block';

      const posTotalElement = document.getElementById('pos-total');
      const paymentTotalElement = document.getElementById('paymentTotal');
      if (posTotalElement && paymentTotalElement) {
        paymentTotalElement.textContent = posTotalElement.textContent;
      }
      const amountPaidElement = document.getElementById('amountPaid');
      if (amountPaidElement) amountPaidElement.value = '';
      const paymentChangeElement = document.getElementById('paymentChange');
      if (paymentChangeElement) paymentChangeElement.textContent = '0';
    });
  }
  const processPaymentBtn = document.getElementById('processPaymentBtn');
  if (processPaymentBtn) {
    processPaymentBtn.addEventListener('click', finalizeTransaction);
  }
  const cancelPaymentBtn = document.getElementById('cancelPaymentBtn');
  if (cancelPaymentBtn) {
    cancelPaymentBtn.addEventListener('click', () => {
      const paymentSection = document.getElementById('payment-section');
      if (paymentSection) paymentSection.style.display = 'none';
    });
  }
  const amountPaidInput = document.getElementById('amountPaid');
  if (amountPaidInput) {
    amountPaidInput.addEventListener('input', calculateChange);
  }

  updateCartDisplay();
};

function calculateChange() {
  const totalText = document.getElementById('paymentTotal')?.textContent;
  if (!totalText) return;
  const total = parseInt(totalText.replace(/\./g, '')) || 0;

  let paidText = document.getElementById('amountPaid')?.value || "0";
  paidText = paidText.replace(/\./g, '');
  const paid = parseInt(paidText) || 0;

  const change = paid - total;
  const paymentChange = document.getElementById('paymentChange');
  if (!paymentChange) return;

  paymentChange.textContent = (change < 0)
    ? "0"
    : change.toLocaleString('id-ID');
}

async function generateInvoiceNo(db, uid) {
  const invoiceRef = doc(db, `users/${uid}/meta`, "invoiceCounter");
  const invoiceNo = await runTransaction(db, async (transaction) => {
    const counterSnap = await transaction.get(invoiceRef);
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const currentYearMonth = `${year}-${month}`;
    let currentNumber = 1;
    if (!counterSnap.exists()) {
      transaction.set(invoiceRef, {
        currentMonth: currentYearMonth,
        currentNumber: currentNumber
      });
    } else {
      const data = counterSnap.data();
      if (data.currentMonth !== currentYearMonth) {
        transaction.update(invoiceRef, {
          currentMonth: currentYearMonth,
          currentNumber: currentNumber
        });
      } else {
        currentNumber = (data.currentNumber || 0) + 1;
        transaction.update(invoiceRef, {
          currentNumber: currentNumber
        });
      }
    }
    const invoiceStr = `Invoice-${year}/${month}-${String(currentNumber).padStart(4, "0")}`;
    return invoiceStr;
  });
  return invoiceNo;
}

async function finalizeTransaction() {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");

    const invoiceNo = await generateInvoiceNo(db, user.uid);
    const totalText = document.getElementById('pos-total')?.textContent;
    const total = parseInt(totalText.replace(/\./g, '')) || 0;

    let paidText = document.getElementById('amountPaid')?.value.replace(/\./g, '') || "0";
    const paid = parseInt(paidText) || 0;

    const changeText = document.getElementById('paymentChange')?.textContent;
    const change = parseInt(changeText.replace(/\./g, '')) || 0;

    const method = document.getElementById('paymentMethod')?.value;

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

    // Kurangi stok
    for (const cartItem of cartPOS) {
      const productRef = doc(db, `users/${user.uid}/products`, cartItem.id);
      await updateDoc(productRef, {
        stock: increment(-cartItem.qty)
      });
    }

    await Swal.fire({ icon: 'success', title: 'Transaction Saved', text: "Invoice: " + invoiceNo });
    cartPOS = [];
    updateCartDisplay();
    const paymentSection = document.getElementById('payment-section');
    if (paymentSection) paymentSection.style.display = 'none';
  } catch (error) {
    console.error("Error finalizing transaction:", error);
    await Swal.fire({ icon: 'error', title: 'Transaction Error', text: "Error finalizing transaction: " + error.message });
  }
}

/*************************************************
 *  SALES HISTORY
 ************************************************/
window.filterSales = async function () {
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  if (!startDateInput || !endDateInput) return;

  const startDate = new Date(startDateInput.value);
  const endDate = new Date(endDateInput.value);

  const salesList = document.getElementById('salesList');
  if (!salesList) return;
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
        return;
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

window.resetFilter = function () {
  const startDate = document.getElementById('startDate');
  const endDate = document.getElementById('endDate');
  if (startDate) startDate.value = '';
  if (endDate) endDate.value = '';
  window.showHistory();
};

window.showHistory = async function() {
  const dashboard = document.getElementById('dashboard');
  if (dashboard) dashboard.style.display = "none";

  const user = auth.currentUser;
  if (!user) {
    await Swal.fire({ icon: 'warning', title: 'Not Logged In', text: "Please login first!" });
    return;
  }
  const content = document.getElementById('content');
  if (!content) return;

  content.innerHTML = `
    <h2>Sales History</h2>
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
    if (!salesList) return;
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
            <button onclick="printReceipt('${docId}')" 
              style="background: #007bff; color: white; padding: 5px 10px; margin: 5px;">
              Print Receipt
            </button>
            <button onclick="voidTransaction('${docId}', event)" 
              style="background: #dc3545; color: white; padding: 5px 10px;">
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

window.printReceipt = async function (transactionId) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");

    const transactionRef = doc(db, `users/${user.uid}/sales`, transactionId);
    const transactionSnap = await getDoc(transactionRef);
    if (!transactionSnap.exists()) throw new Error("Transaction not found");
    const transaction = transactionSnap.data();

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    const customText = userSnap.exists() ? (userSnap.data().customText || '') : '';

    const { jsPDF } = window.jspdf;
    const docPDF = new jsPDF();

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

    yOffset += 10;
    docPDF.text("----------------------------", 20, yOffset);
    yOffset += 10;
    docPDF.setFontSize(12);
    docPDF.text(customText, 20, yOffset);

    yOffset += 20;
    docPDF.text("****************************", 20, yOffset);
    docPDF.save(`${transaction.invoiceNo}_Receipt.pdf`);

  } catch (error) {
    console.error("Error printing receipt:", error);
    Swal.fire({ icon: 'error', title: 'Error', text: error.message });
  }
};

window.toggleDetails = function (docId) {
  const details = document.getElementById(`details-${docId}`);
  if (!details) return;
  details.style.display = (details.style.display === "none" || !details.style.display) ? "block" : "none";
};

window.voidTransaction = async function(docId, event) {
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
    showHistory();
  } catch (error) {
    console.error("Error voiding transaction:", error);
    await Swal.fire({ icon: 'error', title: 'Error', text: "Failed to void transaction: " + error.message });
  }
};

window.showFinance = async function() {
  const dashboard = document.getElementById('dashboard');
  if (dashboard) dashboard.style.display = "none";

  const user = auth.currentUser;
  if (!user) {
    await Swal.fire({ icon: 'warning', title: 'Not Logged In', text: "Please login first!" });
    return;
  }
  const content = document.getElementById('content');
  if (!content) return;

  let totalExpense = 0;
  let totalProducts = 0;
  try {
    const productSnap = await getDocs(collection(db, `users/${user.uid}/products`));
    productSnap.forEach((docSnap) => {
      const p = docSnap.data();
      const purchasePrice = Number(p.purchasePrice) || 0;
      const stock = Number(p.stock) || 0;
      totalExpense += (purchasePrice * stock);
      totalProducts++;
    });
  } catch (error) {
    console.error("Error getting products:", error);
  }

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
  const avgExpensePerProduct = totalProducts > 0 ? totalExpense / totalProducts : 0;
  const avgRevenuePerTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
  const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

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
        <span class="finance-value">
          ${totalProducts > 0 
            ? "Rp" + avgExpensePerProduct.toLocaleString('id-ID', { maximumFractionDigits: 2 }) 
            : "-"}
        </span>
      </div>
      <div class="finance-item">
        <span class="finance-label">Avg Revenue per Transaction</span>
        <span class="finance-value">
          ${totalTransactions > 0 
            ? "Rp" + avgRevenuePerTransaction.toLocaleString('id-ID', { maximumFractionDigits: 2 }) 
            : "-"}
        </span>
      </div>
      <div class="finance-item">
        <span class="finance-label">Profit Margin</span>
        <span class="finance-value">
          ${totalRevenue > 0 ? profitMargin.toFixed(2) + "%" : "-"}
        </span>
      </div>
    </div>
  `;
};

window.showInventory = async function() {
  const dashboard = document.getElementById('dashboard');
  if (dashboard) dashboard.style.display = "none";

  const user = auth.currentUser;
  if (!user) {
    await Swal.fire({ icon: 'warning', title: 'Not Logged In', text: "Please login first!" });
    return;
  }
  const content = document.getElementById('content');
  if (!content) return;

  content.innerHTML = `
    <h2>Inventory Management</h2>
    <div id="inventoryList">Loading...</div>
  `;
  loadInventoryItems();
};

async function loadInventoryItems() {
  const user = auth.currentUser;
  if (!user) return;
  const inventoryList = document.getElementById('inventoryList');
  if (!inventoryList) return;

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
          <td>
            <!-- MOD START: Pastikan pakai class btn-history -->
            <button class="btn-history" onclick="viewInventoryHistory('${docSnap.id}', '${item.name}')">
              View History
            </button>
            <!-- MOD END -->
          </td>
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

window.viewInventoryHistory = async function(productId, productName) {
  const user = auth.currentUser;
  if (!user) return;

  const content = document.getElementById('content');
  if (!content) return;
  content.innerHTML = `
    <h2>Inventory History for ${productName}</h2>
    <button onclick="showInventory()">Back to Inventory</button>
    <div id="historyList">Loading...</div>
  `;
  const historyList = document.getElementById('historyList');
  if (!historyList) return;

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
// Fungsi untuk membuka modal/overlay scanning
window.openBarcodeScanner = function() {
  const scannerModal = document.getElementById('barcodeScannerModal');
  if (!scannerModal) return;

  scannerModal.style.display = 'block'; // Tampilkan overlay
  startQuagga();
};

// Fungsi menutup modal
window.closeBarcodeScanner = function() {
  const scannerModal = document.getElementById('barcodeScannerModal');
  if (!scannerModal) return;

  scannerModal.style.display = 'none'; 
  stopQuagga();
};

function startQuagga() {
  Quagga.init({
    inputStream: {
      name: 'Live',
      type: 'LiveStream',
      target: document.querySelector('#barcodeVideo'), // Video element
      constraints: {
        facingMode: 'environment' // Pakai kamera belakang
      }
    },
    decoder: {
      // Format barcode yang ingin di-scan:  
      readers: ['code_128_reader','ean_reader','ean_8_reader','upc_reader'] 
    }
  }, function(err) {
    if (err) {
      console.error('Quagga init error:', err);
      return;
    }
    Quagga.start();
  });

  // Event ketika barcode terdeteksi
  Quagga.onDetected(onBarcodeDetected);
}

function stopQuagga() {
  Quagga.stop();
  Quagga.offDetected(onBarcodeDetected);
}

// Callback saat barcode sukses di-decode
function onBarcodeDetected(result) {
  const code = result.codeResult.code; 
  console.log('Barcode detected:', code);
  
  // Langsung isi “Product Name” atau field “Barcode”
  // Tergantung rancangan form-mu
  // Misalnya kita isi input "productName" dengan code
  document.getElementById('productName').value = code;

  // Lalu mungkin panggil fungsi untuk fetch data ritel
  fetchRetailProductData(code);

  // Tutup scanner
  closeBarcodeScanner();
}
async function fetchRetailProductData(barcode) {
  // Gunakan API key milikmu, contoh di docs barcodelookup.com
  const apiKey = "YOUR_API_KEY";
  const url = `https://api.barcodelookup.com/v2/products?barcode=${barcode}&formatted=y&key=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.products && data.products.length > 0) {
      // Ambil data produk pertama
      const product = data.products[0];

      // Contoh: auto-isi form
      // Pastikan ID input di form sesuai milikmu
      document.getElementById('productName').value = product.title || '';
      document.getElementById('description').value = product.description || '';
      // Hati-hati untuk 'price' karena banyak API tidak menyediakan 'price' universal
      // Terkadang hanya menampilkan 'brand' / 'category', dsb.

      console.log("Data produk dari API:", product);
    } else {
      console.warn("Produk tidak ditemukan di database API.");
      Swal.fire({
        icon: 'warning',
        title: 'Not Found',
        text: 'No product data found for this barcode.'
      });
    }
  } catch (error) {
    console.error("Error fetching product data:", error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'Failed to fetch product data.'
    });
  }
}
