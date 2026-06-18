let WHATSAPP_NUMBER = "6143382041";
let IS_ORDERS_ENABLED = true;
let IS_DISCOUNTS_ENABLED = true;
let IS_COUPONS_ENABLED = false;
let IS_RELATED_ENABLED = true;
let appliedCoupon = null;
let userIpAddress = "unknown";
let allProducts = [];
let cart = JSON.parse(localStorage.getItem("oa_cart")) || [];

// ==========================================
// TOAST NOTIFICATIONS (FRONTEND)
// ==========================================
window.showToast = function(message, type = 'info') {
    const toast = document.createElement("div");
    toast.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 12px 24px;
        border-radius: 8px;
        color: #000;
        font-weight: 500;
        font-size: 14px;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        opacity: 0;
        transition: opacity 0.3s ease, bottom 0.3s ease;
    `;
    
    if (type === 'error') {
        toast.style.backgroundColor = '#FFE5E5';
        toast.style.border = '1px solid #FF3B30';
        toast.style.color = '#FF3B30';
    } else if (type === 'success') {
        toast.style.backgroundColor = '#E5F9E4';
        toast.style.border = '1px solid #34C759';
        toast.style.color = '#34C759';
    } else {
        toast.style.backgroundColor = '#FFF4E5';
        toast.style.border = '1px solid #FF9500';
        toast.style.color = '#FF9500';
    }
    
    toast.innerText = message;
    document.body.appendChild(toast);
    
    setTimeout(() => { toast.style.opacity = '1'; toast.style.bottom = '40px'; }, 10);
    setTimeout(() => { 
        toast.style.opacity = '0'; 
        toast.style.bottom = '20px';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

const originalAlert = window.alert;
window.alert = function(msg) {
    const lower = String(msg).toLowerCase();
    let type = 'info';
    if (lower.includes('error') || lower.includes('no se pudo') || lower.includes('inválido') || lower.includes('denegado') || lower.includes('vacío') || lower.includes('espera')) {
        type = 'error';
    } else if (lower.includes('éxito') || lower.includes('correctamente') || lower.includes('exitosamente') || lower.includes('guardado')) {
        type = 'success';
    }
    showToast(msg, type);
};

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
        IS_COUPONS_ENABLED = settings.couponsEnabled !== false;
        IS_RELATED_ENABLED = settings.relatedEnabled !== false;

        // Fetch IP if coupons are enabled
        if (IS_COUPONS_ENABLED && userIpAddress === "unknown") {
            try {
                const res = await fetch('https://api.ipify.org?format=json');
                const data = await res.json();
                userIpAddress = data.ip;
            } catch (e) {
                console.warn("Could not fetch IP", e);
            }
        }

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

        // Anuncio Superior
        const topAnnounceBar = document.getElementById("top-announcement");
        const topAnnounceText = document.getElementById("top-announcement-text");
        if (topAnnounceBar && topAnnounceText) {
            if (settings.announcementEnabled && settings.announcementText) {
                topAnnounceText.innerText = settings.announcementText;
                topAnnounceBar.style.display = "block";
            } else {
                topAnnounceBar.style.display = "none";
            }
        }

        allProducts = await Database.getProducts();

        // Banner principal
        renderBanner(settings);
        // Sub-banners de categorías
        renderCategoryBanners(settings);

        populateFilters();
        processFilters();
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

    const getCheckedValues = (name) => {
        const checkboxes = document.querySelectorAll(`input[name="filter-${name}"]:checked`);
        return Array.from(checkboxes).map(cb => cb.value);
    };

    const cats = getCheckedValues("cat");
    const brands = getCheckedValues("brand");
    const sizes = getCheckedValues("size").map(s => s.toUpperCase());

    const sortElement = document.getElementById("sort-price");
    const sort = sortElement ? sortElement.value : "";
    
    const searchInput = document.getElementById("search-input");
    const query = searchInput ? searchInput.value.trim().toLowerCase() : "";

    if (query) {
        filtered = filtered.filter(p => {
            const hay = [p.name, p.brand, p.category, p.description || ""].join(" ").toLowerCase();
            return hay.includes(query);
        });
    }
    
    if (cats.length > 0) filtered = filtered.filter(p => cats.includes(p.category));
    if (brands.length > 0) filtered = filtered.filter(p => brands.includes(p.brand));

    if (sizes.length > 0) {
        filtered = filtered.filter(p => {
            if (p.sizes && p.sizes.length > 0) {
                return p.sizes.some(s => sizes.includes(s.name.trim().toUpperCase()) && s.qty > 0);
            }
            if (!p.size) return false;
            const productSizes = p.size.split(/[,-\s]+/).map(s => s.trim().toUpperCase());
            return sizes.some(sz => productSizes.includes(sz));
        });
    }

    function getEffectivePrice(p) {
        if (IS_DISCOUNTS_ENABLED && p.discountEnabled && p.discountPercent > 0) {
            return Number(p.price) * (1 - p.discountPercent / 100);
        }
        return Number(p.price);
    }

    if (sort === "asc") filtered.sort((a,b) => getEffectivePrice(a) - getEffectivePrice(b));
    if (sort === "desc") filtered.sort((a,b) => getEffectivePrice(b) - getEffectivePrice(a));

    const resultsCount = document.getElementById("results-count");
    if (resultsCount) {
        resultsCount.innerText = `${filtered.length} Resultado${filtered.length !== 1 ? 's' : ''}`;
    }

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

    const buildCheckboxes = (set, groupName) => {
        let html = ``;
        Array.from(set).sort().forEach(item => {
            html += `
                <label style="display:flex; align-items:center; gap:8px; font-size:14px; cursor:pointer;">
                    <input type="checkbox" name="filter-${groupName}" value="${escapeHtml(item)}" onchange="processFilters()" style="width:16px; height:16px; accent-color:var(--apple-blue);">
                    ${escapeHtml(item)}
                </label>
            `;
        });
        return html;
    };

    const catContainer = document.getElementById("sidebar-categories");
    const brandContainer = document.getElementById("sidebar-brands");
    const sizeContainer = document.getElementById("sidebar-sizes");
    
    if (catContainer) catContainer.innerHTML = buildCheckboxes(categories, "cat");
    if (brandContainer) brandContainer.innerHTML = buildCheckboxes(brands, "brand");
    if (sizeContainer) sizeContainer.innerHTML = buildCheckboxes(sizes, "size");
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
            <div style="display: flex; flex-direction: column; flex-grow: 1;">
                <div class="product-header" style="flex-wrap: wrap;">
                    <h3 class="product-title" style="max-width: 100%; margin-bottom: 4px;">${escapeHtml(product.name)}</h3>
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
                <div style="margin-top: auto;">
                    ${isOutOfStock ?
                        `<p class="product-stock out-of-stock" style="margin-top: 10px; margin-bottom: 10px;">Agotado</p>`
                       : 
                        `<div style="font-size: 12px; color: var(--apple-blue); margin-top: 12px; font-weight: 500; text-align: left;">Ver detalles &rarr;</div>
                         <div style="display:flex; gap:8px; margin-top:8px;" class="card-add-container" data-id="${escapeHtml(product.id)}">
                            ${productSizes.length > 1 ? 
                                `<select class="quick-variant-select" id="quick-var-${product.id}" onclick="event.stopPropagation();">
                                    ${productSizes.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('')}
                                </select>`
                                : ''
                            }
                            <button class="ios-btn" style="background-color: var(--apple-green); color: white; display:flex; justify-content:center; align-items:center; margin:0; padding:12px; flex: ${productSizes.length > 1 ? 'none' : '1'}; width: ${productSizes.length > 1 ? '48px' : 'auto'}; font-size: 14px; font-weight: 600;" onclick="event.stopPropagation(); quickAddToCartInline('${escapeJs(product.id)}', event, ${productSizes.length > 1})">
                                ${productSizes.length > 1 ? 
                                    `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>` 
                                    : 'Añadir al carrito'}
                            </button>
                        </div>`
                    }
                </div>
            </div>
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
            <div style="margin-bottom: 12px; font-weight: 600; font-size: 15px; color: var(--text-primary);">Selecciona Variante:</div>
            <div id="modal-variants-container" style="margin-bottom: 24px; display: flex; flex-wrap: wrap;">
                ${productSizes.map((s, i) => `<div class="variant-pill ${i===0 ? 'selected' : ''}" data-size="${escapeHtml(s)}">${escapeHtml(s)}</div>`).join("")}
            </div>
            <button id="modal-add-btn" class="ios-btn" style="background-color: var(--apple-green); color: white; width: 100%; display:flex; justify-content:center; align-items:center; padding: 16px; font-size: 16px; font-weight: 600;">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                Añadir al carrito
            </button>
        `;
        const pills = document.querySelectorAll('#modal-variants-container .variant-pill');
        let currentSelectedSize = productSizes[0];
        pills.forEach((pill, idx) => {
            pill.onclick = () => {
                pills.forEach(p => p.classList.remove('selected'));
                pill.classList.add('selected');
                currentSelectedSize = pill.getAttribute('data-size');
                
                // Si hay más de una foto, tratar de conectar el índice de variante con el índice de foto
                // Si tienen 3 variantes y 3 fotos, el orden mandará (0=0, 1=1, 2=2)
                if (currentModalImages.length > 1 && currentModalImages[idx]) {
                    modalImageIndex = idx;
                    renderModalCarousel();
                } else if (currentModalImages.length > 1) {
                    // Si hay más variantes que fotos, volver a la primera foto por defecto
                    modalImageIndex = 0;
                    renderModalCarousel();
                }
            };
        });

        document.getElementById('modal-add-btn').onclick = (e) => {
            addToCartModal(product.id, product.name, product.price, currentModalImages[0], currentSelectedSize, e);
        };
    }
    
    // ==========================================
    // RELATED PRODUCTS LOGIC
    // ==========================================
    const relatedContainer = document.getElementById('product-modal-related-container');
    const relatedGrid = document.getElementById('product-modal-related-grid');
    
    if (IS_RELATED_ENABLED) {
        let relatedProducts = [];
        
        // 1. Manual Relation (SKUs)
        if (product.relatedSkus && product.relatedSkus.length > 0) {
            relatedProducts = allProducts.filter(p => 
                p.id !== product.id && 
                p.sku && 
                product.relatedSkus.includes(p.sku.toUpperCase())
            );
        }
        
        // 2. Automatic Relation (Category or Brand)
        if (relatedProducts.length === 0 && product.category) {
            relatedProducts = allProducts.filter(p => 
                p.id !== product.id && 
                p.category === product.category
            );
        }
        
        // If still empty, try Brand
        if (relatedProducts.length === 0 && product.brand) {
            relatedProducts = allProducts.filter(p => 
                p.id !== product.id && 
                p.brand === product.brand
            );
        }
        
        // Take up to 4 items max
        relatedProducts = relatedProducts.slice(0, 4);
        
        if (relatedProducts.length > 0) {
            relatedGrid.innerHTML = relatedProducts.map(p => {
                const pImg = normalizeImages(p)[0];
                const finalPrice = (IS_DISCOUNTS_ENABLED && p.discountEnabled && p.discountPercent > 0) 
                    ? (Number(p.price) * (1 - p.discountPercent / 100)) 
                    : Number(p.price);
                    
                return `
                    <div style="min-width: 120px; max-width: 140px; cursor: pointer; text-align: center;" onclick="openProductModal('${p.id}')">
                        <img src="${escapeHtml(pImg)}" style="width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: 8px; margin-bottom: 8px;">
                        <div style="font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-primary);">${escapeHtml(p.name)}</div>
                        <div style="font-size: 13px; font-weight: 700; color: ${p.discountEnabled && p.discountPercent > 0 ? 'var(--apple-red)' : 'var(--apple-blue)'};">$${finalPrice.toFixed(2)}</div>
                    </div>
                `;
            }).join("");
            relatedContainer.style.display = "block";
        } else {
            relatedContainer.style.display = "none";
        }
    } else {
        relatedContainer.style.display = "none";
    }

    document.body.style.overflow = 'hidden';
    document.getElementById('product-modal').style.display = 'flex';
};

window.closeProductModal = function() {
    document.getElementById('product-modal').style.display = 'none';
    document.body.style.overflow = '';
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
                return alert(`No hay más stock disponible de variante ${size} para este artículo.`);
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
    const hadText = btn.innerText.trim().length > 0;
    
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${hadText ? 'style="margin-right: 6px;"' : ''}><polyline points="20 6 9 17 4 12"></polyline></svg>` + (hadText ? "Añadido" : "");
    btn.style.backgroundColor = "#34C759";
    
    setTimeout(() => {
        btn.innerHTML = oldHtml;
        btn.style.backgroundColor = oldBg;
        if (document.getElementById('product-modal').style.display === 'flex') {
            closeProductModal();
        }
    }, 1000);
};

window.quickAddToCartInline = function(id, event, hasVariants) {
    const product = allProducts.find(p => p.id === id);
    if (!product) return;
    
    let selectedSize = "Unitalla";
    if (hasVariants) {
        const select = document.getElementById(`quick-var-${id}`);
        if (select) selectedSize = select.value;
    } else {
        if (product.sizes && product.sizes.length > 0) {
            const avail = product.sizes.filter(s => s.qty > 0);
            if (avail.length > 0) selectedSize = avail[0].name.trim();
        } else if (product.size && product.size !== "Unitalla") {
            const arr = product.size.split(/[,-\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean);
            if (arr.length > 0) selectedSize = arr[0];
        }
    }
    
    const img = normalizeImages(product)[0];
    addToCartModal(id, product.name, product.price, img, selectedSize, event);
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
    if (modal.style.display === "flex") {
        modal.style.display = "none";
        document.body.style.overflow = '';
    } else {
        modal.style.display = "flex";
        document.body.style.overflow = 'hidden';
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
                    <div style="font-size: 12px; color: var(--text-secondary);">Variante: ${escapeHtml(item.size)} • <strong style="color:var(--text-primary);">$${Number(item.price).toFixed(2)}</strong></div>
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

    const subtotalEl = document.getElementById("cart-subtotal");
    const discountRow = document.getElementById("cart-discount-row");
    const discountEl = document.getElementById("cart-discount");
    const couponContainer = document.getElementById("coupon-container");
    
    if (couponContainer) {
        couponContainer.style.display = IS_COUPONS_ENABLED ? "block" : "none";
    }

    let discountValue = 0;
    if (appliedCoupon) {
        if (appliedCoupon.type === 'percent') {
            discountValue = total * (appliedCoupon.value / 100);
        } else {
            discountValue = appliedCoupon.value;
        }
        if (discountValue > total) discountValue = total; // No negative totals
    }

    const finalTotal = total - discountValue;

    if (subtotalEl) subtotalEl.innerText = `$${total.toFixed(2)}`;
    
    if (discountRow) {
        if (discountValue > 0) {
            discountRow.style.display = "flex";
            discountEl.innerText = `-$${discountValue.toFixed(2)} (${appliedCoupon.code})`;
        } else {
            discountRow.style.display = "none";
        }
    }

    totalEl.innerText = `$${finalTotal.toFixed(2)}`;
};

window.applyCoupon = async function() {
    const input = document.getElementById("cart-coupon-input");
    const msgEl = document.getElementById("coupon-message");
    if (!input || !msgEl) return;
    
    const code = input.value.trim().toUpperCase();
    if (!code) {
        msgEl.innerText = "Por favor ingresa un código.";
        msgEl.style.color = "var(--apple-red)";
        return;
    }

    msgEl.innerText = "Verificando...";
    msgEl.style.color = "var(--text-secondary)";

    try {
        const coupon = await Database.getCouponByCode(code);
        if (!coupon || !coupon.active) {
            msgEl.innerText = "Cupón inválido o inactivo.";
            msgEl.style.color = "var(--apple-red)";
            appliedCoupon = null;
            updateCartUI();
            return;
        }

        if (coupon.expiryDate) {
            const expiry = new Date(coupon.expiryDate + 'T23:59:59');
            if (new Date() > expiry) {
                msgEl.innerText = "Este cupón ha expirado.";
                msgEl.style.color = "var(--apple-red)";
                appliedCoupon = null;
                updateCartUI();
                return;
            }
        }

        if (coupon.singleUsePerIp && userIpAddress !== "unknown") {
            if (coupon.usedByIps && coupon.usedByIps.includes(userIpAddress)) {
                msgEl.innerText = "Ya has utilizado este cupón anteriormente.";
                msgEl.style.color = "var(--apple-red)";
                appliedCoupon = null;
                updateCartUI();
                return;
            }
        }

        appliedCoupon = coupon;
        msgEl.innerText = "¡Cupón aplicado!";
        msgEl.style.color = "var(--apple-green)";
        updateCartUI();

    } catch (e) {
        console.error(e);
        msgEl.innerText = "Error al verificar.";
        msgEl.style.color = "var(--apple-red)";
    }
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
                                throw new Error(`No hay suficiente stock de variante ${item.size} para "${item.name}". Ajusta la cantidad en tu carrito.`);
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
                    message += `- ${item.quantity}x ${item.name} (Variante: ${item.size}) - $${subtotal.toFixed(2)}\n`;
                });

                message += `\n*SUBTOTAL: $${total.toFixed(2)}*\n`;
                
                let discountValue = 0;
                if (appliedCoupon) {
                    if (appliedCoupon.type === 'percent') {
                        discountValue = total * (appliedCoupon.value / 100);
                    } else {
                        discountValue = appliedCoupon.value;
                    }
                    if (discountValue > total) discountValue = total;
                    
                    message += `*CUPÓN (${appliedCoupon.code}): -$${discountValue.toFixed(2)}*\n`;
                    total -= discountValue;

                    if (appliedCoupon.singleUsePerIp && userIpAddress !== "unknown") {
                        await Database.markCouponUsedByIp(appliedCoupon.id, userIpAddress);
                    }
                }

                message += `*TOTAL: $${total.toFixed(2)}*\n\n¿Tienen disponibilidad y cómo procedemos con el envío/pago?`;

                const encodedMessage = encodeURIComponent(message);
                
                appliedCoupon = null;
                
                cart = [];
                saveCart();
                if (IS_ORDERS_ENABLED) {
                    renderCatalog(); // Reload to show updated stock
                } else {
                    updateCartUI(); // Just clear cart visually
                }
                toggleCart();
                
                window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, "_blank");
                checkoutBtn.innerHTML = oldHtml;
                checkoutBtn.disabled = false;
            } catch(err) {
                console.error(err);
                alert("No se pudo procesar tu pedido: " + err.message);
                checkoutBtn.innerHTML = oldHtml;
                checkoutBtn.disabled = false;
            }
        });
    }
});
