type RegistrationPacketFileFieldProps = {
  id?: string;
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
  error?: string | null;
  label?: string;
};

import { MAX_PACKET_MB } from "@/lib/registration-packets";

export default function RegistrationPacketFileField({
  id = "registration-packet",
  selectedFile,
  onFileChange,
  error,
  label = "PDF file",
}: RegistrationPacketFileFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-medium text-zinc-700">
        {label}
      </label>
      <p className="text-sm text-zinc-500">
        PDF only, max {MAX_PACKET_MB} MB.
      </p>
      <input
        id={id}
        type="file"
        accept="application/pdf,.pdf"
        onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
        className="block w-full text-sm text-zinc-600 file:mr-4 file:rounded-lg file:border-0 file:bg-[#990000]/10 file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-[#990000]"
      />
      {selectedFile ? (
        <p className="text-sm text-zinc-600">Selected: {selectedFile.name}</p>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
