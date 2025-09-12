require('dotenv').config();

const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const methodOverride = require('method-override');
const flash = require('express-flash');
const cors = require('cors');

const routeAdmin = require('./routes/admin/index.route');
const routeClient = require('./routes/client/index.route');
const database = require('./config/database');
const systemConfig = require('./config/system');

database.connect();

const app = express();
const port = process.env.PORT || 4000;

// ===== CORS  =====
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';
app.use(cors({
  origin: FRONTEND_ORIGIN, 
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization', 'ngrok-skip-browser-warning'],
}));

// ===== View engine =====
app.set('view engine', 'pug');
app.set('views', './views');

// ===== Middlewares =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(cookieParser());
app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 15
  }
}));
app.use(flash());

// flash helper
app.use((req, res, next) => {
  res.locals.flash = {
    success: req.flash('success'),
    error: req.flash('error'),
    info: req.flash('info'),
    warning: req.flash('warning'),
  };
  next();
});

// App Local Variables 
app.locals.prefixAdmin = systemConfig.prefixAdmin;

// ===== Routes =====
routeAdmin(app);
routeClient(app);

app.listen(port, () => console.log(`Server http://localhost:${port}`));
