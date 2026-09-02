// Provides shared document state and API operations through React context.
// It exports a provider component and a hook for consuming the managed data.
import { createContext, useCallback, useContext, useState } from "react";
import axios from "axios";
import { useActivityContext } from "./ActivityContext";

const DocumentContext = createContext();
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;
const ALLOWED_DOCUMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
];

// Extracts the most useful API error message, including text from blob responses.
// Accepts an Axios error and fallback and returns a promise for message text.
async function messageFromAxiosError(error, fallback) {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      return parsed.message || fallback;
    } catch {
      return fallback;
    }
  }
  return data?.message || fallback;
}

// Supplies document upload and review state to descendant components.
// Accepts children and returns a document-context provider tree.
const DocumentContextProvider = ({ children }) => {
  const { loadActivities } = useActivityContext();
  const [overview, setOverview] = useState({ identity: [], vehicles: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [adminDocuments, setAdminDocuments] = useState([]);
  const [adminPagination, setAdminPagination] = useState({});
  const [adminStats, setAdminStats] = useState({
    total: 0,
    pending_review: 0,
    verified: 0,
    rejected: 0,
    expired: 0,
  });
  const [isAdminLoading, setIsAdminLoading] = useState(false);
  const [adminErrorMsg, setAdminErrorMsg] = useState("");

  // Retrieves my documents for the current workflow.
  // Accepts an options object and returns a promise for the operation result.
  const getMyDocuments = useCallback(async ({ silent = false } = {}) => {
    try {
      if (!silent) setIsLoading(true);
      const response = await axios.get("/documents/me");
      setOverview(response.data.overview || { identity: [], vehicles: [] });
      setErrorMsg("");
      return true;
    } catch (error) {
      setErrorMsg(
        await messageFromAxiosError(error, "Failed to load documents"),
      );
      return false;
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  // Uploads document form data and refreshes the user's managed documents.
  // Accepts document fields and a file and returns a promise for the API response.
  const uploadDocument = async ({
    file,
    documentType,
    licensePlate,
    documentNumber,
    insuranceCompany,
    startDate,
    expirationDate,
  }) => {
    if (!file) {
      setErrorMsg("A document file is required.");
      return false;
    }
    if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
      setErrorMsg("File type is not allowed. Upload a JPG, PNG, or PDF.");
      return false;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      setErrorMsg("File is too large. Maximum size is 5MB.");
      return false;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("documentType", documentType);
    if (licensePlate) formData.append("licensePlate", licensePlate);
    if (documentNumber) formData.append("documentNumber", documentNumber);
    if (insuranceCompany) formData.append("insuranceCompany", insuranceCompany);
    if (startDate) formData.append("startDate", startDate);
    if (expirationDate) formData.append("expirationDate", expirationDate);

    try {
      setIsUploading(true);
      await axios.post("/documents", formData);
      await loadActivities();
      await getMyDocuments({ silent: true });
      setErrorMsg("");
      return true;
    } catch (error) {
      setErrorMsg(
        await messageFromAxiosError(error, "Failed to upload document"),
      );
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  // Opens document file for the user.
  // Accepts document id and returns a promise for the operation result.
  const openDocumentFile = async (documentId) => {
    try {
      const response = await axios.get(`/documents/${documentId}/file`, {
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(
        // Runs delayed work after the configured timeout elapses.
        // Takes no arguments and returns nothing.
        () => URL.revokeObjectURL(url), 60_000);
      setErrorMsg("");
      setAdminErrorMsg("");
      return true;
    } catch (error) {
      const message = await messageFromAxiosError(
        error,
        "Failed to open document",
      );
      setErrorMsg(message);
      setAdminErrorMsg(message);
      return false;
    }
  };

  // Retrieves admin documents for the current workflow.
  // Accepts an options object and returns a promise for the operation result.
  const getAdminDocuments = useCallback(
    async ({
      page = 1,
      status = "pending_review",
      documentType = "all",
      limit = 10,
    } = {}) => {
      try {
        setIsAdminLoading(true);
        const response = await axios.get("/documents/admin", {
          params: {
            page,
            status,
            limit,
            ...(documentType && documentType !== "all"
              ? { documentType }
              : {}),
          },
        });
        setAdminDocuments(response.data.documents || []);
        setAdminPagination(response.data.pagination || {});
        setAdminStats(
          response.data.stats || {
            total: 0,
            pending_review: 0,
            verified: 0,
            rejected: 0,
            expired: 0,
          },
        );
        setAdminErrorMsg("");
        return true;
      } catch (error) {
        setAdminErrorMsg(
          await messageFromAxiosError(error, "Failed to load documents"),
        );
        return false;
      } finally {
        setIsAdminLoading(false);
      }
    },
    [],
  );

  // Retrieves admin document by id for the current workflow.
  // Accepts document id and returns a promise for the operation result.
  const getAdminDocumentById = async (documentId) => {
    try {
      const response = await axios.get(`/documents/admin/${documentId}`);
      setAdminErrorMsg("");
      return response.data;
    } catch (error) {
      setAdminErrorMsg(
        await messageFromAxiosError(error, "Failed to load document"),
      );
      return null;
    }
  };

  // Marks an administrator-reviewed document as verified through the API.
  // Accepts a document ID and returns a promise for the updated record.
  const verifyAdminDocument = async (documentId) => {
    try {
      const response = await axios.put(`/documents/admin/${documentId}/verify`, {});
      setAdminErrorMsg("");
      await loadActivities();
      return { ok: true, document: response.data.document };
    } catch (error) {
      const message = await messageFromAxiosError(
        error,
        "Failed to verify document",
      );
      setAdminErrorMsg(message);
      return {
        ok: false,
        conflict: error?.response?.status === 409,
        message,
        payload: error?.response?.data,
      };
    }
  };

  // Rejects an administrator-reviewed document with structured reason details.
  // Accepts a document ID and review options and returns a promise for the result.
  const rejectAdminDocument = async (
    documentId,
    { rejectionCode, rejectionReasonText },
  ) => {
    try {
      const response = await axios.put(`/documents/admin/${documentId}/reject`, {
        rejectionCode,
        rejectionReasonText,
      });
      setAdminErrorMsg("");
      await loadActivities();
      return { ok: true, document: response.data.document };
    } catch (error) {
      const message = await messageFromAxiosError(
        error,
        "Failed to reject document",
      );
      setAdminErrorMsg(message);
      return {
        ok: false,
        conflict: error?.response?.status === 409,
        message,
        payload: error?.response?.data,
      };
    }
  };

  // Runs vehicle government check for the current workflow.
  // Accepts license plate and returns a promise for the operation result.
  const runVehicleGovernmentCheck = async (licensePlate) => {
    try {
      const response = await axios.post(
        `/documents/admin/vehicles/${encodeURIComponent(licensePlate)}/government-check`,
        {},
      );
      setAdminErrorMsg("");
      return {
        ok: true,
        message: response.data.message,
        governmentCheck: response.data.governmentCheck,
      };
    } catch (error) {
      const message = await messageFromAxiosError(
        error,
        "Failed to run government check",
      );
      setAdminErrorMsg(message);
      return { ok: false, message };
    }
  };

  // Records an administrator's manual vehicle-verification decision.
  // Accepts a license plate and reason and returns a promise for the API result.
  const manuallyVerifyVehicleGovernmentCheck = async (
    licensePlate,
    reason,
  ) => {
    try {
      const response = await axios.post(
        `/documents/admin/vehicles/${encodeURIComponent(licensePlate)}/government-check/manual-override`,
        { reason },
      );
      setAdminErrorMsg("");
      await loadActivities();
      return {
        ok: true,
        message: response.data.message,
        governmentCheck: response.data.governmentCheck,
      };
    } catch (error) {
      const message = await messageFromAxiosError(
        error,
        "Failed to manually verify this vehicle",
      );
      setAdminErrorMsg(message);
      return { ok: false, message };
    }
  };

  return (
    <DocumentContext.Provider
      value={{
        overview,
        isLoading,
        isUploading,
        errorMsg,
        setErrorMsg,
        getMyDocuments,
        uploadDocument,
        openDocumentFile,
        adminDocuments,
        adminPagination,
        adminStats,
        isAdminLoading,
        adminErrorMsg,
        setAdminErrorMsg,
        getAdminDocuments,
        getAdminDocumentById,
        verifyAdminDocument,
        rejectAdminDocument,
        runVehicleGovernmentCheck,
        manuallyVerifyVehicleGovernmentCheck,
      }}
    >
      {children}
    </DocumentContext.Provider>
  );
};

// Reads document state and review actions exposed by the nearest provider.
// Takes no arguments and returns the current document context value.
export const useDocumentContext = () => useContext(DocumentContext);
export default DocumentContextProvider;
