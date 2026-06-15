/* =============================================================
   WITCORP DASHBOARD - app.js
   India Advisors LLP - Full Frontend Logic
   Handles: Navigation, Theming, Data Rendering, Modals,
   Kanban, Calendar, Charts, AI Chat, Team Chat, Search, etc.
   ============================================================= */

/* =========================================================
   1. GLOBAL STATE & DUMMY DATA
   ========================================================= */

const STATE = {
  currentPage: 'dashboard',
  darkMode: false,
  sidebarOpen: false,
  notifOpen: false,
  activeTheme: 'theme-violet',
  calendar: {
    month: 4, // 0-indexed -> May
    year: 2025
  },
  pagination: {
    clients: { page: 1, perPage: 10 }
  },
  filters: {
    clients: { search: '', status: '' }
  },
  activeChatContact: 'rajesh',
  taskIdCounter: 1000
};

/* ---------- CLIENT DATA ---------- */
const CLIENTS = [
  { id: 1, name: 'ABC Pvt. Ltd.', pan: 'AAACA1234B', type: 'Company', gst: '27AAACA1234B1Z5', email: 'accounts@abcpvt.com', phone: '+91 98765 43210', status: 'Active' },
  { id: 2, name: 'XYZ Traders', pan: 'AAFXY5678C', type: 'Partnership', gst: '27AAFXY5678C1Z2', email: 'xyztraders@gmail.com', phone: '+91 91234 56780', status: 'Active' },
  { id: 3, name: 'Rajesh Kumar', pan: 'AKQPR9012D', type: 'Individual', gst: '-', email: 'rajesh.kumar@gmail.com', phone: '+91 99887 76655', status: 'Active' },
  { id: 4, name: 'Priya Patel', pan: 'BNZPP3456E', type: 'Individual', gst: '-', email: 'priya.patel@yahoo.com', phone: '+91 90011 22334', status: 'Pending' },
  { id: 5, name: 'Raj Enterprises', pan: 'AAFRE6789F', type: 'LLP', gst: '24AAFRE6789F1Z8', email: 'info@rajenterprises.in', phone: '+91 98123 45678', status: 'Active' },
  { id: 6, name: 'Sunrise Textiles LLP', pan: 'AAGST1122G', type: 'LLP', gst: '27AAGST1122G1Z1', email: 'sunrise.textiles@outlook.com', phone: '+91 99220 11334', status: 'Active' },
  { id: 7, name: 'Mehta & Sons', pan: 'AABFM4455H', type: 'Partnership', gst: '24AABFM4455H1Z7', email: 'mehtasons@rediffmail.com', phone: '+91 98700 12345', status: 'Inactive' },
  { id: 8, name: 'Neha Sharma', pan: 'CKQPN7788J', type: 'Individual', gst: '-', email: 'neha.sharma@gmail.com', phone: '+91 91122 33445', status: 'Active' },
  { id: 9, name: 'Global Exports India', pan: 'AAHGE9900K', type: 'Company', gst: '07AAHGE9900K1Z3', email: 'finance@globalexports.in', phone: '+91 98989 89898', status: 'Active' },
  { id: 10, name: 'Patel Bros Hardware', pan: 'AAEPP2233L', type: 'Partnership', gst: '24AAEPP2233L1Z9', email: 'patelbros@gmail.com', phone: '+91 99776 65544', status: 'Pending' },
  { id: 11, name: 'TechNova Solutions Pvt Ltd', pan: 'AACT4455M', type: 'Company', gst: '29AACT4455M1ZQ', email: 'admin@technova.io', phone: '+91 90123 45670', status: 'Active' },
  { id: 12, name: 'Ananya Verma', pan: 'DKQPV1111N', type: 'Individual', gst: '-', email: 'ananya.verma@gmail.com', phone: '+91 97654 32109', status: 'Active' },
  { id: 13, name: 'Krishna Agro Industries', pan: 'AAFKA7766P', type: 'LLP', gst: '23AAFKA7766P1Z4', email: 'krishnaagro@gmail.com', phone: '+91 98456 12378', status: 'Active' },
  { id: 14, name: 'Modern Furnishings', pan: 'AAGMF3322Q', type: 'Company', gst: '27AAGMF3322Q1Z6', email: 'sales@modernfurnishings.com', phone: '+91 99001 12233', status: 'Inactive' },
  { id: 15, name: 'Suresh Auto Parts', pan: 'AAESA5566R', type: 'Partnership', gst: '24AAESA5566R1Z2', email: 'sureshauto@yahoo.in', phone: '+91 98112 23344', status: 'Active' },
  { id: 16, name: 'Vikas Sharma', pan: 'EKQPV8899S', type: 'Individual', gst: '-', email: 'vikas.sharma@gmail.com', phone: '+91 91009 88776', status: 'Pending' },
  { id: 17, name: 'Bright Star Pharma', pan: 'AAHBS6677T', type: 'Company', gst: '06AAHBS6677T1Z1', email: 'contact@brightstarpharma.com', phone: '+91 98700 99887', status: 'Active' },
  { id: 18, name: 'Om Sai Logistics', pan: 'AAFOS4488U', type: 'LLP', gst: '27AAFOS4488U1Z5', email: 'omsai.logistics@gmail.com', phone: '+91 99887 11223', status: 'Active' },
  { id: 19, name: 'Deepak Mehra', pan: 'FKQPD2200V', type: 'Individual', gst: '-', email: 'deepak.mehra@gmail.com', phone: '+91 90876 54321', status: 'Active' },
  { id: 20, name: 'Greenfield Constructions', pan: 'AAGGC9911W', type: 'Company', gst: '08AAGGC9911W1Z0', email: 'info@greenfieldcon.in', phone: '+91 98234 56712', status: 'Active' },
  { id: 21, name: 'Kavita Joshi', pan: 'GKQPK5544X', type: 'Individual', gst: '-', email: 'kavita.joshi@gmail.com', phone: '+91 91234 88990', status: 'Active' },
  { id: 22, name: 'Hindustan Steel Traders', pan: 'AAHHS7733Y', type: 'Partnership', gst: '09AAHHS7733Y1Z8', email: 'hst.traders@gmail.com', phone: '+91 98765 11223', status: 'Active' },
  { id: 23, name: 'Royal Foods Pvt Ltd', pan: 'AAIRF8822Z', type: 'Company', gst: '24AAIRF8822Z1Z3', email: 'royalfoods@gmail.com', phone: '+91 99443 22110', status: 'Pending' },
  { id: 24, name: 'Arjun Nair', pan: 'HKQPA3399A', type: 'Individual', gst: '-', email: 'arjun.nair@gmail.com', phone: '+91 90555 66778', status: 'Inactive' },
  { id: 25, name: 'Shree Balaji Enterprises', pan: 'AAJSB1199B', type: 'LLP', gst: '24AAJSB1199B1Z7', email: 'shreebalaji@gmail.com', phone: '+91 98123 99887', status: 'Active' },
  { id: 26, name: 'Pooja Singh', pan: 'IKQPP6644C', type: 'Individual', gst: '-', email: 'pooja.singh@gmail.com', phone: '+91 91987 65432', status: 'Active' },
  { id: 27, name: 'National Plastics Ltd', pan: 'AAKNP2255D', type: 'Company', gst: '27AAKNP2255D1Z9', email: 'info@nationalplastics.com', phone: '+91 98700 22334', status: 'Active' },
  { id: 28, name: 'Verma Stationers', pan: 'AAFVS4400E', type: 'Partnership', gst: '09AAFVS4400E1Z2', email: 'vermastationers@gmail.com', phone: '+91 99001 99887', status: 'Inactive' },
  { id: 29, name: 'Saanvi Exports', pan: 'AALSE3366F', type: 'Company', gst: '24AALSE3366F1Z4', email: 'saanvi.exports@gmail.com', phone: '+91 98456 77889', status: 'Active' },
  { id: 30, name: 'Manoj Kumar Gupta', pan: 'JKQPM7722G', type: 'Individual', gst: '-', email: 'manoj.gupta@gmail.com', phone: '+91 91122 99887', status: 'Active' },
  { id: 31, name: 'Lotus Hospitality Group', pan: 'AAMLH5588H', type: 'Company', gst: '27AAMLH5588H1Z6', email: 'finance@lotushospitality.in', phone: '+91 98234 11223', status: 'Active' },
  { id: 32, name: 'Singh Transport Co.', pan: 'AAGST9933I', type: 'Partnership', gst: '06AAGST9933I1Z1', email: 'singhtransport@gmail.com', phone: '+91 99887 44556', status: 'Pending' },
  { id: 33, name: 'Ritika Kapoor', pan: 'KKQPR1188J', type: 'Individual', gst: '-', email: 'ritika.kapoor@gmail.com', phone: '+91 90123 88776', status: 'Active' },
  { id: 34, name: 'Apex Engineering Works', pan: 'AANAE6655K', type: 'LLP', gst: '24AANAE6655K1Z3', email: 'apexengg@gmail.com', phone: '+91 98765 99001', status: 'Active' },
  { id: 35, name: 'Goyal Jewellers', pan: 'AAFGJ8811L', type: 'Partnership', gst: '08AAFGJ8811L1Z5', email: 'goyaljewellers@gmail.com', phone: '+91 99001 33445', status: 'Active' },
  { id: 36, name: 'Sanjay Mishra', pan: 'LKQPS4477M', type: 'Individual', gst: '-', email: 'sanjay.mishra@gmail.com', phone: '+91 91234 11009', status: 'Inactive' },
  { id: 37, name: 'Cosmic IT Services', pan: 'AAOCI3322N', type: 'Company', gst: '29AAOCI3322N1Z8', email: 'hr@cosmicit.com', phone: '+91 98700 44332', status: 'Active' },
  { id: 38, name: 'Bansal Dairy Farms', pan: 'AAGBD7799O', type: 'Partnership', gst: '06AAGBD7799O1Z2', email: 'bansaldairy@gmail.com', phone: '+91 99443 11220', status: 'Active' },
  { id: 39, name: 'Tanvi Desai', pan: 'MKQPT2266P', type: 'Individual', gst: '-', email: 'tanvi.desai@gmail.com', phone: '+91 90876 99001', status: 'Active' },
  { id: 40, name: 'Skyline Realtors LLP', pan: 'AAPSR5511Q', type: 'LLP', gst: '27AAPSR5511Q1Z0', email: 'skylinerealtors@gmail.com', phone: '+91 98123 66554', status: 'Pending' },
  { id: 41, name: 'Anil Kumar Verma', pan: 'NKQPA8833R', type: 'Individual', gst: '-', email: 'anil.verma@gmail.com', phone: '+91 91009 22113', status: 'Active' },
  { id: 42, name: 'Star Electronics', pan: 'AAQSE1144S', type: 'Company', gst: '24AAQSE1144S1Z7', email: 'starelectronics@gmail.com', phone: '+91 98765 22110', status: 'Active' },
  { id: 43, name: 'Devika Rao', pan: 'OKQPD9955T', type: 'Individual', gst: '-', email: 'devika.rao@gmail.com', phone: '+91 99887 00112', status: 'Inactive' },
  { id: 44, name: 'Continental Freight Pvt Ltd', pan: 'AARCF6622U', type: 'Company', gst: '27AARCF6622U1Z9', email: 'ops@continentalfreight.in', phone: '+91 98234 99887', status: 'Active' },
  { id: 45, name: 'Yadav Furniture Mart', pan: 'AAFYF3300V', type: 'Partnership', gst: '09AAFYF3300V1Z3', email: 'yadavfurniture@gmail.com', phone: '+91 91122 33221', status: 'Active' },
  { id: 46, name: 'Tushar Bhatt', pan: 'PKQPT7711W', type: 'Individual', gst: '-', email: 'tushar.bhatt@gmail.com', phone: '+91 90555 11223', status: 'Active' },
  { id: 47, name: 'Pinnacle Consultants LLP', pan: 'AASPC4488X', type: 'LLP', gst: '07AASPC4488X1Z6', email: 'pinnacle.consultants@gmail.com', phone: '+91 98700 55443', status: 'Active' },
  { id: 48, name: 'Garg Sweets & Bakers', pan: 'AAGGS9922Y', type: 'Partnership', gst: '06AAGGS9922Y1Z2', email: 'gargsweets@gmail.com', phone: '+91 99001 77665', status: 'Pending' }
];

/* ---------- GST RETURN DATA ---------- */
const GST_RETURNS = [
  { client: 'ABC Pvt. Ltd.', type: 'GSTR-3B', period: 'Apr 2025', status: 'Filed', date: '18 May 2025' },
  { client: 'XYZ Traders', type: 'GSTR-1', period: 'Apr 2025', status: 'Filed', date: '17 May 2025' },
  { client: 'Raj Enterprises', type: 'GSTR-3B', period: 'Apr 2025', status: 'Pending', date: '-' },
  { client: 'Sunrise Textiles LLP', type: 'GSTR-1', period: 'Apr 2025', status: 'Filed', date: '15 May 2025' },
  { client: 'Global Exports India', type: 'GSTR-3B', period: 'Mar 2025', status: 'Overdue', date: '-' },
  { client: 'Mehta & Sons', type: 'GSTR-1', period: 'Apr 2025', status: 'Pending', date: '-' },
  { client: 'TechNova Solutions Pvt Ltd', type: 'GSTR-3B', period: 'Apr 2025', status: 'Filed', date: '19 May 2025' },
  { client: 'Krishna Agro Industries', type: 'GSTR-9', period: 'FY 2024-25', status: 'Pending', date: '-' }
];

const GST_UPCOMING = [
  { name: 'GSTR-1 Filing', sub: 'For April 2025 - All eligible clients', date: '22 May 2025' },
  { name: 'GSTR-3B Filing', sub: 'For April 2025 - All registered taxpayers', date: '20 May 2025' },
  { name: 'GST Payment', sub: 'Challan due for Q4 clients', date: '27 May 2025' },
  { name: 'GSTR-9 Annual Return', sub: 'FY 2024-25 - Annual filers', date: '31 Dec 2025' }
];

/* ---------- ROC DATA ---------- */
const ROC_FILINGS = [
  { company: 'ABC Pvt. Ltd.', cin: 'U74999MH2015PTC123456', form: 'AOC-4', due: '30 May 2025', status: 'In Progress' },
  { company: 'TechNova Solutions Pvt Ltd', cin: 'U72200KA2018PTC987654', form: 'MGT-7', due: '28 May 2025', status: 'In Progress' },
  { company: 'Global Exports India', cin: 'U51909DL2012PTC234567', form: 'AOC-4', due: '15 May 2025', status: 'Overdue' },
  { company: 'Royal Foods Pvt Ltd', cin: 'U15400MH2016PTC345678', form: 'DIR-3 KYC', due: '30 Sep 2025', status: 'Filed' },
  { company: 'National Plastics Ltd', cin: 'U25200GJ2010PLC456789', form: 'MGT-7', due: '29 May 2025', status: 'In Progress' },
  { company: 'Bright Star Pharma', cin: 'U24230MH2014PLC567890', form: 'AOC-4', due: '22 May 2025', status: 'Filed' },
  { company: 'Saanvi Exports', cin: 'U51909GJ2017PTC678901', form: 'ADT-1', due: '14 May 2025', status: 'Overdue' },
  { company: 'Cosmic IT Services', cin: 'U72900KA2019PTC789012', form: 'AOC-4', due: '31 May 2025', status: 'In Progress' },
  { company: 'Lotus Hospitality Group', cin: 'U55101MH2013PLC890123', form: 'MGT-14', due: '10 May 2025', status: 'Filed' },
  { company: 'Continental Freight Pvt Ltd', cin: 'U63000DL2011PTC901234', form: 'AOC-4', due: '30 May 2025', status: 'In Progress' }
];

/* ---------- ITR DATA ---------- */
const ITR_FILINGS = [
  { name: 'Rajesh Kumar', form: 'ITR-1', ay: '2024-25', amount: '₹ 42,500', status: 'Filed', date: '12 May 2025' },
  { name: 'Priya Patel', form: 'ITR-2', ay: '2024-25', amount: '₹ 1,15,000', status: 'Filed', date: '10 May 2025' },
  { name: 'ABC Corp', form: 'ITR-6', ay: '2024-25', amount: '₹ 8,40,000', status: 'In Progress', date: '-' },
  { name: 'Neha Sharma', form: 'ITR-1', ay: '2024-25', amount: '₹ 18,200', status: 'Filed', date: '14 May 2025' },
  { name: 'Ananya Verma', form: 'ITR-2', ay: '2024-25', amount: '₹ 64,800', status: 'Pending', date: '-' },
  { name: 'Deepak Mehra', form: 'ITR-3', ay: '2024-25', amount: '₹ 2,30,000', status: 'In Progress', date: '-' },
  { name: 'Vikas Sharma', form: 'ITR-4', ay: '2024-25', amount: '₹ 76,400', status: 'Filed', date: '8 May 2025' }
];

/* ---------- TDS DATA ---------- */
const TDS_FILINGS = [
  { deductor: 'ABC Pvt. Ltd.', tan: 'MUMA12345B', quarter: 'Q4 (Jan-Mar)', form: '24Q', amount: '₹ 1,25,000', status: 'Filed' },
  { deductor: 'TechNova Solutions Pvt Ltd', tan: 'BLRT54321C', quarter: 'Q4 (Jan-Mar)', form: '26Q', amount: '₹ 84,500', status: 'Filed' },
  { deductor: 'Global Exports India', tan: 'DELG67890D', quarter: 'Q4 (Jan-Mar)', form: '26Q', amount: '₹ 1,52,300', status: 'Pending' },
  { deductor: 'National Plastics Ltd', tan: 'AHMN11223E', quarter: 'Q4 (Jan-Mar)', form: '24Q', amount: '₹ 97,600', status: 'Filed' },
  { deductor: 'Continental Freight Pvt Ltd', tan: 'DELC44556F', quarter: 'Q4 (Jan-Mar)', form: '26Q', amount: '₹ 2,10,000', status: 'Pending' },
  { deductor: 'Bright Star Pharma', tan: 'MUMB99887G', quarter: 'Q3 (Oct-Dec)', form: '24Q', amount: '₹ 1,38,900', status: 'Filed' },
  { deductor: 'Cosmic IT Services', tan: 'BLRC22334H', quarter: 'Q4 (Jan-Mar)', form: '27Q', amount: '₹ 45,200', status: 'Filed' }
];

/* ---------- AUDIT DATA ---------- */
const AUDITS = [
  { client: 'ABC Pvt. Ltd.', type: 'Statutory Audit', auditor: 'Karan Mehta', start: '01 Apr 2025', end: '15 Jun 2025', status: 'In Progress' },
  { client: 'TechNova Solutions Pvt Ltd', type: 'Tax Audit', auditor: 'Anjali Rao', start: '10 Apr 2025', end: '30 Jun 2025', status: 'In Progress' },
  { client: 'Global Exports India', type: 'Internal Audit', auditor: 'Karan Mehta', start: '01 Mar 2025', end: '30 Apr 2025', status: 'Completed' },
  { client: 'National Plastics Ltd', type: 'Statutory Audit', auditor: 'Sameer Joshi', start: '05 Apr 2025', end: '20 Jun 2025', status: 'In Progress' },
  { client: 'Lotus Hospitality Group', type: 'Tax Audit', auditor: 'Anjali Rao', start: '15 Apr 2025', end: '15 Jul 2025', status: 'In Review' },
  { client: 'Bright Star Pharma', type: 'Statutory Audit', auditor: 'Sameer Joshi', start: '01 Feb 2025', end: '31 Mar 2025', status: 'Completed' },
  { client: 'Continental Freight Pvt Ltd', type: 'Stock Audit', auditor: 'Karan Mehta', start: '20 Apr 2025', end: '10 May 2025', status: 'In Review' },
  { client: 'Saanvi Exports', type: 'Tax Audit', auditor: 'Anjali Rao', start: '01 Apr 2025', end: '30 Sep 2025', status: 'In Progress' }
];

/* ---------- DSC ALERTS ---------- */
const DSC_ALERTS = [
  { name: 'Rajesh Kumar', purpose: 'Income Tax', expiry: '25 May 2025', daysLeft: 5 },
  { name: 'ABC Pvt. Ltd. (Director)', purpose: 'MCA/ROC', expiry: '02 Jun 2025', daysLeft: 13 },
  { name: 'Priya Patel', purpose: 'GST', expiry: '10 Jun 2025', daysLeft: 21 },
  { name: 'TechNova Solutions (CFO)', purpose: 'MCA/ROC', expiry: '15 Jun 2025', daysLeft: 26 },
  { name: 'Neha Sharma', purpose: 'Income Tax', expiry: '28 May 2025', daysLeft: 8 }
];

/* ---------- ACCOUNTING TRANSACTIONS ---------- */
const ACCOUNTING_TXNS = [
  { narration: 'Professional Fees - ABC Pvt. Ltd.', date: '19 May 2025', amount: '₹ 45,000', type: 'credit' },
  { narration: 'Office Rent - May 2025', date: '18 May 2025', amount: '₹ 60,000', type: 'debit' },
  { narration: 'Audit Fee - TechNova Solutions', date: '17 May 2025', amount: '₹ 1,25,000', type: 'credit' },
  { narration: 'Software Subscription - Tally', date: '16 May 2025', amount: '₹ 18,000', type: 'debit' },
  { narration: 'GST Filing Charges - XYZ Traders', date: '15 May 2025', amount: '₹ 8,500', type: 'credit' },
  { narration: 'Staff Salary - May 2025', date: '15 May 2025', amount: '₹ 3,20,000', type: 'debit' },
  { narration: 'Consultation Fee - Global Exports', date: '14 May 2025', amount: '₹ 22,000', type: 'credit' },
  { narration: 'Electricity Bill - Office', date: '12 May 2025', amount: '₹ 9,400', type: 'debit' }
];

/* ---------- TASKS (KANBAN) ---------- */
let TASKS = [
  { id: 1, title: 'File GSTR-1 for Sunrise Textiles', tags: ['GST', 'High'], assignee: 'Karan', due: '22 May', col: 'todo' },
  { id: 2, title: 'Prepare ITR for ABC Corp', tags: ['Income Tax'], assignee: 'Anjali', due: '25 May', col: 'todo' },
  { id: 3, title: 'Review ROC AOC-4 draft - National Plastics', tags: ['ROC', 'Review'], assignee: 'Sameer', due: '29 May', col: 'todo' },
  { id: 4, title: 'Collect documents from Krishna Agro', tags: ['Documents'], assignee: 'Karan', due: '24 May', col: 'todo' },
  { id: 5, title: 'TDS Return Q4 - Global Exports', tags: ['TDS', 'High'], assignee: 'Anjali', due: '24 May', col: 'inprogress' },
  { id: 6, title: 'Stock Audit - Continental Freight', tags: ['Audit'], assignee: 'Karan', due: '10 May', col: 'inprogress' },
  { id: 7, title: 'DSC Renewal - Rajesh Kumar', tags: ['DSC'], assignee: 'Sameer', due: '25 May', col: 'inprogress' },
  { id: 8, title: 'Reconcile books - Mehta & Sons', tags: ['Accounting'], assignee: 'Anjali', due: '23 May', col: 'inprogress' },
  { id: 9, title: 'GSTR-3B filed - ABC Pvt. Ltd.', tags: ['GST'], assignee: 'Karan', due: '18 May', col: 'done' },
  { id: 10, title: 'ITR-1 filed - Rajesh Kumar', tags: ['Income Tax'], assignee: 'Anjali', due: '12 May', col: 'done' },
  { id: 11, title: 'DSC issued - Neha Sharma', tags: ['DSC'], assignee: 'Sameer', due: '14 May', col: 'done' },
  { id: 12, title: 'GSTR-1 filed - XYZ Traders', tags: ['GST'], assignee: 'Karan', due: '17 May', col: 'done' }
];

/* ---------- DOCUMENTS ---------- */
const DOCUMENTS = [
  { name: 'ABC Pvt Ltd - Balance Sheet FY24-25.pdf', type: 'PDF', icon: '📕', meta: 'ABC Pvt. Ltd. • 2.4 MB' },
  { name: 'XYZ Traders - GST Returns.xlsx', type: 'Excel', icon: '📗', meta: 'XYZ Traders • 850 KB' },
  { name: 'Rajesh Kumar - ITR Acknowledgement.pdf', type: 'PDF', icon: '📕', meta: 'Rajesh Kumar • 320 KB' },
  { name: 'Audit Report - TechNova.docx', type: 'Word', icon: '📘', meta: 'TechNova Solutions • 1.1 MB' },
  { name: 'GSTR-9 Working Sheet.xlsx', type: 'Excel', icon: '📗', meta: 'Krishna Agro • 540 KB' },
  { name: 'Board Resolution - AOC4.pdf', type: 'PDF', icon: '📕', meta: 'National Plastics • 410 KB' },
  { name: 'Company PAN Card.jpg', type: 'Image', icon: '🖼️', meta: 'Global Exports • 220 KB' },
  { name: 'TDS Challan Q4.pdf', type: 'PDF', icon: '📕', meta: 'Global Exports • 180 KB' },
  { name: 'Partnership Deed.pdf', type: 'PDF', icon: '📕', meta: 'Raj Enterprises • 980 KB' },
  { name: 'Salary Register May25.xlsx', type: 'Excel', icon: '📗', meta: 'Internal • 360 KB' },
  { name: 'DSC Application Form.pdf', type: 'PDF', icon: '📕', meta: 'Neha Sharma • 150 KB' },
  { name: 'Audit Checklist 2025.docx', type: 'Word', icon: '📘', meta: 'Internal • 95 KB' }
];

/* ---------- CALENDAR EVENTS (May 2025) ---------- */
const CAL_EVENTS = {
  '2025-5-15': [{ title: 'ADT-1 Due - Saanvi Exports', type: 'ROC' }],
  '2025-5-18': [{ title: 'GSTR-3B Filed - ABC Pvt. Ltd.', type: 'GST' }],
  '2025-5-20': [{ title: 'GSTR-3B Due - All Clients', type: 'GST' }],
  '2025-5-22': [{ title: 'GSTR-1 Filing Due', type: 'GST' }, { title: 'Team Review Meeting', type: 'Internal' }],
  '2025-5-24': [{ title: 'TDS Return Q4 Due', type: 'TDS' }],
  '2025-5-25': [{ title: 'DSC Renewal - Rajesh Kumar', type: 'DSC' }],
  '2025-5-27': [{ title: 'GST Payment Due', type: 'GST' }],
  '2025-5-28': [{ title: 'MGT-7 Due - TechNova', type: 'ROC' }],
  '2025-5-29': [{ title: 'MGT-7 Due - National Plastics', type: 'ROC' }],
  '2025-5-30': [{ title: 'AOC-4 Due - ABC Pvt. Ltd.', type: 'ROC' }, { title: 'AOC-4 Due - Continental Freight', type: 'ROC' }],
  '2025-5-31': [{ title: 'PF Return Due', type: 'PF' }]
};

const UPCOMING_DUE = [
  { day: '22', mon: 'May', title: 'GSTR-1 Filing', sub: 'Due Tomorrow', urgent: true },
  { day: '24', mon: 'May', title: 'TDS Return - Q4', sub: 'Due in 2 days', urgent: false },
  { day: '27', mon: 'May', title: 'GST Payment', sub: 'Due in 5 days', urgent: false },
  { day: '31', mon: 'May', title: 'PF Return', sub: 'Due in 9 days', urgent: false }
];

const RECENT_ACTIVITY = [
  { icon: '✅', color: 'green', text: 'GSTR-1 filed for ABC Pvt. Ltd.', time: '2 mins ago' },
  { icon: '💰', color: 'blue', text: 'ITR filed for Rajesh Kumar', time: '15 mins ago' },
  { icon: '✍️', color: 'purple', text: 'DSC generated for Neha Sharma', time: '1 hour ago' },
  { icon: '✅', color: 'orange', text: 'Task "TDS Return Q4" assigned', time: '2 hours ago' },
  { icon: '🏛️', color: 'blue', text: 'AOC-4 draft prepared - National Plastics', time: '3 hours ago' },
  { icon: '🧮', color: 'green', text: 'Journal entry posted - Professional Fees', time: '4 hours ago' }
];

/* ---------- NOTIFICATIONS ---------- */
const NOTIFICATIONS = [
  { icon: '⏰', text: 'GSTR-1 filing due tomorrow for 12 clients', time: '5 mins ago' },
  { icon: '✅', text: 'GSTR-3B successfully filed for ABC Pvt. Ltd.', time: '20 mins ago' },
  { icon: '⚠️', text: 'DSC for Rajesh Kumar expires in 5 days', time: '1 hour ago' },
  { icon: '🧾', text: 'TDS Return Q4 reminder for Global Exports', time: '2 hours ago' },
  { icon: '💬', text: 'New message from Anjali Rao in Team Chat', time: '3 hours ago' },
  { icon: '🏛️', text: 'ROC AOC-4 overdue for Global Exports India', time: '5 hours ago' }
];

/* ---------- TEAM CHAT ---------- */
const TEAM_CONTACTS = [
  { id: 'rajesh', name: 'Rajesh Kumar', initial: 'R', online: true, last: 'Sure, I will check the GST portal' },
  { id: 'anjali', name: 'Anjali Rao', initial: 'A', online: true, last: 'Audit report draft is ready' },
  { id: 'sameer', name: 'Sameer Joshi', initial: 'S', online: false, last: 'Sent the AOC-4 documents' },
  { id: 'priya', name: 'Priya Desai', initial: 'P', online: true, last: 'Thanks for the update!' },
  { id: 'vikram', name: 'Vikram Singh', initial: 'V', online: false, last: 'Will join the call at 4 PM' }
];

const TEAM_MESSAGES = {
  rajesh: [
    { from: 'them', text: 'Hi Karan, the GSTR-1 for Sunrise Textiles is almost ready.', time: '10:02 AM' },
    { from: 'me', text: 'Great, please file it before tomorrow evening.', time: '10:05 AM' },
    { from: 'them', text: 'Sure, I will check the GST portal and confirm once filed.', time: '10:06 AM' }
  ],
  anjali: [
    { from: 'them', text: 'The audit report draft for TechNova is ready for review.', time: '9:40 AM' },
    { from: 'me', text: 'Awesome, send it over, I will review by EOD.', time: '9:42 AM' },
    { from: 'them', text: 'Audit report draft is ready, sharing it on the Documents page.', time: '9:45 AM' }
  ],
  sameer: [
    { from: 'them', text: 'Karan, sent the AOC-4 documents for National Plastics.', time: 'Yesterday' },
    { from: 'me', text: 'Got it, thanks Sameer.', time: 'Yesterday' }
  ],
  priya: [
    { from: 'me', text: 'Please update the client master sheet with new entries.', time: 'Yesterday' },
    { from: 'them', text: 'Thanks for the update! Will do it today.', time: 'Yesterday' }
  ],
  vikram: [
    { from: 'them', text: 'We have a client call scheduled at 4 PM today.', time: 'Mon' },
    { from: 'me', text: 'Noted, will join.', time: 'Mon' },
    { from: 'them', text: 'Will join the call at 4 PM, sending the agenda shortly.', time: 'Mon' }
  ]
};

/* ---------- AI ASSISTANT KNOWLEDGE BASE ---------- */
const AI_RESPONSES = {
  'show pending gst returns': () => {
    const pending = GST_RETURNS.filter(g => g.status === 'Pending' || g.status === 'Overdue');
    let txt = `There are ${pending.length} GST returns that need attention:<br><br>`;
    pending.forEach(g => {
      txt += `• <strong>${g.client}</strong> — ${g.type} (${g.period}) — <span style="color:${g.status === 'Overdue' ? 'var(--danger)' : 'var(--warning)'}">${g.status}</span><br>`;
    });
    return txt;
  },
  'list overdue tasks': () => {
    let txt = `Here are tasks marked as overdue or high priority:<br><br>`;
    TASKS.filter(t => t.tags.includes('High')).forEach(t => {
      txt += `• <strong>${t.title}</strong> — Assigned to ${t.assignee}, due ${t.due}<br>`;
    });
    return txt || 'No overdue tasks found. Great job!';
  },
  'gst due this week': () => {
    let txt = `Upcoming GST-related due dates this week:<br><br>`;
    UPCOMING_DUE.filter(d => d.title.toLowerCase().includes('gst')).forEach(d => {
      txt += `• <strong>${d.title}</strong> — ${d.sub} (${d.day} ${d.mon})<br>`;
    });
    return txt;
  },
  'top clients by revenue': () => {
    return `Based on professional fees and billing data, your top clients this quarter are:<br><br>
    • <strong>TechNova Solutions Pvt Ltd</strong> — ₹ 1,25,000<br>
    • <strong>ABC Pvt. Ltd.</strong> — ₹ 45,000<br>
    • <strong>Global Exports India</strong> — ₹ 22,000<br>
    • <strong>XYZ Traders</strong> — ₹ 8,500`;
  },
  'tds filing status': () => {
    const filed = TDS_FILINGS.filter(t => t.status === 'Filed').length;
    const pending = TDS_FILINGS.filter(t => t.status === 'Pending').length;
    return `TDS Filing Summary for Q4 (Jan-Mar):<br><br>
    • Filed: <strong>${filed}</strong><br>
    • Pending: <strong>${pending}</strong><br><br>
    Pending deductors: ${TDS_FILINGS.filter(t => t.status === 'Pending').map(t => t.deductor).join(', ')}`;
  },
  'upcoming compliances': () => {
    let txt = `Here are your upcoming compliance deadlines:<br><br>`;
    UPCOMING_DUE.forEach(d => {
      txt += `• <strong>${d.title}</strong> — ${d.day} ${d.mon} (${d.sub})<br>`;
    });
    return txt;
  },
  'show pending tasks': () => {
    const pending = TASKS.filter(t => t.col !== 'done');
    let txt = `You have ${pending.length} tasks not yet completed:<br><br>`;
    pending.slice(0, 6).forEach(t => {
      txt += `• <strong>${t.title}</strong> — ${t.col === 'todo' ? 'To Do' : 'In Progress'}, due ${t.due}<br>`;
    });
    return txt;
  },
  'clients with pending filings': () => {
    return `Clients with at least one pending filing:<br><br>
    • <strong>Raj Enterprises</strong> — GSTR-3B Pending<br>
    • <strong>Mehta & Sons</strong> — GSTR-1 Pending<br>
    • <strong>Krishna Agro Industries</strong> — GSTR-9 Pending<br>
    • <strong>Global Exports India</strong> — GSTR-3B Overdue, TDS Pending<br>
    • <strong>Ananya Verma</strong> — ITR-2 Pending`;
  },
  'help me with tds': () => {
    return `Sure! Here's a quick overview of TDS filing:<br><br>
    1. Select the correct <strong>Form Type</strong> (24Q for salary, 26Q for non-salary, 27Q for foreign payments, 27EQ for TCS)<br>
    2. Enter the <strong>TAN</strong> and select the relevant <strong>Quarter</strong><br>
    3. Add the <strong>TDS amount</strong> and challan details<br>
    4. Submit via the TDS Returns page<br><br>
    Currently, ${TDS_FILINGS.filter(t => t.status === 'Pending').length} deductors have pending TDS returns for Q4. Would you like me to list them?`;
  }
};

const AI_DEFAULT_RESPONSES = [
  "I can help with that! Could you give me a bit more detail — for example, a client name or filing type?",
  "I'm pulling that information from your workspace. For specific data, try asking about GST returns, TDS status, pending tasks, or client filings.",
  "That's a great question. Right now I can best help with GST, TDS, ITR, ROC filings, client data, and task tracking. Try one of the quick suggestions below!"
];

/* =========================================================
   2. INITIALIZATION
   ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initDarkMode();
  setCurrentDate();
  renderClientTable();
  renderGSTPage();
  renderROCTable();
  renderITRList();
  renderTDSTable();
  renderAuditTable();
  renderDSCAlerts();
  renderAccountingList();
  renderKanban();
  renderDocuments();
  renderCalendar();
  renderEventList();
  renderDueDates();
  renderActivity();
  renderNotifications();
  renderBarChart();
  renderTeamContacts();
  renderTeamMessages();
  attachGlobalListeners();
});

/* =========================================================
   3. NAVIGATION
   ========================================================= */

function navigate(page) {
  STATE.currentPage = page;

  // toggle page sections
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + page);
  if (target) target.classList.add('active');

  // toggle sidebar nav active state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.toggle('active', item.getAttribute('data-page') === page);
  });

  // close mobile sidebar after navigation
  if (window.innerWidth <= 768) {
    closeSidebar();
  }

  // close notif panel if open
  closeNotifications();

  // scroll to top of content
  const pageContent = document.getElementById('pageContent');
  if (pageContent) pageContent.scrollTop = 0;
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // refresh chart animation if reports page
  if (page === 'reports') {
    setTimeout(renderBarChart, 100);
  }
}

/* =========================================================
   4. SIDEBAR TOGGLE (MOBILE)
   ========================================================= */

function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  STATE.sidebarOpen = !STATE.sidebarOpen;
  sidebar.classList.toggle('open', STATE.sidebarOpen);
  overlay.classList.toggle('show', STATE.sidebarOpen);
}

function closeSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  STATE.sidebarOpen = false;
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
}

/* =========================================================
   5. THEME SWITCHING
   ========================================================= */

function initTheme() {
  const saved = STATE.activeTheme;
  setTheme(saved, false);
}

function setTheme(themeName, persist = true) {
  // remove all theme classes
  const themeClasses = ['theme-violet','theme-blue','theme-emerald','theme-rose','theme-amber','theme-cyan','theme-dark','theme-midnight','theme-forest','theme-sunset','theme-sakura','theme-gold'];
  themeClasses.forEach(t => document.body.classList.remove(t));
  document.body.classList.add(themeName);
  STATE.activeTheme = themeName;

  // update swatch active state
  document.querySelectorAll('.swatch').forEach(sw => {
    sw.classList.toggle('active', sw.getAttribute('data-theme') === themeName);
  });

  if (persist) {
    showToast('Theme updated to ' + themeName.replace('theme-', '').replace(/^\w/, c => c.toUpperCase()));
  }
}

/* =========================================================
   6. DARK MODE TOGGLE
   ========================================================= */

function initDarkMode() {
  STATE.darkMode = false;
}

function toggleDarkMode() {
  STATE.darkMode = !STATE.darkMode;
  if (STATE.darkMode) {
    document.body.classList.add('theme-dark');
    showToast('Dark mode enabled');
  } else {
    document.body.classList.remove('theme-dark');
    setTheme(STATE.activeTheme, false);
    showToast('Dark mode disabled');
  }
}

/* =========================================================
   7. CURRENT DATE BADGE
   ========================================================= */

function setCurrentDate() {
  const el = document.getElementById('currentDate');
  if (!el) return;
  // Fixed demo date per design mock
  el.textContent = '20 May 2025, Tue';
}

/* =========================================================
   8. CLIENT MANAGEMENT
   ========================================================= */

function getFilteredClients() {
  const { search, status } = STATE.filters.clients;
  return CLIENTS.filter(c => {
    const matchesSearch = !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.pan.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.gst.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !status || c.status === status;
    return matchesSearch && matchesStatus;
  });
}

function renderClientTable() {
  const tbody = document.getElementById('clientTableBody');
  if (!tbody) return;

  const filtered = getFilteredClients();
  const { page, perPage } = STATE.pagination.clients;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  STATE.pagination.clients.page = safePage;

  const start = (safePage - 1) * perPage;
  const pageItems = filtered.slice(start, start + perPage);

  if (pageItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
      <div class="empty-state-icon">🔍</div>
      <div class="empty-state-text">No clients found</div>
      <div class="empty-state-sub">Try adjusting your search or filters</div>
    </div></td></tr>`;
  } else {
    tbody.innerHTML = pageItems.map(c => `
      <tr>
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td>${escapeHtml(c.pan)}</td>
        <td>${escapeHtml(c.type)}</td>
        <td>${escapeHtml(c.gst)}</td>
        <td>${escapeHtml(c.email)}</td>
        <td>${escapeHtml(c.phone)}</td>
        <td>${statusBadge(c.status)}</td>
        <td>
          <button class="btn-outline" style="padding:5px 12px;font-size:11.5px;margin-right:4px" onclick="viewClient(${c.id})">View</button>
          <button class="btn-outline" style="padding:5px 12px;font-size:11.5px" onclick="editClient(${c.id})">Edit</button>
        </td>
      </tr>
    `).join('');
  }

  document.getElementById('clientPageInfo').textContent = `Page ${safePage} of ${totalPages}`;
}

function statusBadge(status) {
  const map = {
    'Active': 'badge-success',
    'Inactive': 'badge-danger',
    'Pending': 'badge-warning',
    'Filed': 'badge-success',
    'Overdue': 'badge-danger',
    'In Progress': 'badge-info',
    'In Review': 'badge-purple',
    'Completed': 'badge-success'
  };
  const cls = map[status] || 'badge-info';
  return `<span class="badge ${cls}">${status}</span>`;
}

function filterClients(value) {
  STATE.filters.clients.search = value;
  STATE.pagination.clients.page = 1;
  renderClientTable();
}

function filterClientStatus(value) {
  STATE.filters.clients.status = value;
  STATE.pagination.clients.page = 1;
  renderClientTable();
}

function prevPage(section) {
  if (section === 'clients') {
    if (STATE.pagination.clients.page > 1) {
      STATE.pagination.clients.page--;
      renderClientTable();
    }
  }
}

function nextPage(section) {
  if (section === 'clients') {
    const filtered = getFilteredClients();
    const totalPages = Math.max(1, Math.ceil(filtered.length / STATE.pagination.clients.perPage));
    if (STATE.pagination.clients.page < totalPages) {
      STATE.pagination.clients.page++;
      renderClientTable();
    }
  }
}

function viewClient(id) {
  const client = CLIENTS.find(c => c.id === id);
  if (!client) return;
  openModalWithContent(`Client Details — ${client.name}`, `
    <div class="form-group"><label>Client Name</label><div class="form-control" style="background:var(--bg)">${escapeHtml(client.name)}</div></div>
    <div class="form-group"><label>PAN / TAN</label><div class="form-control" style="background:var(--bg)">${escapeHtml(client.pan)}</div></div>
    <div class="form-group"><label>Type</label><div class="form-control" style="background:var(--bg)">${escapeHtml(client.type)}</div></div>
    <div class="form-group"><label>GST Number</label><div class="form-control" style="background:var(--bg)">${escapeHtml(client.gst)}</div></div>
    <div class="form-group"><label>Email</label><div class="form-control" style="background:var(--bg)">${escapeHtml(client.email)}</div></div>
    <div class="form-group"><label>Phone</label><div class="form-control" style="background:var(--bg)">${escapeHtml(client.phone)}</div></div>
    <div class="form-group"><label>Status</label><div>${statusBadge(client.status)}</div></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="closeModal()">Close</button>
  `);
}

function editClient(id) {
  const client = CLIENTS.find(c => c.id === id);
  if (!client) return;
  openModalWithContent(`Edit Client — ${client.name}`, `
    <div class="form-group"><label>Client Name</label><input type="text" class="form-control" id="editClientName" value="${escapeHtml(client.name)}" /></div>
    <div class="form-group"><label>Email</label><input type="text" class="form-control" id="editClientEmail" value="${escapeHtml(client.email)}" /></div>
    <div class="form-group"><label>Phone</label><input type="text" class="form-control" id="editClientPhone" value="${escapeHtml(client.phone)}" /></div>
    <div class="form-group">
      <label>Status</label>
      <select class="form-control" id="editClientStatus">
        <option ${client.status === 'Active' ? 'selected' : ''}>Active</option>
        <option ${client.status === 'Inactive' ? 'selected' : ''}>Inactive</option>
        <option ${client.status === 'Pending' ? 'selected' : ''}>Pending</option>
      </select>
    </div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="saveClientEdit(${client.id})">Save Changes</button>
  `);
}

function saveClientEdit(id) {
  const client = CLIENTS.find(c => c.id === id);
  if (!client) return;
  client.name = document.getElementById('editClientName').value || client.name;
  client.email = document.getElementById('editClientEmail').value || client.email;
  client.phone = document.getElementById('editClientPhone').value || client.phone;
  client.status = document.getElementById('editClientStatus').value || client.status;
  closeModal();
  renderClientTable();
  showToast('Client details updated successfully');
}

/* =========================================================
   9. GST DASHBOARD
   ========================================================= */

function renderGSTPage() {
  const listEl = document.getElementById('gstReturnList');
  const upcomingEl = document.getElementById('gstUpcoming');
  if (!listEl || !upcomingEl) return;

  listEl.innerHTML = GST_RETURNS.map(g => `
    <div class="gst-item">
      <div>
        <div class="gst-item-name">${escapeHtml(g.client)}</div>
        <div class="gst-item-sub">${escapeHtml(g.type)} • ${escapeHtml(g.period)}</div>
      </div>
      ${statusBadge(g.status)}
    </div>
  `).join('');

  upcomingEl.innerHTML = GST_UPCOMING.map(u => `
    <div class="upcoming-item">
      <div>
        <div class="gst-item-name">${escapeHtml(u.name)}</div>
        <div class="gst-item-sub">${escapeHtml(u.sub)}</div>
      </div>
      <div class="gst-item-sub fw-bold">${escapeHtml(u.date)}</div>
    </div>
  `).join('');
}

function submitGSTReturn() {
  showToast('GST return submitted successfully ✅');
}

/* =========================================================
   10. ROC FILINGS
   ========================================================= */

function renderROCTable() {
  const tbody = document.getElementById('rocTableBody');
  if (!tbody) return;
  tbody.innerHTML = ROC_FILINGS.map(r => `
    <tr>
      <td><strong>${escapeHtml(r.company)}</strong></td>
      <td>${escapeHtml(r.cin)}</td>
      <td>${escapeHtml(r.form)}</td>
      <td>${escapeHtml(r.due)}</td>
      <td>${statusBadge(r.status)}</td>
      <td><button class="btn-outline" style="padding:5px 12px;font-size:11.5px" onclick="showToast('Opening filing details...')">View</button></td>
    </tr>
  `).join('');
}

/* =========================================================
   11. INCOME TAX
   ========================================================= */

function renderITRList() {
  const el = document.getElementById('itrList');
  if (!el) return;
  el.innerHTML = ITR_FILINGS.map(itr => `
    <div class="itr-item">
      <div>
        <div class="gst-item-name">${escapeHtml(itr.name)}</div>
        <div class="gst-item-sub">${escapeHtml(itr.form)} • AY ${escapeHtml(itr.ay)} • ${escapeHtml(itr.amount)}</div>
      </div>
      ${statusBadge(itr.status)}
    </div>
  `).join('');
}

function submitITR() {
  showToast('ITR calculated & filed successfully ✅');
}

/* =========================================================
   12. TDS RETURNS
   ========================================================= */

function renderTDSTable() {
  const tbody = document.getElementById('tdsTableBody');
  if (!tbody) return;
  tbody.innerHTML = TDS_FILINGS.map(t => `
    <tr>
      <td><strong>${escapeHtml(t.deductor)}</strong></td>
      <td>${escapeHtml(t.tan)}</td>
      <td>${escapeHtml(t.quarter)}</td>
      <td>${escapeHtml(t.form)}</td>
      <td>${escapeHtml(t.amount)}</td>
      <td>${statusBadge(t.status)}</td>
    </tr>
  `).join('');
}

function submitTDS() {
  showToast('TDS return submitted successfully ✅');
}

/* =========================================================
   13. AUDIT & ASSURANCE
   ========================================================= */

function renderAuditTable() {
  const tbody = document.getElementById('auditTableBody');
  if (!tbody) return;
  tbody.innerHTML = AUDITS.map(a => `
    <tr>
      <td><strong>${escapeHtml(a.client)}</strong></td>
      <td>${escapeHtml(a.type)}</td>
      <td>${escapeHtml(a.auditor)}</td>
      <td>${escapeHtml(a.start)}</td>
      <td>${escapeHtml(a.end)}</td>
      <td>${statusBadge(a.status)}</td>
      <td><button class="btn-outline" style="padding:5px 12px;font-size:11.5px" onclick="showToast('Opening audit workpapers...')">Open</button></td>
    </tr>
  `).join('');
}

/* =========================================================
   14. DSC & ESIGN
   ========================================================= */

function renderDSCAlerts() {
  const el = document.getElementById('dscAlertList');
  if (!el) return;
  el.innerHTML = DSC_ALERTS.map(d => `
    <div class="dsc-alert-item">
      <div class="activity-dot ${d.daysLeft <= 7 ? 'orange' : 'blue'}">⚠️</div>
      <div style="flex:1">
        <div class="gst-item-name">${escapeHtml(d.name)}</div>
        <div class="gst-item-sub">${escapeHtml(d.purpose)} • Expires ${escapeHtml(d.expiry)}</div>
      </div>
      <span class="badge ${d.daysLeft <= 7 ? 'badge-danger' : 'badge-warning'}">${d.daysLeft}d left</span>
    </div>
  `).join('');
}

function submitDSC() {
  showToast('DSC request submitted successfully ✅');
}

/* =========================================================
   15. ACCOUNTING HUB
   ========================================================= */

function renderAccountingList() {
  const el = document.getElementById('accountingList');
  if (!el) return;
  el.innerHTML = ACCOUNTING_TXNS.map(t => `
    <div class="acc-item">
      <div>
        <div class="gst-item-name">${escapeHtml(t.narration)}</div>
        <div class="gst-item-sub">${escapeHtml(t.date)}</div>
      </div>
      <div class="acc-amount ${t.type}">${t.type === 'credit' ? '+' : '-'} ${escapeHtml(t.amount)}</div>
    </div>
  `).join('');
}

function submitJournalEntry() {
  showToast('Journal entry posted successfully ✅');
}

/* =========================================================
   16. TASK MANAGER (KANBAN)
   ========================================================= */

function renderKanban() {
  const cols = ['todo', 'inprogress', 'done'];
  cols.forEach(col => {
    const container = document.getElementById(col + 'Cards');
    const countEl = document.getElementById(col + 'Count');
    if (!container) return;

    const items = TASKS.filter(t => t.col === col);
    countEl.textContent = items.length;

    container.innerHTML = items.map(t => `
      <div class="task-card" draggable="true" data-id="${t.id}" ondragstart="dragStart(event)" onclick="openTaskDetail(${t.id})">
        <div class="task-title">${escapeHtml(t.title)}</div>
        <div class="task-meta">
          ${t.tags.map(tag => `<span class="task-tag">${escapeHtml(tag)}</span>`).join('')}
        </div>
        <div class="task-meta">
          <span>👤 ${escapeHtml(t.assignee)}</span>
          <span>📅 ${escapeHtml(t.due)}</span>
        </div>
      </div>
    `).join('');

    // drag/drop handlers on column
    container.ondragover = (e) => e.preventDefault();
    container.ondrop = (e) => dropTask(e, col);
  });
}

let draggedTaskId = null;

function dragStart(e) {
  draggedTaskId = parseInt(e.target.closest('.task-card').getAttribute('data-id'));
  e.dataTransfer.effectAllowed = 'move';
}

function dropTask(e, targetCol) {
  e.preventDefault();
  if (draggedTaskId === null) return;
  const task = TASKS.find(t => t.id === draggedTaskId);
  if (task) {
    task.col = targetCol;
    renderKanban();
    showToast(`Task moved to ${columnLabel(targetCol)}`);
  }
  draggedTaskId = null;
}

function columnLabel(col) {
  return { todo: 'To Do', inprogress: 'In Progress', done: 'Done' }[col] || col;
}

function addTask(col) {
  openModalWithContent('Add New Task', `
    <div class="form-group"><label>Task Title</label><input type="text" class="form-control" id="newTaskTitle" placeholder="Enter task title" /></div>
    <div class="form-group"><label>Tags (comma separated)</label><input type="text" class="form-control" id="newTaskTags" placeholder="e.g. GST, High" /></div>
    <div class="form-group"><label>Assignee</label>
      <select class="form-control" id="newTaskAssignee">
        <option>Karan</option>
        <option>Anjali</option>
        <option>Sameer</option>
        <option>Priya</option>
        <option>Vikram</option>
      </select>
    </div>
    <div class="form-group"><label>Due Date</label><input type="text" class="form-control" id="newTaskDue" placeholder="e.g. 28 May" /></div>
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="createTask('${col}')">Add Task</button>
  `);
}

function createTask(col) {
  const title = document.getElementById('newTaskTitle').value.trim();
  if (!title) {
    showToast('Please enter a task title');
    return;
  }
  const tagsRaw = document.getElementById('newTaskTags').value.trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  const assignee = document.getElementById('newTaskAssignee').value;
  const due = document.getElementById('newTaskDue').value.trim() || 'TBD';

  STATE.taskIdCounter++;
  TASKS.push({ id: STATE.taskIdCounter, title, tags, assignee, due, col });

  closeModal();
  renderKanban();
  showToast('Task added successfully ✅');
}

function openTaskDetail(id) {
  const task = TASKS.find(t => t.id === id);
  if (!task) return;
  openModalWithContent('Task Details', `
    <div class="form-group"><label>Title</label><div class="form-control" style="background:var(--bg)">${escapeHtml(task.title)}</div></div>
    <div class="form-group"><label>Tags</label><div>${task.tags.map(tag => `<span class="task-tag" style="margin-right:6px">${escapeHtml(tag)}</span>`).join('')}</div></div>
    <div class="form-group"><label>Assignee</label><div class="form-control" style="background:var(--bg)">${escapeHtml(task.assignee)}</div></div>
    <div class="form-group"><label>Due Date</label><div class="form-control" style="background:var(--bg)">${escapeHtml(task.due)}</div></div>
    <div class="form-group"><label>Status</label>
      <select class="form-control" id="taskStatusSelect">
        <option value="todo" ${task.col === 'todo' ? 'selected' : ''}>To Do</option>
        <option value="inprogress" ${task.col === 'inprogress' ? 'selected' : ''}>In Progress</option>
        <option value="done" ${task.col === 'done' ? 'selected' : ''}>Done</option>
      </select>
    </div>
    <div style="display:flex;gap:10px;margin-top:8px">
      <button class="btn-primary" style="flex:1" onclick="updateTaskStatus(${task.id})">Save</button>
      <button class="btn-outline" style="flex:1;border-color:var(--danger);color:var(--danger)" onclick="deleteTask(${task.id})">Delete</button>
    </div>
  `);
}

function updateTaskStatus(id) {
  const task = TASKS.find(t => t.id === id);
  if (!task) return;
  task.col = document.getElementById('taskStatusSelect').value;
  closeModal();
  renderKanban();
  showToast('Task updated successfully ✅');
}

function deleteTask(id) {
  TASKS = TASKS.filter(t => t.id !== id);
  closeModal();
  renderKanban();
  showToast('Task deleted');
}

/* =========================================================
   17. REPORTS & INSIGHTS
   ========================================================= */

function renderBarChart() {
  const el = document.getElementById('barChart');
  if (!el) return;

  const data = [
    { label: 'Jan', value: 62 },
    { label: 'Feb', value: 71 },
    { label: 'Mar', value: 58 },
    { label: 'Apr', value: 84 },
    { label: 'May', value: 92 },
    { label: 'Jun', value: 76 }
  ];
  const max = Math.max(...data.map(d => d.value));

  el.innerHTML = data.map(d => `
    <div class="bar-item">
      <div class="bar-fill" style="height:0%" data-target="${(d.value / max) * 100}"></div>
      <div class="bar-label">${d.label}</div>
    </div>
  `).join('');

  // animate bars
  requestAnimationFrame(() => {
    setTimeout(() => {
      document.querySelectorAll('#barChart .bar-fill').forEach(bar => {
        bar.style.height = bar.getAttribute('data-target') + '%';
      });
    }, 100);
  });
}

function exportReport() {
  showToast('Preparing export... your report will download shortly 📥');
}

function generateReport() {
  showToast('Report generated successfully ✅');
}

/* =========================================================
   18. AI ASSISTANT
   ========================================================= */

function getAIResponse(query) {
  const normalized = query.trim().toLowerCase().replace(/[?.!]/g, '');
  if (AI_RESPONSES[normalized]) {
    return AI_RESPONSES[normalized]();
  }
  // fuzzy match
  for (const key in AI_RESPONSES) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return AI_RESPONSES[key]();
    }
  }
  // keyword based fallback
  if (normalized.includes('gst')) return AI_RESPONSES['show pending gst returns']();
  if (normalized.includes('tds')) return AI_RESPONSES['tds filing status']();
  if (normalized.includes('task')) return AI_RESPONSES['show pending tasks']();
  if (normalized.includes('client')) return AI_RESPONSES['clients with pending filings']();
  if (normalized.includes('due') || normalized.includes('compliance')) return AI_RESPONSES['upcoming compliances']();

  return AI_DEFAULT_RESPONSES[Math.floor(Math.random() * AI_DEFAULT_RESPONSES.length)];
}

function sendAIMessage(presetMsg) {
  const input = document.getElementById('aiInput');
  const msg = presetMsg || input.value.trim();
  if (!msg) return;

  const chatEl = document.getElementById('chatMessages');

  // user message
  chatEl.insertAdjacentHTML('beforeend', `
    <div class="chat-msg user">
      <div class="msg-avatar">K</div>
      <div class="msg-content">${escapeHtml(msg)}</div>
    </div>
  `);

  input.value = '';
  chatEl.scrollTop = chatEl.scrollHeight;

  // typing indicator
  const typingId = 'typing-' + Date.now();
  chatEl.insertAdjacentHTML('beforeend', `
    <div class="chat-msg bot" id="${typingId}">
      <div class="msg-avatar">🤖</div>
      <div class="msg-content">Typing...</div>
    </div>
  `);
  chatEl.scrollTop = chatEl.scrollHeight;

  setTimeout(() => {
    const typingEl = document.getElementById(typingId);
    const response = getAIResponse(msg);
    if (typingEl) {
      typingEl.querySelector('.msg-content').innerHTML = response;
    }
    chatEl.scrollTop = chatEl.scrollHeight;
  }, 700);
}

function aiChip(text) {
  navigate('ai');
  setTimeout(() => sendAIMessage(text), 200);
}

function openAI() {
  navigate('ai');
}

/* =========================================================
   19. DOCUMENTS
   ========================================================= */

function renderDocuments() {
  const el = document.getElementById('docsGrid');
  if (!el) return;
  el.innerHTML = DOCUMENTS.map(d => `
    <div class="doc-card" onclick="showToast('Opening ${escapeHtml(d.name)}...')">
      <div class="doc-icon">${d.icon}</div>
      <div class="doc-name">${escapeHtml(d.name)}</div>
      <div class="doc-meta">${escapeHtml(d.meta)}</div>
    </div>
  `).join('');
}

/* =========================================================
   20. CALENDAR
   ========================================================= */

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function renderCalendar() {
  const { month, year } = STATE.calendar;
  const titleEl = document.getElementById('calTitle');
  const gridEl = document.getElementById('calGrid');
  if (!titleEl || !gridEl) return;

  titleEl.textContent = `${MONTH_NAMES[month]} ${year}`;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  let html = '';

  // previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<div class="cal-day other-month">${daysInPrevMonth - i}</div>`;
  }

  // current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${month + 1}-${d}`;
    const hasEvent = CAL_EVENTS[key] ? 'has-event' : '';
    const isToday = (year === 2025 && month === 4 && d === 20) ? 'today' : '';
    html += `<div class="cal-day ${hasEvent} ${isToday}" onclick="showDayEvents('${key}', ${d})">${d}</div>`;
  }

  // next month leading days to fill grid (up to 42 cells)
  const totalCells = firstDay + daysInMonth;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let d = 1; d <= remaining; d++) {
    html += `<div class="cal-day other-month">${d}</div>`;
  }

  gridEl.innerHTML = html;
}

function changeMonth(delta) {
  STATE.calendar.month += delta;
  if (STATE.calendar.month > 11) {
    STATE.calendar.month = 0;
    STATE.calendar.year++;
  } else if (STATE.calendar.month < 0) {
    STATE.calendar.month = 11;
    STATE.calendar.year--;
  }
  renderCalendar();
}

function showDayEvents(key, day) {
  const events = CAL_EVENTS[key];
  if (!events || events.length === 0) {
    showToast(`No events on ${day} ${MONTH_NAMES[STATE.calendar.month]}`);
    return;
  }
  openModalWithContent(`Events — ${day} ${MONTH_NAMES[STATE.calendar.month]} ${STATE.calendar.year}`, `
    ${events.map(e => `
      <div class="upcoming-item" style="margin-bottom:10px">
        <div>
          <div class="gst-item-name">${escapeHtml(e.title)}</div>
          <div class="gst-item-sub">${escapeHtml(e.type)}</div>
        </div>
      </div>
    `).join('')}
    <button class="btn-primary" style="width:100%;margin-top:8px" onclick="closeModal()">Close</button>
  `);
}

function renderEventList() {
  const el = document.getElementById('eventList');
  if (!el) return;

  const allEvents = [];
  Object.entries(CAL_EVENTS).forEach(([key, events]) => {
    const [y, m, d] = key.split('-').map(Number);
    events.forEach(e => allEvents.push({ ...e, date: `${d} ${MONTH_NAMES[m - 1]} ${y}`, sortKey: d }));
  });
  allEvents.sort((a, b) => a.sortKey - b.sortKey);

  el.innerHTML = allEvents.map(e => `
    <div class="upcoming-item" style="margin-bottom:10px">
      <div>
        <div class="gst-item-name">${escapeHtml(e.title)}</div>
        <div class="gst-item-sub">${escapeHtml(e.type)}</div>
      </div>
      <div class="gst-item-sub fw-bold">${escapeHtml(e.date)}</div>
    </div>
  `).join('');
}

/* =========================================================
   21. TEAM CHAT
   ========================================================= */

function renderTeamContacts() {
  const el = document.getElementById('chatContacts');
  if (!el) return;
  el.innerHTML = TEAM_CONTACTS.map(c => `
    <div class="contact-item ${c.id === STATE.activeChatContact ? 'active' : ''}" onclick="switchChatContact('${c.id}')">
      <div class="contact-avatar">${c.initial}</div>
      <div style="flex:1;overflow:hidden">
        <div class="contact-name">${escapeHtml(c.name)}</div>
        <div class="contact-last">${c.online ? '🟢 ' : ''}${escapeHtml(c.last)}</div>
      </div>
    </div>
  `).join('');
}

function switchChatContact(id) {
  STATE.activeChatContact = id;
  const contact = TEAM_CONTACTS.find(c => c.id === id);
  document.getElementById('activeChatName').textContent = contact.name;
  renderTeamContacts();
  renderTeamMessages();
}

function renderTeamMessages() {
  const el = document.getElementById('teamMessages');
  if (!el) return;
  const messages = TEAM_MESSAGES[STATE.activeChatContact] || [];
  const contact = TEAM_CONTACTS.find(c => c.id === STATE.activeChatContact);

  el.innerHTML = messages.map(m => `
    <div class="chat-msg ${m.from === 'me' ? 'user' : ''}">
      <div class="msg-avatar">${m.from === 'me' ? 'K' : contact.initial}</div>
      <div class="msg-content">${escapeHtml(m.text)}<div style="font-size:10.5px;opacity:.6;margin-top:4px">${escapeHtml(m.time)}</div></div>
    </div>
  `).join('');
  el.scrollTop = el.scrollHeight;
}

function sendTeamMessage() {
  const input = document.getElementById('teamChatInput');
  const text = input.value.trim();
  if (!text) return;

  const contactId = STATE.activeChatContact;
  if (!TEAM_MESSAGES[contactId]) TEAM_MESSAGES[contactId] = [];
  TEAM_MESSAGES[contactId].push({ from: 'me', text, time: 'Just now' });
  input.value = '';
  renderTeamMessages();

  // simulate reply
  setTimeout(() => {
    TEAM_MESSAGES[contactId].push({ from: 'them', text: 'Got it, thanks for letting me know!', time: 'Just now' });
    renderTeamMessages();
  }, 1200);
}

/* =========================================================
   22. RIGHT PANEL - DUE DATES & ACTIVITY
   ========================================================= */

function renderDueDates() {
  const el = document.getElementById('dueDateList');
  if (!el) return;
  el.innerHTML = UPCOMING_DUE.map(d => `
    <div class="due-item">
      <div class="due-date-badge">
        <div class="due-date-num">${d.day}</div>
        <div class="due-date-mon">${d.mon}</div>
      </div>
      <div style="flex:1">
        <div class="due-title">${escapeHtml(d.title)}</div>
        <div class="due-sub ${d.urgent ? 'red' : ''}">${escapeHtml(d.sub)}</div>
      </div>
    </div>
  `).join('');
}

function renderActivity() {
  const el = document.getElementById('activityList');
  if (!el) return;
  el.innerHTML = RECENT_ACTIVITY.map(a => `
    <div class="activity-item">
      <div class="activity-dot ${a.color}">${a.icon}</div>
      <div>
        <div class="activity-text">${escapeHtml(a.text)}</div>
        <div class="activity-time">${escapeHtml(a.time)}</div>
      </div>
    </div>
  `).join('');
}

/* =========================================================
   23. NOTIFICATIONS PANEL
   ========================================================= */

function renderNotifications() {
  const el = document.getElementById('notifList');
  if (!el) return;
  el.innerHTML = NOTIFICATIONS.map(n => `
    <div class="notif-item">
      <div class="notif-icon">${n.icon}</div>
      <div>
        <div class="notif-text">${escapeHtml(n.text)}</div>
        <div class="notif-time">${escapeHtml(n.time)}</div>
      </div>
    </div>
  `).join('');
}

function openNotifications() {
  const panel = document.getElementById('notifPanel');
  STATE.notifOpen = !STATE.notifOpen;
  panel.classList.toggle('show', STATE.notifOpen);
}

function closeNotifications() {
  const panel = document.getElementById('notifPanel');
  if (panel) panel.classList.remove('show');
  STATE.notifOpen = false;
}

/* =========================================================
   24. MODALS
   ========================================================= */

function openModal(type) {
  const titles = {
    addClient: 'Add New Client',
    gstReturn: 'File GST Return',
    rocFiling: 'New ROC Filing',
    itrFiling: 'File New ITR',
    tdsReturn: 'File TDS Return',
    newAudit: 'Schedule New Audit',
    newDSC: 'Request New DSC',
    newEntry: 'Add Journal Entry',
    newTask: 'Add New Task',
    uploadDoc: 'Upload Document',
    newEvent: 'Add Calendar Event'
  };

  const bodies = {
    addClient: `
      <div class="form-grid">
        <div class="form-group"><label>Client Name</label><input type="text" class="form-control" id="addClientName" placeholder="Enter client name" /></div>
        <div class="form-group"><label>PAN / TAN</label><input type="text" class="form-control" id="addClientPAN" placeholder="Enter PAN/TAN" /></div>
        <div class="form-group"><label>Type</label>
          <select class="form-control" id="addClientType">
            <option>Individual</option><option>Company</option><option>LLP</option><option>Partnership</option>
          </select>
        </div>
        <div class="form-group"><label>GST Number</label><input type="text" class="form-control" id="addClientGST" placeholder="Enter GSTIN (optional)" /></div>
        <div class="form-group"><label>Email</label><input type="text" class="form-control" id="addClientEmail" placeholder="Enter email" /></div>
        <div class="form-group"><label>Phone</label><input type="text" class="form-control" id="addClientPhone" placeholder="Enter phone" /></div>
      </div>
      <button class="btn-primary" style="width:100%" onclick="submitAddClient()">Add Client</button>
    `,
    gstReturn: `<div class="empty-state"><div class="empty-state-icon">📊</div><div class="empty-state-text">Use the GST Dashboard form</div><div class="empty-state-sub">Fill in the "File New GST Return" form on the GST Dashboard page.</div></div>
      <button class="btn-primary" style="width:100%" onclick="closeModal();navigate('gst')">Go to GST Dashboard</button>`,
    rocFiling: `
      <div class="form-group"><label>Company Name</label><input type="text" class="form-control" id="rocCompany" placeholder="Enter company name" /></div>
      <div class="form-group"><label>CIN</label><input type="text" class="form-control" id="rocCIN" placeholder="Enter CIN" /></div>
      <div class="form-group"><label>Form Type</label>
        <select class="form-control" id="rocForm">
          <option>AOC-4</option><option>MGT-7</option><option>ADT-1</option><option>DIR-3 KYC</option><option>MGT-14</option>
        </select>
      </div>
      <div class="form-group"><label>Due Date</label><input type="date" class="form-control" id="rocDue" /></div>
      <button class="btn-primary" style="width:100%" onclick="submitROCFiling()">Create Filing</button>
    `,
    itrFiling: `<div class="empty-state"><div class="empty-state-icon">💰</div><div class="empty-state-text">Use the Income Tax form</div><div class="empty-state-sub">Fill in the "File New ITR" form on the Income Tax page.</div></div>
      <button class="btn-primary" style="width:100%" onclick="closeModal();navigate('incometax')">Go to Income Tax</button>`,
    tdsReturn: `<div class="empty-state"><div class="empty-state-icon">🧾</div><div class="empty-state-text">Use the TDS Filing form</div><div class="empty-state-sub">Fill in the "TDS Filing Form" on the TDS Returns page.</div></div>
      <button class="btn-primary" style="width:100%" onclick="closeModal();navigate('tds')">Go to TDS Returns</button>`,
    newAudit: `
      <div class="form-group"><label>Client</label>
        <select class="form-control" id="auditClient">${CLIENTS.slice(0, 15).map(c => `<option>${escapeHtml(c.name)}</option>`).join('')}</select>
      </div>
      <div class="form-group"><label>Audit Type</label>
        <select class="form-control" id="auditType">
          <option>Statutory Audit</option><option>Tax Audit</option><option>Internal Audit</option><option>Stock Audit</option>
        </select>
      </div>
      <div class="form-group"><label>Auditor</label>
        <select class="form-control" id="auditAuditor">
          <option>Karan Mehta</option><option>Anjali Rao</option><option>Sameer Joshi</option>
        </select>
      </div>
      <div class="form-group"><label>Start Date</label><input type="date" class="form-control" id="auditStart" /></div>
      <div class="form-group"><label>End Date</label><input type="date" class="form-control" id="auditEnd" /></div>
      <button class="btn-primary" style="width:100%" onclick="submitNewAudit()">Schedule Audit</button>
    `,
    newDSC: `<div class="empty-state"><div class="empty-state-icon">✍️</div><div class="empty-state-text">Use the DSC Request form</div><div class="empty-state-sub">Fill in the "Request New DSC" form on the DSC & eSign page.</div></div>
      <button class="btn-primary" style="width:100%" onclick="closeModal();navigate('dsc')">Go to DSC & eSign</button>`,
    newEntry: `<div class="empty-state"><div class="empty-state-icon">🧮</div><div class="empty-state-text">Use the Journal Entry form</div><div class="empty-state-sub">Fill in the "Add Journal Entry" form on the Accounting Hub page.</div></div>
      <button class="btn-primary" style="width:100%" onclick="closeModal();navigate('accounting')">Go to Accounting Hub</button>`,
    newTask: `
      <div class="form-group"><label>Task Title</label><input type="text" class="form-control" id="newTaskTitleModal" placeholder="Enter task title" /></div>
      <div class="form-group"><label>Tags (comma separated)</label><input type="text" class="form-control" id="newTaskTagsModal" placeholder="e.g. GST, High" /></div>
      <div class="form-group"><label>Assignee</label>
        <select class="form-control" id="newTaskAssigneeModal">
          <option>Karan</option><option>Anjali</option><option>Sameer</option><option>Priya</option><option>Vikram</option>
        </select>
      </div>
      <div class="form-group"><label>Due Date</label><input type="text" class="form-control" id="newTaskDueModal" placeholder="e.g. 28 May" /></div>
      <div class="form-group"><label>Column</label>
        <select class="form-control" id="newTaskColModal">
          <option value="todo">To Do</option><option value="inprogress">In Progress</option><option value="done">Done</option>
        </select>
      </div>
      <button class="btn-primary" style="width:100%" onclick="submitNewTaskModal()">Add Task</button>
    `,
    uploadDoc: `
      <div class="form-group"><label>Document Name</label><input type="text" class="form-control" id="uploadDocName" placeholder="e.g. Balance Sheet FY24-25.pdf" /></div>
      <div class="form-group"><label>Client</label>
        <select class="form-control" id="uploadDocClient">${CLIENTS.slice(0, 15).map(c => `<option>${escapeHtml(c.name)}</option>`).join('')}<option>Internal</option></select>
      </div>
      <div class="form-group"><label>Type</label>
        <select class="form-control" id="uploadDocType">
          <option value="PDF">PDF</option><option value="Excel">Excel</option><option value="Word">Word</option><option value="Image">Image</option>
        </select>
      </div>
      <button class="btn-primary" style="width:100%" onclick="submitUploadDoc()">Upload</button>
    `,
    newEvent: `
      <div class="form-group"><label>Event Title</label><input type="text" class="form-control" id="newEventTitle" placeholder="Enter event title" /></div>
      <div class="form-group"><label>Type</label>
        <select class="form-control" id="newEventType">
          <option>GST</option><option>TDS</option><option>ROC</option><option>DSC</option><option>Internal</option><option>PF</option>
        </select>
      </div>
      <div class="form-group"><label>Date</label><input type="date" class="form-control" id="newEventDate" /></div>
      <button class="btn-primary" style="width:100%" onclick="submitNewEvent()">Add Event</button>
    `
  };

  openModalWithContent(titles[type] || 'Modal', bodies[type] || '<p>Coming soon...</p>');
}

function openModalWithContent(title, bodyHtml) {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  document.getElementById('modalOverlay').classList.add('show');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
}

/* ---- Modal Form Submit Handlers ---- */

function submitAddClient() {
  const name = document.getElementById('addClientName').value.trim();
  if (!name) {
    showToast('Please enter client name');
    return;
  }
  const newClient = {
    id: CLIENTS.length + 1,
    name,
    pan: document.getElementById('addClientPAN').value.trim() || '-',
    type: document.getElementById('addClientType').value,
    gst: document.getElementById('addClientGST').value.trim() || '-',
    email: document.getElementById('addClientEmail').value.trim() || '-',
    phone: document.getElementById('addClientPhone').value.trim() || '-',
    status: 'Active'
  };
  CLIENTS.unshift(newClient);
  closeModal();
  STATE.pagination.clients.page = 1;
  renderClientTable();
  showToast('Client added successfully ✅');
}

function submitROCFiling() {
  const company = document.getElementById('rocCompany').value.trim();
  if (!company) {
    showToast('Please enter company name');
    return;
  }
  ROC_FILINGS.unshift({
    company,
    cin: document.getElementById('rocCIN').value.trim() || '-',
    form: document.getElementById('rocForm').value,
    due: formatDateInput(document.getElementById('rocDue').value) || 'TBD',
    status: 'In Progress'
  });
  closeModal();
  renderROCTable();
  showToast('ROC filing created successfully ✅');
}

function submitNewAudit() {
  AUDITS.unshift({
    client: document.getElementById('auditClient').value,
    type: document.getElementById('auditType').value,
    auditor: document.getElementById('auditAuditor').value,
    start: formatDateInput(document.getElementById('auditStart').value) || 'TBD',
    end: formatDateInput(document.getElementById('auditEnd').value) || 'TBD',
    status: 'In Progress'
  });
  closeModal();
  renderAuditTable();
  showToast('Audit scheduled successfully ✅');
}

function submitNewTaskModal() {
  const title = document.getElementById('newTaskTitleModal').value.trim();
  if (!title) {
    showToast('Please enter a task title');
    return;
  }
  const tagsRaw = document.getElementById('newTaskTagsModal').value.trim();
  const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
  STATE.taskIdCounter++;
  TASKS.push({
    id: STATE.taskIdCounter,
    title,
    tags,
    assignee: document.getElementById('newTaskAssigneeModal').value,
    due: document.getElementById('newTaskDueModal').value.trim() || 'TBD',
    col: document.getElementById('newTaskColModal').value
  });
  closeModal();
  renderKanban();
  showToast('Task added successfully ✅');
}

function submitUploadDoc() {
  const name = document.getElementById('uploadDocName').value.trim();
  if (!name) {
    showToast('Please enter document name');
    return;
  }
  const type = document.getElementById('uploadDocType').value;
  const iconMap = { PDF: '📕', Excel: '📗', Word: '📘', Image: '🖼️' };
  DOCUMENTS.unshift({
    name,
    type,
    icon: iconMap[type] || '📄',
    meta: `${document.getElementById('uploadDocClient').value} • New upload`
  });
  closeModal();
  renderDocuments();
  showToast('Document uploaded successfully ✅');
}

function submitNewEvent() {
  const title = document.getElementById('newEventTitle').value.trim();
  const dateVal = document.getElementById('newEventDate').value;
  if (!title || !dateVal) {
    showToast('Please fill in all fields');
    return;
  }
  const date = new Date(dateVal);
  const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
  if (!CAL_EVENTS[key]) CAL_EVENTS[key] = [];
  CAL_EVENTS[key].push({ title, type: document.getElementById('newEventType').value });

  closeModal();
  renderCalendar();
  renderEventList();
  showToast('Event added to calendar ✅');
}

function formatDateInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

/* =========================================================
   25. QUICK ACTION MENU
   ========================================================= */

function openQuickAction() {
  openModalWithContent('Quick Action', `
    <div class="quick-action-grid">
      <button class="qa-btn" onclick="closeModal();openModal('addClient')">
        <span class="qa-btn-icon">👥</span>
        <span class="qa-btn-label">Add Client</span>
      </button>
      <button class="qa-btn" onclick="closeModal();navigate('gst')">
        <span class="qa-btn-icon">📊</span>
        <span class="qa-btn-label">File GST Return</span>
      </button>
      <button class="qa-btn" onclick="closeModal();navigate('incometax')">
        <span class="qa-btn-icon">💰</span>
        <span class="qa-btn-label">File ITR</span>
      </button>
      <button class="qa-btn" onclick="closeModal();navigate('tds')">
        <span class="qa-btn-icon">🧾</span>
        <span class="qa-btn-label">File TDS Return</span>
      </button>
      <button class="qa-btn" onclick="closeModal();openModal('newAudit')">
        <span class="qa-btn-icon">🛡️</span>
        <span class="qa-btn-label">Schedule Audit</span>
      </button>
      <button class="qa-btn" onclick="closeModal();openModal('newTask')">
        <span class="qa-btn-icon">✅</span>
        <span class="qa-btn-label">Add Task</span>
      </button>
      <button class="qa-btn" onclick="closeModal();openModal('newDSC')">
        <span class="qa-btn-icon">✍️</span>
        <span class="qa-btn-label">Request DSC</span>
      </button>
      <button class="qa-btn" onclick="closeModal();openModal('newEvent')">
        <span class="qa-btn-icon">📅</span>
        <span class="qa-btn-label">Add Event</span>
      </button>
    </div>
  `);
}

/* =========================================================
   26. PROFILE
   ========================================================= */

function openProfile() {
  openModalWithContent('My Profile', `
    <div style="text-align:center;margin-bottom:16px">
      <div style="width:72px;height:72px;border-radius:50%;background:linear-gradient(135deg,var(--primary),var(--primary-dark));display:flex;align-items:center;justify-content:center;color:#fff;font-size:28px;font-weight:700;margin:0 auto 12px">K</div>
      <div style="font-weight:700;font-size:16px">Karan Mehta</div>
      <div style="color:var(--text-muted);font-size:13px">Partner — WITCORP India Advisors LLP</div>
    </div>
    <div class="form-group"><label>Email</label><div class="form-control" style="background:var(--bg)">karan@witcorp.in</div></div>
    <div class="form-group"><label>Phone</label><div class="form-control" style="background:var(--bg)">+91 98200 11223</div></div>
    <div class="form-group"><label>Role</label><div class="form-control" style="background:var(--bg)">Partner</div></div>
    <button class="btn-outline" style="width:100%;margin-top:8px;border-color:var(--danger);color:var(--danger)" onclick="showToast('Logged out (demo only)')">Logout</button>
  `);
}

/* =========================================================
   27. GLOBAL SEARCH
   ========================================================= */

function handleSearch(query) {
  if (!query || query.trim().length < 2) return;
  const q = query.trim().toLowerCase();

  // search clients
  const matchedClients = CLIENTS.filter(c => c.name.toLowerCase().includes(q)).slice(0, 5);

  // search tasks
  const matchedTasks = TASKS.filter(t => t.title.toLowerCase().includes(q)).slice(0, 5);

  if (matchedClients.length === 0 && matchedTasks.length === 0) return;

  // debounce-ish: only show suggestions on enter or pause - simplified to show toast summary
  clearTimeout(window._searchTimeout);
  window._searchTimeout = setTimeout(() => {
    let msg = '';
    if (matchedClients.length) msg += `${matchedClients.length} client(s) found. `;
    if (matchedTasks.length) msg += `${matchedTasks.length} task(s) found.`;
    if (msg) showToast(msg);
  }, 600);
}

/* =========================================================
   28. TOAST NOTIFICATIONS
   ========================================================= */

let toastTimeout = null;

function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}

/* =========================================================
   29. KEYBOARD SHORTCUTS
   ========================================================= */

function attachGlobalListeners() {
  document.addEventListener('keydown', (e) => {
    // Cmd/Ctrl + K to focus search
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const search = document.getElementById('globalSearch');
      if (search) search.focus();
    }
    // Escape closes modal & notif panel
    if (e.key === 'Escape') {
      closeModal();
      closeNotifications();
      if (window.innerWidth <= 768) closeSidebar();
    }
  });

  // close notif panel on outside click
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('notifPanel');
    const btn = e.target.closest('.icon-btn');
    if (panel && panel.classList.contains('show')) {
      if (!panel.contains(e.target) && (!btn || !btn.onclick || btn.onclick.toString().indexOf('openNotifications') === -1)) {
        if (!panel.contains(e.target) && !e.target.closest('[onclick*="openNotifications"]')) {
          closeNotifications();
        }
      }
    }
  });

  // responsive: close sidebar on resize to desktop
  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
      closeSidebar();
    }
  });
}

/* =========================================================
   30. UTILITY FUNCTIONS
   ========================================================= */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* =========================================================
   END OF app.js
   ========================================================= */
