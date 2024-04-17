const express = require('express');
const router = express.Router();
const { Profile, Job, Contract } = require('../model');
const { Op } = require('sequelize')

/**
* Deposits money into the balance of a client.
* A client can't deposit more than 25% of their total outstanding jobs to pay.
*/
router.post('/deposit/:userId', async (req, res) => {
    const { userId } = req.params
    const depositAmount = parseFloat(req.body.amount)


    try {
        const clientProfile = await Profile.findOne({ where: { id: userId, type: 'client' } })

        if (!clientProfile) {
            return res.status(404).json({ error: 'Client not found' })
        }

        const totalUnpaidJobs = await Job.sum('price', {
            where: {
                '$Contract.ClientId$': userId,
                paid: { [Op.or]: [false, null] }
            },
            include: { model: Contract, as: 'Contract' }
        })

        const maxDepositAmount = totalUnpaidJobs * 0.25

        if (depositAmount > maxDepositAmount) {
            return res.status(400).json({ error: 'Deposit amount exceeds the maximum allowed' })
        }

        const newBalance = clientProfile.balance + depositAmount

        await clientProfile.update({ balance: newBalance })

        res.json({ message: 'Deposit successful', newBalance })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Internal Server Error' })
    }
})

module.exports = router;
