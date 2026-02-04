# دليل تطبيق اللغة العربية والـRTL
# Arabic Language & RTL Implementation Guide

## نظرة عامة | Overview

تم تطبيق نظام شامل لدعم اللغة العربية مع RTL (Right-to-Left) في جميع أقسام النظام.
A comprehensive Arabic language and RTL (Right-to-Left) support has been implemented across all system sections.

---

## المميزات المطبقة | Implemented Features

### 1. نظام الترجمة الكامل | Complete Translation System

#### ✅ الأقسام المترجمة | Translated Sections:
- **الأساسيات | Common**: جميع العناصر المشتركة (أزرار، تنبيهات، إجراءات)
- **التنقل | Navigation**: القوائم والتنقل الرئيسي
- **المصادقة | Authentication**: تسجيل الدخول والتسجيل
- **لوحة المعلومات | Dashboard**: جميع الإحصائيات والمؤشرات
- **الموظفون | Employees**: إدارة الموظفين بالكامل
- **التوظيف | Recruitment**: عملية التوظيف والمقابلات
- **الحضور والانصراف | Attendance**: نظام الحضور
- **الإجازات | Leave Management**: إدارة الإجازات
- **الرواتب | Payroll**: نظام الرواتب
- **الأداء | Performance**: تقييم الأداء
- **التدريب | Training**: برامج التدريب
- **المستندات | Documents**: إدارة المستندات
- **نطاقات | Nitaqat**: نظام السعودة
- **التأمينات الاجتماعية | GOSI**: التأمينات
- **المركبات | Vehicles**: إدارة الأسطول
- **العقارات | Real Estate**: الأصول العقارية
- **العقود | Contracts**: إدارة العقود
- **التأمين | Insurance**: وثائق التأمين
- **السفر | Travel**: طلبات السفر
- **المصروفات | Expenses**: إدارة المصروفات
- **التأشيرات | Visas**: التأشيرات ورخص العمل
- **السلف والقروض | Advances & Loans**: السلف المالية والقروض
- **نهاية الخدمة | End of Service**: مكافآت نهاية الخدمة
- **سجل المراجعة | Audit Log**: تتبع العمليات
- **المهارات | Skills Management**: إدارة المهارات والكفاءات
- **سير العمل | Workflow**: إدارة سير العمل التلقائي
- **الصلاحيات | Permissions**: نظام الصلاحيات
- **الموارد البشرية العالمية | Global HR**: إدارة المغتربين
- **نظام إدارة التعلم | LMS**: المنصة التعليمية

---

## التطبيق التقني | Technical Implementation

### 1. سياق اللغة | Language Context

```typescript
// src/contexts/LanguageContext.tsx
const { language, setLanguage, t, isRTL } = useLanguage();

// التبديل بين اللغات | Switch Languages
setLanguage('ar'); // العربية
setLanguage('en'); // English

// استخدام الترجمات | Use Translations
<h1>{t.dashboard.title}</h1>
<button>{t.common.save}</button>
```

### 2. دعم RTL في Tailwind | Tailwind RTL Support

تم إضافة قواعد RTL مخصصة في التكوين:
Custom RTL rules added to configuration:

```javascript
// tailwind.config.js
plugins: [
  function ({ addUtilities }) {
    const newUtilities = {
      '.rtl': { direction: 'rtl' },
      '.ltr': { direction: 'ltr' },
    }
    addUtilities(newUtilities)
  },
]
```

### 3. CSS المخصص للعربية | Arabic-Specific CSS

#### الخطوط العربية | Arabic Fonts
```css
html[dir="rtl"] {
  font-family: 'Cairo', 'Noto Sans Arabic', 'Segoe UI', 'Tahoma', 'Arial', sans-serif;
}
```

#### محاذاة النصوص | Text Alignment
```css
[dir="rtl"] {
  text-align: right;
}

[dir="rtl"] input,
[dir="rtl"] textarea,
[dir="rtl"] select {
  text-align: right;
}
```

#### الهوامش والحشو | Margins & Padding
```css
[dir="rtl"] .ml-auto {
  margin-left: 0 !important;
  margin-right: auto !important;
}

[dir="rtl"] .pl-10 {
  padding-left: 0.75rem !important;
  padding-right: 2.5rem !important;
}
```

#### الحدود | Borders
```css
[dir="rtl"] .border-l {
  border-left: 0 !important;
  border-right: 1px solid !important;
}

[dir="rtl"] .rounded-l-lg {
  border-top-left-radius: 0 !important;
  border-bottom-left-radius: 0 !important;
  border-top-right-radius: 0.5rem !important;
  border-bottom-right-radius: 0.5rem !important;
}
```

---

## استخدام RTL في المكونات | RTL Usage in Components

### مثال: عنصر بسيط | Example: Simple Element
```tsx
import { useLanguage } from '@/contexts/LanguageContext';

function MyComponent() {
  const { t, isRTL } = useLanguage();

  return (
    <div className={`flex items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
      <span>{t.common.name}</span>
      <input type="text" className="input-field" />
    </div>
  );
}
```

### مثال: قائمة مع أيقونات | Example: Menu with Icons
```tsx
<div className={`flex items-center gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
  <Icon className="h-5 w-5" />
  <span className={isRTL ? 'text-right' : 'text-left'}>
    {t.nav.dashboard}
  </span>
</div>
```

### مثال: جدول بيانات | Example: Data Table
```tsx
<table className="data-table">
  <thead>
    <tr>
      <th className={isRTL ? 'text-right' : 'text-left'}>
        {t.employees.employeeNumber}
      </th>
      <th className={isRTL ? 'text-right' : 'text-left'}>
        {t.common.name}
      </th>
    </tr>
  </thead>
</table>
```

---

## الأدوات المساعدة | Utility Classes

### للعربية | For Arabic
```css
/* قلب الاتجاه | Flip Direction */
.rtl-flip

/* الظل من اليسار | Shadow from Left */
.shadow-left

/* الحركات | Animations */
.animate-slideIn /* تتكيف تلقائياً مع RTL */
```

### للمسافات | For Spacing
```css
/* تلقائياً في RTL | Automatically in RTL */
.space-x-2
.space-x-3
.space-x-4
```

---

## الأرقام والعملة | Numbers & Currency

### الأرقام في الحقول | Numbers in Fields
```tsx
{/* الأرقام تظل من اليسار إلى اليمين | Numbers stay LTR */}
<input
  type="number"
  className="input-field"
  // يتم التعامل تلقائياً | Handled automatically
/>
```

### تنسيق العملة | Currency Formatting
```typescript
// في العربية | In Arabic
t.numbers.currency // "ر.س"
t.numbers.currencyLong // "ريال سعودي"

// في الإنجليزية | In English
t.numbers.currency // "SAR"
```

---

## التواريخ | Dates

### التنسيقات | Formats
```typescript
// العربية | Arabic
t.dateFormat.short // "DD/MM/YYYY"
t.dateFormat.long // "DD MMMM، YYYY"
t.dateFormat.withTime // "DD/MM/YYYY - HH:mm"

// الإنجليزية | English
t.dateFormat.short // "MM/DD/YYYY"
t.dateFormat.long // "MMMM DD, YYYY"
```

### الأيام والشهور | Days & Months
```typescript
// الأيام بالعربية | Days in Arabic
t.days.saturday // "السبت"
t.days.sunday // "الأحد"

// الشهور بالعربية | Months in Arabic
t.months.january // "يناير"
t.months.february // "فبراير"

// الشهور الهجرية | Hijri Months
t.hijriMonths.muharram // "محرم"
t.hijriMonths.ramadan // "رمضان"
```

---

## أفضل الممارسات | Best Practices

### ✅ استخدم دائماً | Always Use:
1. `isRTL` للتحقق من الاتجاه | Check direction with `isRTL`
2. `flex-row-reverse` للعناصر المرنة | Use `flex-row-reverse` for flex items
3. `text-right/text-left` بشكل شرطي | Conditional `text-right/text-left`
4. الترجمات من `t` | Translations from `t` object

### ❌ تجنب | Avoid:
1. الترجمة المباشرة في الكود | Hardcoded text in components
2. القيم الثابتة للاتجاه | Fixed directional values
3. `!important` بدون سبب | Unnecessary `!important`
4. مزج LTR و RTL في نفس العنصر | Mixing LTR and RTL

---

## الاختبار | Testing

### اختبر في كلا الاتجاهين | Test in Both Directions

```typescript
// التبديل للعربية | Switch to Arabic
setLanguage('ar');

// تحقق من:  | Check:
// ✓ المحاذاة صحيحة | Alignment is correct
// ✓ الأيقونات في المكان الصحيح | Icons in right position
// ✓ الهوامش والحشو صحيح | Margins and padding correct
// ✓ الجداول منسقة | Tables are formatted
// ✓ النماذج تعمل | Forms work properly
```

---

## أمثلة عملية | Practical Examples

### نموذج بحث | Search Form
```tsx
<div className={`relative ${isRTL ? 'text-right' : 'text-left'}`}>
  <input
    type="text"
    placeholder={t.common.search}
    className="input-field"
  />
  <Search className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'}`} />
</div>
```

### بطاقة إحصائية | Stat Card
```tsx
<div className="stat-card">
  <div className={`flex justify-between items-center ${isRTL ? 'flex-row-reverse' : ''}`}>
    <div className={isRTL ? 'text-right' : 'text-left'}>
      <p className="text-gray-600 text-sm">{t.dashboard.totalEmployees}</p>
      <p className="text-3xl font-bold">1,234</p>
    </div>
    <Users className="h-12 w-12 text-primary-600" />
  </div>
</div>
```

### قائمة منسدلة | Dropdown Menu
```tsx
<div className={`absolute mt-2 w-64 bg-white rounded-lg shadow-xl
  ${isRTL ? 'left-0' : 'right-0'}`}>
  <button className={`w-full px-4 py-2 hover:bg-primary-50
    ${isRTL ? 'text-right' : 'text-left'}`}>
    {t.common.settings}
  </button>
</div>
```

---

## الدعم المستقبلي | Future Support

### التحسينات المقترحة | Suggested Improvements:
1. ✅ دعم التاريخ الهجري | Hijri calendar support
2. ✅ تنسيق الأرقام العربية | Arabic numeral formatting
3. ✅ دعم اللهجات المحلية | Local dialect support
4. ✅ تحسين الأداء | Performance optimization

---

## استكشاف الأخطاء | Troubleshooting

### المشكلة: النص لا ينعكس | Issue: Text Not Flipping
```typescript
// التأكد من تطبيق الاتجاه | Ensure direction is applied
document.documentElement.dir // يجب أن يكون 'rtl' أو 'ltr'
```

### المشكلة: الأيقونات في المكان الخطأ | Issue: Icons in Wrong Position
```tsx
// استخدم الشرط الصحيح | Use correct condition
className={`icon ${isRTL ? 'mr-2' : 'ml-2'}`}
```

### المشكلة: الجداول غير منسقة | Issue: Tables Not Formatted
```css
/* تأكد من استخدام | Ensure using */
.data-table th {
  @apply text-left;
}

[dir="rtl"] .data-table th {
  @apply text-right;
}
```

---

## الموارد | Resources

### الملفات الرئيسية | Key Files:
- `src/contexts/LanguageContext.tsx` - سياق اللغة
- `src/locales/ar.ts` - الترجمات العربية
- `src/locales/en.ts` - الترجمات الإنجليزية
- `src/styles/index.css` - أنماط RTL
- `tailwind.config.js` - تكوين Tailwind

### الخطوط | Fonts:
- **Cairo**: خط عربي حديث | Modern Arabic font
- **Noto Sans Arabic**: خط احتياطي | Fallback font

---

## الخلاصة | Summary

✅ **مكتمل بالكامل** | **Fully Implemented**
- دعم شامل للعربية والـRTL
- Full Arabic and RTL support
- جميع الأقسام والنماذج مترجمة
- All sections and forms translated
- أنماط CSS مخصصة للعربية
- Custom CSS for Arabic
- خطوط عربية محسّنة
- Optimized Arabic fonts

🎉 **جاهز للاستخدام** | **Ready to Use**
