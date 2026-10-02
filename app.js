/**
 * Bavly Kids - محرك البيانات والربط السحابي المشترك
 */

const DEFAULT_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwcx9W_p5KTy5960OXaiW2j40aensBmcm87nEFG7oQGidP_rKscFHwYh9LSWxPECWec/exec";

// استرجاع أو تخزين رابط الاسكريبت
function getScriptUrl() {
    return localStorage.getItem("bavly_script_url") || DEFAULT_SCRIPT_URL;
}

function setScriptUrl(url) {
    if (url && url.trim()) {
        localStorage.setItem("bavly_script_url", url.trim());
    }
}

// مزامنة الرابط الجديد مع التخزين المحلي فوراً
if (localStorage.getItem("bavly_script_url") !== DEFAULT_SCRIPT_URL) {
    localStorage.setItem("bavly_script_url", DEFAULT_SCRIPT_URL);
}

// مفاتيح التخزين المحلي (LocalStorage) كنسخة احتياطية سريعة
const STORAGE_KEYS = {
    INVENTORY: "bavly_inventory",
    SALES: "bavly_sales",
    SUPPLIERS: "bavly_supplier_invoices",
    PROFILES: "bavly_supplier_profiles",
    CHECKS: "bavly_checks"
};

// تهيئة البيانات الافتراضية إذا لم تكن موجودة
function initDefaultData() {
    if (!localStorage.getItem(STORAGE_KEYS.INVENTORY)) {
        const defaultInv = [
            { code: "M-101", name: "طقم أطفال صيفي بطوط", colors: "أصفر / أزرق", size: "2-4", qty: 35, costPrice: 120, sellPrice: 190 },
            { code: "M-102", name: "فستان بناتي تول مشجر", colors: "وردي / أبيض", size: "4-6", qty: 18, costPrice: 160, sellPrice: 260 },
            { code: "M-103", name: "ترنج قطن ولادي خريفي", colors: "كحلي / رصاصي", size: "6-8", qty: 4, costPrice: 210, sellPrice: 320 }
        ];
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(defaultInv));
    }

    if (!localStorage.getItem(STORAGE_KEYS.PROFILES)) {
        const defaultProfiles = [
            { id: "SUP-01", name: "مصنع الأمل للملابس", phone: "01011223344", address: "العاشر من رمضان", notes: "ملابس أطفال صيفي" },
            { id: "SUP-02", name: "مصنع النور للتريكو", phone: "01233445566", address: "المحلة الكبرى", notes: "ترنجات وتريكو" }
        ];
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(defaultProfiles));
    }

    if (!localStorage.getItem(STORAGE_KEYS.SUPPLIERS)) {
        const defaultSup = [
            { invoiceNo: "SUP-501", supplierName: "مصنع الأمل للملابس", date: "2026-09-15", qty: 50, total: 6000, paid: 3500, remaining: 2500, imageUrl: "" },
            { invoiceNo: "SUP-502", supplierName: "مصنع النور للتريكو", date: "2026-09-20", qty: 30, total: 6300, paid: 2000, remaining: 4300, imageUrl: "" }
        ];
        localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(defaultSup));
    }

    if (!localStorage.getItem(STORAGE_KEYS.CHECKS)) {
        const defaultChecks = [
            { checkNo: "CHK-1002", bank: "البنك الأهلي المصري", supplierName: "مصنع الأمل للملابس", issueDate: "2026-09-15", dueDate: "2026-10-10", total: 2500, paid: 0, remaining: 2500, status: "لم يسدد", imageUrl: "" },
            { checkNo: "CHK-1005", bank: "بنك مصر", supplierName: "مصنع النور للتريكو", issueDate: "2026-09-20", dueDate: "2026-10-25", total: 4300, paid: 1500, remaining: 2800, status: "جاري التسديد", imageUrl: "" }
        ];
        localStorage.setItem(STORAGE_KEYS.CHECKS, JSON.stringify(defaultChecks));
    }

    if (!localStorage.getItem(STORAGE_KEYS.SALES)) {
        const defaultSales = [
            { invoiceNo: "INV-1001", date: "2026-10-01", customerName: "أحمد محمود", customerPhone: "01012345678", items: [{ code: "M-101", name: "طقم صيفي بطوط", qty: 2, price: 190, discount: 20, total: 360 }], subtotal: 380, discountTotal: 20, netTotal: 360, paid: 360, remaining: 0 }
        ];
        localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(defaultSales));
    }
}

// تشغيل التهيئة تلقائياً
initDefaultData();

// دوال إدارة المخزن
const InventoryDB = {
    getAll: () => JSON.parse(localStorage.getItem(STORAGE_KEYS.INVENTORY) || "[]"),
    save: (item) => {
        let items = InventoryDB.getAll();
        const index = items.findIndex(i => String(i.code).trim() === String(item.code).trim());
        if (index > -1) {
            items[index] = item;
        } else {
            items.push(item);
        }
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
        syncWithCloud("save_inventory_item", item);
    },
    delete: (code) => {
        let items = InventoryDB.getAll().filter(i => String(i.code).trim() !== String(code).trim());
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
        syncWithCloud("delete_inventory_item", { code });
    },
    deductStock: (soldItems) => {
        let items = InventoryDB.getAll();
        soldItems.forEach(sold => {
            const index = items.findIndex(i => String(i.code).trim() === String(sold.code).trim());
            if (index > -1) {
                items[index].qty = Math.max(0, (Number(items[index].qty) || 0) - (Number(sold.qty) || 0));
            }
        });
        localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
    }
};

// دوال إدارة فواتير الموردين
const SupplierDB = {
    getAll: () => JSON.parse(localStorage.getItem(STORAGE_KEYS.SUPPLIERS) || "[]"),
    save: (invoice) => {
        let list = SupplierDB.getAll();
        const index = list.findIndex(i => String(i.invoiceNo).trim() === String(invoice.invoiceNo).trim());
        if (index > -1) {
            list[index] = invoice;
        } else {
            list.push(invoice);
        }
        localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(list));
        syncWithCloud("save_supplier_invoice", invoice);
    },
    pay: (invoiceNo, amount) => {
        let list = SupplierDB.getAll();
        const inv = list.find(i => String(i.invoiceNo).trim() === String(invoiceNo).trim());
        if (inv) {
            inv.paid = (Number(inv.paid) || 0) + Number(amount);
            inv.remaining = Math.max(0, (Number(inv.total) || 0) - inv.paid);
            localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(list));
            syncWithCloud("pay_supplier_invoice", { invoiceNo, amountPaid: amount });
        }
    },
    // حساب "أنا عليا كام تلقائي للموردين"
    getTotalDebt: () => {
        const list = SupplierDB.getAll();
        return list.reduce((sum, inv) => sum + (Number(inv.remaining) || 0), 0);
    }
};

// دوال إدارة بيانات ودليل الموردين والمصانع
const SupplierProfilesDB = {
    getAll: () => JSON.parse(localStorage.getItem(STORAGE_KEYS.PROFILES) || "[]"),
    save: (profile) => {
        let list = SupplierProfilesDB.getAll();
        const index = list.findIndex(p => String(p.name).trim() === String(profile.name).trim());
        if (index > -1) {
            list[index] = profile;
        } else {
            list.push(profile);
        }
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(list));
        syncWithCloud("save_supplier_profile", profile);
    },
    delete: (name) => {
        let list = SupplierProfilesDB.getAll().filter(p => String(p.name).trim() !== String(name).trim());
        localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(list));
        syncWithCloud("delete_supplier_profile", { name });
    }
};

// دوال إدارة الشيكات
const CheckDB = {
    getAll: () => JSON.parse(localStorage.getItem(STORAGE_KEYS.CHECKS) || "[]"),
    save: (chk) => {
        let list = CheckDB.getAll();
        const index = list.findIndex(c => String(c.checkNo).trim() === String(chk.checkNo).trim());
        if (index > -1) {
            list[index] = chk;
        } else {
            list.push(chk);
        }
        localStorage.setItem(STORAGE_KEYS.CHECKS, JSON.stringify(list));
        syncWithCloud("save_check", chk);
    },
    pay: (checkNo, amount) => {
        let list = CheckDB.getAll();
        const chk = list.find(c => String(c.checkNo).trim() === String(checkNo).trim());
        if (chk) {
            chk.paid = (Number(chk.paid) || 0) + Number(amount);
            chk.remaining = Math.max(0, (Number(chk.total) || 0) - chk.paid);
            chk.status = chk.remaining === 0 ? "تم التسديد" : "جاري التسديد";
            localStorage.setItem(STORAGE_KEYS.CHECKS, JSON.stringify(list));
            syncWithCloud("pay_check", { checkNo, amountPaid: amount });
        }
    }
};

// دوال فواتير المبيعات
const SalesDB = {
    getAll: () => JSON.parse(localStorage.getItem(STORAGE_KEYS.SALES) || "[]"),
    save: (invoice) => {
        let list = SalesDB.getAll();
        list.push(invoice);
        localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(list));
        // خصم المخزون
        InventoryDB.deductStock(invoice.items);
        syncWithCloud("save_invoice", invoice);
    },
    getNextInvoiceNo: () => {
        const list = SalesDB.getAll();
        let maxNum = 1000;
        list.forEach(i => {
            const num = parseInt(String(i.invoiceNo).replace(/\D/g, ''));
            if (!isNaN(num) && num > maxNum) maxNum = num;
        });
        return "INV-" + (maxNum + 1);
    }
};

// إرسال البيانات للرابط السحابي في الخلفية (Cloud Sync)
async function syncWithCloud(action, payload) {
    const url = getScriptUrl();
    if (!url) return;
    try {
        await fetch(url, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: action, payload: payload })
        });
        console.log(`Cloud sync success for [${action}]`);
    } catch (e) {
        console.warn(`Cloud sync notice: Working offline or network busy. Data saved locally.`);
    }
}

// جلب كل البيانات من جوجل شيت وتحديث الذاكرة المحلية
async function fetchAllFromCloud() {
    const url = getScriptUrl();
    if (!url) return false;
    try {
        const res = await fetch(url + (url.includes('?') ? '&' : '?') + 'action=get_all');
        const json = await res.json();
        if (json.status === "success" && json.data) {
            if (json.data.inventory && Array.isArray(json.data.inventory)) {
                // مواءمة البيانات من الشيت
                const inv = json.data.inventory.map(row => ({
                    code: row["كود_الموديل"],
                    name: row["اسم_الموديل"],
                    colors: row["الألوان"],
                    size: row["المقاس"],
                    qty: Number(row["الكمية"]) || 0,
                    costPrice: Number(row["سعر_الجملة"]) || 0,
                    sellPrice: Number(row["سعر_البيع"]) || 0
                }));
                localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(inv));
            }
            if (json.data.supplier_invoices && Array.isArray(json.data.supplier_invoices)) {
                const sups = json.data.supplier_invoices.map(row => ({
                    invoiceNo: row["رقم_الفاتورة"],
                    supplierName: row["اسم_المورد"],
                    date: row["التاريخ"],
                    qty: Number(row["الكمية"]) || 0,
                    total: Number(row["الاجمالي"] || row["اجمالي_الشراء"]) || 0,
                    paid: Number(row["المدفوع"]) || 0,
                    remaining: Number(row["المتبقي"]) || 0,
                    imageUrl: row["رابط_صورة_الفاتورة"] || ""
                }));
                localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(sups));
            }
            if (json.data.supplier_profiles && Array.isArray(json.data.supplier_profiles)) {
                const profiles = json.data.supplier_profiles.map(row => ({
                    id: row["كود_المورد"] || "",
                    name: row["اسم_المورد"],
                    phone: row["رقم_التليفون"] || "",
                    address: row["العنوان"] || "",
                    notes: row["ملاحظات"] || ""
                }));
                localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
            }
            if (json.data.checks && Array.isArray(json.data.checks)) {
                const chks = json.data.checks.map(row => ({
                    checkNo: row["رقم_الشيك"],
                    bank: row["البنك"],
                    supplierName: row["المستفيد"],
                    issueDate: row["تاريخ_الاصدار"],
                    dueDate: row["تاريخ_الاستحقاق"],
                    total: Number(row["القيمة"]) || 0,
                    paid: Number(row["المدفوع"]) || 0,
                    remaining: Number(row["المتبقي"]) || 0,
                    status: row["الحالة"] || "لم يسدد",
                    imageUrl: row["رابط_صورة_الشيك"] || ""
                }));
                localStorage.setItem(STORAGE_KEYS.CHECKS, JSON.stringify(chks));
            }
            return true;
        }
    } catch(err) {
        console.warn("Unable to fetch from cloud directly (using local cache).", err);
    }
    return false;
}

// عرض رسالة تنبيه سريعة Toast
function showToast(msg, type = "success") {
    let toast = document.getElementById("bavly-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.id = "bavly-toast";
        toast.className = "fixed bottom-5 left-5 z-50 text-white px-5 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-2 transition-all transform duration-300";
        document.body.appendChild(toast);
    }
    toast.className = `fixed bottom-5 left-5 z-50 text-white px-5 py-3 rounded-xl shadow-2xl font-bold flex items-center gap-2 transition-all transform duration-300 ${type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`;
    toast.innerHTML = (type === 'error' ? '⚠️ ' : '✅ ') + msg;
    toast.style.opacity = "1";
    setTimeout(() => { toast.style.opacity = "0"; }, 3500);
}

// نافذة تعديل رابط Google Apps Script في أي وقت
function promptChangeScriptUrl() {
    const current = getScriptUrl();
    const newUrl = prompt("أدخل رابط Google Apps Script Web App المحدث:", current);
    if (newUrl !== null && newUrl.trim() !== "") {
        setScriptUrl(newUrl);
        showToast("تم تحديث رابط الربط مع Google Sheets بنجاح!");
        setTimeout(() => location.reload(), 1000);
    }
}
