// Defines the Documents Cards React component and its supporting UI behavior.
// It converts supplied props and shared state into the rendered interface.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDocumentContext } from "../../context/DocumentContext";
import { useRentContext } from "../../context/RentContext";
import { getPrimaryRenterEligibilityMessage } from "../../utils/displayFormat";
import DocumentUploadModal from "../DocumentUploadModal/DocumentUploadModal";
import DocumentSlot from "./DocumentSlot";
import VehicleDocumentsAccordion from "./VehicleDocumentsAccordion";
import { GOV_ISSUE_STATUSES } from "./DocumentsCards.constants";
import {
  getVehicleDocSummary,
  getVehicleDocumentsId,
} from "./DocumentsCards.utils";
import styles from "./DocumentsCards.module.css";

const EMPTY_LIST = [];
// Normalizes plate into a consistent value.
// Accepts value and returns the computed result.
const normalizePlate = (value) =>
  String(value ?? "").trim().toUpperCase();

// Renders the Documents Cards interface.
// Takes no arguments and returns rendered JSX.
const DocumentsCards = () => {
  const [searchParams] = useSearchParams();
  const requestedVehiclePlate = searchParams.get("vehicle")?.trim() || null;
  const {
    overview,
    isLoading,
    isUploading,
    errorMsg,
    setErrorMsg,
    getMyDocuments,
    uploadDocument,
    openDocumentFile,
  } = useDocumentContext();
  const { rentalEligibility, fetchRentalEligibility } = useRentContext();
  const [uploadSlot, setUploadSlot] = useState(null);
  const [viewingId, setViewingId] = useState(null);
  const [expandedPlate, setExpandedPlate] = useState(requestedVehiclePlate);
  const handledVehicleLink = useRef(null);

  useEffect(
    // Synchronizes the component with an external effect after rendering.
    // Takes no arguments and returns an optional cleanup function.
    () => {
      getMyDocuments();
      fetchRentalEligibility();
    }, [getMyDocuments, fetchRentalEligibility]);

  // Handles upload for the surrounding interface.
  // Accepts payload and returns a promise for the operation result.
  const handleUpload = useCallback(
    async (payload) => {
      const isSuccess = await uploadDocument(payload);
      if (isSuccess) {
        await fetchRentalEligibility({ force: true });
      }
      return isSuccess;
    },
    [uploadDocument, fetchRentalEligibility],
  );

  const identity = overview?.identity || EMPTY_LIST;
  const vehicles = overview?.vehicles || EMPTY_LIST;
  const requestedVehicle = useMemo(
    // Computes the memoized value used by the component.
    // Takes no arguments and returns the derived memoized value.
    () => {
      if (!requestedVehiclePlate) return null;

      const normalizedPlate = normalizePlate(requestedVehiclePlate);
      return vehicles.find(
        // Tests whether one collection entry is the requested match.
        // Accepts vehicle and returns a Boolean match result.
        (vehicle) => normalizePlate(vehicle.licensePlate) === normalizedPlate,
      );
    }, [requestedVehiclePlate, vehicles]);
  const renterEligibilityMessage = getPrimaryRenterEligibilityMessage(
    rentalEligibility?.reasons,
  );

  const vehiclesSummary = useMemo(
    // Computes the memoized value used by the component.
    // Takes no arguments and returns the derived memoized value.
    () => {
      if (vehicles.length < 2) return null;

      let fullyVerified = 0;
      let needDocuments = 0;
      let pending = 0;
      let governmentIssue = 0;

      for (const vehicle of vehicles) {
        const docSummary = getVehicleDocSummary(vehicle.documents || []);
        const govStatus = vehicle.governmentCheck?.status || "not_checked";

        if (docSummary.fullyVerified) fullyVerified += 1;
        if (docSummary.needsDocuments) needDocuments += 1;
        if (docSummary.hasPending) pending += 1;
        if (GOV_ISSUE_STATUSES.has(govStatus)) governmentIssue += 1;
      }

      const parts = [];
      if (fullyVerified) parts.push(`${fullyVerified} fully verified`);
      if (needDocuments) parts.push(`${needDocuments} need documents`);
      if (pending) parts.push(`${pending} pending`);
      if (governmentIssue) parts.push(`${governmentIssue} government issue`);

      if (!parts.length) return null;
      return parts.join(" · ");
    }, [vehicles]);

  useEffect(
    // Synchronizes the component with an external effect after rendering.
    // Takes no arguments and returns an optional cleanup function.
    () => {
      const plate = requestedVehicle?.licensePlate;
      if (
        isLoading ||
        !plate ||
        normalizePlate(expandedPlate) !== normalizePlate(plate) ||
        handledVehicleLink.current === requestedVehiclePlate
      ) {
        return undefined;
      }

      const frame = window.requestAnimationFrame(
        // Runs deferred browser work on the next animation frame.
        // Takes no arguments and returns nothing.
        () => {
          const accordion = document.getElementById(getVehicleDocumentsId(plate));
          if (!accordion) return;

          accordion.scrollIntoView({ behavior: "smooth", block: "start" });
          accordion
            .querySelector("button")
            ?.focus({ preventScroll: true });
          handledVehicleLink.current = requestedVehiclePlate;
        });

      // Synchronizes the component with an external effect after rendering.
      // Takes no arguments and returns an optional cleanup function.
      return () => window.cancelAnimationFrame(frame);
    }, [
    expandedPlate,
    isLoading,
    requestedVehicle,
    requestedVehiclePlate,
  ]);

  // Opens upload for the user.
  // Accepts slot and returns nothing.
  const openUpload = (slot) => {
    setErrorMsg("");
    setUploadSlot(slot);
  };

  // Closes upload and related transient state.
  // Takes no arguments and returns nothing.
  const closeUpload = () => {
    setUploadSlot(null);
  };

  // Handles view for the surrounding interface.
  // Accepts document id and returns a promise for the operation result.
  const handleView = async (documentId) => {
    setViewingId(documentId);
    await openDocumentFile(documentId);
    setViewingId(null);
  };

  // Toggles vehicle in the interface.
  // Accepts license plate and returns nothing.
  const toggleVehicle = (licensePlate) => {
    const nextPlate = String(licensePlate);
    setExpandedPlate(
      // Derives the next state value from the current state.
      // Accepts current and returns the updated state value.
      (current) =>
      normalizePlate(current) === normalizePlate(nextPlate) ? null : nextPlate,
    );
  };

  return (
    <div className={styles.DocumentsCards}>
      <h4>Documents</h4>

      {errorMsg && !uploadSlot && <p className={styles.errorMsg}>{errorMsg}</p>}
      {isLoading && <p className={styles.hint}>Loading documents...</p>}

      {!isLoading && (
        <>
          {renterEligibilityMessage && (
            <div className={styles.eligibilityBanner}>
              <p>{renterEligibilityMessage}</p>
              <span>
                Update the documents below if you need to take action.
              </span>
            </div>
          )}

          <section className={styles.section}>
            <h5>Identity</h5>
            {identity.length ? (
              identity.map(
                // Transforms one collection entry for the resulting list.
                // Accepts slot and returns the mapped entry.
                (slot) => (
                <DocumentSlot
                  key={slot.documentType}
                  slot={slot}
                  onUpload={openUpload}
                  onView={handleView}
                  viewingId={viewingId}
                />
              ))
            ) : (
              <p className={styles.hint}>No identity documents to show.</p>
            )}
          </section>

          <section className={styles.section}>
            <div className={styles.vehiclesSectionHeader}>
              <h5>Vehicles</h5>
              {vehicles.length > 0 && (
                <span className={styles.vehiclesCount}>
                  {vehicles.length}{" "}
                  {vehicles.length === 1 ? "vehicle" : "vehicles"}
                </span>
              )}
            </div>
            {vehiclesSummary && (
              <p className={styles.vehiclesSummary}>{vehiclesSummary}</p>
            )}
            {vehicles.length ? (
              <div className={styles.vehicleAccordionList}>
                {vehicles.map(
                  // Transforms one collection entry for the resulting list.
                  // Accepts vehicle and returns the mapped entry.
                  (vehicle) => (
                  <VehicleDocumentsAccordion
                    key={vehicle.licensePlate}
                    vehicle={vehicle}
                    isExpanded={
                      normalizePlate(expandedPlate) ===
                      normalizePlate(vehicle.licensePlate)
                    }
                    onToggle={
                      // Handles the component's toggle event.
                      // Takes no arguments and returns the handler result.
                      () => toggleVehicle(vehicle.licensePlate)}
                    onUpload={openUpload}
                    onView={handleView}
                    viewingId={viewingId}
                  />
                ))}
              </div>
            ) : (
              <p className={styles.hint}>
                Add a vehicle to upload insurance and registration.
              </p>
            )}
          </section>
        </>
      )}

      <DocumentUploadModal
        isOpen={Boolean(uploadSlot)}
        slot={uploadSlot}
        onClose={closeUpload}
        onSubmit={handleUpload}
        isUploading={isUploading}
        errorMsg={uploadSlot ? errorMsg : ""}
      />
    </div>
  );
};

export default DocumentsCards;
