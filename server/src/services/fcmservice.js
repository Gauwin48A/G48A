const admin = require("../config/firebase");
const pool = require("../config/db");

/**
 * Resolve Android Notification Channel
 */
function resolveChannel(type = "") {
    const t = String(type).toLowerCase();

    if (t.includes("chat") || t.includes("message"))
        return "chat_messages";

    if (
        t.includes("payment") ||
        t.includes("transaction") ||
        t.includes("order")
    )
        return "transactions";

    if (
        t.includes("offer") ||
        t.includes("promo")
    )
        return "promotions";

    if (
        t.includes("reward") ||
        t.includes("coin")
    )
        return "rewards";

    if (
        t.includes("security") ||
        t.includes("system")
    )
        return "system";

    return "general";
}

async function registerToken(
    userId,
    token,
    deviceType = "android",
    deviceName = null
) {

    await pool.query(
        `
        INSERT INTO device_tokens
        (
            user_id,
            token,
            device_type,
            device_name,
            is_active,
            created_at,
            updated_at
        )
        VALUES
        (
            $1,$2,$3,$4,true,NOW(),NOW()
        )
        ON CONFLICT (token)
        DO UPDATE SET
            user_id = EXCLUDED.user_id,
            device_type = EXCLUDED.device_type,
            device_name = EXCLUDED.device_name,
            is_active = true,
            updated_at = NOW()
        `,
        [
            userId,
            token,
            deviceType,
            deviceName
        ]
    );

    return {
        success: true
    };
}

async function unregisterToken(token, userId) {

    const result = await pool.query(
        `
        UPDATE device_tokens
        SET
            is_active = false,
            updated_at = NOW()
        WHERE
            token = $1
        AND
            user_id = $2
        `,
        [
            token,
            userId
        ]
    );

    return {
        success: true,
        deactivatedCount: result.rowCount
    };
}

async function sendPushNotification(
    token,
    title,
    body,
    data = {}
) {

    const message = {

        token,

        notification: {
            title,
            body
        },

        android: {

            priority: "high",

            notification: {

                channelId: resolveChannel(data.type),

                sound: "default"

            }

        },

        data: Object.fromEntries(
            Object.entries(data).map(([k, v]) => [
                k,
                String(v)
            ])
        )

    };

    const response = await admin.messaging().send(message);

    console.log("======================================");
    console.log("✅ PUSH SENT");
    console.log("Message ID :", response);
    console.log("Token      :", token);
    console.log("Channel    :", resolveChannel(data.type));
    console.log("======================================");

    return response;
}

async function sendToUser(
    userId,
    title,
    body,
    data = {}
) {

    const result = await pool.query(
        `
        SELECT token
        FROM device_tokens
        WHERE
            user_id = $1
        AND
            is_active = true
        `,
        [
            userId
        ]
    );

    if (result.rows.length === 0) {

        return {

            success: false,

            reason: "No active device"

        };

    }

    const responses = [];

    for (const row of result.rows) {

        try {

            const messageId = await sendPushNotification(

                row.token,

                title,

                body,

                data

            );

            responses.push({

                token: row.token,

                success: true,

                messageId

            });

        } catch (e) {

            responses.push({

                token: row.token,

                success: false,

                error: e.message

            });

        }

    }

    return {

        success: true,

        total: responses.length,

        responses

    };

}

async function sendToMultiple(
    tokens,
    title,
    body,
    data = {}
) {

    const results = [];

    for (const token of tokens) {

        try {

            const messageId = await sendPushNotification(

                token,

                title,

                body,

                data

            );

            results.push({

                token,

                success: true,

                messageId

            });

        } catch (e) {

            results.push({

                token,

                success: false,

                error: e.message

            });

        }

    }

    return {

        success: true,

        total: tokens.length,

        results

    };

}

module.exports = {

    registerToken,

    unregisterToken,

    sendPushNotification,

    sendToUser,

    sendToMultiple

};