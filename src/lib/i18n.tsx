import * as React from "react";

export type Lang = "rw" | "en";

type Dict = Record<string, { rw: string; en: string }>;

export const dict: Dict = {
  appName: { rw: "DukaSmart", en: "DukaSmart" },
  tagline: {
    rw: "Ubucuruzi bwawe mu mufuka wawe",
    en: "Your shop, simply managed",
  },
  dashboard: { rw: "Ahabanza", en: "Dashboard" },
  products: { rw: "Ibicuruzwa", en: "Products" },
  sales: { rw: "Igurisha", en: "Sales" },
  purchases: { rw: "Ibyaguzwe", en: "Purchases" },
  inventory: { rw: "Ububiko", en: "Inventory" },
  reports: { rw: "Raporo", en: "Reports" },
  settings: { rw: "Igenamiterere", en: "Settings" },
  assistant: { rw: "Umufasha w'Ubucuruzi", en: "Business Assistant" },
  importData: { rw: "Injiza Excel", en: "Excel import" },
  more: { rw: "Ibindi", en: "More" },

  addProduct: { rw: "Ongeramo igicuruzwa", en: "Add product" },
  newSale: { rw: "Igurisha rishya", en: "New sale" },
  receiveStock: { rw: "Injiza ibicuruzwa bishya", en: "Receive stock" },
  scanInvoice: { rw: "Fata ifoto y'inyemezabuguzi", en: "Scan invoice" },
  takePhoto: { rw: "Fata ifoto", en: "Take photo" },
  voice: { rw: "Vuga", en: "Voice" },
  confirm: { rw: "Emeza", en: "Confirm" },
  edit: { rw: "Hindura", en: "Edit" },
  del: { rw: "Siba", en: "Delete" },
  cancel: { rw: "Hagarika", en: "Cancel" },
  save: { rw: "Bika", en: "Save" },
  search: { rw: "Shakisha", en: "Search" },
  scanBarcode: { rw: "Soma barcode", en: "Scan barcode" },
  lowStock: { rw: "Ibicuruzwa biri hafi kurangira", en: "Low stock" },
  outOfStock: { rw: "Ibicuruzwa byashize", en: "Out of stock" },
  loading: { rw: "Turimo gushaka...", en: "Loading..." },
  none: { rw: "Nta kintu kirimo", en: "Nothing here yet" },
  back: { rw: "Subira inyuma", en: "Back" },
  all: { rw: "Byose", en: "All" },
  total: { rw: "Igiteranyo", en: "Total" },
  quantity: { rw: "Ingano", en: "Quantity" },
  price: { rw: "Igiciro", en: "Price" },
  date: { rw: "Itariki", en: "Date" },

  productName: { rw: "Izina ry'igicuruzwa", en: "Product name" },
  category: { rw: "Icyiciro", en: "Category" },
  unit: { rw: "Igipimo", en: "Unit" },
  purchasePrice: { rw: "Igiciro cyo kugura", en: "Purchase price" },
  sellingPrice: { rw: "Igiciro cyo kugurisha", en: "Selling price" },
  currentStock: { rw: "Ibiri mu bubiko", en: "Current stock" },
  minStock: { rw: "Urwego rwo hasi", en: "Minimum stock" },
  supplier: { rw: "Uwaguhaye ibicuruzwa", en: "Supplier" },
  barcode: { rw: "Barcode", en: "Barcode" },
  sku: { rw: "Kode", en: "SKU / code" },
  productImage: { rw: "Ifoto y'igicuruzwa", en: "Product image" },
  history: { rw: "Amateka", en: "History" },

  cart: { rw: "Agatebo", en: "Cart" },
  payment: { rw: "Uburyo bwo kwishyura", en: "Payment method" },
  cash: { rw: "Amafaranga", en: "Cash" },
  momo: { rw: "Mobile Money", en: "Mobile Money" },
  bank: { rw: "Banki", en: "Bank" },
  other: { rw: "Ubundi", en: "Other" },
  completeSale: { rw: "Emeza igurisha", en: "Complete sale" },
  saleDone: { rw: "Igurisha ryanditswe!", en: "Sale recorded!" },
  emptyCart: { rw: "Agatebo karimo ubusa", en: "Cart is empty" },
  favorites: { rw: "Ibigurishwa cyane", en: "Frequently sold" },

  todaySales: { rw: "Igurisha ryo uyu munsi", en: "Today's sales" },
  todayPurchases: { rw: "Ibyaguzwe uyu munsi", en: "Today's purchases" },
  stockValue: { rw: "Agaciro k'ububiko", en: "Stock value" },
  topProducts: { rw: "Ibigurishwa cyane", en: "Top selling" },
  recentSales: { rw: "Amagurisha aheruka", en: "Recent sales" },
  recentPurchases: { rw: "Ibyaguzwe biheruka", en: "Recent purchases" },

  signIn: { rw: "Injira", en: "Sign in" },
  signUp: { rw: "Iyandikishe", en: "Sign up" },
  signOut: { rw: "Sohoka", en: "Sign out" },
  email: { rw: "Imeyili", en: "Email" },
  password: { rw: "Ijambo ry'ibanga", en: "Password" },
  fullName: { rw: "Amazina yawe", en: "Full name" },
  forgotPassword: { rw: "Wibagiwe ijambo ry'ibanga?", en: "Forgot password?" },
  businessName: { rw: "Izina rya duka", en: "Business name" },
  phone: { rw: "Telefone", en: "Phone" },
  address: { rw: "Aho iherereye", en: "Address" },
  setupBusiness: { rw: "Tangira duka ryawe", en: "Set up your shop" },
  team: { rw: "Abakozi", en: "Team" },
  role: { rw: "Inshingano", en: "Role" },
  owner: { rw: "Nyir'ubucuruzi", en: "Owner" },
  manager: { rw: "Umuyobozi", en: "Manager" },
  salesperson: { rw: "Umucuruzi", en: "Salesperson" },
  demoData: { rw: "Shyiramo ibicuruzwa by'urugero", en: "Load demo data" },
  language: { rw: "Ururimi", en: "Language" },

  voiceListening: { rw: "Ndumva... vuga", en: "Listening... speak now" },
  voiceHint: {
    rw: "Urugero: \"Ndagurishije Coca Cola ebyiri\"",
    en: 'Example: "I sold two Coca Cola"',
  },
  voiceNotUnderstood: {
    rw: "Sinabyumvise neza. Wongeye kubivuga?",
    en: "I didn't understand. Please say it again.",
  },
  voiceUnderstood: { rw: "Nabonye ko ushaka:", en: "I understood that you want:" },
  voiceUnsupported: {
    rw: "Iyi telefone/mushakisha ntiyemera kuvuga. Andika ubutumwa bwawe.",
    en: "Voice input is not supported here. Type your command instead.",
  },
  typeCommand: { rw: "Andika icyo ushaka", en: "Type your command" },

  notFoundBarcode: { rw: "Ntiturabona iki gicuruzwa.", en: "We couldn't find this product." },
  lowConfidence: {
    rw: "Reba neza amakuru twakuye kuri iyi foto.",
    en: "Please check the data we read from this photo.",
  },
  insufficientStock: { rw: "Ububiko ntabwo buhagije.", en: "Not enough stock." },
  saved: { rw: "Byabitswe", en: "Saved" },
  forbidden: { rw: "Nta burenganzira ufite kuri iki gikorwa.", en: "You don't have permission for this." },

  uploadFile: { rw: "Hitamo dosiye (Excel/CSV)", en: "Choose file (Excel/CSV)" },
  mapColumns: { rw: "Huza inkingi", en: "Map columns" },
  preview: { rw: "Reba mbere yo kwemeza", en: "Preview" },
  importNow: { rw: "Injiza ibicuruzwa", en: "Import products" },
  errorsFound: { rw: "Ibitagenda neza", en: "Problems found" },
  duplicates: { rw: "Ibisubiramo", en: "Duplicates" },
  ignore: { rw: "Reka", en: "Skip" },
  today: { rw: "Uyu munsi", en: "Today" },
  thisWeek: { rw: "Iki cyumweru", en: "This week" },
  thisMonth: { rw: "Uku kwezi", en: "This month" },
  custom: { rw: "Hitamo itariki", en: "Custom range" },
  stock: { rw: "Ububiko", en: "Stock" },
  inStock: { rw: "Birahari", en: "In stock" },
  lowStockLabel: { rw: "Bikeya", en: "Low stock" },
  outOfStockLabel: { rw: "Byashize", en: "Out of stock" },
  movementHistory: { rw: "Amateka y'ububiko", en: "Stock movements" },
  insights: { rw: "Inama z'ubucuruzi", en: "Insights" },
  fastMovers: { rw: "Bigurishwa vuba", en: "Selling fast" },
  runningOut: { rw: "Bishobora gushira vuba", en: "May run out soon" },
  notSelling: { rw: "Ntibigurishwa vuba", en: "Not selling lately" },
  soldThisWeek: { rw: "Byagurishijwe iki cyumweru", en: "Sold this week" },
  invoiceImage: { rw: "Ifoto y'inyemezabuguzi", en: "Receipt / invoice photo" },
  notes: { rw: "Ibisobanuro", en: "Notes" },
  review: { rw: "Reba mbere yo kwemeza", en: "Review before saving" },
  addItem: { rw: "Ongeraho igicuruzwa", en: "Add item" },
  remove: { rw: "Kuraho", en: "Remove" },
  customer: { rw: "Umukiriya", en: "Customer" },
  invoiceNumber: { rw: "Nimero y'inyemezabuguzi", en: "Invoice number" },
  ocrNotConnected: {
    rw: "Gusoma ifoto (OCR) ntabwo birakoreshwa. Ifoto irabikwa, andika amakuru wenyine.",
    en: "Photo reading (OCR) is not connected yet. The photo is stored; enter the details manually.",
  },
  returnIn: { rw: "Ibyagaruwe (byinjiye)", en: "Return in" },
  returnOut: { rw: "Ibyasubijwe (byasohotse)", en: "Return out" },
  adjust: { rw: "Kosora ububiko", en: "Adjust stock" },
  reason: { rw: "Impamvu", en: "Reason" },
  purchaseDone: { rw: "Ibyaguzwe byanditswe!", en: "Purchase recorded!" },
  productNotMatched: { rw: "Iki gicuruzwa nticyabonetse mu bubiko", en: "This product is not in your catalogue" },
  stockNow: { rw: "Ububiko ubu", en: "Stock now" },

  advisor: { rw: "Inama z'ubucuruzi", en: "Business Advisor" },
  shopToday: { rw: "Duka ryawe uyu munsi", en: "Your Shop Today" },
  seeMore: { rw: "Reba byinshi", en: "See more" },
  refresh: { rw: "Vugurura", en: "Refresh" },
  adviceSeen: { rw: "Nabyumvise", en: "Got it" },
  adviceFrequency: { rw: "Inama z'ubucuruzi", en: "Business advice" },
  daily: { rw: "Buri munsi", en: "Daily" },
  weekly: { rw: "Buri cyumweru", en: "Weekly" },
  monthly: { rw: "Buri kwezi", en: "Monthly" },
  off: { rw: "Ntizigaragare", en: "Off" },
  lastWeek: { rw: "Icyumweru gishize", en: "Last week" },
  lastMonth: { rw: "Ukwezi gushize", en: "Last month" },
  grossProfit30: { rw: "Inyungu (iminsi 30)", en: "Gross profit (30 days)" },
  listen: { rw: "Umva", en: "Listen" },
  sell: { rw: "Gurisha", en: "Sell" },
  chooseProduct: { rw: "Hitamo igicuruzwa", en: "Choose product" },
  paymentMethod: { rw: "Uburyo bwo kwishyura", en: "Payment method" },
  noPermission: { rw: "Nta burenganzira ufite kuri iki gikorwa.", en: "You don't have permission for this." },
};

type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: keyof typeof dict) => string };
const LangContext = React.createContext<Ctx>({ lang: "rw", setLang: () => {}, t: (k) => dict[k]?.rw ?? String(k) });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>("rw");

  React.useEffect(() => {
    const stored = window.localStorage.getItem("dukasmart-lang");
    if (stored === "rw" || stored === "en") setLangState(stored);
  }, []);

  const setLang = React.useCallback((l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("dukasmart-lang", l);
  }, []);

  const t = React.useCallback((k: keyof typeof dict) => dict[k]?.[lang] ?? String(k), [lang]);

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useT() {
  return React.useContext(LangContext);
}