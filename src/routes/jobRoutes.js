const express = require('express');
const router = express.Router();
const { Job, Contract, Profile } = require('../model');
const { getProfile } = require('../middleware/getProfile');
const { Op } = require('sequelize')

/**
* Retrieves all unpaid jobs for the authenticated user.
* Only includes jobs associated with active contracts.
* @returns unpaid jobs of a user (active contracts only)
*/
router.get('/unpaid', getProfile, async (req, res) => {
    const { Job, Contract } = req.app.get('models')
    const profileId = parseInt(req.get('profile_id'), 10)

    try {
        const activeContracts = await Contract.findAll({
            where: {
                [Op.or]: [
                    { ClientId: profileId },
                    { ContractorId: profileId }
                ],
                status: { [Op.ne]: 'terminated' }
            }
        })

        const activeContractIds = activeContracts.map(contract => contract.id)

        const unpaidJobs = await Job.findAll({
            where: {
                ContractId: activeContractIds,
                [Op.or]: [
                    { paid: false },
                    { paid: null }
                ]
            }
        })

        res.json(unpaidJobs)
    } catch (error) {
        console.error(error)
        res.status(500).send('Internal Server Error')
    }
})

/**
* Pays for a job.
* Deducts the amount from the client's balance and adds it to the contractor's balance.
*/
router.post('/:job_id/pay', async (req, res) => {
    const { job_id } = req.params

    try {
        const job = await Job.findByPk(job_id, {
            include: [
                {
                    model: Contract,
                    include: [
                        {
                            model: Profile,
                            as: 'Client'
                        },
                        {
                            model: Profile,
                            as: 'Contractor'
                        }
                    ]
                }
            ]
        })

        if (!job) {
            return res.status(404).json({ error: 'Job not found' })
        }

        if (job.paid) {
            return res.status(400).json({ error: 'Job is already paid' })
        }

        const amountToPay = job.price

        const clientBalance = job.Contract.Client.balance
        if (clientBalance < amountToPay) {
            return res.status(400).json({ error: 'Insufficient balance' })
        }

        await Promise.all([
            job.Contract.Client.update({ balance: clientBalance - amountToPay }),
            job.Contract.Contractor.increment('balance', { by: amountToPay })
        ])

        await job.update({ paid: true })
        res.json({ message: 'Payment successful' })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Internal Server Error' })
    }
})

module.exports = router;
