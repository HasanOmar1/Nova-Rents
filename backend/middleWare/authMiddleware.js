// Middleware to ensure the user is logged in before accessing protected routes
const isAuthenticated = (req, res, next) => {
  console.log(req.session);
  if (req.session.user) {
    return next();
  } else {
    console.error("User not logged in");
    return res.status(401).json({ message: "Login to do this action!" });
  }
};
module.exports = isAuthenticated;
