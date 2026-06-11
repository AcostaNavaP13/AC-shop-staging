let WHATSAPP_NUMBER = "6143382041";
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

    document.getElementById("filter-category").innerHTML = buildOptions(categories, "Artículos (Todos)");
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

        const imagesHTML = images.map(img => (
            `<img src="${escapeHtml(img)}" alt="${escapeHtml(product.name)}" class="product-image" onerror="this.src='${placeholderImage()}'">`
        )).join("");

        const card = document.createElement("div");
        card.className = "ios-card";
        card.innerHTML = `
            <div class="image-scroller">${imagesHTML}</div>
            ${images.length > 1 ? '<p style="text-align:center; font-size:11px; color:var(--text-secondary); margin-top:6px; margin-bottom:-4px;">Desliza para ver más</p>' : ""}
            <div class="product-header">
                <h3 class="product-title">${escapeHtml(product.name)}</h3>
                <p class="product-price">$${Number(product.price || 0).toFixed(2)}</p>
            </div>
            <p style="font-size: 11px; color: #8E8E93; margin-top: 4px; margin-bottom: 2px;">
                ${escapeHtml(product.category || "N/A")} • ${escapeHtml(product.brand || "N/A")}
            </p>
            ${isOutOfStock ?
                `<p class="product-stock out-of-stock" style="margin-top: 10px; margin-bottom: 10px;">Agotado</p>
                 <button class="ios-btn disabled" style="background:#E5E5EA; color:#8E8E93; margin-top:0;">No disponible</button>`
               :
                `
                <select id="size-${escapeHtml(product.id)}" class="ios-select" style="width: 100%; margin-top: 10px; margin-bottom: 12px; padding: 12px;">
                    ${productSizes.map(s => `<option value="${escapeHtml(s)}">Talla: ${escapeHtml(s)}</option>`).join("")}
                </select>
                <button class="ios-btn" style="background-color: var(--apple-blue); color: white; display:flex; justify-content:center; align-items:center; margin-top:0;" onclick="addToCart('${escapeJs(product.id)}', '${escapeJs(product.name)}', ${Number(product.price || 0)}, '${escapeJs(images[0])}', event)">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                    Añadir al carrito
                </button>
                `
            }
        `;
        grid.appendChild(card);
    });
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
    if(checkoutBtn) {
        checkoutBtn.addEventListener("click", async () => {
            if(cart.length === 0) return alert("Tu carrito está vacío");

            if (localStorage.getItem("oa_pending_order_time")) {
                const timeStr = localStorage.getItem("oa_pending_order_time");
                if (Date.now() - Number(timeStr) < 30 * 60 * 1000) { // 30 minutes cooldown
                    return alert("Ya tienes un pedido reciente en proceso. Por favor completa tu compra anterior por WhatsApp antes de apartar más artículos.");
                }
            }

            const oldHtml = checkoutBtn.innerHTML;
            checkoutBtn.innerHTML = "Reservando artículos...";
            checkoutBtn.disabled = true;

            try {
                const orderId = await Database.createPendingOrder(cart);
                localStorage.setItem("oa_pending_order_time", Date.now().toString());

                let message = `¡Hola! Quisiera realizar el siguiente pedido:\n*ID de Pedido: ${orderId}*\n\n`;
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
                renderCatalog(); // Reload to show updated stock
                toggleCart();
                
                window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodedMessage}`, "_blank");
            } catch(err) {
                alert("No se pudo reservar tu pedido: " + err.message);
            } finally {
                checkoutBtn.innerHTML = oldHtml;
                checkoutBtn.disabled = false;
            }
        });
    }
});
