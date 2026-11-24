// Defines the Date Input React component and its supporting UI behavior.
// It converts supplied props and shared state into the rendered interface.
import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import {
  DISPLAY_DATE_ERROR,
  formatIsoDateToDisplay,
  maskDisplayDateInput,
  parseDisplayDateToIso,
} from "../../utils/dateFormat";
import styles from "./DateInput.module.css";

// Renders the Date Input interface.
// Accepts an options object and returns rendered JSX.
const DateInput = ({
  name,
  value = "",
  onChange,
  disabled = false,
  required = false,
  id,
  onValidityChange,
}) => {
  const pickerRef = useRef(null);
  const lastEmittedIso = useRef(value || "");
  const [display, setDisplay] = useState(
    // Runs the callback required by the surrounding operation.
    // Takes no arguments and returns the callback result.
    () => formatIsoDateToDisplay(value));
  const [error, setError] = useState("");

  useEffect(
    // Synchronizes the component with an external effect after rendering.
    // Takes no arguments and returns an optional cleanup function.
    () => {
      const nextIso = value || "";
      if (nextIso === lastEmittedIso.current) return;
      lastEmittedIso.current = nextIso;
      setDisplay(formatIsoDateToDisplay(nextIso));
      setError("");
      onValidityChange?.(true);
    }, [value]);

  // Emits iso to the owning component.
  // Accepts iso and is valid and returns nothing.
  const emitIso = (iso, isValid) => {
    lastEmittedIso.current = iso;
    onValidityChange?.(isValid);
    onChange?.({ target: { name, value: iso } });
  };

  // Applies display to the current workflow.
  // Accepts next display and an options object and returns nothing.
  const applyDisplay = (nextDisplay, { showIncompleteError = false } = {}) => {
    setDisplay(nextDisplay);
    if (!nextDisplay) {
      setError("");
      emitIso("", true);
      return;
    }
    const parsed = parseDisplayDateToIso(nextDisplay);
    if (parsed.ok && parsed.complete) {
      setError("");
      emitIso(parsed.iso, true);
      return;
    }
    emitIso("", false);
    if (parsed.complete || showIncompleteError || nextDisplay.length >= 10) {
      setError(DISPLAY_DATE_ERROR);
    } else {
      setError("");
    }
  };

  // Handles text change for the surrounding interface.
  // Accepts event and returns nothing.
  const handleTextChange = (event) => {
    const nextRaw = event.target.value;
    const inserting = nextRaw.length >= display.length;
    applyDisplay(maskDisplayDateInput(nextRaw, { inserting }));
  };

  // Handles blur for the surrounding interface.
  // Takes no arguments and returns nothing.
  const handleBlur = () => {
    applyDisplay(display, { showIncompleteError: Boolean(display) });
  };

  // Handles paste for the surrounding interface.
  // Accepts event and returns nothing.
  const handlePaste = (event) => {
    const pasted = (event.clipboardData?.getData("text") || "").trim();
    event.preventDefault();
    const fromIso = formatIsoDateToDisplay(pasted);
    applyDisplay(fromIso || pasted, { showIncompleteError: true });
  };

  // Opens picker for the user.
  // Takes no arguments and returns nothing.
  const openPicker = () => {
    const picker = pickerRef.current;
    if (!picker || disabled) return;
    if (typeof picker.showPicker === "function") {
      picker.showPicker();
      return;
    }
    picker.click();
  };

  // Handles picker change for the surrounding interface.
  // Accepts event and returns nothing.
  const handlePickerChange = (event) => {
    const iso = event.target.value || "";
    lastEmittedIso.current = iso;
    setDisplay(formatIsoDateToDisplay(iso));
    setError("");
    onValidityChange?.(true);
    onChange?.({ target: { name, value: iso } });
  };

  return (
    <div className={styles.DateInput}>
      <div className={styles.control}>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD/MM/YYYY"
          name={`${name}Display`}
          value={display}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onPaste={handlePaste}
          disabled={disabled}
          required={required}
          className={styles.textInput}
          aria-invalid={Boolean(error)}
          aria-required={required || undefined}
          aria-describedby={error ? `${name}-date-error` : undefined}
        />
        <button
          type="button"
          className={styles.calendarBtn}
          onClick={openPicker}
          disabled={disabled}
          aria-label="Open calendar"
        >
          <Calendar size={18} />
        </button>
        <input
          ref={pickerRef}
          type="date"
          value={value || ""}
          onChange={handlePickerChange}
          className={styles.nativePicker}
          tabIndex={-1}
          aria-hidden="true"
          disabled={disabled}
        />
      </div>
      {error && (
        <small id={`${name}-date-error`} className={styles.errorText}>
          {error}
        </small>
      )}
    </div>
  );
};

export default DateInput;
