const User = require("../../models/userSchema");
const Wallet = require("../../models/walletSchema");


const getWallet = async(req,res)=>{

    const userId = req.session.user;

    try {

        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit) ||5;
        const skip = (page-1) * limit;

        const wallet = await Wallet.findOne({userId})

        console.log(wallet,"wallet details")

        if(!wallet) {
            return res.status(404).render('wallet',{
                walletBalance: 0,
                transactions: [],
                page,
                totalPage: 0
            })
        }

        const sortedTransactions = wallet.transactions.sort((a,b)=>b.transactionDate - a.transactionDate);

        const walletCount = sortedTransactions.length;
        const transactions = sortedTransactions.slice(skip,skip+limit);

        res.status(200).render('wallet',{
            walletBalance: wallet.walletBalance || 0,
            transactions: wallet.transactions || [],
            page:req.query.page || 1,
            totalPage: Math.ceil(walletCount/limit),
            limit
        }) 
        
        
    } catch (error) {
        console.error('An error occured while loading the wallet page..!')
    }

}


module.exports={
    getWallet,
}