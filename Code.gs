/**
 * نظام إدارة Bavly Kids - Google Apps Script
 * كود الربط الكامل مع Google Sheets و Google Drive
 * ----------------------------------------------------
 * تعليمات النشر:
 * 1. افتح ملف Google Sheets الجديد أو الحالي.
 * 2. من القائمة العلوية اضغط Extensions (التطبيقات الملحقة) -> Apps Script.
 * 3. امسح أي كود موجود وضع هذا الكود بالكامل مكانه.
 * 4. اضغط على Deploy (نشر) -> New deployment (نشر جديد).
 * 5. اختر نوع النشر: Web app (تطبيق ويب).
 * 6. اضبط الصلاحيات:
 *    - Execute as: Me (حسابي)
 *    - Who has access: Anyone (أي مستخدم) -> مهم جداً ليعمل دون مشاكل تسجيل دخول!
 * 7. اضغط Deploy وانسخ الرابط النهائي وضعه في البرنامج.
 */

// تهيئة الشيتات والأعمدة عند التشغيل لأول مرة
function setupDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const sheets = {
    "المخزن": ["كود_الموديل", "اسم_الموديل", "الألوان", "المقاس", "الكمية", "سعر_الجملة", "سعر_البيع", "تاريخ_التحديث"],
    "الفواتير": ["رقم_الفاتورة", "التاريخ", "اسم_العميل", "رقم_الهاتف", "تفاصيل_الاصناف", "الاجمالي", "الخصم", "الصافي", "المدفوع", "المتبقي"],
    "فواتير_الموردين": ["رقم_الفاتورة", "اسم_المورد", "التاريخ", "الكمية", "اجمالي_الشراء", "المدفوع", "المتبقي", "رابط_صورة_الفاتورة"],
    "دليل_الموردين": ["كود_المورد", "اسم_المورد", "رقم_التليفون", "العنوان", "ملاحظات"],
    "الشيكات": ["رقم_الشيك", "البنك", "المستفيد", "تاريخ_الاصدار", "تاريخ_الاستحقاق", "القيمة", "المدفوع", "المتبقي", "الحالة", "رابط_صورة_الشيك"]
  };

  for (let sheetName in sheets) {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.getRange(1, 1, 1, sheets[sheetName].length).setValues([sheets[sheetName]]);
      sheet.getRange(1, 1, 1, sheets[sheetName].length).setFontWeight("bold").setBackground("#f1f5f9");
      sheet.setRightToLeft(true);
    }
  }
}

// دالة GET لجلب البيانات
function doGet(e) {
  setupDatabase();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "get_all";

  let responseData = {};

  try {
    if (action === "get_all" || action === "get_inventory") {
      responseData.inventory = getSheetData(ss.getSheetByName("المخزن"));
    }
    if (action === "get_all" || action === "get_sales") {
      responseData.sales = getSheetData(ss.getSheetByName("الفواتير"));
    }
    if (action === "get_all" || action === "get_suppliers") {
      responseData.supplier_invoices = getSheetData(ss.getSheetByName("فواتير_الموردين"));
      responseData.supplier_profiles = getSheetData(ss.getSheetByName("دليل_الموردين"));
    }
    if (action === "get_all" || action === "get_checks") {
      responseData.checks = getSheetData(ss.getSheetByName("الشيكات"));
    }

    // حساب إحصائيات سريعة للرئيسية
    if (action === "get_all") {
      let totalStockQty = 0;
      let totalStockValue = 0;
      (responseData.inventory || []).forEach(item => {
        let q = Number(item["الكمية"]) || 0;
        let c = Number(item["سعر_الجملة"]) || 0;
        totalStockQty += q;
        totalStockValue += (q * c);
      });

      let totalSupplierDebt = 0;
      (responseData.supplier_invoices || []).forEach(inv => {
        let rem = Number(inv["المتبقي"]) || 0;
        totalSupplierDebt += rem;
      });

      let totalSales = 0;
      (responseData.sales || []).forEach(sale => {
        totalSales += (Number(sale["الصافي"]) || 0);
      });

      responseData.stats = {
        totalStockQty: totalStockQty,
        totalStockValue: totalStockValue,
        totalSupplierDebt: totalSupplierDebt,
        totalSales: totalSales
      };
    }

    return createJsonResponse({ status: "success", data: responseData });
  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}

// دالة POST لحفظ واستقبال البيانات والعمليات
function doPost(e) {
  setupDatabase();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  try {
    const postData = JSON.parse(e.postData.contents);
    const action = postData.action;
    const payload = postData.payload;

    if (action === "save_inventory_item") {
      saveInventoryItem(ss, payload);
      return createJsonResponse({ status: "success", message: "تم حفظ الموديل في المخزن بنجاح" });
    }

    if (action === "delete_inventory_item") {
      deleteInventoryItem(ss, payload.code);
      return createJsonResponse({ status: "success", message: "تم حذف الموديل" });
    }

    if (action === "save_invoice") {
      saveSalesInvoice(ss, payload);
      return createJsonResponse({ status: "success", message: "تم تسجيل الفاتورة بنجاح" });
    }

    if (action === "save_supplier_invoice") {
      saveSupplierInvoice(ss, payload);
      return createJsonResponse({ status: "success", message: "تم حفظ فاتورة المورد وتحديث الحساب" });
    }

    if (action === "save_supplier_profile") {
      saveSupplierProfile(ss, payload);
      return createJsonResponse({ status: "success", message: "تم حفظ بيانات المورد في الدليل بنجاح" });
    }

    if (action === "delete_supplier_profile") {
      deleteSupplierProfile(ss, payload.name);
      return createJsonResponse({ status: "success", message: "تم حذف المورد من الدليل" });
    }

    if (action === "save_check") {
      saveCheck(ss, payload);
      return createJsonResponse({ status: "success", message: "تم حفظ الشيك بنجاح" });
    }

    if (action === "pay_supplier_invoice") {
      updateSupplierInvoicePayment(ss, payload);
      return createJsonResponse({ status: "success", message: "تم تسجيل الدفعة بنجاح" });
    }

    if (action === "pay_check") {
      updateCheckPayment(ss, payload);
      return createJsonResponse({ status: "success", message: "تم تسديد الشيك بنجاح" });
    }

    return createJsonResponse({ status: "error", message: "أمر غير معروف: " + action });
  } catch (err) {
    return createJsonResponse({ status: "error", message: err.toString() });
  }
}

// ----------------- الدوال المساعدة للعمليات ----------------- //

function getSheetData(sheet) {
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];
  const headers = rows[0];
  const data = [];
  for (let i = 1; i < rows.length; i++) {
    let rowObj = {};
    for (let j = 0; j < headers.length; j++) {
      rowObj[headers[j]] = rows[i][j];
    }
    data.push(rowObj);
  }
  return data;
}

// حفظ أو تعديل صنف في المخزن
function saveInventoryItem(ss, item) {
  const sheet = ss.getSheetByName("المخزن");
  const data = sheet.getDataRange().getValues();
  const code = String(item.code || "").trim();
  const rowData = [
    code,
    item.name || "",
    item.colors || "",
    item.size || "",
    Number(item.qty) || 0,
    Number(item.costPrice) || 0,
    Number(item.sellPrice) || 0,
    Utilities.formatDate(new Date(), "GMT+3", "yyyy-MM-dd HH:mm")
  ];

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === code) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

// حذف صنف من المخزن
function deleteInventoryItem(ss, code) {
  const sheet = ss.getSheetByName("المخزن");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(code).trim()) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

// حفظ فاتورة مبيعات وخصم الكميات تلقائياً من المخزن
function saveSalesInvoice(ss, invoice) {
  const sheet = ss.getSheetByName("الفواتير");
  const rowData = [
    invoice.invoiceNo,
    invoice.date || Utilities.formatDate(new Date(), "GMT+3", "yyyy-MM-dd"),
    invoice.customerName || "عميل نقدي",
    invoice.customerPhone || "-",
    JSON.stringify(invoice.items || []),
    Number(invoice.subtotal) || 0,
    Number(invoice.discountTotal) || 0,
    Number(invoice.netTotal) || 0,
    Number(invoice.paid) || 0,
    Number(invoice.remaining) || 0
  ];
  sheet.appendRow(rowData);

  // خصم الكميات من المخزن
  const invSheet = ss.getSheetByName("المخزن");
  const invData = invSheet.getDataRange().getValues();
  (invoice.items || []).forEach(soldItem => {
    let soldCode = String(soldItem.code || "").trim();
    let soldQty = Number(soldItem.qty) || 0;
    if (soldCode && soldQty > 0) {
      for (let i = 1; i < invData.length; i++) {
        if (String(invData[i][0]).trim() === soldCode) {
          let currentQty = Number(invData[i][4]) || 0;
          let newQty = Math.max(0, currentQty - soldQty);
          invSheet.getRange(i + 1, 5).setValue(newQty);
          break;
        }
      }
    }
  });
}

// حفظ فاتورة شراء من مورد (المبسطة: رقم الفاتورة، اسم المورد، الكمية، مبلغ البضاعة)
function saveSupplierInvoice(ss, invoice) {
  const sheet = ss.getSheetByName("فواتير_الموردين");
  let imageUrl = invoice.imageUrl || "";

  // رفع الصورة لـ Google Drive إذا أُرسلت كـ base64
  if (invoice.imageBase64 && invoice.imageBase64.indexOf("base64,") > -1) {
    imageUrl = saveBase64Image(invoice.imageBase64, "INV_" + invoice.invoiceNo + "_" + (invoice.supplierName || "مورد"));
  }

  const rowData = [
    invoice.invoiceNo,
    invoice.supplierName || "",
    invoice.date || Utilities.formatDate(new Date(), "GMT+3", "yyyy-MM-dd"),
    Number(invoice.qty) || 0,
    Number(invoice.total) || 0,
    Number(invoice.paid) || 0,
    Number(invoice.remaining) || 0,
    imageUrl
  ];
  sheet.appendRow(rowData);
}

// حفظ أو تعديل مورد في دليل الموردين
function saveSupplierProfile(ss, profile) {
  const sheet = ss.getSheetByName("دليل_الموردين");
  const data = sheet.getDataRange().getValues();
  const name = String(profile.name || "").trim();
  const rowData = [
    profile.id || ("SUP-" + new Date().getTime().toString().slice(-4)),
    name,
    profile.phone || "",
    profile.address || "",
    profile.notes || ""
  ];

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === name) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

// حذف مورد من الدليل
function deleteSupplierProfile(ss, name) {
  const sheet = ss.getSheetByName("دليل_الموردين");
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).trim() === String(name).trim()) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

// حفظ الشيك
function saveCheck(ss, check) {
  const sheet = ss.getSheetByName("الشيكات");
  let imageUrl = check.imageUrl || "";

  if (check.imageBase64 && check.imageBase64.indexOf("base64,") > -1) {
    imageUrl = saveBase64Image(check.imageBase64, "CHK_" + check.checkNo + "_" + (check.supplierName || "مورد"));
  }

  const rowData = [
    check.checkNo,
    check.bank || "",
    check.supplierName || "",
    check.issueDate || Utilities.formatDate(new Date(), "GMT+3", "yyyy-MM-dd"),
    check.dueDate || "",
    Number(check.total) || 0,
    Number(check.paid) || 0,
    Number(check.remaining) || 0,
    check.status || "لم يسدد",
    imageUrl
  ];
  sheet.appendRow(rowData);
}

// تحديث سداد فاتورة مورد
function updateSupplierInvoicePayment(ss, data) {
  const sheet = ss.getSheetByName("فواتير_الموردين");
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(data.invoiceNo).trim()) {
      let currentPaid = Number(values[i][5]) || 0;
      let total = Number(values[i][4]) || 0;
      let newPaid = currentPaid + Number(data.amountPaid);
      let newRem = Math.max(0, total - newPaid);
      sheet.getRange(i + 1, 6).setValue(newPaid);
      sheet.getRange(i + 1, 7).setValue(newRem);
      break;
    }
  }
}

// تحديث سداد شيك
function updateCheckPayment(ss, data) {
  const sheet = ss.getSheetByName("الشيكات");
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim() === String(data.checkNo).trim()) {
      let currentPaid = Number(values[i][6]) || 0;
      let total = Number(values[i][5]) || 0;
      let newPaid = currentPaid + Number(data.amountPaid);
      let newRem = Math.max(0, total - newPaid);
      let status = (newRem === 0) ? "تم التسديد" : "جاري التسديد";
      sheet.getRange(i + 1, 7).setValue(newPaid);
      sheet.getRange(i + 1, 8).setValue(newRem);
      sheet.getRange(i + 1, 9).setValue(status);
      break;
    }
  }
}

// رفع وحفظ الصورة في Google Drive
function saveBase64Image(base64Data, fileNamePrefix) {
  try {
    const contentType = base64Data.substring(base64Data.indexOf(":") + 1, base64Data.indexOf(";"));
    const bytes = Utilities.base64Decode(base64Data.split(",")[1]);
    const blob = Utilities.newBlob(bytes, contentType, fileNamePrefix + "_" + new Date().getTime() + ".jpg");

    // إنشاء مجلد Bavly Kids إذا لم يكن موجوداً
    let folders = DriveApp.getFoldersByName("Bavly_Kids_Files");
    let folder = folders.hasNext() ? folders.next() : DriveApp.createFolder("Bavly_Kids_Files");

    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return "";
  }
}

// إرجاع استجابة JSON مع معالجة CORS
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
