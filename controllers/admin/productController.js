const Product = require("../../models/productSchema");
const Category = require("../../models/categorySchema");
const Brand = require("../../models/brandSchema");
const User = require("../../models/userSchema")
const fs = require("fs");
const path = require("path");
const mongoose= require('mongoose')

const sharp = require("sharp")



const getProductAddPage = async (req,res)=>{
    try{
        const category = await Category.find({isListed:true});
        const brand = await Brand.find({isBlocked:false});
        res.render("product-add",{
            cat:category,
            brand:brand
        });
       

    }
    catch(error){
        res.redirect("/pageerror")

    }
};


const addProducts = async (req,res)=>{
    try {
        const products = req.body;
        console.log("product inte dataaaaa",products)


        const productExists = await Product.findOne({
            productName:products.productName,
        });
            
        if(!productExists){
            const images =[];

            if(req.files && req.files.length>0){
                for(let i=0;i<req.files.length;i++){
                    const originalImagePath = req.files[i].path;

                    const resizedImagePath = path.join('public','uploads','product-images',req.files[i].filename);
                    await sharp(originalImagePath).resize({width:440,height:440}).toFile(resizedImagePath);
                    images.push(req.files[i].filename);
                }
            }




            const categoryId = await Category.findOne({name:products.category});
            const brandId = await Brand.findOne({brandName:products.brand})

            if(!categoryId){
                return res.status(400).json("Invalid category name")
            }
            if(!brandId){
                return res.status(400).json("Invalid brand name")
            }

            const newProduct = new Product({
                productName:products.productName,
                description:products.description,
                brand:brandId._id,
                category:categoryId._id,
                regularPrice:products.regularPrice,
                salePrice:products.salePrice,
                productOffer:products.productOffer,
               colorStock:products.colorStock,
                productImage:images,
               

            });

            await newProduct.save();
            return res.redirect("/admin/addProducts")
        }else {
            return res.status(400).json("Product Already exist.please try with another name");
           
        }
        
    } catch (error) {
        console.error("Error saving product",error);
        return res.redirect("/admin/pageerror")
        
    }
}




const getAllProducts = async (req, res) => {
    try {
        const search = req.query.search || "";
        const page = req.query.page || 1;
        const limit = 4;

        const searchQuery = {
            $or: [
                { productName: { $regex: new RegExp(".*" + search + ".*", "i") } },
            ]
        };

        const productData = await Product.find(searchQuery)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('category')
            .populate('brand')
            .exec();

        const count = await Product.countDocuments(searchQuery);

        const category = await Category.find({ isListed: true });
        const brand = await Brand.find({ isBlocked: false });

        if (productData) {
            res.render("products", {
                data: productData.map(product => ({
                    ...product.toObject(),
                    colorStockDetails: product.colorStock.map(stock => ({
                        color: stock.color,
                        quantity: stock.quantity,
                        status: stock.status
                    }))
                })),
                currentPage: page,
                totalPages: Math.ceil(count / limit),
                cat: category,
                brand: brand
            });
        } else {
            res.render("page-404");
        }
    } catch (error) {
        console.error("Error in fetching products:", error);
        res.redirect("/pageerror");
    }
};



const blockProduct = async (req, res) => {
    try {
        let id = req.query.id;
        await Product.updateOne({ _id: id }, { $set: { isBlocked: true } });
        res.redirect("/admin/product")
        
    } catch (error) {
        res.redirect("/pageerror")
        
    }
};

const unblockProduct = async (req, res) => {
    try {
        let id = req.query.id;
        console.log("unblocking product",id)
        await Product.updateOne({ _id: id }, { $set: { isBlocked: false } });
        res.redirect("/admin/product")
    } catch (error) {
       res.redirect("/pageerror");
       console.log("error while blocking or unblocking")
    }
};


const getEditProduct = async (req,res)=>{

    try {
        const id = req.query.id;
        
        const product = await Product.findOne({_id:id})
        .populate('category',"_id name")
        .populate('brand','_id brandName');
        console.log("colorstock",product.colorStock)
       
       
        const category = await Category.find({isListed:true});
        
        const brand = await Brand.find({isBlocked:false});
        console.log("Product Brand",product.brand)
        console.log("Product Ctegory",product.category)
        
        res.render("edit-product",{
            product:product,
            cat:category,
            brand:brand,
            productOffer:product.productOffer,
            colorStock:product.colorStock
           

        })
        

    } catch (error) {
        res.redirect("/pageerror")
        
    }
}

const editProduct = async (req, res) => {
    try {
        // Convert the product ID to a valid Mongoose ObjectId
        const id = new mongoose.Types.ObjectId(req.params.id);

        // Find the existing product with all populated references
        const product = await Product.findById(id);

        if (!product) {
            req.flash('error', 'Product not found');
            return res.redirect('/admin/product');
        }

        // Destructure form data
        const {
            productName,
            brand,
            category,
            descriptionData,
            regularPrice,
            salePrice,
            colorStock
        } = req.body;

        // Check if product name already exists (excluding current product)
        const existingProduct = await Product.findOne({
            productName,
            _id: { $ne: product._id }
        });

        if (existingProduct) {
            req.flash('error', 'Product with this name already exists');
            return res.redirect(`/admin/editProduct/${id}`);
        }

        // Process images
        let images = product.productImage || [];
        if (req.files && req.files.length > 0) {
            const newImages = [];
            for (const file of req.files) {
                const originalImagePath = file.path;
                const resizedImagePath = path.join('public','uploads','product-images',file.filename);

                // Resize image
                await sharp(originalImagePath)
                    .resize({ width: 440, height: 440 })
                    .toFile(resizedImagePath);

                newImages.push(file.filename);
            }
            images = [...images, ...newImages];
        }

        // Update product details
        product.productName = productName;
        product.brand = brand; 
        product.category = category; 
        product.description = descriptionData;
        product.regularPrice = parseFloat(regularPrice);
        product.salePrice = parseFloat(salePrice);
        product.productImage = images;

        // Update color stock
        product.colorStock = colorStock.map(stock => ({
            color: stock.color,
            quantity: parseInt(stock.quantity),
            status: stock.status
        }));

        // Save updated product
        await product.save();

        req.flash('success', 'Product updated successfully');
        res.redirect('/admin/product');

    } catch (error) {
        console.error('Edit Product Error:', error);
        req.flash('error', 'Error updating product');
        res.redirect('/admin/product');
    }
};

//         const existingProduct = await Product.findOne({
//             productName:product.productName,
//             _id:{$ne:id}
//         })
//         console.log(existingProduct,"existinggggggggg")

//         if(existingProduct){
//             return res.status(400).json({error:"Product with this name already exists.Please try with another name"})
//         }

//         const images = [];

//         if(req.files && req.files.length>0){
//            req.files.forEach((file)=> images.push(file.filename))
//         }

//         let brandId = product.brand; // default to existing brand
//         if (data.brand) {
//             const brand = await Brand.findOne({ name: data.brand });
//             if (!brand) {
//                 return res.status(400).json({ error: "Brand not found" });
//             }
//             brandId = brand._id; // update to the new brand ObjectId
//         }
// console.log(brandId,"brandIdddddddddd")


//         const colorStock = data.colorStock ? data.colorStock.map(stock =>({
//             color:stock.color,
//             quantity:parseInt(stock.quantity) || 0,
//             status:stock.status || 'Available'
//         })) : product.colorStock;

//         console.log("colorStockkkk",colorStock)

//        const updateFields = {             
//             productName: data.productName || product.productName,
//             description: data.descriptionData || product.description,
//             brand:product.brand,
//             category: data.category || product.category,
//             regularPrice: parseFloat(data.regularPrice) || product.regularPrice,
//             salePrice: parseFloat(data.salePrice) || product.salePrice,
//             colorStock: colorStock,
//             productImage: images.length > 0 ? images : product.productImage,
//         }


//         console.log(updateFields,"fieldssssssssssssssssssssss")
        
//         // Validate prices
//         if (updateFields.salePrice > updateFields.regularPrice) {
//             return res.status(400).render('error', { 
//                 message: "Sale price cannot exceed regular price" 
//             });
//         }


//         console.log("updateFieldsssssss",data.brand)

          

//         const updateProduct= await Product.findByIdAndUpdate(id,updateFields,{new:true});

//         if(!updateProduct){
//             return res.status(500).render('error',{message:"Failed to update products"})
//         }

//         req.flash('success','Product updated successfully');
//         res.redirect("/admin/product")

         

        
//     } catch (error) {
//         console.error("Edit Product",error);
//        res.status(500).render('error',{message:"An unexpected error occured"})
        
//     }
// }

const deleteSingleImage = async(req,res)=>{
    try {

        const {imageNameToServer,productIdToServer} = req.body;
        const product = await Product.findByIdAndUpdate(productIdToServer,{$pull:{productImage:imageNameToServer}});
        const imagePath = path.join("public","uploads","re-image",imageNameToServer);
        if(fs.existsSync(imagePath)){
         fs.unlinkSync(imagePath);
            console.log(`Image ${imageNameToServer} deleted Successfully`)
        } else{
            console.log(`image ${imageNameToServer}  not found`)
        }
        res.send({status:true})
        
    } catch (error) {
        res.redirect("/pageerror")
    }
}



module.exports = {
    getProductAddPage,
    addProducts,
    getAllProducts,
    blockProduct,
    unblockProduct,
    getEditProduct,
    editProduct,
    deleteSingleImage
}