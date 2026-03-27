# SearchableSelect Component - Migration Guide

## 📋 Overview

Ye guide aapko dikhayega ki kaise purane `<select>` elements ko naye **SearchableSelect** component se replace karein throughout the application.

## ✨ Features

- 🔍 **Searchable**: Real-time search/filter functionality
- 📋 **Copyable**: Selected value aur options dono copyable
- 🎨 **Beautiful**: Existing design ke saath match karta hai
- 🌓 **Dark Mode**: Full dark mode support
- ⌨️ **Keyboard Navigation**: Enter, Space, Escape keys
- ♿ **Accessible**: ARIA labels aur keyboard support
- 📱 **Responsive**: Mobile aur desktop friendly

## 🚀 Quick Start

### Step 1: Import karo

```tsx
import SearchableSelect, { SearchableSelectOption } from './components/SearchableSelect';
```

### Step 2: Options prepare karo

```tsx
const options: SearchableSelectOption[] = modules.map(module => ({
    value: module.moduleId,
    label: module.moduleDisplayName || module.moduleName
}));
```

### Step 3: Use karo

```tsx
<SearchableSelect
    label="Module Name"
    value={selectedModule}
    onChange={setSelectedModule}
    options={options}
    placeholder="Select Module Name"
/>
```

## 📖 Detailed Migration Examples

### Example 1: ImportMaster.tsx - Module Selection

**BEFORE:**
```tsx
<div>
    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
        Module Name
    </label>
    <select
        className="w-full px-3 py-1.5 bg-white dark:bg-[#1e293b] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm text-gray-900 dark:text-white"
        value={selectedModule}
        onChange={handleModuleChange}
    >
        <option value="" disabled hidden>Select Module Name</option>
        {modules.map((module) => (
            <option key={module.moduleId} value={module.moduleId}>
                {module.moduleDisplayName || module.moduleName}
            </option>
        ))}
    </select>
</div>
```

**AFTER:**
```tsx
<SearchableSelect
    label="Module Name"
    value={selectedModule}
    onChange={(value) => {
        const e = { target: { value: value.toString() } };
        handleModuleChange(e as any);
    }}
    options={modules.map(m => ({
        value: m.moduleId,
        label: m.moduleDisplayName || m.moduleName
    }))}
    placeholder="Select Module Name"
/>
```

### Example 2: Item Group Selection (Numeric values)

**BEFORE:**
```tsx
<select
    className="w-full px-3 py-1.5..."
    value={selectedItemGroup}
    onChange={(e) => {
        setSelectedItemGroup(Number(e.target.value));
        if (Number(e.target.value) > 0) {
            setIsFileUploadEnabled(true);
        } else {
            setIsFileUploadEnabled(false);
        }
    }}
>
    <option value={0} disabled hidden>Select Item Group</option>
    {itemGroups.map((group) => (
        <option key={group.itemGroupID} value={group.itemGroupID}>
            {group.itemGroupName}
        </option>
    ))}
</select>
```

**AFTER:**
```tsx
<SearchableSelect
    label="Item Group"
    value={selectedItemGroup}
    onChange={(value) => {
        const numValue = Number(value);
        setSelectedItemGroup(numValue);
        setIsFileUploadEnabled(numValue > 0);
    }}
    options={itemGroups.map(g => ({
        value: g.itemGroupID,
        label: g.itemGroupName
    }))}
    placeholder="Select Item Group"
/>
```

### Example 3: Disabled Dropdown

**BEFORE:**
```tsx
<select
    className="w-full px-3 py-1.5..."
    value={selectedSubModule}
    onChange={(e) => setSelectedSubModule(e.target.value)}
    disabled={!selectedModule || subModules.length === 0}
>
    <option value="" disabled hidden>Select Sub-module</option>
    {subModules.map((sub) => (
        <option key={sub.moduleId} value={sub.moduleId}>
            {sub.moduleDisplayName || sub.moduleName}
        </option>
    ))}
</select>
```

**AFTER:**
```tsx
<SearchableSelect
    label="Sub-module Name"
    value={selectedSubModule}
    onChange={setSelectedSubModule}
    options={subModules.map(s => ({
        value: s.moduleId,
        label: s.moduleDisplayName || s.moduleName
    }))}
    placeholder="Select Sub-module"
    disabled={!selectedModule || subModules.length === 0}
/>
```

## 🎯 Props Reference

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `value` | `string \| number` | ✅ | - | Currently selected value |
| `onChange` | `(value: string \| number) => void` | ✅ | - | Change handler function |
| `options` | `SearchableSelectOption[]` | ✅ | - | Array of options |
| `placeholder` | `string` | ❌ | `'Select...'` | Placeholder text |
| `disabled` | `boolean` | ❌ | `false` | Disable the select |
| `className` | `string` | ❌ | `''` | Additional CSS classes |
| `label` | `string` | ❌ | - | Label text |
| `required` | `boolean` | ❌ | `false` | Show required asterisk |
| `error` | `string` | ❌ | - | Error message |

### SearchableSelectOption Interface

```tsx
interface SearchableSelectOption {
    value: string | number;
    label: string;
}
```

## 📁 Files to Update

Ye files mein dropdowns hain jo replace karne hain:

### Priority 1 - Main Navigation
- ✅ `src/pages/ImportMaster.tsx` (4 dropdowns)
- ✅ `src/pages/StockUpload.tsx`
- ✅ `src/pages/CompanySubscription.tsx`

### Priority 2 - Master Components
- ✅ `src/components/ItemMasterEnhanced.tsx`
- ✅ `src/components/ToolMasterEnhanced.tsx`
- ✅ `src/components/LedgerMasterEnhanced.tsx`
- ✅ `src/components/HSNMasterEnhanced.tsx`
- ✅ `src/components/SparePartMasterEnhanced.tsx`

### Priority 3 - Stock Upload Components
- ✅ `src/components/ItemStockUpload.tsx`
- ✅ `src/components/ToolStockUpload.tsx`
- ✅ `src/components/SparePartMasterStockUpload.tsx`

### Priority 4 - Other Pages
- ✅ `src/pages/ModuleAuthority.tsx`
- ✅ `src/pages/ModuleGroupAuthority.tsx`
- ✅ `src/pages/DynamicModule.tsx`
- ✅ `src/pages/CompanyMaster.tsx`
- ✅ `src/pages/CreateModule.tsx`
- ✅ `src/components/Login.tsx`
- ✅ `src/pages/CompanyLogin.tsx`

## ⚠️ Common Pitfalls & Solutions

### 1. onChange handler mismatch

**Problem:**
```tsx
// Old onChange expects event
onChange={(e) => setSelected(e.target.value)}
```

**Solution:**
```tsx
// New onChange receives value directly
onChange={(value) => setSelected(value)}
```

### 2. Number vs String values

**Problem:**
```tsx
// Old: value is always string from select
<select value={selectedId}>...</select>
```

**Solution:**
```tsx
// New: preserve the original type
<SearchableSelect
    value={selectedId}  // Can be number or string
    onChange={(value) => setSelectedId(Number(value))}  // Convert if needed
/>
```

### 3. Complex onChange logic

**Problem:**
```tsx
onChange={(e) => {
    const val = Number(e.target.value);
    setSelected(val);
    doSomethingElse(val);
}}
```

**Solution:**
```tsx
onChange={(value) => {
    const val = Number(value);
    setSelected(val);
    doSomethingElse(val);
}}
```

## 🎨 Styling Customization

Agar aapko custom styling chahiye:

```tsx
<SearchableSelect
    className="custom-class"  // Additional classes
    // ... other props
/>
```

Dropdown menu aur search input automatically theming inherit karte hain from parent styles.

## 🧪 Testing the Component

Component ko test karne ke liye:

1. **Search functionality**: Type karke dekho ki options filter ho rahe hain
2. **Copy functionality**: Selected value aur options ko select karke copy karo
3. **Keyboard navigation**: Tab, Enter, Space, Escape keys try karo
4. **Dark mode**: Theme toggle karke dekho
5. **Disabled state**: `disabled={true}` set karke dekho
6. **Error state**: `error="Error message"` pass karke dekho

## 📞 Need Help?

Agar koi issue aaye to:

1. Example file dekho: `src/components/SearchableSelectExample.tsx`
2. Component code dekho: `src/components/SearchableSelect.tsx`
3. Console errors check karo

## 🎉 Benefits After Migration

- ✅ Better UX: Users ko search aur copy functionality milegi
- ✅ Consistency: Sare dropdowns same look aur feel
- ✅ Maintainability: Ek jagah changes karke sare dropdowns update
- ✅ Accessibility: Better keyboard navigation aur screen reader support
- ✅ Mobile-friendly: Touch devices par behtar experience

---

**Happy Coding! 🚀**
