// Import necessary modules and models
const express = require('express');
const router = express.Router();
const userModel = require("./users");
const postModel = require("./post");
const passport = require('passport');
const upload = require("./multer");

const localStrategy = require("passport-local");

passport.use(new localStrategy(userModel.authenticate()));

// Define a variable to track authentication status
let isLoggedIn = false;

// Logout route

router.get('/logout', function(req, res, next) {
  req.logout(function(err) {
    if (err) {
      return next(err);
    }
    isLoggedIn = false; // Set isLoggedIn to false upon logout
    res.redirect('/login'); // Redirect to the login page
  });
});
// Login route
router.get('/login', function(req, res, next) {
  // Render the login page with error message if present
  isLoggedIn = false; // Set isLoggedIn to false when accessing the login page
  res.render('login', { error: req.flash('error') });
});

// Route middleware to ensure user is authenticated
function isLoggedInMiddleware(req, res, next) {
  if (isLoggedIn || req.isAuthenticated()) {
    isLoggedIn = true; // Set isLoggedIn to true if user is authenticated
    return next();
  }
  res.redirect("/login"); // If not authenticated, redirect to the login page
}

// Define routes
router.get('/', function(req, res, next) {
  
  
    res.render('index');
  
});

router.post("/login", passport.authenticate("local", {
  successRedirect: "/feed",
  failureRedirect: "/login",
  failureFlash: true
}));

router.get('/editprofile', isLoggedInMiddleware, function(req, res, next) {
  res.render('editprofile');
});

router.get('/feed', isLoggedInMiddleware, async function(req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const posts = await postModel.find().populate("user");
  res.render("feed", { user, posts });
});

router.get('/profile', isLoggedInMiddleware, async function(req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate("posts");
  res.render("profile", { user });
});

router.get('/show/posts', isLoggedInMiddleware, async function(req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user }).populate("posts");
  res.render("show", { user });
});

router.get('/add', isLoggedInMiddleware, async function(req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  res.render("add", { user });
});

router.delete('/deletepost/:postId', isLoggedInMiddleware, async function(req, res) {
  try {
    const postId = req.params.postId;
    await postModel.findByIdAndDelete(postId);
    res.sendStatus(200);
  } catch (error) {
    console.error('Error deleting post:', error);
    res.sendStatus(500);
  }
});

router.post('/createpost', isLoggedInMiddleware, upload.single("postimage"), async function(req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  const post = await postModel.create({
    user: user._id,
    title: req.body.title,
    description: req.body.description,
    image: req.file.filename,
    userProfileImage: user.profileImage,
    userFullName: user.fullname
  });
  user.posts.push(post._id);
  await user.save();
  res.redirect("/profile");
});

router.post('/fileupload', isLoggedInMiddleware, upload.single("image"), async function(req, res, next) {
  const user = await userModel.findOne({ username: req.session.passport.user });
  user.profileImage = req.file.filename;
  await user.save();
  res.redirect("/profile");
});

router.post('/register', function(req, res) {
  const { email, username, fullname } = req.body;
  const userdata = new userModel({ email, username, fullname });
  userModel.register(userdata, req.body.password)
    .then(function() {
      passport.authenticate("local")(req, res, function() {
        res.redirect('/profile');
      });
    });
});

module.exports = router;
