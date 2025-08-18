require('dotenv').config();
const routeAdmin = require('./routes/admin/index.route');
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require("express-session");
const methodOverride = require('method-override');
const path = require("path");
const database = require('./config/database');
const systemConfig = require('./config/system');
const flash = require("express-flash");

database.connect();

const app = express();
const port = process.env.PORT;

// View engine
app.set('view engine', 'pug');
app.set('views', './views');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.use('/public', express.static(path.join(__dirname, 'public')));
// flash
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

app.use((req, res, next) => {
    res.locals.flash = {
        success: req.flash('success'),
        error: req.flash('error'),
        info: req.flash('info'),
        warning: req.flash('warning'),
    };
    next();
});
// end flash
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use('/public', express.static(path.join(__dirname, 'public')));

// App Local Variables 
app.locals.prefixAdmin = systemConfig.prefixAdmin;

// Routes
routeAdmin(app);

app.listen(port, () => console.log(`Server http://localhost:${port}`));
