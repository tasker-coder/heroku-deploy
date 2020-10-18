const express = require("express");
const mongoose = require("mongoose");

const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require("bcrypt");
const { body, validationResult } = require("express-validator");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20");
const Account = require("./models/account");

const app = express();

passport.use(
  new GoogleStrategy(
    {
      callbackURL: "https://logindemo-nodedeploy.herokuapp.com/auth/google/callback",
      clientID:
        "448989001757-1jur341vs47fp5hvhnmfp56gljk7oi8i.apps.googleusercontent.com",
      clientSecret: "VRZDMArVNYXlXu9ynMyvWX7z",
      prompt: "select_account",
    },
    (accessToken, refreshToken, profile, done) => {
      new Account({
        firstName: profile.displayName,
        email: profile.email,
      })
        .save()
        .then((newAccount) => {
          console.log("new account created" + newAccount);
        });
    }
  )
);
app.use(passport.initialize());

const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");


//cookie
app.use(
  cookieSession({
    name: "session",
    keys: ["123"],
  })
);
app.use(cookieParser());

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With,Content-Type, Accept"
  );
  next();
});

const MONGODB_URI = "mongodb+srv://tasker-coder:taskeratlas4@mycluster.cb8cm.mongodb.net/<dbname>?retryWrites=true&w=majority"
mongoose.connect(MONGODB_URI , {
  useNewUrlParser: true,
});



app.get("/api/accounts", (req, res) => {
  Account.find({}, (err, accounts) => {
    return res.send(accounts);
  }).catch((err) => {
    res.status(500).send({
      message: err.message || "Some error while retrieving accounts.",
    });
  });
});


// REGISTER A USER
app.post(
  "/api/accounts",
  body("confirmPassword").custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error("Passwords do not match");
    }
    // Indicates the success of this synchronous custom validator
    return true;
  }),
  async (req, res) => {
    const errors = await validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Check if user exists already.
    let user = await Account.findOne({
      firstName: req.body.firstName,
      email: req.body.email,
    });
    if (user) {
      return res.status(400).json({
        msg: "Email already taken, use a different email.",
      });
    }

    // Adding a password Hash
    const salt = await bcrypt.genSalt(10);
    const pass = await bcrypt.hash(req.body.password, salt);

    const account = await new Account({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      country: req.body.country,
      city: req.body.city,
      state: req.body.state,
      address: req.body.address,
      zip: req.body.zip,
      password: pass,
      mobile: req.body.mobile,
    });

    await account.save((err) => {
      if (err) {
        res.send(err);
      } else {
        res.send({ message: "Data Successfully Added" });
      }
    });
  }
);

// LOGIN METHOD

app.post(
  "/",
  [
    body("email").isEmail(),
  
  ],
  async function (req, res) {
    const errors = validationResult(req);

    // Check for errors
    if (!errors.isEmpty()) {
      return res.status(400).json({
        errors: errors.array(),
      });
    }

    // Normal Login
    if (req.body.login_parameter === "normal") {
      const { email, password } = req.body;

      let user = await Account.findOne({ email });
      if (!user) {
        console.log("Invalid user.");
        res.send(false);
      } else {
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
          res.send(false);
          return res.status(400).json({
            message: "Incorrect Password !",
          });
        }
        console.log("ok logged in.");
        res.send(true);
      }
    }

    // Google sign-in
    if (req.body.login_parameter === "google") {
          Account.register(
      { email: req.body.email },
      req.body.password,
      (err, account) => {
        if (err) {
          console.log(err);
          res.redirect('/');
          console.log('ok logged in.');
          res.send(true);
        } else {
          passport.authenticate('local')(req, res, () => {
            res.redirect('/');
          });
          res.send(true);
        }
      }
    );
    }
  }
);


// EMAIL REQUEST TO RESET FORGOTTEN PASSWORD

app.post("/forgot", (req, res) => {
  const data = {
    members: [
      {
        email_address: req.body.email,
        status: "subscribed",
      },
    ],
  };
  jsonData = JSON.stringify(data);

  const url = "https://us2.api.mailchimp.com/3.0/lists/118e7aee13";
  const options = {
    method: "POST",
    auth: "apikey:3794cc0620fb237479e07ac46f873bb5-us2",
  };

  const request = https.request(url, options, (response) => {
    response.on("data", (data) => {
      console.log(JSON.parse(data));
    });
  });
  request.write(jsonData);
  request.end();
  console.log(req.body.email);
  res.send(true);
});

// Update Password
app
  .route("/forgotPassword")
  .get((req, res) => {
    res.sendFile(path.join(__dirname + "/public/forgotpassword.html"));
  })
  .put(
    body("confirmPassword").custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Passwords do not match");
      }

      // Indicates the success of this synchronous custom validator
      return true;
    }),
    async (req, res) => {
      const errors = validationResult(req);

      if (!errors.isEmpty()) {
        return res.status(400).json({
          errors: errors.array(),
        });
      }

      // BCRYPT PASSWORD HASH
      const salt = await bcrypt.genSalt(10);
      const pass = await bcrypt.hash(req.body.newPassword, salt);
      Account.findOneAndUpdate(
        { email: req.body.email },
        {
          password: pass,
        },
        (err) => {
          if (err) {
            res.json({ err: err });
          } else {
            res.send("Successfully updated!");
          }
        }
      );
    }
  );

// Redirections from POST
app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname + "/public/index.html"));

});

app.get("/register", function (req, res) {
  res.sendFile(path.join(__dirname + "/public/reqsignup.html"));
});

app.get("/tasks", function (req, res) {
  res.sendFile(path.join(__dirname + "/public/reqtask.html"));
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/" }),
  (req, res) => {
    req.session.token = req.user.token;
    res.redirect("/");
  }
);



//PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("Server is running on PORT " + PORT);
});
