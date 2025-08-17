require('dotenv').config();
const routeAdmin = require('./routes/admin/index.route');
const express = require('express');
const cookieParser = require('cookie-parser');
const methodOverride = require('method-override');
const path = require("path");
const database = require('./config/database');
const systemConfig = require('./config/system');

database.connect();

const app = express();
const port = process.env.PORT;

// View engine
app.set('view engine', 'pug');
app.set('views', './views');

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(methodOverride('_method'));
app.use('/public', express.static(path.join(__dirname, 'public')));


// App Local Variables 
app.locals.prefixAdmin = systemConfig.prefixAdmin;

// Routes
routeAdmin(app);

app.listen(port, () => console.log(`Server http://localhost:${port}`));
