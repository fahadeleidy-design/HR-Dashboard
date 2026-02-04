# مرجع سريع للعربية والـRTL
# Arabic & RTL Quick Reference

## 🚀 البدء السريع | Quick Start

### تبديل اللغة | Switch Language
```tsx
import { useLanguage } from '@/contexts/LanguageContext';

function Component() {
  const { language, setLanguage, t, isRTL } = useLanguage();

  // التبديل | Toggle
  setLanguage(language === 'en' ? 'ar' : 'en');

  return <h1>{t.common.appTitle}</h1>;
}
```

---

## 📋 الأنماط الشائعة | Common Patterns

### 1. Flex مع RTL | Flex with RTL
```tsx
<div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
  <Icon />
  <span>{t.common.name}</span>
</div>
```

### 2. محاذاة النص | Text Alignment
```tsx
<p className={isRTL ? 'text-right' : 'text-left'}>
  {t.employees.title}
</p>
```

### 3. المسافات | Spacing
```tsx
<div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
  {/* العناصر | Items */}
</div>
```

### 4. الموضع المطلق | Absolute Positioning
```tsx
<div className={`absolute top-0 ${isRTL ? 'left-0' : 'right-0'}`}>
  {/* المحتوى | Content */}
</div>
```

### 5. الحدود | Borders
```tsx
<div className={`border ${isRTL ? 'border-l' : 'border-r'}`}>
  {/* المحتوى | Content */}
</div>
```

---

## 🎨 مكونات جاهزة | Ready-to-Use Components

### بطاقة | Card
```tsx
<div className="card">
  <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
    <h3 className={isRTL ? 'text-right' : 'text-left'}>
      {t.dashboard.title}
    </h3>
    <button className="btn-primary">{t.common.add}</button>
  </div>
</div>
```

### نموذج | Form
```tsx
<form className="space-y-4">
  <div>
    <label className={`block mb-2 ${isRTL ? 'text-right' : 'text-left'}`}>
      {t.employees.firstName}
    </label>
    <input type="text" className="input-field" />
  </div>
</form>
```

### جدول | Table
```tsx
<table className="data-table">
  <thead>
    <tr>
      <th className={isRTL ? 'text-right' : 'text-left'}>
        {t.common.name}
      </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td className={isRTL ? 'text-right' : 'text-left'}>
        محمد أحمد
      </td>
    </tr>
  </tbody>
</table>
```

### قائمة منسدلة | Dropdown
```tsx
<div className={`absolute mt-2 w-64 rounded-lg shadow-xl
  ${isRTL ? 'left-0' : 'right-0'}`}>
  <button className={`w-full px-4 py-2 ${isRTL ? 'text-right' : 'text-left'}`}>
    {t.common.settings}
  </button>
</div>
```

---

## 🔤 الترجمات المتاحة | Available Translations

### الأساسيات | Common
```typescript
t.common.search          // "بحث" | "Search"
t.common.add             // "إضافة" | "Add"
t.common.edit            // "تعديل" | "Edit"
t.common.delete          // "حذف" | "Delete"
t.common.save            // "حفظ" | "Save"
t.common.cancel          // "إلغاء" | "Cancel"
t.common.submit          // "إرسال" | "Submit"
t.common.loading         // "جاري التحميل..." | "Loading..."
t.common.noData          // "لا توجد بيانات" | "No data available"
```

### التنقل | Navigation
```typescript
t.nav.dashboard          // "لوحة المعلومات" | "Dashboard"
t.nav.employees          // "الموظفون" | "Employees"
t.nav.recruitment        // "التوظيف والتعيين" | "Recruitment"
t.nav.attendance         // "الحضور والانصراف" | "Attendance"
t.nav.leave              // "الإجازات" | "Leave"
t.nav.payroll            // "كشف الرواتب" | "Payroll"
t.nav.performance        // "تقييم الأداء" | "Performance"
t.nav.training           // "التدريب والتطوير" | "Training"
```

### الموظفون | Employees
```typescript
t.employees.title        // "الموظفون" | "Employees"
t.employees.addEmployee  // "إضافة موظف" | "Add Employee"
t.employees.firstName    // "الاسم الأول" | "First Name"
t.employees.lastName     // "اسم العائلة" | "Last Name"
t.employees.jobTitle     // "المسمى الوظيفي" | "Job Title"
t.employees.department   // "القسم" | "Department"
t.employees.basicSalary  // "الراتب الأساسي" | "Basic Salary"
```

### الإجازات | Leave
```typescript
t.leave.title            // "إدارة الإجازات" | "Leave Management"
t.leave.requestLeave     // "طلب إجازة" | "Request Leave"
t.leave.annualLeave      // "إجازة سنوية" | "Annual Leave"
t.leave.sickLeave        // "إجازة مرضية" | "Sick Leave"
t.leave.approved         // "موافق عليها" | "Approved"
t.leave.pending          // "معلق" | "Pending"
t.leave.rejected         // "مرفوضة" | "Rejected"
```

---

## 🎯 نصائح سريعة | Quick Tips

### ✅ افعل | Do
```tsx
// استخدم isRTL للتحكم بالاتجاه
const className = isRTL ? 'mr-4' : 'ml-4';

// استخدم الترجمات دائماً
<button>{t.common.save}</button>

// استخدم flex-row-reverse
<div className={`flex ${isRTL ? 'flex-row-reverse' : ''}`}>
```

### ❌ لا تفعل | Don't
```tsx
// لا تستخدم نصوص ثابتة
<button>Save</button>

// لا تستخدم قيم ثابتة
<div className="flex ml-4">

// لا تنسى RTL في العناصر المرنة
<div className="flex">
```

---

## 🔧 أدوات التطوير | Development Tools

### فحص الاتجاه | Check Direction
```javascript
console.log(document.documentElement.dir); // 'rtl' or 'ltr'
console.log(document.documentElement.lang); // 'ar' or 'en'
```

### فحص الترجمة | Check Translation
```javascript
console.log(t); // كائن الترجمات | Translations object
```

### تبديل سريع | Quick Toggle
في المتصفح: انقر على زر اللغات في الشريط العلوي
In browser: Click the language button in the top bar

---

## 📱 الاستجابة | Responsive

### للشاشات الصغيرة | For Small Screens
```tsx
<div className={`flex flex-col sm:flex-row ${isRTL ? 'sm:flex-row-reverse' : ''}`}>
  {/* المحتوى | Content */}
</div>
```

### إخفاء/إظهار | Hide/Show
```tsx
<span className="hidden sm:inline">{t.common.details}</span>
```

---

## 🎨 الأنماط المخصصة | Custom Styles

### للعربية فقط | For Arabic Only
```css
[dir="rtl"] .custom-class {
  /* أنماط خاصة بالعربية | Arabic-specific styles */
}
```

### للإنجليزية فقط | For English Only
```css
[dir="ltr"] .custom-class {
  /* أنماط خاصة بالإنجليزية | English-specific styles */
}
```

---

## 🌐 الخطوط | Fonts

### العربية | Arabic
- **Cairo**: الخط الأساسي | Primary font
- **Noto Sans Arabic**: الخط الاحتياطي | Fallback font

### استخدام الخط | Font Usage
```css
html[dir="rtl"] {
  font-family: 'Cairo', 'Noto Sans Arabic', sans-serif;
}
```

---

## 📊 التنسيقات | Formats

### الأرقام | Numbers
```typescript
// العربية | Arabic
1,234.56 → ١٬٢٣٤٫٥٦

// العملة | Currency
t.numbers.currency        // "ر.س"
t.numbers.currencyLong    // "ريال سعودي"
```

### التواريخ | Dates
```typescript
// العربية | Arabic
t.dateFormat.short        // "DD/MM/YYYY"
t.dateFormat.long         // "DD MMMM، YYYY"

// الإنجليزية | English
t.dateFormat.short        // "MM/DD/YYYY"
t.dateFormat.long         // "MMMM DD, YYYY"
```

---

## 🐛 استكشاف الأخطاء | Debugging

### المشكلة الشائعة 1 | Common Issue 1
**المشكلة**: النص لا ينعكس
**Issue**: Text not flipping

**الحل | Solution**:
```tsx
// تأكد من استخدام | Make sure to use
const { isRTL } = useLanguage();
className={isRTL ? 'flex-row-reverse' : ''}
```

### المشكلة الشائعة 2 | Common Issue 2
**المشكلة**: الترجمة لا تظهر
**Issue**: Translation not showing

**الحل | Solution**:
```tsx
// تأكد من استيراد | Make sure to import
const { t } = useLanguage();
// وليس | Not
import { t } from '@/locales/ar';
```

### المشكلة الشائعة 3 | Common Issue 3
**المشكلة**: الأيقونات في المكان الخطأ
**Issue**: Icons in wrong position

**الحل | Solution**:
```tsx
// استخدم الشرط | Use condition
className={`absolute ${isRTL ? 'left-0' : 'right-0'}`}
```

---

## 💡 أمثلة من المشروع | Project Examples

### عنصر التنقل | Navigation Item
```tsx
<Link
  to="/employees"
  className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}
>
  <Users className="h-5 w-5" />
  <span>{t.nav.employees}</span>
</Link>
```

### بطاقة إحصائية | Stat Card
```tsx
<div className="stat-card">
  <div className={`flex justify-between ${isRTL ? 'flex-row-reverse' : ''}`}>
    <div className={isRTL ? 'text-right' : 'text-left'}>
      <p className="text-sm text-gray-600">{t.dashboard.totalEmployees}</p>
      <p className="text-3xl font-bold">1,234</p>
    </div>
    <Users className="h-12 w-12 text-primary-600" />
  </div>
</div>
```

### نموذج بحث | Search Form
```tsx
<div className="relative">
  <input
    type="text"
    placeholder={t.common.search}
    className={`input-field ${isRTL ? 'pr-10' : 'pl-10'}`}
  />
  <Search
    className={`absolute top-3 ${isRTL ? 'right-3' : 'left-3'} h-5 w-5`}
  />
</div>
```

---

## 📚 المزيد من المعلومات | More Information

راجع `RTL_IMPLEMENTATION_GUIDE.md` للحصول على دليل شامل
See `RTL_IMPLEMENTATION_GUIDE.md` for comprehensive guide

---

## ✅ قائمة التحقق | Checklist

عند إضافة مكون جديد، تأكد من:
When adding a new component, ensure:

- [ ] استخدام `isRTL` للتحكم بالاتجاه | Use `isRTL` for direction
- [ ] استخدام الترجمات من `t` | Use translations from `t`
- [ ] إضافة `flex-row-reverse` للعناصر المرنة | Add `flex-row-reverse` for flex
- [ ] محاذاة النص بشكل شرطي | Conditional text alignment
- [ ] اختبار في كلا الاتجاهين | Test in both directions
- [ ] التأكد من الأيقونات | Verify icons position
- [ ] فحص الهوامش والحشو | Check margins and padding

🎉 **الآن أنت جاهز لبناء مكونات متعددة اللغات!**
🎉 **You're now ready to build multilingual components!**
