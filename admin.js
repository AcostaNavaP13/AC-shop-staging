const ICON_SAVE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`;
const ICON_PHOTO = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`;
const ICON_TRASH = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;
const ICON_WAIT = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>`;
const ICON_CHECK = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

let currentProductId = null;
let currentImageUrls = [];
let selectedFilesToUpload = [];

// ==========================================
// TOAST & LOGS SYSTEM
// ==========================================
const systemLogs = [];

window.addLog = function(type, message) {
    const time = new Date().toLocaleTimeString();
    systemLogs.push(`[${time}] [${type.toUpperCase()}] ${message}`);
    const logsContainer = document.getElementById("system-logs-container");
    if(logsContainer) {
        logsContainer.innerHTML = systemLogs.join("<br/>");
        logsContainer.scrollTop = logsContainer.scrollHeight;
    }
};

window.copyLogsToClipboard = function() {
    navigator.clipboard.writeText(systemLogs.join("\n"))
        .then(() => alert("Logs copiados al portapapeles."))
        .catch(err => console.error("Error al copiar logs:", err));
};

window.showToast = function(message, type = 'info') {
    addLog(type, message);
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
        z-index: 99999;
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

// Sobrescribir window.alert
const originalAlert = window.alert;
window.alert = function(msg) {
    const lower = String(msg).toLowerCase();
    let type = 'info';
    if (lower.includes('error') || lower.includes('no se pudo') || lower.includes('inválido') || lower.includes('denegado')) {
        type = 'error';
    } else if (lower.includes('éxito') || lower.includes('correctamente') || lower.includes('exitosamente') || lower.includes('guardado')) {
        type = 'success';
    }
    showToast(msg, type);
};

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
        <input type="text" class="ios-input size-name" placeholder="Variante (ej. S, Única)" style="margin:0; flex:1;" required />
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
            
            const expirationSelect = document.getElementById("order-expiration");
            if(expirationSelect && settings.orderExpirationHours) {
                expirationSelect.value = String(settings.orderExpirationHours);
            }

            const announceEnabledInput = document.getElementById("announcement-enabled");
            const announceTextInput = document.getElementById("announcement-text");
            if (announceEnabledInput) announceEnabledInput.checked = settings.announcementEnabled === true;
            if (announceTextInput) announceTextInput.value = settings.announcementText || "";

            const mpConfigModule = document.getElementById("mp-config-module");
            const mpInstallments = document.getElementById("mp-installments");
            const mpAllowCash = document.getElementById("mp-allow-cash");
            
            if (mpConfigModule) {
                mpConfigModule.style.display = settings.mercadopagoEnabled ? "block" : "none";
            }
            if (mpInstallments) {
                mpInstallments.value = settings.mpInstallments ? String(settings.mpInstallments) : "12";
            }
            if (mpAllowCash) {
                mpAllowCash.checked = settings.mpAllowCash !== false; // defaults to true
            }

            if(settings.logoUrl) {
                localStorage.setItem("oa_logo", settings.logoUrl);
                const favicon = document.getElementById("favicon");
                if(favicon) favicon.href = settings.logoUrl;
            }

            // Cargar configuración de banners y dev
            const devBanner = document.getElementById("dev-banner-enabled");
            const devOrders = document.getElementById("dev-orders-enabled");
            const devDiscounts = document.getElementById("dev-discounts-enabled");
            const devCoupons = document.getElementById("dev-coupons-enabled");
            const devRelated = document.getElementById("dev-related-enabled");
            const devMercadoPago = document.getElementById("dev-mercadopago-enabled");
            const bannerMainPreview = document.getElementById("current-banner-main-preview");
            const bannerSide1Preview = document.getElementById("current-banner-side1-preview");
            const bannerSide2Preview = document.getElementById("current-banner-side2-preview");
            
            if(devBanner) devBanner.checked = settings.bannerEnabled !== false;
            if(devOrders) devOrders.checked = settings.ordersEnabled !== false;
            if(devDiscounts) devDiscounts.checked = settings.discountsEnabled !== false;
            if(devCoupons) devCoupons.checked = settings.couponsEnabled !== false;
            if(devRelated) devRelated.checked = settings.relatedEnabled !== false;
            if(devMercadoPago) devMercadoPago.checked = settings.mercadopagoEnabled === true;
            
            if(bannerMainPreview && settings.bannerImageUrl) { bannerMainPreview.src = settings.bannerImageUrl; bannerMainPreview.style.display = "block"; }
            if(bannerSide1Preview && settings.bannerSide1Url) { bannerSide1Preview.src = settings.bannerSide1Url; bannerSide1Preview.style.display = "block"; }
            if(bannerSide2Preview && settings.bannerSide2Url) { bannerSide2Preview.src = settings.bannerSide2Url; bannerSide2Preview.style.display = "block"; }

            // Apply Developer Options UI states
            window.applyDevSettingsState = function() {
                const isBannerEnabled = devBanner ? devBanner.checked : true;
                const isDiscountsEnabled = devDiscounts ? devDiscounts.checked : true;
                
                const bannersFormContainer = document.getElementById("banners-form");
                if (bannersFormContainer) {
                    if (!isBannerEnabled) {
                        bannersFormContainer.innerHTML = "<p style='color:var(--apple-red); font-weight:500; text-align:center; padding: 20px;'>Los banners están desactivados en Opciones de Desarrollador.</p>";
                    }
                    // Note: If re-enabled, it requires a page refresh to get the form back, which is fine for dev options.
                }

                const discContainer = document.getElementById("prod-discount-enabled");
                if (discContainer && discContainer.parentElement) {
                    discContainer.parentElement.style.display = isDiscountsEnabled ? "flex" : "none";
                }
                const discPercent = document.getElementById("prod-discount-percent");
                if (discPercent && !isDiscountsEnabled) {
                    discPercent.style.display = "none";
                }
            };
            
            window.applyDevSettingsState();


            // Cargar sub-banners de categorías
            const catContainer = document.getElementById("cat-banners-container");
            if (catContainer) {
                catContainer.innerHTML = "";
                const banners = settings.categoryBanners || [];
                banners.forEach(b => addCatBannerRow(b.category, b.imageUrl));
            }

            await renderAdminTable();
            await renderOrdersTable();
            
            // Limpieza automática en segundo plano
            Database.cleanupOldOrders();
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
            const orderExpiration = document.getElementById("order-expiration").value;

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

                const announcementEnabled = document.getElementById("announcement-enabled") ? document.getElementById("announcement-enabled").checked : false;
                const announcementText = document.getElementById("announcement-text") ? document.getElementById("announcement-text").value : "";
                const mpInstallments = document.getElementById("mp-installments") ? parseInt(document.getElementById("mp-installments").value) : 12;
                const mpAllowCash = document.getElementById("mp-allow-cash") ? document.getElementById("mp-allow-cash").checked : true;

                await Database.saveSettings({ 
                    whatsapp: newWhatsapp, 
                    storeName: newStoreName,
                    heroTitle: newHeroTitle,
                    heroSubtitle: newHeroSubtitle,
                    orderExpirationHours: orderExpiration,
                    announcementEnabled,
                    announcementText,
                    mpInstallments,
                    mpAllowCash,
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

    const bannersForm = document.getElementById("banners-form");
    if(bannersForm) {
        bannersForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector("button[type=submit]");
            const bannerMainInput = document.getElementById("store-banner-main");
            const bannerSide1Input = document.getElementById("store-banner-side1");
            const bannerSide2Input = document.getElementById("store-banner-side2");
            
            function validateImageDimensions(file, targetWidth, targetHeight) {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.src = URL.createObjectURL(file);
                    img.onload = () => {
                        const aspectTarget = targetWidth / targetHeight;
                        const aspectImage = img.width / img.height;
                        if (Math.abs(aspectTarget - aspectImage) > 0.1) {
                            if (!confirm(`La medida ideal es ${targetWidth}x${targetHeight} px. Tu imagen es ${img.width}x${img.height} px, por lo que el diseño la recortará para ajustarla.\n\n¿Deseas usar esta imagen de todas formas?`)) {
                                return reject(new Error("Subida cancelada por el usuario."));
                            }
                        }
                        resolve();
                    };
                    img.onerror = () => reject(new Error("Archivo de imagen inválido"));
                });
            }

            try {
                btn.innerText = "Guardando Banners...";
                btn.disabled = true;

                let bannerImageUrl = undefined;
                let bannerSide1Url = undefined;
                let bannerSide2Url = undefined;

                if (bannerMainInput && bannerMainInput.files.length > 0) {
                    await validateImageDimensions(bannerMainInput.files[0], 1200, 600);
                    const dataUrls = await filesToCompressedDataUrls(bannerMainInput.files);
                    bannerImageUrl = await Database.uploadSettingImage(dataUrls[0], "main_banner");
                    const preview = document.getElementById("current-banner-main-preview");
                    if(preview) { preview.src = bannerImageUrl; preview.style.display = "block"; }
                    bannerMainInput.value = "";
                }
                
                if (bannerSide1Input && bannerSide1Input.files.length > 0) {
                    await validateImageDimensions(bannerSide1Input.files[0], 600, 290);
                    const dataUrls = await filesToCompressedDataUrls(bannerSide1Input.files);
                    bannerSide1Url = await Database.uploadSettingImage(dataUrls[0], "side1_banner");
                    const preview = document.getElementById("current-banner-side1-preview");
                    if(preview) { preview.src = bannerSide1Url; preview.style.display = "block"; }
                    bannerSide1Input.value = "";
                }

                if (bannerSide2Input && bannerSide2Input.files.length > 0) {
                    await validateImageDimensions(bannerSide2Input.files[0], 600, 290);
                    const dataUrls = await filesToCompressedDataUrls(bannerSide2Input.files);
                    bannerSide2Url = await Database.uploadSettingImage(dataUrls[0], "side2_banner");
                    const preview = document.getElementById("current-banner-side2-preview");
                    if(preview) { preview.src = bannerSide2Url; preview.style.display = "block"; }
                    bannerSide2Input.value = "";
                }

                // Parse category banners
                const catBanners = [];
                const rows = document.querySelectorAll("#cat-banners-container .cat-banner-row");
                for (const row of rows) {
                    const catName = row.querySelector(".cat-banner-name").value.trim();
                    const fileInput = row.querySelector(".cat-banner-file");
                    let currentUrl = row.dataset.url || "";
                    
                    if (fileInput.files && fileInput.files.length > 0) {
                        const dataUrls = await filesToCompressedDataUrls(fileInput.files);
                        currentUrl = await Database.uploadSettingImage(dataUrls[0], "cat_banner_" + catName);
                    }
                    
                    if (catName && currentUrl) {
                        catBanners.push({ category: catName, imageUrl: currentUrl });
                    }
                }

                await Database.saveSettings({ 
                    categoryBanners: catBanners,
                    ...(bannerImageUrl && { bannerImageUrl }),
                    ...(bannerSide1Url && { bannerSide1Url }),
                    ...(bannerSide2Url && { bannerSide2Url })
                });

                alert("Configuración de banners guardada correctamente.");
            } catch(err) {
                alert("Error al guardar banners: " + err.message);
            } finally {
                btn.innerText = "Guardar Banners";
                btn.disabled = false;
            }
        });
    }

    const devForm = document.getElementById("dev-form");
    if (devForm) {
        devForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector("button");
            const bannerEnabled = document.getElementById("dev-banner-enabled").checked;
            const ordersEnabled = document.getElementById("dev-orders-enabled").checked;
            const discountsEnabled = document.getElementById("dev-discounts-enabled").checked;
            const couponsEnabled = document.getElementById("dev-coupons-enabled").checked;
            const devRelated = document.getElementById("dev-related-enabled");
            const relatedEnabled = devRelated ? devRelated.checked : true;
            const devMercadoPago = document.getElementById("dev-mercadopago-enabled");
            const mercadopagoEnabled = devMercadoPago ? devMercadoPago.checked : false;
            
            try {
                btn.innerText = "Aplicando...";
                btn.disabled = true;
                await Database.saveSettings({ bannerEnabled, ordersEnabled, discountsEnabled, couponsEnabled, relatedEnabled, mercadopagoEnabled });
                window.applyDevSettingsState();
                alert("Cambios maestros aplicados.");
            } catch(err) {
                alert("Error: " + err.message);
            } finally {
                btn.innerText = "Aplicar Cambios Maestros";
                btn.disabled = false;
            }
        });
    }

    const devBannerToggle = document.getElementById("dev-banner-enabled");
    const devDiscountsToggle = document.getElementById("dev-discounts-enabled");
    if(devBannerToggle) devBannerToggle.addEventListener("change", window.applyDevSettingsState);
    if(devDiscountsToggle) devDiscountsToggle.addEventListener("change", window.applyDevSettingsState);

    const productForm = document.getElementById("product-form");
    const prodDiscountEnabled = document.getElementById("prod-discount-enabled");
    const prodDiscountPercent = document.getElementById("prod-discount-percent");
    if(prodDiscountEnabled && prodDiscountPercent) {
        prodDiscountEnabled.addEventListener("change", (e) => {
            prodDiscountPercent.style.display = e.target.checked ? "block" : "none";
            if(!e.target.checked) prodDiscountPercent.value = "";
        });
    }

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

    let editingProductId = null;

    const cancelEditBtn = document.getElementById("cancel-edit-btn");
    if(cancelEditBtn) {
        cancelEditBtn.addEventListener("click", () => {
            if(productForm) productForm.reset();
            document.getElementById("product-form-title").innerText = "Añadir Nuevo Producto";
            document.getElementById("save-product-btn").innerText = "Guardar Producto";
            cancelEditBtn.style.display = "none";
            
            const prodDiscP = document.getElementById("prod-discount-percent");
            if (prodDiscP) prodDiscP.style.display = "none";

            selectedFilesToUpload = [];
            renderPreviews();
            
            document.getElementById("sizes-container").innerHTML = `
                <div class="size-row" style="display:flex; gap:12px; align-items:center;">
                    <input type="text" class="ios-input size-name" placeholder="Variante (ej. S, Única)" style="margin:0; flex:1;" required />
                    <input type="number" class="ios-input size-qty" placeholder="Cantidad" style="margin:0; width:120px;" required min="0" />
                    <button type="button" class="remove-size-btn" onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--apple-red);font-size:22px;cursor:pointer;padding:0 8px;font-weight:bold;" title="Eliminar variante">&times;</button>
                </div>
            `;
            editingProductId = null;
        });
    }

    window.loadProductIntoForm = async function(id) {
        try {
            const doc = await db.collection("products").doc(id).get();
            if(!doc.exists) return;
            const p = doc.data();

            document.getElementById("prod-name").value = p.name || "";
            const skuInput = document.getElementById("prod-sku");
            if(skuInput) skuInput.value = p.sku || "";
            document.getElementById("prod-price").value = p.price || 0;
            
            const discEnabled = document.getElementById("prod-discount-enabled");
            const discPercent = document.getElementById("prod-discount-percent");
            if (discEnabled) discEnabled.checked = !!p.discountEnabled;
            if (discPercent) {
                discPercent.value = p.discountPercent || "";
                discPercent.style.display = p.discountEnabled ? "block" : "none";
            }
            
            document.getElementById("prod-category").value = p.category || "";
            document.getElementById("prod-brand").value = p.brand || "";
            document.getElementById("prod-description").value = p.description || "";
            
            const relInput = document.getElementById("prod-related-skus");
            if (relInput) {
                relInput.value = (p.relatedSkus && Array.isArray(p.relatedSkus)) ? p.relatedSkus.join(", ") : "";
            }

            const sizesContainer = document.getElementById("sizes-container");
            sizesContainer.innerHTML = "";
            if (p.sizes && p.sizes.length > 0) {
                p.sizes.forEach(s => {
                    const row = document.createElement("div");
                    row.className = "size-row";
                    row.style.cssText = "display:flex; gap:12px; align-items:center;";
                    row.innerHTML = `
                        <input type="text" class="ios-input size-name" value="${escapeHtml(s.name)}" placeholder="Talla (ej. S, Única)" style="margin:0; flex:1;" required />
                        <input type="number" class="ios-input size-qty" value="${s.qty}" placeholder="Cantidad" style="margin:0; width:120px;" required min="0" />
                        <button type="button" class="remove-size-btn" onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--apple-red);font-size:22px;cursor:pointer;padding:0 8px;font-weight:bold;" title="Eliminar talla">&times;</button>
                    `;
                    sizesContainer.appendChild(row);
                });
            } else {
                // If it had no sizes, just put a generic one with total quantity
                sizesContainer.innerHTML = `
                    <div class="size-row" style="display:flex; gap:12px; align-items:center;">
                        <input type="text" class="ios-input size-name" value="${escapeHtml(p.size || 'Unitalla')}" placeholder="Talla" style="margin:0; flex:1;" required />
                        <input type="number" class="ios-input size-qty" value="${p.quantity || 0}" placeholder="Cantidad" style="margin:0; width:120px;" required min="0" />
                        <button type="button" class="remove-size-btn" onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--apple-red);font-size:22px;cursor:pointer;padding:0 8px;font-weight:bold;" title="Eliminar talla">&times;</button>
                    </div>
                `;
            }

            // We do not load images into File input due to browser security, but we could fetch them as blobs.
            // For now, we clear them. The update function will append new images if selected.
            selectedFilesToUpload = [];
            renderPreviews();

            document.getElementById("product-form-title").innerText = "Editar Producto";
            document.getElementById("save-product-btn").innerText = "Actualizar Producto";
            if(cancelEditBtn) cancelEditBtn.style.display = "block";
            editingProductId = id;

            // Scroll to form
            document.getElementById("product-form").scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch(err) {
            console.error(err);
            alert("Error al cargar producto: " + err.message);
        }
    };
    if(productForm) {
        productForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const name = document.getElementById("prod-name").value.trim();
            const skuInput = document.getElementById("prod-sku");
            const sku = skuInput ? skuInput.value.trim().toUpperCase() : "";
            const price = parseFloat(document.getElementById("prod-price").value);
            const prodDiscountEnabled = document.getElementById("prod-discount-enabled");
            const discountEnabled = prodDiscountEnabled ? prodDiscountEnabled.checked : false;
            const prodDiscountPercent = document.getElementById("prod-discount-percent");
            const discountPercent = discountEnabled && prodDiscountPercent && prodDiscountPercent.value ? parseInt(prodDiscountPercent.value, 10) : 0;
            const description = document.getElementById("prod-description").value.trim();
            const category = document.getElementById("prod-category").value.trim();
            const brand = document.getElementById("prod-brand").value.trim();
            const relInput = document.getElementById("prod-related-skus");
            const relatedSkus = relInput ? relInput.value.split(",").map(s => s.trim().toUpperCase()).filter(Boolean) : [];
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

            if (selectedFilesToUpload.length === 0 && !editingProductId) {
                alert("Selecciona al menos una imagen para previsualizar.");
                return;
            }

            try {
                btn.innerText = editingProductId ? "Actualizando producto..." : "Subiendo producto...";
                btn.disabled = true;
                const imageDataUrls = await filesToCompressedDataUrls(selectedFilesToUpload);
                
                const payload = { 
                    name,
                    sku,
                    price, 
                    discountEnabled,
                    discountPercent,
                    description,
                    quantity: totalQuantity, 
                    sizes: sizesArray,
                    category, 
                    brand, 
                    relatedSkus,
                    imageDataUrls 
                };

                if (editingProductId) {
                    await Database.updateProduct(editingProductId, payload);
                } else {
                    await Database.addProduct(payload);
                }
                
                e.target.reset();
                selectedFilesToUpload = [];
                renderPreviews();
                
                document.getElementById("sizes-container").innerHTML = `
                    <div class="size-row" style="display:flex; gap:12px; align-items:center;">
                        <input type="text" class="ios-input size-name" placeholder="Variante (ej. S, Única)" style="margin:0; flex:1;" required />
                        <input type="number" class="ios-input size-qty" placeholder="Cantidad" style="margin:0; width:120px;" required min="0" />
                        <button type="button" class="remove-size-btn" onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--apple-red);font-size:22px;cursor:pointer;padding:0 8px;font-weight:bold;" title="Eliminar variante">&times;</button>
                    </div>
                `;
                
                const cancelBtn = document.getElementById("cancel-edit-btn");
                if(cancelBtn) cancelBtn.style.display = "none";
                document.getElementById("product-form-title").innerText = "Añadir Nuevo Producto";
                btn.innerText = "Guardar Producto";
                
                // Si no había descuento activado, ocultamos input %
                const prodDiscP = document.getElementById("prod-discount-percent");
                if (prodDiscP) prodDiscP.style.display = "none";
                
                alert(editingProductId ? "Producto actualizado correctamente." : "Producto añadido correctamente.");
                editingProductId = null;
                
                await renderAdminTable();
            } catch(err) {
                console.error(err);
                alert("Error guardando el producto: " + err.message);
                btn.innerText = editingProductId ? "Actualizar Producto" : "Guardar Producto";
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

                        if (row.length >= 7) {
                            const sku = row[0].trim().toUpperCase();
                            const name = row[1].trim();
                            const price = parseFloat(row[2]);
                            const qty = parseInt(row[3], 10);
                            const category = row[4].trim();
                            const brand = row[5].trim();
                            const size = row[6].trim();

                            if (name && !Number.isNaN(price) && !Number.isNaN(qty)) {
                                await Database.addProduct({ sku, name, price, quantity: qty, category, brand, size });
                                count++;
                            }
                        } else if (row.length >= 4) {
                            const sku = row[0].trim().toUpperCase();
                            const name = row[1].trim();
                            const price = parseFloat(row[2]);
                            const qty = parseInt(row[3], 10);
                            if (name && !Number.isNaN(price) && !Number.isNaN(qty)) {
                                await Database.addProduct({ sku, name, price, quantity: qty, category: "General", brand: "Generica", size: "Unitalla" });
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

    const bulkImageForm = document.getElementById("bulk-image-form");
    if (bulkImageForm) {
        bulkImageForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const fileInput = document.getElementById("bulk-image-files");
            const files = fileInput.files;
            if (!files || files.length === 0) return;

            const btn = e.target.querySelector("button[type=submit]");
            const statusDiv = document.getElementById("bulk-image-status");
            btn.innerText = "Subiendo y vinculando...";
            btn.disabled = true;
            statusDiv.style.display = "block";
            statusDiv.innerHTML = "Iniciando proceso...";
            statusDiv.style.color = "var(--text-secondary)";

            try {
                // Fetch all products
                const allProducts = await Database.getProducts();
                
                let successCount = 0;
                let failedFiles = [];

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    statusDiv.innerHTML = `Procesando ${i + 1} de ${files.length}...`;
                    
                    // Regex to extract SKU from filename (e.g. SKU123_1.jpg, SKU-123.png)
                    const fileName = file.name.split('.')[0];
                    const skuMatch = fileName.split('_')[0].toUpperCase().trim();

                    if (!skuMatch) {
                        failedFiles.push(`${file.name} (Formato inválido)`);
                        continue;
                    }

                    // Find corresponding product by exact SKU match
                    const matchingProduct = allProducts.find(p => p.sku && p.sku.toUpperCase() === skuMatch);

                    if (!matchingProduct) {
                        failedFiles.push(`${file.name} (SKU no encontrado: ${skuMatch})`);
                        continue;
                    }

                    // Upload Image
                    try {
                        const dataUrl = await compressImage(file);
                        const downloadUrl = await Database.uploadProductImage(dataUrl);

                        let currentImages = matchingProduct.images || [];
                        if (currentImages.length >= 3) {
                            failedFiles.push(`${file.name} (Límite de 3 fotos alcanzado en ${skuMatch})`);
                            continue;
                        }

                        currentImages.push(downloadUrl);
                        await Database.updateProduct(matchingProduct.id, { images: currentImages });
                        
                        // Local update to avoid full refetch if multiple images match same product
                        matchingProduct.images = currentImages;
                        successCount++;

                    } catch (uploadErr) {
                        failedFiles.push(`${file.name} (Error al subir: ${uploadErr.message})`);
                    }
                }

                bulkImageForm.reset();
                await renderAdminTable();

                let finalMsg = `Proceso terminado. <br/><strong style="color:var(--apple-green);">Imágenes vinculadas: ${successCount}</strong>`;
                if (failedFiles.length > 0) {
                    finalMsg += `<br/><strong style="color:var(--apple-red);">Errores (${failedFiles.length}):</strong><ul style="color:var(--apple-red); font-size: 12px; margin-top:4px;">`;
                    failedFiles.forEach(f => finalMsg += `<li>${escapeHtml(f)}</li>`);
                    finalMsg += "</ul>";
                }
                statusDiv.innerHTML = finalMsg;

            } catch (err) {
                statusDiv.innerHTML = "Ocurrió un error general: " + escapeHtml(err.message);
                statusDiv.style.color = "var(--apple-red)";
            } finally {
                btn.innerText = "Subir Imágenes por SKU";
                btn.disabled = false;
            }
        });
    }

    const modalFileInput = document.getElementById("modal-file-input");
    if(modalFileInput) {
        modalFileInput.addEventListener("change", async (e) => {
            const files = e.target.files;
            if(!files || files.length === 0) return;

            const remainingSlots = 3 - currentImageUrls.length;
            if(remainingSlots <= 0) {
                alert("Ya tienes 3 fotos (el máximo). Elimina alguna antes de subir otra.");
                e.target.value = "";
                return;
            }
            
            const filesToProcess = Array.from(files).slice(0, remainingSlots);
            if(files.length > remainingSlots) {
                alert(`Sólo se subirán ${remainingSlots} imagen(es) de ${files.length} seleccionadas. Límite de 3 total.`);
            }

            const labelBtn = modalFileInput.parentElement;
            const originalText = labelBtn.innerHTML;
            labelBtn.style.pointerEvents = "none";
            labelBtn.textContent = "Subiendo y comprimiendo...";

            try {
                const imageDataUrls = await filesToCompressedDataUrls(filesToProcess);
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

    listBody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding: 24px;'>Descargando artículos...</td></tr>";

    try {
        const products = await Database.getProducts();
        listBody.innerHTML = "";

        if(products.length === 0) {
             listBody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding: 24px; color: #8e8e93'>Tu base de datos está vacía, no hay productos.</td></tr>";
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
                stockEditor = `<button class="ios-btn secondary-btn" style="padding:4px 8px; font-size:11px;" onclick="openEditSizesModal('${p.id}', '${sizesJson}')">Editar Variantes</button>`;
            } else {
                metaText += ` • Variante: ${escapeHtml(p.size || "N/A")}`;
                stockHtml = `<div style="font-weight:600;">Total: ${p.quantity || 0}</div>`;
                stockEditor = `<input type="number" value="${Number(p.quantity || 0)}" class="ios-input" style="width:70px; margin:0; padding:8px" id="stock-${p.id}" aria-label="Stock de ${productName}" title="Stock de ${productName}" />`;
            }

            const productId = escapeJs(p.id);
            const modalName = escapeJs(p.name);

            tr.innerHTML = `
                <td><img src="${escapeHtml(firstImage)}" alt="${productName}" class="table-img" onerror="this.src='https://via.placeholder.com/50?text=IMG'"/></td>
                <td>
                    <div style="font-weight:600">${productName}</div>
                    <div style="font-size:11px; color:#8E8E93; margin-top:2px;">${metaText}</div>
                </td>
                <td><span style="background: #E5E5EA; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${escapeHtml(p.sku || "N/A")}</span></td>
                <td>
                    $<input type="number" step="0.01" value="${Number(p.price || 0)}" class="ios-input" style="width:80px; margin:0; padding:8px" id="price-${productId}" aria-label="Precio de ${productName}" title="Precio de ${productName}" />
                    ${p.discountEnabled && p.discountPercent > 0 ? `<div style="font-size:11px; color:var(--apple-red); margin-top:4px;">-${p.discountPercent}% ($${(Number(p.price) * (1 - p.discountPercent/100)).toFixed(2)})</div>` : ''}
                </td>
                <td>
                    ${stockHtml}
                    <div style="margin-top:8px;">${stockEditor}</div>
                </td>
                <td style="white-space: nowrap;">
                    <button class="action-btn" onclick="loadProductIntoForm('${productId}')" title="Editar Producto Completo"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                    <button class="action-btn" onclick="updateProductInfo('${productId}', this, ${p.sizes && p.sizes.length > 0})" title="Guardar cambios de Precio/Stock">${ICON_SAVE}</button>
                    <button class="action-btn" onclick="openImageModal('${productId}', '${modalName}')" title="Gestionar Fotos">${ICON_PHOTO}</button>
                    <button class="action-btn btn-delete" onclick="deleteProduct('${productId}')" title="Eliminar Producto">${ICON_TRASH}</button>
                </td>
            `;

            listBody.appendChild(tr);
        });
    } catch(err) {
        listBody.innerHTML = "<tr><td colspan='6' style='color:red;'>Error al cargar datos. Verifica los permisos de Firestore.</td></tr>";
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

let orderCountdownInterval = null;

window.renderOrdersTable = async function() {
    const listBody = document.getElementById("orders-list");
    if(!listBody) return;
    
    // Limpiar intervalos anteriores
    if(orderCountdownInterval) clearInterval(orderCountdownInterval);

    try {
        const orders = await Database.getPendingOrders();
        const settings = await Database.getSettings();
        const expirationHours = Number(settings.orderExpirationHours) || 24;
        
        listBody.innerHTML = "";
        
        if (orders.length === 0) {
            listBody.innerHTML = "<tr><td colspan='6' style='text-align:center; padding: 30px; color: var(--text-secondary);'>No hay pedidos pendientes.</td></tr>";
            return;
        }

        orders.forEach(order => {
            const tr = document.createElement("tr");
            const dateStr = order.createdAt ? new Date(order.createdAt.seconds * 1000).toLocaleString() : "Reciente";
            
            let commitHtml = "";
            if (order.commitmentDate) {
                const cDate = new Date(order.commitmentDate).toLocaleDateString();
                commitHtml = `<div style="color:var(--apple-blue); font-weight:600; font-size:12px; margin-top:4px;">⏳ Límite: ${cDate}</div>`;
            }

            let paymentBadge = "";
            if (order.paymentMethod) {
                const isMp = order.paymentMethod === 'Mercado Pago';
                paymentBadge = `<div style="margin-top: 4px; font-size: 10px; font-weight: 600; padding: 2px 6px; border-radius: 4px; display: inline-block; background-color: ${isMp ? '#E5F3FF' : '#E5F9E4'}; color: ${isMp ? '#009EE3' : '#34C759'};">${escapeHtml(order.paymentMethod)}</div>`;
            }

            let itemsHtml = order.items.map(item => `<div>${item.quantity}x ${item.name} (${item.size})</div>`).join("");

            tr.innerHTML = `
                <td style="font-weight: 600;">${order.id}<br/>${paymentBadge}</td>
                <td style="font-size: 13px;">${dateStr}${commitHtml}</td>
                <td style="font-size: 13px;">${itemsHtml}</td>
                <td style="font-weight: 600;">$${Number(order.total).toFixed(2)}</td>
                <td>
                    <span class="order-countdown" 
                          data-created="${order.createdAt?.seconds || 0}" 
                          data-commitment="${order.commitmentDate || ''}" 
                          data-expiration="${expirationHours}"
                          style="font-size: 13px; font-weight: 600;"></span>
                </td>
                <td style="white-space: nowrap; display: flex; gap: 8px;">
                    <button class="action-btn" onclick="confirmOrderBtn('${order.id}', this)" title="Marcar Vendido" style="color: var(--apple-green);">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    </button>
                    <button class="action-btn" onclick="setCommitmentBtn('${order.id}', this)" title="Marcar Anticipo / Fecha Límite" style="color: var(--apple-blue);">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                    </button>
                    <button class="action-btn" onclick="cancelOrderBtn('${order.id}', this)" title="Cancelar y Liberar Stock" style="color: var(--apple-red);">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                    </button>
                </td>
            `;
            listBody.appendChild(tr);
        });
        
        // Iniciar contador en tiempo real
        updateCountdowns();
        orderCountdownInterval = setInterval(updateCountdowns, 1000);
        
    } catch (err) {
        console.error(err);
        listBody.innerHTML = "<tr><td colspan='6' style='color:red;'>Error cargando pedidos.</td></tr>";
    }
};

function updateCountdowns() {
    const spans = document.querySelectorAll('.order-countdown');
    const now = Date.now();
    
    spans.forEach(span => {
        const createdSec = Number(span.dataset.created);
        const commitment = span.dataset.commitment;
        const expirationH = Number(span.dataset.expiration) || 24;
        
        let deadline;
        if (commitment) {
            deadline = new Date(commitment).getTime();
        } else {
            deadline = (createdSec * 1000) + (expirationH * 60 * 60 * 1000);
        }
        
        const remaining = deadline - now;
        
        if (remaining <= 0) {
            span.innerHTML = '⚠️ <span style="color:var(--apple-red);">Vencido</span>';
            return;
        }
        
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        
        let color = 'var(--apple-green)';
        if (remaining < 3600000) color = 'var(--apple-red)'; // < 1h
        else if (remaining < 14400000) color = '#FF9500'; // < 4h (naranja)
        
        span.innerHTML = `<span style="color:${color};">${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}</span>`;
    });
}

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

window.setCommitmentBtn = async function(id, btn) {
    const dateStr = prompt("Ingresa la nueva fecha límite de pago para este pedido (Formato: AAAA-MM-DD).\nEjemplo para 31 de Diciembre: 2026-12-31");
    if (!dateStr) return;
    
    // Validate format roughly
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return alert("Formato incorrecto. Debe ser AAAA-MM-DD");
    }

    try {
        btn.disabled = true;
        await Database.setCommitmentDate(id, dateStr);
        renderOrdersTable();
    } catch (err) {
        alert("Error asignando fecha: " + err.message);
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
            <input type="text" class="ios-input size-name" placeholder="Variante (ej. S, Única)" style="margin:0; flex:1;" required value="${escapeHtml(s.name)}" />
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
        <input type="text" class="ios-input size-name" placeholder="Variante" style="margin:0; flex:1;" required />
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
        alert("Variantes actualizadas correctamente.");
        btn.innerText = oldText;
        btn.disabled = false;
    } catch(err) {
        console.error(err);
        alert("Error guardando variantes: " + err.message);
    }
};
window.openDeveloperAuth = function() {
    const code = prompt("Introduce el código de desarrollador:");
    if (code === "Na130916") {
        document.getElementById("tab-developer").style.display = "block";
        switchAdminTab("tab-developer", document.querySelector("button[onclick='openDeveloperAuth()']"));
    } else if (code !== null) {
        alert("Código incorrecto.");
    }
};

window.addCatBannerRow = function(category = "", imageUrl = "") {
    const container = document.getElementById("cat-banners-container");
    const div = document.createElement("div");
    div.className = "cat-banner-row";
    div.dataset.url = imageUrl;
    div.style.cssText = "display:flex; gap:12px; align-items:center; background:#fff; padding:10px; border-radius:8px; border:1px solid #E5E5EA;";
    
    div.innerHTML = `
        ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;">` : `<div style="width:40px;height:40px;background:#E5E5EA;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#8E8E93;">IMG</div>`}
        <input type="text" class="ios-input cat-banner-name" placeholder="Categoría (ej. Tenis)" value="${escapeHtml(category)}" style="margin:0; flex:1;" required />
        <input type="file" class="ios-input cat-banner-file" accept="image/*" style="margin:0; flex:1; padding:8px;" ${imageUrl ? '' : 'required'} />
        <button type="button" onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--apple-red);font-size:22px;cursor:pointer;padding:0 8px;">&times;</button>
    `;
    container.appendChild(div);
};
// ==========================================
// COUPONS LOGIC
// ==========================================

async function renderCouponsTable() {
    const tbody = document.getElementById("coupons-tbody");
    if(!tbody) return;
    try {
        const coupons = await Database.getCoupons();
        tbody.innerHTML = coupons.map(c => `
            <tr>
                <td style="font-weight: 600;">${escapeHtml(c.code)}</td>
                <td>${c.type === 'percent' ? c.value + '%' : '$' + c.value}</td>
                <td>${c.expiryDate ? escapeHtml(c.expiryDate) : 'Sin caducidad'}</td>
                <td>${c.singleUsePerIp ? 'Sí' : 'No'}</td>
                <td>
                    <span style="display:inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; background: ${c.active ? '#E5F9E4' : '#FEE5E5'}; color: ${c.active ? '#34C759' : '#FF3B30'};">
                        ${c.active ? 'Activo' : 'Inactivo'}
                    </span>
                </td>
                <td>
                    <button class="action-btn edit-btn" onclick="editCoupon('${c.id}', '${escapeJs(c.code)}', '${c.type}', '${c.value}', '${c.expiryDate || ""}', ${c.singleUsePerIp}, ${c.active})" style="margin-right:8px;">✏️</button>
                    <button class="action-btn delete-btn" onclick="deleteCoupon('${c.id}', '${escapeJs(c.code)}')">🗑️</button>
                </td>
            </tr>
        `).join("") || `<tr><td colspan="6" style="text-align:center; padding: 20px;">No hay cupones registrados.</td></tr>`;
    } catch(err) {
        console.error(err);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">Error cargando cupones</td></tr>`;
    }
}

const couponForm = document.getElementById("coupon-form");
if (couponForm) {
    couponForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("coupon-id").value;
        const code = document.getElementById("coupon-code").value.trim().toUpperCase();
        const type = document.getElementById("coupon-type").value;
        const value = Number(document.getElementById("coupon-value").value);
        const expiryDate = document.getElementById("coupon-expiry").value;
        const singleUsePerIp = document.getElementById("coupon-single-use").checked;
        const active = document.getElementById("coupon-active").checked;

        if (!code || isNaN(value) || value <= 0) return alert("Por favor llena los campos obligatorios correctamente.");

        try {
            const btn = e.target.querySelector("button[type=submit]");
            btn.innerText = "Guardando...";
            btn.disabled = true;

            const data = { code, type, value, expiryDate: expiryDate || null, singleUsePerIp, active };

            if (id) {
                await Database.updateCoupon(id, data);
            } else {
                // Check if code exists
                const existing = await Database.getCouponByCode(code);
                if (existing) {
                    btn.innerText = "Guardar Cupón";
                    btn.disabled = false;
                    return alert("Ya existe un cupón con ese código.");
                }
                await Database.addCoupon(data);
            }

            resetCouponForm();
            await renderCouponsTable();
            alert("Cupón guardado exitosamente.");
        } catch(err) {
            const btn = e.target.querySelector("button[type=submit]");
            btn.innerText = id ? "Actualizar Cupón" : "Guardar Cupón";
            btn.disabled = false;
            alert("Error al guardar: " + err.message);
        }
    });
}

window.editCoupon = function(id, code, type, value, expiryDate, singleUse, active) {
    document.getElementById("coupon-id").value = id;
    document.getElementById("coupon-code").value = code;
    document.getElementById("coupon-type").value = type;
    document.getElementById("coupon-value").value = value;
    document.getElementById("coupon-expiry").value = expiryDate;
    document.getElementById("coupon-single-use").checked = singleUse;
    document.getElementById("coupon-active").checked = active;
    
    document.querySelector("#coupon-form button[type=submit]").innerText = "Actualizar Cupón";
    document.getElementById("coupon-code").focus();
};

window.resetCouponForm = function() {
    document.getElementById("coupon-form").reset();
    document.getElementById("coupon-id").value = "";
    document.querySelector("#coupon-form button[type=submit]").innerText = "Guardar Cupón";
    document.querySelector("#coupon-form button[type=submit]").disabled = false;
};

window.deleteCoupon = async function(id, code) {
    if(!confirm(`¿Estás seguro de eliminar el cupón ${code}?`)) return;
    try {
        await Database.deleteCoupon(id);
        await renderCouponsTable();
    } catch(err) {
        alert("Error al eliminar: " + err.message);
    }
};

// Hook renderCouponsTable when switching tabs
const originalSwitchAdminTab = window.switchAdminTab;
window.switchAdminTab = function(tabId, btn) {
    if (originalSwitchAdminTab) originalSwitchAdminTab(tabId, btn);
    if (tabId === 'tab-coupons') {
        renderCouponsTable();
    }
};
