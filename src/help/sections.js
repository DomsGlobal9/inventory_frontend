/**
 * The guide's menu. It mirrors the app: the same sections, in the order of the app's own menu, and Settings
 * in the order of its tabs, so a reader finds a guide where they find the screen. Each page is
 * content/<section id>/<page>.md; a page listed here with no file yet is left out of the menu.
 *
 * `titles` / `blurbs` carry the section's name and one-line description in other languages. Names that are
 * the app's own menu words (Dashboard, Products...) keep the English word too, so a reader can match them
 * with the app, which is in English.
 */
export const SECTIONS = [
  { id: 'start', title: 'Start here', icon: 'Compass',
    blurb: 'Sign in, find your way around, and what to do on day one.',
    titles: { te: 'ఇక్కడ మొదలుపెట్టండి', hi: 'यहाँ से शुरू करें', ta: 'இங்கே தொடங்குங்கள்', kn: 'ಇಲ್ಲಿಂದ ಆರಂಭಿಸಿ' },
    blurbs: {
      te: 'సైన్ ఇన్, స్క్రీన్‌లో దారి తెలుసుకోవడం, మొదటి రోజు ఏమి చేయాలి.',
      hi: 'साइन इन, स्क्रीन पर रास्ता ढूँढना, और पहले दिन क्या करें।',
      ta: 'உள்நுழைதல், திரையில் வழி அறிதல், முதல் நாளில் என்ன செய்வது.',
      kn: 'ಸೈನ್ ಇನ್, ಸ್ಕ್ರೀನ್‌ನಲ್ಲಿ ದಾರಿ ತಿಳಿಯುವುದು, ಮೊದಲ ದಿನ ಏನು ಮಾಡಬೇಕು.'
    },
    pages: ['welcome', 'sign-in', 'find-your-way', 'first-day', 'more-than-one-store', 'barcode-scanner'] },
  { id: 'dashboard', title: 'Dashboard', icon: 'LayoutDashboard',
    blurb: 'What the tiles and charts on your first screen mean.',
    titles: { te: 'Dashboard (డాష్‌బోర్డ్)', hi: 'Dashboard (डैशबोर्ड)', ta: 'Dashboard (டாஷ்போர்டு)', kn: 'Dashboard (ಡ್ಯಾಶ್‌ಬೋರ್ಡ್)' },
    blurbs: {
      te: 'మొదటి స్క్రీన్‌లోని టైల్స్, చార్ట్‌ల అర్థం.',
      hi: 'पहली स्क्रीन की टाइल्स और चार्ट का मतलब।',
      ta: 'முதல் திரையில் உள்ள டைல்கள், சார்ட்களின் பொருள்.',
      kn: 'ಮೊದಲ ಸ್ಕ್ರೀನ್‌ನ ಟೈಲ್‌ಗಳು ಮತ್ತು ಚಾರ್ಟ್‌ಗಳ ಅರ್ಥ.'
    },
    pages: ['dashboard'] },
  { id: 'products', title: 'Products', icon: 'Package',
    blurb: 'Add, import, price and publish what you sell.',
    titles: { te: 'Products (ప్రొడక్ట్‌లు)', hi: 'Products (प्रोडक्ट)', ta: 'Products (பொருட்கள்)', kn: 'Products (ಪ್ರಾಡಕ್ಟ್‌ಗಳು)' },
    blurbs: {
      te: 'మీరు అమ్మే వస్తువులను జోడించండి, దిగుమతి చేయండి, ధర పెట్టండి, పబ్లిష్ చేయండి.',
      hi: 'जो आप बेचते हैं उसे जोड़ें, इम्पोर्ट करें, कीमत रखें और पब्लिश करें।',
      ta: 'நீங்கள் விற்பவற்றைச் சேர்க்கவும், இறக்குமதி செய்யவும், விலை வைக்கவும், வெளியிடவும்.',
      kn: 'ನೀವು ಮಾರುವುದನ್ನು ಸೇರಿಸಿ, ಇಂಪೋರ್ಟ್ ಮಾಡಿ, ಬೆಲೆ ಇಡಿ ಮತ್ತು ಪಬ್ಲಿಷ್ ಮಾಡಿ.'
    },
    pages: ['add-a-product', 'import-products', 'bulk-updates', 'variants-and-barcodes', 'product-page', 'price-per-store', 'photos', 'try-on-qr-code', 'publish-archive-delete'] },
  { id: 'orders', title: 'Orders', icon: 'ShoppingBag',
    blurb: 'Counter sales, receipts, and sending out online orders.',
    titles: { te: 'Orders (ఆర్డర్‌లు)', hi: 'Orders (ऑर्डर)', ta: 'Orders (ஆர்டர்கள்)', kn: 'Orders (ಆರ್ಡರ್‌ಗಳು)' },
    blurbs: {
      te: 'కౌంటర్ సేల్స్, రసీదులు, ఆన్‌లైన్ ఆర్డర్‌లు పంపడం.',
      hi: 'काउंटर बिक्री, रसीद, और ऑनलाइन ऑर्डर भेजना।',
      ta: 'கவுண்டர் விற்பனை, ரசீதுகள், ஆன்லைன் ஆர்டர்களை அனுப்புதல்.',
      kn: 'ಕೌಂಟರ್ ಮಾರಾಟ, ರಸೀದಿಗಳು, ಆನ್‌ಲೈನ್ ಆರ್ಡರ್‌ಗಳನ್ನು ಕಳುಹಿಸುವುದು.'
    },
    pages: ['new-sale', 'receipts', 'find-an-order', 'send-online-orders', 'cancel-an-order'] },
  { id: 'returns', title: 'Returns', icon: 'Undo2',
    blurb: 'Book in what customers bring back, check it and finish it.',
    titles: { te: 'Returns (రిటర్న్‌లు)', hi: 'Returns (रिटर्न)', ta: 'Returns (ரிட்டர்ன்கள்)', kn: 'Returns (ರಿಟರ್ನ್‌ಗಳು)' },
    blurbs: {
      te: 'కస్టమర్ తిరిగి తెచ్చినవి నమోదు చేసి, తనిఖీ చేసి, పూర్తి చేయండి.',
      hi: 'ग्राहक जो वापस लाए उसे दर्ज करें, जाँचें और पूरा करें।',
      ta: 'வாடிக்கையாளர் திருப்பிக் கொண்டுவருவதைப் பதிவு செய்து, சரிபார்த்து, முடிக்கவும்.',
      kn: 'ಗ್ರಾಹಕರು ಹಿಂದಿರುಗಿಸಿದ್ದನ್ನು ದಾಖಲಿಸಿ, ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಮುಗಿಸಿ.'
    },
    pages: ['take-a-return', 'book-a-return', 'finish-a-return'] },
  { id: 'inventory', title: 'Inventory', icon: 'Boxes',
    blurb: 'See, add, remove, correct and count your stock.',
    titles: { te: 'Inventory (స్టాక్)', hi: 'Inventory (स्टॉक)', ta: 'Inventory (ஸ்டாக்)', kn: 'Inventory (ಸ್ಟಾಕ್)' },
    blurbs: {
      te: 'మీ స్టాక్ చూడండి, జోడించండి, తీసివేయండి, సరిచేయండి, లెక్కించండి.',
      hi: 'अपना स्टॉक देखें, जोड़ें, निकालें, सही करें और गिनें।',
      ta: 'உங்கள் ஸ்டாக்கைப் பார்க்கவும், சேர்க்கவும், நீக்கவும், சரிசெய்யவும், எண்ணவும்.',
      kn: 'ನಿಮ್ಮ ಸ್ಟಾಕ್ ನೋಡಿ, ಸೇರಿಸಿ, ತೆಗೆಯಿರಿ, ಸರಿಪಡಿಸಿ ಮತ್ತು ಎಣಿಸಿ.'
    },
    pages: ['see-your-stock', 'add-stock', 'remove-stock', 'correct-stock', 'stock-history', 'low-stock-alerts', 'stock-counts'] },
  { id: 'shelves', title: 'Shelves', icon: 'MapPinned',
    blurb: 'Know exactly which shelf every piece is on.',
    titles: { te: 'Shelves (షెల్ఫ్‌లు)', hi: 'Shelves (शेल्फ़)', ta: 'Shelves (அலமாரிகள்)', kn: 'Shelves (ಶೆಲ್ಫ್‌ಗಳು)' },
    blurbs: {
      te: 'ప్రతి పీస్ ఏ షెల్ఫ్‌లో ఉందో కచ్చితంగా తెలుసుకోండి.',
      hi: 'हर पीस किस शेल्फ़ पर है, ठीक-ठीक जानें।',
      ta: 'ஒவ்வொரு பொருளும் எந்த அலமாரியில் உள்ளது என்று சரியாகத் தெரிந்துகொள்ளுங்கள்.',
      kn: 'ಪ್ರತಿ ಪೀಸ್ ಯಾವ ಶೆಲ್ಫ್‌ನಲ್ಲಿದೆ ಎಂದು ನಿಖರವಾಗಿ ತಿಳಿಯಿರಿ.'
    },
    pages: ['how-shelves-work', 'set-up-racks', 'fill-shelves', 'put-away', 'where-is-it', 'move', 'pick', 'count', 'shelf-issues', 'map'] },
  { id: 'transfers', title: 'Transfers', icon: 'ArrowLeftRight',
    blurb: 'Move stock between your stores and godowns.',
    titles: { te: 'Transfers (ట్రాన్స్‌ఫర్‌లు)', hi: 'Transfers (ट्रांसफ़र)', ta: 'Transfers (டிரான்ஸ்ஃபர்கள்)', kn: 'Transfers (ಟ್ರಾನ್ಸ್‌ಫರ್‌ಗಳು)' },
    blurbs: {
      te: 'మీ షాప్‌లు, గోడౌన్‌ల మధ్య స్టాక్ తరలించండి.',
      hi: 'अपनी दुकानों और गोदामों के बीच स्टॉक भेजें।',
      ta: 'உங்கள் கடைகள், கிடங்குகளுக்கு இடையே ஸ்டாக்கை மாற்றவும்.',
      kn: 'ನಿಮ್ಮ ಅಂಗಡಿಗಳು ಮತ್ತು ಗೋಡೌನ್‌ಗಳ ನಡುವೆ ಸ್ಟಾಕ್ ಸಾಗಿಸಿ.'
    },
    pages: ['transfers'] },
  { id: 'purchase-orders', title: 'Purchase Orders', icon: 'FileText',
    blurb: 'Order from suppliers and receive deliveries.',
    titles: { te: 'Purchase Orders (కొనుగోలు ఆర్డర్‌లు)', hi: 'Purchase Orders (खरीद ऑर्डर)', ta: 'Purchase Orders (கொள்முதல் ஆர்டர்கள்)', kn: 'Purchase Orders (ಖರೀದಿ ಆರ್ಡರ್‌ಗಳು)' },
    blurbs: {
      te: 'సప్లయర్‌ల దగ్గర ఆర్డర్ చేసి, డెలివరీలు స్వీకరించండి.',
      hi: 'सप्लायर से ऑर्डर करें और डिलीवरी लें।',
      ta: 'சப்ளையர்களிடம் ஆர்டர் செய்து, டெலிவரிகளைப் பெறுங்கள்.',
      kn: 'ಸಪ್ಲೈಯರ್‌ಗಳಿಂದ ಆರ್ಡರ್ ಮಾಡಿ ಮತ್ತು ಡೆಲಿವರಿ ಸ್ವೀಕರಿಸಿ.'
    },
    pages: ['create-a-purchase-order', 'receive-a-delivery', 'suppliers', 'reorder'] },
  { id: 'offers', title: 'Offers', icon: 'Tag',
    blurb: 'Sales, discount codes and discounts at the counter.',
    titles: { te: 'Offers (ఆఫర్‌లు)', hi: 'Offers (ऑफ़र)', ta: 'Offers (சலுகைகள்)', kn: 'Offers (ಆಫರ್‌ಗಳು)' },
    blurbs: {
      te: 'సేల్స్, డిస్కౌంట్ కోడ్‌లు, కౌంటర్ దగ్గర డిస్కౌంట్‌లు.',
      hi: 'सेल, डिस्काउंट कोड और काउंटर पर डिस्काउंट।',
      ta: 'சேல்கள், தள்ளுபடி கோடுகள், கவுண்டரில் தள்ளுபடிகள்.',
      kn: 'ಸೇಲ್‌ಗಳು, ಡಿಸ್ಕೌಂಟ್ ಕೋಡ್‌ಗಳು ಮತ್ತು ಕೌಂಟರ್‌ನಲ್ಲಿ ಡಿಸ್ಕೌಂಟ್‌ಗಳು.'
    },
    pages: ['how-offers-work', 'create-an-offer', 'offer-codes', 'manage-offers', 'till-rules', 'offers-on-shopify'] },
  { id: 'customers', title: 'Customers', icon: 'Users',
    blurb: 'Your customers, their orders and groups.',
    titles: { te: 'Customers (కస్టమర్‌లు)', hi: 'Customers (ग्राहक)', ta: 'Customers (வாடிக்கையாளர்கள்)', kn: 'Customers (ಗ್ರಾಹಕರು)' },
    blurbs: {
      te: 'మీ కస్టమర్‌లు, వారి ఆర్డర్‌లు, గ్రూప్‌లు.',
      hi: 'आपके ग्राहक, उनके ऑर्डर और ग्रुप।',
      ta: 'உங்கள் வாடிக்கையாளர்கள், அவர்களின் ஆர்டர்கள், குழுக்கள்.',
      kn: 'ನಿಮ್ಮ ಗ್ರಾಹಕರು, ಅವರ ಆರ್ಡರ್‌ಗಳು ಮತ್ತು ಗುಂಪುಗಳು.'
    },
    pages: ['customers', 'loyalty-points'] },
  { id: 'campaigns', title: 'Campaigns', icon: 'Megaphone',
    blurb: 'Offers and wishes to your customers on WhatsApp.',
    titles: { te: 'Campaigns (క్యాంపెయిన్‌లు)', hi: 'Campaigns (कैंपेन)', ta: 'Campaigns (கேம்பெயின்கள்)', kn: 'Campaigns (ಕ್ಯಾಂಪೇನ್‌ಗಳು)' },
    blurbs: {
      te: 'WhatsApp లో మీ కస్టమర్‌లకు ఆఫర్‌లు, శుభాకాంక్షలు.',
      hi: 'WhatsApp पर आपके ग्राहकों को ऑफ़र और शुभकामनाएँ।',
      ta: 'WhatsApp இல் உங்கள் வாடிக்கையாளர்களுக்கு ஆஃபர்களும் வாழ்த்துகளும்.',
      kn: 'WhatsApp ನಲ್ಲಿ ನಿಮ್ಮ ಗ್ರಾಹಕರಿಗೆ ಆಫರ್‌ಗಳು ಮತ್ತು ಶುಭಾಶಯಗಳು.'
    },
    pages: ['whatsapp-campaigns'] },
  { id: 'online-shop', title: 'Online shop', icon: 'Globe',
    blurb: 'Your own shop on the web: open it, share the link, and take orders.',
    titles: { te: 'Online shop (ఆన్‌లైన్ షాప్)', hi: 'Online shop (ऑनलाइन दुकान)', ta: 'Online shop (ஆன்லைன் கடை)', kn: 'Online shop (ಆನ್‌ಲೈನ್ ಅಂಗಡಿ)' },
    blurbs: {
      te: 'వెబ్‌లో మీ సొంత షాప్: తెరవండి, లింక్ పంచుకోండి, ఆర్డర్‌లు తీసుకోండి.',
      hi: 'वेब पर आपकी अपनी दुकान: खोलें, लिंक भेजें और ऑर्डर लें।',
      ta: 'இணையத்தில் உங்கள் சொந்தக் கடை: திறக்கவும், இணைப்பைப் பகிரவும், ஆர்டர்களைப் பெறவும்.',
      kn: 'ವೆಬ್‌ನಲ್ಲಿ ನಿಮ್ಮದೇ ಅಂಗಡಿ: ತೆರೆಯಿರಿ, ಲಿಂಕ್ ಹಂಚಿಕೊಳ್ಳಿ ಮತ್ತು ಆರ್ಡರ್‌ಗಳನ್ನು ಸ್ವೀಕರಿಸಿ.'
    },
    // The order somebody actually does it in: understand it, open it, dress it, share it, then
    // sell from it -- and the pages about what customers do come after the shop exists.
    pages: ['how-your-shop-works', 'open-your-shop', 'what-customers-see', 'shop-banners', 'share-your-shop', 'taking-orders', 'your-details-and-returns', 'colour-photos', 'filters-customers-use', 'orders-and-alerts', 'who-is-waiting'] },
  { id: 'settings', title: 'Settings', icon: 'Settings',
    blurb: 'Shop details, stores, catalog, Day Book, team, roles and connections.',
    titles: { te: 'Settings (సెట్టింగ్‌లు)', hi: 'Settings (सेटिंग्स)', ta: 'Settings (அமைப்புகள்)', kn: 'Settings (ಸೆಟ್ಟಿಂಗ್‌ಗಳು)' },
    blurbs: {
      te: 'షాప్ వివరాలు, స్టోర్‌లు, క్యాటలాగ్, Day Book, టీమ్, రోల్స్, కనెక్షన్‌లు.',
      hi: 'दुकान की जानकारी, स्टोर, कैटलॉग, Day Book, टीम, रोल और कनेक्शन।',
      ta: 'கடை விவரங்கள், ஸ்டோர்கள், கேட்டலாக், Day Book, குழு, ரோல்கள், இணைப்புகள்.',
      kn: 'ಅಂಗಡಿ ವಿವರಗಳು, ಸ್ಟೋರ್‌ಗಳು, ಕ್ಯಾಟಲಾಗ್, Day Book, ತಂಡ, ರೋಲ್‌ಗಳು ಮತ್ತು ಸಂಪರ್ಕಗಳು.'
    },
    // In the order of the Settings tabs: General Info, Catalog Configuration, Stock Locations, Day Book,
    // Storefront, APIs & Services, Team & Users, Roles & Permissions, Help & Support.
    pages: ['shop-details', 'your-password', 'catalog-settings', 'locations', 'day-book', 'whatsapp', 'connect-shopify', 'connect-website', 'apis-and-services', 'add-team-member', 'manage-team', 'roles', 'get-support'] },
  { id: 'help', title: 'Help', icon: 'LifeBuoy',
    blurb: 'Common problems, words we use, and what is new.',
    titles: { te: 'సహాయం', hi: 'सहायता', ta: 'உதவி', kn: 'ಸಹಾಯ' },
    blurbs: {
      te: 'సాధారణ సమస్యలు, మేము వాడే పదాలు, కొత్తగా వచ్చినవి.',
      hi: 'आम समस्याएँ, हमारे शब्द, और क्या नया है।',
      ta: 'பொதுவான பிரச்சினைகள், நாங்கள் பயன்படுத்தும் சொற்கள், புதியவை.',
      kn: 'ಸಾಮಾನ್ಯ ಸಮಸ್ಯೆಗಳು, ನಾವು ಬಳಸುವ ಪದಗಳು ಮತ್ತು ಹೊಸದೇನು.'
    },
    pages: ['common-problems', 'using-this-guide', 'download-and-print', 'words-we-use', 'whats-new'] }
];
