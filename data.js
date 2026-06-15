// ==========================================
// CONFIGURACIÓN DE FIREBASE
// ==========================================
firebase.initializeApp({
  apiKey: "AIzaSyA1ZXymQxaGufKRV3wzlKXv-DkUZx1M0ys",
  authDomain: "ac-shop-staging.firebaseapp.com",
  projectId: "ac-shop-staging",
  storageBucket: "ac-shop-staging.firebasestorage.app",
  messagingSenderId: "765469304862",
  appId: "1:765469304862:web:0a49c7300c474617caa60f"
});

const db = firebase.firestore();
const auth = firebase.auth ? firebase.auth() : null;
const storage = firebase.storage ? firebase.storage() : null;

class Database {
    static requireAdminSession() {
        if (!auth || !auth.currentUser) {
            throw new Error("Debes iniciar sesión como administrador.");
        }
    }

    static sanitizeProduct(product) {
        return {
            name: String(product.name || "").trim(),
            price: Number(product.price),
            discountEnabled: Boolean(product.discountEnabled),
            discountPercent: Number(product.discountPercent || 0),
            description: String(product.description || "").trim(),
            quantity: Number.parseInt(product.quantity, 10),
            category: String(product.category || "General").trim(),
            brand: String(product.brand || "Generica").trim(),
            size: String(product.size || "Unitalla").trim(),
            sizes: Array.isArray(product.sizes) ? product.sizes : [],
        };
    }

    static async getSettings() {
        try {
            const doc = await db.collection("settings").doc("store").get();
            if (doc.exists) return doc.data();
            return { whatsapp: "6143382041" };
        } catch(e) {
            console.error("Error al obtener configuración, usando valor local", e);
            return { whatsapp: "6143382041" };
        }
    }

    static async saveSettings(settings) {
        this.requireAdminSession();
        let updateData = {
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: auth.currentUser.uid,
        };
        if(settings.whatsapp !== undefined) updateData.whatsapp = String(settings.whatsapp).replace(/\D/g, "");
        if(settings.storeName !== undefined) updateData.storeName = String(settings.storeName).trim();
        if(settings.heroTitle !== undefined) updateData.heroTitle = String(settings.heroTitle).trim();
        if(settings.heroSubtitle !== undefined) updateData.heroSubtitle = String(settings.heroSubtitle).trim();
        if(settings.logoUrl !== undefined) updateData.logoUrl = settings.logoUrl;
        if(settings.orderExpirationHours !== undefined) updateData.orderExpirationHours = Number(settings.orderExpirationHours) || 24;
        if(settings.bannerEnabled !== undefined) updateData.bannerEnabled = Boolean(settings.bannerEnabled);
        if(settings.bannerImageUrl !== undefined) updateData.bannerImageUrl = settings.bannerImageUrl;
        if(settings.bannerSide1Url !== undefined) updateData.bannerSide1Url = settings.bannerSide1Url;
        if(settings.bannerSide2Url !== undefined) updateData.bannerSide2Url = settings.bannerSide2Url;
        if(settings.bannerDuration !== undefined) updateData.bannerDuration = Number(settings.bannerDuration) || 0;
        if(settings.categoryBanners !== undefined) updateData.categoryBanners = settings.categoryBanners;
        if(settings.ordersEnabled !== undefined) updateData.ordersEnabled = Boolean(settings.ordersEnabled);
        if(settings.discountsEnabled !== undefined) updateData.discountsEnabled = Boolean(settings.discountsEnabled);

        await db.collection("settings").doc("store").set(updateData, { merge: true });
    }

    static async uploadLogoImage(dataUrl) {
        this.requireAdminSession();
        const path = `settings/logo_${Date.now()}.jpg`;
        const ref = storage.ref().child(path);
        await ref.putString(dataUrl, "data_url", { contentType: "image/jpeg" });
        return ref.getDownloadURL();
    }

    static async uploadSettingImage(dataUrl, prefix = "banner") {
        this.requireAdminSession();
        const path = `settings/${prefix}_${Date.now()}.jpg`;
        const ref = storage.ref().child(path);
        await ref.putString(dataUrl, "data_url", { contentType: "image/jpeg" });
        return ref.getDownloadURL();
    }

    static async getProducts() {
        try {
            const snapshot = await db.collection("products").orderBy("createdAt", "desc").get();
            const products = [];
            snapshot.forEach(doc => {
                products.push({ id: doc.id, ...doc.data() });
            });
            return products;
        } catch(e) {
            console.error("Error al obtener productos:", e);
            return [];
        }
    }

    static async updateProduct(id, product) {
        this.requireAdminSession();
        const cleanProduct = this.sanitizeProduct(product);

        if (!cleanProduct.name || Number.isNaN(cleanProduct.price) || Number.isNaN(cleanProduct.quantity)) {
            throw new Error("Revisa nombre, precio y stock del producto.");
        }

        const updateData = {
            ...cleanProduct,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: auth.currentUser.uid,
        };

        const docRef = db.collection("products").doc(id);
        await docRef.update(updateData);

        if (product.imageDataUrls && product.imageDataUrls.length > 0) {
            // Reemplazar o añadir imágenes. Para esta versión simple, si suben nuevas, agregamos a las existentes
            const currentDoc = await docRef.get();
            const currentUrls = currentDoc.data().imageUrls || [];
            const newUrls = await this.uploadProductImages(id, product.imageDataUrls);
            const mergedUrls = [...currentUrls, ...newUrls].slice(0, 3);
            await docRef.update({ imageUrls: mergedUrls });
        }
    }

    static async addProduct(product) {
        this.requireAdminSession();
        const cleanProduct = this.sanitizeProduct(product);

        if (!cleanProduct.name || Number.isNaN(cleanProduct.price) || Number.isNaN(cleanProduct.quantity)) {
            throw new Error("Revisa nombre, precio y stock del producto.");
        }

        const docRef = await db.collection("products").add({
            ...cleanProduct,
            imageUrls: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: auth.currentUser.uid,
        });

        if (product.imageDataUrls && product.imageDataUrls.length > 0) {
            const imageUrls = await this.uploadProductImages(docRef.id, product.imageDataUrls);
            await docRef.update({ imageUrls });
        }

        return docRef.id;
    }

    static async uploadProductImages(productId, imageDataUrls) {
        this.requireAdminSession();
        if (!storage) {
            throw new Error("Firebase Storage no está cargado. Revisa los scripts de Firebase.");
        }

        const uploads = imageDataUrls.map(async (dataUrl, index) => {
            const path = `products/${productId}/${Date.now()}-${index}.jpg`;
            const ref = storage.ref().child(path);
            await ref.putString(dataUrl, "data_url", {
                contentType: "image/jpeg",
                customMetadata: {
                    uploadedBy: auth.currentUser.uid,
                },
            });
            return ref.getDownloadURL();
        });

        return Promise.all(uploads);
    }

    static async appendProductImages(id, imageDataUrls) {
        this.requireAdminSession();
        const docRef = db.collection("products").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            throw new Error("El producto ya no existe.");
        }

        const currentUrls = doc.data().imageUrls || [];
        const newUrls = await this.uploadProductImages(id, imageDataUrls);
        const imageUrls = currentUrls.concat(newUrls).slice(0, 3);
        await docRef.update({
            imageUrls,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: auth.currentUser.uid,
        });
        return imageUrls;
    }

    static async updateProductImages(id, imageUrls) {
        this.requireAdminSession();
        await db.collection("products").doc(id).update({
            imageUrls,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: auth.currentUser.uid,
        });
    }

    static async updateProductInfo(id, newPrice, newQuantity) {
        this.requireAdminSession();
        const price = Number(newPrice);
        
        let updateData = {
            price,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedBy: auth.currentUser.uid,
        };

        if (newQuantity !== null && newQuantity !== undefined && !Number.isNaN(Number(newQuantity))) {
            updateData.quantity = Number.parseInt(newQuantity, 10);
        }

        if (Number.isNaN(price)) {
            throw new Error("Precio inválido.");
        }

        await db.collection("products").doc(id).update(updateData);
    }

    static async deleteProduct(id) {
        this.requireAdminSession();
        await db.collection("products").doc(id).delete();
    }

    // --- ORDERS MANAGEMENT ---

    static async createPendingOrder(cartItems) {
        const orderId = "PED-" + Math.floor(1000 + Math.random() * 9000);
        const total = cartItems.reduce((acc, item) => acc + (Number(item.price) * Number(item.quantity)), 0);
        
        await db.runTransaction(async (transaction) => {
            const productRefs = cartItems.map(item => db.collection("products").doc(item.id));
            const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));
            let updates = [];
            
            cartItems.forEach((item, index) => {
                const doc = productDocs[index];
                if (!doc.exists) throw new Error(`El producto ${item.name} ya no está disponible.`);
                const p = doc.data();
                let newSizes = p.sizes ? [...p.sizes] : [];
                let newQuantity = p.quantity;
                
                if (p.sizes && p.sizes.length > 0) {
                    const sizeIndex = newSizes.findIndex(s => s.name === item.size);
                    if (sizeIndex === -1 || newSizes[sizeIndex].qty < item.quantity) {
                        throw new Error(`No hay suficiente stock de la talla ${item.size} para ${item.name}.`);
                    }
                    newSizes[sizeIndex].qty -= item.quantity;
                    newQuantity -= item.quantity;
                } else {
                    if (p.quantity < item.quantity) {
                        throw new Error(`No hay suficiente stock para ${item.name}.`);
                    }
                    newQuantity -= item.quantity;
                }
                
                updates.push({
                    ref: productRefs[index],
                    data: { sizes: newSizes, quantity: newQuantity }
                });
            });
            
            updates.forEach(u => transaction.update(u.ref, u.data));
            
            const orderRef = db.collection("orders").doc(orderId);
            transaction.set(orderRef, {
                items: cartItems,
                total: total,
                status: "pending",
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
        
        return orderId;
    }

    static async getPendingOrders() {
        this.requireAdminSession();
        // Quitamos el orderBy de Firebase para no requerir un índice compuesto nuevo,
        // y ordenamos los resultados localmente de más reciente a más viejo.
        const snapshot = await db.collection("orders").where("status", "==", "pending").get();
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        return docs.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    }

    static async confirmOrder(orderId) {
        this.requireAdminSession();
        await db.collection("orders").doc(orderId).update({
            status: "completed",
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    static async cancelOrder(orderId) {
        this.requireAdminSession();
        await db.runTransaction(async (transaction) => {
            const orderRef = db.collection("orders").doc(orderId);
            const orderDoc = await transaction.get(orderRef);
            if (!orderDoc.exists) throw new Error("Pedido no encontrado.");
            const order = orderDoc.data();
            
            if (order.status !== "pending") throw new Error("El pedido ya no está pendiente.");
            
            const cartItems = order.items || [];
            const productRefs = cartItems.map(item => db.collection("products").doc(item.id));
            const productDocs = await Promise.all(productRefs.map(ref => transaction.get(ref)));
            
            let updates = [];
            
            cartItems.forEach((item, index) => {
                const doc = productDocs[index];
                if (!doc.exists) return; 
                const p = doc.data();
                let newSizes = p.sizes ? [...p.sizes] : [];
                let newQuantity = p.quantity;
                
                if (p.sizes && p.sizes.length > 0) {
                    const sizeIndex = newSizes.findIndex(s => s.name === item.size);
                    if (sizeIndex !== -1) {
                        newSizes[sizeIndex].qty += item.quantity;
                    } else {
                        newSizes.push({ name: item.size, qty: item.quantity });
                    }
                    newQuantity += item.quantity;
                } else {
                    newQuantity += item.quantity;
                }
                
                updates.push({
                    ref: productRefs[index],
                    data: { sizes: newSizes, quantity: newQuantity }
                });
            });
            
            updates.forEach(u => transaction.update(u.ref, u.data));
            transaction.update(orderRef, {
                status: "cancelled",
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        });
    }

    static async setCommitmentDate(orderId, dateStr) {
        this.requireAdminSession();
        // dateStr is YYYY-MM-DD. Set to end of day.
        const commitDate = new Date(`${dateStr}T23:59:59`);
        if (isNaN(commitDate.getTime())) throw new Error("Fecha inválida.");
        
        await db.collection("orders").doc(orderId).update({
            commitmentDate: commitDate.toISOString(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    static async cleanupOldOrders() {
        try {
            const now = new Date();
            
            // Leer tiempo de expiración configurado
            const settings = await this.getSettings();
            const expirationHours = Number(settings.orderExpirationHours) || 24;
            
            // 1. Auto-cancelar pedidos pendientes vencidos
            const pendingSnapshot = await db.collection("orders").where("status", "==", "pending").get();
            for (const doc of pendingSnapshot.docs) {
                const order = doc.data();
                const createdAt = order.createdAt?.toDate() || new Date();
                let isExpired = false;
                
                if (order.commitmentDate) {
                    // Si tiene fecha compromiso, respetar esa fecha
                    const commitDate = new Date(order.commitmentDate);
                    if (now > commitDate) isExpired = true;
                } else {
                    // Sin compromiso, usar el tiempo configurable
                    const diffHours = (now - createdAt) / (1000 * 60 * 60);
                    if (diffHours >= expirationHours) isExpired = true;
                }
                
                if (isExpired) {
                    console.log(`Auto-cancelando pedido vencido: ${doc.id}`);
                    try {
                        await this.cancelOrder(doc.id);
                    } catch (err) {
                        console.error(`No se pudo auto-cancelar el pedido ${doc.id}`, err);
                    }
                }
            }

            // 2. Eliminar pedidos cancelados o completados que tengan más de 7 días
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            
            const snapshot = await db.collection("orders")
                .where("createdAt", "<", sevenDaysAgo)
                .get();
                
            const batch = db.batch();
            let count = 0;
            
            snapshot.forEach(doc => {
                const order = doc.data();
                if (order.status === "completed" || order.status === "cancelled") {
                    batch.delete(doc.ref);
                    count++;
                }
            });
            
            if (count > 0) {
                await batch.commit();
                console.log(`Se eliminaron automáticamente ${count} pedidos basura antiguos.`);
            }
        } catch(e) {
            console.error("Error en limpieza automática de pedidos:", e);
        }
    }
}
