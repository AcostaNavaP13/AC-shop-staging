const ICON_SAVE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`;
const ICON_PHOTO = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
const ICON_TRASH = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
const ICON_WAIT = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;
const ICON_CHECK = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

let currentProductId = null;
let currentImageUrls = [];
let selectedFilesToUpload = [];

window.switchAdminTab = function(tabId, btn) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    btn.classList.add('active');
};

window.addSizeRow = function() {
    const container = document.getElementById("sizes-container");
    const div = document.createElement("div");
    div.className = "size-row";
    div.style.cssText = "display:flex; gap:10px; align-items:center;";
    div.innerHTML = `
        <input type="text" class="ios-input size-name" placeholder="Talla (ej. S, Única)" style="margin:0; flex:1;" required />
        <input type="number" class="ios-input size-qty" placeholder="Cantidad" style="margin:0; width:100px;" required min="0" />
        <button type="button" class="remove-size-btn" onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--apple-red);font-size:18px;cursor:pointer;padding:0 8px;font-weight:bold;">&times;</button>
    `;
    container.appendChild(div);
};

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

function setLoginError(message) {
    const error = document.getElementById("login-error");
    if (error) error.textContent = message || "";
}

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
        reader.onload = function(event) {
            const img = new Image();
            img.onerror = () => reject(new Error("No se pudo procesar la imagen."));
            img.onload = function() {
                const canvas = document.createElement("canvas");
                const maxWidth = 900;
                const scaleSize = Math.min(1, maxWidth / img.width);
                canvas.width = Math.round(img.width * scaleSize);
                canvas.height = Math.round(img.height * scaleSize);

                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL("image/jpeg", 0.78));
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });
}

async function filesToCompressedDataUrls(files) {
    return Promise.all(Array.from(files).map(compressImage));
}

function ensureAuthReady() {
    if (!auth) {
        throw new Error("Firebase Auth no está cargado.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const loginSection = document.getElementById("login-section");
    const dashSection = document.getElementById("dashboard-section");
    const logoutBtn = document.getElementById("logout-btn");

    ensureAuthReady();

    auth.onAuthStateChanged(async (user) => {
        if (user) {
            if(loginSection) loginSection.style.display = "none";
            if(dashSection) dashSection.style.display = "block";
            await showDashboard();
        } else {
            if(loginSection) loginSection.style.display = "block";
            if(dashSection) dashSection.style.display = "none";
        }
    });

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            setLoginError("");

            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;
            const btn = e.target.querySelector("button[type=submit]");

            try {
                btn.disabled = true;
                btn.innerText = "Ingresando...";
                await auth.signInWithEmailAndPassword(email, password);
            } catch (error) {
                console.error(error);
                setLoginError("No se pudo iniciar sesión. Revisa correo, contraseña y permisos.");
            } finally {
                btn.disabled = false;
                btn.innerText = "Ingresar";
            }
        });
    }

    if(logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await auth.signOut();
        });
    }

    async function showDashboard() {
        try {
            const settings = await Database.getSettings();
            
            const whatsappInput = document.getElementById("whatsapp-number");
            const storeNameInput = document.getElementById("store-name");
            const heroTitleInput = document.getElementById("hero-title");
            const heroSubtitleInput = document.getElementById("hero-subtitle");
            const logoPreview = document.getElementById("current-logo-preview");

            if(whatsappInput) whatsappInput.value = settings.whatsapp || "";
            if(storeNameInput) storeNameInput.value = settings.storeName || "";
            if(heroTitleInput) heroTitleInput.value = settings.heroTitle || "";
            if(heroSubtitleInput) heroSubtitleInput.value = settings.heroSubtitle || "";
            if(logoPreview && settings.logoUrl) logoPreview.src = settings.logoUrl;

            if(settings.logoUrl) {
                localStorage.setItem("oa_logo", settings.logoUrl);
                const favicon = document.getElementById("favicon");
                if(favicon) favicon.href = settings.logoUrl;
            }

            await renderAdminTable();
            await renderOrdersTable();
        } catch(e) {
            console.error(e);
            alert("Error conectando con la base de datos.");
        }
    }

    const settingsForm = document.getElementById("settings-form");
    if(settingsForm) {
        settingsForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector("button");
            
            const newWhatsapp = document.getElementById("whatsapp-number").value;
            const newStoreName = document.getElementById("store-name").value;
            const newHeroTitle = document.getElementById("hero-title").value;
            const newHeroSubtitle = document.getElementById("hero-subtitle").value;
            const logoInput = document.getElementById("store-logo");

            try {
                btn.innerText = "Guardando...";
                btn.disabled = true;

                let logoUrl = undefined;
                if (logoInput.files && logoInput.files.length > 0) {
                    btn.innerText = "Procesando logo...";
                    const dataUrls = await filesToCompressedDataUrls(logoInput.files);
                    logoUrl = dataUrls[0]; // Guardar el Base64 directamente
                    const logoPreview = document.getElementById("current-logo-preview");
                    if(logoPreview) {
                        logoPreview.src = logoUrl;
                        logoPreview.style.display = "block";
                    }
                    localStorage.setItem("oa_logo", logoUrl);
                    const favicon = document.getElementById("favicon");
                    if(favicon) favicon.href = logoUrl;
                    
                    logoInput.value = "";
                }

                await Database.saveSettings({ 
                    whatsapp: newWhatsapp, 
                    storeName: newStoreName,
                    heroTitle: newHeroTitle,
                    heroSubtitle: newHeroSubtitle,
                    ...(logoUrl && { logoUrl })
                });

                alert("Configuración guardada correctamente.");
            } catch (err) {
                alert("No se pudo guardar la configuración: " + err.message);
            } finally {
                btn.innerText = "Guardar Configuración";
                btn.disabled = false;
            }
        });
    }

    const productForm = document.getElementById("product-form");
    const prodImageInput = document.getElementById("prod-image-input");

    if(prodImageInput) {
        prodImageInput.addEventListener("change", (e) => {
            const files = Array.from(e.target.files);
            selectedFilesToUpload = [...selectedFilesToUpload, ...files].slice(0, 3);
            renderPreviews();
            e.target.value = "";
        });
    }

    function renderPreviews() {
        const container = document.getElementById("image-preview-container");
        if(!container) return;
        container.innerHTML = "";
        
        selectedFilesToUpload.forEach((file, index) => {
            const isMain = index === 0;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const div = document.createElement("div");
                div.className = `preview-item ${isMain ? 'main' : ''}`;
                div.onclick = () => setMainImage(index);
                div.innerHTML = `
                    <img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:9px;" />
                    ${isMain ? '<div class="preview-badge">PRINCIPAL</div>' : ''}
                    <button type="button" class="preview-remove" onclick="event.stopPropagation(); removePreview(${index})">&times;</button>
                `;
                container.appendChild(div);
            };
            reader.readAsDataURL(file);
        });
    }

    window.setMainImage = function(index) {
        if(index === 0) return;
        const file = selectedFilesToUpload.splice(index, 1)[0];
        selectedFilesToUpload.unshift(file);
        renderPreviews();
    };

    window.removePreview = function(index) {
        selectedFilesToUpload.splice(index, 1);
        renderPreviews();
    };

    if(productForm) {
        productForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const name = document.getElementById("prod-name").value.trim();
            const price = parseFloat(document.getElementById("prod-price").value);
            const category = document.getElementById("prod-category").value.trim();
            const brand = document.getElementById("prod-brand").value.trim();
            const btn = e.target.querySelector("#save-product-btn");

            const sizeRows = document.querySelectorAll(".size-row");
            let sizesArray = [];
            let totalQuantity = 0;
            
            sizeRows.forEach(row => {
                const sName = row.querySelector(".size-name").value.trim();
                const sQty = parseInt(row.querySelector(".size-qty").value, 10) || 0;
                if(sName) {
                    sizesArray.push({ name: sName, qty: sQty });
                    totalQuantity += sQty;
                }
            });

            if (selectedFilesToUpload.length === 0) {
                alert("Selecciona al menos una imagen para previsualizar.");
                return;
            }

            try {
                btn.innerText = "Subiendo producto...";
                btn.disabled = true;
                const imageDataUrls = await filesToCompressedDataUrls(selectedFilesToUpload);
                
                await Database.addProduct({ 
                    name, 
                    price, 
                    quantity: totalQuantity, 
                    sizes: sizesArray,
                    category, 
                    brand, 
                    imageDataUrls 
                });
                
                e.target.reset();
                selectedFilesToUpload = [];
                renderPreviews();
                
                document.getElementById("sizes-container").innerHTML = `
                    <div class="size-row" style="display:flex; gap:10px; align-items:center;">
                        <input type="text" class="ios-input size-name" placeholder="Talla (ej. S, Única)" style="margin:0; flex:1;" required />
                        <input type="number" class="ios-input size-qty" placeholder="Cantidad" style="margin:0; width:100px;" required min="0" />
                        <button type="button" class="remove-size-btn" onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--apple-red);font-size:18px;cursor:pointer;padding:0 8px;font-weight:bold;">&times;</button>
                    </div>
                `;

                await renderAdminTable();
                alert("Producto registrado correctamente.");
            } catch(err) {
                console.error(err);
                alert("Error guardando el producto: " + err.message);
            } finally {
                btn.innerText = "Guardar Producto";
                btn.disabled = false;
            }
        });
    }

    const csvForm = document.getElementById("csv-form");
    if (csvForm) {
        csvForm.addEventListener("submit", async(e) => {
            e.preventDefault();
            const fileInput = document.getElementById("csv-file");
            if (!fileInput.files || !fileInput.files[0]) return;

            const btn = e.target.querySelector("button[type=submit]");
            btn.innerText = "Procesando productos...";
            btn.disabled = true;

            const reader = new FileReader();
            reader.onload = async function(event) {
                try {
                    const text = event.target.result;
                    const rows = text.split(/\r?\n/);
                    let count = 0;

                    for(let i = 1; i < rows.length; i++) {
                        const line = rows[i].trim();
                        if (!line) continue;
                        const row = line.split(",");

                        if (row.length >= 6) {
                            const name = row[0].trim();
                            const price = parseFloat(row[1]);
                            const qty = parseInt(row[2], 10);
                            const category = row[3].trim();
                            const brand = row[4].trim();
                            const size = row[5].trim();

                            if (name && !Number.isNaN(price) && !Number.isNaN(qty)) {
                                await Database.addProduct({ name, price, quantity: qty, category, brand, size });
                                count++;
                            }
                        } else if (row.length >= 3) {
                            const name = row[0].trim();
                            const price = parseFloat(row[1]);
                            const qty = parseInt(row[2], 10);
                            if (name && !Number.isNaN(price) && !Number.isNaN(qty)) {
                                await Database.addProduct({ name, price, quantity: qty, category: "General", brand: "Generica", size: "Unitalla" });
                                count++;
                            }
                        }
                    }

                    alert(`Éxito. Se importaron ${count} productos correctamente. Ahora puedes subir sus fotos desde la tabla.`);
                    csvForm.reset();
                    await renderAdminTable();
                } catch (err) {
                    alert("No se pudo importar el archivo: " + err.message);
                } finally {
                    btn.innerText = "Cargar .CSV";
                    btn.disabled = false;
                }
            };
            reader.readAsText(fileInput.files[0]);
        });
    }

    const modalFileInput = document.getElementById("modal-file-input");
    if(modalFileInput) {
        modalFileInput.addEventListener("change", async (e) => {
            const files = e.target.files;
            if(!files || files.length === 0) return;

            const remainingSlots = 3 - currentImageUrls.length;
            if(files.length > remainingSlots) {
                alert(`Sólo puedes subir ${remainingSlots} imagen(es) más. Límite de 3 total.`);
                e.target.value = "";
                return;
            }

            const labelBtn = modalFileInput.parentElement;
            const originalText = labelBtn.innerHTML;
            labelBtn.style.pointerEvents = "none";
            labelBtn.textContent = "Subiendo y comprimiendo...";

            try {
                const imageDataUrls = await filesToCompressedDataUrls(files);
                currentImageUrls = await Database.appendProductImages(currentProductId, imageDataUrls);
                renderModalImages();
                e.target.value = "";
            } catch(err) {
                alert("Error: " + err.message);
            } finally {
                labelBtn.style.pointerEvents = "auto";
                labelBtn.innerHTML = originalText;
            }
        });
    }
});

async function renderAdminTable() {
    const listBody = document.getElementById("admin-product-list");
    if (!listBody) return;

    listBody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding: 24px;'>Descargando artículos...</td></tr>";

    try {
        const products = await Database.getProducts();
        listBody.innerHTML = "";

        if(products.length === 0) {
             listBody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding: 24px; color: #8e8e93'>Tu base de datos está vacía, no hay productos.</td></tr>";
             return;
        }

        products.forEach(p => {
            const tr = document.createElement("tr");
            const firstImage = (p.imageUrls && p.imageUrls[0]) || p.imageUrl || "https://via.placeholder.com/50?text=IMG";
            const productName = escapeHtml(p.name);
            
            let stockHtml = "";
            let metaText = `${escapeHtml(p.category || "N/A")} • ${escapeHtml(p.brand || "N/A")}`;
            let stockEditor = "";

            if (p.sizes && p.sizes.length > 0) {
                const sizesStr = p.sizes.map(s => `<b>${escapeHtml(s.name)}</b>: ${s.qty}`).join(", ");
                stockHtml = `<div style="font-size:12px;color:#8E8E93;line-height:1.4;">${sizesStr}</div>
                             <div style="font-weight:600;margin-top:2px;">Total: ${p.quantity}</div>`;
                const sizesJson = escapeHtml(JSON.stringify(p.sizes));
                stockEditor = `<button class="ios-btn secondary-btn" style="padding:4px 8px; font-size:11px;" onclick="openEditSizesModal('${p.id}', '${sizesJson}')">Editar Tallas</button>`;
            } else {
                metaText += ` • Talla: ${escapeHtml(p.size || "N/A")}`;
                stockHtml = `<div style="font-weight:600;">Total: ${p.quantity || 0}</div>`;
                stockEditor = `<input type="number" value="${Number(p.quantity || 0)}" class="ios-input" style="width:70px; margin:0; padding:8px" id="stock-${p.id}" />`;
            }

            const productId = escapeJs(p.id);
            const modalName = escapeJs(p.name);

            tr.innerHTML = `
                <td><img src="${escapeHtml(firstImage)}" alt="${productName}" class="table-img" onerror="this.src='https://via.placeholder.com/50?text=IMG'"/></td>
                <td>
                    <div style="font-weight:600">${productName}</div>
                    <div style="font-size:11px; color:#8E8E93; margin-top:2px;">${metaText}</div>
                </td>
                <td>$<input type="number" step="0.01" value="${Number(p.price || 0)}" class="ios-input" style="width:80px; margin:0; padding:8px" id="price-${productId}" /></td>
                <td>
                    ${stockHtml}
                    <div style="margin-top:8px;">${stockEditor}</div>
                </td>
                <td style="white-space: nowrap;">
                    <button class="action-btn" onclick="updateProductInfo('${productId}', this, ${p.sizes && p.sizes.length > 0})" title="Guardar cambios de Precio/Stock">${ICON_SAVE}</button>
                    <button class="action-btn" onclick="openImageModal('${productId}', '${modalName}')" title="Gestionar Fotos">${ICON_PHOTO}</button>
                    <button class="action-btn btn-delete" onclick="deleteProduct('${productId}')" title="Eliminar Producto">${ICON_TRASH}</button>
                </td>
            `;

            listBody.appendChild(tr);
        });
    } catch(err) {
        listBody.innerHTML = "<tr><td colspan='5' style='color:red;'>Error al cargar datos. Verifica los permisos de Firestore.</td></tr>";
        console.error(err);
    }
}

window.deleteProduct = async function(id) {
    if(confirm("¿Estás seguro de eliminar permanentemente este producto?")) {
        try {
            await Database.deleteProduct(id);
            await renderAdminTable();
        } catch(err) {
            alert("No se pudo eliminar el producto: " + err.message);
        }
    }
};

window.renderOrdersTable = async function() {
    const listBody = document.getElementById("orders-list");
    if(!listBody) return;

    try {
        const orders = await Database.getPendingOrders();
        listBody.innerHTML = "";
        
        if (orders.length === 0) {
            listBody.innerHTML = "<tr><td colspan='5' style='text-align:center; padding: 30px; color: var(--text-secondary);'>No hay pedidos pendientes.</td></tr>";
            return;
        }

        orders.forEach(order => {
            const tr = document.createElement("tr");
            const dateStr = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : "Reciente";
            
            let itemsHtml = order.items.map(item => `<div>${item.quantity}x ${item.name} (${item.size})</div>`).join("");

            tr.innerHTML = `
                <td style="font-weight: 600;">${order.id}</td>
                <td style="font-size: 13px;">${dateStr}</td>
                <td style="font-size: 13px;">${itemsHtml}</td>
                <td style="font-weight: 600;">$${Number(order.total).toFixed(2)}</td>
                <td style="white-space: nowrap;">
                    <button class="action-btn" onclick="confirmOrderBtn('${order.id}', this)" title="Marcar Vendido" style="color: var(--apple-green);">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </button>
                    <button class="action-btn" onclick="cancelOrderBtn('${order.id}', this)" title="Cancelar y Liberar Stock" style="color: var(--apple-red);">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                    </button>
                </td>
            `;
            listBody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
        listBody.innerHTML = "<tr><td colspan='5' style='color:red;'>Error cargando pedidos.</td></tr>";
    }
};

window.confirmOrderBtn = async function(id, btn) {
    if(!confirm("¿Confirmar este pedido como VENDIDO? (El stock ya está descontado).")) return;
    try {
        btn.disabled = true;
        await Database.confirmOrder(id);
        renderOrdersTable();
    } catch(err) {
        alert("Error confirmando pedido: " + err.message);
        btn.disabled = false;
    }
};

window.cancelOrderBtn = async function(id, btn) {
    if(!confirm("¿Cancelar pedido? Esto devolverá automáticamente el inventario a la tienda para que otros puedan comprar.")) return;
    try {
        btn.disabled = true;
        await Database.cancelOrder(id);
        renderOrdersTable();
        renderAdminTable(); // Refresh products to show restored stock
    } catch(err) {
        alert("Error cancelando pedido: " + err.message);
        btn.disabled = false;
    }
};

window.updateProductInfo = async function(id, btn, hasSizes) {
    const priceInput = document.getElementById(`price-${id}`);
    const newPrice = parseFloat(priceInput.value);
    
    let newStock = null;
    if(!hasSizes) {
        const stockInput = document.getElementById(`stock-${id}`);
        newStock = parseInt(stockInput.value, 10);
    }

    if(btn) btn.innerHTML = ICON_WAIT;

    try {
        await Database.updateProductInfo(id, newPrice, newStock);
        if(btn) {
            btn.innerHTML = ICON_CHECK;
            btn.style.color = "#34C759";
            btn.style.borderColor = "#34C759";
            setTimeout(() => {
                btn.innerHTML = ICON_SAVE;
                btn.style.color = "var(--text-primary)";
                btn.style.borderColor = "#E5E5EA";
            }, 1000);
        }
    } catch(err) {
         if(btn) btn.innerHTML = ICON_SAVE;
         alert("Hubo un error de sincronización: " + err.message);
    }
};

window.openImageModal = async function(id, name) {
    currentProductId = id;
    document.getElementById("modal-title").innerText = `Fotos: ${name}`;
    document.getElementById("image-modal").style.display = "flex";

    try {
        const doc = await db.collection("products").doc(id).get();
        if(doc.exists) {
            currentImageUrls = doc.data().imageUrls || [];
            if(currentImageUrls.length === 0 && doc.data().imageUrl) {
                currentImageUrls = [doc.data().imageUrl];
            }
            renderModalImages();
        }
    } catch(e) {
        console.error(e);
    }
};

window.closeImageModal = function() {
    document.getElementById("image-modal").style.display = "none";
    currentProductId = null;
    currentImageUrls = [];
    renderAdminTable();
};

function renderModalImages() {
    const grid = document.getElementById("modal-images-grid");
    grid.innerHTML = "";

    if(currentImageUrls.length === 0) {
        grid.innerHTML = "<p style='color: var(--text-secondary); width: 100%;'>No hay fotos todavía.</p>";
        return;
    }

    currentImageUrls.forEach((url, index) => {
        const isPrimary = index === 0;
        const wrapper = document.createElement("div");
        wrapper.className = `modal-img-wrapper ${isPrimary ? "primary" : ""}`;

        wrapper.innerHTML = `
            <img src="${escapeHtml(url)}" alt="Foto del producto">
            <div class="modal-img-actions">
                ${!isPrimary ? `<button onclick="makeImagePrimary(${index})" title="Hacer principal">Principal</button>` : `<span style="color:#34C759; font-size:14px; padding-top:2px;">Principal</span>`}
                <button onclick="deleteImageFromList(${index})" title="Eliminar">Eliminar</button>
            </div>
        `;
        grid.appendChild(wrapper);
    });
}

window.makeImagePrimary = async function(index) {
    const imgUrl = currentImageUrls.splice(index, 1)[0];
    currentImageUrls.unshift(imgUrl);

    renderModalImages();
    await Database.updateProductImages(currentProductId, currentImageUrls);
};

window.deleteImageFromList = async function(index) {
    if(!confirm("¿Borrar esta foto?")) return;

    currentImageUrls.splice(index, 1);
    renderModalImages();
    await Database.updateProductImages(currentProductId, currentImageUrls);
};

window.openEditSizesModal = function(productId, sizesJsonStr) {
    currentProductId = productId;
    const sizes = JSON.parse(sizesJsonStr.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
    const container = document.getElementById("edit-sizes-container");
    container.innerHTML = "";
    sizes.forEach(s => {
        const div = document.createElement("div");
        div.className = "size-row";
        div.style.cssText = "display:flex; gap:12px; align-items:center;";
        div.innerHTML = `
            <input type="text" class="ios-input size-name" placeholder="Talla (ej. S, Única)" style="margin:0; flex:1;" required value="${escapeHtml(s.name)}" />
            <input type="number" class="ios-input size-qty" placeholder="Cantidad" style="margin:0; width:120px;" required min="0" value="${s.qty}" />
            <button type="button" class="remove-size-btn" onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--apple-red);font-size:22px;cursor:pointer;padding:0 8px;font-weight:bold;">&times;</button>
        `;
        container.appendChild(div);
    });
    document.getElementById("edit-sizes-modal").style.display = "flex";
};

window.closeEditSizesModal = function() {
    document.getElementById("edit-sizes-modal").style.display = "none";
    currentProductId = null;
};

window.addEditSizeRow = function() {
    const container = document.getElementById("edit-sizes-container");
    const div = document.createElement("div");
    div.className = "size-row";
    div.style.cssText = "display:flex; gap:12px; align-items:center;";
    div.innerHTML = `
        <input type="text" class="ios-input size-name" placeholder="Talla" style="margin:0; flex:1;" required />
        <input type="number" class="ios-input size-qty" placeholder="Cantidad" style="margin:0; width:120px;" required min="0" />
        <button type="button" class="remove-size-btn" onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--apple-red);font-size:22px;cursor:pointer;padding:0 8px;font-weight:bold;">&times;</button>
    `;
    container.appendChild(div);
};

window.saveEditedSizes = async function() {
    if(!currentProductId) return;
    const sizeRows = document.getElementById("edit-sizes-container").querySelectorAll(".size-row");
    let sizesArray = [];
    let totalQuantity = 0;
    
    sizeRows.forEach(row => {
        const sName = row.querySelector(".size-name").value.trim();
        const sQty = parseInt(row.querySelector(".size-qty").value, 10) || 0;
        if(sName) {
            sizesArray.push({ name: sName, qty: sQty });
            totalQuantity += sQty;
        }
    });

    try {
        const btn = document.querySelector("#edit-sizes-modal .primary-btn");
        const oldText = btn.innerText;
        btn.innerText = "Guardando...";
        btn.disabled = true;

        await db.collection("products").doc(currentProductId).update({
            sizes: sizesArray,
            quantity: totalQuantity,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        closeEditSizesModal();
        await renderAdminTable();
        alert("Tallas actualizadas correctamente.");
        btn.innerText = oldText;
        btn.disabled = false;
    } catch(err) {
        console.error(err);
        alert("Error guardando tallas: " + err.message);
    }
};
