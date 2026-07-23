// ตัวเลือกทั้งหมดของแบบฟอร์มสมัคร (อ้างอิงจากแบบฟอร์มทางการ Makro Internship & Co-op)
// เก็บรวมไว้ที่เดียวเพื่อแก้ง่าย + ใช้ซ้ำในหน้า Admin ตอนแสดงผล

export const TITLES = ['นาย', 'นาง', 'นางสาว', 'อื่น ๆ'];

export const GENDERS = ['ชาย', 'หญิง', 'ไม่ประสงค์ระบุ'];

export const MILITARY_STATUS = [
  'ผ่านการเกณฑ์ทหารแล้ว',
  'สำเร็จหลักสูตรนักศึกษาวิชาทหาร',
  'ได้รับการยกเว้น',
  'อยู่ระหว่างรอการเกณฑ์ทหาร',
  'ยังไม่ถึงกำหนดเกณฑ์ทหาร',
  'ไม่เกี่ยวข้อง',
];

export const ADDRESS_MATCH = ['ตรงกัน', 'ไม่ตรงกัน'];

export const EDU_LEVELS = [
  'ประกาศนียบัตรวิชาชีพ (ปวช.)',
  'ประกาศนียบัตรวิชาชีพชั้นสูง (ปวส.)',
  'ปริญญาตรี',
  'ปริญญาโท',
];

export const YEAR_LEVELS = [
  'ชั้นปีที่ 1',
  'ชั้นปีที่ 2',
  'ชั้นปีที่ 3',
  'ชั้นปีที่ 4',
  'ชั้นปีที่ 5 หรือสูงกว่า',
  'จบการศึกษาแล้ว',
];

export const APPLICATION_TYPES = [
  'ฝึกงานภาคฤดูร้อน 8 สัปดาห์',
  'สหกิจศึกษา 16 สัปดาห์',
  'ฝึกงานตามระยะเวลาที่สถาบันกำหนด',
];

export const COMPUTER_SKILLS = [
  'Microsoft Word',
  'Microsoft Excel',
  'Microsoft PowerPoint',
  'Google Workspace',
  'Canva',
  'Power BI',
  'โปรแกรมวิเคราะห์ข้อมูล',
  'โปรแกรมออกแบบ',
  'เครื่องมือ AI เช่น ChatGPT หรือ Gemini',
  'อื่น ๆ',
];

export const WORK_6DAYS = [
  'สามารถปฏิบัติงานได้',
  'ไม่สามารถปฏิบัติงานได้',
  'ต้องการสอบถามรายละเอียดเพิ่มเติม',
];

export const WORK_SHIFT = [
  'สามารถปฏิบัติงานเป็นกะได้',
  'ไม่สามารถปฏิบัติงานเป็นกะได้',
  'มีข้อจำกัดด้านเวลา',
];

export const REGION_ABILITY = [
  'สามารถปฏิบัติงานได้ตามที่บริษัทกำหนด',
  'สามารถปฏิบัติงานได้เฉพาะบางภูมิภาค',
  'ไม่สามารถย้ายหรือเดินทางไปปฏิบัติงานต่างพื้นที่ได้',
];

export const REGIONS = [
  'กรุงเทพมหานครและปริมณฑล',
  'ภาคกลาง',
  'ภาคตะวันออก',
  'ภาคตะวันตก',
  'ภาคเหนือ',
  'ภาคตะวันออกเฉียงเหนือ',
  'ภาคใต้',
  'สามารถปฏิบัติงานได้ทุกภูมิภาค',
];

export const FRESH_FOOD_DEPTS = [
  'เนื้อสัตว์',
  'อาหารทะเล',
  'ผักและผลไม้',
  'อาหารแช่แข็งและแช่เย็น',
  'เบเกอรี่',
  'สนใจเรียนรู้ทุกแผนก',
];

export const VEHICLES = ['รถยนต์', 'รถจักรยานยนต์', 'ไม่มีพาหนะส่วนตัว', 'อื่น ๆ'];

export const NEWS_SOURCES = [
  'Facebook',
  'TikTok',
  'Instagram',
  'LINE',
  'LinkedIn',
  'เว็บไซต์ Makro Careers',
  'สถาบันการศึกษา',
  'อาจารย์หรือเจ้าหน้าที่สหกิจศึกษา',
  'รุ่นพี่หรือเพื่อนแนะนำ',
  'Campus Roadshow หรือ Job Fair',
  'JobThai',
  'JobBKK',
  'InternTH',
  'เว็บไซต์หางานอื่น ๆ',
  'ป้ายประชาสัมพันธ์ที่สาขาแม็คโคร',
  'อื่น ๆ',
];

export const MARKETING_CONSENT = ['ยินยอม', 'ไม่ยินยอม'];

// โครงข้อมูลฟอร์มทั้งหมด (ทุกฟิลด์ที่ไม่ใช่ไฟล์)
export interface MakroFormData {
  programId: string;
  // ส่วนที่ 1
  title: string;
  titleOther: string;
  firstNameTh: string;
  lastNameTh: string;
  firstNameEn: string;
  lastNameEn: string;
  nickname: string;
  dob: string;
  gender: string;
  militaryStatus: string;
  phone: string;
  lineId: string;
  email: string;
  nationalId: string;
  weight: string;
  height: string;
  idCardAddress: string;
  currentAddressMatch: string;
  currentAddress: string;
  // ส่วนที่ 2
  eduLevel: string;
  institution: string;
  faculty: string;
  major: string;
  yearLevel: string;
  gpax: string;
  gradMonthYear: string;
  applicationType: string;
  availableStart: string;
  availableEnd: string;
  // ส่วนที่ 3
  coordinatorName: string;
  coordinatorPosition: string;
  coordinatorPhone: string;
  coordinatorEmail: string;
  // ส่วนที่ 4
  activities: string;
  languages: string;
  computerSkills: string[];
  computerSkillsOther: string;
  specialSkills: string;
  motivation: string;
  // ส่วนที่ 5
  work6days: string;
  workShift: string;
  workShiftLimit: string;
  regionAbility: string;
  regions: string[];
  province1: string;
  province2: string;
  province3: string;
  freshFoodRank: string[];
  vehicle: string;
  vehicleOther: string;
  // ส่วนที่ 7
  newsSources: string[];
  newsSourceOther: string;
  referralDetail: string;
  // ส่วนที่ 8
  certifyAccuracy: boolean;
  acknowledgePrivacy: boolean;
  marketingConsent: string;
}

export const EMPTY_FORM: MakroFormData = {
  programId: '',
  title: '',
  titleOther: '',
  firstNameTh: '',
  lastNameTh: '',
  firstNameEn: '',
  lastNameEn: '',
  nickname: '',
  dob: '',
  gender: '',
  militaryStatus: '',
  phone: '',
  lineId: '',
  email: '',
  nationalId: '',
  weight: '',
  height: '',
  idCardAddress: '',
  currentAddressMatch: '',
  currentAddress: '',
  eduLevel: '',
  institution: '',
  faculty: '',
  major: '',
  yearLevel: '',
  gpax: '',
  gradMonthYear: '',
  applicationType: '',
  availableStart: '',
  availableEnd: '',
  coordinatorName: '',
  coordinatorPosition: '',
  coordinatorPhone: '',
  coordinatorEmail: '',
  activities: '',
  languages: '',
  computerSkills: [],
  computerSkillsOther: '',
  specialSkills: '',
  motivation: '',
  work6days: '',
  workShift: '',
  workShiftLimit: '',
  regionAbility: '',
  regions: [],
  province1: '',
  province2: '',
  province3: '',
  freshFoodRank: [],
  vehicle: '',
  vehicleOther: '',
  newsSources: [],
  newsSourceOther: '',
  referralDetail: '',
  certifyAccuracy: false,
  acknowledgePrivacy: false,
  marketingConsent: '',
};

// label ภาษาไทยของแต่ละฟิลด์ + ลำดับการแสดงในหน้า Admin (คีย์ที่ขึ้นต้น _ จะถูกซ่อน)
export const FIELD_LABELS: { key: keyof MakroFormData; label: string }[] = [
  { key: 'title', label: 'คำนำหน้า' },
  { key: 'titleOther', label: 'คำนำหน้า (อื่น ๆ)' },
  { key: 'firstNameEn', label: 'ชื่อ (อังกฤษ)' },
  { key: 'lastNameEn', label: 'นามสกุล (อังกฤษ)' },
  { key: 'nickname', label: 'ชื่อเล่น' },
  { key: 'dob', label: 'วันเกิด' },
  { key: 'gender', label: 'เพศ' },
  { key: 'militaryStatus', label: 'สถานะทางทหาร' },
  { key: 'nationalId', label: 'เลขบัตรประชาชน' },
  { key: 'weight', label: 'น้ำหนัก (กก.)' },
  { key: 'height', label: 'ส่วนสูง (ซม.)' },
  { key: 'idCardAddress', label: 'ที่อยู่ตามบัตร' },
  { key: 'currentAddressMatch', label: 'ที่อยู่ปัจจุบันตรงกับบัตร' },
  { key: 'currentAddress', label: 'ที่อยู่ปัจจุบัน' },
  { key: 'eduLevel', label: 'ระดับการศึกษา' },
  { key: 'applicationType', label: 'ประเภทการสมัคร' },
  { key: 'availableStart', label: 'เริ่มปฏิบัติงานได้' },
  { key: 'availableEnd', label: 'สิ้นสุด' },
  { key: 'coordinatorName', label: 'ผู้ประสานงาน' },
  { key: 'coordinatorPosition', label: 'ตำแหน่งผู้ประสานงาน' },
  { key: 'coordinatorPhone', label: 'โทรผู้ประสานงาน' },
  { key: 'coordinatorEmail', label: 'อีเมลผู้ประสานงาน' },
  { key: 'activities', label: 'กิจกรรม/ประสบการณ์' },
  { key: 'languages', label: 'ทักษะภาษา' },
  { key: 'computerSkills', label: 'ทักษะคอมพิวเตอร์' },
  { key: 'computerSkillsOther', label: 'ทักษะคอมพิวเตอร์ (อื่น ๆ)' },
  { key: 'specialSkills', label: 'ความสามารถพิเศษ' },
  { key: 'motivation', label: 'แนะนำตัว/แรงจูงใจ' },
  { key: 'work6days', label: 'ทำงาน 6 วัน/สัปดาห์' },
  { key: 'workShift', label: 'ทำงานเป็นกะ' },
  { key: 'workShiftLimit', label: 'ข้อจำกัดด้านเวลา' },
  { key: 'regionAbility', label: 'ปฏิบัติงานต่างภูมิภาค' },
  { key: 'regions', label: 'ภูมิภาคที่สะดวก' },
  { key: 'province1', label: 'จังหวัดลำดับ 1' },
  { key: 'province2', label: 'จังหวัดลำดับ 2' },
  { key: 'province3', label: 'จังหวัดลำดับ 3' },
  { key: 'freshFoodRank', label: 'ความสนใจแผนกอาหารสด (เรียงลำดับ)' },
  { key: 'vehicle', label: 'พาหนะส่วนตัว' },
  { key: 'vehicleOther', label: 'พาหนะ (อื่น ๆ)' },
  { key: 'newsSources', label: 'ทราบข่าวจากช่องทาง' },
  { key: 'newsSourceOther', label: 'ช่องทางข่าว (อื่น ๆ)' },
  { key: 'referralDetail', label: 'ผู้/สิ่งที่แนะนำ' },
  { key: 'marketingConsent', label: 'ยินยอมรับข่าวสารอนาคต' },
];

export const STEP_TITLES = [
  'ข้อมูลส่วนบุคคล',
  'ข้อมูลการศึกษา',
  'ผู้ประสานงานสถาบัน',
  'กิจกรรม ประสบการณ์ ทักษะ',
  'ความพร้อมปฏิบัติงาน',
  'เอกสารประกอบ',
  'ช่องทางรับข่าวสาร',
  'รับรองข้อมูล & PDPA',
];
