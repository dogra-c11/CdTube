class ApiResponse {
  constructor(statusCode, data, message = "Success") {
    this.statusCode = statusCode;
    this.message = message;
    this.success = this.statusCode < 400;
    this.data = data;
  }
}

export { ApiResponse };
