import { useState } from "react";
import { X } from "lucide-react";
import { useModalDialog } from "../../hooks/useModalDialog";
import AsyncButton from "../AsyncButton/AsyncButton";
import { formatDocumentType } from "../../utils/displayFormat";
import styles from "./DocumentUploadModal.module.css";

const emptyForm = {
  file: null,
  documentNumber: "",
  insuranceCompany: "",
  startDate: "",
  expirationDate: "",
};

const dateValue = (value) => {
  if (!value) return "";
  const text = String(value);
  return text.slice(0, 10);
};

const formFromSlot = (slot) => {
  if (!slot) return emptyForm;
  return {
    file: null,
    documentNumber: slot.documentNumber || "",
    insuranceCompany: slot.insuranceCompany || "",
    startDate: dateValue(slot.startDate),
    expirationDate: dateValue(slot.expirationDate),
  };
};

const slotKeyOf = (slot, isOpen) => {
  if (!isOpen || !slot) return "closed";
  return [
    slot.documentType,
    slot.licensePlate || "",
    slot.documentId || "new",
  ].join(":");
};

const DocumentUploadModal = ({
  isOpen,
  slot,
  onClose,
  onSubmit,
  isUploading,
  errorMsg,
}) => {
  const dialogRef = useModalDialog(isOpen && Boolean(slot));
  const slotKey = slotKeyOf(slot, isOpen);
  const [trackedKey, setTrackedKey] = useState(slotKey);
  const [form, setForm] = useState(() => formFromSlot(slot));
  if (trackedKey !== slotKey) {
    setTrackedKey(slotKey);
    setForm(formFromSlot(slot));
  }

  const isReplace = Boolean(slot?.documentId);
  const title = formatDocumentType(slot?.documentType);
  const numberLabel =
    slot?.documentType === "insurance" ? "Policy number" : "Document number";

  const handleChange = (event) => {
    const { name, value, files } = event.target;
    if (name === "file") {
      setForm((prev) => ({ ...prev, file: files?.[0] || null }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!slot) return;
    const ok = await onSubmit({
      file: form.file,
      documentType: slot.documentType,
      licensePlate: slot.licensePlate || null,
      documentNumber: form.documentNumber.trim(),
      insuranceCompany: form.insuranceCompany.trim(),
      startDate: form.startDate,
      expirationDate: form.expirationDate,
    });
    if (ok) onClose();
  };

  return (
    <dialog
      className={styles.DocumentUploadModal}
      ref={dialogRef}
      onClose={onClose}
    >
      {slot && (
        <>
      <div className={styles.header}>
        <div>
          <h2>{isReplace ? "Replace document" : "Upload document"}</h2>
          <p>
            {title}
            {slot.licensePlate ? ` · Plate ${slot.licensePlate}` : ""}
          </p>
        </div>
        <button
          type="button"
          className={styles.closeIconBtn}
          onClick={onClose}
          aria-label="Close"
          disabled={isUploading}
        >
          <X size={20} />
        </button>
      </div>

      <form className={styles.content} onSubmit={handleSubmit}>
        {errorMsg && <p className={styles.errorMsg}>{errorMsg}</p>}

        {slot.status === "verified" && (
          <p className={styles.warning}>
            Replacing a verified document sends it back to pending review.
          </p>
        )}

        <label className={styles.field}>
          <span>File (JPG, PNG, or PDF · max 5MB)</span>
          <input
            type="file"
            name="file"
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            onChange={handleChange}
            required
          />
          {form.file && <small>{form.file.name}</small>}
        </label>

        <label className={styles.field}>
          <span>{numberLabel}</span>
          <input
            type="text"
            name="documentNumber"
            maxLength={64}
            value={form.documentNumber}
            onChange={handleChange}
            autoComplete="off"
          />
        </label>

        {slot.documentType === "insurance" && (
          <label className={styles.field}>
            <span>Insurance company</span>
            <input
              type="text"
              name="insuranceCompany"
              maxLength={100}
              value={form.insuranceCompany}
              onChange={handleChange}
            />
          </label>
        )}

        <div className={styles.dates}>
          <label className={styles.field}>
            <span>Start date</span>
            <input
              type="date"
              name="startDate"
              value={form.startDate}
              onChange={handleChange}
            />
          </label>
          <label className={styles.field}>
            <span>Expiration date</span>
            <input
              type="date"
              name="expirationDate"
              value={form.expirationDate}
              onChange={handleChange}
            />
          </label>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.cancelBtn}
            onClick={onClose}
            disabled={isUploading}
          >
            Cancel
          </button>
          <AsyncButton
            className={styles.submitBtn}
            type="submit"
            loading={isUploading}
            loadingText="Uploading..."
          >
            {isReplace ? "Replace" : "Upload"}
          </AsyncButton>
        </div>
      </form>
        </>
      )}
    </dialog>
  );
};

export default DocumentUploadModal;
