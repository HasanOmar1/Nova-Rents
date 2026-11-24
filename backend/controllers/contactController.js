/** Express controller handlers for contact operations.
 * Validates requests and returns the domain's HTTP responses. */
const STATUS_CODE = require("../constants/statusCodes");
const { sendContactMessageEmail } = require("../services/emailService");

const SUBJECT_MIN_LENGTH = 3;
const SUBJECT_MAX_LENGTH = 120;
const MESSAGE_MIN_LENGTH = 10;
const MESSAGE_MAX_LENGTH = 3000;
const CONTACT_COOLDOWN_MS = 60 * 1000;

/** Normalizes text.
 * Accepts value; returns the derived value. */
const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

/** Sends contact message.
 * Accepts req and res; returns a promise after sending a response or forwarding an error. */
const sendContactMessage = async (req, res) => {
  const subject = normalizeText(req.body?.subject);
  const message = normalizeText(req.body?.message);

  if (!subject || !message) {
    return res.status(STATUS_CODE.BAD_REQUEST).json({
      message: "Subject and message are required.",
    });
  }

  if (
    subject.length < SUBJECT_MIN_LENGTH ||
    subject.length > SUBJECT_MAX_LENGTH
  ) {
    return res.status(STATUS_CODE.BAD_REQUEST).json({
      message: `Subject must be between ${SUBJECT_MIN_LENGTH} and ${SUBJECT_MAX_LENGTH} characters.`,
    });
  }

  if (
    message.length < MESSAGE_MIN_LENGTH ||
    message.length > MESSAGE_MAX_LENGTH
  ) {
    return res.status(STATUS_CODE.BAD_REQUEST).json({
      message: `Message must be between ${MESSAGE_MIN_LENGTH} and ${MESSAGE_MAX_LENGTH} characters.`,
    });
  }

  const now = Date.now();
  const previousSentAt = Number(req.session.lastContactMessageAt) || 0;
  const remainingCooldown = CONTACT_COOLDOWN_MS - (now - previousSentAt);

  if (remainingCooldown > 0) {
    const retryAfterSeconds = Math.ceil(remainingCooldown / 1000);
    res.set("Retry-After", String(retryAfterSeconds));
    return res.status(STATUS_CODE.TOO_MANY_REQUESTS).json({
      message: `Please wait ${retryAfterSeconds} seconds before sending another message.`,
    });
  }

  // Reserve the cooldown before awaiting SMTP so rapid duplicate submissions
  // from this session cannot all pass the check at once.
  req.session.lastContactMessageAt = now;

  const sessionUser = req.session.user;
  const sender = {
    userId: sessionUser.userId,
    firstName: sessionUser.firstName,
    lastName: sessionUser.lastName,
    email: sessionUser.email,
  };

  try {
    await sendContactMessageEmail({ sender, subject, message });
    return res.status(STATUS_CODE.OK).json({
      message: "Your message was sent to Nova Rents support.",
    });
  } catch (error) {
    if (previousSentAt) {
      req.session.lastContactMessageAt = previousSentAt;
    } else {
      delete req.session.lastContactMessageAt;
    }

    console.error("Failed to deliver contact message:", error);
    return res.status(STATUS_CODE.INTERNAL_SERVER_ERROR).json({
      message: "We could not send your message. Please try again later.",
    });
  }
};

module.exports = { sendContactMessage };
