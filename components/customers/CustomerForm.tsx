"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { CustomerFormValues } from "@/lib/types/customer";
import type { CustomerActionResult } from "@/app/(pages)/customers/actions";

const EMPTY_VALUES: CustomerFormValues = {
  fullName: "",
  companyName: "",
  email: "",
  phoneNumber: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "",
};

const inputClassName =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20";

type CustomerFormField = {
  name: keyof CustomerFormValues;
  label: string;
  type?: string;
  required?: boolean;
};

const FIELDS: CustomerFormField[] = [
  { name: "fullName", label: "الاسم الكامل", required: true },
  { name: "companyName", label: "اسم الشركة" },
  { name: "email", label: "البريد الإلكتروني", type: "email" },
  { name: "phoneNumber", label: "رقم الهاتف" },
  { name: "addressLine1", label: "العنوان" },
  { name: "addressLine2", label: "العنوان (تكملة)" },
  { name: "city", label: "المدينة" },
  { name: "state", label: "المنطقة" },
  { name: "postalCode", label: "الرمز البريدي" },
  { name: "country", label: "الدولة" },
];

export type CustomerFormProps = {
  mode: "create" | "edit";
  initialValues?: CustomerFormValues;
  onSubmit: (values: CustomerFormValues) => Promise<CustomerActionResult | undefined>;
};

export function CustomerForm({ mode, initialValues, onSubmit }: CustomerFormProps) {
  const [values, setValues] = useState<CustomerFormValues>(initialValues ?? EMPTY_VALUES);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(name: keyof CustomerFormValues, value: string) {
    setValues((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // onSubmit redirects on success (which throws NEXT_REDIRECT and unwinds
    // out of this function) — a returned value only ever means failure.
    const result = await onSubmit(values);

    if (result && !result.success) {
      setError(result.error);
    }
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map(({ name, label, type, required }) => (
          <div key={name} className="space-y-1.5">
            <label htmlFor={name} className="text-sm font-medium text-text-default">
              {label}
            </label>
            <input
              id={name}
              name={name}
              type={type ?? "text"}
              value={values[name]}
              onChange={(e) => handleChange(name, e.target.value)}
              className={inputClassName}
              required={required}
            />
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "جارٍ الحفظ..." : mode === "create" ? "إنشاء العميل" : "حفظ"}
        </Button>
      </div>
    </form>
  );
}
