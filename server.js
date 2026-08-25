const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

// Middleware สำหรับแปลง Body และเปิดใช้งานโฟลเดอร์ public
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

// เชื่อมต่อฐานข้อมูล MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB Connected"))
    .catch((error) => console.log("MongoDB Error:", error));

// ----------------------------------------------------
// Schema & Models (โครงสร้างข้อมูล)
// ----------------------------------------------------

// โครงสร้างข้อมูลผู้ใช้งาน (รวมช่อง name เรียบร้อย)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true }
});
const User = mongoose.model("User", userSchema);

// โครงสร้างข้อมูลสินค้า
const productSchema = new mongoose.Schema({
    name: String,
    price: Number,
    description: String,
    category: String,
    stock: Number,
    Image: String
});
const Product = mongoose.model("Product", productSchema);

// โครงสร้างข้อมูลประวัติคำสั่งซื้อและรายรับ
const orderSchema = new mongoose.Schema({
    items: Array,
    totalAmount: Number,
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model("Order", orderSchema);

// ----------------------------------------------------
// API Endpoints (เส้นทางรับส่งข้อมูล)
// ----------------------------------------------------

// 1. API สมัครสมาชิก
app.post("/api/register", async (req, res) => {
    try {
        const { username, password, name } = req.body;

        const existingUser = await User.findOne({ username: username });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "Username นี้มีผู้ใช้งานแล้ว" });
        }

        await User.create({ username, password, name });
        res.status(201).json({ success: true, message: "สมัครสมาชิกสำเร็จ" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. API เข้าสู่ระบบ
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username: username, password: password });
        if (user) {
            res.json({ success: true, message: "Login successful", name: user.name });
        } else {
            res.status(401).json({ success: false, message: "Username หรือ Password ไม่ถูกต้อง" });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// 3. API ดึงข้อมูลสินค้า
app.get("/api/products", async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// API สำหรับเพิ่มสินค้าตัวอย่าง (สำหรับทดสอบ)
app.post("/api/seed-products", async (req, res) => {
    try {
        await Product.deleteMany({}); // ล้างข้อมูลสินค้าเก่าก่อน
        const sampleProducts = [
            { name: "กีตาร์โปร่ง All-Solid", price: 15000, description: "เสียงใส กังวาน ไม้แท้ทั้งตัว", stock: 3 },
            { name: "กีตาร์ไฟฟ้า Ibanez", price: 9500, description: "เหมาะสำหรับสาย Hard Rock / Metal", stock: 1 },
            { name: "Nux Mighty Plug Pro", price: 3200, description: "Headphone Amps เล่นผ่านคอมสบายๆ", stock: 0 } // ลองใส่ stock = 0 เพื่อทดสอบสินค้าหมด
        ];
        await Product.insertMany(sampleProducts);
        res.json({ success: true, message: "เพิ่มสินค้าตัวอย่างสำเร็จ!" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// API สำหรับการชำระเงิน
app.post("/api/checkout", async (req, res) => {
    try {
        const { cart } = req.body;
        let totalAmount = 0;

        // 1. ตรวจสอบและตัดสต็อกสินค้าในฐานข้อมูล
        for (const item of cart) {
            const product = await Product.findById(item.id);
            if (!product || product.stock < item.qty) {
                return res.status(400).json({ success: false, message: `สินค้า ${item.name} มีจำนวนไม่เพียงพอ` });
            }
            
            // หักสต็อกตามจำนวนที่สั่งซื้อ
            product.stock -= item.qty;
            await product.save();

            totalAmount += item.price * item.qty;
        }

        // 2. บันทึกคำสั่งซื้อและยอดเงินลงในแฟ้ม orders
        await Order.create({ items: cart, totalAmount });

        res.json({ success: true, message: "ชำระเงินสำเร็จ! ระบบหักสต็อกและบันทึกรายรับเรียบร้อยแล้ว" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});



// สั่งให้ Server เริ่มทำงาน
app.listen(3000, () => {
    console.log("Server running at http://localhost:3000");
});