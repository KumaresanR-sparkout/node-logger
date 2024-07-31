export const sendSuccess = (res, statusCode, message, data) => {
    const response = {
        "status_code": statusCode || 200,
        "status": true,
        "message": message,
        "data": data || {}
    }
    res.status(statusCode).json(response)
}


export const sendError = (res, statusCode, message) => {
    const response = {
        "status_code": statusCode || 500,
        "status": false,
        "message": message || "Internal server error"
    }
    res.status(statusCode).json(response)
}