// --- Importación de Módulos ---
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config(); // Para manejar variables de entorno

// --- Configuración Inicial ---
const app = express();
const PORT = process.env.PORT || 5000;

// --- Middlewares ---
app.use(cors()); // Permite peticiones desde otros orígenes (nuestro frontend)
app.use(express.json()); // Permite al servidor entender JSON
// Sirve los archivos estáticos de la carpeta 'uploads' para que las imágenes sean accesibles desde el navegador
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Conexión a MongoDB ---
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('MongoDB conectado exitosamente.'))
.catch(err => console.error('Error al conectar a MongoDB:', err));

// --- Modelo de Datos (Schema) ---
const productSchema = new mongoose.Schema({
    codigo: { type: String, required: true, unique: true },
    nombre: { type: String, required: true },
    descripcion: { type: String, required: true },
    cantidad: { type: Number, required: true },
    precio: { type: Number, required: true },
    fotoUrl: { type: String, required: true },
}, { timestamps: true }); // timestamps añade createdAt y updatedAt

const Product = mongoose.model('Product', productSchema);

// --- Configuración de Multer para la Subida de Archivos ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Carpeta donde se guardarán las imágenes
    },
    filename: function (req, file, cb) {
        // Genera un nombre de archivo único para evitar colisiones
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

// --- Rutas de la API (CRUD) ---

// CREATE: Añadir un nuevo producto
app.post('/api/products', upload.single('foto'), async (req, res) => {
    try {
        const { nombre, descripcion, cantidad, precio } = req.body;
        // La URL de la foto será la ruta en nuestro servidor
        const fotoUrl = req.file ? `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}` : '';

        const newProduct = new Product({
            codigo: `PROD-${Date.now()}`, // Genera un código simple
            nombre,
            descripcion,
            cantidad,
            precio,
            fotoUrl,
        });

        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// READ: Obtener todos los productos
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// UPDATE: Actualizar un producto existente
app.put('/api/products/:id', upload.single('foto'), async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        if (req.file) {
            // Si se sube una nueva foto, actualizamos la URL
            updateData.fotoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
            // Aquí podrías añadir lógica para borrar la imagen anterior del servidor si lo deseas
        }

        const updatedProduct = await Product.findByIdAndUpdate(id, updateData, { new: true });
        if (!updatedProduct) return res.status(404).json({ message: 'Producto no encontrado' });

        res.status(200).json(updatedProduct);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// DELETE: Eliminar un producto
app.delete('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const deletedProduct = await Product.findByIdAndDelete(id);

        if (!deletedProduct) return res.status(404).json({ message: 'Producto no encontrado' });
        
        // Aquí también podrías borrar el archivo de imagen correspondiente
        res.status(200).json({ message: 'Producto eliminado exitosamente' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// --- Iniciar el Servidor ---
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
