import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { AlertTriangle, Ban, Eye, Search, ShieldCheck, TriangleAlert, X } from "lucide-react";
import Pagination from "../../../components/Pagination/Pagination";
import styles from "./ReportedUsers.module.css";

const risk = (count) => count >= 6 ? "High Attention" : count >= 3 ? "Review" : "Normal";
const dateText = (value) => !value || String(value).startsWith("1000-") ? "—" : new Date(value).toLocaleDateString("en-GB");

export default function ReportedUsers() {
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalUsers: 0 });
  const [filters, setFilters] = useState({ search: "", accountStatus: "all", complaintStatus: "all" });
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState(null);
  const [details, setDetails] = useState([]);
  const [reason, setReason] = useState("");
  const [warningError, setWarningError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => { const timer = setTimeout(() => setQuery(filters.search.trim()), 300); return () => clearTimeout(timer); }, [filters.search]);
  const load = useCallback(async (page = 1) => {
    try {
      const { data } = await axios.get("/reported-users", { params: { page, limit: 10, search: query,
        accountStatus: filters.accountStatus, complaintStatus: filters.complaintStatus } });
      setUsers(data.users); setPagination(data.pagination); setMessage("");
    } catch (error) { setMessage(error.response?.data?.message || "Failed to load reported users"); }
  }, [query, filters.accountStatus, filters.complaintStatus]);
  useEffect(() => {
    const refresh = async () => { await load(1); };
    refresh();
  }, [load]);

  const openDetails = async (user, type) => {
    try {
      const endpoint = type === "reports" ? "reports" : "warnings";
      const { data } = await axios.get(`/reported-users/${user.userId}/${endpoint}`);
      setDetails(data[endpoint]); setModal({ type, user });
    } catch (error) { setMessage(error.response?.data?.message || "Failed to load details"); }
  };
  const requestWarningConfirmation = () => {
    const clean = reason.trim();
    if (clean.length < 5 || clean.length > 500) {
      setWarningError("Warning reason must be between 5 and 500 characters.");
      return;
    }
    setWarningError("");
    setModal({ type: "confirmWarning", user: modal.user });
  };
  const issueWarning = async () => {
    const clean = reason.trim();
    try {
      const { data } = await axios.post(`/reported-users/${modal.user.userId}/warnings`, { reason: clean });
      setMessage(`${data.message}${data.emailSent ? "" : " (email delivery failed)"}`); setModal(null); setReason(""); setWarningError(""); await load(pagination.currentPage);
    } catch (error) { setWarningError(error.response?.data?.message || "Failed to issue warning"); }
  };
  const changeStatus = async (user, block) => {
    try { await axios.post(`/users/${block ? "block" : "unblock"}/${encodeURIComponent(user.email)}`); await load(pagination.currentPage); }
    catch (error) { setMessage(error.response?.data?.message || "Failed to update account"); }
    finally { setModal(null); }
  };

  return <div className={`${styles.page} page`}>
    <div className={styles.heading}><div><h1>Reported Users</h1><p>Review complaint evidence and issue manual account warnings.</p></div><AlertTriangle size={30} /></div>
    {message && <p className={styles.message}>{message}</p>}
    <section className={styles.filters}>
      <label><span>Search</span><div className={styles.search}><Search size={18}/><input value={filters.search} placeholder="Name or email" onChange={(e)=>setFilters({...filters,search:e.target.value})}/></div></label>
      <label><span>Account status</span><select value={filters.accountStatus} onChange={(e)=>setFilters({...filters,accountStatus:e.target.value})}><option value="all">All</option><option value="active">Active</option><option value="blocked">Blocked</option></select></label>
      <label><span>Complaint status</span><select value={filters.complaintStatus} onChange={(e)=>setFilters({...filters,complaintStatus:e.target.value})}><option value="all">All</option><option value="open">Open</option><option value="in_review">In review</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select></label>
    </section>
    <section className={styles.tableWrap}><div className={styles.scroll}><table><thead><tr><th>Email</th><th>Direct</th><th>Vehicle</th><th>Total</th><th>Open</th><th>Warnings</th><th>Status</th><th>Last report</th><th>Risk</th><th>Actions</th></tr></thead>
      <tbody>{users.map(user=><tr key={user.userId}><td className={styles.emailCell}>{user.email}</td><td>{user.directReports}</td><td>{user.vehicleReports}</td><td>{user.totalReports}</td><td>{user.openReports}</td>
        <td className={styles.warningCell}><button className={styles.link} title={Number(user.warningCount)>=3?"Maximum warnings reached; account blocked":"View warning history"} onClick={()=>openDetails(user,"warnings")}>{user.warningCount} / 3</button></td><td><span className={`${styles.badge} ${styles[user.status]}`}>{user.status}</span></td><td>{dateText(user.lastReportDate)}</td><td><span className={`${styles.badge} ${styles[risk(user.totalReports).replace(" ","")]}`}>{risk(user.totalReports)}</span></td>
        <td><div className={styles.actions}>
          <button className={styles.viewAction} title="View reports" aria-label="View reports" onClick={()=>openDetails(user,"reports")}><Eye size={16}/></button>
          <button className={styles.warnAction} title="Warn user" aria-label="Warn user" disabled={Number(user.warningCount)>=3} onClick={()=>{setReason("");setWarningError("");setModal({type:"warn",user})}}><TriangleAlert size={16}/></button>
          <button className={user.status==="blocked"?styles.unblockAction:styles.blockAction} title={user.status==="blocked"?"Unblock user":"Block user"} aria-label={user.status==="blocked"?"Unblock user":"Block user"} onClick={()=>setModal({type:"confirmStatus",user,block:user.status!=="blocked"})}>{user.status==="blocked"?<ShieldCheck size={16}/>:<Ban size={16}/>}</button>
        </div></td></tr>)}</tbody></table></div>
      {!users.length && <p className={styles.empty}>No reported users match these filters.</p>}
      <Pagination currentPage={pagination.currentPage} totalPages={pagination.totalPages} handlePrevPage={()=>load(pagination.currentPage-1)} handleNextPage={()=>load(pagination.currentPage+1)} leftText={`Reported users: ${pagination.totalUsers}`}/>
    </section>
    {modal && <div className={styles.overlay} onMouseDown={()=>setModal(null)}><div className={styles.modal} onMouseDown={(e)=>e.stopPropagation()}><button className={styles.close} onClick={()=>setModal(null)} aria-label="Close"><X/></button>
      <h2>{modal.type==="reports"?"Reports":modal.type==="warnings"?"Warning History":modal.type==="confirmStatus"?(modal.block?"Block Account":"Unblock Account"):modal.type==="confirmWarning"?"Confirm Warning":"Warn User"}</h2>
      <p>{modal.user.firstName} {modal.user.lastName} · {modal.user.email}</p>
      {modal.type==="warn" && <div className={styles.warningForm}><label htmlFor="warningReason">Warning reason</label><textarea id="warningReason" maxLength={500} value={reason} onChange={(e)=>{setReason(e.target.value);setWarningError("")}} placeholder="Explain clearly why this warning is being issued..." aria-invalid={Boolean(warningError)} aria-describedby={warningError?"warningError":undefined}/>{warningError&&<p id="warningError" className={styles.modalError}><AlertTriangle size={16}/>{warningError}</p>}<div className={styles.formFooter}><small className={reason.trim().length>0&&reason.trim().length<5?styles.invalid:""}>{reason.trim().length}/500</small><button className={styles.primary} onClick={requestWarningConfirmation}><TriangleAlert size={17}/> Review warning</button></div></div>}
      {modal.type==="confirmWarning" && <div className={styles.confirmContent}><div className={styles.confirmIcon}><TriangleAlert size={28}/></div><p>{Number(modal.user.warningCount)===2?"This is the user's third warning. Issuing it will automatically block the account.":"Are you sure you want to issue this official warning?"}</p><div className={styles.reasonPreview}><span>Reason</span><p>{reason.trim()}</p></div>{warningError&&<p className={styles.modalError}><AlertTriangle size={16}/>{warningError}</p>}<div className={styles.modalActions}><button className={styles.cancelButton} onClick={()=>setModal({type:"warn",user:modal.user})}>Go back</button><button className={styles.warningConfirmButton} onClick={issueWarning}>Issue warning</button></div></div>}
      {modal.type==="confirmStatus" && <div className={styles.confirmContent}><div className={`${styles.confirmIcon} ${modal.block?styles.dangerIcon:styles.successIcon}`}>{modal.block?<Ban size={28}/>:<ShieldCheck size={28}/>}</div><p>{modal.block?"This user will be blocked and will no longer be able to access restricted Nova Rents features.":"This user will regain access to Nova Rents."}</p><div className={styles.modalActions}><button className={styles.cancelButton} onClick={()=>setModal(null)}>Cancel</button><button className={modal.block?styles.dangerButton:styles.successButton} onClick={()=>changeStatus(modal.user,modal.block)}>{modal.block?"Block account":"Unblock account"}</button></div></div>}
      {(modal.type==="reports"||modal.type==="warnings") && <div className={styles.cards}>{details.length ? details.map((item,i)=><article key={item.complaintId||item.warningId}><div className={styles.cardHeading}><h3>{modal.type==="warnings"?`Warning ${i+1}`:`${item.complaintType} report #${item.complaintId}`}</h3><span>{dateText(item.createdAt)}</span></div>{modal.type==="reports"&&<div className={styles.reportFields}><div><span>Title</span><p>{item.title||"No title"}</p></div><div><span>Description</span><p>{item.description||"No description"}</p></div>{item.vehicleLicensePlate&&<div><span>Vehicle</span><p>{item.vehicleLicensePlate}</p></div>}<div><span>Status</span><p>{item.status}</p></div>{item.resolutionMessage&&<div><span>Resolution</span><p>{item.resolutionMessage}</p></div>}</div>}{modal.type==="warnings"&&<div className={styles.reportFields}><div><span>Reason</span><p>{item.reason}</p></div>{item.adminFirstName&&<div><span>Issued by</span><p>{item.adminFirstName} {item.adminLastName}</p></div>}</div>}</article>):<p>No history found.</p>}</div>}
    </div></div>}
  </div>;
}
