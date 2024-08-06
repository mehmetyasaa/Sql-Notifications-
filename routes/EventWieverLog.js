const express = require('express');
const router = express.Router();
const { sql, poolPromise } = require('../config/db');
const nodemailer = require('nodemailer');
const twilio = require('twilio');

// Twilio Account Key
const accountSid = '';
const authToken = '';
const twilioClient = new twilio(accountSid, authToken);

const ensureDbConnection = async (req, res, next) => {
    if (!poolPromise) {
        return res.status(500).send('Database connection failed');
    }
    next();
};

router.use(ensureDbConnection);

router.get('/', async (req, res) => {
    try {
        const pool = await poolPromise;
        if (!pool) throw new Error('Database connection failed');

        const result = await pool.request().query('Select TOP 1 COUNT(OID) FROM ApplicationLogsIMT (NOLOCK) WHERE CreatedOn > DATEADD(MINUTE, -5, GETDATE())');
        res.json(result.recordset);

    } catch (err) {
        console.error('Error in GET /IMT:', err);
        res.status(500).send(err.message);
    }
});


const transporter = nodemailer.createTransport({
    service: 'hotmail',
    auth: {
        user: '@outlook.com',
        pass: ''
    }
});


const mailOptions = {
    from: '',
    to: '',
    subject: 'Alert: New entries in ApplicationLogsIMT',
    text: 'There are new entries in the ApplicationLogsIMT table in the last 5 minutes.'
};

const checkDatabaseAndSendNotifications = async () => {
    try {
        const pool = await poolPromise;
        if (!pool) throw new Error('Database connection failed');

        const result = await pool.request().query('Select TOP 1 COUNT(OID) FROM ApplicationLogsIMT (NOLOCK) WHERE CreatedOn > DATEADD(MINUTE, -5, GETDATE())');
        const count = result.recordset[0][''];

        if (count != 0) {
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.log('Error sending email:', error);
                } else {
                    console.log('Email sent:', info.response);
                }
            });

            twilioClient.messages.create({
                body: 'IMT Crash: ApplicationLogsIMT veri girişi oldu ',
                from: '',
                to: ''
            }).then(message => {
                console.log('WhatsApp message sent:', message.sid);
            }).catch(error => {
                console.error('Error sending WhatsApp message:', error);
            });
        }
    } catch (err) {
        console.error('Error in checkDatabaseAndSendNotifications:', err);
    }
};

setInterval(checkDatabaseAndSendNotifications, 1 * 60 * 1000);

module.exports = router;
