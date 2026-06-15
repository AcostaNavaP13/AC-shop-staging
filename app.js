let WHATSAPP_NUMBER = "6143382041";
let IS_ORDERS_ENABLED = true;
let IS_DISCOUNTS_ENABLED = true;
let allProducts = [];
let cart = JSON.parse(localStorage.getItem("oa_cart")) || [];

// Cargar logo en caché para evitar pestañeos
const cachedLogo = localStorage.getItem("oa_logo");
if (cachedLogo) {
    const favicon = document.getElementById("favicon");
    if(favicon) favicon.href = cachedLogo;
    const loaderLogo = document.getElementById("loader-logo");
    if(loaderLogo) loaderLogo.src = cachedLogo;
    const storeLogoImg = document.getElementById("store-logo-img");
    if(storeLogoImg) storeLogoImg.src = cachedLogo;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeJs(value) {
    return String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function placeholderImage(size = 300) {
    return `https://via.placeholder.com/${size}?text=IMG`;
}

function normalizeImages(product) {
    const images = Array.isArray(product.imageUrls) ? product.imageUrls : [];
    if (images.length > 0) return images.filter(Boolean);
    if (product.imageUrl) return [product.imageUrl];
    return [placeholderImage()];
}

async function renderCatalog() {
    const grid = document.getElementById("product-grid");
    if (!grid) return;

    try {
        const settings = await Database.getSettings();
        WHATSAPP_NUMBER = settings.whatsapp || "6143382041";
        IS_ORDERS_ENABLED = settings.ordersEnabled !== false;
        IS_DISCOUNTS_ENABLED = settings.discountsEnabled !== false;

        const storeNameDisplay = document.getElementById("store-name-display");
        const heroTitleDisplay = document.getElementById("hero-title-display");
        const heroSubtitleDisplay = document.getElementById("hero-subtitle-display");
        const storeLogoImg = document.getElementById("store-logo-img");

        if(storeNameDisplay && settings.storeName) storeNameDisplay.innerText = settings.storeName;
        if(heroTitleDisplay && settings.heroTitle) heroTitleDisplay.innerText = settings.heroTitle;
        if(heroSubtitleDisplay && settings.heroSubtitle) heroSubtitleDisplay.innerText = settings.heroSubtitle;
        
        if(settings.logoUrl) {
            localStorage.setItem("oa_logo", settings.logoUrl);
            if(storeLogoImg) storeLogoImg.src = settings.logoUrl;
            const favicon = document.getElementById("favicon");
            if(favicon) favicon.href = settings.logoUrl;
            const loaderLogo = document.getElementById("loader-logo");
            if(loaderLogo) loaderLogo.src = settings.logoUrl;
        }

        // Ensure page title is also updated
        if(settings.storeName) document.title = settings.storeName;

        allProducts = await Database.getProducts();

        // Banner principal
        renderBanner(settings);
        // Sub-banners de categorías
        renderCategoryBanners(settings);

        populateFilters();
        renderGrid(allProducts);
    } catch(err) {
        console.error(err);
        grid.innerHTML = "<p style='color: red; grid-column: 1 / -1; text-align:center;'>Hubo un error al cargar los productos.</p>";
    } finally {
        const loader = document.getElementById("oa-loading");
        if(loader) {
            loader.style.opacity = "0";
            setTimeout(() => loader.style.display = "none", 500);
        }
    }
}

function processFilters() {
    let filtered = [...allProducts];

    const cat = document.getElementById("filter-category").value;
    const brand = document.getElementById("filter-brand").value;
    const size = document.getElementById("filter-size").value;
    const sort = document.getElementById("sort-price").value;
    const searchInput = document.getElementById("search-input");
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

    if (query) {
        filtered = filtered.filter(p => {
            const hay = [p.name, p.brand, p.category, p.description || ""].join(" ").toLowerCase();
            return hay.includes(query);
        });
    }
    if (cat) filtered = filtered.filter(p => p.category === cat);
    if (brand) filtered = filtered.filter(p => p.brand === brand);

    if (size) {
        filtered = filtered.filter(p => {
            if (p.sizes && p.sizes.length > 0) {
                return p.sizes.some(s => s.name.trim().toUpperCase() === size.toUpperCase() && s.qty > 0);
            }
            if (!p.size) return false;
            const productSizes = p.size.split(/[,-\s]+/).map(s => s.trim().toUpperCase());
            return productSizes.includes(size.toUpperCase());
        });
    }

    if (sort === "asc") filtered.sort((a,b) => Number(a.price) - Number(b.price));
    if (sort === "desc") filtered.sort((a,b) => Number(b.price) - Number(a.price));

    renderGrid(filtered);
}

function populateFilters() {
    const categories = new Set();
    const brands = new Set();
    const sizes = new Set();

    allProducts.forEach(p => {
        if(p.category && p.category !== "General") categories.add(p.category);
        if(p.brand && p.brand !== "Generica") brands.add(p.brand);

        if (p.sizes && p.sizes.length > 0) {
            p.sizes.forEach(s => {
                if(s.name && s.qty > 0) sizes.add(s.name.trim().toUpperCase());
            });
        } else if(p.size && p.size !== "Unitalla") {
            const productSizes = p.size.split(/[,-\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
            productSizes.forEach(s => sizes.add(s));
        }
    });

    const buildOptions = (set, defaultText) => {
        let html = `<option value="">${escapeHtml(defaultText)}</option>`;
        Array.from(set).sort().forEach(item => {
            html += `<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`;
        });
        return html;
    };

    document.getElementById("filter-category").innerHTML = buildOptions(categories, "Categorías (Todas)");
    document.getElementById("filter-brand").innerHTML = buildOptions(brands, "Marcas (Todas)");
    document.getElementById("filter-size").innerHTML = buildOptions(sizes, "Tallas (Todas)");

    document.getElementById("filter-category").addEventListener("change", processFilters);
    document.getElementById("filter-brand").addEventListener("change", processFilters);
    document.getElementById("filter-size").addEventListener("change", processFilters);
    document.getElementById("sort-price").addEventListener("change", processFilters);
}

function renderGrid(productsToRender) {
    const grid = document.getElementById("product-grid");
    grid.innerHTML = "";

    if (productsToRender.length === 0) {
        grid.innerHTML = "<p style='color: var(--text-secondary); grid-column: 1 / -1; text-align: center; padding: 40px;'>No hay productos que coincidan con tus filtros.</p>";
        return;
    }

    productsToRender.forEach(product => {
        const isOutOfStock = Number(product.quantity) <= 0;
        const images = normalizeImages(product);
        let productSizes = [];
        if (product.sizes && product.sizes.length > 0) {
            productSizes = product.sizes.filter(s => s.qty > 0).map(s => s.name.trim());
            if (productSizes.length === 0) productSizes = ["Agotado"];
        } else {
            productSizes = product.size && product.size !== "Unitalla"
                ? product.size.split(/[,-\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean)
                : ["Unitalla"];
        }

        const card = document.createElement("div");
        card.className = "ios-card product-card-hover";
        card.style.cursor = "pointer";
        card.onclick = (e) => {
            if(e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
            openProductModal(product.id);
        };

        // Imagen principal con hover
        const imgContainer = document.createElement("div");
        imgContainer.className = "card-img-hover-container";
        imgContainer.style.cssText = "border-radius:14px; overflow:hidden; background:#f9f9f9; position:relative;";
        const mainImg = document.createElement("img");
        mainImg.src = images[0];
        mainImg.alt = product.name;
        mainImg.className = "product-image";
        mainImg.onerror = () => { mainImg.src = placeholderImage(); };
        imgContainer.appendChild(mainImg);

        if (images.length > 1) {
            let hoverIdx = 0;
            let hoverInterval = null;
            imgContainer.addEventListener("mouseenter", () => {
                hoverIdx = 1;
                mainImg.style.transition = "opacity 0.3s";
                hoverInterval = setInterval(() => {
                    mainImg.style.opacity = "0.6";
                    setTimeout(() => {
                        mainImg.src = images[hoverIdx % images.length];
                        mainImg.style.opacity = "1";
                        hoverIdx++;
                    }, 150);
                }, 1200);
            });
            imgContainer.addEventListener("mouseleave", () => {
                clearInterval(hoverInterval);
                mainImg.src = images[0];
                mainImg.style.opacity = "1";
            });
        }

        card.appendChild(imgContainer);

        card.insertAdjacentHTML("beforeend", `
            <div class="product-header">
                <h3 class="product-title">${escapeHtml(product.name)}</h3>
                <div style="display: flex; align-items: baseline; gap: 6px;">
                    ${IS_DISCOUNTS_ENABLED && product.discountEnabled && product.discountPercent > 0 ? 
                        `<span style="font-size: 12px; text-decoration: line-through; color: #8E8E93;">$${Number(product.price).toFixed(2)}</span>
                         <p class="product-price" style="color: var(--apple-red);">$${(Number(product.price) * (1 - product.discountPercent / 100)).toFixed(2)}</p>
                         <span style="font-size: 10px; font-weight: bold; color: white; background-color: var(--apple-red); padding: 2px 6px; border-radius: 6px;">-${product.discountPercent}%</span>` 
                    : `<p class="product-price">$${Number(product.price || 0).toFixed(2)}</p>`}
                </div>
            </div>
            <p style="font-size: 11px; color: #8E8E93; margin-top: 4px; margin-bottom: 2px;">
                ${escapeHtml(product.category || "N/A")} • ${escapeHtml(product.brand || "N/A")}
            </p>
            ${isOutOfStock ?
                `<p class="product-stock out-of-stock" style="margin-top: 10px; margin-bottom: 10px;">Agotado</p>`
               : 
                `<div style="display:flex; gap:8px; margin-top:12px;">
                    <button class="ios-btn" style="background-color: var(--apple-blue); color: white; display:flex; justify-content:center; align-items:center; flex:1; margin:0; pointer-events: none; font-size:14px; padding:12px;">Ver más</button>
                    <button class="ios-btn" style="background-color: var(--apple-green); color: white; display:flex; justify-content:center; align-items:center; margin:0; padding:12px; width:44px;" onclick="event.stopPropagation(); quickAddToCart('${escapeJs(product.id)}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    </button>
                </div>`
            }
        `);
        grid.appendChild(card);
    });
}

let modalImageIndex = 0;
let currentModalImages = [];

window.openProductModal = function(id) {
    const product = allProducts.find(p => p.id === id);
    if(!product) return;

    currentModalImages = normalizeImages(product);
    modalImageIndex = 0;
    
    document.getElementById('product-modal-name').innerText = escapeHtml(product.name);
    
    const priceEl = document.getElementById('product-modal-price');
    const compareEl = document.getElementById('product-modal-compare-price');
    const savingEl = document.getElementById('product-modal-saving');
    
    if (IS_DISCOUNTS_ENABLED && product.discountEnabled && product.discountPercent > 0) {
        const finalPrice = Number(product.price) * (1 - product.discountPercent / 100);
        compareEl.innerText = `$${Number(product.price).toFixed(2)}`;
        compareEl.style.display = 'inline';
        priceEl.innerText = `$${finalPrice.toFixed(2)}`;
        priceEl.style.color = "var(--apple-red)";
        
        savingEl.innerText = `-${product.discountPercent}% OFF`;
        savingEl.style.display = 'inline-block';
        savingEl.style.backgroundColor = "var(--apple-red)";
        savingEl.style.color = "white";
        savingEl.style.padding = "2px 6px";
        savingEl.style.borderRadius = "6px";
        savingEl.style.fontSize = "12px";
        savingEl.style.fontWeight = "bold";
    } else {
        compareEl.style.display = 'none';
        savingEl.style.display = 'none';
        priceEl.style.color = "var(--text-primary)";
        priceEl.innerText = `$${Number(product.price || 0).toFixed(2)}`;
    }
    
    document.getElementById('product-modal-description').innerText = product.description || "Sin descripción adicional.";

    renderModalCarousel();

    const actionContainer = document.getElementById('product-modal-action-container');
    const isOutOfStock = Number(product.quantity) <= 0;
    
    if (isOutOfStock) {
        actionContainer.innerHTML = `
            <button class="ios-btn disabled" style="background:#E5E5EA; color:#8E8E93; width: 100%;" disabled>Agotado</button>
        `;
    } else {
        let productSizes = [];
        if (product.sizes && product.sizes.length > 0) {
            productSizes = product.sizes.filter(s => s.qty > 0).map(s => s.name.trim());
        } else {
            productSizes = product.size && product.size !== "Unitalla"
                ? product.size.split(/[,-\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean)
                : ["Unitalla"];
        }

        actionContainer.innerHTML = `
            <select id="modal-size-select" class="ios-select" style="width: 100%; margin-bottom: 12px; padding: 12px;">
                ${productSizes.map(s => `<option value="${escapeHtml(s)}">Talla: ${escapeHtml(s)}</option>`).join("")}
            </select>
            <button id="modal-add-btn" class="ios-btn" style="background-color: var(--apple-green); color: white; width: 100%; display:flex; justify-content:center; align-items:center;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                Añadir al carrito
            </button>
        `;
        
        document.getElementById('modal-add-btn').onclick = (e) => {
            const selectedSize = document.getElementById('modal-size-select').value;
            addToCartModal(product.id, product.name, product.price, currentModalImages[0], selectedSize, e);
        };
    }

    document.getElementById('product-modal').style.display = 'flex';
};

window.closeProductModal = function() {
    document.getElementById('product-modal').style.display = 'none';
};

function renderModalCarousel() {
    const imgEl = document.getElementById('product-modal-image');
    imgEl.src = currentModalImages[modalImageIndex];
    
    const dotsContainer = document.getElementById('product-modal-dots');
    dotsContainer.innerHTML = '';
    
    if (currentModalImages.length > 1) {
        currentModalImages.forEach((_, i) => {
            const dot = document.createElement('div');
            dot.style.width = '8px';
            dot.style.height = '8px';
            dot.style.borderRadius = '50%';
            dot.style.background = i === modalImageIndex ? 'var(--apple-blue)' : '#D1D1D6';
            dot.style.cursor = 'pointer';
            dot.onclick = () => {
                modalImageIndex = i;
                renderModalCarousel();
            };
            dotsContainer.appendChild(dot);
        });
        
        // Add swipe support for mobile (basic implementation)
        const container = document.getElementById('product-modal-image-container');
        container.onclick = (e) => {
            // Click right half to go next, left half to go prev
            const rect = container.getBoundingClientRect();
            const x = e.clientX - rect.left;
            if (x > rect.width / 2) {
                modalImageIndex = (modalImageIndex + 1) % currentModalImages.length;
            } else {
                modalImageIndex = (modalImageIndex - 1 + currentModalImages.length) % currentModalImages.length;
            }
            renderModalCarousel();
        };
    } else {
        document.getElementById('product-modal-image-container').onclick = null;
    }
}

window.addToCartModal = function(id, name, price, img, size, event) {
    // Validar stock en tiempo real
    const product = allProducts.find(p => p.id === id);
    if (product) {
        const cartQty = cart.filter(c => c.id === id && c.size === size).reduce((s, c) => s + c.quantity, 0);
        if (product.sizes && product.sizes.length > 0) {
            const sizeObj = product.sizes.find(s => s.name.trim() === size);
            if (sizeObj && cartQty >= sizeObj.qty) {
                return alert(`No hay más stock disponible de talla ${size} para este artículo.`);
            }
        } else if (cartQty >= product.quantity) {
            return alert("No hay más stock disponible para este artículo.");
        }
    }
    
    const finalPrice = (IS_DISCOUNTS_ENABLED && product.discountEnabled && product.discountPercent > 0) 
        ? (Number(product.price) * (1 - product.discountPercent / 100)) 
        : Number(product.price);

    const existing = cart.find(item => item.id === id && item.size === size);

    if(existing) {
        existing.quantity++;
    } else {
        cart.push({ id, name, price: finalPrice, size, img, quantity: 1 });
    }

    saveCart();

    const btn = event.currentTarget;
    const oldHtml = btn.innerHTML;
    const oldBg = btn.style.backgroundColor;
    btn.innerHTML = "Añadido al carrito ✓";
    btn.style.backgroundColor = "#34C759";
    setTimeout(() => {
        btn.innerHTML = oldHtml;
        btn.style.backgroundColor = oldBg;
        closeProductModal();
    }, 1000);
};

// Quick Add — abre modal para seleccionar talla
window.quickAddToCart = function(id) {
    openProductModal(id);
};

// ========== BANNER ==========
function renderBanner(settings) {
    const container = document.getElementById("main-banner");
    if (!container) return;
    
    const hasMain = !!settings.bannerImageUrl;
    const hasSide1 = !!settings.bannerSide1Url;
    const hasSide2 = !!settings.bannerSide2Url;

    if (!settings.bannerEnabled || (!hasMain && !hasSide1 && !hasSide2)) {
        container.style.display = "none";
        return;
    }
    
    container.style.display = "block";
    
    let html = `<div class="hero-banners-grid" style="display: grid; gap: 16px; grid-template-columns: ${hasMain && (hasSide1 || hasSide2) ? '2.5fr 1fr' : '1fr'};">`;
    
    if (hasMain) {
        html += `
            <div class="hero-main-banner" style="position:relative; height: 100%; min-height: 200px;">
                <img src="${escapeHtml(settings.bannerImageUrl)}" alt="Banner Principal" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px; cursor: pointer;">
            </div>
        `;
    }
    
    if (hasSide1 || hasSide2) {
        html += `<div class="hero-side-banners" style="display: flex; flex-direction: column; gap: 16px;">`;
        if (hasSide1) {
            html += `<img src="${escapeHtml(settings.bannerSide1Url)}" alt="Banner Lateral Superior" style="width: 100%; height: 100%; min-height: 140px; object-fit: cover; border-radius: 12px; flex: 1; cursor: pointer;">`;
        }
        if (hasSide2) {
            html += `<img src="${escapeHtml(settings.bannerSide2Url)}" alt="Banner Lateral Inferior" style="width: 100%; height: 100%; min-height: 140px; object-fit: cover; border-radius: 12px; flex: 1; cursor: pointer;">`;
        }
        html += `</div>`;
    }
    
    html += `</div>`;
    
    html += `
        <style>
            @media (max-width: 768px) {
                .hero-banners-grid {
                    grid-template-columns: 1fr !important;
                }
                .hero-main-banner {
                    min-height: 200px !important;
                }
            }
        </style>
    `;

    container.innerHTML = html;
}

function renderCategoryBanners(settings) {
    const container = document.getElementById("category-banners");
    if (!container) return;
    const banners = settings.categoryBanners || [];
    if (banners.length === 0) { container.style.display = "none"; return; }
    container.style.display = "flex";
    container.innerHTML = banners.map(b => `
        <div class="cat-banner-item" onclick="document.getElementById('filter-category').value='${escapeHtml(b.category)}'; processFilters();" style="cursor:pointer;flex:1;min-width:140px;position:relative;border-radius:12px;overflow:hidden;">
            <img src="${escapeHtml(b.imageUrl)}" alt="${escapeHtml(b.category)}" style="width:100%;height:100px;object-fit:cover;">
            <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.7));padding:8px 10px;">
                <span style="color:#fff;font-weight:600;font-size:13px;">${escapeHtml(b.category)}</span>
            </div>
        </div>
    `).join("");
}

function saveCart() {
    localStorage.setItem("oa_cart", JSON.stringify(cart));
    updateCartUI();
}

window.addToCart = function(id, name, price, img, event) {
    const sizeEl = document.getElementById(`size-${id}`);
    const size = sizeEl ? sizeEl.value : "Unitalla";
    const existing = cart.find(item => item.id === id && item.size === size);

    if(existing) {
        existing.quantity++;
    } else {
        cart.push({ id, name, price, size, img, quantity: 1 });
    }

    saveCart();

    const btn = event.currentTarget;
    const oldHtml = btn.innerHTML;
    const oldBg = btn.style.backgroundColor;
    btn.innerHTML = "Añadido";
    btn.style.backgroundColor = "#34C759";
    setTimeout(() => {
        btn.innerHTML = oldHtml;
        btn.style.backgroundColor = oldBg;
    }, 1500);
};

window.toggleCart = function() {
    const modal = document.getElementById("cart-modal");
    modal.style.display = modal.style.display === "flex" ? "none" : "flex";
    if (modal.style.display === "flex") {
        updateCartUI();
    }
};

window.updateCartUI = function() {
    const badge = document.getElementById("cart-badge");
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    if(badge) {
        badge.innerText = totalItems;
        badge.style.display = totalItems > 0 ? "flex" : "none";
    }

    const container = document.getElementById("cart-items-container");
    const totalEl = document.getElementById("cart-total");
    if(!container) return;

    if(cart.length === 0) {
        container.innerHTML = "<p style='color: var(--text-secondary); text-align: center; padding: 30px;'>Tu carrito está vacío.</p>";
        totalEl.innerText = "$0.00";
        return;
    }

    let total = 0;
    container.innerHTML = cart.map((item, index) => {
        total += Number(item.price) * Number(item.quantity);
        return `
            <div class="cart-item-row" style="display: flex; align-items: center; margin-bottom: 12px; border-bottom: 1px solid #E5E5EA; padding-bottom: 12px;">
                <img src="${escapeHtml(item.img || placeholderImage(55))}" alt="${escapeHtml(item.name)}" style="width: 55px; height: 55px; object-fit: cover; border-radius: 8px; margin-right: 12px;">
                <div style="flex-grow: 1;">
                    <div style="font-weight: 600; font-size: 14px; line-height: 1.2; margin-bottom: 2px;">${escapeHtml(item.name)}</div>
                    <div style="font-size: 12px; color: var(--text-secondary);">Talla: ${escapeHtml(item.size)} • <strong style="color:var(--text-primary);">$${Number(item.price).toFixed(2)}</strong></div>
                    <div style="display: flex; align-items: center; margin-top: 8px;">
                        <button onclick="changeCartQty(${index}, -1)" class="action-btn" style="width:26px; height:26px; font-size:16px; border:1px solid #E5E5EA; border-radius:6px; background:transparent; cursor:pointer;">-</button>
                        <span style="margin: 0 12px; font-size: 14px; font-weight: 600;">${Number(item.quantity)}</span>
                        <button onclick="changeCartQty(${index}, 1)" class="action-btn" style="width:26px; height:26px; font-size:14px; border:1px solid #E5E5EA; border-radius:6px; background:transparent; cursor:pointer;">+</button>
                    </div>
                </div>
                <button onclick="removeFromCart(${index})" style="background:none; border:none; color: var(--apple-red); font-size: 14px; cursor: pointer; padding: 10px;">Eliminar</button>
            </div>
        `;
    }).join("");

    totalEl.innerText = `$${total.toFixed(2)}`;
};

window.changeCartQty = function(index, delta) {
    cart[index].quantity += delta;
    if(cart[index].quantity <= 0) {
        cart.splice(index, 1);
    }
    saveCart();
};

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    saveCart();
};

window.clearCart = function() {
    if(confirm("¿Estás seguro de vaciar tu carrito?")) {
        cart = [];
        saveCart();
    }
};

document.addEventListener("DOMContentLoaded", () => {
    updateCartUI();
    renderCatalog();

    const checkoutBtn = document.getElementById("checkout-btn");

    // Cerrar modals al hacer click fuera del contenido
    document.getElementById("product-modal").addEventListener("click", (e) => {
        if (e.target.id === "product-modal") closeProductModal();
    });
    document.getElementById("cart-modal").addEventListener("click", (e) => {
        if (e.target.id === "cart-modal") toggleCart();
    });
    
    // Cerrar modals con tecla Escape
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            const productModal = document.getElementById("product-modal");
            const cartModal = document.getElementById("cart-modal");
            if (productModal.style.display === "flex") closeProductModal();
            else if (cartModal.style.display === "flex") toggleCart();
        }
    });
    if(checkoutBtn) {
        checkoutBtn.addEventListener("click", async () => {
            if(cart.length === 0) return alert("Tu carrito está vacío");

            if (IS_ORDERS_ENABLED) {
                if (localStorage.getItem("oa_pending_order_time")) {
                    const timeStr = localStorage.getItem("oa_pending_order_time");
                    if (Date.now() - Number(timeStr) < 2 * 60 * 1000) { // 2 minutes cooldown
                        return alert("El sistema está procesando tu pedido anterior. Por favor espera 2 minutos antes de hacer un nuevo pedido para evitar duplicados.");
                    }
                }
            }

            const oldHtml = checkoutBtn.innerHTML;
            checkoutBtn.innerHTML = IS_ORDERS_ENABLED ? "Reservando artículos..." : "Redirigiendo a WhatsApp...";
            checkoutBtn.disabled = true;

            try {
                let orderId = "";
                
                if (IS_ORDERS_ENABLED) {
                    // Validar stock antes de hacer checkout
                    const freshProducts = await Database.getProducts();
                    for (const item of cart) {
                        const prod = freshProducts.find(p => p.id === item.id);
                        if (!prod) {
                            throw new Error(`El producto "${item.name}" ya no existe en la tienda.`);
                        }
                        if (prod.sizes && prod.sizes.length > 0) {
                            const sizeObj = prod.sizes.find(s => s.name.trim() === item.size);
                            if (!sizeObj || sizeObj.qty < item.quantity) {
                                throw new Error(`No hay suficiente stock de talla ${item.size} para "${item.name}". Ajusta la cantidad en tu carrito.`);
                            }
                        } else if (prod.quantity < item.quantity) {
                            throw new Error(`No hay suficiente stock para "${item.name}". Solo quedan ${prod.quantity} unidades.`);
                        }
                    }
                    
                    orderId = await Database.createPendingOrder(cart);
                    localStorage.setItem("oa_pending_order_time", Date.now().toString());
                } else {
                    orderId = "WA-" + Math.floor(1000 + Math.random() * 9000);
                }

                let message = `¡Hola! Quisiera consultar la disponibilidad de este pedido:\n*ID: ${orderId}*\n\n`;
                let total = 0;

                cart.forEach(item => {
                    const subtotal = Number(item.price) * Number(item.quantity);
                    total += subtotal;
                    message += `- ${item.quantity}x ${item.name} (Talla: ${item.size}) - $${subtotal.toFixed(2)}\n`;
                });

                message += `\n*TOTAL: $${total.toFixed(2)}*\n\n¿Tienen disponibilidad y cómo procedemos con el envío/pago?`;

                const encodedMessage = encodeURIComponent(message);
                
                cart = [];
                saveCart();
                if (IS_ORDERS_ENABLED) {
                    renderCatalog(); // Reload to show updated stock
                } else {
                    updateCartUI(); // Just clear cart visually
                }
                toggleCart();
                
                window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, "_blank");
            } catch(err) {
                alert("No se pudo procesar tu pedido: " + err.message);
            } finally {
                checkoutBtn.innerHTML = oldHtml;
                checkoutBtn.disabled = false;
            }
        });
    }
});
