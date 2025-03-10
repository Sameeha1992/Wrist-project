const User = require("../../models/userSchema");
const env = require("dotenv").config();
const nodemailer = require("nodemailer");
const bcrypt = require("bcrypt");
const user_route = require("../../routes/userRouter");
const Category = require("../../models/categorySchema");
const Product = require("../../models/productSchema");
const Cart = require("../../models/cartSchema");
const Brand = require("../../models/brandSchema")
const {Types} = require("mongoose");
const ObjectId = Types.ObjectId;

//Load Homepage
const loadLandingPage = async (req, res) => {
  try {
    const user = req.session.user;
   
   

    const currentPage = parseInt(req.query.page) || 1;
    const itemsPerPage = 10;

    const categories = await Category.find({ isListed: true });
    const brands = await Brand. find({isBlocked:false});

    let cartCount = 0;

    if(user){
      const userData = await User.findOne({_id:user});
      cartCount = await Cart.countDocuments({ userId:userData._id})
    } else {
      cartCount = await Cart.countDocuments();
    }
   
    


    const totalProducts = await Product.countDocuments({
      isBlocked: false,
   category:{ $in:categories.map((cat)=>cat._id)},
   brand:{ $in: brands.map((brand)=>brand._id)}
      
    });

    

    const totalPages = Math.ceil(totalProducts / itemsPerPage);
   

    const skip = (currentPage - 1) * itemsPerPage;
    

    let productData = await Product.find({
      isBlocked: {$ne : true},
      category: { $in: categories.map((cat) => cat._id) },
      brand:{ $in:brands.map((brand)=>brand._id)},
      colorStock:{$elemMatch:{quantity:{$gt:0}}}
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(itemsPerPage);


     


      const productswithColorStock = productData.map((product)=>{
        const availableColors = product.colorStock.filter((color)=>color.status==="In_Stock" && color.quantity > 0);
        
        return {
          ...product.toObject(),
          availableColors,
        }
      })


    if (user) {
      const userData = await User.findOne({ _id: user });
      res.render("home", {
        user: userData._id,
        userName:userData.name,
        products: productswithColorStock,
        currentPage,
        totalPages,
        cartCount:cartCount
       
      });
    
    } else {
      return res.render("home", {
        products: productData,
        currentPage,
        totalPages,
      });
    }
  } catch (error) {
    console.error("Error loading landing page:",error)
    res.status(500).send("Server error");
  }
};

//Home page

const loadHomepage = async (req, res) => {
  try {
    const userId = req.session.user
    if (!userId) {
      res.redirect("/login");
    } else {
      const user = await User.findById(userId).select('name email');

      if (!user) {
        console.error("User not found for ID:", userId);
        return res.redirect("/login");
      }
      
      res.render("home",{
        userId,
        userName :user.name,
      });
    }
  } catch (error) {
    console.log("Homepage not rendered:", error);
    res.status(500).send("Server error");
  }
};

//loading pagenot found
const pageNotFound = async (req, res) => {
  try {
    res.render("pageNotFound");
  } catch (error) {
    console.log("Error rendering page-404", error);
    res.status(500).send("Server error");
  }
};

//Loading signup page

const loadSignup = async (req, res) => {
  try {
    res.render("signup");
  } catch (error) {
    console.log("Error page rendered", error);
    res.status(500).send("Server not found");
  }
};

//Loading login page
const loadLogin = async (req, res) => {
  try {
    res.render("login");
  } catch (error) {}
};


function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}



async function sendVerificationEmail(email, otp) {
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.NODEMAILER_EMAIL,
        pass: process.env.NODEMAILER_PASSWORD,
      },
    });
    const info = await transporter.sendMail({
      from: process.env.NODEMAILER_EMAIL,
      to: email,
      subject: "Verify your account",
      text: `Your OTP is ${otp}`,
      html: `<b>Your OTP: ${otp}</b>`,
    });

    return info.accepted.length > 0;
  } catch (error) {
    console.error("Error sending email", error);
    return false;
  }
}



const signup = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;
   
    const findUser = await User.findOne({ email });
    if (findUser) {
      return res.json({ success: false, message: "user already exiss" ,messageColor:"red"});
    }

    const otp = generateOtp();

    const emailSent = await sendVerificationEmail(email, otp);
    if (!emailSent) {
      return res.status(400).json({ error: "Failed to send verification" });
    }
    const otpExpiryTime = Date.now() + 1 *   60 * 1000;
    req.session.userOtp = { otp, expiresAt: otpExpiryTime };
    req.session.userData = { name, phone, email, password };
    console.log(req.session.userData, "  req.session.userData");
    console.log("OTP Sent", otp);

    res.json({ success: true, redirectUrl: "/verify-otp" });
  } catch (error) {
    console.error("signup error", error);
    res.redirect("/pageNotFound");
  }
};

//Otp functionalities

const getotp = async (req, res) => {
  try {
    return res.status(200).render("verify-otp");
  } catch (error) {
    console.error("Error", error);
    res.status(500).json({ message: "Internal server error" });
  }
};




const securePassword = async (password) => {  
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    return passwordHash;
  } catch (error) {
    console.error("Error hashing password", error);
  }
};





const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    
    // Get OTP and expiration from session
    const { userOtp } = req.session;
    if (!userOtp) {
      return res.status(400).json({ success: false, message: "OTP not generated. Please request OTP again." });
    }

    const { otp: savedOtp, expiresAt } = userOtp;

    // Check if OTP is expired
    if (Date.now() > expiresAt) {
      return res.status(400).json({ success: false, message: "OTP expired. Please request a new OTP." });
    }

    // Validate OTP
    if (savedOtp !== otp) {
      return res.status(400).json({ success: false, message: "Invalid OTP. Please try again." });
    }

    // OTP is valid, proceed with user registration
    const user = req.session.userData;
    const passwordHash = await securePassword(user.password);
    const newUser = new User({
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: passwordHash,
    });
    await newUser.save();

    // Save the user in the session
    req.session.user = newUser._id;

    // Clear OTP session data after successful verification
    delete req.session.userOtp;
    delete req.session.userData;

    res.json({ success: true, message: "Signup successful! You can now log in." });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ success: false, message: "An error occurred" });
  }
};




//Resend OTP

const resendOtp = async (req, res) => {
  try {
    const { email } = req.session.userData;
    if (!email) {
      return res
        .status(400) 
        .json({ success: false, message: "Email not found in session" });
    }
    const otp = generateOtp();
    const otpExpiryTime = Date.now() + 1 *   60 * 1000;
    req.session.userOtp = { otp, expiresAt: otpExpiryTime };

    const emailSent = await sendVerificationEmail(email, otp);
    if (emailSent) {
      console.log(`Resent otp ${otp}`);
      res
        .status(200)
        .json({ success: true, message: "OTP Resend Successfully" });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to Resend OTP Please try again",
      });
    }
  } catch (error) {
    console.error("Error in resending OTP", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error.Please try again",
    });
  }
};

//Login functionalities

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email });
   

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
    if (user.isBlocked) {
      return res.json({
        success: false,
        message: "User is blocked by the admin",
      });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.json({
        success: false,
        message: "incorrect email or password",
      });
    }

    req.session.user = user._id;
    return res.json({ success: true, message: "Login Successful" });
  } catch (error) {
    console.log("login error", error);
    return res.render({ message: "Something went wrong" });
  }
};

//Loading product detail

const loadProductDetail = async (req, res) => {
  try {
    if(!req.session.user) {
      return res.redirect('/login')
    }else {
      
    
    const productId = req.query.id;
    const cartCount = 0;
    const wishlistCount =0;
   
    const product = await Product.findById({ _id: productId })
    

   

    if (!product) {
      return res.status(404).send("Product not found");
    }

    const relatedProducts = await Product.find({
      category:product.category._id,
      _id:{ $ne:productId }
    }).limit(4);



    res.render("product-details", { product,relatedProducts,cartCount,wishlistCount});
  }
  } catch (error) {
    console.error("Error in loading product detail:", error);
    res.status(500).send("Server error");
  }
};

const logout = async (req, res) => {
  try {
    req.session.destroy((err) => {
      if (err) {
        return res.redirect("/pageerror");
      }
      res.redirect("/login");
    });
  } catch (error) {
    console.log("unexpected error during logout");
    res.redirect("/pageerror");
  }
};



//Loading of shopping page
  const loadShoppingPage = async (req,res)=>{
    try {
      if(!req.session.user){
        return res.redirect("/login");
      } else {
        const userId = req.session.user;
        const userData = await User.findOne({_id:userId});
       let cartCount =0;


        const {category, sort, search, page } = req.query;

        const limit = 8;
        const skip =(page-1) * limit;

        let query ={isBlocked:false};

        if(userId){
          const userData = await User.findOne({_id:userId});
          cartCount = await Cart.countDocuments({userId:userData._id})
        }


        const blockedCategories = await Category.find({isListed: false}).select('_id')
        const blockedBrands = await Brand.find({isBlocked: true}).select('_id');
        
        
        query.category = {
          $nin: blockedCategories.map(cat =>cat._id)
        }
        query.brand = {
          $nin: blockedBrands.map(brand => brand._id)
        }
         
        if(category && category !== "All Categories") {
          query.category = category;
        }
        if(search) {
          query.productName = { $regex: `^${search}`, $options: "i" }; 
        }
        const totalProducts = await Product.countDocuments(query);


       
        let sortCriteria ={};
        if(sort){
          switch (sort) {
            case "price-low-high":
               sortCriteria = { salePrice: 1 }; 
              break;
            case "price-high-low":
              sortCriteria={salePrice :-1}; 
              break;
            case "name-az":
              sortCriteria={productName : 1}; 
              break;
            case "name-za":
              sortCriteria={productName: -1}; 
              break;
          }
        }  else{
          sortCriteria.createdAt=-1;
        }
        let productData = await Product.find(query)
        .populate("category")
        .sort(sortCriteria)
        .skip(skip)
        .limit(limit);
       
        
        const categories = await Category.find({isListed:true});
        const brand = await Brand.find({isBlocked:true})
        const totalPages = Math.ceil(totalProducts/limit);
        const currentPage = parseInt(page);
        
        
        res.render("shop",{
          user:userData,
          products:productData,
          categories,
          currentPage,
          totalPages,
          category:category || "All Categories",
          sort: sort || '',
          search: search || "",
          cartCount:cartCount,
          userName: userData.name || "",
          userId: userData._id || null

        });

      }
      
    } catch (error) {
      console.log(error.message);
      res.status(500).render('500')
      
    }
  }





module.exports = {
  loadHomepage,
  logout,
  loadLandingPage,
  loadSignup,
  signup,
  getotp,
  verifyOtp,
  resendOtp,
  loadLogin,
  login,
  loadProductDetail,
  loadShoppingPage,
};
