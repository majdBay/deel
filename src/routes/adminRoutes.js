const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { Job, Contract, Profile, sequelize } = require('../model');

/**
* Returns the profession that earned the most money (sum of jobs paid) for any contractor
* that worked in the query time range.
* 
* @returns An object containing the best profession and its earnings.
*/
router.get('/best-profession', async (req, res) => {
    const { start, end } = req.query

    try {
        const jobs = await Job.findAll({
            where: {
                paymentDate: {
                    [Op.between]: [start, end]
                },
                paid: true
            },
            include: [{
                model: Contract,
                include: {
                    model: Profile,
                    as: 'Contractor',
                    attributes: ['profession']
                }
            }]
        })

        if (jobs.length === 0) {
            return res.status(404).json({ error: 'No jobs found within the specified date range' })
        }
        const professionEarningsMap = {}

        jobs.forEach(job => {
            const profession = job.Contract.Contractor.profession
            const price = job.price
            professionEarningsMap[profession] = (professionEarningsMap[profession] || 0) + price
        })

        const [bestProfession, maxEarnings] = Object.entries(professionEarningsMap)
            .reduce((acc, [profession, earnings]) => earnings > acc[1] ? [profession, earnings] : acc, [null, 0])

        res.json({ bestProfession, earnings: maxEarnings })
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Internal Server Error' })
    }
})

/**
* @returns the clients who paid the most for jobs within the specified time period.
*/
router.get('/best-clients', async (req, res) => {
    const { start, end, limit = 2 } = req.query

    try {
        const totalPaidPerContract = await Job.findAll({
            attributes: ['ContractId', [sequelize.fn('SUM', sequelize.col('price')), 'totalPaid']],
            where: {
                paid: true,
                paymentDate: {
                    [Op.between]: [start, end]
                }
            },
            group: ['ContractId'],
            order: [[sequelize.literal('totalPaid'), 'DESC']],
            limit: parseInt(limit)
        })

        const clients = await Promise.all(totalPaidPerContract.map(async (job) => {
            console.log(job)
            const contract = await Contract.findByPk(job.ContractId)
            const client = await Profile.findByPk(contract.ClientId)
            return {
                id: client.id,
                fullName: `${client.firstName} ${client.lastName}`,
                paid: job.getDataValue('totalPaid')
            }
        }))

        res.json(clients)
    } catch (error) {
        console.error(error)
        res.status(500).json({ error: 'Internal Server Error' })
    }
})

module.exports = router;
