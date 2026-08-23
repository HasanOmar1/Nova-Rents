import { useState } from "react";
import { X } from "lucide-react";
import { useModalDialog } from "../../hooks/useModalDialog";
import AsyncButton from "../AsyncButton/AsyncButton";
import DateInput from "../DateInput/DateInput";
import { formatDocumentType, getDocumentDisplayConfig, getDocumentUploadCopy } from "../../utils/displayFormat";
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
  const [datesValid, setDatesValid] = useState({
    startDate: true,
    expirationDate: true,
  });
  if (trackedKey !== slotKey) {
    setTrackedKey(slotKey);
    setForm(formFromSlot(slot));
    setDatesValid({ startDate: true, expirationDate: true });
  }

  const isReplace = Boolean(slot?.documentId);
  const fieldLabels = getDocumentDisplayConfig(slot?.documentType);
  const uploadCopy = getDocumentUploadCopy(
    slot?.documentType,
    slot?.status,
    isReplace,
  );
  const showInsuranceDates = Boolean(fieldLabels.showStartDate);
  const showDocumentNumber = slot?.documentType !== "vehicle_registration";
  const documentNumberRequired = Boolean(
    fieldLabels.documentNumberRequired,
  );
  const insuranceCompanyRequired = Boolean(
    fieldLabels.insuranceCompanyRequired,
  );
  const startDateRequired = Boolean(fieldLabels.startDateRequired);
  const expirationDateRequired = Boolean(
    fieldLabels.expirationDateRequired,
  );

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
    if (!datesValid.expirationDate) return;
    if (showInsuranceDates && !datesValid.startDate) return;
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
          <h2>{uploadCopy.title}</h2>
          <p>
            {formatDocumentType(slot.documentType)}
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

        <p className={styles.requiredHint}>
          <span aria-hidden="true">*</span> Required fields
        </p>

        {slot.status === "verified" && (
          <p className={styles.warning}>{uploadCopy.verifiedWarning}</p>
        )}

        <label className={styles.field}>
          <span>
            File (JPG, PNG, or PDF · max 5MB)
            <span className={styles.requiredMark} aria-hidden="true">
              {" "}*
            </span>
          </span>
          <input
            type="file"
            name="file"
            accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
            onChange={handleChange}
            required
          />
          {form.file && <small>{form.file.name}</small>}
        </label>

        {showDocumentNumber && (
          <label className={styles.field}>
            <span>
              {fieldLabels.documentNumberLabel}
              {documentNumberRequired && (
                <span className={styles.requiredMark} aria-hidden="true">
                  {" "}*
                </span>
              )}
            </span>
            <input
              type="text"
              name="documentNumber"
              maxLength={64}
              value={form.documentNumber}
              onChange={handleChange}
              placeholder={fieldLabels.documentNumberPlaceholder}
              autoComplete="off"
              required={documentNumberRequired}
            />
            {fieldLabels.documentNumberHelp && (
              <small className={styles.helpText}>
                {fieldLabels.documentNumberHelp}
              </small>
            )}
          </label>
        )}

        {showInsuranceDates && (
          <label className={styles.field}>
            <span>
              {fieldLabels.insuranceCompanyLabel}
              {insuranceCompanyRequired && (
                <span className={styles.requiredMark} aria-hidden="true">
                  {" "}*
                </span>
              )}
            </span>
            <input
              type="text"
              name="insuranceCompany"
              maxLength={100}
              value={form.insuranceCompany}
              onChange={handleChange}
              placeholder="Enter insurance company name"
              required={insuranceCompanyRequired}
            />
          </label>
        )}

        {showInsuranceDates ? (
          <div className={styles.dates}>
            <label className={styles.field}>
              <span>
                {fieldLabels.startDateLabel}
                {startDateRequired && (
                  <span className={styles.requiredMark} aria-hidden="true">
                    {" "}*
                  </span>
                )}
              </span>
              <DateInput
                key={`${slotKey}-startDate`}
                name="startDate"
                value={form.startDate}
                onChange={handleChange}
                onValidityChange={(ok) =>
                  setDatesValid((prev) =>
                    prev.startDate === ok ? prev : { ...prev, startDate: ok },
                  )
                }
                disabled={isUploading}
                required={startDateRequired}
              />
              {fieldLabels.startDateHelp && (
                <small className={styles.helpText}>
                  {fieldLabels.startDateHelp}
                </small>
              )}
            </label>
            <label className={styles.field}>
              <span>
                {fieldLabels.expirationDateLabel}
                {expirationDateRequired && (
                  <span className={styles.requiredMark} aria-hidden="true">
                    {" "}*
                  </span>
                )}
              </span>
              <DateInput
                key={`${slotKey}-expirationDate`}
                name="expirationDate"
                value={form.expirationDate}
                onChange={handleChange}
                onValidityChange={(ok) =>
                  setDatesValid((prev) =>
                    prev.expirationDate === ok ? prev : { ...prev, expirationDate: ok },
                  )
                }
                disabled={isUploading}
                required={expirationDateRequired}
              />
              {fieldLabels.expirationDateHelp && (
                <small className={styles.helpText}>
                  {fieldLabels.expirationDateHelp}
                </small>
              )}
            </label>
          </div>
        ) : (
          <label className={styles.field}>
            <span>
              {fieldLabels.expirationDateLabel}
              {expirationDateRequired && (
                <span className={styles.requiredMark} aria-hidden="true">
                  {" "}*
                </span>
              )}
            </span>
            <DateInput
              key={`${slotKey}-expirationDate`}
              name="expirationDate"
              value={form.expirationDate}
              onChange={handleChange}
              onValidityChange={(ok) =>
                setDatesValid((prev) =>
                  prev.expirationDate === ok ? prev : { ...prev, expirationDate: ok },
                )
              }
              disabled={isUploading}
              required={expirationDateRequired}
            />
          </label>
        )}

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
            {uploadCopy.submitLabel}
          </AsyncButton>
        </div>
      </form>
        </>
      )}
    </dialog>
  );
};

export default DocumentUploadModal;
