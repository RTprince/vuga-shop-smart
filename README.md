# Duka Smart Manager

Build a production-quality MVP web application called "DukaSmart" for small retail, grocery, and hardware businesses in Rwanda.
==================================================
1. PRODUCT VISION
==================================================
DukaSmart is a simple business operating tool that helps small-shop owners and salespeople manage products, purchases, sales, inventory, and business records without the repetitive manual work of Excel.
The main problem:
A small shop may have 100+ products, with dozens or hundreds of units per product. Recording purchases, sales, stock movements, prices, and product information manually is boring, slow, and error-prone.
The product must make the daily workflow:
RECEIVE STOCK → RECORD PURCHASE → UPDATE STOCK → SELL PRODUCT → UPDATE STOCK → REVIEW BUSINESS
as fast and simple as possible.
The application is designed for users with limited digital literacy.
The interface must feel simpler than traditional accounting or ERP software.
==================================================
2. CORE PRODUCT PRINCIPLE
==================================================
Prioritize reducing manual typing and repetitive work.
The MVP should focus on:
1. Fast product management
2. Fast sales entry
3. Fast purchase/stock entry
4. Voice commands
5. Barcode scanning
6. Invoice/receipt photo capture
7. Excel/CSV import
8. Automatic inventory updates
9. Low-stock alerts
10. Simple business reports
DO NOT make AI business advice the main feature of the MVP.
A future AI business assistant can be added later.
==================================================
3. TARGET USERS
==================================================
Primary users:
- Small retail shop owners
- Hardware shop owners
- Grocery shop owners
- Small wholesalers
- Shop salespeople/cashiers
- Business managers
Users may have limited computer skills.
The application should be:
- mobile-first
- simple
- fast
- visual
- easy to understand
- Kinyarwanda-first
==================================================
4. LANGUAGE
==================================================
Primary language: Kinyarwanda.
Secondary language: English.
Add a language toggle.
Use simple, natural Kinyarwanda.
Examples:
Dashboard = Ahabanza
Products = Ibicuruzwa
Sales = Igurisha
Purchases = Ibyaguzwe
Inventory = Ububiko
Add Product = Ongeramo igicuruzwa
New Sale = Igurisha rishya
Receive Stock = Injiza ibicuruzwa bishya
Scan Invoice = Fata ifoto y'inyemezabuguzi
Take Photo = Fata ifoto
Voice = Vuga
Confirm = Emeza
Edit = Hindura
Delete = Siba
Cancel = Hagarika
Low Stock = Ibicuruzwa biri hafi kurangira
Reports = Raporo
Do not use complicated accounting language.
==================================================
5. AUTHENTICATION
==================================================
Create:
- Sign up
- Login
- Logout
- Forgot password
- Business setup
- User profile
- Business profile
Each user belongs to one business/shop.
Support multiple staff members inside one business.
Roles:
OWNER
MANAGER
SALESPERSON
Implement role-based permissions.
Examples:
OWNER:
- full access
MANAGER:
- inventory
- purchases
- sales
- reports
- approved product changes
SALESPERSON:
- sales
- stock lookup
- limited product actions
==================================================
6. DATABASE & BACKEND
==================================================
Use Supabase.
Use:
- Supabase Authentication
- PostgreSQL
- Supabase Storage
- Row Level Security
- server-side functions where needed
Create a clean relational database.
Suggested tables:
businesses
users
business_users
products
product_categories
suppliers
purchases
purchase_items
sales
sale_items
inventory_movements
invoices
invoice_items
voice_commands
audit_logs
business_settings
Each record must contain business ownership information where appropriate.
IMPORTANT SECURITY RULE:
A user must ONLY be able to access data belonging to their authorized business.
Implement Row Level Security correctly.
Never expose another business's data.
==================================================
7. PRODUCT MANAGEMENT
==================================================
Create a product management system.
Each product should support:
- Product name
- Product image
- SKU/code
- Barcode
- Category
- Unit
- Purchase price
- Selling price
- Current stock
- Minimum stock level
- Supplier
- Created date
- Updated date
Actions:
- Add
- Edit
- Delete
- Search
- Filter
- Sort
- View product details
- View product history
The application must support 1,000+ products without becoming slow.
DO NOT require the user to scroll through hundreds of products.
Use:
- fast search
- autocomplete
- barcode scanning
- category filtering
- recently used products
- favorites/frequently sold products
==================================================
8. BULK EXCEL / CSV IMPORT
==================================================
Allow users to upload:
- Excel files
- CSV files
Use a column-mapping workflow.
Example:
Uploaded column:
Product Name → System field: Product Name
Uploaded column:
Qty → System field: Quantity
Uploaded column:
Buy Price → System field: Purchase Price
Uploaded column:
Sell Price → System field: Selling Price
Before importing:
1. Read file
2. Analyze columns
3. Show preview
4. Detect errors
5. Detect duplicates
6. Allow corrections
7. Confirm import
Validation:
- missing product names
- invalid quantities
- invalid prices
- duplicate products
- missing required fields
The goal is to allow a shop with 100+ products to import them quickly instead of entering each product manually.
==================================================
9. VOICE-FIRST BUSINESS COMMANDS
==================================================
THIS IS A CORE MVP FEATURE.
Add a large microphone button throughout the application.
Users should be able to speak naturally in Kinyarwanda or English.
The system should convert the speech into a structured business command.
IMPORTANT:
This must be VOICE-TO-ACTION, not only voice-to-text.
Supported initial actions:
1. Add product
2. Record sale
3. Record purchase
4. Check stock
5. Update product/price
Examples:
User says:
"Ongeramo Coca Cola, mfite 24, naguze kuri 500, nzayigurisha 700."
Interpret as:
CREATE_PRODUCT
name = Coca Cola
quantity = 24
purchase_price = 500
selling_price = 700
User says:
"Ndagurishije Coca Cola ebyiri."
Interpret as:
CREATE_SALE
product = Coca Cola
quantity = 2
User says:
"Coca Cola mfite zingahe?"
Interpret as:
GET_STOCK
product = Coca Cola
User says:
"Hindura igiciro cya Coca Cola kibe 750."
Interpret as:
UPDATE_PRODUCT
product = Coca Cola
selling_price = 750
User says:
"Naguze imifuka 20 ya sima kuri 12,000."
Interpret as:
CREATE_PURCHASE
product = Sima
quantity = 20
purchase_price = 12000
==================================================
10. VOICE CONFIRMATION SAFETY
==================================================
Never immediately execute important actions from voice.
For actions involving:
- creating products
- changing prices
- recording purchases
- recording sales
- deleting products
- changing inventory
the system must:
1. Capture voice
2. Transcribe speech
3. Interpret the command
4. Convert it into structured fields
5. Show a confirmation card
6. Ask the user to confirm
7. Only then write to the database
Example:
"Nabonye ko ushaka:
Coca Cola
Quantity: 24
Purchase price: 500 RWF
Selling price: 700 RWF
Emeza?"
Buttons:
[ EMEZA ]
[ HINDURA ]
[ HAGARIKA ]
If the user selects HINDURA, allow manual editing or another voice command.
If uncertain about the command, DO NOT guess.
Ask for clarification.
==================================================
11. VOICE ACTION ARCHITECTURE
==================================================
Keep the voice processing architecture modular.
Separate:
VOICE INPUT
→ SPEECH-TO-TEXT
→ COMMAND INTERPRETATION
→ STRUCTURED ACTION
→ VALIDATION
→ USER CONFIRMATION
→ DATABASE ACTION
Do NOT allow an LLM or speech model to directly execute arbitrary database queries.
All business actions must use validated application functions.
Examples:
createProduct()
updateProduct()
deleteProduct()
createSale()
createPurchase()
getStock()
updatePrice()
The speech provider must be replaceable later.
Keep the voice service abstract.
==================================================
12. VOICE AUDIT LOG
==================================================
Store a voice action history.
For each voice action save:
- user
- business
- timestamp
- original transcription
- interpreted command
- structured action
- confirmation status
- final result
- error if applicable
This is useful for debugging and trust.
==================================================
13. SALES / POINT OF SALE
==================================================
Create a fast sales interface.
The salesperson should be able to:
1. Search product
2. Scan barcode
3. Select product
4. Select quantity
5. Add to cart
6. Confirm sale
The sales interface must minimize typing.
Support:
- barcode scanning by phone camera
- fast search
- recently sold products
- favorites
- product suggestions
- cart
- quantity adjustment
Payment methods:
- Cash
- Mobile Money
- Bank
- Other
When a sale is completed:
- create sale
- create sale items
- reduce inventory automatically
- save user/salesperson
- save date/time
- calculate total
==================================================
14. BARCODE SCANNING
==================================================
Use the phone camera to scan barcodes.
When a barcode is scanned:
1. Search the product database
2. If found, show product
3. If not found, offer:
   - Add new product
   - Search manually
   - Cancel
Barcode scanning should work on supported mobile browsers.
==================================================
15. PURCHASE / STOCK RECEIVING
==================================================
Create a "Receive Stock" workflow.
Manual workflow:
- Supplier
- Product
- Quantity
- Purchase price
- Date
- Invoice number
After confirmation:
- create purchase
- create purchase items
- increase stock
- create inventory movement
==================================================
16. INVOICE / RECEIPT PHOTO SCANNING
==================================================
Add:
"Fata ifoto y'inyemezabuguzi"
The user can:
- open phone camera
- take a photo
- upload existing invoice image
- retake image
- preview image
Use OCR to extract:
- supplier name
- invoice number
- date
- product name
- quantity
- unit price
- total
IMPORTANT:
OCR results must NEVER be saved blindly.
Use:
PHOTO
→ OCR
→ EXTRACTED DATA
→ REVIEW SCREEN
→ USER CONFIRMATION
→ DATABASE
Example:
Supplier:
ABC Ltd
Product:
Cement
Quantity:
20
Unit price:
12,000 RWF
Total:
240,000 RWF
Buttons:
[ EMEZA ]
[ HINDURA ]
If OCR fails, provide manual entry.
IMPORTANT DEVELOPMENT FALLBACK:
If no real OCR provider is configured yet, create a clean OCR service interface and realistic mock extraction so the entire workflow can be tested in the MVP.
==================================================
17. INVENTORY ENGINE
==================================================
Inventory must update automatically.
Example:
Purchase:
20 units
Current stock:
80
New stock:
100
Sale:
3 units
Current stock:
100
New stock:
97
Maintain inventory movement records.
Each movement should store:
- product
- movement type
- quantity
- previous stock
- new stock
- related sale/purchase
- user
- timestamp
Movement types:
PURCHASE
SALE
ADJUSTMENT
RETURN
INITIAL_STOCK
==================================================
18. LOW STOCK ALERTS
==================================================
Each product has:
minimum_stock_level
When:
current_stock <= minimum_stock_level
show a low-stock warning.
Dashboard example:
Cement
Stock: 8
Minimum: 10
"Cement iri hafi kurangira."
Also show:
- out-of-stock products
- low-stock products
==================================================
19. PRODUCT HISTORY
==================================================
For every product show:
- current stock
- purchase history
- sales history
- stock movements
- purchase price history
- selling price history
- supplier
- last sale
- last purchase
==================================================
20. BUSINESS DASHBOARD
==================================================
Build a simple dashboard.
Show:
TODAY'S SALES
TODAY'S PURCHASES
CURRENT STOCK VALUE
LOW-STOCK PRODUCTS
OUT-OF-STOCK PRODUCTS
TOP-SELLING PRODUCTS
RECENT SALES
RECENT PURCHASES
Large primary actions:
[ IGURISHA RISHYA ]
[ INJIZA IBICURUZWA ]
[ FATA IFOTO ]
[ 🎤 VUGA ]
The dashboard must prioritize actions over complicated charts.
==================================================
21. REPORTS
==================================================
Create simple reports.
Reports:
- Sales by day
- Sales by product
- Purchases by supplier
- Purchase history
- Inventory movement
- Best-selling products
- Slow-moving products
- Low-stock products
Allow:
- today
- this week
- this month
- custom date range
Use simple visualizations.
Do not make this look like enterprise accounting software.
==================================================
22. FUTURE AI BUSINESS ASSISTANT
==================================================
Create the architecture for a future AI assistant, but keep it lightweight in the MVP.
Page name:
"Umufasha w'Ubucuruzi"
Future questions could include:
"Ni ibihe bicuruzwa bigurishwa cyane?"
"Ni ibihe biri hafi kurangira?"
"Ni ibihe bicuruzwa bitagurishwa cyane?"
"Ni iki naguze cyane muri iki cyumweru?"
"Ni gute igurisha rihagaze?"
For now, create the UI and data-service architecture without requiring expensive AI functionality.
The future assistant must ONLY access the authenticated business's own data.
==================================================
23. ROLE-BASED SECURITY
==================================================
OWNER:
Full access.
MANAGER:
Access to products, inventory, purchases, sales, reports.
SALESPERSON:
Access to sales, stock lookup, and approved product actions.
Delete operations and sensitive changes should require owner/manager permission.
==================================================
24. BUSINESS DATA PRIVACY
==================================================
Treat business data as private.
Do not expose data publicly.
Do not display one business's information to another business.
Use:
- Supabase RLS
- secure storage
- authenticated requests
- role checks
- audit logging
Users must clearly understand that their data belongs to their business account.
==================================================
25. PERFORMANCE
==================================================
The app must remain fast with:
- 1,000+ products
- thousands of sales
- thousands of purchases
- large inventory movement history
Use:
- database indexes
- pagination
- server-side filtering
- efficient search
- lazy loading
- optimized queries
Do NOT load every product record into the browser at once.
==================================================
26. MOBILE-FIRST UX
==================================================
Most users will use a smartphone.
Design primarily for mobile.
Use:
- large touch targets
- simple navigation
- large microphone button
- camera access
- large search field
- minimal typing
- clear confirmation dialogs
- simple cards
- simple tables
- responsive layouts
The application should also work well on desktop.
==================================================
27. USER EXPERIENCE PHILOSOPHY
==================================================
The user should not feel like they are using accounting software.
They should feel like:
"I just tell the system what happened, and it records it."
Examples:
VOICE:
"Ndagurishije Coca Cola ebyiri."
SCAN:
Scan barcode → Product appears → Enter quantity → Confirm sale.
INVOICE:
Take invoice photo → Extract data → Review → Confirm → Stock updates.
EXCEL:
Upload file → Map columns → Preview → Import.
The objective is to eliminate unnecessary typing.
==================================================
28. ERROR HANDLING
==================================================
Never silently fail.
Examples:
If barcode not found:
"Ntiturabona iki gicuruzwa."
If OCR confidence is low:
"Reba neza amakuru twakuye kuri iyi foto."
If stock is insufficient:
"Ububiko ntabwo buhagije."
If voice command is unclear:
"Sinabyumvise neza. Wongeye kubivuga?"
Always provide a clear next action.
==================================================
29. MVP SCOPE
==================================================
The first MVP must include:
AUTH
- login
- signup
- business setup
- roles
PRODUCTS
- add
- edit
- delete
- search
- categories
- barcode
- stock level
SALES
- fast sales
- search
- barcode scanning
- cart
- automatic stock reduction
PURCHASES
- receive stock
- supplier
- manual purchase entry
- automatic stock increase
VOICE
- add product
- record sale
- record purchase
- check stock
- update price
- confirmation workflow
INVOICE SCANNING
- photo upload
- OCR interface
- extracted data review
- confirmation
- stock update
IMPORT
- Excel/CSV upload
- column mapping
- preview
- validation
- import
REPORTS
- sales
- purchases
- inventory
- low stock
- top products
SECURITY
- Supabase Auth
- RLS
- role permissions
- audit logs
==================================================
30. DO NOT BUILD YET
==================================================
Do not build:
- RRA integration
- automatic tax filing
- bank integration
- Mobile Money API integration
- complex accounting
- payroll
- loans
- advanced forecasting
- autonomous AI business decisions
- complicated ERP features
These belong to future phases.
==================================================
31. BUILD ORDER
==================================================
Build in this order:
PHASE 1
Authentication
Business setup
Database
Roles
Product management
PHASE 2
Sales
Inventory
Barcode scanning
Fast search
PHASE 3
Purchases
Supplier management
Invoice photo upload
OCR review workflow
PHASE 4
Voice commands
Voice confirmation
Voice audit logs
PHASE 5
Excel/CSV import
Reports
Low-stock alerts
PHASE 6
UX polishing
Kinyarwanda refinement
Performance optimization
Demo data
Testing
==================================================
32. DEMO DATA
==================================================
Generate realistic demo data for a Rwandan small shop.
Include at least:
100 products
Examples:
- Cement
- Nails
- Paint
- Sugar
- Rice
- Cooking oil
- Soap
- Water
- Coca Cola
- Fanta
- Biscuits
- Batteries
- Electrical cables
- Light bulbs
Generate:
- realistic prices
- categories
- stock levels
- suppliers
- sample purchases
- sample sales
This is important so the MVP can immediately be demonstrated to a shop owner.
==================================================
33. SUCCESS CRITERIA
==================================================
A shop owner should be able to:
1. Import 100+ products from Excel
2. Search any product quickly
3. Add a product using voice
4. Record a sale using voice
5. Record a purchase using voice
6. Scan a barcode
7. Take a photo of an invoice
8. Review extracted invoice information
9. Confirm the purchase
10. Automatically update stock
11. See low-stock products
12. See sales reports
13. Use the app primarily in Kinyarwanda
14. Use the app comfortably on a smartphone
PRIMARY SUCCESS TEST:
A salesperson should be able to record a normal sale in only a few seconds.
A shop owner should be able to receive stock from an invoice with dramatically less typing than Excel.
==================================================
34. DESIGN STYLE
==================================================
Create a clean, modern, trustworthy interface.
Avoid:
- complicated enterprise UI
- excessive charts
- too many menus
- dense forms
- unnecessary animations
Prioritize:
- clarity
- speed
- simplicity
- large actions
- useful information
- mobile usability
The most important buttons on the dashboard should be:
IGURISHA RISHYA
INJIZA IBICURUZWA
FATA IFOTO
🎤 VUGA
==================================================
35. FINAL IMPLEMENTATION REQUIREMENT
==================================================
Build this as a real functional MVP, not a static mockup.
Use real Supabase database operations for the core functionality.
Create reusable components.
Keep OCR, speech recognition, barcode scanning, and AI services modular so external providers can be added or replaced later.
Where an external API is not yet configured, use a clean mock service with clear TODO comments and realistic behavior so the MVP remains demonstrable.
Prioritize working core workflows over visual complexity.
The final result should allow me to demonstrate the product to a real small-shop owner and observe whether it actually reduces the time required to manage products, purchases, sales, and inventory.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a4d70114-8e96-4131-801c-1d895d08a191).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
