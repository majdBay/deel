const express = require('express');
const router = express.Router();
const { Contract } = require('../model');
const { Op } = require('sequelize')
const { getProfile } = require('../middleware/getProfile');

/**
 * @returns contract by id
 */
router.get('/:id', getProfile, async (req, res) => {
    const { Contract } = req.app.get('models')
    const { id } = req.params
    const profileId = parseInt(req.get('profile_id'), 10)

    try {
        const contract = await Contract.findOne({ where: { id } })

        if (!contract) {
            return res.status(404).end()
        }

        if (contract.ClientId !== profileId && contract.ContractorId !== profileId) {
            return res.status(403).end()
        }

        res.json(contract)
    } catch (error) {
        console.error(error)
        res.status(500).send('Internal Server Error')
    }
})

/**
* Retrieves a list of contracts belonging to the authenticated user.
* Excludes terminated contracts.
* @returns non terminated contracts of a user
*/
router.get('/', getProfile, async (req, res) => {
    const { Contract } = req.app.get('models')
    const profileId = parseInt(req.get('profile_id'), 10)

    try {
        const contracts = await Contract.findAll({
            where: {
                [Op.or]: [
                    { ClientId: profileId },
                    { ContractorId: profileId }
                ],
                status: { [Op.ne]: 'terminated' }
            }
        })
        res.json(contracts)
    } catch (error) {
        console.error(error)
        res.status(500).send('Internal Server Error')
    }
})

module.exports = router;
