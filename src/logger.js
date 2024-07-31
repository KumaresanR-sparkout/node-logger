const mongoose = require("mongoose");
const axios = require("axios");


let key;
let secret;

class Bugatlas {
    constructor(apiKey, apiSecret) {
        key = apiKey;
        secret = apiSecret;

        if (!apiKey || !apiSecret) {
            if (!apiKey) {
                console.log("Please Provide apiKey");
            }
            if (!apiSecret) {
                console.log("Please Provide apiSecret");
            }
        }
    }

    async storeError(err) {
        const { code, keyPattern } = err;
        if (code === 11000 && keyPattern) {
            return this.handleDuplicateKeyError(err);
        }
        if (err instanceof mongoose.Error.ValidationError) {
            return this.handleValidationError(err);
        }
        await this.sendErrorToApi(err.name, err.message, err.stack);
    }

    async caughtErrors(err) {
        const { code } = err;
        if (code === 11000) {
            return this.handleDuplicateKeyError(err);
        }
        if (err instanceof mongoose.Error.ValidationError) {
            return this.handleValidationError(err);
        }
        // console.log(err, "caughtErrors")
        await this.sendErrorToApi(err.name, err.message, err.stack);
    }

    async handleDuplicateKeyError(err) {
        const value = `${Object.keys(err.keyValue).join(' and ')} already exists in DB`
        if (value) {
            await this.sendErrorToApi("MongoDuplicateKeyError", value, err.stack);
        }
    }

    async handleValidationError(err) {
        for (const field in err.errors) {
            if (err.errors[field].kind === 'ObjectId') {
                // console.log(err, "handleValidationError");
                await this.sendErrorToApi(err.name, `Invalid ${field} ID provided!`, err.stack);
            } else {
                console.log(err.message);
            }
        }
    }

    async sendErrorToApi(errorName, errorMessage, errorStack) {
        try {
            const { data } = await axios.post("https://api.bugatlas.com/v1/api/errors", {
                error_type: errorName,
                error_message: errorMessage,
                meta: {
                    meta: errorStack
                }
            },
                {
                    headers: {
                        "api_key": key,
                        "secret_key": secret
                    }
                }
            );

            // console.log("sendErrorToApiCompleted", data);
        } catch (error) {
            console.error("Error sending error to API:", error.message);
        }
    }

    createLog = (req, res, next) => {
        const startTime = new Date();
        let responseData = ''; // Variable to store response data

        // Override res.send to capture response data
        const originalSend = res.send;
        res.send = function (body) {
            responseData = body; // Capture response data
            originalSend.call(this, body); // Call the original send method
        };

        res.on('finish', async () => {
            try {
                const endTime = new Date();
                const processTime = endTime - startTime;
                // Create log data
                const logData = {
                    request_user_agent: req.headers['user-agent'],
                    request_host: req.headers['origin'] || req.headers.host || req.socket.remoteAddress,
                    request_method: req.method,
                    payload: req.body,
                    protocol: req.protocol,
                    request_url: req.originalUrl,
                    type: res.statusCode !== 200 ? 2 : 1,
                    status_code: res.statusCode,
                    status_message: res.statusMessage,
                    content_length: `${res.get('Content-Length') || 0} bytes`,
                    requested_at: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
                    remote_address: req.connection.remoteAddress || req.socket.remoteAddress,
                    request_ip: req.ip,
                    response_message: responseData || '', // Use responseData directly
                    process_time: `${processTime} ${unitCalculation(processTime)}`,
                };

                const endpoint = res.statusCode !== 200 && res.statusCode !== 201
                    ? "https://api.bugatlas.com/v1/api/logs"
                    : "https://api.bugatlas.com/v1/api/logs";

                await axios.post(endpoint, logData, {
                    headers: {
                        "api_key": key,
                        "secret_key": secret
                    }
                });
            } catch (err) {
                console.error('Error creating logs:', err.message);
            }
        });

        next();
    };

}

module.exports = Bugatlas;


const unitCalculation = function (processTime) {
    let unit = 'ms';

    // Convert to seconds if processTime is >= 1000 milliseconds
    if (processTime >= 1000) {
        if (processTime >= 60 * 60 * 1000) {
            // Convert to hours

            processTime /= 60 * 60 * 1000;
            unit = 'hrs';
        } else if (processTime >= 60 * 1000) {

            // Convert to minutes
            processTime /= 60 * 1000;
            unit = 'min';
        } else {

            // Convert to seconds
            processTime /= 1000;
            unit = 's';
        }
    }

    return unit;
}