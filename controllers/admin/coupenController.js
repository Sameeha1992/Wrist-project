const Coupen = require("../../models/coupenSchema");
const mongoose = require("mongoose")


const showCoupen = async(req,res)=>{
    try {

        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page-1) *limit;

        let searchQuery = req.query.search || '';
        console.log(searchQuery,"searchQuery")

        let filter = {};
        if(searchQuery) {
            filter['code'] = {$regex: new RegExp(searchQuery, 'i')}
        }


        const coupons = await Coupen.find(filter)
       .sort({ createdAt: -1 })
       .skip(skip)
       .limit(limit);


        const totalOrders = await Coupen.countDocuments(filter);

        const totalPages = Math.ceil(totalOrders/limit);

        res.status(200).render('coupen',{
            coupons,
            currentPage:page,
            totalPages:totalPages,
            searchQuery
        })
        
    } catch (error) {
        console.error("An error occured while loading the coupen page")
    }
}

const getAddCoupen = async(req,res)=>{
    try {
        res.status(200).render('addCoupen')
        
    } catch (error) {
        console.error('An error occured while loading the addCoupen page..!',error);

        
    }
}


const addCoupen = async(req,res)=>{
    try {

        const {code,description,discountType,minDiscountValue, maxDiscountValue, expiryDate, usageLimit, conditions, minimumPurchaseAmount} = req.body;
        console.log(req.body,"req.bodyyyyyyyyyyyyyyyy coupennnnnn")

        const existCode = await Coupen.findOne({code})

        if(existCode){
            return res.status(409).json({message:'Coupen code already exists..!'})
        }

        const newCoupen = new Coupen({
            code,
            description,
            minDiscountValue,
            maxDiscountValue,
            expiryDate,
            usageLimit,
            conditions,
            discountType,
            minPurchaseAmount:minimumPurchaseAmount
        })

        await newCoupen.save();
        res.status(201).json({message:"Coupen added successfully"})
        
    } catch (error) {
        console.error('An error occured while adding new coupen');
        res.status(500).json({message:error.message || 'Internal server error'})
    }
}



const deleteCoupen = async (req,res)=>{
   
        const coupenId = req.params.id;
        try {

            if(!mongoose.Types.ObjectId.isValid(coupenId)){
                return res.status(400).json({message:"Invalid coupen ID"})
            }

            const coupen = await Coupen.findById(coupenId);

            if(!coupen){
                return res.status(400).json({message:'Coupen not found'})
            }
            await Coupen.deleteOne({_id: coupenId});
            res.status(200).json({message:'Coupen deleted successfully..!'})
        
    } catch (error) {
        console.error('An error occured while deleting coupen..!',error)
    }
}







module.exports = {
    showCoupen,
    getAddCoupen,
    addCoupen,
    deleteCoupen,
}