document.addEventListener('DOMContentLoaded', () => {
    // Inicializa los iconos de la librería Lucide
    lucide.createIcons();

    // URL base de la API. Asegúrate que el puerto coincida con tu backend
    const API_URL = 'http://localhost:5000/api/products'; 
    
    // --- Referencias a elementos del DOM ---
    const productDisplay = document.getElementById('product-display');
    const searchInput = document.getElementById('searchInput');
    const gridViewBtn = document.getElementById('gridViewBtn');
    const listViewBtn = document.getElementById('listViewBtn');
    const addProductBtn = document.getElementById('add-product-btn');
    const modal = document.getElementById('product-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');
    const productForm = document.getElementById('product-form');
    const modalTitle = document.getElementById('modal-title');
    
    let allProducts = []; // Caché local de todos los productos
    let currentView = 'grid'; // Vista actual (grid o list)

    // --- Funciones de Renderizado ---

    /**
     * Renderiza la lista de productos en el contenedor principal.
     * @param {Array} products - El array de productos a mostrar.
     */
    const renderProducts = (products) => {
        productDisplay.innerHTML = ''; // Limpia la vista actual
        
        if (products.length === 0 && searchInput.value === '') {
             productDisplay.innerHTML = createEmptyState('Tu inventario está vacío', 'Haz clic en "Añadir" para empezar a gestionar tu stock.', 'package');
        } else if (products.length === 0) {
            productDisplay.innerHTML = createEmptyState('No se encontraron productos', 'Prueba a buscar con otros términos.', 'package-search');
        } else {
            products.forEach(product => {
                const productElement = currentView === 'grid' ? createProductCard(product) : createProductListItem(product);
                productDisplay.insertAdjacentHTML('beforeend', productElement);
            });
        }
        lucide.createIcons(); // Vuelve a crear los iconos después de modificar el DOM
        addEventListenersToActions(); // Añade los event listeners a los nuevos botones
    };

    /**
     * Crea el HTML para la tarjeta de un producto en la vista de cuadrícula.
     * @param {Object} product - El objeto del producto.
     * @returns {string} - El string HTML de la tarjeta.
     */
    const createProductCard = (product) => `
        <div class="product-card" data-id="${product._id}">
            <div class="action-menu">
                <button class="action-menu-btn" title="Más opciones"><i data-lucide="more-horizontal"></i></button>
                <div class="action-menu-content">
                    <button class="edit-btn"><i data-lucide="edit"></i> Editar</button>
                    <button class="delete-btn delete"><i data-lucide="trash-2"></i> Eliminar</button>
                </div>
            </div>
            <img src="${product.fotoUrl}" alt="${product.nombre}" onerror="this.onerror=null;this.src='https://placehold.co/400x400/111827/9ca3af?text=Sin+Imagen';">
            <h3>${product.nombre}</h3>
            <p class="description">${product.descripcion}</p>
            <div class="product-card-footer">
                <span class="product-stock ${product.cantidad < 10 ? 'low' : 'ok'}">Stock: ${product.cantidad}</span>
                <span class="product-price">$${product.precio.toFixed(2)}</span>
            </div>
        </div>
    `;
    
    /**
     * Crea el HTML para un producto en la vista de lista.
     * @param {Object} product - El objeto del producto.
     * @returns {string} - El string HTML del elemento de la lista.
     */
    const createProductListItem = (product) => `
        <div class="product-list-item" data-id="${product._id}">
            <img src="${product.fotoUrl}" alt="${product.nombre}" onerror="this.onerror=null;this.src='https://placehold.co/100x100/111827/9ca3af?text=N/A';">
            <p class="name">${product.nombre}</p>
            <p>${product.descripcion}</p>
            <p class="stock ${product.cantidad < 10 ? 'low' : ''}">${product.cantidad}</p>
            <p class="price">$${product.precio.toFixed(2)}</p>
            <div class="action-menu">
                <button class="action-menu-btn" title="Más opciones"><i data-lucide="more-horizontal"></i></button>
                <div class="action-menu-content">
                    <button class="edit-btn"><i data-lucide="edit"></i> Editar</button>
                    <button class="delete-btn delete"><i data-lucide="trash-2"></i> Eliminar</button>
                </div>
            </div>
        </div>
    `;

    /**
     * Crea el HTML para los estados de "vacío" o "sin resultados".
     * @param {string} title - Título del mensaje.
     * @param {string} message - Subtítulo del mensaje.
     * @param {string} icon - Nombre del icono de Lucide.
     * @returns {string} - El string HTML del estado.
     */
    const createEmptyState = (title, message, icon) => `
        <div class="empty-state">
            <i data-lucide="${icon}" style="width: 60px; height: 60px;"></i>
            <h3 style="font-size: 1.5rem; margin-top: 1rem;">${title}</h3>
            <p>${message}</p>
        </div>
    `;

    /**
     * Actualiza las tarjetas de estadísticas (KPIs).
     */
    const updateStats = () => {
        const totalValue = allProducts.reduce((sum, p) => sum + p.precio * p.cantidad, 0);
        const lowStockItems = allProducts.filter(p => p.cantidad < 10).length;
        document.getElementById('totalValue').textContent = `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('totalItems').textContent = allProducts.length;
        document.getElementById('lowStockItems').textContent = lowStockItems;
    };

    // --- Lógica de la API (CRUD) ---

    /**
     * Obtiene todos los productos del servidor.
     */
    const fetchProducts = async () => {
        productDisplay.innerHTML = `<div class="loader-container"><div class="loader"></div></div>`;
        try {
            const response = await fetch(API_URL);
            if (!response.ok) throw new Error('No se pudo conectar al servidor');
            allProducts = await response.json();
            renderProducts(allProducts);
            updateStats();
        } catch (error) {
            productDisplay.innerHTML = createEmptyState('Error de Conexión', `No se pudieron cargar los datos. Asegúrate de que el servidor backend esté funcionando en ${API_URL}`, 'server-off');
            lucide.createIcons();
            console.error(error);
        }
    };
    
    /**
     * Maneja el envío del formulario para crear o actualizar un producto.
     * @param {Event} event - El evento de envío del formulario.
     */
    const handleFormSubmit = async (event) => {
        event.preventDefault();
        const id = document.getElementById('productId').value;
        const formData = new FormData(productForm); // FormData maneja 'multipart/form-data' automáticamente

        const method = id ? 'PUT' : 'POST';
        const url = id ? `${API_URL}/${id}` : API_URL;

        try {
            const response = await fetch(url, {
                method: method,
                body: formData, // No se necesita 'Content-Type', FormData lo establece
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ocurrió un error en el servidor');
            }

            closeModal();
            fetchProducts(); // Vuelve a cargar los productos para reflejar los cambios
        } catch (error) {
            alert(`Error al guardar: ${error.message}`);
            console.error(error);
        }
    };

    /**
     * Abre el modal en modo edición y rellena el formulario con los datos del producto.
     * @param {string} id - El ID del producto a editar.
     */
    const handleEdit = (id) => {
        const product = allProducts.find(p => p._id === id);
        if (product) {
            modalTitle.textContent = 'Editar Artículo';
            document.getElementById('productId').value = product._id;
            document.getElementById('nombre').value = product.nombre;
            document.getElementById('cantidad').value = product.cantidad;
            document.getElementById('precio').value = product.precio;
            document.getElementById('descripcion').value = product.descripcion;
            document.getElementById('foto').value = ''; // El input de archivo no se puede pre-rellenar
            openModal();
        }
    };

    /**
     * Elimina un producto del servidor.
     * @param {string} id - El ID del producto a eliminar.
     */
    const handleDelete = async (id) => {
        if (confirm('¿Estás seguro de que quieres eliminar este artículo? Esta acción es irreversible.')) {
            try {
                const response = await fetch(`${API_URL}/${id}`, {
                    method: 'DELETE',
                });
                if (!response.ok) throw new Error('Error al eliminar el producto');
                fetchProducts(); // Vuelve a cargar los productos
            } catch (error) {
                alert(`Error: ${error.message}`);
                console.error(error);
            }
        }
    };
    
    // --- Manejo de Eventos y UI ---

    const openModal = () => modal.classList.add('show');
    const closeModal = () => {
        modal.classList.remove('show');
        productForm.reset();
        document.getElementById('productId').value = '';
    };

    /**
     * Añade los listeners para los botones de editar, eliminar y el menú de acciones.
     */
    const addEventListenersToActions = () => {
        document.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('[data-id]').dataset.id;
                handleEdit(id);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.target.closest('[data-id]').dataset.id;
                handleDelete(id);
            });
        });

        document.querySelectorAll('.action-menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Evita que el clic se propague al window
                const content = btn.nextElementSibling;
                // Cierra otros menús abiertos antes de abrir el actual
                document.querySelectorAll('.action-menu-content.show').forEach(menu => {
                    if (menu !== content) menu.classList.remove('show');
                });
                content.classList.toggle('show');
            });
        });
    };

    // --- Inicialización de Listeners ---
    addProductBtn.addEventListener('click', () => {
        modalTitle.textContent = 'Añadir Nuevo Artículo';
        openModal();
    });

    modalCloseBtn.addEventListener('click', closeModal);
    modalCancelBtn.addEventListener('click', closeModal);
    productForm.addEventListener('submit', handleFormSubmit);

    // Listeners para cambiar entre vista de cuadrícula y lista
    gridViewBtn.addEventListener('click', () => {
        if (currentView === 'grid') return;
        currentView = 'grid';
        productDisplay.className = 'grid';
        gridViewBtn.classList.add('active');
        listViewBtn.classList.remove('active');
        const searchTerm = searchInput.value.toLowerCase();
        const filtered = allProducts.filter(p => p.nombre.toLowerCase().includes(searchTerm) || p.descripcion.toLowerCase().includes(searchTerm));
        renderProducts(filtered);
    });

    listViewBtn.addEventListener('click', () => {
        if (currentView === 'list') return;
        currentView = 'list';
        productDisplay.className = 'list';
        listViewBtn.classList.add('active');
        gridViewBtn.classList.remove('active');
        const searchTerm = searchInput.value.toLowerCase();
        const filtered = allProducts.filter(p => p.nombre.toLowerCase().includes(searchTerm) || p.descripcion.toLowerCase().includes(searchTerm));
        renderProducts(filtered);
    });
    
    // Listener para la búsqueda en tiempo real
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filteredProducts = allProducts.filter(p => 
            p.nombre.toLowerCase().includes(searchTerm) ||
            p.descripcion.toLowerCase().includes(searchTerm)
        );
        renderProducts(filteredProducts);
    });
    
    // Listener global para cerrar menús de acción al hacer clic fuera
    window.addEventListener('click', (e) => {
        if (!e.target.closest('.action-menu')) {
            document.querySelectorAll('.action-menu-content.show').forEach(menu => {
                menu.classList.remove('show');
            });
        }
    });

    // Carga inicial de los productos
    fetchProducts();
});
