/**
 * API Response Utility
 * Standardizes the response structure: { success, status, message, data }
 */

class ApiResponse {
    constructor(success, status, message, data = null) {
        this.success = success;
        this.status = status;
        this.message = message;
        if (data) {
            this.data = data;
        }
    }

    static success(res, message = 'Success', data = null, status = 200) {
        return res.status(status).json(new ApiResponse(true, status, message, data));
    }

    static error(res, message = 'Error', status = 500, error = null) {
        // In development, you might want to include the error object/stack
        const response = new ApiResponse(false, status, message);
        if (error && process.env.NODE_ENV === 'development') {
            response.error = error;
        }
        return res.status(status).json(response);
    }
}

export default ApiResponse;
