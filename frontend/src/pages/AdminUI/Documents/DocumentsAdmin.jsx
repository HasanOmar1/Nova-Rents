import { useEffect, useState } from "react";
import { BookCheck, Clock, FileWarning, ShieldAlert, ShieldOff } from "lucide-react";
import HomeTopCards from "../../../components/HomeCards/HomeTopCards/HomeTopCards";
import DocumentsAdminCards from "../../../components/DocumentsAdminCards/DocumentsAdminCards";
import DocumentReviewModal from "../../../components/DocumentReviewModal/DocumentReviewModal";
import Pagination from "../../../components/Pagination/Pagination";
import { useDocumentContext } from "../../../context/DocumentContext";
import { usePaginatedStatusFilter } from "../../../hooks/usePaginatedStatusFilter";
import { formatDocumentType } from "../../../utils/displayFormat";
import styles from "./DocumentsAdmin.module.css";

const DocumentsAdmin = () => {
  const {
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
    openDocumentFile,
  } = useDocumentContext();
  const {
    currentPage,
    nextPage,
    previousPage,
    resetPage,
    statusFilter,
    handleStatusChange,
  } = usePaginatedStatusFilter({
    initialStatus: "pending_review",
    totalPages: adminPagination?.totalPages,
  });
  const [documentTypeFilter, setDocumentTypeFilter] = useState("all");
  const [detail, setDetail] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    getAdminDocuments({
      page: currentPage,
      status: statusFilter,
      documentType: documentTypeFilter,
    });
  }, [currentPage, statusFilter, documentTypeFilter, getAdminDocuments]);

  const refreshQueue = () =>
    getAdminDocuments({
      page: currentPage,
      status: statusFilter,
      documentType: documentTypeFilter,
    });

  const openReview = async (documentId) => {
    setAdminErrorMsg("");
    const loaded = await getAdminDocumentById(documentId);
    if (loaded) setDetail(loaded);
  };

  const closeReview = () => {
    setDetail(null);
    setAdminErrorMsg("");
  };

  const handleVerify = async (documentId) => {
    setIsBusy(true);
    const result = await verifyAdminDocument(documentId);
    setIsBusy(false);
    if (result.ok) {
      closeReview();
      refreshQueue();
      return;
    }
    if (result.conflict) refreshQueue();
  };

  const handleReject = async (documentId, payload) => {
    setIsBusy(true);
    const result = await rejectAdminDocument(documentId, payload);
    setIsBusy(false);
    if (result.ok) {
      closeReview();
      refreshQueue();
      return;
    }
    if (result.conflict) refreshQueue();
  };

  const handleRetryGov = async (licensePlate) => {
    if (!detail?.document) return;
    setIsBusy(true);
    const result = await runVehicleGovernmentCheck(licensePlate);
    if (result.ok) {
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              document: {
                ...prev.document,
                governmentCheck: result.governmentCheck,
              },
            }
          : prev,
      );
    }
    setIsBusy(false);
  };

  const topData = [
    {
      title: "Total Documents",
      value: adminStats?.total || 0,
      icon: <FileWarning size={28} color="#a7d2eb" />,
      status: "all",
    },
    {
      title: "Pending review",
      value: adminStats?.pending_review || 0,
      icon: <Clock size={28} color="#3b82f6" />,
      status: "pending_review",
    },
    {
      title: "Verified",
      value: adminStats?.verified || 0,
      icon: <BookCheck size={28} color="#3b82f6" />,
      status: "verified",
    },
    {
      title: "Rejected",
      value: adminStats?.rejected || 0,
      icon: <ShieldAlert size={28} color="#eab308" />,
      status: "rejected",
    },
    {
      title: "Expired",
      value: adminStats?.expired || 0,
      icon: <ShieldOff size={28} color="#a7d2eb" />,
      status: "expired",
    },
  ];

  return (
    <div className={`${styles.DocumentsAdmin} page`}>
      <h1>Document verification</h1>
      <p className={styles.intro}>
        Review identity and vehicle documents. Official government vehicle
        lookup is separate and cannot be marked verified by hand.
      </p>

      <DocumentReviewModal
        isOpen={Boolean(detail)}
        detail={detail}
        onClose={closeReview}
        onVerify={handleVerify}
        onReject={handleReject}
        onOpenFile={openDocumentFile}
        onRetryGov={handleRetryGov}
        isBusy={isBusy}
        errorMsg={adminErrorMsg}
      />

      <div className={styles.topCardsContainer}>
        {topData.map((item) => (
          <HomeTopCards
            key={item.title}
            title={item.title}
            value={item.value}
            icon={item.icon}
            onClick={() => handleStatusChange(item.status)}
            isAction
          />
        ))}
      </div>

      <div className={styles.searchContainer}>
        <div className={styles.filterGroup}>
          <label htmlFor="documentStatus">Status</label>
          <select
            id="documentStatus"
            value={statusFilter}
            onChange={handleStatusChange}
          >
            <option value="all">All</option>
            <option value="pending_review">Pending review</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
            <option value="expired">Expired</option>
          </select>
        </div>
        <div className={styles.filterGroup}>
          <label htmlFor="documentType">Type</label>
          <select
            id="documentType"
            value={documentTypeFilter}
            onChange={(event) => {
              setDocumentTypeFilter(event.target.value);
              resetPage();
            }}
          >
            <option value="all">All types</option>
            {[
              "identity_card",
              "passport",
              "driver_license",
              "insurance",
              "vehicle_registration",
            ].map((type) => (
              <option key={type} value={type}>
                {formatDocumentType(type)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {adminErrorMsg && !detail && (
        <p className={styles.errorMsg}>{adminErrorMsg}</p>
      )}

      <div className={styles.tableContainer}>
        <div className={styles.titles}>
          <p>Type</p>
          <p>Account</p>
          <p>Plate</p>
          <p>Status</p>
          <p>Gov. verification</p>
          <p>Action</p>
        </div>

        {isAdminLoading ? (
          <p className={styles.emptyMsg}>Loading documents...</p>
        ) : adminDocuments.length === 0 ? (
          <p className={styles.emptyMsg}>No documents found for this filter.</p>
        ) : (
          adminDocuments.map((doc) => (
            <div className={styles.row} key={doc.documentId}>
              <DocumentsAdminCards
                documentType={doc.documentType}
                account={
                  `${doc.account?.firstName || ""} ${doc.account?.lastName || ""}`.trim() ||
                  doc.account?.email ||
                  "—"
                }
                plate={doc.licensePlate}
                status={doc.status}
                govStatus={doc.governmentCheck?.status || "not_checked"}
                onReview={() => openReview(doc.documentId)}
              />
            </div>
          ))
        )}

        <div className={styles.paginationWrapper}>
          <Pagination
            currentPage={adminPagination?.currentPage}
            totalPages={adminPagination?.totalPages}
            handlePrevPage={previousPage}
            handleNextPage={nextPage}
            leftText={`Total Documents: ${adminPagination?.totalDocuments || 0}`}
          />
        </div>
      </div>
    </div>
  );
};

export default DocumentsAdmin;
