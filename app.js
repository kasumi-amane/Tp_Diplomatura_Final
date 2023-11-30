const express = require('express'); //puedo usar
const app = express();
const mongoose = require('mongoose'); //me permite conectarme con mongo
const hbs = require('hbs'); //Front con handdlebars
const session = require('express-session'); //me permite crear sesiones
const bodyParser = require('body-parser');
const dotenv = require('dotenv') // me permite guardar los datos en .env
const exphbs = require('express-handlebars');
const nodemailer = require('nodemailer');
const path = require('path');
const cors = require("cors");
const mercadopago = require("mercadopago");
const bcrypt = require('bcrypt');

dotenv.config()

mercadopago.accessToken = process.env.MP_ACCESS_TOKEN


const ADMIN_MAIL = process.env.ADMIN_MAIL
const ADMIN_MAIL_PASS = process.env.ADMIN_MAIL_PASS

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: ADMIN_MAIL,
      pass: ADMIN_MAIL_PASS,
    }
  });

app.use(cors());

const handlebars = exphbs.create({
    helpers: {
        getDayName: function (dayIndex) {
            const daysOfWeek = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado","Domingo"];
            return daysOfWeek[dayIndex];
        }
    }
});

app.set('view engine', 'hbs');


hbs.registerHelper('getDayName', function (dayIndex) {
    const daysOfWeek = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado","Domingo"];
    return daysOfWeek[dayIndex];
});

// Configurar el directorio de vistas
app.set('views', __dirname + '/views');

// Configurar el directorio de los parciales (opcional)
hbs.registerPartials(__dirname + '/views/partials');


//Middleweres

app.use(express.static(__dirname + '/public'));

const session_params ={
    secret: 'keySecret',
    resave: false,
    saveUninitialized: false,  // Agrega esta línea
    cookie: {secure: false}
};
app.use(session(session_params));

// MongoDB/Mongoose config
const ADMIN_USERNAME = process.env.ADMIN_USERNAME
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = 'nadiaNoSql';
const URL_CONNECTION = `mongodb+srv://NadiaRodriguez:${DB_PASSWORD}@cluster0.erwb51g.mongodb.net/${DB_NAME}`;


mongoose.connect(URL_CONNECTION, 
    {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
)
const database = mongoose.connection;

database.on('error', () =>{
    console.log('Error al conectarse a MongoDB')
})
database.once('open', () =>{
    console.log('Conectado a MongoDB')
})

//

// Modelos

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    email: String,
  });
  
const User = mongoose.model('User', userSchema);

const pedidoSchema = new mongoose.Schema({
    nombre: String,
    email: String,
    mensaje: String,
    fechaCreacion: {
        type: Date,
        default: Date.now
    }
});

const Pedido = mongoose.model('Pedido', pedidoSchema);

const postSchema = new mongoose.Schema({
    title: String,
    content: String,
});

const Post = mongoose.model('Post', postSchema);

module.exports = Post;


const daySchema = new mongoose.Schema({
    dayIndex: Number, // Representa el índice del día (0 para Domingo, 1 para Lunes, etc.)
    posts: [postSchema],
});

const Day = mongoose.model('Day', daySchema);

module.exports = Day;


// Configuración del body-parser para manejar datos de formularios
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());



//Autentificador 

const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.redirect('/');
    }
  };

//endpoints

app.get('/', async (req, res) => {
    if (req.session.user) {
        try {
            const posts = await Post.find();
            res.render('home', {
                user: req.session.user,
                isAdmin: req.session.isAdmin,
                isUser: req.session.isUser,
                post: post,
            });
        } catch (error) {
            console.error('Error al recuperar los pedidos:', error);
            res.status(500).send('Error interno del servidor');
        }
    } else {
        // If there's no user in the session, render the 'index' view
        res.render('index');
    }
});

app.get('/home', isAuthenticated, async (req, res) => {
    try {
        const allDays = await Day.find().sort({ dayIndex: 1 });
        const allPosts = await Post.find(); 
        // Mapear los posts a un objeto donde la clave es el día y el valor es un array de posts para ese día
        const postsByDay = allPosts.reduce((acc, post) => {
            const dayIndex = post.dayIndex;
            if (!acc[dayIndex]) {
                acc[dayIndex] = [];
            }
            acc[dayIndex].push(post);
            return acc;
        }, {});

        res.render('home', {
            username: req.session.username,
            days: allDays,
            postsByDay: postsByDay,  // Pasar el objeto postsByDay al renderizar la vista
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor');
    }
});



// (Usuarios)

// Registro de usuario
app.get('/register', (req, res) => {
    res.render('registration');
});

app.post('/register', async (req, res) => {
    const { username, password, email } = req.body;

    try {
        // Validar que el email tenga arroba
        if (!email.includes('@')) {
            return res.status(400).send('<h2>Error: El email debe contener "@"</h2>');
        }

        // Validar que la contraseña tenga al menos una mayúscula
        if (!/[A-Z]/.test(password)) {
            return res.status(400).send('<h2>Error: La contraseña debe contener al menos una mayúscula</h2>');
        }

        // Verificar si el username ya está en uso
        const existingUserByUsername = await User.findOne({ username });
        if (existingUserByUsername) {
            return res.status(400).send('<h2>Error: El nombre de usuario ya está en uso</h2>');
        }

        // Verificar si el email ya está en uso
        const existingUserByEmail = await User.findOne({ email });
        if (existingUserByEmail) {
            return res.status(400).send('<h2>Error: El email ya está en uso</h2>');
        }

        // Crear un nuevo usuario con la contraseña hasheada
        const newUser = new User({
            username,
            password,
            email,
        });

        // Guardar el nuevo usuario en la base de datos
        await newUser.save();

        res.redirect('/');
    } catch (error) {
        console.error(error);
        res.status(500).send('<h2>Error en el servidor</h2>');
    }
});

// Ingresar con el usuario
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (user && (password === user.password)) {
            req.session.userId = user._id;
            req.session.username = user.username;
            res.redirect('/home');
        } else {
            res.render('index', {error: 'Credenciales incorrectas. Intente nuevamente.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor');
    }
});

// cambiar la contraseña de usuario
app.get('/change-password', (req, res) => {
    res.render('change-password', { username: req.session.username });
});

app.post('/change-password', async (req, res) => {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    try {
        const user = await User.findById(req.session.userId);

        if (currentPassword === user.password) {
            if (newPassword === confirmPassword) {
                user.password = newPassword;
                await user.save();
                res.redirect('/home');
            } else {
                res.render('change-password', { username: req.session.username, error: 'Las nuevas contraseñas no coinciden.' });
            }
        } else {
            res.render('change-password', { username: req.session.username, error: 'Contraseña actual incorrecta.' });
        }
    } catch (error) {
        console.error(error);
        res.render('change-password', { username: req.session.username, error: 'Algo salió mal, por favor llena el formulario nuevamente.' });
    }
});


// eliminar la contraseña de usuario
app.get('/delete-user', isAuthenticated, (req, res) => {
    res.render('delete-user', { username: req.session.username });
});

app.post('/delete-user', isAuthenticated, async (req, res) => {
    const { username, password } = req.body;
    try {
        const usuarioExistente = await User.findOne({ username, password });
        if (usuarioExistente) {
            await User.deleteOne({ _id: usuarioExistente._id });
            req.session.destroy()
            res.redirect('/');
        } else {
            res.render('delete-account', { error: 'Nombre de usuario o contraseña incorrectos' });
        }
    }catch (error) {
        console.error(error);
        res.status(500).send('Error en el servidor');
    }
});

// cerrar sesion de usuario
app.get('/logout', (req, res) =>{
    req.session.destroy()
    res.redirect('/')
})

// Formulario mailer
app.post('/enviar-correo', async (req, res) => {
    // Obtén los datos del formulario desde el cuerpo de la solicitud
    const { nombre, email, mensaje } = req.body;
  
    // Validar que el correo electrónico contenga el carácter "@"
    if (!email || !email.includes('@')) {
        res.render('index', { error: 'Error: La dirección de correo electrónico es inválidaas. Intente nuevamente.' });
    }
    // Configuración del correo electrónico
    const mailOptions = {
      from: ADMIN_MAIL,
      to: ADMIN_MAIL,
      subject: 'Tienes un nuevo pedido:',
      text: `Nombre: ${nombre}\nCorreo: ${email}\nMensaje: ${mensaje}`
    };
  
    // Envía el correo electrónico
    transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        return res.status(500).send(error.toString());
      }
      // Guarda la información del pedido en la colección "pedidos"
      try {
        const nuevoPedido = new Pedido({ nombre, email, mensaje });
        await nuevoPedido.save();
        console.log('Pedido guardado en la base de datos');
      } catch (error) {
        console.error('Error al guardar el pedido en la base de datos:', error);
        return res.status(500).send(error.toString());
      }
      res.redirect('/')
    });
});

// Posteos
app.post('/create-post', isAuthenticated, async (req, res) => {
    const { postTitle, postContent, postDay } = req.body;

    try {
        // Create a new instance of post
        const newPost = new Post({
            title: postTitle,
            content: postContent,
        });

        // Find the corresponding day
        const dayIndex = parseInt(postDay);
        const dayPosts = await Day.findOne({ dayIndex });

        if (dayPosts) {
            // Check if 'posts' property exists, and if not, initialize it as an empty array
            dayPosts.posts = dayPosts.posts || [];
            dayPosts.posts.push(newPost);
            await dayPosts.save();
        } else {
            // If no document is found for the given dayIndex, create a new document
            const newDayPosts = new Day({
                    dayIndex,
                    posts: [newPost],
                });
                await newDayPosts.save();
            }
    
            res.redirect('/home'); // Puedes redirigir a la página principal u a otra página después de crear el post
        } catch (error) {
            console.error(error);
            res.status(500).send('Error en el servidor');
        }
});

app.post('/delete-post', isAuthenticated, async (req, res) => {
    try {
        const { postId, dayIndex } = req.body;

        // Find the corresponding day
        const foundDay = await Day.findOne({ dayIndex });

        if (foundDay) {
            // Filter out the post to be deleted
            foundDay.posts = foundDay.posts.filter(post => post._id.toString() !== postId);

            // Save the updated day
            await foundDay.save();

            // Optionally, you can also remove the post from the Post model if needed
            // await Post.deleteOne({ _id: postId });

            // Respond with JSON indicating success
            res.json({ success: true, message: 'Post deleted successfully' });
        } else {
            // Respond with JSON indicating failure
            res.status(404).json({ success: false, message: 'Day not found' });
        }
    } catch (error) {
        console.error(error);
        // Respond with JSON indicating server error
        res.status(500).json({ success: false, message: 'Error in the server' });
    }
});


//Api mercadopago (Proximamente)

// cambiar la contraseña de usuario
app.get('/product', (req, res) => {
    res.render('product', { username: req.session.username });
});

app.post("/create_preference", (req, res) => {

	let preference = {
		items: [
			{
				title: req.body.description,
				unit_price: Number(req.body.price),
				quantity: Number(req.body.quantity),
			}
		],
		back_urls: {
			"success": "http://localhost:8080",
			"failure": "http://localhost:8080",
			"pending": "http://localhost:8080/feedback"
		},
		auto_return: "approved",
	};

	mercadopago.preferences.create(preference)
		.then(function (response) {
			res.json({
				id: response.body.id
			});
		}).catch(function (error) {
			console.log(error);
		});
});

app.get('/feedback', function (req, res) {
	res.json({
		Payment: req.query.payment_id,
		Status: req.query.status,
		MerchantOrder: req.query.merchant_order_id
	});
});
    
console.log(process.env.PORT)
const PORT = process.env.PORT || 7070
app.listen(PORT, () =>{
    console.log(`Su servidor se esta ejecutando en http://localhost:${PORT}/`)
})

  