const express = require("express");
const router = express.Router();

const { sendPushNotification } = require("../services/fcmService");

router.post("/", async (req, res) => {

    try {

        const { token } = req.body;

        await sendPushNotification(
            token,
            "🎉 Zaruda Test",
            "FCM is working successfully!",
            {
                type: "test",
            }
        );

        res.json({
            success: true,
        });

    } catch (e) {

        res.status(500).json({
            success: false,
            error: e.message,
        });

    }

});

module.exports = router;