class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.message = message;
    this.success = this.status < 400;
    this.data = data;
  }
}

export { ApiResponse };
