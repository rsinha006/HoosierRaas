"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isValidEmail } from "@/lib/members";
import {
  CLOTHING_SIZES,
  ONBOARDING_STORAGE_BUCKET,
  getGraduationYearOptions,
  isValidIuEmail,
  mergeOnboardingRoles,
  normalizeOptionalText,
  validateUploadFile,
  type ClothingSize,
  type OnboardingFileField,
  type OnboardingRole,
} from "@/lib/onboarding";

type FormView = "form" | "success" | "duplicate";

const inputClassName =
  "w-full rounded-lg border border-zinc-300 px-4 py-3 text-base text-zinc-900 outline-none transition focus:border-[#990000] focus:ring-2 focus:ring-[#990000]/20";

const labelClassName = "block text-sm font-medium text-zinc-700";

const requiredMark = <span className="text-[#990000]">*</span>;

const fileFields: {
  id: OnboardingFileField;
  label: string;
  description: string;
}[] = [
  {
    id: "government_id",
    label: "Government ID",
    description: "Upload a photo or PDF of your government-issued ID.",
  },
  {
    id: "birthday_image",
    label: "Birthday story photo",
    description:
      "Upload an image of you that you would want posted on our story for your birthday!",
  },
  {
    id: "student_id",
    label: "Student ID",
    description: "Upload a photo or PDF of your IU student ID.",
  },
  {
    id: "covid_vaccination",
    label: "COVID vaccination card",
    description: "Upload a photo or PDF of your COVID vaccination card.",
  },
];

function SectionHeading({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-zinc-200 pb-3">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      {description ? <p className="mt-1 text-sm text-zinc-600">{description}</p> : null}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-red-600">{message}</p>;
}

export default function DancerOnboardingForm() {
  const graduationYears = useMemo(() => getGraduationYearOptions(), []);

  const [view, setView] = useState<FormView>("form");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [dietaryRestrictions, setDietaryRestrictions] = useState("");
  const [medicalConditions, setMedicalConditions] = useState("");
  const [shirtSize, setShirtSize] = useState<ClothingSize | "">("");
  const [pantsSize, setPantsSize] = useState<ClothingSize | "">("");
  const [drinksAlcohol, setDrinksAlcohol] = useState<"yes" | "no" | "">("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [roles, setRoles] = useState<OnboardingRole[]>([]);
  const [files, setFiles] = useState<Record<OnboardingFileField, File | null>>({
    government_id: null,
    birthday_image: null,
    student_id: null,
    covid_vaccination: null,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggleRole(role: OnboardingRole) {
    setRoles((current) =>
      current.includes(role)
        ? current.filter((item) => item !== role)
        : [...current, role],
    );
  }

  function setFile(field: OnboardingFileField, file: File | null) {
    setFiles((current) => ({ ...current, [field]: file }));
  }

  function validateForm() {
    const errors: Record<string, string> = {};

    if (!firstName.trim()) {
      errors.firstName = "First name is required.";
    }

    if (!lastName.trim()) {
      errors.lastName = "Last name is required.";
    }

    if (!email.trim()) {
      errors.email = "IU email is required.";
    } else if (!isValidEmail(email.trim())) {
      errors.email = "Enter a valid email address.";
    } else if (!isValidIuEmail(email)) {
      errors.email = "Use your @iu.edu email address.";
    }

    if (!phone.trim()) {
      errors.phone = "Phone number is required.";
    }

    if (!graduationYear) {
      errors.graduationYear = "Graduation year is required.";
    }

    if (!shirtSize) {
      errors.shirtSize = "Shirt size is required.";
    }

    if (!pantsSize) {
      errors.pantsSize = "Pants size is required.";
    }

    if (!drinksAlcohol) {
      errors.drinksAlcohol = "Please select Yes or No.";
    }

    if (!emergencyContactName.trim()) {
      errors.emergencyContactName = "Emergency contact name is required.";
    }

    if (!emergencyContactPhone.trim()) {
      errors.emergencyContactPhone = "Emergency contact phone is required.";
    }

    if (roles.length === 0) {
      errors.roles = "Select at least one role.";
    }

    for (const field of fileFields) {
      const error = validateUploadFile(files[field.id], { required: true });
      if (error) {
        errors[field.id] = error;
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function uploadFile(
    supabase: ReturnType<typeof createClient>,
    file: File,
    field: OnboardingFileField,
    emailPrefix: string,
  ) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
    const path = `onboarding/${emailPrefix}/${field}-${Date.now()}.${extension}`;

    const { data, error } = await supabase.storage
      .from(ONBOARDING_STORAGE_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(`Could not upload ${field.replaceAll("_", " ")}: ${error.message}`);
    }

    return data.path;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const normalizedEmail = email.trim().toLowerCase();
      const emailPrefix = normalizedEmail.replace(/[^a-z0-9]/g, "_");

      const uploadedPaths: Partial<Record<OnboardingFileField, string>> = {};

      for (const field of fileFields) {
        const file = files[field.id];
        if (file) {
          uploadedPaths[field.id] = await uploadFile(
            supabase,
            file,
            field.id,
            emailPrefix,
          );
        }
      }

      const memberPayload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: normalizedEmail,
        phone: phone.trim(),
        graduation_year: Number(graduationYear),
        status: "active" as const,
        roles,
        exec_title: null,
        pending_review: true,
        dietary_restrictions: normalizeOptionalText(dietaryRestrictions),
        medical_conditions: normalizeOptionalText(medicalConditions),
        shirt_size: shirtSize,
        pants_size: pantsSize,
        government_id_path: uploadedPaths.government_id ?? null,
        birthday_image_path: uploadedPaths.birthday_image ?? null,
        student_id_path: uploadedPaths.student_id ?? null,
        covid_vaccination_path: uploadedPaths.covid_vaccination ?? null,
        drinks_alcohol: drinksAlcohol === "yes",
        emergency_contact_name: emergencyContactName.trim(),
        emergency_contact_phone: emergencyContactPhone.trim(),
      };

      const { data: existingMember, error: existingMemberError } = await supabase
        .from("members")
        .select("id, roles, pending_review, government_id_path")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (existingMemberError) {
        throw new Error(existingMemberError.message);
      }

      if (
        existingMember &&
        !existingMember.pending_review &&
        existingMember.government_id_path
      ) {
        setView("duplicate");
        return;
      }

      if (existingMember) {
        const { error } = await supabase
          .from("members")
          .update({
            ...memberPayload,
            roles: mergeOnboardingRoles(existingMember.roles, roles),
          })
          .eq("id", existingMember.id);

        if (error) {
          throw new Error(error.message);
        }
      } else {
        const { error } = await supabase.from("members").insert(memberPayload);

        if (error) {
          if (error.code === "23505") {
            const { data: racedMember, error: racedMemberError } = await supabase
              .from("members")
              .select("id, roles, pending_review, government_id_path")
              .eq("email", normalizedEmail)
              .maybeSingle();

            if (racedMemberError) {
              throw new Error(racedMemberError.message);
            }

            if (
              racedMember &&
              !racedMember.pending_review &&
              racedMember.government_id_path
            ) {
              setView("duplicate");
              return;
            }

            if (racedMember) {
              const { error: updateError } = await supabase
                .from("members")
                .update({
                  ...memberPayload,
                  roles: mergeOnboardingRoles(racedMember.roles, roles),
                })
                .eq("id", racedMember.id);

              if (updateError) {
                throw new Error(updateError.message);
              }
            } else {
              setView("duplicate");
              return;
            }
          } else {
            throw new Error(error.message);
          }
        }
      }

      setView("success");
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (view === "success") {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-50 text-2xl">
          ✓
        </div>
        <h2 className="text-2xl font-semibold text-zinc-900">Thank you!</h2>
        <p className="text-zinc-600">
          Your information has been submitted. Welcome to HoosierRaas — we are
          excited to have you on the team this season.
        </p>
      </div>
    );
  }

  if (view === "duplicate") {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-2xl text-amber-700">
          !
        </div>
        <h2 className="text-2xl font-semibold text-zinc-900">
          You are already on file
        </h2>
        <p className="text-zinc-600">
          A record with <span className="font-medium">{email.trim().toLowerCase()}</span>{" "}
          already exists. Ask your captain or team manager to reject the previous
          submission from Members if you need to submit again.
        </p>
        <button
          type="button"
          onClick={() => {
            setView("form");
            setSaveError(null);
          }}
          className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-50"
        >
          Go back to the form
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      <section className="space-y-4">
        <SectionHeading
          title="Personal information"
          description="Tell us how to reach you this season."
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="first-name" className={labelClassName}>
              First name {requiredMark}
            </label>
            <input
              id="first-name"
              type="text"
              autoComplete="given-name"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className={inputClassName}
            />
            <FieldError message={fieldErrors.firstName} />
          </div>

          <div className="space-y-2">
            <label htmlFor="last-name" className={labelClassName}>
              Last name {requiredMark}
            </label>
            <input
              id="last-name"
              type="text"
              autoComplete="family-name"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className={inputClassName}
            />
            <FieldError message={fieldErrors.lastName} />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className={labelClassName}>
            IU email {requiredMark}
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="you@iu.edu"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={inputClassName}
          />
          <FieldError message={fieldErrors.email} />
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className={labelClassName}>
            Phone number {requiredMark}
          </label>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            className={inputClassName}
          />
          <FieldError message={fieldErrors.phone} />
        </div>

        <div className="space-y-2">
          <label htmlFor="graduation-year" className={labelClassName}>
            Graduation year {requiredMark}
          </label>
          <select
            id="graduation-year"
            value={graduationYear}
            onChange={(event) => setGraduationYear(event.target.value)}
            className={inputClassName}
          >
            <option value="">Select year</option>
            {graduationYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <FieldError message={fieldErrors.graduationYear} />
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading
          title="Health and sizing"
          description="Help us plan merch, meals, and team needs."
        />

        <div className="space-y-2">
          <label htmlFor="dietary-restrictions" className={labelClassName}>
            Dietary restrictions
          </label>
          <textarea
            id="dietary-restrictions"
            rows={3}
            placeholder="None if not applicable"
            value={dietaryRestrictions}
            onChange={(event) => setDietaryRestrictions(event.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="medical-conditions" className={labelClassName}>
            Medical conditions
          </label>
          <textarea
            id="medical-conditions"
            rows={3}
            placeholder="None if not applicable"
            value={medicalConditions}
            onChange={(event) => setMedicalConditions(event.target.value)}
            className={inputClassName}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="shirt-size" className={labelClassName}>
              Shirt size {requiredMark}
            </label>
            <select
              id="shirt-size"
              value={shirtSize}
              onChange={(event) =>
                setShirtSize(event.target.value as ClothingSize | "")
              }
              className={inputClassName}
            >
              <option value="">Select size</option>
              {CLOTHING_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <FieldError message={fieldErrors.shirtSize} />
          </div>

          <div className="space-y-2">
            <label htmlFor="pants-size" className={labelClassName}>
              Pants size {requiredMark}
            </label>
            <select
              id="pants-size"
              value={pantsSize}
              onChange={(event) =>
                setPantsSize(event.target.value as ClothingSize | "")
              }
              className={inputClassName}
            >
              <option value="">Select size</option>
              {CLOTHING_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <FieldError message={fieldErrors.pantsSize} />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeading
          title="Documents"
          description="JPG, PNG, WEBP, HEIC, or PDF up to 10 MB each."
        />

        {fileFields.map((field) => (
          <div key={field.id} className="space-y-2">
            <label htmlFor={field.id} className={labelClassName}>
              {field.label} {requiredMark}
            </label>
            <p className="text-sm text-zinc-500">{field.description}</p>
            <input
              id={field.id}
              type="file"
              accept="image/*,application/pdf"
              onChange={(event) =>
                setFile(field.id, event.target.files?.[0] ?? null)
              }
              className="block w-full text-sm text-zinc-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[#990000]/10 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-[#990000]"
            />
            <FieldError message={fieldErrors[field.id]} />
          </div>
        ))}
      </section>

      <section className="space-y-4">
        <SectionHeading title="Emergency contact and role" />

        <fieldset className="space-y-2">
          <legend className={labelClassName}>
            Do you drink? {requiredMark}
          </legend>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="radio"
                name="drinks-alcohol"
                value="yes"
                checked={drinksAlcohol === "yes"}
                onChange={() => setDrinksAlcohol("yes")}
                className="h-4 w-4 border-zinc-300 text-[#990000] focus:ring-[#990000]/20"
              />
              Yes
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="radio"
                name="drinks-alcohol"
                value="no"
                checked={drinksAlcohol === "no"}
                onChange={() => setDrinksAlcohol("no")}
                className="h-4 w-4 border-zinc-300 text-[#990000] focus:ring-[#990000]/20"
              />
              No
            </label>
          </div>
          <FieldError message={fieldErrors.drinksAlcohol} />
        </fieldset>

        <div className="space-y-2">
          <label htmlFor="emergency-contact-name" className={labelClassName}>
            Emergency contact name {requiredMark}
          </label>
          <input
            id="emergency-contact-name"
            type="text"
            autoComplete="name"
            value={emergencyContactName}
            onChange={(event) => setEmergencyContactName(event.target.value)}
            className={inputClassName}
          />
          <FieldError message={fieldErrors.emergencyContactName} />
        </div>

        <div className="space-y-2">
          <label htmlFor="emergency-contact-phone" className={labelClassName}>
            Emergency contact phone {requiredMark}
          </label>
          <input
            id="emergency-contact-phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={emergencyContactPhone}
            onChange={(event) => setEmergencyContactPhone(event.target.value)}
            className={inputClassName}
          />
          <FieldError message={fieldErrors.emergencyContactPhone} />
        </div>

        <fieldset className="space-y-3">
          <legend className={labelClassName}>
            Role {requiredMark}
          </legend>
          <p className="text-sm text-zinc-500">Select all that apply.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["dancer", "production"] as const).map((role) => (
              <label
                key={role}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 px-4 py-3 text-sm text-zinc-700"
              >
                <input
                  type="checkbox"
                  checked={roles.includes(role)}
                  onChange={() => toggleRole(role)}
                  className="h-4 w-4 rounded border-zinc-300 text-[#990000] focus:ring-[#990000]/20"
                />
                <span className="capitalize">{role}</span>
              </label>
            ))}
          </div>
          <FieldError message={fieldErrors.roles} />
        </fieldset>
      </section>

      {saveError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {saveError}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-[#990000] px-4 py-3.5 text-base font-semibold text-white transition hover:bg-[#7a0000] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Submitting..." : "Submit onboarding form"}
      </button>
    </form>
  );
}
