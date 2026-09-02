// Presents the authenticated contact form and admin contact information.
// It takes no props and returns the contact page with send-status feedback.
import { useState } from "react";
import axios from "axios";
import {
  CircleAlert,
  CircleCheck,
  Mail,
  MessageSquareText,
  Send,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import AsyncButton from "../../../components/AsyncButton/AsyncButton";
import { useUserContext } from "../../../context/UserContext";
import styles from "./Contact.module.css";

const ADMIN_EMAIL = "novarents9@gmail.com";
const SUBJECT_MIN_LENGTH = 3;
const SUBJECT_MAX_LENGTH = 120;
const MESSAGE_MIN_LENGTH = 10;
const MESSAGE_MAX_LENGTH = 3000;

// Manages and renders the signed-in user's admin contact form.
// It takes no props and returns the contact page JSX.
const Contact = () => {
  const { currentUser } = useUserContext();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const senderName =
    `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim() ||
    "Nova Rents member";

  // Validates the message and submits it to the contact endpoint.
  // It accepts a form event and returns a promise resolved after the request.
  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();

    if (cleanSubject.length < SUBJECT_MIN_LENGTH) {
      setErrorMsg(
        `Subject must contain at least ${SUBJECT_MIN_LENGTH} characters.`,
      );
      return;
    }

    if (cleanMessage.length < MESSAGE_MIN_LENGTH) {
      setErrorMsg(
        `Message must contain at least ${MESSAGE_MIN_LENGTH} characters.`,
      );
      return;
    }

    setIsSending(true);

    try {
      const response = await axios.post("/contact", {
        subject: cleanSubject,
        message: cleanMessage,
      });

      setSuccessMsg(
        response.data?.message || "Your message was sent to the admin team.",
      );
      setSubject("");
      setMessage("");
    } catch (error) {
      setErrorMsg(
        error?.response?.data?.message ||
          "We could not send your message. Please try again.",
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <main className={`${styles.Contact} page`}>
      <header className={styles.pageHeader}>
        <span className={styles.eyebrow}>
          <MessageSquareText size={17} aria-hidden="true" />
          We are here to help
        </span>
        <h1>Contact Us</h1>
        <p>
          Send a message directly to the Nova Rents admin team. We will reply
          to the email connected to your account.
        </p>
      </header>

      <div className={styles.layout}>
        <section className={styles.formCard} aria-labelledby="contact-form-title">
          <div className={styles.cardHeading}>
            <div className={styles.iconBox} aria-hidden="true">
              <Send size={22} />
            </div>
            <div>
              <h2 id="contact-form-title">Send a message</h2>
              <p>Tell us what you need help with.</p>
            </div>
          </div>

          <div className={styles.senderCard}>
            <UserRound size={20} aria-hidden="true" />
            <div>
              <span>Sending as</span>
              <strong>{senderName}</strong>
              <small>{currentUser?.email}</small>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className={styles.fieldGroup}>
              <div className={styles.fieldHeading}>
                <label htmlFor="contact-subject">Subject</label>
                <span
                  id="contact-subject-count"
                  className={styles.characterCounter}
                >
                  {subject.length}/{SUBJECT_MAX_LENGTH}
                </span>
              </div>
              <input
                id="contact-subject"
                type="text"
                value={subject}
                onChange={
                  /* Handles the change callback for this rendered control.
                   * It accepts event and returns the delegated result. */
                  (event) => setSubject(event.target.value)}
                minLength={SUBJECT_MIN_LENGTH}
                maxLength={SUBJECT_MAX_LENGTH}
                placeholder="How can we help?"
                aria-describedby="contact-subject-help contact-subject-count"
                disabled={isSending}
                required
              />
              <small id="contact-subject-help" className={styles.fieldHelp}>
                Keep it short and specific.
              </small>
            </div>

            <div className={styles.fieldGroup}>
              <div className={styles.fieldHeading}>
                <label htmlFor="contact-message">Message</label>
                <span
                  id="contact-message-count"
                  className={styles.characterCounter}
                >
                  {message.length}/{MESSAGE_MAX_LENGTH}
                </span>
              </div>
              <textarea
                id="contact-message"
                value={message}
                onChange={
                  /* Handles the change callback for this rendered control.
                   * It accepts event and returns the delegated result. */
                  (event) => setMessage(event.target.value)}
                minLength={MESSAGE_MIN_LENGTH}
                maxLength={MESSAGE_MAX_LENGTH}
                placeholder="Describe your question or issue and include any useful details."
                aria-describedby="contact-message-help contact-message-count"
                disabled={isSending}
                rows={9}
                required
              />
              <small id="contact-message-help" className={styles.fieldHelp}>
                Do not include passwords, payment details, or other sensitive
                information.
              </small>
            </div>

            <div className={styles.formFooter}>
              <div className={styles.statusArea} aria-live="polite">
                {errorMsg && (
                  <p className={styles.errorMsg} role="alert">
                    <CircleAlert size={18} aria-hidden="true" />
                    {errorMsg}
                  </p>
                )}
                {successMsg && (
                  <p className={styles.successMsg} role="status">
                    <CircleCheck size={18} aria-hidden="true" />
                    {successMsg}
                  </p>
                )}
              </div>

              <AsyncButton
                type="submit"
                className={styles.submitButton}
                loading={isSending}
                loadingText="Sending..."
              >
                <Send size={17} aria-hidden="true" />
                Send message
              </AsyncButton>
            </div>
          </form>
        </section>

        <aside className={styles.sideColumn} aria-label="Contact information">
          <section className={styles.infoCard}>
            <div className={styles.infoIcon} aria-hidden="true">
              <Mail size={24} />
            </div>
            <h2>Email the admins</h2>
            <p>
              Prefer using your own email application? You can contact the
              admin team directly.
            </p>
            <a className={styles.emailLink} href={`mailto:${ADMIN_EMAIL}`}>
              {ADMIN_EMAIL}
            </a>
          </section>

          <section className={styles.privacyCard}>
            <ShieldCheck size={22} aria-hidden="true" />
            <div>
              <h2>Your identity is verified</h2>
              <p>
                Your name and account email are added automatically, so the
                admin team knows who sent the message and can reply safely.
              </p>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
};

export default Contact;
